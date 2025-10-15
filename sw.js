const CACHE_NAME = 'smart-movie-creator-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/index.tsx',
    '/vite.svg',
    '/manifest.json',
    'https://cdn.tailwindcss.com'
];

// Install event: cache the app shell
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                // Use addAll for atomic operation, but catch errors
                return cache.addAll(urlsToCache).catch(err => {
                    console.error('Failed to cache app shell assets:', err);
                });
            })
    );
});

// Fetch event: serve from cache first, then network fallback
self.addEventListener('fetch', event => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache, fetch from network
                return fetch(event.request);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
