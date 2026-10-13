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
} from '../../services/oceanChunkService';
import { OceanChunk3DView } from './OceanChunk3DView';
import { OceanChunk2DProfile } from './OceanChunk2DProfile';
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

  // Configuration state
  const [chunkSize, setChunkSize] = useState<number>(0.05);
  const [activeSource, setActiveSource] = useState<ModelSource>('COPERNICUS');
  const [selectedVar, setSelectedVar] = useState<ChunkVariable>('temperature');
  const [selectedDepth, setSelectedDepth] = useState<number>(0);

  // Time selection state (Source-specific valid time bounds)
  const [selectedDate, setSelectedDate] = useState<string>('2024-05-01');
  const [selectedHour, setSelectedHour] = useState<string>('00:00:00');
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
      setSelectedDate('2019-07-15');
      setSelectedHour('12:00:00');
      setIsLatestTime(true);
    } else {
      setSelectedDate('2024-05-01');
      setSelectedHour('00:00:00');
      setIsLatestTime(true);
    }
  };

  // Data fetching state
  const [loadingBathymetry, setLoadingBathymetry] = useState<boolean>(true);
  const [chunkData, setChunkData] = useState<BathymetryChunkResponse | null>(null);
  const [bathymetryError, setBathymetryError] = useState<string | null>(null);

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
    const loadBathymetry = async () => {
      setLoadingBathymetry(true);
      setBathymetryError(null);
      // Reset dependent ocean data while determining terrain classification
      setPointData(null);
      setCurrentData(null);
      setProfileData(null);
      setMarineLifeData(null);
      try {
        const data = await oceanChunkService.getBathymetryChunk(latitude, longitude, chunkSize, 7, controller.signal);
        if (!controller.signal.aborted) {
          setChunkData(data);
          setLoadingBathymetry(false);
        }
      } catch (err: any) {
        if (!controller.signal.aborted) {
          console.error('GEBCO fetch error:', err);
          setBathymetryError('Bathymetry unavailable.');
          setLoadingBathymetry(false);
        }
      }
    };
    loadBathymetry();
    return () => {
      controller.abort();
    };
  }, [latitude, longitude, chunkSize]);

  // Precise GEBCO classification: Ocean requires is_ocean=true, elevation < 0, depth > 0
  const isOcean = useMemo(() => {
    if (!chunkData || !chunkData.selected_point) return false;
    const pt = chunkData.selected_point;
    return Boolean(pt.is_ocean && pt.depth > 0 && pt.elevation < 0);
  }, [chunkData]);

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
        if (!controller.signal.aborted) {
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
        if (!controller.signal.aborted) {
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

  // Get current active variable value for display
  const currentTelemetry = useMemo(() => {
    if (selectedVar === 'current' && currentData) {
      return {
        value: currentData.speed,
        unit: 'm/s',
        secondary: `${currentData.direction_degrees}° (Heading)`,
        source: currentData.source || (activeSource === 'COPERNICUS' ? 'Copernicus Marine' : 'HYCOM Consortium (OPeNDAP)'),
        actualDepth: currentData.depth,
        actualTime: currentData.time,
      };
    }
    if (pointData) {
      return {
        value: pointData.value,
        unit: pointData.unit,
        secondary: pointData.label,
        source: pointData.source || (activeSource === 'COPERNICUS' ? 'Copernicus Marine' : 'HYCOM Consortium (OPeNDAP)'),
        actualDepth: pointData.depth,
        actualTime: pointData.time,
      };
    }
    return {
      value: null,
      unit: '',
      secondary: '',
      source: activeSource === 'COPERNICUS' ? 'Copernicus Marine' : 'HYCOM Consortium (OPeNDAP)',
      actualDepth: selectedDepth,
      actualTime: selectedTime,
    };
  }, [selectedVar, pointData, currentData, activeSource, selectedDepth, selectedTime]);

  const bathymetricDepth = isOcean && chunkData ? chunkData.selected_point.depth : 0;
  const landElevation = chunkData?.selected_point?.elevation ?? 0;

  return (
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.08)] overflow-hidden transition-all max-w-7xl mx-auto my-3">
      {/* ─── 1. TOP HEADER & METADATA BAR ─── */}
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={onBackToGlobe}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFFFF] hover:bg-[#EFF6FF] text-[#0B84C6] border border-[#BFDBFE] rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Globe</span>
            </button>
            <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider ml-1">
              Selected Location Analysis
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-xl font-bold text-[#172033] tracking-tight">
              {formatCoordinates(latitude, longitude)}
            </h2>
            {loadingBathymetry ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#64748B] font-semibold border border-[#E2E8F0]">
                Classifying Terrain...
              </span>
            ) : bathymetryError || !chunkData ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FEE2E2] text-[#DC2626] font-semibold border border-[#FECACA]">
                Bathymetry Unavailable
              </span>
            ) : isOcean ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] font-semibold border border-[#BAE6FD]">
                3D + 2D Ocean Water Column
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] font-semibold border border-[#FDE68A]">
                Land Location (Non-Oceanic)
              </span>
            )}
          </div>
        </div>

        {/* Scientific Bathymetry Badge */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] px-3.5 py-2 rounded-xl shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">
              {loadingBathymetry
                ? 'Bathymetry / Elevation'
                : bathymetryError || !chunkData
                ? 'Bathymetry Status'
                : isOcean
                ? 'Bathymetric Depth'
                : 'Topographic Elevation'}
            </span>
            <span className={`text-base font-bold ${
              loadingBathymetry
                ? 'text-[#64748B]'
                : bathymetryError || !chunkData
                ? 'text-[#DC2626]'
                : isOcean
                ? 'text-[#0B84C6]'
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

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] px-3 py-2 rounded-xl shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">
              Elevation Source
            </span>
            <span className="text-xs font-semibold text-[#172033]">
              {bathymetryError || !chunkData ? 'GEBCO (Offline/Error)' : 'GEBCO (Real Grid)'}
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] px-3 py-2 rounded-xl shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">
              Chunk Window
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {[0.025, 0.05, 0.1].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setChunkSize(sz)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    chunkSize === sz
                      ? 'bg-[#0B84C6] text-[#FFFFFF]'
                      : 'bg-[#F1F5F9] text-[#64748B] hover:text-[#172033]'
                  }`}
                >
                  ±{sz}°
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* ─── 2. TERRAIN CLASSIFICATION LOGIC & RENDERING ─── */}
        {loadingBathymetry ? (
          <div className="w-full h-[450px] bg-[#071120] rounded-xl flex flex-col items-center justify-center text-[#E0F2FE] space-y-3">
            <div className="w-8 h-8 border-3 border-[#38BDF8] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-semibold tracking-wide">
              Retrieving & Classifying GEBCO Bathymetry Grid...
            </span>
          </div>
        ) : bathymetryError || !chunkData ? (
          <div className="w-full h-[300px] bg-[#FEF2F2] border border-[#FECACA] rounded-xl flex flex-col items-center justify-center p-6 text-center text-[#991B1B]">
            <AlertCircle className="w-8 h-8 mb-2 text-[#EF4444]" />
            <div className="font-bold text-sm">Bathymetry unavailable.</div>
            <div className="text-xs text-[#B91C1C] mt-1">
              Unable to retrieve GEBCO bathymetric grid for this coordinate.
            </div>
          </div>
        ) : !isOcean ? (
          /* ─── DEDICATED LAND STATE: CLEAR, SCIENTIFIC & NO FAKE OCEAN SIMULATION ─── */
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-6">
              <div className="flex items-center gap-3.5">
                <div className="p-3 bg-[#FEF3C7] text-[#D97706] rounded-2xl border border-[#FDE68A] shadow-xs">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#172033] tracking-tight">
                    Land Location — Ocean Data Unavailable
                  </h3>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Selected coordinate is classified as continental land mass / terrestrial topography.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                Non-Oceanic Coordinate
              </span>
            </div>

            {/* Scientific Explanation Box */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-xs flex items-start gap-3.5">
              <Info className="w-5 h-5 text-[#0B84C6] shrink-0 mt-0.5" />
              <div className="text-xs text-[#334155] leading-relaxed space-y-2">
                <p>
                  The selected coordinate at <strong className="text-[#172033] font-mono">{formatCoordinates(latitude, longitude)}</strong> is situated on terrestrial land terrain with a ground elevation of{' '}
                  <strong className="text-[#D97706] font-mono font-bold">
                    {landElevation >= 0 ? `+${landElevation.toFixed(1)} m` : `${landElevation.toFixed(1)} m`}
                  </strong>{' '}
                  above mean sea level according to the <strong className="text-[#172033]">GEBCO (General Bathymetric Chart of the Oceans) 2024 Grid</strong>.
                </p>
                <p className="text-[#64748B]">
                  Oceanographic water-column simulations, vertical CTD soundings (Temperature & Salinity), geostrophic current vectors, mixed layer depth (MLD), and marine species data cannot be generated because there is no oceanic water column present at this location.
                </p>
              </div>
            </div>

            {/* Scientific Breakdown Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Latitude / Longitude
                </span>
                <span className="text-sm font-bold font-mono text-[#172033] mt-1 block">
                  {latitude.toFixed(4)}°, {longitude.toFixed(4)}°
                </span>
                <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Global Coordinates</span>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                  GEBCO Ground Elevation
                </span>
                <span className="text-sm font-bold font-mono text-[#D97706] mt-1 block">
                  {landElevation >= 0 ? `+${landElevation.toFixed(1)} m` : `${landElevation.toFixed(1)} m`} ASL
                </span>
                <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Above Mean Sea Level</span>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Ocean Water Depth
                </span>
                <span className="text-sm font-bold font-mono text-[#64748B] mt-1 block">
                  0.0 m (No Water Column)
                </span>
                <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Zero bathymetric depth</span>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                  Chunk Ocean Coverage
                </span>
                <span className="text-sm font-bold font-mono text-[#172033] mt-1 block">
                  {chunkData.statistics.ocean_coverage_percent}%
                </span>
                <span className="text-[10px] text-[#94A3B8] mt-0.5 block">Within ±{chunkSize}° local area</span>
              </div>
            </div>

            {/* Direct Action Guidance */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <Globe className="w-4 h-4 text-[#0B84C6]" />
                <span>
                  Tip: Double-click any blue ocean region on the global explorer to view a full 3D underwater chunk.
                </span>
              </div>
              <button
                onClick={onBackToGlobe}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0B84C6] hover:bg-[#0284C7] text-[#FFFFFF] font-bold rounded-xl text-xs shadow-sm transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to 3D Ocean Globe</span>
              </button>
            </div>
          </div>
        ) : (
          /* ─── 3. VALID OCEAN COORDINATE: RENDER 3D CHUNK + 2D CROSS SECTION ─── */
          <>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-[#172033] flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-[#0B84C6]" />
                    <span>3D + 2D Ocean Water Column Simulation</span>
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    Interactive 3D seabed reconstruction & synchronized 2D depth profile cross-section to real GEBCO depth.
                  </p>
                </div>
              </div>

              {/* 3D and 2D Equal Side-by-Side Viewport */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {/* 3D Ocean Chunk Simulation (Left Column) */}
                <div className="flex flex-col">
                  <OceanChunk3DView
                    chunkData={chunkData}
                    selectedVariable={selectedVar}
                    variableValue={currentTelemetry.value}
                    variableUnit={currentTelemetry.unit}
                    selectedDepth={selectedDepth}
                    profileData={profileData}
                    currentData={currentData}
                    marineLifeEnabled={marineLifeEnabled}
                    marineLifeSpecies={marineLifeData?.species || []}
                    fishCount={10}
                  />
                </div>

                {/* 2D Real-Depth Cross Section Profile (Right Column) */}
                <div className="flex flex-col">
                  <OceanChunk2DProfile
                    bathymetricDepth={bathymetricDepth}
                    selectedVariable={selectedVar}
                    selectedDepth={selectedDepth}
                    profileData={profileData}
                    currentData={currentData}
                    variableValue={currentTelemetry.value}
                    variableUnit={currentTelemetry.unit}
                    source={activeSource === 'COPERNICUS' ? 'Copernicus Marine' : 'HYCOM Consortium (OPeNDAP)'}
                  />
                </div>
              </div>
            </div>

            {/* ─── 4. SCIENTIFIC PARAMETER CONTROLS & HISTORICAL DATE SELECTOR ─── */}
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* Model Source Selector (3 cols) */}
                <div className="lg:col-span-3 flex items-center gap-2">
                  <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Source:
                  </span>
                  <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-0.5">
                    <button
                      onClick={() => handleSourceChange('COPERNICUS')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        activeSource === 'COPERNICUS'
                          ? 'bg-[#0B84C6] text-[#FFFFFF] shadow-xs'
                          : 'text-[#64748B] hover:text-[#172033]'
                      }`}
                    >
                      Copernicus
                    </button>
                    <button
                      onClick={() => handleSourceChange('HYCOM')}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                        activeSource === 'HYCOM'
                          ? 'bg-[#0B84C6] text-[#FFFFFF] shadow-xs'
                          : 'text-[#64748B] hover:text-[#172033]'
                      }`}
                    >
                      HYCOM (OPeNDAP)
                    </button>
                  </div>
                </div>

                {/* Depth Selector (4 cols) */}
                <div className="lg:col-span-4 flex items-center gap-2">
                  <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                    Depth:
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {availableDepths.slice(0, 7).map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDepth(d)}
                        className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                          selectedDepth === d
                            ? 'bg-[#172033] text-[#FFFFFF]'
                            : 'bg-[#FFFFFF] border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {d === 0 ? '0m' : `${d}m`}
                      </button>
                    ))}
                    <select
                      value={selectedDepth >= 100 ? selectedDepth : ''}
                      onChange={(e) => setSelectedDepth(Number(e.target.value))}
                      aria-label="Select deeper depth level"
                      className="px-1.5 py-1 rounded-md text-xs font-semibold bg-[#FFFFFF] border border-[#E2E8F0] text-[#475569]"
                    >
                      <option value="" disabled>Deeper...</option>
                      {availableDepths.slice(7).map((d) => (
                        <option key={d} value={d}>{d}m</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Historical Date/Time Selector (5 cols) */}
                <div className="lg:col-span-5 flex flex-wrap items-center gap-2 justify-start lg:justify-end">
                  <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#0B84C6]" />
                    <span>Date/Time:</span>
                  </span>

                  {/* Latest Toggle */}
                  <button
                    onClick={() => setIsLatestTime(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                      isLatestTime
                        ? 'bg-[#0B84C6] text-[#FFFFFF] border-[#0B84C6]'
                        : 'bg-[#FFFFFF] text-[#64748B] border-[#E2E8F0] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    Latest
                  </button>

                  {/* Date Input with boundaries according to active model */}
                  <div className="inline-flex items-center gap-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-2 py-0.5">
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
                      className="text-xs font-mono font-medium text-[#172033] bg-transparent outline-none cursor-pointer"
                    />

                    {/* 3-Hour Time Step Selector */}
                    <select
                      value={selectedHour}
                      onChange={(e) => {
                        setSelectedHour(e.target.value);
                        setIsLatestTime(false);
                      }}
                      aria-label="Select model time hour"
                      className="text-[11px] font-mono font-medium text-[#0B84C6] bg-transparent outline-none cursor-pointer border-l border-[#E2E8F0] pl-1.5"
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

              {/* Ocean Variable Selector Buttons (Exclusive Variable Selection) */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-[#E2E8F0]">
                {[
                  { key: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer },
                  { key: 'salinity', label: 'Salinity', unit: 'PSU', icon: Droplets },
                  { key: 'current', label: 'Geostrophic Current', unit: 'm/s', icon: Wind },
                  { key: 'mld', label: 'Mixed Layer (MLD)', unit: 'm', icon: Layers },
                  { key: 'height', label: 'Sea Height (zo)', unit: 'm', icon: Compass },
                ].map(({ key, label, unit, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedVar(key as ChunkVariable)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      selectedVar === key
                        ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#0B84C6] shadow-xs ring-1 ring-[#0B84C6]'
                        : 'bg-[#FFFFFF] border-[#E2E8F0] text-[#475569] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-[#0B84C6]" />
                    <div className="text-left">
                      <div className="block leading-tight">{label}</div>
                      <span className="text-[10px] text-[#64748B] font-normal font-mono">{unit}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ─── 5. TELEMETRY CARDS & DEPTH SOUNDING PROFILE ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Active Parameter Card */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider">
                    Current Measurement
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#0B84C6] font-bold border border-[#BFDBFE]">
                    {activeSource === 'COPERNICUS' ? 'Copernicus MULTIOBS' : 'HYCOM (OPeNDAP 3-Hourly)'}
                  </span>
                </div>

                {loadingPoint ? (
                  <div className="py-8 text-center text-xs text-[#64748B] animate-pulse">
                    {activeSource === 'COPERNICUS'
                      ? 'Querying ocean data from Copernicus Marine...'
                      : 'Querying historical ocean data from HYCOM OPeNDAP...'}
                  </div>
                ) : pointError ? (
                  <div className="py-6 text-center text-xs text-[#EF4444] space-y-1">
                    <p className="font-semibold">{pointError}</p>
                    <p className="text-[11px] text-[#64748B]">Data unavailable for this location/depth/time</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#64748B] block capitalize">
                          {selectedVar} at {selectedDepth === 0 ? 'Surface (0m)' : `${selectedDepth}m depth`}
                        </span>
                        {currentTelemetry.actualDepth !== undefined && currentTelemetry.actualDepth !== selectedDepth && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#64748B] font-mono">
                            Model Depth: {currentTelemetry.actualDepth}m
                          </span>
                        )}
                      </div>
                      <div className="text-3xl font-extrabold text-[#172033] mt-1 tracking-tight">
                        {currentTelemetry.value !== null
                          ? formatValue(currentTelemetry.value, currentTelemetry.unit)
                          : 'Data unavailable'}
                      </div>
                      {currentTelemetry.secondary && (
                        <div className="text-xs text-[#0B84C6] font-semibold mt-1">
                          {currentTelemetry.secondary}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#F1F5F9] text-xs text-[#64748B] space-y-1">
                      <div className="flex justify-between">
                        <span>Source:</span>
                        <span className="font-medium text-[#172033]">
                          {activeSource === 'COPERNICUS'
                            ? 'Copernicus Marine (MULTIOBS 3D)'
                            : 'HYCOM Consortium (1/12° Analysis)'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Model Timestamp:</span>
                        <span className="font-mono text-[#172033]">
                          {currentTelemetry.actualTime ? currentTelemetry.actualTime.replace('Z', ' UTC') : selectedTime}
                        </span>
                      </div>
                      {!isLatestTime && (
                        <div className="flex justify-between text-[11px] text-[#0284C7]">
                          <span>Requested Date:</span>
                          <span className="font-mono">{selectedDate} {selectedHour.slice(0, 5)} UTC</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CTD Vertical Soundings Chart */}
              <div className="lg:col-span-2 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
                  <div>
                    <h4 className="text-xs uppercase font-bold text-[#172033] tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-[#0B84C6]" />
                      <span>Vertical Depth Soundings (CTD Profile)</span>
                    </h4>
                    <p className="text-[11px] text-[#64748B]">
                      Potential Temperature & Salinity through the water column at timestamp.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]"></span>
                      <span className="font-semibold text-[#172033]">Temp (°C)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0B84C6]"></span>
                      <span className="font-semibold text-[#172033]">Salinity (PSU)</span>
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
                    <p className="text-amber-600 font-medium">{profileError}</p>
                    <p className="text-[11px] text-[#94A3B8]">Vertical soundings are unavailable for this location or time.</p>
                  </div>
                ) : profileData && profileData.depths && profileData.depths.length > 0 ? (
                  <div className="overflow-x-auto max-h-[160px] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#F8FAFC] text-[#64748B] sticky top-0 border-b border-[#E2E8F0]">
                        <tr>
                          <th className="py-2 px-3">Depth (m)</th>
                          <th className="py-2 px-3 text-[#DC2626]">Temperature (°C)</th>
                          <th className="py-2 px-3 text-[#0B84C6]">Salinity (PSU)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] font-mono">
                        {profileData.depths.slice(0, 14).map((d, i) => (
                          <tr
                            key={d}
                            className={selectedDepth === d ? 'bg-[#EFF6FF] font-bold' : 'hover:bg-[#F8FAFC]'}
                          >
                            <td className="py-1.5 px-3 font-sans font-medium">{d}m</td>
                            <td className="py-1.5 px-3 text-[#DC2626]">
                              {profileData.temperature[i] !== null && profileData.temperature[i] !== undefined
                                ? `${profileData.temperature[i]} °C`
                                : '—'}
                            </td>
                            <td className="py-1.5 px-3 text-[#0B84C6]">
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
            </div>

            {/* ─── 6. NEARBY ARGO FLOAT INTEGRATION (IF IN VICINITY) ─── */}
            {nearbyArgoFloat && (
              <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#DCFCE7] text-[#16A34A] rounded-lg">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-[#15803D] block">
                      In-Situ Argo Float #{nearbyArgoFloat.platform_number} Active Near Chunk
                    </span>
                    <span className="text-[#166534]">
                      Cycle {nearbyArgoFloat.cycle_number} • {formatCoordinates(nearbyArgoFloat.latitude, nearbyArgoFloat.longitude)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => selectArgoFloat(nearbyArgoFloat.platform_number, nearbyArgoFloat.cycle_number)}
                  className="px-3 py-1.5 bg-[#16A34A] text-[#FFFFFF] font-bold rounded-lg hover:bg-[#15803D] transition-colors self-start sm:self-auto"
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
  );
};
