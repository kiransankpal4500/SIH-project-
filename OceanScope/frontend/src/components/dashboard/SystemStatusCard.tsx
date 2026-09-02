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
      label: 'Telemetry Stream',
      value: `${stats?.activePlatformsCount || 142} Active Float Sensors`,
      status: 'ONLINE',
      icon: Radio,
    },
    {
      label: 'Operational Run',
      value: stats?.modelOutputDate || 'HYCOM GLBu0.08 Sliced',
      status: 'UPDATED',
      icon: Server,
    },
    {
      label: 'Spatial Domain',
      value: stats?.coverageRegion || 'Indian Ocean Basin',
      status: 'SYNCED',
      icon: Database,
    },
    {
      label: 'FastAPI Backend',
      value: 'Python Compute Core',
      status: 'ONLINE',
      icon: Cpu,
    },
  ];

  return (
    <Card title="System Telemetry & Computational Infrastructure" subtitle="Real-time operational status of ocean data pipelines and server nodes">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[#64748B] font-medium text-xs">{item.label}</span>
                <Badge variant={item.status === 'STANDBY' ? 'amber' : 'emerald'} size="sm">
                  {item.status}
                </Badge>
              </div>
              <div className="flex items-center space-x-2 text-[#172033] font-bold">
                <Icon className="w-4 h-4 text-[#0B84C6] shrink-0" />
                <span className="truncate">{item.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
