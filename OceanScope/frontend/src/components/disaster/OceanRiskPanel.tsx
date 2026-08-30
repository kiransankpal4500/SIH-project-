import React from 'react';
import { useOceanContext } from '../../store/OceanContext';
import { RISK_DISCLAIMER } from '../../config/riskConfig';
import { ShieldAlert, Info } from 'lucide-react';
import { formatCoordinates } from '../../utils/formatters';

export const OceanRiskPanel: React.FC = () => {
  const { state } = useOceanContext();
  const risk = state.locationRisk;

  const currentRiskLevel = risk?.overall_risk || 'LOW';

  const riskColor =
    currentRiskLevel === 'HIGH' || currentRiskLevel === 'CRITICAL'
      ? 'text-red-400'
      : currentRiskLevel === 'MODERATE'
      ? 'text-amber-400'
      : 'text-emerald-400';

  return (
    <div className="space-y-3 font-sans text-xs text-slate-300 py-1">
      {/* Risk Level & Target Location */}
      <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Risk Assessment:</span>
          <span className={`text-sm font-bold tracking-wide ${riskColor}`}>
            {currentRiskLevel}
          </span>
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          {risk ? formatCoordinates(risk.latitude, risk.longitude) : '18.500°N, 88.500°E'}
        </div>
      </div>

      {/* Rationale & Trigger */}
      <div className="space-y-1">
        <div className="text-slate-400 text-[11px]">
          Trigger: <span className="text-slate-200 font-medium">{risk?.contributing_parameter || 'Current Speed'}</span>
        </div>
        {risk?.why_reason && (
          <p className="text-slate-400 text-xs leading-relaxed">
            {risk.why_reason}
          </p>
        )}
      </div>

      {/* Evaluated Physical Parameters */}
      {risk && risk.factors && risk.factors.length > 0 && (
        <div className="space-y-1 pt-1">
          <span className="text-slate-400 text-[11px] font-medium block">Monitored Parameters</span>
          <div className="space-y-1">
            {risk.factors.map((f) => (
              <div
                key={f.variable_key}
                className="flex items-center justify-between py-1 px-2 rounded bg-slate-900/60 text-xs"
              >
                <span className="text-slate-300">{f.name}</span>
                <span className="font-mono text-slate-200">
                  {f.value !== null ? `${f.value} ${f.unit}` : '—'}
                </span>
                <span className="text-slate-400 font-mono text-[11px] hidden sm:inline">
                  Threshold: {f.threshold_used}
                </span>
                <span
                  className={`text-[10px] font-semibold uppercase ${
                    f.risk_level === 'HIGH' || f.risk_level === 'CRITICAL'
                      ? 'text-red-400'
                      : f.risk_level === 'MODERATE'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {f.risk_level}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advisory Note */}
      <div className="text-[11px] text-slate-500 pt-1 flex items-start gap-1">
        <Info className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
        <span>{RISK_DISCLAIMER}</span>
      </div>
    </div>
  );
};

