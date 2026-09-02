import React from 'react';
import { NavLink } from 'react-router-dom';
import { APP_CONFIG } from '../../config/appConfig';
import { Waves } from 'lucide-react';

export const Navbar: React.FC = () => {
  const navItems = [
    { to: '/explorer', label: 'Explore' },
    { to: '/observations', label: 'Observations' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/about', label: 'About' },
  ];

  return (
    <nav className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 sm:px-8 h-14 flex items-center justify-between sticky top-0 z-50 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {/* Brand */}
      <div className="flex items-center gap-6">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 group transition-opacity hover:opacity-90"
        >
          <div className="w-8 h-8 rounded-lg bg-[#0B84C6] flex items-center justify-center text-white shadow-sm">
            <Waves className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-[#172033]">
              {APP_CONFIG.name}
            </span>
            <span className="text-[10px] text-[#64748B] font-medium tracking-wider uppercase -mt-0.5">
              Ocean Research Platform
            </span>
          </div>
        </NavLink>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center gap-1 sm:gap-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `px-3.5 py-1.5 rounded-md text-sm font-medium transition-all ${
                isActive
                  ? 'text-[#0B84C6] bg-[#E0F2FE] font-semibold'
                  : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9]'
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
