# OceanScope HYCOM Cloudflare Worker (`oceanscope-hycom-api`)

Zero-cost, high-performance oceanographic intelligence gateway connecting the OceanScope platform to official global HYCOM OPeNDAP datasets without downloading entire NetCDF archives.

---

## 1. Endpoints

| Endpoint | Method | Parameters | Description |
| :--- | :--- | :--- | :--- |
| `/health` | `GET` | None | Worker health check, timestamp, and upstream THREDDS status. |
| `/api/hycom/profile` | `GET` | `latitude` (deg), `longitude` (deg), `time` (ISO optional) | 40-depth-level vertical ocean sounding (Temperature, Salinity, Velocity). |
| `/api/hycom/point` | `GET` | `latitude`, `longitude`, `depth` (m), `variable`, `time` | Single ocean measurement at (lat, lon, depth, time). |
| `/api/hycom/metadata` | `GET` | None | Aggregated metadata, spatial/temporal bounds, and grid resolution. |
| `/api/hycom/datasets` | `GET` | None | Listing of operational (ESPC-D-V02) and historical (GLBy0.08) datasets. |

---

## 2. Scientific Specifications

- **Operational Source:** HYCOM ESPC-D-V02 Global Analysis (FNMOC).
- **Historical Source:** HYCOM GOFS 3.1 Global Reanalysis (GLBy0.08 / expt_93.0).
- **Horizontal Resolution:** $1/12^\circ$ ($\Delta\text{lat} = 0.04^\circ, \Delta\text{lon} = 0.08^\circ$).
- **Vertical Coordinates:** 40 standard depth levels ($0\text{m}$ to $5,000\text{m}$).
- **Scientific Conversions:**
  - Temperature: $T (^\circ\text{C}) = \text{raw} \times 0.001 + 20.0$
  - Salinity: $S (\text{PSU}) = \text{raw} \times 0.001 + 20.0$
  - Velocity: $u, v (\text{m/s}) = \text{raw} \times 0.001$
- **Missing / Land Value Handling:** Raw fill value of $-30,000$ cleanly translates to `null`. Land points return `null`, preventing fabricated values.

---

## 3. Local Development & Testing

```bash
# Compile TypeScript to dist/
npm run build

# Run comprehensive test suite (unit + live integration)
npm test
```
