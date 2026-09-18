"""
INCOIS HYCOM NetCDF Model Ingestion & Analysis Service
High-Performance Multi-File Engine with Dynamic File Selection, xarray Slicing, Query Caching, and Argo Cross-Validation.
"""

import time
import math
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import xarray as xr
import pandas as pd

from app.core.config import settings
from app.core.query_cache import global_query_cache, QueryCache
from app.core.quality_control import validate_temperature, validate_salinity, is_fill_value, compute_metrics
from app.schemas.hycom_schemas import (
    OceanModelPoint,
    OceanModelProfileLevel,
    OceanModelProfile,
    OceanModelCurrent,
    OceanModelMetadata,
    OceanModelTimeseriesResponse,
    ModelObservationComparisonItem,
    ModelObservationComparisonResponse,
)
from app.services.hycom_dataset_manager import hycom_dataset_manager, HYCOMDatasetManager
from app.services.hycom_remote_service import hycom_remote_service

logger = logging.getLogger("oceanscope.hycom_service")


class INCOISHYCOMService:
    def __init__(
        self,
        dataset_manager: Optional[HYCOMDatasetManager] = None,
        cache: Optional[QueryCache] = None,
    ):
        self.dataset_manager = dataset_manager or hycom_dataset_manager
        self.remote_service = hycom_remote_service
        self.cache = cache or global_query_cache
        self.cache_ttl = 300  # 5 minutes TTL

    @staticmethod
    def _to_naive_datetime64(time_str: str) -> np.datetime64:
        """Convert an ISO time string to a timezone-naive np.datetime64[ns]."""
        ts = pd.to_datetime(time_str)
        if hasattr(ts, 'tz') and ts.tz is not None:
            ts = ts.tz_convert('UTC').tz_localize(None)
        return np.datetime64(ts, 'ns')

    @staticmethod
    def validate_coordinates(latitude: float, longitude: float, depth: float = 0.0) -> None:
        """Validate spatial coordinates and depth bounds."""
        if not (-90.0 <= latitude <= 90.0):
            raise ValueError(f"Latitude {latitude}° is outside valid bounds (-90.0 to 90.0°).")
        if not (-180.0 <= longitude <= 360.0):
            raise ValueError(f"Longitude {longitude}° is outside valid bounds (-180.0 to 360.0°).")
        if depth < 0.0 or depth > 6000.0:
            raise ValueError(f"Depth {depth}m is outside valid oceanographic range (0 to 6000m).")

    @staticmethod
    def validate_timeseries_bounds(start_time: Optional[str], end_time: Optional[str]) -> None:
        """Validate timeseries query parameters and enforce duration limits."""
        if start_time and end_time:
            t_start = pd.to_datetime(start_time)
            t_end = pd.to_datetime(end_time)
            if t_start > t_end:
                raise ValueError(f"start_time ({start_time}) cannot be later than end_time ({end_time}).")
            if (t_end - t_start).days > 365:
                raise ValueError("Requested timeseries window exceeds maximum permitted duration of 365 days.")

    def get_dataset(self) -> Tuple[Optional[xr.Dataset], Optional[str]]:
        """Backwards-compatible helper returning the primary active xarray dataset."""
        if settings.HYCOM_DATA_SOURCE == "remote":
            try:
                return self.remote_service._get_dataset(), None
            except Exception as e:
                return None, f"Failed to connect to remote HYCOM: {e}"

        meta = self.dataset_manager.get_aggregate_metadata()
        if not meta.is_available or not meta.available_files:
            return None, "No HYCOM NetCDF datasets found in data directory."

        catalog = self.dataset_manager.refresh_catalog()
        valid_entries = [e for e in catalog.values() if e.is_valid]
        if not valid_entries:
            return None, "No valid HYCOM NetCDF files discovered."

        ds = self.dataset_manager.get_dataset_for_file(valid_entries[-1].filepath)
        if ds is None:
            return None, f"Failed to load dataset for {valid_entries[-1].filename}"
        return ds, None

    def get_metadata(self) -> OceanModelMetadata:
        """Fetch aggregated multi-file metadata for all available INCOIS HYCOM datasets."""
        if settings.HYCOM_DATA_SOURCE == "remote":
            return self.remote_service.get_metadata()

        t0 = time.time()
        cache_key = "hycom_meta_aggregate"
        cached = self.cache.get(cache_key)
        if cached:
            logger.debug(f"[CACHE HIT] Metadata retrieved in {(time.time() - t0)*1000:.2f}ms")
            return cached

        meta = self.dataset_manager.get_aggregate_metadata()
        self.cache.set(cache_key, meta, ttl=self.cache_ttl)
        logger.info(f"[CACHE MISS] HYCOM metadata aggregated ({meta.file_count} files) in {(time.time() - t0)*1000:.2f}ms")
        return meta

    def get_timestamps(self, year: Optional[int] = None, date: Optional[str] = None):
        """Retrieve temporal coverage, available years, dates, or timestamps."""
        if settings.HYCOM_DATA_SOURCE == "remote":
            return self.remote_service.get_timestamps(year=year, date=date)
        from app.schemas.hycom_schemas import HYCOMTimestampsResponse
        meta = self.get_metadata()
        return HYCOMTimestampsResponse(
            dataset_id=meta.dataset,
            earliest=meta.earliest_time or "2020-01-01T00:00:00Z",
            latest=meta.latest_time or "2020-02-19T00:00:00Z",
            available_years=[2020],
            time_step="3 hours",
            total_timestamps=len(meta.time_range),
        )

    def get_point(
        self,
        latitude: float,
        longitude: float,
        depth: float = 0.0,
        variable: str = "temperature",
        time_str: Optional[str] = None,
    ) -> OceanModelPoint:
        """
        Extract value for a single point across the best matching NetCDF file or remote OPeNDAP dataset.
        Uses nearest-neighbor coordinate slicing with query-level caching.
        """
        self.validate_coordinates(latitude, longitude, depth)

        if settings.HYCOM_DATA_SOURCE == "remote":
            return self.remote_service.get_point(
                latitude=latitude,
                longitude=longitude,
                depth=depth,
                variable=variable,
                time_str=time_str,
            )

        t0 = time.time()
        cache_key = f"pt_{variable}_{latitude:.3f}_{longitude:.3f}_{depth:.1f}_{time_str or 'latest'}"
        cached = self.cache.get(cache_key)
        if cached:
            logger.debug(f"[CACHE HIT] Point query for {variable} at ({latitude}, {longitude}) in {(time.time() - t0)*1000:.2f}ms")
            return cached
            return cached

        filepath, filename, sel_model_time, time_diff_hours, ds, var_mapping, dim_mapping = (
            self.dataset_manager.select_file_for_time(time_str)
        )

        if ds is None or not filename:
            raise ValueError("No valid HYCOM dataset available for point query.")

        nc_var = var_mapping.get(variable, variable)
        if nc_var not in ds.data_vars:
            raise ValueError(f"Variable '{variable}' (mapped as '{nc_var}') not found in dataset '{filename}'.")

        lat_dim = dim_mapping.get("latitude", "latitude")
        lon_dim = dim_mapping.get("longitude", "longitude")
        depth_dim = dim_mapping.get("depth", "depth")
        time_dim = dim_mapping.get("time", "time")

        selectors = {
            lat_dim: latitude,
            lon_dim: longitude,
        }
        if depth_dim in ds[nc_var].dims:
            selectors[depth_dim] = depth
        if time_dim in ds[nc_var].dims and sel_model_time:
            selectors[time_dim] = self._to_naive_datetime64(sel_model_time)

        sliced = ds[nc_var].sel(selectors, method="nearest")
        val = float(np.ravel(sliced.values)[0])

        actual_lat = float(sliced[lat_dim].values.item()) if lat_dim in sliced.coords else latitude
        actual_lon = float(sliced[lon_dim].values.item()) if lon_dim in sliced.coords else longitude
        actual_depth = float(sliced[depth_dim].values.item()) if depth_dim in sliced.coords else depth

        unit = str(ds[nc_var].attrs.get("units", "degC" if variable == "temperature" else "PSU"))

        res = OceanModelPoint(
            source="INCOIS",
            provider="INCOIS RSMC",
            model="HYCOM",
            dataset="INCOIS_RSMC_HYCOM",
            retrieved_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            latitude=actual_lat,
            longitude=actual_lon,
            depth=actual_depth,
            time=time_str or sel_model_time or "latest",
            model_time=sel_model_time or "latest",
            variable=variable,
            value=round(val, 4) if not np.isnan(val) else 0.0,
            unit=unit,
            selected_file=filename,
            time_difference_hours=time_diff_hours,
        )
        self.cache.set(cache_key, res, ttl=self.cache_ttl)
        logger.info(
            f"[CACHE MISS] Point query ({variable}) at ({latitude:.2f}, {longitude:.2f}, {depth}m) "
            f"file={filename} dt={sel_model_time} in {(time.time() - t0)*1000:.2f}ms"
        )
        return res

    def get_profile(
        self,
        latitude: float,
        longitude: float,
        time_str: Optional[str] = None,
    ) -> OceanModelProfile:
        """
        Fetch vertical temperature, salinity, and velocity profile for a coordinate.
        Intelligently selects the best NetCDF file matching requested timestamp or remote OPeNDAP dataset.
        """
        self.validate_coordinates(latitude, longitude, 0.0)

        if settings.HYCOM_DATA_SOURCE == "remote":
            return self.remote_service.get_profile(
                latitude=latitude,
                longitude=longitude,
                time_str=time_str,
            )

        t0 = time.time()
        cache_key = f"prof_{latitude:.3f}_{longitude:.3f}_{time_str or 'latest'}"
        cached = self.cache.get(cache_key)
        if cached:
            logger.debug(f"[CACHE HIT] Profile query at ({latitude}, {longitude}) in {(time.time() - t0)*1000:.2f}ms")
            return cached

        filepath, filename, sel_model_time, time_diff_hours, ds, var_mapping, dim_mapping = (
            self.dataset_manager.select_file_for_time(time_str)
        )

        if ds is None or not filename:
            raise ValueError("No valid HYCOM dataset available for vertical profile query.")

        lat_dim = dim_mapping.get("latitude", "latitude")
        lon_dim = dim_mapping.get("longitude", "longitude")
        depth_dim = dim_mapping.get("depth", "depth")
        time_dim = dim_mapping.get("time", "time")

        temp_var = var_mapping.get("temperature", "water_temp")
        sal_var = var_mapping.get("salinity", "salinity")
        u_var = var_mapping.get("current_u", "water_u")
        v_var = var_mapping.get("current_v", "water_v")

        selectors = {
            lat_dim: latitude,
            lon_dim: longitude,
        }
        if time_dim in ds.dims and sel_model_time:
            selectors[time_dim] = self._to_naive_datetime64(sel_model_time)

        sliced_ds = ds.sel(selectors, method="nearest")

        actual_lat = float(sliced_ds[lat_dim].values.item()) if lat_dim in sliced_ds.coords else latitude
        actual_lon = float(sliced_ds[lon_dim].values.item()) if lon_dim in sliced_ds.coords else longitude

        depth_levels = sliced_ds[depth_dim].values if (depth_dim and depth_dim in sliced_ds) else np.array([0.0])

        temps = sliced_ds[temp_var].values if (temp_var and temp_var in sliced_ds) else np.zeros_like(depth_levels)
        sals = sliced_ds[sal_var].values if (sal_var and sal_var in sliced_ds) else np.zeros_like(depth_levels)
        us = sliced_ds[u_var].values if (u_var and u_var in sliced_ds) else np.zeros_like(depth_levels)
        vs = sliced_ds[v_var].values if (v_var and v_var in sliced_ds) else np.zeros_like(depth_levels)

        profile_levels: List[OceanModelProfileLevel] = []
        for i, z in enumerate(depth_levels):
            profile_levels.append(
                OceanModelProfileLevel(
                    depth=float(round(z, 2)),
                    temperature=float(round(temps[i], 3)) if not np.isnan(temps[i]) else None,
                    salinity=float(round(sals[i], 3)) if not np.isnan(sals[i]) else None,
                    current_u=float(round(us[i], 4)) if not np.isnan(us[i]) else None,
                    current_v=float(round(vs[i], 4)) if not np.isnan(vs[i]) else None,
                )
            )

        res = OceanModelProfile(
            source="INCOIS",
            provider="INCOIS RSMC",
            model="HYCOM",
            dataset="INCOIS_RSMC_HYCOM",
            retrieved_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            latitude=actual_lat,
            longitude=actual_lon,
            time=time_str or sel_model_time or "latest",
            model_time=sel_model_time or "latest",
            profile=profile_levels,
            selected_file=filename,
            time_difference_hours=time_diff_hours,
        )
        self.cache.set(cache_key, res, ttl=self.cache_ttl)
        logger.info(
            f"[CACHE MISS] Profile query at ({latitude:.2f}, {longitude:.2f}) "
            f"file={filename} dt={sel_model_time} in {(time.time() - t0)*1000:.2f}ms"
        )
        return res

    def get_current(
        self,
        latitude: float,
        longitude: float,
        depth: float = 0.0,
        time_str: Optional[str] = None,
    ) -> OceanModelCurrent:
        """
        Extract vector current components (u, v), calculate speed magnitude sqrt(u^2 + v^2)
        and ocean current heading direction in meteorological degrees.
        """
        self.validate_coordinates(latitude, longitude, depth)

        if settings.HYCOM_DATA_SOURCE == "remote":
            return self.remote_service.get_current(
                latitude=latitude,
                longitude=longitude,
                depth=depth,
                time_str=time_str,
            )

        t0 = time.time()
        cache_key = f"curr_{latitude:.3f}_{longitude:.3f}_{depth:.1f}_{time_str or 'latest'}"
        cached = self.cache.get(cache_key)
        if cached:
            logger.debug(f"[CACHE HIT] Current query at ({latitude}, {longitude}) in {(time.time() - t0)*1000:.2f}ms")
            return cached

        filepath, filename, sel_model_time, time_diff_hours, ds, var_mapping, dim_mapping = (
            self.dataset_manager.select_file_for_time(time_str)
        )

        if ds is None or not filename:
            raise ValueError("No valid HYCOM dataset available for current velocity query.")

        u_var = var_mapping.get("current_u")
        v_var = var_mapping.get("current_v")

        if not u_var or not v_var or u_var not in ds.data_vars or v_var not in ds.data_vars:
            raise ValueError(f"Current velocity variables ({u_var}, {v_var}) not present in dataset '{filename}'.")

        lat_dim = dim_mapping.get("latitude", "latitude")
        lon_dim = dim_mapping.get("longitude", "longitude")
        depth_dim = dim_mapping.get("depth", "depth")
        time_dim = dim_mapping.get("time", "time")

        selectors = {
            lat_dim: latitude,
            lon_dim: longitude,
        }
        if depth_dim in ds[u_var].dims:
            selectors[depth_dim] = depth
        if time_dim in ds[u_var].dims and sel_model_time:
            selectors[time_dim] = self._to_naive_datetime64(sel_model_time)

        sliced_u = ds[u_var].sel(selectors, method="nearest")
        sliced_v = ds[v_var].sel(selectors, method="nearest")

        u_val = float(np.ravel(sliced_u.values)[0])
        v_val = float(np.ravel(sliced_v.values)[0])

        speed = math.sqrt(u_val**2 + v_val**2) if (not np.isnan(u_val) and not np.isnan(v_val)) else 0.0
        # Direction: angle of current flow towards (0 = North, 90 = East)
        direction_rad = math.atan2(u_val, v_val)
        direction_deg = (math.degrees(direction_rad) + 360.0) % 360.0

        actual_lat = float(sliced_u[lat_dim].values.item()) if lat_dim in sliced_u.coords else latitude
        actual_lon = float(sliced_u[lon_dim].values.item()) if lon_dim in sliced_u.coords else longitude

        res = OceanModelCurrent(
            source="INCOIS",
            provider="INCOIS RSMC",
            model="HYCOM",
            dataset="INCOIS_RSMC_HYCOM",
            retrieved_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            latitude=actual_lat,
            longitude=actual_lon,
            depth=depth,
            time=time_str or sel_model_time or "latest",
            model_time=sel_model_time or "latest",
            u=round(u_val, 4),
            v=round(v_val, 4),
            speed=round(speed, 4),
            direction=round(direction_deg, 2),
            unit="m/s",
            selected_file=filename,
            time_difference_hours=time_diff_hours,
        )
        self.cache.set(cache_key, res, ttl=self.cache_ttl)
        logger.info(
            f"[CACHE MISS] Current query at ({latitude:.2f}, {longitude:.2f}, {depth}m) "
            f"speed={speed:.2f}m/s dir={direction_deg:.1f}° in {(time.time() - t0)*1000:.2f}ms"
        )
        return res

    def get_timeseries(
        self,
        latitude: float,
        longitude: float,
        depth: float = 0.0,
        variable: str = "temperature",
        start_time: Optional[str] = None,
        end_time: Optional[str] = None,
    ) -> OceanModelTimeseriesResponse:
        """
        Extract time-series across all available HYCOM NetCDF files or remote OPeNDAP dataset with caching.
        """
        self.validate_coordinates(latitude, longitude, depth)
        self.validate_timeseries_bounds(start_time, end_time)

        if settings.HYCOM_DATA_SOURCE == "remote":
            return self.remote_service.get_timeseries(
                latitude=latitude,
                longitude=longitude,
                depth=depth,
                variable=variable,
                start_time=start_time,
                end_time=end_time,
            )

        t0 = time.time()
        cache_key = f"ts_{variable}_{latitude:.3f}_{longitude:.3f}_{depth:.1f}_{start_time or 'min'}_{end_time or 'max'}"
        cached = self.cache.get(cache_key)
        if cached:
            logger.debug(f"[CACHE HIT] Timeseries query for {variable} in {(time.time() - t0)*1000:.2f}ms")
            return cached

        res = self.dataset_manager.get_timeseries(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            variable=variable,
            start_time=start_time,
            end_time=end_time,
        )
        self.cache.set(cache_key, res, ttl=self.cache_ttl)
        logger.info(
            f"[CACHE MISS] Timeseries query ({variable}) points={res.count} in {(time.time() - t0)*1000:.2f}ms"
        )
        return res

    @staticmethod
    def calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate great circle distance between two points in km."""
        r = 6371.0
        p1 = math.radians(lat1)
        p2 = math.radians(lat2)
        dp = math.radians(lat2 - lat1)
        dl = math.radians(lon2 - lon1)
        a = math.sin(dp / 2.0) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2.0) ** 2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(r * c, 2)

    def compare_with_argo_profile(
        self,
        platform_number: str,
        cycle_number: int,
        obs_lat: float,
        obs_lon: float,
        obs_time: str,
        argo_levels: List[Dict[str, Any]],
    ) -> ModelObservationComparisonResponse:
        """
        Compare real INCOIS Argo profile with the nearest matching INCOIS HYCOM NetCDF file and model timestep.
        Computes spatial distance, time offset, and statistical metrics (Bias, RMSE, MAE).
        """
        self.validate_coordinates(obs_lat, obs_lon, 0.0)

        t0 = time.time()
        cache_key = f"comp_argo_{platform_number}_{cycle_number}_{obs_time}"
        cached = self.cache.get(cache_key)
        if cached:
            logger.debug(f"[CACHE HIT] Argo comparison for float {platform_number} in {(time.time() - t0)*1000:.2f}ms")
            return cached

        try:
            hycom_prof = self.get_profile(latitude=obs_lat, longitude=obs_lon, time_str=obs_time)
        except ValueError as ve:
            # Handle unmounted / unavailable HYCOM storage gracefully with clear scientific status
            logger.warning(f"HYCOM profile unavailable for Argo comparison float {platform_number}: {ve}")
            hycom_prof = None

        if hycom_prof is None:
            items_unavail: List[ModelObservationComparisonItem] = []
            for lvl in argo_levels:
                raw_pres = lvl.get("pressure", 0.0)
                if is_fill_value(raw_pres):
                    continue
                pressure_depth = round(float(raw_pres), 1)
                clean_obs_temp, _ = validate_temperature(lvl.get("temperature"))
                clean_obs_sal, _ = validate_salinity(lvl.get("salinity"))
                items_unavail.append(
                    ModelObservationComparisonItem(
                        depth=pressure_depth,
                        model_temperature=None,
                        observed_temperature=clean_obs_temp,
                        temperature_difference=None,
                        model_salinity=None,
                        observed_salinity=clean_obs_sal,
                        salinity_difference=None,
                        qc_status="PASSED" if (clean_obs_temp is not None or clean_obs_sal is not None) else "FLAGGED",
                        is_valid_pair=False,
                    )
                )
            return ModelObservationComparisonResponse(
                source_model="INCOIS HYCOM",
                source_observation="INCOIS Argo",
                platform_number=platform_number,
                cycle_number=cycle_number,
                observation_latitude=obs_lat,
                observation_longitude=obs_lon,
                model_latitude=obs_lat,
                model_longitude=obs_lon,
                distance_km=0.0,
                observation_time=obs_time,
                model_time="UNAVAILABLE",
                time_difference_hours=0.0,
                selected_file="HYCOM DATA STORAGE NOT MOUNTED",
                matched_depth_count=len(items_unavail),
                valid_pairs_count=0,
                missing_count=0,
                qc_pass_count=len(items_unavail),
                qc_fail_count=0,
                temp_bias=None,
                temp_rmse=None,
                temp_mae=None,
                sal_bias=None,
                sal_rmse=None,
                sal_mae=None,
                profile_comparison=items_unavail,
            )

        distance_km = self.calculate_haversine_km(obs_lat, obs_lon, hycom_prof.latitude, hycom_prof.longitude)

        # Time difference calculation in hours
        t_obs = pd.to_datetime(obs_time)
        t_model = pd.to_datetime(hycom_prof.model_time)
        time_diff_hours = round(abs((t_model - t_obs).total_seconds()) / 3600.0, 2)

        # Map model profile levels by depth for quick depth lookup
        model_by_depth = {p.depth: p for p in hycom_prof.profile}
        model_depths = np.array(list(model_by_depth.keys()))

        items: List[ModelObservationComparisonItem] = []
        temp_diffs: List[float] = []
        sal_diffs: List[float] = []
        qc_pass_count = 0
        qc_fail_count = 0
        valid_pairs_count = 0
        missing_count = 0

        for lvl in argo_levels:
            raw_pres = lvl.get("pressure", 0.0)
            if is_fill_value(raw_pres):
                missing_count += 1
                continue

            pressure_depth = round(float(raw_pres), 1)
            raw_obs_temp = lvl.get("temperature")
            raw_obs_sal = lvl.get("salinity")

            clean_obs_temp, temp_qc = validate_temperature(raw_obs_temp)
            clean_obs_sal, sal_qc = validate_salinity(raw_obs_sal)

            # Match nearest model depth
            mod_temp, mod_sal = None, None
            if len(model_depths) > 0:
                idx = (np.abs(model_depths - pressure_depth)).argmin()
                matched_depth = model_depths[idx]
                m_level = model_by_depth[matched_depth]
                mod_temp, _ = validate_temperature(m_level.temperature)
                mod_sal, _ = validate_salinity(m_level.salinity)

            is_valid_temp = (clean_obs_temp is not None and mod_temp is not None)
            is_valid_sal = (clean_obs_sal is not None and mod_sal is not None)
            is_valid_pair = is_valid_temp or is_valid_sal

            t_diff = round(mod_temp - clean_obs_temp, 3) if is_valid_temp else None
            s_diff = round(mod_sal - clean_obs_sal, 3) if is_valid_sal else None

            if t_diff is not None:
                temp_diffs.append(t_diff)
            if s_diff is not None:
                sal_diffs.append(s_diff)

            if is_valid_pair:
                valid_pairs_count += 1
                qc_pass_count += 1
            else:
                qc_fail_count += 1

            items.append(
                ModelObservationComparisonItem(
                    depth=pressure_depth,
                    model_temperature=mod_temp,
                    observed_temperature=clean_obs_temp,
                    temperature_difference=t_diff,
                    model_salinity=mod_sal,
                    observed_salinity=clean_obs_sal,
                    salinity_difference=s_diff,
                    qc_status="PASSED" if is_valid_pair else "FLAGGED",
                    is_valid_pair=is_valid_pair,
                )
            )

        # Statistical Metrics Calculation using only valid non-NaN pairs
        temp_bias, temp_rmse, temp_mae = compute_metrics(temp_diffs)
        sal_bias, sal_rmse, sal_mae = compute_metrics(sal_diffs)

        res = ModelObservationComparisonResponse(
            source_model="INCOIS HYCOM",
            source_observation="INCOIS Argo",
            platform_number=platform_number,
            cycle_number=cycle_number,
            observation_latitude=obs_lat,
            observation_longitude=obs_lon,
            model_latitude=hycom_prof.latitude,
            model_longitude=hycom_prof.longitude,
            distance_km=distance_km,
            observation_time=obs_time,
            model_time=hycom_prof.model_time,
            time_difference_hours=time_diff_hours,
            selected_file=hycom_prof.selected_file,
            matched_depth_count=len(items),
            valid_pairs_count=valid_pairs_count,
            missing_count=missing_count,
            qc_pass_count=qc_pass_count,
            qc_fail_count=qc_fail_count,
            temp_bias=temp_bias,
            temp_rmse=temp_rmse,
            temp_mae=temp_mae,
            sal_bias=sal_bias,
            sal_rmse=sal_rmse,
            sal_mae=sal_mae,
            profile_comparison=items,
        )
        self.cache.set(cache_key, res, ttl=self.cache_ttl)
        logger.info(
            f"[CACHE MISS] Argo comparison float={platform_number} cyc={cycle_number} "
            f"dist={distance_km}km valid_pairs={valid_pairs_count} in {(time.time() - t0)*1000:.2f}ms"
        )
        return res


# Singleton HYCOM Service Instance
hycom_service = INCOISHYCOMService()
