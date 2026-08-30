import React, { useState, useRef, useEffect } from 'react';
import { useOceanContext } from '../../store/OceanContext';
import { APP_CONFIG } from '../../config/appConfig';
import { OceanVariable } from '../../types';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';

interface GlobePlayerControlBarProps {
  showCurrents: boolean;
  setShowCurrents: (val: boolean | ((prev: boolean) => boolean)) => void;
  showPoints: boolean;
  setShowPoints: (val: boolean | ((prev: boolean) => boolean)) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export const GlobePlayerControlBar: React.FC<GlobePlayerControlBarProps> = ({
  showCurrents,
  setShowCurrents,
  showPoints,
  setShowPoints,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const {
    state,
    setSelectedVariable,
    setSelectedDepth,
    setSelectedTimestamp,
    setIsPlaying,
    nextTimestamp,
    previousTimestamp,
    toggleRiskLayer,
    setIsLiveDataMode,
    fetchLiveData,
  } = useOceanContext();

  const [openDropdown, setOpenDropdown] = useState<'variable' | 'depth' | 'layers' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentIndex = state.availableTimestamps.indexOf(state.selectedTimestamp);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const maxIndex = Math.max(0, state.availableTimestamps.length - 1);

  // Format date display (e.g. 29 AUG 2026 · 06:00 UTC)
  const formatTimestampDisplay = (ts: string) => {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      const day = d.getUTCDate().toString().padStart(2, '0');
      const month = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
      const year = d.getUTCFullYear();
      const time = ts.includes('T') ? ts.split('T')[1].slice(0, 5) : '00:00';
      return `${day} ${month} ${year} · ${time} UTC`;
    } catch {
      return ts;
    }
  };

  const activeVariableLabel =
    APP_CONFIG.supportedVariables.find((v) => v.id === state.selectedVariable)?.label || 'Temperature';

  return (
    <div
      ref={containerRef}
      className="bg-[#0b101d] border border-slate-800/80 rounded-lg px-3 py-2 text-sm text-slate-200 select-none relative"
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Playback & Time Display */}
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
          <button
            onClick={previousTimestamp}
            title="Previous timestep"
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!state.isPlaying)}
            title={state.isPlaying ? 'Pause' : 'Play'}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded transition-colors flex items-center justify-center"
          >
            {state.isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          </button>

          <button
            onClick={nextTimestamp}
            title="Next timestep"
            className="p-1 text-slate-400 hover:text-white rounded transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <span className="text-xs text-slate-300 font-medium pl-1 shrink-0">
            {formatTimestampDisplay(state.selectedTimestamp)}
          </span>
        </div>

        {/* Time Slider */}
        <div className="w-full flex-1 px-1">
          <input
            type="range"
            min={0}
            max={maxIndex}
            step={1}
            value={safeIndex}
            onChange={(e) => {
              const idx = parseInt(e.target.value, 10);
              if (idx >= 0 && idx < state.availableTimestamps.length) {
                setSelectedTimestamp(state.availableTimestamps[idx]);
              }
            }}
            className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
          />
        </div>

        {/* Progressive Disclosure Controls: Variable, Depth, Layers, Source */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end text-xs">
          {/* 1. VARIABLE DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'variable' ? null : 'variable')}
              className={`px-2.5 py-1 rounded bg-slate-900 border text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors ${
                openDropdown === 'variable' ? 'border-cyan-500 text-white' : 'border-slate-800'
              }`}
            >
              <span>{activeVariableLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === 'variable' && (
              <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-[#0e1526] border border-slate-800 rounded-lg shadow-xl py-1 z-30">
                {APP_CONFIG.supportedVariables.slice(0, 5).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariable(v.id as OceanVariable);
                      setOpenDropdown(null);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                      state.selectedVariable === v.id ? 'text-cyan-400 font-medium' : 'text-slate-300'
                    }`}
                  >
                    <span>{v.label}</span>
                    {state.selectedVariable === v.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. DEPTH DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'depth' ? null : 'depth')}
              className={`px-2.5 py-1 rounded bg-slate-900 border text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors ${
                openDropdown === 'depth' ? 'border-cyan-500 text-white' : 'border-slate-800'
              }`}
            >
              <span>{state.selectedDepth === 0 ? 'Surface (0m)' : `${state.selectedDepth}m`}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === 'depth' && (
              <div className="absolute right-0 bottom-full mb-1.5 w-36 bg-[#0e1526] border border-slate-800 rounded-lg shadow-xl py-1 z-30">
                {APP_CONFIG.supportedDepths.map((d) => (
                  <button
                    key={d.depth}
                    onClick={() => {
                      setSelectedDepth(d.depth);
                      setOpenDropdown(null);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-800/80 transition-colors ${
                      state.selectedDepth === d.depth ? 'text-cyan-400 font-medium' : 'text-slate-300'
                    }`}
                  >
                    <span>{d.depth === 0 ? 'Surface (0m)' : `${d.depth}m`}</span>
                    {state.selectedDepth === d.depth && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. LAYERS DROPDOWN */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'layers' ? null : 'layers')}
              className={`px-2.5 py-1 rounded bg-slate-900 border text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors ${
                openDropdown === 'layers' ? 'border-cyan-500 text-white' : 'border-slate-800'
              }`}
            >
              <span>Layers</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === 'layers' && (
              <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-[#0e1526] border border-slate-800 rounded-lg shadow-xl py-1 z-30 space-y-0.5">
                <button
                  onClick={() => setShowPoints(!showPoints)}
                  className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-800/80 text-slate-300 transition-colors"
                >
                  <span>Argo Floats</span>
                  {showPoints && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <button
                  onClick={() => setShowCurrents(!showCurrents)}
                  className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-800/80 text-slate-300 transition-colors"
                >
                  <span>Current Vectors</span>
                  {showCurrents && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <button
                  onClick={toggleRiskLayer}
                  className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-slate-800/80 text-slate-300 transition-colors"
                >
                  <span>Risk Hotspots</span>
                  {state.showRiskLayer && <Check className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>
            )}
          </div>

          {/* 4. LIVE / DEMO TOGGLE */}
          <button
            onClick={() => {
              if (!state.isLiveDataMode) {
                fetchLiveData();
              } else {
                setIsLiveDataMode(false);
              }
            }}
            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            title="Toggle between Live operational data and Demo sandbox"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                state.isLiveDataMode ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>{state.isLiveDataMode ? 'Live' : 'Demo'}</span>
          </button>

          {/* 5. FULLSCREEN BUTTON */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

