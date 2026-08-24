const CACHE_NAME = 'focus-checklist-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/goals.html',
    '/reflection.html',
    '/manifest.json',
    '/css/themes.css',
    '/css/animations.css',
    '/css/styles.css',
    '/js/app.js',
    '/js/utils.js',
    '/js/storage.js',
    '/js/timer-hud.js',
    '/js/theme-palette.js',
    '/js/confetti.js',
    '/js/ui.js'
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

// Network-first: always try the network so code fixes reach users on their
// very next load, falling back to the cache only when offline. A pure
// cache-first strategy here previously meant a stale cached bundle could
// keep serving old (buggy) behavior indefinitely, surviving every refresh.
self.addEventListener('fetch', (e) => {
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});
