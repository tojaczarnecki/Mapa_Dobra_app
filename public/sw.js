const STATIC_CACHE_PREFIX = "mapa-dobra-static-";
const STATIC_CACHE = `${STATIC_CACHE_PREFIX}v2`;
const PRECACHE = [
  "/offline",
  "/brand/mapa-dobra-logo.svg",
  "/icons/mapa-dobra-192.png",
  "/icons/mapa-dobra-512.png",
  "/icons/mapa-dobra-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith(STATIC_CACHE_PREFIX) && key !== STATIC_CACHE)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Administrative and live public data always use the network. They must never
  // be replayed from a stale cache as current information.
  if (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/szukaj") ||
    url.pathname.startsWith("/mapa") ||
    url.pathname.startsWith("/znajdz-nocleg") ||
    url.pathname.startsWith("/lodz/")
  ) {
    if (request.mode === "navigate") {
      event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    }
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/brand/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
        return response;
      })),
    );
  }
});
