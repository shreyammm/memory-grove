const CACHE = 'memory-grove-shell-v3';
const APP_SHELL = ['./', './index.html', './app.js', './db.js', './model.js', './crypto.js', './art.js', './styles.css', './painting.css', './assets/grove-miniature.svg', './manifest.webmanifest', './privacy.html', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/icon-apple.png'];
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
    const cached = await caches.match(request);
    if (cached) return cached;
    try { return await fetch(request); }
    catch { if (request.mode === 'navigate') return (await caches.match('./index.html')) || Response.error(); return Response.error(); }
  })());
});
