import React from 'react';
import { NavLink } from 'react-router-dom';
import { Waves, Globe, LayoutDashboard, Compass, BarChart2, ShieldAlert, Database, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { APP_CONFIG } from '../../config/appConfig';

export const HomePage: React.FC = () => {
  const capabilities = [
    {
      title: '3D Ocean GIS Viewport',
      description: 'Render numerical ocean forecast models (HYCOM) and in-situ Argo array floats across realistic Earth geography.',
      icon: Globe,
      link: '/explorer',
      badge: '4D TIME & DEPTH',
    },
    {
      title: 'Operational Telemetry',
      description: 'Monitor real-time system indicators, active observation feeds, SST departures, and dynamic sea surface heights.',
      icon: LayoutDashboard,
      link: '/dashboard',
      badge: 'INCOIS ERDDAP',
    },
    {
      title: 'In-Situ Observation Array',
      description: 'Direct ingestion of Indian Ocean Argo float CTD vertical profiles with IOC/WMO data quality validation.',
      icon: Compass,
      link: '/observations',
      badge: 'QC VALIDATED',
    },
    {
      title: 'Model Cross-Validation',
      description: 'Statistical error analysis comparing numerical HYCOM model outputs against in-situ observations (Bias, RMSE, MAE).',
      icon: BarChart2,
      link: '/analytics',
      badge: 'SPATIAL CO-LOCATION',
    },
  ];

  return (
    <div className="space-y-6 py-2">
      {/* Mission Overview Hero Strip */}
      <div className="rounded bg-[#0b1220] border border-slate-800 p-6 md:p-8 relative overflow-hidden">
        <div className="max-w-3xl space-y-3 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 rounded font-semibold">
              OPERATIONAL OCEANOGRAPHY GIS
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              INCOIS LIVE CONNECTED
            </span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight font-sans">
            {APP_CONFIG.name} — Oceanographic Telemetry & Forecast Validation
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            A unified scientific visualization and decision-support platform bridging <strong>in-situ ocean observations</strong> (INCOIS Argo floats and CTD profiling arrays) with <strong>operational numerical ocean models</strong> (INCOIS RSMC HYCOM NetCDF forecasts).
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 font-mono text-xs">
            <NavLink to="/explorer">
              <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded flex items-center gap-2 transition-all">
                <Globe className="w-4 h-4" />
                <span>Launch 3D Explorer</span>
              </button>
            </NavLink>
            <NavLink to="/analytics">
              <button className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded flex items-center gap-2 transition-all">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <span>Inspect Model vs. Observation</span>
              </button>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Scientific Modules Grid */}
      <div className="space-y-3">
        <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-400" />
          <span>Core Analytical Modules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {capabilities.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink key={index} to={item.link} className="group">
                <div className="bg-[#0b1220] border border-slate-800 group-hover:border-slate-700 rounded p-4 h-full flex flex-col justify-between transition-all">
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="p-2 bg-slate-900 border border-slate-800 text-cyan-400 rounded group-hover:text-cyan-300">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 border border-slate-800 rounded">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-100 mb-1 font-sans">{item.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{item.description}</p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-cyan-400 font-semibold group-hover:text-cyan-300">
                    <span>Open Module</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Integrated Data Ingestion Feeds */}
      <div className="bg-[#0b1220] border border-slate-800 rounded p-4 space-y-2.5">
        <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>Verified Operational Data Ingestion Feeds</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs font-mono">
          <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-0.5">
            <span className="text-emerald-400 font-bold block text-xs">INCOIS ERDDAP</span>
            <span className="text-[11px] text-slate-400">Indian_ARGO_Floats live telemetry array</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-0.5">
            <span className="text-cyan-400 font-bold block text-xs">INCOIS RSMC HYCOM</span>
            <span className="text-[11px] text-slate-400">0.08° multi-variable NetCDF numerical grids</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-0.5">
            <span className="text-slate-200 font-bold block text-xs">SCIENTIFIC QC ENGINE</span>
            <span className="text-[11px] text-slate-400">IOC/WMO physical limits & fill value filtering</span>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-0.5">
            <span className="text-amber-300 font-bold block text-xs">DECISION-SUPPORT</span>
            <span className="text-[11px] text-slate-400">Transparent rule-based ocean hazard engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
