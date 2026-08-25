/* global self, URL, caches, fetch, Request */

const PORTRAIT_CACHE = "operator-portraits-v1";
const PORTRAIT_PATH = "/images/operator-portraits/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || !url.pathname.startsWith(PORTRAIT_PATH)) return;

  event.respondWith((async () => {
    const cache = await caches.open(PORTRAIT_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(new Request(request, { cache: "no-store" }));
    if (response.ok) await cache.put(request, response.clone());
    return response;
  })());
});
