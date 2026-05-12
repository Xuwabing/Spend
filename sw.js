/* Spend - service worker
 * Optional but recommended file. Place this next to index.html when hosting
 * (e.g. yoursite.com/index.html and yoursite.com/sw.js).
 *
 * What it does:
 *  - Caches index.html so the app launches instantly and works offline.
 *  - When you redeploy a new index.html, the next time the user opens the app
 *    online, the SW fetches it in the background. Tapping "Check for Update"
 *    in Settings activates the new version.
 *  - If you ever need to force a clean install, bump CACHE_VERSION below.
 */

const CACHE_VERSION = 'spend-v1';
const CORE_ASSETS = ['./', './index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.addAll(CORE_ASSETS).catch(() => {})
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
        )
      ),
    ])
  );
});

/* Strategy: cache-first for the shell, but always try network in the background
 * so the next launch picks up updates. Cross-origin (e.g. exchangerate APIs)
 * is left to the network. */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((resp) => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => {
      if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: true });
    });
  }
});
