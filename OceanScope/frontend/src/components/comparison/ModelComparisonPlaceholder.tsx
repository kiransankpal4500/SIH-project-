import React, { useState } from 'react';
import { ModelVsObsComparisonChart } from '../charts/ModelVsObsComparisonChart';
import { useOceanContext } from '../../store/OceanContext';
import { GitCompareArrows, Loader, AlertTriangle, MapPin, Clock, Thermometer, Droplets, ArrowRight } from 'lucide-react';

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
      <div className="bg-[#0b1220] border border-slate-800 rounded p-3 font-mono text-xs space-y-3">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div>
            <div className="text-xs font-bold text-slate-100 font-sans flex items-center gap-1.5">
              <GitCompareArrows className="w-4 h-4 text-cyan-400" />
              INCOIS HYCOM MODEL VS. ARGO IN-SITU PROFILE
            </div>
            <div className="text-[10px] text-slate-400">
              Platform #{comp.platform_number} · Cycle #{comp.cycle_number} · Grid File: {comp.selected_file || 'RSMC_hycom_20260829.nc'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 rounded font-semibold">
              REAL DATA MATCHED
            </span>
          </div>
        </div>

        {/* Spatial, Temporal & Error Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* Spatial Match */}
          <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-1 text-[10px]">
            <div className="flex items-center gap-1 text-slate-400 font-semibold mb-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
              SPATIAL CO-LOCATION
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Observation:</span>
              <span className="text-emerald-300">{comp.observation_latitude.toFixed(3)}°N, {comp.observation_longitude.toFixed(3)}°E</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">HYCOM Grid:</span>
              <span className="text-cyan-300">{comp.model_latitude.toFixed(3)}°N, {comp.model_longitude.toFixed(3)}°E</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1 text-slate-300">
              <span>Haversine Separation:</span>
              <span className="text-amber-300 font-bold">{comp.distance_km} km</span>
            </div>
          </div>

          {/* Temporal Match */}
          <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-1 text-[10px]">
            <div className="flex items-center gap-1 text-slate-400 font-semibold mb-1">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              TEMPORAL MATCHING
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Observation Time:</span>
              <span className="text-emerald-300">{comp.observation_time?.slice(0, 16).replace('T', ' ') || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Model Timestep:</span>
              <span className="text-cyan-300">{comp.model_time?.slice(0, 16).replace('T', ' ') || 'N/A'}</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1 text-slate-300">
              <span>Offset Difference:</span>
              <span className="text-amber-300 font-bold">{comp.time_difference_hours} hrs</span>
            </div>
          </div>

          {/* Statistical Error Metrics */}
          <div className="bg-slate-900/90 border border-slate-800 rounded p-2.5 space-y-1 text-[10px]">
            <div className="flex items-center gap-1 text-slate-400 font-semibold mb-1">
              <GitCompareArrows className="w-3.5 h-3.5 text-cyan-400" />
              STATISTICAL ERROR
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Temp Bias (Mean Err):</span>
              <span className="text-red-300 font-bold">{comp.temp_bias != null ? `${comp.temp_bias > 0 ? '+' : ''}${comp.temp_bias.toFixed(3)} °C` : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Temp RMSE / MAE:</span>
              <span className="text-slate-200">{comp.temp_rmse?.toFixed(3) ?? 'N/A'} / {comp.temp_mae?.toFixed(3) ?? 'N/A'} °C</span>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1">
              <span className="text-slate-400">Salinity Bias:</span>
              <span className="text-cyan-300 font-bold">{comp.sal_bias != null ? `${comp.sal_bias > 0 ? '+' : ''}${comp.sal_bias.toFixed(3)} PSU` : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Variable Switcher */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setChartVariable('temperature')}
              className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${
                chartVariable === 'temperature'
                  ? 'bg-slate-800 border-red-500/40 text-red-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Temperature Comparison
            </button>
            <button
              onClick={() => setChartVariable('salinity')}
              className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${
                chartVariable === 'salinity'
                  ? 'bg-slate-800 border-cyan-500/40 text-cyan-300 font-semibold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Salinity Comparison
            </button>
          </div>

          <span className="text-[10px] text-slate-400">
            {comp.profile_comparison.length} Paired Depth Layers
          </span>
        </div>

        {/* Chart View */}
        <ModelVsObsComparisonChart
          height={260}
          comparisonData={comp.profile_comparison}
          variable={chartVariable}
        />

        {/* Numerical Delta Profile Table */}
        <div className="max-h-44 overflow-y-auto border border-slate-800 rounded">
          <table className="w-full text-[10px] font-mono">
            <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-2 py-1 text-left">Depth (m)</th>
                <th className="px-2 py-1 text-right">HYCOM T (°C)</th>
                <th className="px-2 py-1 text-right">Argo T (°C)</th>
                <th className="px-2 py-1 text-right">ΔT (°C)</th>
                <th className="px-2 py-1 text-right">HYCOM S (PSU)</th>
                <th className="px-2 py-1 text-right">Argo S (PSU)</th>
                <th className="px-2 py-1 text-right">ΔS (PSU)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {comp.profile_comparison.map((row, i) => (
                <tr key={i} className="hover:bg-slate-900/60">
                  <td className="px-2 py-1 text-slate-200">{row.depth}</td>
                  <td className="px-2 py-1 text-right text-cyan-300">{row.model_temperature?.toFixed(2) ?? '—'}</td>
                  <td className="px-2 py-1 text-right text-emerald-300">{row.observed_temperature?.toFixed(2) ?? '—'}</td>
                  <td className={`px-2 py-1 text-right font-bold ${
                    row.temperature_difference != null
                      ? row.temperature_difference > 0 ? 'text-red-400' : 'text-cyan-400'
                      : 'text-slate-500'
                  }`}>
                    {row.temperature_difference != null ? (row.temperature_difference > 0 ? '+' : '') + row.temperature_difference.toFixed(3) : '—'}
                  </td>
                  <td className="px-2 py-1 text-right text-cyan-300">{row.model_salinity?.toFixed(2) ?? '—'}</td>
                  <td className="px-2 py-1 text-right text-emerald-300">{row.observed_salinity?.toFixed(2) ?? '—'}</td>
                  <td className={`px-2 py-1 text-right font-bold ${
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
    <div className="bg-[#0b1220] border border-slate-800 rounded p-4 font-mono text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="text-xs font-bold text-slate-100 font-sans flex items-center gap-1.5">
          <GitCompareArrows className="w-4 h-4 text-cyan-400" />
          MODEL VS. OBSERVATION CROSS-VALIDATION
        </div>
        {state.hycomLoading && (
          <span className="text-cyan-300 flex items-center gap-1 text-[11px]">
            <Loader className="w-3 h-3 animate-spin" /> Fetching NetCDF grid...
          </span>
        )}
      </div>

      {state.hycomError && (
        <div className="flex items-center gap-2 text-amber-300 text-[11px] bg-amber-950/40 border border-amber-500/40 p-2 rounded">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{state.hycomError}</span>
        </div>
      )}

      {state.selectedPlatformId ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-slate-300 text-xs">
            Argo Float <span className="font-bold text-emerald-400">#{state.selectedPlatformId}</span> selected.
          </p>
          <button
            onClick={handleCompare}
            disabled={state.hycomLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded text-xs transition-colors"
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            <span>Execute Model vs. Float #{state.selectedPlatformId} Validation</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-slate-400 text-[11px] py-1 text-center">
            Select any active Argo float on the 3D globe to run real-time spatial and vertical profile cross-validation against the INCOIS HYCOM model grid.
          </div>
          <ModelVsObsComparisonChart height={240} />
        </div>
      )}
    </div>
  );
};
