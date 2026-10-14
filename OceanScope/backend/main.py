"""
OceanScope FastAPI Backend Application Entrypoint
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import observations, models, disasters, data_status, bathymetry, marine_life

# Configure structured logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("oceanscope")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.DESCRIPTION,
    version=settings.VERSION,
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware — configurable origins including Firebase production
configured_origins = (
    ["*"] if settings.CORS_ALLOWED_ORIGINS == "*"
    else [o.strip() for o in settings.CORS_ALLOWED_ORIGINS.split(",") if o.strip()]
)
firebase_production_origins = [
    "https://oceanscope-d6305.web.app",
    "https://oceanscope-d6305.firebaseapp.com",
    "https://oceanscope-b3b88.web.app",
    "https://oceanscope-b3b88.firebaseapp.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
cors_origins = list(set(
    [o for o in configured_origins if o != "*"] + firebase_production_origins
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins if cors_origins else ["*"],
    allow_origin_regex=r"https://.*" if "*" in configured_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(observations.router, prefix=settings.API_V1_STR)
app.include_router(models.router, prefix=settings.API_V1_STR)
app.include_router(disasters.router, prefix=settings.API_V1_STR)
app.include_router(data_status.router, prefix=settings.API_V1_STR)
app.include_router(bathymetry.router, prefix=settings.API_V1_STR)
app.include_router(marine_life.router, prefix=settings.API_V1_STR)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions — return safe error without exposing stack traces."""
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=settings.DEBUG)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again later."},
    )


@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs" if settings.DEBUG else "disabled",
    }


@app.get("/health")
@app.get(f"{settings.API_V1_STR}/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "api_v1": "active",
            "observations_service": "online",
            "numerical_models": "online",
            "disaster_engine": "online",
            "data_status": "online",
        },
    }


@app.on_event("startup")
async def startup_event():
    logger.info(f"OceanScope {settings.VERSION} starting on {settings.HOST}:{settings.PORT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"CORS origins: {cors_origins}")
    logger.info(f"HYCOM data directory: {settings.HYCOM_DATA_DIRECTORY}")
    logger.info(f"INCOIS ERDDAP: {settings.INCOIS_ERDDAP_BASE_URL}")
