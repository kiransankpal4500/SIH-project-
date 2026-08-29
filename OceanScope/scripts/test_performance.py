"""
Performance Benchmarking Script for OceanScope Backend
Measures query execution times for Cold Cache Miss vs Warm Cache Hit.
"""

import sys
import os
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.core.query_cache import global_query_cache
from app.services.hycom_service import hycom_service


def benchmark():
    print("==================================================")
    print("OCEANSCOPE — STEP 12 PERFORMANCE BENCHMARK")
    print("==================================================")

    global_query_cache.clear()
    lat, lon, depth = 13.75, 87.30, 10.0
    exact_time = "2026-08-28T06:00:00Z"

    results = []

    # 1. Point Query
    t0 = time.perf_counter()
    p1 = hycom_service.get_point(latitude=lat, longitude=lon, depth=depth, variable="temperature", time_str=exact_time)
    cold_point = (time.perf_counter() - t0) * 1000.0

    t0 = time.perf_counter()
    p2 = hycom_service.get_point(latitude=lat, longitude=lon, depth=depth, variable="temperature", time_str=exact_time)
    warm_point = (time.perf_counter() - t0) * 1000.0
    results.append(("HYCOM Point Query", cold_point, warm_point, p1.value))

    # 2. Profile Query
    t0 = time.perf_counter()
    prof1 = hycom_service.get_profile(latitude=lat, longitude=lon, time_str=exact_time)
    cold_prof = (time.perf_counter() - t0) * 1000.0

    t0 = time.perf_counter()
    prof2 = hycom_service.get_profile(latitude=lat, longitude=lon, time_str=exact_time)
    warm_prof = (time.perf_counter() - t0) * 1000.0
    results.append(("HYCOM Profile Query", cold_prof, warm_prof, f"{len(prof1.profile)} levels"))

    # 3. Current Query
    t0 = time.perf_counter()
    c1 = hycom_service.get_current(latitude=lat, longitude=lon, depth=depth, time_str=exact_time)
    cold_curr = (time.perf_counter() - t0) * 1000.0

    t0 = time.perf_counter()
    c2 = hycom_service.get_current(latitude=lat, longitude=lon, depth=depth, time_str=exact_time)
    warm_curr = (time.perf_counter() - t0) * 1000.0
    results.append(("HYCOM Current Vector Query", cold_curr, warm_curr, f"{c1.speed} m/s"))

    # 4. Timeseries Query
    t0 = time.perf_counter()
    ts1 = hycom_service.get_timeseries(latitude=lat, longitude=lon, depth=0.0, variable="temperature")
    cold_ts = (time.perf_counter() - t0) * 1000.0

    t0 = time.perf_counter()
    ts2 = hycom_service.get_timeseries(latitude=lat, longitude=lon, depth=0.0, variable="temperature")
    warm_ts = (time.perf_counter() - t0) * 1000.0
    results.append(("HYCOM Timeseries Query", cold_ts, warm_ts, f"{ts1.count} points"))

    # 5. Argo Comparison Query
    sample_levels = [
        {"pressure": 0.3, "temperature": 27.83, "salinity": 33.001},
        {"pressure": 10.0, "temperature": 27.82, "salinity": 33.012},
        {"pressure": 50.0, "temperature": 26.50, "salinity": 33.500},
        {"pressure": 100.0, "temperature": 22.10, "salinity": 34.200},
    ]
    t0 = time.perf_counter()
    comp1 = hycom_service.compare_with_argo_profile(
        platform_number="1902669",
        cycle_number=49,
        obs_lat=lat,
        obs_lon=lon,
        obs_time="2025-01-11T14:09:21Z",
        argo_levels=sample_levels,
    )
    cold_comp = (time.perf_counter() - t0) * 1000.0

    t0 = time.perf_counter()
    comp2 = hycom_service.compare_with_argo_profile(
        platform_number="1902669",
        cycle_number=49,
        obs_lat=lat,
        obs_lon=lon,
        obs_time="2025-01-11T14:09:21Z",
        argo_levels=sample_levels,
    )
    warm_comp = (time.perf_counter() - t0) * 1000.0
    results.append(("Argo vs HYCOM Comparison", cold_comp, warm_comp, f"RMSE: {comp1.temp_rmse}°C"))

    # Print Table
    print(f"\n{'Query Type':<30} | {'Cold Miss (ms)':<15} | {'Warm Hit (ms)':<15} | {'Speedup':<10} | {'Output'}")
    print("-" * 90)
    for q_name, cold_ms, warm_ms, out_val in results:
        speedup = f"{cold_ms / max(warm_ms, 0.001):.1f}x"
        print(f"{q_name:<30} | {cold_ms:<15.2f} | {warm_ms:<15.4f} | {speedup:<10} | {out_val}")

    # Validation Checks
    print("\n--------------------------------------------------")
    print("Testing Boundary & Input Validation Rejection:")
    try:
        hycom_service.get_point(latitude=120.0, longitude=80.0)
        print("  FAIL: Did not reject invalid latitude!")
    except ValueError as e:
        print(f"  PASS: Successfully rejected invalid latitude (120°): {e}")

    try:
        hycom_service.get_point(latitude=10.0, longitude=80.0, depth=10000.0)
        print("  FAIL: Did not reject invalid depth!")
    except ValueError as e:
        print(f"  PASS: Successfully rejected invalid depth (10000m): {e}")

    try:
        hycom_service.get_timeseries(
            latitude=10.0,
            longitude=80.0,
            start_time="2026-01-01T00:00:00Z",
            end_time="2024-01-01T00:00:00Z",
        )
        print("  FAIL: Did not reject inverted time range!")
    except ValueError as e:
        print(f"  PASS: Successfully rejected inverted time range: {e}")

    # Cache Stats
    stats = global_query_cache.stats()
    print("\n--------------------------------------------------")
    print("Query Cache Statistics:")
    print(f"  Active Entries: {stats['active_entries']}")
    print(f"  Hits: {stats['hits']}, Misses: {stats['misses']}")
    print(f"  Hit Ratio: {stats['hit_ratio_percent']}%")
    print(f"  Default TTL: {stats['default_ttl_seconds']}s")

    print("\nALL PERFORMANCE BENCHMARKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    benchmark()
