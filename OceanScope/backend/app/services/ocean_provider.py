"""
Abstract Base Class for Ocean Data Providers
Allows future providers (CopernicusMarineProvider, NOAAProvider, LocalNetCDFProvider) to plug in seamlessly.
"""

from abc import ABC, abstractmethod
from typing import Optional
from app.schemas.ocean_schemas import ArgoObservationResponse, ArgoProfileResponse


class OceanDataProvider(ABC):
    @abstractmethod
    async def get_argo_observations(
        self,
        min_lat: float = 0.0,
        max_lat: float = 30.0,
        min_lon: float = 40.0,
        max_lon: float = 110.0,
        platform_number: Optional[str] = None,
        limit: int = 100,
    ) -> ArgoObservationResponse:
        pass

    @abstractmethod
    async def get_argo_profile(
        self, platform_number: str, cycle_number: int
    ) -> ArgoProfileResponse:
        pass

    @abstractmethod
    def get_model_point(
        self, latitude: float, longitude: float, depth: float = 0.0, variable: str = "temperature", time_str: Optional[str] = None
    ):
        pass

    @abstractmethod
    def get_model_profile(
        self, latitude: float, longitude: float, time_str: Optional[str] = None
    ):
        pass

    @abstractmethod
    def get_model_current(
        self, latitude: float, longitude: float, depth: float = 0.0, time_str: Optional[str] = None
    ):
        pass

