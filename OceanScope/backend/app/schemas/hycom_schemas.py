"""
Pydantic Schemas for INCOIS HYCOM Numerical Model Integration
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class OceanModelPoint(BaseModel):
    source: str = "INCOIS"
    provider: str = "INCOIS RSMC"
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
    selected_file: Optional[str] = None
    time_difference_hours: Optional[float] = None


class OceanModelProfileLevel(BaseModel):
    depth: float
    temperature: Optional[float] = None
    salinity: Optional[float] = None
    current_u: Optional[float] = None
    current_v: Optional[float] = None


class OceanModelProfile(BaseModel):
    source: str = "INCOIS"
    provider: str = "INCOIS RSMC"
    model: str = "HYCOM"
    dataset: str = "INCOIS_RSMC_HYCOM"
    retrieved_at: str
    latitude: float
    longitude: float
    time: str
    model_time: str
    profile: List[OceanModelProfileLevel]
    selected_file: Optional[str] = None
    time_difference_hours: Optional[float] = None


class OceanModelCurrent(BaseModel):
    source: str = "INCOIS"
    provider: str = "INCOIS RSMC"
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
    selected_file: Optional[str] = None
    time_difference_hours: Optional[float] = None


class OceanModelTimeseriesPoint(BaseModel):
    time: str
    value: Optional[float] = None
    selected_file: Optional[str] = None


class OceanModelTimeseriesResponse(BaseModel):
    source: str = "INCOIS"
    provider: str = "INCOIS RSMC"
    model: str = "HYCOM"
    dataset: str = "INCOIS_RSMC_HYCOM"
    latitude: float
    longitude: float
    depth: float = 0.0
    variable: str
    unit: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    count: int
    timeseries: List[OceanModelTimeseriesPoint]


class OceanModelMetadata(BaseModel):
    source: str = "INCOIS"
    provider: str = "INCOIS RSMC"
    model: str = "HYCOM"
    dataset: str = "INCOIS_RSMC_HYCOM"
    filename: str
    available_files: List[str] = Field(default_factory=list)
    file_count: int = 1
    is_available: bool = True
    dimensions: Dict[str, int]
    discovered_variables: List[str]
    variables: List[str] = Field(default_factory=list)
    mapped_variables: Dict[str, str]
    time_range: List[str]
    earliest_time: Optional[str] = None
    latest_time: Optional[str] = None
    depth_levels: List[float]
    available_depths: List[float] = Field(default_factory=list)
    lat_min: float
    lat_max: float
    latitude_range: List[float] = Field(default_factory=list)
    lon_min: float
    lon_max: float
    longitude_range: List[float] = Field(default_factory=list)
    grid_resolution_deg: Optional[float] = None
    domain: Optional[str] = "Indian Ocean & Adjacent Seas"


class ModelObservationComparisonItem(BaseModel):
    depth: float
    model_temperature: Optional[float] = None
    observed_temperature: Optional[float] = None
    temperature_difference: Optional[float] = None
    model_salinity: Optional[float] = None
    observed_salinity: Optional[float] = None
    salinity_difference: Optional[float] = None
    qc_status: str = "PASSED"
    is_valid_pair: bool = True


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
    selected_file: Optional[str] = None
    matched_depth_count: int = 0
    valid_pairs_count: int = 0
    missing_count: int = 0
    qc_pass_count: int = 0
    qc_fail_count: int = 0
    temp_bias: Optional[float] = None
    temp_rmse: Optional[float] = None
    temp_mae: Optional[float] = None
    sal_bias: Optional[float] = None
    sal_rmse: Optional[float] = None
    sal_mae: Optional[float] = None
    profile_comparison: List[ModelObservationComparisonItem]
