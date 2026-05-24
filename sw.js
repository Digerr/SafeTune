const CACHE_NAME = 'safetune-v0.5.5-alpha';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Добавь сюда пути к своим иконкам, шрифтам или локальным CSS/JS если они вынесены
  '/icon-192.png',
  '/icon-512.png'
];

// 🔹 Установка: кэшируем статику
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// 🔹 Активация: удаляем старые кэши
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// 🔹 Запросы: статика из кэша, внешнее (музыка/API) — всегда из сети
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  //  Не кэшируем внешние домены (Jamendo, Openverse, аудио-потоки)
  if (url.origin !== location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // ✅ Статика: Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Кэшируем только успешные GET-запросы
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => caches.match('/index.html')); // Фолбэк на главную при офлайне
    })
  );
});
