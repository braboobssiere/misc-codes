const CACHE_NAME = 'fairshare-v1';
const urlsToCache = [
    './html/fairshare.html',
    './css/fairshare-style.css',
    './js/fairshare-script.js',
    './js/fairshare-manifest.json',
    './image/fairshare-icons/icon-72.png',
    './image/fairshare-icons/icon-96.png',
    './image/fairshare-icons/icon-128.png',
    './image/fairshare-icons/icon-144.png',
    './image/fairshare-icons/icon-152.png',
    './image/fairshare-icons/icon-192.png',
    './image/fairshare-icons/icon-384.png',
    './image/fairshare-icons/icon-512.png'
];

// Install event – cache all required files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Fetch event – serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Activate event – clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
