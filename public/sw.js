const CACHE_NAME = 'kachuful-v3'

self.addEventListener('install', (event) => {
  // Cache only index.html for SPA offline fallback.
  // JS/CSS assets are content-hashed and handled by Firebase CDN cache — no need to SW-cache them.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add('/index.html'))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only intercept same-origin http/https navigation requests (SPA routing).
  // Let everything else (JS bundles, CSS, API calls) go straight to the network —
  // Firebase Hosting's CDN already handles caching for hashed assets.
  if (
    request.mode === 'navigate' &&
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    url.hostname === self.location.hostname
  ) {
    event.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(request))
    )
  }
})
