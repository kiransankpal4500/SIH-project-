"""
OceanScope Backend Core Configuration Settings
"""

import os


class Settings:
    PROJECT_NAME: str = "OceanScope API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    DESCRIPTION: str = "Scientific Ocean Model Outputs & INCOIS Real Telemetry Service"
    DEBUG: bool = True

    # INCOIS ERDDAP Configuration
    INCOIS_ERDDAP_BASE_URL: str = os.getenv(
        "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap/"
    )
    INCOIS_DATASET_ID: str = "Indian_ARGO_Floats"
    HTTP_TIMEOUT_SECONDS: int = 10
    CACHE_EXPIRATION_SECONDS: int = 600 # 10 minutes cache TTL

    # HYCOM NetCDF Model Storage Configuration
    HYCOM_DATA_DIRECTORY: str = os.getenv(
        "HYCOM_DATA_DIRECTORY",
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "netcdf", "hycom")
    )


settings = Settings()

