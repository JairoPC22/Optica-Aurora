const CACHE_NAME = 'aurora-v3.3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './Logo-optica.ico',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        // Cachear individualmente para que un fallo no bloquee todo
        Promise.allSettled(
          ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('No se pudo cachear:', url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Activar — limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — red primero, cache como fallback
self.addEventListener('fetch', e => {
  // No interceptar llamadas a Google Apps Script (siempre necesitan red)
  // No interceptar APIs externas que siempre necesitan red
  if (
    e.request.url.includes('script.google.com') ||
    e.request.url.includes('emailjs.com') ||
    e.request.url.includes('cdn.emailjs') ||
    e.request.url.includes('cdn.jsdelivr.net') ||
    e.request.url.includes('fonts.googleapis.com') ||
    e.request.url.includes('fonts.gstatic.com')
  ) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Si la respuesta es válida, actualizamos el cache
        if (res && res.status === 200 && res.type === 'basic') {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(cached => {
    if (cached) return cached;
    if (e.request.mode === 'navigate') {
        return new Response(
        '<html><body style="font-family:sans-serif;text-align:center;padding:3rem"><h2>Sin conexión</h2><p>Verifica tu internet e intenta de nuevo.</p><button onclick="location.reload()">Reintentar</button></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
        );
    }
    return new Response('', { status: 503, statusText: 'Sin conexión' });
    }))
  );
});