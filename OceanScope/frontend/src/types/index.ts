/**
 * OceanScope Domain Types & Interfaces
 */

/**
 * Ocean environmental variables supported by the platform
 */
export type OceanVariable =
  | 'temperature'
  | 'salinity'
  | 'current_velocity'
  | 'chlorophyll'
  | 'sea_surface_height'
  | 'depth_profile';

/**
 * Platform data sources
 */
export type DataSource = 'INCOIS' | 'ARGO' | 'HYCOM' | 'COPERNICUS';

/**
 * Risk / Alert Severity Levels
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Geographical ocean location point
 */
export interface OceanLocation {
  latitude: number;
  longitude: number;
  depth: number; // in meters (positive value below sea level)
  regionName?: string;
}

/**
 * Single in-situ ocean observation record (e.g. Argo float / mooring measurement)
 */
export interface Observation {
  id: string;
  platformId: string; // e.g. "ARGO-290145"
  platformType: 'ARGO_FLOAT' | 'MOORED_BUOY' | 'SHIP_CTD' | 'SATELLITE_ALT';
  source: DataSource;
  location: OceanLocation;
  timestamp: string; // ISO 8601 string
  variables: {
    temperature?: number; // °C
    salinity?: number; // PSU
    chlorophyll?: number; // mg/m³
    currentSpeed?: number; // m/s
    currentDirection?: number; // degrees
    seaSurfaceHeight?: number; // m
  };
  status: 'ACTIVE' | 'CALIBRATING' | 'INACTIVE';
}

/**
 * Ocean depth profile measurement series
 */
export interface OceanProfile {
  id: string;
  platformId: string;
  location: OceanLocation;
  timestamp: string;
  depthLevels: number[]; // meters (e.g. [0, 10, 50, 100, 500, 1000])
  temperatureProfile: number[]; // °C corresponding to depth levels
  salinityProfile: number[]; // PSU corresponding to depth levels
  chlorophyllProfile?: number[]; // mg/m³
}

/**
 * Numerical Ocean Model Metadata
 */
export interface OceanModel {
  id: string;
  name: string;
  provider: DataSource;
  resolution: string; // e.g. "1/12 degree (~9km)"
  forecastHorizonDays: number;
  lastUpdated: string;
  supportedVariables: OceanVariable[];
}

/**
 * Temporal point for time-series timelines
 */
export interface TimePoint {
  timestamp: string;
  formattedDate: string;
  label?: string;
  isForecast?: boolean;
}

/**
 * Ocean Risk & Disaster Alert Indicator
 */
export interface DisasterIndicator {
  id: string;
  title: string;
  type: 'MARINE_HEATWAVE' | 'CYCLONE_SURGE' | 'ANOMALOUS_CURRENT' | 'HYPOXIA';
  riskLevel: RiskLevel;
  location: OceanLocation;
  affectedAreaSqKm: number;
  detectedAt: string;
  description: string;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
}

/**
 * Summary Statistics for Dashboard Status
 */
export interface OceanSystemStats {
  activePlatformsCount: number;
  modelOutputDate: string;
  avgSeaSurfaceTemp: number; // °C
  avgSalinity: number; // PSU
  activeAlertsCount: number;
  coverageRegion: string;
}
