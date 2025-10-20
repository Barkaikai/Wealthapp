import { useEffect, useState } from 'react';

export function useServiceWorker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Only register service worker in production to avoid conflicts with Vite HMR
    const isProduction = import.meta.env.PROD;
    
    if ('serviceWorker' in navigator && isProduction) {
      // Register service worker only in production
      navigator.serviceWorker
        .register('/service-worker.js', { scope: '/' })
        .then((reg) => {
          console.log('[SW] Service worker registered successfully');
          setRegistration(reg);

          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });

          // Check for updates periodically
          setInterval(() => {
            reg.update();
          }, 60000);
        })
        .catch((error) => {
          console.error('[SW] Service worker registration failed:', error);
        });
    } else if (!isProduction) {
      console.log('[SW] Service worker disabled in development mode');
    } else {
      console.warn('[SW] Service workers not supported in this browser');
    }
  }, []);

  const updateApp = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return { updateAvailable, updateApp };
}
