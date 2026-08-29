"""
Ocean Data Service Layer for FastAPI Backend
"""

from typing import List
from app.schemas.ocean_schemas import (
    ObservationSchema,
    OceanProfileSchema,
    DisasterIndicatorSchema,
    OceanSystemStatsSchema,
    OceanModelSchema,
)


class OceanService:
    @staticmethod
    def get_system_stats() -> OceanSystemStatsSchema:
        return OceanSystemStatsSchema(
            activePlatformsCount=142,
            modelOutputDate="2026-08-28 06:00 UTC",
            avgSeaSurfaceTemp=28.4,
            avgSalinity=34.8,
            activeAlertsCount=2,
            coverageRegion="Indian Ocean & Arabian Sea",
        )

    @staticmethod
    def get_observations() -> List[ObservationSchema]:
        return [
            ObservationSchema(
                id="obs-001",
                platformId="ARGO-2901452",
                platformType="ARGO_FLOAT",
                source="ARGO",
                location={"latitude": 10.45, "longitude": 72.82, "depth": 5, "regionName": "Arabian Sea"},
                timestamp="2026-08-28T04:12:00Z",
                variables={"temperature": 29.1, "salinity": 35.2, "currentSpeed": 0.45},
                status="ACTIVE",
            ),
            ObservationSchema(
                id="obs-002",
                platformId="INCOIS-MB-04",
                platformType="MOORED_BUOY",
                source="INCOIS",
                location={"latitude": 13.08, "longitude": 80.27, "depth": 0, "regionName": "Bay of Bengal"},
                timestamp="2026-08-28T05:30:00Z",
                variables={"temperature": 28.8, "salinity": 33.6, "chlorophyll": 1.45, "currentSpeed": 0.78, "seaSurfaceHeight": 0.12},
                status="ACTIVE",
            ),
        ]

    @staticmethod
    def get_profile(platform_id: str) -> OceanProfileSchema:
        return OceanProfileSchema(
            id=f"profile-{platform_id}",
            platformId=platform_id,
            location={"latitude": 10.45, "longitude": 72.82, "depth": 0, "regionName": "Arabian Sea"},
            timestamp="2026-08-28T04:12:00Z",
            depthLevels=[0, 10, 25, 50, 100, 200, 500, 1000],
            temperatureProfile=[29.1, 28.9, 27.4, 23.1, 17.5, 11.2, 7.4, 4.8],
            salinityProfile=[35.2, 35.2, 35.4, 35.6, 35.1, 34.8, 34.9, 34.8],
            chlorophyllProfile=[1.2, 1.4, 0.9, 0.3, 0.05, 0.0, 0.0, 0.0],
        )

    @staticmethod
    def get_disasters() -> List[DisasterIndicatorSchema]:
        return [
            DisasterIndicatorSchema(
                id="alert-mhw-01",
                title="Category II Marine Heatwave",
                type="MARINE_HEATWAVE",
                riskLevel="HIGH",
                location={"latitude": 8.5, "longitude": 76.2, "depth": 0, "regionName": "Laccadive Sea"},
                affectedAreaSqKm=42000.0,
                detectedAt="2026-08-26T12:00:00Z",
                description="Persistent SST anomaly +2.4°C above baseline detected over 5 consecutive days.",
                trend="INCREASING",
            )
        ]

    @staticmethod
    def get_models() -> List[OceanModelSchema]:
        return [
            OceanModelSchema(
                id="hycom-glbu0.08",
                name="HYCOM Global 1/12° Analysis",
                provider="HYCOM",
                resolution="1/12° (~9 km)",
                forecastHorizonDays=7,
                lastUpdated="2026-08-28T06:00:00Z",
                supportedVariables=["temperature", "salinity", "current_velocity", "sea_surface_height"],
            )
        ]
