/**
 * Hybrid Caching Service:
 * Uses Cloudflare Cache API (caches.default) in Cloudflare Worker runtime
 * and falls back to an in-memory LRU Map cache for local Node.js / test environments.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly maxEntries: number = 200;

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds: number): void {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const memoryCache = new MemoryCache();

export async function getCachedResponse(
  cacheKey: string,
  request?: Request
): Promise<Response | null> {
  // Try Cloudflare Edge Cache if available
  const cfCaches = (typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }) : null);
  if (cfCaches && cfCaches.default && request) {
    try {
      const match = await cfCaches.default.match(request);
      if (match) {
        // Clone and add header indicating edge cache hit
        const res = new Response(match.body, match);
        res.headers.set('X-OceanScope-Cache', 'HIT-EDGE');
        return res;
      }
    } catch {
      // Fall through to memory cache
    }
  }

  // Memory fallback
  const memData = memoryCache.get<unknown>(cacheKey);
  if (memData) {
    return new Response(JSON.stringify(memData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-OceanScope-Cache': 'HIT-MEMORY',
      },
    });
  }

  return null;
}

export async function setCachedResponse<T>(
  cacheKey: string,
  data: T,
  ttlSeconds: number,
  request?: Request
): Promise<void> {
  // Store in memory cache
  memoryCache.set(cacheKey, data, ttlSeconds);

  // Store in Cloudflare Edge Cache if available
  const cfCaches = (typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }) : null);
  if (cfCaches && cfCaches.default && request) {
    try {
      const resp = new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': `public, max-age=${ttlSeconds}`,
          'X-OceanScope-Cache': 'HIT-EDGE',
        },
      });
      await cfCaches.default.put(request, resp);
    } catch {
      // Ignore cache put errors
    }
  }
}
