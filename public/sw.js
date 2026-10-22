/*
 * Service worker MST Gestionale.
 *
 * Regole (evitano la "schermata bianca" dopo un deploy e dati /api obsoleti):
 *  - mette in cache SOLO richieste GET same-origin sotto /assets/ (file con hash,
 *    immutabili) con risposta ok e content-type JS/CSS/font/immagine;
 *  - non mette MAI in cache navigazioni (index.html), /api, sw.js, manifest.json;
 *  - tutto il resto passa direttamente alla rete;
 *  - all'attivazione elimina TUTTE le altre cache (le vecchie contenevano /api).
 */
// il segnaposto nel nome viene sostituito a ogni build (vite.config.ts → swBuildId): nuovo nome = vecchie cache eliminate
const CACHE_NAME = 'mst-gestionale-__BUILD_ID__';

/** Asset tenuti in cache: oltre questo numero si eliminano i più vecchi (ogni deploy aggiunge nuovi file). */
const MAX_ENTRIES = 60;

const trimCache = (cache) =>
  cache.keys().then((keys) =>
    keys.length > MAX_ENTRIES
      ? Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map((key) => cache.delete(key)))
      : undefined
  );

const CACHEABLE_TYPE = /^(application\/javascript|text\/javascript|application\/x-javascript|text\/css|font\/|application\/font|application\/x-font|image\/)/i;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith('/assets/')) return;

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const type = response.headers.get('content-type') || '';
          if (response.ok && response.type === 'basic' && CACHEABLE_TYPE.test(type)) {
            cache
              .put(request, response.clone())
              .then(() => trimCache(cache))
              .catch(() => undefined);
          }
          return response;
        });
      })
    )
  );
});
