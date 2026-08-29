import { APP_CONFIG } from '../../config/appConfig';

// ============================
// INCOIS HYCOM Model API Types
// ============================

export interface HycomModelPoint {
  source: string;
  model: string;
  dataset: string;
  retrieved_at: string;
  latitude: number;
  longitude: number;
  depth: number;
  time: string;
  model_time: string;
  variable: string;
  value: number;
  unit: string;
  selected_file?: string;
  time_difference_hours?: number;
}

export interface HycomProfileLevel {
  depth: number;
  temperature: number | null;
  salinity: number | null;
  current_u: number | null;
  current_v: number | null;
}

export interface HycomModelProfile {
  source: string;
  model: string;
  dataset: string;
  retrieved_at: string;
  latitude: number;
  longitude: number;
  time: string;
  model_time: string;
  profile: HycomProfileLevel[];
  selected_file?: string;
  time_difference_hours?: number;
}

export interface HycomModelCurrent {
  source: string;
  model: string;
  dataset: string;
  retrieved_at: string;
  latitude: number;
  longitude: number;
  depth: number;
  time: string;
  model_time: string;
  u: number;
  v: number;
  speed: number;
  direction: number;
  unit: string;
  selected_file?: string;
  time_difference_hours?: number;
}

export interface HycomTimeseriesPoint {
  time: string;
  value: number | null;
  selected_file?: string;
}

export interface HycomTimeseriesResponse {
  source: string;
  provider: string;
  model: string;
  dataset: string;
  latitude: number;
  longitude: number;
  depth: number;
  variable: string;
  unit: string;
  start_time?: string;
  end_time?: string;
  count: number;
  timeseries: HycomTimeseriesPoint[];
}

export interface HycomModelMetadata {
  source: string;
  model: string;
  dataset: string;
  filename: string;
  available_files?: string[];
  file_count?: number;
  is_available: boolean;
  dimensions: Record<string, number>;
  discovered_variables: string[];
  variables?: string[];
  mapped_variables: Record<string, string>;
  time_range: string[];
  earliest_time?: string;
  latest_time?: string;
  depth_levels: number[];
  available_depths?: number[];
  lat_min: number;
  lat_max: number;
  latitude_range?: number[];
  lon_min: number;
  lon_max: number;
  longitude_range?: number[];
}

export interface ModelObsComparisonItem {
  depth: number;
  model_temperature: number | null;
  observed_temperature: number | null;
  temperature_difference: number | null;
  model_salinity: number | null;
  observed_salinity: number | null;
  salinity_difference: number | null;
  qc_status?: string;
  is_valid_pair?: boolean;
}

export interface ModelObsComparisonResponse {
  source_model: string;
  source_observation: string;
  platform_number: string;
  cycle_number: number;
  observation_latitude: number;
  observation_longitude: number;
  model_latitude: number;
  model_longitude: number;
  distance_km: number;
  observation_time: string;
  model_time: string;
  time_difference_hours: number;
  selected_file?: string;
  matched_depth_count?: number;
  valid_pairs_count?: number;
  missing_count?: number;
  qc_pass_count?: number;
  qc_fail_count?: number;
  temp_bias: number | null;
  temp_rmse: number | null;
  temp_mae: number | null;
  sal_bias: number | null;
  sal_rmse: number | null;
  sal_mae: number | null;
  profile_comparison: ModelObsComparisonItem[];
}

// ============================
// API Functions
// ============================

export async function getHycomPoint(
  latitude: number,
  longitude: number,
  depth = 0,
  variable = 'temperature',
  time?: string
): Promise<HycomModelPoint> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    depth: depth.toString(),
    variable,
  });
  if (time) params.append('time', time);

  const res = await fetch(`${APP_CONFIG.api.baseUrl}/models/hycom/point?${params.toString()}`);
  if (!res.ok) throw new Error(`HYCOM point query failed: ${res.statusText}`);
  return res.json();
}

export async function getHycomProfile(
  latitude: number,
  longitude: number,
  time?: string
): Promise<HycomModelProfile> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
  });
  if (time) params.append('time', time);

  const res = await fetch(`${APP_CONFIG.api.baseUrl}/models/hycom/profile?${params.toString()}`);
  if (!res.ok) throw new Error(`HYCOM profile query failed: ${res.statusText}`);
  return res.json();
}

export async function getHycomCurrent(
  latitude: number,
  longitude: number,
  depth = 0,
  time?: string
): Promise<HycomModelCurrent> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    depth: depth.toString(),
  });
  if (time) params.append('time', time);

  const res = await fetch(`${APP_CONFIG.api.baseUrl}/models/hycom/current?${params.toString()}`);
  if (!res.ok) throw new Error(`HYCOM current query failed: ${res.statusText}`);
  return res.json();
}

export async function getHycomTimeseries(
  latitude: number,
  longitude: number,
  depth = 0,
  variable = 'temperature',
  startTime?: string,
  endTime?: string
): Promise<HycomTimeseriesResponse> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    depth: depth.toString(),
    variable,
  });
  if (startTime) params.append('start_time', startTime);
  if (endTime) params.append('end_time', endTime);

  const res = await fetch(`${APP_CONFIG.api.baseUrl}/models/hycom/timeseries?${params.toString()}`);
  if (!res.ok) throw new Error(`HYCOM timeseries query failed: ${res.statusText}`);
  return res.json();
}

export async function getHycomMetadata(): Promise<HycomModelMetadata> {
  const res = await fetch(`${APP_CONFIG.api.baseUrl}/models/hycom/metadata`);
  if (!res.ok) throw new Error(`HYCOM metadata query failed: ${res.statusText}`);
  return res.json();
}

export async function getHycomArgoComparison(
  platformNumber: string,
  cycleNumber = 1
): Promise<ModelObsComparisonResponse> {
  const params = new URLSearchParams({
    platform_number: platformNumber,
    cycle_number: cycleNumber.toString(),
  });

  const res = await fetch(`${APP_CONFIG.api.baseUrl}/models/hycom/compare-argo?${params.toString()}`);
  if (!res.ok) throw new Error(`HYCOM vs Argo comparison failed: ${res.statusText}`);
  return res.json();
}
