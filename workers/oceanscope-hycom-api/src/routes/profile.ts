/**
 * Vertical Ocean Profile Endpoint
 * GET /api/hycom/profile?latitude=15.0&longitude=70.0&time=2026-10-29T09:00:00Z
 */

import { ProfileEngine } from '../services/profile-engine.js';
import { validateCoordinates, parseAndValidateIsoDate } from '../utils/validation.js';
import { getCachedResponse, setCachedResponse } from '../utils/cache.js';
import { jsonResponse } from '../utils/errors.js';

export async function handleProfile(
  url: URL,
  request: Request,
  engine: ProfileEngine,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const latStr = url.searchParams.get('latitude');
  const lonStr = url.searchParams.get('longitude');
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
  validateCoordinates(latitude, longitude, 0.0);
  const targetDate = parseAndValidateIsoDate(timeStr);

  const cacheKey = `prof_${latitude.toFixed(3)}_${longitude.toFixed(3)}_${timeStr || 'latest'}`;
  const cached = await getCachedResponse(cacheKey, request);
  if (cached) {
    const headers = new Headers(cached.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      headers.set(k, v);
    }
    return new Response(cached.body, { status: cached.status, headers });
  }

  const profile = await engine.getProfile(latitude, longitude, targetDate);

  const ttl = targetDate ? 86400 : 10800;
  await setCachedResponse(cacheKey, profile, ttl, request);

  return jsonResponse(profile, 200, {
    ...corsHeaders,
    'Cache-Control': `public, max-age=${ttl}`,
    'X-OceanScope-Cache': 'MISS',
  });
}
