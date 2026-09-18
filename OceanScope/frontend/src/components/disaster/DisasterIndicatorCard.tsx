/**
 * Disaster Indicator Card
 * Renders individual regional hazard alerts, parameter anomalies, and detection timestamps.
 */

import React from 'react';
import { DisasterIndicator, RegionalRiskHotspot } from '../../types';
import { Badge } from '../common/Badge';
import { AlertOctagon, TrendingUp, MapPin, Calendar } from 'lucide-react';
import { formatCoordinates, formatTimestamp } from '../../utils/formatters';

interface DisasterIndicatorCardProps {
  indicator: DisasterIndicator | RegionalRiskHotspot;
}

export const DisasterIndicatorCard: React.FC<DisasterIndicatorCardProps> = ({ indicator }) => {
  const isRegional = 'category' in indicator;

  const title = indicator.title;
  const riskLevel = isRegional
    ? (indicator as RegionalRiskHotspot).risk_level
    : (indicator as DisasterIndicator).riskLevel;
  const lat = isRegional
    ? (indicator as RegionalRiskHotspot).latitude
    : (indicator as DisasterIndicator).location.latitude;
  const lon = isRegional
    ? (indicator as RegionalRiskHotspot).longitude
    : (indicator as DisasterIndicator).location.longitude;
  const detectedAt = isRegional
    ? (indicator as RegionalRiskHotspot).detected_at
    : (indicator as DisasterIndicator).detectedAt;
  const area = isRegional
    ? (indicator as RegionalRiskHotspot).affected_area_km2
    : (indicator as DisasterIndicator).affectedAreaSqKm;
  const desc = isRegional
    ? (indicator as RegionalRiskHotspot).why_reason
    : (indicator as DisasterIndicator).description;

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#CBD5E1] rounded-xl p-4 space-y-3 transition-all shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2">
          <AlertOctagon className="w-4 h-4 text-[#F59E0B] shrink-0" />
          <h4 className="text-xs font-bold text-[#172033]">{title}</h4>
        </div>
        <Badge variant={riskLevel}>{riskLevel}</Badge>
      </div>

      <p className="text-xs text-[#475569] leading-relaxed">{desc}</p>

      {isRegional && (
        <div className="bg-[#F8FAFC] p-2.5 rounded-lg border border-[#E2E8F0] text-xs grid grid-cols-2 gap-2">
          <div>
            <span className="text-[#64748B] text-[10px] block font-medium">Trigger Factor:</span>
            <span className="text-[#B45309] font-bold truncate block">
              {(indicator as RegionalRiskHotspot).contributing_parameter}
            </span>
          </div>
          <div>
            <span className="text-[#64748B] text-[10px] block font-medium">Observed Value:</span>
            <span className="text-[#172033] font-bold block">
              {(indicator as RegionalRiskHotspot).actual_value} {(indicator as RegionalRiskHotspot).unit}
            </span>
          </div>
          <div className="col-span-2 text-[10px] text-[#64748B] border-t border-[#E2E8F0] pt-1.5 flex justify-between">
            <span>Threshold: {(indicator as RegionalRiskHotspot).threshold_used}</span>
            <span className="text-[#15803D] font-medium">{(indicator as RegionalRiskHotspot).source}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px] text-[#64748B] pt-2 border-t border-[#F1F5F9]">
        <div className="flex items-center space-x-1">
          <MapPin className="w-3.5 h-3.5 text-[#0B84C6]" />
          <span>{formatCoordinates(lat, lon)}</span>
        </div>
        <div className="flex items-center space-x-1 justify-end">
          <TrendingUp className="w-3.5 h-3.5 text-[#F59E0B]" />
          <span>Area: {area.toLocaleString()} km²</span>
        </div>
        <div className="flex items-center space-x-1 col-span-2 text-[#64748B]">
          <Calendar className="w-3.5 h-3.5 text-[#0B84C6]" />
          <span>Detected: {formatTimestamp(detectedAt)}</span>
        </div>
      </div>
    </div>
  );
};
