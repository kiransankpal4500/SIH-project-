import React from 'react';
import { NavLink } from 'react-router-dom';
import { Waves, LayoutDashboard, Globe, Compass, BarChart2, Info, Home, RotateCcw, Radio } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { useOceanContext } from '../../store/OceanContext';

export const Navbar: React.FC = () => {
  const { state, setIsLiveDataMode, fetchLiveData, resetDemoState } = useOceanContext();

  const navItems = [
    { to: '/', label: 'Overview', icon: Home },
    { to: '/explorer', label: '3D Explorer', icon: Globe },
    { to: '/dashboard', label: 'Telemetry', icon: LayoutDashboard },
    { to: '/observations', label: 'In-Situ Array', icon: Compass },
    { to: '/analytics', label: 'Cross-Validation', icon: BarChart2 },
    { to: '/about', label: 'Mission', icon: Info },
  ];

  return (
    <nav className="bg-[#0b1220] border-b border-slate-800 px-4 py-2 flex items-center justify-between sticky top-0 z-50">
      {/* Brand Header */}
      <div className="flex items-center space-x-3">
        <NavLink to="/" className="flex items-center space-x-2.5 group">
          <div className="p-1 bg-cyan-950/80 border border-cyan-500/40 rounded text-cyan-400">
            <Waves className="w-4 h-4" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
              {APP_CONFIG.name}
              <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-800 text-cyan-300 border border-slate-700 rounded">
                GIS v1.0
              </span>
            </div>
          </div>
        </NavLink>

        {/* Live INCOIS Data Feed Toggle Status Badge */}
        <div className="hidden lg:flex items-center space-x-1.5 pl-3 border-l border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => {
              if (!state.isLiveDataMode) {
                fetchLiveData();
              } else {
                setIsLiveDataMode(false);
              }
            }}
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded border transition-all ${
              state.isLiveDataMode
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-slate-750 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle between Live INCOIS Operational Stream and Demo Sandbox"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                state.isLiveDataMode ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="font-semibold">
              {state.isLiveDataMode ? 'INCOIS LIVE' : 'DEMO MODE'}
            </span>
          </button>

          {state.isLiveDataMode && state.liveObservations.length > 0 && (
            <span className="text-slate-400 text-[10px] pl-1">
              ({state.liveObservations.length} Active Platforms)
            </span>
          )}
        </div>
      </div>

      {/* Navigation Links & Reset Control */}
      <div className="flex items-center space-x-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 font-semibold border border-cyan-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-850'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}

        {/* Quick Reset Demo Preset Button */}
        <button
          onClick={resetDemoState}
          title="Reset OceanScope to pristine demonstration state"
          className="flex items-center space-x-1 px-2 py-1 ml-2 bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-400 hover:text-cyan-300 rounded text-xs font-mono transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline text-[11px]">Reset</span>
        </button>
      </div>
    </nav>
  );
};
