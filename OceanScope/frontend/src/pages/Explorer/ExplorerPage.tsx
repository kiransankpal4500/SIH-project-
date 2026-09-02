import React, { useState, useEffect } from 'react';
import { OceanGlobeContainer } from '../../three/OceanGlobe/OceanGlobeContainer';
import { GlobePlayerControlBar } from '../../components/player/GlobePlayerControlBar';
import { DepthProfileChart } from '../../components/charts/DepthProfileChart';
import { ModelComparisonPlaceholder } from '../../components/comparison/ModelComparisonPlaceholder';
import { OceanRiskPanel } from '../../components/disaster/OceanRiskPanel';
import { DataStatusCard } from '../../components/common/DataStatusCard';
import { OceanChunkView } from '../../components/chunk/OceanChunkView';
import { useOceanContext } from '../../store/OceanContext';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Database,
  Activity,
  ShieldAlert,
  BarChart3,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatCoordinates, formatValue } from '../../utils/formatters';

export const ExplorerPage: React.FC = () => {
  const { state, evaluateLocationRisk } = useOceanContext();

  const [showCurrents, setShowCurrents] = useState<boolean>(true);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string | null>('profiles');
  const [activeOceanChunk, setActiveOceanChunk] = useState<{ lat: number; lon: number } | null>(null);

  // ESC exits fullscreen or chunk view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeOceanChunk) {
          setActiveOceanChunk(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, activeOceanChunk]);

  const selectedFloat = state.selectedLiveArgoProfile;
  const hasSelection = !!selectedFloat || !!state.selectedRiskLocation;

  const currentCoords = selectedFloat
    ? { lat: selectedFloat.latitude ?? 19.076, lon: selectedFloat.longitude ?? 72.8777 }
    : state.selectedRiskLocation
    ? { lat: state.selectedRiskLocation.lat, lon: state.selectedRiskLocation.lon }
    : { lat: 19.076, lon: 72.8777 };

  const toggleSection = (name: string) => {
    setActiveSection(activeSection === name ? null : name);
  };

  const handleGlobeDoubleClick = (lat: number, lon: number) => {
    evaluateLocationRisk(lat, lon, state.selectedDepth, state.selectedTimestamp);
    setActiveOceanChunk({ lat, lon });
  };

  // If Ocean Chunk is active, render dedicated Ocean Chunk Simulation View
  if (activeOceanChunk) {
    return (
      <div className="space-y-4">
        <OceanChunkView
          latitude={activeOceanChunk.lat}
          longitude={activeOceanChunk.lon}
          onBackToGlobe={() => setActiveOceanChunk(null)}
        />
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#F7F9FC] p-4 overflow-y-auto' : 'space-y-4'}`}>
      {/* ─── DOUBLE-CLICK HINT BANNER ─── */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-[#1E40AF]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#0B84C6] shrink-0" />
          <span>
            <strong>New Feature:</strong> Double-click anywhere on the ocean globe to launch the <strong>3D Ocean Chunk Simulation</strong> (Real GEBCO Seabed + Copernicus Ocean Data).
          </span>
        </div>
        <button
          onClick={() => setActiveOceanChunk(currentCoords)}
          className="px-2.5 py-1 bg-[#0B84C6] text-[#FFFFFF] font-bold rounded-lg hover:bg-[#0284C7] transition-colors shrink-0 ml-2"
        >
          Open Chunk at Selection
        </button>
      </div>

      {/* ─── 1. LARGE 3D SCIENTIFIC GLOBE ─── */}
      <OceanGlobeContainer
        variable={state.selectedVariable}
        depth={state.selectedDepth}
        heightClass={isFullscreen ? 'h-[80vh] min-h-[500px]' : 'h-[68vh] min-h-[500px]'}
        showCurrents={showCurrents}
        showPoints={showPoints}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        onDoubleSelectLocation={handleGlobeDoubleClick}
      />

      {/* ─── 2. CLEAN SCIENTIFIC CONTROL BAR ─── */}
      <GlobePlayerControlBar
        showCurrents={showCurrents}
        setShowCurrents={setShowCurrents}
        showPoints={showPoints}
        setShowPoints={setShowPoints}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
      />

      {/* ─── 3. SELECTED LOCATION (When user clicks globe or float) ─── */}
      {hasSelection && (
        <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 shadow-[0_2px_10px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[#64748B] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#0B84C6]" />
                <span>Selected Location</span>
              </div>
              <div className="text-xl font-bold text-[#172033] tracking-tight">
                {selectedFloat
                  ? formatCoordinates(selectedFloat.latitude ?? 12.0, selectedFloat.longitude ?? 80.0)
                  : state.selectedRiskLocation
                  ? formatCoordinates(state.selectedRiskLocation.lat, state.selectedRiskLocation.lon)
                  : '18.50° N, 88.50° E'}
              </div>
            </div>

            {/* Key telemetry chips */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedFloat && selectedFloat.profile && selectedFloat.profile.length > 0 && (
                <>
                  <div className="px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs">
                    <span className="text-[#64748B] block text-[10px]">Temperature</span>
                    <span className="font-bold text-[#DC2626]">
                      {selectedFloat.profile[0].temperature != null
                        ? formatValue(selectedFloat.profile[0].temperature, '°C')
                        : '—'}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-xs">
                    <span className="text-[#64748B] block text-[10px]">Salinity</span>
                    <span className="font-bold text-[#0B84C6]">
                      {selectedFloat.profile[0].salinity != null
                        ? formatValue(selectedFloat.profile[0].salinity, 'PSU')
                        : '—'}
                    </span>
                  </div>

                  <div className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs">
                    <span className="text-[#64748B] block text-[10px]">Depth Level</span>
                    <span className="font-semibold text-[#172033]">{state.selectedDepth}m</span>
                  </div>
                </>
              )}

              {/* Risk Status */}
              {state.locationRisk && (
                <div
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                    state.locationRisk.overall_risk === 'HIGH' || state.locationRisk.overall_risk === 'CRITICAL'
                      ? 'bg-[#FEE2E2] border-[#FECACA] text-[#B91C1C]'
                      : state.locationRisk.overall_risk === 'MODERATE'
                      ? 'bg-[#FEF3C7] border-[#FDE68A] text-[#B45309]'
                      : 'bg-[#DCFCE7] border-[#BBF7D0] text-[#15803D]'
                  }`}
                >
                  <span className="text-[10px] block opacity-80">Risk Status</span>
                  <span>{state.locationRisk.overall_risk}</span>
                </div>
              )}

              {/* Source Badge */}
              <div className="px-3 py-1.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-lg text-xs">
                <span className="text-[#64748B] block text-[10px]">Source</span>
                <span className="font-medium text-[#475569]">
                  {selectedFloat ? 'INCOIS ERDDAP' : 'INCOIS HYCOM'}
                </span>
              </div>

              {/* 3D Ocean Chunk Button */}
              <button
                onClick={() => setActiveOceanChunk(currentCoords)}
                className="px-3 py-2 bg-[#0B84C6] hover:bg-[#0284C7] text-[#FFFFFF] text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors"
                title="Launch 3D Ocean Chunk Simulation"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>3D Ocean Chunk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 4. COLLAPSIBLE SCIENTIFIC ANALYSIS SECTIONS ─── */}
      <div className="space-y-3 pb-6">
        {/* Depth Profiles */}
        <CollapsibleSection
          title="Depth Profiles"
          subtitle="CTD salinity & temperature vertical soundings"
          icon={Activity}
          isOpen={activeSection === 'profiles'}
          onToggle={() => toggleSection('profiles')}
        >
          <DepthProfileChart height={280} />
        </CollapsibleSection>

        {/* Model vs Observation */}
        <CollapsibleSection
          title="Model vs. Observation"
          subtitle="Cross-validation of numerical forecasts against in-situ floats"
          icon={BarChart3}
          isOpen={activeSection === 'comparison'}
          onToggle={() => toggleSection('comparison')}
        >
          <ModelComparisonPlaceholder />
        </CollapsibleSection>

        {/* Ocean Risk */}
        <CollapsibleSection
          title="Ocean Risk"
          subtitle="Real-time multi-hazard physical threshold evaluation"
          icon={ShieldAlert}
          isOpen={activeSection === 'risk'}
          onToggle={() => toggleSection('risk')}
        >
          <OceanRiskPanel />
        </CollapsibleSection>

        {/* Data Status */}
        <CollapsibleSection
          title="Data Feeds"
          subtitle="Operational telemetry connection and model sync status"
          icon={Radio}
          isOpen={activeSection === 'data'}
          onToggle={() => toggleSection('data')}
        >
          <DataStatusCard />
        </CollapsibleSection>
      </div>
    </div>
  );
};

/* ─── Reusable Collapsible Scientific Section ─── */
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}) => (
  <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl shadow-[0_2px_10px_rgba(15,23,42,0.06)] overflow-hidden transition-all">
    <button
      onClick={onToggle}
      className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-[#F8FAFC] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#EFF6FF] text-[#0B84C6] rounded-lg">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <span className="text-sm font-semibold text-[#172033] block">{title}</span>
          {subtitle && <span className="text-xs text-[#64748B] block font-normal">{subtitle}</span>}
        </div>
      </div>
      <div className="p-1 rounded text-[#64748B]">
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-[#64748B]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#64748B]" />
        )}
      </div>
    </button>
    {isOpen && (
      <div className="px-5 pb-5 pt-2 border-t border-[#F1F5F9]">
        {children}
      </div>
    )}
  </div>
);
