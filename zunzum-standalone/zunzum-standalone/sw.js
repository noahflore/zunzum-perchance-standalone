var VER = "zunzum-standalone-v1";
var CORE = ["./", "index.html", "src/standalone-shim.js", "src/app.js", "src/i18n.js", "src/nodal.js", "src/notify.js", "src/seo.js", "src/mobile.js", "assets/logo.jpg"];
self.addEventListener("install", function(e){
  try{ self.skipWaiting(); }catch(err){}
  e.waitUntil(caches.open(VER).then(function(c){ return c.addAll(CORE).catch(function(){}); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k === VER ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }).catch(function(){}));
});
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var u = new URL(e.request.url);
  if(u.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then(function(hit){
      var net = fetch(e.request).then(function(res){
        try{
          if(res && res.ok){
            var cp = res.clone();
            caches.open(VER).then(function(c){ c.put(e.request, cp); }).catch(function(){});
          }
        }catch(err){}
        return res;
      }).catch(function(){ return hit || Response.error(); });
      return hit || net;
    })
  );
});
