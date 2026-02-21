const CACHE_NAME = "mungchi-v1";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/js/lib/api.js",
  "/js/lib/state.js",
  "/js/components/ProgressRing.js",
  "/js/components/TaskItem.js",
  "/js/components/BottomNav.js",
  "/js/components/Toast.js",
  "/js/pages/Home.js",
  "/js/pages/Dashboard.js",
  "/js/pages/Badges.js",
  "/js/pages/Map.js",
  "/vendor/preact.mjs",
  "/vendor/preact-hooks.mjs",
  "/vendor/htm-preact.mjs",
  "/vendor/htm.mjs",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // API 요청은 네트워크 우선
  if (url.pathname.startsWith("/api")) {
    e.respondWith(
      fetch(e.request).catch(() => new Response('{"error":"offline"}', {
        headers: { "Content-Type": "application/json" },
      }))
    );
    return;
  }

  // 정적 파일은 캐시 우선
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
