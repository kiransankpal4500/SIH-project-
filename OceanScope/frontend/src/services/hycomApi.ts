import { APP_CONFIG } from '../config/appConfig';

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
}

export interface HycomModelMetadata {
  source: string;
  model: string;
  dataset: string;
  filename: string;
  is_available: boolean;
  dimensions: Record<string, number>;
  discovered_variables: string[];
  mapped_variables: Record<string, string>;
  time_range: string[];
  depth_levels: number[];
  lat_min: number;
  lat_max: number;
  lon_min: number;
  lon_max: number;
}

export interface ModelObsComparisonItem {
  depth: number;
  model_temperature: number | null;
  observed_temperature: number | null;
  temperature_difference: number | null;
  model_salinity: number | null;
  observed_salinity: number | null;
  salinity_difference: number | null;
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
