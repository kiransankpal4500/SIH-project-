/**
 * Format numerical values with oceanographic units
 */
export function formatValue(value: number | undefined, unit: string, decimals = 1): string {
  if (value === undefined || value === null) return 'N/A';
  return `${value.toFixed(decimals)} ${unit}`;
}

/**
 * Format latitude and longitude coordinates in standard oceanographic notation.
 * Prevents NaN outputs and formats cardinal hemispheres cleanly.
 */
export function formatCoordinates(
  lat: number | undefined | null,
  lon: number | undefined | null,
  precision = 4
): string {
  if (lat == null || lon == null) return 'Coordinates Unavailable';
  const latNum = Number(lat);
  const lonNum = Number(lon);
  if (isNaN(latNum) || isNaN(lonNum) || !isFinite(latNum) || !isFinite(lonNum)) {
    return 'Coordinates Unavailable';
  }
  const latDir = latNum >= 0 ? 'N' : 'S';
  const lonDir = lonNum >= 0 ? 'E' : 'W';
  return `${Math.abs(latNum).toFixed(precision)}° ${latDir}, ${Math.abs(lonNum).toFixed(precision)}° ${lonDir}`;
}

/**
 * Format depth in meters
 */
export function formatDepth(depthMeters: number): string {
  return `${depthMeters.toLocaleString()} m`;
}

/**
 * Format ISO dates for scientific timestamps
 */
export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toUTCString().replace('GMT', 'UTC');
  } catch {
    return isoString;
  }
}
