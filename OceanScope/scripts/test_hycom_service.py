"""
Independent Verification Script for INCOIS HYCOM Data Service
"""

import sys
import os

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.hycom_service import hycom_service

def run_tests():
    print("=== Testing INCOIS HYCOM Service ===")
    
    # 1. Test Metadata
    meta = hycom_service.get_metadata()
    print(f"Dataset Available: {meta.is_available}")
    print(f"Dataset File: {meta.filename}")
    print(f"Mapped Variables: {meta.mapped_variables}")
    print(f"Depth Levels ({len(meta.depth_levels)}): {meta.depth_levels[:5]}...")
    assert meta.is_available, "HYCOM NetCDF dataset should be available"

    # 2. Test Point Query (Bay of Bengal ocean coordinate)
    point = hycom_service.get_point(latitude=13.75, longitude=87.30, depth=10.0, variable="temperature")
    print(f"Point Query Temp at (13.75°N, 87.30°E, 10m): {point.value} {point.unit} (Model Time: {point.model_time})")
    assert point.value > 0.0, "Point temperature value should be positive"

    # 3. Test Profile Query
    profile = hycom_service.get_profile(latitude=13.75, longitude=87.30)
    print(f"Profile Query Levels Count: {len(profile.profile)}")
    print(f"  Level 0m -> Temp: {profile.profile[0].temperature}°C, Sal: {profile.profile[0].salinity} PSU")
    print(f"  Level 100m -> Temp: {profile.profile[3].temperature}°C, Sal: {profile.profile[3].salinity} PSU")
    assert len(profile.profile) > 0, "Profile should have levels"

    # 4. Test Current Query
    current = hycom_service.get_current(latitude=13.75, longitude=87.30, depth=0.0)
    print(f"Current Vector at Surface: u={current.u} m/s, v={current.v} m/s, speed={current.speed} m/s, direction={current.direction}°")
    assert current.speed >= 0.0, "Speed should be non-negative"

    # 5. Test Comparison Logic
    sample_argo_levels = [
        {"pressure": 0.3, "temperature": 27.83, "salinity": 33.001},
        {"pressure": 10.0, "temperature": 27.82, "salinity": 33.012},
        {"pressure": 50.0, "temperature": 26.50, "salinity": 33.500},
        {"pressure": 100.0, "temperature": 22.10, "salinity": 34.200},
    ]
    comp = hycom_service.compare_with_argo_profile(
        platform_number="1902669",
        cycle_number=49,
        obs_lat=13.75,
        obs_lon=87.30,
        obs_time="2025-01-11T14:09:21Z",
        argo_levels=sample_argo_levels,
    )
    print("=== Model vs Observation Comparison Results ===")
    print(f"Platform: {comp.platform_number}, Cycle: {comp.cycle_number}")
    print(f"Spatial Offset: {comp.distance_km} km (Obs: {comp.observation_latitude},{comp.observation_longitude} vs Model: {comp.model_latitude},{comp.model_longitude})")
    print(f"Time Offset: {comp.time_difference_hours} hours")
    print(f"Temp Bias: {comp.temp_bias}°C, Temp RMSE: {comp.temp_rmse}°C, Temp MAE: {comp.temp_mae}°C")
    print(f"Sal Bias: {comp.sal_bias} PSU, Sal RMSE: {comp.sal_rmse} PSU, Sal MAE: {comp.sal_mae} PSU")
    assert comp.temp_bias is not None, "Temp bias should be calculated"

    print("\nALL BACKEND HYCOM TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
