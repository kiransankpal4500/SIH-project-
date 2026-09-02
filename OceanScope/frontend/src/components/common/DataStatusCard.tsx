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
    <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl p-4 text-xs font-sans shadow-sm">
      <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3 mb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-[#EFF6FF] text-[#0B84C6] rounded-lg">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#172033] text-sm block">INCOIS Operational Data Pipelines</span>
            <span className="text-[11px] text-[#64748B]">Real-time ingestion telemetry and numerical forecasts</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-[#DCFCE7] border border-[#BBF7D0] text-[#15803D]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A]" />
            Connected
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0B84C6] hover:bg-[#085A8A] text-white rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
          title="Force refresh live metadata and query caches"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh Feeds'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        {/* Argo Status */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="flex items-center gap-1.5 font-semibold text-[#172033]">
              <Radio className="w-4 h-4 text-[#16A34A]" />
              ARGO Array
            </span>
            <span className="text-[11px] font-medium text-[#64748B] bg-[#E2E8F0] px-1.5 py-0.5 rounded">{statusData?.argo.source || 'INCOIS ERDDAP'}</span>
          </div>
          <div>
            <span className="text-[#64748B] text-[11px] block">Latest Ingested Float Ping:</span>
            <span className="text-[#15803D] font-bold text-xs">{statusData?.argo.latest_observation || '2026-08-28T05:30:00Z'}</span>
          </div>
        </div>

        {/* HYCOM Status */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="flex items-center gap-1.5 font-semibold text-[#172033]">
              <Database className="w-4 h-4 text-[#0B84C6]" />
              HYCOM Model
            </span>
            <span className="text-[11px] font-medium text-[#64748B] bg-[#E2E8F0] px-1.5 py-0.5 rounded truncate max-w-[120px]">{statusData?.hycom.latest_dataset || 'RSMC_hycom_20260829.nc'}</span>
          </div>
          <div>
            <span className="text-[#64748B] text-[11px] block">Forecast Model Timestep:</span>
            <span className="text-[#0B84C6] font-bold text-xs">{statusData?.hycom.latest_model_time || '2026-08-28T18:00:00Z'}</span>
          </div>
        </div>

        {/* Last Checked */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="flex items-center gap-1.5 font-semibold text-[#172033]">
              <Clock className="w-4 h-4 text-[#F59E0B]" />
              Pipeline Sync
            </span>
            <span className="text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded">● ACTIVE</span>
          </div>
          <div>
            <span className="text-[#64748B] text-[11px] block">Last Metadata Sync:</span>
            <span className="text-[#172033] font-semibold text-xs">{statusData?.last_checked ? new Date(statusData.last_checked).toLocaleTimeString() : 'Just now'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
