import React from 'react';
import { NavLink } from 'react-router-dom';
import { Waves, Globe, LayoutDashboard, Compass, BarChart2, ShieldAlert, Database, ArrowRight, CheckCircle2 } from 'lucide-react';
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
    <div className="space-y-8 py-2 max-w-7xl mx-auto">
      {/* Mission Overview Hero Strip */}
      <div className="rounded-2xl bg-[#FFFFFF] border border-[#E2E8F0] p-8 md:p-10 relative overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-[#E0F2FE] border border-[#BAE6FD] text-[#0369A1] rounded-md">
              OPERATIONAL OCEANOGRAPHY GIS
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D] rounded-md flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
              INCOIS LIVE SYNC
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[#172033] tracking-tight">
            {APP_CONFIG.name} — Ocean Telemetry & Forecast Verification
          </h1>

          <p className="text-base text-[#475569] leading-relaxed">
            A unified scientific visualization and decision-support platform bridging <strong>in-situ ocean observations</strong> (INCOIS Argo floats and CTD profiling arrays) with <strong>operational numerical ocean models</strong> (INCOIS RSMC HYCOM NetCDF forecasts).
          </p>

          <div className="pt-3 flex flex-wrap items-center gap-3 text-xs">
            <NavLink to="/explorer">
              <button className="px-5 py-2.5 bg-[#0B84C6] hover:bg-[#085A8A] text-white font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm">
                <Globe className="w-4 h-4" />
                <span>Launch 3D Explorer</span>
              </button>
            </NavLink>
            <NavLink to="/analytics">
              <button className="px-5 py-2.5 bg-[#FFFFFF] hover:bg-[#F8FAFC] border border-[#E2E8F0] text-[#172033] font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm">
                <BarChart2 className="w-4 h-4 text-[#0B84C6]" />
                <span>Inspect Model vs. Observation</span>
              </button>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Scientific Modules Grid */}
      <div className="space-y-4">
        <div className="text-sm font-bold text-[#172033] uppercase tracking-wider flex items-center gap-2">
          <Waves className="w-4 h-4 text-[#0B84C6]" />
          <span>Core Analytical Modules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink key={index} to={item.link} className="group">
                <div className="bg-[#FFFFFF] border border-[#E2E8F0] group-hover:border-[#CBD5E1] rounded-xl p-5 h-full flex flex-col justify-between transition-all shadow-[0_2px_10px_rgba(15,23,42,0.06)] group-hover:shadow-cardHover">
                  <div>
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="p-2.5 bg-[#E0F2FE] text-[#0B84C6] rounded-lg">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-semibold text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 border border-[#E2E8F0] rounded-md">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#172033] mb-1.5">{item.title}</h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-xs font-semibold text-[#0B84C6]">
                    <span>Open Module</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Integrated Data Ingestion Feeds */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-6 space-y-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
        <div className="text-sm font-bold text-[#172033] uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-[#0B84C6]" />
          <span>Verified Operational Data Pipelines</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1">
            <span className="text-[#15803D] font-bold block text-sm">INCOIS ERDDAP</span>
            <span className="text-xs text-[#64748B]">Indian_ARGO_Floats live telemetry array</span>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1">
            <span className="text-[#0B84C6] font-bold block text-sm">INCOIS RSMC HYCOM</span>
            <span className="text-xs text-[#64748B]">0.08° multi-variable NetCDF numerical grids</span>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1">
            <span className="text-[#172033] font-bold block text-sm">SCIENTIFIC QC ENGINE</span>
            <span className="text-xs text-[#64748B]">IOC/WMO physical limits & fill value filtering</span>
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-1">
            <span className="text-[#B45309] font-bold block text-sm">DECISION-SUPPORT</span>
            <span className="text-xs text-[#64748B]">Transparent rule-based ocean hazard engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default HomePage;
