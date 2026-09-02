import React from 'react';
import { Card } from '../common/Card';
import { DepthProfileChart } from '../charts/DepthProfileChart';
import { SstTimeSeriesChart } from '../charts/SstTimeSeriesChart';

export const AnalyticsPanelPlaceholder: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card
        title="Vertical Depth Soundings (Argo Float #2901452)"
        subtitle="In-situ Temperature & Salinity CTD profiles across depth (0–1000 dbar)"
      >
        <DepthProfileChart height={300} />
      </Card>

      <Card
        title="Sea Surface Temperature (SST) Timeline"
        subtitle="7-Day Observation Trend vs. 30-Year Climatological Mean Baseline"
      >
        <SstTimeSeriesChart height={300} />
      </Card>
    </div>
  );
};
