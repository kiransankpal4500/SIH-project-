import React from 'react';
import { Card } from '../common/Card';
import { DisasterIndicatorCard } from '../disaster/DisasterIndicatorCard';
import { DisasterIndicator, RegionalRiskHotspot } from '../../types';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useOceanContext } from '../../store/OceanContext';

interface RecentAlertsProps {
  alerts?: (DisasterIndicator | RegionalRiskHotspot)[];
}

export const RecentAlerts: React.FC<RecentAlertsProps> = ({ alerts }) => {
  const { state } = useOceanContext();

  const displayAlerts = (alerts && alerts.length > 0)
    ? alerts
    : (state.riskAlerts.length > 0 ? state.riskAlerts : []);

  return (
    <Card
      title={
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-slate-100">Ocean-Risk & Hazard Indicators</span>
        </div>
      }
      subtitle="Transparent rule-based detection from INCOIS HYCOM and Argo telemetry"
    >
      <div className="space-y-3">
        {displayAlerts.length === 0 ? (
          <p className="text-xs font-mono text-slate-400">No critical risk anomalies detected.</p>
        ) : (
          displayAlerts.map((alert) => <DisasterIndicatorCard key={alert.id} indicator={alert} />)
        )}
      </div>
    </Card>
  );
};
