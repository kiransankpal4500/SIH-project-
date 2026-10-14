/**
 * OceanScope Main Public Landing Page
 * Features platform overview, direct entry into 3D GIS Explorer,
 * analytical module portals, verified data pipeline summaries, and PWA install prompt.
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Globe,
  Compass,
  BarChart2,
  Info,
  Waves,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  Database,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { PwaInstallPrompt } from '../../components/common/PwaInstallPrompt';

export const HomePage: React.FC = () => {
  const coreFeatures = [
    {
      title: '3D Ocean GIS Explorer',
      description:
        'Interactive Three.js Earth sphere rendering HYCOM numerical forecast fields and in-situ Argo profiling floats with real 3D bathymetry.',
      icon: Globe,
      link: '/explorer',
      badge: '4D TIME & DEPTH',
      action: 'Launch 3D Explorer',
    },
    {
      title: 'In-Situ Observation Arrays',
      description:
        'Live Indian Ocean Argo float telemetry ingested directly from INCOIS ERDDAP, delivering QC-validated temperature and salinity profiles.',
      icon: Compass,
      link: '/observations',
      badge: 'INCOIS ERDDAP',
      action: 'View Observations',
    },
    {
      title: 'Model Cross-Validation',
      description:
        'Spatial co-location engine comparing numerical HYCOM model outputs against in-situ float measurements with Bias, RMSE, and MAE verification.',
      icon: BarChart2,
      link: '/analytics',
      badge: 'SCIENTIFIC VALIDATION',
      action: 'Inspect Analytics',
    },
    {
      title: 'Platform Architecture & Sources',
      description:
        'Documented data pipelines connecting Copernicus Marine Service, GEBCO bathymetry, HYCOM OPENDAP, and INCOIS research feeds.',
      icon: Info,
      link: '/about',
      badge: 'OPEN RESEARCH',
      action: 'Explore Sources',
    },
  ];

  const operationalFeeds = [
    {
      provider: 'INCOIS ERDDAP',
      dataset: 'Indian_ARGO_Floats',
      detail: 'Live CTD profiling floats across the Arabian Sea, Bay of Bengal, and Equatorial Indian Ocean.',
      status: 'Live Synced',
    },
    {
      provider: 'RSMC / HYCOM NetCDF',
      dataset: '0.08° Ocean Forecasts',
      detail: 'Multi-layer numerical ocean predictions including temperature, salinity, currents, and elevation.',
      status: 'Operational',
    },
    {
      provider: 'GEBCO / NOAA',
      dataset: 'Global Bathymetry Grid',
      detail: 'Sub-kilometer seabed topography and continental shelf depth contours for coastal bathymetry.',
      status: 'Active Grid',
    },
    {
      provider: 'Copernicus Marine (CMEMS)',
      dataset: 'GLOBAL_ANALYSISFORECAST_PHY_001_024',
      detail: 'Global biogeochemical and physical multi-satellite observation telemetry integration.',
      status: 'Connected',
    },
  ];

  return (
    <div className="space-y-10 py-4 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-white border border-slate-200 shadow-[0_4px_25px_rgba(15,23,42,0.05)] overflow-hidden p-8 sm:p-12 lg:p-16">
        {/* Subtle background glow matching brand ocean blue */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-sky-100/60 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-blue-50/50 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-6">
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold px-3 py-1 bg-sky-50 border border-sky-200/80 text-[#0369A1] rounded-full flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-[#0B84C6]" />
              <span>Scientific Oceanography GIS</span>
            </span>
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-50 border border-emerald-200/80 text-emerald-700 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>INCOIS & HYCOM Ingestion Active</span>
            </span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
              {APP_CONFIG.name} — Real-Time Ocean Research & Telemetry Verification
            </h1>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              A unified oceanographic intelligence platform bridging <strong>in-situ ocean observations</strong> (INCOIS Argo floats and vertical CTD soundings) with <strong>numerical ocean models</strong> (HYCOM and Copernicus Marine NetCDF forecasts).
            </p>
          </div>

          {/* Primary & Secondary Call to Actions */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <NavLink to="/explorer">
              <button className="px-6 py-3.5 bg-[#0B84C6] hover:bg-[#0973AD] text-white font-semibold rounded-xl flex items-center gap-2.5 transition-all shadow-md shadow-sky-500/20 text-sm">
                <Globe className="w-4 h-4" />
                <span>Explore Ocean in 3D</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>
            </NavLink>

            <NavLink to="/observations">
              <button className="px-5 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm text-sm">
                <Compass className="w-4 h-4 text-[#0B84C6]" />
                <span>View Argo Floats</span>
              </button>
            </NavLink>

            <NavLink to="/analytics">
              <button className="px-5 py-3.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm text-sm">
                <BarChart2 className="w-4 h-4 text-[#0B84C6]" />
                <span>Model vs Observation</span>
              </button>
            </NavLink>
          </div>
        </div>
      </section>

      {/* Core Analytical Modules Grid */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-50 rounded-lg text-[#0B84C6]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Research & Visualization Modules</h2>
              <p className="text-xs text-slate-500">Access real-time GIS mapping, in-situ CTD arrays, and statistical co-location</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {coreFeatures.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink key={index} to={item.link} className="group">
                <div className="bg-white border border-slate-200 group-hover:border-[#0B84C6]/40 rounded-2xl p-6 h-full flex flex-col justify-between transition-all duration-200 shadow-sm group-hover:shadow-[0_8px_30px_rgba(11,132,198,0.1)] group-hover:-translate-y-0.5">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-sky-50 text-[#0B84C6] rounded-xl group-hover:bg-[#0B84C6] group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {item.badge}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-[#0B84C6] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0B84C6]">
                    <span>{item.action}</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </section>

      {/* Operational Data Pipelines Grid */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-700">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Verified Operational Ingestion Feeds</h2>
            <p className="text-xs text-slate-500">Official oceanographic sources actively routed through the OceanScope backend</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {operationalFeeds.map((feed, idx) => (
            <div key={idx} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{feed.provider}</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                  {feed.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#0B84C6]">{feed.dataset}</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">{feed.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PWA Installation Prompt (mounted conditionally on landing page) */}
      <PwaInstallPrompt />
    </div>
  );
};
