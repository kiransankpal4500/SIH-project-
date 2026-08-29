import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { ModelObsComparisonItem } from '../../services/hycomApi';

interface ModelVsObsComparisonChartProps {
  height?: number;
  comparisonData?: ModelObsComparisonItem[];
  variable?: 'temperature' | 'salinity';
}

const mockComparisonData = [
  { depth: 0, hycomModel: 29.3, argoObservation: 29.1, delta: +0.2 },
  { depth: 10, hycomModel: 29.0, argoObservation: 28.9, delta: +0.1 },
  { depth: 25, hycomModel: 27.8, argoObservation: 27.4, delta: +0.4 },
  { depth: 50, hycomModel: 23.5, argoObservation: 23.1, delta: +0.4 },
  { depth: 100, hycomModel: 17.1, argoObservation: 17.5, delta: -0.4 },
  { depth: 200, hycomModel: 11.5, argoObservation: 11.2, delta: +0.3 },
  { depth: 500, hycomModel: 7.2, argoObservation: 7.4, delta: -0.2 },
  { depth: 1000, hycomModel: 4.7, argoObservation: 4.8, delta: -0.1 },
];

export const ModelVsObsComparisonChart: React.FC<ModelVsObsComparisonChartProps> = ({
  height = 280,
  comparisonData,
  variable = 'temperature',
}) => {
  const isReal = comparisonData && comparisonData.length > 0;
  const unit = variable === 'temperature' ? '°C' : 'PSU';

  const chartData = isReal
    ? comparisonData.map((item) => ({
        depth: item.depth,
        hycomModel: variable === 'temperature' ? item.model_temperature : item.model_salinity,
        argoObservation: variable === 'temperature' ? item.observed_temperature : item.observed_salinity,
        delta: variable === 'temperature' ? item.temperature_difference : item.salinity_difference,
      }))
    : mockComparisonData;

  const domain: [number, number] = variable === 'temperature' ? [0, 35] : [30, 38];

  return (
    <div className="space-y-1">
      {isReal && (
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="px-1.5 py-0.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">
            REAL INCOIS DATA
          </span>
          <span className="text-slate-400">
            {comparisonData.length} depth levels · {variable === 'temperature' ? 'Temperature' : 'Salinity'}
          </span>
        </div>
      )}
      <div style={{ height: `${height}px` }} className="w-full font-mono text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C2541" />
            <XAxis dataKey="depth" unit="m" stroke="#94A3B8" tick={{ fontSize: 11 }} />
            <YAxis domain={domain} unit={unit} stroke="#94A3B8" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B132B',
                borderColor: isReal ? '#10B981' : '#00B4D8',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#F1F5F9',
              }}
              formatter={(value: number, name: string) => [
                `${value?.toFixed(2)} ${unit}`,
                name,
              ]}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="hycomModel"
              name={`HYCOM Model (${unit})`}
              stroke="#00B4D8"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#00B4D8' }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="argoObservation"
              name={`Argo Observation (${unit})`}
              stroke="#10B981"
              strokeWidth={2.5}
              strokeDasharray="4 4"
              dot={{ r: 4, fill: '#10B981' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
