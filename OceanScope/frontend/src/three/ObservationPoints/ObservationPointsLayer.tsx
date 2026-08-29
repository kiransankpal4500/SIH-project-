import React, { useState } from 'react';
import { Observation } from '../../types';
import { latLonToVector3 } from '../utils/threeMath';
import { Html } from '@react-three/drei';
import { formatValue, formatCoordinates } from '../../utils/formatters';

interface ObservationPointsLayerProps {
  observations?: Observation[];
  visible?: boolean;
}

export const ObservationPointsLayer: React.FC<ObservationPointsLayerProps> = ({
  observations = [],
  visible = true,
}) => {
  const [hoveredObs, setHoveredObs] = useState<Observation | null>(null);

  if (!visible || observations.length === 0) return null;

  return (
    <group>
      {observations.map((obs) => {
        const pos = latLonToVector3(obs.location.latitude, obs.location.longitude, obs.location.depth);
        const isHovered = hoveredObs?.id === obs.id;
        const pointColor = obs.source === 'ARGO' ? '#00B4D8' : '#10B981';

        return (
          <group key={obs.id} position={pos}>
            {/* Outer Glowing Pulsing Ring */}
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredObs(obs);
              }}
              onPointerOut={() => setHoveredObs(null)}
            >
              <sphereGeometry args={[isHovered ? 0.08 : 0.05, 16, 16]} />
              <meshBasicMaterial color={pointColor} />
            </mesh>

            {/* Hover Tooltip Card */}
            {isHovered && (
              <Html distanceFactor={10} zIndexRange={[100, 0]}>
                <div className="bg-ocean-950/95 border border-ocean-400 p-2.5 rounded-md text-[11px] font-mono text-white shadow-xl pointer-events-none w-48 -translate-x-1/2 -translate-y-full mb-2">
                  <div className="flex items-center justify-between border-b border-ocean-800 pb-1 mb-1">
                    <span className="font-bold text-ocean-400">{obs.platformId}</span>
                    <span className="text-[9px] px-1 bg-ocean-800 rounded">{obs.source}</span>
                  </div>
                  <div className="space-y-0.5 text-slate-300">
                    <div>Loc: {formatCoordinates(obs.location.latitude, obs.location.longitude)}</div>
                    <div>Depth: {obs.location.depth}m</div>
                    <div className="text-emerald-400 font-semibold">
                      Temp: {formatValue(obs.variables.temperature, '°C')}
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
