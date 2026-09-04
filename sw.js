const CACHE_NAME = 'hub-v6';
// 只预缓存核心文件（GeoJSON 数据太大，改为按需缓存）
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './regionMap/index.html',
  './regionMap/manifest.json',
  './regionMap/style.css',
  './regionMap/renderer.js',
  './regionMap/sw.js',
  './muyu/index.html',
  './muyu/manifest.json',
  './muyu/style.css',
  './muyu/renderer.js',
  './muyu/api_adapter.js',
  './muyu/sw.js',
  './workCountdown/index.html',
  './workCountdown/manifest.json',
  './workCountdown/style.css',
  './workCountdown/renderer.js',
  './workCountdown/api_adapter.js',
  './workCountdown/sw.js',
  './workCountdown/img/cat.gif',
  './workCountdown/img/dog.gif',
  './workCountdown/img/bear.gif',
  './workCountdown/img/rabbit.gif',
  './tracker/index.html',
  './tracker/manifest.json',
  './tracker/style.css',
  './tracker/renderer.js',
  './tracker/api_adapter.js',
  './tracker/sw.js',
  './tracker/xlsx.full.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS).catch(() => {}))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // 网络优先，成功后写入缓存；离线时回退到缓存
      return fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached || caches.match('./index.html'));
    })
  );
});
