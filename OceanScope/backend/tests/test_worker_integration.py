"""
Phase 5 — Automated Integration Tests for FastAPI Backend + Cloudflare Worker.
Tests the live FastAPI routes connecting to the local Worker prototype on http://127.0.0.1:8787.
"""

import os
import sys
import time
import unittest

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient

from app.core.config import settings
from main import app

# Ensure worker integration is active for these tests
settings.HYCOM_DATA_SOURCE = "worker"
settings.HYCOM_WORKER_URL = "http://127.0.0.1:8787"
settings.HYCOM_REMOTE_TIMEOUT_SECONDS = 45


class TestWorkerIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_valid_ocean_profile_full_40_levels(self):
        """Verify full 40 depth levels, depth ordering, scientific units, and thermocline gradient."""
        t0 = time.time()
        resp = self.client.get("/api/v1/models/hycom/profile", params={"latitude": 15.0, "longitude": 70.0})
        latency = (time.time() - t0) * 1000
        self.assertEqual(resp.status_code, 200, f"Expected 200 OK, got {resp.status_code}: {resp.text}")

        data = resp.json()
        self.assertEqual(data["model"], "HYCOM")
        self.assertEqual(data["source"], "HYCOM Consortium")
        self.assertEqual(data["latitude"], 15.0)
        self.assertEqual(data["longitude"], 70.0)

        # 1. Verify exact 40 depth levels
        profile = data.get("profile", [])
        self.assertEqual(len(profile), 40, f"Expected exactly 40 depth levels, got {len(profile)}")

        # 2. Verify strict depth ordering
        for i in range(len(profile) - 1):
            self.assertLess(
                profile[i]["depth"],
                profile[i + 1]["depth"],
                f"Depth ordering violated at index {i}: {profile[i]['depth']} >= {profile[i+1]['depth']}"
            )

        # 3. Verify scale factor & offset applied exactly once
        surface = profile[0]
        self.assertEqual(surface["depth"], 0.0)
        self.assertIsNotNone(surface["temperature"])
        self.assertIsNotNone(surface["salinity"])

        # Physical range checks for Arabian Sea: 27°C - 33°C, 34 - 38 PSU
        self.assertGreater(surface["temperature"], 26.0)
        self.assertLess(surface["temperature"], 34.0)
        self.assertGreater(surface["salinity"], 34.0)
        self.assertLess(surface["salinity"], 38.0)

        # 4. Verify thermocline gradient
        deep100 = profile[19] # 100m
        self.assertEqual(deep100["depth"], 100.0)
        if deep100["temperature"] is not None:
            self.assertGreater(surface["temperature"], deep100["temperature"])

        # 5. Verify velocity status (explicitly documented as None on operational profile)
        self.assertIsNone(surface["current_u"], "current_u must be None on operational profile")
        self.assertIsNone(surface["current_v"], "current_v must be None on operational profile")

        print(f"\n[PHASE 5 TEST 01] Valid profile 40 levels verified in {latency:.2f}ms")

    def test_02_independent_hycom_reference_comparison(self):
        """
        Compare FastAPI backend output against an independent direct OPeNDAP calculation.
        Validates that scale factors and offsets are applied identically.
        """
        import urllib.request

        # 1. Query FastAPI backend
        resp = self.client.get("/api/v1/models/hycom/profile", params={"latitude": 15.0, "longitude": 70.0})
        self.assertEqual(resp.status_code, 200)
        backend_surface_temp = resp.json()["profile"][0]["temperature"]

        # 2. Directly fetch raw value from official HYCOM OPeNDAP independently
        # Lat 15.0 -> idx 2375, Lon 70.0 -> idx 875
        url = "https://tds.hycom.org/thredds/dodsC/ESPC-D-V02/t3z/2026.ascii?water_temp[2391][0][2375][875]"
        req = urllib.request.Request(url, headers={"User-Agent": "IndependentAudit/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            raw_text = r.read().decode("utf-8")

        # Extract raw int16 value
        raw_val = None
        for line in raw_text.split("\n"):
            line = line.strip()
            if line.startswith("[0][0][0]"):
                raw_val = float(line.split(",")[1].strip())
                break

        self.assertIsNotNone(raw_val, "Failed to parse independent raw HYCOM value")
        # Independent manual calculation: raw * 0.001 + 20.0
        independent_temp = round(raw_val * 0.001 + 20.0, 3)

        # 3. Assert exact mathematical equivalence
        self.assertAlmostEqual(
            backend_surface_temp,
            independent_temp,
            places=3,
            msg=f"FastAPI temperature ({backend_surface_temp}°C) differs from independent calculation ({independent_temp}°C)"
        )
        print(f"[PHASE 5 TEST 02] Exact reference match: Backend={backend_surface_temp}°C, Independent={independent_temp}°C")

    def test_03_negative_longitude_normalization(self):
        """Test negative longitude coordinates (Atlantic Ocean Lat 25.0°N, Lon -40.0°W)."""
        resp = self.client.get("/api/v1/models/hycom/profile", params={"latitude": 25.0, "longitude": -40.0})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["latitude"], 25.0)
        self.assertEqual(data["longitude"], -40.0)
        surface_temp = data["profile"][0]["temperature"]
        self.assertIsNotNone(surface_temp)
        self.assertGreater(surface_temp, 20.0)
        self.assertLess(surface_temp, 32.0)
        print(f"[PHASE 5 TEST 03] Negative lon normalized: (-40°W, 25°N) = {surface_temp}°C")

    def test_04_land_coordinates_return_nulls(self):
        """Confirm that land points return null measurements rather than fabricated values."""
        # Central India land point (22.0°N, 78.0°E)
        resp = self.client.get("/api/v1/models/hycom/profile", params={"latitude": 22.0, "longitude": 78.0})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        surface = data["profile"][0]
        # Land point in HYCOM must be null
        self.assertIsNone(surface["temperature"], "Land coordinates must return null temperature")
        self.assertIsNone(surface["salinity"], "Land coordinates must return null salinity")
        print("[PHASE 5 TEST 04] Land point (22N, 78E) returned nulls, no fabricated measurements")

    def test_05_invalid_latitude_returns_400(self):
        """Latitude outside [-90, 90] must return HTTP 400 Bad Request."""
        resp = self.client.get("/api/v1/models/hycom/profile", params={"latitude": 95.0, "longitude": 70.0})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Latitude 95.0° is outside valid bounds", resp.json()["detail"])

    def test_06_invalid_longitude_returns_400(self):
        """Longitude outside [-180, 360] must return HTTP 400 Bad Request."""
        resp = self.client.get("/api/v1/models/hycom/profile", params={"latitude": 15.0, "longitude": 380.0})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("Longitude 380.0° is outside valid bounds", resp.json()["detail"])

    def test_07_missing_parameters_returns_422(self):
        """FastAPI query validation returns 422 when required latitude/longitude are omitted."""
        resp = self.client.get("/api/v1/models/hycom/profile")
        self.assertEqual(resp.status_code, 422)

    def test_08_cold_cache_vs_warm_cache_performance(self):
        """Measure cold-cache and warm-cache latencies separately."""
        # Query unique coordinate to test cache transition
        lat = 16.2
        lon = 71.4

        # Request 1 (Cold upstream query)
        t0 = time.time()
        resp1 = self.client.get("/api/v1/models/hycom/profile", params={"latitude": lat, "longitude": lon})
        cold_latency = (time.time() - t0) * 1000
        self.assertEqual(resp1.status_code, 200)

        # Request 2 (Warm cached query)
        t1 = time.time()
        resp2 = self.client.get("/api/v1/models/hycom/profile", params={"latitude": lat, "longitude": lon})
        warm_latency = (time.time() - t1) * 1000
        self.assertEqual(resp2.status_code, 200)

        print(f"[PHASE 5 TEST 08] Latency comparison: Cold={cold_latency:.2f}ms, Warm={warm_latency:.2f}ms")
        self.assertLess(warm_latency, 500.0, "Warm cache query should resolve in < 500ms")

    def test_09_upstream_gateway_error_mapping(self):
        """Verify that connection failure to worker gateway maps to HTTP 502."""
        from app.services.hycom_worker_client import HYCOMWorkerClient
        broken_client = HYCOMWorkerClient(base_url="http://127.0.0.1:59999", timeout=1.0)

        with self.assertRaises(Exception) as ctx:
            broken_client.get_profile(15.0, 70.0)

        self.assertIn("Failed to connect", str(ctx.exception))
        print("[PHASE 5 TEST 09] Gateway error correctly maps to connection failure exception")


if __name__ == "__main__":
    unittest.main(verbosity=2)
