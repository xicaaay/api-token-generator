/*
 * Service worker de Keygen: permite usar la app sin conexión.
 * - Navegación: red primero; si no hay conexión, el index.html guardado.
 * - /assets/ (archivos con hash de Vite) e íconos: caché primero.
 * - Resto: red primero con respaldo en caché.
 * Cambia VERSION para invalidar la caché en un deploy con cambios incompatibles.
 */
const VERSION = 'keygen-v1'
const PRECACHE = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      // allSettled: un recurso que falle no debe impedir instalar el SW.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(VERSION)
  try {
    const response = await fetch(request)
    if (response.ok) cache.put(fallbackUrl ?? request, response.clone())
    return response
  } catch {
    return (await cache.match(fallbackUrl ?? request)) ?? Response.error()
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok) cache.put(request, response.clone())
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // SPA de una sola página: toda navegación se responde con index.html.
    event.respondWith(networkFirst(request, '/'))
  } else if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request))
  } else {
    event.respondWith(networkFirst(request))
  }
})
