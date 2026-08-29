import { Observation, OceanProfile, DisasterIndicator, OceanSystemStats } from '../types';
import { MOCK_OBSERVATIONS, MOCK_PROFILE, MOCK_DISASTER_INDICATORS, MOCK_SYSTEM_STATS } from '../data/mock/oceanMockData';

/**
 * Ocean Data Service Layer
 * Abstracts data retrieval so mock data can later be seamlessly replaced by FastAPI / INCOIS endpoints.
 */
export class OceanDataService {
  async getSystemStats(): Promise<OceanSystemStats> {
    return Promise.resolve(MOCK_SYSTEM_STATS);
  }

  async getObservations(): Promise<Observation[]> {
    return Promise.resolve(MOCK_OBSERVATIONS);
  }

  async getProfile(platformId: string): Promise<OceanProfile> {
    const profile = MOCK_PROFILE;
    return Promise.resolve({ ...profile, platformId });
  }

  async getDisasterAlerts(): Promise<DisasterIndicator[]> {
    return Promise.resolve(MOCK_DISASTER_INDICATORS);
  }
}

export const oceanDataService = new OceanDataService();
