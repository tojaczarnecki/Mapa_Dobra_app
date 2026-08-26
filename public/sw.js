const STATIC_CACHE_PREFIX = "mapa-dobra-static-";
// A worker is evaluated once per release, so this creates a distinct cache
// without requiring build tooling to inject a value into this static file.
const STATIC_CACHE = `${STATIC_CACHE_PREFIX}${Date.now()}`;
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
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(STATIC_CACHE_PREFIX) && key !== STATIC_CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = typeof payload.title === "string" ? payload.title.slice(0, 120) : "Mapa Dobra";
  const body = typeof payload.body === "string" ? payload.body.slice(0, 300) : "Masz nową informację.";
  const requestedUrl = typeof payload.url === "string" ? payload.url : "/";
  const allowed = requestedUrl.startsWith("/mapa") || requestedUrl.startsWith("/szukaj") || requestedUrl.startsWith("/encyklopedia") || requestedUrl.startsWith("/znajdz-nocleg") || requestedUrl.startsWith("/uruchom-pomoc") || requestedUrl.startsWith("/lodz/") || requestedUrl.startsWith("/admin");
  const url = allowed && !requestedUrl.startsWith("//") ? new URL(requestedUrl, self.location.origin).href : new URL("/", self.location.origin).href;
  event.waitUntil(self.registration.showNotification(title, {
    body,
    data: { url: url.toString(), category: payload.category },
    icon: "/icons/mapa-dobra-192.png",
    badge: "/icons/mapa-dobra-192.png",
    tag: typeof payload.category === "string" ? `mapa-dobra-${payload.category}` : "mapa-dobra",
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || new URL("/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => "focus" in client);
      if (existing) {
        return existing.focus().then(() => existing.navigate(target));
      }
      return self.clients.openWindow(target);
    }),
  );
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
