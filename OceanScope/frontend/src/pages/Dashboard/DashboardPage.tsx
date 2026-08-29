import React from 'react';
import { DashboardGrid } from '../../components/dashboard/DashboardGrid';
import { useOceanData } from '../../hooks/useOceanData';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';

export const DashboardPage: React.FC = () => {
  const { stats, alerts, observations, loading } = useOceanData();

  if (loading) {
    return <LoadingSpinner label="Initializing OceanScope dashboard..." />;
  }

  return (
    <div className="space-y-4">
      {/* Dashboard Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ocean-850 pb-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Mission Control Dashboard</h1>
          <p className="text-xs font-mono text-slate-400">
            Real-time numerical ocean model outputs and in-situ observation summaries
          </p>
        </div>
      </div>

      {/* Dashboard Content Grid */}
      <DashboardGrid stats={stats} alerts={alerts} observations={observations} />
    </div>
  );
};
