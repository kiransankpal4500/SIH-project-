"""
Argo Service with In-Memory TTL Caching & Demo Mode Fallback
"""

import time
import logging
from typing import Optional, Dict, Tuple, Any
from datetime import datetime, timezone
from app.core.config import settings
from app.schemas.ocean_schemas import (
    ArgoObservationItem,
    ArgoObservationResponse,
    ArgoProfileLevelItem,
    ArgoProfileResponse,
)
from app.services.incois_erddap_service import INCOISErddapProvider

logger = logging.getLogger("oceanscope.argo")


class ArgoService:
    def __init__(self):
        self.provider = INCOISErddapProvider()
        # In-memory TTL cache: key -> (timestamp, data)
        self._cache: Dict[str, Tuple[float, Any]] = {}

    def _get_cache(self, key: str) -> Optional[Any]:
        if key in self._cache:
            created_at, data = self._cache[key]
            if time.time() - created_at < settings.CACHE_EXPIRATION_SECONDS:
                return data
            del self._cache[key]
        return None

    def _set_cache(self, key: str, data: Any) -> None:
        self._cache[key] = (time.time(), data)

    async def get_argo_observations(
        self,
        min_lat: float = 0.0,
        max_lat: float = 30.0,
        min_lon: float = 40.0,
        max_lon: float = 110.0,
        platform_number: Optional[str] = None,
        limit: int = 100,
    ) -> ArgoObservationResponse:
        cache_key = f"obs_{min_lat}_{max_lat}_{min_lon}_{max_lon}_{platform_number}_{limit}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        try:
            res = await self.provider.get_argo_observations(
                min_lat, max_lat, min_lon, max_lon, platform_number, limit
            )
            if res.count > 0:
                self._set_cache(cache_key, res)
                return res
        except Exception as err:
            logger.warning(f"INCOIS ERDDAP request failed or timed out: {err}. Falling back to demo data.")

        # Fallback to local demonstration Argo dataset
        fallback_res = self._get_demo_observations()
        return fallback_res

    async def get_argo_profile(
        self, platform_number: str, cycle_number: int
    ) -> ArgoProfileResponse:
        cache_key = f"profile_{platform_number}_{cycle_number}"
        cached = self._get_cache(cache_key)
        if cached:
            return cached

        try:
            res = await self.provider.get_argo_profile(platform_number, cycle_number)
            if len(res.profile) > 0:
                self._set_cache(cache_key, res)
                return res
        except Exception as err:
            logger.warning(f"INCOIS ERDDAP profile request failed for float {platform_number}: {err}")

        # Fallback to demo profile data
        return self._get_demo_profile(platform_number, cycle_number)

    def _get_demo_observations(self) -> ArgoObservationResponse:
        demo_items = [
            ArgoObservationItem(
                platform_number="2901452",
                cycle_number=12,
                latitude=10.45,
                longitude=72.82,
                timestamp="2026-08-28T04:12:00Z",
                pressure=5.0,
                temperature=29.1,
                salinity=35.2,
            ),
            ArgoObservationItem(
                platform_number="2901889",
                cycle_number=45,
                latitude=13.08,
                longitude=80.27,
                timestamp="2026-08-28T05:30:00Z",
                pressure=3.2,
                temperature=28.8,
                salinity=33.6,
            ),
            ArgoObservationItem(
                platform_number="1900121",
                cycle_number=1,
                latitude=-9.85,
                longitude=55.95,
                timestamp="2026-08-28T02:00:00Z",
                pressure=5.5,
                temperature=27.38,
                salinity=35.37,
            ),
        ]
        return ArgoObservationResponse(
            source="DEMO_FALLBACK",
            dataset="Local_Demo_Dataset",
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            data_time_range="Demonstration dataset",
            is_live_data=False,
            count=len(demo_items),
            observations=demo_items,
        )

    def _get_demo_profile(
        self, platform_number: str, cycle_number: int
    ) -> ArgoProfileResponse:
        demo_levels = [
            ArgoProfileLevelItem(pressure=0.0, temperature=29.1, salinity=35.2),
            ArgoProfileLevelItem(pressure=10.0, temperature=28.9, salinity=35.2),
            ArgoProfileLevelItem(pressure=25.0, temperature=27.4, salinity=35.4),
            ArgoProfileLevelItem(pressure=50.0, temperature=23.1, salinity=35.6),
            ArgoProfileLevelItem(pressure=100.0, temperature=17.5, salinity=35.1),
            ArgoProfileLevelItem(pressure=200.0, temperature=11.2, salinity=34.8),
            ArgoProfileLevelItem(pressure=500.0, temperature=7.4, salinity=34.9),
            ArgoProfileLevelItem(pressure=1000.0, temperature=4.8, salinity=34.8),
        ]
        return ArgoProfileResponse(
            source="DEMO_FALLBACK",
            dataset="Local_Demo_Dataset",
            platform_number=platform_number,
            cycle_number=cycle_number,
            latitude=10.45,
            longitude=72.82,
            timestamp="2026-08-28T04:12:00Z",
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            is_live_data=False,
            profile=demo_levels,
        )


argo_service = ArgoService()
