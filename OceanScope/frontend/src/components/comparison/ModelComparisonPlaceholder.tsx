import React, { useState } from 'react';
import { ModelVsObsComparisonChart } from '../charts/ModelVsObsComparisonChart';
import { useOceanContext } from '../../store/OceanContext';
import { Loader, AlertTriangle } from 'lucide-react';

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
      <div className="space-y-4 font-sans text-xs text-slate-300 py-1">
        {/* Header */}
        <div className="flex items-baseline justify-between border-b border-slate-800/80 pb-2">
          <span className="text-xs font-medium text-slate-200">
            HYCOM vs. Argo — Platform #{comp.platform_number}, Cycle #{comp.cycle_number}
          </span>
          <span className="text-[11px] text-slate-400">
            {comp.profile_comparison.length} depth layers
          </span>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
          {/* Spatial Match */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px] block">Spatial Separation</span>
            <span className="text-slate-100 font-medium text-sm">{comp.distance_km} km</span>
          </div>

          {/* Temporal Match */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px] block">Time Offset</span>
            <span className="text-slate-100 font-medium text-sm">{comp.time_difference_hours} hrs</span>
          </div>

          {/* Error Metrics */}
          <div className="space-y-1">
            <span className="text-slate-400 text-[11px] block">Temperature Error</span>
            <div className="flex gap-3 text-xs">
              <span>
                <span className="text-slate-400">Bias </span>
                <span className="text-slate-100 font-medium font-mono">
                  {comp.temp_bias != null ? `${comp.temp_bias > 0 ? '+' : ''}${comp.temp_bias.toFixed(3)} °C` : '—'}
                </span>
              </span>
              <span>
                <span className="text-slate-400">RMSE </span>
                <span className="text-slate-100 font-medium font-mono">
                  {comp.temp_rmse?.toFixed(3) ?? '—'} °C
                </span>
              </span>
              <span>
                <span className="text-slate-400">MAE </span>
                <span className="text-slate-100 font-medium font-mono">
                  {comp.temp_mae?.toFixed(3) ?? '—'} °C
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Variable Switcher */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartVariable('temperature')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              chartVariable === 'temperature'
                ? 'bg-slate-800 text-slate-100 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Temperature
          </button>
          <button
            onClick={() => setChartVariable('salinity')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              chartVariable === 'salinity'
                ? 'bg-slate-800 text-slate-100 font-medium'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Salinity
          </button>
        </div>

        {/* Chart */}
        <ModelVsObsComparisonChart
          height={240}
          comparisonData={comp.profile_comparison}
          variable={chartVariable}
        />

        {/* Compact Data Table */}
        <div className="max-h-40 overflow-y-auto">
          <table className="w-full text-[11px] font-mono text-slate-300">
            <thead className="sticky top-0 bg-[#0b101d] text-slate-400">
              <tr>
                <th className="px-2 py-1 text-left font-normal">Depth (m)</th>
                <th className="px-2 py-1 text-right font-normal">HYCOM T (°C)</th>
                <th className="px-2 py-1 text-right font-normal">Argo T (°C)</th>
                <th className="px-2 py-1 text-right font-normal">ΔT (°C)</th>
                <th className="px-2 py-1 text-right font-normal">HYCOM S (PSU)</th>
                <th className="px-2 py-1 text-right font-normal">Argo S (PSU)</th>
                <th className="px-2 py-1 text-right font-normal">ΔS (PSU)</th>
              </tr>
            </thead>
            <tbody>
              {comp.profile_comparison.map((row, i) => (
                <tr key={i} className="border-t border-slate-800/40 hover:bg-slate-900/40">
                  <td className="px-2 py-1 text-slate-200">{row.depth}</td>
                  <td className="px-2 py-1 text-right">{row.model_temperature?.toFixed(2) ?? '—'}</td>
                  <td className="px-2 py-1 text-right">{row.observed_temperature?.toFixed(2) ?? '—'}</td>
                  <td className={`px-2 py-1 text-right font-medium ${
                    row.temperature_difference != null
                      ? row.temperature_difference > 0 ? 'text-red-400' : 'text-cyan-400'
                      : 'text-slate-500'
                  }`}>
                    {row.temperature_difference != null ? (row.temperature_difference > 0 ? '+' : '') + row.temperature_difference.toFixed(3) : '—'}
                  </td>
                  <td className="px-2 py-1 text-right">{row.model_salinity?.toFixed(2) ?? '—'}</td>
                  <td className="px-2 py-1 text-right">{row.observed_salinity?.toFixed(2) ?? '—'}</td>
                  <td className={`px-2 py-1 text-right font-medium ${
                    row.salinity_difference != null
                      ? row.salinity_difference > 0 ? 'text-red-400' : 'text-cyan-400'
                      : 'text-slate-500'
                  }`}>
                    {row.salinity_difference != null ? (row.salinity_difference > 0 ? '+' : '') + row.salinity_difference.toFixed(3) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Initial / Unselected State
  return (
    <div className="space-y-3 font-sans text-xs text-slate-300 py-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-200">
          Model vs. Observation
        </span>
        {state.hycomLoading && (
          <span className="text-slate-400 flex items-center gap-1 text-[11px]">
            <Loader className="w-3 h-3 animate-spin" /> Loading...
          </span>
        )}
      </div>

      {state.hycomError && (
        <div className="flex items-center gap-2 text-amber-400 text-xs py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{state.hycomError}</span>
        </div>
      )}

      {state.selectedPlatformId ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-slate-300 text-xs">
            Argo Float <span className="font-medium text-slate-100">#{state.selectedPlatformId}</span> selected.
          </p>
          <button
            onClick={handleCompare}
            disabled={state.hycomLoading}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium rounded text-xs transition-colors"
          >
            Run Comparison
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-400 text-xs text-center py-2">
            Select an Argo float on the globe to cross-validate against INCOIS HYCOM model data.
          </p>
          <ModelVsObsComparisonChart height={220} />
        </div>
      )}
    </div>
  );
};
