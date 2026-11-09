/* zunhuman.js — prova de humanidade opcional (Turnstile) no post público.
   Ideia do atabook (turnstile anti-spam, dissecação 2026-11-04).
   OFF por padrão: sem `window.zunTurnstileKey` (site key do Cloudflare,
   gerada pelo dono em dash.cloudflare.com/turnstile) NADA muda — o post
   segue exatamente como hoje. Com a key: widget invisível + token anexado
   ao feedPush (`payload.ts`).
   PENDENTE p/ valer de verdade: verificar o token no servidor (função de
   borda chamando siteverify com o SECRET — secret NUNCA vai em src/, é
   público). Sem verificação o token é só sinal; com ela, trava bot.
   Falha do widget NUNCA bloqueia post (fail-open c/ aviso no console). */
(function(){
"use strict";
if(window.__zunhumanLoaded) return; window.__zunhumanLoaded = true;
function key(){ try{ var k = window.zunTurnstileKey; return (typeof k==="string"&&k.trim()) ? k.trim() : ""; }catch(e){ return ""; } }
var wid = null, ready = false, loading = false;
function ensureWidget(cb){
  var k = key();
  if(!k){ cb(null); return; }
  if(wid && ready){ cb(wid); return; }
  if(loading){ var iv = setInterval(function(){ if(wid&&ready){ clearInterval(iv); cb(wid); } }, 300); return; }
  loading = true;
  try{
    var box = document.createElement("div");
    box.id = "zunHumanBox"; box.style.display = "none";
    box.setAttribute("aria-hidden","true");
    document.body.appendChild(box);
    var s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true; s.defer = true;
    s.onload = function(){
      try{
        wid = window.turnstile.render(box, {
          sitekey: k, size: "invisible",
          callback: function(){ ready = true; },
          "error-callback": function(){ ready = false; }
        });
        ready = true; cb(wid);
      }catch(e){ loading = false; cb(null); }
    };
    s.onerror = function(){ loading = false; cb(null); };
    document.head.appendChild(s);
  }catch(e){ loading = false; cb(null); }
}
/* Promise<string|null>: token p/ anexar ao payload, ou null (off/falha) */
window.zunHumanToken = function(){
  return new Promise(function(res){
    try{
      if(!key()){ res(null); return; }
      ensureWidget(function(w){
        if(w==null){ res(null); return; }
        try{
          var t = setTimeout(function(){ res(null); }, 8000);
          window.turnstile.execute(w, {
            callback: function(tok){ clearTimeout(t); res(tok||null); },
            "error-callback": function(){ clearTimeout(t); res(null); }
          });
        }catch(e){ res(null); }
      });
    }catch(e){ res(null); }
  });
};
/* anexa o token ao feedPush (post público/anônimo = alvo de bot) */
function wrapRpc(){
  try{
    if(typeof window.rpc!=="function" || window.__zunhumanWrapped) return;
    window.__zunhumanWrapped = true;
    var orig = window.rpc;
    window.rpc = function(name, data){
      try{
        if(name==="feedPush" && key()){
          return window.zunHumanToken().then(function(tok){
            var d = data;
            try{
              if(tok){
                var o = JSON.parse(String(data||"{}"));
                o.ts = String(tok).slice(0,2048);
                d = JSON.stringify(o);
              }
            }catch(e){}
            return orig(name, d);
          });
        }
      }catch(e){}
      return orig(name, data);
    };
  }catch(e){}
}
try{
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", wrapRpc);
  else wrapRpc();
  setTimeout(wrapRpc, 4000); // garante após o boot tardio
}catch(e){}
})();
