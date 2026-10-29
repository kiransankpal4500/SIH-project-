/**
 * Vertical Depth Lab Component (Phase 4: Research Lab)
 * Depth-aware investigations displaying verified 40-level vertical ocean soundings
 * from INCOIS HYCOM numerical models and Argo in-situ profiling floats.
 */

import React, { useState, useEffect } from 'react';
import {
  assistantService,
  DepthProfileResponse,
  DepthProfileLevel,
} from '../../../services/assistantService';
import {
  Layers,
  MapPin,
  RefreshCw,
  AlertCircle,
  Thermometer,
  Droplets,
  Activity,
  ArrowRight,
  Sparkles,
  Info,
  Database,
  Compass,
} from 'lucide-react';
import { formatCoordinates } from '../../../utils/formatters';

interface DepthLabTabProps {
  activeCoords: { lat: number; lon: number } | null;
  onAskInChat: (question: string) => void;
}

export const DepthLabTab: React.FC<DepthLabTabProps> = ({ activeCoords, onAskInChat }) => {
  const [lat, setLat] = useState<number>(activeCoords ? activeCoords.lat : 15.0);
  const [lon, setLon] = useState<number>(activeCoords ? activeCoords.lon : 68.0);
  const [profileData, setProfileData] = useState<DepthProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDepthLevel, setSelectedDepthLevel] = useState<DepthProfileLevel | null>(null);

  // Sync if activeCoords changes
  useEffect(() => {
    if (activeCoords) {
      setLat(activeCoords.lat);
      setLon(activeCoords.lon);
    }
  }, [activeCoords]);

  const handleFetchProfile = async (targetLat = lat, targetLon = lon) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await assistantService.getDepthProfile(targetLat, targetLon);
      setProfileData(data);
      if (data.levels && data.levels.length > 0) {
        setSelectedDepthLevel(data.levels[0]);
      }
    } catch (err: any) {
      console.error('[DepthLabTab] Profile error:', err);
      const detail = err?.data?.detail || err?.message || 'Failed to retrieve vertical depth profile from ocean model.';
      const formattedDetail = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc ? d.loc.join('.') + ': ' : ''}${d.msg}`).join('; ')
        : String(detail);
      setErrorMessage(formattedDetail);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch initial profile on mount
  useEffect(() => {
    handleFetchProfile(lat, lon);
  }, []);

  // Compute key depth layers dynamically based on available dataset levels
  const surfaceLevel = profileData?.levels?.[0];
  const midLevel = profileData?.levels?.find((l) => l.depth_m >= 50 && l.depth_m <= 100) ?? profileData?.levels?.[1];
  const intermediateLevel = profileData?.levels?.find((l) => l.depth_m >= 250 && l.depth_m < 500) ?? (profileData?.levels && profileData.levels.length >= 5 ? profileData.levels[4] : undefined);
  const deepLevel = profileData?.levels && profileData.levels.length > 0 ? profileData.levels[profileData.levels.length - 1] : undefined;

  // Thermocline estimate (steepest temp decline)
  let maxTempDrop = 0;
  let thermoclineDepth = 100;
  if (profileData && profileData.levels.length > 1) {
    for (let i = 0; i < profileData.levels.length - 1; i++) {
      const curr = profileData.levels[i];
      const next = profileData.levels[i + 1];
      if (curr.temperature_c != null && next.temperature_c != null) {
        const drop = (curr.temperature_c - next.temperature_c) / Math.max(1, next.depth_m - curr.depth_m);
        if (drop > maxTempDrop) {
          maxTempDrop = drop;
          thermoclineDepth = Math.round((curr.depth_m + next.depth_m) / 2);
        }
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* ─── HEADER & COORDINATE SELECTOR ─── */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#172033] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#0B84C6]" />
              Vertical Ocean Soundings & Depth Profiling Lab
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Analyze multi-level water mass stratification, thermocline gradients, and baroclinic current velocity across verified numerical model depths.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-[#EFF6FF] text-[#0B84C6] text-[11px] font-semibold rounded-md border border-[#BFDBFE] self-start sm:self-auto">
            {profileData?.total_levels ? `INCOIS HYCOM ${profileData.total_levels}-Level Grid (0-${profileData.levels[profileData.levels.length - 1]?.depth_m ?? 500}m)` : 'INCOIS HYCOM Sounding Grid'}
          </span>
        </div>

        {/* Input Bar */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#F1F5F9]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">Latitude:</span>
            <input
              type="number"
              step="0.01"
              min="-90"
              max="90"
              value={lat}
              onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
              className="w-24 text-xs px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#64748B]">Longitude:</span>
            <input
              type="number"
              step="0.01"
              min="-180"
              max="180"
              value={lon}
              onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
              className="w-24 text-xs px-2.5 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033]"
            />
          </div>

          {activeCoords && (
            <button
              onClick={() => {
                setLat(activeCoords.lat);
                setLon(activeCoords.lon);
                handleFetchProfile(activeCoords.lat, activeCoords.lon);
              }}
              className="text-xs text-[#0B84C6] hover:underline font-semibold flex items-center gap-1"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Use Explorer Coords ({formatCoordinates(activeCoords.lat, activeCoords.lon)})</span>
            </button>
          )}

          <button
            onClick={() => handleFetchProfile()}
            disabled={isLoading}
            className="ml-auto px-4 py-2 bg-[#0B84C6] hover:bg-[#0284C7] disabled:bg-[#94A3B8] text-[#FFFFFF] rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Sampling Levels...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Fetch Vertical Sounding</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ─── ERROR STATE ─── */}
      {errorMessage && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ─── PROVIDER NOTICE / DATA LIMITATION ─── */}
      {profileData?.notice && (
        <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl text-xs text-[#92400E] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#D97706]" />
          <span>{profileData.notice}</span>
        </div>
      )}

      {/* ─── PROFILE ANALYSIS STRIP ─── */}
      {profileData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Surface */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-[#64748B] block font-semibold uppercase tracking-wider">
              Surface Layer ({surfaceLevel?.depth_m ?? 0}m)
            </span>
            <div className="mt-1">
              <span className="text-base font-extrabold text-[#DC2626]">
                {surfaceLevel?.temperature_c != null ? `${surfaceLevel.temperature_c.toFixed(2)} °C` : 'N/A'}
              </span>
              <div className="text-[11px] text-[#0B84C6] font-semibold mt-0.5">
                Salinity: {surfaceLevel?.salinity_psu != null ? `${surfaceLevel.salinity_psu.toFixed(2)} PSU` : 'N/A'}
              </div>
            </div>
            <span className="text-[10px] text-[#64748B] block mt-1">Solar mixed boundary layer</span>
          </div>

          {/* Thermocline */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-[#64748B] block font-semibold uppercase tracking-wider">
              Main Thermocline
            </span>
            <div className="mt-1">
              <span className="text-base font-extrabold text-[#0B84C6]">
                ~{thermoclineDepth} meters
              </span>
              <div className="text-[11px] text-[#64748B] font-semibold mt-0.5">
                Rapid thermal transition
              </div>
            </div>
            <span className="text-[10px] text-[#64748B] block mt-1">Pycnocline density barrier</span>
          </div>

          {/* Intermediate */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-[#64748B] block font-semibold uppercase tracking-wider">
              Intermediate ({intermediateLevel?.depth_m ?? 250}m)
            </span>
            <div className="mt-1">
              <span className="text-base font-extrabold text-[#475569]">
                {intermediateLevel?.temperature_c != null ? `${intermediateLevel.temperature_c.toFixed(2)} °C` : 'N/A'}
              </span>
              <div className="text-[11px] text-[#0B84C6] font-semibold mt-0.5">
                Salinity: {intermediateLevel?.salinity_psu != null ? `${intermediateLevel.salinity_psu.toFixed(2)} PSU` : 'N/A'}
              </div>
            </div>
            <span className="text-[10px] text-[#64748B] block mt-1">Subsurface water mass</span>
          </div>

          {/* Deepest Sounding */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-3.5 shadow-xs">
            <span className="text-[10px] text-[#64748B] block font-semibold uppercase tracking-wider">
              Deepest Layer ({deepLevel?.depth_m ?? 500}m)
            </span>
            <div className="mt-1">
              <span className="text-base font-extrabold text-[#1E293B]">
                {deepLevel?.temperature_c != null ? `${deepLevel.temperature_c.toFixed(2)} °C` : 'N/A'}
              </span>
              <div className="text-[11px] text-[#0B84C6] font-semibold mt-0.5">
                Salinity: {deepLevel?.salinity_psu != null ? `${deepLevel.salinity_psu.toFixed(2)} PSU` : 'N/A'}
              </div>
            </div>
            <span className="text-[10px] text-[#64748B] block mt-1">Deep circulation boundary</span>
          </div>
        </div>
      )}

      {/* ─── VERTICAL SOUNDINGS TABLE & VISUAL BARS ─── */}
      {profileData && profileData.levels.length > 0 && (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[#172033] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0B84C6]" />
                Tabulated Depth Soundings ({profileData.levels.length} Vertical Layers)
              </h3>
              <p className="text-xs text-[#64748B]">
                Source: {profileData.source} · Model Timestamp: {profileData.model_time}
              </p>
            </div>

            <button
              onClick={() =>
                onAskInChat(
                  `Analyze the vertical water column profile at ${formatCoordinates(
                    lat,
                    lon
                  )}: Surface temp is ${surfaceLevel?.temperature_c?.toFixed(1) ?? 'N/A'}°C, 500m temp is ${
                    intermediateLevel?.temperature_c?.toFixed(1) ?? 'N/A'
                  }°C, thermocline at ~${thermoclineDepth}m. Explain the ocean stratification and water masses.`
                )
              }
              className="px-3.5 py-1.5 bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0B84C6] text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask Assistant about this Profile</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3.5 font-bold text-[#475569]">Depth (m)</th>
                  <th className="py-2.5 px-3.5 font-bold text-[#475569]">Temperature (°C)</th>
                  <th className="py-2.5 px-3.5 font-bold text-[#475569]">Thermal Bar</th>
                  <th className="py-2.5 px-3.5 font-bold text-[#475569]">Salinity (PSU)</th>
                  <th className="py-2.5 px-3.5 font-bold text-[#475569]">Current Speed (m/s)</th>
                  <th className="py-2.5 px-3.5 font-bold text-[#475569]">Ocean Layer Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {profileData.levels.map((lvl, index) => {
                  const temp = lvl.temperature_c;
                  const sal = lvl.salinity_psu;
                  const speed = lvl.current_speed_m_s;

                  // Normalize temp bar for Indian Ocean (range 2°C to 32°C)
                  const tempPercent = temp != null ? Math.max(0, Math.min(100, ((temp - 2) / 30) * 100)) : 0;

                  let layerName = 'Intermediate Ocean';
                  if (lvl.depth_m === 0) layerName = 'Surface Skin';
                  else if (lvl.depth_m <= 50) layerName = 'Epipelagic (Mixed Layer)';
                  else if (lvl.depth_m <= 200) layerName = 'Thermocline Transition';
                  else if (lvl.depth_m <= 1000) layerName = 'Mesopelagic (Twilight)';
                  else layerName = 'Bathypelagic (Abyssal)';

                  return (
                    <tr
                      key={index}
                      onClick={() => setSelectedDepthLevel(lvl)}
                      className={`hover:bg-[#F8FAFC] cursor-pointer transition-colors ${
                        selectedDepthLevel?.depth_m === lvl.depth_m ? 'bg-[#EFF6FF]' : ''
                      }`}
                    >
                      <td className="py-2 px-3.5 font-bold text-[#172033]">
                        {lvl.depth_m.toFixed(0)} m
                      </td>
                      <td className="py-2 px-3.5 font-semibold text-[#DC2626]">
                        {temp != null ? `${temp.toFixed(2)} °C` : '—'}
                      </td>
                      <td className="py-2 px-3.5 w-32">
                        <div className="w-full bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#0B84C6] via-[#F59E0B] to-[#DC2626] rounded-full"
                            style={{ width: `${tempPercent}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-2 px-3.5 font-semibold text-[#0B84C6]">
                        {sal != null ? `${sal.toFixed(2)} PSU` : '—'}
                      </td>
                      <td className="py-2 px-3.5 text-[#172033]">
                        {speed != null ? `${speed.toFixed(3)} m/s` : '—'}
                      </td>
                      <td className="py-2 px-3.5 text-[11px] text-[#64748B]">
                        <span className="px-2 py-0.5 bg-[#F1F5F9] rounded-md text-[10px] font-medium text-[#475569]">
                          {layerName}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Depth Sounding Disclaimer */}
          <div className="p-3 bg-[#F8FAFC] border-t border-[#E2E8F0] text-[11px] text-[#64748B] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#0B84C6]" />
              Depths below seafloor bathymetry or regional model boundaries return verified model grid levels without extrapolation.
            </span>
            <span className="font-semibold text-[#172033]">
              Sampling Depth Range: 0m — {profileData.levels[profileData.levels.length - 1]?.depth_m.toFixed(0)}m
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
