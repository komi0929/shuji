/* ======================================
   薬院習字 — Service Worker
   Offline-first caching
   ====================================== */

const CACHE_NAME = 'yakuin-shuji-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/brushes.js',
  '/app.js',
  '/game.js',
  '/manifest.json',
  '/assets/washi.png',
  '/assets/rakkan.png'
];

// Install — cache all assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — cache-first strategy
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
