"""
Bathymetry API Router
Exposes GEBCO bathymetric depth and elevation queries for point locations and 3D local chunks.
Validates input coordinates and grid parameters.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
from app.services.gebco_service import gebco_service

router = APIRouter(prefix="/bathymetry", tags=["GEBCO Bathymetry"])

# Dedicated thread pool executor for GEBCO bathymetry so it never starves behind slow external model queries
_bathymetry_executor = ThreadPoolExecutor(max_workers=16, thread_name_prefix="gebco_worker")


@router.get("/point")
async def get_bathymetry_point(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude in degrees (-180 to 180)"),
):
    """
    Get bathymetric depth and elevation at a single geographic point from the official GEBCO grid.
    Elevation is relative to mean sea level; positive depth represents seabed depth.
    """
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            _bathymetry_executor,
            gebco_service.get_point,
            latitude,
            longitude,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bathymetry unavailable: {str(e)}")


@router.get("/chunk")
async def get_bathymetry_chunk(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Center latitude in degrees (-90 to 90)"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Center longitude in degrees (-180 to 180)"),
    chunk_size: float = Query(0.05, gt=0.0, le=2.0, description="Bounding box half-width in degrees (e.g. 0.025, 0.05, 0.10)"),
    resolution: int = Query(7, ge=3, le=15, description="Number of grid samples along each axis (e.g. 5, 7, 9)"),
):
    """
    Get a 2D bathymetric mesh chunk for local 3D ocean chunk terrain reconstruction from GEBCO.
    """
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            _bathymetry_executor,
            gebco_service.get_chunk,
            latitude,
            longitude,
            chunk_size,
            resolution,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bathymetry unavailable: {str(e)}")

