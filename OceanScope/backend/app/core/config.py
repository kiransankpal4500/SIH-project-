"""
OceanScope Backend Core Configuration Settings
All values are configurable via environment variables for production deployment.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Automatically find and load .env from backend directory or project root
_backend_dir = Path(__file__).resolve().parent.parent.parent
_env_paths = [
    _backend_dir / ".env",
    _backend_dir.parent / ".env",
]
for _env_path in _env_paths:
    if _env_path.exists():
        load_dotenv(dotenv_path=_env_path, override=False)


class Settings:
    PROJECT_NAME: str = "OceanScope API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DESCRIPTION: str = "Scientific Ocean Model Outputs & INCOIS Real Telemetry Service"

    # Copernicus Marine Service Credentials
    COPERNICUSMARINE_SERVICE_USERNAME: str = os.getenv("COPERNICUSMARINE_SERVICE_USERNAME", "")
    COPERNICUSMARINE_SERVICE_PASSWORD: str = os.getenv("COPERNICUSMARINE_SERVICE_PASSWORD", "")

    # Debug mode — disable in production
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")

    # CORS — configurable origins for production
    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", os.getenv("CORS_ORIGINS", "*"))

    # Google Gemini AI Integration Configuration (Phase 3)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

    # INCOIS ERDDAP Configuration
    INCOIS_ERDDAP_BASE_URL: str = os.getenv(
        "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap/"
    )
    INCOIS_DATASET_ID: str = "Indian_ARGO_Floats"
    HTTP_TIMEOUT_SECONDS: int = int(os.getenv("HTTP_TIMEOUT_SECONDS", "6"))
    CACHE_EXPIRATION_SECONDS: int = int(os.getenv("CACHE_EXPIRATION_SECONDS", "600"))

    # HYCOM Model Storage & Remote Data Access Configuration
    # Prioritizes local high-performance NetCDF archive (sub-second queries) with fallback capability
    HYCOM_DATA_SOURCE: str = os.getenv("HYCOM_DATA_SOURCE", "local").lower()
    # Cloudflare Worker HYCOM API Gateway
    HYCOM_WORKER_URL: str = os.getenv("HYCOM_WORKER_URL", "http://127.0.0.1:8787")
    # Historical archive: GLBy0.08/expt_93.0 (Dec 2018 – Sep 2024)
    HYCOM_REMOTE_OPENDAP_URL: str = os.getenv(
        "HYCOM_REMOTE_OPENDAP_URL", "https://tds.hycom.org/thredds/dodsC/GLBy0.08/expt_93.0"
    )
    HYCOM_DATASET_ID: str = os.getenv("HYCOM_DATASET_ID", "GLBy0.08_expt_93.0")
    # Current/recent data: ESPC-D-V02 per-variable per-year archives (Aug 2024 – Present)
    HYCOM_CURRENT_OPENDAP_BASE: str = os.getenv(
        "HYCOM_CURRENT_OPENDAP_BASE", "https://tds.hycom.org/thredds/dodsC/ESPC-D-V02"
    )
    HYCOM_CURRENT_DATASET_ID: str = os.getenv("HYCOM_CURRENT_DATASET_ID", "ESPC-D-V02")
    HYCOM_REMOTE_TIMEOUT_SECONDS: int = int(os.getenv("HYCOM_REMOTE_TIMEOUT_SECONDS", "45"))
    # In production container, default to persistent volume mount /data/hycom
    HYCOM_DATA_DIRECTORY: str = (
        next(
            (
                p for p in [
                    os.getenv("HYCOM_DATA_DIRECTORY", ""),
                    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "netcdf", "hycom"),
                    os.path.join(os.getcwd(), "OceanScope", "backend", "data", "netcdf", "hycom"),
                    os.path.join(os.getcwd(), "data", "netcdf", "hycom"),
                    "/data/hycom",
                ]
                if p and os.path.exists(p)
            ),
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "netcdf", "hycom")
        )
    )


    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))


settings = Settings()
