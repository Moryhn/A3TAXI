// Installability-only service worker — no caching, so it never risks
// serving stale assets during active development. Its only job is to
// satisfy the "has a fetch handler" requirement so the app can be added
// to the home screen, which gives drivers a standalone-mode launcher and
// (on Android) a bit more background execution allowance for location
// sharing than a plain browser tab gets.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
