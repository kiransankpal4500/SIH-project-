/**
 * MarineLifeLayer.tsx
 * 3D animated marine life visualization layer using React Three Fiber.
 * Renders depth-appropriate fish with smooth natural swimming animations.
 * Fish are constrained within the water column (surface → seabed).
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { MarineLifeSpecies } from '../../services/oceanChunkService';

// ─── Types ───
interface FishInstance {
  species: MarineLifeSpecies;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;        // animation phase offset
  wobble: number;       // lateral wobble frequency
  scale: number;
  turnTimer: number;
  targetYaw: number;
  currentYaw: number;
  tailPhase: number;
}

interface MarineLifeLayerProps {
  species: MarineLifeSpecies[];
  maxDepth: number;         // seabed depth in scene units (positive = down)
  selectedDepth: number;    // currently selected depth in meters
  fishCount?: number;       // max fish to render (default 10)
}

// ─── Helpers ───
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Map a real-world depth (meters) to scene Y coordinate.
 * Surface = 0, Seabed = -maxSceneDepth
 */
function depthToSceneY(depthM: number, maxDepthM: number): number {
  if (maxDepthM <= 0) return 0;
  const normalised = clamp(depthM / maxDepthM, 0, 1);
  // Scene spans from Y=0 (surface) to Y = -2.0 (seabed)
  return -normalised * 2.0;
}

// ─── Procedural fish geometry ───
function createFishGeometry(bodyLength: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const l = bodyLength;
  // Streamlined fusiform body profile
  shape.moveTo(0, 0);
  shape.bezierCurveTo(l * 0.2, l * 0.12, l * 0.4, l * 0.15, l * 0.5, l * 0.12);
  shape.bezierCurveTo(l * 0.65, l * 0.08, l * 0.8, l * 0.05, l, 0);
  shape.bezierCurveTo(l * 0.8, -l * 0.05, l * 0.65, -l * 0.08, l * 0.5, -l * 0.12);
  shape.bezierCurveTo(l * 0.4, -l * 0.15, l * 0.2, -l * 0.12, 0, 0);

  const extrudeSettings = {
    depth: l * 0.18,
    bevelEnabled: true,
    bevelThickness: l * 0.04,
    bevelSize: l * 0.03,
    bevelSegments: 2,
    curveSegments: 8,
  };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  geo.rotateY(Math.PI / 2);
  return geo;
}

/** Create a simple tail fin geometry */
function createTailGeometry(bodyLength: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const s = bodyLength * 0.35;
  shape.moveTo(0, 0);
  shape.lineTo(-s * 0.6, s * 0.5);
  shape.bezierCurveTo(-s * 0.4, s * 0.15, -s * 0.4, -s * 0.15, -s * 0.6, -s * 0.5);
  shape.lineTo(0, 0);
  const geo = new THREE.ShapeGeometry(shape);
  return geo;
}

// ─── Single Fish Component ───
const Fish: React.FC<{ instance: FishInstance; maxDepthM: number }> = ({
  instance,
  maxDepthM,
}) => {
  const groupRef = useRef<THREE.Group>(null!);
  const tailRef = useRef<THREE.Mesh>(null!);

  const bodyLength = clamp(instance.species.body_length_m, 0.08, 1.2);
  const sceneScale = 0.4 * instance.scale;

  const bodyGeo = useMemo(() => createFishGeometry(bodyLength), [bodyLength]);
  const tailGeo = useMemo(() => createTailGeometry(bodyLength), [bodyLength]);

  const bodyColor = useMemo(() => {
    try {
      return new THREE.Color(instance.species.color_hex);
    } catch {
      return new THREE.Color('#60A5FA');
    }
  }, [instance.species.color_hex]);

  // Surface and seabed bounds in scene space
  const surfaceY = 0.02;
  const seabedY = -2.0 + 0.15;  // safe margin above seabed
  const chunkHalfWidth = 1.6;

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05); // cap large frame skips
    const inst = instance;

    // Turn timer — randomise heading periodically
    inst.turnTimer -= dt;
    if (inst.turnTimer <= 0) {
      inst.targetYaw += (Math.random() - 0.5) * 1.5;
      inst.turnTimer = 3.0 + Math.random() * 6.0;
    }

    // Smooth yaw interpolation
    inst.currentYaw = lerp(inst.currentYaw, inst.targetYaw, dt * 0.8);

    // Movement velocity
    const speed = inst.species.swimming_speed_mps * 0.3 * inst.scale;
    inst.velocity.x = Math.sin(inst.currentYaw) * speed;
    inst.velocity.z = Math.cos(inst.currentYaw) * speed;
    // Subtle vertical drift
    inst.velocity.y = Math.sin(inst.phase + performance.now() * 0.0003) * speed * 0.08;

    // Position update
    inst.position.x += inst.velocity.x * dt;
    inst.position.y += inst.velocity.y * dt;
    inst.position.z += inst.velocity.z * dt;

    // ─── BOUNDARY ENFORCEMENT ───
    // Horizontal wrap with gentle turn
    if (Math.abs(inst.position.x) > chunkHalfWidth) {
      inst.targetYaw += Math.PI * 0.7 * (inst.position.x > 0 ? -1 : 1);
      inst.position.x = clamp(inst.position.x, -chunkHalfWidth, chunkHalfWidth);
    }
    if (Math.abs(inst.position.z) > chunkHalfWidth) {
      inst.targetYaw += Math.PI * 0.7 * (inst.position.z > 0 ? -1 : 1);
      inst.position.z = clamp(inst.position.z, -chunkHalfWidth, chunkHalfWidth);
    }
    // Vertical: keep within water column (surface → seabed)
    inst.position.y = clamp(inst.position.y, seabedY, surfaceY);

    // Apply to group
    groupRef.current.position.copy(inst.position);
    groupRef.current.rotation.y = inst.currentYaw;

    // Subtle body roll
    const rollAngle = Math.sin(performance.now() * 0.001 + inst.phase) * 0.06;
    groupRef.current.rotation.z = rollAngle;

    // Tail animation (sinusoidal beat)
    if (tailRef.current) {
      inst.tailPhase += dt * (3.0 + inst.wobble);
      tailRef.current.rotation.y = Math.sin(inst.tailPhase) * 0.35;
    }
  });

  return (
    <group ref={groupRef} scale={[sceneScale, sceneScale, sceneScale]}>
      {/* Body */}
      <mesh geometry={bodyGeo} castShadow>
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.25}
          roughness={0.55}
          transparent
          opacity={0.88}
        />
      </mesh>
      {/* Tail fin */}
      <mesh
        ref={tailRef}
        geometry={tailGeo}
        position={[-bodyLength * 0.48, 0, 0]}
      >
        <meshStandardMaterial
          color={bodyColor}
          metalness={0.2}
          roughness={0.6}
          transparent
          opacity={0.75}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Eye (small sphere) */}
      <mesh position={[bodyLength * 0.32, bodyLength * 0.04, bodyLength * 0.08]}>
        <sphereGeometry args={[bodyLength * 0.03, 8, 8]} />
        <meshBasicMaterial color="#0F172A" />
      </mesh>
    </group>
  );
};

// ─── Underwater Particles ───
const UnderwaterParticles: React.FC<{ count?: number; depth: number }> = ({
  count = 60,
  depth,
}) => {
  const pointsRef = useRef<THREE.Points>(null!);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 3.2;
      arr[i * 3 + 1] = -Math.random() * 2.0;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 3.2;
    }
    return arr;
  }, [count]);

  // Opacity decreases with depth
  const opacity = clamp(1.0 - depth / 2000, 0.08, 0.35);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      // Slow upward drift (plankton / marine snow)
      pos.array[i * 3 + 1] += delta * 0.015 * (0.5 + Math.random() * 0.5);
      // Wrap vertically
      if (pos.array[i * 3 + 1] > 0.05) {
        pos.array[i * 3 + 1] = -2.0;
      }
      // Slight horizontal wander
      pos.array[i * 3] += (Math.random() - 0.5) * delta * 0.02;
      pos.array[i * 3 + 2] += (Math.random() - 0.5) * delta * 0.02;
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#E0F2FE"
        size={0.012}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
};

// ─── Main Marine Life Layer ───
const MarineLifeLayer: React.FC<MarineLifeLayerProps> = ({
  species,
  maxDepth,
  selectedDepth,
  fishCount = 10,
}) => {
  // Create fish instances — only when species list changes
  const fishInstances = useMemo(() => {
    const instances: FishInstance[] = [];
    const validSpecies = species.filter(
      (s) => s.minimum_depth <= selectedDepth && selectedDepth <= s.maximum_depth
    );
    if (validSpecies.length === 0) return instances;

    const perSpecies = Math.max(1, Math.floor(fishCount / validSpecies.length));
    const chunkHalf = 1.4;

    for (const sp of validSpecies) {
      for (let i = 0; i < perSpecies && instances.length < fishCount; i++) {
        // Place fish at a plausible depth within the selected zone
        const fishDepthM = clamp(
          selectedDepth + (Math.random() - 0.5) * 30,
          sp.minimum_depth,
          Math.min(sp.maximum_depth, maxDepth)
        );
        const yPos = depthToSceneY(fishDepthM, maxDepth);

        instances.push({
          species: sp,
          position: new THREE.Vector3(
            (Math.random() - 0.5) * chunkHalf * 2,
            clamp(yPos, -2.0 + 0.15, 0.02),
            (Math.random() - 0.5) * chunkHalf * 2
          ),
          velocity: new THREE.Vector3(0, 0, 0),
          phase: Math.random() * Math.PI * 2,
          wobble: 1.5 + Math.random() * 3.0,
          scale: 0.7 + Math.random() * 0.6,
          turnTimer: 2.0 + Math.random() * 5.0,
          targetYaw: Math.random() * Math.PI * 2,
          currentYaw: Math.random() * Math.PI * 2,
          tailPhase: Math.random() * Math.PI * 2,
        });
      }
    }
    return instances;
  }, [species, selectedDepth, maxDepth, fishCount]);

  if (fishInstances.length === 0) return null;

  return (
    <group>
      {/* Subtle underwater particles / marine snow */}
      <UnderwaterParticles
        count={50}
        depth={selectedDepth}
      />

      {/* Animated fish */}
      {fishInstances.map((inst, idx) => (
        <Fish
          key={`fish-${idx}-${inst.species.scientific_name}`}
          instance={inst}
          maxDepthM={maxDepth}
        />
      ))}

      {/* Depth-dependent underwater fog light */}
      <fog
        attach="fog"
        args={[
          selectedDepth < 200 ? '#0A4D7A' : selectedDepth < 1000 ? '#041C30' : '#010810',
          1.5,
          selectedDepth < 50 ? 8.0 : selectedDepth < 200 ? 5.5 : 3.5,
        ]}
      />
    </group>
  );
};

export default MarineLifeLayer;
