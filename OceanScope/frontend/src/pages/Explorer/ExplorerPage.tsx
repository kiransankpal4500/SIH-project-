import React, { useState } from 'react';
import { OceanGlobeContainer } from '../../three/OceanGlobe/OceanGlobeContainer';
import { TimeDepthPlayer } from '../../components/player/TimeDepthPlayer';
import { OceanRiskPanel } from '../../components/disaster/OceanRiskPanel';
import { DataStatusCard } from '../../components/common/DataStatusCard';
import { useOceanContext } from '../../store/OceanContext';
import { APP_CONFIG } from '../../config/appConfig';
import {
  Globe,
  Sliders,
  Layers,
  Compass,
  Activity,
  ShieldAlert,
  Radio,
  Clock,
  Layers3,
} from 'lucide-react';
import { OceanVariable } from '../../types';
import { formatCoordinates, formatValue } from '../../utils/formatters';

export const ExplorerPage: React.FC = () => {
  const { state, setSelectedVariable, setSelectedDepth, setDisplayMode } = useOceanContext();
  const [activeTab, setActiveTab] = useState<'CONTROLS' | 'FLOAT' | 'RISK'>('CONTROLS');

  return (
    <div className="space-y-3">
      {/* Precision Instrument Sub-Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0b1220] border border-slate-800 px-3 py-2 rounded text-xs font-mono">
        <div className="flex items-center space-x-2.5">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100 font-sans">3D OCEANOGRAPHIC VIEWPORT</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">INDIAN OCEAN BASIN</span>
          <span className="text-slate-500">|</span>
          <span className="text-cyan-300 font-bold uppercase">{state.selectedVariable}</span>
          <span className="text-slate-400">({state.selectedDepth}m)</span>
        </div>

        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-slate-400">MODEL TIME:</span>
          <span className="text-slate-200 font-semibold bg-slate-900 px-2 py-0.5 border border-slate-800 rounded">
            {state.selectedTimestamp}
          </span>
        </div>
      </div>

      {/* Main Viewport Grid: 3D Canvas Dominant + Right Instrument Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left / Center 3D Globe & Timeline Player (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <OceanGlobeContainer
            variable={state.selectedVariable}
            depth={state.selectedDepth}
            heightClass="h-[560px]"
          />

          {/* Precision 4D Time & Depth Timeline Player */}
          <TimeDepthPlayer />

          {/* Operational Feeds Telemetry Status Strip */}
          <DataStatusCard />
        </div>

        {/* Right Sidebar: Docked Scientific Inspector Panel (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Tab Navigation */}
          <div className="grid grid-cols-3 gap-1 bg-[#0b1220] border border-slate-800 p-1 rounded text-xs font-mono">
            <button
              onClick={() => setActiveTab('CONTROLS')}
              className={`py-1.5 rounded transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'CONTROLS'
                  ? 'bg-slate-800 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Layers</span>
            </button>
            <button
              onClick={() => setActiveTab('FLOAT')}
              className={`py-1.5 rounded transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'FLOAT'
                  ? 'bg-slate-800 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Telemetry</span>
            </button>
            <button
              onClick={() => setActiveTab('RISK')}
              className={`py-1.5 rounded transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'RISK'
                  ? 'bg-slate-800 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Hazards</span>
            </button>
          </div>

          {/* TAB 1: PARAMETER & LAYER CONTROLS */}
          {activeTab === 'CONTROLS' && (
            <div className="bg-[#0b1220] border border-slate-800 rounded p-3 text-xs font-mono space-y-4">
              {/* Ocean Variable Selector */}
              <div>
                <div className="flex items-center justify-between text-slate-300 font-sans font-semibold mb-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    OCEAN VARIABLE
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {APP_CONFIG.supportedVariables.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariable(v.id as OceanVariable)}
                      className={`p-2 rounded text-left transition-all border ${
                        state.selectedVariable === v.id
                          ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200 font-semibold'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-850'
                      }`}
                    >
                      <div className="truncate">{v.label}</div>
                      <div className="text-[10px] text-slate-400">[{v.unit}]</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Vertical Depth Slice Selector */}
              <div>
                <div className="flex items-center justify-between text-slate-300 font-sans font-semibold mb-2 text-xs">
                  <span className="flex items-center gap-1.5">
                    <Layers3 className="w-3.5 h-3.5 text-cyan-400" />
                    DEPTH SLICE
                  </span>
                  <span className="text-cyan-300">{state.selectedDepth} meters</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {APP_CONFIG.supportedDepths.map((d) => (
                    <button
                      key={d.depth}
                      onClick={() => setSelectedDepth(d.depth)}
                      className={`py-1 px-1.5 rounded text-center text-[11px] transition-all border ${
                        state.selectedDepth === d.depth
                          ? 'bg-slate-800 border-cyan-400 text-cyan-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                      }`}
                    >
                      {d.depth === 0 ? 'Surface' : `${d.depth}m`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Data Mode & Source Information */}
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
                <div className="flex justify-between">
                  <span>IN-SITU SOURCE:</span>
                  <span className="text-emerald-400 font-semibold">INCOIS ERDDAP Argo</span>
                </div>
                <div className="flex justify-between">
                  <span>MODEL SOURCE:</span>
                  <span className="text-cyan-400 font-semibold">INCOIS RSMC HYCOM</span>
                </div>
                <div className="flex justify-between">
                  <span>GRID DOMAIN:</span>
                  <span className="text-slate-200">0°–30°N, 45°–100°E</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IN-SITU FLOAT TELEMETRY INSPECTOR */}
          {activeTab === 'FLOAT' && (
            <div className="bg-[#0b1220] border border-slate-800 rounded p-3 text-xs font-mono space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-slate-200 font-sans text-xs">
                  {state.selectedPlatformId ? `FLOAT #${state.selectedPlatformId}` : 'SELECT FLOAT ON GLOBE'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded font-semibold">
                  {state.isLiveDataMode ? 'INCOIS REAL' : 'DEMO'}
                </span>
              </div>

              {state.selectedLiveArgoProfile ? (
                <div className="space-y-2 text-[11px]">
                  <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded border border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[10px] block">CYCLE</span>
                      <span className="text-slate-100 font-semibold">#{state.selectedLiveArgoProfile.cycle_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">DEPTH LEVELS</span>
                      <span className="text-slate-100 font-semibold">{state.selectedLiveArgoProfile.profile.length} levels</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">LATITUDE</span>
                      <span className="text-slate-100">{state.selectedLiveArgoProfile.latitude?.toFixed(3)}°N</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">LONGITUDE</span>
                      <span className="text-slate-100">{state.selectedLiveArgoProfile.longitude?.toFixed(3)}°E</span>
                    </div>
                  </div>

                  {/* Surface Level Reading */}
                  {state.selectedLiveArgoProfile.profile.length > 0 && (
                    <div className="bg-slate-900/80 p-2 rounded border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 block font-semibold">NEAR-SURFACE MEASUREMENT</span>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Temperature:</span>
                        <span className="text-emerald-400 font-bold">
                          {formatValue(state.selectedLiveArgoProfile.profile[0].temperature, '°C')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Salinity:</span>
                        <span className="text-cyan-300 font-bold">
                          {formatValue(state.selectedLiveArgoProfile.profile[0].salinity, 'PSU')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Pressure:</span>
                        <span className="text-slate-200">
                          {state.selectedLiveArgoProfile.profile[0].pressure} dbar
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 pt-1">
                    Timestamp: {state.selectedLiveArgoProfile.timestamp || 'Recent operational cycle'}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-[11px]">
                  Click on any observation marker (green diamond) on the 3D globe to inspect in-situ CTD vertical profiles.
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OCEAN RISK & HAZARD ASSESSMENT */}
          {activeTab === 'RISK' && <OceanRiskPanel />}
        </div>
      </div>
    </div>
  );
};
