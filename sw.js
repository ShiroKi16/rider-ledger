// 라이더 가계부 서비스 워커
// 인터넷이 되면 항상 최신 화면을 받아오고, 인터넷이 없을 때만 저장해 둔 화면을 씁니다.
// VERSION을 바꾸면 폰에 남아 있는 옛 서비스 워커도 바로 교체돼요.
const VERSION = "2026-09-25.13";
const SHELL = `shell-${VERSION}`;
const FONTS = "fonts";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", e => {
  // 기다리지 않고 바로 새 버전으로 교체 (열려 있던 화면은 자동으로 새로고침됨)
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", e => {
  if (e.data === "skipWaiting") self.skipWaiting();
});

// 인터넷 먼저, 느리거나 끊기면 저장된 것
function networkFirst(req, cacheKey) {
  return caches.open(SHELL).then(async cache => {
    try {
      const res = await Promise.race([
        fetch(req, { cache: "no-cache" }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
      ]);
      if (res && res.ok) cache.put(cacheKey || req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(cacheKey || req, { ignoreSearch: true });
      return hit || cache.match("./index.html");
    }
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 구글 폰트: 한 번 받으면 저장해 두고 오프라인에서도 사용
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTS).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === "opaque") c.put(req, res.clone());
          return res;
        } catch (err) {
          return new Response("", { status: 504 });
        }
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  // 앱 화면(HTML)과 설정 파일은 항상 최신으로
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html")) {
    e.respondWith(networkFirst(req, "./index.html"));
    return;
  }
  if (url.pathname.endsWith(".webmanifest")) {
    e.respondWith(networkFirst(req));
    return;
  }

  // 아이콘 등: 저장된 것 먼저
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});
