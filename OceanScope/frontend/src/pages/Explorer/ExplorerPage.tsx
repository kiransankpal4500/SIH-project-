import React from 'react';
import { OceanGlobeContainer } from '../../three/OceanGlobe/OceanGlobeContainer';
import { ObservationPointsLayer } from '../../three/ObservationPoints/ObservationPointsLayer';
import { CurrentsLayer } from '../../three/Currents/CurrentsLayer';
import { DepthLayersManager } from '../../three/DepthLayers/DepthLayersManager';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useOceanContext } from '../../store/OceanContext';
import { APP_CONFIG } from '../../config/appConfig';
import { Globe, Layers, Sliders, Eye } from 'lucide-react';
import { OceanVariable } from '../../types';

export const ExplorerPage: React.FC = () => {
  const { state, setSelectedVariable, setSelectedDepth, setActiveModelId } = useOceanContext();

  return (
    <div className="space-y-4">
      {/* Explorer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ocean-850 pb-3">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Globe className="w-5 h-5 text-ocean-400" />
            3D Ocean Explorer Viewport
          </h1>
          <p className="text-xs font-mono text-slate-400">
            Interactive multi-layer ocean numerical field and spatial point cloud platform
          </p>
        </div>
        <Badge variant="cyan">3D CANVAS STANDBY</Badge>
      </div>

      {/* Main Viewport + Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar: Control Panel */}
        <div className="space-y-4 lg:col-span-1">
          {/* Variable Selection */}
          <Card
            title={
              <div className="flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-ocean-400" />
                <span>Ocean Variable</span>
              </div>
            }
          >
            <div className="space-y-1.5 font-mono text-xs">
              {APP_CONFIG.supportedVariables.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariable(v.id as OceanVariable)}
                  className={`w-full text-left px-3 py-2 rounded flex items-center justify-between transition-all ${
                    state.selectedVariable === v.id
                      ? 'bg-ocean-400 text-ocean-950 font-semibold'
                      : 'bg-ocean-850 text-slate-300 hover:bg-ocean-800'
                  }`}
                >
                  <span>{v.label}</span>
                  <span className="text-[10px] opacity-75">{v.unit}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Depth Slice Selection */}
          <Card
            title={
              <div className="flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-ocean-400" />
                <span>Depth Layer</span>
              </div>
            }
          >
            <div className="space-y-1.5 font-mono text-xs">
              {APP_CONFIG.supportedDepths.map((d) => (
                <button
                  key={d.depth}
                  onClick={() => setSelectedDepth(d.depth)}
                  className={`w-full text-left px-3 py-1.5 rounded transition-all ${
                    state.selectedDepth === d.depth
                      ? 'bg-cyan-500 text-ocean-950 font-bold'
                      : 'bg-ocean-850 text-slate-300 hover:bg-ocean-800'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Center / Right: 3D Globe Canvas Container & Layer Inspector */}
        <div className="lg:col-span-3 space-y-3">
          <OceanGlobeContainer variable={state.selectedVariable} depth={state.selectedDepth} />

          {/* Registered 3D Layer Modules (Standby) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <ObservationPointsLayer visible={true} />
            <CurrentsLayer visible={true} />
            <DepthLayersManager currentDepth={state.selectedDepth} />
          </div>
        </div>
      </div>
    </div>
  );
};
