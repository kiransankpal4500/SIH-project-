import React, { createContext, useContext, useState, ReactNode } from 'react';
import { OceanVariable } from '../types';
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
  displayMode: 'OBSERVATION' | 'MODEL' | 'COMPARISON';
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
  fetchHycomPoint: (lat: number, lon: number, depth?: number, variable?: string) => Promise<void>;
  setDisplayMode: (mode: 'OBSERVATION' | 'MODEL' | 'COMPARISON') => void;
}

const initialOceanState: OceanState = {
  selectedVariable: 'temperature',
  selectedDepth: 0,
  activeModelId: 'hycom-glbu0.08',
  is3dGlobeActive: true,
  selectedRegion: APP_CONFIG.defaultLocation.regionName,
  isLiveDataMode: false,
  liveDataStatus: 'DEMO',
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

  const setDisplayMode = (mode: 'OBSERVATION' | 'MODEL' | 'COMPARISON') => {
    setState((prev) => ({ ...prev, displayMode: mode }));
  };

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
      const profile = await getHycomProfile(lat, lon, time);
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

  const fetchHycomPoint = async (lat: number, lon: number, depth = 0, variable = 'temperature') => {
    try {
      setState((prev) => ({ ...prev, hycomLoading: true, hycomError: null }));
      const point = await getHycomPoint(lat, lon, depth, variable);
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
        hycomError: 'HYCOM point unavailable.',
      }));
    }
  };

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
