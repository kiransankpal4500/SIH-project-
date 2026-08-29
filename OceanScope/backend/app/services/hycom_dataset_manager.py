"""
Multi-File INCOIS HYCOM Dataset Manager
Discovers, indexes, validates, and manages NetCDF model files with intelligent time-selection.
"""

import os
import glob
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import numpy as np
import xarray as xr
import pandas as pd

from app.core.config import settings
from app.schemas.hycom_schemas import (
    OceanModelMetadata,
    OceanModelTimeseriesPoint,
    OceanModelTimeseriesResponse,
)

logger = logging.getLogger("oceanscope.hycom_dataset_manager")


class FileCatalogEntry:
    def __init__(
        self,
        filepath: str,
        filename: str,
        mtime: float,
        is_valid: bool,
        error_msg: Optional[str] = None,
        dimensions: Optional[Dict[str, int]] = None,
        dim_mapping: Optional[Dict[str, str]] = None,
        var_mapping: Optional[Dict[str, str]] = None,
        discovered_variables: Optional[List[str]] = None,
        depth_levels: Optional[List[float]] = None,
        time_strings: Optional[List[str]] = None,
        time_datetimes: Optional[List[pd.Timestamp]] = None,
        lat_min: float = 0.0,
        lat_max: float = 0.0,
        lon_min: float = 0.0,
        lon_max: float = 0.0,
        resolution_deg: Optional[float] = None,
    ):
        self.filepath = filepath
        self.filename = filename
        self.mtime = mtime
        self.is_valid = is_valid
        self.error_msg = error_msg
        self.dimensions = dimensions or {}
        self.dim_mapping = dim_mapping or {}
        self.var_mapping = var_mapping or {}
        self.discovered_variables = discovered_variables or []
        self.depth_levels = depth_levels or []
        self.time_strings = time_strings or []
        self.time_datetimes = time_datetimes or []
        self.lat_min = lat_min
        self.lat_max = lat_max
        self.lon_min = lon_min
        self.lon_max = lon_max
        self.resolution_deg = resolution_deg


class HYCOMDatasetManager:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or settings.HYCOM_DATA_DIRECTORY
        self._catalog: Dict[str, FileCatalogEntry] = {}
        self._dataset_pool: Dict[str, xr.Dataset] = {}
        self._max_pool_size = 5
        self._last_scan_time = 0.0
        self._scan_interval_seconds = 30.0

    @staticmethod
    def _to_naive_pandas_timestamp(val: Any) -> pd.Timestamp:
        """Convert any datetime, string, or numpy datetime64 to a timezone-naive UTC pd.Timestamp."""
        ts = pd.to_datetime(val)
        if hasattr(ts, 'tz') and ts.tz is not None:
            ts = ts.tz_convert('UTC').tz_localize(None)
        return ts

    @staticmethod
    def _to_naive_datetime64(time_str: str) -> np.datetime64:
        """Convert an ISO time string to a timezone-naive np.datetime64[ns]."""
        ts = pd.to_datetime(time_str)
        if hasattr(ts, 'tz') and ts.tz is not None:
            ts = ts.tz_convert('UTC').tz_localize(None)
        return np.datetime64(ts, 'ns')

    def discover_files(self) -> List[str]:
        """Scan storage directory for .nc and .nc4 files."""
        if not os.path.exists(self.data_dir):
            logger.warning(f"HYCOM data directory does not exist: {self.data_dir}")
            return []
        
        nc_files = sorted(
            glob.glob(os.path.join(self.data_dir, "*.nc"))
            + glob.glob(os.path.join(self.data_dir, "*.nc4"))
        )
        return nc_files

    def _inspect_mappings(self, ds: xr.Dataset) -> Tuple[Dict[str, str], Dict[str, str]]:
        """Inspect and map standard dimension and variable names from xarray dataset."""
        dim_mapping: Dict[str, str] = {}
        var_mapping: Dict[str, str] = {}

        # 1. Dimensions
        for dim_name in ds.dims:
            d_lower = str(dim_name).lower()
            if d_lower in ["lat", "latitude", "nav_lat", "y"]:
                dim_mapping["latitude"] = str(dim_name)
            elif d_lower in ["lon", "longitude", "nav_lon", "x"]:
                dim_mapping["longitude"] = str(dim_name)
            elif d_lower in ["depth", "lev", "level", "z", "deptht"]:
                dim_mapping["depth"] = str(dim_name)
            elif d_lower in ["time", "t", "date"]:
                dim_mapping["time"] = str(dim_name)

        for coord_name in ds.coords:
            c_lower = str(coord_name).lower()
            if "latitude" not in dim_mapping and c_lower in ["lat", "latitude"]:
                dim_mapping["latitude"] = str(coord_name)
            if "longitude" not in dim_mapping and c_lower in ["lon", "longitude"]:
                dim_mapping["longitude"] = str(coord_name)
            if "depth" not in dim_mapping and c_lower in ["depth", "lev", "level"]:
                dim_mapping["depth"] = str(coord_name)
            if "time" not in dim_mapping and c_lower in ["time", "t"]:
                dim_mapping["time"] = str(coord_name)

        # 2. Variables
        for var_name in ds.data_vars:
            v_lower = str(var_name).lower()
            long_name = str(ds[var_name].attrs.get("long_name", "")).lower()
            std_name = str(ds[var_name].attrs.get("standard_name", "")).lower()

            if "temperature" not in var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["temp", "water_temp", "temperature", "votemper"]):
                var_mapping["temperature"] = str(var_name)
            elif "salinity" not in var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["saln", "salinity", "sal", "vosaline"]):
                var_mapping["salinity"] = str(var_name)
            elif "current_u" not in var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["uvel", "water_u", "u_current", "u", "eastward", "vozocrtx"]):
                var_mapping["current_u"] = str(var_name)
            elif "current_v" not in var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["vvel", "water_v", "v_current", "v", "northward", "vomecrty"]):
                var_mapping["current_v"] = str(var_name)
            elif "ssh" not in var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["surf_el", "ssh", "sossheig", "elevation"]):
                var_mapping["ssh"] = str(var_name)
            elif "mld" not in var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["mld", "mixed_layer", "somxl010"]):
                var_mapping["mld"] = str(var_name)
            elif "tchp" not in var_mapping and any(k in v_lower or k in long_name or k in std_name for k in ["tchp", "cyclone"]):
                var_mapping["tchp"] = str(var_name)

        return dim_mapping, var_mapping

    def _clean_dataset(self, ds: xr.Dataset, dim_mapping: Dict[str, str]) -> xr.Dataset:
        """Clean dataset by filtering out invalid or duplicate padding time coordinates."""
        time_dim = dim_mapping.get("time")
        if not time_dim:
            for d in ds.dims:
                if str(d).lower() in ["time", "t"]:
                    time_dim = str(d)
                    break
        if time_dim and time_dim in ds:
            try:
                valid_mask = ds[time_dim].values > np.datetime64('1950-01-01')
                if np.any(valid_mask) and not np.all(valid_mask):
                    ds = ds.isel({time_dim: valid_mask})
            except Exception as ex:
                logger.warning(f"Note on TIME coordinate filtering: {ex}")
        return ds

    def _inspect_file(self, filepath: str) -> FileCatalogEntry:
        """Inspect a single NetCDF file and build its catalog entry."""
        filename = os.path.basename(filepath)
        try:
            mtime = os.path.getmtime(filepath)
        except OSError:
            mtime = 0.0

        try:
            # Open dataset lazily with xarray
            ds = xr.open_dataset(filepath, engine="netcdf4")
            dim_mapping, var_mapping = self._inspect_mappings(ds)
            ds = self._clean_dataset(ds, dim_mapping)

            # Filter valid time coordinates if padded sentinels exist
            time_dim = dim_mapping.get("time")
            time_strings: List[str] = []
            time_datetimes: List[pd.Timestamp] = []

            if time_dim and time_dim in ds:
                try:
                    vals = ds[time_dim].values
                    for t in vals:
                        try:
                            ts = self._to_naive_pandas_timestamp(t)
                            if ts.year >= 1970 and ts.year <= 2100:
                                time_datetimes.append(ts)
                                time_strings.append(ts.strftime("%Y-%m-%dT%H:%M:%SZ"))
                        except Exception:
                            continue
                except Exception as ex:
                    logger.warning(f"Error reading time coordinates in {filename}: {ex}")

            # Lat/Lon/Depth bounds
            lat_dim = dim_mapping.get("latitude")
            lon_dim = dim_mapping.get("longitude")
            depth_dim = dim_mapping.get("depth")

            lats = ds[lat_dim].values if (lat_dim and lat_dim in ds) else np.array([0.0])
            lons = ds[lon_dim].values if (lon_dim and lon_dim in ds) else np.array([0.0])
            depths = [float(d) for d in (ds[depth_dim].values if (depth_dim and depth_dim in ds) else [0.0])]

            res_deg = None
            if len(lats) > 1:
                res_deg = round(float(abs(lats[1] - lats[0])), 4)

            # Keep in dataset pool if room
            if filepath not in self._dataset_pool:
                if len(self._dataset_pool) >= self._max_pool_size:
                    # Evict first item
                    oldest_k = next(iter(self._dataset_pool))
                    try:
                        self._dataset_pool[oldest_k].close()
                    except Exception:
                        pass
                    del self._dataset_pool[oldest_k]
                self._dataset_pool[filepath] = ds

            return FileCatalogEntry(
                filepath=filepath,
                filename=filename,
                mtime=mtime,
                is_valid=True,
                dimensions={str(k): int(v) for k, v in ds.sizes.items()},
                dim_mapping=dim_mapping,
                var_mapping=var_mapping,
                discovered_variables=list(ds.data_vars.keys()),
                depth_levels=depths,
                time_strings=time_strings,
                time_datetimes=time_datetimes,
                lat_min=float(np.min(lats)),
                lat_max=float(np.max(lats)),
                lon_min=float(np.min(lons)),
                lon_max=float(np.max(lons)),
                resolution_deg=res_deg,
            )

        except Exception as e:
            logger.error(f"Error reading NetCDF file {filename}: {e}")
            return FileCatalogEntry(
                filepath=filepath,
                filename=filename,
                mtime=mtime,
                is_valid=False,
                error_msg=str(e),
            )

    def refresh_catalog(self, force: bool = False) -> Dict[str, FileCatalogEntry]:
        """Refresh file catalog if directory changed or interval elapsed."""
        now = datetime.utcnow().timestamp()
        if not force and (now - self._last_scan_time < self._scan_interval_seconds) and self._catalog:
            return self._catalog

        files = self.discover_files()
        new_catalog: Dict[str, FileCatalogEntry] = {}

        for fp in files:
            try:
                mtime = os.path.getmtime(fp)
            except OSError:
                mtime = 0.0

            # Reuse cached entry if mtime matches
            if fp in self._catalog and self._catalog[fp].mtime == mtime and self._catalog[fp].is_valid:
                new_catalog[fp] = self._catalog[fp]
            else:
                new_catalog[fp] = self._inspect_file(fp)

        self._catalog = new_catalog
        self._last_scan_time = now
        return self._catalog

    def get_dataset_for_file(self, filepath: str) -> Optional[xr.Dataset]:
        """Retrieve open xarray Dataset instance from managed pool."""
        if filepath in self._dataset_pool:
            return self._dataset_pool[filepath]

        if not os.path.exists(filepath):
            return None

        try:
            ds = xr.open_dataset(filepath, engine="netcdf4")
            dim_mapping, _ = self._inspect_mappings(ds)
            ds = self._clean_dataset(ds, dim_mapping)
            if len(self._dataset_pool) >= self._max_pool_size:
                oldest_k = next(iter(self._dataset_pool))
                try:
                    self._dataset_pool[oldest_k].close()
                except Exception:
                    pass
                del self._dataset_pool[oldest_k]
            self._dataset_pool[filepath] = ds
            return ds
        except Exception as e:
            logger.error(f"Failed to open dataset {filepath}: {e}")
            return None

    def select_file_for_time(
        self, requested_time_str: Optional[str] = None
    ) -> Tuple[Optional[str], Optional[str], Optional[str], float, Optional[xr.Dataset], Dict[str, str], Dict[str, str]]:
        """
        Select the best file and model timestep for a given timestamp.
        Returns:
            (filepath, filename, selected_model_time_str, time_diff_hours, dataset, var_mapping, dim_mapping)
        """
        catalog = self.refresh_catalog()
        valid_entries = [e for e in catalog.values() if e.is_valid and e.time_datetimes]

        if not valid_entries:
            return None, None, None, 0.0, None, {}, {}

        # 1. If no specific time requested, select the latest available model time across all files
        if not requested_time_str:
            latest_entry = valid_entries[-1]
            latest_time_str = latest_entry.time_strings[-1] if latest_entry.time_strings else "N/A"
            ds = self.get_dataset_for_file(latest_entry.filepath)
            return (
                latest_entry.filepath,
                latest_entry.filename,
                latest_time_str,
                0.0,
                ds,
                latest_entry.var_mapping,
                latest_entry.dim_mapping,
            )

        # 2. Match or find nearest timestep across all valid files
        try:
            req_dt = self._to_naive_pandas_timestamp(requested_time_str)
        except Exception:
            req_dt = valid_entries[0].time_datetimes[0]

        best_entry: Optional[FileCatalogEntry] = None
        best_time_str: Optional[str] = None
        min_diff_seconds: float = float("inf")

        for entry in valid_entries:
            for t_dt, t_str in zip(entry.time_datetimes, entry.time_strings):
                diff_sec = abs((t_dt - req_dt).total_seconds())
                if diff_sec < min_diff_seconds:
                    min_diff_seconds = diff_sec
                    best_entry = entry
                    best_time_str = t_str
                    if diff_sec == 0:
                        break
            if min_diff_seconds == 0:
                break

        if not best_entry or not best_time_str:
            best_entry = valid_entries[-1]
            best_time_str = best_entry.time_strings[-1] if best_entry.time_strings else "N/A"
            min_diff_seconds = 0.0

        time_diff_hours = round(min_diff_seconds / 3600.0, 2)
        ds = self.get_dataset_for_file(best_entry.filepath)

        return (
            best_entry.filepath,
            best_entry.filename,
            best_time_str,
            time_diff_hours,
            ds,
            best_entry.var_mapping,
            best_entry.dim_mapping,
        )

    def get_aggregate_metadata(self) -> OceanModelMetadata:
        """Aggregate metadata across all valid discovered NetCDF files."""
        catalog = self.refresh_catalog()
        valid_entries = [e for e in catalog.values() if e.is_valid]

        if not valid_entries:
            return OceanModelMetadata(
                source="INCOIS",
                provider="INCOIS RSMC",
                model="HYCOM",
                dataset="INCOIS_RSMC_HYCOM",
                filename="None",
                available_files=[],
                file_count=0,
                is_available=False,
                dimensions={},
                discovered_variables=[],
                variables=[],
                mapped_variables={},
                time_range=[],
                depth_levels=[],
                available_depths=[],
                lat_min=0.0,
                lat_max=0.0,
                latitude_range=[0.0, 0.0],
                lon_min=0.0,
                lon_max=0.0,
                longitude_range=[0.0, 0.0],
                grid_resolution_deg=None,
                domain="Indian Ocean & Adjacent Seas",
            )

        all_times_set = set()
        all_depths_set = set()
        all_vars_set = set()
        merged_var_mapping: Dict[str, str] = {}
        merged_dimensions: Dict[str, int] = {}

        lat_mins, lat_maxs = [], []
        lon_mins, lon_maxs = [], []
        file_names = []

        for e in valid_entries:
            file_names.append(e.filename)
            all_times_set.update(e.time_strings)
            all_depths_set.update(e.depth_levels)
            all_vars_set.update(e.discovered_variables)
            merged_var_mapping.update(e.var_mapping)
            merged_dimensions.update(e.dimensions)
            lat_mins.append(e.lat_min)
            lat_maxs.append(e.lat_max)
            lon_mins.append(e.lon_min)
            lon_maxs.append(e.lon_max)

        sorted_times = sorted(list(all_times_set))
        sorted_depths = sorted(list(all_depths_set))

        earliest = sorted_times[0] if sorted_times else None
        latest = sorted_times[-1] if sorted_times else None

        min_lat = float(min(lat_mins)) if lat_mins else 0.0
        max_lat = float(max(lat_maxs)) if lat_maxs else 0.0
        min_lon = float(min(lon_mins)) if lon_mins else 0.0
        max_lon = float(max(lon_maxs)) if lon_maxs else 0.0

        primary = valid_entries[-1]

        return OceanModelMetadata(
            source="INCOIS",
            provider="INCOIS RSMC",
            model="HYCOM",
            dataset="INCOIS_RSMC_HYCOM",
            filename=primary.filename,
            available_files=file_names,
            file_count=len(file_names),
            is_available=True,
            dimensions=merged_dimensions,
            discovered_variables=sorted(list(all_vars_set)),
            variables=sorted(list(all_vars_set)),
            mapped_variables=merged_var_mapping,
            time_range=sorted_times,
            earliest_time=earliest,
            latest_time=latest,
            depth_levels=sorted_depths,
            available_depths=sorted_depths,
            lat_min=min_lat,
            lat_max=max_lat,
            latitude_range=[min_lat, max_lat],
            lon_min=min_lon,
            lon_max=max_lon,
            longitude_range=[min_lon, max_lon],
            grid_resolution_deg=primary.resolution_deg,
            domain="Indian Ocean & Adjacent Seas",
        )

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
        Extract a time-series of model values across all available files.
        """
        catalog = self.refresh_catalog()
        valid_entries = [e for e in catalog.values() if e.is_valid and e.time_datetimes]

        unit = "°C" if variable == "temperature" else "PSU" if variable == "salinity" else "m/s" if "current" in variable else "m"

        if not valid_entries:
            return OceanModelTimeseriesResponse(
                latitude=latitude,
                longitude=longitude,
                depth=depth,
                variable=variable,
                unit=unit,
                start_time=start_time,
                end_time=end_time,
                count=0,
                timeseries=[],
            )

        start_dt = self._to_naive_pandas_timestamp(start_time) if start_time else None
        end_dt = self._to_naive_pandas_timestamp(end_time) if end_time else None

        points: List[OceanModelTimeseriesPoint] = []

        # Iterate files and query points for matching timesteps
        for entry in valid_entries:
            ds = self.get_dataset_for_file(entry.filepath)
            if ds is None:
                continue

            nc_var = entry.var_mapping.get(variable, variable)
            if nc_var not in ds.data_vars:
                continue

            lat_dim = entry.dim_mapping.get("latitude", "latitude")
            lon_dim = entry.dim_mapping.get("longitude", "longitude")
            depth_dim = entry.dim_mapping.get("depth", "depth")
            time_dim = entry.dim_mapping.get("time", "time")

            # Match timesteps in this file within bounds
            for t_dt, t_str in zip(entry.time_datetimes, entry.time_strings):
                if start_dt and t_dt < start_dt:
                    continue
                if end_dt and t_dt > end_dt:
                    continue

                try:
                    selectors = {lat_dim: latitude, lon_dim: longitude}
                    if depth_dim in ds[nc_var].dims:
                        selectors[depth_dim] = depth
                    if time_dim in ds[nc_var].dims:
                        selectors[time_dim] = self._to_naive_datetime64(t_str)

                    val = float(np.ravel(ds[nc_var].sel(selectors, method="nearest").values)[0])
                    points.append(
                        OceanModelTimeseriesPoint(
                            time=t_str,
                            value=round(val, 4) if not np.isnan(val) else None,
                            selected_file=entry.filename,
                        )
                    )
                except Exception as ex:
                    logger.warning(f"Error reading timeseries point for {t_str} in {entry.filename}: {ex}")

        # Deduplicate and sort chronologically
        points_by_time: Dict[str, OceanModelTimeseriesPoint] = {}
        for p in points:
            points_by_time[p.time] = p

        sorted_points = [points_by_time[t] for t in sorted(points_by_time.keys())]

        return OceanModelTimeseriesResponse(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            variable=variable,
            unit=unit,
            start_time=start_time or (sorted_points[0].time if sorted_points else None),
            end_time=end_time or (sorted_points[-1].time if sorted_points else None),
            count=len(sorted_points),
            timeseries=sorted_points,
        )


# Singleton dataset manager instance
hycom_dataset_manager = HYCOMDatasetManager()
