// Award Compass Service Worker
const CACHE_NAME = 'award-compass-v2';
const URLS = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
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

// 활성화: 이전 캐시 전부 삭제
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

// 요청: 네트워크 우선, 실패 시에만 캐시 사용
self.addEventListener('fetch', function(e) {
    if (e.request.url.includes('firestore') ||
        e.request.url.includes('firebase') ||
        e.request.url.includes('googleapis')) {
        return;
    }
    e.respondWith(
        fetch(e.request).then(function(response) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
                cache.put(e.request, clone);
            });
            return response;
        }).catch(function() {
            return caches.match(e.request);
        })
    );
});