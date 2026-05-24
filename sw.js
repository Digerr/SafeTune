const CACHE_NAME = 'safetune-v0.6.0';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Игнорируем внешние запросы (API Jamendo, обложки)
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Нормализуем /index.html → /
  let requestToMatch = event.request;
  if (url.pathname === '/index.html') {
    requestToMatch = new Request('/');
  }

  // Cache First с фолбэком на сеть → корень
  event.respondWith(
    caches.match(requestToMatch).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (
          response &&
          response.status === 200 &&
          response.type === 'basic' &&
          event.request.method === 'GET'
        ) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      }).catch(() => caches.match('/'));
    })
  );
});
