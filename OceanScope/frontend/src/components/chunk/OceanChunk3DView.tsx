import React, { useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from 'three';
import { BathymetryChunkResponse } from '../../services/oceanChunkService';
import type { MarineLifeSpecies } from '../../services/oceanChunkService';
import { formatCoordinates, formatValue } from '../../utils/formatters';
import MarineLifeLayer from './MarineLifeLayer';

interface OceanChunk3DViewProps {
  chunkData: BathymetryChunkResponse;
  verticalExaggeration: number; // 1, 2, 5, 10
  selectedVariable?: string;
  variableValue?: number | null;
  variableUnit?: string;
  selectedDepth?: number;
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
    // Coastal Shelf (0 - 15%): Aqua/Teal (#06B6D4)
    return new THREE.Color('#06B6D4').lerp(new THREE.Color('#0284C7'), ratio / 0.15);
  } else if (ratio < 0.5) {
    // Continental Slope (15 - 50%): Ocean Blue (#0284C7 -> #1D4ED8)
    return new THREE.Color('#0284C7').lerp(new THREE.Color('#1E3A8A'), (ratio - 0.15) / 0.35);
  } else {
    // Abyssal Plain (50 - 100%): Deep Navy/Midnight (#1E3A8A -> #050E24)
    return new THREE.Color('#1E3A8A').lerp(new THREE.Color('#050E24'), (ratio - 0.5) / 0.5);
  }
}

/**
 * 3D Seabed Mesh Geometry with dynamic vertex height displacement from GEBCO grid
 */
const SeabedTerrain: React.FC<{
  depths: number[][];
  maxDepth: number;
  verticalExaggeration: number;
  res: number;
}> = ({ depths, maxDepth, verticalExaggeration, res }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const { geometry, colors } = useMemo(() => {
    const size = 3.6; // 3D box size
    const geom = new THREE.PlaneGeometry(size, size, res - 1, res - 1);
    geom.rotateX(-Math.PI / 2); // Lay horizontal

    const pos = geom.attributes.position;
    const colorArray = new Float32Array(pos.count * 3);
    const effectiveMaxDepth = Math.max(20.0, maxDepth);
    const baseScale = 1.2; // Base visual depth in 3D scene

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const vertexIndex = i * res + j;
        const d = depths[i][j];
        
        // Displace Y downward according to actual bathymetric depth
        const normalizedDepth = (d / effectiveMaxDepth) * baseScale;
        const visualY = -normalizedDepth * (verticalExaggeration === 1 ? 0.6 : verticalExaggeration === 2 ? 1.0 : verticalExaggeration === 5 ? 1.8 : 2.5);
        
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

    return { geometry: geom, colors: colorArray };
  }, [depths, maxDepth, verticalExaggeration, res]);

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
 * Semi-Transparent Water Surface & Water Column Volume
 */
const WaterSurfaceAndColumn: React.FC<{
  depths: number[][];
  maxDepth: number;
  verticalExaggeration: number;
  selectedPointDepth: number;
}> = ({ maxDepth, verticalExaggeration, selectedPointDepth }) => {
  const size = 3.6;
  const effectiveMaxDepth = Math.max(20.0, maxDepth);
  const baseScale = 1.2;
  const visualMaxY = -(baseScale * (verticalExaggeration === 1 ? 0.6 : verticalExaggeration === 2 ? 1.0 : verticalExaggeration === 5 ? 1.8 : 2.5));
  const centerDepthY = -(selectedPointDepth / effectiveMaxDepth) * baseScale * (verticalExaggeration === 1 ? 0.6 : verticalExaggeration === 2 ? 1.0 : verticalExaggeration === 5 ? 1.8 : 2.5);

  return (
    <group>
      {/* 1. Sea Surface Plane (Depth = 0m) */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          color="#0284C7"
          transparent
          opacity={0.35}
          roughness={0.1}
          metalness={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Surface Perimeter Border */}
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(size, size)]} />
        <lineBasicMaterial color="#38BDF8" transparent opacity={0.6} />
      </lineSegments>

      {/* 2. Water Column Corner Depth Guides */}
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

      {/* 3. Sounding Line at Selected Center Location */}
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

      {/* Surface Target Buoy */}
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
        <meshStandardMaterial color="#F59E0B" emissive="#D97706" emissiveIntensity={0.5} />
      </mesh>

      {/* Seabed Sounding Anchor */}
      <mesh position={[0, centerDepthY, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color="#EF4444" emissive="#DC2626" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
};

export const OceanChunk3DView: React.FC<OceanChunk3DViewProps> = ({
  chunkData,
  verticalExaggeration,
  selectedVariable = 'temperature',
  variableValue,
  variableUnit = '°C',
  selectedDepth = 0,
  marineLifeEnabled = false,
  marineLifeSpecies = [],
  fishCount = 10,
}) => {
  const controlsRef = useRef<OrbitControlsType>(null);
  const maxDepth = chunkData.statistics.max_depth_m || 50.0;
  const selectedPt = chunkData.selected_point;

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  // Depth-dependent background and lighting intensity
  const bgColor = selectedDepth < 50 ? '#071A2E' : selectedDepth < 200 ? '#051325' : selectedDepth < 1000 ? '#030D1A' : '#010810';
  const ambientIntensity = Math.max(0.25, 0.85 - selectedDepth * 0.0006);
  const sunIntensity = Math.max(0.2, 1.4 - selectedDepth * 0.001);

  return (
    <div className="relative w-full h-[480px] rounded-xl overflow-hidden border border-[#E2E8F0]" style={{ backgroundColor: bgColor }}>
      <Canvas
        camera={{ position: [2.6, 2.4, 3.2], fov: 45 }}
        shadows
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Depth-adaptive lighting */}
        <ambientLight intensity={ambientIntensity} color={selectedDepth < 200 ? '#E0F2FE' : '#1E3A5F'} />
        <directionalLight position={[6, 10, 8]} intensity={sunIntensity} castShadow color={selectedDepth < 200 ? '#FFFFFF' : '#4A90B8'} />
        <directionalLight position={[-6, -4, -6]} intensity={0.3} color="#38BDF8" />
        <pointLight position={[0, 2, 0]} intensity={Math.max(0.15, 0.6 - selectedDepth * 0.0005)} color="#E0F2FE" />

        {/* Depth-dependent underwater haze */}
        <fog
          attach="fog"
          args={[
            selectedDepth < 200 ? '#0A4D7A' : selectedDepth < 1000 ? '#041C30' : '#010810',
            selectedDepth < 50 ? 3.0 : 1.5,
            selectedDepth < 50 ? 12.0 : selectedDepth < 200 ? 8.0 : selectedDepth < 1000 ? 5.5 : 3.5,
          ]}
        />

        {/* 3D Seabed from GEBCO elevation grid */}
        <SeabedTerrain
          depths={chunkData.depths}
          maxDepth={maxDepth}
          verticalExaggeration={verticalExaggeration}
          res={chunkData.grid_resolution}
        />

        {/* Water Surface & Water Column Sounding */}
        <WaterSurfaceAndColumn
          depths={chunkData.depths}
          maxDepth={maxDepth}
          verticalExaggeration={verticalExaggeration}
          selectedPointDepth={selectedPt.depth}
        />

        {/* Marine Life Layer */}
        {marineLifeEnabled && marineLifeSpecies.length > 0 && (
          <MarineLifeLayer
            species={marineLifeSpecies}
            maxDepth={maxDepth}
            verticalExaggeration={verticalExaggeration}
            selectedDepth={selectedDepth}
            fishCount={fishCount}
          />
        )}

        {/* Interactive Controls */}
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
      <div className="absolute top-3 left-3 bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E2E8F0] p-3 rounded-xl shadow-sm text-xs font-sans text-[#172033] max-w-xs">
        <div className="flex items-center gap-1.5 font-bold text-[#0B84C6] uppercase tracking-wider text-[10px] mb-1">
          <span className="w-2 h-2 rounded-full bg-[#0B84C6] animate-pulse"></span>
          <span>GEBCO 3D Seabed Mesh</span>
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
            <span>Seabed Elevation:</span>
            <span className="font-medium text-[#475569]">{selectedPt.elevation} m</span>
          </div>
          <div className="flex justify-between">
            <span>Chunk Depth Range:</span>
            <span className="font-medium text-[#475569]">
              {chunkData.statistics.min_depth_m}m – {chunkData.statistics.max_depth_m}m
            </span>
          </div>
        </div>
      </div>

      {/* ─── Top Right: Oceanographic State Telemetry Overlay ─── */}
      {variableValue !== undefined && variableValue !== null && (
        <div className="absolute top-3 right-3 bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E2E8F0] p-3 rounded-xl shadow-sm text-xs font-sans text-[#172033] min-w-[170px]">
          <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-1">
            Copernicus Model State
          </div>
          <div className="text-xs text-[#64748B] capitalize">{selectedVariable} (Depth {selectedDepth}m)</div>
          <div className="text-lg font-bold text-[#0B84C6] mt-0.5">
            {formatValue(variableValue, variableUnit)}
          </div>
        </div>
      )}

      {/* ─── Bottom Right: Reset 3D View Button ─── */}
      <div className="absolute bottom-3 right-3">
        <button
          onClick={resetCamera}
          className="px-3 py-1.5 bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#475569] hover:text-[#172033] text-xs font-semibold rounded-lg border border-[#E2E8F0] shadow-sm transition-all"
        >
          Reset View
        </button>
      </div>

      {/* ─── Bottom Left: Visual Exaggeration Indicator ─── */}
      <div className="absolute bottom-3 left-3 bg-[#FFFFFF]/90 backdrop-blur-sm border border-[#E2E8F0] px-2.5 py-1 rounded-md text-[10px] text-[#64748B] font-mono">
        Vertical Exaggeration: <strong className="text-[#0B84C6]">{verticalExaggeration}×</strong> (Visual only)
      </div>
    </div>
  );
};
