"""
Marine Life API Routes
Provides depth-aware and location-aware marine species data from OBIS occurrence records.
"""

from fastapi import APIRouter, Query
from app.services.marine_life_service import marine_life_service

router = APIRouter(prefix="/marine-life", tags=["Marine Life"])


@router.get("/species")
async def get_species(
    latitude: float = Query(..., ge=-90, le=90, description="Latitude"),
    longitude: float = Query(..., ge=-180, le=180, description="Longitude"),
    depth: float = Query(0.0, ge=0, description="Selected depth in meters"),
    radius_km: float = Query(50.0, ge=10, le=250, description="Search radius in km"),
    max_species: int = Query(8, ge=1, le=20, description="Maximum species to return"),
):
    """
    Returns depth-appropriate marine species for a given ocean location.
    Uses OBIS occurrence records filtered by geographic region and depth range.
    """
    result = marine_life_service.get_species_for_location_and_depth(
        latitude=latitude,
        longitude=longitude,
        depth=depth,
        radius_km=radius_km,
        max_species=max_species,
    )
    return result
