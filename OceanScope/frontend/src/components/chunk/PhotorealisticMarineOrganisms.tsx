/**
 * Photorealistic 3D Marine Life Models & Ecosystem Instances
 * Realistic biological silhouettes, anatomical proportions, restrained natural coloration,
 * and fluid swimming dynamics.
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── 1. REALISTIC FISH MODEL (Pelagic Tuna / Mackerel) ───
export const PhotorealisticFish: React.FC<{
  position: [number, number, number];
  scale?: number;
  speed?: number;
  swimPhase?: number;
}> = ({ position, scale = 1.0, speed = 1.0, swimPhase = 0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);

  // Anatomically shaped body geometry (fusiform profile)
  const bodyGeom = useMemo(() => {
    const geom = new THREE.ConeGeometry(0.08, 0.45, 14);
    geom.rotateZ(-Math.PI / 2);
    geom.scale(1.0, 0.5, 0.85); // streamline
    return geom;
  }, []);

  // Caudal fin geometry
  const finGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-0.1, 0.08);
    shape.lineTo(-0.07, 0);
    shape.lineTo(-0.1, -0.08);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 2.8 * speed + swimPhase;

    // Fluid forward glide with gentle undulating yaw
    groupRef.current.position.x += Math.sin(t * 0.4) * 0.003;
    groupRef.current.position.z += Math.cos(t * 0.4) * 0.002;
    groupRef.current.rotation.y = Math.sin(t * 0.4) * 0.15;
    groupRef.current.rotation.z = Math.sin(t) * 0.06;

    // Tail fin rhythmic oscillation
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 2.2) * 0.45;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Fusiform Body */}
      <mesh geometry={bodyGeom} castShadow>
        <meshStandardMaterial
          color="#38bdf8" // vibrant oceanic blue countershaded
          roughness={0.2}
          metalness={0.7}
        />
      </mesh>
      {/* Silver Underside Belly */}
      <mesh position={[0.03, -0.02, 0]} scale={[0.85, 0.45, 0.8]}>
        <sphereGeometry args={[0.07, 12, 8]} />
        <meshStandardMaterial
          color="#f1f5f9" // silvery iridescent belly
          roughness={0.15}
          metalness={0.85}
        />
      </mesh>
      {/* Articulated Caudal Tail */}
      <mesh ref={tailRef} geometry={finGeom} position={[-0.22, 0, 0]}>
        <meshStandardMaterial
          color="#0284c7"
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Pectoral Fins */}
      <mesh position={[0.06, -0.025, 0.05]} rotation={[0.2, 0.4, 0.3]} scale={[0.6, 0.6, 0.6]}>
        <planeGeometry args={[0.09, 0.04]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.06, -0.025, -0.05]} rotation={[-0.2, -0.4, -0.3]} scale={[0.6, 0.6, 0.6]}>
        <planeGeometry args={[0.09, 0.04]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ─── 2. SCHOOL OF PELAGIC FISH (Instanced Natural Motion) ───
export const FishSchoolGroup: React.FC<{
  count?: number;
  centerPos: [number, number, number];
  bounds: number;
}> = ({ count = 9, centerPos, bounds = 1.4 }) => {
  const school = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      offset: [
        centerPos[0] + (Math.random() - 0.5) * bounds * 0.85,
        centerPos[1] + (Math.random() - 0.5) * 0.5,
        centerPos[2] + (Math.random() - 0.5) * bounds * 0.85,
      ] as [number, number, number],
      scale: 1.1 + Math.random() * 0.4,
      speed: 0.95 + Math.random() * 0.3,
      swimPhase: i * 0.75,
    }));
  }, [count, centerPos, bounds]);

  return (
    <group>
      {school.map((fish, idx) => (
        <PhotorealisticFish
          key={idx}
          position={fish.offset}
          scale={fish.scale}
          speed={fish.speed}
          swimPhase={fish.swimPhase}
        />
      ))}
    </group>
  );
};

// ─── 3. NATURAL SEABED FLORA: KELP & BENTHIC MACROALGAE ───
export const PhotorealisticKelpStems: React.FC<{
  position: [number, number, number];
  bladeCount?: number;
  maxHeight?: number;
}> = ({ position, bladeCount = 6, maxHeight = 1.1 }) => {
  const groupRef = useRef<THREE.Group>(null);

  const blades = useMemo(() => {
    return Array.from({ length: bladeCount }, (_, i) => {
      const h = maxHeight * (0.7 + Math.random() * 0.5);
      const angle = (i / bladeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const dist = Math.random() * 0.16;

      // Organic curved ribbon geometry
      const points = [];
      const segments = 9;
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        points.push(
          new THREE.Vector3(
            Math.sin(t * 2.5) * 0.12,
            t * h,
            Math.cos(t * 2.0) * 0.09
          )
        );
      }
      const curve = new THREE.CatmullRomCurve3(points);
      const geom = new THREE.TubeGeometry(curve, 14, 0.018, 6, false);

      return {
        geom,
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        phase: Math.random() * Math.PI * 2,
      };
    });
  }, [bladeCount, maxHeight]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 0.95;
    groupRef.current.children.forEach((child, idx) => {
      if (child instanceof THREE.Mesh) {
        child.rotation.z = Math.sin(t + idx * 0.6) * 0.14;
        child.rotation.x = Math.cos(t * 0.8 + idx * 0.4) * 0.1;
      }
    });
  });

  return (
    <group ref={groupRef} position={position}>
      {blades.map((b, i) => (
        <mesh key={i} geometry={b.geom} position={[b.x, 0, b.z]} castShadow>
          <meshStandardMaterial
            color="#16a34a" // rich emerald green benthic kelp
            roughness={0.4}
            metalness={0.15}
          />
        </mesh>
      ))}
    </group>
  );
};

// ─── 4. NATURAL REEF STRUCTURES (Benthic Substrate) ───
export const NaturalCoralReefCluster: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1.0 }) => {
  const geom = useMemo(() => {
    const g = new THREE.DodecahedronGeometry(0.24, 1);
    g.scale(1.3, 0.85, 1.1);
    return g;
  }, []);

  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Base porous rock */}
      <mesh geometry={geom} castShadow receiveShadow>
        <meshStandardMaterial
          color="#475569"
          roughness={0.88}
          metalness={0.08}
        />
      </mesh>
      {/* Encrusting coralline algae shelf */}
      <mesh position={[0.08, 0.13, 0.05]} rotation={[0.2, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 0.05, 8]} />
        <meshStandardMaterial color="#f43f5e" roughness={0.65} />
      </mesh>
      <mesh position={[-0.1, 0.1, -0.05]} rotation={[-0.3, -0.2, 0]}>
        <cylinderGeometry args={[0.1, 0.07, 0.04, 7]} />
        <meshStandardMaterial color="#0284c7" roughness={0.6} />
      </mesh>
    </group>
  );
};

// ─── 5. PELAGIC CNIDARIAN: TRANSLUCENT JELLYFISH (Twilight Mesopelagic) ───
export const PhotorealisticJellyfish: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1.0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bellRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!groupRef.current || !bellRef.current) return;
    const t = clock.getElapsedTime() * 1.4 + phase;

    // Organic hydro-propulsive bell pulsation
    const p = Math.sin(t);
    bellRef.current.scale.set(1.0 + p * 0.16, 1.0 - p * 0.18, 1.0 + p * 0.16);
    groupRef.current.position.y += Math.sin(t * 0.6) * 0.0016;
  });

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Semitransparent Umbrella Bell */}
      <mesh ref={bellRef}>
        <sphereGeometry args={[0.22, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshPhysicalMaterial
          color="#bae6fd"
          transmission={0.82}
          opacity={0.7}
          transparent
          roughness={0.08}
          ior={1.34}
          side={THREE.DoubleSide}
          depthWrite={false}
          emissive="#38bdf8"
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* Delicate trailing tentacles */}
      {[-0.07, -0.02, 0.02, 0.07].map((tx, idx) => (
        <mesh key={idx} position={[tx, -0.25, (idx % 2 === 0 ? 0.04 : -0.04)]}>
          <cylinderGeometry args={[0.005, 0.002, 0.45, 5]} />
          <meshBasicMaterial
            color="#7dd3fc"
            transparent
            opacity={0.65}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// ─── 6. BATHYPELAGIC / ABYSSAL DEEP-SEA BIOLUMINESCENT FAUNA ───
export const DeepSeaAnglerLure: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1.0 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const lureLightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 1.6;
    groupRef.current.position.y += Math.sin(t * 0.8) * 0.001;

    // Bioluminescent glow pulse
    if (lureLightRef.current) {
      lureLightRef.current.intensity = 1.2 + Math.sin(t * 3.5) * 0.5;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Dark globular body */}
      <mesh>
        <sphereGeometry args={[0.16, 14, 12]} />
        <meshStandardMaterial color="#0f172a" roughness={0.85} />
      </mesh>
      {/* Esca lure stalk */}
      <mesh position={[0.12, 0.12, 0]} rotation={[0, 0, -0.6]}>
        <cylinderGeometry args={[0.008, 0.008, 0.22, 5]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      {/* Bioluminescent lure bulb */}
      <mesh position={[0.2, 0.22, 0]}>
        <sphereGeometry args={[0.03, 10, 10]} />
        <meshBasicMaterial color="#38bdf8" />
        <pointLight ref={lureLightRef} color="#38bdf8" distance={1.8} intensity={1.4} />
      </mesh>
    </group>
  );
};
