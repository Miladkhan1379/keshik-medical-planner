const CACHE='keshikyar-1-1-v2';
const ASSETS=['./','./index.html','./styles.css','./jalali.js','./holidays.js','./xlsx-lite.js','./solver.js','./app.js','./v11-extra.js','./manifest.webmanifest','./icon-192.png','./icon-512.png','./sample_people.xlsx','./sample_schedule.xlsx'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>hit||fetch(e.request).then(r=>{if(r&&r.ok&&new URL(e.request.url).origin===location.origin){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>caches.match('./index.html'))));});
