import { APP_CONFIG } from '../../config/appConfig';

export interface ArgoObservationItem {
  platform_number: string;
  cycle_number: number;
  latitude: number;
  longitude: number;
  timestamp: string;
  pressure?: number;
  temperature?: number;
  salinity?: number;
  qc_flag?: number;
  qc_status?: string;
}

export interface ArgoObservationResponse {
  source: string;
  dataset: string;
  retrieved_at: string;
  data_time_range?: string;
  units: Record<string, string>;
  is_live_data: boolean;
  count: number;
  valid_count?: number;
  missing_count?: number;
  qc_pass_count?: number;
  qc_fail_count?: number;
  observations: ArgoObservationItem[];
}

export interface ArgoProfileLevelItem {
  pressure: number;
  temperature?: number;
  salinity?: number;
  qc_flag?: number;
  qc_status?: string;
}

export interface ArgoProfileResponse {
  source: string;
  dataset: string;
  platform_number: string;
  cycle_number: number;
  latitude?: number;
  longitude?: number;
  timestamp?: string;
  retrieved_at: string;
  units: Record<string, string>;
  is_live_data: boolean;
  valid_count?: number;
  missing_count?: number;
  qc_pass_count?: number;
  qc_fail_count?: number;
  profile: ArgoProfileLevelItem[];
}

export async function getArgoObservations(
  minLat = 0.0,
  maxLat = 30.0,
  minLon = 40.0,
  maxLon = 110.0,
  platformNumber?: string,
  limit = 50
): Promise<ArgoObservationResponse> {
  const params = new URLSearchParams({
    min_lat: minLat.toString(),
    max_lat: maxLat.toString(),
    min_lon: minLon.toString(),
    max_lon: maxLon.toString(),
    limit: limit.toString(),
  });

  if (platformNumber) {
    params.append('platform_number', platformNumber);
  }

  const res = await fetch(`${APP_CONFIG.api.baseUrl}/observations/argo?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`INCOIS API request failed: ${res.statusText}`);
  }
  return res.json();
}

export async function getArgoProfile(
  platformNumber: string,
  cycleNumber = 1
): Promise<ArgoProfileResponse> {
  const params = new URLSearchParams({
    platform_number: platformNumber,
    cycle_number: cycleNumber.toString(),
  });

  const res = await fetch(`${APP_CONFIG.api.baseUrl}/observations/argo/profile?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`INCOIS Profile request failed: ${res.statusText}`);
  }
  return res.json();
}
