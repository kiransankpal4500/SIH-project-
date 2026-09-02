import React from 'react';
import { AnalyticsPanelPlaceholder } from '../../components/analytics/AnalyticsPanelPlaceholder';
import { ModelComparisonPlaceholder } from '../../components/comparison/ModelComparisonPlaceholder';
import { BarChart2 } from 'lucide-react';
import { Card } from '../../components/common/Card';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-[#E0F2FE] text-[#0B84C6] rounded-lg">
              <BarChart2 className="w-5 h-5" />
            </div>
            Oceanographic Analytics & Model Cross-Validation
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Statistical error verification (Bias, RMSE, MAE), depth profile soundings, and SST climatological anomalies.
          </p>
        </div>
      </div>

      {/* Model vs Observation Comparison Panel */}
      <Card
        title="Numerical Forecast Model Validation"
        subtitle="Co-located HYCOM 0.08° grid forecasts vs. Argo profiling float observations"
      >
        <ModelComparisonPlaceholder />
      </Card>

      {/* Analytics Charts Panels */}
      <AnalyticsPanelPlaceholder />
    </div>
  );
};
