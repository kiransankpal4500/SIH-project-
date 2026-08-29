/**
 * Format numerical values with oceanographic units
 */
export function formatValue(value: number | undefined, unit: string, decimals = 1): string {
  if (value === undefined || value === null) return 'N/A';
  return `${value.toFixed(decimals)} ${unit}`;
}

/**
 * Format latitude and longitude coordinates in standard DMS / DD notation
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latDir}, ${Math.abs(lon).toFixed(2)}°${lonDir}`;
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
