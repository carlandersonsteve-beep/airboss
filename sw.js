const CACHE_NAME = 'airboss-shell-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/kiosk.html',
  '/manifest.webmanifest',
  '/assets/icon-192.svg',
  '/assets/icon-512.svg',
  '/src/app/browserRuntime.js',
  '/src/ui/ops/components/componentBridge.js',
  '/src/ui/ops/components/OrderMessageThread.js',
  '/src/ui/ops/components/CompletionModal.js',
  '/src/ui/ops/components/OrderCard.js',
  '/src/ui/ops/components/RampView.js',
  '/src/ui/ops/components/OfficeView.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/bootstrap') || event.request.url.includes('/orders') || event.request.url.includes('/alerts')) {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
      return response;
    }).catch(() => caches.match('/index.html')))
  );
});
