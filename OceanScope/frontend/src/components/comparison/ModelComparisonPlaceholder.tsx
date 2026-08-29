import React, { useState } from 'react';
import { Card } from '../common/Card';
import { ModelVsObsComparisonChart } from '../charts/ModelVsObsComparisonChart';
import { Badge } from '../common/Badge';
import { useOceanContext } from '../../store/OceanContext';
import { GitCompareArrows, Loader, AlertTriangle, MapPin, Clock, Thermometer, Droplets } from 'lucide-react';

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

  // Real comparison loaded
  if (comp) {
    return (
      <div className="space-y-3">
        {/* Header Card */}
        <Card
          title="INCOIS HYCOM Model vs. Argo Float Observation"
          subtitle={`Float #${comp.platform_number} · Cycle #${comp.cycle_number} — Real Data Comparison`}
          action={
            <div className="flex items-center gap-1.5">
              <Badge variant="emerald">REAL DATA</Badge>
              <Badge variant="cyan">{comp.source_model}</Badge>
            </div>
          }
        >
          {/* Matching Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {/* Spatial Matching */}
            <div className="bg-ocean-900/60 border border-ocean-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-2">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                SPATIAL MATCHING
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Observation:</span>
                  <span className="text-emerald-300">{comp.observation_latitude.toFixed(2)}°N, {comp.observation_longitude.toFixed(2)}°E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Model Grid:</span>
                  <span className="text-cyan-300">{comp.model_latitude.toFixed(2)}°N, {comp.model_longitude.toFixed(2)}°E</span>
                </div>
                <div className="flex justify-between border-t border-ocean-800 pt-1 mt-1">
                  <span className="text-slate-400">Distance:</span>
                  <span className="text-amber-300 font-bold">{comp.distance_km} km</span>
                </div>
              </div>
            </div>

            {/* Time Matching */}
            <div className="bg-ocean-900/60 border border-ocean-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                TIME MATCHING
              </div>
              <div className="space-y-1 text-[11px] font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Observation:</span>
                  <span className="text-emerald-300">{comp.observation_time?.slice(0, 10) || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Model Time:</span>
                  <span className="text-cyan-300">{comp.model_time?.slice(0, 10) || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-t border-ocean-800 pt-1 mt-1">
                  <span className="text-slate-400">Offset:</span>
                  <span className="text-amber-300 font-bold">{comp.time_difference_hours} hrs</span>
                </div>
              </div>
            </div>

            {/* Statistical Metrics */}
            <div className="bg-ocean-900/60 border border-ocean-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mb-2">
                <GitCompareArrows className="w-3.5 h-3.5 text-cyan-400" />
                ERROR METRICS
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] font-mono">
                <div className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-red-400" />
                  <span className="text-slate-400">T Bias:</span>
                </div>
                <span className="text-right text-red-300 font-bold">{comp.temp_bias?.toFixed(3) ?? 'N/A'}°C</span>

                <div className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-red-400" />
                  <span className="text-slate-400">T RMSE:</span>
                </div>
                <span className="text-right text-red-300 font-bold">{comp.temp_rmse?.toFixed(3) ?? 'N/A'}°C</span>

                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <span className="text-slate-400">S Bias:</span>
                </div>
                <span className="text-right text-blue-300 font-bold">{comp.sal_bias?.toFixed(3) ?? 'N/A'} PSU</span>

                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <span className="text-slate-400">S RMSE:</span>
                </div>
                <span className="text-right text-blue-300 font-bold">{comp.sal_rmse?.toFixed(3) ?? 'N/A'} PSU</span>
              </div>
            </div>
          </div>

          {/* Variable Tabs + Chart */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setChartVariable('temperature')}
              className={`px-3 py-1 text-[11px] font-mono rounded border transition-colors ${
                chartVariable === 'temperature'
                  ? 'bg-red-500/20 border-red-500/50 text-red-300'
                  : 'bg-ocean-900 border-ocean-700 text-slate-400 hover:text-white'
              }`}
            >
              Temperature
            </button>
            <button
              onClick={() => setChartVariable('salinity')}
              className={`px-3 py-1 text-[11px] font-mono rounded border transition-colors ${
                chartVariable === 'salinity'
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                  : 'bg-ocean-900 border-ocean-700 text-slate-400 hover:text-white'
              }`}
            >
              Salinity
            </button>
          </div>
          <ModelVsObsComparisonChart
            height={280}
            comparisonData={comp.profile_comparison}
            variable={chartVariable}
          />

          {/* Depth Profile Table */}
          <div className="mt-3 max-h-48 overflow-y-auto border border-ocean-800 rounded-lg">
            <table className="w-full text-[11px] font-mono">
              <thead className="sticky top-0 bg-ocean-900 text-slate-400">
                <tr>
                  <th className="px-2 py-1.5 text-left">Depth (m)</th>
                  <th className="px-2 py-1.5 text-right">Model T (°C)</th>
                  <th className="px-2 py-1.5 text-right">Obs T (°C)</th>
                  <th className="px-2 py-1.5 text-right">ΔT (°C)</th>
                  <th className="px-2 py-1.5 text-right">Model S (PSU)</th>
                  <th className="px-2 py-1.5 text-right">Obs S (PSU)</th>
                  <th className="px-2 py-1.5 text-right">ΔS (PSU)</th>
                </tr>
              </thead>
              <tbody>
                {comp.profile_comparison.map((row, i) => (
                  <tr key={i} className="border-t border-ocean-850 hover:bg-ocean-900/50">
                    <td className="px-2 py-1 text-white">{row.depth}</td>
                    <td className="px-2 py-1 text-right text-cyan-300">{row.model_temperature?.toFixed(2) ?? '—'}</td>
                    <td className="px-2 py-1 text-right text-emerald-300">{row.observed_temperature?.toFixed(2) ?? '—'}</td>
                    <td className={`px-2 py-1 text-right font-bold ${
                      row.temperature_difference != null
                        ? row.temperature_difference > 0 ? 'text-red-400' : 'text-blue-400'
                        : 'text-slate-500'
                    }`}>
                      {row.temperature_difference != null ? (row.temperature_difference > 0 ? '+' : '') + row.temperature_difference.toFixed(3) : '—'}
                    </td>
                    <td className="px-2 py-1 text-right text-cyan-300">{row.model_salinity?.toFixed(2) ?? '—'}</td>
                    <td className="px-2 py-1 text-right text-emerald-300">{row.observed_salinity?.toFixed(2) ?? '—'}</td>
                    <td className={`px-2 py-1 text-right font-bold ${
                      row.salinity_difference != null
                        ? row.salinity_difference > 0 ? 'text-red-400' : 'text-blue-400'
                        : 'text-slate-500'
                    }`}>
                      {row.salinity_difference != null ? (row.salinity_difference > 0 ? '+' : '') + row.salinity_difference.toFixed(3) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  // No comparison yet — show action prompt or loading
  return (
    <Card
      title="Numerical Ocean Model vs. In-Situ Argo Observation Comparison"
      subtitle="INCOIS HYCOM Model vs. Real Argo Float Telemetry"
      action={
        state.hycomLoading ? (
          <Badge variant="cyan">
            <Loader className="w-3 h-3 animate-spin inline mr-1" />
            Loading...
          </Badge>
        ) : state.selectedPlatformId ? (
          <button
            onClick={handleCompare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-600 text-white text-[11px] font-mono rounded-md border border-emerald-500/50 transition-colors"
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            Compare HYCOM vs Float #{state.selectedPlatformId}
          </button>
        ) : (
          <Badge variant="emerald">BIAS DELTA: +0.25°C AVG</Badge>
        )
      }
    >
      {state.hycomError && (
        <div className="flex items-center gap-2 text-amber-400 text-[11px] font-mono bg-amber-500/10 border border-amber-500/30 px-3 py-2 rounded-md mb-3">
          <AlertTriangle className="w-4 h-4" />
          {state.hycomError}
        </div>
      )}

      {state.selectedPlatformId && !state.hycomLoading && (
        <div className="text-center py-6 text-slate-400 text-sm font-mono">
          <GitCompareArrows className="w-8 h-8 mx-auto mb-2 text-cyan-500/50" />
          <p>Click "Compare HYCOM vs Float #{state.selectedPlatformId}" to run</p>
          <p className="text-[11px] mt-1">real INCOIS HYCOM NetCDF model vs. Argo observation comparison</p>
        </div>
      )}

      {!state.selectedPlatformId && (
        <>
          <div className="text-center py-4 text-slate-400 text-[11px] font-mono mb-2">
            <p>Select an Argo float from the 3D globe (enable LIVE mode) to compare with HYCOM model data</p>
          </div>
          <ModelVsObsComparisonChart height={280} />
        </>
      )}
    </Card>
  );
};
