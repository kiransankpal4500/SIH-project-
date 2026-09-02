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
  Layers,
  Calendar,
  Layers2,
  SlidersHorizontal,
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

  // Format date display (e.g. 28 AUG 2026 · 06:00 UTC)
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
      className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3.5 shadow-[0_2px_10px_rgba(15,23,42,0.06)] text-xs text-[#172033] select-none relative"
    >
      <div className="flex flex-col lg:flex-row items-center justify-between gap-3.5">
        {/* Left: Scientific Time Navigation & Date Display */}
        <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
          <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-0.5">
            <button
              onClick={previousTimestamp}
              title="Previous timestep"
              className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#FFFFFF] rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!state.isPlaying)}
              title={state.isPlaying ? 'Pause' : 'Play animation'}
              className="px-2.5 py-1.5 bg-[#0B84C6] hover:bg-[#085A8A] text-white rounded font-medium transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {state.isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[11px]">Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span className="text-[11px]">Play</span>
                </>
              )}
            </button>

            <button
              onClick={nextTimestamp}
              title="Next timestep"
              className="p-1.5 text-[#64748B] hover:text-[#172033] hover:bg-[#FFFFFF] rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#172033]">
            <Calendar className="w-3.5 h-3.5 text-[#0B84C6]" />
            <span>{formatTimestampDisplay(state.selectedTimestamp)}</span>
          </div>
        </div>

        {/* Center: Slim Scientific Timeline Slider */}
        <div className="w-full flex-1 px-2 flex items-center gap-2">
          <span className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-wider hidden sm:inline">Timeline</span>
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
            className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#0B84C6] focus:outline-none"
          />
        </div>

        {/* Right: Variable, Depth, Layers, and Live / Demo Toggle */}
        <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-end text-xs">
          {/* 1. VARIABLE SELECTOR */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'variable' ? null : 'variable')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm ${
                openDropdown === 'variable'
                  ? 'border-[#0B84C6] text-[#0B84C6] bg-[#E0F2FE]'
                  : 'border-[#E2E8F0] text-[#172033] bg-[#FFFFFF] hover:bg-[#F8FAFC]'
              }`}
            >
              <span className="text-[#64748B] text-[11px] font-normal">Var:</span>
              <span className="font-semibold">{activeVariableLabel}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </button>

            {openDropdown === 'variable' && (
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-dropdown py-1 z-30">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider border-b border-[#F1F5F9] mb-1">
                  Ocean Variable
                </div>
                {APP_CONFIG.supportedVariables.slice(0, 5).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setSelectedVariable(v.id as OceanVariable);
                      setOpenDropdown(null);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-[#F1F5F9] transition-colors ${
                      state.selectedVariable === v.id ? 'text-[#0B84C6] font-semibold bg-[#F0F9FF]' : 'text-[#172033]'
                    }`}
                  >
                    <span>{v.label}</span>
                    {state.selectedVariable === v.id && <Check className="w-3.5 h-3.5 text-[#0B84C6]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. DEPTH SELECTOR */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'depth' ? null : 'depth')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm ${
                openDropdown === 'depth'
                  ? 'border-[#0B84C6] text-[#0B84C6] bg-[#E0F2FE]'
                  : 'border-[#E2E8F0] text-[#172033] bg-[#FFFFFF] hover:bg-[#F8FAFC]'
              }`}
            >
              <span className="text-[#64748B] text-[11px] font-normal">Depth:</span>
              <span className="font-semibold">{state.selectedDepth === 0 ? 'Surface (0m)' : `${state.selectedDepth}m`}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </button>

            {openDropdown === 'depth' && (
              <div className="absolute right-0 bottom-full mb-2 w-40 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-dropdown py-1 z-30">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider border-b border-[#F1F5F9] mb-1">
                  Water Depth Slices
                </div>
                {APP_CONFIG.supportedDepths.map((d) => (
                  <button
                    key={d.depth}
                    onClick={() => {
                      setSelectedDepth(d.depth);
                      setOpenDropdown(null);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-[#F1F5F9] transition-colors ${
                      state.selectedDepth === d.depth ? 'text-[#0B84C6] font-semibold bg-[#F0F9FF]' : 'text-[#172033]'
                    }`}
                  >
                    <span>{d.depth === 0 ? 'Surface (0m)' : `${d.depth}m`}</span>
                    {state.selectedDepth === d.depth && <Check className="w-3.5 h-3.5 text-[#0B84C6]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 3. LAYERS SELECTOR */}
          <div className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === 'layers' ? null : 'layers')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm ${
                openDropdown === 'layers'
                  ? 'border-[#0B84C6] text-[#0B84C6] bg-[#E0F2FE]'
                  : 'border-[#E2E8F0] text-[#172033] bg-[#FFFFFF] hover:bg-[#F8FAFC]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#0B84C6]" />
              <span className="font-semibold">Layers</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </button>

            {openDropdown === 'layers' && (
              <div className="absolute right-0 bottom-full mb-2 w-48 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-dropdown py-1.5 z-30 space-y-0.5">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider border-b border-[#F1F5F9] mb-1">
                  Active GIS Layers
                </div>
                <button
                  onClick={() => setShowPoints(!showPoints)}
                  className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-[#F1F5F9] text-[#172033] transition-colors"
                >
                  <span className={showPoints ? 'font-medium text-[#0B84C6]' : ''}>Argo In-Situ Floats</span>
                  {showPoints && <Check className="w-3.5 h-3.5 text-[#0B84C6]" />}
                </button>
                <button
                  onClick={() => setShowCurrents(!showCurrents)}
                  className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-[#F1F5F9] text-[#172033] transition-colors"
                >
                  <span className={showCurrents ? 'font-medium text-[#0B84C6]' : ''}>Current Vectors</span>
                  {showCurrents && <Check className="w-3.5 h-3.5 text-[#0B84C6]" />}
                </button>
                <button
                  onClick={toggleRiskLayer}
                  className="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between hover:bg-[#F1F5F9] text-[#172033] transition-colors"
                >
                  <span className={state.showRiskLayer ? 'font-medium text-[#F59E0B]' : ''}>Hazard Hotspots</span>
                  {state.showRiskLayer && <Check className="w-3.5 h-3.5 text-[#F59E0B]" />}
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
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
              state.isLiveDataMode
                ? 'bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]'
                : 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]'
            }`}
            title="Toggle between Live operational data and Demo sandbox"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                state.isLiveDataMode ? 'bg-[#16A34A]' : 'bg-[#F59E0B]'
              }`}
            />
            <span>{state.isLiveDataMode ? 'Live Mode' : 'Demo Mode'}</span>
          </button>

          {/* 5. FULLSCREEN BUTTON */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="p-2 text-[#64748B] hover:text-[#172033] rounded-lg hover:bg-[#F1F5F9] transition-colors border border-[#E2E8F0]"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

