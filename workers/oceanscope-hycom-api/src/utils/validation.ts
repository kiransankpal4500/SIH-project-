/**
 * Request parameter validation and security sanitization.
 */

export class ValidationError extends Error {
  public readonly statusCode: number = 400;
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateCoordinates(lat: number, lon: number, depth: number = 0.0): void {
  if (typeof lat !== 'number' || isNaN(lat)) {
    throw new ValidationError('Latitude must be a valid number.');
  }
  if (lat < -90.0 || lat > 90.0) {
    throw new ValidationError(`Latitude ${lat}° is outside valid bounds (-90.0 to 90.0°).`);
  }

  if (typeof lon !== 'number' || isNaN(lon)) {
    throw new ValidationError('Longitude must be a valid number.');
  }
  if (lon < -180.0 || lon > 360.0) {
    throw new ValidationError(`Longitude ${lon}° is outside valid bounds (-180.0 to 360.0°).`);
  }

  if (typeof depth !== 'number' || isNaN(depth)) {
    throw new ValidationError('Depth must be a valid number.');
  }
  if (depth < 0.0 || depth > 6000.0) {
    throw new ValidationError(`Depth ${depth}m is outside valid oceanographic range (0 to 6000m).`);
  }
}

export function validateVariable(variable: string): string {
  const normalized = variable.toLowerCase().trim();
  const validVars = ['temperature', 'salinity', 'current_u', 'current_v', 'ssh', 'height', 'mld'];
  if (!validVars.includes(normalized)) {
    throw new ValidationError(`Invalid variable '${variable}'. Supported variables are: ${validVars.join(', ')}.`);
  }
  return normalized;
}

export function parseAndValidateIsoDate(isoStr?: string | null): Date | null {
  if (!isoStr || isoStr.trim() === '' || isoStr.toLowerCase() === 'latest') {
    return null;
  }
  const parsed = new Date(isoStr);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid ISO date format: '${isoStr}'. Expected ISO-8601 string, e.g. '2026-10-29T09:00:00Z'.`);
  }
  return parsed;
}
