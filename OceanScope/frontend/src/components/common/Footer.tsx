import React from 'react';
import { NavLink } from 'react-router-dom';
import { APP_CONFIG } from '../../config/appConfig';
import { Globe, Database, Compass, Layers, ShieldCheck, ExternalLink, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#051124] border-t border-sky-950 text-slate-300 pt-12 pb-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-10 border-b border-sky-900/40">
          {/* Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/oceanscope-logo.png"
                alt="OceanScope"
                width={861}
                height={290}
                loading="lazy"
                draggable={false}
                className="h-8 w-auto object-contain brightness-110"
              />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm font-normal">
              Unified oceanographic intelligence platform bridging in-situ Argo profiling arrays with numerical ocean circulation forecasts (HYCOM & Copernicus Marine) and official GEBCO bathymetry.
            </p>
            <div className="flex items-center gap-2 text-xs text-sky-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Scientific Research & Demonstration Platform</span>
            </div>
          </div>

          {/* Navigation */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Platform</p>
            <ul className="space-y-2 text-xs">
              <li>
                <NavLink to="/explorer" className="text-slate-400 hover:text-sky-300 transition-colors">
                  3D Ocean GIS Explorer
                </NavLink>
              </li>
              <li>
                <NavLink to="/observations" className="text-slate-400 hover:text-sky-300 transition-colors">
                  In-Situ Argo Array
                </NavLink>
              </li>
              <li>
                <NavLink to="/analytics" className="text-slate-400 hover:text-sky-300 transition-colors">
                  Model Validation
                </NavLink>
              </li>
              <li>
                <NavLink to="/about" className="text-slate-400 hover:text-sky-300 transition-colors">
                  System Architecture
                </NavLink>
              </li>
            </ul>
          </div>

          {/* User Access */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Account</p>
            <ul className="space-y-2 text-xs">
              <li>
                <NavLink to="/login" className="text-slate-400 hover:text-sky-300 transition-colors">
                  Sign In
                </NavLink>
              </li>
              <li>
                <NavLink to="/signup" className="text-slate-400 hover:text-sky-300 transition-colors">
                  Create Account
                </NavLink>
              </li>
              <li>
                <NavLink to="/profile" className="text-slate-400 hover:text-sky-300 transition-colors">
                  Researcher Profile
                </NavLink>
              </li>
            </ul>
          </div>

          {/* Scientific Data Acknowledgements */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-white">Data Partners</p>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                <span>INCOIS ERDDAP</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                <span>GEBCO / NOAA</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>HYCOM Consortium</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                <span>Copernicus Marine</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>OBIS Biodiversity</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            © 2026 {APP_CONFIG.name} — Operational Oceanographic Research Platform (v{APP_CONFIG.version})
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-400">WGS84 Coordinates</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Open Geospatial Data</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
