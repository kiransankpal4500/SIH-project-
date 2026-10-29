"""
OceanScope FastAPI Backend Application Entrypoint
"""

import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.routes import observations, models, disasters, data_status, bathymetry, marine_life, assistant

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

# Known production Firebase Hosting origins for OceanScope
FIREBASE_PRODUCTION_ORIGINS = [
    "https://oceanscope-d6305.web.app",
    "https://oceanscope-d6305.firebaseapp.com",
    "https://oceanscope-b3b88.web.app",
    "https://oceanscope-b3b88.firebaseapp.com",
]

# Development origins permitted during local development
LOCAL_DEV_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Parse configured origins from environment (excluding wildcard '*' to maintain credentials safety)
_configured = [
    o.strip()
    for o in settings.CORS_ALLOWED_ORIGINS.split(",")
    if o.strip() and o.strip() != "*"
]

# Combined CORS origin allowlist (deduplicated preserving order)
cors_origins = list(dict.fromkeys(
    FIREBASE_PRODUCTION_ORIGINS + LOCAL_DEV_ORIGINS + _configured
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https:\/\/oceanscope-[a-z0-9]+(--[\w-]+)?\.(web\.app|firebaseapp\.com)$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Register API v1 Routers
app.include_router(observations.router, prefix=settings.API_V1_STR)
app.include_router(models.router, prefix=settings.API_V1_STR)
app.include_router(disasters.router, prefix=settings.API_V1_STR)
app.include_router(data_status.router, prefix=settings.API_V1_STR)
app.include_router(bathymetry.router, prefix=settings.API_V1_STR)
app.include_router(marine_life.router, prefix=settings.API_V1_STR)
app.include_router(assistant.router, prefix=settings.API_V1_STR)


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
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    loop = asyncio.get_running_loop()
    loop.set_default_executor(ThreadPoolExecutor(max_workers=64, thread_name_prefix="asyncio_worker"))
    logger.info(f"OceanScope {settings.VERSION} starting on {settings.HOST}:{settings.PORT}")
    logger.info(f"Debug mode: {settings.DEBUG}")
    logger.info(f"CORS origins: {cors_origins}")
    logger.info(f"HYCOM data directory: {settings.HYCOM_DATA_DIRECTORY}")
    logger.info(f"INCOIS ERDDAP: {settings.INCOIS_ERDDAP_BASE_URL}")

