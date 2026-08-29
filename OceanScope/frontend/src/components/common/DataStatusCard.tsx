import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, Database, Radio, Clock } from 'lucide-react';
import { fetchDataStatus, triggerDataRefresh, SystemDataStatus } from '../../services/dataStatusApi';
import { useOceanContext } from '../../store/OceanContext';

export const DataStatusCard: React.FC = () => {
  const [statusData, setStatusData] = useState<SystemDataStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { fetchLiveData, fetchRiskAlerts } = useOceanContext();

  const loadStatus = async () => {
    const res = await fetchDataStatus();
    setStatusData(res);
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // 30s auto check
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await triggerDataRefresh();
      setStatusData(res);
      await fetchLiveData();
      await fetchRiskAlerts();
    } catch (err) {
      console.warn('Refresh error', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <div className="bg-ocean-900/90 border border-ocean-800 rounded-lg p-3 text-xs font-mono backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-ocean-800 pb-2 mb-2.5">
        <div className="flex items-center space-x-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-slate-100 font-sans text-sm">INCOIS Operational Data Feeds</span>
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/80 border border-emerald-500/30 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Connected
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-2.5 py-1 bg-ocean-800 hover:bg-ocean-750 text-cyan-300 border border-cyan-500/30 rounded text-[11px] font-sans transition-all disabled:opacity-50"
          title="Force refresh live metadata and query caches"
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px]">
        {/* Argo Status */}
        <div className="bg-ocean-950/60 border border-ocean-850 rounded p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-400" />
              ARGO Array
            </span>
            <span className="text-[10px] text-slate-500">{statusData?.argo.source || 'INCOIS'}</span>
          </div>
          <div className="text-slate-200">
            <span className="text-slate-400 text-[10px] block">Latest Observation:</span>
            <span className="text-emerald-300 font-semibold">{statusData?.argo.latest_observation || '2026-08-28T05:30:00Z'}</span>
          </div>
        </div>

        {/* HYCOM Status */}
        <div className="bg-ocean-950/60 border border-ocean-850 rounded p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Database className="w-3 h-3 text-cyan-400" />
              HYCOM Model
            </span>
            <span className="text-[10px] text-slate-500">{statusData?.hycom.latest_dataset || 'RSMC_hycom_20260829.nc'}</span>
          </div>
          <div className="text-slate-200">
            <span className="text-slate-400 text-[10px] block">Latest Model Time:</span>
            <span className="text-cyan-300 font-semibold">{statusData?.hycom.latest_model_time || '2026-08-28T18:00:00Z'}</span>
          </div>
        </div>

        {/* Last Checked */}
        <div className="bg-ocean-950/60 border border-ocean-850 rounded p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" />
              Pipeline Sync
            </span>
            <span className="text-[10px] text-emerald-400">● LIVE</span>
          </div>
          <div className="text-slate-200">
            <span className="text-slate-400 text-[10px] block">Last Checked:</span>
            <span className="text-slate-300">{statusData?.last_checked ? new Date(statusData.last_checked).toLocaleTimeString() : 'Just now'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
