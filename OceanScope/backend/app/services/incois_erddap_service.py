"""
INCOIS ERDDAP Machine-Readable Data Access Provider
Queries https://erddap.incois.gov.in/erddap/tabledap/Indian_ARGO_Floats.json
"""

import json
import urllib.request
import urllib.parse
import ssl
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.schemas.ocean_schemas import (
    ArgoObservationItem,
    ArgoObservationResponse,
    ArgoProfileLevelItem,
    ArgoProfileResponse,
)
from app.services.ocean_provider import OceanDataProvider


class INCOISErddapProvider(OceanDataProvider):
    def __init__(self):
        self.base_url = settings.INCOIS_ERDDAP_BASE_URL.rstrip('/')
        self.dataset_id = settings.INCOIS_DATASET_ID
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE

    def _fetch_erddap_json(self, url: str) -> Dict[str, Any]:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "OceanScope-Research-Platform/1.0",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(
            req, context=self.ssl_context, timeout=settings.HTTP_TIMEOUT_SECONDS
        ) as resp:
            data = resp.read().decode("utf-8")
            return json.loads(data)

    async def get_argo_observations(
        self,
        min_lat: float = 0.0,
        max_lat: float = 30.0,
        min_lon: float = 40.0,
        max_lon: float = 110.0,
        platform_number: Optional[str] = None,
        limit: int = 100,
    ) -> ArgoObservationResponse:
        """
        Retrieves real INCOIS Argo Float surface/near-surface observations constrained spatially
        """
        fields = "PLATFORM_NUMBER,CYCLE_NUMBER,latitude,longitude,time,PRES,TEMP,PSAL"
        constraints = [
            f"latitude>={min_lat}",
            f"latitude<={max_lat}",
            f"longitude>={min_lon}",
            f"longitude<={max_lon}",
            "PRES<=15", # Surface / upper layer focus for 3D globe markers
        ]

        if platform_number:
            constraints.append(f'PLATFORM_NUMBER="{platform_number}"')

        encoded_query = f"{fields}&" + "&".join(
            [urllib.parse.quote(c, safe='="') for c in constraints]
        )
        endpoint = f"{self.base_url}/tabledap/{self.dataset_id}.json?{encoded_query}"

        raw_data = self._fetch_erddap_json(endpoint)
        rows = raw_data.get("table", {}).get("rows", [])

        # Deduplicate to find latest distinct platform cycles
        seen_platforms: Dict[str, ArgoObservationItem] = {}
        for row in rows:
            p_num, cycle, lat, lon, time_str, pres, temp, psal = row

            # Filter obvious fill / invalid sentinel values (-999, 99999, None)
            if temp is not None and (temp < -2.0 or temp > 40.0):
                continue
            if psal is not None and (psal < 10.0 or psal > 45.0):
                continue

            item = ArgoObservationItem(
                platform_number=str(p_num),
                cycle_number=int(cycle),
                latitude=float(lat),
                longitude=float(lon),
                timestamp=str(time_str),
                pressure=float(pres) if pres is not None else None,
                temperature=float(temp) if temp is not None else None,
                salinity=float(psal) if psal is not None else None,
            )
            # Store or update float item
            seen_platforms[str(p_num)] = item
            if len(seen_platforms) >= limit:
                break

        obs_list = list(seen_platforms.values())

        return ArgoObservationResponse(
            source="INCOIS",
            dataset=self.dataset_id,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            data_time_range="Indian Ocean ARGO Array Operational Series",
            is_live_data=True,
            count=len(obs_list),
            observations=obs_list,
        )

    async def get_argo_profile(
        self, platform_number: str, cycle_number: int
    ) -> ArgoProfileResponse:
        """
        Retrieves real vertical depth/pressure profile for a float platform and cycle
        """
        fields = "PLATFORM_NUMBER,CYCLE_NUMBER,latitude,longitude,time,PRES,TEMP,PSAL"
        constraints = [
            f'PLATFORM_NUMBER="{platform_number}"',
            f'CYCLE_NUMBER={cycle_number}',
        ]

        encoded_query = f"{fields}&" + "&".join(
            [urllib.parse.quote(c, safe='="') for c in constraints]
        )
        endpoint = f"{self.base_url}/tabledap/{self.dataset_id}.json?{encoded_query}"

        raw_data = self._fetch_erddap_json(endpoint)
        rows = raw_data.get("table", {}).get("rows", [])

        profile_levels: List[ArgoProfileLevelItem] = []
        lat, lon, time_str = None, None, None

        for row in rows:
            p_num, cycle, row_lat, row_lon, r_time, pres, temp, psal = row
            if lat is None:
                lat, lon, time_str = row_lat, row_lon, r_time

            # Skip invalid level readings
            if pres is None or (temp is not None and (temp < -2.0 or temp > 40.0)):
                continue

            profile_levels.append(
                ArgoProfileLevelItem(
                    pressure=float(pres),
                    temperature=float(temp) if temp is not None else None,
                    salinity=float(psal) if psal is not None else None,
                )
            )

        # Sort profile by increasing pressure depth
        profile_levels.sort(key=lambda x: x.pressure)

        return ArgoProfileResponse(
            source="INCOIS",
            dataset=self.dataset_id,
            platform_number=str(platform_number),
            cycle_number=int(cycle_number),
            latitude=float(lat) if lat is not None else None,
            longitude=float(lon) if lon is not None else None,
            timestamp=str(time_str) if time_str else None,
            retrieved_at=datetime.now(timezone.utc).isoformat(),
            is_live_data=True,
            profile=profile_levels,
        )

    # Model query methods — not applicable for observation-only provider
    def get_model_point(self, latitude, longitude, depth=0.0, variable="temperature", time_str=None):
        raise NotImplementedError("INCOISErddapProvider provides in-situ observations, not model outputs.")

    def get_model_profile(self, latitude, longitude, time_str=None):
        raise NotImplementedError("INCOISErddapProvider provides in-situ observations, not model outputs.")

    def get_model_current(self, latitude, longitude, depth=0.0, time_str=None):
        raise NotImplementedError("INCOISErddapProvider provides in-situ observations, not model outputs.")

