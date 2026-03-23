/**
 * Service worker: cache-first for Discord CDN images and common media.
 * Avatars, guild icons, emojis, attachments, and embed images loaded once
 * are served from cache on subsequent requests.
 */
const CACHE_NAME = 'bridge-media-v1';
const CACHEABLE_HOSTS = [
  'cdn.discordapp.com',
  'media.discordapp.net',
  'i.imgur.com',
];

const IMAGE_EXT = /\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i;

function isCacheableUrl(url) {
  try {
    const u = new URL(url);
    if (CACHEABLE_HOSTS.some(h => u.hostname === h)) return true;
    if (IMAGE_EXT.test(u.pathname)) return true;
  } catch { }
  return false;
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith('bridge-media') && k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!isCacheableUrl(event.request.url)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response.ok || response.type === 'error') return response;
          const clone = response.clone();
          cache.put(event.request, clone);
          return response;
        });
      })
    )
  );
});
