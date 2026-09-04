// Service Worker - 离线缓存核心资源
const CACHE_NAME = 'widget-cache-v1';
const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './api_adapter.js',
  './renderer.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // 网络优先（地图数据需要实时）
  event.respondWith(
    fetch(req)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
