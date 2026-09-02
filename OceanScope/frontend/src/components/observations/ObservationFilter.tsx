import React from 'react';
import { Filter, Search } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';

interface ObservationFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedSource: string;
  onSourceChange: (source: string) => void;
}

export const ObservationFilter: React.FC<ObservationFilterProps> = ({
  searchTerm,
  onSearchChange,
  selectedSource,
  onSourceChange,
}) => {
  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-sans shadow-sm">
      <div className="relative w-full md:w-80">
        <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#94A3B8]" />
        <input
          type="text"
          placeholder="Search by Platform ID or region..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-[#F8FAFC] border border-[#E2E8F0] focus:border-[#0B84C6] rounded-lg pl-9 pr-3.5 py-2 text-xs text-[#172033] focus:outline-none placeholder-[#94A3B8] transition-colors"
        />
      </div>

      <div className="flex items-center space-x-2.5 w-full md:w-auto">
        <Filter className="w-4 h-4 text-[#0B84C6]" />
        <span className="text-[#64748B] font-medium text-xs">Data Stream:</span>
        <select
          value={selectedSource}
          onChange={(e) => onSourceChange(e.target.value)}
          className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#172033] rounded-lg px-3 py-2 text-xs focus:border-[#0B84C6] focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Sources (Argo, INCOIS, HYCOM)</option>
          {APP_CONFIG.dataSources.map((ds) => (
            <option key={ds.id} value={ds.id}>
              {ds.id} - {ds.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
