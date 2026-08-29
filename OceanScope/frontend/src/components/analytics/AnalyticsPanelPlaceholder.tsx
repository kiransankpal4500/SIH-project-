import React from 'react';
import { Card } from '../common/Card';
import { DepthProfileChart } from '../charts/DepthProfileChart';
import { SstTimeSeriesChart } from '../charts/SstTimeSeriesChart';

export const AnalyticsPanelPlaceholder: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card
        title="Vertical Depth Profiles (Argo Float #2901452)"
        subtitle="Temperature & Salinity vs. Depth Slices (0-1000m)"
      >
        <DepthProfileChart height={300} />
      </Card>

      <Card
        title="Sea Surface Temperature Timeline"
        subtitle="7-Day SST Trend vs 30-Year Climatological Mean Baseline"
      >
        <SstTimeSeriesChart height={300} />
      </Card>
    </div>
  );
};
