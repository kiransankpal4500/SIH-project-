# OceanScope API Draft Specifications

## API Endpoints (Planned)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/observations` | Query in-situ observations by bounding box, depth, & date |
| GET | `/api/v1/models/hycom/surface` | Fetch model output grid for sea surface temperature / current velocity |
| GET | `/api/v1/profiles/{platform_id}` | Fetch CTD / Argo depth profile series |
| GET | `/api/v1/disasters/risks` | Fetch active marine heatwave / ocean risk alert indicators |
