"""
Transparent Ocean Risk & Disaster Decision-Support Thresholds Configuration
All thresholds and rules are centralized here for complete auditability.
"""

from typing import Dict, Any

# Risk Level Classification Constants
RISK_LOW = "LOW"
RISK_MODERATE = "MODERATE"
RISK_HIGH = "HIGH"
RISK_CRITICAL = "CRITICAL"

RISK_LEVEL_ORDER = {
    RISK_LOW: 1,
    RISK_MODERATE: 2,
    RISK_HIGH: 3,
    RISK_CRITICAL: 4,
}

# Rule-Based Threshold Definitions
RISK_THRESHOLDS: Dict[str, Dict[str, Any]] = {
    "current_speed": {
        "name": "Ocean Current Speed",
        "variable_key": "current_speed",
        "unit": "m/s",
        "description": "Surface/subsurface ocean current velocity magnitude sqrt(u^2 + v^2)",
        "thresholds": {
            RISK_LOW: {"max": 0.50, "label": "< 0.50 m/s"},
            RISK_MODERATE: {"min": 0.50, "max": 0.90, "label": "0.50 - 0.90 m/s"},
            RISK_HIGH: {"min": 0.90, "max": 1.40, "label": "0.90 - 1.40 m/s"},
            RISK_CRITICAL: {"min": 1.40, "label": ">= 1.40 m/s"},
        },
    },
    "sst_anomaly": {
        "name": "Sea Surface Temperature Anomaly",
        "variable_key": "sst_anomaly",
        "unit": "°C",
        "description": "Thermal deviation from climatological baseline (marine heatwave indicator)",
        "thresholds": {
            RISK_LOW: {"max": 1.00, "label": "< +1.00 °C"},
            RISK_MODERATE: {"min": 1.00, "max": 1.80, "label": "+1.00 - +1.80 °C"},
            RISK_HIGH: {"min": 1.80, "max": 2.80, "label": "+1.80 - +2.80 °C"},
            RISK_CRITICAL: {"min": 2.80, "label": ">= +2.80 °C"},
        },
    },
    "ssh": {
        "name": "Sea Surface Height (SSH)",
        "variable_key": "ssh",
        "unit": "m",
        "description": "Sea surface dynamic topography anomaly / storm surge elevation indicator",
        "thresholds": {
            RISK_LOW: {"max": 0.15, "label": "< 0.15 m"},
            RISK_MODERATE: {"min": 0.15, "max": 0.35, "label": "0.15 - 0.35 m"},
            RISK_HIGH: {"min": 0.35, "max": 0.60, "label": "0.35 - 0.60 m"},
            RISK_CRITICAL: {"min": 0.60, "label": ">= 0.60 m"},
        },
    },
    "tchp": {
        "name": "Tropical Cyclone Heat Potential (TCHP)",
        "variable_key": "tchp",
        "unit": "kJ/cm²",
        "description": "Upper ocean integrated thermal energy above 26°C isotherm",
        "thresholds": {
            RISK_LOW: {"max": 50.0, "label": "< 50.0 kJ/cm²"},
            RISK_MODERATE: {"min": 50.0, "max": 80.0, "label": "50.0 - 80.0 kJ/cm²"},
            RISK_HIGH: {"min": 80.0, "max": 110.0, "label": "80.0 - 110.0 kJ/cm²"},
            RISK_CRITICAL: {"min": 110.0, "label": ">= 110.0 kJ/cm²"},
        },
    },
    "mld": {
        "name": "Mixed Layer Depth (MLD)",
        "variable_key": "mld",
        "unit": "m",
        "description": "Upper ocean quasi-homogeneous density layer thickness",
        "thresholds": {
            RISK_LOW: {"min": 30.0, "label": "> 30.0 m (Well Mixed)"},
            RISK_MODERATE: {"min": 20.0, "max": 30.0, "label": "20.0 - 30.0 m"},
            RISK_HIGH: {"min": 10.0, "max": 20.0, "label": "10.0 - 20.0 m (Shoaled)"},
            RISK_CRITICAL: {"max": 10.0, "label": "< 10.0 m (Severe Stratification)"},
        },
    },
}

DISCLAIMER_TEXT = (
    "OceanScope risk indicators are demonstration decision-support visualizations "
    "and are not official warnings or certified forecasts."
)
