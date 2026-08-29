"""
OceanScope Scientific Data Quality Control (QC) & Validation Engine
Defines physical parameter thresholds, QC flag evaluations, canonical units, and statistical metrics.
"""

import math
from typing import List, Dict, Optional, Tuple, Any
import numpy as np


class OceanUnits:
    """Centralized Standard Canonical Units across OceanScope."""
    TEMPERATURE = "°C"
    SALINITY = "PSU"
    CURRENT_U = "m/s"
    CURRENT_V = "m/s"
    CURRENT_SPEED = "m/s"
    CURRENT_DIRECTION = "degrees"
    SSH = "m"
    MLD = "m"
    TCHP = "kJ/cm²"
    PRESSURE = "dbar"
    DEPTH = "m"
    DISTANCE = "km"
    TIME_OFFSET = "hours"

    @classmethod
    def get_unit_map(cls) -> Dict[str, str]:
        return {
            "temperature": cls.TEMPERATURE,
            "salinity": cls.SALINITY,
            "current_u": cls.CURRENT_U,
            "current_v": cls.CURRENT_V,
            "current_speed": cls.CURRENT_SPEED,
            "current_direction": cls.CURRENT_DIRECTION,
            "ssh": cls.SSH,
            "mld": cls.MLD,
            "tchp": cls.TCHP,
            "pressure": cls.PRESSURE,
            "depth": cls.DEPTH,
        }


class PhysicalLimits:
    """Physical Oceanographic Feasibility Limits for Indian Ocean & Global Basins."""
    TEMP_MIN = -2.5   # Seawater freezing point under pressure
    TEMP_MAX = 40.0   # Maximum recorded surface water temp in shallow marginal seas
    SALN_MIN = 0.0    # Fresh river runoff boundary
    SALN_MAX = 45.0   # Red Sea / Persian Gulf hypersaline maximum
    DEPTH_MIN = 0.0
    DEPTH_MAX = 6000.0
    SPEED_MIN = 0.0
    SPEED_MAX = 10.0  # Max jet speed (m/s)
    SSH_MIN = -5.0
    SSH_MAX = 5.0
    MLD_MIN = 0.0
    MLD_MAX = 1000.0
    TCHP_MIN = 0.0
    TCHP_MAX = 300.0

    FILL_VALUES = {-999.0, -9999.0, 999.0, 9999.0, 1e20, 1e30, -1e20, -1e30}


class ArgoQCFlags:
    """
    Standard IOC / WMO Argo Quality Control Flag Standards:
    1: Good data
    2: Probably good data
    3: Bad data that are potentially correctable
    4: Bad data (rejected)
    9: Missing value
    """
    GOOD = 1
    PROBABLY_GOOD = 2
    QUESTIONABLE = 3
    BAD = 4
    MISSING = 9

    VALID_FLAGS = {GOOD, PROBABLY_GOOD}


def is_fill_value(val: Optional[float]) -> bool:
    """Check if value is None, NaN, infinite, or a known NetCDF/ASCII fill value."""
    if val is None:
        return True
    try:
        f_val = float(val)
        if math.isnan(f_val) or math.isinf(f_val):
            return True
        if f_val in PhysicalLimits.FILL_VALUES:
            return True
        return False
    except (ValueError, TypeError):
        return True


def validate_temperature(temp: Optional[float], qc_flag: Optional[int] = None) -> Tuple[Optional[float], str]:
    """
    Validate ocean temperature against physical limits and QC flag.
    Returns: (cleaned_value_or_None, qc_status: 'PASSED' | 'FLAGGED' | 'REJECTED')
    """
    if is_fill_value(temp):
        return None, "REJECTED"
    
    val = float(temp)
    if qc_flag is not None and qc_flag not in ArgoQCFlags.VALID_FLAGS:
        return None, "REJECTED"

    if val < PhysicalLimits.TEMP_MIN or val > PhysicalLimits.TEMP_MAX:
        return None, "REJECTED"

    return round(val, 3), "PASSED"


def validate_salinity(saln: Optional[float], qc_flag: Optional[int] = None) -> Tuple[Optional[float], str]:
    """
    Validate ocean practical salinity against physical limits and QC flag.
    Returns: (cleaned_value_or_None, qc_status: 'PASSED' | 'FLAGGED' | 'REJECTED')
    """
    if is_fill_value(saln):
        return None, "REJECTED"

    val = float(saln)
    if qc_flag is not None and qc_flag not in ArgoQCFlags.VALID_FLAGS:
        return None, "REJECTED"

    if val < PhysicalLimits.SALN_MIN or val > PhysicalLimits.SALN_MAX:
        return None, "REJECTED"

    return round(val, 3), "PASSED"


def compute_metrics(diffs: List[float]) -> Tuple[Optional[float], Optional[float], Optional[float]]:
    """
    Calculate Bias (Mean Error), RMSE, and MAE across paired non-null delta differences.
    Strictly excludes NaNs and returns None if sample count is 0.
    """
    valid_diffs = [d for d in diffs if not is_fill_value(d)]
    if not valid_diffs:
        return None, None, None

    arr = np.array(valid_diffs, dtype=np.float64)
    bias = round(float(np.mean(arr)), 4)
    rmse = round(float(np.sqrt(np.mean(np.square(arr)))), 4)
    mae = round(float(np.mean(np.abs(arr))), 4)
    return bias, rmse, mae
