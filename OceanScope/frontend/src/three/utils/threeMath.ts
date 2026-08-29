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
