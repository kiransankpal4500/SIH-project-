import React from 'react';
import { Waves, Radio } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { useOceanContext } from '../../store/OceanContext';

export const Header: React.FC = () => {
  const { state, setIsLiveDataMode } = useOceanContext();

  return (
    <header className="bg-ocean-950 border-b border-ocean-850 px-4 py-2 flex flex-col sm:flex-row items-center justify-between text-xs font-mono gap-2">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-ocean-400 font-bold tracking-wider">
          <Waves className="w-5 h-5" />
          <span className="text-sm font-sans tracking-tight text-white">{APP_CONFIG.name}</span>
        </div>
        <span className="text-ocean-700">|</span>
        <span className="text-slate-400 hidden sm:inline">{APP_CONFIG.tagline}</span>
      </div>

      {/* Live / Demo Data Mode Status Bar */}
      <div className="flex items-center space-x-3">
        <div
          className={`flex items-center space-x-2 px-2.5 py-1 rounded border text-[11px] font-mono transition-all ${
            state.isLiveDataMode && state.liveDataStatus === 'LIVE'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              state.isLiveDataMode && state.liveDataStatus === 'LIVE'
                ? 'bg-emerald-400 animate-ping'
                : 'bg-amber-400'
            }`}
          ></span>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-bold">
              {state.isLiveDataMode && state.liveDataStatus === 'LIVE'
                ? '● LIVE DATA'
                : '● DEMO DATA'}
            </span>
            <span className="text-[10px] opacity-80">
              Source: {state.isLiveDataMode ? 'INCOIS (Indian_ARGO_Floats)' : 'Local Demo Dataset'}
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsLiveDataMode(!state.isLiveDataMode)}
          className={`px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all ${
            state.isLiveDataMode
              ? 'bg-emerald-500 text-ocean-950 hover:bg-emerald-400'
              : 'bg-ocean-800 text-slate-200 hover:bg-ocean-700 border border-ocean-700'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 ${state.isLiveDataMode ? 'animate-pulse' : ''}`} />
          <span>{state.isLiveDataMode ? 'Switch to Demo' : 'Enable INCOIS Live Data'}</span>
        </button>
      </div>
    </header>
  );
};
