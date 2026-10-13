import React from 'react';
import { NavLink } from 'react-router-dom';

export const Navbar: React.FC = () => {
  const navItems = [
    { to: '/explorer', label: 'Explore' },
    { to: '/observations', label: 'Observations' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/about', label: 'About' },
  ];

  return (
    <nav className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 sm:px-8 h-14 flex items-center justify-between sticky top-0 z-50 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {/* Brand — approved OceanScope logo (wordmark embedded in image) */}
      <div className="flex items-center gap-6">
        <NavLink
          to="/"
          aria-label="OceanScope home"
          className="flex items-center transition-opacity hover:opacity-90"
        >
          <img
            src="/assets/oceanscope-logo.png"
            alt="OceanScope"
            width={861}
            height={290}
            loading="eager"
            decoding="sync"
            draggable={false}
            style={{
              height: '38px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
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
