/**
 * 2D Real-Depth Ocean Profile Canvas
 * Renders scientific vertical water-column stratigraphy and thermocline/halocline gradients.
 */

import React, { useEffect, useRef } from 'react';
import { CopernicusProfileResponse, CopernicusCurrentResponse } from '../../services/oceanChunkService';
import { formatDepth, formatValue } from '../../utils/formatters';

interface OceanChunk2DProfileProps {
  bathymetricDepth: number;
  selectedVariable: 'temperature' | 'salinity' | 'current' | 'mld' | 'height';
  selectedDepth: number;
  profileData: CopernicusProfileResponse | null;
  currentData: CopernicusCurrentResponse | null;
  variableValue: number | null;
  variableUnit: string;
  source: string;
}

/**
 * Temperature Colormap (0°C Deep Navy -> 12°C Cyan -> 22°C Green/Yellow -> 32°C Red)
 */
function getTemperatureColor(temp: number): string {
  const t = Math.max(0, Math.min(32, temp));
  if (t < 8) {
    // 0 -> 8: #1E3A8A -> #0284C7
    const r = Math.round(30 + (2 - 30) * (t / 8));
    const g = Math.round(58 + (132 - 58) * (t / 8));
    const b = Math.round(138 + (199 - 138) * (t / 8));
    return `rgb(${r}, ${g}, ${b})`;
  } else if (t < 18) {
    // 8 -> 18: #0284C7 -> #10B981
    const frac = (t - 8) / 10;
    const r = Math.round(2 + (16 - 2) * frac);
    const g = Math.round(132 + (185 - 132) * frac);
    const b = Math.round(199 + (129 - 199) * frac);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (t < 26) {
    // 18 -> 26: #10B981 -> #F59E0B
    const frac = (t - 18) / 8;
    const r = Math.round(16 + (245 - 16) * frac);
    const g = Math.round(185 + (158 - 185) * frac);
    const b = Math.round(129 + (11 - 129) * frac);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // 26 -> 32: #F59E0B -> #EF4444
    const frac = (t - 26) / 6;
    const r = Math.round(245 + (239 - 245) * frac);
    const g = Math.round(158 + (68 - 158) * frac);
    const b = Math.round(11 + (68 - 11) * frac);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/**
 * Salinity Colormap (30 PSU Teal -> 34 PSU Cyan -> 36 PSU Blue/Amber -> 38 PSU Red-Orange)
 */
function getSalinityColor(sal: number): string {
  const s = Math.max(30, Math.min(38, sal));
  const norm = (s - 30) / 8; // 0 to 1
  if (norm < 0.4) {
    // 30 -> 33.2: #0D9488 -> #0284C7
    const f = norm / 0.4;
    const r = Math.round(13 + (2 - 13) * f);
    const g = Math.round(148 + (132 - 148) * f);
    const b = Math.round(136 + (199 - 136) * f);
    return `rgb(${r}, ${g}, ${b})`;
  } else if (norm < 0.75) {
    // 33.2 -> 36: #0284C7 -> #F59E0B
    const f = (norm - 0.4) / 0.35;
    const r = Math.round(2 + (245 - 2) * f);
    const g = Math.round(132 + (158 - 132) * f);
    const b = Math.round(199 + (11 - 199) * f);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // 36 -> 38: #F59E0B -> #EA580C
    const f = (norm - 0.75) / 0.25;
    const r = Math.round(245 + (234 - 245) * f);
    const g = Math.round(158 + (88 - 158) * f);
    const b = Math.round(11 + (12 - 11) * f);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

export const OceanChunk2DProfile: React.FC<OceanChunk2DProfileProps> = ({
  bathymetricDepth,
  selectedVariable,
  selectedDepth,
  profileData,
  currentData,
  variableValue,
  variableUnit,
  source,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Particles state for animated current visualization
  const particlesRef = useRef<Array<{ x: number; y: number; speed: number; size: number }>>([]);

  // Initialize or maintain current particles
  useEffect(() => {
    const numParticles = 45;
    particlesRef.current = Array.from({ length: numParticles }, () => ({
      x: Math.random() * 400,
      y: Math.random() * 320,
      speed: 0.5 + Math.random() * 1.5,
      size: 1.5 + Math.random() * 2.0,
    }));
  }, []);

  const totalSeabedDepth = Math.max(10, bathymetricDepth);

  // Depth ticks to draw based on actual seabed depth
  const depthTicks = React.useMemo(() => {
    const candidateTicks = [0, 50, 100, 200, 500, 1000, 1500, 2000, 3000, 4000, 5000];
    const filtered = candidateTicks.filter((d) => d < totalSeabedDepth * 0.92);
    filtered.push(Math.round(totalSeabedDepth));
    return Array.from(new Set(filtered)).sort((a, b) => a - b);
  }, [totalSeabedDepth]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let timeStep = 0;

    const render = () => {
      timeStep += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      // Layout boundaries
      const leftMargin = 64;
      const rightMargin = 20;
      const topMargin = 28;
      const bottomMargin = 32;
      const colWidth = width - leftMargin - rightMargin;
      const colHeight = height - topMargin - bottomMargin;

      // Clear canvas with dark slate ocean background
      ctx.fillStyle = '#071322';
      ctx.fillRect(0, 0, width, height);

      // Coordinate mapper: depth (meters) -> Canvas Y coordinate
      const depthToY = (d: number) => {
        const ratio = Math.min(1.0, Math.max(0, d / totalSeabedDepth));
        return topMargin + ratio * colHeight;
      };

      // ─── 1. DRAW WATER COLUMN BACKGROUND / LAYERS ───
      ctx.save();
      ctx.beginPath();
      ctx.rect(leftMargin, topMargin, colWidth, colHeight);
      ctx.clip();

      if (selectedVariable === 'temperature' && profileData?.depths && profileData.depths.length > 0) {
        // Render continuous temperature gradient from profile data
        const depths = profileData.depths;
        const temps = profileData.temperature;

        for (let i = 0; i < depths.length; i++) {
          const dCurr = depths[i];
          const dNext = i < depths.length - 1 ? depths[i + 1] : totalSeabedDepth;
          if (dCurr >= totalSeabedDepth) break;

          const y1 = depthToY(dCurr);
          const y2 = depthToY(Math.min(dNext, totalSeabedDepth));
          const tempVal = temps[i] ?? (i > 0 ? (temps[i - 1] ?? 4.0) : 28.0);
          const col = getTemperatureColor(tempVal);

          // Subtle layer drift animation
          const drift = Math.sin(timeStep + i * 0.4) * 1.5;

          ctx.fillStyle = col;
          ctx.fillRect(leftMargin, y1 + drift, colWidth, Math.max(2, y2 - y1));

          // Draw layer boundary line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(leftMargin, y1);
          ctx.lineTo(leftMargin + colWidth, y1);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (selectedVariable === 'salinity' && profileData?.depths && profileData.depths.length > 0) {
        // Render continuous salinity gradient from profile data
        const depths = profileData.depths;
        const sals = profileData.salinity;

        for (let i = 0; i < depths.length; i++) {
          const dCurr = depths[i];
          const dNext = i < depths.length - 1 ? depths[i + 1] : totalSeabedDepth;
          if (dCurr >= totalSeabedDepth) break;

          const y1 = depthToY(dCurr);
          const y2 = depthToY(Math.min(dNext, totalSeabedDepth));
          const salVal = sals[i] ?? 35.0;
          const col = getSalinityColor(salVal);

          const drift = Math.sin(timeStep + i * 0.35) * 1.5;

          ctx.fillStyle = col;
          ctx.fillRect(leftMargin, y1 + drift, colWidth, Math.max(2, y2 - y1));

          // Isohaline boundary line
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(leftMargin, y1);
          ctx.lineTo(leftMargin + colWidth, y1);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (selectedVariable === 'current') {
        // Gradient base for current water column
        const grad = ctx.createLinearGradient(0, topMargin, 0, topMargin + colHeight);
        grad.addColorStop(0, '#0F3254');
        grad.addColorStop(0.3, '#0A2542');
        grad.addColorStop(1, '#051120');
        ctx.fillStyle = grad;
        ctx.fillRect(leftMargin, topMargin, colWidth, colHeight);

        // Animated current vector particles
        const u = currentData?.ugo ?? 0.15;
        const v = currentData?.vgo ?? 0.05;
        const speed = currentData?.speed ?? Math.sqrt(u * u + v * v);
        const heading = currentData?.direction_degrees ?? (Math.atan2(u, v) * 180 / Math.PI + 360) % 360;

        // Particle speed scaling
        const flowVx = (u / Math.max(0.01, speed)) * (speed * 3.5 + 0.8);
        const flowVy = (v / Math.max(0.01, speed)) * (speed * 0.5);

        ctx.fillStyle = '#38BDF8';
        ctx.strokeStyle = '#38BDF8';

        particlesRef.current.forEach((p) => {
          p.x += flowVx * p.speed;
          p.y += flowVy * p.speed * 0.2 + Math.sin(timeStep + p.x * 0.02) * 0.3;

          // Wrap around column box
          if (p.x > leftMargin + colWidth) p.x = leftMargin;
          if (p.x < leftMargin) p.x = leftMargin + colWidth;
          if (p.y > topMargin + colHeight) p.y = topMargin;
          if (p.y < topMargin) p.y = topMargin + colHeight;

          // Draw streamlined moving particle streak
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - flowVx * 4, p.y - flowVy * 4);
          ctx.stroke();
        });

        // Direction compass / vector watermark in top corner
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.9)';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(`Flow Vector: ${speed.toFixed(2)} m/s @ ${heading.toFixed(1)}°`, leftMargin + 10, topMargin + 20);
        ctx.restore();
      } else if (selectedVariable === 'mld') {
        // Mixed Layer Depth representation
        const mldVal = variableValue ?? 35.0;
        const mldY = depthToY(mldVal);

        // Mixed upper layer (warm cyan/amber zone)
        const upperGrad = ctx.createLinearGradient(0, topMargin, 0, mldY);
        upperGrad.addColorStop(0, '#0284C7');
        upperGrad.addColorStop(1, '#0369A1');
        ctx.fillStyle = upperGrad;
        ctx.fillRect(leftMargin, topMargin, colWidth, mldY - topMargin);

        // Deep stratified layer below thermocline
        const deepGrad = ctx.createLinearGradient(0, mldY, 0, topMargin + colHeight);
        deepGrad.addColorStop(0, '#0F172A');
        deepGrad.addColorStop(1, '#020617');
        ctx.fillStyle = deepGrad;
        ctx.fillRect(leftMargin, mldY, colWidth, topMargin + colHeight - mldY);

        // Pulsing MLD pycnocline boundary line
        const pulse = Math.sin(timeStep * 2) * 2;
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(leftMargin, mldY + pulse);
        ctx.lineTo(leftMargin + colWidth, mldY + pulse);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label for MLD
        ctx.fillStyle = '#FEF08A';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`MLD Boundary: ${mldVal.toFixed(1)} m`, leftMargin + 12, mldY - 6 + pulse);
      } else if (selectedVariable === 'height') {
        // Sea Surface Height Anomaly representation
        const sshVal = variableValue ?? 0.05;
        const baseGrad = ctx.createLinearGradient(0, topMargin, 0, topMargin + colHeight);
        baseGrad.addColorStop(0, '#0284C7');
        baseGrad.addColorStop(1, '#0B1E36');
        ctx.fillStyle = baseGrad;
        ctx.fillRect(leftMargin, topMargin, colWidth, colHeight);

        // Dynamic surface wave displacement
        ctx.fillStyle = sshVal >= 0 ? '#38BDF8' : '#64748B';
        ctx.beginPath();
        ctx.moveTo(leftMargin, topMargin);
        for (let x = leftMargin; x <= leftMargin + colWidth; x += 5) {
          const wave = Math.sin(timeStep * 1.5 + (x - leftMargin) * 0.04) * 3;
          ctx.lineTo(x, topMargin + wave + (sshVal > 0 ? -4 : 4));
        }
        ctx.lineTo(leftMargin + colWidth, topMargin + 15);
        ctx.lineTo(leftMargin, topMargin + 15);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(`SSH Anomaly (zo): ${sshVal > 0 ? '+' : ''}${sshVal.toFixed(3)} m`, leftMargin + 12, topMargin + 25);
      } else {
        // Default ocean gradient
        const grad = ctx.createLinearGradient(0, topMargin, 0, topMargin + colHeight);
        grad.addColorStop(0, '#0284C7');
        grad.addColorStop(0.2, '#0369A1');
        grad.addColorStop(0.6, '#1E3A8A');
        grad.addColorStop(1, '#050E24');
        ctx.fillStyle = grad;
        ctx.fillRect(leftMargin, topMargin, colWidth, colHeight);
      }

      // ─── 2. SEABED TERRAIN BOUNDARY AT REAL DEPTH ───
      const seabedY = depthToY(totalSeabedDepth);
      const seabedGrad = ctx.createLinearGradient(0, seabedY - 12, 0, topMargin + colHeight);
      seabedGrad.addColorStop(0, '#334155');
      seabedGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = seabedGrad;

      // Realistic sediment/rock profile curve
      ctx.beginPath();
      ctx.moveTo(leftMargin, seabedY);
      for (let x = leftMargin; x <= leftMargin + colWidth; x += 10) {
        const rockDisplace = Math.sin((x - leftMargin) * 0.08) * 3 + Math.cos((x - leftMargin) * 0.15) * 2;
        ctx.lineTo(x, seabedY + rockDisplace);
      }
      ctx.lineTo(leftMargin + colWidth, topMargin + colHeight);
      ctx.lineTo(leftMargin, topMargin + colHeight);
      ctx.closePath();
      ctx.fill();

      // Golden seabed rim line
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftMargin, seabedY);
      for (let x = leftMargin; x <= leftMargin + colWidth; x += 10) {
        const rockDisplace = Math.sin((x - leftMargin) * 0.08) * 3 + Math.cos((x - leftMargin) * 0.15) * 2;
        ctx.lineTo(x, seabedY + rockDisplace);
      }
      ctx.stroke();

      // Selected Depth Marker Line
      if (selectedDepth >= 0 && selectedDepth <= totalSeabedDepth) {
        const selY = depthToY(selectedDepth);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(leftMargin, selY);
        ctx.lineTo(leftMargin + colWidth, selY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pointer badge on right
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(leftMargin + colWidth, selY);
        ctx.lineTo(leftMargin + colWidth + 6, selY - 4);
        ctx.lineTo(leftMargin + colWidth + 6, selY + 4);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();

      // ─── 3. DRAW DEPTH AXIS & LABELS (LEFT SIDE) ───
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px Inter, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      depthTicks.forEach((d) => {
        const y = depthToY(d);
        const isSeabed = d === Math.round(totalSeabedDepth);
        const isSurface = d === 0;

        if (isSeabed) {
          ctx.fillStyle = '#F59E0B';
          ctx.font = 'bold 10px Inter, monospace';
          ctx.fillText(`${d}m ⏷`, leftMargin - 8, y);
          ctx.fillText(`SEABED`, leftMargin - 8, y + 11);
        } else if (isSurface) {
          ctx.fillStyle = '#38BDF8';
          ctx.font = 'bold 10px Inter, monospace';
          ctx.fillText(`0m (Surface)`, leftMargin - 8, y);
        } else {
          ctx.fillStyle = '#94A3B8';
          ctx.font = '10px Inter, monospace';
          ctx.fillText(`${d}m`, leftMargin - 8, y);
        }

        // Tick mark
        ctx.strokeStyle = isSeabed ? '#F59E0B' : 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = isSeabed ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(leftMargin - 5, y);
        ctx.lineTo(leftMargin, y);
        ctx.stroke();
      });

      // Water column perimeter box
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(leftMargin, topMargin, colWidth, colHeight);

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [bathymetricDepth, selectedVariable, selectedDepth, profileData, currentData, variableValue, totalSeabedDepth, depthTicks]);

  return (
    <div className="bg-[#071120] border border-[#1E293B] rounded-xl p-4 flex flex-col justify-between text-white shadow-md">
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-[#1E293B] pb-2.5 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] animate-pulse"></span>
          <h4 className="text-xs uppercase font-bold text-[#E2E8F0] tracking-wider">
            2D Real-Depth Profile Cross-Section
          </h4>
        </div>
        <span className="text-[11px] px-2 py-0.5 rounded bg-[#0F2338] text-[#38BDF8] font-mono border border-[#0284C7]/30">
          0m → {formatDepth(Math.round(totalSeabedDepth))} (GEBCO Seabed)
        </span>
      </div>

      {/* 2D Cross Section Canvas */}
      <div className="relative w-full h-[380px] flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={440}
          height={380}
          className="w-full h-full rounded-lg"
        />
      </div>

      {/* Footer Variable Legend Bar */}
      <div className="mt-2.5 pt-2 border-t border-[#1E293B] flex items-center justify-between text-[11px] text-[#94A3B8]">
        <div className="flex items-center gap-2">
          <span className="capitalize font-semibold text-[#E2E8F0]">
            {selectedVariable === 'current' ? 'Geostrophic Current' : selectedVariable} Mode
          </span>
          {variableValue !== null && variableValue !== undefined && (
            <span className="text-[#38BDF8] font-bold font-mono">
              ({formatValue(variableValue, variableUnit)})
            </span>
          )}
        </div>
        <span className="text-[10px] text-[#64748B]">Source: {source}</span>
      </div>
    </div>
  );
};
