// sw.js - Service Worker for TOLD Viewer
const CACHE_NAME = "toldviewer-v2"; // bump with ./update.sh
const ASSETS = [
  "./",
  "./index.html"
];

// Install and cache files
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // activate new worker immediately
});

// Activate: clear old caches
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        if (k !== CACHE_NAME) {
          console.log("🧹 Deleting old cache:", k);
          return caches.delete(k);
        }
      }))
    )
  );
  self.clients.claim(); // control clients immediately
});

// Fetch: network-first for index.html, cache-first for everything else
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // Always try network first for index.html
  if (url.pathname.endsWith("index.html") || url.pathname === "/") {
    e.respondWith(
      fetch(e.request)
        .then(resp => {
          // update cache with fresh file
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return resp;
        })
        .catch(() => caches.match(e.request)) // fallback to cache
    );
    return;
  }

  // For everything else: cache first, then network fallback
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});
