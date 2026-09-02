import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { APP_CONFIG } from '../../config/appConfig';
import { Info, Code2, Server, Globe, Database, Award, CheckCircle2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-4">
      {/* Header */}
      <div className="text-center space-y-3 border-b border-[#E2E8F0] pb-6">
        <Badge variant="blue" size="md">OPERATIONAL RESEARCH PLATFORM</Badge>
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#172033] tracking-tight">{APP_CONFIG.name}</h1>
        <p className="text-base text-[#64748B] max-w-2xl mx-auto font-normal">
          {APP_CONFIG.tagline}
        </p>
      </div>

      {/* Problem Statement Card */}
      <Card
        title={
          <div className="flex items-center space-x-2.5 text-[#0B84C6]">
            <Info className="w-5 h-5" />
            <span className="text-base font-bold text-[#172033]">Scientific Problem Statement</span>
          </div>
        }
      >
        <p className="text-sm text-[#334155] leading-relaxed">
          OceanScope is an interactive scientific 3D visualization and decision-support platform that integrates numerical ocean model outputs (INCOIS RSMC HYCOM) and in-situ ocean observations (Argo floats and moored buoy arrays). It enables researchers, oceanographers, and disaster management teams to evaluate ocean conditions—including temperature, salinity, currents, chlorophyll, and ocean-risk indicators—with rigorous co-location and error analysis.
        </p>
      </Card>

      {/* Architecture & Tech Stack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Card
          title={
            <div className="flex items-center space-x-2.5 text-[#0B84C6]">
              <Code2 className="w-5 h-5" />
              <span className="text-base font-bold text-[#172033]">Frontend Visualization Architecture</span>
            </div>
          }
        >
          <ul className="space-y-2.5 text-xs text-[#334155]">
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">React 19 + TypeScript</span>
              <Badge variant="emerald">OPERATIONAL</Badge>
            </li>
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">Vite Fast Bundler</span>
              <Badge variant="emerald">OPERATIONAL</Badge>
            </li>
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">Tailwind CSS Design System</span>
              <Badge variant="emerald">OPERATIONAL</Badge>
            </li>
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">Three.js / React Three Fiber</span>
              <Badge variant="blue">3D GIS ENGINE</Badge>
            </li>
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">Recharts Analytics Engine</span>
              <Badge variant="blue">DATA VIZ</Badge>
            </li>
          </ul>
        </Card>

        <Card
          title={
            <div className="flex items-center space-x-2.5 text-[#0B84C6]">
              <Server className="w-5 h-5" />
              <span className="text-base font-bold text-[#172033]">Backend Computational Engine</span>
            </div>
          }
        >
          <ul className="space-y-2.5 text-xs text-[#334155]">
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">Python FastAPI Core</span>
              <Badge variant="emerald">ACTIVE</Badge>
            </li>
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">NetCDF4 & xarray Spatial Engine</span>
              <Badge variant="emerald">ACTIVE</Badge>
            </li>
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">INCOIS & Argo Data Connectors</span>
              <Badge variant="emerald">ACTIVE</Badge>
            </li>
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">HYCOM & CMEMS Pipelines</span>
              <Badge variant="emerald">ACTIVE</Badge>
            </li>
            <li className="flex items-center justify-between bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-lg">
              <span className="font-semibold text-[#172033]">Physical Hazard Scoring Rules</span>
              <Badge variant="amber">RULE ENGINE</Badge>
            </li>
          </ul>
        </Card>
      </div>

      {/* Dataset Sources */}
      <Card
        title={
          <div className="flex items-center space-x-2.5 text-[#0B84C6]">
            <Database className="w-5 h-5" />
            <span className="text-base font-bold text-[#172033]">Operational Oceanographic Data Sources</span>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          {APP_CONFIG.dataSources.map((ds) => (
            <div key={ds.id} className="bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
              <span className="font-bold text-[#0B84C6] block text-sm">{ds.id}</span>
              <span className="text-[#64748B] text-xs mt-0.5 block">{ds.name}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
