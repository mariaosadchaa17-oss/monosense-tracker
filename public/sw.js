const CACHE = "finora-v2";
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(["/","/offline.html","/manifest.webmanifest","/favicon.svg"]))));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(async() => (await caches.match(event.request)) || (event.request.mode==="navigate" ? caches.match("/offline.html") : Response.error())));
});
self.addEventListener("push",event=>{const data=event.data?event.data.json():{title:"Finora",body:"Нове сповіщення"};event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:"/favicon.svg",badge:"/favicon.svg",tag:data.tag||"finora",data:{url:data.url||"/"}}));});
self.addEventListener("notificationclick",event=>{event.notification.close();event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{const existing=list.find(client=>client.url.includes(self.location.origin));if(existing){existing.navigate(event.notification.data.url);return existing.focus();}return clients.openWindow(event.notification.data.url);}));});
