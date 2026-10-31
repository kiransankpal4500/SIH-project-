/**
 * Metadata Endpoint
 * GET /api/hycom/metadata
 */

import { DatasetDiscoveryService } from '../services/dataset-discovery.js';
import { HYCOM_DEPTH_LEVELS } from '../utils/coordinates.js';
import { OceanModelMetadata } from '../types/hycom.js';
import { jsonResponse } from '../utils/errors.js';

export async function handleMetadata(
  discovery: DatasetDiscoveryService,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const latest = await discovery.getLatestOperationalTime();

  const metadata: OceanModelMetadata = {
    source: 'HYCOM Consortium',
    provider: 'INCOIS RSMC / HYCOM OPeNDAP',
    model: 'HYCOM',
    dataset: 'ESPC-D-V02 / GLBy0.08_expt_93.0',
    filename: 'remote_opendap_dual_archive',
    available_files: ['ESPC-D-V02', 'GLBy0.08_expt_93.0'],
    file_count: 2,
    is_available: true,
    dimensions: {
      lat: 4251,
      lon: 4500,
      depth: 40,
      time: 2392,
    },
    discovered_variables: ['temperature', 'salinity', 'current_u', 'current_v', 'ssh'],
    variables: ['temperature', 'salinity', 'current_u', 'current_v', 'ssh'],
    mapped_variables: {
      temperature: 'water_temp',
      salinity: 'salinity',
      current_u: 'water_u',
      current_v: 'water_v',
      ssh: 'surf_el',
    },
    time_range: ['2018-12-04T12:00:00Z', latest.iso],
    earliest_time: '2018-12-04T12:00:00Z',
    latest_time: latest.iso,
    available_years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
    time_step: '3 hours',
    time_interval_hours: 3.0,
    total_timestamps: 22600,
    depth_levels: [...HYCOM_DEPTH_LEVELS],
    available_depths: [...HYCOM_DEPTH_LEVELS],
    lat_min: -80.0,
    lat_max: 90.0,
    latitude_range: [-80.0, 90.0],
    lon_min: 0.0,
    lon_max: 360.0,
    longitude_range: [0.0, 360.0],
    grid_resolution_deg: 0.08,
    domain: 'Global Ocean (1/12° Resolution, Operational & Archival)',
  };

  return jsonResponse(metadata, 200, {
    ...corsHeaders,
    'Cache-Control': 'public, max-age=3600',
  });
}
