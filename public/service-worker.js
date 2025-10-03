const CACHE_NAME = 'wealth-automation-v1';
const urlsToCache = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests - Cache API rejects POST/PUT/DELETE
  if (event.request.method !== 'GET') {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached response if available
        if (response) {
          return response;
        }
        // Fetch from network
        return fetch(event.request).then((response) => {
          // Only cache successful responses for same-origin requests
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Cache static assets only (HTML, CSS, JS, images)
          const url = new URL(event.request.url);
          const shouldCache = url.pathname.match(/\.(html|css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/i) || url.pathname === '/';
          
          if (shouldCache) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        }).catch(() => {
          // Return cached homepage as fallback if offline
          return caches.match('/');
        });
      })
  );
});
