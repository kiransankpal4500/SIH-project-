import React from 'react';
import { NavLink } from 'react-router-dom';
import { Waves, LayoutDashboard, Globe, Compass, BarChart2, Info, Home } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';

export const Navbar: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/explorer', label: '3D Explorer', icon: Globe },
    { to: '/observations', label: 'Observations', icon: Compass },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/about', label: 'About', icon: Info },
  ];

  return (
    <nav className="bg-ocean-900 border-b border-ocean-800 px-4 py-2.5 flex items-center justify-between sticky top-0 z-50">
      {/* OceanScope Brand Logo & Tagline */}
      <NavLink to="/" className="flex items-center space-x-2.5 group">
        <div className="p-1.5 bg-ocean-400/10 border border-ocean-400/30 rounded-md text-ocean-400 group-hover:bg-ocean-400/20 group-hover:border-ocean-400/60 transition-all">
          <Waves className="w-5 h-5" />
        </div>
        <div>
          <div className="text-base font-bold tracking-tight text-white flex items-center gap-1">
            {APP_CONFIG.name}
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-ocean-800 text-ocean-300 border border-ocean-700 rounded">
              v0.1
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-mono hidden md:block">
            {APP_CONFIG.tagline}
          </p>
        </div>
      </NavLink>

      {/* Navigation Links */}
      <div className="flex items-center space-x-1 sm:space-x-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-ocean-400 text-ocean-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-ocean-800/70'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
