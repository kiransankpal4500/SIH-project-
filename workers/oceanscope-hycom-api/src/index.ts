/**
 * OceanScope HYCOM Cloudflare Worker
 * Zero-Cost Oceanographic Gateway & Profile Processing Engine
 */

import { handleHealth } from './routes/health.js';
import { handleProfile } from './routes/profile.js';
import { handlePoint } from './routes/point.js';
import { handleMetadata } from './routes/metadata.js';
import { handleDatasets } from './routes/datasets.js';
import { ProfileEngine } from './services/profile-engine.js';
import { DatasetDiscoveryService } from './services/dataset-discovery.js';
import { HycomClient } from './services/hycom-client.js';
import { errorResponse, jsonResponse } from './utils/errors.js';

export interface Env {
  ENVIRONMENT?: string;
  HYCOM_THREDDS_BASE?: string;
  CACHE_TTL_SECONDS?: number;
  TIMEOUT_MS?: number;
  MAX_RETRIES?: number;
}

// Allowed CORS origins for OceanScope
const ALLOWED_ORIGINS = new Set([
  'https://oceanscope-d6305.web.app',
  'https://oceanscope-d6305.firebaseapp.com',
  'https://sih-project-o1qw-ow745bdi6-space-x6.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8000',
]);

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://oceanscope-d6305.web.app';

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export default {
  async fetch(request: Request, env: Env = {}, ctx?: unknown): Promise<Response> {
    const corsHeaders = getCorsHeaders(request);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    if (request.method !== 'GET') {
      return jsonResponse(
        { detail: `Method ${request.method} not allowed. This gateway only supports read-only GET requests.` },
        405,
        corsHeaders
      );
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    const timeout = env.TIMEOUT_MS ? Number(env.TIMEOUT_MS) : 14000;
    const retries = env.MAX_RETRIES ? Number(env.MAX_RETRIES) : 2;
    const baseUrl = env.HYCOM_THREDDS_BASE || 'https://tds.hycom.org/thredds/dodsC';

    const client = new HycomClient(timeout, retries);
    const discovery = new DatasetDiscoveryService(baseUrl);
    const engine = new ProfileEngine(client, discovery);

    try {
      if (path === '/health' || path === '/api/health') {
        return handleHealth(corsHeaders);
      }

      if (path === '/api/hycom/profile' || path === '/profile') {
        return await handleProfile(url, request, engine, corsHeaders);
      }

      if (path === '/api/hycom/point' || path === '/point') {
        return await handlePoint(url, request, engine, corsHeaders);
      }

      if (path === '/api/hycom/metadata' || path === '/metadata') {
        return await handleMetadata(discovery, corsHeaders);
      }

      if (path === '/api/hycom/datasets' || path === '/datasets') {
        return handleDatasets(discovery, corsHeaders);
      }

      return jsonResponse(
        {
          detail: `Endpoint not found: ${path}. Available endpoints: /health, /api/hycom/profile, /api/hycom/point, /api/hycom/metadata, /api/hycom/datasets`,
        },
        404,
        corsHeaders
      );
    } catch (err: unknown) {
      return errorResponse(err, corsHeaders);
    }
  },
};
