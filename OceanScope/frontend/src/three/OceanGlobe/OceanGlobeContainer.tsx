import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import * as THREE from 'three';
import { OceanSphere } from './OceanSphere';
import { AtmosphereGlow } from './AtmosphereGlow';
import { ObservationPointsLayer } from '../ObservationPoints/ObservationPointsLayer';
import { CurrentsLayer } from '../Currents/CurrentsLayer';
import { DepthLayersManager } from '../DepthLayers/DepthLayersManager';
import { RiskHotspotsLayer } from '../Risk/RiskHotspotsLayer';
import { ScientificColorBar } from './ScientificColorBar';
import { MOCK_OBSERVATIONS } from '../../data/mock/oceanMockData';
import { RotateCw } from 'lucide-react';
import { useOceanContext } from '../../store/OceanContext';
import { latLonToVector3, vector3ToLatLon } from '../utils/threeMath';
import { formatCoordinates, formatValue } from '../../utils/formatters';

interface OceanGlobeContainerProps {
  variable?: string;
  depth?: number;
  heightClass?: string;
  showCurrents?: boolean;
  showPoints?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const OceanGlobeContainer: React.FC<OceanGlobeContainerProps> = ({
  variable = 'temperature',
  depth = 0,
  heightClass = 'h-[75vh] min-h-[540px]',
  showCurrents: propShowCurrents,
  showPoints: propShowPoints,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const {
    state,
    selectArgoFloat,
    evaluateLocationRisk,
  } = useOceanContext();

  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [internalShowCurrents, setInternalShowCurrents] = useState<boolean>(true);
  const [internalShowPoints, setInternalShowPoints] = useState<boolean>(true);
  const [hoveredLiveFloat, setHoveredLiveFloat] = useState<any | null>(null);
  const controlsRef = useRef<OrbitControlsType>(null);

  const showCurrents = propShowCurrents !== undefined ? propShowCurrents : internalShowCurrents;
  const showPoints = propShowPoints !== undefined ? propShowPoints : internalShowPoints;

  const focusRegion = (targetLat: number, targetLon: number) => {
    if (!controlsRef.current) return;
    setAutoRotate(false);

    const phi = (90 - targetLat) * (Math.PI / 180);
    const theta = (targetLon + 180) * (Math.PI / 180);
    const distance = 4.8;

    const x = -(distance * Math.sin(phi) * Math.cos(theta));
    const z = distance * Math.sin(phi) * Math.sin(theta);
    const y = distance * Math.cos(phi);

    controlsRef.current.object.position.set(x, y, z);
    controlsRef.current.update();
  };

  const handleGlobeClick = (point: THREE.Vector3) => {
    const { lat, lon } = vector3ToLatLon(point);
    evaluateLocationRisk(lat, lon, depth, state.selectedTimestamp);
  };

  return (
    <div
      className={`relative w-full ${heightClass} bg-[#020610] rounded-lg overflow-hidden`}
    >
      {/* Three.js R3F Canvas */}
      <Canvas
        camera={{ position: [0, 1.2, 4.8], fov: 42 }}
        gl={{ antialias: true }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Lighting */}
        <ambientLight intensity={0.85} />
        <directionalLight position={[12, 9, 10]} intensity={1.25} color="#FFFBF5" />
        <directionalLight position={[-12, -6, -10]} intensity={0.18} color="#1E3A8A" />

        {/* Core Earth & Atmosphere */}
        <OceanSphere variable={variable} depth={depth} onClick={handleGlobeClick} />
        <AtmosphereGlow />

        {/* Risk Hotspots */}
        <RiskHotspotsLayer
          hotspots={state.riskAlerts}
          visible={state.showRiskLayer}
          onSelectHotspot={(h) => {
            evaluateLocationRisk(h.latitude, h.longitude, depth, state.selectedTimestamp);
            focusRegion(h.latitude, h.longitude);
          }}
        />

        {/* Selected Location Reticle */}
        {state.selectedRiskLocation && (
          <group
            position={latLonToVector3(
              state.selectedRiskLocation.lat,
              state.selectedRiskLocation.lon,
              0
            )}
          >
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.065, 0.08, 32]} />
              <meshBasicMaterial color="#38BDF8" side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshBasicMaterial color="#38BDF8" />
            </mesh>
          </group>
        )}

        {/* In-Situ Observation Markers */}
        {showPoints &&
          (state.isLiveDataMode && state.liveObservations.length > 0 ? (
            <group>
              {state.liveObservations.map((obs) => {
                const pos = latLonToVector3(obs.latitude, obs.longitude, obs.pressure || 0);
                const isHovered = hoveredLiveFloat?.platform_number === obs.platform_number;
                const isSelected = state.selectedPlatformId === obs.platform_number;

                return (
                  <group key={obs.platform_number} position={pos}>
                    <mesh
                      onPointerOver={(e) => {
                        e.stopPropagation();
                        setHoveredLiveFloat(obs);
                      }}
                      onPointerOut={() => setHoveredLiveFloat(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectArgoFloat(obs.platform_number, obs.cycle_number);
                        evaluateLocationRisk(obs.latitude, obs.longitude, depth, state.selectedTimestamp);
                      }}
                    >
                      <octahedronGeometry args={[isSelected ? 0.075 : isHovered ? 0.065 : 0.042]} />
                      <meshStandardMaterial
                        color={isSelected ? '#F59E0B' : isHovered ? '#38BDF8' : '#10B981'}
                        roughness={0.3}
                      />
                    </mesh>

                    {isSelected && (
                      <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.07, 0.085, 32]} />
                        <meshBasicMaterial color="#F59E0B" transparent opacity={0.8} />
                      </mesh>
                    )}

                    {/* Clean Tooltip */}
                    {isHovered && (
                      <Html distanceFactor={8.5} zIndexRange={[100, 0]}>
                        <div className="bg-slate-950/95 border border-slate-700/80 px-3 py-2 rounded text-xs font-sans text-slate-100 shadow-xl pointer-events-none w-48 -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md">
                          <div className="font-medium text-slate-200 text-xs mb-1">
                            Float #{obs.platform_number}
                            <span className="text-slate-400 font-normal ml-1.5">Cycle {obs.cycle_number}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 space-y-0.5">
                            <div>{formatCoordinates(obs.latitude, obs.longitude)}</div>
                            <div className="flex justify-between pt-0.5">
                              <span className="text-slate-200">{formatValue(obs.temperature, '°C')}</span>
                              <span className="text-slate-200">{formatValue(obs.salinity, 'PSU')}</span>
                            </div>
                          </div>
                        </div>
                      </Html>
                    )}
                  </group>
                );
              })}
            </group>
          ) : (
            <ObservationPointsLayer observations={MOCK_OBSERVATIONS} visible={showPoints} />
          ))}

        <CurrentsLayer visible={showCurrents} depth={depth} speedMultiplier={state.playbackSpeed} />
        <DepthLayersManager currentDepth={depth} />

        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={2.8}
          maxDistance={9.0}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
        />
      </Canvas>

      {/* Bottom Left: Minimal Color Legend */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
        <ScientificColorBar variable={variable} />
      </div>

      {/* Bottom Right: Rotate toggle only */}
      <div className="absolute bottom-3 right-3 z-10">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
            autoRotate
              ? 'bg-slate-800/90 text-cyan-300'
              : 'bg-slate-900/70 text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Rotation"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
