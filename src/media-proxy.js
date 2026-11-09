/* media-proxy.js — proxy de mídia externa (privacidade A2).
   PROBLEMA: ver <img>/<video> de URL alheia faz o NAVEGADOR do leitor
   conectar direto no host do autor (IP + User-Agent + horário). Quem postou
   um pixel tracker `https://` público descobre o IP de quem viu.
   SOLUÇÃO: quando ligado (padrão ON) e o Bonto está configurado+logado, as
   imagens externas são buscadas pelo SERVIDOR via POST /api/fetch (que já tem
   gate SSRF + teto 3MB) e exibidas como blob local — o host do autor vê o IP
   do servidor, nunca o do leitor. Sem Bonto/logado, a imagem carrega direto
   (fallback honesto + aviso visível).
   LIMITES honestos: teto 3MB do /api/fetch (GIF grande cai p/ direto);
   <video>/<audio> NÃO são proxied (stream 3MB não dá) — seguem diretos com
   aviso; clique em link/svg externo sempre vaza IP por desenho.
   Toggle: localStorage `zunzumProxyMedia` ("1"/"0"), barra nas caixas. */
(function(){
"use strict";
var KEY = "zunzumProxyMedia";
var cache = {}; // url -> blobURL (máx ~80)
var order = [];
function on(){
  try{ var v = localStorage.getItem(KEY); return v===null ? true : v==="1"; }
  catch(e){ return true; }
}
function setOn(v){
  try{ localStorage.setItem(KEY, v?"1":"0"); }catch(e){}
  try{ renderBars(); }catch(e){}
}
function b64ToBlob(b64, ctype){
  try{
    var bin = atob(b64), arr = new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], {type: ctype||"image/png"});
  }catch(e){ return null; }
}
function internalHost(h){
  h = String(h||"").toLowerCase();
  if(!h) return true;
  // mesma origem do app ou hosts próprios (sem tracker de terceiro)
  try{
    if(h === location.hostname.toLowerCase()) return true;
  }catch(e){}
  if(/(^|\.)uploads\.dev$/.test(h)) return true; // uploads do app
  if(/(^|\.)supabase\.co$/.test(h)) return true; // Storage proprio (sem tracker)
  if(/(^|\.)supabase\.in$/.test(h)) return true; // Storage proprio (regiao nova)
  if(/^([a-z0-9-]+\.)*perchance\.org$/.test(h)) return true;
  return false;
}
function externalImg(img){
  try{
    if(!img || img.tagName!=="IMG" || img.dataset.zunpx) return null;
    var s = img.currentSrc || img.src || "";
    if(!s || s.indexOf("blob:")===0 || s.indexOf("data:")===0) return null;
    var u = new URL(s, location.href);
    if(u.protocol!=="https:") return null;
    if(internalHost(u.hostname)) return null;
    return u.toString();
  }catch(e){ return null; }
}
var pending = 0;
async function proxyOne(img){
  try{ if(window.__saverOn && window.__saverOn()) return; }catch(e){} // economia: não baixa nada sozinho (o usuário carrega ao tocar)
  var url = externalImg(img);
  if(!url) return;
  img.dataset.zunpx = "try";
  if(!on()){ img.dataset.zunpx = "off"; markDirect(img); return; }
  if(cache[url]){ swap(img, url, cache[url]); return; }
  if(pending>=4) return; // lote cheio: tenta na próxima passada
  var B = null;
  try{ B = window.ZunBackend; }catch(e){}
  /* Worker novo (ZUN_FETCH_URL) ou Bonto: raw {ok,b64,text,ctype}. */
  try{
    if(window.ZunOwn && window.ZunOwn.fetchRaw){
      var r0 = await window.ZunOwn.fetchRaw(url);
      if(r0 && r0.ok && r0.b64 && r0.text && String(r0.ctype||"").indexOf("image/")===0){
        var blob0 = b64ToBlob(r0.text, r0.ctype);
        if(blob0){
          var o0 = URL.createObjectURL(blob0);
          cache[url] = o0; order.push(url);
          if(order.length>80){ var old0 = order.shift(); try{ URL.revokeObjectURL(cache[old0]); }catch(e){} delete cache[old0]; }
          swap(img, url, o0);
          pending--; pumpSoon(); return;
        }
      }
      if(r0 && r0.ok){ img.dataset.zunpx = "direct"; markDirect(img); pending--; pumpSoon(); return; }
    }
  }catch(e){}
  if(!B || !B.configured || !B.configured()){ img.dataset.zunpx = "direct"; markDirect(img); return; }
  pending++;
  try{
    var r = await B.fetch("/api/fetch", {url: url});
    if(r && r.ok && r.b64 && r.text && String(r.ctype||"").indexOf("image/")===0){
      var blob = b64ToBlob(r.text, r.ctype);
      if(blob){
        var o = URL.createObjectURL(blob);
        cache[url] = o; order.push(url);
        if(order.length>80){ var old = order.shift(); try{ URL.revokeObjectURL(cache[old]); }catch(e){} delete cache[old]; }
        swap(img, url, o);
        pending--; pumpSoon(); return;
      }
    }
    // ctype não-imagem, texto, erro ou quota: direto com aviso
    img.dataset.zunpx = "direct"; markDirect(img);
  }catch(e){
    try{ img.dataset.zunpx = "direct"; }catch(e2){}
    try{ markDirect(img); }catch(e3){}
  }
  pending--;
  pumpSoon();
}
function swap(img, url, blobUrl){
  try{
    if(img.dataset && img.dataset.zunSaver){ try{ img.dataset.zunpx = "direct"; }catch(e){} return; } // economia segurou: não injeta blob escondido; ao liberar, o pump proxia
    if(!img.dataset.zunorig) img.dataset.zunorig = url;
    img.dataset.zunpx = "px";
    img.title = "imagem via proxy (seu IP oculto do host original)";
    img.src = blobUrl;
  }catch(e){ try{ img.dataset.zunpx = "direct"; }catch(e2){} }
}
function markDirect(img){
  try{
    if(img.title===undefined || !img.title) img.title = "imagem direta: o host original vê seu IP";
  }catch(e){}
}
var pumpT = 0;
function pumpSoon(){
  if(pumpT) return;
  pumpT = setTimeout(function(){
    pumpT = 0;
    try{
      var imgs = document.querySelectorAll("#feedCtn img, #pubLog img, #privLog img, #zunDMRoot img, .zunm-list img, #searchLinks img");
      var n = 0;
      for(var i=0;i<imgs.length && n<6;i++){
        if(!imgs[i].dataset.zunpx){ n++; proxyOne(imgs[i]); }
      }
      if(n) pumpSoon();
    }catch(e){}
  }, 1200);
}
function barHtml(){
  var isOn = on();
  return "⛔ mídia externa mostra seu IP ao host. proxy: " + (isOn ? "ON ✅" : "OFF");
}
function renderBars(){
  try{
    [["#feedCtn","zunProxyBarFeed"],["#pubLog","zunProxyBarPub"]].forEach(function(pair){
      var anchor = document.querySelector(pair[0]);
      if(!anchor) return;
      var box = anchor.closest ? anchor.closest(".box") : null;
      if(!box) return;
      var bar = document.getElementById(pair[1]);
      if(!bar){
        bar = document.createElement("div");
        bar.id = pair[1];
        bar.className = "meta";
        bar.style.cssText = "margin:4px 0;display:flex;gap:6px;align-items:center;flex-wrap:wrap";
        var h3 = box.querySelector("h3");
        if(h3 && h3.nextSibling) h3.parentNode.insertBefore(bar, h3.nextSibling);
        else box.insertBefore(bar, box.firstChild);
      }
      bar.textContent = "";
      var sp = document.createElement("span");
      sp.textContent = barHtml();
      var btn = document.createElement("button");
      btn.type = "button";
      btn.style.cssText = "font-size:11px;padding:2px 8px";
      btn.textContent = on() ? "desligar proxy" : "ligar proxy";
      btn.onclick = function(){ setOn(!on()); };
      bar.appendChild(sp); bar.appendChild(btn);
    });
  }catch(e){}
}
try{
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", function(){ setTimeout(function(){ renderBars(); pumpSoon(); }, 2500); });
  else setTimeout(function(){ renderBars(); pumpSoon(); }, 2500);
  // re-barra quando as caixas repintam (feed vazio → innerHTML="")
  setInterval(function(){ try{ renderBars(); }catch(e){} }, 15000);
  // observa imagens novas (feed/chat/DM/mural/busca)
  var mo = new MutationObserver(function(muts){
    try{
      for(var i=0;i<muts.length;i++){
        var m = muts[i];
        for(var j=0;j<m.addedNodes.length;j++){
          var n = m.addedNodes[j];
          if(!n || !n.querySelectorAll) continue;
          if(n.tagName==="IMG" && !n.dataset.zunpx){ proxyOne(n); }
          var imgs = n.querySelectorAll ? n.querySelectorAll("img") : [];
          for(var k=0;k<imgs.length && k<4;k++){ if(!imgs[k].dataset.zunpx) proxyOne(imgs[k]); }
        }
      }
    }catch(e){}
    pumpSoon();
  });
  function watch(){
    try{
      var roots = ["#feedCtn","#pubLog","#privLog","#zunDMRoot"].map(function(s){ try{ return document.querySelector(s); }catch(e){ return null; } }).filter(Boolean);
      roots.forEach(function(r){ try{ mo.observe(r, {childList:true, subtree:true}); }catch(e){} });
    }catch(e){}
  }
  setTimeout(watch, 3000);
  setInterval(watch, 30000); // pega raízes recriadas pelo repaint
  window.zunProxyToggle = function(){ setOn(!on()); return on(); };
  window.zunProxyState = function(){ return {on: on()}; };
}catch(e){}
})();
