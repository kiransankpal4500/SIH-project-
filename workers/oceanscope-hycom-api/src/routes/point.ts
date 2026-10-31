/**
 * Single Point Ocean Measurement Endpoint
 * GET /api/hycom/point?latitude=15.0&longitude=70.0&depth=0&variable=temperature&time=latest
 */

import { ProfileEngine } from '../services/profile-engine.js';
import { validateCoordinates, validateVariable, parseAndValidateIsoDate } from '../utils/validation.js';
import { getCachedResponse, setCachedResponse } from '../utils/cache.js';
import { jsonResponse } from '../utils/errors.js';

export async function handlePoint(
  url: URL,
  request: Request,
  engine: ProfileEngine,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const latStr = url.searchParams.get('latitude');
  const lonStr = url.searchParams.get('longitude');
  const depthStr = url.searchParams.get('depth') || '0';
  const varStr = url.searchParams.get('variable') || 'temperature';
  const timeStr = url.searchParams.get('time');

  if (!latStr || !lonStr) {
    return jsonResponse(
      { detail: "Missing required query parameters: 'latitude' and 'longitude' are required." },
      400,
      corsHeaders
    );
  }

  const latitude = parseFloat(latStr);
  const longitude = parseFloat(lonStr);
  const depth = parseFloat(depthStr);
  validateCoordinates(latitude, longitude, depth);
  const variable = validateVariable(varStr);
  const targetDate = parseAndValidateIsoDate(timeStr);

  const cacheKey = `pt_${variable}_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${depth.toFixed(1)}_${timeStr || 'latest'}`;
  const cached = await getCachedResponse(cacheKey, request);
  if (cached) {
    const headers = new Headers(cached.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      headers.set(k, v);
    }
    return new Response(cached.body, { status: cached.status, headers });
  }

  const point = await engine.getPoint(latitude, longitude, depth, variable, targetDate);

  const ttl = targetDate ? 86400 : 10800;
  await setCachedResponse(cacheKey, point, ttl, request);

  return jsonResponse(point, 200, {
    ...corsHeaders,
    'Cache-Control': `public, max-age=${ttl}`,
    'X-OceanScope-Cache': 'MISS',
  });
}
