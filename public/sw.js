const CACHE_NAME = 'kachuful-v4'

self.addEventListener('install', () => {
  // Don't pre-cache index.html — we always fetch it fresh from network.
  // Caching it here is what caused the stale-HTML → MIME-type blank-screen loop.
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Wipe every cache from every prior version so stale HTML can't persist.
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Network-first for same-origin navigation:
  // 1. Always try the network → Firebase always returns the latest index.html.
  // 2. On success, update the cache so offline fallback stays current.
  // 3. Only fall back to cache when the network is genuinely unreachable.
  //
  // Cache-first (the old strategy) caused the loop: stale cached index.html
  // referenced a JS bundle hash that no longer exists on Firebase after each
  // deploy, so Firebase's catch-all rewrite returned index.html instead of
  // the JS file, and the browser got text/html where it expected a module.
  if (
    request.mode === 'navigate' &&
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.hostname === self.location.hostname
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone))
          }
          return response
        })
        .catch(() => caches.match('/index.html'))
    )
  }
})
