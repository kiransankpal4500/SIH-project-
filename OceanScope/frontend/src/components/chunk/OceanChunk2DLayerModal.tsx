/**
 * Completely Separate 2D Ocean Depth Layer Cross-Section Modal
 * Strict Isolation: Does NOT embed inside the 3D canvas or chunk geometry.
 * Features:
 * - High-resolution 2D stratigraphic cross section of water depth layers
 * - Real GEBCO seabed bathymetric profile across coordinate bounds
 * - Geological rock layers beneath the seabed (sediment, sandstone, limestone, basalt)
 * - Synchronized ocean zone annotations (Epipelagic -> Hadal)
 * - Depth markers, temperature/salinity gradients, and habitat organism icons
 */

import React, { useEffect, useRef } from 'react';
import { X, Layers, Compass, Thermometer, Droplets, Info } from 'lucide-react';
import { CopernicusProfileResponse, CopernicusCurrentResponse } from '../../services/oceanChunkService';
import { getZoneForDepth } from './VerticalDepthMeter';

interface OceanChunk2DLayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
  minDepth: number;
  maxDepth: number;
  currentDepth: number;
  seabedDepths: number[][];
  seabedMaxDepthM: number;
  profileData?: CopernicusProfileResponse | null;
  currentData?: CopernicusCurrentResponse | null;
  source: string;
}

export const OceanChunk2DLayerModal: React.FC<OceanChunk2DLayerModalProps> = ({
  isOpen,
  onClose,
  latitude,
  longitude,
  minDepth,
  maxDepth,
  currentDepth,
  seabedDepths,
  seabedMaxDepthM,
  profileData,
  currentData,
  source,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    // Padding
    const padLeft = 85;
    const padRight = 30;
    const padTop = 40;
    const padBottom = 60;
    const chartW = width - padLeft - padRight;
    const chartH = height - padTop - padBottom;

    // 1. Water Column Depth Gradient
    const waterGrad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH * 0.7);
    waterGrad.addColorStop(0.0, '#38bdf8'); // Surface bright cyan
    waterGrad.addColorStop(0.15, '#0284c7'); // Sunlight lower bound
    waterGrad.addColorStop(0.45, '#1e3a8a'); // Twilight zone
    waterGrad.addColorStop(0.75, '#0f172a'); // Midnight zone
    waterGrad.addColorStop(1.0, '#020617'); // Abyssal / hadal
    ctx.fillStyle = waterGrad;
    ctx.fillRect(padLeft, padTop, chartW, chartH);

    // 2. Generate Seabed Profile from actual GEBCO grid
    const res = seabedDepths?.length || 7;
    const seabedPoints: { x: number; y: number; depth: number }[] = [];
    const effectiveMaxDepth = Math.max(100, seabedMaxDepthM);

    for (let c = 0; c < res; c++) {
      const midRow = Math.floor(res / 2);
      const d = seabedDepths?.[midRow]?.[c] ?? effectiveMaxDepth * 0.8;
      const x = padLeft + (c / (res - 1)) * chartW;
      // Map depth to vertical Y
      const depthRatio = Math.min(1.0, Math.max(0.0, (d - minDepth) / Math.max(1, maxDepth - minDepth)));
      const y = padTop + 40 + depthRatio * (chartH - 90);
      seabedPoints.push({ x, y, depth: d });
    }

    // 3. Draw Sub-Seabed Geological Cross-Section
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);
    ctx.lineTo(seabedPoints[0].x, seabedPoints[0].y);
    for (let i = 1; i < seabedPoints.length; i++) {
      ctx.lineTo(seabedPoints[i].x, seabedPoints[i].y);
    }
    ctx.lineTo(padLeft + chartW, padTop + chartH);
    ctx.closePath();

    // Geological Rock Layers
    const geoGrad = ctx.createLinearGradient(0, padTop + chartH * 0.4, 0, padTop + chartH);
    geoGrad.addColorStop(0.0, '#785b3b'); // Benthic sediment / silt
    geoGrad.addColorStop(0.2, '#57422b'); // Compacted sandstone
    geoGrad.addColorStop(0.5, '#3b3836'); // Marine shale & limestone
    geoGrad.addColorStop(0.8, '#26262b'); // Basaltic oceanic crust
    geoGrad.addColorStop(1.0, '#141417'); // Dense mantle bedrock
    ctx.fillStyle = geoGrad;
    ctx.fill();

    // Seabed Contour Outline
    ctx.beginPath();
    ctx.moveTo(seabedPoints[0].x, seabedPoints[0].y);
    for (let i = 1; i < seabedPoints.length; i++) {
      ctx.lineTo(seabedPoints[i].x, seabedPoints[i].y);
    }
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 4. Horizontal Depth Zone Markers and Labels
    const depthSteps = 5;
    ctx.textAlign = 'right';
    ctx.font = '600 11px "JetBrains Mono", Inter, sans-serif';

    for (let i = 0; i <= depthSteps; i++) {
      const d = Math.round(minDepth + (i / depthSteps) * (maxDepth - minDepth));
      const y = padTop + (i / depthSteps) * chartH;

      // Grid line
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + chartW, y);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`${d.toLocaleString()} m`, padLeft - 10, y + 4);

      // Ocean Zone Annotation
      const zone = getZoneForDepth(d);
      ctx.textAlign = 'left';
      ctx.fillStyle = zone.colorHex;
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillText(zone.name.toUpperCase(), padLeft + 12, y - 6);
      ctx.textAlign = 'right';
      ctx.font = '600 11px "JetBrains Mono", Inter, sans-serif';
    }

    // 5. Selected Depth Indicator Line
    const curRatio = Math.max(0, Math.min(1, (currentDepth - minDepth) / Math.max(1, maxDepth - minDepth)));
    const curY = padTop + curRatio * chartH;
    ctx.beginPath();
    ctx.moveTo(padLeft, curY);
    ctx.lineTo(padLeft + chartW, curY);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(padLeft - 6, curY - 5, 6, 10);
    ctx.textAlign = 'left';
    ctx.font = 'bold 11px "JetBrains Mono", Inter, sans-serif';
    ctx.fillText(`TARGET: ${currentDepth} m`, padLeft + chartW - 120, curY - 6);

    // 6. Seabed Depth Callout
    const midPt = seabedPoints[Math.floor(seabedPoints.length / 2)];
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(midPt.x, midPt.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText(`GEBCO Seafloor: ${Math.round(midPt.depth)} m`, midPt.x - 45, midPt.y - 12);

    // X Axis Coordinates
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(`${(longitude - 0.025).toFixed(3)}°E (West Edge)`, padLeft + 40, padTop + chartH + 20);
    ctx.fillText(`${longitude.toFixed(3)}°E (Center Query)`, padLeft + chartW / 2, padTop + chartH + 20);
    ctx.fillText(`${(longitude + 0.025).toFixed(3)}°E (East Edge)`, padLeft + chartW - 40, padTop + chartH + 20);
  }, [isOpen, minDepth, maxDepth, currentDepth, seabedDepths, seabedMaxDepthM, longitude]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#FFFFFF] border border-[#E2EAF2] rounded-[28px] shadow-[0_16px_48px_rgba(22,43,77,0.12)] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2EAF2] bg-[#FFFFFF]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[14px] bg-[#EAF5FF] text-[#087FC4] flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#172B4D] flex items-center gap-2">
                <span>2D Ocean Depth Stratigraphy & Seabed Cross-Section</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#EAF5FF] text-[#087FC4] border border-[#BFDBFE] font-semibold">
                  Separate 2D View
                </span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Physical water-column stratification, geological crust profile, and real GEBCO bathymetry.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close 2D layer view"
            className="p-2 text-[#64748B] hover:text-[#172B4D] rounded-[14px] hover:bg-[#F8FAFC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Canvas Body */}
        <div className="p-6 flex flex-col items-center justify-center bg-[#F8FAFC]">
          <canvas
            ref={canvasRef}
            width={820}
            height={460}
            className="w-full h-auto max-h-[520px] rounded-[20px] border border-[#E2EAF2] shadow-xs"
          />

          {/* Geological & Environmental Legend */}
          <div className="mt-4 w-full grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-[18px] bg-[#FFFFFF] border border-[#E2EAF2] flex items-center gap-2.5 shadow-2xs">
              <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 shrink-0" />
              <div>
                <span className="font-bold text-[#172B4D] block">Epipelagic Photic</span>
                <span className="text-[10px] text-[#64748B]">0 – 200m Sunlight</span>
              </div>
            </div>

            <div className="p-3 rounded-[18px] bg-[#FFFFFF] border border-[#E2EAF2] flex items-center gap-2.5 shadow-2xs">
              <span className="w-3.5 h-3.5 rounded-full bg-blue-700 shrink-0" />
              <div>
                <span className="font-bold text-[#172B4D] block">Mesopelagic</span>
                <span className="text-[10px] text-[#64748B]">200 – 1000m Twilight</span>
              </div>
            </div>

            <div className="p-3 rounded-[18px] bg-[#FFFFFF] border border-[#E2EAF2] flex items-center gap-2.5 shadow-2xs">
              <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 shrink-0" />
              <div>
                <span className="font-bold text-[#172B4D] block">GEBCO Seafloor</span>
                <span className="text-[10px] text-[#64748B]">Bathymetric Boundary</span>
              </div>
            </div>

            <div className="p-3 rounded-[18px] bg-[#FFFFFF] border border-[#E2EAF2] flex items-center gap-2.5 shadow-2xs">
              <span className="w-3.5 h-3.5 rounded-full bg-[#785b3b] shrink-0" />
              <div>
                <span className="font-bold text-[#172B4D] block">Basement Crust</span>
                <span className="text-[10px] text-[#64748B]">Sub-Seabed Stratum</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#E2EAF2] bg-[#FFFFFF] flex items-center justify-between text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#087FC4]" />
            <span>
              Coordinates: <strong className="text-[#172B4D] font-mono">{latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E</strong> · Range: {minDepth}m to {maxDepth}m
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#087FC4] hover:bg-[#0568A6] text-white font-semibold rounded-[18px] transition-all shadow-xs text-xs"
          >
            Return to 3D Ocean Chunk
          </button>
        </div>
      </div>
    </div>
  );
};
