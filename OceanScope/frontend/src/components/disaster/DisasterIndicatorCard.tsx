import React from 'react';
import { DisasterIndicator, RegionalRiskHotspot } from '../../types';
import { Badge } from '../common/Badge';
import { AlertOctagon, TrendingUp, MapPin, Calendar, ShieldAlert } from 'lucide-react';
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
    <div className="bg-ocean-850 border border-ocean-800 hover:border-ocean-700 rounded-lg p-3.5 space-y-2.5 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
          <h4 className="text-xs font-bold text-slate-100">{title}</h4>
        </div>
        <Badge variant={riskLevel}>{riskLevel}</Badge>
      </div>

      <p className="text-xs text-slate-300 font-sans leading-relaxed">{desc}</p>

      {isRegional && (
        <div className="bg-ocean-900/80 p-2 rounded border border-ocean-800 text-[11px] font-mono grid grid-cols-2 gap-1.5">
          <div>
            <span className="text-slate-400 text-[10px] block">Trigger:</span>
            <span className="text-amber-300 font-semibold truncate block">
              {(indicator as RegionalRiskHotspot).contributing_parameter}
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] block">Value:</span>
            <span className="text-white font-bold block">
              {(indicator as RegionalRiskHotspot).actual_value} {(indicator as RegionalRiskHotspot).unit}
            </span>
          </div>
          <div className="col-span-2 text-[10px] text-slate-400 border-t border-ocean-800 pt-1 flex justify-between">
            <span>Rule: {(indicator as RegionalRiskHotspot).threshold_used}</span>
            <span className="text-emerald-400">{(indicator as RegionalRiskHotspot).source}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-ocean-800">
        <div className="flex items-center space-x-1">
          <MapPin className="w-3 h-3 text-ocean-400" />
          <span>{formatCoordinates(lat, lon)}</span>
        </div>
        <div className="flex items-center space-x-1 justify-end">
          <TrendingUp className="w-3 h-3 text-amber-400" />
          <span>Area: {area.toLocaleString()} km²</span>
        </div>
        <div className="flex items-center space-x-1 col-span-2 text-slate-400">
          <Calendar className="w-3 h-3 text-ocean-400" />
          <span>Detected: {formatTimestamp(detectedAt)}</span>
        </div>
      </div>
    </div>
  );
};
