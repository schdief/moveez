// __BUILD__ is replaced with the commit SHA during deployment, so every deployment changes this file
// and the browser installs the new worker (open app windows then reload themselves, see app.js).
const CACHE = "moveez-__BUILD__";
// The first PWA version used this cache with a cache-first worker and has no update handling in its app.js.
const LEGACY_CACHE = "moveez-v2";
const ASSETS = [
  "./",
  "./index.html",
  // Versioned like in index.html, so a page can never be combined with scripts or styles of another deployment.
  "./styles.css?v=__BUILD__",
  "./app.js?v=__BUILD__",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  ...["netflix", "prime-video", "disney-plus", "apple-tv", "paramount-plus", "cinemaxx", "filmpalast", "uci"].map(logo => `./icons/providers/${logo}.png`),
  "./services/gui/app/views/public/logo.png",
  "./services/gui/app/views/public/nocover.png",
  "./services/gui/app/views/public/rottentomato.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS.map(url => new Request(url, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  const cleanup = (async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
    return keys.includes(LEGACY_CACHE);
  })();
  event.waitUntil(cleanup);
  // Reload windows still running the legacy app. Must not be part of waitUntil: the navigation's fetch
  // waits for this worker to finish activating, which would deadlock.
  cleanup.then(async fromLegacy => {
    if (!fromLegacy) return;
    const windows = await self.clients.matchAll({ type: "window" });
    windows.forEach(client => client.navigate(client.url).catch(() => {}));
  });
});

// Network first for the app itself so updates arrive immediately; the cache is only the offline fallback.
// Cross-origin requests (OMDb API, posters, LLM) are left alone and never cached.
self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    // no-cache: revalidate with the server instead of using GitHub Pages' 10 minute HTTP cache.
    fetch(request.url, { cache: "no-cache", credentials: "same-origin" })
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => (await caches.match(request)) || (request.mode === "navigate" ? caches.match("./index.html") : Response.error()))
  );
});
