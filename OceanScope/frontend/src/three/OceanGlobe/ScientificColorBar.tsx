import React from 'react';
import { OceanVariable } from '../../types';

interface ScientificColorBarProps {
  variable: OceanVariable | string;
  depth: number;
  timestamp?: string;
  isLiveData?: boolean;
}

interface ScaleConfig {
  title: string;
  unit: string;
  min: string;
  mid: string;
  max: string;
  gradient: string;
  source: string;
}

const SCALE_CONFIGS: Record<string, ScaleConfig> = {
  temperature: {
    title: 'SEA TEMPERATURE (SST)',
    unit: '°C',
    min: '4.0',
    mid: '22.0',
    max: '31.5',
    gradient: 'linear-gradient(to right, #082350, #0e5a91, #10b981, #f59e0b, #ef4444)',
    source: 'INCOIS HYCOM / ARGO',
  },
  salinity: {
    title: 'PRACTICAL SALINITY',
    unit: 'PSU',
    min: '31.0',
    mid: '34.8',
    max: '37.5',
    gradient: 'linear-gradient(to right, #06b6d4, #0284c7, #1e40af, #d97706)',
    source: 'INCOIS HYCOM / ARGO',
  },
  current_velocity: {
    title: 'OCEAN CURRENT SPEED',
    unit: 'm/s',
    min: '0.0',
    mid: '0.8',
    max: '2.2',
    gradient: 'linear-gradient(to right, #071833, #0284c7, #38bdf8, #f59e0b)',
    source: 'INCOIS RSMC HYCOM',
  },
  sea_surface_height: {
    title: 'SEA SURFACE HEIGHT ANOMALY',
    unit: 'm',
    min: '-0.40',
    mid: '0.00',
    max: '+0.55',
    gradient: 'linear-gradient(to right, #1d4ed8, #0ea5e9, #10b981, #f97316, #ef4444)',
    source: 'INCOIS HYCOM',
  },
  tchp: {
    title: 'CYCLONE HEAT POTENTIAL',
    unit: 'kJ/cm²',
    min: '15.0',
    mid: '60.0',
    max: '125.0',
    gradient: 'linear-gradient(to right, #0284c7, #10b981, #f59e0b, #dc2626)',
    source: 'INCOIS RSMC HYCOM',
  },
  mld: {
    title: 'MIXED LAYER DEPTH',
    unit: 'm',
    min: '10.0',
    mid: '45.0',
    max: '120.0',
    gradient: 'linear-gradient(to right, #0f766e, #0284c7, #1e3a8a)',
    source: 'INCOIS RSMC HYCOM',
  },
};

export const ScientificColorBar: React.FC<ScientificColorBarProps> = ({
  variable,
  depth,
  timestamp,
  isLiveData = true,
}) => {
  const config = SCALE_CONFIGS[variable] || SCALE_CONFIGS.temperature;

  return (
    <div className="bg-[#0b1220]/95 border border-slate-800 rounded p-2.5 text-xs font-mono backdrop-blur-md text-slate-200 shadow-xl w-64">
      {/* Header Info */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
        <span className="font-semibold tracking-wider text-slate-300 truncate pr-1">{config.title}</span>
        <span className="text-cyan-400 font-bold flex-shrink-0">[{config.unit}]</span>
      </div>

      {/* Scientific Colormap Gradient Bar */}
      <div
        className="h-2.5 w-full rounded-sm border border-slate-700/60 my-1 shadow-inner"
        style={{ background: config.gradient }}
      />

      {/* Min / Mid / Max Scale Values */}
      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
        <span>{config.min}</span>
        <span>{config.mid}</span>
        <span>{config.max}</span>
      </div>

      {/* Telemetry Slice Metadata */}
      <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400">
        <div>
          <span>DEPTH: </span>
          <span className="text-slate-200 font-semibold">{depth} m</span>
        </div>
        <div>
          <span>SRC: </span>
          <span className={isLiveData ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
            {isLiveData ? 'INCOIS REAL' : 'DEMO'}
          </span>
        </div>
      </div>
    </div>
  );
};
