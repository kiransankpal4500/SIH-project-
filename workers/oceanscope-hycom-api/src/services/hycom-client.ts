/**
 * Low-level HYCOM OPeNDAP Client
 * Handles targeted subset queries, timeouts, exponential backoff retries, and ASCII stream parsing.
 */

import { HYCOMTimeoutError, HYCOMUpstreamError } from '../utils/errors.js';

export interface SliceRequest {
  datasetUrl: string;
  varName: string;
  timeIdx: number;
  startDepthIdx: number;
  endDepthIdx: number;
  latIdx: number;
  lonIdx: number;
  scaleFactor: number;
  addOffset: number;
  fillValue: number;
}

export class HycomClient {
  private timeoutMs: number;
  private maxRetries: number;

  constructor(timeoutMs: number = 14000, maxRetries: number = 2) {
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
  }

  /**
   * Executes a targeted OPeNDAP ASCII slice fetch with timeout and retries.
   */
  async fetchSlice(req: SliceRequest): Promise<(number | null)[]> {
    const url = `${req.datasetUrl}.ascii?${req.varName}[${req.timeIdx}][${req.startDepthIdx}:1:${req.endDepthIdx}][${req.latIdx}][${req.lonIdx}]`;
    const rawText = await this.fetchWithRetry(url);
    return this.parseAsciiArray(
      rawText,
      req.varName,
      req.scaleFactor,
      req.addOffset,
      req.fillValue
    );
  }

  /**
   * Executes a single point query for (time, depth, lat, lon).
   */
  async fetchPoint(req: {
    datasetUrl: string;
    varName: string;
    timeIdx: number;
    depthIdx: number;
    latIdx: number;
    lonIdx: number;
    scaleFactor: number;
    addOffset: number;
    fillValue: number;
  }): Promise<number | null> {
    const url = `${req.datasetUrl}.ascii?${req.varName}[${req.timeIdx}][${req.depthIdx}][${req.latIdx}][${req.lonIdx}]`;
    const rawText = await this.fetchWithRetry(url);
    const parsed = this.parseAsciiArray(
      rawText,
      req.varName,
      req.scaleFactor,
      req.addOffset,
      req.fillValue
    );
    return parsed.length > 0 ? parsed[0] : null;
  }

  /**
   * Robust fetch wrapper with AbortController timeout and exponential backoff.
   */
  private async fetchWithRetry(url: string): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) {
        // Backoff: 400ms, 800ms...
        await new Promise((resolve) => setTimeout(resolve, attempt * 400));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'OceanScopeCloudflareWorker/1.0 (Oceanographic Intelligence)',
            Accept: 'text/plain',
          },
        });

        clearTimeout(timer);

        if (!resp.ok) {
          if (resp.status >= 500) {
            throw new HYCOMUpstreamError(`Upstream HYCOM THREDDS server error (HTTP ${resp.status})`, resp.status);
          }
          if (resp.status === 404) {
            throw new HYCOMUpstreamError('Requested HYCOM dataset or temporal slice not found on THREDDS server', 404);
          }
          throw new HYCOMUpstreamError(`HYCOM upstream query rejected (HTTP ${resp.status})`, resp.status);
        }

        return await resp.text();
      } catch (err: unknown) {
        clearTimeout(timer);

        if (err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError') {
          lastError = new HYCOMTimeoutError(`Upstream HYCOM server timed out after ${this.timeoutMs}ms.`);
        } else if (err instanceof HYCOMUpstreamError) {
          lastError = err;
          // If 404, don't retry
          if (err.statusCode === 404) break;
        } else {
          lastError = new HYCOMUpstreamError(`Network failure communicating with HYCOM THREDDS: ${String(err)}`);
        }
      }
    }

    throw lastError || new HYCOMUpstreamError('Failed to communicate with HYCOM THREDDS.');
  }

  /**
   * High-performance OPeNDAP ASCII stream parser.
   * Extracts values from the Grid array block and terminates before coordinate maps.
   */
  parseAsciiArray(
    asciiText: string,
    varName: string,
    scaleFactor: number,
    addOffset: number,
    fillValue: number
  ): (number | null)[] {
    const lines = asciiText.split('\n');
    const values: (number | null)[] = [];
    let inData = false;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.includes('---------------------------------------------')) {
        inData = true;
        continue;
      }
      if (!inData) continue;

      // Check if we hit subsequent metadata or maps (e.g., water_temp.time, depth, lat, lon)
      if (
        line.startsWith(`${varName}.time`) ||
        line.startsWith(`${varName}.depth`) ||
        line.startsWith(`${varName}.lat`) ||
        line.startsWith(`${varName}.lon`) ||
        line.startsWith('time[') ||
        line.startsWith('depth[') ||
        line.startsWith('lat[') ||
        line.startsWith('lon[')
      ) {
        break;
      }

      // Skip the array declaration header line (e.g. water_temp.water_temp[1][20][1][1])
      if (line.startsWith(`${varName}.${varName}`) || line.startsWith(`${varName}[`)) {
        continue;
      }

      // Lines contain comma-separated entries, e.g. "[0][0][0], 10476"
      const parts = line.split(',');
      for (const part of parts) {
        const clean = part.trim();
        if (!clean) continue;
        const tokens = clean.split(/\s+/);
        const lastToken = tokens[tokens.length - 1];
        const rawNum = parseFloat(lastToken);

        if (!isNaN(rawNum)) {
          // Fill values or land masks: -30000 or <= -29000 or rawNum === fillValue
          if (rawNum === fillValue || rawNum <= -29000 || rawNum >= 29000) {
            values.push(null);
          } else {
            // Formula: physicalValue = raw * scale_factor + add_offset
            const physicalVal = Math.round((rawNum * scaleFactor + addOffset) * 1000) / 1000;
            values.push(physicalVal);
          }
        }
      }
    }

    return values;
  }
}
