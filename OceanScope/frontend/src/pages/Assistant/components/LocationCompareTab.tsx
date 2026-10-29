/**
 * Location Comparison Component (Phase 4: Research Lab)
 * Independent multi-parameter side-by-side comparison between two oceanographic locations.
 * Computes verified physical parameter deltas and displays Gemini scientific comparative synthesis.
 */

import React, { useState } from 'react';
import {
  assistantService,
  CompareLocationsResponse,
  LocationTarget,
} from '../../../services/assistantService';
import {
  Scale,
  MapPin,
  Compass,
  AlertCircle,
  Clock,
  Database,
  ArrowRight,
  Sparkles,
  Layers,
  Thermometer,
  Droplets,
  Activity,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { formatCoordinates, formatValue } from '../../../utils/formatters';

interface LocationCompareTabProps {
  activeCoords: { lat: number; lon: number } | null;
  activeDepth: number;
}

/**
 * Clean scientific LaTeX math and notation to readable Unicode strings
 */
function cleanScientificMath(text: string): string {
  if (!text) return '';
  return text
    // Temperature differential
    .replace(/\$\\Delta\s*T\$/gi, 'ΔT')
    .replace(/\\Delta\s*T/gi, 'ΔT')
    // Salinity differential
    .replace(/\$\\Delta\s*S\$/gi, 'ΔS')
    .replace(/\\Delta\s*S/gi, 'ΔS')
    // Depth / bathymetry differential
    .replace(/\$\\Delta\s*Z\$/gi, 'ΔZ')
    .replace(/\\Delta\s*Z/gi, 'ΔZ')
    // Density differential
    .replace(/\$\\Delta\s*\\sigma(_\w+)?\$/gi, 'Δσ$1')
    .replace(/\\Delta\s*\\sigma/gi, 'Δσ')
    // Degree symbols
    .replace(/\^\\circ\s*\\text\{C\}/gi, '°C')
    .replace(/\^\\circ\s*C/gi, '°C')
    .replace(/\^\\circ\s*\\text\{N\}/gi, '°N')
    .replace(/\^\\circ\s*N/gi, '°N')
    .replace(/\^\\circ\s*\\text\{E\}/gi, '°E')
    .replace(/\^\\circ\s*E/gi, '°E')
    .replace(/\^\\circ\s*\\text\{S\}/gi, '°S')
    .replace(/\^\\circ\s*S/gi, '°S')
    .replace(/\^\\circ\s*\\text\{W\}/gi, '°W')
    .replace(/\^\\circ\s*W/gi, '°W')
    .replace(/\^\\circ/g, '°')
    .replace(/\^\{\\circ\}/g, '°')
    .replace(/\bdeg\s*C\b/gi, '°C')
    .replace(/C/g, '°C')
    .replace(/N/g, '°N')
    .replace(/E/g, '°E')
    .replace(/S/g, '°S')
    .replace(/W/g, '°W')
    .replace(/kg\/m/g, 'kg/m³')
    .replace(/kg\/m\^3/g, 'kg/m³')
    // Units
    .replace(/\\text\{kg\/m\}\^3/gi, 'kg/m³')
    .replace(/\\text\{kg\/m\^3\}/gi, 'kg/m³')
    .replace(/\\text\{m\/s\}/gi, 'm/s')
    .replace(/\\text\{PSU\}/gi, 'PSU')
    .replace(/\\text\{m\}/gi, 'm')
    .replace(/\\text\{([^}]+)\}/gi, '$1')
    // General greek letters
    .replace(/\\zeta_0/gi, 'ζ₀')
    .replace(/\\sigma/gi, 'σ')
    .replace(/\\rho/gi, 'ρ')
    .replace(/\\theta/gi, 'θ')
    .replace(/\\Delta/gi, 'Δ')
    .replace(/\\pm/gi, '±')
    .replace(/\\times/gi, '×')
    // Strip remaining math delimiters $...$
    .replace(/\$([^$]+)\$/g, '$1');
}

/**
 * Format inline markdown (bold, italics, inline code, scientific notation)
 */
function formatInlineMarkdown(rawText: string): string {
  const cleaned = cleanScientificMath(rawText);
  // Sanitize raw HTML tags to prevent XSS
  const sanitized = cleaned.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Bold **text**
  let out = sanitized.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-[#0F172A]">$1</strong>');
  // Italics *text*
  out = out.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em class="italic text-[#334155]">$1</em>');
  // Inline code `code`
  out = out.replace(
    /`(.*?)`/g,
    '<code class="px-1.5 py-0.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded text-xs font-mono font-semibold text-[#0369A1]">$1</code>'
  );
  return out;
}

type MarkdownBlock =
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'h4'; text: string }
  | { type: 'h5'; text: string }
  | { type: 'callout'; subtype: 'warning' | 'note'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'bullet'; text: string; isNested: boolean }
  | { type: 'numbered'; number: string; text: string; isNested: boolean }
  | { type: 'hr' }
  | { type: 'paragraph'; text: string }
  | { type: 'spacer' };

function parseComparativeMarkdown(content: string): MarkdownBlock[] {
  if (!content) return [];
  const lines = content.split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Empty line
    if (!trimmed) {
      if (blocks.length > 0 && blocks[blocks.length - 1].type !== 'spacer') {
        blocks.push({ type: 'spacer' });
      }
      i++;
      continue;
    }

    // Horizontal Rule
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Markdown Table
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.split('|').length >= 3) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const parseRow = (line: string) =>
          line
            .slice(1, -1)
            .split('|')
            .map((c) => c.trim());

        const headers = parseRow(tableLines[0]);
        let startIndex = 1;
        if (startIndex < tableLines.length && /^\|(\s*:?-+:?\s*\|)+$/.test(tableLines[startIndex])) {
          startIndex = 2;
        }

        const rows: string[][] = [];
        for (let r = startIndex; r < tableLines.length; r++) {
          if (/^\|(\s*:?-+:?\s*\|)+$/.test(tableLines[r])) continue;
          rows.push(parseRow(tableLines[r]));
        }

        blocks.push({ type: 'table', headers, rows });
        continue;
      }
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      blocks.push({ type: 'h2', text: trimmed.substring(2).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('## ')) {
      blocks.push({ type: 'h3', text: trimmed.substring(3).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('### ')) {
      blocks.push({ type: 'h4', text: trimmed.substring(4).trim() });
      i++;
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      blocks.push({ type: 'h5', text: trimmed.substring(5).trim() });
      i++;
      continue;
    }

    // Callouts / Blockquotes
    if (trimmed.startsWith('> [!WARNING]')) {
      let calloutText = '';
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const cLine = lines[i].trim().replace(/^>\s?/, '');
        calloutText += (calloutText ? ' ' : '') + cLine;
        i++;
      }
      blocks.push({ type: 'callout', subtype: 'warning', text: calloutText });
      continue;
    }
    if (trimmed.startsWith('> [!NOTE]')) {
      let calloutText = '';
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const cLine = lines[i].trim().replace(/^>\s?/, '');
        calloutText += (calloutText ? ' ' : '') + cLine;
        i++;
      }
      blocks.push({ type: 'callout', subtype: 'note', text: calloutText });
      continue;
    }
    if (trimmed.startsWith('> ')) {
      let calloutText = trimmed.substring(2).trim();
      i++;
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        const cLine = lines[i].trim().replace(/^>\s?/, '');
        calloutText += ' ' + cLine;
        i++;
      }
      const isWarn = /warning|caution|unavailable|error/i.test(calloutText);
      blocks.push({ type: 'callout', subtype: isWarn ? 'warning' : 'note', text: calloutText });
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const isNested = rawLine.startsWith('  ') || rawLine.startsWith('\t');
      blocks.push({ type: 'bullet', text: trimmed.substring(2).trim(), isNested });
      i++;
      continue;
    }

    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const isNested = rawLine.startsWith('  ') || rawLine.startsWith('\t');
      blocks.push({ type: 'numbered', number: numMatch[1], text: numMatch[2], isNested });
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: 'paragraph', text: trimmed });
    i++;
  }

  return blocks;
}

const ComparativeSynthesisView: React.FC<{ content: string }> = ({ content }) => {
  const blocks = parseComparativeMarkdown(content);

  return (
    <div className="space-y-3.5 text-[#1E293B]">
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2
                key={idx}
                className="text-xl sm:text-2xl font-bold text-[#0F172A] mt-6 mb-3 pb-2 border-b border-[#CBD5E1]"
              >
                {cleanScientificMath(block.text)}
              </h2>
            );
          case 'h3':
            return (
              <h3
                key={idx}
                className="text-lg sm:text-xl font-bold text-[#0F172A] mt-5 mb-2.5 pb-1 border-b border-[#E2E8F0]"
              >
                {cleanScientificMath(block.text)}
              </h3>
            );
          case 'h4':
            return (
              <h4
                key={idx}
                className="text-base sm:text-lg font-bold text-[#0284C7] mt-4 mb-1.5"
              >
                {cleanScientificMath(block.text)}
              </h4>
            );
          case 'h5':
            return (
              <h5
                key={idx}
                className="text-sm sm:text-base font-bold text-[#0F172A] mt-3 mb-1"
              >
                {cleanScientificMath(block.text)}
              </h5>
            );
          case 'callout': {
            const isWarning = block.subtype === 'warning';
            return (
              <div
                key={idx}
                className={`my-3 p-4 rounded-xl border-l-4 flex items-start gap-3 shadow-xs ${
                  isWarning
                    ? 'bg-[#FFFBEB] border-[#F59E0B] text-[#78350F]'
                    : 'bg-[#F0F9FF] border-[#0284C7] text-[#0C4A6E]'
                }`}
              >
                {isWarning ? (
                  <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-5 h-5 text-[#0284C7] shrink-0 mt-0.5" />
                )}
                <div
                  className="text-xs sm:text-sm leading-relaxed font-medium"
                  dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(block.text) }}
                />
              </div>
            );
          }
          case 'table':
            return (
              <div key={idx} className="my-4 overflow-x-auto rounded-xl border border-[#CBD5E1] shadow-xs">
                <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1]">
                      {block.headers.map((h, hIdx) => (
                        <th
                          key={hIdx}
                          className="px-4 py-3 font-bold text-[#0F172A] uppercase tracking-wider text-[11px] sm:text-xs"
                        >
                          <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(h) }} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-[#F8FAFC] even:bg-[#F8FAFC]/75 transition-colors"
                      >
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className="px-4 py-2.5 text-xs sm:text-sm text-[#1E293B]"
                          >
                            <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(cell) }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'bullet':
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 my-1 ${block.isNested ? 'pl-6 sm:pl-7' : 'pl-1'}`}
              >
                <span
                  className={`font-bold leading-none select-none mt-1.5 ${
                    block.isNested ? 'text-[#0284C7]/80 text-xs' : 'text-[#0284C7] text-base'
                  }`}
                >
                  {block.isNested ? '◦' : '•'}
                </span>
                <span
                  className="text-sm sm:text-[15px] leading-[1.65] text-[#1E293B] flex-1"
                  dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(block.text) }}
                />
              </div>
            );
          case 'numbered':
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 my-1.5 ${block.isNested ? 'pl-6 sm:pl-7' : 'pl-1'}`}
              >
                <span className="font-bold text-[#0284C7] text-xs sm:text-sm font-mono mt-0.5 min-w-[1.25rem]">
                  {block.number}.
                </span>
                <span
                  className="text-sm sm:text-[15px] leading-[1.65] text-[#1E293B] flex-1"
                  dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(block.text) }}
                />
              </div>
            );
          case 'hr':
            return <hr key={idx} className="my-4 border-[#E2E8F0]" />;
          case 'spacer':
            return <div key={idx} className="h-1.5" />;
          case 'paragraph':
          default:
            return (
              <p
                key={idx}
                className="text-sm sm:text-[15px] leading-[1.65] text-[#1E293B] break-words"
                dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(block.text) }}
              />
            );
        }
      })}
    </div>
  );
};

const PRESET_COMPARISONS: Array<{
  name: string;
  locA: LocationTarget;
  locB: LocationTarget;
  question: string;
}> = [
  {
    name: 'Arabian Sea vs. Bay of Bengal (Basin Contrast)',
    locA: { latitude: 15.0, longitude: 65.0, depth: 0, label: 'Central Arabian Sea' },
    locB: { latitude: 15.0, longitude: 88.0, depth: 0, label: 'Central Bay of Bengal' },
    question: 'Compare surface salinity and thermal stratification between the high-evaporation Arabian Sea and river-dominated Bay of Bengal.',
  },
  {
    name: 'Equatorial Warm Pool vs. Somali Upwelling',
    locA: { latitude: 0.0, longitude: 80.0, depth: 0, label: 'Equatorial Indian Ocean' },
    locB: { latitude: 10.0, longitude: 52.0, depth: 0, label: 'Somali Coast Upwelling' },
    question: 'Analyze differences in sea surface temperature, current speeds, and thermocline depth between the equatorial zone and western boundary upwelling.',
  },
  {
    name: 'Surface (0m) vs. Deep Intermediate Ocean (500m)',
    locA: { latitude: 12.0, longitude: 72.0, depth: 0, label: 'Lakshadweep Sea Surface' },
    locB: { latitude: 12.0, longitude: 72.0, depth: 500, label: 'Lakshadweep Intermediate Depth' },
    question: 'How do temperature, salinity, and current velocities differ between the photic mixed layer and the intermediate 500m layer?',
  },
];

export const LocationCompareTab: React.FC<LocationCompareTabProps> = ({
  activeCoords,
  activeDepth,
}) => {
  const [locA, setLocA] = useState<LocationTarget>({
    latitude: activeCoords ? activeCoords.lat : 15.0,
    longitude: activeCoords ? activeCoords.lon : 65.0,
    depth: activeDepth || 0,
    label: 'Location A (Arabian Sea)',
  });

  const [locB, setLocB] = useState<LocationTarget>({
    latitude: 15.0,
    longitude: 88.0,
    depth: activeDepth || 0,
    label: 'Location B (Bay of Bengal)',
  });

  const [customQuestion, setCustomQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [comparisonResult, setComparisonResult] = useState<CompareLocationsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApplyPreset = (preset: (typeof PRESET_COMPARISONS)[0]) => {
    setLocA(preset.locA);
    setLocB(preset.locB);
    setCustomQuestion(preset.question);
  };

  const handleUseCurrentForA = () => {
    if (activeCoords) {
      setLocA((prev) => ({
        ...prev,
        latitude: activeCoords.lat,
        longitude: activeCoords.lon,
        depth: activeDepth,
        label: `Active Explorer (${formatCoordinates(activeCoords.lat, activeCoords.lon)})`,
      }));
    }
  };

  const handleUseCurrentForB = () => {
    if (activeCoords) {
      setLocB((prev) => ({
        ...prev,
        latitude: activeCoords.lat,
        longitude: activeCoords.lon,
        depth: activeDepth,
        label: `Active Explorer (${formatCoordinates(activeCoords.lat, activeCoords.lon)})`,
      }));
    }
  };

  const handleExecuteComparison = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await assistantService.compareLocations({
        location_a: locA,
        location_b: locB,
        question: customQuestion.trim() || undefined,
      });
      setComparisonResult(response);
    } catch (err: any) {
      console.error('[LocationCompareTab] Error:', err);
      setErrorMessage(err.message || 'Failed to compare locations. Please verify inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  // Safe helper to extract parameters from flat structure or parameters map
  const getParam = (loc: any, key: string) => {
    if (!loc) return null;
    return loc[key] ?? loc.parameters?.[key] ?? null;
  };

  const locAData = comparisonResult?.location_a;
  const locBData = comparisonResult?.location_b;
  const metrics = comparisonResult?.comparison_metrics;

  const bathyA = getParam(locAData, 'bathymetry');
  const tempA = getParam(locAData, 'temperature');
  const salA = getParam(locAData, 'salinity');
  const currA = getParam(locAData, 'current');
  const mldA = getParam(locAData, 'mixed_layer_depth') ?? getParam(locAData, 'mld');
  const sshA = getParam(locAData, 'sea_surface_height') ?? getParam(locAData, 'height');
  const argoA = getParam(locAData, 'in_situ_argo');

  const bathyB = getParam(locBData, 'bathymetry');
  const tempB = getParam(locBData, 'temperature');
  const salB = getParam(locBData, 'salinity');
  const currB = getParam(locBData, 'current');
  const mldB = getParam(locBData, 'mixed_layer_depth') ?? getParam(locBData, 'mld');
  const sshB = getParam(locBData, 'sea_surface_height') ?? getParam(locBData, 'height');
  const argoB = getParam(locBData, 'in_situ_argo');

  const deltaTemp = metrics?.delta_temperature_c ?? metrics?.temperature_delta_c;
  const deltaSal = metrics?.delta_salinity_psu ?? metrics?.salinity_delta_psu;
  const deltaBathy = metrics?.bathymetry_difference_m ?? metrics?.bathymetry_delta_m;
  const deltaCurr = metrics?.delta_current_speed_m_s ?? metrics?.current_speed_delta_m_s;
  const currRatio = metrics?.current_speed_ratio;

  return (
    <div className="space-y-6">
      {/* ─── INTRODUCTION / PRESETS ─── */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-5 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#172033] flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#0B84C6]" />
              Dual-Location Comparative Ocean Analysis
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Retrieve verified telemetry independently for two targets and evaluate parameter deltas, thermocline variances, and regional water mass differences.
            </p>
          </div>
          <span className="px-2.5 py-1 bg-[#EFF6FF] text-[#0B84C6] text-[11px] font-semibold rounded-md border border-[#BFDBFE] self-start sm:self-auto">
            Independent GEBCO & HYCOM Sampling
          </span>
        </div>

        {/* Preset Buttons */}
        <div>
          <span className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider block mb-2">
            Research Benchmarks & Presets:
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {PRESET_COMPARISONS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(preset)}
                className="text-left p-2.5 bg-[#F8FAFC] hover:bg-[#E0F2FE]/50 border border-[#E2E8F0] hover:border-[#0B84C6]/40 rounded-lg transition-all group"
              >
                <div className="text-xs font-bold text-[#172033] group-hover:text-[#0B84C6] flex items-center justify-between">
                  <span>{preset.name}</span>
                </div>
                <div className="text-[11px] text-[#64748B] mt-1 line-clamp-1">
                  {preset.question}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TARGET COORDINATE INPUT CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Location A */}
        <div className="bg-[#FFFFFF] border-2 border-[#0B84C6]/30 rounded-xl p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] relative">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2 py-0.5 bg-[#E0F2FE] text-[#0B84C6] text-xs font-bold rounded-md flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Target Location A
            </span>
            {activeCoords && (
              <button
                onClick={handleUseCurrentForA}
                className="text-[11px] text-[#0B84C6] hover:underline font-semibold flex items-center gap-1"
                title="Populate with coordinates currently selected on Globe"
              >
                <span>Use Current Globe ({formatCoordinates(activeCoords.lat, activeCoords.lon)})</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                Location Label
              </label>
              <input
                type="text"
                value={locA.label || ''}
                onChange={(e) => setLocA({ ...locA, label: e.target.value })}
                placeholder="e.g. Western Arabian Sea"
                className="w-full text-xs px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033] focus:ring-1 focus:ring-[#0B84C6]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                  Latitude (°N)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="-90"
                  max="90"
                  value={locA.latitude}
                  onChange={(e) => setLocA({ ...locA, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-2 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                  Longitude (°E)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="-180"
                  max="180"
                  value={locA.longitude}
                  onChange={(e) => setLocA({ ...locA, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-2 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                  Depth (m)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="5000"
                  value={locA.depth ?? 0}
                  onChange={(e) => setLocA({ ...locA, depth: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full text-xs px-2 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location B */}
        <div className="bg-[#FFFFFF] border-2 border-[#8B5CF6]/30 rounded-xl p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] relative">
          <div className="flex items-center justify-between mb-3">
            <span className="px-2 py-0.5 bg-[#F3E8FF] text-[#7C3AED] text-xs font-bold rounded-md flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              Target Location B
            </span>
            {activeCoords && (
              <button
                onClick={handleUseCurrentForB}
                className="text-[11px] text-[#7C3AED] hover:underline font-semibold flex items-center gap-1"
                title="Populate with coordinates currently selected on Globe"
              >
                <span>Use Current Globe ({formatCoordinates(activeCoords.lat, activeCoords.lon)})</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            <div>
              <label className="text-[11px] font-semibold text-[#64748B] block mb-1">
                Location Label
              </label>
              <input
                type="text"
                value={locB.label || ''}
                onChange={(e) => setLocB({ ...locB, label: e.target.value })}
                placeholder="e.g. Eastern Bay of Bengal"
                className="w-full text-xs px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033] focus:ring-1 focus:ring-[#7C3AED]"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                  Latitude (°N)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="-90"
                  max="90"
                  value={locB.latitude}
                  onChange={(e) => setLocB({ ...locB, latitude: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-2 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                  Longitude (°E)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="-180"
                  max="180"
                  value={locB.longitude}
                  onChange={(e) => setLocB({ ...locB, longitude: parseFloat(e.target.value) || 0 })}
                  className="w-full text-xs px-2 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033]"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-[#64748B] block mb-1">
                  Depth (m)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="5000"
                  value={locB.depth ?? 0}
                  onChange={(e) => setLocB({ ...locB, depth: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full text-xs px-2 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-[#172033]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── RESEARCH QUERY & TRIGGER ─── */}
      <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)] flex flex-col sm:flex-row items-center gap-3">
        <input
          type="text"
          value={customQuestion}
          onChange={(e) => setCustomQuestion(e.target.value)}
          placeholder="Optional: Focus question (e.g. 'Compare salinity gradients and thermocline depth between both sites')..."
          className="flex-1 w-full text-xs sm:text-sm px-3.5 py-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-[#172033] focus:ring-2 focus:ring-[#0B84C6] focus:bg-[#FFFFFF]"
        />
        <button
          onClick={handleExecuteComparison}
          disabled={isLoading}
          className="w-full sm:w-auto px-5 py-2.5 bg-[#0B84C6] hover:bg-[#0284C7] disabled:bg-[#94A3B8] text-[#FFFFFF] rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Retrieving & Comparing...</span>
            </>
          ) : (
            <>
              <Scale className="w-3.5 h-3.5" />
              <span>Run Comparative Analysis</span>
            </>
          )}
        </button>
      </div>

      {/* ─── ERROR ALERT ─── */}
      {errorMessage && (
        <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs text-[#991B1B] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ─── RESULTS VIEW ─── */}
      {comparisonResult && (
        <div className="space-y-6 pt-2">
          {/* COMPARISON METRICS DELTA STRIP */}
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-xs font-bold text-[#172033] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0B84C6]" />
                Calculated Physical Parameter Deltas
              </h3>
              <span className="text-[11px] font-semibold text-[#0B84C6] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
                Convention: Target B minus Target A (Δ = B − A)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Temp Delta */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-3">
                <span className="text-[10px] text-[#64748B] block font-semibold">Temperature Delta (ΔT)</span>
                <span className="text-base font-extrabold text-[#DC2626]">
                  {deltaTemp != null
                    ? `${deltaTemp > 0 ? '+' : ''}${deltaTemp.toFixed(2)} °C`
                    : 'N/A'}
                </span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  {deltaTemp != null
                    ? deltaTemp > 0
                      ? 'Target B is warmer'
                      : deltaTemp < 0
                      ? 'Target A is warmer'
                      : 'Thermal parity'
                    : 'Both locations must have valid measurements'}
                </span>
              </div>

              {/* Salinity Delta */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-3">
                <span className="text-[10px] text-[#64748B] block font-semibold">Salinity Delta (ΔS)</span>
                <span className="text-base font-extrabold text-[#0B84C6]">
                  {deltaSal != null
                    ? `${deltaSal > 0 ? '+' : ''}${deltaSal.toFixed(2)} PSU`
                    : 'N/A'}
                </span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  {deltaSal != null
                    ? deltaSal > 0
                      ? 'Target B is more saline'
                      : deltaSal < 0
                      ? 'Target A is more saline'
                      : 'Salinity parity'
                    : 'Both locations must have valid measurements'}
                </span>
              </div>

              {/* Bathymetry Diff */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-3">
                <span className="text-[10px] text-[#64748B] block font-semibold">Seabed Depth Variance</span>
                <span className="text-base font-extrabold text-[#172033]">
                  {deltaBathy != null
                    ? `${deltaBathy > 0 ? '+' : ''}${deltaBathy.toFixed(0)} m`
                    : 'N/A'}
                </span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  {deltaBathy != null
                    ? deltaBathy > 0
                      ? 'Target B seabed is deeper'
                      : deltaBathy < 0
                      ? 'Target A seabed is deeper'
                      : 'Identical depth'
                    : 'GEBCO seabed data required for both'}
                </span>
              </div>

              {/* Current Ratio */}
              <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-lg p-3">
                <span className="text-[10px] text-[#64748B] block font-semibold">Current Velocity Ratio</span>
                <span className="text-base font-extrabold text-[#16A34A]">
                  {currRatio != null
                    ? `${currRatio.toFixed(2)}x`
                    : 'N/A'}
                </span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  {currRatio != null
                    ? 'Ratio of current velocities (B / A)'
                    : (currA?.speed_m_s === 0
                      ? 'Undefined (Target A velocity is 0 m/s)'
                      : 'Requires valid velocities for both')}
                </span>
              </div>
            </div>
          </div>

          {/* SIDE-BY-SIDE PARAMETER SPECIFICATIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Target A Details */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F1F5F9]">
                <div>
                  <span className="text-xs font-bold text-[#0B84C6]">
                    {locA.label || 'Target Location A'}
                  </span>
                  <div className="text-[11px] text-[#64748B]">
                    {formatCoordinates(locA.latitude, locA.longitude)} · Depth: {locA.depth ?? 0}m
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#E0F2FE] text-[#0B84C6] text-[10px] font-semibold rounded">
                  Target A
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Seabed Depth:</span>
                  <span className="font-bold text-[#172033]">
                    {bathyA?.value != null ? `${bathyA.value} m` : (bathyA?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Temperature:</span>
                  <span className="font-bold text-[#DC2626]">
                    {tempA?.value != null ? `${tempA.value.toFixed(2)} °C` : (tempA?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Salinity:</span>
                  <span className="font-bold text-[#0B84C6]">
                    {salA?.value != null ? `${salA.value.toFixed(2)} PSU` : (salA?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Current Velocity:</span>
                  <span className="font-bold text-[#172033]">
                    {currA?.speed_m_s != null ? `${currA.speed_m_s.toFixed(3)} m/s` : (currA?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Mixed Layer Depth:</span>
                  <span className="font-bold text-[#172033]">
                    {mldA?.value != null ? `${mldA.value.toFixed(1)} m` : (mldA?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Sea Surface Height:</span>
                  <span className="font-bold text-[#172033]">
                    {sshA?.value != null ? `${sshA.value.toFixed(2)} m` : (sshA?.limitation || 'Unavailable')}
                  </span>
                </div>
                {argoA && argoA.status === 'available' && (
                  <div className="flex justify-between py-1.5 border-t border-[#F8FAFC] text-[11px] text-[#059669]">
                    <span>In-situ ARGO Float:</span>
                    <span className="font-semibold">Platform #{argoA.platform_id} ({argoA.distance_km} km away)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Target B Details */}
            <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F1F5F9]">
                <div>
                  <span className="text-xs font-bold text-[#7C3AED]">
                    {locB.label || 'Target Location B'}
                  </span>
                  <div className="text-[11px] text-[#64748B]">
                    {formatCoordinates(locB.latitude, locB.longitude)} · Depth: {locB.depth ?? 0}m
                  </div>
                </div>
                <span className="px-2 py-0.5 bg-[#F3E8FF] text-[#7C3AED] text-[10px] font-semibold rounded">
                  Target B
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Seabed Depth:</span>
                  <span className="font-bold text-[#172033]">
                    {bathyB?.value != null ? `${bathyB.value} m` : (bathyB?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Temperature:</span>
                  <span className="font-bold text-[#DC2626]">
                    {tempB?.value != null ? `${tempB.value.toFixed(2)} °C` : (tempB?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Salinity:</span>
                  <span className="font-bold text-[#0B84C6]">
                    {salB?.value != null ? `${salB.value.toFixed(2)} PSU` : (salB?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Current Velocity:</span>
                  <span className="font-bold text-[#172033]">
                    {currB?.speed_m_s != null ? `${currB.speed_m_s.toFixed(3)} m/s` : (currB?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F8FAFC]">
                  <span className="text-[#64748B]">Mixed Layer Depth:</span>
                  <span className="font-bold text-[#172033]">
                    {mldB?.value != null ? `${mldB.value.toFixed(1)} m` : (mldB?.limitation || 'Unavailable')}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#64748B]">Sea Surface Height:</span>
                  <span className="font-bold text-[#172033]">
                    {sshB?.value != null ? `${sshB.value.toFixed(2)} m` : (sshB?.limitation || 'Unavailable')}
                  </span>
                </div>
                {argoB && argoB.status === 'available' && (
                  <div className="flex justify-between py-1.5 border-t border-[#F8FAFC] text-[11px] text-[#059669]">
                    <span>In-situ ARGO Float:</span>
                    <span className="font-semibold">Platform #{argoB.platform_id} ({argoB.distance_km} km away)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── SCIENTIFIC COMPARATIVE SYNTHESIS ─── */}
          <div className="bg-[#FFFFFF] border border-[#CBD5E1] rounded-2xl p-6 sm:p-7 shadow-[0_4px_20px_rgba(15,23,42,0.08)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#E0F2FE] text-[#0284C7] shrink-0">
                  <Sparkles className="w-5 h-5 text-[#0284C7]" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight">
                    Physical Oceanography Comparative Synthesis
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#475569] mt-0.5">
                    Dual-station hydrodynamic analysis and multi-parameter gradient evaluation
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#334155] shrink-0 self-start sm:self-auto">
                <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                <span>Model: {comparisonResult.metadata.model}</span>
              </div>
            </div>

            <ComparativeSynthesisView content={comparisonResult.analysis} />

            {/* Caveats & Comparability Warnings */}
            {comparisonResult.limitations && comparisonResult.limitations.length > 0 && (
              <div className="mt-6 pt-4 border-t border-[#E2E8F0]">
                <div className="bg-[#FFFBEB] p-4 rounded-xl border border-[#FDE68A] shadow-xs">
                  <div className="text-xs sm:text-sm font-bold text-[#92400E] flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0" />
                    <span>Comparability Caveats &amp; Data Constraints</span>
                  </div>
                  <ul className="space-y-1.5 pl-6 list-disc text-xs sm:text-[13px] text-[#78350F] leading-relaxed">
                    {comparisonResult.limitations.map((lim, i) => (
                      <li key={i}>{lim}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Provenance Footer */}
            <div className="mt-5 pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3 text-xs text-[#334155]">
              <span className="flex items-center gap-1.5 font-medium">
                <Database className="w-4 h-4 text-[#0284C7] shrink-0" />
                <span>Observational Datasets:</span>
                <span className="font-semibold text-[#0F172A]">{comparisonResult.sources.join(', ')}</span>
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-4 h-4 text-[#0284C7] shrink-0" />
                <span>Request ID:</span>
                <span className="font-mono text-[11px] px-2 py-0.5 bg-[#F1F5F9] border border-[#CBD5E1] rounded text-[#0F172A] font-semibold">
                  {comparisonResult.request_id}
                </span>
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
