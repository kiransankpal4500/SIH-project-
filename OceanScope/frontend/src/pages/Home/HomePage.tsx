import React from 'react';
import { NavLink } from 'react-router-dom';
import { Waves, Globe, LayoutDashboard, Compass, BarChart2, ShieldAlert, Database, ArrowRight } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { APP_CONFIG } from '../../config/appConfig';

export const HomePage: React.FC = () => {
  const capabilities = [
    {
      title: '3D Globe Visualization',
      description: 'Render numerical ocean model output fields and in-situ floats on an interactive 3D WebGL sphere.',
      icon: Globe,
      link: '/explorer',
    },
    {
      title: 'Scientific Dashboard',
      description: 'Monitor real-time ocean system metrics, active sensors, and environmental parameter trends.',
      icon: LayoutDashboard,
      link: '/dashboard',
    },
    {
      title: 'In-Situ Observations',
      description: 'Ingest Argo floats, moored buoys, CTD casts, and surface drifters across global basins.',
      icon: Compass,
      link: '/observations',
    },
    {
      title: 'Depth & Time Analytics',
      description: 'Inspect vertical depth profiles (0-2000m) and analyze model vs observation deltas.',
      icon: BarChart2,
      link: '/analytics',
    },
  ];

  return (
    <div className="space-y-8 py-4">
      {/* Hero Banner */}
      <div className="relative rounded-xl bg-gradient-to-br from-ocean-900 via-ocean-850 to-ocean-950 border border-ocean-800 p-6 md:p-10 overflow-hidden shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-96 h-96 bg-ocean-400/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center space-x-2">
            <Badge variant="cyan">HACKATHON PROJECT FOUNDATION</Badge>
            <Badge variant="emerald">STAGE: SHELL & ARCHITECTURE</Badge>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
            {APP_CONFIG.name}
          </h1>
          <p className="text-lg md:text-xl font-mono text-ocean-300 font-medium">
            "{APP_CONFIG.tagline}"
          </p>

          <p className="text-sm md:text-base text-slate-300 leading-relaxed font-sans">
            A web-based scientific visualization platform integrating <strong>numerical ocean model outputs</strong> (HYCOM, Copernicus) and <strong>in-situ ocean observations</strong> (INCOIS, Argo array).
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <NavLink to="/dashboard">
              <Button variant="primary" size="lg">
                <LayoutDashboard className="w-4 h-4" />
                <span>Launch Dashboard</span>
              </Button>
            </NavLink>
            <NavLink to="/explorer">
              <Button variant="outline" size="lg">
                <Globe className="w-4 h-4 text-ocean-400" />
                <span>Open 3D Explorer</span>
              </Button>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Feature Capabilities Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Waves className="w-5 h-5 text-ocean-400" />
          Platform Modules
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {capabilities.map((item, index) => {
            const Icon = item.icon;
            return (
              <NavLink key={index} to={item.link} className="group">
                <div className="bg-ocean-900 border border-ocean-800 group-hover:border-ocean-400/60 rounded-lg p-5 h-full flex flex-col justify-between transition-all duration-300 shadow-md">
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-ocean-850 border border-ocean-700/60 text-ocean-400 flex items-center justify-center mb-3 group-hover:bg-ocean-400/10 group-hover:text-ocean-300 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-1.5">{item.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-4 flex items-center text-xs font-mono text-ocean-400 font-semibold group-hover:translate-x-1 transition-transform">
                    <span>Explore Module</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* Data Ingestion Sources */}
      <div className="bg-ocean-900 border border-ocean-800 rounded-lg p-5 space-y-3">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-ocean-400" />
          Integrated Oceanographic Datasets
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          {APP_CONFIG.dataSources.map((ds) => (
            <div key={ds.id} className="bg-ocean-850 border border-ocean-800 rounded p-3 text-slate-300">
              <span className="text-ocean-400 font-bold block mb-0.5">{ds.id}</span>
              <span className="text-[11px] text-slate-400">{ds.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
