"""
Ocean Risk & Disaster Decision-Support Router
Provides endpoints for regional risk alerts, point-based location risk calculations, and threshold configurations.
"""

from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional, Dict, Any

from app.schemas.risk_schemas import (
    LocationRiskResponse,
    RegionalRiskHotspot,
)
from app.services.risk_service import ocean_risk_service
from app.core.risk_config import RISK_THRESHOLDS, DISCLAIMER_TEXT

router = APIRouter(prefix="/disasters", tags=["Disaster Indicators"])


@router.get("/alerts", response_model=List[RegionalRiskHotspot])
async def get_disaster_alerts(
    demo: bool = Query(False, description="Use local demo dataset instead of live INCOIS HYCOM"),
):
    """
    Fetch active regional risk hotspot indicators across the Indian Ocean basin.
    Evaluates real ocean conditions from INCOIS HYCOM when demo=False.
    """
    try:
        return ocean_risk_service.get_regional_risk_hotspots(is_demo=demo)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to evaluate regional risk alerts: {str(e)}")


@router.get("/risk-at-point", response_model=LocationRiskResponse)
async def evaluate_risk_at_point(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Latitude in degrees"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Longitude in degrees"),
    depth: float = Query(0.0, ge=0.0, le=5000.0, description="Depth in meters"),
    time: Optional[str] = Query(None, description="ISO timestamp (e.g. 2026-08-28T06:00:00Z)"),
    demo: bool = Query(False, description="Evaluate using demo dataset"),
):
    """
    Evaluate multi-parameter rule-based risk level for an arbitrary ocean location.
    Extracts real values from INCOIS HYCOM model fields (Current Speed, SST Anomaly, SSH, TCHP, MLD).
    """
    try:
        return ocean_risk_service.evaluate_location_risk(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            time_str=time,
            is_demo=demo,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Risk evaluation error: {str(e)}")


@router.get("/thresholds")
async def get_risk_thresholds() -> Dict[str, Any]:
    """
    Get full transparent configuration of all rule thresholds, parameters, and advisory disclaimer.
    """
    return {
        "thresholds": RISK_THRESHOLDS,
        "disclaimer": DISCLAIMER_TEXT,
    }
