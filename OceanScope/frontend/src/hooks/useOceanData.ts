import { useState, useEffect } from 'react';
import { Observation, DisasterIndicator, OceanSystemStats } from '../types';
import { oceanDataService } from '../services/oceanDataService';

export function useOceanData() {
  const [stats, setStats] = useState<OceanSystemStats | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [alerts, setAlerts] = useState<DisasterIndicator[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sysStats, obsData, alertData] = await Promise.all([
          oceanDataService.getSystemStats(),
          oceanDataService.getObservations(),
          oceanDataService.getDisasterAlerts(),
        ]);
        setStats(sysStats);
        setObservations(obsData);
        setAlerts(alertData);
      } catch (err) {
        console.error('Failed to load ocean data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return { stats, observations, alerts, loading };
}
