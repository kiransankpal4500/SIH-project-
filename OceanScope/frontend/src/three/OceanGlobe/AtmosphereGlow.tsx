import React from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/threeMath';

/**
 * Physically restrained atmospheric limb scattering rim.
 * Subtle, non-glowing Rayleigh atmospheric halo for realistic Earth view.
 */
export const AtmosphereGlow: React.FC = () => {
  return (
    <mesh scale={[1.02, 1.02, 1.02]}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshBasicMaterial
        color="#70B8FF"
        transparent
        opacity={0.07}
        side={THREE.BackSide}
        blending={THREE.NormalBlending}
        depthWrite={false}
      />
    </mesh>
  );
};
