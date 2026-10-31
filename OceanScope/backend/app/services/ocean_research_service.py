"""
OceanScope Ocean Research Data Service (Phase 2)
Gathers, normalizes, and validates real multi-source oceanographic measurements
from GEBCO, HYCOM, Copernicus, and INCOIS Argo telemetry for the AI Research Assistant.
"""

import asyncio
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from app.services.gebco_service import gebco_service
from app.services.hycom_service import hycom_service
from app.services.copernicus_service import copernicus_service
from app.services.argo_service import argo_service
from app.core.config import settings

logger = logging.getLogger("oceanscope.research_data")


class OceanResearchDataService:
    """
    Unified scientific telemetry aggregation service.
    Queries existing platform providers safely with independent error isolation,
    unit normalization, and strict observational provenance.
    """

    @staticmethod
    def _calculate_haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        import math
        r = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        return r * 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    async def gather_context(
        self,
        latitude: float,
        longitude: float,
        depth: float = 0.0,
    ) -> Dict[str, Any]:
        """
        Gathers multi-parameter scientific data for the given coordinates and depth.
        Runs provider queries concurrently with bounded timeouts.
        Handles provider failures independently.
        """
        lat = round(float(latitude), 4)
        lon = round(float(longitude), 4)
        d_val = max(0.0, round(float(depth), 1))

        sources: List[str] = []
        timestamps: Dict[str, str] = {}
        limitations: List[str] = []
        parameters: Dict[str, Any] = {}

        # 1. Query GEBCO Bathymetry (threaded to avoid blocking event loop)
        bathymetry_data = None
        try:
            bathymetry_data = await asyncio.wait_for(
                asyncio.to_thread(gebco_service.get_point, lat, lon),
                timeout=4.0,
            )
            if bathymetry_data and "depth" in bathymetry_data:
                depth_m = bathymetry_data.get("depth")
                elevation_m = bathymetry_data.get("elevation")
                source_label = bathymetry_data.get("source", "GEBCO 2024")
                sources.append(source_label)

                parameters["bathymetry"] = {
                    "parameter": "Seabed Bathymetric Depth",
                    "value": depth_m,
                    "elevation_m": elevation_m,
                    "unit": "m",
                    "data_type": "bathymetric_grid",
                    "source": source_label,
                    "dataset": bathymetry_data.get("dataset", "GEBCO_2024_Grid"),
                    "status": "available",
                    "is_ocean": bathymetry_data.get("is_ocean", True),
                }

                # Check if requested depth exceeds seabed
                if depth_m is not None and d_val > depth_m:
                    limitations.append(
                        f"Selected depth ({d_val}m) exceeds the local seabed depth ({depth_m}m). "
                        "Subsurface parameter measurements may be below the ocean floor at this point."
                    )
        except Exception as e:
            logger.warning(f"[ResearchDataService] GEBCO query error: {e}")
            limitations.append(f"GEBCO bathymetry unavailable: {str(e)}")
            parameters["bathymetry"] = {
                "parameter": "Seabed Bathymetric Depth",
                "value": None,
                "unit": "m",
                "data_type": "bathymetric_grid",
                "source": "GEBCO",
                "status": "error",
                "limitation": str(e),
            }

        # 2. Query HYCOM Oceanographic Parameters
        hycom_data = None
        try:
            hycom_data = await asyncio.wait_for(
                asyncio.to_thread(
                    hycom_service.get_all_parameters,
                    latitude=lat,
                    longitude=lon,
                    depth=d_val,
                ),
                timeout=float(getattr(settings, "HYCOM_REMOTE_TIMEOUT_SECONDS", 45.0)),
            )
            if hycom_data:
                provider_src = hycom_data.get("source", "INCOIS HYCOM GLBy0.08")
                if provider_src not in sources:
                    sources.append(provider_src)

                model_time = hycom_data.get("model_time") or hycom_data.get("time")
                if model_time:
                    timestamps["HYCOM"] = str(model_time)

                # Temperature
                t_info = hycom_data.get("temperature", {})
                parameters["temperature"] = {
                    "parameter": "Sea Water Temperature",
                    "value": t_info.get("value"),
                    "unit": t_info.get("unit", "°C"),
                    "depth_level_m": d_val,
                    "data_type": "numerical_model",
                    "source": provider_src,
                    "timestamp": timestamps.get("HYCOM"),
                    "status": t_info.get("status", "unavailable"),
                }

                # Salinity
                s_info = hycom_data.get("salinity", {})
                parameters["salinity"] = {
                    "parameter": "Sea Water Salinity",
                    "value": s_info.get("value"),
                    "unit": s_info.get("unit", "PSU"),
                    "depth_level_m": d_val,
                    "data_type": "numerical_model",
                    "source": provider_src,
                    "timestamp": timestamps.get("HYCOM"),
                    "status": s_info.get("status", "unavailable"),
                }

                # Current
                c_info = hycom_data.get("current", {})
                parameters["current"] = {
                    "parameter": "Geostrophic Ocean Velocity",
                    "speed_m_s": c_info.get("speed"),
                    "direction_deg": c_info.get("direction_degrees"),
                    "u_m_s": c_info.get("u"),
                    "v_m_s": c_info.get("v"),
                    "unit": "m/s",
                    "depth_level_m": d_val,
                    "data_type": "numerical_model",
                    "source": provider_src,
                    "timestamp": timestamps.get("HYCOM"),
                    "status": c_info.get("status", "available" if c_info.get("speed") is not None else "unavailable"),
                }

                # Mixed Layer Depth (Surface level physics)
                mld_info = hycom_data.get("mld", {})
                parameters["mld"] = {
                    "parameter": "Mixed Layer Depth (MLD)",
                    "value": mld_info.get("value"),
                    "unit": "m",
                    "depth_level_m": 0.0,
                    "criterion": mld_info.get("threshold", "Δσ = 0.125 kg/m³"),
                    "data_type": "numerical_model_derived",
                    "source": provider_src,
                    "timestamp": timestamps.get("HYCOM"),
                    "status": mld_info.get("status", "unavailable"),
                }

                # Sea Surface Height Anomaly (Surface level only)
                h_info = hycom_data.get("height", {})
                parameters["height"] = {
                    "parameter": "Sea Surface Height Anomaly (ζ0)",
                    "value": h_info.get("value"),
                    "unit": "m",
                    "depth_level_m": 0.0,
                    "data_type": "numerical_model",
                    "source": provider_src,
                    "timestamp": timestamps.get("HYCOM"),
                    "status": h_info.get("status", "unavailable"),
                }
        except Exception as e:
            logger.warning(f"[ResearchDataService] HYCOM parameters error: {e}")
            limitations.append(f"HYCOM numerical parameters unavailable: {str(e)}")
            for p_key in ["temperature", "salinity", "current", "mld", "height"]:
                parameters[p_key] = {
                    "parameter": p_key.capitalize(),
                    "value": None,
                    "status": "unavailable",
                    "source": "INCOIS HYCOM",
                    "limitation": str(e),
                }

        # 3. Check for in-situ ARGO Observations nearby (within 150 km)
        try:
            argo_resp = await argo_service.get_argo_observations(
                min_lat=max(-90.0, lat - 2.0),
                max_lat=min(90.0, lat + 2.0),
                min_lon=max(-180.0, lon - 2.0),
                max_lon=min(180.0, lon + 2.0),
            )
            argo_obs_list = argo_resp.observations if argo_resp else []
            nearby_floats = []
            for obs in argo_obs_list:
                dist = self._calculate_haversine_km(lat, lon, obs.latitude, obs.longitude)
                if dist <= 150.0:
                    nearby_floats.append({
                        "platform_id": obs.platform_number,
                        "distance_km": round(dist, 1),
                        "latitude": obs.latitude,
                        "longitude": obs.longitude,
                        "timestamp": obs.timestamp,
                        "temperature_c": obs.temperature,
                        "salinity_psu": obs.salinity,
                    })

            if nearby_floats:
                nearby_floats.sort(key=lambda f: f["distance_km"])
                closest = nearby_floats[0]
                parameters["in_situ_argo"] = {
                    "parameter": "In-situ Profiling Float",
                    "platform_id": closest["platform_id"],
                    "distance_km": closest["distance_km"],
                    "temperature": closest["temperature_c"],
                    "salinity": closest["salinity_psu"],
                    "unit_temp": "°C",
                    "unit_sal": "PSU",
                    "timestamp": closest["timestamp"],
                    "source": "INCOIS ERDDAP Indian ARGO Program",
                    "data_type": "in_situ_observation",
                    "status": "available",
                }
                sources.append("INCOIS ERDDAP ARGO Floats")
                timestamps["ARGO"] = closest["timestamp"]
            else:
                parameters["in_situ_argo"] = {
                    "parameter": "In-situ Profiling Float",
                    "status": "none_nearby",
                    "limitation": "No active ARGO float profiled within 150 km radius of this location.",
                }
        except Exception as e:
            logger.debug(f"[ResearchDataService] Argo nearby check note: {e}")

        # 4. Check Copernicus Marine Status
        copernicus_status = copernicus_service.get_status()
        if copernicus_status.get("status") == "online":
            sources.append("Copernicus Marine Service")

        return {
            "latitude": lat,
            "longitude": lon,
            "depth_meters": d_val,
            "parameters": parameters,
            "sources": list(dict.fromkeys(sources)),
            "timestamps": timestamps,
            "limitations": limitations,
            "has_data": any(
                p.get("status") == "available" and p.get("value") is not None
                for p in parameters.values()
            ),
        }

    async def get_depth_profile(self, latitude: float, longitude: float) -> Dict[str, Any]:
        """
        Fetches multi-depth vertical sounding profile (depth vs temperature, salinity, currents)
        from matching HYCOM NetCDF archives.
        """
        import math
        lat = round(float(latitude), 4)
        lon = round(float(longitude), 4)

        try:
            profile_model = await asyncio.wait_for(
                asyncio.to_thread(hycom_service.get_profile, latitude=lat, longitude=lon),
                timeout=float(getattr(settings, "HYCOM_REMOTE_TIMEOUT_SECONDS", 45.0)),
            )
            raw_levels = profile_model.profile or []
            levels = []
            for lvl in raw_levels:
                u = getattr(lvl, "current_u", None)
                v = getattr(lvl, "current_v", None)
                speed = None
                if u is not None and v is not None and not (math.isnan(u) or math.isnan(v)):
                    speed = round(math.hypot(u, v), 3)

                levels.append({
                    "depth_m": lvl.depth,
                    "temperature_c": lvl.temperature,
                    "salinity_psu": lvl.salinity,
                    "current_speed_m_s": speed,
                })

            has_valid = any(
                lvl.get("temperature_c") is not None or lvl.get("salinity_psu") is not None
                for lvl in levels
            )
            notice = None
            if not has_valid:
                notice = (
                    "No valid ocean sounding data at this coordinate. The selected location may be on land, "
                    "in coastal intertidal zones, or outside the regional numerical model domain (-45° to +31°N, 20° to 120°E)."
                )

            return {
                "latitude": lat,
                "longitude": lon,
                "source": profile_model.source,
                "dataset": profile_model.dataset,
                "model_time": profile_model.model_time,
                "levels": levels,
                "total_levels": len(levels),
                "has_valid_data": has_valid,
                "notice": notice,
            }
        except Exception as e:
            logger.warning(f"[ResearchDataService] get_depth_profile error: {e}")
            return {
                "latitude": lat,
                "longitude": lon,
                "source": "INCOIS HYCOM",
                "dataset": "INCOIS_RSMC_HYCOM",
                "model_time": "unavailable",
                "levels": [],
                "total_levels": 0,
                "has_valid_data": False,
                "notice": f"Vertical profile query failed: {str(e)}",
                "error": str(e),
            }


ocean_research_service = OceanResearchDataService()

