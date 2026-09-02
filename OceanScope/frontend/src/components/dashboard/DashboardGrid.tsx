import React from 'react';
import { QuickMetrics } from './QuickMetrics';
import { SystemStatusCard } from './SystemStatusCard';
import { RecentAlerts } from './RecentAlerts';
import { Card } from '../common/Card';
import { DataStatusCard } from '../common/DataStatusCard';
import { OceanSystemStats, DisasterIndicator, Observation } from '../../types';
import { OceanGlobeContainer } from '../../three/OceanGlobe/OceanGlobeContainer';
import { Compass, ExternalLink, Globe } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { formatCoordinates, formatValue } from '../../utils/formatters';

interface DashboardGridProps {
  stats: OceanSystemStats | null;
  alerts: DisasterIndicator[];
  observations: Observation[];
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ stats, alerts, observations }) => {
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <QuickMetrics stats={stats} />

      {/* Real-time Data Feed & Ingestion Status */}
      <DataStatusCard />

      {/* Main Grid: 3D Viewport Shell + Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: 3D Explorer Preview */}
        <div className="lg:col-span-2 space-y-6">
          <Card
            title={
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#0B84C6]" />
                <span>3D Ocean GIS Viewport (Live Preview)</span>
              </div>
            }
            subtitle="Global numerical model output layer with interactive orbit controls"
            action={
              <NavLink
                to="/explorer"
                className="text-xs text-[#0B84C6] hover:text-[#085A8A] font-semibold flex items-center gap-1.5 px-3 py-1.5 bg-[#E0F2FE] rounded-lg transition-colors"
              >
                <span>Open Fullscreen 3D</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </NavLink>
            }
          >
            <OceanGlobeContainer variable="temperature" depth={0} heightClass="h-[480px]" />
          </Card>

          <SystemStatusCard stats={stats} />
        </div>

        {/* Right Column: Alerts & Active In-situ Platforms */}
        <div className="space-y-6">
          <RecentAlerts alerts={alerts} />

          <Card
            title={
              <div className="flex items-center space-x-2">
                <Compass className="w-5 h-5 text-[#0B84C6]" />
                <span className="text-base font-bold text-[#172033]">Live Ingested Platforms</span>
              </div>
            }
            subtitle="Active in-situ Argo profiling float streams"
          >
            <div className="space-y-2.5 text-xs">
              {observations.slice(0, 6).map((obs) => (
                <div
                  key={obs.id}
                  className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3 flex items-center justify-between hover:border-[#CBD5E1] transition-colors"
                >
                  <div>
                    <div className="text-[#0B84C6] font-bold text-xs">Float #{obs.platformId}</div>
                    <div className="text-[11px] text-[#64748B] mt-0.5">
                      {formatCoordinates(obs.location.latitude, obs.location.longitude)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#DC2626] font-bold">
                      {formatValue(obs.variables.temperature, '°C')}
                    </div>
                    <div className="text-[10px] text-[#64748B] font-medium uppercase mt-0.5">{obs.source}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
