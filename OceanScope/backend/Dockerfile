# OceanScope Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for netCDF4/HDF5
RUN apt-get update && apt-get install -y --no-install-recommends \
    libhdf5-dev \
    libnetcdf-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code (datasets excluded via .dockerignore)
COPY . .

# Create persistent storage mount point
RUN mkdir -p /data/hycom

# Production Environment defaults
ENV HOST=0.0.0.0
ENV PORT=8000
ENV DEBUG=false
ENV HYCOM_DATA_DIRECTORY=/data/hycom

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
