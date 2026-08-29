"""
In-situ Ocean Observations Router
Integrates real INCOIS ERDDAP Argo Float observations and local telemetry stats.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.schemas.ocean_schemas import (
    ObservationSchema,
    OceanProfileSchema,
    OceanSystemStatsSchema,
    ArgoObservationResponse,
    ArgoProfileResponse,
)
from app.services.ocean_service import OceanService
from app.services.argo_service import argo_service

router = APIRouter(prefix="/observations", tags=["In-situ Observations"])


@router.get("", response_model=List[ObservationSchema])
async def get_observations():
    """Fetch active in-situ ocean observations summary (Argo floats, moored buoys, CTD casts)."""
    return OceanService.get_observations()


@router.get("/stats", response_model=OceanSystemStatsSchema)
async def get_system_stats():
    """Fetch global ocean monitoring telemetry summary statistics."""
    return OceanService.get_system_stats()


@router.get("/argo", response_model=ArgoObservationResponse)
async def get_argo_observations(
    min_lat: float = Query(0.0, ge=-90, le=90, description="Minimum latitude bound"),
    max_lat: float = Query(30.0, ge=-90, le=90, description="Maximum latitude bound"),
    min_lon: float = Query(40.0, ge=-180, le=360, description="Minimum longitude bound"),
    max_lon: float = Query(110.0, ge=-180, le=360, description="Maximum longitude bound"),
    platform_number: Optional[str] = Query(None, description="Filter specific float platform ID"),
    limit: int = Query(50, ge=1, le=500, description="Maximum distinct float observations to retrieve"),
):
    """
    Fetch real ocean observation markers from INCOIS ERDDAP (Indian_ARGO_Floats).
    """
    try:
        return await argo_service.get_argo_observations(
            min_lat=min_lat,
            max_lat=max_lat,
            min_lon=min_lon,
            max_lon=max_lon,
            platform_number=platform_number,
            limit=limit,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"INCOIS ERDDAP service unavailable: {type(e).__name__}")


@router.get("/argo/profile", response_model=ArgoProfileResponse)
async def get_argo_profile(
    platform_number: str = Query(..., min_length=1, max_length=20, description="Argo float platform number"),
    cycle_number: int = Query(1, ge=1, le=9999, description="Argo float cycle number"),
):
    """
    Fetch real vertical CTD pressure/temperature/salinity profile for a selected float and cycle from INCOIS ERDDAP.
    """
    try:
        return await argo_service.get_argo_profile(
            platform_number=platform_number, cycle_number=cycle_number
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"INCOIS ERDDAP service unavailable: {type(e).__name__}")


@router.get("/{platform_id}/profile", response_model=OceanProfileSchema)
async def get_profile(platform_id: str):
    """Fetch vertical CTD / Argo float depth profile series for a specific platform."""
    return OceanService.get_profile(platform_id)
