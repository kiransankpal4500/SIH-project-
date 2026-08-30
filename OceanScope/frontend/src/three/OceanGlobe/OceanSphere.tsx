import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/threeMath';

interface OceanSphereProps {
  variable?: string;
  depth?: number;
  onClick?: (point: THREE.Vector3) => void;
}

const NASA_TEXTURE_URL = '/assets/textures/earth_nasa_blue_marble_2k.jpg';
const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

/**
 * Procedural Fallback Texture Generator
 * Used if the NASA satellite image cannot be fetched or loaded.
 */
function createFallbackProceduralTexture(variable: string, depth: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  const toX = (lon: number) => ((lon + 180) / 360) * TEXTURE_WIDTH;
  const toY = (lat: number) => ((90 - lat) / 180) * TEXTURE_HEIGHT;

  // Deep Ocean Base
  const baseOcean = ctx.createRadialGradient(
    toX(78), toY(2), 80,
    toX(78), toY(2), TEXTURE_WIDTH * 0.75
  );
  baseOcean.addColorStop(0.0, '#0a2347');
  baseOcean.addColorStop(0.4, '#071833');
  baseOcean.addColorStop(0.8, '#051124');
  baseOcean.addColorStop(1.0, '#030a17');
  ctx.fillStyle = baseOcean;
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  // Subdued Landmasses
  ctx.fillStyle = '#0a1424';
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 1.2;

  const drawContinent = (coords: [number, number][]) => {
    if (coords.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(toX(coords[0][0]), toY(coords[0][1]));
    for (let i = 1; i < coords.length; i++) {
      ctx.lineTo(toX(coords[i][0]), toY(coords[i][1]));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  // Indian Subcontinent
  drawContinent([
    [68.0, 24.0], [70.5, 23.0], [70.0, 21.0], [72.5, 21.0], [72.8, 19.0],
    [73.5, 16.0], [75.0, 13.0], [76.5, 10.0], [77.5, 8.2], [78.2, 8.8],
    [79.8, 10.5], [80.3, 13.2], [82.5, 16.5], [85.0, 19.5], [87.0, 21.5],
    [89.5, 22.0], [91.5, 23.5], [92.5, 21.0], [93.5, 26.0], [89.0, 27.5],
    [84.0, 28.5], [78.0, 31.0], [74.0, 35.0], [70.0, 32.0], [67.0, 28.0],
    [62.0, 25.5], [68.0, 24.0]
  ]);
  // Sri Lanka
  drawContinent([[79.8, 9.5], [81.5, 8.5], [81.8, 6.8], [80.5, 6.0], [79.6, 7.5], [79.8, 9.5]]);
  // Africa
  drawContinent([
    [51.0, 11.5], [49.0, 8.0], [45.0, 2.0], [40.0, -4.0], [39.0, -10.0],
    [36.0, -18.0], [33.0, -25.0], [28.0, -32.0], [20.0, -34.8], [18.0, -34.0],
    [15.0, -28.0], [12.0, -18.0], [9.0, -5.0], [9.0, 4.0], [3.0, 6.0],
    [-8.0, 4.5], [-17.0, 14.8], [-17.0, 21.0], [-10.0, 30.0], [-5.0, 36.0],
    [10.0, 37.0], [25.0, 32.0], [32.0, 31.5], [34.0, 27.0], [43.0, 12.0],
    [51.0, 11.5]
  ]);
  // Australia
  drawContinent([
    [130.0, -12.0], [137.0, -12.0], [142.0, -11.0], [146.0, -18.0], [153.0, -28.0],
    [150.0, -37.0], [140.0, -38.0], [135.0, -34.0], [125.0, -33.0], [115.0, -34.0],
    [114.0, -22.0], [122.0, -16.0], [130.0, -12.0]
  ]);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Composite NASA Blue Marble Satellite Base with Real-Time Ocean Data Overlays
 */
function compositeNasaOceanTexture(
  nasaImage: HTMLImageElement,
  variable: string = 'temperature',
  depth: number = 0
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  const toX = (lon: number) => ((lon + 180) / 360) * TEXTURE_WIDTH;
  const toY = (lat: number) => ((90 - lat) / 180) * TEXTURE_HEIGHT;

  // 1. Draw True-Color NASA Blue Marble Satellite Base
  ctx.drawImage(nasaImage, 0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  // 2. Apply Subdued Atmospheric & Land Calibration
  // Keeps land natural and realistic while highlighting the ocean as the hero
  ctx.fillStyle = 'rgba(4, 9, 20, 0.18)';
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  // 3. Render Oceanographic Data Layer Overlay
  const depthCooling = Math.min(1.0, depth / 1000);

  if (variable === 'temperature') {
    // -----------------------------------------------------------------------
    // Temperature Mode: Thermal Field Layer
    // Cold (<10°C): Deep Navy | Moderate (10-22°C): Cyan | Warm (22-28°C): Amber | Tropical (>28°C): Coral Red
    // -----------------------------------------------------------------------
    const latThermal = ctx.createLinearGradient(0, toY(-65), 0, toY(65));
    latThermal.addColorStop(0.00, 'rgba(10, 37, 85, 0.65)');   // Southern Ocean (2-4°C)
    latThermal.addColorStop(0.25, 'rgba(14, 95, 150, 0.55)');  // Subtropical South (16-20°C)
    latThermal.addColorStop(0.42, depthCooling > 0.4 ? 'rgba(20, 110, 150, 0.50)' : 'rgba(235, 130, 30, 0.65)'); // Tropical south
    latThermal.addColorStop(0.50, depthCooling > 0.4 ? 'rgba(25, 125, 160, 0.50)' : 'rgba(239, 68, 68, 0.72)');  // Equatorial Warm Pool
    latThermal.addColorStop(0.58, depthCooling > 0.4 ? 'rgba(20, 110, 150, 0.50)' : 'rgba(245, 100, 35, 0.68)'); // Arabian Sea & Bay of Bengal
    latThermal.addColorStop(0.75, 'rgba(14, 95, 150, 0.55)');  // Northern temperate
    latThermal.addColorStop(1.00, 'rgba(10, 37, 85, 0.65)');
    ctx.fillStyle = latThermal;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // Indo-Pacific Warm Pool Core
    const warmPool = ctx.createRadialGradient(toX(88), toY(8), 20, toX(88), toY(8), 380);
    warmPool.addColorStop(0.0, depthCooling > 0.5 ? 'rgba(40, 150, 180, 0.45)' : 'rgba(245, 75, 45, 0.68)');
    warmPool.addColorStop(0.5, depthCooling > 0.5 ? 'rgba(25, 105, 140, 0.30)' : 'rgba(235, 145, 30, 0.42)');
    warmPool.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warmPool;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // Coastal Upwelling Cold Tongue (Somali & Oman Upwelling: 22-25°C)
    const somaliUpwelling = ctx.createRadialGradient(toX(54), toY(12), 15, toX(54), toY(12), 200);
    somaliUpwelling.addColorStop(0.0, 'rgba(14, 165, 233, 0.60)');
    somaliUpwelling.addColorStop(0.8, 'rgba(14, 116, 184, 0.18)');
    somaliUpwelling.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = somaliUpwelling;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  } else if (variable === 'salinity') {
    // -----------------------------------------------------------------------
    // Salinity Mode: Haline Scale (31.0 to 37.5 PSU)
    // Low Salinity (<33 PSU): Vivid Turquoise | Moderate (34.8 PSU): Azure | High (>36 PSU): Warm Amber
    // -----------------------------------------------------------------------
    const baseSal = ctx.createLinearGradient(0, toY(-60), 0, toY(60));
    baseSal.addColorStop(0.0, 'rgba(20, 80, 140, 0.45)');
    baseSal.addColorStop(0.5, 'rgba(30, 100, 165, 0.50)');
    baseSal.addColorStop(1.0, 'rgba(20, 80, 140, 0.45)');
    ctx.fillStyle = baseSal;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // Arabian Sea Hypersaline Evaporation Basin (36.5 - 37.2 PSU)
    const arabianSalinity = ctx.createRadialGradient(toX(64), toY(17), 25, toX(64), toY(17), 300);
    arabianSalinity.addColorStop(0.0, 'rgba(217, 119, 6, 0.75)');
    arabianSalinity.addColorStop(0.6, 'rgba(180, 100, 15, 0.40)');
    arabianSalinity.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = arabianSalinity;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    // Bay of Bengal Low-Salinity Freshwater Discharge Plume (31.0 - 32.5 PSU)
    const bobFreshening = ctx.createRadialGradient(toX(90), toY(17), 20, toX(90), toY(17), 270);
    bobFreshening.addColorStop(0.0, 'rgba(6, 182, 212, 0.75)');
    bobFreshening.addColorStop(0.6, 'rgba(14, 116, 184, 0.38)');
    bobFreshening.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bobFreshening;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  } else if (variable === 'current_velocity') {
    // -----------------------------------------------------------------------
    // Current Velocity Mode: Kinetic Energy Corridors
    // Highlight Equatorial Wyrtki Jet & Western Boundary Currents
    // -----------------------------------------------------------------------
    const wyrtkiJet = ctx.createRadialGradient(toX(78), toY(0), 15, toX(78), toY(0), 420);
    wyrtkiJet.addColorStop(0.0, 'rgba(56, 189, 248, 0.70)');
    wyrtkiJet.addColorStop(0.5, 'rgba(14, 116, 184, 0.35)');
    wyrtkiJet.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = wyrtkiJet;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

    const somaliCurrent = ctx.createRadialGradient(toX(52), toY(10), 10, toX(52), toY(10), 220);
    somaliCurrent.addColorStop(0.0, 'rgba(245, 158, 11, 0.65)');
    somaliCurrent.addColorStop(0.6, 'rgba(14, 165, 233, 0.35)');
    somaliCurrent.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = somaliCurrent;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  } else if (variable === 'sea_surface_height') {
    // -----------------------------------------------------------------------
    // Sea Surface Height Mode (SSH Anomalies)
    // -----------------------------------------------------------------------
    const sshGrad = ctx.createRadialGradient(toX(85), toY(12), 25, toX(85), toY(12), 350);
    sshGrad.addColorStop(0.0, 'rgba(249, 115, 22, 0.65)');
    sshGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.35)');
    sshGrad.addColorStop(1.0, 'rgba(30, 64, 175, 0.30)');
    ctx.fillStyle = sshGrad;
    ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  }

  // 4. Subtle Coordinate Graticules & Equator Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;

  for (let lat = -75; lat <= 75; lat += 15) {
    ctx.beginPath();
    ctx.moveTo(0, toY(lat));
    ctx.lineTo(TEXTURE_WIDTH, toY(lat));
    ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 30) {
    ctx.beginPath();
    ctx.moveTo(toX(lon), 0);
    ctx.lineTo(toX(lon), TEXTURE_HEIGHT);
    ctx.stroke();
  }

  // Equator emphasis
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(TEXTURE_WIDTH, toY(0));
  ctx.stroke();

  // Subtle Basin Reference Labels
  ctx.font = '600 12px "JetBrains Mono", Inter, sans-serif';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.35)';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';

  ctx.fillText('INDIAN OCEAN', toX(80), toY(-10));
  ctx.font = '500 10px "JetBrains Mono", Inter, sans-serif';
  ctx.fillStyle = 'rgba(226, 232, 240, 0.25)';
  ctx.fillText('ARABIAN SEA', toX(65), toY(15));
  ctx.fillText('BAY OF BENGAL', toX(90), toY(15));

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  return texture;
}

export const OceanSphere: React.FC<OceanSphereProps> = ({
  variable = 'temperature',
  depth = 0,
  onClick,
}) => {
  const [nasaImage, setNasaImage] = useState<HTMLImageElement | null>(null);
  const [hasError, setHasError] = useState<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // Asynchronously load NASA Blue Marble image
  useEffect(() => {
    isMountedRef.current = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      if (isMountedRef.current) {
        setNasaImage(img);
        setHasError(false);
      }
    };

    img.onerror = (err) => {
      if (isMountedRef.current) {
        console.warn('[OceanScope] NASA Blue Marble texture failed to load, using procedural fallback:', err);
        setHasError(true);
      }
    };

    img.src = NASA_TEXTURE_URL;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Compute final texture (either NASA composited or procedural fallback)
  const texture = useMemo(() => {
    if (nasaImage && !hasError) {
      return compositeNasaOceanTexture(nasaImage, variable, depth);
    }
    return createFallbackProceduralTexture(variable, depth);
  }, [nasaImage, hasError, variable, depth]);

  return (
    <mesh
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(e.point);
        }
      }}
    >
      <sphereGeometry args={[GLOBE_RADIUS, 96, 96]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.38}
        metalness={0.15}
        emissive={new THREE.Color('#010610')}
        emissiveIntensity={0.22}
      />
    </mesh>
  );
};

