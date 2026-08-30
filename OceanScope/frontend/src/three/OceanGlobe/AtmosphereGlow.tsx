import React, { useMemo } from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/threeMath';

/**
 * Physically restrained atmospheric limb scattering rim.
 * Custom Rayleigh scattering shader creates a natural Earth atmospheric halo
 * visible at grazing view angles without excessive bloom or artificial glow.
 */
export const AtmosphereGlow: React.FC = () => {
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vec3 viewDir = normalize(-vPosition);
          // Rayleigh limb rim formula: thickest at sphere horizon, invisible at center
          float fresnel = 1.0 - max(0.0, dot(vNormal, viewDir));
          float intensity = pow(fresnel, 3.2) * 0.45;
          // Natural ozone/nitrogen blue hue
          vec3 atmosphereColor = vec3(0.35, 0.65, 1.0);
          gl_FragColor = vec4(atmosphereColor, intensity);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.NormalBlending,
      transparent: true,
      depthWrite: false,
    });
  }, []);

  return (
    <mesh scale={[1.025, 1.025, 1.025]} material={atmosphereMaterial}>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
    </mesh>
  );
};

