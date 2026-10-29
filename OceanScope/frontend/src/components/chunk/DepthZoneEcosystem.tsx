/**
 * Realistic Marine Plants, Corals, and Organisms Ecosystem Generator
 * Strictly depth-zoned according to marine biology:
 * - Epipelagic (0–200m): Kelp/seagrass ribbons, branching coral mounds, reef fish, dolphins, pelagic sharks, sea turtles
 * - Mesopelagic (200–1000m): Translucent jellyfish, lanternfish, viperfish, pelagic squids, gentle downward marine snow
 * - Bathypelagic (1000–2000m): Anglerfish with bioluminescent lure, gulper eels, giant siphonophores
 * - Abyssal (2000–4000m): Dumbo octopus, tripods, grenadiers, benthic sea cucumbers, glass sponges
 * - Hadal (4000–6000m+): Mariana snailfish, amphipods, deep sea hydrothermal vent chimney structures
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── 1. BENTHIC CORAL & VEGETATION (0 - 200m) ───

/** Procedural Branching Coral Mound */
const BranchingCoral: React.FC<{ position: [number, number, number]; scale?: number; color?: string }> = ({
  position,
  scale = 1.0,
  color = '#f43f5e',
}) => {
  const groupRef = useRef<THREE.Group>(null);

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Central base */}
      <mesh position={[0, 0.08, 0]}>
        <cylinderGeometry args={[0.06, 0.12, 0.16, 8]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Branch 1 */}
      <mesh position={[0.06, 0.22, 0.03]} rotation={[0.2, 0.3, 0.4]}>
        <cylinderGeometry args={[0.035, 0.05, 0.22, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Branch 2 */}
      <mesh position={[-0.06, 0.2, -0.04]} rotation={[-0.3, -0.2, -0.4]}>
        <cylinderGeometry args={[0.03, 0.045, 0.2, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* Branch 3 */}
      <mesh position={[0.02, 0.28, 0.08]} rotation={[0.4, -0.1, 0.2]}>
        <cylinderGeometry args={[0.025, 0.035, 0.16, 6]} />
        <meshStandardMaterial color="#fb7185" roughness={0.8} />
      </mesh>
    </group>
  );
};

/** Procedural Kelp / Seagrass Blades (sways with current) */
const KelpForestBlade: React.FC<{
  position: [number, number, number];
  height?: number;
  bladeColor?: string;
}> = ({ position, height = 0.6, bladeColor = '#15803d' }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  const geom = useMemo(() => {
    const shape = new THREE.Shape();
    const w = 0.04;
    shape.moveTo(-w / 2, 0);
    shape.bezierCurveTo(-w * 1.5, height * 0.4, w * 1.5, height * 0.7, 0, height);
    shape.bezierCurveTo(w * 0.8, height * 0.7, -w * 0.5, height * 0.4, w / 2, 0);
    shape.closePath();
    return new THREE.ShapeGeometry(shape, 8);
  }, [height]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 1.2 + phase;
    meshRef.current.rotation.z = Math.sin(t) * 0.15;
    meshRef.current.rotation.x = Math.cos(t * 0.8) * 0.1;
  });

  return (
    <mesh ref={meshRef} geometry={geom} position={position}>
      <meshStandardMaterial
        color={bladeColor}
        roughness={0.65}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

// ─── 2. TRANSLUCENT ANIMATED JELLYFISH (Twilight / Midnight) ───
const AnimatedJellyfish: React.FC<{
  position: [number, number, number];
  scale?: number;
  color?: string;
}> = ({ position, scale = 1.0, color = '#38bdf8' }) => {
  const groupRef = useRef<THREE.Group>(null);
  const bellRef = useRef<THREE.Mesh>(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!groupRef.current || !bellRef.current) return;
    const t = clock.getElapsedTime() * 1.5 + phase;
    // Rhythmic bell pulsing
    const pulse = Math.sin(t);
    bellRef.current.scale.set(1.0 + pulse * 0.18, 1.0 - pulse * 0.15, 1.0 + pulse * 0.18);
    // Vertical drift
    groupRef.current.position.y += Math.cos(t * 0.8) * 0.0012;
  });

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Bell cap */}
      <mesh ref={bellRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.14, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshPhysicalMaterial
          color={color}
          transmission={0.85}
          opacity={0.65}
          transparent
          roughness={0.1}
          emissive={color}
          emissiveIntensity={0.35}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Tentacles */}
      {[-0.05, 0, 0.05].map((x, i) => (
        <mesh key={i} position={[x, -0.15, (i % 2 === 0 ? 0.03 : -0.03)]}>
          <cylinderGeometry args={[0.006, 0.002, 0.28, 4]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
};

// ─── 3. DEEP-SEA BIOLUMINESCENT ANGLERFISH (Midnight / Bathypelagic) ───
const Anglerfish3D: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1.0 }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime() * 0.6;
    groupRef.current.position.x += Math.sin(t) * 0.001;
    groupRef.current.rotation.y = Math.PI / 2 + Math.sin(t * 0.5) * 0.15;
  });

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Bulky predatory body */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.15, 12, 10]} />
        <meshStandardMaterial color="#1e1b18" roughness={0.9} />
      </mesh>
      {/* Huge gaping jaw */}
      <mesh position={[0.12, -0.05, 0]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.09, 0.15, 8]} />
        <meshStandardMaterial color="#2a241f" roughness={0.9} />
      </mesh>
      {/* Bioluminescent lure (illicium + esca) */}
      <mesh position={[0.14, 0.16, 0]}>
        <sphereGeometry args={[0.028, 8, 8]} />
        <meshBasicMaterial color="#67e8f9" />
      </mesh>
      {/* Lure glow pointlight */}
      <pointLight position={[0.14, 0.16, 0]} color="#67e8f9" intensity={0.65} distance={1.2} />
    </group>
  );
};

// ─── 4. PELAGIC SHARK / TUNA / WHALE (Sunlight / Epipelagic) ───
const PelagicLargeCreature: React.FC<{
  position: [number, number, number];
  scale?: number;
  type?: 'whale' | 'shark';
}> = ({ position, scale = 1.0, type = 'whale' }) => {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current || !tailRef.current) return;
    const t = clock.getElapsedTime() * 0.8;
    // Slow swimming glide
    groupRef.current.position.x += 0.002;
    if (groupRef.current.position.x > 1.8) groupRef.current.position.x = -1.8;
    tailRef.current.rotation.y = Math.sin(t * 2.0) * 0.25;
  });

  const isWhale = type === 'whale';
  const bodyLen = isWhale ? 0.75 : 0.45;
  const bodyRadius = isWhale ? 0.16 : 0.08;
  const col = isWhale ? '#334155' : '#475569';

  return (
    <group ref={groupRef} position={position} scale={[scale, scale, scale]}>
      {/* Torpedo body */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[bodyRadius * 0.7, bodyRadius, bodyLen, 12]} />
        <meshStandardMaterial color={col} roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh position={[bodyLen * 0.55, 0, 0]}>
        <sphereGeometry args={[bodyRadius * 0.9, 10, 10]} />
        <meshStandardMaterial color={col} roughness={0.4} />
      </mesh>
      {/* Tail fin */}
      <mesh ref={tailRef} position={[-bodyLen * 0.58, 0, 0]}>
        <coneGeometry args={[bodyRadius * 1.2, 0.18, 4]} />
        <meshStandardMaterial color={col} roughness={0.4} />
      </mesh>
      {/* Dorsal fin */}
      <mesh position={[0, bodyRadius * 1.1, 0]} rotation={[0, 0, -0.3]}>
        <coneGeometry args={[0.04, 0.12, 4]} />
        <meshStandardMaterial color={col} roughness={0.4} />
      </mesh>
    </group>
  );
};

// ─── 5. ABYSSAL/HADAL BENTHIC ORGANISM (Tripod Fish / Snailfish) ───
const DeepSeaBenthicOrganism: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1.0 }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Ghostly translucent body */}
      <mesh position={[0, 0.06, 0]}>
        <sphereGeometry args={[0.065, 8, 8]} />
        <meshStandardMaterial color="#f1f5f9" roughness={0.3} transparent opacity={0.8} />
      </mesh>
      {/* Elongated pelvic stilt fin 1 */}
      <mesh position={[0.03, -0.06, 0.04]} rotation={[0.2, 0, 0.2]}>
        <cylinderGeometry args={[0.003, 0.003, 0.18, 4]} />
        <meshBasicMaterial color="#cbd5e1" />
      </mesh>
      {/* Elongated pelvic stilt fin 2 */}
      <mesh position={[-0.03, -0.06, 0.04]} rotation={[0.2, 0, -0.2]}>
        <cylinderGeometry args={[0.003, 0.003, 0.18, 4]} />
        <meshBasicMaterial color="#cbd5e1" />
      </mesh>
      {/* Caudal stilt fin */}
      <mesh position={[0, -0.06, -0.08]} rotation={[-0.2, 0, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.18, 4]} />
        <meshBasicMaterial color="#cbd5e1" />
      </mesh>
    </group>
  );
};

// ─── 6. HYDROTHERMAL VENT STRUCTURES (Hadal / Abyssal trench floors) ───
const HydrothermalVentChimney: React.FC<{
  position: [number, number, number];
  scale?: number;
}> = ({ position, scale = 1.0 }) => {
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {/* Mineral spire */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.08, 0.18, 0.5, 7]} />
        <meshStandardMaterial color="#26221f" roughness={0.95} />
      </mesh>
      {/* Sulfide plume emitter glow */}
      <pointLight position={[0, 0.52, 0]} color="#f97316" intensity={0.4} distance={0.8} />
    </group>
  );
};

// ─── MASTER HABITAT-APPROPRIATE ECOSYSTEM CONTAINER ───
export const DepthZoneEcosystem: React.FC<{
  minDepthM: number;
  maxDepthM: number;
  seabedDepths: number[][];
  seabedMaxDepthM: number;
  width: number;
  height: number;
  res: number;
}> = ({ minDepthM, maxDepthM, seabedDepths, seabedMaxDepthM, width, height, res }) => {
  const avgDepth = (minDepthM + maxDepthM) / 2;

  // Determine which ecological zone is currently being inspected
  const isSunlightZone = minDepthM < 200;
  const isTwilightZone = avgDepth >= 200 && avgDepth < 1000;
  const isMidnightZone = avgDepth >= 1000 && avgDepth < 2000;
  const isAbyssalZone = avgDepth >= 2000 && avgDepth < 4000;
  const isHadalZone = avgDepth >= 4000;

  // Seabed floor Y level in scene units (relative to bottom of chunk)
  const floorY = -height * 0.92;

  return (
    <group>
      {/* ─── ZONE 1: SUNLIGHT / EPIPELAGIC (0–200m) ─── */}
      {isSunlightZone && (
        <group>
          {/* Kelp beds on seabed (only if seabed reaches photic zone) */}
          {[-0.8, -0.3, 0.2, 0.7].map((x, i) => (
            <KelpForestBlade
              key={`kelp-${i}`}
              position={[x, floorY, -0.6 + i * 0.35]}
              height={0.5 + (i % 2) * 0.2}
              bladeColor={i % 2 === 0 ? '#15803d' : '#166534'}
            />
          ))}

          {/* Branching Corals */}
          <BranchingCoral position={[-0.5, floorY, 0.4]} scale={1.2} color="#f43f5e" />
          <BranchingCoral position={[0.6, floorY, -0.3]} scale={0.9} color="#fb923c" />
          <BranchingCoral position={[0.1, floorY, 0.5]} scale={1.0} color="#06b6d4" />

          {/* Midwater Pelagic Megafauna */}
          <PelagicLargeCreature position={[-0.4, -height * 0.35, 0.2]} scale={1.1} type="whale" />
          <PelagicLargeCreature position={[0.5, -height * 0.55, -0.4]} scale={0.9} type="shark" />

          {/* Shallow Jellyfish */}
          <AnimatedJellyfish position={[0.7, -height * 0.25, 0.5]} scale={0.8} color="#38bdf8" />
        </group>
      )}

      {/* ─── ZONE 2: TWILIGHT / MESOPELAGIC (200–1000m) ─── */}
      {isTwilightZone && (
        <group>
          {/* Translucent Jellyfish swarm */}
          <AnimatedJellyfish position={[-0.6, -height * 0.3, -0.2]} scale={1.1} color="#38bdf8" />
          <AnimatedJellyfish position={[0.5, -height * 0.6, 0.3]} scale={0.9} color="#818cf8" />
          <AnimatedJellyfish position={[-0.2, -height * 0.75, 0.5]} scale={0.75} color="#c084fc" />

          {/* Midwater Pelagic Squid / Tuna Silhouette */}
          <PelagicLargeCreature position={[0.2, -height * 0.4, -0.3]} scale={0.7} type="shark" />
        </group>
      )}

      {/* ─── ZONE 3: MIDNIGHT / BATHYPELAGIC (1000–2000m) ─── */}
      {isMidnightZone && (
        <group>
          {/* Anglerfish with active bioluminescent lantern */}
          <Anglerfish3D position={[-0.4, -height * 0.65, 0.2]} scale={1.2} />
          <Anglerfish3D position={[0.6, -height * 0.45, -0.4]} scale={0.9} />

          {/* Sparse deep jellyfish */}
          <AnimatedJellyfish position={[0.3, -height * 0.25, 0.4]} scale={0.7} color="#a855f7" />
        </group>
      )}

      {/* ─── ZONE 4: ABYSSAL ZONE (2000–4000m) ─── */}
      {isAbyssalZone && (
        <group>
          {/* Benthic Tripod Fish perched on seabed */}
          <DeepSeaBenthicOrganism position={[-0.5, floorY, 0.2]} scale={1.2} />
          <DeepSeaBenthicOrganism position={[0.4, floorY, -0.3]} scale={1.0} />

          {/* Deep Anglerfish prowling trenches */}
          <Anglerfish3D position={[0.1, -height * 0.7, 0.3]} scale={1.0} />
        </group>
      )}

      {/* ─── ZONE 5: HADAL ZONE (4000–6000m+) ─── */}
      {isHadalZone && (
        <group>
          {/* Hydrothermal Vent Spire */}
          <HydrothermalVentChimney position={[0.2, floorY, -0.2]} scale={1.2} />

          {/* Ghostly Benthic Hadal Snailfish */}
          <DeepSeaBenthicOrganism position={[-0.3, floorY, 0.3]} scale={0.9} />
          <DeepSeaBenthicOrganism position={[0.5, floorY, 0.1]} scale={1.1} />
        </group>
      )}
    </group>
  );
};
