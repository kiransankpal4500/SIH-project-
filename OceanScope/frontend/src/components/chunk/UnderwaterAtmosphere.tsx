/**
 * Photorealistic Underwater Atmosphere & Lighting
 * - Soft volumetric sunlight extinction (Beer-Lambert law)
 * - Suspended marine snow / biological particulate scattering
 * - Subtle localized caustics in photic zone
 * - Discreet cutaway boundaries (no thick neon borders or aquarium glass)
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCausticsTexture } from './underwaterTextures';

/**
 * Suspended Marine Snow / Particulate Drift
 * Natural oceanic organic matter drifting gently through the water column
 */
export const MarineSnowParticles: React.FC<{
  count?: number;
  width: number;
  height: number;
  depthScale: number;
  minDepthM: number;
}> = ({ count = 350, width, height, depthScale, minDepthM }) => {
  const pointsRef = useRef<THREE.Points>(null);

  // Generate random 3D distribution of suspended particles
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    const halfW = width * 0.48;
    const halfD = depthScale * 0.48;

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2 * halfW;
      pos[i * 3 + 1] = -Math.random() * height;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2 * halfD;
      spd[i] = 0.003 + Math.random() * 0.006;
    }
    return [pos, spd];
  }, [count, width, height, depthScale]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      // Gentle downward settling with micro-horizontal drift
      array[i * 3 + 1] -= speeds[i];
      array[i * 3] += Math.sin(array[i * 3 + 1] * 2.0 + i) * 0.001;

      // Wrap around when falling beneath the chunk bottom
      if (array[i * 3 + 1] < -height) {
        array[i * 3 + 1] = 0;
        array[i * 3] = (Math.random() - 0.5) * width * 0.9;
        array[i * 3 + 2] = (Math.random() - 0.5) * depthScale * 0.9;
      }
    }
    posAttr.needsUpdate = true;
  });

  // Particle color attenuates with depth
  const particleColor = minDepthM < 200 ? '#e0f2fe' : minDepthM < 1000 ? '#7dd3fc' : '#38bdf8';
  const particleOpacity = minDepthM < 200 ? 0.45 : minDepthM < 1000 ? 0.35 : 0.22;

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
        color={particleColor}
        transparent
        opacity={particleOpacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

/**
 * Natural Sunlight Extinction & Subtle Surface Caustics
 */
export const UnderwaterLightingAndAtmosphere: React.FC<{
  width: number;
  height: number;
  minDepthM: number;
  maxDepthM: number;
  showMarineSnow?: boolean;
}> = ({ width, height, minDepthM, maxDepthM, showMarineSnow = true }) => {
  const causticsRef = useRef<THREE.Mesh>(null);
  const causticsTex = useMemo(() => createCausticsTexture(), []);
  const avgDepth = (minDepthM + maxDepthM) / 2;

  useFrame(({ clock }) => {
    if (!causticsRef.current || avgDepth >= 250) return;
    const t = clock.getElapsedTime() * 0.35;
    causticsTex.offset.set((t * 0.04) % 1, (t * 0.03) % 1);
  });

  return (
    <group>
      {/* 1. Natural Key Sunlight Influx from Above */}
      {avgDepth < 250 ? (
        <directionalLight
          position={[5, 12, 6]}
          intensity={2.4}
          color="#f8fafc"
          castShadow
          shadow-bias={-0.0005}
        />
      ) : avgDepth < 1000 ? (
        <directionalLight
          position={[4, 10, 5]}
          intensity={1.8}
          color="#e0f2fe"
          castShadow
          shadow-bias={-0.0005}
        />
      ) : (
        <directionalLight
          position={[3, 8, 4]}
          intensity={1.4}
          color="#bae6fd"
          castShadow
          shadow-bias={-0.0005}
        />
      )}

      {/* 2. Natural Hemisphere Fill Light (Atmosphere sky to ocean floor) */}
      <hemisphereLight
        args={[
          avgDepth < 250 ? '#bae6fd' : avgDepth < 1000 ? '#7dd3fc' : '#38bdf8', // Sky irradiance
          avgDepth < 250 ? '#2a3b4c' : avgDepth < 1000 ? '#1b2a38' : '#14202b', // Seabed bounce
          avgDepth < 250 ? 1.1 : avgDepth < 1000 ? 0.95 : 0.85,
        ]}
      />

      {/* 3. Dedicated Front/Side Cross-Section Fill Lights for Geological Strata */}
      <directionalLight
        position={[-6, -height * 0.4, 6]}
        intensity={0.9}
        color="#e2e8f0"
      />
      <directionalLight
        position={[6, -height * 0.4, -6]}
        intensity={0.65}
        color="#cbd5e1"
      />

      {/* 4. Ambient Baseline (Guarantees zero flat pitch-black loss of detail) */}
      <ambientLight
        intensity={avgDepth < 200 ? 0.6 : avgDepth < 1000 ? 0.5 : 0.42}
        color="#7dd3fc"
      />

      {/* 5. Photic Caustic Light Projections (Shallow depths only) */}
      {avgDepth < 250 && (
        <mesh
          ref={causticsRef}
          position={[0, -height * 0.25, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[width * 0.95, width * 0.95]} />
          <meshBasicMaterial
            map={causticsTex}
            transparent
            opacity={0.09}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 6. Suspended Organic Particulates (Marine Snow) */}
      {showMarineSnow && (
        <MarineSnowParticles
          width={width}
          height={height * 0.85}
          depthScale={width}
          minDepthM={minDepthM}
        />
      )}
    </group>
  );
};
