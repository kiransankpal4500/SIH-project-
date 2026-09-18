/**
 * Time & Depth Animation Player
 * Controls timestep playback loops, variable animation speeds, and vertical depth levels.
 */

import React from 'react';
import { useOceanContext } from '../../store/OceanContext';
import { APP_CONFIG } from '../../config/appConfig';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
  Gauge,
} from 'lucide-react';

interface TimeDepthPlayerProps {
  className?: string;
}

export const TimeDepthPlayer: React.FC<TimeDepthPlayerProps> = ({ className = '' }) => {
  const {
    state,
    setSelectedTimestamp,
    setIsPlaying,
    setPlaybackSpeed,
    nextTimestamp,
    previousTimestamp,
    setSelectedDepth,
  } = useOceanContext();

  const currentIndex = state.availableTimestamps.indexOf(state.selectedTimestamp);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const maxIndex = Math.max(0, state.availableTimestamps.length - 1);

  return (
    <div
      className={`bg-[#0b1220] border border-slate-800 rounded p-2.5 font-mono text-xs ${className}`}
    >
      {/* Top Header: Active Timestep & Depth Stepper */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2">
        {/* Timestamp Info */}
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">TIMESTEP:</span>
            <span className="text-slate-100 font-bold bg-slate-900 px-1.5 py-0.2 border border-slate-800 rounded">
              {state.selectedTimestamp}
            </span>
          </div>
        </div>

        {/* Depth Quick Selector */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            DEPTH:
          </span>
          <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded p-0.5">
            {APP_CONFIG.supportedDepths.map((d) => (
              <button
                key={d.depth}
                onClick={() => setSelectedDepth(d.depth)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-all font-semibold ${
                  state.selectedDepth === d.depth
                    ? 'bg-slate-800 border border-cyan-400 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {d.depth === 0 ? '0m' : `${d.depth}m`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Middle Row: Playback Controls & Timeline Slider */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
        {/* Playback Buttons (Cols 1-4) */}
        <div className="md:col-span-4 flex items-center gap-1.5">
          {/* Previous Step */}
          <button
            onClick={previousTimestamp}
            title="Previous forecast timestep"
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={() => setIsPlaying(!state.isPlaying)}
            title={state.isPlaying ? 'Pause timeline animation' : 'Play timeline animation'}
            className={`flex items-center gap-1 px-3 py-1.5 rounded font-bold transition-all text-xs ${
              state.isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
          >
            {state.isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>PLAY</span>
              </>
            )}
          </button>

          {/* Next Step */}
          <button
            onClick={nextTimestamp}
            title="Next forecast timestep"
            className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 ml-auto text-[10px]">
            <Gauge className="w-3 h-3 text-slate-400" />
            <div className="flex bg-slate-900 border border-slate-800 rounded p-0.5">
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-1.5 py-0.2 rounded transition-all font-semibold ${
                    state.playbackSpeed === spd
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Slider & Steps (Cols 5-12) */}
        <div className="md:col-span-8 flex flex-col gap-1">
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
            className="w-full h-1.5 bg-slate-900 rounded appearance-none cursor-pointer accent-cyan-400 border border-slate-800"
          />

          {/* Tick Labels */}
          <div className="flex justify-between text-[9px] text-slate-400">
            {state.availableTimestamps.map((ts, idx) => (
              <span
                key={ts}
                onClick={() => setSelectedTimestamp(ts)}
                className={`cursor-pointer hover:text-cyan-300 transition-colors ${
                  idx === safeIndex ? 'text-cyan-300 font-bold' : ''
                }`}
              >
                {ts.slice(11, 16)} UTC
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
