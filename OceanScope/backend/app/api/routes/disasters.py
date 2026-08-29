"""
Ocean Risk & Disaster Indicators Router
"""

from fastapi import APIRouter
from typing import List
from app.schemas.ocean_schemas import DisasterIndicatorSchema
from app.services.ocean_service import OceanService

router = APIRouter(prefix="/disasters", tags=["Disaster Indicators"])


@router.get("/alerts", response_model=List[DisasterIndicatorSchema])
async def get_disaster_alerts():
    """Fetch active marine heatwave and ocean circulation anomaly alert indicators."""
    return OceanService.get_disasters()
