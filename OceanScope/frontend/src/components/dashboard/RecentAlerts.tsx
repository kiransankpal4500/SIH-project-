import React from 'react';
import { Card } from '../common/Card';
import { DisasterIndicatorCard } from '../disaster/DisasterIndicatorCard';
import { DisasterIndicator } from '../../types';
import { AlertTriangle } from 'lucide-react';

interface RecentAlertsProps {
  alerts: DisasterIndicator[];
}

export const RecentAlerts: React.FC<RecentAlertsProps> = ({ alerts }) => {
  return (
    <Card
      title={
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-100">Ocean-Risk & Disaster Indicators</span>
        </div>
      }
      subtitle="Automated anomaly detection from satellite SST & ocean circulation fields"
    >
      <div className="space-y-3">
        {alerts.length === 0 ? (
          <p className="text-xs font-mono text-slate-400">No critical risk anomalies detected.</p>
        ) : (
          alerts.map((alert) => <DisasterIndicatorCard key={alert.id} indicator={alert} />)
        )}
      </div>
    </Card>
  );
};
