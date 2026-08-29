"""
Pydantic Schemas for INCOIS HYCOM Numerical Model Integration
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class OceanModelPoint(BaseModel):
    source: str = "INCOIS"
    model: str = "HYCOM"
    dataset: str = "INCOIS_RSMC_HYCOM"
    retrieved_at: str
    latitude: float
    longitude: float
    depth: float = 0.0
    time: str
    model_time: str
    variable: str
    value: float
    unit: str


class OceanModelProfileLevel(BaseModel):
    depth: float
    temperature: Optional[float] = None
    salinity: Optional[float] = None
    current_u: Optional[float] = None
    current_v: Optional[float] = None


class OceanModelProfile(BaseModel):
    source: str = "INCOIS"
    model: str = "HYCOM"
    dataset: str = "INCOIS_RSMC_HYCOM"
    retrieved_at: str
    latitude: float
    longitude: float
    time: str
    model_time: str
    profile: List[OceanModelProfileLevel]


class OceanModelCurrent(BaseModel):
    source: str = "INCOIS"
    model: str = "HYCOM"
    dataset: str = "INCOIS_RSMC_HYCOM"
    retrieved_at: str
    latitude: float
    longitude: float
    depth: float = 0.0
    time: str
    model_time: str
    u: float
    v: float
    speed: float
    direction: float
    unit: str = "m/s"


class OceanModelMetadata(BaseModel):
    source: str = "INCOIS"
    model: str = "HYCOM"
    dataset: str = "INCOIS_RSMC_HYCOM"
    filename: str
    is_available: bool = True
    dimensions: Dict[str, int]
    discovered_variables: List[str]
    mapped_variables: Dict[str, str]
    time_range: List[str]
    depth_levels: List[float]
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float


class ModelObservationComparisonItem(BaseModel):
    depth: float
    model_temperature: Optional[float] = None
    observed_temperature: Optional[float] = None
    temperature_difference: Optional[float] = None
    model_salinity: Optional[float] = None
    observed_salinity: Optional[float] = None
    salinity_difference: Optional[float] = None


class ModelObservationComparisonResponse(BaseModel):
    source_model: str = "INCOIS HYCOM"
    source_observation: str = "INCOIS Argo"
    platform_number: str
    cycle_number: int
    observation_latitude: float
    observation_longitude: float
    model_latitude: float
    model_longitude: float
    distance_km: float
    observation_time: str
    model_time: str
    time_difference_hours: float
    temp_bias: Optional[float] = None
    temp_rmse: Optional[float] = None
    temp_mae: Optional[float] = None
    sal_bias: Optional[float] = None
    sal_rmse: Optional[float] = None
    sal_mae: Optional[float] = None
    profile_comparison: List[ModelObservationComparisonItem]
