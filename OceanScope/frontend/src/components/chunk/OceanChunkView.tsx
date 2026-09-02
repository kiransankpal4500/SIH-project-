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
import MarineLifePanel from './MarineLifePanel';
import {
  ArrowLeft,
  Layers,
  Thermometer,
  Droplets,
  Wind,
  Compass,
  Clock,
  MapPin,
  Database,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Activity,
  CheckCircle2,
  AlertCircle,
  Radio,
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
  const [verticalExaggeration, setVerticalExaggeration] = useState<number>(2);
  const [activeSource, setActiveSource] = useState<ModelSource>('COPERNICUS');
  const [selectedVar, setSelectedVar] = useState<ChunkVariable>('temperature');
  const [selectedDepth, setSelectedDepth] = useState<number>(0);
  const [selectedTime, setSelectedTime] = useState<string>(state.selectedTimestamp || '2024-05-01T00:00:00Z');

  // Data fetching state
  const [loadingBathymetry, setLoadingBathymetry] = useState<boolean>(true);
  const [chunkData, setChunkData] = useState<BathymetryChunkResponse | null>(null);
  const [bathymetryError, setBathymetryError] = useState<string | null>(null);

  const [loadingCopernicus, setLoadingCopernicus] = useState<boolean>(true);
  const [copernicusPoint, setCopernicusPoint] = useState<CopernicusPointResponse | null>(null);
  const [copernicusCurrent, setCopernicusCurrent] = useState<CopernicusCurrentResponse | null>(null);
  const [copernicusProfile, setCopernicusProfile] = useState<CopernicusProfileResponse | null>(null);
  const [copernicusError, setCopernicusError] = useState<string | null>(null);

  // Marine life state
  const [marineLifeEnabled, setMarineLifeEnabled] = useState<boolean>(false);
  const [marineLifeData, setMarineLifeData] = useState<MarineLifeResponse | null>(null);
  const [marineLifeLoading, setMarineLifeLoading] = useState<boolean>(false);
  const [marineLifeError, setMarineLifeError] = useState<string | null>(null);
  const [marineLifeRadius, setMarineLifeRadius] = useState<number>(50);

  // Available depths supported by dataset
  const availableDepths = [0, 5, 10, 15, 20, 30, 50, 75, 100, 150, 200];

  // 1. Fetch GEBCO Bathymetry Chunk on coordinate or chunk size change
  useEffect(() => {
    let isCancelled = false;
    const loadBathymetry = async () => {
      setLoadingBathymetry(true);
      setBathymetryError(null);
      try {
        const data = await oceanChunkService.getBathymetryChunk(latitude, longitude, chunkSize, 7);
        if (!isCancelled) {
          setChunkData(data);
          setLoadingBathymetry(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('GEBCO fetch error:', err);
          setBathymetryError('Bathymetry unavailable.');
          setLoadingBathymetry(false);
        }
      }
    };
    loadBathymetry();
    return () => {
      isCancelled = true;
    };
  }, [latitude, longitude, chunkSize]);

  // 2. Fetch Copernicus Marine data
  useEffect(() => {
    let isCancelled = false;
    const loadCopernicus = async () => {
      setLoadingCopernicus(true);
      setCopernicusError(null);
      try {
        if (selectedVar === 'current') {
          const curr = await oceanChunkService.getCopernicusCurrent(latitude, longitude, selectedDepth, selectedTime);
          if (!isCancelled) setCopernicusCurrent(curr);
        } else {
          const pt = await oceanChunkService.getCopernicusPoint(
            latitude,
            longitude,
            selectedDepth,
            selectedVar,
            selectedTime
          );
          if (!isCancelled) setCopernicusPoint(pt);
        }

        // Fetch CTD vertical profile soundings
        const prof = await oceanChunkService.getCopernicusProfile(latitude, longitude, selectedTime);
        if (!isCancelled) {
          setCopernicusProfile(prof);
          setLoadingCopernicus(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Copernicus ocean data error:', err);
          setCopernicusError('Copernicus ocean data unavailable.');
          setLoadingCopernicus(false);
        }
      }
    };
    loadCopernicus();
    return () => {
      isCancelled = true;
    };
  }, [latitude, longitude, selectedVar, selectedDepth, selectedTime, activeSource]);

  // 3. Fetch marine life species when enabled or depth/location changes
  useEffect(() => {
    if (!marineLifeEnabled) return;
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
  }, [marineLifeEnabled, latitude, longitude, selectedDepth, marineLifeRadius]);

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
    if (selectedVar === 'current' && copernicusCurrent) {
      return {
        value: copernicusCurrent.speed,
        unit: 'm/s',
        secondary: `${copernicusCurrent.direction_degrees}° (Heading)`,
        source: copernicusCurrent.source,
      };
    }
    if (copernicusPoint) {
      return {
        value: copernicusPoint.value,
        unit: copernicusPoint.unit,
        secondary: copernicusPoint.label,
        source: copernicusPoint.source,
      };
    }
    return { value: null, unit: '', secondary: '', source: 'Copernicus Marine' };
  }, [selectedVar, copernicusPoint, copernicusCurrent]);

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
              Selected Ocean Area
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-3">
            <h2 className="text-xl font-bold text-[#172033] tracking-tight">
              {formatCoordinates(latitude, longitude)}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#E0F2FE] text-[#0284C7] font-semibold border border-[#BAE6FD]">
              3D Local Ocean Chunk
            </span>
          </div>
        </div>

        {/* Scientific Bathymetry Badge */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] px-3.5 py-2 rounded-xl shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">
              Bathymetric Depth
            </span>
            <span className="text-base font-bold text-[#0B84C6]">
              {chunkData?.selected_point.is_ocean
                ? `${chunkData.selected_point.depth} m`
                : '0.0 m (Coast/Land)'}
            </span>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E2E8F0] px-3 py-2 rounded-xl shadow-xs">
            <span className="text-[10px] uppercase font-bold text-[#64748B] block">
              Bathymetry Source
            </span>
            <span className="text-xs font-semibold text-[#172033]">
              GEBCO (Real Grid)
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
        {/* ─── 2. 3D SEABED TERRAIN & WATER COLUMN SIMULATION ─── */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#172033] flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#0B84C6]" />
                <span>3D Ocean Chunk Simulation</span>
              </h3>
              <p className="text-xs text-[#64748B]">
                Interactive 3D seabed reconstruction from real GEBCO bathymetry with physical water column overlay.
              </p>
            </div>

            {/* Vertical Exaggeration Controller */}
            <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-[#E2E8F0] p-1 rounded-xl text-xs">
              <span className="text-[10px] font-bold text-[#64748B] px-1.5 uppercase">
                Exaggeration:
              </span>
              {[1, 2, 5, 10].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setVerticalExaggeration(ex)}
                  className={`px-2 py-1 rounded-lg font-bold text-xs transition-all ${
                    verticalExaggeration === ex
                      ? 'bg-[#0B84C6] text-[#FFFFFF] shadow-xs'
                      : 'bg-[#FFFFFF] text-[#475569] hover:text-[#172033] border border-[#E2E8F0]'
                  }`}
                >
                  {ex}×
                </button>
              ))}
            </div>
          </div>

          {/* 3D Canvas Viewport */}
          {loadingBathymetry ? (
            <div className="w-full h-[480px] bg-[#071120] rounded-xl flex flex-col items-center justify-center text-[#E0F2FE] space-y-3">
              <div className="w-8 h-8 border-3 border-[#38BDF8] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold tracking-wide">
                Retrieving GEBCO Bathymetry Grid...
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
          ) : (
            <OceanChunk3DView
              chunkData={chunkData}
              verticalExaggeration={verticalExaggeration}
              selectedVariable={selectedVar}
              variableValue={currentTelemetry.value}
              variableUnit={currentTelemetry.unit}
              selectedDepth={selectedDepth}
              marineLifeEnabled={marineLifeEnabled}
              marineLifeSpecies={marineLifeData?.species || []}
              fishCount={10}
            />
          )}
        </div>

        {/* ─── 3. SCIENTIFIC PARAMETER CONTROLS ─── */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Model Source Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                Source:
              </span>
              <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-0.5">
                <button
                  onClick={() => setActiveSource('COPERNICUS')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeSource === 'COPERNICUS'
                      ? 'bg-[#0B84C6] text-[#FFFFFF] shadow-xs'
                      : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                >
                  Copernicus Marine
                </button>
                <button
                  onClick={() => setActiveSource('HYCOM')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    activeSource === 'HYCOM'
                      ? 'bg-[#0B84C6] text-[#FFFFFF] shadow-xs'
                      : 'text-[#64748B] hover:text-[#172033]'
                  }`}
                >
                  INCOIS HYCOM
                </button>
              </div>
            </div>

            {/* Depth Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
                Depth Level:
              </span>
              <div className="flex flex-wrap items-center gap-1">
                {availableDepths.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDepth(d)}
                    className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                      selectedDepth === d
                        ? 'bg-[#172033] text-[#FFFFFF]'
                        : 'bg-[#FFFFFF] border border-[#E2E8F0] text-[#475569] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    {d === 0 ? 'Surface' : `${d}m`}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Step Navigator */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Time:</span>
              </span>
              <div className="inline-flex items-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg px-2.5 py-1 text-xs font-mono font-semibold text-[#172033]">
                {selectedTime.slice(0, 10)}
              </div>
            </div>
          </div>

          {/* Ocean Variable Selector Buttons */}
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

        {/* ─── 4. TELEMETRY CARDS & DEPTH SOUNDING PROFILE ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Active Parameter Card */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <span className="text-xs uppercase font-bold text-[#64748B] tracking-wider">
                Current Measurement
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#0B84C6] font-bold border border-[#BFDBFE]">
                {activeSource === 'COPERNICUS' ? 'Copernicus MULTIOBS' : 'INCOIS HYCOM'}
              </span>
            </div>

            {loadingCopernicus ? (
              <div className="py-8 text-center text-xs text-[#64748B] animate-pulse">
                Querying ocean data from Copernicus Marine...
              </div>
            ) : copernicusError ? (
              <div className="py-6 text-center text-xs text-[#EF4444]">
                {copernicusError}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-[#64748B] block capitalize">
                    {selectedVar} at {selectedDepth === 0 ? 'Surface (0m)' : `${selectedDepth}m depth`}
                  </span>
                  <div className="text-3xl font-extrabold text-[#172033] mt-1 tracking-tight">
                    {formatValue(currentTelemetry.value ?? undefined, currentTelemetry.unit)}
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
                        ? 'Copernicus Marine (MULTIOBS_GLO_PHY_TSUV_3D_MYNRT_015_012)'
                        : 'INCOIS RSMC HYCOM'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Timestamp:</span>
                    <span className="font-mono text-[#172033]">{selectedTime.slice(0, 19)}Z</span>
                  </div>
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
                  Potential Temperature & Salinity through the water column to seabed.
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
            {copernicusProfile && copernicusProfile.depths ? (
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
                    {copernicusProfile.depths.slice(0, 10).map((d, i) => (
                      <tr
                        key={d}
                        className={selectedDepth === d ? 'bg-[#EFF6FF] font-bold' : 'hover:bg-[#F8FAFC]'}
                      >
                        <td className="py-1.5 px-3 font-sans font-medium">{d}m</td>
                        <td className="py-1.5 px-3 text-[#DC2626]">
                          {copernicusProfile.temperature[i] !== null ? `${copernicusProfile.temperature[i]} °C` : '—'}
                        </td>
                        <td className="py-1.5 px-3 text-[#0B84C6]">
                          {copernicusProfile.salinity[i] !== null ? `${copernicusProfile.salinity[i]} PSU` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-[#64748B]">
                Loading vertical profile soundings...
              </div>
            )}
          </div>
        </div>

        {/* ─── 5. NEARBY ARGO FLOAT INTEGRATION (IF IN VICINITY) ─── */}
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

        {/* ─── 6. MARINE LIFE PANEL ─── */}
        <MarineLifePanel
          marineData={marineLifeData}
          enabled={marineLifeEnabled}
          onToggle={() => setMarineLifeEnabled(!marineLifeEnabled)}
          loading={marineLifeLoading}
          error={marineLifeError}
          selectedDepth={selectedDepth}
        />
      </div>
    </div>
  );
};
