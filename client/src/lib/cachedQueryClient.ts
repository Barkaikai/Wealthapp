/**
 * Enhanced Query Client with Device Storage Caching
 * Automatically caches expensive API operations to device storage
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

/**
 * Enhanced fetch wrapper with device storage caching
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

  try {
    // Try to get from device storage first
    const cached = await deviceStorage.getCache(cacheKey);
    
    if (cached) {
      console.log(`[CachedFetch] Cache hit for ${url}`);
      
      // Return synthetic response from cache
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT',
        },
      });
    }

    // Not in cache, fetch from network
    console.log(`[CachedFetch] Cache miss for ${url}, fetching from network`);
    const response = await fetch(url, options);

    // Only cache successful responses
    if (response.ok) {
      const data = await response.clone().json();
      
      // Store in device storage
      await deviceStorage.setCache(
        cacheKey,
        data,
        cacheConfig.ttl,
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
  } catch (error) {
    console.error(`[CachedFetch] Error for ${url}:`, error);
    
    // On error, try to return stale cache if available
    const staleCache = await deviceStorage.getPersistent(cacheKey);
    
    if (staleCache) {
      console.log(`[CachedFetch] Using stale cache for ${url}`);
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
