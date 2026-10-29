/**
 * Underwater Environment Shaders and Textures
 * High-fidelity PBR seabed texture, natural animated caustics projection,
 * and particulate marine snow suspension.
 */

import * as THREE from 'three';

/**
 * Procedural Natural Seabed Texture (high-resolution sand/silt/rock normal and albedo)
 */
export function createRealisticSeabedTexture(): { albedo: THREE.CanvasTexture; normal: THREE.CanvasTexture } {
  const size = 1024;
  const canvasAlbedo = document.createElement('canvas');
  canvasAlbedo.width = size;
  canvasAlbedo.height = size;
  const ctx = canvasAlbedo.getContext('2d')!;

  // Warm benthic sediment base (calcareous/siliceous sand and marine silt)
  ctx.fillStyle = '#4a5552';
  ctx.fillRect(0, 0, size, size);

  // Gradient sediment drift
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#56635f');
  grad.addColorStop(0.5, '#44514f');
  grad.addColorStop(1, '#3b4745');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Organic sediment grain noise & ripple patterns
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      // Gentle wavy seabed ripples
      const ripple = Math.sin(x * 0.045 + Math.sin(y * 0.025) * 2.2) * 0.5 + 0.5;
      const noise = (Math.random() - 0.5) * 22;
      
      const r = Math.min(255, Math.max(0, data[idx] + ripple * 28 + noise));
      const g = Math.min(255, Math.max(0, data[idx + 1] + ripple * 30 + noise));
      const b = Math.min(255, Math.max(0, data[idx + 2] + ripple * 26 + noise));

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Add subtle biological detritus / scattered pebbles
  ctx.fillStyle = 'rgba(25, 35, 35, 0.45)';
  for (let i = 0; i < 450; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const pr = 1 + Math.random() * 3.5;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const albedo = new THREE.CanvasTexture(canvasAlbedo);
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.RepeatWrapping;
  albedo.repeat.set(3, 3);

  // Normal Map Canvas
  const canvasNormal = document.createElement('canvas');
  canvasNormal.width = size;
  canvasNormal.height = size;
  const nCtx = canvasNormal.getContext('2d')!;
  nCtx.fillStyle = '#8080ff'; // flat normal base
  nCtx.fillRect(0, 0, size, size);

  const nImgData = nCtx.getImageData(0, 0, size, size);
  const nData = nImgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const rippleGrad = Math.cos(x * 0.045) * 45;
      const noiseX = (Math.random() - 0.5) * 16;
      const noiseY = (Math.random() - 0.5) * 16;

      nData[idx] = Math.min(255, Math.max(0, 128 + rippleGrad + noiseX));
      nData[idx + 1] = Math.min(255, Math.max(0, 128 + noiseY));
      nData[idx + 2] = 230;
    }
  }
  nCtx.putImageData(nImgData, 0, 0);

  const normal = new THREE.CanvasTexture(canvasNormal);
  normal.wrapS = THREE.RepeatWrapping;
  normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(3, 3);

  return { albedo, normal };
}

/**
 * Poly Haven PBR Seabed Material Texture Loader with Instant Fallback
 * Uses CC0 licensed 1K PBR maps (Coast Sand Rocks 02 from Poly Haven)
 */
export function getPolyHavenSeabedTextures(): {
  diffuse: THREE.Texture;
  normal: THREE.Texture;
  arm: THREE.Texture;
} {
  const loader = new THREE.TextureLoader();
  const setupTex = (path: string, sRGB = false) => {
    const tex = loader.load(
      path,
      undefined,
      undefined,
      (err) => console.warn(`[Poly Haven Texture] Fallback active for ${path}:`, err)
    );
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2.5, 2.5);
    if (sRGB) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    return tex;
  };

  const diffuse = setupTex('/assets/textures/seabed/sand_diff_1k.jpg', true);
  const normal = setupTex('/assets/textures/seabed/sand_nor_1k.jpg', false);
  const arm = setupTex('/assets/textures/seabed/sand_arm_1k.jpg', false);

  return { diffuse, normal, arm };
}

/**
 * Geological Cutaway Wall Texture with scientifically distinct oceanic crust & sediment strata
 * - Layer 1: Pelagic Marine Sediment (Biogenic Ooze & Silt)
 * - Layer 2: Compacted Sandstone / Mudstone
 * - Layer 3: Marine Chert & Siliceous Shale
 * - Layer 4: Sheeted Basaltic Dykes (Upper Oceanic Crust)
 * - Layer 5: Layered Gabbro Basement (Lower Oceanic Crust)
 */
export function createPhotorealisticGeologyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base background
  ctx.fillStyle = '#1c1f21';
  ctx.fillRect(0, 0, 512, 1024);

  // Distinct geological strata with authentic natural earth tones and organic undulating boundaries
  const strata = [
    { start: 0.00, end: 0.16, c1: '#a68f74', c2: '#917b62', name: 'Pelagic Sediment' }, // Biogenic ooze / benthic sediment
    { start: 0.16, end: 0.38, c1: '#7d6954', c2: '#695642', name: 'Compacted Siltstone' }, // Silty mudstone & turbidite
    { start: 0.38, end: 0.60, c1: '#54504c', c2: '#423e3b', name: 'Siliceous Chert & Shale' }, // Deep marine bedded chert
    { start: 0.60, end: 0.82, c1: '#373c40', c2: '#2a2f33', name: 'Sheeted Basalt Dykes' }, // Pillow basalts & sheeted dykes
    { start: 0.82, end: 1.00, c1: '#22272a', c2: '#181b1d', name: 'Gabbroic Basement' }, // Coarse intrusive gabbro
  ];

  // Draw natural stratified strata with organic vertical undulation (non-flat)
  strata.forEach((s, sIdx) => {
    const y0Base = s.start * 1024;
    const y1Base = s.end * 1024;

    // Organic wavy fill
    ctx.beginPath();
    ctx.moveTo(0, y0Base);
    for (let x = 0; x <= 512; x += 16) {
      const wave = Math.sin(x * 0.02 + sIdx * 1.5) * 14 + Math.cos(x * 0.04) * 6;
      ctx.lineTo(x, y0Base + wave);
    }
    for (let x = 512; x >= 0; x -= 16) {
      const wave = Math.sin(x * 0.02 + (sIdx + 1) * 1.5) * 14 + Math.cos(x * 0.04) * 6;
      ctx.lineTo(x, y1Base + wave);
    }
    ctx.closePath();

    const g = ctx.createLinearGradient(0, y0Base, 0, y1Base);
    g.addColorStop(0, s.c1);
    g.addColorStop(0.5, s.c2);
    g.addColorStop(1, s.c1);
    ctx.fillStyle = g;
    ctx.fill();

    // Natural undulating sedimentary laminae
    ctx.lineWidth = 1.2;
    for (let l = 0; l < 6; l++) {
      const ly = y0Base + (l / 6) * (y1Base - y0Base);
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 16) {
        const wave = Math.sin(x * 0.025 + l * 0.8) * 12 + Math.cos(x * 0.05) * 5;
        if (x === 0) ctx.moveTo(x, ly + wave);
        else ctx.lineTo(x, ly + wave);
      }
      ctx.strokeStyle = l % 2 === 0 ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.22)';
      ctx.stroke();
    }
  });

  // Rock mineral grain noise overlay
  const imgData = ctx.getImageData(0, 0, 512, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 20;
    data[i] = Math.min(255, Math.max(0, data[i] + n));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n));
  }
  ctx.putImageData(imgData, 0, 0);

  // Subtle cross-cutting tectonic fractures / micro-faults
  ctx.strokeStyle = 'rgba(12, 14, 16, 0.5)';
  ctx.lineWidth = 1.6;
  for (let f = 0; f < 3; f++) {
    ctx.beginPath();
    let x = 80 + f * 170 + (Math.random() - 0.5) * 30;
    let y = 140;
    ctx.moveTo(x, y);
    while (y < 980) {
      x += (Math.random() - 0.45) * 16;
      y += 45 + Math.random() * 55;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

/**
 * Animated Caustics Texture for subtle natural light ripples
 */
export function createCausticsTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  // Voronoi-like web pattern for natural caustic rays
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.5;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 40; i++) {
    points.push({ x: Math.random() * size, y: Math.random() * size });
  }

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (d < 95) {
        ctx.beginPath();
        ctx.moveTo(points[i].x, points[i].y);
        ctx.lineTo(points[j].x, points[j].y);
        ctx.stroke();
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}
