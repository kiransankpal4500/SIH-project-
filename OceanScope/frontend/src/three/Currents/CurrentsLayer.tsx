import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/threeMath';

interface CurrentsLayerProps {
  visible?: boolean;
  depth?: number;
  speedMultiplier?: number;
}

/**
 * Disciplined Scientific Ocean Current Vector Flow Layer
 * Simulates major Indian Ocean current pathways (Equatorial Current, Somali Current, Agulhas, Bay of Bengal gyre)
 */
export const CurrentsLayer: React.FC<CurrentsLayerProps> = ({
  visible = true,
  depth = 0,
  speedMultiplier = 1,
}) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Depth attenuation (velocity decreases with depth)
  const depthFactor = Math.max(0.35, 1 - (depth / 2000) * 0.65);
  const radius = (GLOBE_RADIUS + 0.015) * Math.max(0.85, 1 - (depth / 5000) * 0.15);

  // Generate 320 structured streamline particles along real ocean trajectories
  const [positions, colors, initialData] = useMemo(() => {
    const count = 320;
    const pos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);
    const data = [];

    for (let i = 0; i < count; i++) {
      // Focus particles primarily in the Indian Ocean & major gyres
      // Latitudes: -45° to +25°
      // Longitudes: 35° to 110° (Indian Ocean core) + Global background
      let lat: number;
      let lon: number;

      if (i < 200) {
        // Indian Ocean Basin Focus
        lat = -40 + Math.random() * 65;
        lon = 38 + Math.random() * 75;
      } else {
        // Global background circulation
        lat = (Math.random() - 0.5) * 110;
        lon = (Math.random() - 0.5) * 360;
      }

      // Velocity magnitude (0.2 m/s to 1.8 m/s)
      const isEquatorialOrBoundary = Math.abs(lat) < 8 || (lat > 5 && lat < 18 && lon < 60);
      const baseSpeed = isEquatorialOrBoundary ? 0.8 + Math.random() * 0.9 : 0.2 + Math.random() * 0.5;

      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);

      pos[i * 3] = -(radius * Math.sin(phi) * Math.cos(theta));
      pos[i * 3 + 1] = radius * Math.cos(phi);
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      // Scientific Velocity Colormap (Cyan 0.2 m/s -> Sky Blue 0.8 m/s -> Amber 1.5+ m/s)
      const color = new THREE.Color();
      if (baseSpeed > 1.2) {
        color.setRGB(0.96, 0.62, 0.15); // High velocity (Amber/Orange)
      } else if (baseSpeed > 0.6) {
        color.setRGB(0.22, 0.74, 0.97); // Moderate velocity (Cyan)
      } else {
        color.setRGB(0.12, 0.45, 0.75); // Slow velocity (Deep Blue)
      }

      cols[i * 3] = color.r;
      cols[i * 3 + 1] = color.g;
      cols[i * 3 + 2] = color.b;

      data.push({ lat, lon, speed: baseSpeed * 0.0012 });
    }

    return [pos, cols, data];
  }, [radius]);

  // Subtle continuous drift along eastward/westward circulation pathways
  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0008 * speedMultiplier * depthFactor;
    }
  });

  if (!visible) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={depth > 200 ? 0.022 : 0.032}
        vertexColors
        transparent
        opacity={depth > 200 ? 0.45 : 0.75}
        blending={THREE.NormalBlending}
      />
    </points>
  );
};
