/* ============================================================
   sw.js — Physics Lab Service Worker (v1.0)
   ============================================================
   Strategy:
     Shell (HTML, CSS, JS, icons, manifests) → Cache-First
     Physics engine & experiment sim files  → Network-First
     CDN resources (Chart.js, Google Fonts)  → Stale-While-Revalidate

   NOTE: This is a production-safe stub. Complex caching logic
   (background sync, push notifications) can be added later.

   To update the cache, bump CACHE_NAME to 'physicslab-v2' etc.
   ============================================================

   HOW TO WRAP FOR NATIVE STORES
   ──────────────────────────────
   Option A — PWABuilder (simplest):
     1. Host the site on HTTPS (Netlify/Vercel deploy).
     2. Visit https://www.pwabuilder.com, paste your URL.
     3. PWABuilder validates this sw.js + manifest.json and generates
        signed APK (Android) and MSIX (Windows) packages.
     4. Upload the APK to Google Play Console; MSIX to Microsoft Store.
     5. For iOS App Store, PWABuilder generates a Xcode project —
        open in Xcode, add your Apple Developer Team ID, archive & submit.

   Option B — Capacitor (full native wrapper):
     1. npm install @capacitor/core @capacitor/cli
     2. npx cap init "Physics Lab" "com.physicslab.app" --web-dir "."
     3. npx cap add android   (generates android/ folder)
     4. npx cap add ios       (generates ios/ folder — macOS required)
     5. npx cap open android  → Android Studio → build signed APK/AAB
     6. npx cap open ios      → Xcode → archive & submit to App Store
     7. Replace placeholder hrefs in footer badges with:
          https://apps.apple.com/app/id<YOUR_IOS_APP_ID>
          https://play.google.com/store/apps/details?id=com.physicslab.app
   ============================================================ */

const CACHE_NAME = 'physicslab-v3';

/** App shell resources pre-cached on install */
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/index.css',
    '/js/main.js',
    '/js/theme.js',
    '/js/ui.js',
    '/js/categories.js',
    '/js/category-page.js',
    '/pages/basic.html',
    '/pages/intermediate.html',
    '/pages/advanced.html',
    '/manifest.json',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',
];

/** Physics engine filenames — always fetch fresh */
const PHYSICS_ENGINE_FILES = [
    'engine.js',
    'graph.js',
    'utils.js',
    'vectorRenderer.js',
    'dragHelper.js',
];

// ── Install: pre-cache the app shell ─────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
            .catch(err => console.warn('[SW] Pre-cache failed (some assets may not exist yet):', err))
    );
});

// ── Activate: purge stale caches ─────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// ── Fetch: routing logic ──────────────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and browser-extension requests
    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;

    // CDN resources (Google Fonts, Chart.js via jsDelivr): Stale-While-Revalidate
    if (
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('jsdelivr.net') ||
        url.hostname.includes('cdnjs.cloudflare.com')
    ) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // Physics engine JS files: Network-First (always want latest simulation code)
    if (
        url.pathname.startsWith('/js/') &&
        PHYSICS_ENGINE_FILES.some(f => url.pathname.endsWith(f))
    ) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Individual experiment pages and sim code: Network-First
    if (url.pathname.startsWith('/experiments/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // App shell JS: stale-while-revalidate so new scripts appear quickly
    if (url.pathname.startsWith('/js/')) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // HTML documents: network-first to pick up new page content
    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Everything else (styles, icons, badge images): Cache-First
    event.respondWith(cacheFirst(request));
});

// ── Strategy helpers ──────────────────────────────────────────

async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return new Response('Offline — this resource is not cached.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('Offline — this resource is not available.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const fetchPromise = fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => cached);
    return cached || fetchPromise;
}
