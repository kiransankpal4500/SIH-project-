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
import type { ModelObsComparisonItem, ModelObsComparisonResponse } from '../../services/hycomApi';

interface ModelVsObsComparisonChartProps {
  height?: number;
  comparison?: ModelObsComparisonResponse;
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
  comparison,
  comparisonData,
  variable = 'temperature',
}) => {
  const items = comparisonData || comparison?.profile_comparison || comparison?.levels;
  const isReal = items && items.length > 0;
  const unit = variable === 'temperature' ? '°C' : 'PSU';

  const chartData = isReal
    ? items.map((item) => ({
        depth: item.depth,
        depthValue: item.depth,
        hycomModel: variable === 'temperature' ? item.model_temperature : item.model_salinity,
        argoObservation: variable === 'temperature'
          ? (item.obs_temperature ?? item.observed_temperature)
          : (item.obs_salinity ?? item.observed_salinity),
        delta: variable === 'temperature'
          ? (item.temp_difference ?? item.temperature_difference)
          : (item.sal_difference ?? item.salinity_difference),
      }))
    : mockComparisonData.map(d => ({ ...d, depthValue: d.depth }));

  const valDomain: [number, number] = variable === 'temperature' ? [0, 35] : [30, 38];

  return (
    <div className="space-y-2">
      <div style={{ height: `${height}px` }} className="w-full text-xs font-sans">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="depthValue"
              unit="m"
              stroke="#64748B"
              tick={{ fontSize: 11, fill: '#64748B' }}
            />
            <YAxis
              domain={valDomain}
              unit={` ${unit}`}
              stroke="#64748B"
              tick={{ fontSize: 11, fill: '#64748B' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#172033',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
              }}
              formatter={(value: number, name: string) => [
                `${Number(value)?.toFixed(3)} ${unit}`,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{
                paddingTop: '10px',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="hycomModel"
              name={`HYCOM Forecast (${unit})`}
              stroke="#0B84C6"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#0B84C6' }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="argoObservation"
              name={`Argo In-Situ (${unit})`}
              stroke="#16A34A"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={{ r: 3.5, fill: '#16A34A' }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
