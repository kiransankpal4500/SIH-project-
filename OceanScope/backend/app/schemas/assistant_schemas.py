"""
Pydantic Schemas for OceanScope AI Research Assistant (Phases 1, 2, 3, 4)
Defines strongly-typed request and response structures for:
- Conversational research queries
- Dual-location spatial comparisons
- Structured oceanographic research report generation
- Depth-aware multi-layer vertical soundings
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"] = Field(
        ..., description="Role of the message sender ('user' or 'assistant')"
    )
    content: str = Field(
        ...,
        min_length=1,
        max_length=4000,
        description="Text content of the message",
    )

    @field_validator("content")
    @classmethod
    def validate_content_not_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Message content cannot be whitespace only")
        return trimmed


class AssistantChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Oceanographic research question from user",
    )
    latitude: Optional[float] = Field(
        None,
        ge=-90.0,
        le=90.0,
        description="Target latitude in degrees (-90 to 90)",
    )
    longitude: Optional[float] = Field(
        None,
        ge=-180.0,
        le=180.0,
        description="Target longitude in degrees (-180 to 180)",
    )
    depth: Optional[float] = Field(
        None,
        ge=0.0,
        le=11000.0,
        description="Target depth level in meters (0 to 11,000m)",
    )
    conversation_history: Optional[List[ChatMessage]] = Field(
        default_factory=list,
        max_length=20,
        description="Bounded recent message history (max 20 turns)",
    )

    @field_validator("question")
    @classmethod
    def validate_question_not_empty(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Question cannot be whitespace only")
        return trimmed


class AssistantMetadata(BaseModel):
    source: str = Field(..., description="System origin and service identification")
    timestamp: str = Field(..., description="ISO 8601 UTC timestamp of response generation")
    model: str = Field(..., description="Active reasoning engine or data aggregator")
    has_location_context: bool = Field(False, description="Whether valid spatial coordinates were supplied")
    selected_coordinates: Optional[Dict[str, float]] = Field(None, description="Echo of provided coordinates")
    gemini_active: bool = Field(False, description="Whether Google Gemini API key is configured and active")


class AssistantChatResponse(BaseModel):
    answer: str = Field(..., description="Scientific explanation or data-grounded synthesis")
    data_context: Dict[str, Any] = Field(
        default_factory=dict,
        description="Structured verified measurements from GEBCO, HYCOM, and Argo",
    )
    sources: List[str] = Field(
        default_factory=list,
        description="Actual observational and model data providers",
    )
    timestamps: Dict[str, str] = Field(
        default_factory=dict,
        description="Real timestamps associated with retrieved measurements",
    )
    limitations: List[str] = Field(
        default_factory=list,
        description="Missing, stale, unsupported, or failed parameters",
    )
    request_id: str = Field(..., description="Unique tracking identifier for request")
    metadata: AssistantMetadata = Field(..., description="Origin and execution metadata")
    notices: List[str] = Field(
        default_factory=list,
        description="Scientific caveats, mode disclaimers, or configuration notices",
    )


# ─── PHASE 4: RESEARCH LAB SCHEMAS ───

class LocationTarget(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude in degrees (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude in degrees (-180 to 180)")
    depth: float = Field(0.0, ge=0.0, le=11000.0, description="Depth level in meters")
    label: Optional[str] = Field(None, description="Descriptive identifier (e.g. Arabian Sea Basin)")


class CompareLocationsRequest(BaseModel):
    location_a: LocationTarget = Field(..., description="First geographic location target")
    location_b: LocationTarget = Field(..., description="Second geographic location target")
    question: Optional[str] = Field(
        None,
        max_length=2000,
        description="Specific scientific comparative inquiry",
    )


class CompareLocationsResponse(BaseModel):
    location_a: Dict[str, Any] = Field(..., description="Telemetry data context for Location A")
    location_b: Dict[str, Any] = Field(..., description="Telemetry data context for Location B")
    comparison_metrics: Dict[str, Any] = Field(..., description="Calculated parameter differences and ratios")
    analysis: str = Field(..., description="Scientific comparative analysis")
    sources: List[str] = Field(default_factory=list, description="All data sources consulted")
    timestamps: Dict[str, str] = Field(default_factory=dict, description="Timestamps for both locations")
    limitations: List[str] = Field(default_factory=list, description="Caveats or comparability warnings")
    request_id: str = Field(..., description="Tracking ID")
    metadata: AssistantMetadata = Field(..., description="Metadata")


class GenerateReportRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Research topic or question for the report",
    )
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Target latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Target longitude")
    depth: float = Field(0.0, ge=0.0, le=11000.0, description="Target depth level")
    include_depth_profile: bool = Field(True, description="Whether to include vertical soundings table")


class ResearchReportResponse(BaseModel):
    report_id: str = Field(..., description="Unique publication report ID")
    title: str = Field(..., description="Formal scientific report title")
    executive_summary: str = Field(..., description="High-level findings summary")
    investigation_scope: Dict[str, Any] = Field(..., description="Location, depth, coordinates, and timestamp")
    methods_and_datasets: List[Dict[str, str]] = Field(..., description="Scientific methodology and providers")
    verified_measurements: Dict[str, Any] = Field(..., description="Tabulated parameter measurements")
    depth_profile_levels: Optional[List[Dict[str, Any]]] = Field(
        None, description="Multi-depth profile sounding points"
    )
    scientific_interpretation: str = Field(..., description="Physical oceanographic evaluation")
    uncertainties_and_limitations: List[str] = Field(..., description="Known data limitations and sensor bounds")
    provenance: Dict[str, Any] = Field(..., description="Sources, models, and timestamps")
    generated_at: str = Field(..., description="ISO generation timestamp")


class DepthProfileLevel(BaseModel):
    depth_m: float
    temperature_c: Optional[float] = None
    salinity_psu: Optional[float] = None
    current_speed_m_s: Optional[float] = None


class DepthProfileResponse(BaseModel):
    latitude: float
    longitude: float
    source: str
    dataset: str
    model_time: str
    levels: List[DepthProfileLevel]
    total_levels: int
    has_valid_data: bool = True
    notice: Optional[str] = None
    error: Optional[str] = None
