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
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden">
      {/* ─── Header with toggle ─── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <Fish className="w-4 h-4 text-[#0B84C6]" />
          <span className="text-xs font-bold text-[#172033] uppercase tracking-wider">
            Marine Life
          </span>
          {enabled && marineData && (
            <span className="px-2 py-0.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-full text-[10px] font-semibold text-[#0B84C6]">
              {depthFilteredSpecies.length} species
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Marine Life ON/OFF toggle */}
          <button
            onClick={onToggle}
            className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
              enabled ? 'bg-[#0B84C6]' : 'bg-[#CBD5E1]'
            }`}
            title={enabled ? 'Disable marine life visualization' : 'Enable marine life visualization'}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                enabled ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>

          {/* Expand / collapse */}
          {enabled && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-[#F1F5F9] rounded"
            >
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-[#64748B]" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ─── Body ─── */}
      {enabled && expanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <div className="w-3.5 h-3.5 border-2 border-[#0B84C6] border-t-transparent rounded-full animate-spin" />
              <span>Querying OBIS occurrence records…</span>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 text-xs text-[#EF4444]">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Depth zone badge */}
          {marineData && (
            <div className="flex items-center gap-2">
              <Waves className="w-3.5 h-3.5 text-[#0B84C6]" />
              <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">
                {marineData.depth_zone}
              </span>
            </div>
          )}

          {/* Species cards */}
          {depthFilteredSpecies.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {depthFilteredSpecies.map((sp, idx) => (
                <SpeciesCard key={`${sp.scientific_name}-${idx}`} species={sp} />
              ))}
            </div>
          ) : (
            !loading && (
              <div className="py-3 text-center text-xs text-[#94A3B8]">
                No species with occurrence evidence at this depth ({selectedDepth}m).
              </div>
            )
          )}

          {/* Scientific disclaimer */}
          {marineData && (
            <div className="pt-2 border-t border-[#F1F5F9]">
              <div className="flex items-start gap-1.5 text-[10px] text-[#94A3B8] leading-relaxed">
                <Eye className="w-3 h-3 mt-0.5 shrink-0" />
                <span>{marineData.scientific_note}</span>
              </div>
              <div className="mt-1 text-[9px] text-[#CBD5E1]">
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
  <div className="flex items-start gap-2.5 p-2.5 bg-[#F8FAFC] border border-[#F1F5F9] rounded-lg hover:border-[#BFDBFE] transition-colors">
    {/* Color swatch / icon */}
    <div
      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
      style={{ backgroundColor: species.color_hex + '20' }}
    >
      <Fish className="w-4 h-4" style={{ color: species.color_hex }} />
    </div>

    <div className="flex-1 min-w-0">
      {/* Name */}
      <div className="text-xs font-bold text-[#172033] leading-tight truncate">
        {species.common_name}
      </div>
      <div className="text-[10px] text-[#64748B] italic truncate">
        {species.scientific_name}
      </div>

      {/* Depth range chip */}
      <div className="mt-1 flex flex-wrap gap-1">
        <span className="px-1.5 py-0.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded text-[9px] font-medium text-[#0369A1]">
          {species.minimum_depth}–{species.maximum_depth} m
        </span>
        <span className="px-1.5 py-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded text-[9px] text-[#64748B]">
          {species.family}
        </span>
      </div>

      {/* Evidence */}
      <div className="mt-1 text-[9px] text-[#94A3B8]">
        {species.evidence_type} · {species.occurrence_count} record{species.occurrence_count !== 1 ? 's' : ''}
      </div>
    </div>
  </div>
);

export default MarineLifePanel;
