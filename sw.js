const CACHE_NAME = 'ironlog-v6';
const ASSETS = [
    'index.html',
    'styles.css',
    'script.js',
    'icon-512.png',
    'nutrition_bg.png',
    'warmup_bg.png',
    'philosophy_bg.png',
    'supplements_bg.png'
];

// Install: Cache essential assets and skip waiting
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate: Clean old caches and claim clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            caches.keys().then((keys) => {
                return Promise.all(
                    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
                );
            }),
            self.clients.claim()
        ])
    );
});

// Fetch: NETWORK FIRST strategy for critical assets
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
