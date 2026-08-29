import React from 'react';
import { APP_CONFIG } from '../../config/appConfig';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-ocean-950 border-t border-ocean-850 px-4 py-3 text-xs text-slate-400 font-mono flex flex-col sm:flex-row items-center justify-between gap-2">
      <div>
        <span>© 2026 {APP_CONFIG.name} — Interactive Ocean Visualization Platform</span>
      </div>
      <div className="flex items-center space-x-4">
        <span>INCOIS</span>
        <span>•</span>
        <span>Argo Array</span>
        <span>•</span>
        <span>HYCOM</span>
        <span>•</span>
        <span>Copernicus Marine</span>
      </div>
    </footer>
  );
};
