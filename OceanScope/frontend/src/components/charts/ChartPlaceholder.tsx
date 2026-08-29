import React from 'react';
import { BarChart3 } from 'lucide-react';

interface ChartPlaceholderProps {
  title: string;
  type?: 'line' | 'profile' | 'comparison' | 'heatmap';
  height?: number;
}

export const ChartPlaceholder: React.FC<ChartPlaceholderProps> = ({
  title,
  type = 'line',
  height = 240,
}) => {
  return (
    <div
      style={{ height: `${height}px` }}
      className="bg-ocean-950/70 border border-ocean-800 rounded-md p-4 flex flex-col items-center justify-center relative overflow-hidden group"
    >
      {/* Background chart graphic grid simulation */}
      <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,#2A3C5D_1px,transparent_1px),linear-gradient(to_bottom,#2A3C5D_1px,transparent_1px)] bg-[size:16px_16px]"></div>

      <div className="relative z-10 text-center space-y-2">
        <div className="w-10 h-10 rounded-full bg-ocean-900 border border-ocean-700 flex items-center justify-center mx-auto text-ocean-400">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-mono font-semibold text-slate-200">{title}</h4>
        <p className="text-[11px] text-slate-400 max-w-xs">
          Recharts {type.toUpperCase()} analytics viewport ready for step-level data binding.
        </p>
      </div>
    </div>
  );
};
