import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
  change,
  trend = 'neutral',
}) => {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-rose-400',
    neutral: 'text-slate-400',
  };

  return (
    <div className="bg-ocean-900 border border-ocean-800 rounded-lg p-3.5 flex items-center justify-between shadow-sm hover:border-ocean-700 transition-colors">
      <div>
        <span className="text-xs text-slate-400 font-medium uppercase tracking-wider block">
          {title}
        </span>
        <div className="flex items-baseline space-x-1.5 mt-1">
          <span className="text-xl font-mono font-bold text-white tracking-tight">{value}</span>
          {unit && <span className="text-xs text-ocean-300 font-mono">{unit}</span>}
        </div>
        {change && (
          <span className={`text-[11px] font-mono mt-1 block ${trendColors[trend]}`}>
            {change}
          </span>
        )}
      </div>
      <div className="p-2.5 bg-ocean-800/80 rounded-md border border-ocean-700/60 text-ocean-400">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};
