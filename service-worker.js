const CACHE = "verxov-static-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./cover.jpg",
  "./avatar.jpg",
  "./favicon.svg",
  "./manifest.webmanifest",
];

 async function precache() {
   const cache = await caches.open(CACHE);
   await Promise.all(
     ASSETS.map(async (url) => {
       try {
         const req = new Request(url, { cache: "reload" });
         const res = await fetch(req);
         if (res && res.ok) await cache.put(req, res);
       } catch {
         // ignore
       }
     })
   );
 }

self.addEventListener("install", (event) => {
  event.waitUntil(
    precache().then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
      ),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // Don't cache heavy media
  if (url.pathname.endsWith(".mp4") || url.pathname.endsWith(".m4a")) return;

  // Offline navigation fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE);
        return (
          (await cache.match("./index.html")) ||
          (await cache.match("index.html")) ||
          (await cache.match("./"))
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
    })
  );
});
