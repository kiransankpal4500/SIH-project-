/**
 * MarineLifePanel.tsx
 * Scientific species information panel for the Ocean Chunk view.
 * Displays depth-appropriate marine species sourced from OBIS occurrence records.
 * Includes toggle, species cards, depth zone label, and scientific disclaimer.
 */

import React from 'react';
import { Fish, Eye, AlertCircle, Waves, ChevronDown, ChevronUp } from 'lucide-react';
import type { MarineLifeSpecies, MarineLifeResponse } from '../../services/oceanChunkService';

interface MarineLifePanelProps {
  marineData: MarineLifeResponse | null;
  enabled: boolean;
  onToggle: () => void;
  loading: boolean;
  error?: string | null;
  selectedDepth: number;
}

const MarineLifePanel: React.FC<MarineLifePanelProps> = ({
  marineData,
  enabled,
  onToggle,
  loading,
  error,
  selectedDepth,
}) => {
  const [expanded, setExpanded] = React.useState(true);

  const depthFilteredSpecies = React.useMemo(() => {
    if (!marineData?.species) return [];
    return marineData.species.filter(
      (s) => s.minimum_depth <= selectedDepth && selectedDepth <= s.maximum_depth
    );
  }, [marineData, selectedDepth]);

  return (
    <div className="bg-[#FFFFFF] border border-[#E2EAF2] rounded-[24px] shadow-[0_4px_16px_rgba(22,43,77,0.03)] overflow-hidden">
      {/* ─── Header with toggle ─── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2EAF2]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[12px] bg-[#EAF5FF] text-[#087FC4] flex items-center justify-center">
            <Fish className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
            Marine Life
          </span>
          {enabled && marineData && (
            <span className="px-2.5 py-0.5 bg-[#EAF5FF] border border-[#BFDBFE] rounded-full text-[10px] font-semibold text-[#087FC4]">
              {depthFilteredSpecies.length} species
            </span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {/* Marine Life ON/OFF toggle */}
          <button
            onClick={onToggle}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer ${
              enabled ? 'bg-[#087FC4]' : 'bg-[#E2EAF2]'
            }`}
            title={enabled ? 'Disable marine life visualization' : 'Enable marine life visualization'}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                enabled ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
            />
          </button>

          {/* Expand / collapse */}
          {enabled && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 hover:bg-[#F8FAFC] rounded-full text-[#64748B] transition-colors"
            >
              {expanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─── Body ─── */}
      {enabled && expanded && (
        <div className="p-5 space-y-4">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#64748B] py-2">
              <div className="w-4 h-4 border-2 border-[#087FC4] border-t-transparent rounded-full animate-spin" />
              <span>Querying OBIS occurrence records…</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-[#DC2626] bg-[#FEE2E2] border border-[#FECACA] px-3.5 py-2 rounded-[16px]">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Depth zone badge */}
          {marineData && (
            <div className="flex items-center gap-2">
              <Waves className="w-4 h-4 text-[#087FC4]" />
              <span className="text-[11px] font-bold text-[#172B4D] uppercase tracking-wider">
                {marineData.depth_zone}
              </span>
            </div>
          )}

          {/* Species cards */}
          {depthFilteredSpecies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
              {depthFilteredSpecies.map((sp, idx) => (
                <SpeciesCard key={`${sp.scientific_name}-${idx}`} species={sp} />
              ))}
            </div>
          ) : (
            !loading && (
              <div className="py-6 text-center text-xs text-[#64748B]">
                No species with occurrence evidence at this depth ({selectedDepth}m).
              </div>
            )
          )}

          {/* Scientific disclaimer */}
          {marineData && (
            <div className="pt-3 border-t border-[#E2EAF2]">
              <div className="flex items-start gap-2 text-[11px] text-[#64748B] leading-relaxed">
                <Eye className="w-3.5 h-3.5 mt-0.5 text-[#087FC4] shrink-0" />
                <span>{marineData.scientific_note}</span>
              </div>
              <div className="mt-1 text-[10px] text-[#94A3B8]">
                Source: {marineData.source}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Individual species card ───
const SpeciesCard: React.FC<{ species: MarineLifeSpecies }> = ({ species }) => (
  <div className="flex items-start gap-3 p-3.5 bg-[#F8FAFC] border border-[#E2EAF2] rounded-[18px] hover:border-[#BFDBFE] hover:bg-[#FFFFFF] shadow-2xs hover:shadow-xs transition-all">
    {/* Color swatch / icon */}
    <div
      className="w-10 h-10 rounded-[14px] shrink-0 flex items-center justify-center shadow-2xs"
      style={{ backgroundColor: species.color_hex + '20' }}
    >
      <Fish className="w-5 h-5" style={{ color: species.color_hex }} />
    </div>

    <div className="flex-1 min-w-0">
      {/* Name */}
      <div className="text-xs font-bold text-[#172B4D] leading-tight truncate">
        {species.common_name}
      </div>
      <div className="text-[11px] text-[#64748B] italic truncate mt-0.5">
        {species.scientific_name}
      </div>

      {/* Depth range chip */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="px-2 py-0.5 bg-[#EAF5FF] border border-[#BFDBFE] rounded-full text-[10px] font-semibold text-[#087FC4]">
          {species.minimum_depth}–{species.maximum_depth} m
        </span>
        <span className="px-2 py-0.5 bg-[#FFFFFF] border border-[#E2EAF2] rounded-full text-[10px] text-[#64748B]">
          {species.family}
        </span>
      </div>

      {/* Evidence */}
      <div className="mt-1.5 text-[10px] text-[#94A3B8]">
        {species.evidence_type} · {species.occurrence_count} record{species.occurrence_count !== 1 ? 's' : ''}
      </div>
    </div>
  </div>
);

export default MarineLifePanel;
