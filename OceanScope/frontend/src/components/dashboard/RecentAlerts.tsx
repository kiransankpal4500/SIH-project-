import React from 'react';
import { Card } from '../common/Card';
import { DisasterIndicatorCard } from '../disaster/DisasterIndicatorCard';
import { DisasterIndicator, RegionalRiskHotspot } from '../../types';
import { ShieldAlert } from 'lucide-react';
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
          <ShieldAlert className="w-5 h-5 text-[#F59E0B]" />
          <span className="text-base font-bold text-[#172033]">Ocean-Risk & Hazard Alerts</span>
        </div>
      }
      subtitle="Transparent rule-based detection from INCOIS HYCOM and Argo telemetry"
    >
      <div className="space-y-3 pt-1">
        {displayAlerts.length === 0 ? (
          <p className="text-xs text-[#64748B] py-2">No critical physical anomalies currently active.</p>
        ) : (
          displayAlerts.map((alert) => <DisasterIndicatorCard key={alert.id} indicator={alert} />)
        )}
      </div>
    </Card>
  );
};
