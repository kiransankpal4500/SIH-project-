import React from 'react';
import { StatCard } from '../common/StatCard';
import { Thermometer, Compass, AlertTriangle, Waves } from 'lucide-react';
import { OceanSystemStats } from '../../types';

interface QuickMetricsProps {
  stats: OceanSystemStats | null;
}

export const QuickMetrics: React.FC<QuickMetricsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        title="Avg Sea Surface Temp"
        value={stats?.avgSeaSurfaceTemp ?? 28.4}
        unit="°C"
        icon={Thermometer}
        change="+0.6°C vs 30y mean"
        trend="up"
      />
      <StatCard
        title="Salinity Level"
        value={stats?.avgSalinity ?? 34.8}
        unit="PSU"
        icon={Waves}
        change="Stable"
        trend="neutral"
      />
      <StatCard
        title="Active Platforms"
        value={stats?.activePlatformsCount ?? 142}
        unit="Floats & Moorings"
        icon={Compass}
        change="+12 newly ingested"
        trend="up"
      />
      <StatCard
        title="Disaster Alerts"
        value={stats?.activeAlertsCount ?? 2}
        unit="Risk Indicators"
        icon={AlertTriangle}
        change="1 Marine Heatwave"
        trend="down"
      />
    </div>
  );
};
