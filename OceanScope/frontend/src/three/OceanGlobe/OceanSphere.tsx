import React, { useMemo } from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/threeMath';

interface OceanSphereProps {
  variable?: string;
  depth?: number;
  onClick?: (point: THREE.Vector3) => void;
}

/**
 * Ocean-First Canvas Generator for OceanScope 3D Globe
 * Prioritizes the OCEAN DATA as the visual centerpiece while keeping landmasses as subdued, dark geographic references.
 */
function createOceanFirstEarthTexture(variable: string = 'temperature', depth: number = 0): THREE.CanvasTexture {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const toX = (lon: number) => ((lon + 180) / 360) * width;
  const toY = (lat: number) => ((90 - lat) / 180) * height;

  // =========================================================================
  // 1. OCEAN BASE LAYER — LUMINOUS DEEP MARINE WATER & BATHYMETRIC GRADIENTS
  // =========================================================================
  // Rich, deep oceanic foundation (Deep Midnight Azure #051329 -> Abyssal Blue #071c3d)
  const baseOcean = ctx.createRadialGradient(
    toX(78), toY(2), 80,
    toX(78), toY(2), width * 0.75
  );
  baseOcean.addColorStop(0.0, '#0a2347'); // Tropical Indian Ocean core
  baseOcean.addColorStop(0.4, '#071833'); // Basin average
  baseOcean.addColorStop(0.8, '#051124'); // Southern Ocean / Subpolar
  baseOcean.addColorStop(1.0, '#030a17'); // Polar abyssal
  ctx.fillStyle = baseOcean;
  ctx.fillRect(0, 0, width, height);

  // Continental shelf shallow water luminescence (coastal bathymetry)
  const shelfBathymetry = ctx.createRadialGradient(toX(82), toY(12), 40, toX(82), toY(12), 500);
  shelfBathymetry.addColorStop(0.0, 'rgba(14, 116, 184, 0.45)');
  shelfBathymetry.addColorStop(0.5, 'rgba(8, 64, 120, 0.25)');
  shelfBathymetry.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = shelfBathymetry;
  ctx.fillRect(0, 0, width, height);

  // =========================================================================
  // 2. OCEAN DATA SCALAR FIELD — THE VISUAL HERO OF THE GLOBE
  // =========================================================================
  const depthCooling = Math.min(1.0, depth / 1000); // Surface warm -> deep ocean cold

  if (variable === 'temperature') {
    // -----------------------------------------------------------------------
    // A. TEMPERATURE MODE: Continuous Perceptually Uniform Thermal Field
    // Cold (<10°C): Deep Indigo | Moderate (10-22°C): Cyan/Teal | Warm (22-28°C): Amber | Very Warm (28-32°C): Coral Red
    // -----------------------------------------------------------------------
    const latThermalGrad = ctx.createLinearGradient(0, toY(-65), 0, toY(65));
    latThermalGrad.addColorStop(0.00, 'rgba(8, 35, 80, 0.75)');    // Antarctic Circumpolar: 2-4°C (Deep Navy)
    latThermalGrad.addColorStop(0.25, 'rgba(14, 90, 145, 0.70)');   // Subtropical South: 16-20°C (Marine Blue)
    latThermalGrad.addColorStop(0.42, depthCooling > 0.4 ? 'rgba(20, 110, 150, 0.65)' : 'rgba(235, 130, 30, 0.82)'); // Tropical south: 26-28°C (Amber/Gold)
    latThermalGrad.addColorStop(0.50, depthCooling > 0.4 ? 'rgba(25, 125, 160, 0.65)' : 'rgba(239, 68, 68, 0.88)');   // Equatorial Warm Pool: 29-30°C (Vivid Red)
    latThermalGrad.addColorStop(0.58, depthCooling > 0.4 ? 'rgba(20, 110, 150, 0.65)' : 'rgba(245, 100, 35, 0.85)');  // Arabian Sea & Bay of Bengal: 29-31°C (Warm Coral)
    latThermalGrad.addColorStop(0.75, 'rgba(14, 90, 145, 0.70)');   // Northern temperate: 18-22°C
    latThermalGrad.addColorStop(1.00, 'rgba(8, 35, 80, 0.75)');
    ctx.fillStyle = latThermalGrad;
    ctx.fillRect(0, 0, width, height);

    // Indo-Pacific Warm Pool Thermal Core (Vivid Coral Thermal Energy)
    const thermalCore = ctx.createRadialGradient(toX(88), toY(10), 30, toX(88), toY(10), 420);
    thermalCore.addColorStop(0.0, depthCooling > 0.5 ? 'rgba(40, 150, 180, 0.55)' : 'rgba(245, 75, 45, 0.80)');
    thermalCore.addColorStop(0.5, depthCooling > 0.5 ? 'rgba(25, 105, 140, 0.40)' : 'rgba(235, 145, 30, 0.55)');
    thermalCore.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = thermalCore;
    ctx.fillRect(0, 0, width, height);

    // Coastal Upwelling Cold Plume (Somali & Oman Upwelling: 22-25°C Cold Tongue)
    const somaliUpwelling = ctx.createRadialGradient(toX(54), toY(12), 20, toX(54), toY(12), 220);
    somaliUpwelling.addColorStop(0.0, 'rgba(14, 165, 233, 0.65)'); // Cool upwelling cyan
    somaliUpwelling.addColorStop(0.8, 'rgba(14, 116, 184, 0.20)');
    somaliUpwelling.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = somaliUpwelling;
    ctx.fillRect(0, 0, width, height);

  } else if (variable === 'salinity') {
    // -----------------------------------------------------------------------
    // B. SALINITY MODE: Haline Scale (31.0 to 37.5 PSU)
    // Low Salinity (<33 PSU): Vivid Turquoise/Cyan | Moderate (34.5-35.5 PSU): Azure | High (>36 PSU): Warm Amber/Copper
    // -----------------------------------------------------------------------
    const baseSal = ctx.createLinearGradient(0, toY(-60), 0, toY(60));
    baseSal.addColorStop(0.0, 'rgba(20, 80, 140, 0.65)');
    baseSal.addColorStop(0.5, 'rgba(30, 100, 165, 0.70)'); // Open ocean average: 34.8 PSU
    baseSal.addColorStop(1.0, 'rgba(20, 80, 140, 0.65)');
    ctx.fillStyle = baseSal;
    ctx.fillRect(0, 0, width, height);

    // Arabian Sea Hypersaline Evaporation Basin (36.5 - 37.2 PSU -> Rich Amber/Copper)
    const arabianSalinity = ctx.createRadialGradient(toX(64), toY(17), 30, toX(64), toY(17), 320);
    arabianSalinity.addColorStop(0.0, 'rgba(217, 119, 6, 0.88)');  // High salinity amber core
    arabianSalinity.addColorStop(0.6, 'rgba(180, 100, 15, 0.55)');
    arabianSalinity.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = arabianSalinity;
    ctx.fillRect(0, 0, width, height);

    // Bay of Bengal Low-Salinity Freshwater Plume (31.0 - 32.5 PSU -> Vivid Turquoise/Cyan)
    const bobFreshening = ctx.createRadialGradient(toX(90), toY(17), 25, toX(90), toY(17), 290);
    bobFreshening.addColorStop(0.0, 'rgba(6, 182, 212, 0.88)');  // River discharge low salinity
    bobFreshening.addColorStop(0.6, 'rgba(14, 116, 184, 0.50)');
    bobFreshening.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bobFreshening;
    ctx.fillRect(0, 0, width, height);

  } else if (variable === 'current_velocity') {
    // -----------------------------------------------------------------------
    // C. CURRENT VELOCITY MODE: Velocity Kinetic Energy Corridors
    // Highlight major current jets against a deep navy background
    // -----------------------------------------------------------------------
    // Equatorial Wyrtki Jet (0.8 - 1.6 m/s)
    const wyrtkiJet = ctx.createRadialGradient(toX(78), toY(0), 15, toX(78), toY(0), 450);
    wyrtkiJet.addColorStop(0.0, 'rgba(56, 189, 248, 0.85)'); // High velocity cyan core
    wyrtkiJet.addColorStop(0.5, 'rgba(14, 116, 184, 0.45)');
    wyrtkiJet.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = wyrtkiJet;
    ctx.fillRect(0, 0, width, height);

    // Somali Boundary Current Western Jet (1.2 - 2.0 m/s)
    const somaliCurrent = ctx.createRadialGradient(toX(52), toY(10), 10, toX(52), toY(10), 240);
    somaliCurrent.addColorStop(0.0, 'rgba(245, 158, 11, 0.80)'); // High shear gold
    somaliCurrent.addColorStop(0.6, 'rgba(14, 165, 233, 0.45)');
    somaliCurrent.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = somaliCurrent;
    ctx.fillRect(0, 0, width, height);

  } else if (variable === 'sea_surface_height') {
    // -----------------------------------------------------------------------
    // D. SEA SURFACE HEIGHT (SSH): Dynamic Dynamic Topography Anomalies
    // Negative Anomaly (-0.3m): Deep Blue | Positive Anomaly (+0.4m): Warm Amber/Coral
    // -----------------------------------------------------------------------
    const sshGrad = ctx.createRadialGradient(toX(85), toY(12), 30, toX(85), toY(12), 380);
    sshGrad.addColorStop(0.0, 'rgba(249, 115, 22, 0.80)'); // Positive warm eddy elevation (+0.35m)
    sshGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.45)');
    sshGrad.addColorStop(1.0, 'rgba(30, 64, 175, 0.40)');  // Cyclonic cold trough
    ctx.fillStyle = sshGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // =========================================================================
  // 3. SCIENTIFIC GEOGRAPHIC REFERENCE GRATICULES
  // =========================================================================
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;

  for (let lat = -75; lat <= 75; lat += 15) {
    ctx.beginPath();
    ctx.moveTo(0, toY(lat));
    ctx.lineTo(width, toY(lat));
    ctx.stroke();
  }
  for (let lon = -180; lon <= 180; lon += 30) {
    ctx.beginPath();
    ctx.moveTo(toX(lon), 0);
    ctx.lineTo(toX(lon), height);
    ctx.stroke();
  }

  // Equator emphasis
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, toY(0));
  ctx.lineTo(width, toY(0));
  ctx.stroke();

  // =========================================================================
  // 4. SUBDUED LANDMASSES — SECONDARY GEOGRAPHIC REFERENCE (NOT THE HERO)
  // =========================================================================
  // Dark charcoal-slate fill with crisp, subtle coastal boundary
  ctx.fillStyle = '#050912';
  ctx.strokeStyle = '#142033';
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

  // Indian Subcontinent & South Asia
  drawContinent([
    [68.0, 24.0], [70.5, 23.0], [70.0, 21.0], [72.5, 21.0], [72.8, 19.0],
    [73.5, 16.0], [75.0, 13.0], [76.5, 10.0], [77.5, 8.2], [78.2, 8.8],
    [79.8, 10.5], [80.3, 13.2], [82.5, 16.5], [85.0, 19.5], [87.0, 21.5],
    [89.5, 22.0], [91.5, 23.5], [92.5, 21.0], [93.5, 26.0], [89.0, 27.5],
    [84.0, 28.5], [78.0, 31.0], [74.0, 35.0], [70.0, 32.0], [67.0, 28.0],
    [62.0, 25.5], [68.0, 24.0]
  ]);

  // Sri Lanka
  drawContinent([
    [79.8, 9.5], [81.5, 8.5], [81.8, 6.8], [80.5, 6.0], [79.6, 7.5], [79.8, 9.5]
  ]);

  // Andaman & Nicobar Ridge
  drawContinent([[92.8, 13.5], [93.2, 13.0], [92.9, 11.5], [92.7, 12.5]]);
  drawContinent([[93.5, 8.5], [93.9, 7.0], [93.6, 7.2]]);

  // Arabian Peninsula & Middle East
  drawContinent([
    [44.0, 13.0], [45.0, 14.5], [51.0, 15.5], [54.0, 17.0], [58.0, 20.5],
    [59.5, 22.5], [56.5, 26.0], [55.0, 25.0], [51.0, 25.5], [49.0, 29.5],
    [48.0, 30.0], [45.0, 30.0], [40.0, 32.0], [35.0, 29.0], [34.0, 27.5],
    [38.0, 23.0], [41.0, 18.0], [43.5, 14.0], [44.0, 13.0]
  ]);

  // African Continent
  drawContinent([
    [51.0, 11.5], [49.0, 8.0], [45.0, 2.0], [40.0, -4.0], [39.0, -10.0],
    [36.0, -18.0], [33.0, -25.0], [28.0, -32.0], [20.0, -34.8], [18.0, -34.0],
    [15.0, -28.0], [12.0, -18.0], [9.0, -5.0], [9.0, 4.0], [3.0, 6.0],
    [-8.0, 4.5], [-17.0, 14.8], [-17.0, 21.0], [-10.0, 30.0], [-5.0, 36.0],
    [10.0, 37.0], [25.0, 32.0], [32.0, 31.5], [34.0, 27.0], [43.0, 12.0],
    [51.0, 11.5]
  ]);

  // Madagascar
  drawContinent([
    [49.5, -12.5], [50.5, -15.5], [48.5, -22.5], [45.5, -25.5], [44.0, -22.0],
    [44.0, -16.0], [47.0, -13.5], [49.5, -12.5]
  ]);

  // East Asia & Eurasia
  drawContinent([
    [98.0, 20.0], [101.0, 13.0], [102.0, 8.5], [104.0, 1.5], [103.5, 6.5],
    [108.0, 12.0], [108.0, 21.5], [118.0, 24.5], [122.0, 30.0], [122.0, 38.0],
    [128.0, 38.0], [130.0, 42.0], [140.0, 48.0], [142.0, 53.0], [135.0, 60.0],
    [110.0, 72.0], [70.0, 73.0], [40.0, 68.0], [25.0, 71.0], [10.0, 58.0],
    [0.0, 50.0], [15.0, 45.0], [30.0, 42.0], [40.0, 40.0], [55.0, 35.0],
    [65.0, 35.0], [80.0, 45.0], [95.0, 35.0], [98.0, 20.0]
  ]);

  // Indonesian Archipelago
  drawContinent([[95.0, 5.5], [98.0, 2.0], [105.0, -6.0], [103.0, -3.0], [97.0, 2.5]]); // Sumatra
  drawContinent([[106.0, -6.0], [114.0, -8.5], [114.0, -7.5], [106.0, -5.8]]); // Java
  drawContinent([[109.0, 4.0], [118.0, 5.0], [117.0, -4.0], [110.0, -3.5]]); // Borneo

  // Australia
  drawContinent([
    [130.0, -12.0], [137.0, -12.0], [142.0, -11.0], [146.0, -18.0], [153.0, -28.0],
    [150.0, -37.0], [140.0, -38.0], [135.0, -34.0], [125.0, -33.0], [115.0, -34.0],
    [114.0, -22.0], [122.0, -16.0], [130.0, -12.0]
  ]);

  // Americas (Background)
  drawContinent([
    [-130.0, 55.0], [-125.0, 40.0], [-117.0, 32.0], [-105.0, 20.0], [-90.0, 15.0],
    [-80.0, 8.5], [-75.0, 11.0], [-60.0, 5.0], [-35.0, -5.0], [-40.0, -22.0],
    [-55.0, -38.0], [-68.0, -55.0], [-75.0, -45.0], [-72.0, -20.0], [-80.0, -2.0],
    [-80.0, 8.5], [-95.0, 20.0], [-80.0, 25.0], [-75.0, 38.0], [-65.0, 45.0],
    [-80.0, 55.0], [-120.0, 68.0], [-160.0, 65.0], [-140.0, 60.0]
  ]);

  // Antarctica
  drawContinent([
    [-180.0, -70.0], [180.0, -70.0], [180.0, -90.0], [-180.0, -90.0]
  ]);

  // Subtle Basin Reference Labels
  ctx.font = '600 12px "JetBrains Mono", Inter, sans-serif';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.40)';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';

  ctx.fillText('INDIAN OCEAN', toX(80), toY(-10));
  ctx.font = '500 10px "JetBrains Mono", Inter, sans-serif';
  ctx.fillStyle = 'rgba(148, 163, 184, 0.30)';
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
  const texture = useMemo(() => createOceanFirstEarthTexture(variable, depth), [variable, depth]);

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
        roughness={0.40}
        metalness={0.20}
        emissive={new THREE.Color('#020914')}
        emissiveIntensity={0.20}
      />
    </mesh>
  );
};
