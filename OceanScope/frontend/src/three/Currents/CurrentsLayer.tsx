import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/threeMath';

interface CurrentsLayerProps {
  visible?: boolean;
}

export const CurrentsLayer: React.FC<CurrentsLayerProps> = ({ visible = true }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate 600 current particles distributed over the ocean sphere
  const [positions, speeds] = useMemo(() => {
    const count = 600;
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Random lat (-60 to 60) and lon (-180 to 180)
      const lat = (Math.random() - 0.5) * 120;
      const lon = (Math.random() - 0.5) * 360;
      const radius = GLOBE_RADIUS + 0.03;

      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lon + 180) * (Math.PI / 180);

      pos[i * 3] = -(radius * Math.sin(phi) * Math.cos(theta));
      pos[i * 3 + 1] = radius * Math.cos(phi);
      pos[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

      spd[i] = 0.002 + Math.random() * 0.005;
    }

    return [pos, spd];
  }, []);

  // Animate particles rotating around Earth's longitude
  useFrame(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.0015;
    }
  });

  if (!visible) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#48CAE4"
        transparent
        opacity={0.7}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};
