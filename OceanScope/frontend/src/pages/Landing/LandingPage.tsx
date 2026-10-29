/**
 * OceanScope Master Public Landing Page
 * Marketing and public entry point for visitors before signing in.
 * Features hero with 3D Interactive Ocean Sphere, verified capabilities, workflow, data sources, and CTAs.
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
  CheckCircle2,
  Sparkles,
  MapPin,
  Radio,
} from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { PwaInstallPrompt } from '../../components/common/PwaInstallPrompt';
import { InteractiveOceanSphere } from '../../components/landing/InteractiveOceanSphere';

export const LandingPage: React.FC = () => {
  // 1. Platform capabilities with verified scientific features
  const capabilities = [
    {
      title: 'GEBCO Global Bathymetry',
      category: 'Seafloor Topography',
      description:
        'Sub-kilometer ocean depth and continental shelf contours derived from the official GEBCO 2024 grid, resolving continental slopes and abyssal plains.',
      icon: Layers,
      accent: 'from-blue-600 to-cyan-500',
      link: '/explorer',
    },
    {
      title: '3D Seabed & Water Column',
      category: 'Volumetric GIS',
      description:
        'Interactive 3D localized ocean chunks rendering dynamic seabed mesh displacement, CTD vertical temperature/salinity soundings, and current velocities.',
      icon: Globe,
      accent: 'from-cyan-500 to-teal-400',
      link: '/explorer',
    },
    {
      title: 'HYCOM & Copernicus Models',
      category: 'Numerical Ocean Forecasts',
      description:
        'Multi-layer numerical ocean predictions spanning sea surface temperature, salinity gradients, 3D current vectors (U/V), and mixed layer depth (MLD).',
      icon: Activity,
      accent: 'from-indigo-600 to-blue-500',
      link: '/explorer',
    },
    {
      title: 'In-Situ Argo Array Telemetry',
      category: 'Autonomous Sensors',
      description:
        'Live Indian Ocean autonomous Argo float telemetry ingested directly from INCOIS ERDDAP, delivering QC-validated temperature and salinity profiles.',
      icon: Compass,
      accent: 'from-emerald-600 to-teal-500',
      link: '/observations',
    },
    {
      title: 'Statistical Cross-Validation',
      category: 'Scientific Verification',
      description:
        'Spatial co-location engine comparing numerical HYCOM model outputs against in-situ float measurements with Bias, RMSE, and MAE verification metrics.',
      icon: BarChart2,
      accent: 'from-sky-500 to-blue-600',
      link: '/analytics',
    },
    {
      title: 'Marine Life & Environmental Risk',
      category: 'Biodiversity & Hazards',
      description:
        'Taxonomic occurrence records from OBIS correlated with ocean depth zones, alongside sea surface temperature anomalies and disaster tracking.',
      icon: Radio,
      accent: 'from-teal-600 to-emerald-500',
      link: '/explorer',
    },
  ];

  // 2. How it works steps
  const howItWorksSteps = [
    {
      step: '01',
      title: 'Select a Geographic Location',
      description:
        'Click anywhere on the interactive 3D global ocean sphere or enter precise latitude and longitude coordinates to define a regional exploration zone.',
      icon: MapPin,
    },
    {
      step: '02',
      title: 'Retrieve Multi-Source Ocean Data',
      description:
        'OceanScope queries GEBCO bathymetry, numerical ocean model forecasts (HYCOM & Copernicus), and nearby in-situ profiling Argo floats simultaneously.',
      icon: Database,
    },
    {
      step: '03',
      title: 'Explore 3D Volumetric Visualizations',
      description:
        'Inspect the volumetric water column, examine 2D CTD vertical profiles down to 2,000 meters, and analyze cross-validation model accuracy metrics.',
      icon: BarChart2,
    },
  ];

  // 3. Verified scientific data sources actively connected
  const verifiedSources = [
    {
      provider: 'GEBCO & NOAA',
      dataset: 'GEBCO 2024 Global Grid',
      cadence: 'Static / Annual update',
      description: 'Official General Bathymetric Chart of the Oceans terrain and sub-kilometer depth contours.',
      verified: true,
    },
    {
      provider: 'INCOIS ERDDAP',
      dataset: 'Indian Ocean Argo Floats',
      cadence: 'Periodic / Real profiling telemetry',
      description: 'Autonomous CTD floats measuring temperature and salinity throughout the Arabian Sea and Bay of Bengal.',
      verified: true,
    },
    {
      provider: 'HYCOM Consortium',
      dataset: 'GLBy0.08 & ESPC-D-V02 OPeNDAP',
      cadence: '3-Hourly numerical forecasts',
      description: 'High-resolution ocean circulation models delivering temperature, currents, and sea surface height.',
      verified: true,
    },
    {
      provider: 'Copernicus Marine (CMEMS)',
      dataset: 'GLOBAL_ANALYSISFORECAST_PHY_001_024',
      cadence: 'Daily global reanalysis / NRT',
      description: 'Multi-satellite sea surface temperature and global ocean physics simulation products.',
      verified: true,
    },
    {
      provider: 'Ocean Biodiversity Information System (OBIS)',
      dataset: 'Marine Species Occurrences',
      cadence: 'Indexed research archive',
      description: 'Global biodiversity records mapped to bathymetric depth zones and geographic coordinate bounds.',
      verified: true,
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-4 text-slate-100 max-w-7xl mx-auto">
      {/* ─── 1. HERO SECTION ─── */}
      <section className="relative rounded-3xl bg-gradient-to-b from-[#06152B] via-[#091E3A] to-[#040D1A] border border-sky-900/40 shadow-[0_10px_50px_rgba(2,132,199,0.15)] overflow-hidden px-6 py-10 sm:px-12 sm:py-16 lg:px-16 lg:py-20">
        {/* Subtle ambient lighting glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-sky-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Hero Left Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Status Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold px-3 py-1 bg-sky-950/70 border border-sky-500/30 text-sky-300 rounded-full flex items-center gap-1.5 shadow-sm">
                <Waves className="w-3.5 h-3.5 text-sky-400" />
                <span>Oceanographic GIS Platform</span>
              </span>
              <span className="text-xs font-semibold px-3 py-1 bg-emerald-950/70 border border-emerald-500/30 text-emerald-300 rounded-full flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>GEBCO & INCOIS Pipelines Connected</span>
              </span>
            </div>

            {/* Tagline & Headline */}
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.12]">
                Explore the Ocean.{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300">
                  Understand Our Planet.
                </span>
              </h1>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal max-w-2xl">
                OceanScope unifies <strong>GEBCO bathymetry</strong>, <strong>in-situ INCOIS Argo floats</strong>, and{' '}
                <strong>HYCOM / Copernicus numerical forecast models</strong> into an interactive 3D scientific platform for ocean research and risk assessment.
              </p>
            </div>

            {/* Primary & Secondary Call to Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <NavLink to="/explorer">
                <button className="px-6 py-3.5 bg-gradient-to-r from-[#0284C7] to-[#0369A1] hover:from-[#0369A1] hover:to-[#075985] text-white font-semibold rounded-xl flex items-center gap-2.5 transition-all shadow-lg shadow-sky-500/25 text-sm group">
                  <Globe className="w-4 h-4 text-sky-200" />
                  <span>Explore Ocean</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              </NavLink>

              <NavLink to="/signup">
                <button className="px-5 py-3.5 bg-slate-900/80 hover:bg-slate-800 border border-sky-500/30 text-sky-200 hover:text-white font-semibold rounded-xl flex items-center gap-2 transition-all shadow-sm text-sm">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>Create Account</span>
                </button>
              </NavLink>

              <NavLink to="/login">
                <button className="px-4 py-3.5 text-slate-400 hover:text-white font-medium text-sm transition-colors">
                  Log In →
                </button>
              </NavLink>
            </div>

            {/* Quick Metrics Bar */}
            <div className="pt-4 grid grid-cols-3 gap-4 border-t border-sky-900/40 max-w-lg">
              <div>
                <span className="text-lg sm:text-xl font-bold text-white block">Sub-km</span>
                <span className="text-xs text-slate-400">GEBCO Seafloor Grid</span>
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold text-white block">2,000m</span>
                <span className="text-xs text-slate-400">CTD Sounding Depth</span>
              </div>
              <div>
                <span className="text-lg sm:text-xl font-bold text-white block">3-Hourly</span>
                <span className="text-xs text-slate-400">HYCOM Forecast Steps</span>
              </div>
            </div>
          </div>

          {/* Hero Right: 3D Interactive Ocean Sphere Centerpiece */}
          <div className="lg:col-span-5 flex items-center justify-center p-2">
            <InteractiveOceanSphere className="w-full" />
          </div>
        </div>
      </section>

      {/* ─── 2. PLATFORM CAPABILITIES ─── */}
      <section className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-500/30 text-xs font-semibold text-sky-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Integrated Oceanographic Science & Analysis
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
            Bridging satellite remote sensing, in-situ autonomous robotic CTD soundings, and numerical hydrodynamic ocean modeling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, idx) => {
            const Icon = cap.icon;
            return (
              <NavLink key={idx} to={cap.link} className="group">
                <div className="bg-white border border-slate-200 hover:border-[#0284C7]/50 rounded-2xl p-6 h-full flex flex-col justify-between transition-all duration-300 shadow-sm hover:shadow-[0_12px_30px_rgba(2,132,199,0.12)] hover:-translate-y-1">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-sky-50 text-[#0284C7] rounded-xl group-hover:bg-[#0284C7] group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                        {cap.category}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mb-2 group-hover:text-[#0284C7] transition-colors">
                      {cap.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed font-normal">
                      {cap.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#0284C7]">
                    <span>Explore Capability</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </section>

      {/* ─── 3. HOW IT WORKS ─── */}
      <section className="rounded-3xl bg-gradient-to-b from-[#081B33] to-[#040E1C] border border-sky-900/40 p-8 sm:p-12 lg:p-16 text-white space-y-10 shadow-lg">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-950/80 border border-sky-500/30 text-xs font-semibold text-sky-400">
            <Compass className="w-3.5 h-3.5" />
            <span>Workflow</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">How OceanScope Works</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            From coordinate selection to multi-parameter volumetric analysis in three verified steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {howItWorksSteps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative bg-slate-900/60 border border-sky-500/20 rounded-2xl p-6 space-y-4 hover:border-sky-400/40 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-black text-sky-400/80">{step.step}</span>
                  <div className="p-2.5 bg-sky-950/80 rounded-xl text-sky-300 border border-sky-500/30">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-white">{step.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 4. SCIENTIFIC DATA & SOURCES ─── */}
      <section className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 space-y-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-50 rounded-xl text-[#0284C7]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Scientific Data & Originating Sources</h2>
              <p className="text-xs text-slate-500">Documented oceanographic datasets actively integrated into OceanScope</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Repositories</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {verifiedSources.map((source, idx) => (
            <div
              key={idx}
              className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 hover:border-sky-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{source.provider}</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Verified
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#0284C7]">{source.dataset}</p>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5">Cadence: {source.cadence}</p>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">{source.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 5. EXPLORE THE PLATFORM (CTA BANNER) ─── */}
      <section className="relative rounded-3xl bg-gradient-to-r from-[#0284C7] via-[#0369A1] to-[#0B4870] p-8 sm:p-12 text-white shadow-xl overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>

        <div className="space-y-3 max-w-2xl text-left">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
            Open Ocean Research Demonstration
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Ready to explore interactive 3D ocean data?
          </h2>
          <p className="text-xs sm:text-sm text-sky-100 leading-relaxed font-normal">
            Launch the 3D GIS Explorer directly or create an account to save custom profile soundings and observation regions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <NavLink to="/explorer">
            <button className="px-6 py-3.5 bg-white text-[#0369A1] hover:bg-sky-50 font-bold rounded-xl text-sm transition-all shadow-md flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>Launch 3D Explorer</span>
            </button>
          </NavLink>
          <NavLink to="/signup">
            <button className="px-5 py-3.5 bg-sky-900/50 hover:bg-sky-900/80 border border-white/20 text-white font-semibold rounded-xl text-sm transition-all">
              Create Account
            </button>
          </NavLink>
        </div>
      </section>

      {/* PWA Installation Prompt (mounted conditionally) */}
      <PwaInstallPrompt />
    </div>
  );
};
