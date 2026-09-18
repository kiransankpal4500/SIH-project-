/**
 * Model vs. In-Situ Observation Validation View
 * Renders statistical error metrics (Bias, RMSE, MAE) and dual-profile overlay comparisons.
 */

import React, { useState } from 'react';
import { ModelVsObsComparisonChart } from '../charts/ModelVsObsComparisonChart';
import { useOceanContext } from '../../store/OceanContext';
import { Loader, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const ModelComparisonPlaceholder: React.FC = () => {
  const { state, fetchHycomComparison } = useOceanContext();
  const [chartVariable, setChartVariable] = useState<'temperature' | 'salinity'>('temperature');
  const comp = state.hycomComparison;

  const handleCompare = () => {
    if (state.selectedPlatformId) {
      const cycle = state.selectedLiveArgoProfile?.cycle_number || 1;
      fetchHycomComparison(state.selectedPlatformId, cycle);
    }
  };

  if (comp) {
    const profileComparison = comp.profile_comparison || comp.levels || [];

    return (
      <div className="space-y-5 font-sans text-xs text-[#172033] py-2">
        {/* Header Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#F1F5F9] pb-3 gap-2">
          <div>
            <span className="text-sm font-bold text-[#172033] block">
              HYCOM Forecast Model vs. Argo In-Situ Observation
            </span>
            <span className="text-xs text-[#64748B]">
              Platform #{comp.platform_number} · Cycle #{comp.cycle_number}
            </span>
          </div>
          <span className="px-2.5 py-1 bg-[#F1F5F9] border border-[#E2E8F0] rounded-md text-xs font-semibold text-[#475569]">
            {profileComparison.length} Colocated Depth Layers
          </span>
        </div>

        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Spatial Match */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[#64748B] text-xs block font-medium">Spatial Separation</span>
            <span className="text-sm font-bold text-[#172033] block mt-0.5">
              {comp.distance_km?.toFixed(1) ?? '—'} km
            </span>
            <span className="text-[#94A3B8] text-[10px]">Distance between float & grid cell</span>
          </div>

          {/* Temporal Match */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[#64748B] text-xs block font-medium">Temporal Offset</span>
            <span className="text-sm font-bold text-[#172033] block mt-0.5">
              {comp.time_difference_hours != null ? `${comp.time_difference_hours.toFixed(1)} hrs` : '—'}
            </span>
            <span className="text-[#94A3B8] text-[10px]">Time delta between observations</span>
          </div>

          {/* Overall Bias */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[#64748B] text-xs block font-medium">Mean Temperature Bias</span>
            <span className={`text-sm font-bold block mt-0.5 ${
              (comp.temp_bias ?? comp.bias ?? 0) > 0 ? 'text-[#DC2626]' : 'text-[#0B84C6]'
            }`}>
              {(comp.temp_bias ?? comp.bias) != null ? `${(comp.temp_bias ?? comp.bias)! > 0 ? '+' : ''}${(comp.temp_bias ?? comp.bias)!.toFixed(3)} °C` : '—'}
            </span>
            <span className="text-[#94A3B8] text-[10px]">Model over/under-estimation</span>
          </div>
        </div>

        {/* Statistical Metrics Strip */}
        <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-3.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div>
              <span className="text-[#1E40AF] text-[10px] uppercase font-bold block tracking-wider">Temp RMSE</span>
              <span className="text-sm font-bold text-[#1E3A8A]">
                {comp.temp_rmse?.toFixed(3) ?? comp.rmse?.toFixed(3) ?? '—'} °C
              </span>
            </div>
            <div>
              <span className="text-[#1E40AF] text-[10px] uppercase font-bold block tracking-wider">Temp MAE</span>
              <span className="text-sm font-bold text-[#1E3A8A]">
                {comp.temp_mae?.toFixed(3) ?? comp.mae?.toFixed(3) ?? '—'} °C
              </span>
            </div>
            <div>
              <span className="text-[#1E40AF] text-[10px] uppercase font-bold block tracking-wider">Salinity Bias</span>
              <span className="text-sm font-bold text-[#1E3A8A]">
                {comp.sal_bias != null ? `${comp.sal_bias > 0 ? '+' : ''}${comp.sal_bias.toFixed(3)} PSU` : '—'}
              </span>
            </div>
            <div>
              <span className="text-[#1E40AF] text-[10px] uppercase font-bold block tracking-wider">Active File</span>
              <span className="text-[11px] font-mono font-medium text-[#1E3A8A] truncate block" title={comp.selected_file}>
                {comp.selected_file?.split('/').pop() || 'Remote HYCOM'}
              </span>
            </div>
          </div>
        </div>

        {/* Dual Chart Toggle & Chart View */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#172033]">Vertical Profile Comparison</span>
            <div className="flex bg-[#F1F5F9] p-0.5 rounded-lg border border-[#E2E8F0]">
              <button
                onClick={() => setChartVariable('temperature')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  chartVariable === 'temperature'
                    ? 'bg-white text-[#0B84C6] shadow-sm'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                Temperature
              </button>
              <button
                onClick={() => setChartVariable('salinity')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  chartVariable === 'salinity'
                    ? 'bg-white text-[#0B84C6] shadow-sm'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                Salinity
              </button>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-3">
            <ModelVsObsComparisonChart comparison={comp} variable={chartVariable} />
          </div>
        </div>

        {/* Numerical Tabular Breakdown */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#172033] block">Layer-by-Layer Numerical Breakdown</span>
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl max-h-56">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F8FAFC] text-[#64748B] font-semibold sticky top-0 border-b border-[#E2E8F0]">
                <tr>
                  <th className="px-3.5 py-2">Depth</th>
                  <th className="px-3.5 py-2 text-right">HYCOM Temp</th>
                  <th className="px-3.5 py-2 text-right">Argo Temp</th>
                  <th className="px-3.5 py-2 text-right">Difference (ΔT)</th>
                  <th className="px-3.5 py-2 text-right">HYCOM Salinity</th>
                  <th className="px-3.5 py-2 text-right">Argo Salinity</th>
                  <th className="px-3.5 py-2 text-right">Difference (ΔS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[#172033]">
                {profileComparison.map((row, i) => {
                  const tempDiff = row.temp_difference ?? row.temperature_difference;
                  const salDiff = row.sal_difference ?? row.salinity_difference;
                  const obsTemp = row.obs_temperature ?? row.observed_temperature;
                  const obsSal = row.obs_salinity ?? row.observed_salinity;

                  return (
                    <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-3.5 py-2 font-medium text-[#172033]">{row.depth} m</td>
                      <td className="px-3.5 py-2 text-right font-medium">{row.model_temperature?.toFixed(2) ?? '—'} °C</td>
                      <td className="px-3.5 py-2 text-right font-medium">{obsTemp?.toFixed(2) ?? '—'} °C</td>
                      <td className={`px-3.5 py-2 text-right font-bold ${
                        tempDiff != null
                          ? tempDiff > 0 ? 'text-[#DC2626]' : 'text-[#0B84C6]'
                          : 'text-[#94A3B8]'
                      }`}>
                        {tempDiff != null ? (tempDiff > 0 ? '+' : '') + tempDiff.toFixed(3) : '—'}
                      </td>
                      <td className="px-3.5 py-2 text-right">{row.model_salinity?.toFixed(2) ?? '—'} PSU</td>
                      <td className="px-3.5 py-2 text-right">{obsSal?.toFixed(2) ?? '—'} PSU</td>
                      <td className={`px-3.5 py-2 text-right font-bold ${
                        salDiff != null
                          ? salDiff > 0 ? 'text-[#DC2626]' : 'text-[#0B84C6]'
                          : 'text-[#94A3B8]'
                      }`}>
                        {salDiff != null ? (salDiff > 0 ? '+' : '') + salDiff.toFixed(3) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Initial / Prompt State
  return (
    <div className="space-y-4 font-sans text-xs text-[#172033] py-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#172033]">
          Numerical Model vs. In-Situ Observation
        </span>
        {state.hycomLoading && (
          <span className="text-[#0B84C6] flex items-center gap-1.5 text-xs font-medium">
            <Loader className="w-3.5 h-3.5 animate-spin" /> Querying HYCOM NetCDF...
          </span>
        )}
      </div>

      {state.hycomError && (
        <div className="flex items-center gap-2 text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] p-3 rounded-lg text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{state.hycomError}</span>
        </div>
      )}

      {state.selectedPlatformId ? (
        <div className="text-center py-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
          <div className="flex items-center justify-center gap-2 text-sm text-[#172033]">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>Argo Float <strong className="text-[#0B84C6]">#{state.selectedPlatformId}</strong> is selected and ready for cross-validation.</span>
          </div>
          <button
            onClick={handleCompare}
            disabled={state.hycomLoading}
            className="inline-flex items-center gap-2 px-5 py-2 bg-[#0B84C6] hover:bg-[#085A8A] text-white font-semibold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50"
          >
            <span>Run Model Comparison</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-center text-xs text-[#64748B]">
            Select an active Argo observation point on the 3D globe to execute real-time statistical cross-validation against collocated INCOIS HYCOM forecasts.
          </div>
          <ModelVsObsComparisonChart height={220} />
        </div>
      )}
    </div>
  );
};
