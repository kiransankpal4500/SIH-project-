"""
Bathymetry API Router
Exposes GEBCO bathymetric depth and elevation queries for point locations and 3D local chunks.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
from app.services.gebco_service import gebco_service

router = APIRouter(prefix="/bathymetry", tags=["GEBCO Bathymetry"])


@router.get("/point")
async def get_bathymetry_point(
    latitude: float = Query(..., description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Longitude in degrees (-180 to 180)"),
):
    """
    Get bathymetric depth and elevation at a single geographic point from the official GEBCO grid.
    Elevation is relative to mean sea level; positive depth represents seabed depth.
    """
    try:
        return gebco_service.get_point(latitude=latitude, longitude=longitude)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bathymetry unavailable: {str(e)}")


@router.get("/chunk")
async def get_bathymetry_chunk(
    latitude: float = Query(..., description="Center latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., description="Center longitude in degrees (-180 to 180)"),
    chunk_size: float = Query(0.05, description="Bounding box half-width in degrees (e.g. 0.025, 0.05, 0.10)"),
    resolution: int = Query(7, description="Number of grid samples along each axis (e.g. 5, 7, 9)"),
):
    """
    Get a 2D bathymetric mesh chunk for local 3D ocean chunk terrain reconstruction from GEBCO.
    """
    try:
        return gebco_service.get_chunk(
            latitude=latitude,
            longitude=longitude,
            chunk_size=chunk_size,
            resolution=resolution,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bathymetry unavailable: {str(e)}")
