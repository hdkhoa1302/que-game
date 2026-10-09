const C = 'que-v10';
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(C).then((c) => c.addAll(['./', 'icon.svg', 'manifest.webmanifest']))); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== C).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  // luôn hỏi lại máy chủ (etag) để không kẹt bản cũ do max-age của GitHub Pages; mất mạng mới dùng bản lưu
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => { const k = r.clone(); caches.open(C).then((c) => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request).then((m) => m || caches.match('./'))));
});
