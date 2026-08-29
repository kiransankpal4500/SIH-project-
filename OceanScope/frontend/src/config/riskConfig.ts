/**
 * Ocean Risk & Disaster Decision-Support System Configuration
 * Centralized, transparent rule-based thresholds and advisory metadata.
 */

export type RiskLevel = 'LOW' | 'MODERATE' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskThresholdItem {
  min?: number;
  max?: number;
  label: string;
}

export interface ParameterRiskConfig {
  name: string;
  variableKey: string;
  unit: string;
  description: string;
  thresholds: Record<string, RiskThresholdItem>;
}

export const RISK_LEVELS: RiskLevel[] = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

export const RISK_COLOR_MAP: Record<
  RiskLevel,
  {
    badge: string;
    border: string;
    bg: string;
    text: string;
    hex: string;
    threeColor: string;
  }
> = {
  LOW: {
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-950/40',
    text: 'text-emerald-400',
    hex: '#10B981',
    threeColor: '#10B981',
  },
  MODERATE: {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    border: 'border-amber-500/30',
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
    hex: '#F59E0B',
    threeColor: '#F59E0B',
  },
  MEDIUM: {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    border: 'border-amber-500/30',
    bg: 'bg-amber-950/40',
    text: 'text-amber-400',
    hex: '#F59E0B',
    threeColor: '#F59E0B',
  },
  HIGH: {
    badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    border: 'border-orange-500/30',
    bg: 'bg-orange-950/40',
    text: 'text-orange-400',
    hex: '#F97316',
    threeColor: '#F97316',
  },
  CRITICAL: {
    badge: 'bg-rose-500/25 text-rose-300 border-rose-500/50',
    border: 'border-rose-500/40',
    bg: 'bg-rose-950/40',
    text: 'text-rose-400',
    hex: '#EF4444',
    threeColor: '#EF4444',
  },
};

export const RISK_THRESHOLDS_CONFIG: Record<string, ParameterRiskConfig> = {
  current_speed: {
    name: 'Ocean Current Speed',
    variableKey: 'current_speed',
    unit: 'm/s',
    description: 'Surface and subsurface ocean velocity magnitude (shear / navigation hazard)',
    thresholds: {
      LOW: { max: 0.50, label: '< 0.50 m/s' },
      MODERATE: { min: 0.50, max: 0.90, label: '0.50 - 0.90 m/s' },
      HIGH: { min: 0.90, max: 1.40, label: '0.90 - 1.40 m/s' },
      CRITICAL: { min: 1.40, label: '>= 1.40 m/s' },
    },
  },
  sst_anomaly: {
    name: 'Sea Surface Temp Anomaly',
    variableKey: 'sst_anomaly',
    unit: '°C',
    description: 'Thermal variance above climatological baseline (Marine Heatwave index)',
    thresholds: {
      LOW: { max: 1.00, label: '< +1.00 °C' },
      MODERATE: { min: 1.00, max: 1.80, label: '+1.00 - +1.80 °C' },
      HIGH: { min: 1.80, max: 2.80, label: '+1.80 - +2.80 °C' },
      CRITICAL: { min: 2.80, label: '>= +2.80 °C' },
    },
  },
  ssh: {
    name: 'Sea Surface Height (SSH)',
    variableKey: 'ssh',
    unit: 'm',
    description: 'Sea surface elevation above geoid (storm surge / dynamic topography)',
    thresholds: {
      LOW: { max: 0.15, label: '< 0.15 m' },
      MODERATE: { min: 0.15, max: 0.35, label: '0.15 - 0.35 m' },
      HIGH: { min: 0.35, max: 0.60, label: '0.35 - 0.60 m' },
      CRITICAL: { min: 0.60, label: '>= 0.60 m' },
    },
  },
  tchp: {
    name: 'Tropical Cyclone Heat Potential',
    variableKey: 'tchp',
    unit: 'kJ/cm²',
    description: 'Upper-ocean heat content supporting rapid tropical cyclone intensification',
    thresholds: {
      LOW: { max: 50.0, label: '< 50.0 kJ/cm²' },
      MODERATE: { min: 50.0, max: 80.0, label: '50.0 - 80.0 kJ/cm²' },
      HIGH: { min: 80.0, max: 110.0, label: '80.0 - 110.0 kJ/cm²' },
      CRITICAL: { min: 110.0, label: '>= 110.0 kJ/cm²' },
    },
  },
  mld: {
    name: 'Mixed Layer Depth (MLD)',
    variableKey: 'mld',
    unit: 'm',
    description: 'Thickness of upper mixed layer (shoaled depth implies intense heat trapping)',
    thresholds: {
      LOW: { min: 30.0, label: '> 30.0 m (Well Mixed)' },
      MODERATE: { min: 20.0, max: 30.0, label: '20.0 - 30.0 m' },
      HIGH: { min: 10.0, max: 20.0, label: '10.0 - 20.0 m' },
      CRITICAL: { max: 10.0, label: '< 10.0 m (Severe Shoaling)' },
    },
  },
};

export const RISK_DISCLAIMER =
  'OceanScope risk indicators are demonstration decision-support visualizations and are not official warnings or certified forecasts.';
