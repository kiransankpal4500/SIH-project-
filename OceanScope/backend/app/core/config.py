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

    # INCOIS ERDDAP Configuration
    INCOIS_ERDDAP_BASE_URL: str = os.getenv(
        "INCOIS_ERDDAP_BASE_URL", "https://erddap.incois.gov.in/erddap/"
    )
    INCOIS_DATASET_ID: str = "Indian_ARGO_Floats"
    HTTP_TIMEOUT_SECONDS: int = int(os.getenv("HTTP_TIMEOUT_SECONDS", "10"))
    CACHE_EXPIRATION_SECONDS: int = int(os.getenv("CACHE_EXPIRATION_SECONDS", "600"))

    # HYCOM NetCDF Model Storage Configuration
    # In production container, default to persistent volume mount /data/hycom
    HYCOM_DATA_DIRECTORY: str = os.getenv(
        "HYCOM_DATA_DIRECTORY",
        "/data/hycom" if os.path.exists("/data/hycom") else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "netcdf", "hycom")
    )

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))


settings = Settings()
