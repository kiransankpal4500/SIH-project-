/**
 * Premium 3D Oceanographic Cutaway Visualization
 * - Unified coordinate system: Ocean surface at y = 0, seabed at y = -depthRatio * chunkHeight (0 to -chunkHeight)
 * - Continuous ocean surface covering the chunk with physical wave displacement & Fresnel highlights
 * - Coherent water column volume extending from surface (y=0) to bedrock (y=-chunkHeight)
 * - Measured GEBCO bathymetric seabed mesh with natural relief and PBR normal mapping
 * - Subsurface lithostratigraphic cutaway skirt adhering tightly to measured GEBCO elevations
 * - Illustrative depth-zoned marine life placed naturally on terrain and in water column
 * - Centered, balanced three-quarter perspective camera showing surface, water column, seabed, and geology
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from 'three';
import {
  Thermometer,
  AlertCircle,
  Navigation,
  RotateCcw,
  Compass,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useFullscreen } from '../../hooks/useFullscreen';
import { BathymetryChunkResponse, CopernicusProfileResponse, CopernicusCurrentResponse } from '../../services/oceanChunkService';
import type { MarineLifeSpecies } from '../../services/oceanChunkService';
import { createRealisticSeabedTexture, createPhotorealisticGeologyTexture, getPolyHavenSeabedTextures } from './underwaterTextures';
import { UnderwaterLightingAndAtmosphere } from './UnderwaterAtmosphere';
import { Scientific3DDepthRuler } from './Scientific3DDepthRuler';
import {
  FishSchoolGroup,
  PhotorealisticKelpStems,
  NaturalCoralReefCluster,
  PhotorealisticJellyfish,
  DeepSeaAnglerLure,
} from './PhotorealisticMarineOrganisms';

interface OceanChunk3DViewProps {
  chunkData: BathymetryChunkResponse;
  selectedVariable?: 'temperature' | 'salinity' | 'current' | 'mld' | 'height';
  variableValue?: number | null;
  variableUnit?: string;
  selectedDepth?: number;
  minDepth?: number;
  maxDepth?: number;
  mldDepth?: number | null;
  profileData?: CopernicusProfileResponse | null;
  loadingProfile?: boolean;
  profileError?: string | null;
  currentData?: CopernicusCurrentResponse | null;
  onResetCamera?: () => void;
  marineLifeEnabled?: boolean;
  marineLifeSpecies?: MarineLifeSpecies[];
  fishCount?: number;
  showGeology?: boolean;
  showWaterVolume?: boolean;
  showMarineSnow?: boolean;
  hideControls?: boolean;
  onCaptureReady?: (dataUrl: string) => void;
}

/**
 * Scene snapshot capture bridge that rasterizes Three.js canvas to PNG data URL
 */
const SceneCaptureBridge: React.FC<{ onCapture?: (dataUrl: string) => void }> = ({ onCapture }) => {
  const { gl, scene, camera } = useThree();
  const frameCount = useRef(0);
  const capturedRef = useRef(false);

  useFrame(() => {
    if (capturedRef.current || !onCapture) return;
    frameCount.current += 1;
    // Wait for 4 render passes to ensure all PBR textures, geometries, and lighting are rasterized
    if (frameCount.current >= 4) {
      try {
        gl.render(scene, camera);
        const dataUrl = gl.domElement.toDataURL('image/png');
        if (dataUrl && dataUrl.length > 5000) {
          capturedRef.current = true;
          onCapture(dataUrl);
        }
      } catch (err) {
        console.warn('[OceanChunk3DView] Snapshot capture error:', err);
      }
    }
  });

  return null;
};


/**
 * Continuous Ocean Surface with Realistic Waves & Highlights
 */
/**
 * High-Fidelity Ocean Surface with Gerstner Multi-Spectral Waves & Sun Glint (Inspired by Web Ocean 3D)
 */
const RealisticOceanSurface: React.FC<{ size: number }> = ({ size }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const geom = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, 64, 64);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [size]);

  // Gerstner wave harmonic parameters: [directionX, directionZ, steepness, wavelength, speed]
  const waves = useMemo(
    () => [
      { dir: new THREE.Vector2(0.8, 0.6).normalize(), steepness: 0.12, wavelength: 1.8, speed: 0.9 },
      { dir: new THREE.Vector2(-0.5, 0.86).normalize(), steepness: 0.08, wavelength: 1.1, speed: 1.2 },
      { dir: new THREE.Vector2(0.3, -0.95).normalize(), steepness: 0.05, wavelength: 0.65, speed: 1.6 },
      { dir: new THREE.Vector2(1.0, 0.0).normalize(), steepness: 0.03, wavelength: 0.35, speed: 2.1 },
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const pos = meshRef.current.geometry.attributes.position;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      const x0 = pos.getX(i);
      const z0 = pos.getZ(i);

      let dy = 0;
      let dx = 0;
      let dz = 0;

      for (const w of waves) {
        const k = (2 * Math.PI) / w.wavelength;
        const c = Math.sqrt(9.8 / k) * 0.4 * w.speed;
        const f = k * (w.dir.x * x0 + w.dir.y * z0) - c * t;
        const a = w.steepness / k;

        dx += w.dir.x * (a * Math.cos(f));
        dz += w.dir.y * (a * Math.cos(f));
        dy += a * Math.sin(f);
      }

      // Small high-frequency micro-capillary ripples
      dy += Math.sin(x0 * 12.0 + t * 3.0) * 0.003 + Math.cos(z0 * 10.0 + t * 2.5) * 0.003;

      pos.setY(i, dy);
    }
    pos.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  });

  return (
    <mesh ref={meshRef} geometry={geom} position={[0, 0, 0]}>
      <meshPhysicalMaterial
        color="#0284c7"
        roughness={0.06}
        metalness={0.12}
        transmission={0.48}
        ior={1.333}
        transparent
        opacity={0.84}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

/**
 * Natural GEBCO Seabed Terrain & Finished Geological Cross-Section Skirt
 */
const PhotorealisticSeabedAndGeology: React.FC<{
  depths: number[][];
  maxDepthM: number;
  minDepthM: number;
  res: number;
  width: number;
  chunkHeight: number;
  showGeology?: boolean;
}> = ({ depths, maxDepthM, minDepthM, res, width, chunkHeight, showGeology = true }) => {
  const { albedo: seabedAlbedo, normal: seabedNormal } = useMemo(() => createRealisticSeabedTexture(), []);
  const polyHavenTextures = useMemo(() => {
    try {
      return getPolyHavenSeabedTextures();
    } catch {
      return null;
    }
  }, []);
  const geoTexture = useMemo(() => createPhotorealisticGeologyTexture(), []);

  const { seabedGeom, skirtGeom } = useMemo(() => {
    const baseFloorY = -chunkHeight;
    const effectiveSpan = Math.max(50, maxDepthM - minDepthM);

    // 1. Seabed Mesh from GEBCO Matrix
    const sGeom = new THREE.PlaneGeometry(width, width, res - 1, res - 1);
    sGeom.rotateX(-Math.PI / 2);
    const pos = sGeom.attributes.position;

    for (let i = 0; i < res; i++) {
      for (let j = 0; j < res; j++) {
        const idx = i * res + j;
        const d = depths?.[i]?.[j] ?? ((minDepthM + maxDepthM) / 2);
        const depthRatio = Math.min(1.0, Math.max(0.0, (d - minDepthM) / effectiveSpan));
        // Consistent physical datum: 0m is surface (y = 0), seabed depth scales smoothly between -chunkHeight*0.4 and -chunkHeight*0.9
        const y = -chunkHeight * 0.42 - depthRatio * (chunkHeight * 0.48);
        pos.setY(idx, y);
      }
    }
    sGeom.computeVertexNormals();

    // 2. Geological Perimeter Wall Skirt with correct outward-facing quad winding
    const skirtVerts: number[] = [];
    const skirtUvs: number[] = [];

    const getPt = (row: number, col: number) => {
      const idx = row * res + col;
      return new THREE.Vector3(pos.getX(idx), pos.getY(idx), pos.getZ(idx));
    };

    // Winding helper: ensures normals face OUTWARDS from chunk interior
    const pushQuadOutward = (topA: THREE.Vector3, topB: THREE.Vector3, u0: number, u1: number) => {
      const botA = new THREE.Vector3(topA.x, baseFloorY, topA.z);
      const botB = new THREE.Vector3(topB.x, baseFloorY, topB.z);

      // Triangle 1: topA -> botA -> topB
      skirtVerts.push(topA.x, topA.y, topA.z, botA.x, botA.y, botA.z, topB.x, topB.y, topB.z);
      skirtUvs.push(u0, 0, u0, 1, u1, 0);

      // Triangle 2: topB -> botA -> botB
      skirtVerts.push(topB.x, topB.y, topB.z, botA.x, botA.y, botA.z, botB.x, botB.y, botB.z);
      skirtUvs.push(u1, 0, u0, 1, u1, 1);
    };

    // Front edge (+Z face): from left (col 0) to right (col res-1) along row res-1
    for (let c = 0; c < res - 1; c++) {
      pushQuadOutward(getPt(res - 1, c), getPt(res - 1, c + 1), c / (res - 1), (c + 1) / (res - 1));
    }
    // Right edge (+X face): from front (row res-1) to back (row 0) along col res-1
    for (let r = res - 1; r > 0; r--) {
      pushQuadOutward(getPt(r, res - 1), getPt(r - 1, res - 1), (res - 1 - r) / (res - 1), (res - r) / (res - 1));
    }
    // Back edge (-Z face): from right (col res-1) to left (col 0) along row 0
    for (let c = res - 1; c > 0; c--) {
      pushQuadOutward(getPt(0, c), getPt(0, c - 1), (res - 1 - c) / (res - 1), (res - c) / (res - 1));
    }
    // Left edge (-X face): from back (row 0) to front (row res-1) along col 0
    for (let r = 0; r < res - 1; r++) {
      pushQuadOutward(getPt(r, 0), getPt(r + 1, 0), r / (res - 1), (r + 1) / (res - 1));
    }

    const skGeom = new THREE.BufferGeometry();
    skGeom.setAttribute('position', new THREE.Float32BufferAttribute(skirtVerts, 3));
    skGeom.setAttribute('uv', new THREE.Float32BufferAttribute(skirtUvs, 2));
    skGeom.computeVertexNormals();

    return { seabedGeom: sGeom, skirtGeom: skGeom };
  }, [depths, maxDepthM, minDepthM, res, width, chunkHeight]);

  useEffect(() => {
    return () => {
      seabedGeom.dispose();
      skirtGeom.dispose();
      seabedAlbedo.dispose();
      seabedNormal.dispose();
      geoTexture.dispose();
      if (polyHavenTextures) {
        polyHavenTextures.diffuse.dispose();
        polyHavenTextures.normal.dispose();
        polyHavenTextures.arm.dispose();
      }
    };
  }, [seabedGeom, skirtGeom, seabedAlbedo, seabedNormal, geoTexture, polyHavenTextures]);

  return (
    <group>
      {/* 1. Measured GEBCO Seabed Surface with Poly Haven PBR Shading & Procedural Fallback */}
      <mesh geometry={seabedGeom} receiveShadow castShadow>
        <meshStandardMaterial
          map={polyHavenTextures?.diffuse || seabedAlbedo}
          normalMap={polyHavenTextures?.normal || seabedNormal}
          normalScale={new THREE.Vector2(0.85, 0.85)}
          roughness={0.75}
          metalness={0.06}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 2. Sub-surface Geological Wall Cutaways */}
      {showGeology && (
        <>
          <mesh geometry={skirtGeom} receiveShadow castShadow>
            <meshStandardMaterial
              map={geoTexture}
              roughness={0.82}
              metalness={0.05}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* 3. Watertight Bottom Bedrock Plate */}
          <mesh position={[0, -chunkHeight, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[width, width]} />
            <meshStandardMaterial color="#131618" roughness={0.92} />
          </mesh>
        </>
      )}
    </group>
  );
};

/**
 * Depth-Zoned Realistic Flora & Fauna Habitat anchored to real terrain
 */
const PhotorealisticEcosystemZoning: React.FC<{
  minDepthM: number;
  maxDepthM: number;
  width: number;
  chunkHeight: number;
}> = ({ minDepthM, maxDepthM, width, chunkHeight }) => {
  const avgDepth = (minDepthM + maxDepthM) / 2;

  // 1. Epipelagic Sunlight Zone (0–200 m)
  if (avgDepth < 200) {
    return (
      <group>
        {/* Pelagic schooling fish in upper column */}
        <FishSchoolGroup centerPos={[0, -chunkHeight * 0.22, 0]} count={9} bounds={width * 0.75} />
        {/* Benthic Kelp anchored on seabed margin */}
        <PhotorealisticKelpStems position={[-width * 0.28, -chunkHeight * 0.68, -width * 0.2]} bladeCount={6} />
        <PhotorealisticKelpStems position={[width * 0.3, -chunkHeight * 0.7, width * 0.25]} bladeCount={5} />
        {/* Coral substrate rock anchored to seabed */}
        <NaturalCoralReefCluster position={[-width * 0.2, -chunkHeight * 0.71, width * 0.18]} scale={1.1} />
        <NaturalCoralReefCluster position={[width * 0.22, -chunkHeight * 0.72, -width * 0.22]} scale={0.9} />
      </group>
    );
  }

  // 2. Mesopelagic Twilight Zone (200–1,000 m)
  if (avgDepth < 1000) {
    return (
      <group>
        {/* Translucent Pelagic Jellyfish drifting in midwater */}
        <PhotorealisticJellyfish position={[-0.4, -chunkHeight * 0.38, 0.2]} scale={1.2} />
        <PhotorealisticJellyfish position={[0.5, -chunkHeight * 0.52, -0.3]} scale={0.95} />
        <PhotorealisticJellyfish position={[0.1, -chunkHeight * 0.65, 0.4]} scale={1.1} />
      </group>
    );
  }

  // 3. Bathypelagic & Abyssal Midnight Zones (1,000–6,000+ m)
  return (
    <group>
      {/* Deep-sea anglerfish near abyssal seabed with active bioluminescent esca */}
      <DeepSeaAnglerLure position={[-0.35, -chunkHeight * 0.68, 0.15]} scale={1.2} />
      <DeepSeaAnglerLure position={[0.45, -chunkHeight * 0.75, -0.25]} scale={1.0} />
    </group>
  );
};

/**
 * Physical MLD Pycnocline Boundary Layer across water column
 */
const MLDPycnoclineBoundary: React.FC<{
  width: number;
  yPos: number;
  mldDepth: number;
}> = ({ width, yPos, mldDepth }) => {
  return (
    <group position={[0, yPos, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, width]} />
        <meshStandardMaterial
          color="#a855f7"
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthWrite={false}
          roughness={0.1}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(width, width)]} />
        <lineBasicMaterial color="#c084fc" transparent opacity={0.7} />
      </lineSegments>
    </group>
  );
};

/**
 * Animated Geostrophic Current Flow Vectors
 */
const GeostrophicCurrentVectors: React.FC<{
  width: number;
  speed: number;
  directionDeg: number;
  chunkHeight: number;
}> = ({ width, speed, directionDeg, chunkHeight }) => {
  const groupRef = useRef<THREE.Group>(null);
  const arrows = useMemo(() => {
    const rad = (directionDeg * Math.PI) / 180;
    // In Three.js: +X is East, -Z is North
    const dirVec = new THREE.Vector3(Math.sin(rad), 0, -Math.cos(rad)).normalize();
    const list: Array<{ pos: [number, number, number]; dir: THREE.Vector3; len: number }> = [];
    const spacing = 1.1;
    for (let x = -width * 0.35; x <= width * 0.35; x += spacing) {
      for (let z = -width * 0.35; z <= width * 0.35; z += spacing) {
        list.push({
          pos: [x, -chunkHeight * 0.16, z],
          dir: dirVec,
          len: Math.max(0.3, Math.min(0.7, speed * 1.5)),
        });
      }
    }
    return list;
  }, [width, speed, directionDeg, chunkHeight]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.position.y = Math.sin(t * 1.5) * 0.02;
  });

  return (
    <group ref={groupRef}>
      {arrows.map((a, i) => (
        <primitive
          key={i}
          object={new THREE.ArrowHelper(a.dir, new THREE.Vector3(...a.pos), a.len, 0x38bdf8, 0.12, 0.07)}
        />
      ))}
    </group>
  );
};

/**
 * Coordinate System & Geographic Axis Mapping Documentation:
 * In the 3D Ocean Chunk coordinate space:
 * - World +Z corresponds to Geographic NORTH (positive latitude direction)
 * - World -Z corresponds to Geographic SOUTH (negative latitude direction)
 * - World +X corresponds to Geographic EAST (positive longitude direction)
 * - World -X corresponds to Geographic WEST (negative longitude direction)
 * - World +Y corresponds to SEA SURFACE datum (y = 0)
 * - World -Y corresponds to WATER DEPTH down to BEDROCK (y = -chunkHeight)
 */

function interpolateTemperature(
  depthM: number,
  depths: number[],
  temps: (number | null)[]
): number | null {
  const points: Array<{ d: number; t: number }> = [];
  for (let i = 0; i < depths.length; i++) {
    const t = temps[i];
    if (t !== null && t !== undefined && !isNaN(t)) {
      points.push({ d: depths[i], t });
    }
  }
  if (points.length === 0) return null;
  points.sort((a, b) => a.d - b.d);

  if (depthM <= points[0].d) return points[0].t;
  const last = points[points.length - 1];
  if (depthM >= last.d) {
    const extra = depthM - last.d;
    const benthic = 4.0; // Standard abyssal baseline in Indian Ocean basin
    const decay = Math.exp(-extra / 600);
    return benthic + (last.t - benthic) * decay;
  }

  for (let i = 0; i < points.length - 1; i++) {
    if (depthM >= points[i].d && depthM <= points[i + 1].d) {
      const span = points[i + 1].d - points[i].d;
      const frac = span > 0 ? (depthM - points[i].d) / span : 0;
      return points[i].t + frac * (points[i + 1].t - points[i].t);
    }
  }
  return last.t;
}

/**
 * 5-Stop Intuitive Scientific Ocean Temperature Colormap:
 * - Deep Blue: Colder deep water (#1e3a8a, rgb(30, 58, 138))
 * - Cool Cyan: Moderate depth (#06b6d4, rgb(6, 182, 212))
 * - Green/Yellow: Thermocline transition (#84cc16, rgb(132, 204, 22))
 * - Warm Orange: Upper photic zone (#f97316, rgb(249, 115, 22))
 * - Hot Red: Warmer sea surface (#ef4444, rgb(239, 68, 68))
 */
function getTemperatureRgb(t: number, minT: number, maxT: number): [number, number, number] {
  const norm = Math.max(0, Math.min(1, (t - minT) / Math.max(0.1, maxT - minT)));

  if (norm <= 0.25) {
    const f = norm / 0.25;
    return [
      Math.round(30 + f * (6 - 30)),
      Math.round(58 + f * (182 - 58)),
      Math.round(138 + f * (212 - 138)),
    ];
  } else if (norm <= 0.50) {
    const f = (norm - 0.25) / 0.25;
    return [
      Math.round(6 + f * (132 - 6)),
      Math.round(182 + f * (204 - 182)),
      Math.round(212 + f * (22 - 212)),
    ];
  } else if (norm <= 0.75) {
    const f = (norm - 0.50) / 0.25;
    return [
      Math.round(132 + f * (249 - 132)),
      Math.round(204 + f * (115 - 204)),
      Math.round(22 + f * (22 - 22)),
    ];
  } else {
    const f = (norm - 0.75) / 0.25;
    return [
      Math.round(249 + f * (239 - 249)),
      Math.round(115 + f * (68 - 115)),
      Math.round(22 + f * (68 - 22)),
    ];
  }
}

/**
 * Real-time camera heading tracker:
 * Calculates azimuth of camera relative to the chunk origin.
 * North (+Z) is at 0 degrees.
 */
const CameraCompassTracker: React.FC<{
  onHeadingChange: (deg: number) => void;
}> = ({ onHeadingChange }) => {
  const lastHeading = useRef<number>(-999);
  useFrame(({ camera }) => {
    const dx = camera.position.x;
    const dz = camera.position.z;
    let heading = Math.round((Math.atan2(dx, dz) * 180) / Math.PI);
    if (heading < 0) heading += 360;
    if (Math.abs(heading - lastHeading.current) >= 1) {
      lastHeading.current = heading;
      onHeadingChange(heading);
    }
  });
  return null;
};

export const OceanChunk3DView: React.FC<OceanChunk3DViewProps> = ({
  chunkData,
  selectedVariable = 'temperature',
  variableValue,
  variableUnit = '°C',
  selectedDepth = 0,
  minDepth = 0,
  maxDepth = 200,
  mldDepth,
  profileData,
  loadingProfile = false,
  profileError = null,
  currentData,
  onResetCamera,
  marineLifeEnabled = true,
  marineLifeSpecies = [],
  showGeology = true,
  showWaterVolume = true,
  showMarineSnow = true,
  hideControls = false,
  onCaptureReady,
}) => {
  const controlsRef = useRef<OrbitControlsType>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    isFullscreen: isChunkFullscreen,
    toggleFullscreen: toggleChunkFullscreen,
    isSupported: isFullscreenSupported,
  } = useFullscreen(containerRef);

  const width = 4.2;
  const chunkHeight = 4.4;
  const res = chunkData.grid_resolution || 7;
  const depths = chunkData.depths;
  const maxDepthM = maxDepth || chunkData.statistics.max_depth_m || 200;
  const minDepthM = minDepth || 0;
  const avgDepth = (minDepthM + maxDepthM) / 2;

  // Real-time camera heading in degrees (0 = looking North, 90 = looking East)
  const [cameraHeadingDeg, setCameraHeadingDeg] = useState<number>(43);

  // Oceanographic cutaway atmosphere tint
  const bgColor = useMemo(() => {
    if (avgDepth < 200) return '#091c30';
    if (avgDepth < 1000) return '#061626';
    return '#040e1b';
  }, [avgDepth]);

  // Construct temperature vertical gradient texture and statistics from real soundings
  const { temperatureTexture, tempStats } = useMemo(() => {
    if (
      !profileData ||
      !profileData.depths ||
      !profileData.temperature ||
      profileData.temperature.length === 0
    ) {
      return { temperatureTexture: null, tempStats: null };
    }

    const valid = profileData.temperature.filter(
      (t): t is number => t !== null && t !== undefined && !isNaN(t)
    );
    if (valid.length === 0) return { temperatureTexture: null, tempStats: null };

    const minMeasured = Math.min(...valid);
    const maxMeasured = Math.max(...valid);

    // Deep ocean temperature scaling
    const minT = maxDepthM > 500 && minMeasured > 6.0 ? Math.min(minMeasured, 4.5) : minMeasured;
    const maxT = maxMeasured;

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { temperatureTexture: null, tempStats: null };

    for (let y = 0; y < 256; y++) {
      // In Canvas, y=0 is top (v=1 in WebGL, depth = minDepthM / surface)
      // y=255 is bottom (v=0 in WebGL, depth = maxDepthM / seabed)
      const d = minDepthM + (y / 255) * (maxDepthM - minDepthM);
      const temp = interpolateTemperature(d, profileData.depths, profileData.temperature);
      if (temp !== null) {
        const [r, g, b] = getTemperatureRgb(temp, minT, maxT);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      } else {
        ctx.fillStyle = '#0369a1';
      }
      ctx.fillRect(0, y, 16, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;

    return {
      temperatureTexture: tex,
      tempStats: {
        min: minT,
        max: maxT,
        mid: (minT + maxT) / 2,
      },
    };
  }, [profileData, minDepthM, maxDepthM]);

  // Box geometry with calibrated top/bottom face UVs
  const waterBoxGeom = useMemo(() => {
    const geom = new THREE.BoxGeometry(width, chunkHeight, width);
    const uv = geom.attributes.uv;
    // Top face (+Y, vertices 8..11): lock V to 1.0 (surface)
    for (let i = 8; i < 12; i++) {
      uv.setY(i, 1.0);
    }
    // Bottom face (-Y, vertices 12..15): lock V to 0.0 (deep floor)
    for (let i = 12; i < 16; i++) {
      uv.setY(i, 0.0);
    }
    uv.needsUpdate = true;
    return geom;
  }, [width, chunkHeight]);

  // Parameter-responsive fallback water column color
  const waterColor = useMemo(() => {
    if (selectedVariable === 'temperature') {
      return avgDepth < 200 ? '#0284c7' : avgDepth < 1000 ? '#0369a1' : '#072b4f';
    }
    if (selectedVariable === 'salinity') return '#0d9488';
    if (selectedVariable === 'current') return '#0284c7';
    if (selectedVariable === 'mld') return '#1e3a8a';
    return '#0369a1';
  }, [selectedVariable, avgDepth]);

  // Smoothly reset camera to North-up view
  const handleResetToNorth = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.object.position.set(0, 2.8, 6.8); // Directly South looking North (+Z)
      controlsRef.current.target.set(0, -chunkHeight * 0.45, 0);
      controlsRef.current.update();
      setCameraHeadingDeg(0);
    }
  };

  const getCardinalLabel = (deg: number): string => {
    const list = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const idx = Math.round(deg / 45) % 8;
    return list[idx];
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${
        isChunkFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen rounded-none'
          : hideControls
          ? 'h-full min-h-[340px] rounded-[24px]'
          : 'h-[580px] rounded-[28px]'
      } overflow-hidden border border-[#E2EAF2] shadow-[0_6px_24px_rgba(22,43,77,0.045)] select-none transition-all duration-200`}
      style={{ backgroundColor: bgColor }}
    >
      {/* ─── 1. COMPACT TEMPERATURE LEGEND HUD (TOP-LEFT OVERLAY) ─── */}
      {!hideControls && selectedVariable === 'temperature' && (
        <div className="absolute top-4 left-4 z-20 pointer-events-auto bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E2EAF2] rounded-[16px] p-3.5 shadow-[0_6px_24px_rgba(22,43,77,0.08)] max-w-[280px] text-xs text-[#172B4D]">
          {loadingProfile ? (
            <div className="flex items-center gap-2 text-[#087FC4] py-1">
              <div className="w-3.5 h-3.5 border-2 border-[#087FC4] border-t-transparent rounded-full animate-spin shrink-0" />
              <span className="text-[11px] font-medium">Loading 3D temperature soundings…</span>
            </div>
          ) : profileError || !tempStats ? (
            <div className="flex items-center gap-2 text-[#D97706] py-0.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D97706]" />
              <span className="text-[11px] leading-tight font-medium">
                Temperature layer unavailable for this location/time.
              </span>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#172B4D] flex items-center gap-1.5 text-xs">
                  <Thermometer className="w-3.5 h-3.5 text-[#DC2626]" />
                  <span>3D Water Temperature</span>
                </span>
                <span className="text-[10px] font-mono text-[#087FC4] bg-[#EAF5FF] px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                  °C (ITS-90)
                </span>
              </div>

              {/* Intuitive 5-Stop Temperature Gradient Bar */}
              <div className="space-y-1">
                <div className="h-2.5 w-full rounded-full bg-gradient-to-r from-[#1e3a8a] via-[#06b6d4] via-[#84cc16] via-[#f97316] to-[#ef4444] border border-[#E2EAF2] shadow-inner" />
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-[#087FC4] font-bold">
                    {tempStats.min.toFixed(1)}° <span className="text-[9px] font-normal text-[#64748B]">(Deep)</span>
                  </span>
                  <span className="text-[#65A30D] font-semibold">{tempStats.mid.toFixed(1)}°</span>
                  <span className="text-[#DC2626] font-bold">
                    {tempStats.max.toFixed(1)}° <span className="text-[9px] font-normal text-[#64748B]">(Surface)</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#64748B] pt-1.5 border-t border-[#E2EAF2]">
                <span>Sounding: {selectedDepth}m</span>
                <span className="text-[#087FC4] font-semibold font-mono">
                  {variableValue !== null && variableValue !== undefined ? `${variableValue.toFixed(1)} °C` : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 2. GEOGRAPHIC ORIENTATION COMPASS & FULLSCREEN HUD (TOP-RIGHT OVERLAY) ─── */}
      {!hideControls && (
        <div className="absolute top-4 right-4 z-20 pointer-events-auto flex items-start gap-2.5">
          {/* Dedicated Chunk Explorer Fullscreen Toggle Button */}
          {isFullscreenSupported && (
            <button
              type="button"
              onClick={toggleChunkFullscreen}
              aria-label={isChunkFullscreen ? 'Exit chunk fullscreen' : 'Enter chunk fullscreen'}
              title={isChunkFullscreen ? 'Exit chunk fullscreen (Esc)' : 'Enter chunk fullscreen'}
              className="w-10 h-10 rounded-full bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E2EAF2] hover:border-[#087FC4] text-[#087FC4] hover:bg-[#EAF5FF] p-2 shadow-[0_4px_16px_rgba(22,43,77,0.08)] flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              {isChunkFullscreen ? (
                <Minimize2 className="w-4 h-4 text-[#087FC4]" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          )}

          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={handleResetToNorth}
              title="Scene Orientation (+Z=North, +X=East). Click to align North-Up."
              className="group relative w-14 h-14 rounded-full bg-[#FFFFFF]/95 backdrop-blur-md border border-[#E2EAF2] hover:border-[#087FC4] p-1 shadow-[0_4px_16px_rgba(22,43,77,0.08)] flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              {/* Rotating Compass Rose Dial */}
              <div
                className="w-full h-full relative flex items-center justify-center transition-transform duration-75"
                style={{ transform: `rotate(${-cameraHeadingDeg}deg)` }}
              >
                {/* North Cardinal Pointer (Red Arrow with 'N') */}
                <div className="absolute top-0.5 flex flex-col items-center">
                  <span className="text-[10px] font-black text-[#DC2626] leading-none tracking-tighter">N</span>
                  <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-[#DC2626] mt-0.5" />
                </div>

                {/* East Marker ('E' at 90°) */}
                <div className="absolute right-1 text-[9px] font-bold text-[#087FC4] leading-none">
                  E
                </div>

                {/* South Marker ('S' at 180°) */}
                <div className="absolute bottom-1 text-[9px] font-bold text-[#64748B] leading-none">
                  S
                </div>

                {/* West Marker ('W' at 270°) */}
                <div className="absolute left-1 text-[9px] font-bold text-[#64748B] leading-none">
                  W
                </div>

                {/* Crosshairs & Center Pivot */}
                <div className="w-1.5 h-1.5 rounded-full bg-[#087FC4] border border-white shadow-2xs" />
                <div className="absolute w-7 h-[1px] bg-[#E2EAF2] pointer-events-none" />
                <div className="absolute h-7 w-[1px] bg-[#E2EAF2] pointer-events-none" />
              </div>
            </button>

            {/* Heading readout badge */}
            <div className="text-[10px] font-mono font-bold text-[#172B4D] bg-[#FFFFFF]/95 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-[#E2EAF2] shadow-2xs flex items-center gap-1">
              <span>{getCardinalLabel(cameraHeadingDeg)}</span>
              <span className="text-[8px] text-[#64748B]">({cameraHeadingDeg}°)</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. THREE.JS 3D CANVAS SCENE ─── */}
      <Canvas
        camera={{ position: [4.8, 2.6, 5.2], fov: 38 }}
        dpr={[1, 1.5]}
        shadows
        gl={{
          antialias: true,
          powerPreference: 'default',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.35,
          preserveDrawingBuffer: true,
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Screenshot capture bridge for report generator and exports */}
        {onCaptureReady && <SceneCaptureBridge onCapture={onCaptureReady} />}
        {/* Real-time Camera Compass Sync */}
        <CameraCompassTracker onHeadingChange={setCameraHeadingDeg} />

        {/* 1. Natural Underwater Lighting & Suspended Marine Snow */}
        <UnderwaterLightingAndAtmosphere
          width={width}
          height={chunkHeight}
          minDepthM={minDepthM}
          maxDepthM={maxDepthM}
          showMarineSnow={showMarineSnow}
        />

        {/* 2. Realistic Ocean Surface Wave Swell at Datum y = 0 */}
        <RealisticOceanSurface size={width} />

        {/* 3. Depth-Graded Water Column Cutaway (with Temperature Colormap) */}
        {showWaterVolume && (
          <group position={[0, -chunkHeight / 2, 0]}>
            <mesh geometry={waterBoxGeom}>
              {selectedVariable === 'temperature' && temperatureTexture ? (
                <meshPhysicalMaterial
                  map={temperatureTexture}
                  roughness={0.14}
                  metalness={0.06}
                  transmission={0.28}
                  ior={1.333}
                  transparent={true}
                  opacity={0.68}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              ) : (
                <meshPhysicalMaterial
                  color={waterColor}
                  transmission={0.88}
                  roughness={0.06}
                  ior={1.333}
                  transparent={true}
                  opacity={avgDepth < 200 ? 0.22 : avgDepth < 1000 ? 0.32 : 0.44}
                  depthWrite={false}
                  side={THREE.DoubleSide}
                />
              )}
            </mesh>

            {/* Subtle boundary wireframe */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(width, chunkHeight, width)]} />
              <lineBasicMaterial
                color={selectedVariable === 'temperature' ? '#f59e0b' : avgDepth < 200 ? '#38bdf8' : '#0284c7'}
                transparent
                opacity={0.3}
              />
            </lineSegments>
          </group>
        )}

        {/* 4. Measured GEBCO Seabed Terrain & Subsurface Geological Cutaway Skirt */}
        <PhotorealisticSeabedAndGeology
          depths={depths}
          maxDepthM={maxDepthM}
          minDepthM={minDepthM}
          res={res}
          width={width}
          chunkHeight={chunkHeight}
          showGeology={showGeology}
        />

        {/* 5. 3D Geographic Orientation Markers on Chunk Base (+Z=North, +X=East, -Z=South, -X=West) */}
        {!hideControls && (
          <group position={[0, -chunkHeight, 0]}>
            {/* North Tag (+Z face) */}
            <Html position={[0, 0, width / 2 + 0.12]} center distanceFactor={8} zIndexRange={[50, 0]}>
              <div className="select-none pointer-events-none px-2.5 py-0.5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-xs border border-rose-300 text-[9px] font-mono font-bold text-[#DC2626] shadow-sm flex items-center gap-1">
                <span>▲</span>
                <span>NORTH (+Z)</span>
              </div>
            </Html>
            {/* South Tag (-Z face) */}
            <Html position={[0, 0, -width / 2 - 0.12]} center distanceFactor={8} zIndexRange={[50, 0]}>
              <div className="select-none pointer-events-none px-2.5 py-0.5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#E2EAF2] text-[9px] font-mono font-bold text-[#64748B] shadow-sm">
                <span>SOUTH (-Z)</span>
              </div>
            </Html>
            {/* East Tag (+X face) */}
            <Html position={[width / 2 + 0.12, 0, 0]} center distanceFactor={8} zIndexRange={[50, 0]}>
              <div className="select-none pointer-events-none px-2.5 py-0.5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#BFDBFE] text-[9px] font-mono font-bold text-[#087FC4] shadow-sm">
                <span>EAST (+X)</span>
              </div>
            </Html>
            {/* West Tag (-X face) */}
            <Html position={[-width / 2 - 0.12, 0, 0]} center distanceFactor={8} zIndexRange={[50, 0]}>
              <div className="select-none pointer-events-none px-2.5 py-0.5 rounded-full bg-[#FFFFFF]/90 backdrop-blur-xs border border-[#E2EAF2] text-[9px] font-mono font-bold text-[#64748B] shadow-sm">
                <span>WEST (-X)</span>
              </div>
            </Html>
          </group>
        )}

        {/* 6. Photorealistic Depth-Zoned Marine Life & Benthic Flora */}
        {marineLifeEnabled && (
          <PhotorealisticEcosystemZoning
            minDepthM={minDepthM}
            maxDepthM={maxDepthM}
            width={width}
            chunkHeight={chunkHeight}
          />
        )}

        {/* 7. Scientific 3D Depth Ruler Attached Beside Front-Left Edge of Chunk */}
        <Scientific3DDepthRuler
          width={width}
          chunkHeight={chunkHeight}
          minDepthM={minDepthM}
          maxDepthM={maxDepthM}
          meanDepthM={avgDepth}
          selectedDepth={selectedDepth}
          mldDepth={mldDepth}
          selectedVariable={selectedVariable}
        />

        {/* 8. Parameter-Specific 3D Physical Features */}
        {selectedVariable === 'mld' && mldDepth && mldDepth > 0 && (
          <MLDPycnoclineBoundary
            width={width}
            yPos={-(Math.min(mldDepth, avgDepth) / Math.max(1, avgDepth)) * (chunkHeight * 0.66)}
            mldDepth={mldDepth}
          />
        )}

        {selectedVariable === 'current' && (
          <GeostrophicCurrentVectors
            width={width}
            speed={variableValue ?? currentData?.speed ?? 0.34}
            directionDeg={currentData?.direction_degrees ?? 162.7}
            chunkHeight={chunkHeight}
          />
        )}

        {/* Smooth Orbit, Pan, and Zoom Navigation */}
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableZoom
          enableRotate
          minDistance={3.0}
          maxDistance={14.0}
          target={[0, -chunkHeight * 0.45, 0]}
          maxPolarAngle={Math.PI / 2 + 0.15}
        />
      </Canvas>
    </div>
  );
};

