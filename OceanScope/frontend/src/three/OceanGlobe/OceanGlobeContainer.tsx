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
import {
  RotateCw,
  Compass,
  Layers,
  Radio,
  Activity,
  ShieldAlert,
  MapPin,
  Maximize2,
} from 'lucide-react';
import { useOceanContext } from '../../store/OceanContext';
import { latLonToVector3, vector3ToLatLon } from '../utils/threeMath';
import { formatCoordinates, formatValue } from '../../utils/formatters';

interface OceanGlobeContainerProps {
  variable?: string;
  depth?: number;
  heightClass?: string;
}

export const OceanGlobeContainer: React.FC<OceanGlobeContainerProps> = ({
  variable = 'temperature',
  depth = 0,
  heightClass = 'h-[520px]',
}) => {
  const {
    state,
    selectArgoFloat,
    evaluateLocationRisk,
  } = useOceanContext();

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showCurrents, setShowCurrents] = useState<boolean>(true);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  const [showLayers, setShowLayers] = useState<boolean>(false);
  const [hoveredLiveFloat, setHoveredLiveFloat] = useState<any | null>(null);
  const controlsRef = useRef<OrbitControlsType>(null);

  const focusRegion = (targetLat: number, targetLon: number) => {
    if (!controlsRef.current) return;
    setAutoRotate(false);

    const phi = (90 - targetLat) * (Math.PI / 180);
    const theta = (targetLon + 180) * (Math.PI / 180);
    const distance = 5.0;

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
      className={`relative w-full ${heightClass} bg-[#040814] border border-slate-800 rounded overflow-hidden flex flex-col`}
    >
      {/* Three.js R3F Scientific Canvas */}
      <Canvas
        camera={{ position: [0, 1.2, 5.0], fov: 42 }}
        gl={{ antialias: true }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[10, 8, 10]} intensity={1.4} color="#FFFFFF" />
        <directionalLight position={[-10, -5, -10]} intensity={0.25} color="#38BDF8" />

        {/* Core Earth & Atmosphere */}
        <OceanSphere variable={variable} depth={depth} onClick={handleGlobeClick} />
        <AtmosphereGlow />

        {/* Decision-Support Risk Hotspots */}
        <RiskHotspotsLayer
          hotspots={state.riskAlerts}
          visible={state.showRiskLayer}
          onSelectHotspot={(h) => {
            evaluateLocationRisk(h.latitude, h.longitude, depth, state.selectedTimestamp);
            focusRegion(h.latitude, h.longitude);
          }}
        />

        {/* Selected Location Reticle Ring */}
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

        {/* Real In-Situ Observation Markers */}
        {showPoints &&
          (state.isLiveDataMode && state.liveObservations.length > 0 ? (
            <group>
              {state.liveObservations.map((obs) => {
                const pos = latLonToVector3(obs.latitude, obs.longitude, obs.pressure || 0);
                const isHovered = hoveredLiveFloat?.platform_number === obs.platform_number;
                const isSelected = state.selectedPlatformId === obs.platform_number;

                return (
                  <group key={obs.platform_number} position={pos}>
                    {/* Scientific Diamond Marker */}
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

                    {/* Selected Reticle */}
                    {isSelected && (
                      <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.07, 0.085, 32]} />
                        <meshBasicMaterial color="#F59E0B" transparent opacity={0.8} />
                      </mesh>
                    )}

                    {/* Instrument Tooltip HUD */}
                    {isHovered && (
                      <Html distanceFactor={8.5} zIndexRange={[100, 0]}>
                        <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded text-[11px] font-mono text-slate-100 shadow-2xl pointer-events-none w-52 -translate-x-1/2 -translate-y-full mb-3 backdrop-blur-md">
                          <div className="flex items-center justify-between border-b border-slate-700 pb-1 mb-1.5">
                            <span className="font-bold text-slate-200">Float #{obs.platform_number}</span>
                            <span className="text-[9px] px-1 py-0.2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded font-semibold">
                              INCOIS LIVE
                            </span>
                          </div>
                          <div className="space-y-0.5 text-[10px] text-slate-300">
                            <div className="flex justify-between text-slate-400">
                              <span>CYCLE:</span>
                              <span className="text-slate-200">#{obs.cycle_number}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>POS:</span>
                              <span className="text-slate-200">{formatCoordinates(obs.latitude, obs.longitude)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>PRES:</span>
                              <span className="text-slate-200">{obs.pressure ?? 0} dbar</span>
                            </div>
                            <div className="flex justify-between text-slate-400 pt-0.5 border-t border-slate-800">
                              <span>TEMP:</span>
                              <span className="text-emerald-400 font-semibold">{formatValue(obs.temperature, '°C')}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>SALN:</span>
                              <span className="text-cyan-300 font-semibold">{formatValue(obs.salinity, 'PSU')}</span>
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
          enablePan={false}
          minDistance={3.2}
          maxDistance={8.5}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
        />
      </Canvas>

      {/* Top Left Viewport Status Badge */}
      <div className="absolute top-2.5 left-2.5 flex items-center space-x-2 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded text-[11px] font-mono text-slate-300 backdrop-blur-md">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            state.isLiveDataMode ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}
        />
        <span className="font-semibold text-slate-200">
          {state.isLiveDataMode ? 'INCOIS OPERATIONAL STREAM' : 'DEMO SANDBOX'}
        </span>
        <span className="text-slate-500">|</span>
        <span className="text-slate-400">{state.selectedTimestamp.split('T')[0]}</span>
      </div>

      {/* Bottom Left Scientific Color Bar HUD */}
      <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-auto">
        <ScientificColorBar
          variable={variable}
          depth={depth}
          timestamp={state.selectedTimestamp}
          isLiveData={state.isLiveDataMode}
        />
      </div>

      {/* Top Right Precision Layer Controls */}
      <div className="absolute top-2.5 right-2.5 flex items-center space-x-1 bg-slate-900/90 border border-slate-800 p-1 rounded backdrop-blur-md z-10">
        <button
          onClick={() => setShowPoints(!showPoints)}
          className={`px-2 py-1 rounded text-[10px] font-mono transition-colors flex items-center gap-1 ${
            showPoints
              ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle In-Situ Observation Markers"
        >
          <Radio className="w-3 h-3" />
          <span>In-Situ</span>
        </button>

        <button
          onClick={() => setShowCurrents(!showCurrents)}
          className={`px-2 py-1 rounded text-[10px] font-mono transition-colors flex items-center gap-1 ${
            showCurrents
              ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Ocean Current Streamlines"
        >
          <Activity className="w-3 h-3" />
          <span>Vectors</span>
        </button>

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1.5 rounded transition-colors ${
            autoRotate
              ? 'bg-slate-800 text-slate-200 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Earth Rotation"
        >
          <RotateCw className="w-3 h-3" />
        </button>
      </div>

      {/* Bottom Right Region Preset Navigation Buttons */}
      <div className="absolute bottom-2.5 right-2.5 flex items-center space-x-1 bg-slate-900/90 border border-slate-800 p-1 rounded backdrop-blur-md z-10 text-[10px] font-mono">
        <span className="px-1.5 text-slate-500 uppercase tracking-wider text-[9px]">FOCUS:</span>
        <button
          onClick={() => focusRegion(12.0, 80.0)}
          className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60"
        >
          Indian Ocean
        </button>
        <button
          onClick={() => focusRegion(16.0, 65.0)}
          className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60"
        >
          Arabian Sea
        </button>
        <button
          onClick={() => focusRegion(15.0, 88.0)}
          className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700/60"
        >
          Bay of Bengal
        </button>
      </div>
    </div>
  );
};
