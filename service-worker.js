// ── Award Compass Service Worker ──
const CACHE_NAME = 'award-compass-v1';
const URLS = [
    '/award-tracker/',
    '/award-tracker/index.html',
    '/award-tracker/app.js',
    '/award-tracker/style.css',
    '/award-tracker/icons/icon-192.png',
    '/award-tracker/icons/icon-512.png'
];

// 설치: 핵심 파일 캐시
self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(URLS);
        })
    );
    self.skipWaiting();
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(k) { return k !== CACHE_NAME; })
                    .map(function(k) { return caches.delete(k); })
            );
        })
    );
    self.clients.claim();
});

// 요청: 캐시 우선, 없으면 네트워크
self.addEventListener('fetch', function(e) {
    // Firebase/Firestore 요청은 캐시 안 함
    if (e.request.url.includes('firestore') ||
        e.request.url.includes('firebase') ||
        e.request.url.includes('googleapis')) {
        return;
    }
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            return cached || fetch(e.request);
        })
    );
});
