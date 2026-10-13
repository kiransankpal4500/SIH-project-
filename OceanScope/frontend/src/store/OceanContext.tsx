/**
 * OceanContext Global State Manager
 * Centralizes state for 3D globe visualization, HYCOM/Copernicus models, Argo telemetry, and risk indicators.
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
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
import { safeFetchJson } from '../utils/safeFetch';

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
  availableYears: number[];
  availableDates: string[];
  availableTimes: string[];
  selectedYear: number;
  selectedDate: string;
  earliestTime: string | null;
  latestTime: string | null;
  temporalLoading: boolean;
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
  selectLocation: (lat: number, lon: number, depth?: number, time?: string) => Promise<void>;
  selectArgoFloat: (platformNumber: string, cycleNumber?: number) => Promise<void>;
  fetchLiveData: () => Promise<void>;
  fetchHycomComparison: (platformNumber: string, cycleNumber?: number) => Promise<void>;
  fetchHycomProfile: (lat: number, lon: number, time?: string) => Promise<void>;
  fetchHycomPoint: (lat: number, lon: number, depth?: number, variable?: string, time?: string) => Promise<void>;
  setDisplayMode: (mode: 'OBSERVATION' | 'MODEL' | 'COMPARISON' | 'RISK') => void;
  setSelectedTimestamp: (timestamp: string) => void;
  setSelectedYear: (year: number) => Promise<void>;
  setSelectedDate: (date: string) => Promise<void>;
  setYearDateTime: (year: number, date: string, timeIso: string) => Promise<void>;
  loadLatestTimestamp: () => Promise<void>;
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
  selectedTimestamp: '2026-08-28T18:00:00Z',
  availableTimestamps: DEFAULT_TIMESTAMPS,
  availableYears: [2026],
  availableDates: ['2026-08-28'],
  availableTimes: DEFAULT_TIMESTAMPS,
  selectedYear: 2026,
  selectedDate: '2026-08-28',
  earliestTime: '2026-08-28T06:00:00Z',
  latestTime: '2026-08-28T18:00:00Z',
  temporalLoading: false,
  isPlaying: false,
  playbackSpeed: 1,
  // Ocean Risk Decision-Support State
  locationRisk: null,
  riskAlerts: [],
  showRiskLayer: true,
  selectedRiskLocation: { lat: 7.36, lon: 69.98 },
  isDemoMode: false,
};

const OceanContext = createContext<OceanContextType | undefined>(undefined);

export const OceanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<OceanState>(initialOceanState);
  const requestSeqRef = useRef<number>(0);

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
    const year = parseInt(timestamp.slice(0, 4), 10) || state.selectedYear;
    const date = timestamp.slice(0, 10) || state.selectedDate;
    setState((prev) => ({
      ...prev,
      selectedTimestamp: timestamp,
      selectedYear: year,
      selectedDate: date,
    }));
  };

  const setSelectedYear = async (year: number) => {
    try {
      setState((prev) => ({ ...prev, temporalLoading: true }));
      const dateData = await safeFetchJson<any>(`${APP_CONFIG.api.baseUrl}/models/hycom/timestamps?year=${year}`);
      const dates: string[] = dateData.dates || [];
      if (dates.length === 0) return;

      // Keep same month-day if possible, else pick middle or first date
      const curMonthDay = state.selectedDate.slice(5);
      const matchedDate = dates.find((d) => d.endsWith(curMonthDay)) || dates[Math.floor(dates.length / 2)] || dates[0];

      // Load timestamps for this matched date
      let timestamps: string[] = [];
      try {
        const tsData = await safeFetchJson<any>(`${APP_CONFIG.api.baseUrl}/models/hycom/timestamps?date=${matchedDate}`);
        timestamps = tsData.timestamps || [];
      } catch {
        timestamps = [];
      }
      const newTs = timestamps.includes(state.selectedTimestamp)
        ? state.selectedTimestamp
        : timestamps[Math.floor(timestamps.length / 2)] || timestamps[0] || `${matchedDate}T12:00:00Z`;

      setState((prev) => ({
        ...prev,
        selectedYear: year,
        availableDates: dates,
        selectedDate: matchedDate,
        availableTimes: timestamps,
        availableTimestamps: timestamps.length > 0 ? timestamps : prev.availableTimestamps,
        selectedTimestamp: newTs,
        temporalLoading: false,
      }));
    } catch (err) {
      console.warn('Failed to change HYCOM year', err);
      setState((prev) => ({ ...prev, temporalLoading: false }));
    }
  };

  const setSelectedDate = async (date: string) => {
    try {
      setState((prev) => ({ ...prev, temporalLoading: true }));
      const year = parseInt(date.slice(0, 4), 10) || state.selectedYear;
      const tsData = await safeFetchJson<any>(`${APP_CONFIG.api.baseUrl}/models/hycom/timestamps?date=${date}`);
      const timestamps: string[] = tsData.timestamps || [];
      if (timestamps.length === 0) return;

      // Try matching the current time of day (e.g. 12:00:00Z)
      const curTimeOfDay = state.selectedTimestamp.includes('T') ? state.selectedTimestamp.split('T')[1] : '12:00:00Z';
      const matchedTs = timestamps.find((ts) => ts.endsWith(curTimeOfDay)) || timestamps[Math.floor(timestamps.length / 2)] || timestamps[0];

      setState((prev) => ({
        ...prev,
        selectedYear: year,
        selectedDate: date,
        availableTimes: timestamps,
        availableTimestamps: timestamps,
        selectedTimestamp: matchedTs,
        temporalLoading: false,
      }));
    } catch (err) {
      console.warn('Failed to change HYCOM date', err);
      setState((prev) => ({ ...prev, temporalLoading: false }));
    }
  };

  const setYearDateTime = async (year: number, date: string, timeIso: string) => {
    setState((prev) => ({
      ...prev,
      selectedYear: year,
      selectedDate: date,
      selectedTimestamp: timeIso,
    }));
  };

  const loadLatestTimestamp = async () => {
    try {
      setState((prev) => ({ ...prev, temporalLoading: true }));
      const meta = await safeFetchJson<any>(`${APP_CONFIG.api.baseUrl}/models/hycom/timestamps`);
      const latestIso: string = meta.latest;
      const year = parseInt(latestIso.slice(0, 4), 10);
      const date = latestIso.slice(0, 10);

      // Fetch dates for year
      let dates: string[] = [];
      try {
        const dateData = await safeFetchJson<any>(`${APP_CONFIG.api.baseUrl}/models/hycom/timestamps?year=${year}`);
        dates = dateData.dates || [];
      } catch {
        dates = [];
      }

      // Fetch timestamps for that date
      let timestamps: string[] = [];
      try {
        const tsData = await safeFetchJson<any>(`${APP_CONFIG.api.baseUrl}/models/hycom/timestamps?date=${date}`);
        timestamps = tsData.timestamps || [];
      } catch {
        timestamps = [];
      }

      setState((prev) => ({
        ...prev,
        selectedYear: year,
        availableDates: dates,
        selectedDate: date,
        availableTimes: timestamps,
        availableTimestamps: timestamps.length > 0 ? timestamps : prev.availableTimestamps,
        selectedTimestamp: latestIso,
        temporalLoading: false,
      }));
    } catch (err) {
      console.warn('Failed to load latest HYCOM timestamp', err);
      setState((prev) => ({ ...prev, temporalLoading: false }));
    }
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

  // Load HYCOM Metadata & Initial Temporal Coverage on mount
  useEffect(() => {
    const initHycomMeta = async () => {
      try {
        const meta = await safeFetchJson<any>(`${APP_CONFIG.api.baseUrl}/models/hycom/timestamps`);
        const years: number[] = meta.available_years && meta.available_years.length > 0 ? meta.available_years : [2026];
        const latestIso: string = meta.latest || '2026-08-28T18:00:00Z';
        const initialYear = parseInt(latestIso.slice(0, 4), 10) || years[years.length - 1];
        const initialDate = latestIso.slice(0, 10);

        // Fetch dates for the initial year
        let dates: string[] = meta.dates || [];
        if (dates.length === 0) {
          try {
            const dateData = await safeFetchJson<any>(`${APP_CONFIG.api.baseUrl}/models/hycom/timestamps?year=${initialYear}`);
            dates = dateData.dates || [initialDate];
          } catch {
            dates = [initialDate];
          }
        }

        // Fetch timestamps for initial date
        let timestamps: string[] = meta.timestamps || [];
        if (timestamps.length === 0) {
          try {
            const tsData = await safeFetchJson<any>(`${APP_CONFIG.api.baseUrl}/models/hycom/timestamps?date=${initialDate}`);
            timestamps = tsData.timestamps || [latestIso];
          } catch {
            timestamps = [latestIso];
          }
        }

        setState((prev) => ({
          ...prev,
          availableYears: years,
          availableDates: dates,
          availableTimes: timestamps,
          availableTimestamps: timestamps.length > 0 ? timestamps : prev.availableTimestamps,
          selectedYear: initialYear,
          selectedDate: initialDate,
          selectedTimestamp: latestIso,
          earliestTime: meta.earliest || prev.earliestTime,
          latestTime: meta.latest || prev.latestTime,
        }));

        // Query initial point / profile data for default location using the real latest timestamp
        selectLocation(7.36, 69.98, 0, latestIso);
      } catch (err) {
        console.warn('Could not initialize HYCOM historical temporal metadata', err);
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

      // Automatically load the first float's vertical profile if available
      if (data.observations && data.observations.length > 0) {
        const first = data.observations[0];
        selectArgoFloat(first.platform_number, first.cycle_number);
      } else {
        selectLocation(7.36, 69.98);
      }
    } catch (err) {
      console.warn('INCOIS Live Data fetch error', err);
      setState((prev) => ({
        ...prev,
        liveDataStatus: 'FALLBACK',
        errorMessage: 'INCOIS telemetry temporarily slow or unavailable. Real HYCOM model data active.',
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

  /**
   * Unified Selection for any Arbitrary Geographic Coordinate on Globe
   * Updates coordinates immediately, prevents stale overwrites with request sequence check,
   * and fetches colocated HYCOM profile and risk evaluation.
   */
  const selectLocation = async (lat: number, lon: number, depth?: number, time?: string) => {
    const reqId = ++requestSeqRef.current;
    const targetDepth = depth !== undefined ? depth : state.selectedDepth;
    const targetTime = time || state.selectedTimestamp;
    const isDemo = !state.isLiveDataMode;

    // Immediately update coordinates and clear previous location's stale values
    setState((prev) => ({
      ...prev,
      selectedRiskLocation: { lat, lon },
      selectedPlatformId: null,
      selectedLiveArgoProfile: null,
      locationRisk: null,
      hycomProfile: null,
      hycomPoint: null,
      hycomLoading: true,
      hycomError: null,
    }));

    try {
      const [riskRes, profileRes] = await Promise.allSettled([
        riskApiClient.getRiskAtPoint(lat, lon, targetDepth, targetTime, isDemo),
        getHycomProfile(lat, lon, targetTime),
      ]);

      // If another location was clicked while this request was in flight, ignore
      if (reqId !== requestSeqRef.current) return;

      const locationRisk = riskRes.status === 'fulfilled' ? riskRes.value : null;
      const hycomProfile = profileRes.status === 'fulfilled' ? profileRes.value : null;

      setState((prev) => ({
        ...prev,
        selectedRiskLocation: { lat, lon },
        locationRisk,
        hycomProfile,
        hycomLoading: false,
        hycomError: hycomProfile ? null : 'HYCOM profile unavailable for this point.',
      }));
    } catch (err) {
      if (reqId !== requestSeqRef.current) return;
      console.error('Failed to load data for selected location', err);
      setState((prev) => ({
        ...prev,
        hycomLoading: false,
        hycomError: 'Failed to retrieve data for location.',
      }));
    }
  };

  /**
   * Selection for In-Situ Argo Float Marker
   */
  const selectArgoFloat = async (platformNumber: string, cycleNumber = 1) => {
    const reqId = ++requestSeqRef.current;
    const targetDepth = state.selectedDepth;
    const targetTime = state.selectedTimestamp;
    const isDemo = !state.isLiveDataMode;

    const obs = state.liveObservations.find((o) => o.platform_number === platformNumber);
    const initialLat = obs?.latitude;
    const initialLon = obs?.longitude;

    setState((prev) => ({
      ...prev,
      selectedPlatformId: platformNumber,
      selectedLiveArgoProfile: null,
      selectedRiskLocation: initialLat != null && initialLon != null ? { lat: initialLat, lon: initialLon } : prev.selectedRiskLocation,
      locationRisk: null,
      hycomComparison: null,
      hycomLoading: true,
      hycomError: null,
    }));

    try {
      const profile = await getArgoProfile(platformNumber, cycleNumber);
      if (reqId !== requestSeqRef.current) return;

      const lat = profile.latitude ?? initialLat ?? 12.0;
      const lon = profile.longitude ?? initialLon ?? 80.0;

      const [compRes, riskRes] = await Promise.allSettled([
        getHycomArgoComparison(platformNumber, cycleNumber),
        riskApiClient.getRiskAtPoint(lat, lon, targetDepth, targetTime, isDemo),
      ]);

      if (reqId !== requestSeqRef.current) return;

      const hycomComparison = compRes.status === 'fulfilled' ? compRes.value : null;
      const locationRisk = riskRes.status === 'fulfilled' ? riskRes.value : null;

      setState((prev) => ({
        ...prev,
        selectedPlatformId: platformNumber,
        selectedLiveArgoProfile: profile,
        selectedRiskLocation: { lat, lon },
        locationRisk,
        hycomComparison,
        hycomLoading: false,
        displayMode: 'COMPARISON',
      }));
    } catch (err) {
      if (reqId !== requestSeqRef.current) return;
      console.error('Failed to load Argo profile', err);
      setState((prev) => ({
        ...prev,
        hycomLoading: false,
        hycomError: 'Failed to load Argo float profile.',
      }));
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
      const lat = state.selectedLiveArgoProfile?.latitude ?? state.selectedRiskLocation?.lat ?? 13.75;
      const lon = state.selectedLiveArgoProfile?.longitude ?? state.selectedRiskLocation?.lon ?? 87.30;
      fetchHycomPoint(lat, lon, state.selectedDepth, state.selectedVariable, state.selectedTimestamp);
    }
  }, [state.selectedVariable, state.selectedDepth, state.selectedTimestamp, state.displayMode, state.selectedRiskLocation]);

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

  // Preload initial risk alerts on mount or live data mode toggle
  useEffect(() => {
    fetchRiskAlerts();
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
        selectLocation,
        selectArgoFloat,
        fetchLiveData,
        fetchHycomComparison,
        fetchHycomProfile,
        fetchHycomPoint,
        setDisplayMode,
        setSelectedTimestamp,
        setSelectedYear,
        setSelectedDate,
        setYearDateTime,
        loadLatestTimestamp,
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

