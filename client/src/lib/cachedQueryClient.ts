/**
 * Enhanced Query Client with Device Storage Caching
 * Implements true stale-while-revalidate pattern for optimal UX
 */

import { deviceStorage, cacheHelpers } from './deviceStorage';

// Routes that should be cached with device storage
const CACHEABLE_ROUTES = {
  '/api/briefings/daily': { ttl: 60, type: 'briefing' as const },
  '/api/portfolio-reports': { ttl: 30, type: 'ai-insight' as const },
  '/api/assets': { ttl: 15, type: 'portfolio' as const },
  '/api/wallet-balances': { ttl: 15, type: 'portfolio' as const },
  '/api/notes': { ttl: 30, type: 'user-data' as const },
  '/api/health/ai-sync': { ttl: 60, type: 'ai-insight' as const },
  '/api/routine-reports/latest': { ttl: 60, type: 'ai-insight' as const },
} as const;

// Background revalidation tracker
const revalidating = new Set<string>();

/**
 * Enhanced fetch wrapper with true stale-while-revalidate caching
 */
export async function cachedFetch(url: string, options?: RequestInit): Promise<Response> {
  // Only cache GET requests
  if (options?.method && options.method !== 'GET') {
    return fetch(url, options);
  }

  // Check if this route should be cached
  const cacheConfig = Object.entries(CACHEABLE_ROUTES).find(([route]) => 
    url.includes(route)
  )?.[1];

  if (!cacheConfig) {
    // Not a cacheable route, use normal fetch
    return fetch(url, options);
  }

  const cacheKey = `api:${url}`;
  const persistentKey = `persistent:${cacheKey}`;

  try {
    // Try to get from device storage first
    const cached = await deviceStorage.getCache(cacheKey);
    
    if (cached) {
      console.log(`[CachedFetch] Cache hit for ${url}, returning cached data and revalidating in background`);
      
      // Return cached data immediately
      const cachedResponse = new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });

      // Trigger background revalidation (SWR pattern)
      if (!revalidating.has(cacheKey)) {
        revalidateInBackground(url, cacheKey, cacheConfig, options);
      }

      return cachedResponse;
    }

    // Not in cache, fetch from network
    console.log(`[CachedFetch] Cache miss for ${url}, fetching from network`);
    return await fetchAndCache(url, cacheKey, persistentKey, cacheConfig, options);

  } catch (error) {
    console.error(`[CachedFetch] Error for ${url}:`, error);
    
    // On error, try to return stale persistent cache if available
    const staleCache = await deviceStorage.getPersistent(cacheKey);
    
    if (staleCache) {
      console.log(`[CachedFetch] Using stale persistent cache for ${url}`);
      return new Response(JSON.stringify(staleCache), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'STALE',
        },
      });
    }

    // No cache available, re-throw error
    throw error;
  }
}

/**
 * Fetch from network and update cache
 */
async function fetchAndCache(
  url: string,
  cacheKey: string,
  persistentKey: string,
  cacheConfig: { ttl: number; type: 'briefing' | 'ai-insight' | 'portfolio' | 'user-data' },
  options?: RequestInit
): Promise<Response> {
  // Check quota before fetching
  await checkAndEvictIfNeeded();

  const response = await fetch(url, options);

  // Only cache successful responses
  if (response.ok) {
    const data = await response.clone().json();
    
    // Store in device storage with TTL
    await deviceStorage.setCache(
      cacheKey,
      data,
      cacheConfig.ttl,
      cacheConfig.type
    );

    // Also store in persistent storage (no expiration, for fallback)
    await deviceStorage.setPersistent(
      cacheKey,
      data,
      cacheConfig.type
    );

    // Add cache header
    const headers = new Headers(response.headers);
    headers.set('X-Cache', 'MISS');

    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}

/**
 * Revalidate cache in background (SWR pattern)
 */
async function revalidateInBackground(
  url: string,
  cacheKey: string,
  cacheConfig: { ttl: number; type: 'briefing' | 'ai-insight' | 'portfolio' | 'user-data' },
  options?: RequestInit
): Promise<void> {
  // Mark as revalidating to prevent duplicate requests
  revalidating.add(cacheKey);

  try {
    console.log(`[CachedFetch] Revalidating ${url} in background`);
    
    const response = await fetch(url, options);

    if (response.ok) {
      const data = await response.json();
      
      // Update cache with fresh data
      await deviceStorage.setCache(
        cacheKey,
        data,
        cacheConfig.ttl,
        cacheConfig.type
      );

      // Update persistent storage
      await deviceStorage.setPersistent(
        cacheKey,
        data,
        cacheConfig.type
      );

      console.log(`[CachedFetch] Revalidation complete for ${url}`);
    }
  } catch (error) {
    console.error(`[CachedFetch] Revalidation failed for ${url}:`, error);
  } finally {
    // Remove from revalidating set
    revalidating.delete(cacheKey);
  }
}

/**
 * Check quota and evict old entries if needed
 */
async function checkAndEvictIfNeeded(): Promise<void> {
  const quota = await deviceStorage.getStorageQuota();
  const usagePercent = quota.total > 0 ? quota.used / quota.total : 0;

  // If over 90% capacity, start evicting old entries
  if (usagePercent > 0.9) {
    console.log(`[CachedFetch] Storage at ${(usagePercent * 100).toFixed(1)}%, evicting old entries`);
    
    // First, clear expired cache
    const expiredCount = await deviceStorage.clearExpiredCache();
    console.log(`[CachedFetch] Evicted ${expiredCount} expired entries`);

    // If still over 80%, clear oldest briefings (they regenerate daily)
    const newQuota = await deviceStorage.getStorageQuota();
    const newUsagePercent = newQuota.total > 0 ? newQuota.used / newQuota.total : 0;
    
    if (newUsagePercent > 0.8) {
      const briefingCount = await deviceStorage.clearCacheByType('briefing');
      console.log(`[CachedFetch] Evicted ${briefingCount} briefing entries to free space`);
    }
  }
}

/**
 * Invalidate cache for a specific URL or pattern
 */
export async function invalidateCache(urlPattern: string): Promise<void> {
  const cacheKey = `api:${urlPattern}`;
  await deviceStorage.deleteCache(cacheKey);
}

/**
 * Preload and cache important data
 */
export async function preloadCache(userId: string): Promise<void> {
  console.log('[CachedFetch] Preloading critical data...');

  const preloadUrls = [
    '/api/briefings/daily',
    '/api/assets',
    '/api/wallet-balances',
  ];

  // Fetch all in parallel
  await Promise.allSettled(
    preloadUrls.map(url => cachedFetch(url, { credentials: 'include' }))
  );

  console.log('[CachedFetch] Preload complete');
}
