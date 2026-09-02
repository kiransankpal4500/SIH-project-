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
  onDoubleSelectLocation?: (lat: number, lon: number) => void;
}

export const OceanGlobeContainer: React.FC<OceanGlobeContainerProps> = ({
  variable = 'temperature',
  depth = 0,
  heightClass = 'h-[72vh] min-h-[520px]',
  showCurrents: propShowCurrents,
  showPoints: propShowPoints,
  isFullscreen = false,
  onToggleFullscreen,
  onDoubleSelectLocation,
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

  const handleGlobeDoubleClick = (point: THREE.Vector3) => {
    const { lat, lon } = vector3ToLatLon(point);
    if (onDoubleSelectLocation) {
      onDoubleSelectLocation(lat, lon);
    }
  };

  return (
    <div
      className={`relative w-full ${heightClass} bg-[#040914] border border-[#E2E8F0] rounded-xl shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden`}
    >
      {/* Three.js R3F Canvas */}
      <Canvas
        camera={{ position: [0, 1.2, 4.8], fov: 42 }}
        gl={{ antialias: true }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Lighting */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[12, 9, 10]} intensity={1.3} color="#FFFBF5" />
        <directionalLight position={[-12, -6, -10]} intensity={0.22} color="#1E3A8A" />

        {/* Core Earth & Atmosphere */}
        <OceanSphere
          variable={variable}
          depth={depth}
          onClick={handleGlobeClick}
          onDoubleClick={handleGlobeDoubleClick}
        />
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
              <meshBasicMaterial color="#0B84C6" side={THREE.DoubleSide} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.02, 16, 16]} />
              <meshBasicMaterial color="#0B84C6" />
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
                        color={isSelected ? '#F59E0B' : isHovered ? '#0B84C6' : '#16A34A'}
                        roughness={0.3}
                      />
                    </mesh>

                    {isSelected && (
                      <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.07, 0.085, 32]} />
                        <meshBasicMaterial color="#F59E0B" transparent opacity={0.8} />
                      </mesh>
                    )}

                    {/* Clean Light Floating Tooltip */}
                    {isHovered && (
                      <Html distanceFactor={8.5} zIndexRange={[100, 0]}>
                        <div className="bg-[#FFFFFF] border border-[#E2E8F0] px-3.5 py-2.5 rounded-xl text-xs font-sans text-[#172033] shadow-dropdown pointer-events-none w-52 -translate-x-1/2 -translate-y-full mb-3">
                          <div className="font-bold text-[#172033] text-xs mb-1 flex items-center justify-between">
                            <span>Float #{obs.platform_number}</span>
                            <span className="text-[#0B84C6] bg-[#E0F2FE] text-[10px] px-1.5 py-0.5 rounded font-medium">Cycle {obs.cycle_number}</span>
                          </div>
                          <div className="text-[11px] text-[#64748B] space-y-1">
                            <div>{formatCoordinates(obs.latitude, obs.longitude)}</div>
                            <div className="flex justify-between pt-1 border-t border-[#F1F5F9] font-medium">
                              <span className="text-[#DC2626]">T: {formatValue(obs.temperature, '°C')}</span>
                              <span className="text-[#0B84C6]">S: {formatValue(obs.salinity, 'PSU')}</span>
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

      {/* Bottom Left: Clean Floating Color Legend */}
      <div className="absolute bottom-4 left-4 z-10 pointer-events-none">
        <ScientificColorBar variable={variable} />
      </div>

      {/* Bottom Right: Clean Light Rotate Toggle */}
      <div className="absolute bottom-4 right-4 z-10">
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-2.5 rounded-xl border border-[#E2E8F0] shadow-sm transition-all ${
            autoRotate
              ? 'bg-[#E0F2FE] text-[#0B84C6] border-[#BAE6FD]'
              : 'bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#64748B] hover:text-[#172033]'
          }`}
          title="Toggle Rotation"
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
