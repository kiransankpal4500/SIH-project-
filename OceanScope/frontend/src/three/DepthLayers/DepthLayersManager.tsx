import React from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/threeMath';

interface DepthLayersManagerProps {
  currentDepth: number;
}

export const DepthLayersManager: React.FC<DepthLayersManagerProps> = ({ currentDepth }) => {
  if (currentDepth === 0) return null;

  // Compute depth radius inward offset (e.g. 1000m depth -> smaller radius)
  const depthScale = Math.max(0.7, 1 - (currentDepth / 5000) * 0.2);
  const radius = GLOBE_RADIUS * depthScale;

  return (
    <mesh>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshStandardMaterial
        color="#0077B6"
        transparent
        opacity={0.3}
        wireframe
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
