import React from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/threeMath';

export const AtmosphereGlow: React.FC = () => {
  return (
    <mesh scale={[1.08, 1.08, 1.08]}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color="#00B4D8"
        transparent
        opacity={0.15}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};
