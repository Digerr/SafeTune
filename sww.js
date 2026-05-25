const CACHE_NAME = 'safetune-v0.9.0';
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Установка сервис-воркера и кэширование локальной статики
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Активация воркера и автоматическая чистка старого кэша
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => 
            Promise.all(
                keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Умный перехват запросов (Cache First с фолбэком на сеть)
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Игнорируем внешние запросы (API Jamendo, обложки треков) — пускаем их в сеть напрямую
    if (url.origin !== location.origin) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Нормализуем /index.html → / для точного совпадения с кэшем
    let requestToMatch = event.request;
    if (url.pathname === '/index.html') {
        requestToMatch = new Request('/');
    }

    // Поиск в кэше, а если файла там нет — берем его из сети
    event.respondWith(
        caches.match(requestToMatch).then((cached) => {
            if (cached) return cached;
            return fetch(requestToMatch);
        })
    );
});