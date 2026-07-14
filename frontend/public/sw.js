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

// Driver job dispatch notifications (Web Push). Payload is JSON: { title, body, url, tag }.
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    event.waitUntil(
        self.registration.showNotification(data.title || 'A3TAXI', {
            body: data.body || '',
            icon: '/icon.svg',
            badge: '/icon.svg',
            tag: data.tag,
            requireInteraction: true,
            data: { url: data.url || '/' },
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.postMessage({ type: 'notification-click', url });
                    return client.focus();
                }
            }
            if (self.clients.openWindow) return self.clients.openWindow(url);
        })
    );
});
