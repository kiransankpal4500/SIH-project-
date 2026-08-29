"""
Pydantic Data Transfer Schemas for OceanScope API
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class OceanLocationSchema(BaseModel):
    latitude: float = Field(..., description="Latitude in degrees (-90 to 90)")
    longitude: float = Field(..., description="Longitude in degrees (-180 to 180)")
    depth: float = Field(0.0, description="Depth in meters below surface")
    regionName: Optional[str] = Field(None, description="Geographical sea/ocean region")


class ObservationVariablesSchema(BaseModel):
    temperature: Optional[float] = Field(None, description="Sea Surface / Subsurface Temp in °C")
    salinity: Optional[float] = Field(None, description="Salinity in PSU")
    chlorophyll: Optional[float] = Field(None, description="Chlorophyll-a in mg/m³")
    currentSpeed: Optional[float] = Field(None, description="Velocity speed in m/s")
    currentDirection: Optional[float] = Field(None, description="Direction in degrees")
    seaSurfaceHeight: Optional[float] = Field(None, description="SSH anomaly in meters")


class ObservationSchema(BaseModel):
    id: str
    platformId: str
    platformType: str
    source: str
    location: OceanLocationSchema
    timestamp: str
    variables: ObservationVariablesSchema
    status: str


class OceanProfileSchema(BaseModel):
    id: str
    platformId: str
    location: OceanLocationSchema
    timestamp: str
    depthLevels: List[float]
    temperatureProfile: List[float]
    salinityProfile: List[float]
    chlorophyllProfile: Optional[List[float]] = None


class DisasterIndicatorSchema(BaseModel):
    id: str
    title: str
    type: str
    riskLevel: str
    location: OceanLocationSchema
    affectedAreaSqKm: float
    detectedAt: str
    description: str
    trend: str


class OceanSystemStatsSchema(BaseModel):
    activePlatformsCount: int
    modelOutputDate: str
    avgSeaSurfaceTemp: float
    avgSalinity: float
    activeAlertsCount: int
    coverageRegion: str


class OceanModelSchema(BaseModel):
    id: str
    name: str
    provider: str
    resolution: str
    forecastHorizonDays: int
    lastUpdated: str
    supportedVariables: List[str]


# --- INCOIS Real Argo ERDDAP Schemas ---

class ArgoObservationItem(BaseModel):
    platform_number: str
    cycle_number: int
    latitude: float
    longitude: float
    timestamp: str
    pressure: Optional[float] = None
    temperature: Optional[float] = None
    salinity: Optional[float] = None


class ArgoObservationResponse(BaseModel):
    source: str = "INCOIS"
    dataset: str = "Indian_ARGO_Floats"
    retrieved_at: str
    data_time_range: Optional[str] = "Historical & Recent Operational Runs"
    units: Dict[str, str] = {
        "temperature": "degree_Celsius",
        "salinity": "PSU",
        "pressure": "decibar",
    }
    is_live_data: bool = True
    count: int
    observations: List[ArgoObservationItem]


class ArgoProfileLevelItem(BaseModel):
    pressure: float
    temperature: Optional[float] = None
    salinity: Optional[float] = None


class ArgoProfileResponse(BaseModel):
    source: str = "INCOIS"
    dataset: str = "Indian_ARGO_Floats"
    platform_number: str
    cycle_number: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    timestamp: Optional[str] = None
    retrieved_at: str
    units: Dict[str, str] = {
        "temperature": "degree_Celsius",
        "salinity": "PSU",
        "pressure": "decibar",
    }
    is_live_data: bool = True
    profile: List[ArgoProfileLevelItem]
