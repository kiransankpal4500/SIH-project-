import React from 'react';
import { useOceanContext } from '../../store/OceanContext';
import { RISK_DISCLAIMER } from '../../config/riskConfig';
import {
  ShieldAlert,
  Info,
  MapPin,
  Clock,
  Activity,
  Gauge,
  Thermometer,
  Waves,
  Flame,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { formatCoordinates } from '../../utils/formatters';

const RISK_BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  MODERATE: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-500/40' },
  HIGH: { bg: 'bg-orange-950/60', text: 'text-orange-300', border: 'border-orange-500/40' },
  CRITICAL: { bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-500/40' },
};

export const OceanRiskPanel: React.FC = () => {
  const { state, toggleRiskLayer } = useOceanContext();
  const risk = state.locationRisk;
  const isLive = !state.isDemoMode && state.isLiveDataMode;

  const currentRiskLevel = risk?.overall_risk || 'LOW';
  const badgeStyle = RISK_BADGE_STYLES[currentRiskLevel] || RISK_BADGE_STYLES.LOW;

  const getVariableIcon = (key: string) => {
    switch (key) {
      case 'current_speed':
        return <Gauge className="w-3.5 h-3.5 text-cyan-400" />;
      case 'sst_anomaly':
        return <Thermometer className="w-3.5 h-3.5 text-red-400" />;
      case 'ssh':
        return <Waves className="w-3.5 h-3.5 text-blue-400" />;
      case 'tchp':
        return <Flame className="w-3.5 h-3.5 text-amber-400" />;
      case 'mld':
        return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="bg-[#0b1220] border border-slate-800 rounded p-3 font-mono text-xs space-y-3">
      {/* Header Strip */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 font-sans font-bold text-slate-100 text-xs">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>OCEAN RISK & HAZARD ASSESSMENT</span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px]">
          <button
            onClick={toggleRiskLayer}
            className={`px-2 py-0.5 rounded border transition-colors ${
              state.showRiskLayer
                ? 'bg-amber-950/80 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {state.showRiskLayer ? '3D HAZARD BEACONS ON' : 'BEACONS OFF'}
          </button>
          <span className={`px-1.5 py-0.5 rounded border font-semibold ${
            isLive ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300' : 'bg-slate-850 border-slate-750 text-slate-400'
          }`}>
            {isLive ? 'INCOIS REAL' : 'DEMO'}
          </span>
        </div>
      </div>

      {/* Overall Assessment Banner */}
      <div className={`p-2.5 rounded border ${badgeStyle.bg} ${badgeStyle.border} space-y-1.5`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">OVERALL HAZARD INDEX:</span>
            <span className={`text-xs font-bold px-2 py-0.2 rounded border ${badgeStyle.border} ${badgeStyle.text}`}>
              {currentRiskLevel}
            </span>
          </div>

          <div className="text-[10px] text-slate-300">
            {risk ? formatCoordinates(risk.latitude, risk.longitude) : '18.500°N, 88.500°E'}
          </div>
        </div>

        {/* Contributing Parameter & Rationale */}
        <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800/60 font-sans">
          <span className="font-mono text-[10px] text-slate-400 font-semibold uppercase">TRIGGER: </span>
          <span className="font-semibold text-slate-100">{risk?.contributing_parameter || 'Sea Surface Height (SSH)'}</span>
          {risk?.why_reason && (
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              {risk.why_reason}
            </p>
          )}
        </div>
      </div>

      {/* Parameter Factor Matrix */}
      {risk && risk.factors && risk.factors.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-semibold block">EVALUATED PHYSICAL PARAMETERS:</span>
          <div className="border border-slate-800 rounded divide-y divide-slate-850 overflow-hidden">
            {risk.factors.map((f) => {
              const fStyle = RISK_BADGE_STYLES[f.risk_level] || RISK_BADGE_STYLES.LOW;
              return (
                <div key={f.variable_key} className="flex items-center justify-between p-1.5 bg-slate-900/60 hover:bg-slate-900 text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-[140px]">
                    {getVariableIcon(f.variable_key)}
                    <span className="text-slate-300 truncate">{f.name}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-slate-200">{f.value !== null ? f.value : '—'}</span>{' '}
                    <span className="text-slate-400 text-[9px]">{f.unit}</span>
                  </div>

                  <div className="text-[9px] text-slate-400 truncate max-w-[120px] hidden sm:block">
                    {f.threshold_used}
                  </div>

                  <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${fStyle.border} ${fStyle.text}`}>
                    {f.risk_level}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decision-Support Scientific Disclaimer */}
      <div className="p-2 bg-slate-900/90 border border-slate-800 rounded flex items-start gap-1.5 text-[9px] text-slate-400 font-sans">
        <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-mono text-cyan-300 font-semibold">ADVISORY NOTE: </span>
          {RISK_DISCLAIMER}
        </div>
      </div>
    </div>
  );
};
