"""
Unit and Integration Tests for HYCOM Vertical Profile Endpoint and Service Layer
Tests:
- Successful profile retrieval with mock data (HTTP 200)
- Dataset unavailable diagnostics when unmounted or remote unreachable (HTTP 503)
- Coordinate validation with invalid latitude and longitude (HTTP 400)
- Service layer coordinate bounds enforcement
"""

import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from app.services.hycom_service import hycom_service, HYCOMDatasetUnavailableError
from app.schemas.hycom_schemas import OceanModelProfile, OceanModelProfileLevel


class TestHycomProfile(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_successful_profile_retrieval(self):
        """Test successful profile retrieval when HYCOM dataset is available (mocked external/storage)."""
        mock_levels = [
            OceanModelProfileLevel(
                depth=float(d),
                temperature=round(28.5 - d * 0.03, 3),
                salinity=round(35.2 + d * 0.005, 3),
                current_u=0.12,
                current_v=-0.08,
            )
            for d in [0.0, 10.0, 20.0, 50.0, 100.0, 200.0, 500.0, 1000.0]
        ]
        mock_profile = OceanModelProfile(
            source="HYCOM Consortium",
            provider="INCOIS RSMC / HYCOM",
            model="HYCOM",
            dataset="RSMC_hycom_20260829.nc",
            retrieved_at="2026-10-30T00:00:00Z",
            latitude=18.5,
            longitude=72.0,
            time="2026-08-28T18:00:00Z",
            model_time="2026-08-28T18:00:00Z",
            profile=mock_levels,
            selected_file="RSMC_hycom_20260829.nc",
            time_difference_hours=0.0,
        )

        with patch.object(hycom_service, "get_profile", return_value=mock_profile):
            response = self.client.get("/api/v1/models/hycom/profile?latitude=18.5&longitude=72.0")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertEqual(data["latitude"], 18.5)
            self.assertEqual(data["longitude"], 72.0)
            self.assertEqual(len(data["profile"]), 8)
            self.assertEqual(data["profile"][0]["depth"], 0.0)
            self.assertEqual(data["profile"][0]["temperature"], 28.5)
            self.assertEqual(data["profile"][0]["salinity"], 35.2)

    def test_unavailable_dataset_local_returns_503_diagnostic(self):
        """Test that missing local NetCDF storage returns HTTP 503 with an accurate diagnostic."""
        diagnostic = (
            "No valid HYCOM dataset available for vertical profile query. "
            "Local NetCDF storage is empty or unmounted in this environment. "
            "In serverless deployments (such as Vercel), local NetCDF archive storage (/data/hycom) cannot be bundled. "
            "To enable HYCOM data, configure persistent volume storage with RSMC_hycom NetCDF files "
            "or configure a dedicated containerized backend."
        )
        with patch.object(hycom_service, "get_profile", side_effect=HYCOMDatasetUnavailableError(diagnostic)):
            response = self.client.get("/api/v1/models/hycom/profile?latitude=18.5&longitude=72.0")
            self.assertEqual(response.status_code, 503)
            data = response.json()
            self.assertIn("No valid HYCOM dataset available", data["detail"])
            self.assertIn("serverless deployments", data["detail"])

    def test_unavailable_dataset_remote_returns_503_diagnostic(self):
        """Test that remote OPeNDAP failure/timeout returns HTTP 503 with accurate diagnostic."""
        diagnostic = (
            "Remote HYCOM OPeNDAP service unavailable: connection timed out. "
            "External THREDDS server is unreachable or timed out."
        )
        with patch.object(hycom_service, "get_profile", side_effect=HYCOMDatasetUnavailableError(diagnostic)):
            response = self.client.get("/api/v1/models/hycom/profile?latitude=18.5&longitude=72.0")
            self.assertEqual(response.status_code, 503)
            data = response.json()
            self.assertIn("Remote HYCOM OPeNDAP service unavailable", data["detail"])

    def test_invalid_coordinates_latitude_bounds(self):
        """Test that out-of-bounds latitude returns HTTP 400 Bad Request."""
        response = self.client.get("/api/v1/models/hycom/profile?latitude=999.0&longitude=72.0")
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("Latitude 999.0° is outside valid bounds", data["detail"])

    def test_invalid_coordinates_longitude_bounds(self):
        """Test that out-of-bounds longitude returns HTTP 400 Bad Request."""
        response = self.client.get("/api/v1/models/hycom/profile?latitude=18.5&longitude=-500.0")
        self.assertEqual(response.status_code, 400)
        data = response.json()
        self.assertIn("Longitude -500.0° is outside valid bounds", data["detail"])

    def test_service_validate_coordinates(self):
        """Direct unit test of hycom_service.validate_coordinates boundary checks."""
        # Valid
        hycom_service.validate_coordinates(18.5, 72.0, 0.0)
        hycom_service.validate_coordinates(-90.0, -180.0, 6000.0)
        hycom_service.validate_coordinates(90.0, 360.0, 100.0)

        # Invalid latitude
        with self.assertRaises(ValueError) as ctx:
            hycom_service.validate_coordinates(95.0, 72.0)
        self.assertIn("Latitude 95.0° is outside valid bounds", str(ctx.exception))

        # Invalid longitude
        with self.assertRaises(ValueError) as ctx:
            hycom_service.validate_coordinates(18.5, -200.0)
        self.assertIn("Longitude -200.0° is outside valid bounds", str(ctx.exception))

        # Invalid depth
        with self.assertRaises(ValueError) as ctx:
            hycom_service.validate_coordinates(18.5, 72.0, -5.0)
        self.assertIn("Depth -5.0m is outside valid oceanographic range", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
