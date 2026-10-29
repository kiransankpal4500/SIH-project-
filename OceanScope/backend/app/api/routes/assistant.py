"""
OceanScope AI Research Assistant API Router (Phases 1, 2, 3, 4)
Provides endpoints for:
- Conversational scientific inquiries
- Dual-location spatial comparisons
- Structured oceanographic research reports
- Multi-depth vertical soundings
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from app.schemas.assistant_schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    CompareLocationsRequest,
    CompareLocationsResponse,
    GenerateReportRequest,
    ResearchReportResponse,
    DepthProfileResponse,
)
from app.services.assistant_service import assistant_service
from app.services.ocean_research_service import ocean_research_service
from app.services.gemini_service import gemini_service
from app.core.config import settings

router = APIRouter(prefix="/assistant", tags=["AI Research Assistant & Lab"])


@router.post(
    "/chat",
    response_model=AssistantChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit query to AI Research Assistant",
    description="Processes scientific queries with optional spatial coordinates and depth context.",
)
async def chat_with_assistant(request: AssistantChatRequest) -> AssistantChatResponse:
    try:
        return await assistant_service.process_query(request)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assistant service error: {str(exc)}",
        )


@router.post(
    "/compare",
    response_model=CompareLocationsResponse,
    status_code=status.HTTP_200_OK,
    summary="Compare two oceanographic locations",
    description="Queries independent verified measurements for Location A and Location B and generates comparative analysis.",
)
async def compare_ocean_locations(request: CompareLocationsRequest) -> CompareLocationsResponse:
    try:
        return await assistant_service.compare_locations(request)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Comparison service error: {str(exc)}",
        )


@router.post(
    "/report",
    response_model=ResearchReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate scientific research report",
    description="Assembles a publication-ready field report with executive summary, methods, verified data, and interpretation.",
)
async def generate_research_report(request: GenerateReportRequest) -> ResearchReportResponse:
    try:
        return await assistant_service.generate_report(request)
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generator error: {str(exc)}",
        )


@router.get(
    "/depth-profile",
    response_model=DepthProfileResponse,
    summary="Get vertical depth sounding profile",
    description="Returns multi-depth profile levels (temperature, salinity, currents vs depth) from numerical archives.",
)
async def get_depth_profile(
    latitude: Optional[float] = Query(None, description="Latitude in degrees (-90 to 90)"),
    longitude: Optional[float] = Query(None, description="Longitude in degrees (-180 to 180)"),
    lat: Optional[float] = Query(None, description="Latitude alias in degrees (-90 to 90)"),
    lon: Optional[float] = Query(None, description="Longitude alias in degrees (-180 to 180)"),
) -> DepthProfileResponse:
    target_lat = latitude if latitude is not None else lat
    target_lon = longitude if longitude is not None else lon

    if target_lat is None or target_lon is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Both latitude and longitude parameters are required. Example: /api/v1/assistant/depth-profile?latitude=13.29&longitude=72.22 (or ?lat=13.29&lon=72.22)",
        )

    if not (-90.0 <= target_lat <= 90.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Latitude {target_lat} is outside valid geographic range (-90.0 to 90.0 degrees).",
        )

    if not (-180.0 <= target_lon <= 180.0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Longitude {target_lon} is outside valid geographic range (-180.0 to 180.0 degrees).",
        )

    try:
        res = await ocean_research_service.get_depth_profile(target_lat, target_lon)
        return DepthProfileResponse(**res)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Depth profile query error: {str(exc)}",
        )


@router.get(
    "/status",
    summary="Get AI Research Assistant Service Status",
    description="Checks assistant service readiness, execution phase, and operational capabilities.",
)
async def get_assistant_status():
    """Returns active operational status of the AI Research Assistant module."""
    is_gemini = gemini_service.is_gemini_active()
    return {
        "status": "online",
        "module": "OceanScope AI Research Assistant & Lab",
        "phase": "Phase 4 (Research Lab: Multi-parameter, Comparison, Reports, Depth Lab)",
        "capabilities": [
            "spatial_context_enrichment",
            "bounded_history_tracking",
            "pydantic_schema_validation",
            "real_gebco_bathymetry",
            "real_hycom_parameters",
            "argo_in_situ_linkage",
            "google_genai_sdk",
            "dual_location_comparison",
            "scientific_report_generation",
            "vertical_depth_profiling",
        ],
        "model_configured": settings.GEMINI_MODEL or "gemini-2.5-flash",
        "gemini_active": is_gemini,
        "gemini_setup_needed": not is_gemini,
    }
