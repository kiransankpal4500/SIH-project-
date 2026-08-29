# OceanScope — Data Quality Control & Validation

## Overview

OceanScope applies scientific data quality control (QC) at every stage of the data pipeline:
ingestion, storage, retrieval, and cross-validation. This document describes the rules,
thresholds, and limitations.

---

## 1. Argo Observation Quality Control

### 1.1 QC Flag Standards

OceanScope follows the IOC/WMO Argo Real-Time QC standard:

| Flag | Meaning           | OceanScope Action        |
|------|--------------------|--------------------------|
| 1    | Good data          | Accept (`PASSED`)        |
| 2    | Probably good data | Accept (`PASSED`)        |
| 3    | Questionable data  | Reject (`REJECTED`)      |
| 4    | Bad data           | Reject (`REJECTED`)      |
| 9    | Missing value      | Reject (`REJECTED`)      |

Only flags 1 and 2 are treated as valid for analysis.

### 1.2 Physical Range Validation

All Argo temperature and salinity values are checked against physical oceanographic limits
**before** they enter the API response:

| Variable    | Min   | Max   | Unit |
|-------------|-------|-------|------|
| Temperature | −2.5  | 40.0  | °C   |
| Salinity    | 0.0   | 45.0  | PSU  |

Values outside these ranges are set to `null` and marked `qc_status: "REJECTED"`.

### 1.3 Fill / Missing Value Detection

The following sentinel values are treated as missing and rejected:

- `null` / `None`
- `NaN`, `Inf`, `-Inf`
- `-999.0`, `-9999.0`, `999.0`, `9999.0`
- `1e20`, `1e30`, `-1e20`, `-1e30`

### 1.4 Response Quality Metadata

Every Argo observation and profile API response includes:

```json
{
  "valid_count": 45,
  "missing_count": 3,
  "qc_pass_count": 45,
  "qc_fail_count": 3
}
```

---

## 2. HYCOM Model Data Validation

### 2.1 Coordinate Bounds

All HYCOM API requests are validated before any NetCDF access:

| Parameter | Valid Range         |
|-----------|---------------------|
| Latitude  | −90.0 to 90.0       |
| Longitude | −180.0 to 360.0     |
| Depth     | 0.0 to 6000.0 m     |

Invalid coordinates return HTTP 400 with a descriptive error message.

### 2.2 Time Validity

- Requested timestamps must parse as valid ISO 8601 or Pandas-compatible datetime strings.
- The system selects the **nearest** available model timestep; the response includes both
  `model_time` and `time_difference_hours` so consumers know the actual temporal offset.

### 2.3 Variable Existence

Supported HYCOM variables and their canonical units:

| Variable    | NetCDF Name(s)         | Unit   |
|-------------|------------------------|--------|
| temperature | `TEMP`, `temperature`  | °C     |
| salinity    | `SALN`, `salinity`     | PSU    |
| current_u   | `UVEL`, `current_u`    | m/s    |
| current_v   | `VVEL`, `current_v`    | m/s    |
| ssh         | `SSH`, `ssh`           | m      |
| mld         | `MLD`, `mld`           | m      |

Requesting an unsupported variable returns HTTP 400.

### 2.4 Fill / Missing Values in NetCDF

- xarray `_FillValue` and `missing_value` attributes are respected automatically.
- Additional sentinel detection (same list as Argo) is applied to extracted scalar values.
- If a grid point returns a fill value, the API returns `null` rather than a misleading number.

---

## 3. Canonical Unit System

All API responses use a single canonical unit system. No silent conversions occur:

| Parameter        | Canonical Unit | Notes                                |
|------------------|----------------|--------------------------------------|
| Temperature      | °C             | Absolute (not anomaly unless stated) |
| Salinity         | PSU            | Practical Salinity Units             |
| Current U / V    | m/s            | Eastward / Northward                 |
| Current Speed    | m/s            | Magnitude of (U, V)                  |
| Current Direction| degrees        | Oceanographic convention (from)      |
| SSH              | m              | Sea Surface Height anomaly           |
| MLD              | m              | Mixed Layer Depth                    |
| TCHP             | kJ/cm²         | Tropical Cyclone Heat Potential      |
| Pressure / Depth | dbar / m       | 1 dbar ≈ 1 m (standard approximation)|
| Distance         | km             | Haversine great-circle               |
| Time offset      | hours          | Absolute difference                  |

---

## 4. Model / Observation Spatial Matching

### 4.1 Method

- The HYCOM model grid point **nearest** to the Argo float position is selected using
  xarray's built-in nearest-neighbour coordinate indexing.
- The spatial offset is reported as `distance_km` (Haversine formula, WGS-84 sphere R = 6371 km).

### 4.2 Response Fields

Every Argo-vs-HYCOM comparison response includes:

| Field                  | Description                                         |
|------------------------|-----------------------------------------------------|
| `observation_latitude` | Argo float GPS latitude                             |
| `observation_longitude`| Argo float GPS longitude                            |
| `model_latitude`       | Nearest HYCOM grid-cell latitude                    |
| `model_longitude`      | Nearest HYCOM grid-cell longitude                   |
| `distance_km`          | Great-circle distance between the two points        |

### 4.3 Limitations

- At ~0.08° HYCOM resolution the maximum grid-cell diagonal offset is ~12 km.
- No interpolation is performed; the nearest grid cell is used directly.

---

## 5. Model / Observation Temporal Matching

### 5.1 Method

- The HYCOM model timestep **nearest** to the Argo observation time is selected from
  all available NetCDF files in the multi-file catalog.
- The temporal offset is reported as `time_difference_hours`.

### 5.2 Response Fields

| Field                   | Description                                        |
|-------------------------|----------------------------------------------------|
| `observation_time`      | Argo float observation timestamp (ISO 8601)        |
| `model_time`            | Selected HYCOM model timestep (ISO 8601)           |
| `time_difference_hours` | Absolute hours between observation and model time  |

### 5.3 Limitations

- HYCOM files typically contain 3-hourly or 6-hourly outputs, so the maximum temporal
  mismatch is typically ≤ 3 hours.
- The system does not interpolate between model timesteps.

---

## 6. Profile Depth Matching

### 6.1 Method

For each Argo pressure level, the **nearest** available HYCOM depth level is selected.
Only levels where **both** observation and model have non-null, QC-passed values are
counted as valid pairs.

### 6.2 Response Fields

| Field                 | Description                                          |
|-----------------------|------------------------------------------------------|
| `matched_depth_count` | Total depth levels attempted                         |
| `valid_pairs_count`   | Levels with valid data in both observation and model  |
| `missing_count`       | Levels with fill/missing pressure values              |
| `qc_pass_count`       | Levels passing all QC checks                          |
| `qc_fail_count`       | Levels failing QC (excluded from metrics)             |

### 6.3 Per-Level QC

Each `profile_comparison` item includes:

```json
{
  "depth": 100.0,
  "model_temperature": 22.451,
  "observed_temperature": 22.8,
  "temperature_difference": -0.349,
  "qc_status": "PASSED",
  "is_valid_pair": true
}
```

Levels with `is_valid_pair: false` are **excluded** from Bias/RMSE/MAE calculations.

---

## 7. Statistical Metrics

### 7.1 Definitions

All metrics are computed **only** over valid paired differences (NaN/fill excluded):

| Metric | Formula                                      | Unit      |
|--------|----------------------------------------------|-----------|
| Bias   | mean(model − observation)                    | same as variable |
| MAE    | mean(\|model − observation\|)                | same as variable |
| RMSE   | sqrt(mean((model − observation)²))           | same as variable |

### 7.2 Edge Cases

- If zero valid pairs exist, all metrics return `null` (not zero).
- Fill values, NaN, and Inf are excluded before any arithmetic.

---

## 8. Known Limitations

1. **No Argo delayed-mode QC flags**: The INCOIS ERDDAP real-time feed does not expose
   per-level QC flag columns; OceanScope applies physical-range validation as a substitute.

2. **Nearest-neighbour only**: No spatial or temporal interpolation is performed.
   This is appropriate for a decision-support visualization but not for peer-reviewed
   numerical analysis.

3. **Pressure ≈ Depth approximation**: 1 dbar ≈ 1 m is used throughout. This is accurate
   to within ~2% in the upper 2000 m of the ocean.

4. **Single grid cell**: HYCOM comparison uses the single nearest grid cell, not an
   area-weighted average. This can introduce representativeness error in regions with
   strong horizontal gradients.

5. **No bias correction**: Raw model output is compared directly with observations.
   No systematic bias correction or data assimilation adjustment is applied.

---

## 9. Implementation Files

| File | Purpose |
|------|---------|
| `backend/app/core/quality_control.py` | QC engine: units, limits, flags, validators, metrics |
| `backend/app/schemas/ocean_schemas.py` | Argo schemas with QC fields |
| `backend/app/schemas/hycom_schemas.py` | Comparison schemas with QC metadata |
| `backend/app/services/incois_erddap_service.py` | Argo ingestion with QC filtering |
| `backend/app/services/hycom_service.py` | HYCOM validation + Argo comparison with QC |
| `scripts/test_quality_control.py` | Automated QC test suite |
