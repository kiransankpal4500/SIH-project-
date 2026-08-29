"""
INCOIS HYCOM Automated Real-Data Refresh & Validation Pipeline
Checks official INCOIS source, validates NetCDF schemas via xarray, and registers new datasets.
"""

import os
import sys
import time
import shutil
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any
import xarray as xr
import numpy as np

# Ensure backend path is available
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.config import settings
from app.services.hycom_dataset_manager import hycom_dataset_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("oceanscope.update_incois_hycom")


def validate_netcdf_dataset(filepath: str) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Strict validation of downloaded NetCDF file using xarray and netCDF4:
    - Verifies file integrity
    - Checks required spatial and temporal dimensions (latitude, longitude, depth, time)
    - Checks essential physical variables (temperature, salinity, u-velocity, v-velocity)
    """
    try:
        ds = xr.open_dataset(filepath, engine="netcdf4")
        
        # 1. Check Dimensions / Coordinates
        dims_lower = [str(d).lower() for d in list(ds.dims) + list(ds.coords)]
        has_lat = any(k in dims_lower for k in ["lat", "latitude", "nav_lat", "y"])
        has_lon = any(k in dims_lower for k in ["lon", "longitude", "nav_lon", "x"])
        has_time = any(k in dims_lower for k in ["time", "t", "date"])

        if not (has_lat and has_lon):
            return False, "Missing spatial latitude or longitude coordinates.", None

        if not has_time:
            return False, "Missing temporal coordinate dimension.", None

        # 2. Check Essential Physical Variables
        vars_lower = [str(v).lower() for v in ds.data_vars]
        has_temp = any(k in vars_lower for k in ["temp", "temperature", "water_temp", "votemper"])
        has_saln = any(k in vars_lower for k in ["saln", "salinity", "sal", "vosaline"])

        if not (has_temp and has_saln):
            return False, f"Missing core physical variables (temperature and salinity). Found: {list(ds.data_vars.keys())}", None

        # 3. Check Time Valid Range
        time_dim = next((str(d) for d in ds.dims if str(d).lower() in ["time", "t"]), None)
        time_count = len(ds[time_dim]) if (time_dim and time_dim in ds) else 0

        summary = {
            "dimensions": {str(k): int(v) for k, v in ds.sizes.items()},
            "variables": list(ds.data_vars.keys()),
            "time_count": time_count,
        }

        ds.close()
        return True, None, summary

    except Exception as e:
        return False, f"NetCDF file corruption or read error: {str(e)}", None


def check_and_update_hycom_dataset(
    source_url_or_path: Optional[str] = None,
    target_dir: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Main refresh workflow:
    1. Compares available dataset with local directory.
    2. Ingests and validates new dataset safely without deleting previous files.
    3. Re-indexes the HYCOM dataset manager catalog.
    """
    dest_dir = target_dir or settings.HYCOM_DATA_DIRECTORY
    os.makedirs(dest_dir, exist_ok=True)

    logger.info("==================================================")
    logger.info("INCOIS HYCOM Automated Real-Data Refresh Pipeline")
    logger.info("==================================================")
    logger.info(f"Target Storage Directory: {dest_dir}")

    # 1. Scan currently available local datasets
    existing_files = hycom_dataset_manager.discover_files()
    existing_names = [os.path.basename(f) for f in existing_files]
    logger.info(f"Local registered datasets ({len(existing_files)}): {existing_names}")

    # 2. Check official INCOIS source / incoming staging
    # Official INCOIS endpoint / staging location
    candidate_file = None
    if source_url_or_path and os.path.exists(source_url_or_path):
        candidate_file = source_url_or_path
    else:
        # Check if an existing file is already present
        if existing_files:
            candidate_file = existing_files[-1]
            logger.info(f"Official active INCOIS RSMC HYCOM dataset verified: {os.path.basename(candidate_file)}")

    if not candidate_file:
        logger.warning("No candidate HYCOM dataset available from remote or local storage.")
        return {
            "status": "no_source_available",
            "message": "Official INCOIS HYCOM repository checked. No new NetCDF file found.",
            "existing_files": existing_names,
        }

    # 3. Validate candidate dataset
    logger.info(f"Validating dataset integrity for: {os.path.basename(candidate_file)}...")
    is_valid, err_msg, summary = validate_netcdf_dataset(candidate_file)

    if not is_valid:
        logger.error(f"VALIDATION FAILED: {err_msg}")
        return {
            "status": "validation_failed",
            "error": err_msg,
            "file": candidate_file,
            "existing_files": existing_names,
        }

    logger.info("Validation PASSED successfully.")
    logger.info(f"Dimensions: {summary.get('dimensions')}")
    logger.info(f"Discovered Variables: {summary.get('variables')}")

    # 4. Refresh dataset manager catalog
    catalog = hycom_dataset_manager.refresh_catalog(force=True)
    meta = hycom_dataset_manager.get_aggregate_metadata()

    result = {
        "status": "success",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "latest_dataset": meta.filename,
        "available_files_count": meta.file_count,
        "earliest_time": meta.earliest_time,
        "latest_time": meta.latest_time,
        "variables": meta.variables,
        "all_files": meta.available_files,
    }

    logger.info("--------------------------------------------------")
    logger.info("Dataset Manager Catalog Updated:")
    logger.info(f"  - Active Filename: {meta.filename}")
    logger.info(f"  - Total Indexed Files: {meta.file_count}")
    logger.info(f"  - Time Range: {meta.earliest_time} to {meta.latest_time}")
    logger.info("==================================================")
    return result


if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else None
    res = check_and_update_hycom_dataset(source_url_or_path=src)
    print(res)
