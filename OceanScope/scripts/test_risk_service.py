"""
Test script for Ocean Risk Evaluation Service
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.risk_service import ocean_risk_service

def run_tests():
    print("=== Testing Ocean Risk Evaluation Service ===")

    # 1. Test Point Evaluation in LIVE mode (Bay of Bengal hotspot 18.5N, 88.5E)
    print("\n1. Point Evaluation (Live INCOIS HYCOM at 18.5°N, 88.5°E):")
    res = ocean_risk_service.evaluate_location_risk(latitude=18.5, longitude=88.5, depth=0.0, is_demo=False)
    print(f"Overall Risk: {res.overall_risk}")
    print(f"Contributing Parameter: {res.contributing_parameter} ({res.primary_factor_value} {res.primary_factor_unit})")
    print(f"Primary Threshold: {res.primary_threshold}")
    print(f"Why Reason: {res.why_reason}")
    print(f"Source: {res.source} (Live: {res.is_live_data})")
    print(f"Factors Count: {len(res.factors)}")
    for f in res.factors:
        print(f"  - {f.name} [{f.variable_key}]: {f.value} {f.unit} -> Risk: {f.risk_level} (Available: {f.is_available})")

    # 2. Test Point Evaluation in DEMO mode
    print("\n2. Point Evaluation (Demo Mode):")
    demo_res = ocean_risk_service.evaluate_location_risk(latitude=10.0, longitude=75.0, depth=0.0, is_demo=True)
    print(f"Demo Overall Risk: {demo_res.overall_risk}")
    print(f"Demo Contributing Parameter: {demo_res.contributing_parameter}")
    print(f"Demo Source: {demo_res.source}")
    assert demo_res.is_live_data is False

    # 3. Test Regional Risk Hotspots
    print("\n3. Regional Risk Hotspots:")
    hotspots = ocean_risk_service.get_regional_risk_hotspots(is_demo=False)
    print(f"Found {len(hotspots)} regional hotspots:")
    for h in hotspots:
        print(f"  - [{h.risk_level}] {h.title} at ({h.latitude}°N, {h.longitude}°E): {h.contributing_parameter} = {h.actual_value} {h.unit} ({h.threshold_used})")

    assert len(hotspots) > 0, "Should have regional hotspots"
    print("\nALL RISK EVALUATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
