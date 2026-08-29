import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OceanVariable, LocationRiskResponse, RegionalRiskHotspot } from '../types';
import { APP_CONFIG } from '../config/appConfig';
import {
  getArgoObservations,
  getArgoProfile,
  ArgoObservationItem,
  ArgoProfileResponse,
} from '../services/argoApi';
import {
  getHycomArgoComparison,
  getHycomProfile,
  getHycomPoint,
  ModelObsComparisonResponse,
  HycomModelProfile,
  HycomModelPoint,
} from '../services/hycomApi';
import { riskApiClient } from '../services/riskApi';

interface OceanState {
  selectedVariable: OceanVariable;
  selectedDepth: number; // meters
  activeModelId: string;
  is3dGlobeActive: boolean;
  selectedRegion: string;
  isLiveDataMode: boolean;
  liveDataStatus: 'LIVE' | 'DEMO' | 'FALLBACK';
  liveObservations: ArgoObservationItem[];
  selectedLiveArgoProfile: ArgoProfileResponse | null;
  selectedPlatformId: string | null;
  errorMessage: string | null;
  // HYCOM Model State
  hycomComparison: ModelObsComparisonResponse | null;
  hycomProfile: HycomModelProfile | null;
  hycomPoint: HycomModelPoint | null;
  hycomLoading: boolean;
  hycomError: string | null;
  displayMode: 'OBSERVATION' | 'MODEL' | 'COMPARISON' | 'RISK';
  // Time & Depth Animation State
  selectedTimestamp: string;
  availableTimestamps: string[];
  isPlaying: boolean;
  playbackSpeed: number; // 1 = normal, 2 = 2x, etc.
  // Ocean Risk & Disaster Decision-Support State
  locationRisk: LocationRiskResponse | null;
  riskAlerts: RegionalRiskHotspot[];
  showRiskLayer: boolean;
  selectedRiskLocation: { lat: number; lon: number } | null;
  isDemoMode: boolean;
}

interface OceanContextType {
  state: OceanState;
  setSelectedVariable: (variable: OceanVariable) => void;
  setSelectedDepth: (depth: number) => void;
  setActiveModelId: (modelId: string) => void;
  setIs3dGlobeActive: (active: boolean) => void;
  setSelectedRegion: (region: string) => void;
  setIsLiveDataMode: (enabled: boolean) => void;
  selectArgoFloat: (platformNumber: string, cycleNumber?: number) => Promise<void>;
  fetchLiveData: () => Promise<void>;
  fetchHycomComparison: (platformNumber: string, cycleNumber?: number) => Promise<void>;
  fetchHycomProfile: (lat: number, lon: number, time?: string) => Promise<void>;
  fetchHycomPoint: (lat: number, lon: number, depth?: number, variable?: string, time?: string) => Promise<void>;
  setDisplayMode: (mode: 'OBSERVATION' | 'MODEL' | 'COMPARISON' | 'RISK') => void;
  setSelectedTimestamp: (timestamp: string) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  nextTimestamp: () => void;
  previousTimestamp: () => void;
  evaluateLocationRisk: (lat: number, lon: number, depth?: number, time?: string) => Promise<void>;
  fetchRiskAlerts: () => Promise<void>;
  toggleRiskLayer: () => void;
  resetDemoState: () => void;
}

const DEFAULT_TIMESTAMPS = [
  '2026-08-28T06:00:00Z',
  '2026-08-28T12:00:00Z',
  '2026-08-28T18:00:00Z',
];

const initialOceanState: OceanState = {
  selectedVariable: 'temperature',
  selectedDepth: 0,
  activeModelId: 'hycom-glbu0.08',
  is3dGlobeActive: true,
  selectedRegion: APP_CONFIG.defaultLocation.regionName,
  isLiveDataMode: true,
  liveDataStatus: 'LIVE',
  liveObservations: [],
  selectedLiveArgoProfile: null,
  selectedPlatformId: null,
  errorMessage: null,
  // HYCOM
  hycomComparison: null,
  hycomProfile: null,
  hycomPoint: null,
  hycomLoading: false,
  hycomError: null,
  displayMode: 'OBSERVATION',
  // Time Animation
  selectedTimestamp: '2026-08-28T06:00:00Z',
  availableTimestamps: DEFAULT_TIMESTAMPS,
  isPlaying: false,
  playbackSpeed: 1,
  // Ocean Risk Decision-Support State
  locationRisk: null,
  riskAlerts: [],
  showRiskLayer: true,
  selectedRiskLocation: { lat: 18.5, lon: 88.5 },
  isDemoMode: false,
};

const OceanContext = createContext<OceanContextType | undefined>(undefined);

export const OceanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OceanState>(initialOceanState);

  const setSelectedVariable = (variable: OceanVariable) => {
    setState((prev) => ({ ...prev, selectedVariable: variable }));
  };

  const setSelectedDepth = (depth: number) => {
    setState((prev) => ({ ...prev, selectedDepth: depth }));
  };

  const setActiveModelId = (modelId: string) => {
    setState((prev) => ({ ...prev, activeModelId: modelId }));
  };

  const setIs3dGlobeActive = (active: boolean) => {
    setState((prev) => ({ ...prev, is3dGlobeActive: active }));
  };

  const setSelectedRegion = (region: string) => {
    setState((prev) => ({ ...prev, selectedRegion: region }));
  };

  const setDisplayMode = (mode: 'OBSERVATION' | 'MODEL' | 'COMPARISON' | 'RISK') => {
    setState((prev) => ({ ...prev, displayMode: mode }));
  };

  const setSelectedTimestamp = (timestamp: string) => {
    setState((prev) => ({ ...prev, selectedTimestamp: timestamp }));
  };

  const setIsPlaying = (isPlaying: boolean) => {
    setState((prev) => ({ ...prev, isPlaying }));
  };

  const setPlaybackSpeed = (speed: number) => {
    setState((prev) => ({ ...prev, playbackSpeed: speed }));
  };

  const nextTimestamp = () => {
    setState((prev) => {
      const idx = prev.availableTimestamps.indexOf(prev.selectedTimestamp);
      const nextIdx = idx >= 0 && idx < prev.availableTimestamps.length - 1 ? idx + 1 : 0;
      return { ...prev, selectedTimestamp: prev.availableTimestamps[nextIdx] };
    });
  };

  const previousTimestamp = () => {
    setState((prev) => {
      const idx = prev.availableTimestamps.indexOf(prev.selectedTimestamp);
      const prevIdx = idx > 0 ? idx - 1 : prev.availableTimestamps.length - 1;
      return { ...prev, selectedTimestamp: prev.availableTimestamps[prevIdx] };
    });
  };

  // Playback Animation Interval
  useEffect(() => {
    if (!state.isPlaying || state.availableTimestamps.length <= 1) return;
    const intervalMs = Math.max(800, 2400 / state.playbackSpeed);
    const timer = setInterval(() => {
      nextTimestamp();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [state.isPlaying, state.playbackSpeed, state.availableTimestamps]);

  // Load HYCOM Metadata to dynamically get real available timestamps
  useEffect(() => {
    const initHycomMeta = async () => {
      try {
        const metaRes = await fetch(`${APP_CONFIG.api.baseUrl}/models/hycom/metadata`);
        if (metaRes.ok) {
          const meta = await metaRes.json();
          if (meta.time_range && meta.time_range.length > 0) {
            setState((prev) => ({
              ...prev,
              availableTimestamps: meta.time_range,
              selectedTimestamp: meta.time_range[0],
            }));
          }
        }
      } catch (err) {
        console.warn('Could not load HYCOM metadata time range', err);
      }
    };
    initHycomMeta();
  }, []);

  const fetchLiveData = async () => {
    try {
      setState((prev) => ({ ...prev, errorMessage: null }));
      const data = await getArgoObservations(0.0, 30.0, 40.0, 110.0, undefined, 50);
      setState((prev) => ({
        ...prev,
        liveObservations: data.observations,
        liveDataStatus: data.is_live_data ? 'LIVE' : 'FALLBACK',
        isLiveDataMode: true,
      }));

      // Automatically load the first float's vertical profile if none is selected
      if (data.observations && data.observations.length > 0) {
        const first = data.observations[0];
        selectArgoFloat(first.platform_number, first.cycle_number);
      }
    } catch (err) {
      console.warn('INCOIS Live Data fetch failed, falling back to Demo Mode', err);
      setState((prev) => ({
        ...prev,
        liveDataStatus: 'DEMO',
        isLiveDataMode: false,
        errorMessage: 'INCOIS data temporarily unavailable. Showing Demo Data.',
      }));
    }
  };

  useEffect(() => {
    fetchLiveData();
  }, []);

  const setIsLiveDataMode = (enabled: boolean) => {
    if (enabled) {
      fetchLiveData();
    } else {
      setState((prev) => ({
        ...prev,
        isLiveDataMode: false,
        liveDataStatus: 'DEMO',
        selectedLiveArgoProfile: null,
        selectedPlatformId: null,
      }));
    }
  };

  const selectArgoFloat = async (platformNumber: string, cycleNumber = 1) => {
    try {
      const profile = await getArgoProfile(platformNumber, cycleNumber);
      setState((prev) => ({
        ...prev,
        selectedPlatformId: platformNumber,
        selectedLiveArgoProfile: profile,
      }));
      // Automatically cross-validate with HYCOM model
      fetchHycomComparison(platformNumber, cycleNumber);
    } catch (err) {
      console.error('Failed to load Argo profile', err);
    }
  };

  const fetchHycomComparison = async (platformNumber: string, cycleNumber = 1) => {
    try {
      setState((prev) => ({ ...prev, hycomLoading: true, hycomError: null }));
      const comparison = await getHycomArgoComparison(platformNumber, cycleNumber);
      setState((prev) => ({
        ...prev,
        hycomComparison: comparison,
        hycomLoading: false,
        displayMode: 'COMPARISON',
      }));
    } catch (err) {
      console.error('HYCOM comparison failed', err);
      setState((prev) => ({
        ...prev,
        hycomLoading: false,
        hycomError: 'HYCOM model data unavailable. Using Demo Mode.',
      }));
    }
  };

  const fetchHycomProfile = async (lat: number, lon: number, time?: string) => {
    try {
      setState((prev) => ({ ...prev, hycomLoading: true, hycomError: null }));
      const profile = await getHycomProfile(lat, lon, time || state.selectedTimestamp);
      setState((prev) => ({
        ...prev,
        hycomProfile: profile,
        hycomLoading: false,
      }));
    } catch (err) {
      console.error('HYCOM profile fetch failed', err);
      setState((prev) => ({
        ...prev,
        hycomLoading: false,
        hycomError: 'HYCOM profile unavailable.',
      }));
    }
  };

  const fetchHycomPoint = async (lat: number, lon: number, depth = 0, variable = 'temperature', time?: string) => {
    try {
      setState((prev) => ({ ...prev, hycomLoading: true, hycomError: null }));
      const queryTime = time || state.selectedTimestamp;
      const point = await getHycomPoint(lat, lon, depth, variable, queryTime);
      setState((prev) => ({
        ...prev,
        hycomPoint: point,
        hycomLoading: false,
      }));
    } catch (err) {
      console.error('HYCOM point fetch failed', err);
      setState((prev) => ({
        ...prev,
        hycomLoading: false,
        hycomError: 'Data unavailable for selected time/depth.',
      }));
    }
  };

  // Sync HYCOM Point query whenever variable, depth, or timestamp changes
  useEffect(() => {
    if (state.displayMode === 'MODEL') {
      const lat = state.selectedLiveArgoProfile?.latitude ?? 13.75;
      const lon = state.selectedLiveArgoProfile?.longitude ?? 87.30;
      fetchHycomPoint(lat, lon, state.selectedDepth, state.selectedVariable, state.selectedTimestamp);
    }
  }, [state.selectedVariable, state.selectedDepth, state.selectedTimestamp, state.displayMode]);

  const evaluateLocationRisk = async (
    lat: number,
    lon: number,
    depth = 0,
    time?: string
  ) => {
    try {
      const isDemo = !state.isLiveDataMode;
      const queryTime = time || state.selectedTimestamp;
      const riskRes = await riskApiClient.getRiskAtPoint(lat, lon, depth, queryTime, isDemo);
      setState((prev) => ({
        ...prev,
        locationRisk: riskRes,
        selectedRiskLocation: { lat, lon },
      }));
    } catch (err) {
      console.error('Failed to evaluate location risk', err);
    }
  };

  const fetchRiskAlerts = async () => {
    try {
      const isDemo = !state.isLiveDataMode;
      const alerts = await riskApiClient.getRiskAlerts(isDemo);
      setState((prev) => ({
        ...prev,
        riskAlerts: alerts,
      }));
    } catch (err) {
      console.error('Failed to fetch risk alerts', err);
    }
  };

  const toggleRiskLayer = () => {
    setState((prev) => ({ ...prev, showRiskLayer: !prev.showRiskLayer }));
  };

  const resetDemoState = () => {
    setState((prev) => ({
      ...initialOceanState,
      liveObservations: prev.liveObservations,
      riskAlerts: prev.riskAlerts,
    }));
    fetchLiveData();
    fetchRiskAlerts();
    evaluateLocationRisk(18.5, 88.5, 0, '2026-08-28T06:00:00Z');
  };

  // Preload initial risk alerts and default coordinate risk evaluation on mount or live data mode toggle
  useEffect(() => {
    fetchRiskAlerts();
    evaluateLocationRisk(18.5, 88.5, state.selectedDepth, state.selectedTimestamp);
  }, [state.isLiveDataMode]);

  return (
    <OceanContext.Provider
      value={{
        state,
        setSelectedVariable,
        setSelectedDepth,
        setActiveModelId,
        setIs3dGlobeActive,
        setSelectedRegion,
        setIsLiveDataMode,
        selectArgoFloat,
        fetchLiveData,
        fetchHycomComparison,
        fetchHycomProfile,
        fetchHycomPoint,
        setDisplayMode,
        setSelectedTimestamp,
        setIsPlaying,
        setPlaybackSpeed,
        nextTimestamp,
        previousTimestamp,
        evaluateLocationRisk,
        fetchRiskAlerts,
        toggleRiskLayer,
        resetDemoState,
      }}
    >
      {children}
    </OceanContext.Provider>
  );
};

export const useOceanContext = (): OceanContextType => {
  const context = useContext(OceanContext);
  if (!context) {
    throw new Error('useOceanContext must be used within an OceanProvider');
  }
  return context;
};
