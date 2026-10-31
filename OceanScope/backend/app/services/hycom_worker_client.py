"""
HYCOM Cloudflare Worker Integration Client
Routes ocean model queries to the oceanscope-hycom-api Cloudflare Worker.
Translates HTTP errors to OceanScope domain exceptions to preserve existing error semantics.
"""

import logging
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings
from app.schemas.hycom_schemas import (
    OceanModelProfile,
    OceanModelProfileLevel,
    OceanModelPoint,
    OceanModelMetadata,
)

logger = logging.getLogger("oceanscope.hycom_worker")


class HYCOMWorkerError(Exception):
    """Base exception for HYCOM Worker integration failures."""
    pass


class HYCOMTimeoutError(HYCOMWorkerError):
    """Raised when the upstream HYCOM service or Worker times out."""
    pass


class HYCOMGatewayError(HYCOMWorkerError):
    """Raised when unable to connect to the Worker gateway or receiving a 502 Bad Gateway."""
    pass


class HYCOMDatasetUnavailableError(HYCOMWorkerError):
    """Raised when no valid HYCOM dataset or slice is available."""
    pass


class HYCOMWorkerClient:
    def __init__(self, base_url: Optional[str] = None, timeout: Optional[float] = None):
        self.base_url = (base_url or getattr(settings, "HYCOM_WORKER_URL", "http://127.0.0.1:8787")).rstrip("/")
        self.timeout = float(timeout or getattr(settings, "HYCOM_REMOTE_TIMEOUT_SECONDS", 15))

    def get_profile(
        self,
        latitude: float,
        longitude: float,
        time_str: Optional[str] = None,
    ) -> OceanModelProfile:
        """
        Fetch full 40-depth-level vertical profile via the Cloudflare Worker.
        """
        params: Dict[str, str] = {
            "latitude": str(latitude),
            "longitude": str(longitude),
        }
        if time_str:
            params["time"] = time_str

        url = f"{self.base_url}/api/hycom/profile"
        timeout = float(getattr(settings, "HYCOM_REMOTE_TIMEOUT_SECONDS", self.timeout))
        logger.info(f"Routing HYCOM profile query to worker: {url} params={params} timeout={timeout}s")

        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.get(url, params=params)

                if resp.status_code == 200:
                    data = resp.json()
                    levels = [
                        OceanModelProfileLevel(
                            depth=lvl.get("depth", 0.0),
                            temperature=lvl.get("temperature"),
                            salinity=lvl.get("salinity"),
                            current_u=lvl.get("current_u"),
                            current_v=lvl.get("current_v"),
                        )
                        for lvl in data.get("profile", [])
                    ]
                    return OceanModelProfile(
                        source=data.get("source", "HYCOM Consortium"),
                        provider=data.get("provider", "INCOIS RSMC / HYCOM OPeNDAP"),
                        model=data.get("model", "HYCOM"),
                        dataset=data.get("dataset", "ESPC-D-V02"),
                        retrieved_at=data.get("retrieved_at", ""),
                        latitude=float(data.get("latitude", latitude)),
                        longitude=float(data.get("longitude", longitude)),
                        time=data.get("time", time_str or "latest"),
                        model_time=data.get("model_time", time_str or "latest"),
                        profile=levels,
                        selected_file=data.get("selected_file"),
                        time_difference_hours=float(data.get("time_difference_hours", 0.0)),
                    )

                # Parse error response detail
                detail = "Unknown upstream error"
                try:
                    err_json = resp.json()
                    detail = err_json.get("detail", resp.text)
                except Exception:
                    detail = resp.text or detail

                if resp.status_code == 400:
                    raise ValueError(detail)
                elif resp.status_code == 404 or resp.status_code == 503:
                    raise HYCOMDatasetUnavailableError(detail)
                elif resp.status_code == 504:
                    raise HYCOMTimeoutError(detail)
                elif resp.status_code == 502:
                    raise HYCOMGatewayError(detail)
                else:
                    raise HYCOMWorkerError(f"Worker returned HTTP {resp.status_code}: {detail}")

        except (httpx.ConnectError, httpx.ConnectTimeout) as ce:
            logger.error(f"Connection failure to HYCOM worker ({self.base_url}): {ce}")
            raise HYCOMGatewayError(f"Failed to connect to HYCOM worker gateway at {self.base_url}.")
        except httpx.TimeoutException as te:
            logger.error(f"Timeout communicating with HYCOM worker: {te}")
            raise HYCOMTimeoutError("HYCOM remote service response timed out. Please retry.")
        except (ValueError, HYCOMWorkerError):
            raise
        except Exception as e:
            logger.error(f"Unexpected error in HYCOM worker client: {e}")
            raise HYCOMWorkerError(f"Gateway failure: {str(e)}")

    def get_point(
        self,
        latitude: float,
        longitude: float,
        depth: float = 0.0,
        variable: str = "temperature",
        time_str: Optional[str] = None,
    ) -> OceanModelPoint:
        """
        Fetch single ocean measurement point via the Cloudflare Worker.
        """
        params: Dict[str, str] = {
            "latitude": str(latitude),
            "longitude": str(longitude),
            "depth": str(depth),
            "variable": variable,
        }
        if time_str:
            params["time"] = time_str

        url = f"{self.base_url}/api/hycom/point"
        timeout = float(getattr(settings, "HYCOM_REMOTE_TIMEOUT_SECONDS", self.timeout))

        try:
            with httpx.Client(timeout=timeout) as client:
                resp = client.get(url, params=params)

                if resp.status_code == 200:
                    data = resp.json()
                    return OceanModelPoint(
                        source=data.get("source", "HYCOM Consortium"),
                        provider=data.get("provider", "INCOIS RSMC / HYCOM OPeNDAP"),
                        model=data.get("model", "HYCOM"),
                        dataset=data.get("dataset", "ESPC-D-V02"),
                        retrieved_at=data.get("retrieved_at", ""),
                        latitude=float(data.get("latitude", latitude)),
                        longitude=float(data.get("longitude", longitude)),
                        depth=float(data.get("depth", depth)),
                        requested_depth=float(data.get("requested_depth", depth)),
                        time=data.get("time", time_str or "latest"),
                        model_time=data.get("model_time", time_str or "latest"),
                        variable=data.get("variable", variable),
                        value=data.get("value") if data.get("value") is not None else 0.0,
                        unit=data.get("unit", ""),
                        selected_file=data.get("selected_file"),
                        time_difference_hours=float(data.get("time_difference_hours", 0.0)),
                    )

                detail = "Unknown upstream error"
                try:
                    err_json = resp.json()
                    detail = err_json.get("detail", resp.text)
                except Exception:
                    detail = resp.text or detail

                if resp.status_code == 400:
                    raise ValueError(detail)
                elif resp.status_code in (404, 503):
                    raise HYCOMDatasetUnavailableError(detail)
                elif resp.status_code == 504:
                    raise HYCOMTimeoutError(detail)
                elif resp.status_code == 502:
                    raise HYCOMGatewayError(detail)
                else:
                    raise HYCOMWorkerError(f"Worker returned HTTP {resp.status_code}: {detail}")

        except (httpx.ConnectError, httpx.ConnectTimeout):
            raise HYCOMGatewayError(f"Failed to connect to HYCOM worker gateway at {self.base_url}.")
        except httpx.TimeoutException:
            raise HYCOMTimeoutError("HYCOM remote service response timed out. Please retry.")
        except (ValueError, HYCOMWorkerError):
            raise
        except Exception as e:
            raise HYCOMWorkerError(f"Gateway failure: {str(e)}")

    def get_metadata(self) -> OceanModelMetadata:
        """
        Fetch global HYCOM metadata via the Cloudflare Worker.
        """
        url = f"{self.base_url}/api/hycom/metadata"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    return OceanModelMetadata(**data)
                raise HYCOMWorkerError(f"Metadata endpoint returned HTTP {resp.status_code}")
        except Exception as e:
            raise HYCOMGatewayError(f"Failed to retrieve metadata from worker: {e}")


hycom_worker_client = HYCOMWorkerClient()
