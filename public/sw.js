/**
 * Service Worker - Manajemen Kecamatan Gandrungmangu PWA
 * Versi yang dioptimalkan untuk skor PWABuilder & TWA Android.
 */

const CACHE_NAME = 'gandrungmangu-pwa-v3';
const OFFLINE_URL = '/offline.html';
const PRECACHE_ASSETS = [
  '/offline.html',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/favicon.ico',
  '/site.webmanifest',
];

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Cache asset statis satu per satu, abaikan error per-file
      await Promise.allSettled(
        PRECACHE_ASSETS.map((url) => cache.add(url).catch(() => { }))
      );
    })()
  );
  // Aktifkan service worker langsung tanpa menunggu tab lama ditutup
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Hapus cache lama
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      // Ambil alih semua client yang aktif
      await self.clients.claim();
    })()
  );
});

// ─── Fetch Strategy ──────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Abaikan request non-HTTP
  if (!request.url.startsWith('http')) return;

  // Bypass: Localhost development, Firebase, Google API, Apps Script (harus network langsung)
  const bypassHosts = [
    'localhost',
    '127.0.0.1',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'firebase.googleapis.com',
    'firebaseapp.com',
    'script.google.com',
    'googleapis.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];
  if (bypassHosts.some((h) => url.hostname.includes(h))) return;

  // Navigasi halaman: Network First → Cache → Offline Page
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          // Cache response sukses
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          // Offline: coba dari cache, fallback ke offline.html
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          const offlinePage = await caches.match(OFFLINE_URL);
          return offlinePage || new Response('Offline', { status: 503 });
        }
      })()
    );
    return;
  }

  // Asset Next.js statis & gambar: Cache First → Network
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|woff2?|ttf)$/)
  ) {
    event.respondWith(
      (async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;
        try {
          const networkResponse = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
          return networkResponse;
        } catch {
          return new Response('', { status: 503 });
        }
      })()
    );
    return;
  }
});

// ─── Push Notification (siap untuk masa depan) ────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'Gandrungmangu', {
    body: data.body || 'Ada notifikasi baru',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: { url: data.url || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
