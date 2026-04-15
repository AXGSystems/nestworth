const CACHE = 'nestworth-v4.2';
const ASSETS = ['/', '/index.html', '/manifest.json'];
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; /* 24 hours */

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Only cache same-origin and trusted font CDN requests
  const trustedHosts = [self.location.hostname, 'fonts.googleapis.com', 'fonts.gstatic.com'];
  if (!trustedHosts.includes(url.hostname)) return;

  // Cache-first for font files (woff2, Google Fonts)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' || /\.(woff2?|ttf|otf)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(r => {
          // Only cache successful responses; reject redirects and error responses
          if (r.ok && r.status === 200) {
            const clone = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return r;
        });
      })
    );
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(r => {
        // Only cache successful, non-redirected, same-origin responses
        if (r.ok && r.type === 'basic' && r.status === 200) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
