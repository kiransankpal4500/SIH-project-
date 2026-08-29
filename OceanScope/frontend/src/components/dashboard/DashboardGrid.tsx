import React from 'react';
import { QuickMetrics } from './QuickMetrics';
import { SystemStatusCard } from './SystemStatusCard';
import { RecentAlerts } from './RecentAlerts';
import { Card } from '../common/Card';
import { OceanSystemStats, DisasterIndicator, Observation } from '../../types';
import { OceanGlobeContainer } from '../../three/OceanGlobe/OceanGlobeContainer';
import { Compass, ExternalLink } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { formatCoordinates, formatValue } from '../../utils/formatters';

interface DashboardGridProps {
  stats: OceanSystemStats | null;
  alerts: DisasterIndicator[];
  observations: Observation[];
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({ stats, alerts, observations }) => {
  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <QuickMetrics stats={stats} />

      {/* Main Grid: 3D Viewport Shell + Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: 3D Explorer Preview Placeholder */}
        <div className="lg:col-span-2 space-y-4">
          <Card
            title="3D Ocean Viewport (Interactive Preview)"
            subtitle="Global ocean numerical model output layer"
            action={
              <NavLink
                to="/explorer"
                className="text-xs text-ocean-400 hover:text-ocean-300 flex items-center gap-1 font-mono"
              >
                <span>Full Screen 3D</span>
                <ExternalLink className="w-3 h-3" />
              </NavLink>
            }
          >
            <OceanGlobeContainer variable="temperature" depth={0} />
          </Card>

          <SystemStatusCard stats={stats} />
        </div>

        {/* Right Column: Alerts & Active In-situ Platforms */}
        <div className="space-y-4">
          <RecentAlerts alerts={alerts} />

          <Card
            title={
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-ocean-400" />
                <span className="text-sm font-semibold text-slate-100">Live Platform Ingestion</span>
              </div>
            }
            subtitle="In-situ Argo float & mooring streams"
          >
            <div className="space-y-2.5 font-mono text-xs">
              {observations.map((obs) => (
                <div
                  key={obs.id}
                  className="bg-ocean-850 border border-ocean-800 rounded p-2.5 flex items-center justify-between"
                >
                  <div>
                    <div className="text-white font-bold">{obs.platformId}</div>
                    <div className="text-[11px] text-slate-400">
                      {formatCoordinates(obs.location.latitude, obs.location.longitude)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-ocean-300 font-semibold">
                      SST: {formatValue(obs.variables.temperature, '°C')}
                    </div>
                    <div className="text-[10px] text-slate-400">{obs.source}</div>
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
