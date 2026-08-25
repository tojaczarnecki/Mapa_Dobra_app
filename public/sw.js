const STATIC_CACHE = "mapa-dobra-static-v3";
const PRECACHE = [
  "/",
  "/offline",
  "/zapisane",
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
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Private and write-oriented routes are network-only. Never store their
  // responses, which could contain sessions, operator data or private fields.
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api")) {
    if (request.mode === "navigate") {
      event.respondWith(fetch(request));
    }
    return;
  }

  // Public pages use network-first with an exact-page cache fallback. This
  // supports previously visited place/search views without caching APIs.
  if (
    url.pathname.startsWith("/szukaj") ||
    url.pathname.startsWith("/mapa") ||
    url.pathname.startsWith("/znajdz-nocleg") ||
    url.pathname.startsWith("/lodz/")
  ) {
    if (request.mode === "navigate") {
      event.respondWith(
        fetch(request)
          .then((response) => {
            if (response.ok) caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
            return response;
          })
          .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline"))),
      );
    }
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(STATIC_CACHE).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline"))),
    );
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
