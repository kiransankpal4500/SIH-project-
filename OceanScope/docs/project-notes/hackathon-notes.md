# OceanScope Hackathon Notes

## Roadmap & Progress

- [x] **Step 1: Project Foundation & Frontend Shell**
  - Modular project architecture setup
  - React + TypeScript + Vite + Tailwind configuration
  - Route navigation shell & scientific dark theme design
  - Domain types, configuration, and mock data foundation
- [x] **Step 2: 3D Ocean Globe Shell & R3F Setup**
  - Three.js + React Three Fiber procedural globe canvas
  - Bioluminescent atmosphere glow & lat/lon grid mapping
  - 3D Argo float spatial markers & animated current vectors
- [x] **Step 3: Analytical Charts & Model vs Observation Visualizations**
  - Recharts dual-axis vertical depth profile series (0-1000m)
  - Sea Surface Temperature (SST) anomaly time-series timeline
  - HYCOM numerical ocean model vs in-situ Argo float comparison engine
- [x] **Step 4: FastAPI Backend & NetCDF Processing Pipeline**
  - FastAPI core application & CORS middleware setup
  - Pydantic schemas for observations, profiles, models, and risk alerts
  - REST API routes (`/api/v1/observations`, `/api/v1/models`, `/api/v1/disasters`)
