# OceanScope Backend Service 🌊

Python FastAPI service shell for serving ocean model outputs (HYCOM, Copernicus) and in-situ observations (INCOIS, Argo floats).

## Current Stage
> **Standby Phase** - The frontend foundation is currently being built.

## Directory Structure
- `app/api/routes/`: Endpoint definitions
- `app/core/`: Application configuration & settings
- `app/models/`: Internal domain models
- `app/schemas/`: Pydantic data validation schemas
- `app/services/`: NetCDF and spatial processing engines
- `data/`: Storage stubs for demo, argo, and netcdf outputs

## Setup (Future Step)
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
