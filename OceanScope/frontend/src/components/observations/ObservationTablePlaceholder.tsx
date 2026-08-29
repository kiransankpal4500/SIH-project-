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
    <div className="bg-ocean-900 border border-ocean-800 rounded-lg overflow-x-auto">
      <table className="w-full text-left text-xs font-mono">
        <thead className="bg-ocean-950 border-b border-ocean-800 text-slate-400 uppercase tracking-wider">
          <tr>
            <th className="px-4 py-3">Platform ID</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Location (Lat/Lon)</th>
            <th className="px-4 py-3">Depth</th>
            <th className="px-4 py-3">Temp (°C)</th>
            <th className="px-4 py-3">Salinity (PSU)</th>
            <th className="px-4 py-3">Last Ping</th>
            <th className="px-4 py-3 text-right">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ocean-800/60 text-slate-200">
          {observations.map((obs) => (
            <tr key={obs.id} className="hover:bg-ocean-850/60 transition-colors">
              <td className="px-4 py-3 font-bold text-white">{obs.platformId}</td>
              <td className="px-4 py-3 text-slate-300">{obs.platformType.replace('_', ' ')}</td>
              <td className="px-4 py-3">
                <Badge variant="slate">{obs.source}</Badge>
              </td>
              <td className="px-4 py-3 text-ocean-300">
                {formatCoordinates(obs.location.latitude, obs.location.longitude)}
              </td>
              <td className="px-4 py-3">{obs.location.depth} m</td>
              <td className="px-4 py-3 text-emerald-400 font-semibold">
                {formatValue(obs.variables.temperature, '', 1)}
              </td>
              <td className="px-4 py-3 text-cyan-300">
                {formatValue(obs.variables.salinity, '', 1)}
              </td>
              <td className="px-4 py-3 text-slate-400">{formatTimestamp(obs.timestamp)}</td>
              <td className="px-4 py-3 text-right">
                <Badge variant="emerald">{obs.status}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
