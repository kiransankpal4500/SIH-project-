import { APP_CONFIG } from '../../config/appConfig';
import { OceanSystemStats, Observation, OceanProfile, DisasterIndicator } from '../../types';
import { MOCK_SYSTEM_STATS, MOCK_OBSERVATIONS, MOCK_DISASTER_INDICATORS, MOCK_PROFILE } from '../../data/mock';
import { safeFetchJson } from '../../utils/safeFetch';

/**
 * Service to retrieve general ocean observation summaries and dashboard telemetry
 */
export class OceanDataService {
  private baseUrl = APP_CONFIG.api.baseUrl;

  async getSystemStats(): Promise<OceanSystemStats> {
    try {
      const data = await safeFetchJson<OceanSystemStats>(`${this.baseUrl}/observations/stats`);
      return data ?? MOCK_SYSTEM_STATS;
    } catch (e) {
      console.warn('FastAPI stats endpoint unreachable, using fallback', e);
      return MOCK_SYSTEM_STATS;
    }
  }

  async getObservations(): Promise<Observation[]> {
    try {
      const data = await safeFetchJson<Observation[]>(`${this.baseUrl}/observations`);
      return data ?? MOCK_OBSERVATIONS;
    } catch (e) {
      console.warn('FastAPI observations endpoint unreachable, using fallback', e);
      return MOCK_OBSERVATIONS;
    }
  }

  async getProfile(platformId: string): Promise<OceanProfile> {
    try {
      const data = await safeFetchJson<OceanProfile>(`${this.baseUrl}/observations/${platformId}/profile`);
      return data ?? MOCK_PROFILE;
    } catch (e) {
      console.warn(`FastAPI profile endpoint for ${platformId} unreachable, using fallback`, e);
      return MOCK_PROFILE;
    }
  }

  async getDisasterAlerts(): Promise<DisasterIndicator[]> {
    try {
      const data = await safeFetchJson<DisasterIndicator[]>(`${this.baseUrl}/disasters/alerts`);
      return data ?? MOCK_DISASTER_INDICATORS;
    } catch (e) {
      console.warn('FastAPI disaster alerts endpoint unreachable, using fallback', e);
      return MOCK_DISASTER_INDICATORS;
    }
  }
}

export const oceanDataService = new OceanDataService();

