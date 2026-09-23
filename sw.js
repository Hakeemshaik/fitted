const CACHE = 'fitted-v3';
const SHELL = ['./', 'index.html', 'app.css', 'src/main.js', 'src/engine.js', 'src/db.js', 'src/vision.js', 'manifest.webmanifest',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'img/milan.webp', 'img/germany.webp', 'img/jorts.webp', 'img/black.webp', 'img/shox.webp'];
// App code is fetched network-first so a redeploy shows up on the next launch; everything else is cache-first.
const FRESH = /\/(index\.html|app\.css|manifest\.webmanifest|src\/[\w-]+\.js)?$/;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.pathname.startsWith('/api/') || /open-meteo\.com$/.test(u.hostname)) return;
  const keep = r => { if (r.ok && (u.origin === location.origin || u.hostname.endsWith('gstatic.com') || u.hostname.endsWith('googleapis.com'))) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; };
  const cached = () => caches.match(req).then(h => h || (req.mode === 'navigate' ? caches.match('index.html') : undefined));
  if (u.origin === location.origin && (req.mode === 'navigate' || FRESH.test(u.pathname))) {
    const net = fetch(req).then(keep);
    const slow = new Promise(r => setTimeout(r, 3000)).then(cached);
    e.respondWith(Promise.race([net.catch(cached), slow]).then(r => r || net));
    return;
  }
  if (u.origin !== location.origin && !/(gstatic|googleapis)\.com$/.test(u.hostname)) return;
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(keep).catch(() => hit);
    return hit || net;
  }));
});
