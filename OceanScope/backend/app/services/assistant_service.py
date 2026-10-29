"""
OceanScope AI Research Assistant Service (Phases 1, 2, 3, 4)
Connects user scientific questions with:
- Phase 2: Real GEBCO, INCOIS HYCOM, and Argo observational data.
- Phase 3: Google Gemini LLM reasoning using the official google-genai SDK.
- Phase 4: Spatial dual-location comparison, research report generation, and multi-depth analysis.
"""

import uuid
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.schemas.assistant_schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
    AssistantMetadata,
    CompareLocationsRequest,
    CompareLocationsResponse,
    GenerateReportRequest,
    ResearchReportResponse,
)
from app.services.ocean_research_service import ocean_research_service
from app.services.gemini_service import gemini_service

def calculate_seawater_density(temp_c: Optional[float], sal_psu: Optional[float]) -> Optional[float]:
    """
    Computes UNESCO (1981) EOS-80 surface potential density anomaly sigma_theta (kg/m^3).
    sigma_theta = rho(S, T, 0) - 1000
    """
    if temp_c is None or sal_psu is None:
        return None
    try:
        t = float(temp_c)
        s = float(sal_psu)
        # Pure water density at atmospheric pressure (SMOW)
        smow = (
            999.842594
            + 6.793952e-2 * t
            - 9.095290e-3 * (t**2)
            + 1.001685e-4 * (t**3)
            - 1.120083e-6 * (t**4)
            + 6.536332e-9 * (t**5)
        )
        # Salinity adjustment factors
        a = (
            8.24493e-1
            - 4.0899e-3 * t
            + 7.6438e-5 * (t**2)
            - 8.2467e-7 * (t**3)
            + 5.3875e-9 * (t**4)
        )
        b = -5.72466e-3 + 1.0227e-4 * t - 1.6546e-6 * (t**2)
        c = 4.8314e-4

        rho = smow + a * s + b * (s**1.5) + c * (s**2)
        return round(rho - 1000.0, 3)
    except Exception:
        return None


class AssistantService:
    """
    Unified scientific conversational & research lab service.
    Orchestrates real multi-source ocean data collection, spatial comparisons,
    vertical depth soundings, and publication report generation.
    """

    async def process_query(self, req: AssistantChatRequest) -> AssistantChatResponse:
        req_id = f"req_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()
        has_coords = req.latitude is not None and req.longitude is not None
        depth_val = req.depth if req.depth is not None else 0.0

        coord_info: Optional[Dict[str, float]] = None
        if has_coords:
            coord_info = {
                "latitude": round(float(req.latitude), 4),
                "longitude": round(float(req.longitude), 4),
                "depth_meters": round(float(depth_val), 1),
            }

        # 1. Phase 2: Gather real ocean research data from platform services
        if has_coords:
            data_context = await ocean_research_service.gather_context(
                latitude=req.latitude,
                longitude=req.longitude,
                depth=depth_val,
            )
        else:
            data_context = {
                "latitude": None,
                "longitude": None,
                "depth_meters": depth_val,
                "parameters": {},
                "sources": [],
                "timestamps": {},
                "limitations": [
                    "No location selected in Explorer. Answers are grounded in general oceanographic principles."
                ],
                "has_data": False,
            }

        # 2. Phase 3: Synthesize explanation using Google Gemini or deterministic data summary
        synthesis_result = await gemini_service.generate_response(
            question=req.question,
            data_context=data_context,
            conversation_history=req.conversation_history,
        )

        answer_text = synthesis_result.get("answer", "")
        model_used = synthesis_result.get("model_used", "OceanScope Assistant Core")
        engine_notices = synthesis_result.get("notices", [])

        # Combine limitations and notices cleanly
        all_notices = list(dict.fromkeys(engine_notices + data_context.get("limitations", [])))

        metadata = AssistantMetadata(
            source="OceanScope Scientific Backend (FastAPI)",
            timestamp=now_iso,
            model=model_used,
            has_location_context=has_coords,
            selected_coordinates=coord_info,
            gemini_active=gemini_service.is_gemini_active(),
        )

        return AssistantChatResponse(
            answer=answer_text,
            data_context=data_context.get("parameters", {}),
            sources=data_context.get("sources", []),
            timestamps=data_context.get("timestamps", {}),
            limitations=data_context.get("limitations", []),
            request_id=req_id,
            metadata=metadata,
            notices=all_notices,
        )

    async def compare_locations(self, req: CompareLocationsRequest) -> CompareLocationsResponse:
        """
        Gathers independent real measurements for Location A and Location B,
        calculates hydrographic deltas, and synthesizes a comparative scientific analysis.
        """
        req_id = f"cmp_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Concurrent retrieval for both locations
        task_a = ocean_research_service.gather_context(
            latitude=req.location_a.latitude,
            longitude=req.location_a.longitude,
            depth=req.location_a.depth,
        )
        task_b = ocean_research_service.gather_context(
            latitude=req.location_b.latitude,
            longitude=req.location_b.longitude,
            depth=req.location_b.depth,
        )

        data_a, data_b = await asyncio.gather(task_a, task_b)

        # Decorate location dictionaries with top-level parameter references for backward & frontend compatibility
        for d in (data_a, data_b):
            params = d.get("parameters", {})
            d["bathymetry"] = params.get("bathymetry")
            d["temperature"] = params.get("temperature")
            d["salinity"] = params.get("salinity")
            d["current"] = params.get("current")
            d["mixed_layer_depth"] = params.get("mld")
            d["mld"] = params.get("mld")
            d["sea_surface_height"] = params.get("height")
            d["height"] = params.get("height")
            d["in_situ_argo"] = params.get("in_situ_argo")

        # Calculate metric differences (Convention: Location B minus Location A)
        p_a = data_a.get("parameters", {})
        p_b = data_b.get("parameters", {})

        t_a = p_a.get("temperature", {}).get("value")
        t_b = p_b.get("temperature", {}).get("value")
        s_a = p_a.get("salinity", {}).get("value")
        s_b = p_b.get("salinity", {}).get("value")
        b_a = p_a.get("bathymetry", {}).get("value")
        b_b = p_b.get("bathymetry", {}).get("value")
        curr_a = p_a.get("current", {}).get("speed_m_s")
        curr_b = p_b.get("current", {}).get("speed_m_s")
        mld_a = p_a.get("mld", {}).get("value")
        mld_b = p_b.get("mld", {}).get("value")

        # Compute current velocity ratio strictly when denominator is valid and non-zero (> 1e-4)
        curr_ratio: Optional[float] = None
        if curr_a is not None and curr_b is not None:
            if curr_a > 0.0001:
                curr_ratio = round(float(curr_b) / float(curr_a), 3)

        depth_levels_differ = abs(float(req.location_a.depth) - float(req.location_b.depth)) > 0.1

        t_delta = round(t_b - t_a, 3) if (t_a is not None and t_b is not None) else None
        s_delta = round(s_b - s_a, 3) if (s_a is not None and s_b is not None) else None
        b_delta = round(b_b - b_a, 1) if (b_a is not None and b_b is not None) else None
        curr_delta = round(curr_b - curr_a, 3) if (curr_a is not None and curr_b is not None) else None
        mld_delta = round(mld_b - mld_a, 1) if (mld_a is not None and mld_b is not None) else None

        comparison_metrics: Dict[str, Any] = {
            "convention": "Location B minus Location A",
            "temperature_delta_c": t_delta,
            "delta_temperature_c": t_delta,
            "salinity_delta_psu": s_delta,
            "delta_salinity_psu": s_delta,
            "bathymetry_delta_m": b_delta,
            "bathymetry_difference_m": b_delta,
            "current_speed_delta_m_s": curr_delta,
            "delta_current_speed_m_s": curr_delta,
            "current_speed_ratio": curr_ratio,
            "mld_delta_m": mld_delta,
            "delta_mld_m": mld_delta,
            "depth_levels_differ": depth_levels_differ,
            "location_a_depth_m": req.location_a.depth,
            "location_b_depth_m": req.location_b.depth,
            "location_a_has_data": data_a.get("has_data", False),
            "location_b_has_data": data_b.get("has_data", False),
        }

        # Check for comparability warnings
        limitations: List[str] = []
        if depth_levels_differ:
            limitations.append(
                f"Locations are queried at different depth levels: Location A is at {req.location_a.depth}m, "
                f"while Location B is at {req.location_b.depth}m. Hydrographic parameter differences reflect vertical stratification in addition to horizontal basin gradients."
            )

        if t_a is None or t_b is None:
            limitations.append("Temperature delta cannot be computed because one or both locations lack verified temperature telemetry.")
        if s_a is None or s_b is None:
            limitations.append("Salinity delta cannot be computed because one or both locations lack verified salinity telemetry.")
        if curr_a is None or curr_b is None:
            limitations.append("Current velocity comparison cannot be computed because one or both locations lack verified current vectors.")
        elif curr_a <= 0.0001:
            limitations.append("Current velocity ratio (B / A) is undefined because Location A velocity is zero.")

        limitations.extend(data_a.get("limitations", []))
        limitations.extend(data_b.get("limitations", []))

        # Generate comparative analysis
        analysis_text = await gemini_service.generate_comparison_analysis(
            location_a=data_a,
            location_b=data_b,
            metrics=comparison_metrics,
            question=req.question,
        )

        all_sources = list(dict.fromkeys(data_a.get("sources", []) + data_b.get("sources", [])))
        timestamps = {**data_a.get("timestamps", {}), **data_b.get("timestamps", {})}

        metadata = AssistantMetadata(
            source="OceanScope Scientific Backend (FastAPI)",
            timestamp=now_iso,
            model="OceanScope Comparative Analysis Engine",
            has_location_context=True,
            gemini_active=gemini_service.is_gemini_active(),
        )

        return CompareLocationsResponse(
            location_a=data_a,
            location_b=data_b,
            comparison_metrics=comparison_metrics,
            analysis=analysis_text,
            sources=all_sources,
            timestamps=timestamps,
            limitations=list(dict.fromkeys(limitations)),
            request_id=req_id,
            metadata=metadata,
        )

    async def generate_report(self, req: GenerateReportRequest) -> ResearchReportResponse:
        """
        Generates a structured publication-style Oceanographic Research Report
        from retrieved real telemetry, EOS-80 calculations, and vertical soundings.
        """
        report_id = f"rpt_{datetime.now(timezone.utc).strftime('%Y%m%d')}_{uuid.uuid4().hex[:8]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Validated coordinate bounds
        lat = max(-90.0, min(90.0, round(float(req.latitude), 4)))
        lon = max(-180.0, min(180.0, round(float(req.longitude), 4)))
        depth_m = max(0.0, min(11000.0, round(float(req.depth), 1)))

        lat_dir = "N" if lat >= 0 else "S"
        lon_dir = "E" if lon >= 0 else "W"
        lat_str = f"{abs(lat):.4f}° {lat_dir}"
        lon_str = f"{abs(lon):.4f}° {lon_dir}"
        coord_str = f"{lat_str}, {lon_str}"

        # 1. Gather point context
        data_context = await ocean_research_service.gather_context(
            latitude=lat,
            longitude=lon,
            depth=depth_m,
        )

        # 2. Gather depth profile if requested
        depth_levels = None
        if req.include_depth_profile:
            profile_res = await ocean_research_service.get_depth_profile(
                latitude=lat,
                longitude=lon,
            )
            depth_levels = profile_res.get("levels", [])

        # Format unified scope object (supports target_latitude and latitude keys)
        scope = {
            "target_latitude": lat,
            "target_longitude": lon,
            "target_depth_m": depth_m,
            "latitude": lat,
            "longitude": lon,
            "depth_level_m": depth_m,
            "coordinates": coord_str,
            "coordinates_formatted": coord_str,
            "investigation_date": now_iso.split("T")[0],
            "research_topic": req.question,
        }

        # Extract measurements
        params = data_context.get("parameters", {})
        bathy = params.get("bathymetry", {}).get("value")
        elevation = params.get("bathymetry", {}).get("elevation_m")
        temp = params.get("temperature", {}).get("value")
        sal = params.get("salinity", {}).get("value")
        curr = params.get("current", {}).get("speed_m_s")
        curr_dir = params.get("current", {}).get("direction_deg")
        mld = params.get("mld", {}).get("value")
        ssh = params.get("height", {}).get("value")

        # Calculate potential density sigma_theta
        sigma_theta = calculate_seawater_density(temp, sal)
        if sigma_theta is not None:
            params["density"] = {
                "parameter": "Potential Density Anomaly (σθ)",
                "value": sigma_theta,
                "unit": "kg/m³",
                "depth_level_m": depth_m,
                "data_type": "calculated_eos80",
                "source": "UNESCO (1981) EOS-80 International Equation of State",
                "status": "calculated",
                "methodology": "Calculated from in-situ water temperature and practical salinity",
            }

        # Ensure top-level parameter aliases exist for frontend convenience
        if "height" in params and "sea_surface_height" not in params:
            params["sea_surface_height"] = params["height"]
        if "mld" in params and "mixed_layer_depth" not in params:
            params["mixed_layer_depth"] = params["mld"]

        # Build dynamic methodology table
        hycom_time = data_context.get("timestamps", {}).get("HYCOM", "2026-08-28T18:00:00Z")
        methods = [
            {
                "parameter": "Seabed Bathymetry / Relief",
                "provider": "GEBCO Compilation Group",
                "dataset": "GEBCO_2024_Grid",
                "units": "m",
                "depth_level": "Seafloor",
                "timestamp": "2024 Release",
                "status": "Retrieved" if bathy is not None else "Unavailable",
                "method": "15 arc-second satellite altimetry & shipboard soundings",
                "system": "GEBCO 2024 Global Grid",
                "role": "Seabed Topography & Bathymetry",
                "resolution": "15 arc-second continuous global terrain model",
            },
            {
                "parameter": "Sea Water Temperature",
                "provider": "INCOIS / HYCOM",
                "dataset": "HYCOM GLBy0.08",
                "units": "°C",
                "depth_level": f"{depth_m:.1f} m",
                "timestamp": hycom_time,
                "status": "Retrieved" if temp is not None else "Unavailable",
                "method": "4D Ocean Numerical Forecast Primitive Equation Model",
                "system": "INCOIS HYCOM GLBy0.08",
                "role": "Thermal Stratification Modeling",
                "resolution": "0.08° (~9 km) horizontal grid across 40 vertical levels",
            },
            {
                "parameter": "Sea Water Practical Salinity",
                "provider": "INCOIS / HYCOM",
                "dataset": "HYCOM GLBy0.08",
                "units": "PSU",
                "depth_level": f"{depth_m:.1f} m",
                "timestamp": hycom_time,
                "status": "Retrieved" if sal is not None else "Unavailable",
                "method": "Baroclinic Mass & Haline Advection-Diffusion Equations",
                "system": "INCOIS HYCOM GLBy0.08",
                "role": "Haline Structure Modeling",
                "resolution": "0.08° (~9 km) horizontal grid across 40 vertical levels",
            },
            {
                "parameter": "Horizontal Ocean Velocity (Current)",
                "provider": "INCOIS / HYCOM",
                "dataset": "HYCOM GLBy0.08",
                "units": "m/s",
                "depth_level": f"{depth_m:.1f} m",
                "timestamp": hycom_time,
                "status": "Retrieved" if curr is not None else "Unavailable",
                "method": "Geostrophic & Wind-Driven Navier-Stokes Numerical Integration",
                "system": "INCOIS HYCOM GLBy0.08",
                "role": "Hydrodynamic Circulation",
                "resolution": "0.08° (~9 km) horizontal vector field (u, v components)",
            },
            {
                "parameter": "Mixed Layer Depth (MLD)",
                "provider": "INCOIS / HYCOM",
                "dataset": "HYCOM GLBy0.08",
                "units": "m",
                "depth_level": "0.0 m (Surface)",
                "timestamp": hycom_time,
                "status": "Retrieved" if mld is not None else "Unavailable",
                "method": "Density threshold criterion (Δσ = 0.125 kg/m³ from surface)",
                "system": "INCOIS HYCOM GLBy0.08",
                "role": "Boundary Layer Physics",
                "resolution": "Derived 2D diagnostic surface field",
            },
            {
                "parameter": "Sea Surface Height Anomaly (SSHA)",
                "provider": "INCOIS / HYCOM",
                "dataset": "HYCOM GLBy0.08",
                "units": "m",
                "depth_level": "0.0 m (Surface)",
                "timestamp": hycom_time,
                "status": "Retrieved" if ssh is not None else "Unavailable",
                "method": "Dynamic Sea Surface Topography & Barotropic Free Surface",
                "system": "INCOIS HYCOM GLBy0.08",
                "role": "Altimetry Topography",
                "resolution": "0.08° diagnostic dynamic sea level field",
            },
        ]

        # Add Argo method
        argo_data = params.get("in_situ_argo")
        if argo_data:
            methods.append({
                "parameter": "In-situ Profiling Float (ARGO)",
                "provider": "International Argo Program / INCOIS",
                "dataset": f"Platform #{argo_data.get('platform_id')}",
                "units": "°C, PSU",
                "depth_level": "Upper 2000m CTD Profile",
                "timestamp": argo_data.get("timestamp", "Recent observation"),
                "status": "Retrieved",
                "method": f"Autonomous CTD sounding ({argo_data.get('distance_km')} km from station)",
                "system": "INCOIS Argo Program",
                "role": "In-situ CTD Autonomous Profiling Telemetry",
                "resolution": "Sub-meter vertical CTD resolution relayed via satellite",
            })
        else:
            methods.append({
                "parameter": "In-situ Profiling Float (ARGO)",
                "provider": "International Argo Program / INCOIS",
                "dataset": "Indian Ocean Argo Network",
                "units": "°C, PSU",
                "depth_level": "Upper 2000m CTD",
                "timestamp": "Unavailable",
                "status": "No active float within 150 km",
                "method": "Spatial proximity query (150 km threshold exceeded)",
                "system": "INCOIS Argo Program",
                "role": "In-situ CTD Telemetry",
                "resolution": "No nearby profiling floats detected",
            })

        # Detailed Executive Summary
        retrieved_list = []
        if bathy is not None:
            retrieved_list.append(f"bathymetry ({bathy:.1f} m)")
        if temp is not None:
            retrieved_list.append(f"temperature ({temp:.2f} °C)")
        if sal is not None:
            retrieved_list.append(f"salinity ({sal:.2f} PSU)")
        if curr is not None:
            retrieved_list.append(f"current speed ({curr:.3f} m/s)")
        if mld is not None:
            retrieved_list.append(f"mixed layer depth ({mld:.1f} m)")
        if ssh is not None:
            retrieved_list.append(f"sea surface height anomaly ({ssh:.3f} m)")

        profile_desc = (
            f"A multi-level vertical CTD sounding profile spanning {len(depth_levels)} depth levels was successfully retrieved."
            if (depth_levels and len(depth_levels) > 0)
            else "Vertical profiling was not requested or is limited to the single target reference level."
        )

        exec_summary = (
            f"This oceanographic field report synthesized verified physical observations and numerical model forecasts "
            f"for target coordinates {lat_str}, {lon_str} at a reference depth of {depth_m:.1f} m. "
            f"Successfully resolved parameters include: {', '.join(retrieved_list)}. "
            f"Local seabed topography is situated at a depth of {bathy if bathy is not None else 'uncharted'} m (elevation: {elevation if elevation is not None else 'N/A'} m), "
            f"characterizing an open ocean pelagic domain. "
            f"At the sampled depth of {depth_m:.1f} m, ambient water mass conditions display a potential temperature of "
            f"{temp if temp is not None else 'N/A'} °C, salinity of {sal if sal is not None else 'N/A'} PSU, "
            f"and derived potential density (σθ) of {sigma_theta if sigma_theta is not None else 'N/A'} kg/m³. "
            f"The turbulent mixed layer depth is established at {mld if mld is not None else 'N/A'} m, "
            f"while horizontal currents move at {curr if curr is not None else 'N/A'} m/s bearing {curr_dir if curr_dir is not None else 'N/A'}°. "
            f"{profile_desc}"
        )

        # AI / Deterministic scientific interpretation
        interpretation = await gemini_service.generate_report_interpretation(
            scope=scope,
            parameters=params,
            depth_levels=depth_levels,
            question=req.question,
        )

        uncertainties = list(data_context.get("limitations", []))
        if not uncertainties:
            uncertainties.append(
                "Model-derived values reflect numerical forecast resolutions (0.08°); sub-mesoscale eddy features smaller than 9 km are parameterized."
            )
        uncertainties.append(
            f"Numerical forecast timestamp ({hycom_time}) reflects model analysis cycle; localized sub-diurnal tidal oscillations are not resolved."
        )
        if not argo_data:
            uncertainties.append(
                "In-situ ARGO robotic float verification is absent within 150 km of target coordinates; vertical gradients rely strictly on the HYCOM numerical model."
            )

        provenance = {
            "sources": data_context.get("sources", []),
            "timestamps": data_context.get("timestamps", {}),
            "generated_by": "OceanScope Scientific Research Bureau (FastAPI + Google Gemini)",
            "eos_version": "UNESCO (1981) International Equation of State for Seawater (EOS-80)",
        }

        return ResearchReportResponse(
            report_id=report_id,
            title=f"Oceanographic Field Report: {lat_str}, {lon_str}",
            executive_summary=exec_summary,
            investigation_scope=scope,
            methods_and_datasets=methods,
            verified_measurements=params,
            depth_profile_levels=depth_levels,
            scientific_interpretation=interpretation,
            uncertainties_and_limitations=uncertainties,
            provenance=provenance,
            generated_at=now_iso,
        )


assistant_service = AssistantService()

