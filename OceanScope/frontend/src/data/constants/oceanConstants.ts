import { OceanModel } from '../../types';

export const DEFAULT_OCEAN_MODELS: OceanModel[] = [
  {
    id: 'hycom-glbu0.08',
    name: 'HYCOM Global 1/12° Analysis',
    provider: 'HYCOM',
    resolution: '1/12° (~9 km)',
    forecastHorizonDays: 7,
    lastUpdated: '2026-08-28T06:00:00Z',
    supportedVariables: ['temperature', 'salinity', 'current_velocity', 'sea_surface_height'],
  },
  {
    id: 'cmems-global-analysis',
    name: 'Copernicus Global Physics & Bio Model',
    provider: 'COPERNICUS',
    resolution: '1/16° (~6 km)',
    forecastHorizonDays: 10,
    lastUpdated: '2026-08-28T00:00:00Z',
    supportedVariables: ['temperature', 'salinity', 'current_velocity', 'chlorophyll'],
  },
  {
    id: 'incois-ind-roms',
    name: 'INCOIS High-Res Indian Ocean ROMS',
    provider: 'INCOIS',
    resolution: '1/32° (~3 km)',
    forecastHorizonDays: 5,
    lastUpdated: '2026-08-28T03:00:00Z',
    supportedVariables: ['temperature', 'salinity', 'current_velocity', 'sea_surface_height'],
  },
];
