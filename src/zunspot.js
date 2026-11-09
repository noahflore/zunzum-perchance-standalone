/* zunSpot — destaque visual guiado ("onde clicar para chegar").
   Resolve: o destaque antigo (tourSpot 2.7s / comoMini 1.6s outline) sumia
   rápido demais e não mostrava o caminho. Aqui o box fica ~12s (com [x]),
   mostra a etiqueta "👇 aqui" + o caminho ("aba X → botão Y") e pisca também
   o botão da aba + o botão clicável de destino.
   Uso: window.zunSpot("postBox", {tab:"feed", label:"caixa postar", path:"aba 📰 Feed → botão Postar", click:"postBtn"})
   Uso curto: window.zunSpot(el, {label, path}) — sem tab, sem click. */
(function(){
"use strict";
var TAG_ID = "zunSpotTag";
var curBox = null, curTab = null, curClick = null, curTimer = null, curTag = null;
var curWrapEl = null, curWrapPrev = "";

function $(id){ try{ return document.getElementById(id); }catch(e){ return null; } }
function ensureCss(){
  if(document.getElementById("zunSpotCss")) return;
  var st = document.createElement("style");
  st.id = "zunSpotCss";
  st.textContent =
  ".zun-spot-box{outline:3px solid #ff5a00!important;box-shadow:0 0 0 5px rgba(255,90,0,.35),4px 4px 0 #111!important;border-radius:10px;animation:zunSpotPulse 1.2s ease-in-out infinite;position:relative}"+
  "@keyframes zunSpotPulse{50%{box-shadow:0 0 0 9px rgba(255,90,0,.55),4px 4px 0 #111}}"+
  ".zun-spot-click{outline:3px solid #ff5a00!important;box-shadow:0 0 0 4px rgba(255,90,0,.5)!important;animation:zunSpotPulse 1.2s ease-in-out infinite;border-radius:8px}"+
  "#zunMBar button.zun-spot-tab{outline:3px solid #ff5a00!important;box-shadow:0 0 0 4px rgba(255,90,0,.5)!important;animation:zunSpotPulse 1.2s ease-in-out infinite}"+
  ".zun-spot-tag{display:flex;gap:8px;align-items:center;background:#111;color:#fff;border:2px solid #ff5a00;border-radius:10px;padding:7px 8px;font-size:13px;line-height:1.4;margin-bottom:8px;box-shadow:3px 3px 0 #ff5a00}"+
  ".zun-spot-tag .zun-spot-here{font-weight:bold;white-space:nowrap}"+
  ".zun-spot-tag .zun-spot-path{opacity:.92;flex:1;min-width:0}"+
  ".zun-spot-tag button{flex:none;background:#ff5a00;color:#fff;border:2px solid #fff;border-radius:7px;font-weight:bold;padding:3px 9px;cursor:pointer;font-size:12px}"+
  "#topBtns .zun-spot-tag{flex:1 1 100%;margin:2px 0}"+
  "#topBtns:has(.zun-spot-tag){flex-wrap:wrap}"+
  "body.zun-night .zun-spot-tag{background:#000;color:#ffe9b0;border-color:#ffb300;box-shadow:3px 3px 0 #ffb300}"+
  "body.zun-night .zun-spot-tag button{background:#ffb300;color:#111;border-color:#fff}";
  document.head.appendChild(st);
}
function clear(){
  try{ if(curTimer){ clearTimeout(curTimer); curTimer = null; } }catch(e){}
  try{ if(curBox && curBox.classList) curBox.classList.remove("zun-spot-box"); }catch(e){}
  try{ if(curTab && curTab.classList) curTab.classList.remove("zun-spot-tab"); }catch(e){}
  try{ if(curClick && curClick.classList) curClick.classList.remove("zun-spot-click"); }catch(e){}
  try{ if(curTag && curTag.parentNode) curTag.parentNode.removeChild(curTag); }catch(e){}
  try{ if(curWrapEl){ curWrapEl.style.flexWrap = curWrapPrev; } }catch(e){}
  curBox = null; curTab = null; curClick = null; curTag = null;
  curWrapEl = null; curWrapPrev = "";
}
function spot(target, opts){
  ensureCss();
  clear();
  opts = opts || {};
  var ms = opts.ms || 12000;
  var el = (typeof target === "string") ? $(target) : target;
  if(!el) return false;
  // 1) destaca o botão da aba (mostra ONDE CLICAR p/ chegar)
  try{
    if(opts.tab){
      var tb = document.querySelector('#zunMBar button[data-tab="'+opts.tab+'"]');
      if(tb){
        curTab = tb;
        tb.classList.add("zun-spot-tab");
        try{ tb.scrollIntoView({behavior:"smooth", block:"nearest"}); }catch(e2){}
      }
    }
  }catch(e){}
  // 2) rola até o destino e marca o box
  try{ el.scrollIntoView({behavior:"smooth", block:"center"}); }catch(e){}
  var box = el, inBox = false;
  try{ if(el.closest){ var b = el.closest(".box"); if(b){ box = b; inBox = true; } } }catch(e){}
  curBox = box;
  try{ box.classList.add("zun-spot-box"); }catch(e){}
  // 3) etiqueta ANTES do conteúdo ("👇 aqui" + caminho + [entendi]).
  // A etiqueta fica no TOPO do box e o dedo aponta p/ BAIXO (p/ dentro do box).
  // Se o alvo não tem .box em volta (ex: botão solto no topo), a etiqueta vai
  // como IRMÃ antes dele — nunca DENTRO (dentro tampava o botão e barrava o clique).
  try{
    var tag = document.createElement("div");
    tag.className = "zun-spot-tag";
    tag.id = TAG_ID;
    var here = document.createElement("span");
    here.className = "zun-spot-here";
    here.textContent = "👇 " + (opts.label || "aqui");
    var path = document.createElement("span");
    path.className = "zun-spot-path";
    path.textContent = opts.path ? ("onde clicar: " + opts.path) : "";
    var x = document.createElement("button");
    x.type = "button";
    x.textContent = "entendi ✓";
    x.setAttribute("aria-label", "dispensar destaque");
    x.onclick = function(){ clear(); };
    tag.appendChild(here);
    if(opts.path) tag.appendChild(path);
    tag.appendChild(x);
    if(inBox){
      if(box.firstChild) box.insertBefore(tag, box.firstChild);
      else box.appendChild(tag);
    } else if(el.parentNode){
      try{ el.parentNode.insertBefore(tag, el); }catch(e2){ try{ box.appendChild(tag); }catch(e3){} }
      // Se o pai for flex sem quebra (ex: #topBtns), a etiqueta espremeria os
      // botões na mesma linha: força a quebra via inline (restaura no clear).
      try{
        var pp = tag.parentNode;
        if(pp && String(getComputedStyle(pp).display).indexOf("flex") !== -1){
          curWrapEl = pp; curWrapPrev = pp.style.flexWrap || "";
          pp.style.flexWrap = "wrap";
        }
      }catch(e5){}
    } else {
      try{ box.appendChild(tag); }catch(e4){}
    }
    curTag = tag;
  }catch(e){}
  // 4) pisca o botão clicável de destino (ex: Postar)
  try{
    if(opts.click){
      var c = (typeof opts.click === "string") ? $(opts.click) : opts.click;
      if(c){
        curClick = c;
        c.classList.add("zun-spot-click");
        var done = false;
        var off = function(){ if(done) return; done = true; clear(); };
        c.addEventListener("click", off, {once:true});
      }
    }
  }catch(e){}
  // 5) sai sozinho (tempo longo, não 1-2s) — mas o [entendi] sai antes
  try{
    curTimer = setTimeout(function(){ clear(); }, ms);
  }catch(e){}
  return true;
}
try{ window.zunSpot = spot; window.zunSpotClear = clear; }catch(e){}
})();
