import React from 'react';
import { DisasterIndicator } from '../../types';
import { Badge } from '../common/Badge';
import { AlertOctagon, TrendingUp, MapPin, Calendar } from 'lucide-react';
import { formatCoordinates, formatTimestamp } from '../../utils/formatters';

interface DisasterIndicatorCardProps {
  indicator: DisasterIndicator;
}

export const DisasterIndicatorCard: React.FC<DisasterIndicatorCardProps> = ({ indicator }) => {
  return (
    <div className="bg-ocean-850 border border-ocean-800 hover:border-ocean-700 rounded-lg p-3.5 space-y-2 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2">
          <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
          <h4 className="text-xs font-bold text-slate-100">{indicator.title}</h4>
        </div>
        <Badge variant={indicator.riskLevel}>{indicator.riskLevel}</Badge>
      </div>

      <p className="text-xs text-slate-300 font-sans leading-relaxed">{indicator.description}</p>

      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-400 pt-1 border-t border-ocean-800">
        <div className="flex items-center space-x-1">
          <MapPin className="w-3 h-3 text-ocean-400" />
          <span>{formatCoordinates(indicator.location.latitude, indicator.location.longitude)}</span>
        </div>
        <div className="flex items-center space-x-1 justify-end">
          <TrendingUp className="w-3 h-3 text-amber-400" />
          <span>Area: {indicator.affectedAreaSqKm.toLocaleString()} km²</span>
        </div>
        <div className="flex items-center space-x-1 col-span-2 text-slate-400">
          <Calendar className="w-3 h-3 text-ocean-400" />
          <span>Detected: {formatTimestamp(indicator.detectedAt)}</span>
        </div>
      </div>
    </div>
  );
};
