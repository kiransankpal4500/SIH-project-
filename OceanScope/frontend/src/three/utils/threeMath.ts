import * as THREE from 'three';

/**
 * Default Globe radius in 3D scene units
 */
export const GLOBE_RADIUS = 2.5;

/**
 * Convert geographical latitude, longitude, and depth to 3D Cartesian coordinates
 * @param lat Latitude in degrees (-90 to 90)
 * @param lon Longitude in degrees (-180 to 180)
 * @param depth Depth in meters (0 to 5000)
 * @param globeRadius Radius of the globe in scene units
 */
export function latLonToVector3(
  lat: number,
  lon: number,
  depth = 0,
  globeRadius = GLOBE_RADIUS
): THREE.Vector3 {
  // Convert depth in meters to radius offset (5000m depth = ~0.25 scene units inward)
  const depthOffset = (depth / 5000) * 0.25;
  const radius = Math.max(0.1, globeRadius - depthOffset);

  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

/**
 * Convert 3D Cartesian coordinates on sphere back to geographical latitude and longitude
 */
export function vector3ToLatLon(
  vec: THREE.Vector3,
  globeRadius = GLOBE_RADIUS
): { lat: number; lon: number } {
  const norm = vec.clone().normalize();
  // y = radius * cos(phi) => phi = acos(clamp(y, -1, 1))
  const phi = Math.acos(Math.max(-1, Math.min(1, norm.y)));
  const lat = 90 - (phi * 180) / Math.PI;

  // x = -(sin(phi) * cos(theta)), z = sin(phi) * sin(theta)
  // theta = atan2(z, -x)
  let theta = Math.atan2(norm.z, -norm.x);
  let lon = (theta * 180) / Math.PI - 180;

  // Normalize lon to [-180, 180]
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;

  return {
    lat: Math.round(lat * 100) / 100,
    lon: Math.round(lon * 100) / 100,
  };
}

