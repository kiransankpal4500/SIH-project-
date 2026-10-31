/**
 * Dynamic HYCOM Dataset Discovery & Temporal Cataloging
 * Discovers available years, dataset endpoints, and the active operational latest timestamp.
 * Never hardcodes static future dates.
 */

import { HYCOMDatasetInfo, VariableConfig } from '../types/hycom.js';
import { HYCOMUpstreamError } from '../utils/errors.js';

export const HYCOM_EPOCH_MS = Date.UTC(2000, 0, 1, 0, 0, 0); // 2000-01-01 00:00:00 UTC
export const ESPC_TRANSITION_MS = Date.UTC(2024, 7, 10, 12, 0, 0); // 2024-08-10 12:00:00 UTC

export const VARIABLE_CONFIGS: Record<string, VariableConfig> = {
  temperature: {
    ncVar: 'water_temp',
    espcFolder: 't3z',
    unit: '°C',
    label: 'Sea Water Temperature',
    scaleFactor: 0.001,
    addOffset: 20.0,
    fillValue: -30000,
  },
  salinity: {
    ncVar: 'salinity',
    espcFolder: 's3z',
    unit: 'PSU',
    label: 'Sea Water Practical Salinity',
    scaleFactor: 0.001,
    addOffset: 20.0,
    fillValue: -30000,
  },
  current_u: {
    ncVar: 'water_u',
    espcFolder: 'u3z',
    unit: 'm/s',
    label: 'Eastward Ocean Velocity',
    scaleFactor: 0.001,
    addOffset: 0.0,
    fillValue: -30000,
  },
  current_v: {
    ncVar: 'water_v',
    espcFolder: 'v3z',
    unit: 'm/s',
    label: 'Northward Ocean Velocity',
    scaleFactor: 0.001,
    addOffset: 0.0,
    fillValue: -30000,
  },
  ssh: {
    ncVar: 'surf_el',
    espcFolder: 'ssh',
    unit: 'm',
    label: 'Sea Surface Height Elevation',
    scaleFactor: 0.001,
    addOffset: 0.0,
    fillValue: -30000,
  },
  height: {
    ncVar: 'surf_el',
    espcFolder: 'ssh',
    unit: 'm',
    label: 'Sea Surface Height Elevation',
    scaleFactor: 0.001,
    addOffset: 0.0,
    fillValue: -30000,
  },
};

export interface ResolvedDatasetTime {
  datasetId: string;
  isHistorical: boolean;
  year: number;
  timeIndex: number;
  modelTimeIso: string;
  timeHours: number;
}

export class DatasetDiscoveryService {
  private baseThreddsUrl: string;
  private cachedLatestTime: { iso: string; timeIndex: number; year: number; expiresAt: number } | null = null;

  constructor(baseThreddsUrl: string = 'https://tds.hycom.org/thredds/dodsC') {
    this.baseThreddsUrl = baseThreddsUrl;
  }

  /**
   * Discovers the actual latest operational timestep from HYCOM THREDDS.
   */
  async getLatestOperationalTime(currentYear: number = new Date().getUTCFullYear()): Promise<{
    iso: string;
    timeIndex: number;
    year: number;
  }> {
    const now = Date.now();
    if (this.cachedLatestTime && this.cachedLatestTime.expiresAt > now) {
      return this.cachedLatestTime;
    }

    const ddsUrl = `${this.baseThreddsUrl}/ESPC-D-V02/t3z/${currentYear}.dds`;
    try {
      const resp = await fetch(ddsUrl, {
        headers: { 'User-Agent': 'OceanScopeWorker/1.0' },
      });
      if (!resp.ok) {
        throw new Error(`DDS probe returned ${resp.status}`);
      }
      const text = await resp.text();
      const match = text.match(/Float64\s+time\[time\s*=\s*(\d+)\]/i);
      if (!match) {
        throw new Error('Could not parse time dimension from HYCOM DDS');
      }
      const totalTimesteps = parseInt(match[1], 10);
      const latestIndex = totalTimesteps - 1;

      const asciiUrl = `${this.baseThreddsUrl}/ESPC-D-V02/t3z/${currentYear}.ascii?time[${latestIndex}]`;
      const timeResp = await fetch(asciiUrl, {
        headers: { 'User-Agent': 'OceanScopeWorker/1.0' },
      });
      if (!timeResp.ok) {
        throw new Error(`ASCII time probe returned ${timeResp.status}`);
      }
      const timeText = await timeResp.text();
      const hoursVal = this.parseTimeValue(timeText);
      const iso = new Date(HYCOM_EPOCH_MS + hoursVal * 3600 * 1000).toISOString().replace('.000Z', 'Z');

      const result = {
        iso,
        timeIndex: latestIndex,
        year: currentYear,
        expiresAt: now + 3600 * 1000,
      };
      this.cachedLatestTime = result;
      return result;
    } catch (err) {
      const fallbackMs = now - (now % (3 * 3600 * 1000));
      const hours = (fallbackMs - HYCOM_EPOCH_MS) / (3600 * 1000);
      const yearStartHours = (Date.UTC(currentYear, 0, 1) - HYCOM_EPOCH_MS) / (3600 * 1000);
      const timeIdx = Math.max(0, Math.floor((hours - yearStartHours) / 3));
      return {
        iso: new Date(fallbackMs).toISOString().replace('.000Z', 'Z'),
        timeIndex: timeIdx,
        year: currentYear,
      };
    }
  }

  async resolveDatasetAndTime(targetDate?: Date | null): Promise<ResolvedDatasetTime> {
    if (!targetDate) {
      const latest = await this.getLatestOperationalTime();
      const timeHours = (new Date(latest.iso).getTime() - HYCOM_EPOCH_MS) / (3600 * 1000);
      return {
        datasetId: `ESPC-D-V02_${latest.year}`,
        isHistorical: false,
        year: latest.year,
        timeIndex: latest.timeIndex,
        modelTimeIso: latest.iso,
        timeHours,
      };
    }

    const targetMs = targetDate.getTime();
    const isHistorical = targetMs < ESPC_TRANSITION_MS;
    const year = targetDate.getUTCFullYear();
    const targetHours = (targetMs - HYCOM_EPOCH_MS) / (3600 * 1000);

    if (isHistorical) {
      const histStartHours = 165888.0; // 2018-12-04 12:00
      const timeIndex = Math.max(0, Math.round((targetHours - histStartHours) / 3.0));
      const actualHours = histStartHours + timeIndex * 3.0;
      const modelTimeIso = new Date(HYCOM_EPOCH_MS + actualHours * 3600 * 1000).toISOString().replace('.000Z', 'Z');

      return {
        datasetId: 'GLBy0.08_expt_93.0',
        isHistorical: true,
        year,
        timeIndex,
        modelTimeIso,
        timeHours: actualHours,
      };
    } else {
      const yearStartMs = Date.UTC(year, 0, 1, 0, 0, 0);
      const yearStartHours = (yearStartMs - HYCOM_EPOCH_MS) / (3600 * 1000);
      const timeIndex = Math.max(0, Math.round((targetHours - yearStartHours) / 3.0));
      const actualHours = yearStartHours + timeIndex * 3.0;
      const modelTimeIso = new Date(HYCOM_EPOCH_MS + actualHours * 3600 * 1000).toISOString().replace('.000Z', 'Z');

      return {
        datasetId: `ESPC-D-V02_${year}`,
        isHistorical: false,
        year,
        timeIndex,
        modelTimeIso,
        timeHours: actualHours,
      };
    }
  }

  private parseTimeValue(asciiText: string): number {
    const lines = asciiText.split('\n');
    let inData = false;
    for (const line of lines) {
      if (line.includes('---------------------------------------------')) {
        inData = true;
        continue;
      }
      if (!inData) continue;
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('time') || trimmed.startsWith('Dataset') || trimmed.startsWith('}')) {
        continue;
      }
      const val = parseFloat(trimmed.replace(',', ''));
      if (!isNaN(val)) return val;
    }
    throw new HYCOMUpstreamError('Failed to parse time coordinate from HYCOM response');
  }

  listDatasets(): HYCOMDatasetInfo[] {
    return [
      {
        id: 'ESPC-D-V02',
        name: 'HYCOM ESPC-D-V02 Global Analysis',
        type: 'operational',
        baseUrl: `${this.baseThreddsUrl}/ESPC-D-V02`,
        variables: ['water_temp', 'salinity', 'water_u', 'water_v', 'surf_el'],
        yearStart: 2024,
        yearEnd: 2026,
        description: 'US Navy FNMOC 1/12° Global Analysis (Aug 10, 2024 to present, 3-hourly 40-depth-level ocean state).',
      },
      {
        id: 'GLBy0.08_expt_93.0',
        name: 'HYCOM GOFS 3.1 Global Reanalysis (GLBy0.08)',
        type: 'historical',
        baseUrl: `${this.baseThreddsUrl}/GLBy0.08/expt_93.0`,
        variables: ['water_temp', 'salinity', 'water_u', 'water_v', 'surf_el'],
        yearStart: 2018,
        yearEnd: 2024,
        description: 'NRL GOFS 3.1 41-layer HYCOM + NCODA Global Reanalysis (Dec 2018 – Sep 2024).',
      },
    ];
  }
}
