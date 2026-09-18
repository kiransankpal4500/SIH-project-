/**
 * INCOIS HYCOM Model API Service Client
 * Handles point queries, depth profiles, current vectors, time-series, metadata, and Argo cross-validation.
 */

import { APP_CONFIG } from '../../config/appConfig';
import { safeFetchJson } from '../../utils/safeFetch';

// ============================
// INCOIS HYCOM Model API Types
// ============================

export interface HycomModelPoint {
  source: string;
  model?: string;
  dataset: string;
  retrieved_at?: string;
  latitude: number;
  longitude: number;
  depth: number;
  time?: string;
  model_time?: string;
  variable: string;
  value: number | null;
  unit: string;
  selected_file?: string;
  time_difference_hours?: number;
  is_live_data?: boolean;
  is_fill_value?: boolean;
  qc_status?: string;
}

export interface HycomProfileLevel {
  depth: number;
  temperature?: number | null;
  salinity?: number | null;
  current_u?: number | null;
  current_v?: number | null;
  u?: number | null;
  v?: number | null;
  current_speed?: number | null;
  current_direction?: number | null;
  is_valid?: boolean;
}

export interface HycomModelProfile {
  source: string;
  model?: string;
  dataset: string;
  retrieved_at?: string;
  latitude: number;
  longitude: number;
  time?: string;
  model_time?: string;
  depth_count?: number;
  units?: Record<string, string>;
  is_live_data?: boolean;
  profile: HycomProfileLevel[];
}

export interface HycomModelCurrent {
  source: string;
  model?: string;
  dataset: string;
  retrieved_at?: string;
  latitude: number;
  longitude: number;
  depth: number;
  time?: string;
  model_time?: string;
  u: number | null;
  v: number | null;
  speed: number | null;
  direction?: number | null;
  direction_degrees?: number | null;
  unit: string;
  selected_file?: string;
  is_live_data?: boolean;
  is_fill_value?: boolean;
}

export interface HycomModelMetadata {
  source: string;
  dataset?: string;
  dataset_count?: number;
  active_datasets?: string[];
  total_timesteps?: number;
  earliest_time?: string;
  latest_time?: string;
  latitude_range?: [number, number];
  longitude_range?: [number, number];
  depth_levels?: number[];
  depth_levels_m?: number[];
  variables?: any;
  has_u_velocity?: boolean;
  has_v_velocity?: boolean;
  has_salinity?: boolean;
  has_temperature?: boolean;
}

export interface HycomTimeseriesPoint {
  time: string;
  value: number | null;
  is_valid?: boolean;
}

export interface HycomTimeseriesResponse {
  source: string;
  dataset?: string;
  latitude: number;
  longitude: number;
  depth: number;
  variable: string;
  unit: string;
  timeseries?: HycomTimeseriesPoint[];
  points?: HycomTimeseriesPoint[];
}

export interface ModelObsComparisonItem {
  depth: number;
  obs_temperature?: number | null;
  model_temperature?: number | null;
  temp_difference?: number | null;
  obs_salinity?: number | null;
  model_salinity?: number | null;
  sal_difference?: number | null;
  observed_temperature?: number | null;
  temperature_difference?: number | null;
  observed_salinity?: number | null;
  salinity_difference?: number | null;
  obs_qc_flag?: number;
  observation_value?: number | null;
  model_value?: number | null;
  difference?: number | null;
  abs_difference?: number | null;
  is_valid_pair?: boolean;
  qc_status?: string;
}

export interface ModelObsComparisonResponse {
  source_model?: string;
  source_observation?: string;
  source?: string;
  comparison_type?: string;
  variable?: string;
  unit?: string;
  platform_number: string;
  cycle_number: number;
  observation_latitude?: number;
  observation_longitude?: number;
  model_latitude?: number;
  model_longitude?: number;
  latitude?: number;
  longitude?: number;
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
  temp_bias?: number | null;
  temp_rmse?: number | null;
  temp_mae?: number | null;
  sal_bias?: number | null;
  sal_rmse?: number | null;
  sal_mae?: number | null;
  bias?: number | null;
  rmse?: number | null;
  mae?: number | null;
  profile_comparison?: ModelObsComparisonItem[];
  levels?: ModelObsComparisonItem[];
}

export interface HYCOMTimestampsResponse {
  source: string;
  dataset: string;
  total_timesteps: number;
  available_years: number[];
  selected_year?: number | null;
  available_dates: string[];
  selected_date?: string | null;
  available_timesteps: string[];
  earliest_time?: string;
  latest_time?: string;
  latest?: string;
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

  return safeFetchJson<HycomModelPoint>(
    `${APP_CONFIG.api.baseUrl}/models/hycom/point?${params.toString()}`
  );
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

  return safeFetchJson<HycomModelProfile>(
    `${APP_CONFIG.api.baseUrl}/models/hycom/profile?${params.toString()}`
  );
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

  return safeFetchJson<HycomModelCurrent>(
    `${APP_CONFIG.api.baseUrl}/models/hycom/current?${params.toString()}`
  );
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

  return safeFetchJson<HycomTimeseriesResponse>(
    `${APP_CONFIG.api.baseUrl}/models/hycom/timeseries?${params.toString()}`
  );
}

export async function getHycomMetadata(): Promise<HycomModelMetadata> {
  return safeFetchJson<HycomModelMetadata>(
    `${APP_CONFIG.api.baseUrl}/models/hycom/metadata`
  );
}

export async function getHycomTimestamps(
  year?: number,
  date?: string
): Promise<HYCOMTimestampsResponse> {
  const params = new URLSearchParams();
  if (year) params.append('year', year.toString());
  if (date) params.append('date', date);

  const qs = params.toString() ? `?${params.toString()}` : '';
  return safeFetchJson<HYCOMTimestampsResponse>(
    `${APP_CONFIG.api.baseUrl}/models/hycom/timestamps${qs}`
  );
}

export async function getHycomArgoComparison(
  platformNumber: string,
  cycleNumber = 1
): Promise<ModelObsComparisonResponse> {
  const params = new URLSearchParams({
    platform_number: platformNumber,
    cycle_number: cycleNumber.toString(),
  });

  return safeFetchJson<ModelObsComparisonResponse>(
    `${APP_CONFIG.api.baseUrl}/models/hycom/compare-argo?${params.toString()}`
  );
}
