/**
 * Health Check Endpoint
 * GET /health
 */

import { jsonResponse } from '../utils/errors.js';

export function handleHealth(corsHeaders: Record<string, string>): Response {
  return jsonResponse(
    {
      status: 'healthy',
      service: 'oceanscope-hycom-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      upstream: {
        thredds: 'https://tds.hycom.org/thredds/dodsC',
        operational_model: 'ESPC-D-V02',
        historical_model: 'GLBy0.08/expt_93.0',
      },
    },
    200,
    corsHeaders
  );
}
