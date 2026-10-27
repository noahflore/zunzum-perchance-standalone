/* zunzum SW: código/HTML = rede-primeiro (nunca roda JS velho); imagens = pote
   velho + revalida em 2º plano (offline continua vendo mídia). A v1 era
   pote-primeiro p/ tudo e prendia JS antigo p/ sempre ("continua igual"). */
var VER = "zunzum-v3";
var CORE = ["./", "src/app.js", "src/notify.js", "src/i18n.js", "src/seo.js", "src/vision-frames.js"];
self.addEventListener("install", function(e){
  try{ self.skipWaiting(); }catch(err){}
  e.waitUntil(caches.open(VER).then(function(c){ return c.addAll(CORE).catch(function(){}); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k === VER ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }).catch(function(){}));
});
function swPut(req, res){
  try{
    if(!res || !res.ok) return;
    var cp = res.clone();
    caches.open(VER).then(function(c){ c.put(req, cp); }).catch(function(){});
  }catch(err){}
}
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var u;
  try{ u = new URL(e.request.url); }catch(err){ return; }
  if(u.origin !== location.origin) return;
  var isImg = false;
  try{ isImg = (e.request.destination === "image") || /\.(png|jpe?g|gif|webp|svg|ico|mp3|mp4|webm|ogg|wav)(\?|#|$)/i.test(u.pathname); }catch(err){}
  /* mídia: serve o pote na hora e atualiza em 2º plano */
  if(isImg){
    e.respondWith(
      caches.match(e.request).then(function(hit){
        var net = fetch(e.request).then(function(res){ swPut(e.request, res); return res; }).catch(function(){ return hit; });
        return hit || net;
      })
    );
    return;
  }
  /* código + HTML: rede primeiro; pote só se offline */
  e.respondWith(
    fetch(e.request).then(function(res){ swPut(e.request, res); return res; }).catch(function(){
      return caches.match(e.request).then(function(hit){ return hit || Response.error(); });
    })
  );
});
