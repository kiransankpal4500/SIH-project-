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
import { MOCK_PROFILE } from '../../data/mock/oceanMockData';
import { useOceanContext } from '../../store/OceanContext';

interface DepthProfileChartProps {
  height?: number;
}

export const DepthProfileChart: React.FC<DepthProfileChartProps> = ({ height = 300 }) => {
  const { state } = useOceanContext();
  const liveProfile = state.selectedLiveArgoProfile;

  // Format profile data: Use live INCOIS profile if available, otherwise mock profile
  const chartData = liveProfile && liveProfile.profile.length > 0
    ? liveProfile.profile.map((level) => ({
        depth: `${level.pressure} dbar`,
        depthValue: level.pressure,
        temperature: level.temperature,
        salinity: level.salinity,
      }))
    : MOCK_PROFILE.depthLevels.map((depth, idx) => ({
        depth: `${depth}m`,
        depthValue: depth,
        temperature: MOCK_PROFILE.temperatureProfile[idx],
        salinity: MOCK_PROFILE.salinityProfile[idx],
      }));

  return (
    <div className="space-y-3 pt-2">
      {liveProfile && (
        <div className="flex items-center justify-between text-xs font-semibold text-[#15803D] bg-[#DCFCE7] border border-[#BBF7D0] px-3 py-1.5 rounded-lg">
          <span>LIVE INCOIS ARGO FLOAT #{liveProfile.platform_number} (Cycle #{liveProfile.cycle_number})</span>
          <span className="font-normal text-xs">{liveProfile.profile.length} Pressure Levels</span>
        </div>
      )}

      <div style={{ height: `${height}px` }} className="w-full text-xs font-sans">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="temperature"
              type="number"
              domain={[0, 35]}
              unit="°C"
              stroke="#64748B"
              tick={{ fontSize: 11, fill: '#64748B' }}
            />
            <YAxis
              dataKey="depthValue"
              type="number"
              reversed
              unit={liveProfile ? ' dbar' : ' m'}
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
            />
            <Legend wrapperStyle={{ paddingTop: '12px', fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey="temperature"
              name="Temperature (°C)"
              stroke="#DC2626"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#DC2626' }}
            />
            <Line
              type="monotone"
              dataKey="salinity"
              name="Salinity (PSU)"
              stroke="#0B84C6"
              strokeWidth={2}
              dot={{ r: 3.5, fill: '#0B84C6' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
