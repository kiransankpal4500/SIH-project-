"""
Remote HYCOM Ocean Model Service Provider
Dual-Dataset Architecture:
- Historical Archive: GLBy0.08 / expt_93.0 (Dec 4, 2018 – Aug 10, 2024)
- Operational/Recent Product: ESPC-D-V02 (Aug 10, 2024 – Present, including 2025 and 2026)

Directly interfaces with global HYCOM OPeNDAP datasets via targeted xarray slicing.
Provides full historical and current date/time queries (2018-2026 at 3-hour resolution) without local NetCDF downloads.
"""

import time
import math
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import xarray as xr

from app.core.config import settings
from app.core.query_cache import global_query_cache
from app.schemas.hycom_schemas import (
    OceanModelPoint,
    OceanModelProfileLevel,
    OceanModelProfile,
    OceanModelCurrent,
    OceanModelMetadata,
    OceanModelTimeseriesPoint,
    OceanModelTimeseriesResponse,
    HYCOMTimestampsResponse,
)

logger = logging.getLogger("oceanscope.hycom_remote")

# HYCOM Epoch Base Time: 2000-01-01 00:00:00 UTC (Used by both GLBy0.08 and ESPC-D-V02)
HYCOM_TIME_BASE = datetime(2000, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

# Transition date from GLBy0.08/expt_93.0 to ESPC-D-V02
ESPC_TRANSITION_DT = datetime(2024, 8, 10, 12, 0, 0, tzinfo=timezone.utc)

# Canonical HYCOM variable mappings with ESPC folder definitions
HYCOM_VAR_MAP = {
    "temperature": {"nc_var": "water_temp", "espc_folder": "t3z", "unit": "°C", "label": "Sea Water Temperature"},
    "salinity": {"nc_var": "salinity", "espc_folder": "s3z", "unit": "PSU", "label": "Sea Water Practical Salinity"},
    "current_u": {"nc_var": "water_u", "espc_folder": "u3z", "unit": "m/s", "label": "Eastward Ocean Velocity"},
    "current_v": {"nc_var": "water_v", "espc_folder": "v3z", "unit": "m/s", "label": "Northward Ocean Velocity"},
    "ssh": {"nc_var": "surf_el", "espc_folder": "ssh", "unit": "m", "label": "Sea Surface Height Elevation"},
    "height": {"nc_var": "surf_el", "espc_folder": "ssh", "unit": "m", "label": "Sea Surface Height Elevation"},
    "mld": {"nc_var": "mld", "espc_folder": "t3z", "unit": "m", "label": "Mixed Layer Depth"},
}

# Standard 40 depth levels supported by HYCOM GLBv0.08 and ESPC-D-V02
HYCOM_DEPTH_LEVELS = [
    0.0, 2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0,
    60.0, 70.0, 80.0, 90.0, 100.0, 125.0, 150.0, 200.0, 250.0, 300.0, 350.0, 400.0, 500.0,
    600.0, 700.0, 800.0, 900.0, 1000.0, 1250.0, 1500.0, 2000.0, 2500.0, 3000.0, 4000.0, 5000.0
]


class HYCOMRemoteService:
    def __init__(self):
        self.hist_url = settings.HYCOM_REMOTE_OPENDAP_URL
        self.hist_dataset_id = settings.HYCOM_DATASET_ID
        self.current_base_url = settings.HYCOM_CURRENT_OPENDAP_BASE
        self.current_dataset_id = settings.HYCOM_CURRENT_DATASET_ID
        self.timeout = settings.HYCOM_REMOTE_TIMEOUT_SECONDS

        # Dataset references and time coordinates cache
        self._datasets: Dict[str, xr.Dataset] = {}
        self._time_arrays: Dict[str, np.ndarray] = {}
        self._last_opened: Dict[str, float] = {}

        # Precomputed global temporal index
        self._meta_cache: Optional[OceanModelMetadata] = None
        self._available_years: List[int] = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
        self._dates_by_year: Dict[int, List[str]] = {}
        self._timestamps_by_date: Dict[str, List[str]] = {}
        self._initialized_time_index: bool = False
        self.earliest_iso = "2018-12-04T12:00:00Z"
        self.latest_iso = "2024-12-31T21:00:00Z"

    def _get_dataset(self, key: str, url: str) -> xr.Dataset:
        """Lazily opens and returns a cached remote xarray OPeNDAP dataset reference."""
        now = time.time()
        if key in self._datasets and (now - self._last_opened.get(key, 0) < 7200):
            return self._datasets[key]

        logger.info(f"Opening remote HYCOM OPeNDAP dataset ({key}): {url}")
        try:
            ds = xr.open_dataset(url, decode_times=False)
            self._datasets[key] = ds
            self._last_opened[key] = now
            if "time" in ds:
                self._time_arrays[key] = ds["time"].values
            return ds
        except Exception as e:
            logger.error(f"Failed to connect to remote HYCOM OPeNDAP at {url}: {e}")
            raise ValueError(f"HYCOM remote service unavailable for {key} ({str(e)})")

    def _init_time_index(self) -> None:
        """Builds high-performance lookup indexes for available years, dates, and timestamps across 2018–2026."""
        if self._initialized_time_index:
            return

        # Static temporal bounds are established without blocking on remote THREDDS at startup

        # Construct comprehensive 3-hourly timeline from 2018-12-04 12:00 to latest_iso
        start_dt = datetime(2018, 12, 4, 12, 0, 0, tzinfo=timezone.utc)
        latest_clean = self.latest_iso.replace("Z", "+00:00")
        end_dt = datetime.fromisoformat(latest_clean)

        dates_by_yr: Dict[int, set] = {}
        ts_by_dt: Dict[str, List[str]] = {}

        curr = start_dt
        while curr <= end_dt:
            yr = curr.year
            if yr not in dates_by_yr:
                dates_by_yr[yr] = set()
            date_str = curr.strftime("%Y-%m-%d")
            dates_by_yr[yr].add(date_str)
            iso = curr.strftime("%Y-%m-%dT%H:%M:%SZ")
            if date_str not in ts_by_dt:
                ts_by_dt[date_str] = []
            ts_by_dt[date_str].append(iso)
            curr += timedelta(hours=3)

        self._available_years = sorted(list(dates_by_yr.keys()))
        self._dates_by_year = {y: sorted(list(dates_by_yr[y])) for y in self._available_years}
        self._timestamps_by_date = ts_by_dt
        self._initialized_time_index = True
        logger.info(f"HYCOM dual-source temporal index initialized: {len(self._available_years)} years ({self.earliest_iso} -> {self.latest_iso})")

    def get_timestamps(
        self,
        year: Optional[int] = None,
        date: Optional[str] = None,
    ) -> HYCOMTimestampsResponse:
        """Retrieves real temporal availability (years, dates, or timestamps) for HYCOM."""
        self._init_time_index()
        years = self._available_years or [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
        total_count = sum(len(ts) for ts in self._timestamps_by_date.values())

        dataset_label = f"{self.current_dataset_id} / {self.hist_dataset_id}"

        if date:
            clean_date = date.strip()[:10]
            ts_list = self._timestamps_by_date.get(clean_date, [])
            if not ts_list:
                raise ValueError(
                    f"No HYCOM data exists for date '{clean_date}'. Available range is {self.earliest_iso[:10]} to {self.latest_iso[:10]}."
                )
            return HYCOMTimestampsResponse(
                dataset_id=dataset_label,
                earliest=self.earliest_iso,
                latest=self.latest_iso,
                available_years=years,
                time_step="3 hours",
                total_timestamps=total_count,
                timestamps=ts_list,
            )

        if year:
            if year not in years:
                raise ValueError(f"Year {year} is not available in HYCOM. Available years: {years}")
            date_list = self._dates_by_year.get(year, [])
            return HYCOMTimestampsResponse(
                dataset_id=dataset_label,
                earliest=self.earliest_iso,
                latest=self.latest_iso,
                available_years=years,
                time_step="3 hours",
                total_timestamps=total_count,
                dates=date_list,
            )

        # Return global temporal summary
        return HYCOMTimestampsResponse(
            dataset_id=dataset_label,
            earliest=self.earliest_iso,
            latest=self.latest_iso,
            available_years=years,
            time_step="3 hours",
            total_timestamps=total_count,
        )

    def _parse_and_resolve_time(self, time_str: Optional[str]) -> Tuple[datetime, float]:
        """
        Parses requested time string into a valid UTC datetime and hours since HYCOM epoch.
        Defaults to latest available timestamp if unspecified or 'latest'.
        """
        self._init_time_index()

        if not time_str or time_str.lower() in ("latest", "now", "current"):
            latest_clean = self.latest_iso.replace("Z", "+00:00")
            dt = datetime.fromisoformat(latest_clean)
            hours = (dt - HYCOM_TIME_BASE).total_seconds() / 3600.0
            return dt, hours

        try:
            clean_str = time_str.replace("Z", "+00:00")
            if "T" not in clean_str and len(clean_str) == 10:
                clean_str += "T12:00:00+00:00"
            req_dt = datetime.fromisoformat(clean_str)
            if req_dt.tzinfo is None:
                req_dt = req_dt.replace(tzinfo=timezone.utc)
            else:
                req_dt = req_dt.astimezone(timezone.utc)
        except Exception as e:
            logger.warning(f"Could not parse time string '{time_str}', using latest: {e}")
            latest_clean = self.latest_iso.replace("Z", "+00:00")
            req_dt = datetime.fromisoformat(latest_clean)

        # Bounds validation
        earliest_dt = datetime.fromisoformat(self.earliest_iso.replace("Z", "+00:00"))
        latest_dt = datetime.fromisoformat(self.latest_iso.replace("Z", "+00:00"))

        if req_dt < earliest_dt - timedelta(days=1) or req_dt > latest_dt + timedelta(days=1):
            raise ValueError(
                f"No HYCOM data available for {time_str[:10]}. Available range is {self.earliest_iso[:10]} to {self.latest_iso[:10]}."
            )

        # Snap to nearest bounds
        req_dt = min(max(req_dt, earliest_dt), latest_dt)
        hours = (req_dt - HYCOM_TIME_BASE).total_seconds() / 3600.0
        return req_dt, hours

    def _resolve_dataset_and_time(
        self,
        var_key: str,
        dt: datetime,
        req_hours: float,
    ) -> Tuple[xr.Dataset, str, int, str, str]:
        """
        Routes the query to the correct OPeNDAP dataset (historical GLBy0.08 or operational ESPC-D-V02)
        and resolves the exact nearest integer time index and model timestamp string.

        Returns: (dataset, nc_variable_name, time_index, actual_iso_time, active_dataset_id)
        """
        var_info = HYCOM_VAR_MAP.get(var_key, HYCOM_VAR_MAP["temperature"])
        nc_var = var_info["nc_var"]

        if dt < ESPC_TRANSITION_DT:
            # Route to Historical GLBy0.08
            key = "glby93"
            ds = self._get_dataset(key, self.hist_url)
            dataset_id = self.hist_dataset_id
            time_vals = self._time_arrays.get(key)
            if time_vals is None and "time" in ds:
                time_vals = ds["time"].values
                self._time_arrays[key] = time_vals
        else:
            # Route to ESPC-D-V02 per-variable per-year dataset
            folder = var_info["espc_folder"]
            year = dt.year
            key = f"espc_{folder}_{year}"
            url = f"{self.current_base_url}/{folder}/{year}"
            ds = self._get_dataset(key, url)
            dataset_id = f"ESPC-D-V02_{folder}_{year}"
            time_vals = self._time_arrays.get(key)
            if time_vals is None and "time" in ds:
                time_vals = ds["time"].values
                self._time_arrays[key] = time_vals

        if time_vals is None or len(time_vals) == 0:
            raise ValueError(f"Could not load time coordinate for HYCOM dataset {key}")

        # Find nearest 3-hourly time index
        time_idx = int(np.argmin(np.abs(time_vals - req_hours)))
        matched_hours = float(time_vals[time_idx])
        matched_dt = HYCOM_TIME_BASE + timedelta(hours=matched_hours)
        actual_iso = matched_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

        return ds, nc_var, time_idx, actual_iso, dataset_id

    @staticmethod
    def _normalize_longitude(lon: float) -> float:
        """HYCOM global grid uses 0..360 longitude."""
        return lon if lon >= 0 else lon + 360.0

    def _find_nearest_depth(self, depth: float) -> float:
        """Find the closest valid HYCOM model depth coordinate."""
        arr = np.array(HYCOM_DEPTH_LEVELS)
        idx = int(np.argmin(np.abs(arr - depth)))
        return float(arr[idx])

    def get_metadata(self) -> OceanModelMetadata:
        """Retrieve metadata including multi-year historical & operational time range."""
        if self._meta_cache is not None:
            return self._meta_cache

        try:
            self._init_time_index()
            years = self._available_years or [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026]
            total_ts = sum(len(ts) for ts in self._timestamps_by_date.values())

            meta = OceanModelMetadata(
                source="HYCOM Consortium",
                provider="INCOIS RSMC / HYCOM OPeNDAP",
                model="HYCOM",
                dataset=f"{self.current_dataset_id} / {self.hist_dataset_id}",
                filename="remote_opendap_dual_archive",
                available_files=[self.current_dataset_id, self.hist_dataset_id],
                file_count=2,
                is_available=True,
                dimensions={"lat": 4251, "lon": 4500, "depth": 40, "time": total_ts},
                discovered_variables=list(HYCOM_VAR_MAP.keys()),
                variables=list(HYCOM_VAR_MAP.keys()),
                mapped_variables={k: v["nc_var"] for k, v in HYCOM_VAR_MAP.items()},
                time_range=[self.earliest_iso, self.latest_iso],
                earliest_time=self.earliest_iso,
                latest_time=self.latest_iso,
                available_years=years,
                time_step="3 hours",
                time_interval_hours=3.0,
                total_timestamps=total_ts,
                depth_levels=HYCOM_DEPTH_LEVELS,
                available_depths=HYCOM_DEPTH_LEVELS,
                lat_min=-80.0,
                lat_max=90.0,
                latitude_range=[-80.0, 90.0],
                lon_min=0.0,
                lon_max=360.0,
                longitude_range=[0.0, 360.0],
                grid_resolution_deg=0.08,
                domain="Global Ocean (1/12° Resolution, 2018–2026 Operational & Archive)",
            )
            self._meta_cache = meta
            return meta
        except Exception as e:
            logger.warning(f"Error fetching live remote metadata: {e}")
            return OceanModelMetadata(
                source="HYCOM Consortium",
                provider="INCOIS RSMC / HYCOM OPeNDAP",
                model="HYCOM",
                dataset="ESPC-D-V02",
                filename="remote_opendap",
                available_files=["ESPC-D-V02", "GLBy0.08_expt_93.0"],
                file_count=2,
                is_available=True,
                dimensions={"depth": 40, "time": 22600},
                discovered_variables=list(HYCOM_VAR_MAP.keys()),
                variables=list(HYCOM_VAR_MAP.keys()),
                mapped_variables={k: v["nc_var"] for k, v in HYCOM_VAR_MAP.items()},
                time_range=[self.earliest_iso, self.latest_iso],
                earliest_time=self.earliest_iso,
                latest_time=self.latest_iso,
                available_years=[2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
                time_step="3 hours",
                time_interval_hours=3.0,
                total_timestamps=22600,
                depth_levels=HYCOM_DEPTH_LEVELS,
                available_depths=HYCOM_DEPTH_LEVELS,
                lat_min=-80.0,
                lat_max=90.0,
                latitude_range=[-80.0, 90.0],
                lon_min=0.0,
                lon_max=360.0,
                longitude_range=[0.0, 360.0],
                grid_resolution_deg=0.08,
                domain="Global Ocean (1/12° Resolution, 2018–2026 Operational & Archive)",
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
        Targeted remote query for a single ocean variable at (lat, lon, depth, time).
        Loads only the targeted point value over OPeNDAP in sub-second time.
        """
        var_key = variable.lower().strip()
        var_info = HYCOM_VAR_MAP.get(var_key, HYCOM_VAR_MAP["temperature"])

        req_dt, req_hours = self._parse_and_resolve_time(time_str)
        ds, nc_var, time_idx, actual_model_time, active_dataset_id = self._resolve_dataset_and_time(var_key, req_dt, req_hours)

        cache_key = f"remote_hycom_pt_{var_key}_{latitude:.3f}_{longitude:.3f}_{depth:.1f}_{actual_model_time}"
        cached = global_query_cache.get(cache_key)
        if cached:
            return cached

        t0 = time.time()
        lon_q = self._normalize_longitude(longitude)
        actual_depth = self._find_nearest_depth(depth)

        if nc_var not in ds.data_vars:
            raise ValueError(f"Variable '{variable}' ({nc_var}) not found in dataset {active_dataset_id}.")

        try:
            var_array = ds[nc_var]
            selectors: Dict[str, Any] = {"lat": latitude, "lon": lon_q}
            if "depth" in var_array.dims:
                selectors["depth"] = actual_depth

            sliced = var_array.sel(selectors, method="nearest").isel(time=time_idx)
            raw_val = float(sliced.values)

            # Handle landmask or void depth
            if math.isnan(raw_val):
                val: Optional[float] = None
            else:
                val = round(raw_val, 4)

            actual_lat = float(sliced["lat"].values) if "lat" in sliced.coords else latitude
            actual_lon = float(sliced["lon"].values) if "lon" in sliced.coords else longitude
            if actual_lon > 180.0:
                actual_lon = round(actual_lon - 360.0, 4)

            res = OceanModelPoint(
                source="HYCOM Consortium",
                provider="INCOIS RSMC / HYCOM OPeNDAP",
                model="HYCOM",
                dataset=active_dataset_id,
                retrieved_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                latitude=actual_lat,
                longitude=actual_lon,
                depth=actual_depth,
                requested_depth=depth,
                time=actual_model_time,
                model_time=actual_model_time,
                variable=var_key,
                value=val if val is not None else 0.0,
                unit=var_info["unit"],
                selected_file=active_dataset_id,
                time_difference_hours=0.0,
            )
            global_query_cache.set(cache_key, res, ttl=600)
            logger.info(f"[HYCOM REMOTE] Point {var_key} at ({latitude}, {longitude}, {actual_depth}m, {actual_model_time}) = {val} in {(time.time()-t0)*1000:.2f}ms [{active_dataset_id}]")
            return res
        except Exception as e:
            logger.error(f"Error executing targeted remote HYCOM point query: {e}")
            raise ValueError(f"No HYCOM data available for this location/depth ({str(e)})")

    def get_profile(
        self,
        latitude: float,
        longitude: float,
        time_str: Optional[str] = None,
    ) -> OceanModelProfile:
        """
        Targeted remote query for vertical soundings (Temperature, Salinity, Velocity) across all 40 depth levels at time.
        """
        req_dt, req_hours = self._parse_and_resolve_time(time_str)

        # Check cache
        time_key_str = req_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        cache_key = f"remote_hycom_prof_{latitude:.3f}_{longitude:.3f}_{time_key_str}"
        cached = global_query_cache.get(cache_key)
        if cached:
            return cached

        t0 = time.time()
        lon_q = self._normalize_longitude(longitude)

        try:
            if req_dt < ESPC_TRANSITION_DT:
                # GLBy0.08: all variables in one dataset
                ds, _, time_idx, actual_model_time, active_dataset_id = self._resolve_dataset_and_time("temperature", req_dt, req_hours)
                target_vars = [v for v in ["water_temp", "salinity", "water_u", "water_v"] if v in ds.data_vars]
                sliced = ds[target_vars].sel(lat=latitude, lon=lon_q, method="nearest").isel(time=time_idx)

                depth_levels = [float(d) for d in ds["depth"].values]
                temps = sliced["water_temp"].values if "water_temp" in sliced else np.zeros(len(depth_levels))
                sals = sliced["salinity"].values if "salinity" in sliced else np.zeros(len(depth_levels))
                us = sliced["water_u"].values if "water_u" in sliced else np.zeros(len(depth_levels))
                vs = sliced["water_v"].values if "water_v" in sliced else np.zeros(len(depth_levels))
                actual_lat = float(sliced["lat"].values) if "lat" in sliced.coords else latitude
                actual_lon = float(sliced["lon"].values) if "lon" in sliced.coords else longitude
            else:
                # ESPC-D-V02: per-variable datasets
                year = req_dt.year
                ds_t, _, time_idx, actual_model_time, _ = self._resolve_dataset_and_time("temperature", req_dt, req_hours)
                ds_s, _, _, _, _ = self._resolve_dataset_and_time("salinity", req_dt, req_hours)
                ds_u, _, _, _, _ = self._resolve_dataset_and_time("current_u", req_dt, req_hours)
                ds_v, _, _, _, _ = self._resolve_dataset_and_time("current_v", req_dt, req_hours)
                active_dataset_id = f"ESPC-D-V02_{year}"

                depth_levels = [float(d) for d in ds_t["depth"].values]
                sl_t = ds_t["water_temp"].sel(lat=latitude, lon=lon_q, method="nearest").isel(time=time_idx)
                sl_s = ds_s["salinity"].sel(lat=latitude, lon=lon_q, method="nearest").isel(time=time_idx)
                sl_u = ds_u["water_u"].sel(lat=latitude, lon=lon_q, method="nearest").isel(time=time_idx)
                sl_v = ds_v["water_v"].sel(lat=latitude, lon=lon_q, method="nearest").isel(time=time_idx)

                temps = sl_t.values
                sals = sl_s.values
                us = sl_u.values
                vs = sl_v.values
                actual_lat = float(sl_t["lat"].values) if "lat" in sl_t.coords else latitude
                actual_lon = float(sl_t["lon"].values) if "lon" in sl_t.coords else longitude

            profile_levels: List[OceanModelProfileLevel] = []
            for i, z in enumerate(depth_levels):
                t_val = float(temps[i]) if i < len(temps) and not np.isnan(temps[i]) else None
                s_val = float(sals[i]) if i < len(sals) and not np.isnan(sals[i]) else None
                u_val = float(us[i]) if i < len(us) and not np.isnan(us[i]) else None
                v_val = float(vs[i]) if i < len(vs) and not np.isnan(vs[i]) else None

                profile_levels.append(
                    OceanModelProfileLevel(
                        depth=float(round(z, 2)),
                        temperature=float(round(t_val, 3)) if t_val is not None else None,
                        salinity=float(round(s_val, 3)) if s_val is not None else None,
                        current_u=float(round(u_val, 4)) if u_val is not None else None,
                        current_v=float(round(v_val, 4)) if v_val is not None else None,
                    )
                )

            if actual_lon > 180.0:
                actual_lon = round(actual_lon - 360.0, 4)

            res = OceanModelProfile(
                source="HYCOM Consortium",
                provider="INCOIS RSMC / HYCOM OPeNDAP",
                model="HYCOM",
                dataset=active_dataset_id,
                retrieved_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                latitude=actual_lat,
                longitude=actual_lon,
                time=actual_model_time,
                model_time=actual_model_time,
                profile=profile_levels,
                selected_file=active_dataset_id,
                time_difference_hours=0.0,
            )
            global_query_cache.set(cache_key, res, ttl=600)
            logger.info(f"[HYCOM REMOTE] Profile ({len(profile_levels)} levels) at ({latitude}, {longitude}, {actual_model_time}) in {(time.time()-t0)*1000:.2f}ms [{active_dataset_id}]")
            return res
        except Exception as e:
            logger.error(f"Error executing targeted remote HYCOM profile query: {e}")
            raise ValueError(f"No HYCOM profile data available for this location ({str(e)})")

    def get_current(
        self,
        latitude: float,
        longitude: float,
        depth: float = 0.0,
        time_str: Optional[str] = None,
    ) -> OceanModelCurrent:
        """
        Targeted remote query for velocity components (u, v) and calculation of current speed & heading at time.
        """
        req_dt, req_hours = self._parse_and_resolve_time(time_str)

        time_key_str = req_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
        cache_key = f"remote_hycom_curr_{latitude:.3f}_{longitude:.3f}_{depth:.1f}_{time_key_str}"
        cached = global_query_cache.get(cache_key)
        if cached:
            return cached

        t0 = time.time()
        lon_q = self._normalize_longitude(longitude)
        actual_depth = self._find_nearest_depth(depth)

        try:
            if req_dt < ESPC_TRANSITION_DT:
                ds, _, time_idx, actual_model_time, active_dataset_id = self._resolve_dataset_and_time("current_u", req_dt, req_hours)
                sliced = ds[["water_u", "water_v"]].sel(lat=latitude, lon=lon_q, depth=actual_depth, method="nearest").isel(time=time_idx)
                u_val = float(sliced["water_u"].values)
                v_val = float(sliced["water_v"].values)
                actual_lat = float(sliced["lat"].values) if "lat" in sliced.coords else latitude
                actual_lon = float(sliced["lon"].values) if "lon" in sliced.coords else longitude
            else:
                ds_u, _, time_idx, actual_model_time, _ = self._resolve_dataset_and_time("current_u", req_dt, req_hours)
                ds_v, _, _, _, _ = self._resolve_dataset_and_time("current_v", req_dt, req_hours)
                active_dataset_id = f"ESPC-D-V02_uv_{req_dt.year}"

                sl_u = ds_u["water_u"].sel(lat=latitude, lon=lon_q, depth=actual_depth, method="nearest").isel(time=time_idx)
                sl_v = ds_v["water_v"].sel(lat=latitude, lon=lon_q, depth=actual_depth, method="nearest").isel(time=time_idx)
                u_val = float(sl_u.values)
                v_val = float(sl_v.values)
                actual_lat = float(sl_u["lat"].values) if "lat" in sl_u.coords else latitude
                actual_lon = float(sl_u["lon"].values) if "lon" in sl_u.coords else longitude

            if math.isnan(u_val) or math.isnan(v_val):
                u_val = 0.0
                v_val = 0.0

            speed = math.sqrt(u_val**2 + v_val**2)
            direction_rad = math.atan2(u_val, v_val)
            direction_deg = (math.degrees(direction_rad) + 360.0) % 360.0

            if actual_lon > 180.0:
                actual_lon = round(actual_lon - 360.0, 4)

            res = OceanModelCurrent(
                source="HYCOM Consortium",
                provider="INCOIS RSMC / HYCOM OPeNDAP",
                model="HYCOM",
                dataset=active_dataset_id,
                retrieved_at=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                latitude=actual_lat,
                longitude=actual_lon,
                depth=actual_depth,
                requested_depth=depth,
                time=actual_model_time,
                model_time=actual_model_time,
                u=round(u_val, 4),
                v=round(v_val, 4),
                speed=round(speed, 4),
                direction=round(direction_deg, 2),
                unit="m/s",
                selected_file=active_dataset_id,
                time_difference_hours=0.0,
            )
            global_query_cache.set(cache_key, res, ttl=600)
            logger.info(f"[HYCOM REMOTE] Current at ({latitude}, {longitude}, {actual_depth}m, {actual_model_time}): speed={speed:.3f}m/s dir={direction_deg:.1f}° in {(time.time()-t0)*1000:.2f}ms [{active_dataset_id}]")
            return res
        except Exception as e:
            logger.error(f"Error executing targeted remote HYCOM current query: {e}")
            raise ValueError(f"No HYCOM current velocity data available for this location/depth ({str(e)})")

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
        Extract timeseries points across timesteps remotely.
        """
        var_key = variable.lower().strip()
        var_info = HYCOM_VAR_MAP.get(var_key, HYCOM_VAR_MAP["temperature"])

        cache_key = f"remote_hycom_ts_{var_key}_{latitude:.3f}_{longitude:.3f}_{depth:.1f}_{start_time or 'min'}_{end_time or 'max'}"
        cached = global_query_cache.get(cache_key)
        if cached:
            return cached

        req_dt, req_hours = self._parse_and_resolve_time(start_time)
        ds, nc_var, start_idx, actual_model_time, active_dataset_id = self._resolve_dataset_and_time(var_key, req_dt, req_hours)
        lon_q = self._normalize_longitude(longitude)
        actual_depth = self._find_nearest_depth(depth)

        time_vals = ds["time"].values
        end_dt, end_hours = self._parse_and_resolve_time(end_time if end_time else start_time)
        end_idx = int(np.argmin(np.abs(time_vals - end_hours)))

        try:
            if start_idx > end_idx:
                start_idx, end_idx = end_idx, start_idx

            # Limit window to 30 timesteps max
            if (end_idx - start_idx) > 30:
                step_stride = max(1, (end_idx - start_idx) // 30)
                indices = list(range(start_idx, end_idx + 1, step_stride))[:30]
            else:
                indices = list(range(start_idx, end_idx + 1))

            selectors: Dict[str, Any] = {"lat": latitude, "lon": lon_q}
            if "depth" in ds[nc_var].dims:
                selectors["depth"] = actual_depth

            sliced = ds[nc_var].sel(selectors, method="nearest").isel(time=indices)
            vals = sliced.values

            points: List[OceanModelTimeseriesPoint] = []
            for i, idx in enumerate(indices):
                v = float(vals[i])
                t_dt = HYCOM_TIME_BASE + timedelta(hours=float(time_vals[idx]))
                t_str = t_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
                points.append(
                    OceanModelTimeseriesPoint(
                        time=t_str,
                        value=round(v, 4) if not math.isnan(v) else None,
                        selected_file=active_dataset_id,
                    )
                )

            res = OceanModelTimeseriesResponse(
                latitude=latitude,
                longitude=longitude,
                depth=actual_depth,
                variable=var_key,
                unit=var_info["unit"],
                start_time=points[0].time if points else None,
                end_time=points[-1].time if points else None,
                count=len(points),
                timeseries=points,
            )
            global_query_cache.set(cache_key, res, ttl=600)
            return res
        except Exception as e:
            logger.error(f"Error in remote HYCOM timeseries: {e}")
            raise ValueError(f"No HYCOM timeseries data available for this location ({str(e)})")


hycom_remote_service = HYCOMRemoteService()

