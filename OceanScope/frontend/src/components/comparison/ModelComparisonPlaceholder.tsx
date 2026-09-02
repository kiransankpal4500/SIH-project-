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
            {comp.profile_comparison.length} Colocated Depth Layers
          </span>
        </div>

        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Spatial Match */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[#64748B] text-xs block font-medium">Spatial Separation</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold text-[#172033]">{comp.distance_km}</span>
              <span className="text-xs text-[#64748B] font-medium">km</span>
            </div>
            <span className="text-[11px] text-[#16A34A] font-medium mt-0.5 block">Co-located grid cell</span>
          </div>

          {/* Temporal Match */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[#64748B] text-xs block font-medium">Time Offset</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-bold text-[#172033]">{comp.time_difference_hours}</span>
              <span className="text-xs text-[#64748B] font-medium">hrs</span>
            </div>
            <span className="text-[11px] text-[#0B84C6] font-medium mt-0.5 block">Synchronized timestep</span>
          </div>

          {/* Error Metrics */}
          <div className="p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
            <span className="text-[#64748B] text-xs block font-medium">Temperature Accuracy</span>
            <div className="flex items-center gap-3 mt-1.5 font-semibold text-xs">
              <div>
                <span className="text-[#64748B] font-normal text-[10px] block">BIAS</span>
                <span className="text-[#172033]">{comp.temp_bias != null ? `${comp.temp_bias > 0 ? '+' : ''}${comp.temp_bias.toFixed(3)}°C` : '—'}</span>
              </div>
              <div className="border-l border-[#CBD5E1] pl-3">
                <span className="text-[#64748B] font-normal text-[10px] block">RMSE</span>
                <span className="text-[#172033]">{comp.temp_rmse?.toFixed(3) ?? '—'}°C</span>
              </div>
              <div className="border-l border-[#CBD5E1] pl-3">
                <span className="text-[#64748B] font-normal text-[10px] block">MAE</span>
                <span className="text-[#172033]">{comp.temp_mae?.toFixed(3) ?? '—'}°C</span>
              </div>
            </div>
          </div>
        </div>

        {/* Variable Switcher Tabs */}
        <div className="flex items-center gap-2 border-b border-[#F1F5F9] pb-2">
          <button
            onClick={() => setChartVariable('temperature')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              chartVariable === 'temperature'
                ? 'bg-[#0B84C6] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9]'
            }`}
          >
            Temperature Validation
          </button>
          <button
            onClick={() => setChartVariable('salinity')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              chartVariable === 'salinity'
                ? 'bg-[#0B84C6] text-white shadow-sm'
                : 'text-[#64748B] hover:text-[#172033] hover:bg-[#F1F5F9]'
            }`}
          >
            Salinity Validation
          </button>
        </div>

        {/* Comparison Chart */}
        <ModelVsObsComparisonChart
          height={260}
          comparisonData={comp.profile_comparison}
          variable={chartVariable}
        />

        {/* High-Contrast Data Table */}
        <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-semibold text-[11px]">
                <tr>
                  <th className="px-3.5 py-2">Depth (m)</th>
                  <th className="px-3.5 py-2 text-right">HYCOM Model</th>
                  <th className="px-3.5 py-2 text-right">Argo In-Situ</th>
                  <th className="px-3.5 py-2 text-right">Difference (ΔT)</th>
                  <th className="px-3.5 py-2 text-right">HYCOM Salinity</th>
                  <th className="px-3.5 py-2 text-right">Argo Salinity</th>
                  <th className="px-3.5 py-2 text-right">Difference (ΔS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[#172033]">
                {comp.profile_comparison.map((row, i) => (
                  <tr key={i} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-3.5 py-2 font-medium text-[#172033]">{row.depth} m</td>
                    <td className="px-3.5 py-2 text-right font-medium">{row.model_temperature?.toFixed(2) ?? '—'} °C</td>
                    <td className="px-3.5 py-2 text-right font-medium">{row.observed_temperature?.toFixed(2) ?? '—'} °C</td>
                    <td className={`px-3.5 py-2 text-right font-bold ${
                      row.temperature_difference != null
                        ? row.temperature_difference > 0 ? 'text-[#DC2626]' : 'text-[#0B84C6]'
                        : 'text-[#94A3B8]'
                    }`}>
                      {row.temperature_difference != null ? (row.temperature_difference > 0 ? '+' : '') + row.temperature_difference.toFixed(3) : '—'}
                    </td>
                    <td className="px-3.5 py-2 text-right">{row.model_salinity?.toFixed(2) ?? '—'} PSU</td>
                    <td className="px-3.5 py-2 text-right">{row.observed_salinity?.toFixed(2) ?? '—'} PSU</td>
                    <td className={`px-3.5 py-2 text-right font-bold ${
                      row.salinity_difference != null
                        ? row.salinity_difference > 0 ? 'text-[#DC2626]' : 'text-[#0B84C6]'
                        : 'text-[#94A3B8]'
                    }`}>
                      {row.salinity_difference != null ? (row.salinity_difference > 0 ? '+' : '') + row.salinity_difference.toFixed(3) : '—'}
                    </td>
                  </tr>
                ))}
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
