const CACHE = "rivna-v1";
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["/offline.html","/manifest.webmanifest","/favicon.svg"])).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch", event => {
  if(event.request.method!=="GET")return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||url.pathname.startsWith("/api/")||url.pathname.startsWith("/auth")||url.pathname.startsWith("/invite/"))return;
  if(event.request.mode==="navigate"){event.respondWith(fetch(event.request).catch(()=>caches.match("/offline.html")));return}
  if(!url.pathname.startsWith("/_next/static/")&&!/\.(?:css|js|svg|png|webp|woff2?)$/i.test(url.pathname))return;
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(response=>{if(response.ok)caches.open(CACHE).then(cache=>cache.put(event.request,response.clone()));return response})));
});
self.addEventListener("push",event=>{const data=event.data?event.data.json():{title:"Rivna",body:"Нове сповіщення"};event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"/favicon.svg",badge:"/favicon.svg",tag:data.tag||"rivna",data:{url:data.url||"/"}}));});
self.addEventListener("notificationclick",event=>{event.notification.close();event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{const existing=list.find(client=>client.url.includes(self.location.origin));if(existing){existing.navigate(event.notification.data.url);return existing.focus();}return clients.openWindow(event.notification.data.url);}));});
