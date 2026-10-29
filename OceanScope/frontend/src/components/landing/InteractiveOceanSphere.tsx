import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface InteractiveOceanSphereProps {
  className?: string;
}

export const InteractiveOceanSphere: React.FC<InteractiveOceanSphereProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. WebGL Support Detection
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglSupported(false);
        return;
      }
    } catch {
      setWebglSupported(false);
      return;
    }

    // 2. Scene, Camera, Renderer
    const width = container.clientWidth || 460;
    const height = container.clientHeight || 460;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    // Position camera far enough so the full globe + atmosphere glow is never clipped
    camera.position.set(0, 0, 3.4);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn('[InteractiveOceanSphere] WebGL initialization failed, switching to fallback:', err);
      setWebglSupported(false);
      return;
    }

    // 3. Globe Mesh Geometry & Texture
    const sphereRadius = 1.0;
    const geometry = new THREE.SphereGeometry(sphereRadius, 64, 64);

    // Texture loader with error fallback to procedural gradient canvas
    const textureLoader = new THREE.TextureLoader();
    let earthTexture: THREE.Texture;

    const createFallbackCanvas = (): THREE.CanvasTexture => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 512;
      const ctx = c.getContext('2d')!;
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#0a2347');
      grad.addColorStop(0.3, '#0b3d75');
      grad.addColorStop(0.6, '#084887');
      grad.addColorStop(1, '#021833');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1024, 512);

      // Latitudinal grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.lineWidth = 1;
      for (let y = 32; y < 512; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }
      return new THREE.CanvasTexture(c);
    };

    earthTexture = textureLoader.load(
      '/assets/textures/earth_nasa_blue_marble_2k.jpg',
      () => {
        if (renderer) renderer.render(scene, camera);
      },
      undefined,
      () => {
        earthTexture = createFallbackCanvas();
        material.map = earthTexture;
        material.needsUpdate = true;
      }
    );

    const material = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.55,
      metalness: 0.08,
    });

    const globe = new THREE.Mesh(geometry, material);
    // Earth's axial tilt: 23.4°
    globe.rotation.z = (23.4 * Math.PI) / 180;
    globe.rotation.y = 1.8;
    scene.add(globe);

    // 4. Subtle Atmospheric Glow Layer (contained inside viewport bounds)
    const atmosphereGeom = new THREE.SphereGeometry(sphereRadius * 1.03, 48, 48);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
          gl_FragColor = vec4(0.22, 0.74, 0.97, 1.0) * intensity * 0.8;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeom, atmosphereMat);
    scene.add(atmosphere);

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xdff2ff, 1.6);
    sunLight.position.set(5, 3, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x0284c7, 0.9);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    // 6. Interactive Drag Controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let targetRotationSpeed = 0.002;
    let currentRotationSpeed = 0.002;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - previousMousePosition.x;
      const deltaY = clientY - previousMousePosition.y;

      globe.rotation.y += deltaX * 0.005;
      globe.rotation.x += deltaY * 0.003;
      globe.rotation.x = Math.max(-0.7, Math.min(0.7, globe.rotation.x));

      previousMousePosition = { x: clientX, y: clientY };
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domElement = renderer.domElement;
    domElement.style.cursor = 'grab';
    domElement.style.display = 'block';
    domElement.style.maxWidth = '100%';
    domElement.style.maxHeight = '100%';

    domElement.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    domElement.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // 7. Robust Resize Observer
    const handleResize = () => {
      if (!container || !renderer) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      if (newW === 0 || newH === 0) return;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 8. Animation Loop
    let animationFrameId: number;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isDragging && !prefersReducedMotion) {
        currentRotationSpeed += (targetRotationSpeed - currentRotationSpeed) * 0.05;
        globe.rotation.y += currentRotationSpeed;
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
    };
    animate();

    // 9. Resource Cleanup & Disposal
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      domElement.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domElement.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      geometry.dispose();
      material.dispose();
      earthTexture.dispose();
      atmosphereGeom.dispose();
      atmosphereMat.dispose();

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  if (!webglSupported) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-3xl bg-gradient-to-b from-[#0a192f] via-[#0b2847] to-[#04101e] border border-sky-800/40 p-6 shadow-[0_0_50px_rgba(2,132,199,0.2)] ${className}`}
        role="img"
        aria-label="OceanScope 3D Earth and Ocean Global Visualization"
      >
        <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-radial from-sky-400/30 via-sky-600/10 to-transparent p-4 flex items-center justify-center">
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-sky-400/30 flex items-center justify-center shadow-[0_0_35px_rgba(56,189,248,0.25)] relative overflow-hidden bg-[#061e38]">
            {/* Latitude / Longitude stylized grid lines */}
            <div className="absolute inset-0 rounded-full border border-sky-300/20"></div>
            <div className="absolute w-full h-[1px] bg-sky-400/30 top-1/2 -translate-y-1/2"></div>
            <div className="absolute h-full w-[1px] bg-sky-400/30 left-1/2 -translate-x-1/2"></div>
            <div className="absolute w-40 h-40 rounded-full border border-dashed border-sky-400/20"></div>
            <div className="relative z-10 text-center px-4">
              <span className="text-xs uppercase font-mono tracking-widest text-sky-400 block mb-1">
                OceanScope GIS
              </span>
              <p className="text-sm font-semibold text-white">Interactive 3D Earth</p>
              <p className="text-[11px] text-sky-200/70 mt-1">WebGL Acceleration Recommended</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative w-full aspect-square max-w-[440px] sm:max-w-[480px] lg:max-w-[500px] flex items-center justify-center overflow-visible ${className}`}
      role="region"
      aria-label="Interactive 3D Ocean Globe. Drag to rotate."
    >
      {/* Interaction prompt */}
      <div
        className={`absolute bottom-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-sky-500/20 rounded-full text-[11px] font-medium text-sky-200 transition-opacity duration-300 pointer-events-none whitespace-nowrap ${
          isHovered ? 'opacity-100' : 'opacity-70'
        }`}
      >
        <span>Drag to rotate 3D ocean sphere</span>
      </div>
    </div>
  );
};
