"""
Unit and Integration Tests for 3D Ocean Chunk Feature:
- GEBCO Bathymetry (Point & Chunk)
- Copernicus Marine Integration (Status, Metadata, Point, Current, Profile)
- Mumbai Location Test (19.0760° N, 72.8777° E)
- Second Ocean Location Test (18.5000° N, 72.0000° E)
- Scientific Labeling & Security (No credentials exposed, no fake tide claims)
"""

import sys
import os
import unittest

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from app.services.gebco_service import gebco_service
from app.services.copernicus_service import copernicus_service


class TestOceanChunk(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_copernicus_status_endpoint(self):
        """Verify Copernicus authentication status without exposing secrets."""
        response = self.client.get("/api/v1/models/copernicus/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["authentication"], "PASS")
        self.assertEqual(data["status"], "online")
        self.assertNotIn("password", str(data).lower())
        self.assertNotIn("COPERNICUSMARINE_SERVICE_PASSWORD", str(data))
        self.assertEqual(data["product_id"], "MULTIOBS_GLO_PHY_TSUV_3D_MYNRT_015_012")

    def test_copernicus_metadata_endpoint(self):
        """Verify Copernicus metadata variables and depths."""
        response = self.client.get("/api/v1/models/copernicus/metadata")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data["variables"]), 4)
        self.assertGreaterEqual(len(data["depth_levels_m"]), 10)
        var_keys = [v["key"] for v in data["variables"]]
        self.assertIn("temperature", var_keys)
        self.assertIn("salinity", var_keys)
        self.assertIn("current", var_keys)
        self.assertIn("mld", var_keys)

    def test_gebco_mumbai_location(self):
        """Test Mumbai test location (19.0760, 72.8777) for real bathymetry."""
        response = self.client.get("/api/v1/bathymetry/point?latitude=19.0760&longitude=72.8777")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["latitude"], 19.076)
        self.assertEqual(data["longitude"], 72.8777)
        self.assertIn("elevation", data)
        self.assertIn("depth", data)
        self.assertEqual(data["label"], "Bathymetric Depth")
        self.assertIn("GEBCO", data["source"])

    def test_gebco_second_location_ocean_chunk(self):
        """Test second ocean location (18.50, 72.00) in Arabian Sea for 3D chunk mesh generation."""
        response = self.client.get(
            "/api/v1/bathymetry/chunk?latitude=18.50&longitude=72.00&chunk_size=0.05&resolution=5"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["grid_resolution"], 5)
        self.assertEqual(len(data["latitudes"]), 5)
        self.assertEqual(len(data["longitudes"]), 5)
        self.assertEqual(len(data["elevations"]), 5)
        self.assertEqual(len(data["elevations"][0]), 5)
        self.assertEqual(len(data["depths"]), 5)
        self.assertEqual(len(data["depths"][0]), 5)
        
        # Real bathymetric depths must be positive for ocean seabed
        stats = data["statistics"]
        self.assertGreater(stats["max_depth_m"], 30.0)  # Real Arabian Sea depths
        self.assertGreater(stats["ocean_coverage_percent"], 50.0)
        self.assertEqual(data["label"], "Bathymetric Depth")

    def test_copernicus_point_query(self):
        """Test real Copernicus point query for temperature, salinity, and MLD."""
        # Temperature
        res_temp = self.client.get(
            "/api/v1/models/copernicus/point?latitude=18.50&longitude=72.00&depth=0&variable=temperature"
        )
        self.assertEqual(res_temp.status_code, 200)
        data_t = res_temp.json()
        self.assertEqual(data_t["variable"], "temperature")
        self.assertEqual(data_t["unit"], "°C")
        self.assertIsNotNone(data_t["value"])
        self.assertTrue(15.0 <= data_t["value"] <= 35.0)  # Physical tropical sea temperature

        # Salinity
        res_sal = self.client.get(
            "/api/v1/models/copernicus/point?latitude=18.50&longitude=72.00&depth=0&variable=salinity"
        )
        self.assertEqual(res_sal.status_code, 200)
        data_s = res_sal.json()
        self.assertEqual(data_s["variable"], "salinity")
        self.assertEqual(data_s["unit"], "PSU")
        self.assertIsNotNone(data_s["value"])
        self.assertTrue(30.0 <= data_s["value"] <= 40.0)  # Physical ocean salinity

        # MLD
        res_mld = self.client.get(
            "/api/v1/models/copernicus/point?latitude=18.50&longitude=72.00&depth=0&variable=mld"
        )
        self.assertEqual(res_mld.status_code, 200)
        data_m = res_mld.json()
        self.assertEqual(data_m["variable"], "mld")
        self.assertEqual(data_m["unit"], "m")
        self.assertIsNotNone(data_m["value"])

    def test_copernicus_current_query(self):
        """Test Copernicus geostrophic currents calculation (speed and direction)."""
        response = self.client.get(
            "/api/v1/models/copernicus/current?latitude=18.50&longitude=72.00&depth=0"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("ugo", data)
        self.assertIn("vgo", data)
        self.assertIn("speed", data)
        self.assertIn("direction_degrees", data)
        self.assertGreaterEqual(data["speed"], 0.0)
        self.assertTrue(0.0 <= data["direction_degrees"] <= 360.0)
        self.assertEqual(data["unit"], "m/s")

    def test_copernicus_profile_query(self):
        """Test Copernicus vertical CTD soundings profile."""
        response = self.client.get(
            "/api/v1/models/copernicus/profile?latitude=18.50&longitude=72.00"
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data["depths"]), 10)
        self.assertEqual(len(data["temperature"]), len(data["depths"]))
        self.assertEqual(len(data["salinity"]), len(data["depths"]))
        self.assertEqual(data["temperature_unit"], "°C")
        self.assertEqual(data["salinity_unit"], "PSU")

    def test_security_no_credentials_in_endpoints(self):
        """Ensure no credentials or private environment variables are leaked in any endpoint."""
        endpoints = [
            "/api/v1/models/copernicus/status",
            "/api/v1/models/copernicus/metadata",
            "/api/v1/bathymetry/point?latitude=18.5&longitude=72.0",
            "/api/v1/bathymetry/chunk?latitude=18.5&longitude=72.0",
        ]
        for ep in endpoints:
            res = self.client.get(ep)
            body = res.text.lower()
            self.assertNotIn("password", body)
            self.assertNotIn("copernicusmarine_service_password", body)
            self.assertNotIn("copernicusmarine_service_username", body)


if __name__ == "__main__":
    unittest.main()
