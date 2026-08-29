"""
Ocean Risk & Disaster Decision-Support Evaluation Service
Computes transparent, rule-based risk assessments from real oceanographic parameters.
"""

import math
import logging
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime

from app.core.risk_config import (
    RISK_LOW,
    RISK_MODERATE,
    RISK_HIGH,
    RISK_CRITICAL,
    RISK_LEVEL_ORDER,
    RISK_THRESHOLDS,
    DISCLAIMER_TEXT,
)
from app.schemas.risk_schemas import (
    RiskFactorDetail,
    LocationRiskResponse,
    RegionalRiskHotspot,
)
from app.services.hycom_service import hycom_service

logger = logging.getLogger("oceanscope.risk_service")


class OceanRiskService:
    @staticmethod
    def _evaluate_threshold(var_key: str, value: Optional[float]) -> Tuple[str, str, str]:
        """
        Evaluate a single numerical physical value against transparent configuration thresholds.
        Returns: (risk_level, threshold_string, description)
        """
        if value is None or math.isnan(value):
            return RISK_LOW, "N/A (Variable not in dataset)", "Parameter unavailable in active dataset"

        cfg = RISK_THRESHOLDS.get(var_key, {})
        thresholds = cfg.get("thresholds", {})

        # Rule evaluation per variable type
        if var_key == "current_speed":
            if value >= 1.40:
                return RISK_CRITICAL, ">= 1.40 m/s (CRITICAL)", "Severe current velocity indicating high shear hazards"
            elif value >= 0.90:
                return RISK_HIGH, "0.90 - 1.40 m/s (HIGH)", "Elevated current speed presenting operational navigation risks"
            elif value >= 0.50:
                return RISK_MODERATE, "0.50 - 0.90 m/s (MODERATE)", "Moderate ocean current flow"
            else:
                return RISK_LOW, "< 0.50 m/s (LOW)", "Normal baseline ocean current velocity"

        elif var_key == "sst_anomaly":
            if value >= 2.80:
                return RISK_CRITICAL, ">= +2.80 °C (CRITICAL)", "Extreme Category IV Marine Heatwave condition"
            elif value >= 1.80:
                return RISK_HIGH, "+1.80 - +2.80 °C (HIGH)", "Strong Category II-III Marine Heatwave anomaly"
            elif value >= 1.00:
                return RISK_MODERATE, "+1.00 - +1.80 °C (MODERATE)", "Moderate thermal anomaly above baseline"
            else:
                return RISK_LOW, "< +1.00 °C (LOW)", "Thermal conditions within normal baseline variability"

        elif var_key == "ssh":
            if value >= 0.60:
                return RISK_CRITICAL, ">= 0.60 m (CRITICAL)", "Extreme sea surface height anomaly (storm surge hazard)"
            elif value >= 0.35:
                return RISK_HIGH, "0.35 - 0.60 m (HIGH)", "Significant sea surface elevation above mean sea level"
            elif value >= 0.15:
                return RISK_MODERATE, "0.15 - 0.35 m (MODERATE)", "Moderate dynamic sea level variation"
            else:
                return RISK_LOW, "< 0.15 m (LOW)", "Normal sea surface height"

        elif var_key == "tchp":
            if value >= 110.0:
                return RISK_CRITICAL, ">= 110.0 kJ/cm² (CRITICAL)", "Extremely high ocean heat content supporting rapid cyclone intensification"
            elif value >= 80.0:
                return RISK_HIGH, "80.0 - 110.0 kJ/cm² (HIGH)", "High tropical cyclone heat potential favoring cyclone maintenance"
            elif value >= 50.0:
                return RISK_MODERATE, "50.0 - 80.0 kJ/cm² (MODERATE)", "Moderate thermal energy pool"
            else:
                return RISK_LOW, "< 50.0 kJ/cm² (LOW)", "Insufficient upper-ocean thermal energy for cyclone intensification"

        elif var_key == "mld":
            # Note: For MLD, smaller depth = high stratification / risk
            if value <= 10.0:
                return RISK_CRITICAL, "< 10.0 m (CRITICAL)", "Severe shoaling of mixed layer with strong stratification"
            elif value <= 20.0:
                return RISK_HIGH, "10.0 - 20.0 m (HIGH)", "Shallow mixed layer depth with constrained heat dispersion"
            elif value <= 30.0:
                return RISK_MODERATE, "20.0 - 30.0 m (MODERATE)", "Moderate mixed layer thickness"
            else:
                return RISK_LOW, "> 30.0 m (LOW)", "Well-mixed surface layer promoting thermal dissipation"

        return RISK_LOW, "Default Baseline", "Normal conditions"

    def evaluate_location_risk(
        self,
        latitude: float,
        longitude: float,
        depth: float = 0.0,
        time_str: Optional[str] = None,
        is_demo: bool = False,
    ) -> LocationRiskResponse:
        """
        Evaluate full multi-parameter ocean risk for an arbitrary coordinate.
        Extracts real values from INCOIS HYCOM model datasets when available.
        """
        factors: List[RiskFactorDetail] = []
        source_name = "Local Demo Dataset" if is_demo else "INCOIS HYCOM"
        eval_time = time_str or datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        if is_demo:
            # Demo mode transparent mock factors
            mock_values = {
                "current_speed": 1.15,
                "sst_anomaly": 2.10,
                "ssh": 0.42,
                "tchp": 88.5,
                "mld": 16.0,
            }
            for k, val in mock_values.items():
                cfg = RISK_THRESHOLDS[k]
                r_level, r_thresh, r_desc = self._evaluate_threshold(k, val)
                factors.append(
                    RiskFactorDetail(
                        name=cfg["name"],
                        variable_key=k,
                        value=val,
                        unit=cfg["unit"],
                        risk_level=r_level,
                        threshold_used=r_thresh,
                        is_available=True,
                        description=r_desc,
                    )
                )
        else:
            # LIVE Mode: Ingest genuine values from INCOIS HYCOM NetCDF
            meta = hycom_service.get_metadata()
            mapped = meta.mapped_variables if meta else {}
            if meta and meta.time_range and not time_str:
                eval_time = meta.time_range[0]

            # 1. Current Speed
            has_uv = "current_u" in mapped and "current_v" in mapped
            if has_uv:
                try:
                    c_vec = hycom_service.get_current(latitude, longitude, depth, eval_time)
                    speed_val = round(c_vec.speed, 3)
                    r_level, r_thresh, r_desc = self._evaluate_threshold("current_speed", speed_val)
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["current_speed"]["name"],
                            variable_key="current_speed",
                            value=speed_val,
                            unit="m/s",
                            risk_level=r_level,
                            threshold_used=r_thresh,
                            is_available=True,
                            description=r_desc,
                        )
                    )
                except Exception as e:
                    logger.warning(f"Error reading current speed: {e}")
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["current_speed"]["name"],
                            variable_key="current_speed",
                            value=None,
                            unit="m/s",
                            risk_level=RISK_LOW,
                            threshold_used="N/A",
                            is_available=False,
                            description="Could not extract current speed at this coordinate",
                        )
                    )
            else:
                factors.append(
                    RiskFactorDetail(
                        name=RISK_THRESHOLDS["current_speed"]["name"],
                        variable_key="current_speed",
                        value=None,
                        unit="m/s",
                        risk_level=RISK_LOW,
                        threshold_used="N/A",
                        is_available=False,
                        description="Current velocity fields (UVEL/VVEL) not present in dataset",
                    )
                )

            # 2. SST Anomaly (Computed from real Temperature vs 28.0°C climatological baseline)
            if "temperature" in mapped:
                try:
                    pt_temp = hycom_service.get_point(latitude, longitude, depth=0.0, variable="temperature", time_str=eval_time)
                    # Baseline calculation: deviation from tropical baseline 28.0°C
                    sst_anomaly_val = round(pt_temp.value - 28.0, 2)
                    r_level, r_thresh, r_desc = self._evaluate_threshold("sst_anomaly", sst_anomaly_val)
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["sst_anomaly"]["name"],
                            variable_key="sst_anomaly",
                            value=sst_anomaly_val,
                            unit="°C",
                            risk_level=r_level,
                            threshold_used=r_thresh,
                            is_available=True,
                            description=f"Raw SST {pt_temp.value:.2f}°C relative to 28.00°C climatology ({r_desc})",
                        )
                    )
                except Exception as e:
                    logger.warning(f"Error reading temperature for SST anomaly: {e}")
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["sst_anomaly"]["name"],
                            variable_key="sst_anomaly",
                            value=None,
                            unit="°C",
                            risk_level=RISK_LOW,
                            threshold_used="N/A",
                            is_available=False,
                            description="Temperature variable unavailable at coordinate",
                        )
                    )
            else:
                factors.append(
                    RiskFactorDetail(
                        name=RISK_THRESHOLDS["sst_anomaly"]["name"],
                        variable_key="sst_anomaly",
                        value=None,
                        unit="°C",
                        risk_level=RISK_LOW,
                        threshold_used="N/A",
                        is_available=False,
                        description="Temperature field not present in dataset",
                    )
                )

            # 3. Sea Surface Height (SSH)
            if "ssh" in mapped:
                try:
                    pt_ssh = hycom_service.get_point(latitude, longitude, depth=0.0, variable="ssh", time_str=eval_time)
                    ssh_val = round(pt_ssh.value, 3)
                    r_level, r_thresh, r_desc = self._evaluate_threshold("ssh", ssh_val)
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["ssh"]["name"],
                            variable_key="ssh",
                            value=ssh_val,
                            unit="m",
                            risk_level=r_level,
                            threshold_used=r_thresh,
                            is_available=True,
                            description=r_desc,
                        )
                    )
                except Exception as e:
                    logger.warning(f"Error reading SSH: {e}")
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["ssh"]["name"],
                            variable_key="ssh",
                            value=None,
                            unit="m",
                            risk_level=RISK_LOW,
                            threshold_used="N/A",
                            is_available=False,
                            description="SSH point query failed",
                        )
                    )
            else:
                factors.append(
                    RiskFactorDetail(
                        name=RISK_THRESHOLDS["ssh"]["name"],
                        variable_key="ssh",
                        value=None,
                        unit="m",
                        risk_level=RISK_LOW,
                        threshold_used="N/A",
                        is_available=False,
                        description="Sea Surface Height variable not present in dataset",
                    )
                )

            # 4. Tropical Cyclone Heat Potential (TCHP)
            if "tchp" in mapped:
                try:
                    pt_tchp = hycom_service.get_point(latitude, longitude, depth=0.0, variable="tchp", time_str=eval_time)
                    tchp_val = round(pt_tchp.value, 1)
                    r_level, r_thresh, r_desc = self._evaluate_threshold("tchp", tchp_val)
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["tchp"]["name"],
                            variable_key="tchp",
                            value=tchp_val,
                            unit="kJ/cm²",
                            risk_level=r_level,
                            threshold_used=r_thresh,
                            is_available=True,
                            description=r_desc,
                        )
                    )
                except Exception as e:
                    logger.warning(f"Error reading TCHP: {e}")
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["tchp"]["name"],
                            variable_key="tchp",
                            value=None,
                            unit="kJ/cm²",
                            risk_level=RISK_LOW,
                            threshold_used="N/A",
                            is_available=False,
                            description="TCHP point query failed",
                        )
                    )
            else:
                factors.append(
                    RiskFactorDetail(
                        name=RISK_THRESHOLDS["tchp"]["name"],
                        variable_key="tchp",
                        value=None,
                        unit="kJ/cm²",
                        risk_level=RISK_LOW,
                        threshold_used="N/A",
                        is_available=False,
                        description="TCHP variable not present in dataset",
                    )
                )

            # 5. Mixed Layer Depth (MLD)
            if "mld" in mapped:
                try:
                    pt_mld = hycom_service.get_point(latitude, longitude, depth=0.0, variable="mld", time_str=eval_time)
                    mld_val = round(pt_mld.value, 1)
                    r_level, r_thresh, r_desc = self._evaluate_threshold("mld", mld_val)
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["mld"]["name"],
                            variable_key="mld",
                            value=mld_val,
                            unit="m",
                            risk_level=r_level,
                            threshold_used=r_thresh,
                            is_available=True,
                            description=r_desc,
                        )
                    )
                except Exception as e:
                    logger.warning(f"Error reading MLD: {e}")
                    factors.append(
                        RiskFactorDetail(
                            name=RISK_THRESHOLDS["mld"]["name"],
                            variable_key="mld",
                            value=None,
                            unit="m",
                            risk_level=RISK_LOW,
                            threshold_used="N/A",
                            is_available=False,
                            description="MLD point query failed",
                        )
                    )
            else:
                factors.append(
                    RiskFactorDetail(
                        name=RISK_THRESHOLDS["mld"]["name"],
                        variable_key="mld",
                        value=None,
                        unit="m",
                        risk_level=RISK_LOW,
                        threshold_used="N/A",
                        is_available=False,
                        description="Mixed Layer Depth variable not present in dataset",
                    )
                )

        # Determine Overall Risk Level and Primary Contributing Factor
        available_factors = [f for f in factors if f.is_available and f.value is not None]
        if not available_factors:
            overall_risk = RISK_LOW
            primary_factor = factors[0] if factors else None
            why_reason = "No measurable risk parameters active at this location."
        else:
            # Sort by severity tier descending
            sorted_factors = sorted(
                available_factors,
                key=lambda x: RISK_LEVEL_ORDER.get(x.risk_level, 1),
                reverse=True,
            )
            primary_factor = sorted_factors[0]
            overall_risk = primary_factor.risk_level

            if overall_risk == RISK_LOW:
                why_reason = "All available ocean parameters remain within normal baseline demonstration thresholds."
            else:
                why_reason = (
                    f"{primary_factor.name} ({primary_factor.value} {primary_factor.unit}) "
                    f"met configured demonstration threshold ({primary_factor.threshold_used})."
                )

        return LocationRiskResponse(
            latitude=latitude,
            longitude=longitude,
            depth=depth,
            timestamp=eval_time,
            overall_risk=overall_risk,
            contributing_parameter=primary_factor.name if primary_factor else "N/A",
            primary_factor_value=primary_factor.value if primary_factor else None,
            primary_factor_unit=primary_factor.unit if primary_factor else None,
            primary_threshold=primary_factor.threshold_used if primary_factor else "N/A",
            why_reason=why_reason,
            source=source_name,
            is_live_data=not is_demo,
            factors=factors,
            disclaimer=DISCLAIMER_TEXT,
        )

    def get_regional_risk_hotspots(self, is_demo: bool = False) -> List[RegionalRiskHotspot]:
        """
        Produce regional risk hotspot indicators across key zones.
        Evaluates real coordinates using INCOIS HYCOM data in LIVE mode.
        """
        hotspots: List[RegionalRiskHotspot] = []

        # Key geographic monitoring zones in the Indian Ocean domain
        candidate_zones = [
            {
                "id": "risk-bob-01",
                "title": "Northern Bay of Bengal Tropical Heat Pool",
                "category": "CYCLONE_ENERGY",
                "lat": 18.5,
                "lon": 88.5,
                "region_name": "Bay of Bengal",
                "area_km2": 48000.0,
            },
            {
                "id": "risk-as-02",
                "title": "Laccadive Sea Marine Heatwave Anomaly",
                "category": "MARINE_HEATWAVE",
                "lat": 9.2,
                "lon": 75.8,
                "region_name": "Laccadive / Arabian Sea",
                "area_km2": 36500.0,
            },
            {
                "id": "risk-eq-03",
                "title": "Equatorial Jet Current Shear Zone",
                "category": "CURRENT_SHEAR",
                "lat": 0.5,
                "lon": 82.0,
                "region_name": "Equatorial Indian Ocean",
                "area_km2": 55000.0,
            },
            {
                "id": "risk-so-04",
                "title": "Somali Current Coastal Upwelling Boundary",
                "category": "CURRENT_SHEAR",
                "lat": 11.0,
                "lon": 53.0,
                "region_name": "Somali Coast / Western Arabian Sea",
                "area_km2": 42000.0,
            },
        ]

        for z in candidate_zones:
            eval_res = self.evaluate_location_risk(
                latitude=z["lat"],
                longitude=z["lon"],
                depth=0.0,
                is_demo=is_demo,
            )

            hotspots.append(
                RegionalRiskHotspot(
                    id=z["id"],
                    title=z["title"],
                    category=z["category"],
                    risk_level=eval_res.overall_risk,
                    latitude=z["lat"],
                    longitude=z["lon"],
                    region_name=z["region_name"],
                    affected_area_km2=z["area_km2"],
                    detected_at=eval_res.timestamp,
                    contributing_parameter=eval_res.contributing_parameter,
                    actual_value=eval_res.primary_factor_value or 0.0,
                    unit=eval_res.primary_factor_unit or "",
                    threshold_used=eval_res.primary_threshold,
                    source=eval_res.source,
                    why_reason=eval_res.why_reason,
                    is_live_data=not is_demo,
                )
            )

        return hotspots


# Singleton instance
ocean_risk_service = OceanRiskService()
