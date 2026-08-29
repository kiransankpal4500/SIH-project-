import { Observation, OceanProfile, DisasterIndicator, OceanSystemStats } from '../../types';

export const MOCK_SYSTEM_STATS: OceanSystemStats = {
  activePlatformsCount: 142,
  modelOutputDate: '2026-08-28 06:00 UTC',
  avgSeaSurfaceTemp: 28.4,
  avgSalinity: 34.8,
  activeAlertsCount: 3,
  coverageRegion: 'Indian Ocean & Arabian Sea',
};

export const MOCK_OBSERVATIONS: Observation[] = [
  {
    id: 'obs-001',
    platformId: 'ARGO-2901452',
    platformType: 'ARGO_FLOAT',
    source: 'ARGO',
    location: { latitude: 10.45, longitude: 72.82, depth: 5, regionName: 'Arabian Sea' },
    timestamp: '2026-08-28T04:12:00Z',
    variables: {
      temperature: 29.1,
      salinity: 35.2,
      currentSpeed: 0.45,
    },
    status: 'ACTIVE',
  },
  {
    id: 'obs-002',
    platformId: 'INCOIS-MB-04',
    platformType: 'MOORED_BUOY',
    source: 'INCOIS',
    location: { latitude: 13.08, longitude: 80.27, depth: 0, regionName: 'Bay of Bengal' },
    timestamp: '2026-08-28T05:30:00Z',
    variables: {
      temperature: 28.8,
      salinity: 33.6,
      chlorophyll: 1.45,
      currentSpeed: 0.78,
      seaSurfaceHeight: 0.12,
    },
    status: 'ACTIVE',
  },
  {
    id: 'obs-003',
    platformId: 'ARGO-2901889',
    platformType: 'ARGO_FLOAT',
    source: 'ARGO',
    location: { latitude: -4.20, longitude: 88.50, depth: 10, regionName: 'Equatorial Indian Ocean' },
    timestamp: '2026-08-28T02:00:00Z',
    variables: {
      temperature: 27.6,
      salinity: 34.9,
    },
    status: 'ACTIVE',
  },
];

export const MOCK_PROFILE: OceanProfile = {
  id: 'profile-argo-2901452',
  platformId: 'ARGO-2901452',
  location: { latitude: 10.45, longitude: 72.82, depth: 0, regionName: 'Arabian Sea' },
  timestamp: '2026-08-28T04:12:00Z',
  depthLevels: [0, 10, 25, 50, 100, 200, 500, 1000],
  temperatureProfile: [29.1, 28.9, 27.4, 23.1, 17.5, 11.2, 7.4, 4.8],
  salinityProfile: [35.2, 35.2, 35.4, 35.6, 35.1, 34.8, 34.9, 34.8],
  chlorophyllProfile: [1.2, 1.4, 0.9, 0.3, 0.05, 0.0, 0.0, 0.0],
};

export const MOCK_DISASTER_INDICATORS: DisasterIndicator[] = [
  {
    id: 'alert-mhw-01',
    title: 'Category II Marine Heatwave',
    type: 'MARINE_HEATWAVE',
    riskLevel: 'HIGH',
    location: { latitude: 8.5, longitude: 76.2, depth: 0, regionName: 'Laccadive Sea' },
    affectedAreaSqKm: 42000,
    detectedAt: '2026-08-26T12:00:00Z',
    description: 'Persistent SST anomaly +2.4°C above baseline detected over 5 consecutive days.',
    trend: 'INCREASING',
  },
  {
    id: 'alert-curr-02',
    title: 'Anomalous Boundary Current Shear',
    type: 'ANOMALOUS_CURRENT',
    riskLevel: 'MEDIUM',
    location: { latitude: 15.2, longitude: 82.4, depth: 0, regionName: 'Bay of Bengal Coast' },
    affectedAreaSqKm: 18500,
    detectedAt: '2026-08-27T18:00:00Z',
    description: 'High velocity jet exceeding 1.8 m/s observed near coastal shelf edge.',
    trend: 'STABLE',
  },
];
