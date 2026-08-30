import React from 'react';
import { NavLink } from 'react-router-dom';
import { APP_CONFIG } from '../../config/appConfig';

export const Navbar: React.FC = () => {
  const navItems = [
    { to: '/explorer', label: 'Explorer' },
    { to: '/observations', label: 'Observations' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/about', label: 'About' },
  ];

  return (
    <nav className="bg-[#060a14] border-b border-slate-800/60 px-4 sm:px-6 h-11 flex items-center justify-between sticky top-0 z-50">
      {/* Brand */}
      <NavLink to="/explorer" className="text-sm font-semibold tracking-tight text-slate-100 hover:text-white transition-colors">
        {APP_CONFIG.name}
      </NavLink>

      {/* Navigation Links */}
      <div className="flex items-center gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-3 py-1 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'text-white bg-slate-800/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
