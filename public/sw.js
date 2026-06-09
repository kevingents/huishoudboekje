/* Eenvoudige service worker: network-first met cache-fallback voor statische
   bestanden en navigaties. API-verzoeken gaan altijd naar het netwerk. */
const CACHE = 'hhb-v1'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
    ]),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  // Alleen GET en niet de API cachen (geen gevoelige/stale data offline serveren).
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {})
        return response
      })
      .catch(() => caches.match(request)),
  )
})
