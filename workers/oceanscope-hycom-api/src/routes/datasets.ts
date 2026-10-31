/**
 * Datasets Listing Endpoint
 * GET /api/hycom/datasets
 */

import { DatasetDiscoveryService } from '../services/dataset-discovery.js';
import { jsonResponse } from '../utils/errors.js';

export function handleDatasets(
  discovery: DatasetDiscoveryService,
  corsHeaders: Record<string, string>
): Response {
  const datasets = discovery.listDatasets();
  return jsonResponse({ datasets }, 200, {
    ...corsHeaders,
    'Cache-Control': 'public, max-age=86400',
  });
}
