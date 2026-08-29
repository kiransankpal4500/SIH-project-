import React, { useMemo } from 'react';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../utils/threeMath';

interface OceanSphereProps {
  variable?: string;
  depth?: number;
}

/**
 * Generates a procedural Canvas Texture representing ocean temperature heatmaps and continental coastlines
 */
function createOceanCanvasTexture(variable: string = 'temperature'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Base Ocean Gradient Fill (Deep Abyssal Blue to Equatorial Cyan)
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  oceanGrad.addColorStop(0, '#030814'); // Polar Dark
  oceanGrad.addColorStop(0.2, '#0B2545'); // Subpolar Navy
  oceanGrad.addColorStop(0.5, '#134074'); // Equatorial Blue
  oceanGrad.addColorStop(0.8, '#0B2545');
  oceanGrad.addColorStop(1, '#030814');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Variable Heatmap Overlay Simulation
  if (variable === 'temperature') {
    const heatGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    heatGrad.addColorStop(0, 'rgba(0, 180, 216, 0.1)'); // Cold Blue
    heatGrad.addColorStop(0.3, 'rgba(16, 185, 129, 0.25)'); // Mild Green
    heatGrad.addColorStop(0.5, 'rgba(239, 68, 68, 0.4)'); // Warm Red Equatorial Current
    heatGrad.addColorStop(0.7, 'rgba(16, 185, 129, 0.25)');
    heatGrad.addColorStop(1, 'rgba(0, 180, 216, 0.1)');
    ctx.fillStyle = heatGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (variable === 'salinity') {
    const salGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    salGrad.addColorStop(0.2, 'rgba(0, 180, 216, 0.2)');
    salGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.35)'); // High Salinity Arabian Sea
    salGrad.addColorStop(0.9, 'rgba(0, 180, 216, 0.2)');
    ctx.fillStyle = salGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // 3. Grid Lines / Lat-Lon Coordinate Graticule
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  // Latitudes
  for (let y = 0; y <= canvas.height; y += canvas.height / 12) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  // Longitudes
  for (let x = 0; x <= canvas.width; x += canvas.width / 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }

  // 4. Stylized Landmass Outlines (Simplified Earth Continents)
  ctx.fillStyle = '#07101E';
  ctx.strokeStyle = '#00B4D8';
  ctx.lineWidth = 1.5;

  // Indian Subcontinent & Asia Blob
  ctx.beginPath();
  ctx.ellipse(720, 200, 90, 70, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Africa & Arabian Peninsula Blob
  ctx.beginPath();
  ctx.ellipse(560, 240, 75, 110, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Americas Blob
  ctx.beginPath();
  ctx.ellipse(260, 250, 65, 120, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Australia Blob
  ctx.beginPath();
  ctx.ellipse(850, 360, 45, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export const OceanSphere: React.FC<OceanSphereProps> = ({ variable = 'temperature' }) => {
  const texture = useMemo(() => createOceanCanvasTexture(variable), [variable]);

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.4}
        metalness={0.1}
        emissive={new THREE.Color('#030E1E')}
        emissiveIntensity={0.2}
      />
    </mesh>
  );
};
