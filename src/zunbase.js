/* zunbase.js — base canônica AUTO-REFERENTE (Perchance + espelhos).
   Problema que resolve: links de compartilhamento (perfil, sala, privado,
   convite, divulgar/QR/whatsapp) estavam hardcodados p/ perchance.org, então
   no Neocities o visitante copiava link do outro domínio e "fugia" do espelho.
   Regra nova: TODO link compartilhável usa window.zunBaseUrl().
   - No Perchance (host *.perchance.org ou com generatorPublicId): retorna
     "https://perchance.org/<slug>" (canônico p/ share, sem subdomínio).
   - Fora (neocities.org, github.io, localhost, custom): retorna
     location.origin + caminho (sem index.html no fim, sem trailing slash).
     Ex: "https://zunzum.neocities.org", "https://user.github.io/zunzum".
   Sem dependência, carrega cedo (logo após o shim do generatorName).
   Fallback seguro: se location falhar, volta p/ perchance.org/<slug>.
   Também auto-conserta <a> estáticos que apontam p/ perchance.org/<slug>
   quando estiver no espelho (só troca o prefixo, mantém ?query/#hash). */
(function(){
"use strict";
function slug(){
  try{ return String(window.generatorName||"zunzum").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,40)||"zunzum"; }
  catch(e){ return "zunzum"; }
}
function isPerchance(){
  try{
    var h = String(location.hostname||"").toLowerCase();
    if(/(^|\.)perchance\.org$/i.test(h)) return true;
    if(window.generatorPublicId) return true;
  }catch(e){}
  return false;
}
function mirrorBase(){
  try{
    var origin = "";
    try{ origin = location.origin || (location.protocol+"//"+location.host); }catch(e){}
    if(!/^https?:\/\//i.test(origin)) return "";
    var path = String(location.pathname||"/");
    try{ path = path.replace(/index\.html?$/i,""); }catch(e){}
    if(path.charAt(0)!=="/") path = "/"+path;
    // "/pasta/arquivo.html" (espelho com arquivo) -> "/pasta/"
    try{
      var last = path.split("/").pop();
      if(last && last.indexOf(".")>=0) path = path.slice(0, path.length-last.length);
    }catch(e){}
    if(!path) path = "/";
    var base = origin + path;
    // normaliza: sem trailing slash, EXCETO raiz ("https://host/" mantém a
    // barra p/ ficar "https://host/?perfil=x" igual ao sitemap existente).
    // "https://host?perfil=x" e "https://host/?perfil=x" são equivalentes,
    // mas com barra é o formato convencional.
    try{ if(base.length>1 && base.charAt(base.length-1)==="/" && base !== origin+"/") base = base.slice(0,-1); }catch(e){}
    return base;
  }catch(e){ return ""; }
}
function baseUrl(){
  try{
    if(isPerchance()) return "https://perchance.org/"+slug();
    var mb = mirrorBase();
    if(mb) return mb;
  }catch(e){}
  try{ return "https://perchance.org/"+slug(); }catch(e2){ return "https://perchance.org/zunzum"; }
}
try{
  window.zunBaseUrl = baseUrl;
  window.zunIsMirror = function(){ try{ return !isPerchance(); }catch(e){ return false; } };
  window.zunSlug = slug;
}catch(e){}
function fixStaticSelfLinks(){
  try{
    if(isPerchance()) return;
    var base = baseUrl();
    var s = slug();
    var p1 = "https://perchance.org/"+s, p2 = "http://perchance.org/"+s;
    var as = document.querySelectorAll('a[href*="perchance.org/'+s+'"]');
    for(var i=0;i<as.length;i++){
      try{
        var a = as[i], h = String(a.getAttribute("href")||"");
        if(h.indexOf(p1)===0) a.setAttribute("href", base+h.slice(p1.length));
        else if(h.indexOf(p2)===0) a.setAttribute("href", base+h.slice(p2.length));
      }catch(e){}
    }
  }catch(e){}
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", fixStaticSelfLinks);
else setTimeout(fixStaticSelfLinks, 0);
try{ setTimeout(fixStaticSelfLinks, 2500); }catch(e){}
})();
