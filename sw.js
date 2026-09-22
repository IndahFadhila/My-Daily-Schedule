/*!
 * Indah's Daily
 * Copyright (c) 2026 Indah Fadhila
 * Source: https://github.com/IndahFadhila/My-Daily-Schedule
 * Licensed under MIT (see LICENSE)
 */

// Service worker buat Indah's Daily.
// Strategy: cache-first buat asset app-shell, network-first buat rest.
// Kalau update file, bump CACHE_VERSION supaya user dapet versi baru.

const CACHE_VERSION = "jadwal-v19";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./icon.svg",
  "./favicon.svg",
  "./notif-icon.svg",
  "./manifest.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Klik notifikasi -> focus PWA yang lagi terbuka, atau buka baru.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("./");
      }
    })
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, clone));
        }
        return res;
      }).catch(() => {
        // fallback buat navigation request pas offline
        if (req.mode === "navigate") return caches.match("./index.html");
      });
    })
  );
});
