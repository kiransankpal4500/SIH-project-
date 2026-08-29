import { OceanVariable } from '../types';

/**
 * Global Application Configuration
 * Centralized settings to prevent hardcoded values across components
 */
export const APP_CONFIG = {
  name: 'OceanScope',
  tagline: 'Explore the Ocean. Understand the Data.',
  stage: 'Frontend foundation',
  version: '0.1.0-alpha',
  
  // API settings
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
    timeoutMs: 10000,
    enableMockData: import.meta.env.VITE_ENABLE_MOCK_DATA !== 'false',
  },

  // Default ocean spatial view center (Indian Ocean region default focus)
  defaultLocation: {
    latitude: 12.0,
    longitude: 80.0,
    depth: 0,
    regionName: 'Indian Ocean',
  },

  // Supported ocean variables for visualization and filtering
  supportedVariables: [
    { id: 'temperature', label: 'Temperature', unit: '°C', defaultRange: [0, 35] },
    { id: 'salinity', label: 'Salinity', unit: 'PSU', defaultRange: [30, 40] },
    { id: 'current_velocity', label: 'Ocean Currents', unit: 'm/s', defaultRange: [0, 2.5] },
    { id: 'chlorophyll', label: 'Chlorophyll-a', unit: 'mg/m³', defaultRange: [0.01, 10] },
    { id: 'sea_surface_height', label: 'Sea Surface Height', unit: 'm', defaultRange: [-1.5, 1.5] },
    { id: 'depth_profile', label: 'Depth Profile', unit: 'm', defaultRange: [0, 5000] },
  ] as { id: OceanVariable; label: string; unit: string; defaultRange: [number, number] }[],

  // Standard ocean depth profile slices (in meters)
  supportedDepths: [
    { depth: 0, label: 'Sea Surface (0m)' },
    { depth: 10, label: 'Upper Layer (10m)' },
    { depth: 50, label: 'Euphotic Zone (50m)' },
    { depth: 100, label: 'Thermocline (100m)' },
    { depth: 500, label: 'Mesopelagic (500m)' },
    { depth: 1000, label: 'Deep Ocean (1000m)' },
    { depth: 2000, label: 'Abyssal Zone (2000m)' },
  ],

  // Ocean Data Sources
  dataSources: [
    { id: 'INCOIS', name: 'INCOIS (Indian National Centre for Ocean Information Services)' },
    { id: 'ARGO', name: 'Argo Float Global Array' },
    { id: 'HYCOM', name: 'HYCOM (Hybrid Coordinate Ocean Model)' },
    { id: 'COPERNICUS', name: 'Copernicus Marine Environment Service (CMEMS)' },
  ],
};
