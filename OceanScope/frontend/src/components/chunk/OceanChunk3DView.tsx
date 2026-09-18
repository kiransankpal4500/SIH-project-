/**
 * 3D Ocean Chunk WebGL Renderer
 * Renders volumetric ocean water column, GEBCO bathymetric seabed mesh, current particles, and marine life.
 */

import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from 'three';
import { BathymetryChunkResponse, CopernicusProfileResponse, CopernicusCurrentResponse } from '../../services/oceanChunkService';
import type { MarineLifeSpecies } from '../../services/oceanChunkService';
import { formatCoordinates, formatValue } from '../../utils/formatters';
import MarineLifeLayer from './MarineLifeLayer';

interface OceanChunk3DViewProps {
  chunkData: BathymetryChunkResponse;
  selectedVariable?: 'temperature' | 'salinity' | 'current' | 'mld' | 'height';
  variableValue?: number | null;
  variableUnit?: string;
  selectedDepth?: number;
  profileData?: CopernicusProfileResponse | null;
  currentData?: CopernicusCurrentResponse | null;
  onResetCamera?: () => void;
  marineLifeEnabled?: boolean;
  marineLifeSpecies?: MarineLifeSpecies[];
  fishCount?: number;
}

/**
 * Procedural Bathymetry Color Mapping (Shallow Gold/Teal -> Abyssal Navy)
 */
function getDepthColor(depth: number, maxDepth: number): THREE.Color {
  if (depth <= 0) return new THREE.Color('#94A3B8'); // Land/coastline gray-slate
  const ratio = Math.min(1.0, depth / Math.max(10.0, maxDepth));
  
  if (ratio < 0.15) {
    return new THREE.Color('#06B6D4').lerp(new THREE.Color('#0284C7'), ratio / 0.15);
  } else if (ratio < 0.5) {
    return new THREE.Color('#0284C7').lerp(new THREE.Color('#1E3A8A'), (ratio - 0.15) / 0.35);
  } else {
    return new THREE.Color('#1E3A8A').lerp(new THREE.Color('#050E24'), (ratio - 0.5) / 0.5);
  }
}

/**
 * Temperature Color Function (0°C Deep Navy -> 12°C Cyan -> 22°C Green/Yellow -> 32°C Red)
 */
function getTempColorThree(temp: number): THREE.Color {
  const t = Math.max(0, Math.min(32, temp));
  if (t < 8) {
    return new THREE.Color('#1E3A8A').lerp(new THREE.Color('#0284C7'), t / 8);
  } else if (t < 18) {
    return new THREE.Color('#0284C7').lerp(new THREE.Color('#10B981'), (t - 8) / 10);
  } else if (t < 26) {
    return new THREE.Color('#10B981').lerp(new THREE.Color('#F59E0B'), (t - 18) / 8);
  } else {
    return new THREE.Color('#F59E0B').lerp(new THREE.Color('#EF4444'), (t - 26) / 6);
  }
}

/**
 * Salinity Color Function (30 PSU Teal -> 34 PSU Cyan -> 36 PSU Blue/Amber -> 38 PSU Orange-Red)
 */
function getSalColorThree(sal: number): THREE.Color {
  const s = Math.max(30, Math.min(38, sal));
  const norm = (s - 30) / 8;
  if (norm < 0.4) {
    return new THREE.Color('#0D9488').lerp(new THREE.Color('#0284C7'), norm / 0.4);
  } else if (norm < 0.75) {
    return new THREE.Color('#0284C7').lerp(new THREE.Color('#F59E0B'), (norm - 0.4) / 0.35);
  } else {
    return new THREE.Color('#F59E0B').lerp(new THREE.Color('#EA580C'), (norm - 0.75) / 0.25);
  }
}

/**
 * 3D Seabed Mesh Geometry with dynamic vertex height displacement from GEBCO grid
 */
const SeabedTerrain: React.FC<{
  depths: number[][];
  maxDepth: number;
  res: number;
}> = ({ depths, maxDepth, res }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry } = useMemo(() => {
    const size = 3.6; // 3D box size
    const geom = new THREE.PlaneGeometry(size, size, res - 1, res - 1);
    geom.rotateX(-Math.PI / 2); // Lay horizontal

    const pos = geom.attributes.position;
    const colorArray = new Float32Array(pos.count * 3);
    const effectiveMaxDepth = Math.max(20.0, maxDepth);
    const baseScale = 1.35; // True physical vertical depth scaling

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const vertexIndex = i * res + j;
        const d = depths[i][j];
        
        // Displace Y downward according to actual bathymetric depth
        const normalizedDepth = (d / effectiveMaxDepth) * baseScale;
        const visualY = -normalizedDepth;
        
        pos.setY(vertexIndex, visualY);

        // Color vertex based on GEBCO depth
        const c = getDepthColor(d, effectiveMaxDepth);
        colorArray[vertexIndex * 3] = c.r;
        colorArray[vertexIndex * 3 + 1] = c.g;
        colorArray[vertexIndex * 3 + 2] = c.b;
      }
    }

    geom.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geom.computeVertexNormals();

    return { geometry: geom };
  }, [depths, maxDepth, res]);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.65}
        metalness={0.15}
        flatShading={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * 3D Gently Animated Ocean Surface with realistic wave movement & light reflection
 */
const AnimatedOceanSurface: React.FC<{
  size: number;
  seaHeightOffset?: number;
}> = ({ size, seaHeightOffset = 0 }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, 32, 32);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [size]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime() * 0.9;
    const pos = meshRef.current.geometry.attributes.position;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const u = pos.getX(i);
      const w = pos.getZ(i);
      // Subtle gentle displacement
      const wave = Math.sin(u * 2.5 + t) * 0.018 + Math.cos(w * 2.0 + t * 0.8) * 0.015;
      pos.setY(i, wave + seaHeightOffset * 0.1);
    }
    pos.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geom} position={[0, 0, 0]}>
      <meshStandardMaterial
        color="#0284C7"
        transparent
        opacity={0.42}
        roughness={0.12}
        metalness={0.35}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

/**
 * 3D Physical Water Column Depth Layers (Depth-proportional horizontal slices)
 */
const WaterColumnDepthLayers: React.FC<{
  maxDepth: number;
  selectedVariable: string;
  selectedDepth: number;
  profileData?: CopernicusProfileResponse | null;
  variableValue?: number | null;
}> = ({ maxDepth, selectedVariable, selectedDepth, profileData, variableValue }) => {
  const size = 3.6;
  const effectiveMaxDepth = Math.max(20.0, maxDepth);
  const baseScale = 1.35;

  // Real depth levels from profile or standard support
  const depthLevels = useMemo(() => {
    if (profileData?.depths && profileData.depths.length > 0) {
      return profileData.depths.filter((d) => d < effectiveMaxDepth);
    }
    const stdDepths = [0, 5, 10, 20, 30, 50, 75, 100, 150, 200, 500, 1000, 1500, 2000];
    return stdDepths.filter((d) => d < effectiveMaxDepth);
  }, [profileData, effectiveMaxDepth]);

  if (selectedVariable !== 'temperature' && selectedVariable !== 'salinity' && selectedVariable !== 'mld') {
    return null;
  }

  return (
    <group>
      {/* 1. MLD Boundary Mode */}
      {selectedVariable === 'mld' && (
        (() => {
          const mldVal = Math.min(effectiveMaxDepth, variableValue ?? 35);
          const mldY = -(mldVal / effectiveMaxDepth) * baseScale;
          return (
            <group position={[0, mldY, 0]}>
              {/* Mixed Layer Boundary Plane */}
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[size, size]} />
                <meshStandardMaterial
                  color="#F59E0B"
                  transparent
                  opacity={0.55}
                  roughness={0.2}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Perimeter line */}
              <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(size, size)]} />
                <lineBasicMaterial color="#FBBF24" linewidth={2} />
              </lineSegments>
            </group>
          );
        })()
      )}

      {/* 2. Temperature or Salinity Depth Layers */}
      {(selectedVariable === 'temperature' || selectedVariable === 'salinity') &&
        depthLevels.map((d, idx) => {
          // Physical vertical position strictly proportional to real depth
          const visualY = -(d / effectiveMaxDepth) * baseScale;
          const isSelected = Math.abs(selectedDepth - d) < 2;

          let layerColor = new THREE.Color('#0284C7');
          if (selectedVariable === 'temperature') {
            const tempVal =
              profileData?.temperature?.[idx] ?? (idx > 0 ? (profileData?.temperature?.[idx - 1] ?? 4.0) : 28.0);
            layerColor = getTempColorThree(tempVal);
          } else if (selectedVariable === 'salinity') {
            const salVal = profileData?.salinity?.[idx] ?? 35.0;
            layerColor = getSalColorThree(salVal);
          }

          return (
            <group key={d} position={[0, visualY, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[size * 0.98, size * 0.98]} />
                <meshStandardMaterial
                  color={layerColor}
                  transparent
                  opacity={isSelected ? 0.65 : 0.28}
                  roughness={0.3}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {/* Layer boundary wireframe */}
              <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(size * 0.98, size * 0.98)]} />
                <lineBasicMaterial
                  color={isSelected ? '#FFFFFF' : layerColor}
                  transparent
                  opacity={isSelected ? 0.9 : 0.4}
                />
              </lineSegments>
            </group>
          );
        })}
    </group>
  );
};

/**
 * 3D Animated Geostrophic Current Particles (Flows along actual ugo/vgo heading and magnitude)
 */
const AnimatedCurrentParticles: React.FC<{
  currentData?: CopernicusCurrentResponse | null;
  maxDepth: number;
  selectedDepth: number;
}> = ({ currentData, maxDepth, selectedDepth }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const size = 3.6;
  const count = 120; // Lightweight particle density
  const effectiveMaxDepth = Math.max(20.0, maxDepth);
  const baseScale = 1.35;

  const u = currentData?.ugo ?? 0.15;
  const v = currentData?.vgo ?? 0.05;
  const speed = currentData?.speed ?? Math.sqrt(u * u + v * v);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);

    // Flow velocity vector mapped to 3D scene (X: Eastward u, Z: Northward -v)
    const normSpeed = Math.max(0.01, speed);
    const vx = (u / normSpeed) * (speed * 0.45 + 0.15);
    const vz = -(v / normSpeed) * (speed * 0.45 + 0.15);

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * (size * 0.95);
      // Particle distributed vertically through water column around depth
      const d = Math.random() * effectiveMaxDepth;
      pos[i * 3 + 1] = -(d / effectiveMaxDepth) * baseScale;
      pos[i * 3 + 2] = (Math.random() - 0.5) * (size * 0.95);

      vel[i * 3] = vx * (0.8 + Math.random() * 0.4);
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.005; // Gentle vertical eddy
      vel[i * 3 + 2] = vz * (0.8 + Math.random() * 0.4);
    }

    return { positions: pos, velocities: vel };
  }, [count, size, u, v, speed, effectiveMaxDepth, baseScale]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array as Float32Array;
    const bound = (size * 0.95) / 2;
    const dt = Math.min(0.05, delta);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx] += velocities[idx] * dt;
      arr[idx + 1] += velocities[idx + 1] * dt;
      arr[idx + 2] += velocities[idx + 2] * dt;

      // Wrap particles within 3D ocean volume
      if (arr[idx] > bound) arr[idx] = -bound;
      if (arr[idx] < -bound) arr[idx] = bound;
      if (arr[idx + 2] > bound) arr[idx + 2] = -bound;
      if (arr[idx + 2] < -bound) arr[idx + 2] = bound;
      if (arr[idx + 1] > 0) arr[idx + 1] = -baseScale * 0.95;
      if (arr[idx + 1] < -baseScale) arr[idx + 1] = 0;
    }

    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#38BDF8"
        size={0.075}
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  );
};

export const OceanChunk3DView: React.FC<OceanChunk3DViewProps> = ({
  chunkData,
  selectedVariable = 'temperature',
  variableValue,
  variableUnit = '°C',
  selectedDepth = 0,
  profileData,
  currentData,
  marineLifeEnabled = false,
  marineLifeSpecies = [],
  fishCount = 10,
}) => {
  const controlsRef = useRef<OrbitControlsType>(null);
  const maxDepth = chunkData.statistics.max_depth_m || 50.0;
  const selectedPt = chunkData.selected_point;
  const size = 3.6;
  const effectiveMaxDepth = Math.max(20.0, maxDepth);
  const baseScale = 1.35;
  const visualMaxY = -baseScale;
  const centerDepthY = -(selectedPt.depth / effectiveMaxDepth) * baseScale;
  const targetDepthY = -(selectedDepth / effectiveMaxDepth) * baseScale;

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  // Depth-dependent background — dark navy palette that stays readable at all depths
  const bgColor =
    selectedDepth < 50
      ? '#08192D'
      : selectedDepth < 200
      ? '#071828'
      : selectedDepth < 1000
      ? '#081828'
      : '#0A1E35';

  const ambientIntensity = Math.max(0.70, 0.85 - selectedDepth * 0.00008);
  const sunIntensity = Math.max(0.92, 1.3 - selectedDepth * 0.00015);
  const fogFar = selectedDepth < 200 ? 16.0 : selectedDepth < 1000 ? 20.0 : 26.0;

  return (
    <div className="relative w-full h-[480px] rounded-xl overflow-hidden border border-[#E2E8F0]" style={{ backgroundColor: bgColor }}>
      <Canvas
        camera={{ position: [2.8, 2.3, 3.4], fov: 45 }}
        shadows
        gl={{ antialias: true, toneMappingExposure: 1.25 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={ambientIntensity} color="#E0F2FE" />
        <hemisphereLight args={['#E0F2FE', '#1A3050', 0.58]} />
        <directionalLight
          position={[6, 10, 8]}
          intensity={sunIntensity}
          castShadow
          color="#FFFFFF"
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight
          position={[-6, -4, -6]}
          intensity={0.55}
          color="#38BDF8"
        />
        <pointLight
          position={[0, 2.5, 0]}
          intensity={0.65}
          color="#BAE6FD"
          distance={16}
        />

        <fog
          attach="fog"
          args={[
            selectedDepth < 200 ? '#0B2545' : selectedDepth < 1000 ? '#0C2340' : '#0E2848',
            5.5,
            fogFar,
          ]}
        />

        {/* 1. 3D Seabed from GEBCO elevation grid */}
        <SeabedTerrain
          depths={chunkData.depths}
          maxDepth={maxDepth}
          res={chunkData.grid_resolution}
        />

        {/* 2. Gently animated 3D Ocean Surface */}
        <AnimatedOceanSurface
          size={size}
          seaHeightOffset={selectedVariable === 'height' ? (variableValue ?? 0) : 0}
        />

        {/* 3. Water Column Depth Layers (Temperature / Salinity / MLD) */}
        <WaterColumnDepthLayers
          maxDepth={maxDepth}
          selectedVariable={selectedVariable}
          selectedDepth={selectedDepth}
          profileData={profileData}
          variableValue={variableValue}
        />

        {/* 4. Animated Current Flow Particles */}
        {selectedVariable === 'current' && (
          <AnimatedCurrentParticles
            currentData={currentData}
            maxDepth={maxDepth}
            selectedDepth={selectedDepth}
          />
        )}

        {/* 5. Water Column Corner Depth Guides & Center Sounding Line */}
        <group>
          {/* Surface Perimeter Border */}
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(size, size)]} />
            <lineBasicMaterial color="#38BDF8" transparent opacity={0.6} />
          </lineSegments>

          {/* Corner Columns */}
          {[
            [-size / 2, -size / 2],
            [size / 2, -size / 2],
            [size / 2, size / 2],
            [-size / 2, size / 2],
          ].map(([x, z], idx) => (
            <line key={idx}>
              <bufferGeometry
                attach="geometry"
                {...new THREE.BufferGeometry().setFromPoints([
                  new THREE.Vector3(x, 0, z),
                  new THREE.Vector3(x, visualMaxY, z),
                ])}
              />
              <lineDashedMaterial color="#64748B" dashSize={0.08} gapSize={0.05} />
            </line>
          ))}

          {/* Sounding Line at Selected Center Location */}
          <line>
            <bufferGeometry
              attach="geometry"
              {...new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0.05, 0),
                new THREE.Vector3(0, centerDepthY, 0),
              ])}
            />
            <lineBasicMaterial color="#F59E0B" linewidth={2} />
          </line>

          {/* Surface Buoy */}
          <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
            <meshStandardMaterial color="#F59E0B" emissive="#D97706" emissiveIntensity={0.5} />
          </mesh>

          {/* Selected Depth Level Indicator Plane */}
          {selectedDepth > 0 && selectedDepth <= effectiveMaxDepth && (
            <group position={[0, targetDepthY, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[size, size]} />
                <meshBasicMaterial color="#38BDF8" transparent opacity={0.12} side={THREE.DoubleSide} />
              </mesh>
              <lineSegments>
                <edgesGeometry args={[new THREE.PlaneGeometry(size, size)]} />
                <lineBasicMaterial color="#38BDF8" transparent opacity={0.8} />
              </lineSegments>
            </group>
          )}

          {/* Seabed Sounding Anchor */}
          <mesh position={[0, centerDepthY, 0]}>
            <sphereGeometry args={[0.045, 16, 16]} />
            <meshStandardMaterial color="#EF4444" emissive="#DC2626" emissiveIntensity={0.6} />
          </mesh>
        </group>

        {/* 6. Marine Life Layer */}
        {marineLifeEnabled && marineLifeSpecies.length > 0 && (
          <MarineLifeLayer
            species={marineLifeSpecies}
            maxDepth={maxDepth}
            selectedDepth={selectedDepth}
            fishCount={fishCount}
          />
        )}

        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1.8}
          maxDistance={8.0}
          target={[0, -0.6, 0]}
        />
      </Canvas>

      {/* ─── Top Left: Coordinates & Real Depth Badge ─── */}
      <div className="absolute top-3 left-3 bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E2E8F0] p-3 rounded-xl shadow-sm text-xs font-sans text-[#172033] max-w-xs pointer-events-none">
        <div className="flex items-center gap-1.5 font-bold text-[#0B84C6] uppercase tracking-wider text-[10px] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#0B84C6] animate-pulse"></span>
          <span>GEBCO 3D Seabed & Water Column</span>
        </div>
        <div className="font-semibold text-sm text-[#172033]">
          {formatCoordinates(selectedPt.latitude, selectedPt.longitude)}
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-[#F1F5F9] space-y-0.5 text-[11px] text-[#64748B]">
          <div className="flex justify-between">
            <span>Bathymetric Depth:</span>
            <span className="font-bold text-[#172033]">
              {selectedPt.is_ocean ? `${selectedPt.depth} m` : '0 m (Coast/Land)'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Selected Water Layer:</span>
            <span className="font-bold text-[#0B84C6]">{selectedDepth} m</span>
          </div>
          <div className="flex justify-between">
            <span>Active Variable:</span>
            <span className="font-medium text-[#172033] capitalize">{selectedVariable}</span>
          </div>
        </div>
      </div>

      {/* ─── Top Right: Exclusive Variable Legend & Telemetry Overlay ─── */}
      <div className="absolute top-3 right-3 bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E2E8F0] p-3 rounded-xl shadow-sm text-xs font-sans text-[#172033] min-w-[190px] pointer-events-none">
        <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-1">
          {selectedVariable === 'current' ? 'Geostrophic Current' : selectedVariable.toUpperCase()} (Layer {selectedDepth}m)
        </div>
        <div className="text-lg font-bold text-[#0B84C6]">
          {variableValue !== undefined && variableValue !== null
            ? formatValue(variableValue, variableUnit)
            : 'Measuring...'}
        </div>

        {/* Scientific Colormap Legend based on exclusive variable */}
        {selectedVariable === 'temperature' && (
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] space-y-1">
            <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
              <span>0°C</span>
              <span>15°C</span>
              <span>30°C+</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#1E3A8A] via-[#10B981] via-[#F59E0B] to-[#EF4444]"></div>
          </div>
        )}

        {selectedVariable === 'salinity' && (
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] space-y-1">
            <div className="flex justify-between text-[10px] text-[#64748B] font-mono">
              <span>30 PSU</span>
              <span>35 PSU</span>
              <span>38 PSU</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gradient-to-r from-[#0D9488] via-[#0284C7] via-[#F59E0B] to-[#EA580C]"></div>
          </div>
        )}

        {selectedVariable === 'current' && currentData && (
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] text-[10px] text-[#64748B] space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span>Heading:</span>
              <span className="font-semibold text-[#172033]">{currentData.direction_degrees}°</span>
            </div>
            <div className="flex justify-between">
              <span>Eastward (u):</span>
              <span className="font-semibold text-[#172033]">{currentData.ugo} m/s</span>
            </div>
            <div className="flex justify-between">
              <span>Northward (v):</span>
              <span className="font-semibold text-[#172033]">{currentData.vgo} m/s</span>
            </div>
          </div>
        )}

        {selectedVariable === 'mld' && (
          <div className="mt-2 pt-2 border-t border-[#F1F5F9] text-[10px] text-[#64748B]">
            <span className="font-semibold text-[#D97706]">Thermocline Boundary</span>
          </div>
        )}
      </div>

      {/* ─── Bottom Right: Reset 3D View Button ─── */}
      <div className="absolute bottom-3 right-3">
        <button
          onClick={resetCamera}
          className="px-3 py-1.5 bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#475569] hover:text-[#172033] text-xs font-semibold rounded-lg border border-[#E2E8F0] shadow-sm transition-all"
        >
          Reset View
        </button>
      </div>
    </div>
  );
};
