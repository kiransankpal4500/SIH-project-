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
    <div className="bg-ocean-900 border border-ocean-800 rounded-lg p-3 flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono">
      <div className="relative w-full md:w-72">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Filter platform ID or region..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-ocean-950 border border-ocean-800 focus:border-ocean-400 rounded pl-8 pr-3 py-1.5 text-slate-200 focus:outline-none placeholder-slate-500"
        />
      </div>

      <div className="flex items-center space-x-2 w-full md:w-auto">
        <Filter className="w-3.5 h-3.5 text-ocean-400" />
        <span className="text-slate-400">Data Source:</span>
        <select
          value={selectedSource}
          onChange={(e) => onSourceChange(e.target.value)}
          className="bg-ocean-950 border border-ocean-800 text-slate-200 rounded px-3 py-1.5 focus:border-ocean-400 focus:outline-none"
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
