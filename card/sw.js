/* 조기행 디지털 명함 — 오프라인 지원 서비스워커
 *
 * ★ 내용을 수정해서 다시 올릴 때는 아래 VERSION 숫자를 반드시 올리세요.
 *   (v1 → v2 → v3 …) 그래야 폰에 남아 있던 옛 화면이 새 것으로 교체됩니다.
 *   버전을 안 올리면 "고쳤는데 폰에서는 그대로"인 상황이 생깁니다.
 */
const VERSION = 'card-v1';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './apple-touch-icon.png',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png'
];

// 설치: 필요한 파일을 미리 저장해 두고 즉시 대기 상태를 건너뜀
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// 활성화: 예전 버전 캐시를 모두 지우고 바로 제어권을 넘겨받음
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // 화면 자체는 '네트워크 우선' — 온라인이면 항상 최신, 오프라인이면 저장본
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // 아이콘 등 부속 파일은 '저장본 우선' — 빠르고 데이터도 아낌
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(req, copy));
      return res;
    }))
  );
});
