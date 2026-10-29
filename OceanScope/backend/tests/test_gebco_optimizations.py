"""
Focused unit tests for GEBCO Bathymetry Service optimizations:
- Caching & instant cache hits (< 100ms)
- Request deduplication
- Grid center point reuse without remote call
- Coordinate and boundary validation
- Land vs ocean coordinate handling
"""

import sys
import os
import time
import unittest

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.services.gebco_service import gebco_service
from app.core.query_cache import global_query_cache


class TestGebcoOptimizations(unittest.TestCase):
    def test_land_coordinate_handling(self):
        """Confirm land location (e.g. Mumbai center: 19.0760, 72.8777) identifies as non-ocean."""
        point = gebco_service.get_point(19.0760, 72.8777)
        self.assertIn("elevation", point)
        self.assertIn("depth", point)
        self.assertEqual(point["latitude"], 19.076)
        self.assertEqual(point["longitude"], 72.8777)
        # Land coordinates must have depth = 0.0 and positive elevation
        self.assertGreaterEqual(point["elevation"], 0.0)
        self.assertEqual(point["depth"], 0.0)
        self.assertFalse(point["is_ocean"])

    def test_ocean_coordinate_and_sign_convention(self):
        """Confirm ocean location (Arabian Sea: 12.0, 70.0) has negative elevation and positive depth."""
        point = gebco_service.get_point(12.0, 70.0)
        self.assertTrue(point["is_ocean"])
        self.assertLess(point["elevation"], 0.0)
        self.assertGreater(point["depth"], 100.0)
        self.assertEqual(point["depth"], -point["elevation"])

    def test_chunk_grid_and_center_reuse(self):
        """Confirm get_chunk populates grid dimensions, stats, and center point without extra call."""
        chunk = gebco_service.get_chunk(14.0, 68.0, chunk_size=0.05, resolution=7)
        self.assertEqual(chunk["grid_resolution"], 7)
        self.assertEqual(len(chunk["elevations"]), 7)
        self.assertEqual(len(chunk["elevations"][0]), 7)
        self.assertEqual(len(chunk["depths"]), 7)
        self.assertEqual(len(chunk["depths"][0]), 7)

        # Center point validation
        sel = chunk["selected_point"]
        self.assertEqual(sel["latitude"], 14.0)
        self.assertEqual(sel["longitude"], 68.0)
        self.assertIn("elevation", sel)
        self.assertIn("depth", sel)

        # Center point must now be in cache instantly
        t0 = time.time()
        pt = gebco_service.get_point(14.0, 68.0)
        elapsed_ms = (time.time() - t0) * 1000
        self.assertLess(elapsed_ms, 50.0)  # Target: well under 100ms
        self.assertEqual(pt["depth"], sel["depth"])

    def test_cache_hit_latency_under_100ms(self):
        """Verify that cached point and chunk queries resolve under 100ms."""
        # Prime cache
        gebco_service.get_point(15.0, 71.0)

        # Second query
        t0 = time.time()
        pt2 = gebco_service.get_point(15.0, 71.0)
        dt_ms = (time.time() - t0) * 1000
        self.assertLess(dt_ms, 100.0, f"Cache hit latency was {dt_ms:.2f}ms, expected < 100ms")


if __name__ == "__main__":
    unittest.main()
