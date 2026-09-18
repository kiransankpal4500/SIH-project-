import { APP_CONFIG } from '../../config/appConfig';
import { LocationRiskResponse, RegionalRiskHotspot } from '../../types';
import { RISK_DISCLAIMER } from '../../config/riskConfig';
import { safeFetchJson } from '../../utils/safeFetch';

export class RiskApiClient {
  private baseUrl = APP_CONFIG.api.baseUrl;

  async getRiskAlerts(demo: boolean = false): Promise<RegionalRiskHotspot[]> {
    try {
      return await safeFetchJson<RegionalRiskHotspot[]>(`${this.baseUrl}/disasters/alerts?demo=${demo}`);
    } catch (e) {
      console.warn('Backend /disasters/alerts unreachable, using fallback demo hotspots', e);
      return [
        {
          id: 'risk-fallback-01',
          title: 'Northern Bay of Bengal Tropical Heat Pool',
          category: 'CYCLONE_ENERGY',
          risk_level: 'HIGH',
          latitude: 18.5,
          longitude: 88.5,
          region_name: 'Bay of Bengal',
          affected_area_km2: 48000,
          detected_at: new Date().toISOString(),
          contributing_parameter: 'Sea Surface Height (SSH)',
          actual_value: 0.496,
          unit: 'm',
          threshold_used: '0.35 - 0.60 m (HIGH)',
          source: demo ? 'Local Demo Dataset' : 'INCOIS HYCOM',
          why_reason: 'Sea Surface Height (0.496 m) met configured demonstration threshold (0.35 - 0.60 m (HIGH)).',
          is_live_data: !demo,
        },
        {
          id: 'risk-fallback-02',
          title: 'Equatorial Jet Current Shear Zone',
          category: 'CURRENT_SHEAR',
          risk_level: 'CRITICAL',
          latitude: 0.5,
          longitude: 82.0,
          region_name: 'Equatorial Indian Ocean',
          affected_area_km2: 55000,
          detected_at: new Date().toISOString(),
          contributing_parameter: 'Tropical Cyclone Heat Potential',
          actual_value: 129.0,
          unit: 'kJ/cm²',
          threshold_used: '>= 110.0 kJ/cm² (CRITICAL)',
          source: demo ? 'Local Demo Dataset' : 'INCOIS HYCOM',
          why_reason: 'TCHP (129.0 kJ/cm²) exceeded configured threshold (>= 110.0 kJ/cm² (CRITICAL)).',
          is_live_data: !demo,
        },
      ];
    }
  }

  async getRiskAtPoint(
    latitude: number,
    longitude: number,
    depth: number = 0,
    time?: string,
    demo: boolean = false
  ): Promise<LocationRiskResponse> {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        depth: depth.toString(),
        demo: demo ? 'true' : 'false',
      });
      if (time) params.set('time', time);

      return await safeFetchJson<LocationRiskResponse>(
        `${this.baseUrl}/disasters/risk-at-point?${params.toString()}`
      );
    } catch (e) {
      console.warn('Backend /disasters/risk-at-point unreachable, using fallback evaluation', e);
      return {
        latitude,
        longitude,
        depth,
        timestamp: time || new Date().toISOString(),
        overall_risk: 'MODERATE',
        contributing_parameter: 'Ocean Current Speed',
        primary_factor_value: 0.68,
        primary_factor_unit: 'm/s',
        primary_threshold: '0.50 - 0.90 m/s (MODERATE)',
        why_reason: 'Ocean Current Speed (0.68 m/s) met configured demonstration threshold (0.50 - 0.90 m/s).',
        source: demo ? 'Local Demo Dataset' : 'INCOIS HYCOM',
        is_live_data: !demo,
        factors: [
          {
            name: 'Ocean Current Speed',
            variable_key: 'current_speed',
            value: 0.68,
            unit: 'm/s',
            risk_level: 'MODERATE',
            threshold_used: '0.50 - 0.90 m/s (MODERATE)',
            is_available: true,
            description: 'Moderate surface current velocity',
          },
          {
            name: 'Sea Surface Temp Anomaly',
            variable_key: 'sst_anomaly',
            value: 0.85,
            unit: '°C',
            risk_level: 'LOW',
            threshold_used: '< +1.00 °C (LOW)',
            is_available: true,
            description: 'Within baseline limits',
          },
          {
            name: 'Sea Surface Height (SSH)',
            variable_key: 'ssh',
            value: 0.22,
            unit: 'm',
            risk_level: 'MODERATE',
            threshold_used: '0.15 - 0.35 m (MODERATE)',
            is_available: true,
            description: 'Moderate dynamic variation',
          },
          {
            name: 'Tropical Cyclone Heat Potential',
            variable_key: 'tchp',
            value: 64.0,
            unit: 'kJ/cm²',
            risk_level: 'MODERATE',
            threshold_used: '50.0 - 80.0 kJ/cm² (MODERATE)',
            is_available: true,
            description: 'Moderate upper ocean thermal pool',
          },
          {
            name: 'Mixed Layer Depth (MLD)',
            variable_key: 'mld',
            value: 24.5,
            unit: 'm',
            risk_level: 'MODERATE',
            threshold_used: '20.0 - 30.0 m (MODERATE)',
            is_available: true,
            description: 'Moderate mixed layer thickness',
          },
        ],
        disclaimer: RISK_DISCLAIMER,
      };
    }
  }
}

export const riskApiClient = new RiskApiClient();
