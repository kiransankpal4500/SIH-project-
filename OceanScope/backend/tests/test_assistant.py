"""
Unit and Integration Tests for OceanScope AI Research Assistant (Phases 1, 2, 3)
Tests real telemetry integration, schema enforcement, Gemini mocking, and graceful fallbacks.
"""

import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Ensure backend directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from fastapi.testclient import TestClient
from main import app
from app.services.gemini_service import gemini_service


class TestAssistant(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_assistant_status_endpoint(self):
        """Verify assistant health/status endpoint."""
        response = self.client.get("/api/v1/assistant/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("Phase 4", data["phase"])
        self.assertIn("google_genai_sdk", data["capabilities"])
        self.assertIn("real_gebco_bathymetry", data["capabilities"])

    def test_chat_with_real_ocean_context(self):
        """Verify inquiry with valid coordinates and depth retrieves real data context."""
        payload = {
            "question": "What is the ocean depth and water temperature here?",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "depth": 10.0,
            "conversation_history": [
                {"role": "user", "content": "What region is this?"},
                {"role": "assistant", "content": "This is in the Arabian Sea basin."},
            ],
        }
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Check required Phase 2 & 3 response fields
        self.assertIn("answer", data)
        self.assertIn("data_context", data)
        self.assertIn("sources", data)
        self.assertIn("timestamps", data)
        self.assertIn("limitations", data)
        self.assertIn("request_id", data)
        self.assertIn("metadata", data)
        self.assertIn("notices", data)

        # Check request_id format
        self.assertTrue(data["request_id"].startswith("req_"))

        # Verify real data context has bathymetry or ocean parameters
        data_ctx = data["data_context"]
        self.assertIn("bathymetry", data_ctx)
        self.assertIn("temperature", data_ctx)
        self.assertIn("salinity", data_ctx)
        self.assertIn("current", data_ctx)

        # Verify units are preserved
        if data_ctx["temperature"].get("value") is not None:
            self.assertEqual(data_ctx["temperature"].get("unit"), "°C")
        if data_ctx["salinity"].get("value") is not None:
            self.assertEqual(data_ctx["salinity"].get("unit"), "PSU")
        if data_ctx["current"].get("speed_m_s") is not None:
            self.assertEqual(data_ctx["current"].get("unit"), "m/s")

        # Verify metadata
        self.assertTrue(data["metadata"]["has_location_context"])
        self.assertAlmostEqual(data["metadata"]["selected_coordinates"]["latitude"], 19.0760, places=3)
        self.assertAlmostEqual(data["metadata"]["selected_coordinates"]["longitude"], 72.8777, places=3)

    def test_chat_without_coordinates(self):
        """Verify inquiry without coordinates produces general scientific context."""
        payload = {
            "question": "Explain general thermohaline circulation and deep water formation.",
        }
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["metadata"]["has_location_context"])
        self.assertIsNone(data["metadata"]["selected_coordinates"])

    def test_empty_question_rejected(self):
        """Verify empty question returns HTTP 422 Unprocessable Entity."""
        payload = {"question": ""}
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_whitespace_only_question_rejected(self):
        """Verify whitespace-only question is rejected with HTTP 422."""
        payload = {"question": "   \n\t  "}
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_invalid_coordinates_rejected(self):
        """Verify out-of-bounds coordinates return HTTP 422."""
        payload = {"question": "Test coordinates", "latitude": 95.0, "longitude": 0.0}
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 422)

        payload_lon = {"question": "Test coordinates", "latitude": 0.0, "longitude": 185.0}
        response_lon = self.client.post("/api/v1/assistant/chat", json=payload_lon)
        self.assertEqual(response_lon.status_code, 422)

    def test_negative_depth_rejected(self):
        """Verify negative depth returns HTTP 422."""
        payload = {"question": "Test depth", "depth": -10.0}
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 422)

    @patch.object(gemini_service, "_get_client")
    def test_mock_gemini_synthesis(self, mock_get_client):
        """Verify Gemini SDK invocation and prompt grounding when client is mocked."""
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Based on the GEBCO bathymetry, the seabed at this location is at 2400 meters."
        mock_client.models.generate_content.return_value = mock_response
        mock_get_client.return_value = mock_client

        payload = {
            "question": "What is the seabed depth?",
            "latitude": 15.0,
            "longitude": 70.0,
        }
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("2400 meters", data["answer"])
        self.assertIn("Google Gemini", data["metadata"]["model"])
        self.assertTrue(mock_client.models.generate_content.called)

    def test_compare_locations_endpoint(self):
        """Verify spatial comparison of two independent ocean locations."""
        payload = {
            "location_a": {
                "latitude": 19.0760,
                "longitude": 72.8777,
                "depth": 0.0,
                "label": "Mumbai Offshore",
            },
            "location_b": {
                "latitude": 12.1200,
                "longitude": 72.1783,
                "depth": 0.0,
                "label": "Arabian Sea Basin",
            },
            "question": "Compare thermal and salinity differences between these locations.",
        }
        response = self.client.post("/api/v1/assistant/compare", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("location_a", data)
        self.assertIn("location_b", data)
        self.assertIn("comparison_metrics", data)
        self.assertIn("analysis", data)
        self.assertIn("request_id", data)
        self.assertTrue(data["request_id"].startswith("cmp_"))

    def test_generate_report_endpoint(self):
        """Verify publication-style oceanographic research report generation."""
        payload = {
            "question": "Thermal Stratification and Mixed Layer Depth Analysis",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "depth": 10.0,
            "include_depth_profile": True,
        }
        response = self.client.post("/api/v1/assistant/report", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("report_id", data)
        self.assertIn("title", data)
        self.assertIn("executive_summary", data)
        self.assertIn("investigation_scope", data)
        self.assertIn("methods_and_datasets", data)
        self.assertIn("verified_measurements", data)
        self.assertIn("scientific_interpretation", data)
        self.assertIn("uncertainties_and_limitations", data)
        self.assertIn("provenance", data)
        self.assertTrue(data["report_id"].startswith("rpt_"))

    def test_calculate_seawater_density_eos80(self):
        """Verify UNESCO (1981) EOS-80 seawater density calculation."""
        from app.services.assistant_service import calculate_seawater_density
        # Standard seawater: T = 25.0°C, S = 35.0 PSU -> sigma_theta ~ 23.34 kg/m^3
        density = calculate_seawater_density(25.0, 35.0)
        self.assertIsNotNone(density)
        self.assertAlmostEqual(density, 23.343, places=2)

        # Cold seawater: T = 5.0°C, S = 35.0 PSU -> sigma_theta ~ 27.67 kg/m^3
        cold_density = calculate_seawater_density(5.0, 35.0)
        self.assertIsNotNone(cold_density)
        self.assertGreater(cold_density, density)

        # Missing values return None
        self.assertIsNone(calculate_seawater_density(None, 35.0))
        self.assertIsNone(calculate_seawater_density(25.0, None))
        self.assertIsNone(calculate_seawater_density(None, None))

    def test_generate_report_negative_coordinates_and_hemispheres(self):
        """Verify report generation with negative coordinates properly formats S/W hemispheres."""
        payload = {
            "question": "Deep basin analysis in southern hemisphere",
            "latitude": -15.5,
            "longitude": -68.25,
            "depth": 50.0,
            "include_depth_profile": False,
        }
        response = self.client.post("/api/v1/assistant/report", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Check scope coordinates
        scope = data["investigation_scope"]
        self.assertEqual(scope["target_latitude"], -15.5)
        self.assertEqual(scope["target_longitude"], -68.25)
        self.assertEqual(scope["target_depth_m"], 50.0)
        self.assertEqual(scope["latitude"], -15.5)
        self.assertEqual(scope["longitude"], -68.25)
        self.assertEqual(scope["depth_level_m"], 50.0)
        self.assertEqual(scope["coordinates_formatted"], "15.5000° S, 68.2500° W")

        # Check title formatting
        self.assertIn("15.5000° S, 68.2500° W", data["title"])

        # Check dynamic methods table
        methods = data["methods_and_datasets"]
        self.assertGreaterEqual(len(methods), 7)
        for m in methods:
            self.assertIn("parameter", m)
            self.assertIn("provider", m)
            self.assertIn("dataset", m)
            self.assertIn("units", m)
            self.assertIn("depth_level", m)
            self.assertIn("timestamp", m)
            self.assertIn("status", m)
            self.assertIn("method", m)

        # Check verified measurements has EOS-80 density
        measurements = data["verified_measurements"]
        self.assertIn("density", measurements)
        self.assertEqual(measurements["density"]["unit"], "kg/m³")
        self.assertIn("EOS-80", measurements["density"]["source"])

    def test_generate_report_coordinate_bounds_validation(self):
        """Verify invalid report coordinates return HTTP 422."""
        # Latitude > 90
        res = self.client.post("/api/v1/assistant/report", json={"latitude": 95.0, "longitude": 0.0})
        self.assertEqual(res.status_code, 422)

        # Latitude < -90
        res = self.client.post("/api/v1/assistant/report", json={"latitude": -95.0, "longitude": 0.0})
        self.assertEqual(res.status_code, 422)

        # Longitude > 180
        res = self.client.post("/api/v1/assistant/report", json={"latitude": 0.0, "longitude": 185.0})
        self.assertEqual(res.status_code, 422)

        # Longitude < -180
        res = self.client.post("/api/v1/assistant/report", json={"latitude": 0.0, "longitude": -185.0})
        self.assertEqual(res.status_code, 422)

        # Negative depth
        res = self.client.post("/api/v1/assistant/report", json={"latitude": 0.0, "longitude": 0.0, "depth": -10.0})
        self.assertEqual(res.status_code, 422)

    @patch.object(gemini_service, "_get_client")
    def test_generate_report_deterministic_fallback_on_gemini_error(self, mock_get_client):
        """Verify 4-part deterministic scientific fallback when Gemini is unavailable or errors out."""
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("SSL connection failure or quota exceeded")
        mock_get_client.return_value = mock_client

        payload = {
            "question": "What is the physical oceanographic state?",
            "latitude": 15.0,
            "longitude": 68.0,
            "depth": 0.0,
        }
        response = self.client.post("/api/v1/assistant/report", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        interp = data["scientific_interpretation"]
        self.assertIn("1. What the Measurements Show", interp)
        self.assertIn("2. Scientific Relevance", interp)
        self.assertIn("3. Plausible Physical Processes", interp)
        self.assertIn("4. Explicit Caveats", interp)


    def test_get_depth_profile_endpoint(self):
        """Verify multi-depth vertical sounding query."""
        response = self.client.get("/api/v1/assistant/depth-profile?latitude=19.0760&longitude=72.8777")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("levels", data)
        self.assertIn("total_levels", data)
        self.assertGreaterEqual(data["total_levels"], 0)


    @patch.object(gemini_service, "_get_client")
    def test_mock_gemini_ssl_eof_error_recovery(self, mock_get_client):
        """Verify graceful recovery and preserved telemetry when Gemini encounters an SSL EOF error."""
        import ssl
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = ssl.SSLEOFError(
            "EOF occurred in violation of protocol (_ssl.c:1000)"
        )
        mock_get_client.return_value = mock_client

        payload = {
            "question": "What is the water temperature here?",
            "latitude": 15.0,
            "longitude": 70.0,
        }
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Telemetry must be preserved
        self.assertIn("data_context", data)
        self.assertIn("temperature", data["data_context"])
        self.assertIn("sources", data)

        # Honest error reporting — no fabricated AI answer
        self.assertIn("Deterministic Scientific Fallback (Connection Error (SSL / Transport))", data["metadata"]["model"])
        self.assertIn("AI Synthesis Unavailable (Connection Error (SSL / Transport))", data["answer"])
        self.assertIn("UNEXPECTED_EOF_WHILE_READING", data["answer"])
        self.assertTrue(any("Retry" in n for n in data["notices"]))

    @patch.object(gemini_service, "_get_client")
    def test_mock_gemini_auth_error_recovery(self, mock_get_client):
        """Verify graceful handling and categorization when Gemini encounters an authentication error."""
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("401 API_KEY_INVALID: User API key not valid")
        mock_get_client.return_value = mock_client

        payload = {
            "question": "Explain salinity here",
            "latitude": 15.0,
            "longitude": 70.0,
        }
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("Authentication Error", data["metadata"]["model"])
        self.assertIn("AI Synthesis Unavailable (Authentication Error)", data["answer"])
        self.assertIn("GEMINI_API_KEY", data["answer"])

    @patch.object(gemini_service, "_get_client")
    def test_mock_gemini_quota_error_recovery(self, mock_get_client):
        """Verify graceful handling and categorization when Gemini encounters a quota error."""
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = Exception("429 RESOURCE_EXHAUSTED: Quota exceeded")
        mock_get_client.return_value = mock_client

        payload = {
            "question": "Explain currents here",
            "latitude": 15.0,
            "longitude": 70.0,
        }
        response = self.client.post("/api/v1/assistant/chat", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertIn("Quota / Rate Limit Exceeded", data["metadata"]["model"])
        self.assertIn("AI Synthesis Unavailable (Quota / Rate Limit Exceeded)", data["answer"])


    def test_depth_profile_former_422_case_lat_lon(self):
        """Verify the exact former 422 failure case (?lat=13.29&lon=72.22) now succeeds with 200."""
        response = self.client.get("/api/v1/assistant/depth-profile?lat=13.29&lon=72.22")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertAlmostEqual(data["latitude"], 13.29, places=2)
        self.assertAlmostEqual(data["longitude"], 72.22, places=2)
        self.assertIn("levels", data)
        self.assertGreater(data["total_levels"], 0)
        self.assertTrue(data.get("has_valid_data", True))
        first_level = data["levels"][0]
        self.assertIn("depth_m", first_level)
        self.assertIn("temperature_c", first_level)
        self.assertIn("salinity_psu", first_level)
        self.assertIn("current_speed_m_s", first_level)

    def test_depth_profile_full_names_latitude_longitude(self):
        """Verify depth profile query with full latitude and longitude query parameters."""
        response = self.client.get("/api/v1/assistant/depth-profile?latitude=13.29&longitude=72.22")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["source"], "INCOIS")
        self.assertEqual(data["dataset"], "INCOIS_RSMC_HYCOM")
        self.assertIsNotNone(data["model_time"])

    def test_depth_profile_missing_params_clean_422(self):
        """Verify missing parameters return clean, informative 422 message."""
        response = self.client.get("/api/v1/assistant/depth-profile")
        self.assertEqual(response.status_code, 422)
        data = response.json()
        self.assertIn("Both latitude and longitude parameters are required", data["detail"])

    def test_depth_profile_out_of_bounds_422(self):
        """Verify out-of-range coordinates return clean 422 error."""
        res_lat = self.client.get("/api/v1/assistant/depth-profile?lat=95.0&lon=72.0")
        self.assertEqual(res_lat.status_code, 422)
        self.assertIn("Latitude 95.0 is outside valid geographic range", res_lat.json()["detail"])

        res_lon = self.client.get("/api/v1/assistant/depth-profile?lat=15.0&lon=195.0")
        self.assertEqual(res_lon.status_code, 422)
        self.assertIn("Longitude 195.0 is outside valid geographic range", res_lon.json()["detail"])

    @patch("app.services.gemini_service.gemini_service.generate_comparison_analysis")
    @patch("app.services.ocean_research_service.ocean_research_service.gather_context")
    def test_location_comparison_delta_direction_and_velocity_ratio(self, mock_gather, mock_analysis):
        """Verify Delta = Location B - Location A, velocity ratio = B / A, and top-level fields."""
        mock_analysis.return_value = "Mock comparative analysis"
        mock_gather.side_effect = [
            {
                "latitude": 15.0,
                "longitude": 65.0,
                "depth_meters": 0.0,
                "parameters": {
                    "bathymetry": {"value": 3000.0, "status": "available", "unit": "m"},
                    "temperature": {"value": 26.0, "status": "available", "unit": "°C"},
                    "salinity": {"value": 36.0, "status": "available", "unit": "PSU"},
                    "current": {"speed_m_s": 0.20, "status": "available", "unit": "m/s"},
                    "mld": {"value": 50.0, "status": "available", "unit": "m"},
                    "height": {"value": 0.35, "status": "available", "unit": "m"},
                },
                "sources": ["GEBCO", "INCOIS"],
                "timestamps": {"HYCOM": "2026-08-28T18:00:00Z"},
                "limitations": [],
                "has_data": True,
            },
            {
                "latitude": 15.0,
                "longitude": 88.0,
                "depth_meters": 0.0,
                "parameters": {
                    "bathymetry": {"value": 2000.0, "status": "available", "unit": "m"},
                    "temperature": {"value": 29.0, "status": "available", "unit": "°C"},
                    "salinity": {"value": 33.0, "status": "available", "unit": "PSU"},
                    "current": {"speed_m_s": 0.10, "status": "available", "unit": "m/s"},
                    "mld": {"value": 55.0, "status": "available", "unit": "m"},
                    "height": {"value": 0.70, "status": "available", "unit": "m"},
                },
                "sources": ["GEBCO", "INCOIS"],
                "timestamps": {"HYCOM": "2026-08-28T18:00:00Z"},
                "limitations": [],
                "has_data": True,
            },
        ]

        payload = {
            "location_a": {"latitude": 15.0, "longitude": 65.0, "depth": 0.0},
            "location_b": {"latitude": 15.0, "longitude": 88.0, "depth": 0.0},
        }
        response = self.client.post("/api/v1/assistant/compare", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        # Check top-level parameter decorators on location_a and location_b
        self.assertEqual(data["location_a"]["temperature"]["value"], 26.0)
        self.assertEqual(data["location_b"]["temperature"]["value"], 29.0)
        self.assertEqual(data["location_a"]["salinity"]["value"], 36.0)
        self.assertEqual(data["location_b"]["salinity"]["value"], 33.0)
        self.assertEqual(data["location_a"]["current"]["speed_m_s"], 0.20)
        self.assertEqual(data["location_b"]["current"]["speed_m_s"], 0.10)
        self.assertEqual(data["location_a"]["bathymetry"]["value"], 3000.0)
        self.assertEqual(data["location_b"]["bathymetry"]["value"], 2000.0)

        # Check Delta convention: Location B - Location A
        metrics = data["comparison_metrics"]
        self.assertAlmostEqual(metrics["delta_temperature_c"], 29.0 - 26.0, places=2)  # +3.0
        self.assertAlmostEqual(metrics["temperature_delta_c"], 3.0, places=2)
        self.assertAlmostEqual(metrics["delta_salinity_psu"], 33.0 - 36.0, places=2)    # -3.0
        self.assertAlmostEqual(metrics["salinity_delta_psu"], -3.0, places=2)
        self.assertAlmostEqual(metrics["bathymetry_difference_m"], 2000.0 - 3000.0, places=1) # -1000.0
        self.assertAlmostEqual(metrics["bathymetry_delta_m"], -1000.0, places=1)
        self.assertAlmostEqual(metrics["delta_current_speed_m_s"], 0.10 - 0.20, places=2) # -0.10

        # Check velocity ratio: Location B / Location A (0.10 / 0.20 = 0.5)
        self.assertAlmostEqual(metrics["current_speed_ratio"], 0.5, places=2)

    @patch("app.services.gemini_service.gemini_service.generate_comparison_analysis")
    @patch("app.services.ocean_research_service.ocean_research_service.gather_context")
    def test_location_comparison_zero_velocity_denominator(self, mock_gather, mock_analysis):
        """Verify velocity ratio is None (not infinity or error) when Location A speed is 0."""
        mock_analysis.return_value = "Analysis"
        mock_gather.side_effect = [
            {
                "latitude": 15.0,
                "longitude": 65.0,
                "depth_meters": 0.0,
                "parameters": {
                    "temperature": {"value": 26.0, "status": "available"},
                    "current": {"speed_m_s": 0.0, "status": "available"},
                },
                "sources": [],
                "timestamps": {},
                "limitations": [],
                "has_data": True,
            },
            {
                "latitude": 15.0,
                "longitude": 88.0,
                "depth_meters": 0.0,
                "parameters": {
                    "temperature": {"value": 28.0, "status": "available"},
                    "current": {"speed_m_s": 0.15, "status": "available"},
                },
                "sources": [],
                "timestamps": {},
                "limitations": [],
                "has_data": True,
            },
        ]

        payload = {
            "location_a": {"latitude": 15.0, "longitude": 65.0, "depth": 0.0},
            "location_b": {"latitude": 15.0, "longitude": 88.0, "depth": 0.0},
        }
        response = self.client.post("/api/v1/assistant/compare", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsNone(data["comparison_metrics"]["current_speed_ratio"])
        self.assertTrue(any("velocity ratio (B / A) is undefined" in lim for lim in data["limitations"]))

    @patch("app.services.gemini_service.gemini_service.generate_comparison_analysis")
    @patch("app.services.ocean_research_service.ocean_research_service.gather_context")
    def test_location_comparison_missing_data_not_zero(self, mock_gather, mock_analysis):
        """Verify missing parameters do not default to zero and deltas are None when data is missing."""
        mock_analysis.return_value = "Analysis"
        mock_gather.side_effect = [
            {
                "latitude": 15.0,
                "longitude": 65.0,
                "depth_meters": 0.0,
                "parameters": {
                    "temperature": {"value": 26.0, "status": "available"},
                    "salinity": {"value": None, "status": "unavailable"},
                },
                "sources": [],
                "timestamps": {},
                "limitations": [],
                "has_data": True,
            },
            {
                "latitude": 15.0,
                "longitude": 88.0,
                "depth_meters": 0.0,
                "parameters": {
                    "temperature": {"value": 28.0, "status": "available"},
                    "salinity": {"value": 34.0, "status": "available"},
                },
                "sources": [],
                "timestamps": {},
                "limitations": [],
                "has_data": True,
            },
        ]

        payload = {
            "location_a": {"latitude": 15.0, "longitude": 65.0, "depth": 0.0},
            "location_b": {"latitude": 15.0, "longitude": 88.0, "depth": 0.0},
        }
        response = self.client.post("/api/v1/assistant/compare", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        metrics = data["comparison_metrics"]
        self.assertAlmostEqual(metrics["delta_temperature_c"], 2.0, places=2)
        # Salinity delta must be None (NOT 34 - 0 = 34!)
        self.assertIsNone(metrics["delta_salinity_psu"])
        self.assertIsNone(metrics["salinity_delta_psu"])


if __name__ == "__main__":
    unittest.main()



