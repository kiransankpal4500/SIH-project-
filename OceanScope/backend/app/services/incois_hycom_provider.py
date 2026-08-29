"""
INCOIS HYCOM Provider implementation extending OceanDataProvider abstract base class.
"""

from typing import Optional
from app.services.ocean_provider import OceanDataProvider
from app.services.hycom_service import hycom_service
from app.schemas.ocean_schemas import ArgoObservationResponse, ArgoProfileResponse
from app.schemas.hycom_schemas import OceanModelPoint, OceanModelProfile, OceanModelCurrent


class INCOISHYCOMProvider(OceanDataProvider):
    async def get_argo_observations(
        self,
        min_lat: float = 0.0,
        max_lat: float = 30.0,
        min_lon: float = 40.0,
        max_lon: float = 110.0,
        platform_number: Optional[str] = None,
        limit: int = 100,
    ) -> ArgoObservationResponse:
        raise NotImplementedError("INCOISHYCOMProvider provides numerical model outputs, not Argo observations.")

    async def get_argo_profile(
        self, platform_number: str, cycle_number: int
    ) -> ArgoProfileResponse:
        raise NotImplementedError("INCOISHYCOMProvider provides numerical model outputs, not Argo observations.")

    def get_model_point(
        self, latitude: float, longitude: float, depth: float = 0.0, variable: str = "temperature", time_str: Optional[str] = None
    ) -> OceanModelPoint:
        return hycom_service.get_point(latitude=latitude, longitude=longitude, depth=depth, variable=variable, time_str=time_str)

    def get_model_profile(
        self, latitude: float, longitude: float, time_str: Optional[str] = None
    ) -> OceanModelProfile:
        return hycom_service.get_profile(latitude=latitude, longitude=longitude, time_str=time_str)

    def get_model_current(
        self, latitude: float, longitude: float, depth: float = 0.0, time_str: Optional[str] = None
    ) -> OceanModelCurrent:
        return hycom_service.get_current(latitude=latitude, longitude=longitude, depth=depth, time_str=time_str)
