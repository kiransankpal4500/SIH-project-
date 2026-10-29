import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFullscreen } from '../../hooks/useFullscreen';
import { User, LogOut, ChevronDown, Sparkles, Maximize2, Minimize2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    isFullscreen: isWebsiteFullscreen,
    toggleFullscreen: toggleWebsiteFullscreen,
    isSupported: isFullscreenSupported,
  } = useFullscreen();

  const navItems = [
    { to: '/explorer', label: 'Explore' },
    { to: '/observations', label: 'Observations' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/assistant', label: 'AI Assistant' },
    { to: '/about', label: 'About' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      setDropdownOpen(false);
      await logout();
      navigate('/');
    } catch (err) {
      console.error('[Navbar] Sign-out error:', err);
    }
  };

  // User initials fallback
  const initials = currentUser
    ? (currentUser.displayName || currentUser.email || 'U')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <nav className="bg-[#FFFFFF] border-b border-[#E2E8F0] px-4 sm:px-8 h-14 flex items-center justify-between sticky top-0 z-50 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      {/* Brand Logo strictly on the Left Side */}
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
              height: '36px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </NavLink>
      </div>

      {/* Center & Right Navigation Elements */}
      <div className="flex items-center gap-2 sm:gap-6">
        {/* Core Nav Links for Desktop/Tablet */}
        <div className="hidden md:flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
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

        {/* Website Fullscreen Button */}
        {isFullscreenSupported && (
          <button
            type="button"
            onClick={toggleWebsiteFullscreen}
            aria-label={isWebsiteFullscreen ? 'Exit website fullscreen' : 'Enter website fullscreen'}
            title={isWebsiteFullscreen ? 'Exit website fullscreen (Esc)' : 'Enter website fullscreen'}
            className="p-2 rounded-lg text-slate-600 hover:text-[#0B84C6] hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
          >
            {isWebsiteFullscreen ? (
              <Minimize2 className="w-4 h-4 text-[#0B84C6]" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Auth Section in Top-Right Corner */}
        <div className="flex items-center pl-2 md:border-l md:border-slate-200">
          {currentUser ? (
            /* Authenticated: Compact Circular Profile Avatar on Right Side */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-1 p-0.5 rounded-full hover:ring-2 hover:ring-[#0B84C6]/50 transition-all focus:outline-none focus:ring-2 focus:ring-[#0B84C6]"
                aria-expanded={dropdownOpen}
                aria-label="User account menu"
              >
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Avatar'}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-sm"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#0B84C6] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                    {initials}
                  </div>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden sm:block transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* User Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  {/* Account Summary */}
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {currentUser.displayName || 'Ocean Researcher'}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#0B84C6] transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>My Profile</span>
                    </Link>

                    {/* Mobile Navigation Mirror */}
                    <div className="md:hidden border-t border-slate-100 my-1 pt-1">
                      {navItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          <span>{item.label}</span>
                        </Link>
                      ))}
                    </div>

                    {/* Sign Out */}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100 mt-1"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Unauthenticated: Login and Sign Up in Top-Right Corner */
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#0B84C6] hover:bg-slate-50 rounded-lg transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0B84C6] hover:bg-[#0973AD] rounded-lg transition-all shadow-sm shadow-sky-500/20"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Sign Up</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};
