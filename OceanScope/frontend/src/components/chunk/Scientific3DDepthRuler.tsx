/**
 * Scientific 3D Depth Ruler & Depth Zone Indicators
 * - Positioned as a separate 3D object beside the front-left vertical edge of the ocean chunk.
 * - Firmly anchored in Three.js world space coordinates: rotates, pans, and zooms seamlessly with the chunk.
 * - Displays exact GEBCO bathymetric depth mapping: 0m sea surface datum down to seabed floor and bedrock skirt.
 * - Camera-facing crisp HTML billboard labels for legibility from any viewing perspective.
 * - Highlights active CTD sounding depth and Mixed Layer Depth (MLD) pycnocline boundary.
 */

import React, { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

export interface Scientific3DDepthRulerProps {
  width: number;
  chunkHeight: number;
  minDepthM: number;
  maxDepthM: number;
  meanDepthM: number;
  selectedDepth?: number;
  mldDepth?: number | null;
  selectedVariable?: 'temperature' | 'salinity' | 'current' | 'mld' | 'height';
}

export const Scientific3DDepthRuler: React.FC<Scientific3DDepthRulerProps> = ({
  width,
  chunkHeight,
  minDepthM,
  maxDepthM,
  meanDepthM,
  selectedDepth,
  mldDepth,
  selectedVariable,
}) => {
  // Front-left corner of the chunk in world coordinates
  const rulerX = -width / 2 - 0.28;
  const rulerZ = width / 2 + 0.06;

  // Real depth mapping to 3D Y coordinates
  // Datum: Surface = 0m (y = 0), Seabed floor = meanDepthM (y = -chunkHeight * 0.66), Bedrock = -chunkHeight
  const seabedY = -chunkHeight * 0.66;
  const bedrockY = -chunkHeight;

  const depthToY = useMemo(() => {
    return (depthM: number): number => {
      if (depthM <= 0) return 0;
      if (meanDepthM <= 0) return 0;
      if (depthM >= meanDepthM) {
        // Deep trench / bedrock transition
        const extraRatio = Math.min(1.0, (depthM - meanDepthM) / Math.max(100, maxDepthM - meanDepthM));
        return seabedY - extraRatio * (Math.abs(bedrockY) - Math.abs(seabedY));
      }
      // Linear water column distribution
      const ratio = depthM / meanDepthM;
      return ratio * seabedY;
    };
  }, [meanDepthM, maxDepthM, seabedY, bedrockY]);

  // Generate clean, minimal depth ticks matching the reference design:
  // Surface at datum 0m, intermediate zone marker if relevant, and exact measured seafloor depth
  const ticks = useMemo(() => {
    const list: Array<{ depth: number; label: string; zone: string; isSeabed?: boolean }> = [
      { depth: 0, label: '0 m', zone: '— Surface' },
    ];

    const targetSeabed = Math.round(maxDepthM > 0 ? maxDepthM : meanDepthM);

    // Optional intermediate twilight / mesopelagic tick only if deep enough
    if (targetSeabed >= 2000) {
      list.push({ depth: 1000, label: '1,000 m', zone: '— Mesopelagic' });
    }

    // Actual GEBCO Seafloor Depth tick
    list.push({
      depth: targetSeabed,
      label: `${targetSeabed.toLocaleString()} m`,
      zone: '— Seafloor (GEBCO)',
      isSeabed: true,
    });

    return list;
  }, [meanDepthM, maxDepthM]);

  // Selected observation depth position
  const selectedY = selectedDepth !== undefined && selectedDepth > 0 ? depthToY(selectedDepth) : null;
  // MLD depth position
  const mldY = mldDepth !== undefined && mldDepth !== null && mldDepth > 0 ? depthToY(mldDepth) : null;

  return (
    <group position={[rulerX, 0, rulerZ]}>
      {/* ─── 1. Main Luminescent Vertical Spine Line ─── */}
      <mesh position={[0, bedrockY / 2, 0]}>
        <cylinderGeometry args={[0.014, 0.014, Math.abs(bedrockY), 16]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={0.65}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>

      {/* Surface Datum Cap (Sphere) */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={0.8} />
      </mesh>

      {/* Bedrock Datum Cap (Sphere) */}
      <mesh position={[0, bedrockY, 0]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#64748b" emissive="#334155" emissiveIntensity={0.4} />
      </mesh>

      {/* ─── 2. Vertical Axis Title "DEPTH (m)" ─── */}
      <Html position={[-0.42, bedrockY * 0.48, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
        <div className="select-none pointer-events-none flex items-center justify-center">
          <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400/90 uppercase [writing-mode:vertical-lr] rotate-180 bg-slate-950/80 px-1 py-2 rounded-md border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
            DEPTH (m)
          </span>
        </div>
      </Html>

      {/* ─── 3. Scientific Depth Ticks & Labels ─── */}
      {ticks.map((tick) => {
        const yPos = tick.isSeabed ? seabedY : depthToY(tick.depth);
        return (
          <group key={tick.depth} position={[0, yPos, 0]}>
            {/* Horizontal Tick Bar extending outward */}
            <mesh position={[-0.1, 0, 0]}>
              <boxGeometry args={[0.2, 0.015, 0.015]} />
              <meshStandardMaterial
                color={tick.isSeabed ? '#fbbf24' : '#38bdf8'}
                emissive={tick.isSeabed ? '#d97706' : '#0284c7'}
                emissiveIntensity={0.7}
              />
            </mesh>

            {/* Billboard HTML Label */}
            <Html position={[-0.22, 0, 0]} center={false} distanceFactor={8} zIndexRange={[100, 0]}>
              <div className="select-none pointer-events-none -translate-y-1/2 whitespace-nowrap pl-1">
                <div
                  className={`inline-flex items-baseline gap-1.5 px-2 py-0.5 rounded-md border text-[10px] font-mono font-bold shadow-md ${
                    tick.isSeabed
                      ? 'bg-amber-950/90 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.35)]'
                      : 'bg-slate-950/85 text-cyan-200 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  }`}
                >
                  <span className="font-extrabold">{tick.label}</span>
                  <span className="text-[9px] font-normal text-slate-300 opacity-80">{tick.zone}</span>
                </div>
              </div>
            </Html>
          </group>
        );
      })}

      {/* ─── 4. Active Sounding Depth Indicator (if selected) ─── */}
      {selectedY !== null && selectedDepth !== undefined && selectedDepth > 0 && (
        <group position={[0, selectedY, 0]}>
          <mesh position={[-0.14, 0, 0]}>
            <boxGeometry args={[0.28, 0.02, 0.02]} />
            <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.9} />
          </mesh>
          <Html position={[-0.3, 0, 0]} center={false} distanceFactor={8} zIndexRange={[100, 0]}>
            <div className="select-none pointer-events-none -translate-y-1/2 whitespace-nowrap pl-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold border border-amber-300 text-[10px] font-mono shadow-[0_0_12px_rgba(245,158,11,0.6)]">
                <span>Sounding Level: {selectedDepth}m</span>
              </div>
            </div>
          </Html>
        </group>
      )}

      {/* ─── 5. MLD Pycnocline Boundary Marker (if MLD selected or available) ─── */}
      {mldY !== null && mldDepth !== undefined && mldDepth !== null && mldDepth > 0 && selectedVariable === 'mld' && (
        <group position={[0, mldY, 0]}>
          <mesh position={[-0.14, 0, 0]}>
            <boxGeometry args={[0.28, 0.02, 0.02]} />
            <meshStandardMaterial color="#a855f7" emissive="#7e22ce" emissiveIntensity={0.9} />
          </mesh>
          <Html position={[-0.3, 0, 0]} center={false} distanceFactor={8} zIndexRange={[100, 0]}>
            <div className="select-none pointer-events-none -translate-y-1/2 whitespace-nowrap pl-1">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-950/90 text-purple-200 font-bold border border-purple-400 text-[10px] font-mono shadow-[0_0_12px_rgba(168,85,247,0.5)]">
                <span>Mixed Layer (MLD): {Math.round(mldDepth)}m</span>
              </div>
            </div>
          </Html>
        </group>
      )}
    </group>
  );
};
