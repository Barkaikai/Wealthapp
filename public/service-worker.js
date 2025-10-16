const CACHE_VERSION = 'v2';
const STATIC_CACHE = `wealth-automation-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `wealth-automation-runtime-${CACHE_VERSION}`;
const API_CACHE = `wealth-automation-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `wealth-automation-images-${CACHE_VERSION}`;

// Assets to precache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Maximum cache sizes
const MAX_RUNTIME_ENTRIES = 100;
const MAX_API_ENTRIES = 50;
const MAX_IMAGE_ENTRIES = 30;

// Cache expiration times (in seconds)
const API_CACHE_DURATION = 1 * 60; // 1 minute (reduced for fresher data)
const IMAGE_CACHE_DURATION = 24 * 60 * 60; // 24 hours

// Install event - precache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('wealth-automation-') && 
                             !name.includes(CACHE_VERSION))
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching
  // Note: The client-side apiRequest function handles offline queuing for mutations
  // Service worker just passes through non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (request.url.startsWith(self.location.origin)) {
    // Same-origin requests
    if (url.pathname.startsWith('/api/')) {
      // API requests: Network first, fall back to cache
      event.respondWith(networkFirstStrategy(request, API_CACHE, API_CACHE_DURATION));
    } else if (isImageRequest(url.pathname)) {
      // Image requests: Cache first, fall back to network
      event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE, IMAGE_CACHE_DURATION));
    } else if (isStaticAsset(url.pathname)) {
      // Static assets: Cache first
      event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    } else {
      // HTML pages: Network first, fall back to cache
      event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
    }
  } else {
    // External requests: Network only (don't cache third-party resources)
    event.respondWith(fetch(request).catch(() => {
      // Return offline response for failed external requests
      return new Response(
        JSON.stringify({ error: 'Offline - external resource unavailable' }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }));
  }
});

// Network-first strategy: Try network, fall back to cache
async function networkFirstStrategy(request, cacheName, maxAge) {
  try {
    const networkResponse = await fetch(request);
    
    // Only cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      
      // Clone the response before caching
      const responseToCache = networkResponse.clone();
      
      // Add timestamp for cache expiration
      const headers = new Headers(responseToCache.headers);
      headers.append('sw-cached-at', Date.now().toString());
      
      const cachedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
      
      // Enforce cache size limits
      trimCache(cacheName, cacheName === API_CACHE ? MAX_API_ENTRIES : MAX_RUNTIME_ENTRIES);
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Check if cache is expired
      if (maxAge) {
        const cachedAt = cachedResponse.headers.get('sw-cached-at');
        if (cachedAt) {
          const age = (Date.now() - parseInt(cachedAt)) / 1000;
          if (age > maxAge) {
            // Cache expired, return offline response
            return offlineResponse(request.url);
          }
        }
      }
      
      // Add header to indicate cached response
      const headers = new Headers(cachedResponse.headers);
      headers.append('X-Cached', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }
    
    // No cache available
    return offlineResponse(request.url);
  }
}

// Cache-first strategy: Try cache, fall back to network
async function cacheFirstStrategy(request, cacheName, maxAge) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Check if cache is expired
    if (maxAge) {
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      if (cachedAt) {
        const age = (Date.now() - parseInt(cachedAt)) / 1000;
        if (age < maxAge) {
          // Cache is fresh, return it
          return cachedResponse;
        }
      }
    } else {
      // No max age, return cached response
      return cachedResponse;
    }
  }
  
  // Not in cache or expired, fetch from network
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      
      // Add timestamp
      const headers = new Headers(networkResponse.headers);
      headers.append('sw-cached-at', Date.now().toString());
      
      const responseToCache = new Response(networkResponse.clone().body, {
        status: networkResponse.status,
        statusText: networkResponse.statusText,
        headers: headers
      });
      
      cache.put(request, responseToCache);
      
      // Enforce cache size limits
      if (cacheName === IMAGE_CACHE) {
        trimCache(cacheName, MAX_IMAGE_ENTRIES);
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed
    if (cachedResponse) {
      // Return expired cache if available
      return cachedResponse;
    }
    return offlineResponse(request.url);
  }
}

// Helper: Check if request is for an image
function isImageRequest(pathname) {
  return /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(pathname);
}

// Helper: Check if request is for a static asset
function isStaticAsset(pathname) {
  return /\.(css|js|woff|woff2|ttf|eot)$/i.test(pathname) || pathname === '/' || pathname === '/index.html';
}

// Helper: Create offline response
function offlineResponse(url) {
  if (url.includes('/api/')) {
    return new Response(
      JSON.stringify({ 
        error: 'Offline',
        message: 'Unable to fetch data while offline. Please check your connection.',
        cached: false
      }),
      { 
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 
          'Content-Type': 'application/json',
          'X-Offline': 'true'
        }
      }
    );
  }
  
  // For HTML pages, return cached homepage as fallback
  return caches.match('/').then(response => {
    return response || new Response('Offline', { 
      status: 503,
      statusText: 'Service Unavailable'
    });
  });
}

// Helper: Trim cache to maximum entries
async function trimCache(cacheName, maxEntries) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    
    if (keys.length > maxEntries) {
      // Remove oldest entries (FIFO)
      const keysToDelete = keys.slice(0, keys.length - maxEntries);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
    }
  } catch (error) {
    console.error('Error trimming cache:', error);
  }
}

// Message event - handle commands from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames
              .filter((name) => name.startsWith('wealth-automation-'))
              .map((name) => caches.delete(name))
          );
        })
        .then(() => {
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        })
    );
  }
});

// Sync event - handle background sync for offline mutations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') {
    event.waitUntil(syncOfflineMutations());
  }
});

// Helper: Sync offline mutations (placeholder for IndexedDB implementation)
async function syncOfflineMutations() {
  // TODO: Implement IndexedDB queue for offline mutations
  // This will be implemented in the next phase
  console.log('[SW] Syncing offline mutations...');
  
  try {
    // Get queued mutations from IndexedDB
    // Replay them to the server
    // Remove successful mutations from queue
    
    // Notify all clients about sync status
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SYNC_COMPLETE',
        success: true 
      });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
    
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ 
        type: 'SYNC_FAILED',
        error: error.message 
      });
    });
  }
}
