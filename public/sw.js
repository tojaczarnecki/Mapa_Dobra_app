const STATIC_CACHE_PREFIX = "mapa-dobra-static-";
const STATIC_CACHE = `${STATIC_CACHE_PREFIX}v3`;
const PRECACHE = [
  "/offline",
  "/brand/mapa-dobra-wordmark.svg",
  "/brand/mapa-dobra-logo-header-new.svg",
  "/brand/mapa-dobra-logo-footer.svg",
  "/icons/mapa-dobra-favicon.png",
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

function notificationUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/admin";
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/admin";
  } catch {
    return "/admin";
  }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const title = typeof payload.title === "string" && payload.title.trim() ? payload.title.slice(0, 120) : "Dobra Mapa";
  const body = typeof payload.body === "string" ? payload.body.slice(0, 500) : "Masz nowe powiadomienie.";
  const options = { body, data: { url: notificationUrl(payload.url) }, tag: typeof payload.tag === "string" ? payload.tag.slice(0, 80) : "dobra-mapa-admin" };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = notificationUrl(event.notification.data && event.notification.data.url);
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    if (existing) return existing.focus().then(() => existing.navigate(target));
    return self.clients.openWindow(target);
  }));
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
