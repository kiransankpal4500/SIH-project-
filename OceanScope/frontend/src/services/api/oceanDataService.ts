import { APP_CONFIG } from '../../config/appConfig';
import { OceanSystemStats, Observation, OceanProfile, DisasterIndicator } from '../../types';
import { MOCK_SYSTEM_STATS, MOCK_OBSERVATIONS, MOCK_DISASTER_INDICATORS, MOCK_PROFILE } from '../../data/mock';

/**
 * Service to retrieve general ocean observation summaries and dashboard telemetry
 */
export class OceanDataService {
  private baseUrl = APP_CONFIG.api.baseUrl;

  async getSystemStats(): Promise<OceanSystemStats> {
    try {
      const res = await fetch(`${this.baseUrl}/observations/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('FastAPI stats endpoint unreachable, using fallback', e);
      return MOCK_SYSTEM_STATS;
    }
  }

  async getObservations(): Promise<Observation[]> {
    try {
      const res = await fetch(`${this.baseUrl}/observations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('FastAPI observations endpoint unreachable, using fallback', e);
      return MOCK_OBSERVATIONS;
    }
  }

  async getProfile(platformId: string): Promise<OceanProfile> {
    try {
      const res = await fetch(`${this.baseUrl}/observations/${platformId}/profile`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn(`FastAPI profile endpoint for ${platformId} unreachable, using fallback`, e);
      return MOCK_PROFILE;
    }
  }

  async getDisasterAlerts(): Promise<DisasterIndicator[]> {
    try {
      const res = await fetch(`${this.baseUrl}/disasters/alerts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('FastAPI disaster alerts endpoint unreachable, using fallback', e);
      return MOCK_DISASTER_INDICATORS;
    }
  }
}

export const oceanDataService = new OceanDataService();
