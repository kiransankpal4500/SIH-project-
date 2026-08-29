import React from 'react';
import { AnalyticsPanelPlaceholder } from '../../components/analytics/AnalyticsPanelPlaceholder';
import { ModelComparisonPlaceholder } from '../../components/comparison/ModelComparisonPlaceholder';
import { BarChart2 } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ocean-850 pb-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-ocean-400" />
            Oceanographic Data Analytics & Model Comparison
          </h1>
          <p className="text-xs font-mono text-slate-400">
            Depth profiles, parameter time-series, and numerical model vs observation validation
          </p>
        </div>
      </div>

      {/* Model vs Observation Comparison Panel */}
      <ModelComparisonPlaceholder />

      {/* Analytics Charts Panels */}
      <AnalyticsPanelPlaceholder />
    </div>
  );
};
