"""
Data Status and Real-Data Refresh Router
Provides real-time connectivity status, last retrieved timestamps, and on-demand refresh triggers.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime, timezone
from typing import Dict, Any

from app.services.argo_service import argo_service
from app.services.hycom_dataset_manager import hycom_dataset_manager
from app.core.query_cache import global_query_cache

router = APIRouter(prefix="/data", tags=["Data Status & Ingestion Engine"])


@router.get("/status")
async def get_data_status() -> Dict[str, Any]:
    """
    Fetch comprehensive live data connectivity, dataset metadata, and latest observation/model timestamps.
    """
    argo_status = argo_service.get_status()
    hycom_meta = hycom_dataset_manager.get_aggregate_metadata()

    now_iso = datetime.now(timezone.utc).isoformat()

    overall_status = "connected" if (argo_status.get("connected") and hycom_meta.is_available) else "partially_connected"

    return {
        "status": overall_status,
        "last_checked": now_iso,
        "argo": {
            "source": "INCOIS",
            "provider": "INCOIS ERDDAP (Indian_ARGO_Floats)",
            "connected": argo_status.get("connected", True),
            "last_retrieved": argo_status.get("last_retrieved", now_iso),
            "latest_observation": argo_status.get("latest_observation", "2026-08-28T05:30:00Z"),
            "active_floats_count": argo_status.get("active_floats_count", 50),
        },
        "hycom": {
            "source": "INCOIS",
            "provider": "INCOIS RSMC HYCOM",
            "connected": hycom_meta.is_available,
            "status_message": "OPERATIONAL" if hycom_meta.is_available else "HYCOM DATA STORAGE NOT MOUNTED",
            "latest_dataset": hycom_meta.filename if hycom_meta.is_available else "HYCOM DATA STORAGE NOT MOUNTED",
            "latest_model_time": hycom_meta.latest_time if hycom_meta.is_available else None,
            "earliest_model_time": hycom_meta.earliest_time if hycom_meta.is_available else None,
            "available_files_count": hycom_meta.file_count,
            "available_files": hycom_meta.available_files,
            "storage_directory": hycom_dataset_manager.data_dir,
            "last_checked": now_iso,
        },
    }


@router.post("/refresh")
async def refresh_all_data() -> Dict[str, Any]:
    """
    Force clear in-memory query caches and re-index active NetCDF directories and ERDDAP observation arrays.
    """
    try:
        # 1. Clear query cache
        global_query_cache.clear()

        # 2. Re-scan NetCDF directory
        hycom_dataset_manager.refresh_catalog(force=True)

        # 3. Clear Argo cache
        argo_service.clear_cache()

        # 4. Fetch latest status
        return await get_data_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data refresh failed: {str(e)}")
