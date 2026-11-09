/* zuncount.js — contagem de visitas com privacidade (opt-in do dono).
   Ideia do sadgrl/cinni (goatcounter `gc.zgo.at/count.js`, dissecação
   2026-11-04): sem cookie, sem banner, sem rastrear ninguém.
   OFF por padrão: sem config NADA muda (o contador atual do zunzum segue
   igual). P/ ligar, o dono cria a conta e define antes dos scripts:
     window.zunCountSrc = "https://gc.zgo.at/count.js";   // goatcounter
     window.zunCountSite = "//minhaconta.goatcounter.com/count";
   (ou endpoint umami próprio com `window.zunCountAttrs = {"data-website-id":"..."}`).
   Espelho-safe: roda igual nos dois (só conta pageview, sem dado pessoal). */
(function(){
"use strict";
if(window.__zuncountLoaded) return; window.__zuncountLoaded = true;
function tryInject(){
  if(document.querySelector('script[data-zuncount]')) return true;
  try{
    var src = "";
    try{ src = String(window.zunCountSrc||"").trim(); }catch(e){}
    if(!src) return false; // off: ninguém configurou
    if(!/^https:\/\/[a-z0-9.-]+\//i.test(src)) return false;
    var attrs = null;
    try{ attrs = window.zunCountAttrs||null; }catch(e){}
    var site = "";
    try{ site = String(window.zunCountSite||"").trim(); }catch(e){}
    var s = document.createElement("script");
    s.async = true;
    s.setAttribute("data-zuncount","1");
    s.src = src;
    if(site) s.setAttribute("data-goatcounter", site);
    if(attrs && typeof attrs==="object"){
      for(var k in attrs){
        if(!Object.prototype.hasOwnProperty.call(attrs,k)) continue;
        if(!/^data-[a-z0-9-]+$/.test(k)) continue;
        try{ s.setAttribute(k, String(attrs[k]).slice(0,200)); }catch(e){}
      }
    }
    s.onerror = function(){ try{ s.remove(); }catch(e){} };
    document.head.appendChild(s);
    return true;
  }catch(e){ return false; }
}
/* config pode chegar depois (console do dono): tenta por 60s e para */
try{
  if(!tryInject()){
    var _n = 0;
    var _iv = setInterval(function(){
      _n++;
      try{ if(tryInject() || _n>30){ clearInterval(_iv); } }catch(e){ try{ clearInterval(_iv); }catch(e2){} }
    }, 2000);
  }
}catch(e){}
})();
