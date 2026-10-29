/**
 * Ocean Chunk Master View
 * Orchestrates 3D volumetric ocean rendering, 2D real-depth profile, GEBCO bathymetry, and OBIS marine life.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  oceanChunkService,
  BathymetryChunkResponse,
  CopernicusPointResponse,
  CopernicusCurrentResponse,
  CopernicusProfileResponse,
  MarineLifeResponse,
  OceanParametersResponse,
} from '../../services/oceanChunkService';
import { OceanChunk3DView } from './OceanChunk3DView';
import { DEPTH_PRESETS, getZoneForDepth } from './VerticalDepthMeter';
import { OceanChunk2DLayerModal } from './OceanChunk2DLayerModal';
import MarineLifePanel from './MarineLifePanel';
import {
  ArrowLeft,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  Compass,
  Calendar,
  Activity,
  AlertCircle,
  Radio,
  MapPin,
  Globe,
  Info,
} from 'lucide-react';
import { formatCoordinates, formatValue } from '../../utils/formatters';
import { useOceanContext } from '../../store/OceanContext';

interface OceanChunkViewProps {
  latitude: number;
  longitude: number;
  onBackToGlobe: () => void;
}

type ModelSource = 'COPERNICUS' | 'HYCOM';
type ChunkVariable = 'temperature' | 'salinity' | 'current' | 'mld' | 'height';

export const OceanChunkView: React.FC<OceanChunkViewProps> = ({
  latitude,
  longitude,
  onBackToGlobe,
}) => {
  const { state, selectArgoFloat } = useOceanContext();

  // Configuration state - default to verified local HYCOM provider
  const [chunkSize, setChunkSize] = useState<number>(0.05);
  const [activeSource, setActiveSource] = useState<ModelSource>('HYCOM');
  const [selectedVar, setSelectedVar] = useState<ChunkVariable>('temperature');
  const [selectedDepth, setSelectedDepth] = useState<number>(0);

  // Five Scientific Parameters State
  const [parametersData, setParametersData] = useState<OceanParametersResponse | null>(null);
  const [loadingParameters, setLoadingParameters] = useState<boolean>(false);
  const [parametersError, setParametersError] = useState<string | null>(null);

  // Depth Range state (presets or custom min/max)
  const [minDepth, setMinDepth] = useState<number>(0);
  const [maxDepth, setMaxDepth] = useState<number>(200);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('epipelagic_200');
  const [customMinInput, setCustomMinInput] = useState<string>('0');
  const [customMaxInput, setCustomMaxInput] = useState<string>('200');
  const [depthRangeError, setDepthRangeError] = useState<string | null>(null);

  // Environmental and Geological 3D Layer Toggles
  const [showGeology, setShowGeology] = useState<boolean>(true);
  const [showWaterVolume, setShowWaterVolume] = useState<boolean>(true);
  const [showMarineSnow, setShowMarineSnow] = useState<boolean>(true);

  // Separate 2D Layer View Modal State
  const [is2DModalOpen, setIs2DModalOpen] = useState<boolean>(false);

  // Time selection state (HYCOM latest forecast: 2026-08-28T18:00:00Z)
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-28');
  const [selectedHour, setSelectedHour] = useState<string>('18:00:00');
  const [isLatestTime, setIsLatestTime] = useState<boolean>(true);

  // Computed ISO timestamp for API queries
  const selectedTime = useMemo(() => {
    if (isLatestTime) return 'latest';
    return `${selectedDate}T${selectedHour}Z`;
  }, [isLatestTime, selectedDate, selectedHour]);

  // When switching sources, adjust default dates appropriately
  const handleSourceChange = (newSource: ModelSource) => {
    setActiveSource(newSource);
    if (newSource === 'HYCOM') {
      setSelectedDate('2026-08-28');
      setSelectedHour('18:00:00');
      setIsLatestTime(true);
    } else {
      setSelectedDate('2024-05-01');
      setSelectedHour('00:00:00');
      setIsLatestTime(true);
    }
  };

  // Handle Depth Preset Selection
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    setDepthRangeError(null);
    const p = DEPTH_PRESETS.find((preset) => preset.id === presetId);
    if (p) {
      setMinDepth(p.minDepth);
      setMaxDepth(p.maxDepth);
      setCustomMinInput(String(p.minDepth));
      setCustomMaxInput(String(p.maxDepth));
      if (selectedDepth < p.minDepth || selectedDepth > p.maxDepth) {
        setSelectedDepth(p.minDepth);
      }
    }
  };

  // Handle Custom Depth Range Validation & Submission
  const handleApplyCustomDepth = (e: React.FormEvent) => {
    e.preventDefault();
    const minD = Number(customMinInput);
    const maxD = Number(customMaxInput);

    if (isNaN(minD) || isNaN(maxD)) {
      setDepthRangeError('Please enter valid numeric values for min and max depth.');
      return;
    }
    if (minD < 0 || maxD < 0) {
      setDepthRangeError('Depth cannot be negative.');
      return;
    }
    if (minD >= maxD) {
      setDepthRangeError('Minimum depth must be strictly less than maximum depth.');
      return;
    }
    if (maxD > 11000) {
      setDepthRangeError('Maximum depth exceeds global oceanic limit (11,000 m).');
      return;
    }

    setDepthRangeError(null);
    setMinDepth(minD);
    setMaxDepth(maxD);
    setSelectedPresetId('custom');
    if (selectedDepth < minD || selectedDepth > maxD) {
      setSelectedDepth(minD);
    }
  };

  // Data fetching state & Honest Progress Tracking
  const [loadingBathymetry, setLoadingBathymetry] = useState<boolean>(true);
  const [bathymetryStage, setBathymetryStage] = useState<'locating' | 'retrieving' | 'preparing' | 'ready'>('locating');
  const [loadingElapsedSec, setLoadingElapsedSec] = useState<number>(0);
  const [chunkData, setChunkData] = useState<BathymetryChunkResponse | null>(null);
  const [bathymetryError, setBathymetryError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const [loadingPoint, setLoadingPoint] = useState<boolean>(false);
  const [pointData, setPointData] = useState<CopernicusPointResponse | null>(null);
  const [currentData, setCurrentData] = useState<CopernicusCurrentResponse | null>(null);
  const [pointError, setPointError] = useState<string | null>(null);

  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [profileData, setProfileData] = useState<CopernicusProfileResponse | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Marine life state
  const [marineLifeEnabled, setMarineLifeEnabled] = useState<boolean>(false);
  const [marineLifeData, setMarineLifeData] = useState<MarineLifeResponse | null>(null);
  const [marineLifeLoading, setMarineLifeLoading] = useState<boolean>(false);
  const [marineLifeError, setMarineLifeError] = useState<string | null>(null);
  const [marineLifeRadius, setMarineLifeRadius] = useState<number>(50);

  // Available depths supported by dataset
  const availableDepths = [0, 5, 10, 20, 30, 50, 75, 100, 150, 200, 500, 1000, 1500, 2000];

  // 1. Fetch GEBCO Bathymetry Chunk FIRST on coordinate or chunk size change
  useEffect(() => {
    const controller = new AbortController();
    let timer: NodeJS.Timeout | null = null;
    let stageTimer1: NodeJS.Timeout | null = null;
    let stageTimer2: NodeJS.Timeout | null = null;

    const loadBathymetry = async () => {
      setLoadingBathymetry(true);
      setBathymetryError(null);
      setBathymetryStage('locating');
      setLoadingElapsedSec(0);

      // Reset dependent ocean data while determining terrain classification
      setPointData(null);
      setCurrentData(null);
      setProfileData(null);
      setMarineLifeData(null);

      // Track elapsed seconds
      const startTime = Date.now();
      timer = setInterval(() => {
        setLoadingElapsedSec(Math.floor((Date.now() - startTime) / 1000));
      }, 500);

      // Progress actual real stages
      stageTimer1 = setTimeout(() => {
        if (!controller.signal.aborted) setBathymetryStage('retrieving');
      }, 400);

      try {
        const data = await oceanChunkService.getBathymetryChunk(latitude, longitude, chunkSize, 7, controller.signal);
        if (!controller.signal.aborted) {
          setBathymetryStage('preparing');
          // Brief render tick to transition to seabed preparation
          setTimeout(() => {
            if (!controller.signal.aborted) {
              setChunkData(data);
              setBathymetryStage('ready');
              setLoadingBathymetry(false);

              // Automatically choose depth range that includes the measured seabed
              const maxMeasured = data.statistics?.max_depth_m || 1152;
              const roundedMax = Math.round(maxMeasured);
              setMinDepth(0);
              setMaxDepth(roundedMax);
              setCustomMinInput('0');
              setCustomMaxInput(String(roundedMax));

              if (maxMeasured > 4000) {
                setSelectedPresetId('full_column');
              } else if (maxMeasured > 2000) {
                setSelectedPresetId('abyssal_4000');
              } else if (maxMeasured > 1000) {
                setSelectedPresetId('bathypelagic_2000');
              } else if (maxMeasured > 200) {
                setSelectedPresetId('mesopelagic_1000');
              } else {
                setSelectedPresetId('epipelagic_200');
              }
            }
          }, 80);
        }
      } catch (err: any) {
        if (!controller.signal.aborted && err?.name !== 'AbortError') {
          console.error('GEBCO fetch error:', err);
          setBathymetryError(err?.message || 'Bathymetry query timed out or failed to connect to service.');
          setLoadingBathymetry(false);
        }
      }
    };
    loadBathymetry();
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
      if (stageTimer1) clearTimeout(stageTimer1);
      if (stageTimer2) clearTimeout(stageTimer2);
    };
  }, [latitude, longitude, chunkSize, retryTrigger]);

  // Precise GEBCO classification: Ocean requires is_ocean=true, elevation < 0, depth > 0
  const isOcean = useMemo(() => {
    if (!chunkData || !chunkData.selected_point) return false;
    const pt = chunkData.selected_point;
    return Boolean(pt.is_ocean && pt.depth > 0 && pt.elevation < 0);
  }, [chunkData]);

  // 1b. Fetch ALL 5 Scientific Parameters in a unified sub-second query
  useEffect(() => {
    if (loadingBathymetry || !chunkData) return;

    if (!isOcean) {
      setParametersData(null);
      setParametersError(null);
      setLoadingParameters(false);
      return;
    }

    const controller = new AbortController();
    const loadParameters = async () => {
      setLoadingParameters(true);
      setParametersError(null);
      try {
        const data = await oceanChunkService.getOceanParameters(
          latitude,
          longitude,
          selectedDepth,
          selectedTime,
          controller.signal
        );
        if (!controller.signal.aborted) {
          setParametersData(data);
          setLoadingParameters(false);
        }
      } catch (err: any) {
        if (!controller.signal.aborted && err?.name !== 'AbortError') {
          console.warn('Unified ocean parameters warning:', err);
          setParametersError(err.message || 'Parameters data unavailable');
          setLoadingParameters(false);
        }
      }
    };
    loadParameters();
    return () => {
      controller.abort();
    };
  }, [latitude, longitude, selectedDepth, selectedTime, isOcean, loadingBathymetry, chunkData]);

  // 2. Fetch Point / Current data ONLY IF GEBCO verifies coordinate as valid OCEAN
  useEffect(() => {
    if (loadingBathymetry || !chunkData) return;

    if (!isOcean) {
      setPointData(null);
      setCurrentData(null);
      setPointError(null);
      setLoadingPoint(false);
      return;
    }

    const controller = new AbortController();
    const loadPointData = async () => {
      setLoadingPoint(true);
      setPointError(null);
      try {
        if (selectedVar === 'current') {
          const curr =
            activeSource === 'HYCOM'
              ? await oceanChunkService.getHycomCurrent(latitude, longitude, selectedDepth, selectedTime, controller.signal)
              : await oceanChunkService.getCopernicusCurrent(latitude, longitude, selectedDepth, selectedTime, controller.signal);
          if (!controller.signal.aborted) {
            setCurrentData(curr);
            setLoadingPoint(false);
          }
        } else {
          const pt =
            activeSource === 'HYCOM'
              ? await oceanChunkService.getHycomPoint(latitude, longitude, selectedDepth, selectedVar, selectedTime, controller.signal)
              : await oceanChunkService.getCopernicusPoint(latitude, longitude, selectedDepth, selectedVar, selectedTime, controller.signal);
          if (!controller.signal.aborted) {
            setPointData(pt);
            setLoadingPoint(false);
          }
        }
      } catch (err: any) {
        if (!controller.signal.aborted && err?.name !== 'AbortError') {
          console.warn(`${activeSource} ocean data warning:`, err);
          setPointError(err.message || 'Data unavailable for this location/depth/time');
          setLoadingPoint(false);
        }
      }
    };
    loadPointData();
    return () => {
      controller.abort();
    };
  }, [latitude, longitude, selectedVar, selectedDepth, selectedTime, activeSource, isOcean, loadingBathymetry, chunkData]);

  // 3. Fetch CTD vertical profile soundings ONLY IF GEBCO verifies coordinate as valid OCEAN
  useEffect(() => {
    if (loadingBathymetry || !chunkData) return;

    if (!isOcean) {
      setProfileData(null);
      setProfileError(null);
      setLoadingProfile(false);
      return;
    }

    const controller = new AbortController();
    const loadProfile = async () => {
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const prof =
          activeSource === 'HYCOM'
            ? await oceanChunkService.getHycomProfile(latitude, longitude, selectedTime, controller.signal)
            : await oceanChunkService.getCopernicusProfile(latitude, longitude, selectedTime, controller.signal);
        if (!controller.signal.aborted) {
          setProfileData(prof);
          setLoadingProfile(false);
        }
      } catch (err: any) {
        if (!controller.signal.aborted && err?.name !== 'AbortError') {
          console.warn(`${activeSource} vertical profile warning:`, err);
          setProfileError(err.message || 'Vertical profile soundings unavailable');
          setLoadingProfile(false);
        }
      }
    };
    loadProfile();
    return () => {
      controller.abort();
    };
  }, [latitude, longitude, selectedTime, activeSource, isOcean, loadingBathymetry, chunkData]);

  // 4. Fetch marine life species ONLY IF enabled AND verified as valid OCEAN
  useEffect(() => {
    if (!marineLifeEnabled || loadingBathymetry || !chunkData || !isOcean) {
      setMarineLifeData(null);
      setMarineLifeLoading(false);
      return;
    }
    let isCancelled = false;
    const loadMarineLife = async () => {
      setMarineLifeLoading(true);
      setMarineLifeError(null);
      try {
        const data = await oceanChunkService.getMarineLifeSpecies(
          latitude,
          longitude,
          selectedDepth,
          marineLifeRadius,
          10
        );
        if (!isCancelled) {
          setMarineLifeData(data);
          setMarineLifeLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Marine life data error:', err);
          setMarineLifeError('Marine life data unavailable.');
          setMarineLifeLoading(false);
        }
      }
    };
    loadMarineLife();
    return () => { isCancelled = true; };
  }, [marineLifeEnabled, latitude, longitude, selectedDepth, marineLifeRadius, isOcean, loadingBathymetry, chunkData]);

  // Nearby Argo float detection in the vicinity
  const nearbyArgoFloat = useMemo(() => {
    if (!state.liveObservations || state.liveObservations.length === 0) return null;
    return state.liveObservations.find((obs) => {
      const dist = Math.sqrt(
        Math.pow(obs.latitude - latitude, 2) + Math.pow(obs.longitude - longitude, 2)
      );
      return dist <= 2.5; // within ~250km
    });
  }, [state.liveObservations, latitude, longitude]);

  // Get current active variable value for display from parametersData or specific endpoints
  const currentTelemetry = useMemo(() => {
    if (parametersData) {
      if (selectedVar === 'temperature' && parametersData.temperature) {
        return {
          value: parametersData.temperature.value,
          unit: '°C',
          secondary: 'Sea Water Potential Temperature',
          source: `${parametersData.provider} ${parametersData.model}`,
          actualDepth: parametersData.depth,
          actualTime: parametersData.model_time || parametersData.time,
        };
      }
      if (selectedVar === 'salinity' && parametersData.salinity) {
        return {
          value: parametersData.salinity.value,
          unit: 'PSU',
          secondary: 'Practical Salinity Scale (PSS-78)',
          source: `${parametersData.provider} ${parametersData.model}`,
          actualDepth: parametersData.depth,
          actualTime: parametersData.model_time || parametersData.time,
        };
      }
      if (selectedVar === 'current' && parametersData.current) {
        const spd = parametersData.current.speed ?? parametersData.current.value;
        const dir = parametersData.current.direction_degrees;
        return {
          value: spd,
          unit: 'm/s',
          secondary: dir !== undefined && dir !== null ? `${dir.toFixed(1)}° Flow Heading` : 'Geostrophic Current Velocity',
          source: `${parametersData.provider} ${parametersData.model}`,
          actualDepth: parametersData.depth,
          actualTime: parametersData.model_time || parametersData.time,
        };
      }
      if (selectedVar === 'mld' && parametersData.mld) {
        return {
          value: parametersData.mld.value,
          unit: 'm',
          secondary: parametersData.mld.threshold || 'Quasi-homogeneous mixed layer depth',
          source: `${parametersData.provider} ${parametersData.model}`,
          actualDepth: parametersData.depth,
          actualTime: parametersData.model_time || parametersData.time,
        };
      }
      if (selectedVar === 'height' && parametersData.height) {
        return {
          value: parametersData.height.value,
          unit: 'm',
          secondary: parametersData.height.definition || 'Sea Surface Height Anomaly (Dynamic Topography)',
          source: `${parametersData.provider} ${parametersData.model}`,
          actualDepth: parametersData.depth,
          actualTime: parametersData.model_time || parametersData.time,
        };
      }
    }

    if (selectedVar === 'current' && currentData) {
      return {
        value: currentData.speed,
        unit: 'm/s',
        secondary: `${currentData.direction_degrees}° (Heading)`,
        source: currentData.source || (activeSource === 'COPERNICUS' ? 'Copernicus Marine' : 'HYCOM Consortium'),
        actualDepth: currentData.depth,
        actualTime: currentData.time,
      };
    }
    if (pointData) {
      return {
        value: pointData.value,
        unit: pointData.unit,
        secondary: pointData.label,
        source: pointData.source || (activeSource === 'COPERNICUS' ? 'Copernicus Marine' : 'HYCOM Consortium'),
        actualDepth: pointData.depth,
        actualTime: pointData.time,
      };
    }
    return {
      value: null,
      unit: '',
      secondary: '',
      source: activeSource === 'COPERNICUS' ? 'Copernicus Marine' : 'HYCOM Consortium',
      actualDepth: selectedDepth,
      actualTime: selectedTime,
    };
  }, [parametersData, selectedVar, pointData, currentData, activeSource, selectedDepth, selectedTime]);

  // Priority 1 — Five Scientific Parameter Cards Definition (in strict requested order)
  const PARAMETER_CARDS = useMemo(
    () => [
      {
        key: 'temperature' as ChunkVariable,
        label: 'Temperature',
        unit: '°C',
        icon: Thermometer,
        sourceVar: 'Potential Temperature',
        legend: {
          gradient: 'from-[#1e3a8a] via-[#06b6d4] via-[#10b981] via-[#eab308] to-[#ef4444]',
          min: '10.0 °C',
          mid: '20.0 °C',
          max: '32.0 °C',
          scientificNote: 'Potential temperature of the water column (ITS-90 standard).',
        },
      },
      {
        key: 'salinity' as ChunkVariable,
        label: 'Salinity',
        unit: 'PSU',
        icon: Droplets,
        sourceVar: 'Practical Salinity Scale',
        legend: {
          gradient: 'from-[#67e8f9] via-[#0891b2] via-[#2563eb] to-[#1e1b4b]',
          min: '33.0 PSU',
          mid: '35.5 PSU',
          max: '37.5 PSU',
          scientificNote: 'Practical Salinity Scale (PSS-78) derived from conductivity ratios.',
        },
      },
      {
        key: 'current' as ChunkVariable,
        label: 'Geostrophic Current',
        unit: 'm/s',
        icon: Wind,
        sourceVar: 'Coriolis-balanced flow vector',
        legend: {
          gradient: 'from-[#475569] via-[#14b8a6] via-[#10b981] via-[#f59e0b] to-[#d946ef]',
          min: '0.00 m/s',
          mid: '0.40 m/s',
          max: '1.20+ m/s',
          scientificNote: 'Geostrophic velocity calculated from horizontal pressure gradients: u_g = -(g/f) ∂ζ/∂y, v_g = (g/f) ∂ζ/∂x.',
        },
      },
      {
        key: 'mld' as ChunkVariable,
        label: 'Mixed Layer (MLD)',
        unit: 'm',
        icon: Layers,
        sourceVar: 'Quasi-homogeneous mixed layer depth',
        legend: {
          gradient: 'from-[#38bdf8] via-[#2563eb] via-[#7c3aed] to-[#312e81]',
          min: '0 m',
          mid: '50 m',
          max: '150 m',
          scientificNote: 'Mixed Layer Depth defined by UNESCO criteria: vertical level where potential temperature drops ΔT = 0.2°C from sea surface.',
        },
      },
      {
        key: 'height' as ChunkVariable,
        label: 'Sea Height (ζ0)',
        unit: 'm',
        icon: Compass,
        sourceVar: 'Sea Surface Height Anomaly',
        legend: {
          gradient: 'from-[#1e3a8a] via-[#38bdf8] via-[#ffffff] via-[#fb923c] to-[#dc2626]',
          min: '-0.40 m',
          mid: '0.00 m',
          max: '+0.40 m',
          scientificNote: 'Sea Surface Height Anomaly (ζ0) relative to the Earth geoid datum (Dynamic Topography).',
        },
      },
    ],
    []
  );

  const activeLegend = useMemo(() => {
    const found = PARAMETER_CARDS.find((c) => c.key === selectedVar);
    return found ? found.legend : PARAMETER_CARDS[0].legend;
  }, [PARAMETER_CARDS, selectedVar]);

  const bathymetricDepth = isOcean && chunkData ? chunkData.selected_point.depth : 0;
  const landElevation = chunkData?.selected_point?.elevation ?? 0;

  return (
    <div className="chunk-explorer-theme bg-[#F7F9FC] p-2 sm:p-4 rounded-[28px] max-w-7xl mx-auto my-3">
      <div className="bg-[#FFFFFF] border border-[#E2EAF2] rounded-[28px] shadow-[0_6px_24px_rgba(22,43,77,0.045)] overflow-hidden transition-all">
        {/* ─── 1. TOP HEADER & METADATA BAR ─── */}
        <div className="bg-[#FFFFFF] border-b border-[#E2EAF2] px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button
                onClick={onBackToGlobe}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#FFFFFF] hover:bg-[#EAF5FF] text-[#087FC4] border border-[#E2EAF2] rounded-[18px] text-xs font-semibold shadow-[0_2px_8px_rgba(22,43,77,0.03)] hover:border-[#BFDBFE] transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Globe</span>
              </button>
              <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider ml-1">
                Selected Location Analysis
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl font-bold text-[#172B4D] tracking-tight">
                {formatCoordinates(latitude, longitude)}
              </h2>
              {loadingBathymetry ? (
                <span className="text-xs px-3 py-1 rounded-full bg-[#F8FAFC] text-[#64748B] font-semibold border border-[#E2EAF2]">
                  Classifying Terrain...
                </span>
              ) : bathymetryError || !chunkData ? (
                <span className="text-xs px-3 py-1 rounded-full bg-[#FEE2E2] text-[#DC2626] font-semibold border border-[#FECACA]">
                  Bathymetry Unavailable
                </span>
              ) : isOcean ? (
                <span className="text-xs px-3 py-1 rounded-full bg-[#EAF5FF] text-[#087FC4] font-semibold border border-[#BFDBFE]">
                  3D + 2D Ocean Water Column
                </span>
              ) : (
                <span className="text-xs px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] font-semibold border border-[#FDE68A]">
                  Land Location (Non-Oceanic)
                </span>
              )}
            </div>
          </div>

          {/* Scientific Bathymetry Badge */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="bg-[#F8FAFC] border border-[#E2EAF2] px-4 py-2.5 rounded-[20px] shadow-[0_2px_8px_rgba(22,43,77,0.02)]">
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                {loadingBathymetry
                  ? 'Bathymetry / Elevation'
                  : bathymetryError || !chunkData
                  ? 'Bathymetry Status'
                  : isOcean
                  ? 'Bathymetric Depth'
                  : 'Topographic Elevation'}
              </span>
              <span className={`text-base font-bold font-mono ${
                loadingBathymetry
                  ? 'text-[#64748B]'
                  : bathymetryError || !chunkData
                  ? 'text-[#DC2626]'
                  : isOcean
                  ? 'text-[#087FC4]'
                  : 'text-[#D97706]'
              }`}>
                {loadingBathymetry
                  ? '...'
                  : bathymetryError || !chunkData
                  ? 'Unavailable'
                  : isOcean
                  ? `${chunkData?.selected_point.depth} m`
                  : landElevation > 0
                  ? `+${landElevation.toFixed(1)} m (Land)`
                  : '0.0 m (Coast/Land)'}
              </span>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2EAF2] px-4 py-2.5 rounded-[20px] shadow-[0_2px_8px_rgba(22,43,77,0.02)]">
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                Elevation Source
              </span>
              <span className="text-xs font-semibold text-[#172B4D]">
                {bathymetryError || !chunkData ? 'GEBCO (Offline/Error)' : 'GEBCO (Real Grid)'}
              </span>
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2EAF2] px-4 py-2.5 rounded-[20px] shadow-[0_2px_8px_rgba(22,43,77,0.02)]">
              <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                Chunk Window
              </span>
              <div className="flex items-center gap-1 mt-1">
                {[0.025, 0.05, 0.1].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setChunkSize(sz)}
                    className={`px-2 py-0.5 rounded-[12px] text-[11px] font-semibold transition-all ${
                      chunkSize === sz
                        ? 'bg-[#087FC4] text-[#FFFFFF] shadow-xs'
                        : 'bg-[#FFFFFF] text-[#64748B] border border-[#E2EAF2] hover:text-[#172B4D]'
                    }`}
                  >
                    ±{sz}°
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 bg-[#FFFFFF]">
          {/* ─── 2. TERRAIN CLASSIFICATION LOGIC & RENDERING ─── */}
          {loadingBathymetry ? (
            <div className="w-full h-[450px] bg-[#FFFFFF] rounded-[28px] flex flex-col items-center justify-center text-[#172B4D] p-8 border border-[#E2EAF2] shadow-[0_6px_24px_rgba(22,43,77,0.045)] relative overflow-hidden">
              {/* Spinner */}
              <div className="relative mb-6">
                <div className="w-12 h-12 border-3 border-[#E2EAF2] border-t-[#087FC4] rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-mono text-[#087FC4] font-bold">
                  {loadingElapsedSec}s
                </div>
              </div>

              {/* Stage title */}
              <div className="text-base font-semibold tracking-tight text-[#172B4D] mb-2 text-center">
                {bathymetryStage === 'locating' && 'Locating ocean grid…'}
                {bathymetryStage === 'retrieving' && 'Retrieving GEBCO bathymetry…'}
                {bathymetryStage === 'preparing' && 'Preparing 3D seabed…'}
                {bathymetryStage === 'ready' && 'Bathymetry ready'}
              </div>

              {/* Subtext description */}
              <p className="text-xs text-[#64748B] max-w-sm text-center mb-6 leading-relaxed">
                {bathymetryStage === 'locating' && 'Resolving geographic bounding box coordinates for depth sampling.'}
                {bathymetryStage === 'retrieving' && 'Querying regional seabed elevation data (GEBCO 2024 Grid).'}
                {bathymetryStage === 'preparing' && 'Constructing 3D triangular elevation mesh and depth contours.'}
                {bathymetryStage === 'ready' && 'Rendering ocean water column…'}
              </p>

              {/* Stepper indicators */}
              <div className="flex items-center gap-3 text-[11px] font-medium text-[#64748B]">
                <span className={`px-3 py-1 rounded-full border ${bathymetryStage === 'locating' ? 'bg-[#EAF5FF] text-[#087FC4] border-[#BFDBFE] font-semibold' : 'bg-[#F8FAFC] border-[#E2EAF2] text-[#64748B]'}`}>
                  1. Locate
                </span>
                <span className="text-[#CBD5E1]">→</span>
                <span className={`px-3 py-1 rounded-full border ${bathymetryStage === 'retrieving' ? 'bg-[#EAF5FF] text-[#087FC4] border-[#BFDBFE] font-semibold' : bathymetryStage === 'preparing' || bathymetryStage === 'ready' ? 'bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0] font-semibold' : 'bg-[#F8FAFC] border-[#E2EAF2] text-[#64748B]'}`}>
                  2. Bathymetry
                </span>
                <span className="text-[#CBD5E1]">→</span>
                <span className={`px-3 py-1 rounded-full border ${bathymetryStage === 'preparing' || bathymetryStage === 'ready' ? 'bg-[#EAF5FF] text-[#087FC4] border-[#BFDBFE] font-semibold' : 'bg-[#F8FAFC] border-[#E2EAF2] text-[#64748B]'}`}>
                  3. 3D Terrain
                </span>
              </div>

              {/* Timeout warning if taking longer than expected */}
              {loadingElapsedSec >= 6 && (
                <div className="mt-6 text-xs text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-3.5 py-2 rounded-[16px] flex items-center gap-2">
                  <span>Remote GEBCO query is taking longer than usual ({loadingElapsedSec}s). Automatic fallback will engage if timeout threshold is reached.</span>
                </div>
              )}
            </div>
          ) : bathymetryError || !chunkData ? (
            <div className="w-full bg-[#FFF8F8] border border-[#FEE2E2] rounded-[28px] p-8 flex flex-col items-center justify-center text-center text-[#991B1B] space-y-4 shadow-[0_4px_16px_rgba(22,43,77,0.03)]">
              <div className="p-3 bg-[#FEE2E2] rounded-[20px] text-red-600">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#991B1B]">Bathymetry Retrieval Notice</h3>
                <p className="text-xs text-[#B91C1C] mt-1 max-w-md">
                  Unable to retrieve or verify the elevation grid for this coordinate.
                </p>
                <div className="text-[11px] text-[#DC2626] mt-2 font-mono bg-white px-3 py-1.5 rounded-[14px] border border-[#FECACA] inline-block max-w-lg truncate">
                  {bathymetryError}
                </div>
              </div>

              {/* Explicit Retry Button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setRetryTrigger((prev) => prev + 1)}
                  className="px-4 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-[18px] text-xs font-semibold shadow-xs transition-all flex items-center gap-2"
                >
                  <span>Retry Bathymetry Query</span>
                </button>
                <button
                  onClick={onBackToGlobe}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-[#E2EAF2] text-[#172B4D] rounded-[18px] text-xs font-semibold transition-all shadow-xs"
                >
                  Return to Globe
                </button>
              </div>
            </div>
          ) : !isOcean ? (
            /* ─── DEDICATED LAND STATE: CLEAR, SCIENTIFIC & NO FAKE OCEAN SIMULATION ─── */
            <div className="bg-[#FFFFFF] border border-[#E2EAF2] rounded-[28px] p-6 md:p-8 space-y-6 shadow-[0_6px_24px_rgba(22,43,77,0.045)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2EAF2] pb-6">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 bg-[#FEF3C7] text-[#D97706] rounded-[20px] border border-[#FDE68A] shadow-xs">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#172B4D] tracking-tight">
                      Land Location — Ocean Data Unavailable
                    </h3>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Selected coordinate is classified as continental land mass / terrestrial topography.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                  Non-Oceanic Coordinate
                </span>
              </div>

              {/* Scientific Explanation Box */}
              <div className="bg-[#F8FAFC] border border-[#E2EAF2] rounded-[22px] p-5 shadow-xs flex items-start gap-3.5">
                <Info className="w-5 h-5 text-[#087FC4] shrink-0 mt-0.5" />
                <div className="text-xs text-[#334155] leading-relaxed space-y-2">
                  <p>
                    The selected coordinate at <strong className="text-[#172B4D] font-mono">{formatCoordinates(latitude, longitude)}</strong> is situated on terrestrial land terrain with a ground elevation of{' '}
                    <strong className="text-[#D97706] font-mono font-bold">
                      {landElevation >= 0 ? `+${landElevation.toFixed(1)} m` : `${landElevation.toFixed(1)} m`}
                    </strong>{' '}
                    above mean sea level according to the <strong className="text-[#172B4D]">GEBCO (General Bathymetric Chart of the Oceans) 2024 Grid</strong>.
                  </p>
                  <p className="text-[#64748B]">
                    Oceanographic water-column simulations, vertical CTD soundings (Temperature & Salinity), geostrophic current vectors, mixed layer depth (MLD), and marine species data cannot be generated because there is no oceanic water column present at this location.
                  </p>
                </div>
              </div>

              {/* Scientific Breakdown Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#F8FAFC] border border-[#E2EAF2] rounded-[20px] p-4 shadow-xs">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Latitude / Longitude
                  </span>
                  <span className="text-sm font-bold font-mono text-[#172B4D] mt-1 block">
                    {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
                  </span>
                  <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Global Coordinates</span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2EAF2] rounded-[20px] p-4 shadow-xs">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                    GEBCO Ground Elevation
                  </span>
                  <span className="text-sm font-bold font-mono text-[#D97706] mt-1 block">
                    {landElevation >= 0 ? `+${landElevation.toFixed(1)} m` : `${landElevation.toFixed(1)} m`} ASL
                  </span>
                  <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Above Mean Sea Level</span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2EAF2] rounded-[20px] p-4 shadow-xs">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Ocean Water Depth
                  </span>
                  <span className="text-sm font-bold font-mono text-[#64748B] mt-1 block">
                    0.0 m (No Water Column)
                  </span>
                  <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Zero bathymetric depth</span>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2EAF2] rounded-[20px] p-4 shadow-xs">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Chunk Ocean Coverage
                  </span>
                  <span className="text-sm font-bold font-mono text-[#172B4D] mt-1 block">
                    {chunkData.statistics.ocean_coverage_percent}%
                  </span>
                  <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Within ±{chunkSize}° local area</span>
                </div>
              </div>

              {/* Direct Action Guidance */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  <Globe className="w-4 h-4 text-[#087FC4]" />
                  <span>
                    Tip: Double-click any blue ocean region on the global explorer to view a full 3D underwater chunk.
                  </span>
                </div>
                <button
                  onClick={onBackToGlobe}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#087FC4] hover:bg-[#0568A6] text-[#FFFFFF] font-bold rounded-[18px] text-xs shadow-xs transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to 3D Ocean Globe</span>
                </button>
              </div>
            </div>
          ) : (
          /* ─── 3. VALID OCEAN COORDINATE: RENDER 3D CHUNK + 2D CROSS SECTION ─── */
          <>
            <div className="space-y-5">
              {/* Header Bar with 2D Layer View Modal Trigger Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFFFF] border border-[#E2EAF2] p-5 rounded-[24px] shadow-[0_4px_16px_rgba(22,43,77,0.03)]">
                <div>
                  <h3 className="text-base font-bold text-[#172B4D] flex items-center gap-2">
                    <Layers className="w-5 h-5 text-[#087FC4]" />
                    <span>Realistic 3D Ocean Volume Chunk & Bathymetric Seabed</span>
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Volumetric ocean simulation with dynamic waves, Beer-Lambert light extinction, GEBCO bathymetry, and geological strata.
                  </p>
                </div>

                {/* Explicit Separate 2D Layer View Trigger Button */}
                <button
                  onClick={() => setIs2DModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#087FC4] hover:bg-[#0568A6] text-white font-semibold text-xs rounded-[18px] shadow-[0_4px_12px_rgba(8,127,196,0.25)] hover:shadow-[0_6px_16px_rgba(8,127,196,0.35)] transition-all shrink-0"
                >
                  <Layers className="w-4 h-4" />
                  <span>Open 2D Layer View</span>
                </button>
              </div>

              {/* ─── PRIORITY 1: PRIMARY SCIENTIFIC CONTROLS & FIVE PARAMETER CARDS ─── */}
              <div className="space-y-4">
                {/* Unified Configuration Strip: Source, Sounding Depth, and Date/Time */}
                <div className="bg-[#F8FAFC] border border-[#E2EAF2] rounded-[24px] p-4 shadow-[0_2px_10px_rgba(22,43,77,0.03)] flex flex-wrap items-center justify-between gap-4 text-xs">
                  {/* Left: Model Source Selection */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#64748B] uppercase tracking-wider text-[11px]">
                      Source:
                    </span>
                    <div className="inline-flex rounded-[18px] border border-[#E2EAF2] bg-[#FFFFFF] p-1 shadow-2xs">
                      <button
                        onClick={() => handleSourceChange('HYCOM')}
                        className={`px-3 py-1.5 rounded-[14px] font-bold text-xs transition-all ${
                          activeSource === 'HYCOM'
                            ? 'bg-[#087FC4] text-[#FFFFFF] shadow-xs'
                            : 'text-[#64748B] hover:text-[#172B4D]'
                        }`}
                      >
                        HYCOM (OPeNDAP)
                      </button>
                      <button
                        onClick={() => handleSourceChange('COPERNICUS')}
                        className={`px-3 py-1.5 rounded-[14px] font-bold text-xs transition-all ${
                          activeSource === 'COPERNICUS'
                            ? 'bg-[#087FC4] text-[#FFFFFF] shadow-xs'
                            : 'text-[#64748B] hover:text-[#172B4D]'
                        }`}
                      >
                        Copernicus
                      </button>
                    </div>
                  </div>

                  {/* Middle: Sounding Depth Level Selection */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#64748B] uppercase tracking-wider text-[11px]">
                      Sounding Depth:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {availableDepths.slice(0, 6).map((d) => (
                        <button
                          key={d}
                          onClick={() => setSelectedDepth(d)}
                          className={`px-2.5 py-1.5 rounded-[18px] font-semibold font-mono text-[11px] transition-all ${
                            selectedDepth === d
                              ? 'bg-[#172B4D] text-[#FFFFFF] shadow-xs'
                              : 'bg-[#FFFFFF] border border-[#E2EAF2] text-[#64748B] hover:bg-[#EAF5FF] hover:text-[#087FC4]'
                          }`}
                        >
                          {d === 0 ? '0m (Surface)' : `${d}m`}
                        </button>
                      ))}
                      <select
                        value={selectedDepth >= 75 ? selectedDepth : ''}
                        onChange={(e) => setSelectedDepth(Number(e.target.value))}
                        aria-label="Select deeper depth level"
                        className="px-2.5 py-1.5 rounded-[18px] font-semibold text-[11px] bg-[#FFFFFF] border border-[#E2EAF2] text-[#172B4D] focus:ring-2 focus:ring-[#087FC4]/20 outline-none"
                      >
                        <option value="" disabled>Deeper...</option>
                        {availableDepths.slice(6).map((d) => (
                          <option key={d} value={d}>{d}m</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right: Date & Time Selection */}
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#64748B] uppercase tracking-wider text-[11px] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#087FC4]" />
                      <span>Date/Time:</span>
                    </span>
                    <button
                      onClick={() => setIsLatestTime(true)}
                      className={`px-3 py-1.5 rounded-[18px] text-[11px] font-semibold border transition-all ${
                        isLatestTime
                          ? 'bg-[#087FC4] text-[#FFFFFF] border-[#087FC4] shadow-xs'
                          : 'bg-[#FFFFFF] text-[#64748B] border-[#E2EAF2] hover:bg-[#EAF5FF] hover:text-[#087FC4]'
                      }`}
                    >
                      Latest
                    </button>
                    <div className="inline-flex items-center gap-1.5 bg-[#FFFFFF] border border-[#E2EAF2] rounded-[18px] px-3 py-1 shadow-2xs">
                      <input
                        type="date"
                        value={selectedDate}
                        min={activeSource === 'HYCOM' ? '2018-12-04' : '2023-01-01'}
                        max={activeSource === 'HYCOM' ? '2026-09-03' : '2026-08-28'}
                        onChange={(e) => {
                          setSelectedDate(e.target.value);
                          setIsLatestTime(false);
                        }}
                        aria-label="Select model date"
                        className="text-[11px] font-mono font-medium text-[#172B4D] bg-transparent outline-none cursor-pointer"
                      />
                      <select
                        value={selectedHour}
                        onChange={(e) => {
                          setSelectedHour(e.target.value);
                          setIsLatestTime(false);
                        }}
                        aria-label="Select model time hour"
                        className="text-[10px] font-mono font-medium text-[#087FC4] bg-transparent outline-none cursor-pointer border-l border-[#E2EAF2] pl-1.5"
                      >
                        {['00:00:00', '03:00:00', '06:00:00', '09:00:00', '12:00:00', '15:00:00', '18:00:00', '21:00:00'].map((h) => (
                          <option key={h} value={h}>
                            {h.slice(0, 5)} UTC
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Five Parameter Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                  {PARAMETER_CARDS.map((card) => {
                    const isActive = selectedVar === card.key;
                    const Icon = card.icon;
                    const item = parametersData ? (parametersData as any)[card.key] : null;

                    let valText: React.ReactNode = '—';
                    let subText = card.sourceVar;
                    let isUnavailable = false;

                    if (loadingParameters) {
                      valText = <span className="animate-pulse text-[#94A3B8] text-sm">Querying...</span>;
                    } else if (item) {
                      if (card.key === 'current') {
                        const spd = item.speed ?? item.value;
                        if (spd !== null && spd !== undefined && !isNaN(spd)) {
                          valText = (
                            <span>
                              {spd.toFixed(2)}{' '}
                              <span className="text-xs font-normal text-[#64748B] font-sans">{card.unit}</span>
                            </span>
                          );
                          if (item.direction_degrees !== undefined && item.direction_degrees !== null) {
                            subText = `${item.direction_degrees.toFixed(1)}° Flow Heading`;
                          }
                        } else {
                          valText = 'Data unavailable';
                          isUnavailable = true;
                        }
                      } else {
                        const v = item.value;
                        if (v !== null && v !== undefined && !isNaN(v)) {
                          const formatted = Math.abs(v) < 0.1 && v !== 0 ? v.toFixed(3) : v.toFixed(2);
                          valText = (
                            <span>
                              {v > 0 && card.key === 'height' ? '+' : ''}{formatted}{' '}
                              <span className="text-xs font-normal text-[#64748B] font-sans">{card.unit}</span>
                            </span>
                          );
                          if (item.threshold) subText = item.threshold;
                          else if (item.definition) subText = item.definition;
                        } else {
                          valText = 'Data unavailable';
                          isUnavailable = true;
                        }
                      }
                    } else if (currentTelemetry.value !== null && isActive) {
                      valText = (
                        <span>
                          {currentTelemetry.value}{' '}
                          <span className="text-xs font-normal text-[#64748B] font-sans">{card.unit}</span>
                        </span>
                      );
                    } else {
                      valText = 'Data unavailable';
                      isUnavailable = true;
                    }

                    return (
                      <button
                        key={card.key}
                        type="button"
                        onClick={() => setSelectedVar(card.key)}
                        className={`group relative text-left p-4 sm:p-5 rounded-[22px] border transition-all duration-200 flex flex-col justify-between min-h-[118px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087FC4] focus-visible:ring-offset-2 ${
                          isActive
                            ? 'bg-[#EAF5FF] border-[#087FC4] shadow-[0_6px_20px_rgba(8,127,196,0.08)]'
                            : 'bg-[#FFFFFF] hover:bg-[#F8FAFC] border-[#E2EAF2] shadow-[0_4px_16px_rgba(22,43,77,0.03)] hover:shadow-[0_8px_24px_rgba(22,43,77,0.06)] hover:border-[#BFDBFE]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 w-full">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-[14px] flex items-center justify-center transition-colors ${
                                isActive
                                  ? 'bg-[#087FC4] text-white shadow-xs'
                                  : 'bg-[#F1F5F9] text-[#64748B] group-hover:bg-[#EAF5FF] group-hover:text-[#087FC4]'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span
                                className={`text-xs font-bold leading-tight block ${
                                  isActive ? 'text-[#087FC4]' : 'text-[#172B4D]'
                                }`}
                              >
                                {card.label}
                              </span>
                              <span className="text-[10px] text-[#64748B] font-mono font-medium block">
                                Unit: {card.unit}
                              </span>
                            </div>
                          </div>

                          {isActive && (
                            <span className="w-2 h-2 rounded-full bg-[#087FC4] shrink-0 mt-1 animate-pulse" />
                          )}
                        </div>

                        <div className="mt-3.5">
                          <div
                            className={`text-2xl font-mono tracking-tight leading-none ${
                              isUnavailable
                                ? 'text-[#D97706] text-xs font-sans font-semibold'
                                : isActive
                                ? 'text-[#0568A6] font-bold'
                                : 'text-[#172B4D] font-bold'
                            }`}
                          >
                            {valText}
                          </div>
                          <div className="text-[11px] text-[#64748B] truncate mt-1.5">
                            {subText}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* ─── DYNAMIC SCIENTIFIC COLOR LEGEND BAR ─── */}
                <div className="bg-[#FFFFFF] border border-[#E2EAF2] rounded-[24px] p-4 sm:p-5 shadow-[0_4px_16px_rgba(22,43,77,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs overflow-hidden">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-[14px] bg-[#EAF5FF] border border-[#BFDBFE] text-[#087FC4] flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-[#172B4D] flex items-center gap-2 flex-wrap">
                        <span>{PARAMETER_CARDS.find((c) => c.key === selectedVar)?.label} Visual Scale</span>
                        <span className="px-2 py-0.5 rounded-full bg-[#EAF5FF] text-[#087FC4] font-mono text-[10px] border border-[#BFDBFE]">
                          {PARAMETER_CARDS.find((c) => c.key === selectedVar)?.unit}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-0.5 truncate sm:whitespace-normal">
                        {activeLegend.scientificNote}
                      </p>
                    </div>
                  </div>

                  {/* Scientific Color Gradient Ramp */}
                  <div className="flex flex-col gap-1.5 w-full md:w-72 lg:w-80 max-w-full min-w-0 md:shrink-0">
                    <div className={`h-3 w-full rounded-full bg-gradient-to-r ${activeLegend.gradient} shadow-inner border border-[#E2EAF2]`} />
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#64748B] px-0.5">
                      <span className="shrink-0">{activeLegend.min}</span>
                      <span className="text-[#087FC4] font-bold px-1 text-center truncate">{activeLegend.mid}</span>
                      <span className="shrink-0 text-right">{activeLegend.max}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Depth Selection Presets & Custom Depth Range Controls */}
              <div className="bg-[#FFFFFF] border border-[#E2EAF2] p-5 rounded-[24px] shadow-[0_4px_16px_rgba(22,43,77,0.03)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2EAF2] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                      Depth Range Presets:
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {DEPTH_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handlePresetChange(preset.id)}
                          className={`px-3 py-1.5 rounded-[18px] text-xs font-semibold transition-all ${
                            selectedPresetId === preset.id
                              ? 'bg-[#087FC4] text-white shadow-[0_2px_8px_rgba(8,127,196,0.3)]'
                              : 'bg-[#F8FAFC] border border-[#E2EAF2] text-[#64748B] hover:bg-[#EAF5FF] hover:text-[#087FC4]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active Ocean Zone Indicator Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#64748B]">Current Ocean Zone:</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#EAF5FF] text-[#087FC4] border border-[#BFDBFE]">
                      {getZoneForDepth((minDepth + maxDepth) / 2).name}
                    </span>
                  </div>
                </div>

                {/* Custom Min / Max Depth Form */}
                <form onSubmit={handleApplyCustomDepth} className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-bold text-[#172B4D]">Custom Range (m):</span>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[#64748B]">Min:</label>
                    <input
                      type="number"
                      min={0}
                      max={11000}
                      value={customMinInput}
                      onChange={(e) => setCustomMinInput(e.target.value)}
                      className="w-20 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2EAF2] rounded-[18px] text-[#172B4D] font-mono text-xs focus:bg-white focus:border-[#087FC4] focus:ring-2 focus:ring-[#087FC4]/20 outline-none transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-[#64748B]">Max:</label>
                    <input
                      type="number"
                      min={1}
                      max={11000}
                      value={customMaxInput}
                      onChange={(e) => setCustomMaxInput(e.target.value)}
                      className="w-20 px-3 py-1.5 bg-[#F8FAFC] border border-[#E2EAF2] rounded-[18px] text-[#172B4D] font-mono text-xs focus:bg-white focus:border-[#087FC4] focus:ring-2 focus:ring-[#087FC4]/20 outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#087FC4] hover:bg-[#0568A6] text-white font-semibold rounded-[18px] text-xs transition-colors shadow-xs"
                  >
                    Apply Custom Range
                  </button>

                  {depthRangeError && (
                    <span className="text-[#B91C1C] text-xs font-medium bg-[#FEE2E2] border border-[#FECACA] px-3 py-1 rounded-full">
                      {depthRangeError}
                    </span>
                  )}
                </form>

                {/* 3D Scientific Layer Visibility Toggles */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[#E2EAF2] text-xs">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    3D Scene Layers:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGeology((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-[18px] text-xs font-medium transition-all border ${
                      showGeology
                        ? 'bg-[#EAF5FF] text-[#087FC4] border-[#BFDBFE] font-semibold shadow-xs'
                        : 'bg-[#F8FAFC] text-[#64748B] border-[#E2EAF2] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    ⛰️ Seabed & Geology (GEBCO + Strata)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWaterVolume((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-[18px] text-xs font-medium transition-all border ${
                      showWaterVolume
                        ? 'bg-[#EAF5FF] text-[#087FC4] border-[#BFDBFE] font-semibold shadow-xs'
                        : 'bg-[#F8FAFC] text-[#64748B] border-[#E2EAF2] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    🌊 Water Column Cutaway
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMarineSnow((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-[18px] text-xs font-medium transition-all border ${
                      showMarineSnow
                        ? 'bg-[#EAF5FF] text-[#087FC4] border-[#BFDBFE] font-semibold shadow-xs'
                        : 'bg-[#F8FAFC] text-[#64748B] border-[#E2EAF2] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    ❄️ Marine Snow Particles
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarineLifeEnabled((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-[18px] text-xs font-medium transition-all border ${
                      marineLifeEnabled
                        ? 'bg-[#EAF5FF] text-[#087FC4] border-[#BFDBFE] font-semibold shadow-xs'
                        : 'bg-[#F8FAFC] text-[#64748B] border-[#E2EAF2] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    🐠 Marine Organisms (Ecosystem)
                  </button>
                </div>
              </div>

              {/* 3D Realistic Ocean Chunk Simulation Container */}
              <div className="w-full flex flex-col rounded-[28px] overflow-hidden border border-[#E2EAF2] shadow-[0_6px_24px_rgba(22,43,77,0.045)] bg-[#FFFFFF]">
                <OceanChunk3DView
                  chunkData={chunkData}
                  selectedVariable={selectedVar}
                  variableValue={currentTelemetry.value}
                  variableUnit={currentTelemetry.unit}
                  selectedDepth={selectedDepth}
                  minDepth={minDepth}
                  maxDepth={maxDepth}
                  mldDepth={parametersData?.mld?.value ?? null}
                  profileData={profileData}
                  loadingProfile={loadingProfile}
                  profileError={profileError}
                  currentData={
                    currentData ||
                    (parametersData?.current.speed !== undefined
                      ? ({
                          speed: parametersData.current.speed ?? 0,
                          direction_degrees: parametersData.current.direction_degrees ?? 0,
                          depth: parametersData.depth,
                          time: parametersData.model_time || parametersData.time,
                          u: parametersData.current.u ?? 0,
                          v: parametersData.current.v ?? 0,
                          source: `${parametersData.provider} ${parametersData.model}`,
                        } as any)
                      : null)
                  }
                  marineLifeEnabled={marineLifeEnabled}
                  marineLifeSpecies={marineLifeData?.species || []}
                  fishCount={10}
                  showGeology={showGeology}
                  showWaterVolume={showWaterVolume}
                  showMarineSnow={showMarineSnow}
                />
              </div>
            </div>

            {/* Separate 2D Layer View Modal Window (Strictly isolated from 3D Canvas) */}
            <OceanChunk2DLayerModal
              isOpen={is2DModalOpen}
              onClose={() => setIs2DModalOpen(false)}
              latitude={latitude}
              longitude={longitude}
              minDepth={minDepth}
              maxDepth={maxDepth}
              currentDepth={selectedDepth}
              seabedDepths={chunkData.depths}
              seabedMaxDepthM={chunkData.statistics.max_depth_m}
              profileData={profileData}
              currentData={currentData}
              source={activeSource === 'COPERNICUS' ? 'Copernicus Marine Service' : 'INCOIS RSMC HYCOM'}
            />

            {/* ─── 2. CTD VERTICAL SOUNDINGS PROFILE TABLE (FULL WIDTH) ─── */}
            <div className="bg-[#FFFFFF] border border-[#E2EAF2] rounded-[24px] p-5 sm:p-6 shadow-[0_4px_16px_rgba(22,43,77,0.03)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2EAF2] pb-3.5">
                <div>
                  <h4 className="text-xs uppercase font-bold text-[#172B4D] tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#087FC4]" />
                    <span>Vertical Depth Soundings (CTD Profile)</span>
                  </h4>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    In-situ potential temperature & salinity soundings through the water column at {latitude.toFixed(2)}°N, {longitude.toFixed(2)}°E.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
                    <span className="font-semibold text-[#172B4D]">Temperature (°C)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#087FC4]"></span>
                    <span className="font-semibold text-[#172B4D]">Salinity (PSU)</span>
                  </div>
                </div>
              </div>

              {/* Profile Data Table / Sounding Visualizer */}
              {loadingProfile ? (
                <div className="py-8 text-center text-xs text-[#64748B] animate-pulse">
                  Loading vertical profile soundings...
                </div>
              ) : profileError ? (
                <div className="py-8 text-center text-xs text-[#64748B] space-y-1">
                  <p className="text-[#D97706] font-medium">{profileError}</p>
                  <p className="text-[11px] text-[#94A3B8]">Vertical soundings are unavailable for this location or time.</p>
                </div>
              ) : profileData && profileData.depths && profileData.depths.length > 0 ? (
                <div className="overflow-x-auto max-h-[180px] overflow-y-auto rounded-[16px] border border-[#E2EAF2]">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#F8FAFC] text-[#64748B] sticky top-0 border-b border-[#E2EAF2]">
                      <tr>
                        <th className="py-2.5 px-3.5 font-semibold">Depth (m)</th>
                        <th className="py-2.5 px-3.5 font-semibold text-[#DC2626]">Temperature (°C)</th>
                        <th className="py-2.5 px-3.5 font-semibold text-[#087FC4]">Salinity (PSU)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1F5F9] font-mono">
                      {profileData.depths.slice(0, 14).map((d, i) => (
                        <tr
                          key={d}
                          className={selectedDepth === d ? 'bg-[#EAF5FF] font-bold text-[#172B4D]' : 'hover:bg-[#F8FAFC] text-[#172B4D]'}
                        >
                          <td className="py-2 px-3.5 font-sans font-medium">{d}m</td>
                          <td className="py-2 px-3.5 text-[#DC2626]">
                            {profileData.temperature[i] !== null && profileData.temperature[i] !== undefined
                              ? `${profileData.temperature[i]} °C`
                              : '—'}
                          </td>
                          <td className="py-2 px-3.5 text-[#087FC4]">
                            {profileData.salinity[i] !== null && profileData.salinity[i] !== undefined
                              ? `${profileData.salinity[i]} PSU`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#64748B]">
                  Profile soundings unavailable for this location/time.
                </div>
              )}
            </div>

            {/* ─── 3. NEARBY ARGO FLOAT INTEGRATION (IF IN VICINITY) ─── */}
            {nearbyArgoFloat && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-[20px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-[0_2px_10px_rgba(22,43,77,0.03)]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#DCFCE7] text-[#16A34A] rounded-[16px]">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#15803D] block text-sm">
                      In-Situ Argo Float #{nearbyArgoFloat.platform_number} Active Near Chunk
                    </span>
                    <span className="text-[#166534]">
                      Cycle {nearbyArgoFloat.cycle_number} • {formatCoordinates(nearbyArgoFloat.latitude, nearbyArgoFloat.longitude)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => selectArgoFloat(nearbyArgoFloat.platform_number, nearbyArgoFloat.cycle_number)}
                  className="px-4 py-2 bg-[#16A34A] text-[#FFFFFF] font-semibold rounded-[18px] hover:bg-[#15803D] transition-colors self-start sm:self-auto shadow-xs"
                >
                  Inspect Float Profile
                </button>
              </div>
            )}

            {/* ─── 7. MARINE LIFE PANEL ─── */}
            <MarineLifePanel
              marineData={marineLifeData}
              enabled={marineLifeEnabled}
              onToggle={() => setMarineLifeEnabled(!marineLifeEnabled)}
              loading={marineLifeLoading}
              error={marineLifeError}
              selectedDepth={selectedDepth}
            />
          </>
        )}
      </div>
    </div>
  </div>
  );
};

