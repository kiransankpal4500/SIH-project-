import React from 'react';
import { DashboardGrid } from '../../components/dashboard/DashboardGrid';
import { useOceanData } from '../../hooks/useOceanData';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { LayoutDashboard } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { stats, alerts, observations, loading } = useOceanData();

  if (loading) {
    return <LoadingSpinner label="Initializing OceanScope telemetry..." />;
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172033] tracking-tight flex items-center gap-2.5">
            <div className="p-2 bg-[#E0F2FE] text-[#0B84C6] rounded-lg">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            Operational Mission Control
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Real-time numerical ocean model outputs, active sensor platform ingestion, and multi-hazard detection.
          </p>
        </div>
      </div>

      {/* Dashboard Content Grid */}
      <DashboardGrid stats={stats} alerts={alerts} observations={observations} />
    </div>
  );
};
