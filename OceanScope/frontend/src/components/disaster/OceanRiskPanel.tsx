import React from 'react';
import { useOceanContext } from '../../store/OceanContext';
import { RISK_DISCLAIMER } from '../../config/riskConfig';
import { ShieldAlert, Info, MapPin } from 'lucide-react';
import { formatCoordinates } from '../../utils/formatters';

export const OceanRiskPanel: React.FC = () => {
  const { state } = useOceanContext();
  const risk = state.locationRisk;

  const currentRiskLevel = risk?.overall_risk || 'LOW';

  const riskBadgeStyle =
    currentRiskLevel === 'HIGH' || currentRiskLevel === 'CRITICAL'
      ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]'
      : currentRiskLevel === 'MODERATE'
      ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
      : 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]';

  return (
    <div className="space-y-4 font-sans text-xs text-[#172033] py-2">
      {/* Risk Level & Target Location */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F1F5F9] pb-3 gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-[#64748B] font-medium">Risk Assessment:</span>
          <span className={`px-2.5 py-0.5 rounded-md border text-xs font-bold uppercase tracking-wide ${riskBadgeStyle}`}>
            {currentRiskLevel} RISK
          </span>
        </div>

        <div className="text-[#64748B] text-xs flex items-center gap-1 font-medium">
          <MapPin className="w-3.5 h-3.5 text-[#0B84C6]" />
          <span>{risk ? formatCoordinates(risk.latitude, risk.longitude) : '18.50° N, 88.50° E'}</span>
        </div>
      </div>

      {/* Rationale & Trigger */}
      <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1.5">
        <div className="text-xs text-[#64748B]">
          Contributing Indicator: <strong className="text-[#172033]">{risk?.contributing_parameter || 'Current Speed'}</strong>
        </div>
        {risk?.why_reason && (
          <p className="text-xs text-[#475569] leading-relaxed">
            {risk.why_reason}
          </p>
        )}
      </div>

      {/* Evaluated Physical Parameters */}
      {risk && risk.factors && risk.factors.length > 0 && (
        <div className="space-y-2 pt-1">
          <span className="text-xs font-semibold text-[#172033] block">Evaluated Oceanographic Thresholds</span>
          <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
            <div className="divide-y divide-[#F1F5F9]">
              {risk.factors.map((f) => (
                <div
                  key={f.variable_key}
                  className="flex items-center justify-between py-2.5 px-3.5 bg-[#FFFFFF] hover:bg-[#F8FAFC] text-xs transition-colors"
                >
                  <span className="font-medium text-[#172033]">{f.name}</span>
                  <span className="font-semibold text-[#172033]">
                    {f.value !== null ? `${f.value} ${f.unit}` : '—'}
                  </span>
                  <span className="text-[#64748B] text-[11px] hidden sm:inline">
                    Threshold: {f.threshold_used}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                      f.risk_level === 'HIGH' || f.risk_level === 'CRITICAL'
                        ? 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]'
                        : f.risk_level === 'MODERATE'
                        ? 'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A]'
                        : 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]'
                    }`}
                  >
                    {f.risk_level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Advisory Note */}
      <div className="text-[11px] text-[#64748B] pt-1 flex items-start gap-1.5 bg-[#F1F5F9] p-3 rounded-lg border border-[#E2E8F0]">
        <Info className="w-4 h-4 text-[#0B84C6] shrink-0 mt-0.5" />
        <span className="leading-relaxed">{RISK_DISCLAIMER}</span>
      </div>
    </div>
  );
};

