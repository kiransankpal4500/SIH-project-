import React from 'react';
import { Observation } from '../../types';
import { Badge } from '../common/Badge';
import { formatCoordinates, formatTimestamp, formatValue } from '../../utils/formatters';

interface ObservationTablePlaceholderProps {
  observations: Observation[];
}

export const ObservationTablePlaceholder: React.FC<ObservationTablePlaceholderProps> = ({
  observations,
}) => {
  return (
    <div className="border border-[#E2E8F0] rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[#475569] font-semibold text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Platform ID</th>
              <th className="px-4 py-3">Sensor Type</th>
              <th className="px-4 py-3">Source Provider</th>
              <th className="px-4 py-3">Coordinates (Lat/Lon)</th>
              <th className="px-4 py-3">Depth</th>
              <th className="px-4 py-3">SST (°C)</th>
              <th className="px-4 py-3">Salinity (PSU)</th>
              <th className="px-4 py-3">Last Telemetry Ping</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F1F5F9] text-[#172033]">
            {observations.map((obs) => (
              <tr key={obs.id} className="hover:bg-[#F8FAFC] transition-colors">
                <td className="px-4 py-3 font-bold text-[#0B84C6]">#{obs.platformId}</td>
                <td className="px-4 py-3 text-[#475569] font-medium">{obs.platformType.replace('_', ' ')}</td>
                <td className="px-4 py-3">
                  <Badge variant="slate">{obs.source}</Badge>
                </td>
                <td className="px-4 py-3 text-[#172033] font-medium">
                  {formatCoordinates(obs.location.latitude, obs.location.longitude)}
                </td>
                <td className="px-4 py-3 text-[#64748B]">{obs.location.depth} m</td>
                <td className="px-4 py-3 text-[#DC2626] font-bold">
                  {formatValue(obs.variables.temperature, '°C', 1)}
                </td>
                <td className="px-4 py-3 text-[#0B84C6] font-bold">
                  {formatValue(obs.variables.salinity, 'PSU', 1)}
                </td>
                <td className="px-4 py-3 text-[#64748B]">{formatTimestamp(obs.timestamp)}</td>
                <td className="px-4 py-3 text-right">
                  <Badge variant="emerald">{obs.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
