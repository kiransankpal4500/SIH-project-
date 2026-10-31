import React from 'react';
import { Radio } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { useOceanContext } from '../../store/OceanContext';

export const Header: React.FC = () => {
  const { state, setIsLiveDataMode } = useOceanContext();

  return (
    <header className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between text-xs font-sans gap-3">
      <div className="flex items-center space-x-3">
        <img
          src="/assets/oceanscope-logo.png"
          alt="OceanScope"
          width={200}
          height={200}
          loading="eager"
          decoding="sync"
          draggable={false}
          style={{
            height: '28px',
            width: '28px',
            objectFit: 'contain',
            display: 'block',
          }}
        />
        <span className="text-[#CBD5E1]">|</span>
        <span className="text-[#64748B] hidden sm:inline">{APP_CONFIG.tagline}</span>
      </div>

      {/* Live / Demo Data Mode Status Bar */}
      <div className="flex items-center space-x-3">
        <div
          className={`flex items-center space-x-2 px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
            state.isLiveDataMode && state.liveDataStatus === 'LIVE'
              ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
              : 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              state.isLiveDataMode && state.liveDataStatus === 'LIVE'
                ? 'bg-[#16A34A]'
                : 'bg-[#F59E0B]'
            }`}
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-bold">
              {state.isLiveDataMode && state.liveDataStatus === 'LIVE'
                ? '● LIVE DATA'
                : state.liveDataStatus === 'FALLBACK'
                ? '● OFFLINE FALLBACK'
                : '● DEMO DATA'}
            </span>
            <span className="text-[11px] opacity-80">
              Source: {
                state.isLiveDataMode && state.liveDataStatus === 'LIVE'
                  ? 'INCOIS (Indian_ARGO_Floats)'
                  : state.liveDataStatus === 'FALLBACK'
                  ? 'Offline Fallback (Live Unreachable)'
                  : 'Local Demo Dataset'
              }
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsLiveDataMode(!state.isLiveDataMode)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm ${
            state.isLiveDataMode
              ? 'bg-[#16A34A] text-white hover:bg-[#15803D]'
              : 'bg-[#0B84C6] text-white hover:bg-[#085A8A]'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>{state.isLiveDataMode ? 'Switch to Demo' : 'Enable INCOIS Live Data'}</span>
        </button>
      </div>
    </header>
  );
};
