/**
 * Dedicated Vertical Ocean Depth Meter Component
 * Matches the reference image visual hierarchy:
 * - Shows depth in meters from selected min to max
 * - Distinct zone labels (Surface, Sunlight/Epipelagic, Twilight/Mesopelagic, Midnight/Bathypelagic, Abyssal, Hadal)
 * - Gradual deep ocean color scale with glowing tick marks
 * - Fully synchronized with the 3D chunk vertical dimensions
 */

import React, { useMemo } from 'react';

export interface DepthRangePreset {
  id: string;
  label: string;
  minDepth: number;
  maxDepth: number;
  zoneName: string;
}

export const DEPTH_PRESETS: DepthRangePreset[] = [
  { id: 'surface_50', label: 'Surface to 50 m', minDepth: 0, maxDepth: 50, zoneName: 'Shallow Photic' },
  { id: 'epipelagic_200', label: '0–200 m (Sunlight)', minDepth: 0, maxDepth: 200, zoneName: 'Epipelagic' },
  { id: 'mesopelagic_1000', label: '200–1,000 m (Twilight)', minDepth: 200, maxDepth: 1000, zoneName: 'Mesopelagic' },
  { id: 'bathypelagic_2000', label: '1,000–2,000 m (Midnight)', minDepth: 1000, maxDepth: 2000, zoneName: 'Bathypelagic' },
  { id: 'abyssal_4000', label: '2,000–4,000 m (Abyssal)', minDepth: 2000, maxDepth: 4000, zoneName: 'Abyssopelagic' },
  { id: 'hadal_6000', label: '4,000–6,000 m+ (Hadal)', minDepth: 4000, maxDepth: 6500, zoneName: 'Hadal Trench' },
  { id: 'full_column', label: 'Full Water Column (0–6000m)', minDepth: 0, maxDepth: 6000, zoneName: 'Complete Stratum' },
];

export interface OceanZoneInfo {
  name: string;
  scientificName: string;
  depthRange: string;
  lightLevel: string;
  description: string;
  colorHex: string;
}

export function getZoneForDepth(depthM: number): OceanZoneInfo {
  if (depthM < 200) {
    return {
      name: 'Sunlight Zone',
      scientificName: 'Epipelagic Zone',
      depthRange: '0 – 200 m',
      lightLevel: 'Full Photosynthetic Sunlight',
      description: 'Abundant phytoplankton, kelp, coral reef systems, marine megafauna, and 90% of marine species.',
      colorHex: '#38bdf8',
    };
  } else if (depthM < 1000) {
    return {
      name: 'Twilight Zone',
      scientificName: 'Mesopelagic Zone',
      depthRange: '200 – 1,000 m',
      lightLevel: 'Faint Blue Penetration (Dysphotic)',
      description: 'Rapidly dropping temperature, bioluminescent jellyfish, lanternfish, and active diel vertical migration.',
      colorHex: '#0284c7',
    };
  } else if (depthM < 2000) {
    return {
      name: 'Midnight Zone',
      scientificName: 'Bathypelagic Zone',
      depthRange: '1,000 – 2,000 m',
      lightLevel: 'Total Darkness (Aphotic)',
      description: 'Extreme hydrostatic pressure, cold constant temperatures (~4°C), anglerfish, and gulper eels.',
      colorHex: '#1e3a8a',
    };
  } else if (depthM < 4000) {
    return {
      name: 'Abyssal Zone',
      scientificName: 'Abyssopelagic Zone',
      depthRange: '2,000 – 4,000 m',
      lightLevel: 'Zero Solar Light',
      description: 'Deposition of marine snow, benthic sediment plains, tripod fish, sea cucumbers, and glass sponges.',
      colorHex: '#0f172a',
    };
  } else {
    return {
      name: 'Hadal Zone',
      scientificName: 'Hadopelagic Zone',
      depthRange: '4,000 – 6,000+ m',
      lightLevel: 'Zero Solar Light',
      description: 'V-shaped deep ocean trenches, hydrothermal mineral vents, Mariana snailfish, and extremophile microbes.',
      colorHex: '#020617',
    };
  }
}

interface VerticalDepthMeterProps {
  minDepth: number;
  maxDepth: number;
  currentDepth: number;
  onSelectDepth?: (depth: number) => void;
  heightPx?: number;
}

export const VerticalDepthMeter: React.FC<VerticalDepthMeterProps> = ({
  minDepth,
  maxDepth,
  currentDepth,
  onSelectDepth,
  heightPx = 540,
}) => {
  // Generate 5-6 proportional tick marks along the vertical scale
  const ticks = useMemo(() => {
    const count = 5;
    const step = (maxDepth - minDepth) / count;
    return Array.from({ length: count + 1 }, (_, i) => {
      const d = Math.round(minDepth + i * step);
      const pct = (i / count) * 100;
      const zone = getZoneForDepth(d);
      return { depth: d, pct, zone };
    });
  }, [minDepth, maxDepth]);

  // Current selected depth percentage along the bar
  const selectedPct = useMemo(() => {
    if (maxDepth <= minDepth) return 0;
    const clamped = Math.max(minDepth, Math.min(maxDepth, currentDepth));
    return ((clamped - minDepth) / (maxDepth - minDepth)) * 100;
  }, [minDepth, maxDepth, currentDepth]);

  return (
    <aside
      aria-label="Oceanographic vertical depth scale"
      className="relative flex items-stretch select-none py-3 px-2 rounded-xl bg-[#030914]/90 border border-cyan-900/40 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
      style={{ minHeight: `${heightPx}px` }}
    >
      {/* 1. Rotated Axis Label */}
      <div className="flex items-center justify-center pr-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400/80 -rotate-90 whitespace-nowrap">
          DEPTH (m)
        </span>
      </div>

      {/* 2. Visual Vertical Gradient Bar with Glowing Ticks */}
      <div className="relative w-6 h-full flex flex-col justify-between items-center my-1 rounded-full overflow-hidden bg-gradient-to-b from-[#38bdf8] via-[#0284c7] via-40% via-[#1e3a8a] via-70% to-[#020617] border border-cyan-500/40 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
        {/* Selected Depth Indicator Bead */}
        <div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-cyan-400 shadow-[0_0_12px_rgba(56,189,248,0.9)] z-20 pointer-events-none transition-all duration-300"
          style={{ top: `calc(${selectedPct}% - 8px)` }}
        />

        {/* Subtle Depth Scanline */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none" />
      </div>

      {/* 3. Ticks and Ocean Zone Labels */}
      <div className="relative flex-1 ml-3 flex flex-col justify-between py-1">
        {ticks.map((tick, idx) => (
          <div
            key={`tick-${idx}-${tick.depth}`}
            onClick={() => onSelectDepth && onSelectDepth(tick.depth)}
            className="group flex items-center gap-2 cursor-pointer transition-all hover:translate-x-1"
          >
            {/* Horizontal pointer line */}
            <div className="w-4 h-[1.5px] bg-cyan-400/60 group-hover:bg-cyan-300 transition-colors" />

            {/* Depth number & Zone annotation */}
            <div className="flex flex-col">
              <span className="font-mono text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors">
                {tick.depth === 0 ? '0m (Surface)' : `${tick.depth.toLocaleString()}m`}
              </span>
              <span className="text-[9px] font-semibold text-cyan-400/70 uppercase tracking-wider">
                {tick.zone.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
