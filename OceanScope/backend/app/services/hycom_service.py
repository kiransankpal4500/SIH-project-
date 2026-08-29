"""
INCOIS HYCOM NetCDF Model Ingestion & Analysis Service
Opens and processes NetCDF datasets using xarray, netCDF4, and numpy.
"""

import os
import glob
import math
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import numpy as np
import xarray as xr
import pandas as pd

from app.core.config import settings
from app.schemas.hycom_schemas import (
    OceanModelPoint,
    OceanModelProfileLevel,
    OceanModelProfile,
    OceanModelCurrent,
    OceanModelMetadata,
    ModelObservationComparisonItem,
    ModelObservationComparisonResponse,
)

logger = logging.getLogger("oceanscope.hycom_service")


class INCOISHYCOMService:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or settings.HYCOM_DATA_DIRECTORY
        self._dataset: Optional[xr.Dataset] = None
        self._current_file: Optional[str] = None
        self._var_mapping: Dict[str, str] = {}
        self._dim_mapping: Dict[str, str] = {}
        self._cache: Dict[str, Tuple[float, Any]] = {}
        self.cache_ttl = 300  # 5 minutes TTL

    @staticmethod
    def _to_naive_datetime64(time_str: str) -> np.datetime64:
        """Convert an ISO time string to a timezone-naive np.datetime64[ns] matching NetCDF coords."""
        return np.datetime64(pd.Timestamp(time_str).tz_localize(None), 'ns')

    def _discover_netcdf_file(self) -> Optional[str]:
        """Find available HYCOM NetCDF files in storage directory."""
        if not os.path.exists(self.data_dir):
            return None
        nc_files = sorted(glob.glob(os.path.join(self.data_dir, "*.nc")) + glob.glob(os.path.join(self.data_dir, "*.nc4")))
        return nc_files[-1] if nc_files else None

    def get_dataset(self) -> Tuple[Optional[xr.Dataset], Optional[str]]:
        """Open or return existing xarray dataset lazily."""
        nc_file = self._discover_netcdf_file()
        if not nc_file:
            return None, "No HYCOM NetCDF datasets found in data directory."

        if self._dataset is not None and self._current_file == nc_file:
            return self._dataset, None

        try:
            # Open dataset lazily with xarray
            ds = xr.open_dataset(nc_file, engine="netcdf4")
            self._dataset = ds
            self._current_file = nc_file
            self._inspect_and_map_metadata(ds)
            logger.info(f"Loaded INCOIS HYCOM dataset: {nc_file}")
            return self._dataset, None
        except Exception as e:
            logger.error(f"Failed to open NetCDF file {nc_file}: {e}")
            return None, f"Error opening NetCDF file: {str(e)}"

    def _inspect_and_map_metadata(self, ds: xr.Dataset):
        """Inspect xarray dataset dimensions and variable names dynamically."""
        self._dim_mapping = {}
        self._var_mapping = {}

        # 1. Map Spatial & Temporal Dimensions
        for dim_name in ds.dims:
            d_lower = str(dim_name).lower()
            if d_lower in ["lat", "latitude", "nav_lat", "y"]:
                self._dim_mapping["latitude"] = str(dim_name)
            elif d_lower in ["lon", "longitude", "nav_lon", "x"]:
                self._dim_mapping["longitude"] = str(dim_name)
            elif d_lower in ["depth", "lev", "level", "z", "deptht"]:
                self._dim_mapping["depth"] = str(dim_name)
            elif d_lower in ["time", "t", "date"]:
                self._dim_mapping["time"] = str(dim_name)

        # Fallback coordinate inspection if dims are unmapped
        for coord_name in ds.coords:
            c_lower = str(coord_name).lower()
            if "latitude" not in self._dim_mapping and c_lower in ["lat", "latitude"]:
                self._dim_mapping["latitude"] = str(coord_name)
            if "longitude" not in self._dim_mapping and c_lower in ["lon", "longitude"]:
                self._dim_mapping["longitude"] = str(coord_name)
            if "depth" not in self._dim_mapping and c_lower in ["depth", "lev", "level"]:
                self._dim_mapping["depth"] = str(coord_name)
            if "time" not in self._dim_mapping and c_lower in ["time", "t"]:
                self._dim_mapping["time"] = str(coord_name)

        # 2. Map Physical Variables
        for var_name in ds.data_vars:
            v_lower = str(var_name).lower()
            long_name = str(ds[var_name].attrs.get("long_name", "")).lower()
            std_name = str(ds[var_name].attrs.get("standard_name", "")).lower()

            if "temperature" not in self._var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["water_temp", "temp", "temperature", "votemper"]):
                self._var_mapping["temperature"] = str(var_name)
            elif "salinity" not in self._var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["salinity", "sal", "vosaline"]):
                self._var_mapping["salinity"] = str(var_name)
            elif "current_u" not in self._var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["water_u", "u_current", "u", "eastward", "vozocrtx"]):
                self._var_mapping["current_u"] = str(var_name)
            elif "current_v" not in self._var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["water_v", "v_current", "v", "northward", "vomecrty"]):
                self._var_mapping["current_v"] = str(var_name)
            elif "ssh" not in self._var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["surf_el", "ssh", "sossheig", "elevation"]):
                self._var_mapping["ssh"] = str(var_name)
            elif "mld" not in self._var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["mld", "mixed_layer", "somxl010"]):
                self._var_mapping["mld"] = str(var_name)

    def get_metadata(self) -> OceanModelMetadata:
        """Fetch metadata for the active INCOIS HYCOM dataset."""
        ds, err = self.get_dataset()
        if not ds:
            return OceanModelMetadata(
                filename="None",
                is_available=False,
                dimensions={},
                discovered_variables=[],
                mapped_variables={},
                time_range=[],
                depth_levels=[],
                lat_min=0.0,
                lat_max=0.0,
                lon_min=0.0,
                lon_max=0.0,
            )

        lat_dim = self._dim_mapping.get("latitude", "latitude")
        lon_dim = self._dim_mapping.get("longitude", "longitude")
        depth_dim = self._dim_mapping.get("depth", "depth")
        time_dim = self._dim_mapping.get("time", "time")

        lats = ds[lat_dim].values if lat_dim in ds else np.array([0.0])
        lons = ds[lon_dim].values if lon_dim in ds else np.array([0.0])
        depths = ds[depth_dim].values.tolist() if depth_dim in ds else [0.0]
        
        times = []
        if time_dim in ds:
            times = [pd.to_datetime(t).strftime("%Y-%m-%dT%H:%M:%SZ") for t in ds[time_dim].values]

        return OceanModelMetadata(
            source="INCOIS",
            model="HYCOM",
            dataset="INCOIS_RSMC_HYCOM",
            filename=os.path.basename(self._current_file or "unknown.nc"),
            is_available=True,
            dimensions={str(k): int(v) for k, v in ds.sizes.items()},
            discovered_variables=list(ds.data_vars.keys()),
            mapped_variables=self._var_mapping,
            time_range=times,
            depth_levels=[float(d) for d in depths],
            lat_min=float(np.min(lats)),
            lat_max=float(np.max(lats)),
            lon_min=float(np.min(lons)),
            lon_max=float(np.max(lons)),
        )

    def get_point(
        self,
        latitude: float,
        longitude: float,
        depth: float = 0.0,
        variable: str = "temperature",
        time_str: Optional[str] = None,
    ) -> OceanModelPoint:
        """Extract value for a single point using nearest-neighbor indexing."""
        ds, err = self.get_dataset()
        if not ds:
            raise ValueError(err or "HYCOM dataset unavailable")

        nc_var = self._var_mapping.get(variable, variable)
        if nc_var not in ds.data_vars:
            raise ValueError(f"Variable '{variable}' (mapped as '{nc_var}') not found in HYCOM dataset.")

        lat_dim = self._dim_mapping.get("latitude", "latitude")
        lon_dim = self._dim_mapping.get("longitude", "longitude")
        depth_dim = self._dim_mapping.get("depth", "depth")
        time_dim = self._dim_mapping.get("time", "time")

        selectors = {
            lat_dim: latitude,
            lon_dim: longitude,
        }
        if depth_dim in ds[nc_var].dims:
            selectors[depth_dim] = depth
        if time_dim in ds[nc_var].dims:
            if time_str:
                selectors[time_dim] = self._to_naive_datetime64(time_str)
            else:
                selectors[time_dim] = ds[time_dim].values[-1]

        sliced = ds[nc_var].sel(selectors, method="nearest")
        val = float(np.ravel(sliced.values)[0])

        actual_lat = float(sliced[lat_dim].values.item()) if lat_dim in sliced.coords else latitude
        actual_lon = float(sliced[lon_dim].values.item()) if lon_dim in sliced.coords else longitude
        actual_depth = float(sliced[depth_dim].values.item()) if depth_dim in sliced.coords else depth
        
        m_time = time_str or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        if time_dim in sliced.coords:
            m_time = pd.to_datetime(sliced[time_dim].values.item()).strftime("%Y-%m-%dT%H:%M:%SZ")

        unit = str(ds[nc_var].attrs.get("units", "degC" if variable == "temperature" else "PSU"))

        return OceanModelPoint(
            source="INCOIS",
            model="HYCOM",
            dataset="INCOIS_RSMC_HYCOM",
            retrieved_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            latitude=actual_lat,
            longitude=actual_lon,
            depth=actual_depth,
            time=time_str or m_time,
            model_time=m_time,
            variable=variable,
            value=round(val, 4),
            unit=unit,
        )

    def get_profile(
        self,
        latitude: float,
        longitude: float,
        time_str: Optional[str] = None,
    ) -> OceanModelProfile:
        """Fetch vertical temperature & salinity profile for a location."""
        ds, err = self.get_dataset()
        if not ds:
            raise ValueError(err or "HYCOM dataset unavailable")

        lat_dim = self._dim_mapping.get("latitude", "latitude")
        lon_dim = self._dim_mapping.get("longitude", "longitude")
        depth_dim = self._dim_mapping.get("depth", "depth")
        time_dim = self._dim_mapping.get("time", "time")

        temp_var = self._var_mapping.get("temperature", "water_temp")
        sal_var = self._var_mapping.get("salinity", "salinity")
        u_var = self._var_mapping.get("current_u", "water_u")
        v_var = self._var_mapping.get("current_v", "water_v")

        selectors = {
            lat_dim: latitude,
            lon_dim: longitude,
        }
        if time_dim in ds.dims:
            if time_str:
                selectors[time_dim] = self._to_naive_datetime64(time_str)
            else:
                selectors[time_dim] = ds[time_dim].values[-1]

        sliced_ds = ds.sel(selectors, method="nearest")

        actual_lat = float(sliced_ds[lat_dim].values.item()) if lat_dim in sliced_ds.coords else latitude
        actual_lon = float(sliced_ds[lon_dim].values.item()) if lon_dim in sliced_ds.coords else longitude
        
        m_time = time_str or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        if time_dim in sliced_ds.coords:
            m_time = pd.to_datetime(sliced_ds[time_dim].values.item()).strftime("%Y-%m-%dT%H:%M:%SZ")

        depth_levels = sliced_ds[depth_dim].values if depth_dim in sliced_ds else np.array([0.0])
        
        temps = sliced_ds[temp_var].values if temp_var in sliced_ds else np.zeros_like(depth_levels)
        sals = sliced_ds[sal_var].values if sal_var in sliced_ds else np.zeros_like(depth_levels)
        us = sliced_ds[u_var].values if u_var in sliced_ds else np.zeros_like(depth_levels)
        vs = sliced_ds[v_var].values if v_var in sliced_ds else np.zeros_like(depth_levels)

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

        return OceanModelProfile(
            source="INCOIS",
            model="HYCOM",
            dataset="INCOIS_RSMC_HYCOM",
            retrieved_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            latitude=actual_lat,
            longitude=actual_lon,
            time=time_str or m_time,
            model_time=m_time,
            profile=profile_levels,
        )

    def get_current(
        self,
        latitude: float,
        longitude: float,
        depth: float = 0.0,
        time_str: Optional[str] = None,
    ) -> OceanModelCurrent:
        """Extract u and v velocity components and compute speed and oceanographic direction."""
        ds, err = self.get_dataset()
        if not ds:
            raise ValueError(err or "HYCOM dataset unavailable")

        lat_dim = self._dim_mapping.get("latitude", "latitude")
        lon_dim = self._dim_mapping.get("longitude", "longitude")
        depth_dim = self._dim_mapping.get("depth", "depth")
        time_dim = self._dim_mapping.get("time", "time")

        u_var = self._var_mapping.get("current_u", "water_u")
        v_var = self._var_mapping.get("current_v", "water_v")

        selectors = {
            lat_dim: latitude,
            lon_dim: longitude,
        }
        if depth_dim in ds.dims:
            selectors[depth_dim] = depth
        if time_dim in ds.dims:
            if time_str:
                selectors[time_dim] = self._to_naive_datetime64(time_str)
            else:
                selectors[time_dim] = ds[time_dim].values[-1]

        sliced_u = ds[u_var].sel(selectors, method="nearest")
        sliced_v = ds[v_var].sel(selectors, method="nearest")

        u_val = float(np.ravel(sliced_u.values)[0])
        v_val = float(np.ravel(sliced_v.values)[0])

        speed = math.sqrt(u_val**2 + v_val**2)
        # Direction in degrees from North (0° = North, 90° = East)
        direction_rad = math.atan2(u_val, v_val)
        direction_deg = (math.degrees(direction_rad) + 360.0) % 360.0

        actual_lat = float(sliced_u[lat_dim].values.item()) if lat_dim in sliced_u.coords else latitude
        actual_lon = float(sliced_u[lon_dim].values.item()) if lon_dim in sliced_u.coords else longitude
        actual_depth = float(sliced_u[depth_dim].values.item()) if depth_dim in sliced_u.coords else depth

        m_time = time_str or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
        if time_dim in sliced_u.coords:
            m_time = pd.to_datetime(sliced_u[time_dim].values.item()).strftime("%Y-%m-%dT%H:%M:%SZ")

        return OceanModelCurrent(
            source="INCOIS",
            model="HYCOM",
            dataset="INCOIS_RSMC_HYCOM",
            retrieved_at=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            latitude=actual_lat,
            longitude=actual_lon,
            depth=actual_depth,
            time=time_str or m_time,
            model_time=m_time,
            u=round(u_val, 4),
            v=round(v_val, 4),
            speed=round(speed, 4),
            direction=round(direction_deg, 2),
            unit="m/s",
        )


    @staticmethod
    def calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate spatial distance between two geographic coordinates in kilometers."""
        r = 6371.0  # Earth's mean radius in km
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
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
        """Compare real INCOIS Argo profile with corresponding nearest INCOIS HYCOM model outputs."""
        hycom_prof = self.get_profile(latitude=obs_lat, longitude=obs_lon, time_str=obs_time)
        
        distance_km = self.calculate_haversine_km(obs_lat, obs_lon, hycom_prof.latitude, hycom_prof.longitude)

        # Time difference calculation in hours
        t_obs = pd.to_datetime(obs_time)
        t_model = pd.to_datetime(hycom_prof.model_time)
        time_diff_hours = round(abs((t_model - t_obs).total_seconds()) / 3600.0, 2)

        # Map model profile levels by depth for quick depth interpolation / lookup
        model_by_depth = {p.depth: p for p in hycom_prof.profile}
        model_depths = np.array(list(model_by_depth.keys()))

        items: List[ModelObservationComparisonItem] = []
        temp_diffs: List[float] = []
        sal_diffs: List[float] = []

        for lvl in argo_levels:
            pressure_depth = float(lvl.get("pressure", 0.0)) # Approx 1 dbar ~ 1 meter depth
            obs_temp = lvl.get("temperature")
            obs_sal = lvl.get("salinity")

            # Nearest model depth match
            idx = (np.abs(model_depths - pressure_depth)).argmin()
            matched_depth = model_depths[idx]
            m_level = model_by_depth[matched_depth]

            mod_temp = m_level.temperature
            mod_sal = m_level.salinity

            t_diff = round(mod_temp - obs_temp, 3) if (mod_temp is not None and obs_temp is not None) else None
            s_diff = round(mod_sal - obs_sal, 3) if (mod_sal is not None and obs_sal is not None) else None

            if t_diff is not None:
                temp_diffs.append(t_diff)
            if s_diff is not None:
                sal_diffs.append(s_diff)

            items.append(
                ModelObservationComparisonItem(
                    depth=round(pressure_depth, 1),
                    model_temperature=mod_temp,
                    observed_temperature=obs_temp,
                    temperature_difference=t_diff,
                    model_salinity=mod_sal,
                    observed_salinity=obs_sal,
                    salinity_difference=s_diff,
                )
            )

        # Statistical Metrics Calculation
        temp_bias = round(float(np.mean(temp_diffs)), 4) if temp_diffs else None
        temp_rmse = round(float(np.sqrt(np.mean(np.square(temp_diffs)))), 4) if temp_diffs else None
        temp_mae = round(float(np.mean(np.abs(temp_diffs))), 4) if temp_diffs else None

        sal_bias = round(float(np.mean(sal_diffs)), 4) if sal_diffs else None
        sal_rmse = round(float(np.sqrt(np.mean(np.square(sal_diffs)))), 4) if sal_diffs else None
        sal_mae = round(float(np.mean(np.abs(sal_diffs))), 4) if sal_diffs else None

        return ModelObservationComparisonResponse(
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
            temp_bias=temp_bias,
            temp_rmse=temp_rmse,
            temp_mae=temp_mae,
            sal_bias=sal_bias,
            sal_rmse=sal_rmse,
            sal_mae=sal_mae,
            profile_comparison=items,
        )


hycom_service = INCOISHYCOMService()
