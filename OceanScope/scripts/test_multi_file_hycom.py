"""
Test script for Multi-File HYCOM Dataset Manager & Enhanced HYCOM Service
"""

import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.hycom_dataset_manager import hycom_dataset_manager
from app.services.hycom_service import hycom_service


def run_tests():
    print("=== Testing Multi-File HYCOM Dataset Engine ===")

    # 1. Test File Discovery
    files = hycom_dataset_manager.discover_files()
    print(f"\n1. Discovered NetCDF Files ({len(files)}):")
    for f in files:
        print(f"  - {os.path.basename(f)} ({os.path.getsize(f) / (1024*1024):.2f} MB)")
    assert len(files) > 0, "Should discover at least 1 HYCOM NetCDF file"

    # 2. Test Catalog & Metadata
    meta = hycom_dataset_manager.get_aggregate_metadata()
    print(f"\n2. Aggregate Multi-File Metadata:")
    print(f"  - Total Files: {meta.file_count}")
    print(f"  - Available Files: {meta.available_files}")
    print(f"  - Earliest Time: {meta.earliest_time}")
    print(f"  - Latest Time: {meta.latest_time}")
    print(f"  - Total Timesteps: {len(meta.time_range)} -> {meta.time_range}")
    print(f"  - Depth Levels ({len(meta.available_depths)}): {meta.available_depths}")
    print(f"  - Lat Range: {meta.latitude_range}, Lon Range: {meta.longitude_range}")
    print(f"  - Discovered Variables ({len(meta.discovered_variables)}): {meta.discovered_variables}")
    print(f"  - Mapped Variables: {meta.mapped_variables}")

    assert meta.is_available is True
    assert meta.file_count >= 1

    # 3. Test Time Selection Logic
    print(f"\n3. Time Selection Engine Tests:")
    
    # 3a. Exact time query
    exact_time = meta.time_range[0] if meta.time_range else "2026-08-28T06:00:00Z"
    _, sel_file, sel_time, diff_hrs, ds, _, _ = hycom_dataset_manager.select_file_for_time(exact_time)
    print(f"  [Exact Match] Requested: {exact_time} -> Selected: {sel_file} at {sel_time} (Diff: {diff_hrs} hrs)")
    assert diff_hrs == 0.0, "Exact match should have 0 hours difference"

    # 3b. Nearest time query (offset by 3 hours)
    offset_time = "2026-08-28T09:00:00Z"
    _, sel_file2, sel_time2, diff_hrs2, _, _, _ = hycom_dataset_manager.select_file_for_time(offset_time)
    print(f"  [Nearest Match] Requested: {offset_time} -> Selected: {sel_file2} at {sel_time2} (Diff: {diff_hrs2} hrs)")
    assert diff_hrs2 > 0.0, "Offset query should calculate non-zero time difference"

    # 3c. Default / None time query
    _, sel_file3, sel_time3, diff_hrs3, _, _, _ = hycom_dataset_manager.select_file_for_time(None)
    print(f"  [Default Latest] Requested: None -> Selected: {sel_file3} at {sel_time3} (Diff: {diff_hrs3} hrs)")
    assert sel_time3 is not None

    # 4. Test Point Query
    print(f"\n4. Point Query:")
    pt = hycom_service.get_point(latitude=13.75, longitude=87.30, depth=10.0, variable="temperature", time_str=exact_time)
    print(f"  Point Temp: {pt.value} {pt.unit} at ({pt.latitude}°N, {pt.longitude}°E) | File: {pt.selected_file} | Time diff: {pt.time_difference_hours} hrs")
    assert pt.selected_file is not None

    # 5. Test Vertical Profile Query
    print(f"\n5. Profile Query:")
    prof = hycom_service.get_profile(latitude=13.75, longitude=87.30, time_str=exact_time)
    print(f"  Profile Levels: {len(prof.profile)} | File: {prof.selected_file} | Time diff: {prof.time_difference_hours} hrs")
    print(f"  Surface: Temp={prof.profile[0].temperature}°C, Sal={prof.profile[0].salinity} PSU")
    assert len(prof.profile) > 0

    # 6. Test Current Vector Query
    print(f"\n6. Current Vector Query:")
    curr = hycom_service.get_current(latitude=13.75, longitude=87.30, depth=0.0, time_str=exact_time)
    print(f"  Current: u={curr.u} m/s, v={curr.v} m/s, Speed={curr.speed} m/s, Dir={curr.direction}° | File: {curr.selected_file}")
    assert curr.speed >= 0.0

    # 7. Test Time-Series Query
    print(f"\n7. Time-Series Query:")
    ts = hycom_service.get_timeseries(latitude=13.75, longitude=87.30, depth=0.0, variable="temperature")
    print(f"  Timeseries Points ({ts.count}):")
    for p in ts.timeseries:
        print(f"    - {p.time}: {p.value} {ts.unit} (File: {p.selected_file})")
    assert ts.count > 0

    # 8. Test Argo vs HYCOM Multi-File Matching
    print(f"\n8. Argo Comparison with Multi-File Engine:")
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
    print(f"  Platform: {comp.platform_number}, Cycle: {comp.cycle_number}")
    print(f"  Selected NetCDF File: {comp.selected_file}")
    print(f"  Obs Time: {comp.observation_time} vs Model Time: {comp.model_time} (Diff: {comp.time_difference_hours} hrs)")
    print(f"  Temp Bias: {comp.temp_bias}°C, Temp RMSE: {comp.temp_rmse}°C, Temp MAE: {comp.temp_mae}°C")
    assert comp.selected_file is not None
    assert comp.temp_bias is not None

    print("\nALL MULTI-FILE HYCOM TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    run_tests()
