import React from 'react';
import { OceanVariable } from '../../types';

interface ScientificColorBarProps {
  variable: OceanVariable | string;
  depth?: number;
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
}

const SCALE_CONFIGS: Record<string, ScaleConfig> = {
  temperature: {
    title: 'Temperature',
    unit: '°C',
    min: '4.0',
    mid: '22.0',
    max: '31.5',
    gradient: 'linear-gradient(to right, #082350, #0e5a91, #10b981, #f59e0b, #ef4444)',
  },
  salinity: {
    title: 'Salinity',
    unit: 'PSU',
    min: '31.0',
    mid: '34.8',
    max: '37.5',
    gradient: 'linear-gradient(to right, #06b6d4, #0284c7, #1e40af, #d97706)',
  },
  current_velocity: {
    title: 'Current Speed',
    unit: 'm/s',
    min: '0.0',
    mid: '0.8',
    max: '2.2',
    gradient: 'linear-gradient(to right, #071833, #0284c7, #38bdf8, #f59e0b)',
  },
  sea_surface_height: {
    title: 'SSH Anomaly',
    unit: 'm',
    min: '-0.40',
    mid: '0.00',
    max: '+0.55',
    gradient: 'linear-gradient(to right, #1d4ed8, #0ea5e9, #10b981, #f97316, #ef4444)',
  },
  chlorophyll: {
    title: 'Chlorophyll-a',
    unit: 'mg/m³',
    min: '0.01',
    mid: '1.5',
    max: '10.0',
    gradient: 'linear-gradient(to right, #0f172a, #065f46, #10b981, #a7f3d0)',
  },
};

export const ScientificColorBar: React.FC<ScientificColorBarProps> = ({
  variable,
}) => {
  const config = SCALE_CONFIGS[variable] || SCALE_CONFIGS.temperature;

  return (
    <div className="bg-slate-950/70 border border-slate-800/60 rounded px-2.5 py-1.5 text-xs font-sans text-slate-300 backdrop-blur-md shadow-lg w-52 pointer-events-none">
      {/* Title & Unit */}
      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
        <span className="font-medium text-slate-200">{config.title}</span>
        <span className="text-slate-400 font-mono text-[10px]">{config.unit}</span>
      </div>

      {/* Slim Gradient Line */}
      <div
        className="h-1.5 w-full rounded-full"
        style={{ background: config.gradient }}
      />

      {/* Min / Mid / Max Values */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
        <span>{config.min}</span>
        <span>{config.mid}</span>
        <span>{config.max}</span>
      </div>
    </div>
  );
};

