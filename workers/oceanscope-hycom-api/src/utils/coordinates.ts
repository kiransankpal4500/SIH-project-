/**
 * HYCOM Coordinate Systems and Grid Transformations
 */

export const HYCOM_DEPTH_LEVELS: readonly number[] = [
  0.0, 2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 15.0, 20.0, 25.0, 30.0, 35.0, 40.0, 45.0, 50.0,
  60.0, 70.0, 80.0, 90.0, 100.0, 125.0, 150.0, 200.0, 250.0, 300.0, 350.0, 400.0, 500.0,
  600.0, 700.0, 800.0, 900.0, 1000.0, 1250.0, 1500.0, 2000.0, 2500.0, 3000.0, 4000.0, 5000.0,
];

export const LAT_MIN = -80.0;
export const LAT_MAX = 90.0;
export const LAT_STEP = 0.04;
export const LAT_POINTS = 4251;

export const LON_MIN = 0.0;
export const LON_MAX = 360.0;
export const LON_STEP = 0.08;
export const LON_POINTS = 4500;

/**
 * Normalizes any longitude into the [0, 360) degree coordinate range used by HYCOM.
 */
export function normalizeLongitude360(lon: number): number {
  let normalized = lon % 360.0;
  if (normalized < 0) {
    normalized += 360.0;
  }
  return normalized;
}

/**
 * Converts a [0, 360) longitude back to [-180, 180] for frontend standard representation.
 */
export function toSignedLongitude180(lon360: number): number {
  return lon360 > 180.0 ? Math.round((lon360 - 360.0) * 10000) / 10000 : Math.round(lon360 * 10000) / 10000;
}

/**
 * Maps a real-world latitude to the nearest HYCOM grid index [0..4250].
 */
export function latToGridIndex(lat: number): { index: number; actualLat: number } {
  const clampedLat = Math.max(LAT_MIN, Math.min(LAT_MAX, lat));
  const idx = Math.round((clampedLat - LAT_MIN) / LAT_STEP);
  const safeIdx = Math.max(0, Math.min(LAT_POINTS - 1, idx));
  const actualLat = Math.round((LAT_MIN + safeIdx * LAT_STEP) * 10000) / 10000;
  return { index: safeIdx, actualLat };
}

/**
 * Maps a real-world longitude to the nearest HYCOM grid index [0..4499].
 */
export function lonToGridIndex(lon: number): { index: number; actualLon: number } {
  const norm = normalizeLongitude360(lon);
  const idx = Math.round(norm / LON_STEP) % LON_POINTS;
  const safeIdx = Math.max(0, Math.min(LON_POINTS - 1, idx));
  const actualLon360 = Math.round((safeIdx * LON_STEP) * 10000) / 10000;
  return { index: safeIdx, actualLon: toSignedLongitude180(actualLon360) };
}

/**
 * Finds the closest HYCOM depth level index and value for a given depth.
 */
export function findNearestDepth(depth: number): { index: number; depth: number } {
  let closestIdx = 0;
  let minDiff = Math.abs(HYCOM_DEPTH_LEVELS[0] - depth);

  for (let i = 1; i < HYCOM_DEPTH_LEVELS.length; i++) {
    const diff = Math.abs(HYCOM_DEPTH_LEVELS[i] - depth);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }

  return { index: closestIdx, depth: HYCOM_DEPTH_LEVELS[closestIdx] };
}
