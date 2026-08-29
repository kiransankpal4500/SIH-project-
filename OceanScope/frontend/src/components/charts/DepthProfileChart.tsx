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
    <div className="space-y-1">
      {liveProfile && (
        <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded">
          <span>LIVE INCOIS FLOAT #{liveProfile.platform_number} (Cycle #{liveProfile.cycle_number})</span>
          <span>{liveProfile.profile.length} Pressure Levels</span>
        </div>
      )}

      <div style={{ height: `${height}px` }} className="w-full font-mono text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1C2541" />
            <XAxis
              dataKey="temperature"
              type="number"
              domain={[0, 35]}
              unit="°C"
              stroke="#94A3B8"
              tick={{ fontSize: 11 }}
            />
            <YAxis
              dataKey="depthValue"
              type="number"
              reversed
              unit={liveProfile ? ' dbar' : ' m'}
              stroke="#94A3B8"
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0B132B',
                borderColor: liveProfile ? '#10B981' : '#00B4D8',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#F1F5F9',
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line
              type="monotone"
              dataKey="temperature"
              name="Temperature (°C)"
              stroke="#EF4444"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#EF4444' }}
            />
            <Line
              type="monotone"
              dataKey="salinity"
              name="Salinity (PSU)"
              stroke="#00B4D8"
              strokeWidth={2}
              dot={{ r: 3, fill: '#00B4D8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
