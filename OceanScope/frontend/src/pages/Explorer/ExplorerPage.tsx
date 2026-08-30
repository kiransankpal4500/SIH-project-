import React, { useState, useEffect } from 'react';
import { OceanGlobeContainer } from '../../three/OceanGlobe/OceanGlobeContainer';
import { GlobePlayerControlBar } from '../../components/player/GlobePlayerControlBar';
import { DepthProfileChart } from '../../components/charts/DepthProfileChart';
import { ModelComparisonPlaceholder } from '../../components/comparison/ModelComparisonPlaceholder';
import { OceanRiskPanel } from '../../components/disaster/OceanRiskPanel';
import { DataStatusCard } from '../../components/common/DataStatusCard';
import { useOceanContext } from '../../store/OceanContext';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatCoordinates, formatValue } from '../../utils/formatters';

export const ExplorerPage: React.FC = () => {
  const { state } = useOceanContext();

  const [showCurrents, setShowCurrents] = useState<boolean>(true);
  const [showPoints, setShowPoints] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // ESC exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const selectedFloat = state.selectedLiveArgoProfile;
  const hasSelection = !!selectedFloat || !!state.selectedRiskLocation;

  const toggleSection = (name: string) => {
    setActiveSection(activeSection === name ? null : name);
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-[#020610] p-2 overflow-y-auto' : 'space-y-2'}`}>
      {/* ─── 1. LARGE 3D GLOBE ─── */}
      <OceanGlobeContainer
        variable={state.selectedVariable}
        depth={state.selectedDepth}
        heightClass={isFullscreen ? 'h-[82vh] min-h-[500px]' : 'h-[75vh] min-h-[540px]'}
        showCurrents={showCurrents}
        showPoints={showPoints}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
      />

      {/* ─── 2. CLEAN CONTROL BAR ─── */}
      <GlobePlayerControlBar
        showCurrents={showCurrents}
        setShowCurrents={setShowCurrents}
        showPoints={showPoints}
        setShowPoints={setShowPoints}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
      />

      {/* ─── 3. SELECTED LOCATION (Only when something is selected) ─── */}
      {hasSelection && (
        <div className="bg-[#0b101d] border border-slate-800/60 rounded-lg px-4 py-3 text-sm text-slate-300 font-sans">
          <div className="text-[11px] text-slate-400 mb-1.5">
            {selectedFloat ? `Argo Float #${selectedFloat.platform_number}` : 'Selected Location'}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            {/* Coordinates */}
            <span className="text-slate-100 font-mono text-xs">
              {selectedFloat
                ? formatCoordinates(selectedFloat.latitude ?? 12.0, selectedFloat.longitude ?? 80.0)
                : state.selectedRiskLocation
                ? formatCoordinates(state.selectedRiskLocation.lat, state.selectedRiskLocation.lon)
                : ''}
            </span>

            {/* Key values */}
            {selectedFloat && selectedFloat.profile && selectedFloat.profile.length > 0 && (
              <>
                <span className="text-slate-200 text-sm font-medium">
                  {selectedFloat.profile[0].temperature != null
                    ? formatValue(selectedFloat.profile[0].temperature, '°C')
                    : '—'}
                </span>
                <span className="text-slate-200 text-sm font-medium">
                  {selectedFloat.profile[0].salinity != null
                    ? formatValue(selectedFloat.profile[0].salinity, 'PSU')
                    : '—'}
                </span>
                <span className="text-slate-400 text-xs">
                  {state.selectedDepth}m depth
                </span>
              </>
            )}

            {/* Risk indicator */}
            {state.locationRisk && (
              <span
                className={`text-xs font-medium ${
                  state.locationRisk.overall_risk === 'HIGH' || state.locationRisk.overall_risk === 'CRITICAL'
                    ? 'text-red-400'
                    : state.locationRisk.overall_risk === 'MODERATE'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                Risk: {state.locationRisk.overall_risk}
              </span>
            )}

            {/* Source */}
            <span className="text-slate-500 text-[11px]">
              {selectedFloat ? 'INCOIS ERDDAP' : 'INCOIS HYCOM'}
            </span>
          </div>
        </div>
      )}

      {/* ─── 4. COLLAPSIBLE ANALYSIS SECTIONS ─── */}
      <div className="space-y-1 pb-4">
        {/* CTD Profiles */}
        <CollapsibleSection
          title="Depth Profiles"
          isOpen={activeSection === 'profiles'}
          onToggle={() => toggleSection('profiles')}
        >
          <DepthProfileChart height={240} />
        </CollapsibleSection>

        {/* Model vs Observation */}
        <CollapsibleSection
          title="Model vs. Observation"
          isOpen={activeSection === 'comparison'}
          onToggle={() => toggleSection('comparison')}
        >
          <ModelComparisonPlaceholder />
        </CollapsibleSection>

        {/* Ocean Risk */}
        <CollapsibleSection
          title="Ocean Risk"
          isOpen={activeSection === 'risk'}
          onToggle={() => toggleSection('risk')}
        >
          <OceanRiskPanel />
        </CollapsibleSection>

        {/* Data Status */}
        <CollapsibleSection
          title="Data Feeds"
          isOpen={activeSection === 'data'}
          onToggle={() => toggleSection('data')}
        >
          <DataStatusCard />
        </CollapsibleSection>
      </div>
    </div>
  );
};

/* ─── Reusable Collapsible Section ─── */
interface CollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  isOpen,
  onToggle,
  children,
}) => (
  <div className="bg-[#0b101d] border border-slate-800/60 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-slate-300 hover:text-white transition-colors"
    >
      <span>{title}</span>
      {isOpen ? (
        <ChevronUp className="w-4 h-4 text-slate-400" />
      ) : (
        <ChevronDown className="w-4 h-4 text-slate-400" />
      )}
    </button>
    {isOpen && (
      <div className="px-4 pb-3 border-t border-slate-800/40">
        {children}
      </div>
    )}
  </div>
);
