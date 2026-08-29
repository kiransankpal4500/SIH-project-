import React, { useState } from 'react';
import { RegionalRiskHotspot } from '../../types';
import { latLonToVector3 } from '../utils/threeMath';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface RiskHotspotsLayerProps {
  hotspots?: RegionalRiskHotspot[];
  visible?: boolean;
  onSelectHotspot?: (hotspot: RegionalRiskHotspot) => void;
}

const RISK_COLOR_MAP: Record<string, string> = {
  LOW: '#10B981',
  MODERATE: '#F59E0B',
  HIGH: '#F97316',
  CRITICAL: '#EF4444',
};

export const RiskHotspotsLayer: React.FC<RiskHotspotsLayerProps> = ({
  hotspots = [],
  visible = true,
  onSelectHotspot,
}) => {
  const [hoveredHotspot, setHoveredHotspot] = useState<RegionalRiskHotspot | null>(null);

  if (!visible || hotspots.length === 0) return null;

  return (
    <group>
      {hotspots.map((h) => {
        const pos = latLonToVector3(h.latitude, h.longitude, 0);
        const color = RISK_COLOR_MAP[h.risk_level] || '#F59E0B';
        const isHovered = hoveredHotspot?.id === h.id;

        return (
          <group key={h.id} position={pos}>
            {/* Scientific Hazard Ring Perimeter */}
            <mesh
              rotation={[Math.PI / 2, 0, 0]}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredHotspot(h);
              }}
              onPointerOut={() => setHoveredHotspot(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectHotspot) onSelectHotspot(h);
              }}
            >
              <ringGeometry args={[isHovered ? 0.09 : 0.065, isHovered ? 0.11 : 0.08, 32]} />
              <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.85} />
            </mesh>

            {/* Central Node Indicator */}
            <mesh>
              <sphereGeometry args={[0.025, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>

            {/* Hover Tooltip Card */}
            {isHovered && (
              <Html distanceFactor={8.5} zIndexRange={[100, 0]}>
                <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded text-[11px] font-mono text-slate-100 shadow-2xl pointer-events-none w-56 -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                    <span className="font-semibold text-slate-200 truncate pr-1">{h.title}</span>
                    <span
                      className="text-[9px] px-1 py-0.2 rounded font-bold"
                      style={{
                        backgroundColor: `${color}20`,
                        color: color,
                        border: `1px solid ${color}60`,
                      }}
                    >
                      {h.risk_level}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-slate-300">
                    <div className="flex justify-between text-slate-400">
                      <span>PARAM:</span>
                      <span className="text-slate-200">{h.contributing_parameter}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>VALUE:</span>
                      <span className="font-bold" style={{ color: color }}>
                        {h.actual_value} {h.unit}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>REGION:</span>
                      <span className="text-slate-200">{h.region_name}</span>
                    </div>
                  </div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
};
