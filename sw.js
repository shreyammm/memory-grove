const CACHE = 'memory-grove-shell-v6';
const APP_SHELL = ['./', './index.html', './app.js', './db.js', './model.js', './crypto.js', './art.js', './styles.css', './painting.css', './assets/grove-miniature.svg', './assets/courtyard.webp', './manifest.webmanifest', './privacy.html', './transcriber.js', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-apple.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('memory-grove-shell-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    // Prefer the latest deployed app while online; retain offline support.
    try {
      const response = await fetch(request);
      if (response.ok && response.type !== 'opaque') {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(request, response.clone());
        } catch (_) { /* Cache limits must never block an online response. */ }
      }
      return response;
    } catch (_) {
      const cached = await caches.match(request);
      if (cached) return cached;
      if (request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
