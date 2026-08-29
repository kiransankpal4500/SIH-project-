import React, { useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsType } from 'three-stdlib';
import { OceanSphere } from './OceanSphere';
import { AtmosphereGlow } from './AtmosphereGlow';
import { ObservationPointsLayer } from '../ObservationPoints/ObservationPointsLayer';
import { CurrentsLayer } from '../Currents/CurrentsLayer';
import { DepthLayersManager } from '../DepthLayers/DepthLayersManager';
import { MOCK_OBSERVATIONS } from '../../data/mock/oceanMockData';
import { RotateCw, Compass, Eye, Layers, Radio, Database } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { useOceanContext } from '../../store/OceanContext';
import { latLonToVector3 } from '../utils/threeMath';
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
  const { state, setIsLiveDataMode, selectArgoFloat, setDisplayMode, fetchHycomPoint } = useOceanContext();
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [showCurrents, setShowCurrents] = useState<boolean>(true);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  const [hoveredLiveFloat, setHoveredLiveFloat] = useState<any | null>(null);
  const controlsRef = useRef<OrbitControlsType>(null);

  const focusRegion = (targetLat: number, targetLon: number) => {
    if (!controlsRef.current) return;
    setAutoRotate(false);
    
    const phi = (90 - targetLat) * (Math.PI / 180);
    const theta = (targetLon + 180) * (Math.PI / 180);
    const distance = 5.2;

    const x = -(distance * Math.sin(phi) * Math.cos(theta));
    const z = distance * Math.sin(phi) * Math.sin(theta);
    const y = distance * Math.cos(phi);

    controlsRef.current.object.position.set(x, y, z);
    controlsRef.current.update();
  };

  return (
    <div className={`relative w-full ${heightClass} bg-ocean-950 border border-ocean-800 rounded-lg overflow-hidden flex flex-col group`}>
      {/* Three.js R3F Canvas */}
      <Canvas
        camera={{ position: [0, 1.8, 5.2], fov: 45 }}
        gl={{ antialias: true }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} color="#FFFFFF" />
        <directionalLight position={[-10, -5, -10]} intensity={0.3} color="#00B4D8" />

        {/* Core 3D Mesh Components */}
        <OceanSphere variable={variable} depth={depth} />
        <AtmosphereGlow />

        {/* Render Live INCOIS Argo Markers or Demo Markers */}
        {showPoints && (
          state.isLiveDataMode && state.liveObservations.length > 0 ? (
            <group>
              {state.liveObservations.map((obs) => {
                const pos = latLonToVector3(obs.latitude, obs.longitude, obs.pressure || 0);
                const isHovered = hoveredLiveFloat?.platform_number === obs.platform_number;

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
                      }}
                    >
                      <sphereGeometry args={[isHovered ? 0.09 : 0.055, 16, 16]} />
                      <meshBasicMaterial color="#10B981" />
                    </mesh>

                    {isHovered && (
                      <Html distanceFactor={10} zIndexRange={[100, 0]}>
                        <div className="bg-ocean-950/95 border border-emerald-400 p-2.5 rounded-md text-[11px] font-mono text-white shadow-xl pointer-events-none w-52 -translate-x-1/2 -translate-y-full mb-2">
                          <div className="flex items-center justify-between border-b border-ocean-800 pb-1 mb-1">
                            <span className="font-bold text-emerald-400">Float #{obs.platform_number}</span>
                            <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-300 rounded font-semibold">INCOIS LIVE</span>
                          </div>
                          <div className="space-y-0.5 text-slate-300">
                            <div>Cycle: #{obs.cycle_number}</div>
                            <div>Loc: {formatCoordinates(obs.latitude, obs.longitude)}</div>
                            <div>Pres: {obs.pressure ?? 0} dbar</div>
                            <div className="text-emerald-400 font-semibold">
                              SST: {formatValue(obs.temperature, '°C')}
                            </div>
                            <div className="text-cyan-300 font-semibold">
                              Salinity: {formatValue(obs.salinity, 'PSU')}
                            </div>
                            <div className="text-[9px] text-slate-400 pt-0.5 border-t border-ocean-800">
                              Time: {obs.timestamp}
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
          )
        )}

        <CurrentsLayer visible={showCurrents} />
        <DepthLayersManager currentDepth={depth} />

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          minDistance={3.2}
          maxDistance={8.5}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
        />
      </Canvas>

      {/* Top Left Viewport Status Badge */}
      <div className="absolute top-3 left-3 flex items-center space-x-2 bg-ocean-900/90 border border-ocean-700 px-3 py-1.5 rounded-md text-xs font-mono backdrop-blur-sm pointer-events-none">
        <span
          className={`w-2 h-2 rounded-full ${
            state.displayMode === 'MODEL' ? 'bg-cyan-400 animate-pulse' :
            state.isLiveDataMode ? 'bg-emerald-400 animate-ping' : 'bg-cyan-400'
          }`}
        ></span>
        <span className="text-white font-bold">
          {state.displayMode === 'MODEL' ? 'INCOIS HYCOM MODEL' :
           state.isLiveDataMode ? 'INCOIS LIVE ARGO GLOBE' : 'R3F 3D GLOBE ENGINE'}
        </span>
        {state.displayMode === 'MODEL' && (
          <span className="text-[9px] px-1 bg-cyan-500/20 text-cyan-300 rounded">NetCDF</span>
        )}
      </div>

      {/* HYCOM Model Data HUD (top-left below status) */}
      {state.displayMode === 'MODEL' && state.hycomPoint && (
        <div className="absolute top-12 left-3 bg-ocean-950/95 border border-cyan-500/40 px-3 py-2 rounded-md text-[11px] font-mono backdrop-blur-sm pointer-events-none w-52">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1 border-b border-ocean-800 pb-1">
            <Database className="w-3.5 h-3.5" />
            HYCOM Model Output
          </div>
          <div className="space-y-0.5 text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Variable:</span>
              <span className="text-white uppercase">{state.hycomPoint.variable}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Value:</span>
              <span className="text-cyan-300 font-bold">{state.hycomPoint.value.toFixed(2)} {state.hycomPoint.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Location:</span>
              <span>{state.hycomPoint.latitude.toFixed(1)}°N, {state.hycomPoint.longitude.toFixed(1)}°E</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Depth:</span>
              <span>{state.hycomPoint.depth}m</span>
            </div>
            <div className="text-[9px] text-slate-500 border-t border-ocean-800 pt-0.5 mt-0.5">
              Model: {state.hycomPoint.model_time?.slice(0, 10)}
            </div>
          </div>
        </div>
      )}

      {/* Top Right Active Settings */}
      <div className="absolute top-3 right-3 flex items-center space-x-2 bg-ocean-900/90 border border-ocean-700 px-3 py-1.5 rounded-md text-xs font-mono text-ocean-200 backdrop-blur-sm pointer-events-none">
        <Layers className="w-3.5 h-3.5 text-ocean-400" />
        <span>Field: <strong className="text-white uppercase">{variable}</strong> ({depth}m)</span>
      </div>

      {/* Bottom Bar Controls */}
      <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 bg-ocean-900/90 border border-ocean-800 p-2 rounded-md backdrop-blur-sm text-xs font-mono">
        <div className="flex items-center space-x-1.5">
          <Button
            variant={autoRotate ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setAutoRotate(!autoRotate)}
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? 'animate-spin' : ''}`} />
            <span>{autoRotate ? 'Auto-Rotate ON' : 'Rotate OFF'}</span>
          </Button>

          <Button
            variant={state.isLiveDataMode ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setIsLiveDataMode(!state.isLiveDataMode)}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{state.isLiveDataMode ? '● LIVE INCOIS' : 'Enable Live Data'}</span>
          </Button>

          <Button
            variant={state.displayMode === 'MODEL' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => {
              const newMode = state.displayMode === 'MODEL' ? 'OBSERVATION' : 'MODEL';
              setDisplayMode(newMode);
              if (newMode === 'MODEL') {
                fetchHycomPoint(12.0, 75.0, depth, variable);
              }
            }}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{state.displayMode === 'MODEL' ? '● HYCOM MODEL' : 'Model Mode'}</span>
          </Button>

          <Button
            variant={showCurrents ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setShowCurrents(!showCurrents)}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Currents</span>
          </Button>

          <Button
            variant={showPoints ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setShowPoints(!showPoints)}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Argo Floats</span>
          </Button>
        </div>

        {/* Spatial Presets */}
        <div className="flex items-center space-x-1 text-[11px]">
          <span className="text-slate-400 mr-1 hidden sm:inline">Preset:</span>
          <button
            onClick={() => focusRegion(12, 80)}
            className="px-2 py-1 bg-ocean-850 hover:bg-ocean-800 text-ocean-300 rounded border border-ocean-700"
          >
            Indian Ocean
          </button>
          <button
            onClick={() => focusRegion(15, 68)}
            className="px-2 py-1 bg-ocean-850 hover:bg-ocean-800 text-ocean-300 rounded border border-ocean-700"
          >
            Arabian Sea
          </button>
          <button
            onClick={() => focusRegion(14, 88)}
            className="px-2 py-1 bg-ocean-850 hover:bg-ocean-800 text-ocean-300 rounded border border-ocean-700"
          >
            Bay of Bengal
          </button>
        </div>
      </div>
    </div>
  );
};
