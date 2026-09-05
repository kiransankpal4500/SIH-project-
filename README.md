🌊 OceanScope

Interactive 3D Ocean Visualization & Model Validation

See the Ocean. Understand the Data.

OceanScope is a scientific visualization and decision-support platform
that combines real ocean observations, numerical ocean models, seabed
bathymetry, and marine-life records into an interactive system for
exploring ocean conditions and validating model performance.

The project is built around the Disaster Management theme and
focuses on turning complex oceanographic data into understandable 3D
visualizations, quantitative model validation, and rule-based ocean risk
indicators.

🚀 What OceanScope Does

OceanScope connects multiple scientific data sources:

Data Source             Purpose

INCOIS ARGO         Real ocean observations and vertical profiles
HYCOM               Numerical ocean-model data
Copernicus Marine   Ocean model/reanalysis data
GEBCO               Seabed bathymetry and elevation
OBIS                Recorded marine-life occurrence information

The core workflow is:

ARGO + HYCOM + Copernicus
          ↓
        FastAPI
          ↓
  xarray / NetCDF
          ↓
 Scientific Processing
          ↓
   ┌──────┴──────┐
   ↓             ↓
3D Ocean      Model vs
Visualization Observation
   ↓             ↓
Ocean Chunk   Bias/RMSE/MAE
   ↓
2D Real-Depth Profile
   ↓
Ocean Risk Indicators

✨ Key Features

🌍 Interactive 3D Ocean Explorer

Explore ocean locations through an interactive globe and open a
localized Ocean Chunk containing:

Real seabed/bathymetry

Temperature layers

Salinity layers

Current vectors

Mixed-layer depth

Sea-height-related data

Depth information

Optional representative marine-life visualization

🌊 Ocean Chunk

The Ocean Chunk reconstructs a localized 3D water column using the
selected location and available scientific data.

Latitude + Longitude
        ↓
GEBCO Bathymetry
        ↓
Ocean Chunk
   ┌────┼────┐
   ↓    ↓    ↓
 Temp Salt Current
        ↓
2D Real-Depth Profile

Land coordinates are handled separately from valid ocean coordinates. A
confirmed land location should not be rendered as an ocean water column.

🌡️ Ocean Variables

OceanScope supports exclusive visualization modes for:

Temperature

Salinity

Current

Mixed-Layer Depth

Sea Height

Current animation uses real eastward and northward current components
(ugo and vgo) rather than random particle movement.

📏 Real-Depth Visualization

The application is designed to preserve actual scientific depth
relationships.

Target exploration levels include:

Surface
5 m
10 m
20 m
30 m
50 m
75 m
100 m
150 m
200 m
500 m
1000 m
1500 m
2000 m

These are selector targets, not fabricated measurements. If the dataset
contains a different actual level, the application should report the
real dataset depth.

📊 3D + 2D Synchronized Profile

The 3D Ocean Chunk and 2D vertical profile are designed to stay
synchronized for:

Latitude

Longitude

Bathymetric depth

Data source

Variable

Selected depth

Time

🔬 Model Validation

A major scientific feature of OceanScope is the comparison of
ocean-model output against real ARGO observations.

HYCOM MODEL
     ↓
Spatial + Temporal + Depth Matching
     ↑
ARGO OBSERVATION
     ↓
Validation Metrics
     ↓
Bias / RMSE / MAE

The validation workflow considers:

Spatial matching --- appropriate latitude/longitude

Temporal matching --- comparable observation/model time

Depth matching --- comparable vertical levels

The resulting metrics include:

Bias

RMSE --- Root Mean Square Error

MAE --- Mean Absolute Error

Example validation result

Location:
15.0°N, 84.0°E

HYCOM:
29.5415 °C

ARGO:
Float #1902669

Distance:
~3.37 km

Depth pairs:
102

Temperature Bias:
+1.1898 °C

Temperature RMSE:
1.6826 °C

Temperature MAE:
1.5112 °C

Salinity Bias:
+0.0467 PSU

This demonstrates that OceanScope is not only a visualization system; it
also provides quantitative model-vs-observation analysis.

🌍 GEBCO Bathymetry

GEBCO is used for:

GEBCO
  ↓
Seabed / Elevation / Bathymetry

It is separate from water-column variables supplied by HYCOM or
Copernicus Marine.

GEBCO can provide seabed elevation/depth, but it does not provide
temperature or salinity at that depth.

GEBCO is bathymetric data, not real-time ocean observation data.

The application should distinguish:

GEBCO request succeeds
        ↓
LAND

from:

GEBCO request fails
        ↓
DATA UNAVAILABLE

An API failure must never be incorrectly interpreted as a land
coordinate.

🐟 Marine-Life Context

OceanScope can use OBIS records to provide representative marine-life
information based on recorded occurrence and depth information.

These records should not be interpreted as proof that a species is
currently present at the selected location.

⚠️ Rule-Based Ocean Risk Indicators

OceanScope includes a disaster-management-oriented layer that converts
selected ocean conditions into predefined Rule-based Ocean Risk
Indicators.

Ocean Data
    ↓
Predefined Rules / Thresholds
    ↓
Risk Indicator

These are project-level indicators and not official disaster
warnings.

🏗️ System Architecture

                    OCEANSCOPE
                        │
        ┌───────────────┼────────────────┐
        ↓               ↓                ↓
      ARGO            HYCOM          COPERNICUS
   Observation         Model            Model
        │               │                │
        └───────────────┼────────────────┘
                        ↓
                     FastAPI
                        ↓
              Scientific Processing
                        │
             ┌──────────┴──────────┐
             ↓                     ↓
       3D Visualization       Validation
             ↓                     ↓
        Ocean Chunk          Bias/RMSE/MAE
             │
       ┌─────┼─────┐
       ↓     ↓     ↓
     GEBCO Variables Currents
       │     │     │
       └─────┼─────┘
             ↓
       2D Real-Depth Profile
             ↓
      Ocean Risk Indicators

🧰 Technology Stack

Frontend

React

Three.js

Interactive 3D web visualization

Backend

Python

FastAPI

xarray

NetCDF

Scientific Data

INCOIS ARGO

HYCOM

Copernicus Marine

GEBCO

OBIS

🔌 API Structure

ARGO

/api/v1/observations/argo
/api/v1/observations/argo/profile

HYCOM

/api/v1/models/hycom/metadata
/api/v1/models/hycom/point
/api/v1/models/hycom/profile
/api/v1/models/hycom/current
/api/v1/models/hycom/timeseries
/api/v1/models/hycom/compare-argo

Bathymetry

/api/v1/bathymetry/point
/api/v1/bathymetry/chunk

Copernicus

/api/v1/models/copernicus/metadata
/api/v1/models/copernicus/point
/api/v1/models/copernicus/profile
/api/v1/models/copernicus/current

Marine Life

/api/v1/marine-life/species

Risk / Disaster

/api/v1/disasters/alerts
/api/v1/disasters/risk-at-point

Data Management

/api/v1/data/status
/api/v1/data/refresh

🧪 Scientific Processing

The processing pipeline is designed around:

Raw Data
   ↓
Quality Control
   ↓
Spatial Matching
   ↓
Temporal Matching
   ↓
Depth Matching
   ↓
Scientific Analysis
   ├── Visualization
   ├── Model Validation
   └── Risk Indicators

This helps prevent model and observation values from being compared
without appropriate location, time, and depth matching.

💻 Running Locally

OceanScope is intended to run as a frontend application connected to a
local FastAPI backend.

Typical development architecture:

React / Vite
localhost:5173
       ↓
FastAPI
localhost:8000
       ↓
Scientific Data Services

Use the exact startup commands and ports defined by the project
configuration. The values above describe the intended architecture and
may differ from the final local configuration.

Prerequisites

Install:

Node.js and npm

Python

Project Python dependencies

Project frontend dependencies

Environment Configuration

Create the local environment configuration from .env.example.

Keep real credentials in .env and never commit them to source control.

.env.example → variable template
.env         → local configuration/secrets

🎬 Judge Quick Start

Recommended demonstration flow:

1. Start the FastAPI backend
        ↓
2. Start the frontend
        ↓
3. Open OceanScope
        ↓
4. Launch the 3D Explorer
        ↓
5. Select an ocean location
        ↓
6. Explore the Ocean Chunk
        ↓
7. Switch Temperature / Salinity / Current
        ↓
8. Inspect the 2D real-depth profile
        ↓
9. Open Model Validation
        ↓
10. Compare HYCOM with ARGO
        ↓
11. Review Bias / RMSE / MAE
        ↓
12. Review Rule-based Ocean Risk Indicators

Strongest features to demonstrate

Interactive global ocean exploration

Localized 3D Ocean Chunk

Real GEBCO bathymetry

Temperature and salinity depth layers

Real-data-driven current animation

Synchronized 2D real-depth profile

ARGO vs HYCOM validation

Bias, RMSE and MAE

Land-coordinate handling

Rule-based Ocean Risk Indicators

📁 Repository Organization

The final repository should separate application code, documentation,
tests, configuration, and assets.

A clean high-level structure is:

OceanScope/
├── README.md
├── .env.example
├── requirements.txt
├── package.json
│
├── backend/
├── frontend/
├── docs/
├── tests/
└── assets/

The exact structure should follow the actual implementation and
dependency relationships.

🔐 Security

Never commit:

API keys

Passwords

Authentication tokens

Private credentials

Local .env files

Use .env.example to document required variable names.

Large scientific datasets should be handled appropriately rather than
blindly committed to source control.

⚠️ Data Coverage & Limitations

Each source has its own spatial and temporal coverage.

ARGO represents observations from deployed instruments and does
not provide continuous measurements everywhere.

HYCOM provides numerical model output, not direct observations.

Copernicus Marine provides model/reanalysis products with
product-specific coverage.

GEBCO provides bathymetry/elevation and is not real-time ocean
data.

OBIS provides recorded occurrence information and should not be
interpreted as real-time species presence.

Ocean Risk Indicators are project-defined rule-based indicators,
not official warnings.

Most importantly:

Latest available data does not necessarily mean real-time data.

OceanScope should report unavailable data honestly rather than fabricate
scientific values.

🎯 Project Goal

OceanScope connects:

Observation → Model → Validation → Visualization → Decision Support

Instead of simply displaying an ocean map, it provides an interactive
environment for exploring ocean structure, examining real-depth
conditions, comparing model predictions with observations, and
interpreting selected conditions through rule-based indicators.

🌊 OceanScope

See the Ocean. Understand the Data.
