const CACHE_NAME = "funkgefuehl-v1";
const urlsToCache = ["/", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {
        // It's ok if cache.addAll fails, we just won't have offline support
      });
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if available
      if (response) return response;
      // Otherwise fetch from network
      return fetch(event.request).catch(() => {
        // If offline and not cached, return empty response
        return new Response("Offline");
      });
    })
  );
});
