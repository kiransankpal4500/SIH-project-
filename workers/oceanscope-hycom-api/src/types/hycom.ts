/**
 * HYCOM Data Types & Schemas
 * Preserves 100% compatibility with OceanScope frontend and Python FastAPI contracts.
 */

export interface OceanModelProfileLevel {
  depth: number;
  temperature: number | null;
  salinity: number | null;
  current_u: number | null;
  current_v: number | null;
}

export interface OceanModelProfile {
  source: string;
  provider: string;
  model: string;
  dataset: string;
  retrieved_at: string;
  latitude: number;
  longitude: number;
  time: string;
  model_time: string;
  profile: OceanModelProfileLevel[];
  selected_file?: string;
  time_difference_hours?: number;
  cached?: boolean;
}

export interface OceanModelPoint {
  source: string;
  provider: string;
  model: string;
  dataset: string;
  retrieved_at: string;
  latitude: number;
  longitude: number;
  depth: number;
  requested_depth: number;
  time: string;
  model_time: string;
  variable: string;
  value: number | null;
  unit: string;
  selected_file?: string;
  time_difference_hours?: number;
  cached?: boolean;
}

export interface OceanModelMetadata {
  source: string;
  provider: string;
  model: string;
  dataset: string;
  filename: string;
  available_files: string[];
  file_count: number;
  is_available: boolean;
  dimensions: {
    lat: number;
    lon: number;
    depth: number;
    time: number;
  };
  discovered_variables: string[];
  variables: string[];
  mapped_variables: Record<string, string>;
  time_range: [string, string];
  earliest_time: string;
  latest_time: string;
  available_years: number[];
  time_step: string;
  time_interval_hours: number;
  total_timestamps: number;
  depth_levels: number[];
  available_depths: number[];
  lat_min: number;
  lat_max: number;
  latitude_range: [number, number];
  lon_min: number;
  lon_max: number;
  longitude_range: [number, number];
  grid_resolution_deg: number;
  domain: string;
}

export interface HYCOMDatasetInfo {
  id: string;
  name: string;
  type: 'operational' | 'historical';
  baseUrl: string;
  variables: string[];
  yearStart: number;
  yearEnd: number;
  description: string;
}

export interface VariableConfig {
  ncVar: string;
  espcFolder: string;
  unit: string;
  label: string;
  scaleFactor: number;
  addOffset: number;
  fillValue: number;
}
