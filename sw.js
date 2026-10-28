'use strict';

// Keeps the app working offline. Always tries the network first so updates show up straight away.
const CACHE = 'minecraft-build-helper-v1';
const FILES = [
  './', 'index.html', 'styles.css', 'blocks.js', 'tips-data.js', 'images.js', 'tips.js', 'palettes.js',
  'inspiration.js', 'planner.js', 'checklist.js', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(fetch(req)
    .then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(cache => cache.put(req, copy));
      return res;
    })
    .catch(() => caches.match(req, { ignoreSearch: true })));
});
