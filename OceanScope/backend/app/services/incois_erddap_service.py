"""
INCOIS ERDDAP Machine-Readable Data Access Provider
Queries https://erddap.incois.gov.in/erddap/tabledap/Indian_ARGO_Floats.json
Performs automated Quality Control (QC) filtering and physical range validation.
"""

import json
import urllib.request
import urllib.parse
import ssl
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from app.core.config import settings
from app.core.quality_control import validate_temperature, validate_salinity, is_fill_value
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
        Retrieves real INCOIS Argo Float surface observations with scientific QC filtering.
        """
        fields = "PLATFORM_NUMBER,CYCLE_NUMBER,latitude,longitude,time,PRES,TEMP,PSAL"
        constraints = [
            f"latitude>={min_lat}",
            f"latitude<={max_lat}",
            f"longitude>={min_lon}",
            f"longitude<={max_lon}",
            "PRES<=15",  # Surface / upper layer focus
        ]

        if platform_number:
            constraints.append(f'PLATFORM_NUMBER="{platform_number}"')

        encoded_query = f"{fields}&" + "&".join(
            [urllib.parse.quote(c, safe='=') for c in constraints]
        )
        endpoint = f"{self.base_url}/tabledap/{self.dataset_id}.json?{encoded_query}"

        raw_data = self._fetch_erddap_json(endpoint)
        rows = raw_data.get("table", {}).get("rows", [])

        seen_platforms: Dict[str, ArgoObservationItem] = {}
        qc_pass_count = 0
        qc_fail_count = 0

        for row in rows:
            p_num, cycle, lat, lon, time_str, pres, temp, psal = row

            cleaned_temp, temp_status = validate_temperature(temp)
            cleaned_saln, saln_status = validate_salinity(psal)

            # Skip if both critical variables fail physical range
            if temp_status == "REJECTED" and saln_status == "REJECTED":
                qc_fail_count += 1
                continue

            qc_pass_count += 1
            item = ArgoObservationItem(
                platform_number=str(p_num),
                cycle_number=int(cycle),
                latitude=float(lat),
                longitude=float(lon),
                timestamp=str(time_str),
                pressure=float(pres) if not is_fill_value(pres) else None,
                temperature=cleaned_temp,
                salinity=cleaned_saln,
                qc_flag=1 if (temp_status == "PASSED" and saln_status == "PASSED") else 2,
                qc_status="PASSED" if (temp_status == "PASSED" and saln_status == "PASSED") else "FLAGGED",
            )
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
            valid_count=len(obs_list),
            missing_count=qc_fail_count,
            qc_pass_count=qc_pass_count,
            qc_fail_count=qc_fail_count,
            observations=obs_list,
        )

    async def get_argo_profile(
        self, platform_number: str, cycle_number: int
    ) -> ArgoProfileResponse:
        """
        Retrieves real vertical depth/pressure profile for a float platform and cycle with QC validation.
        """
        fields = "PLATFORM_NUMBER,CYCLE_NUMBER,latitude,longitude,time,PRES,TEMP,PSAL"
        constraints = [
            f'PLATFORM_NUMBER="{platform_number}"',
            f'CYCLE_NUMBER={cycle_number}',
        ]

        encoded_query = f"{fields}&" + "&".join(
            [urllib.parse.quote(c, safe='=') for c in constraints]
        )
        endpoint = f"{self.base_url}/tabledap/{self.dataset_id}.json?{encoded_query}"

        raw_data = self._fetch_erddap_json(endpoint)
        rows = raw_data.get("table", {}).get("rows", [])

        profile_levels: List[ArgoProfileLevelItem] = []
        lat, lon, time_str = None, None, None
        qc_pass_count = 0
        qc_fail_count = 0

        for row in rows:
            p_num, cycle, row_lat, row_lon, r_time, pres, temp, psal = row
            if lat is None:
                lat, lon, time_str = row_lat, row_lon, r_time

            if is_fill_value(pres):
                qc_fail_count += 1
                continue

            cleaned_temp, temp_status = validate_temperature(temp)
            cleaned_saln, saln_status = validate_salinity(psal)

            if temp_status == "REJECTED" and saln_status == "REJECTED":
                qc_fail_count += 1
                continue

            qc_pass_count += 1
            profile_levels.append(
                ArgoProfileLevelItem(
                    pressure=round(float(pres), 1),
                    temperature=cleaned_temp,
                    salinity=cleaned_saln,
                    qc_flag=1 if (temp_status == "PASSED" and saln_status == "PASSED") else 2,
                    qc_status="PASSED" if (temp_status == "PASSED" and saln_status == "PASSED") else "FLAGGED",
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
            valid_count=len(profile_levels),
            missing_count=qc_fail_count,
            qc_pass_count=qc_pass_count,
            qc_fail_count=qc_fail_count,
            profile=profile_levels,
        )

    # Model query methods — not applicable for observation-only provider
    def get_model_point(self, latitude, longitude, depth=0.0, variable="temperature", time_str=None):
        raise NotImplementedError("INCOISErddapProvider provides in-situ observations, not model outputs.")

    def get_model_profile(self, latitude, longitude, time_str=None):
        raise NotImplementedError("INCOISErddapProvider provides in-situ observations, not model outputs.")

    def get_model_current(self, latitude, longitude, depth=0.0, time_str=None):
        raise NotImplementedError("INCOISErddapProvider provides in-situ observations, not model outputs.")
