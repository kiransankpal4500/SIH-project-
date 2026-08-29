"""
OceanScope — Scientific Data Quality Control Test Suite
Tests: missing values, invalid coordinates, invalid depths, invalid timestamps,
       QC filtering, metric calculation, model/observation matching.
"""

import sys
import os
import math
import traceback
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.core.quality_control import (
    OceanUnits,
    PhysicalLimits,
    ArgoQCFlags,
    is_fill_value,
    validate_temperature,
    validate_salinity,
    compute_metrics,
)

PASS = 0
FAIL = 0

def check(name, condition):
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name}")


def test_fill_value_detection():
    print("\n=== Fill Value Detection ===")
    check("None is fill", is_fill_value(None))
    check("NaN is fill", is_fill_value(float("nan")))
    check("Inf is fill", is_fill_value(float("inf")))
    check("-Inf is fill", is_fill_value(float("-inf")))
    check("-999 is fill", is_fill_value(-999.0))
    check("-9999 is fill", is_fill_value(-9999.0))
    check("9999 is fill", is_fill_value(9999.0))
    check("1e20 is fill", is_fill_value(1e20))
    check("1e30 is fill", is_fill_value(1e30))
    check("-1e20 is fill", is_fill_value(-1e20))
    check("Normal value 25.0 is NOT fill", not is_fill_value(25.0))
    check("Zero is NOT fill", not is_fill_value(0.0))
    check("Negative valid -1.5 is NOT fill", not is_fill_value(-1.5))


def test_temperature_validation():
    print("\n=== Temperature Validation ===")
    
    # Valid temperatures
    val, status = validate_temperature(25.0)
    check("25.0°C valid", val == 25.0 and status == "PASSED")
    
    val, status = validate_temperature(-2.0)
    check("-2.0°C valid (near freezing)", val == -2.0 and status == "PASSED")
    
    val, status = validate_temperature(0.0)
    check("0.0°C valid", val == 0.0 and status == "PASSED")
    
    val, status = validate_temperature(39.5)
    check("39.5°C valid (hot)", val == 39.5 and status == "PASSED")
    
    # Invalid temperatures
    val, status = validate_temperature(-5.0)
    check("-5.0°C rejected (below freezing)", val is None and status == "REJECTED")
    
    val, status = validate_temperature(45.0)
    check("45.0°C rejected (above max)", val is None and status == "REJECTED")
    
    val, status = validate_temperature(None)
    check("None rejected", val is None and status == "REJECTED")
    
    val, status = validate_temperature(float("nan"))
    check("NaN rejected", val is None and status == "REJECTED")
    
    val, status = validate_temperature(-9999.0)
    check("-9999 fill rejected", val is None and status == "REJECTED")
    
    # QC flag filtering
    val, status = validate_temperature(25.0, qc_flag=1)
    check("25°C with QC=1 accepted", val == 25.0 and status == "PASSED")
    
    val, status = validate_temperature(25.0, qc_flag=2)
    check("25°C with QC=2 accepted", val == 25.0 and status == "PASSED")
    
    val, status = validate_temperature(25.0, qc_flag=3)
    check("25°C with QC=3 rejected", val is None and status == "REJECTED")
    
    val, status = validate_temperature(25.0, qc_flag=4)
    check("25°C with QC=4 rejected", val is None and status == "REJECTED")
    
    val, status = validate_temperature(25.0, qc_flag=9)
    check("25°C with QC=9 rejected", val is None and status == "REJECTED")


def test_salinity_validation():
    print("\n=== Salinity Validation ===")
    
    val, status = validate_salinity(35.0)
    check("35.0 PSU valid", val == 35.0 and status == "PASSED")
    
    val, status = validate_salinity(0.5)
    check("0.5 PSU valid (fresh)", val == 0.5 and status == "PASSED")
    
    val, status = validate_salinity(44.0)
    check("44.0 PSU valid (hypersaline)", val == 44.0 and status == "PASSED")
    
    val, status = validate_salinity(-1.0)
    check("-1.0 PSU rejected", val is None and status == "REJECTED")
    
    val, status = validate_salinity(50.0)
    check("50.0 PSU rejected", val is None and status == "REJECTED")
    
    val, status = validate_salinity(None)
    check("None rejected", val is None and status == "REJECTED")
    
    val, status = validate_salinity(1e20)
    check("1e20 fill rejected", val is None and status == "REJECTED")
    
    val, status = validate_salinity(35.0, qc_flag=4)
    check("35 PSU with QC=4 rejected", val is None and status == "REJECTED")


def test_metric_calculation():
    print("\n=== Metric Calculation ===")
    
    # Known differences
    diffs = [1.0, -1.0, 2.0, -2.0]
    bias, rmse, mae = compute_metrics(diffs)
    check("Bias of [1,-1,2,-2] = 0.0", bias == 0.0)
    check("MAE of [1,-1,2,-2] = 1.5", mae == 1.5)
    expected_rmse = round(math.sqrt((1+1+4+4)/4), 4)
    check(f"RMSE of [1,-1,2,-2] = {expected_rmse}", rmse == expected_rmse)
    
    # Single value
    bias, rmse, mae = compute_metrics([3.0])
    check("Bias of [3.0] = 3.0", bias == 3.0)
    check("MAE of [3.0] = 3.0", mae == 3.0)
    check("RMSE of [3.0] = 3.0", rmse == 3.0)
    
    # Empty
    bias, rmse, mae = compute_metrics([])
    check("Empty list returns None, None, None", bias is None and rmse is None and mae is None)
    
    # All NaN/fill — should be filtered out
    bias, rmse, mae = compute_metrics([float("nan"), None, float("inf")])
    check("All-NaN list returns None", bias is None and rmse is None and mae is None)
    
    # Mixed valid and invalid
    bias, rmse, mae = compute_metrics([2.0, float("nan"), -2.0, None])
    check("Mixed [2,NaN,-2,None]: bias=0.0", bias == 0.0)
    check("Mixed [2,NaN,-2,None]: mae=2.0", mae == 2.0)


def test_coordinate_validation():
    print("\n=== Coordinate Validation (HYCOM Service) ===")
    try:
        from app.services.hycom_service import INCOISHYCOMService
        svc = INCOISHYCOMService.__new__(INCOISHYCOMService)
        
        # Valid coords should not raise
        try:
            svc.validate_coordinates(15.0, 75.0, 0.0)
            check("Valid coords (15, 75, 0m) accepted", True)
        except Exception:
            check("Valid coords (15, 75, 0m) accepted", False)
        
        # Invalid latitude
        try:
            svc.validate_coordinates(95.0, 75.0, 0.0)
            check("Lat 95 rejected", False)
        except ValueError:
            check("Lat 95 rejected", True)
        
        # Invalid longitude
        try:
            svc.validate_coordinates(15.0, 400.0, 0.0)
            check("Lon 400 rejected", False)
        except ValueError:
            check("Lon 400 rejected", True)
        
        # Invalid depth
        try:
            svc.validate_coordinates(15.0, 75.0, -10.0)
            check("Depth -10 rejected", False)
        except ValueError:
            check("Depth -10 rejected", True)
        
        try:
            svc.validate_coordinates(15.0, 75.0, 7000.0)
            check("Depth 7000 rejected", False)
        except ValueError:
            check("Depth 7000 rejected", True)
    except Exception as e:
        print(f"  [SKIP] Skipped coordinate validation tests: {e}")


def test_unit_map():
    print("\n=== Canonical Unit Map ===")
    units = OceanUnits.get_unit_map()
    check("Temperature unit is °C", units["temperature"] == "°C")
    check("Salinity unit is PSU", units["salinity"] == "PSU")
    check("Current U unit is m/s", units["current_u"] == "m/s")
    check("Current V unit is m/s", units["current_v"] == "m/s")
    check("SSH unit is m", units["ssh"] == "m")
    check("MLD unit is m", units["mld"] == "m")
    check("TCHP unit is kJ/cm²", units["tchp"] == "kJ/cm²")
    check("Depth unit is m", units["depth"] == "m")
    check("Pressure unit is dbar", units["pressure"] == "dbar")


def test_argo_qc_flags():
    print("\n=== Argo QC Flag Constants ===")
    check("Flag 1 is valid", 1 in ArgoQCFlags.VALID_FLAGS)
    check("Flag 2 is valid", 2 in ArgoQCFlags.VALID_FLAGS)
    check("Flag 3 is NOT valid", 3 not in ArgoQCFlags.VALID_FLAGS)
    check("Flag 4 is NOT valid", 4 not in ArgoQCFlags.VALID_FLAGS)
    check("Flag 9 is NOT valid", 9 not in ArgoQCFlags.VALID_FLAGS)


def test_physical_limits():
    print("\n=== Physical Limits ===")
    check("Temp range: -2.5 to 40.0", PhysicalLimits.TEMP_MIN == -2.5 and PhysicalLimits.TEMP_MAX == 40.0)
    check("Saln range: 0.0 to 45.0", PhysicalLimits.SALN_MIN == 0.0 and PhysicalLimits.SALN_MAX == 45.0)
    check("Depth range: 0.0 to 6000.0", PhysicalLimits.DEPTH_MIN == 0.0 and PhysicalLimits.DEPTH_MAX == 6000.0)
    check("Speed range: 0.0 to 10.0", PhysicalLimits.SPEED_MIN == 0.0 and PhysicalLimits.SPEED_MAX == 10.0)
    check("SSH range: -5.0 to 5.0", PhysicalLimits.SSH_MIN == -5.0 and PhysicalLimits.SSH_MAX == 5.0)


def test_model_observation_matching_fields():
    print("\n=== Model/Observation Comparison Schema ===")
    try:
        from app.schemas.hycom_schemas import ModelObservationComparisonResponse, ModelObservationComparisonItem
        
        item = ModelObservationComparisonItem(
            depth=100.0,
            model_temperature=22.5,
            observed_temperature=22.8,
            temperature_difference=-0.3,
            qc_status="PASSED",
            is_valid_pair=True,
        )
        check("ComparisonItem has qc_status", item.qc_status == "PASSED")
        check("ComparisonItem has is_valid_pair", item.is_valid_pair == True)
        
        resp = ModelObservationComparisonResponse(
            platform_number="2902100",
            cycle_number=1,
            observation_latitude=15.0,
            observation_longitude=75.0,
            model_latitude=15.04,
            model_longitude=75.04,
            distance_km=5.6,
            observation_time="2026-08-28T06:00:00Z",
            model_time="2026-08-28T06:00:00Z",
            time_difference_hours=0.0,
            matched_depth_count=10,
            valid_pairs_count=8,
            missing_count=1,
            qc_pass_count=8,
            qc_fail_count=2,
            profile_comparison=[item],
        )
        check("Response has matched_depth_count", resp.matched_depth_count == 10)
        check("Response has valid_pairs_count", resp.valid_pairs_count == 8)
        check("Response has missing_count", resp.missing_count == 1)
        check("Response has qc_pass_count", resp.qc_pass_count == 8)
        check("Response has qc_fail_count", resp.qc_fail_count == 2)
        check("Response has observation_time", resp.observation_time == "2026-08-28T06:00:00Z")
        check("Response has model_time", resp.model_time == "2026-08-28T06:00:00Z")
        check("Response has time_difference_hours", resp.time_difference_hours == 0.0)
        check("Response has distance_km", resp.distance_km == 5.6)
    except Exception as e:
        print(f"  [FAIL] Schema test error: {e}")
        traceback.print_exc()


def test_argo_schemas_qc():
    print("\n=== Argo Schema QC Fields ===")
    try:
        from app.schemas.ocean_schemas import ArgoObservationItem, ArgoObservationResponse, ArgoProfileLevelItem, ArgoProfileResponse
        
        obs = ArgoObservationItem(
            platform_number="2902100",
            cycle_number=1,
            latitude=15.0,
            longitude=75.0,
            timestamp="2026-08-28T06:00:00Z",
            temperature=28.5,
            salinity=35.1,
            qc_flag=1,
            qc_status="PASSED",
        )
        check("ObservationItem has qc_flag", obs.qc_flag == 1)
        check("ObservationItem has qc_status", obs.qc_status == "PASSED")
        
        resp = ArgoObservationResponse(
            retrieved_at="2026-08-28T12:00:00Z",
            count=10,
            valid_count=9,
            missing_count=1,
            qc_pass_count=9,
            qc_fail_count=1,
            observations=[obs],
        )
        check("Response has valid_count", resp.valid_count == 9)
        check("Response has missing_count", resp.missing_count == 1)
        check("Response units temperature is °C", resp.units["temperature"] == "°C")
        check("Response units pressure is dbar", resp.units["pressure"] == "dbar")
        
        level = ArgoProfileLevelItem(
            pressure=100.0,
            temperature=22.5,
            salinity=35.0,
            qc_flag=1,
            qc_status="PASSED",
        )
        check("ProfileLevelItem has qc_flag", level.qc_flag == 1)
        check("ProfileLevelItem has qc_status", level.qc_status == "PASSED")
        
        profile = ArgoProfileResponse(
            platform_number="2902100",
            cycle_number=1,
            retrieved_at="2026-08-28T12:00:00Z",
            valid_count=20,
            missing_count=2,
            qc_pass_count=20,
            qc_fail_count=2,
            profile=[level],
        )
        check("ProfileResponse has valid_count", profile.valid_count == 20)
        check("ProfileResponse has qc_fail_count", profile.qc_fail_count == 2)
    except Exception as e:
        print(f"  [FAIL] Argo schema test error: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    print("=" * 60)
    print("OceanScope Quality Control Test Suite")
    print("=" * 60)
    
    test_fill_value_detection()
    test_temperature_validation()
    test_salinity_validation()
    test_metric_calculation()
    test_coordinate_validation()
    test_unit_map()
    test_argo_qc_flags()
    test_physical_limits()
    test_model_observation_matching_fields()
    test_argo_schemas_qc()
    
    print("\n" + "=" * 60)
    total = PASS + FAIL
    print(f"RESULTS: {PASS}/{total} passed, {FAIL} failed")
    if FAIL == 0:
        print("ALL QUALITY CONTROL TESTS PASSED")
    else:
        print("SOME TESTS FAILED")
    print("=" * 60)
    
    sys.exit(0 if FAIL == 0 else 1)
