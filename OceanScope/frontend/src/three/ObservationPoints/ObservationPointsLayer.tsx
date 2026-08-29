import React, { useState } from 'react';
import { Observation } from '../../types';
import { latLonToVector3 } from '../utils/threeMath';
import { Html } from '@react-three/drei';
import { formatValue, formatCoordinates } from '../../utils/formatters';

interface ObservationPointsLayerProps {
  observations?: Observation[];
  visible?: boolean;
  selectedPlatformId?: string | null;
  onSelectObservation?: (obs: Observation) => void;
}

export const ObservationPointsLayer: React.FC<ObservationPointsLayerProps> = ({
  observations = [],
  visible = true,
  selectedPlatformId = null,
  onSelectObservation,
}) => {
  const [hoveredObs, setHoveredObs] = useState<Observation | null>(null);

  if (!visible || observations.length === 0) return null;

  return (
    <group>
      {observations.map((obs) => {
        const pos = latLonToVector3(obs.location.latitude, obs.location.longitude, obs.location.depth);
        const isHovered = hoveredObs?.id === obs.id;
        const isSelected = selectedPlatformId === obs.platformId;

        return (
          <group key={obs.id} position={pos}>
            {/* Scientific In-Situ Observation Symbol (Diamond / Octahedron) */}
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredObs(obs);
              }}
              onPointerOut={() => setHoveredObs(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectObservation) onSelectObservation(obs);
              }}
            >
              <octahedronGeometry args={[isSelected ? 0.075 : isHovered ? 0.065 : 0.042]} />
              <meshStandardMaterial
                color={isSelected ? '#F59E0B' : isHovered ? '#38BDF8' : '#10B981'}
                roughness={0.3}
                metalness={0.2}
                wireframe={false}
              />
            </mesh>

            {/* Targeted Reticle on Selected Observation */}
            {isSelected && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.07, 0.085, 32]} />
                <meshBasicMaterial color="#F59E0B" transparent opacity={0.8} />
              </mesh>
            )}

            {/* Instrument-Grade Observation Tooltip Card */}
            {isHovered && (
              <Html distanceFactor={8.5} zIndexRange={[100, 0]}>
                <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded text-[11px] font-mono text-slate-100 shadow-2xl pointer-events-none w-48 -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                    <span className="font-semibold text-slate-200">{obs.platformId}</span>
                    <span className="text-[9px] px-1 py-0.2 bg-slate-800 border border-slate-700 text-slate-300 rounded uppercase">
                      {obs.source}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-slate-300">
                    <div className="flex justify-between text-slate-400">
                      <span>POS:</span>
                      <span className="font-sans text-slate-200">{formatCoordinates(obs.location.latitude, obs.location.longitude)}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>DEPTH:</span>
                      <span className="text-slate-200">{obs.location.depth} m</span>
                    </div>
                    {obs.variables.temperature !== undefined && (
                      <div className="flex justify-between text-slate-400 pt-0.5 border-t border-slate-800">
                        <span>TEMP:</span>
                        <span className="text-emerald-400 font-semibold">{formatValue(obs.variables.temperature, '°C')}</span>
                      </div>
                    )}
                    {obs.variables.salinity !== undefined && (
                      <div className="flex justify-between text-slate-400">
                        <span>SALN:</span>
                        <span className="text-cyan-300 font-semibold">{formatValue(obs.variables.salinity, 'PSU')}</span>
                      </div>
                    )}
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
