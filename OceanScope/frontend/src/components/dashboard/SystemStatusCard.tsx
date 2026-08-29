import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Server, Database, Radio, Cpu } from 'lucide-react';
import { OceanSystemStats } from '../../types';

interface SystemStatusCardProps {
  stats: OceanSystemStats | null;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ stats }) => {
  const items = [
    {
      label: 'Telemetry Feeds',
      value: `${stats?.activePlatformsCount || 142} Active Sensor Platforms`,
      status: 'ONLINE',
      icon: Radio,
    },
    {
      label: 'Ocean Model Run',
      value: stats?.modelOutputDate || 'HYCOM GLBu0.08 Sliced',
      status: 'UPDATED',
      icon: Server,
    },
    {
      label: 'Active Region',
      value: stats?.coverageRegion || 'Indian Ocean Basin',
      status: 'SYNCED',
      icon: Database,
    },
    {
      label: 'FastAPI Backend Core',
      value: 'Standby / Pre-registered API Shell',
      status: 'STANDBY',
      icon: Cpu,
    },
  ];

  return (
    <Card title="System Telemetry & Status" subtitle="Real-time operational status of ocean data streams">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="bg-ocean-850 border border-ocean-800 rounded p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 font-sans text-xs">{item.label}</span>
                <Badge variant={item.status === 'STANDBY' ? 'amber' : 'emerald'} size="sm">
                  {item.status}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-white font-semibold">
                <Icon className="w-4 h-4 text-ocean-400 shrink-0" />
                <span className="truncate">{item.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
