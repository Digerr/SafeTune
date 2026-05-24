const CACHE_NAME = 'safetune-v0.5.5-alpha';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Установка: кэшируем только критически важную статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Активация: чистим старье
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Игнорируем внешние запросы (стриминг, API, обложки)
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 2. Нормализуем запрос к index.html, сводя его к корню '/'
  let requestToMatch = event.request;
  if (url.pathname === '/index.html') {
    requestToMatch = new Request('/');
  }

  // 3. Стратегия Cache First с фолбэком
  event.respondWith(
    caches.match(requestToMatch).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // Кэшируем только валидные GET-запросы нашей статики
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          networkResponse.type === 'basic' &&
          event.request.method === 'GET'
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Если сеть легла, а ресурса нет в кэше — отдаем корень (наш интерфейс)
        return caches.match('/');
      });
    })
  );
});
