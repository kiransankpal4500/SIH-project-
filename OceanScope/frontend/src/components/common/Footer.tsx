import React from 'react';
import { APP_CONFIG } from '../../config/appConfig';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#FFFFFF] border-t border-[#E2E8F0] px-6 py-4 text-xs text-[#64748B] flex flex-col sm:flex-row items-center justify-between gap-3 mt-auto">
      <div>
        <span>© 2026 {APP_CONFIG.name} — Operational Oceanographic Research Platform</span>
      </div>
      <div className="flex items-center space-x-3 text-xs font-medium text-[#475569]">
        <span>INCOIS</span>
        <span className="text-[#CBD5E1]">•</span>
        <span>Argo Array</span>
        <span className="text-[#CBD5E1]">•</span>
        <span>HYCOM Model</span>
        <span className="text-[#CBD5E1]">•</span>
        <span>Copernicus Marine</span>
      </div>
    </footer>
  );
};
