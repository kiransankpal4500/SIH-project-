"""
Numerical Ocean Models Router
Exposes INCOIS HYCOM model endpoints: point query, depth profile, current vectors, dataset metadata, and Argo comparison.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.schemas.ocean_schemas import OceanModelSchema
from app.schemas.hycom_schemas import (
    OceanModelPoint,
    OceanModelProfile,
    OceanModelCurrent,
    OceanModelMetadata,
    ModelObservationComparisonResponse,
)
from app.services.ocean_service import OceanService
from app.services.hycom_service import hycom_service
from app.services.argo_service import argo_service

router = APIRouter(prefix="/models", tags=["Numerical Ocean Models"])


@router.get("", response_model=List[OceanModelSchema])
async def get_models():
    """Fetch registered numerical ocean model outputs (HYCOM, CMEMS, ROMS)."""
    return OceanService.get_models()


@router.get("/hycom/metadata", response_model=OceanModelMetadata)
async def get_hycom_metadata():
    """Fetch metadata and variable mapping for active INCOIS RSMC HYCOM NetCDF dataset."""
    return hycom_service.get_metadata()


@router.get("/hycom/point", response_model=OceanModelPoint)
async def get_hycom_point(
    latitude: float = Query(..., description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Longitude in degrees (-180 to 180)"),
    depth: float = Query(0.0, description="Depth in meters below sea level"),
    variable: str = Query("temperature", description="Variable: temperature, salinity, current_u, current_v, ssh, mld"),
    time: Optional[str] = Query(None, description="ISO timestamp e.g. 2026-08-27T00:00:00Z"),
):
    """
    Extract single point HYCOM model value using nearest-neighbor spatial/temporal indexing from NetCDF.
    """
    try:
        return hycom_service.get_point(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            variable=variable,
            time_str=time,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/hycom/profile", response_model=OceanModelProfile)
async def get_hycom_profile(
    latitude: float = Query(..., description="Latitude in degrees"),
    longitude: float = Query(..., description="Longitude in degrees"),
    time: Optional[str] = Query(None, description="ISO timestamp e.g. 2026-08-27T00:00:00Z"),
):
    """
    Fetch vertical depth profile (temperature & salinity vs depth) from INCOIS HYCOM NetCDF dataset.
    """
    try:
        return hycom_service.get_profile(
            latitude=latitude,
            longitude=longitude,
            time_str=time,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/hycom/current", response_model=OceanModelCurrent)
async def get_hycom_current(
    latitude: float = Query(..., description="Latitude in degrees"),
    longitude: float = Query(..., description="Longitude in degrees"),
    depth: float = Query(0.0, description="Depth in meters"),
    time: Optional[str] = Query(None, description="ISO timestamp e.g. 2026-08-27T00:00:00Z"),
):
    """
    Fetch current velocity vector (u, v), calculate speed (sqrt(u²+v²)) and oceanographic direction in degrees.
    """
    try:
        return hycom_service.get_current(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            time_str=time,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/hycom/compare-argo", response_model=ModelObservationComparisonResponse)
async def compare_hycom_with_argo(
    platform_number: str = Query(..., description="INCOIS Argo float platform number e.g. 2901452"),
    cycle_number: int = Query(1, description="Argo float cycle number e.g. 1"),
):
    """
    Compare real INCOIS Argo float observations with corresponding INCOIS HYCOM model NetCDF outputs.
    Calculates spatial distance (km), time offset (hours), point differences, Bias, RMSE, and MAE.
    """
    try:
        # 1. Fetch real Argo observation profile from INCOIS ERDDAP
        argo_res = await argo_service.get_argo_profile(platform_number=platform_number, cycle_number=cycle_number)
        
        obs_lat = argo_res.latitude if argo_res.latitude is not None else 12.5
        obs_lon = argo_res.longitude if argo_res.longitude is not None else 75.0
        obs_time = argo_res.timestamp if argo_res.timestamp else "2026-08-27T00:00:00Z"
        
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
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to compare HYCOM with Argo: {str(e)}")
