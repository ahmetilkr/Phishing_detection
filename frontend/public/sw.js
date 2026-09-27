/* ============================================================
   Service Worker — staj-logo-scan-v1
   Strateji:
     • API istekleri (localhost:8000 veya /api/) → her zaman ağdan
     • Statik assetler → önce cache, yoksa ağdan çek + cache'e yaz
   ============================================================ */

const CACHE_NAME = 'staj-logo-scan-v1'

/** İlk kurulumda ön-belleğe alınacak temel statik dosyalar */
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/favicon.svg',
    '/icons.svg',
]

/* ----------------------------------------------------------
   INSTALL — ön-belleği aç ve statik varlıkları kaydet
   ---------------------------------------------------------- */
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting()) // yeni SW hemen devralır
    )
})

/* ----------------------------------------------------------
   ACTIVATE — eski cache sürümlerini temizle ve istemcileri devral
   ---------------------------------------------------------- */
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key !== CACHE_NAME)
                        .map((key) => caches.delete(key))
                )
            )
            .then(() => self.clients.claim()) // açık sekmeleri hemen kontrol altına al
    )
})

/* ----------------------------------------------------------
   FETCH — istek yönlendirme mantığı
   ---------------------------------------------------------- */
self.addEventListener('fetch', (event) => {
    const { request } = event
    const url = new URL(request.url)

    // ── 1) API isteklerini asla cache'leme, doğrudan ağa pas ──
    const isApiRequest =
        (url.hostname === 'localhost' && url.port === '8000') ||
        url.pathname.startsWith('/api/')

    if (isApiRequest) {
        // Network-only: SW araya girmeden tarayıcının normal fetch'i çalışır
        return
    }

    // ── 2) Yalnızca GET isteklerini cache stratejisine sok ──
    if (request.method !== 'GET') return

    // ── 3) Statik assetler: Cache-first, fallback ağ ──
    event.respondWith(
        caches.match(request).then((cached) => {
            // Eğer dosya Cache'te varsa doğrudan diskten ver
            if (cached) return cached

            // Cache'te yoksa ağdan çek, ardından Cache'e yaz
            return fetch(request)
                .then((networkResponse) => {
                    // Yalnızca başarılı yanıtları depola
                    if (
                        networkResponse &&
                        networkResponse.status === 200 &&
                        networkResponse.type === 'basic'
                    ) {
                        const responseToCache = networkResponse.clone()
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseToCache)
                        })
                    }
                    return networkResponse
                })
                .catch(() => {
                    // Ağ koptuğunda ve kullanıcı bir sayfaya (document) gitmeye çalıştığında
                    // çevrimdışı SPA desteği için index.html döndür
                    if (request.destination === 'document' || request.mode === 'navigate') {
                        return caches.match('/index.html')
                    }
                })
        })
    )
})