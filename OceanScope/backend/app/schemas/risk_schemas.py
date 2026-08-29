"""
Pydantic Schemas for Ocean Risk & Disaster Decision-Support System
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class RiskFactorDetail(BaseModel):
    name: str = Field(..., description="Human readable parameter name")
    variable_key: str = Field(..., description="Variable identifier (e.g. current_speed, sst_anomaly)")
    value: Optional[float] = Field(None, description="Actual physical measurement or model value")
    unit: str = Field(..., description="Physical measurement unit")
    risk_level: str = Field(..., description="Evaluated risk tier: LOW, MODERATE, HIGH, CRITICAL")
    threshold_used: str = Field(..., description="Transparent threshold rule applied")
    is_available: bool = Field(..., description="True if variable exists in queried dataset, False otherwise")
    description: Optional[str] = None


class LocationRiskResponse(BaseModel):
    latitude: float = Field(..., description="Evaluated latitude")
    longitude: float = Field(..., description="Evaluated longitude")
    depth: float = Field(0.0, description="Evaluated depth level in meters")
    timestamp: str = Field(..., description="Time of observation / forecast step")
    overall_risk: str = Field(..., description="Max risk category across all available variables")
    contributing_parameter: str = Field(..., description="Primary parameter triggering highest risk level")
    primary_factor_value: Optional[float] = Field(None, description="Value of primary risk parameter")
    primary_factor_unit: Optional[str] = None
    primary_threshold: str = Field(..., description="Rule threshold that was met or exceeded")
    why_reason: str = Field(..., description="Transparent human-readable explanation of risk level")
    source: str = Field(..., description="Data source (e.g. 'INCOIS HYCOM' or 'Local Demo Dataset')")
    is_live_data: bool = Field(True, description="True if real INCOIS data, False if synthetic demo")
    factors: List[RiskFactorDetail] = Field(default_factory=list, description="Detailed breakdown per factor")
    disclaimer: str = Field(
        default="OceanScope risk indicators are demonstration decision-support visualizations and are not official warnings or certified forecasts.",
        description="Mandatory advisory disclaimer",
    )


class RegionalRiskHotspot(BaseModel):
    id: str
    title: str
    category: str = Field(..., description="CURRENT_SHEAR, MARINE_HEATWAVE, CYCLONE_ENERGY, SURGE_ELEVATION")
    risk_level: str = Field(..., description="LOW, MODERATE, HIGH, CRITICAL")
    latitude: float
    longitude: float
    region_name: str
    affected_area_km2: float
    detected_at: str
    contributing_parameter: str
    actual_value: float
    unit: str
    threshold_used: str
    source: str
    why_reason: str
    is_live_data: bool = True
