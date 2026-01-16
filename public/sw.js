const CACHE_NAME = 'mst-gestionale-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // Network first strategy - prova sempre la rete prima
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clona la risposta prima di metterla in cache
                const responseToCache = response.clone();

                // Cacha solo le richieste GET di successo
                if (event.request.method === 'GET' && response.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }

                return response;
            })
            .catch(() => {
                // Se la rete fallisce, prova la cache
                return caches.match(event.request);
            })
    );
});
