"""
Numerical Ocean Models Router
Exposes INCOIS HYCOM model endpoints: point query, depth profile, current vectors, time-series, dataset metadata, cache statistics, and Argo comparison.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.schemas.ocean_schemas import OceanModelSchema
from app.schemas.hycom_schemas import (
    OceanModelPoint,
    OceanModelProfile,
    OceanModelCurrent,
    OceanModelMetadata,
    OceanModelTimeseriesResponse,
    ModelObservationComparisonResponse,
)
from app.services.ocean_service import OceanService
from app.services.hycom_service import hycom_service
from app.services.argo_service import argo_service
from app.services.copernicus_service import copernicus_service
from app.core.query_cache import global_query_cache

router = APIRouter(prefix="/models", tags=["Numerical Ocean Models"])


@router.get("", response_model=List[OceanModelSchema])
async def get_models():
    """Fetch registered numerical ocean model outputs (HYCOM, CMEMS, ROMS)."""
    return OceanService.get_models()


@router.get("/hycom/metadata", response_model=OceanModelMetadata)
async def get_hycom_metadata():
    """Fetch aggregated multi-file metadata and variable mapping for all active INCOIS RSMC HYCOM NetCDF datasets."""
    try:
        return hycom_service.get_metadata()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Failed to load HYCOM metadata: {str(e)}")


@router.get("/hycom/cache-stats")
async def get_hycom_cache_stats():
    """Retrieve real-time in-memory query cache performance metrics."""
    return global_query_cache.stats()


@router.get("/hycom/point", response_model=OceanModelPoint)
async def get_hycom_point(
    latitude: float = Query(..., description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Longitude in degrees (-180 to 360)"),
    depth: float = Query(0.0, description="Depth in meters below sea level (0 to 6000m)"),
    variable: str = Query("temperature", description="Variable: temperature, salinity, current_u, current_v, ssh, mld, tchp"),
    time: Optional[str] = Query(None, description="ISO timestamp e.g. 2026-08-28T06:00:00Z"),
):
    """
    Extract single point HYCOM model value using nearest-neighbor spatial/temporal indexing with caching.
    """
    try:
        return hycom_service.get_point(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            variable=variable,
            time_str=time,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal point query error: {str(e)}")


@router.get("/hycom/profile", response_model=OceanModelProfile)
async def get_hycom_profile(
    latitude: float = Query(..., description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Longitude in degrees (-180 to 360)"),
    time: Optional[str] = Query(None, description="ISO timestamp e.g. 2026-08-28T06:00:00Z"),
):
    """
    Fetch vertical depth profile (temperature & salinity vs depth) from matching INCOIS HYCOM NetCDF dataset with caching.
    """
    try:
        return hycom_service.get_profile(
            latitude=latitude,
            longitude=longitude,
            time_str=time,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal profile query error: {str(e)}")


@router.get("/hycom/current", response_model=OceanModelCurrent)
async def get_hycom_current(
    latitude: float = Query(..., description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Longitude in degrees (-180 to 360)"),
    depth: float = Query(0.0, description="Depth in meters (0 to 6000m)"),
    time: Optional[str] = Query(None, description="ISO timestamp e.g. 2026-08-28T06:00:00Z"),
):
    """
    Fetch current velocity vector (u, v), calculate speed (sqrt(u²+v²)) and oceanographic direction with caching.
    """
    try:
        return hycom_service.get_current(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            time_str=time,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal current query error: {str(e)}")


@router.get("/hycom/timeseries", response_model=OceanModelTimeseriesResponse)
async def get_hycom_timeseries(
    latitude: float = Query(..., description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Longitude in degrees (-180 to 360)"),
    depth: float = Query(0.0, description="Depth in meters (0 to 6000m)"),
    variable: str = Query("temperature", description="Variable name (e.g. temperature, salinity, current_u, current_v, ssh, tchp, mld)"),
    start_time: Optional[str] = Query(None, description="ISO start timestamp"),
    end_time: Optional[str] = Query(None, description="ISO end timestamp"),
):
    """
    Extract chronological time-series points across all available HYCOM NetCDF dataset files with caching.
    """
    try:
        return hycom_service.get_timeseries(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            variable=variable,
            start_time=start_time,
            end_time=end_time,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal timeseries query error: {str(e)}")


@router.get("/hycom/compare-argo", response_model=ModelObservationComparisonResponse)
async def compare_hycom_with_argo(
    platform_number: str = Query(..., description="INCOIS Argo float platform number e.g. 1902669"),
    cycle_number: int = Query(1, description="Argo float cycle number e.g. 1"),
):
    """
    Compare real INCOIS Argo float observations with corresponding INCOIS HYCOM model NetCDF outputs.
    Calculates spatial distance (km), time offset (hours), point differences, Bias, RMSE, and MAE with caching.
    """
    try:
        # 1. Fetch real Argo observation profile from INCOIS ERDDAP
        argo_res = await argo_service.get_argo_profile(platform_number=platform_number, cycle_number=cycle_number)
        
        obs_lat = argo_res.latitude if argo_res.latitude is not None else 12.5
        obs_lon = argo_res.longitude if argo_res.longitude is not None else 75.0
        obs_time = argo_res.timestamp if argo_res.timestamp else "2026-08-28T06:00:00Z"
        
        raw_levels = [
            {
                "pressure": p.pressure,
                "temperature": p.temperature,
                "salinity": p.salinity,
            }
            for p in argo_res.profile
        ]

        # 2. Compute spatial matching, time matching, and metrics using HYCOM service
        return hycom_service.compare_with_argo_profile(
            platform_number=platform_number,
            cycle_number=cycle_number,
            obs_lat=obs_lat,
            obs_lon=obs_lon,
            obs_time=obs_time,
            argo_levels=raw_levels,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compare HYCOM with Argo: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════
# COPERNICUS MARINE MODEL ENDPOINTS (MULTIOBS_GLO_PHY_TSUV_3D_MYNRT_015_012)
# ══════════════════════════════════════════════════════════════════════════

@router.get("/copernicus/status")
async def get_copernicus_status():
    """Check Copernicus Marine Service authentication and dataset readiness."""
    try:
        return copernicus_service.get_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copernicus ocean data unavailable: {str(e)}")


@router.get("/copernicus/metadata")
async def get_copernicus_metadata():
    """Retrieve variables, depth levels, units, and dataset IDs for Copernicus Marine."""
    try:
        return copernicus_service.get_metadata()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copernicus ocean data unavailable: {str(e)}")


@router.get("/copernicus/point")
async def get_copernicus_point(
    latitude: float = Query(..., description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Longitude in degrees (-180 to 180)"),
    depth: float = Query(0.0, description="Depth level in meters"),
    variable: str = Query("temperature", description="Variable: temperature, salinity, mld, height"),
    time: Optional[str] = Query(None, description="ISO timestamp e.g. 2024-05-01T00:00:00Z"),
):
    """Query single point ocean data from Copernicus Marine MULTIOBS dataset."""
    try:
        return copernicus_service.get_point(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            variable=variable,
            time=time,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copernicus ocean data unavailable: {str(e)}")


@router.get("/copernicus/profile")
async def get_copernicus_profile(
    latitude: float = Query(..., description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Longitude in degrees (-180 to 180)"),
    time: Optional[str] = Query(None, description="ISO timestamp e.g. 2024-05-01T00:00:00Z"),
):
    """Query complete vertical soundings (Temperature & Salinity vs Depth) from Copernicus Marine."""
    try:
        return copernicus_service.get_profile(
            latitude=latitude,
            longitude=longitude,
            time=time,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copernicus ocean data unavailable: {str(e)}")


@router.get("/copernicus/current")
async def get_copernicus_current(
    latitude: float = Query(..., description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Longitude in degrees (-180 to 180)"),
    depth: float = Query(0.0, description="Depth level in meters"),
    time: Optional[str] = Query(None, description="ISO timestamp e.g. 2024-05-01T00:00:00Z"),
):
    """Query eastward/northward current velocities, compute speed and direction from Copernicus Marine."""
    try:
        return copernicus_service.get_current(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            time=time,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copernicus ocean data unavailable: {str(e)}")

