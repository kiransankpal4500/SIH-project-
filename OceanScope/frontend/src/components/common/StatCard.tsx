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
    up: 'text-[#16A34A] bg-[#DCFCE7]',
    down: 'text-[#DC2626] bg-[#FEE2E2]',
    neutral: 'text-[#64748B] bg-[#F1F5F9]',
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 flex items-center justify-between shadow-[0_2px_10px_rgba(15,23,42,0.06)] hover:border-[#CBD5E1] transition-colors">
      <div>
        <span className="text-xs text-[#64748B] font-medium tracking-wide uppercase block">
          {title}
        </span>
        <div className="flex items-baseline space-x-1.5 mt-1.5">
          <span className="text-2xl font-bold text-[#172033] tracking-tight">{value}</span>
          {unit && <span className="text-xs text-[#64748B] font-medium">{unit}</span>}
        </div>
        {change && (
          <span className={`text-[11px] font-medium mt-1.5 inline-block px-1.5 py-0.5 rounded ${trendColors[trend]}`}>
            {change}
          </span>
        )}
      </div>
      <div className="p-3 bg-[#E0F2FE] rounded-lg text-[#0B84C6] flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  );
};
