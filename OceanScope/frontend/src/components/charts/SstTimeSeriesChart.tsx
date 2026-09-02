import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface SstTimeSeriesChartProps {
  height?: number;
}

const mockSstTimeline = [
  { date: 'Aug 22', observed: 27.2, baseline: 27.0, anomaly: 0.2 },
  { date: 'Aug 23', observed: 27.5, baseline: 27.1, anomaly: 0.4 },
  { date: 'Aug 24', observed: 28.1, baseline: 27.1, anomaly: 1.0 },
  { date: 'Aug 25', observed: 28.8, baseline: 27.2, anomaly: 1.6 },
  { date: 'Aug 26', observed: 29.4, baseline: 27.2, anomaly: 2.2 },
  { date: 'Aug 27', observed: 29.6, baseline: 27.3, anomaly: 2.3 },
  { date: 'Aug 28', observed: 29.1, baseline: 27.3, anomaly: 1.8 },
];

export const SstTimeSeriesChart: React.FC<SstTimeSeriesChartProps> = ({ height = 300 }) => {
  return (
    <div style={{ height: `${height}px` }} className="w-full text-xs font-sans pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={mockSstTimeline} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
          <defs>
            <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#DC2626" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#DC2626" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
          <XAxis dataKey="date" stroke="#64748B" tick={{ fontSize: 11, fill: '#64748B' }} />
          <YAxis domain={[25, 31]} unit="°C" stroke="#64748B" tick={{ fontSize: 11, fill: '#64748B' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#172033',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
            }}
          />
          <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} />
          <Area
            type="monotone"
            dataKey="observed"
            name="Observed SST (°C)"
            stroke="#DC2626"
            fillOpacity={1}
            fill="url(#colorTemp)"
            strokeWidth={2.5}
          />
          <Line
            type="monotone"
            dataKey="baseline"
            name="30y Climatological Mean (°C)"
            stroke="#64748B"
            strokeDasharray="4 4"
            strokeWidth={1.75}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
