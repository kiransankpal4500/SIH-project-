# INCOIS HYCOM Model API Endpoints

Base URL: `http://localhost:8000/api/v1`

---

## GET /models/hycom/metadata

**Description**: Returns metadata and variable mapping for the active INCOIS HYCOM NetCDF dataset.

**Response**:
```json
{
  "source": "INCOIS",
  "model": "HYCOM",
  "dataset": "INCOIS_RSMC_HYCOM",
  "filename": "incois_hycom_daily_latest.nc",
  "is_available": true,
  "dimensions": {"time": 3, "depth": 14, "latitude": 81, "longitude": 141},
  "discovered_variables": ["water_temp", "salinity", "water_u", "water_v", "surf_el", "mld"],
  "mapped_variables": {
    "temperature": "water_temp",
    "salinity": "salinity",
    "current_u": "water_u",
    "current_v": "water_v",
    "ssh": "surf_el",
    "mld": "mld"
  },
  "time_range": ["2026-08-26T00:00:00Z", "2026-08-27T00:00:00Z", "2026-08-28T00:00:00Z"],
  "depth_levels": [0.0, 5.0, 10.0, 20.0, 30.0, 50.0, 75.0, 100.0, 150.0, 200.0, 300.0, 500.0, 750.0, 1000.0],
  "lat_min": -10.0,
  "lat_max": 30.0,
  "lon_min": 40.0,
  "lon_max": 110.0
}
```

---

## GET /models/hycom/point

**Description**: Extract a single model variable value at a specified location using nearest-neighbor grid matching.

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `latitude` | float | Yes | — | Latitude (-90 to 90) |
| `longitude` | float | Yes | — | Longitude (-180 to 180) |
| `depth` | float | No | 0.0 | Depth in meters |
| `variable` | string | No | `temperature` | Variable name |
| `time` | string | No | latest | ISO 8601 timestamp |

**Response**:
```json
{
  "source": "INCOIS",
  "model": "HYCOM",
  "dataset": "INCOIS_RSMC_HYCOM",
  "retrieved_at": "2026-08-28T07:05:00Z",
  "latitude": 12.5,
  "longitude": 75.0,
  "depth": 10.0,
  "time": "2026-08-28T00:00:00Z",
  "model_time": "2026-08-28T00:00:00Z",
  "variable": "temperature",
  "value": 28.9509,
  "unit": "degC"
}
```

---

## GET /models/hycom/profile

**Description**: Fetch vertical depth profile (temperature, salinity, u-current, v-current vs depth) at a specified location.

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `latitude` | float | Yes | — | Latitude |
| `longitude` | float | Yes | — | Longitude |
| `time` | string | No | latest | ISO 8601 timestamp |

**Response**: Array of `{depth, temperature, salinity, current_u, current_v}` for each available depth level.

---

## GET /models/hycom/current

**Description**: Fetch ocean current vector (u, v) and compute speed (`sqrt(u²+v²)`) and direction.

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `latitude` | float | Yes | — | Latitude |
| `longitude` | float | Yes | — | Longitude |
| `depth` | float | No | 0.0 | Depth in meters |
| `time` | string | No | latest | ISO 8601 timestamp |

**Response**:
```json
{
  "u": 0.4167,
  "v": 0.1315,
  "speed": 0.437,
  "direction": 72.48,
  "unit": "m/s"
}
```

---

## GET /models/hycom/compare-argo

**Description**: Compare real INCOIS Argo float observations with corresponding INCOIS HYCOM model outputs.

**Parameters**:
| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `platform_number` | string | Yes | — | Argo float platform ID |
| `cycle_number` | int | No | 1 | Argo float cycle number |

**Response**: Includes spatial offset (km), time offset (hours), profile comparison table, and error metrics (Bias, RMSE, MAE) for temperature and salinity.
