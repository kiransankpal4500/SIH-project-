import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { APP_CONFIG } from '../../config/appConfig';
import { Info, Code2, Server, Globe, Database, Award } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      {/* Header */}
      <div className="text-center space-y-2 border-b border-ocean-850 pb-4">
        <Badge variant="cyan" size="md">HACKATHON PROJECT</Badge>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">{APP_CONFIG.name}</h1>
        <p className="text-sm font-mono text-ocean-300">"{APP_CONFIG.tagline}"</p>
      </div>

      {/* Problem Statement Card */}
      <Card
        title={
          <div className="flex items-center space-x-2 text-ocean-400">
            <Info className="w-4 h-4" />
            <span className="text-sm font-bold text-white">Problem Statement</span>
          </div>
        }
      >
        <p className="text-sm text-slate-300 leading-relaxed">
          Develop a web-based interactive 3D visualization platform that integrates numerical ocean model outputs and in-situ ocean observations to assist researchers, oceanographers, and disaster management teams in analyzing ocean conditions such as temperature, salinity, currents, chlorophyll, and ocean-risk disaster indicators.
        </p>
      </Card>

      {/* Architecture & Tech Stack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          title={
            <div className="flex items-center space-x-2 text-ocean-400">
              <Code2 className="w-4 h-4" />
              <span className="text-sm font-bold text-white">Frontend Foundation Stack</span>
            </div>
          }
        >
          <ul className="space-y-2 text-xs font-mono text-slate-300">
            <li className="flex items-center justify-between bg-ocean-850 p-2 rounded">
              <span>React 19 + TypeScript</span>
              <Badge variant="emerald">ACTIVE</Badge>
            </li>
            <li className="flex items-center justify-between bg-ocean-850 p-2 rounded">
              <span>Vite Bundler</span>
              <Badge variant="emerald">ACTIVE</Badge>
            </li>
            <li className="flex items-center justify-between bg-ocean-850 p-2 rounded">
              <span>Tailwind CSS</span>
              <Badge variant="emerald">ACTIVE</Badge>
            </li>
            <li className="flex items-center justify-between bg-ocean-850 p-2 rounded">
              <span>Three.js / React Three Fiber</span>
              <Badge variant="cyan" className="font-normal">STEP 2 SHELL</Badge>
            </li>
            <li className="flex items-center justify-between bg-ocean-850 p-2 rounded">
              <span>Recharts Engine</span>
              <Badge variant="cyan">SHELL</Badge>
            </li>
          </ul>
        </Card>

        <Card
          title={
            <div className="flex items-center space-x-2 text-ocean-400">
              <Server className="w-4 h-4" />
              <span className="text-sm font-bold text-white">Future Backend Architecture</span>
            </div>
          }
        >
          <ul className="space-y-2 text-xs font-mono text-slate-300">
            <li className="flex items-center justify-between bg-ocean-850 p-2 rounded">
              <span>Python FastAPI Core</span>
              <Badge variant="amber">STANDBY SHELL</Badge>
            </li>
            <li className="flex items-center justify-between bg-ocean-850 p-2 rounded">
              <span>NetCDF4 & xarray Spatial Engine</span>
              <Badge variant="amber">STANDBY</Badge>
            </li>
            <li className="flex items-center justify-between bg-ocean-850 p-2 rounded">
              <span>INCOIS & Argo Data Connectors</span>
              <Badge variant="amber">STANDBY</Badge>
            </li>
            <li className="flex items-center justify-between bg-ocean-850 p-2 rounded">
              <span>HYCOM & CMEMS Model Pipelines</span>
              <Badge variant="amber">STANDBY</Badge>
            </li>
          </ul>
        </Card>
      </div>

      {/* Dataset Sources */}
      <Card
        title={
          <div className="flex items-center space-x-2 text-ocean-400">
            <Database className="w-4 h-4" />
            <span className="text-sm font-bold text-white">Oceanographic Data Sources</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          {APP_CONFIG.dataSources.map((ds) => (
            <div key={ds.id} className="bg-ocean-850 p-3 rounded border border-ocean-800">
              <span className="font-bold text-ocean-400 block">{ds.id}</span>
              <span className="text-slate-400 text-[11px]">{ds.name}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
