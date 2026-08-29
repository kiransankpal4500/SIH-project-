# INCOIS HYCOM Model Data Integration

## Data Source

**Institution**: Indian National Centre for Ocean Information Services (INCOIS), MoES, Government of India  
**Model**: HYbrid Coordinate Ocean Model (HYCOM) v2.2 — Regional Indian Ocean Model  
**Reference**: https://incois.gov.in/portal/osf/osf.jsp  

## Dataset Structure

### File Format
- **Format**: NetCDF4 (CF-1.8 Conventions)
- **Storage**: `backend/data/netcdf/hycom/`
- **Naming**: `incois_hycom_daily_latest.nc`

### Dimensions

| Dimension | Size | Description |
|-----------|------|-------------|
| `time` | 3 | Valid forecast timesteps |
| `depth` | 14 | Vertical ocean depth levels (0m - 1000m) |
| `latitude` | 81 | Latitude grid (-10°N to 30°N) |
| `longitude` | 141 | Longitude grid (40°E to 110°E) |

### Depth Levels (meters)
`0.0, 5.0, 10.0, 20.0, 30.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0`

### Variables

| NetCDF Variable | OceanScope Internal | Standard Name | Units | Dims |
|----------------|---------------------|---------------|-------|------|
| `water_temp` | `temperature` | `sea_water_temperature` | degC | 4D (time, depth, lat, lon) |
| `salinity` | `salinity` | `sea_water_salinity` | PSU | 4D |
| `water_u` | `current_u` | `eastward_sea_water_velocity` | m/s | 4D |
| `water_v` | `current_v` | `northward_sea_water_velocity` | m/s | 4D |
| `surf_el` | `ssh` | `sea_surface_height_above_geoid` | m | 3D (time, lat, lon) |
| `mld` | `mld` | `ocean_mixed_layer_thickness` | m | 3D |

## Variable Name Mapping

OceanScope does **not** hardcode NetCDF variable names. The `hycom_service.py` inspects:
1. `ds.dims` — maps dimension names by fuzzy matching (`lat`, `latitude`, `nav_lat`, etc.)
2. `ds.data_vars` — maps variables using `long_name`, `standard_name`, and variable name patterns

This allows future INCOIS HYCOM dataset versions with different variable naming to work without code changes.

## Spatial Matching

**Method**: Nearest-neighbor grid point matching via `xarray.sel(method="nearest")`

- Argo float coordinates are matched to the closest HYCOM grid cell
- The **Haversine formula** computes the geographic distance in km between observation and model grid point
- Both `model_latitude`, `model_longitude` and `observation_latitude`, `observation_longitude` are returned in every response
- Typical offset: 0-15 km depending on grid resolution

## Time Matching

**Method**: Nearest available model timestep via `xarray.sel(method="nearest")`

- HYCOM model forecasts are available at daily resolution
- If no explicit time is requested, the **latest available** model timestep is used
- Time difference in hours is computed: `abs(model_time - observation_time)`
- Both `model_time` and `observation_time` are returned in every response
- Tolerance: No hard cutoff applied; metadata clearly indicates the time offset

## Data Flow

```
INCOIS RSMC HYCOM NetCDF (.nc)
        │
        ▼
  xarray.open_dataset()
        │
        ▼
  INCOISHYCOMService._inspect_and_map_metadata()
        │  (discovers dims & variables dynamically)
        ▼
  INCOISHYCOMService.get_point() / get_profile() / get_current()
        │  (nearest-neighbor spatial/temporal selection)
        ▼
  Pydantic Schema (OceanModelPoint / OceanModelProfile / OceanModelCurrent)
        │
        ▼
  FastAPI Endpoint (/api/v1/models/hycom/*)
        │
        ▼
  React Frontend (hycomApi.ts → OceanContext → Components)
```
