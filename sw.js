const CACHE_NAME = 'focus-checklist-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/themes.css',
    '/css/animations.css',
    '/css/styles.css',
    '/js/app.js',
    '/js/utils.js',
    '/js/storage.js',
    '/js/timer.js',
    '/js/tasks.js',
    '/js/notifications.js',
    '/js/dragdrop.js',
    '/js/stats.js',
    '/js/confetti.js',
    '/js/ui.js',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || fetch(e.request);
        })
    );
});