const CACHE_NAME = "mungchi-mlz9512e";

// Install: 새 SW 설치 대기 (skipWaiting 안함 — 사용자 제어)
self.addEventListener("install", () => {
  // skipWaiting()을 호출하지 않음 — 사용자가 업데이트 버튼을 눌러야 활성화
});

// Activate: 즉시 제어
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first, 실패 시 캐시 폴백
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // navigation 및 same-origin 정적 자원만 캐시
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // 성공 시 캐시에 저장
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시 폴백
        return caches.match(request);
      })
  );
});

// Message: SKIP_WAITING 수신 시 활성화
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
