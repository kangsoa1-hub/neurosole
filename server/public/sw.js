/* NeuroSole 서비스워커 — 앱 껍데기(index.html·manifest·아이콘)만 캐시, /api/ 는 절대 캐시하지 않음 */
const VERSION='ns-v56'; const SHELL=['/','/index.html','/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(VERSION).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{ const u=new URL(e.request.url); if(u.origin!==location.origin||u.pathname.startsWith('/api/')||e.request.method!=='GET') return;
  // 네트워크 우선(새 버전 즉시 반영), 실패 시 캐시(오프라인)
  e.respondWith(fetch(e.request).then(r=>{ if(r.ok){ const c=r.clone(); caches.open(VERSION).then(cache=>cache.put(e.request,c)); } return r; }).catch(()=>caches.match(e.request).then(r=>r||caches.match('/index.html')))); });
self.addEventListener('message',e=>{ if(e.data==='skipWaiting') self.skipWaiting(); });
