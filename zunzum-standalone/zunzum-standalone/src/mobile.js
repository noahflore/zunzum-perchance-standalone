// zunzum mobile — layout intuitivo p/ celular (abas inferiores estilo app).
// Só ativa em tela estreita (<=900px). No desktop não mexe em nada:
// move os .box existentes p/ páginas de abas e devolve tudo ao sair.
(function(){
"use strict";
var MQ = null;
try{ MQ = matchMedia("(max-width:900px)"); }catch(e){ return; }
var LS_TAB = "zunzumMobTab", LS_CHAT = "zunzumMobChat";
var active = false, cur = "feed", built = false;
var pagesEl = null, barEl = null, subNavEl = null;
var saved = []; // {el, parent, next}
var origSIV = null, origFocus = null;

function lang(){
  try{
    var l = String(window.zunzumLang||"pt").slice(0,2).toLowerCase();
    return (l==="en"||l==="es") ? l : "pt";
  }catch(e){ return "pt"; }
}
function T(){
  var l = lang();
  if(l==="en") return {feed:"Feed", chats:"Chats", post:"Post", conta:"Account", mais:"More", pub:"Public", priv:"Private"};
  if(l==="es") return {feed:"Feed", chats:"Chats", post:"Publicar", conta:"Cuenta", mais:"Más", pub:"Público", priv:"Privado"};
  return {feed:"Feed", chats:"Chats", post:"Postar", conta:"Conta", mais:"Mais", pub:"Público", priv:"Privado"};
}
function store(k, d){
  try{ var v = localStorage.getItem(k); return v==null ? d : v; }catch(e){ return d; }
}
function storeSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

function ensureCss(){
  if(document.getElementById("zunMobileCss2")) return;
  var c = document.createElement("style");
  c.id = "zunMobileCss2";
  c.textContent =
  "body.zun-mobile{padding-bottom:calc(70px + env(safe-area-inset-bottom, 0px));}"
  +"body.zun-mobile #top{position:sticky;top:0;z-index:44;padding:6px 8px;gap:8px;flex-wrap:nowrap;overflow:hidden;}"
  +"body.zun-mobile #top .top-brand{flex:1 1 auto;min-width:0;}"
  +"body.zun-mobile #top h1{font-size:16px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}"
  +"body.zun-mobile #top .top-sub{display:none;}"
  +"body.zun-mobile #top .top-desc{display:none;}"
  +"body.zun-mobile #userCountEl{display:flex!important;flex:none;align-items:center;gap:3px;font-size:11px;white-space:nowrap;margin:0!important;opacity:1;color:#eaf3fb;}"
  +"body.zun-mobile #userCountEl .uc-total{display:none;}"
  +"body.zun-mobile #userCountEl .uc-rec{display:none;}"
  +"body.zun-mobile #top img{width:28px!important;height:28px!important;flex:none;}"
  +"body.zun-mobile #topBtns{display:flex;gap:4px;flex:none;align-items:center;margin:0;flex-wrap:nowrap;}"
  +"body.zun-mobile #top button{flex:none;font-size:14px;padding:6px 8px;min-height:34px;}"
  +"body.zun-mobile #top .btn-txt{display:none;}"
  +"body.zun-mobile #wrap{display:block;max-width:100%;padding:0 8px;margin:8px auto;}"
  +"body.zun-mobile #seoBox{padding:0 8px;}"
  +"#zunMPages section{display:none;}"
  +"#zunMPages section.on{display:block;animation:zunFade .18s ease;}"
  +"@keyframes zunFade{from{opacity:.4}to{opacity:1}}"
  +"body.zun-mobile .box{padding:8px;margin-bottom:8px;}"
  +"body.zun-mobile #feedCtn{max-height:68dvh;}"
  +"body.zun-mobile .chatlog{max-height:52dvh;font-size:14px;}"
  +"body.zun-mobile #textInput{min-height:70px;}"
  +"body.zun-mobile #postBtn{min-height:44px;padding:8px 16px;}"
  +"body.zun-mobile .fbar button{min-height:38px;min-width:38px;}"
  +"body.zun-mobile .post img,body.zun-mobile .post video,body.zun-mobile .chatimg{max-width:100%;height:auto;}"
  +"body.zun-mobile #pubGrid{grid-template-columns:repeat(auto-fill,minmax(110px,1fr));}"
  +"#zunMBar{position:fixed;left:0;right:0;bottom:0;z-index:45;display:flex;gap:2px;background:#fff;border-top:1px solid #b6c9db;padding:6px 4px calc(6px + env(safe-area-inset-bottom, 0px));box-shadow:0 -2px 12px rgba(20,40,70,.12);}"
  +"#zunMBar button{flex:1 1 0;display:flex;flex-direction:column;align-items:center;gap:2px;font-size:10px;line-height:1.1;color:#33507a;background:none;border:0;border-radius:10px;padding:7px 2px;min-height:54px;cursor:pointer;position:relative;}"
  +"#zunMBar button .ic{font-size:21px;line-height:1;}"
  +"#zunMBar button.on{background:#e8eef7;font-weight:bold;}"
  +"#zunMBar .dot{position:absolute;top:6px;right:calc(50% - 20px);width:9px;height:9px;border-radius:50%;background:#d33;border:1px solid #fff;}"
  +"#zunMSub{display:flex;gap:6px;margin-bottom:8px;}"
  +"#zunMSub button{flex:1;min-height:40px;border:1px solid #b6c9db;background:#eef4fb;border-radius:10px;font-size:13px;cursor:pointer;}"
  +"#zunMSub button.on{background:#33507a;color:#fff;border-color:#33507a;font-weight:bold;}"
  // modais viram telas cheias no celular
  +"body.zun-mobile #searchModal,body.zun-mobile #profModal,body.zun-mobile #divulgarModal,body.zun-mobile #notfoundModal{padding:0;}"
  +"body.zun-mobile #searchCard,body.zun-mobile #profCard,body.zun-mobile #divulgarCard{max-width:100%;width:100%;min-height:100dvh;border-radius:0;}"
  +"body.zun-mobile #notfoundModal .nfCard{max-width:100%;width:100%;min-height:100dvh;border-radius:0;}"
  // espelho do modo noturno (notify.js) p/ páginas fora do #wrap
  +"body.zun-mobile.zun-night #zunMPages .box{background:#1e1e30!important;color:#e8e8f2!important;border-color:#3a3a5c!important;}"
  +"body.zun-mobile.zun-night #zunMPages .box h3{background:#2a2a45!important;color:#cfd2ff!important;}"
  +"body.zun-mobile.zun-night #zunMPages input,body.zun-mobile.zun-night #zunMPages select,body.zun-mobile.zun-night #zunMPages textarea{background:#262640!important;color:#e8e8f2!important;border-color:#3a3a5c!important;}"
  +"body.zun-mobile.zun-night #zunMPages .box button{background:#2a2a45!important;color:#e8e8f2!important;border-color:#3a3a5c!important;}"
  +"body.zun-mobile.zun-night #zunMPages .chatname{color:#cfd2ff!important;}"
  +"body.zun-mobile.zun-night #zunMPages .chatlog div{border-color:#333!important;}"
  +"body.zun-mobile.zun-night #zunMBar{background:#1e1e30!important;border-color:#3a3a5c!important;}"
  +"body.zun-mobile.zun-night #zunMBar button{color:#cfd2ff!important;}"
  +"body.zun-mobile.zun-night #zunMBar button.on{background:#2a2a45!important;}"
  +"body.zun-mobile.zun-night #zunMSub button{background:#2a2a45!important;color:#e8e8f2!important;border-color:#3a3a5c!important;}"
  +"body.zun-mobile.zun-night #zunMSub button.on{background:#33507a!important;color:#fff!important;}";
  document.head.appendChild(c);
}

// Localiza os boxes sem depender de texto traduzido (por ids internos).
function findBoxes(){
  var wrap = document.getElementById("wrap");
  if(!wrap) return null;
  var cols = wrap.children;
  if(cols.length < 3) return null;
  function boxWith(id){
    var el = document.getElementById(id);
    if(!el) return null;
    return el.closest ? el.closest(".box") : null;
  }
  var bUser = boxWith("authBox"), bPost = boxWith("postBtn"), bFeed = boxWith("feedCtn");
  var bPub = document.getElementById("pubBox"), bPriv = boxWith("privLog");
  var bMir = boxWith("mirBtn"), bSug = boxWith("sugBtn");
  var bSobre = null;
  try{
    var c0 = cols[0].querySelectorAll(":scope > .box");
    for(var i=0;i<c0.length;i++){
      if(c0[i]!==bUser && c0[i]!==bMir && c0[i]!==bSug){ bSobre = c0[i]; break; }
    }
  }catch(e){}
  var bSeo = document.querySelector("#seoBox .box");
  if(!bUser||!bPost||!bFeed||!bPub||!bPriv||!bSobre) return null;
  return {cols:[cols[0],cols[1],cols[2]], user:bUser, sobre:bSobre, mir:bMir, sug:bSug,
    post:bPost, feed:bFeed, pub:bPub, priv:bPriv, seo:bSeo, seoBox:document.getElementById("seoBox")};
}

function build(){
  if(built) return true;
  ensureCss();
  var B = findBoxes();
  if(!B) return false;
  var t = T();
  // registra posição original (ordem de documento)
  saved = [];
  [B.user,B.sobre,B.mir,B.sug,B.post,B.feed,B.pub,B.priv].concat(B.seo?[B.seo]:[]).forEach(function(el){
    if(el) saved.push({el:el, parent:el.parentNode, next:el.nextSibling});
  });
  // páginas (vazias — os boxes só são movidos no activate())
  pagesEl = document.createElement("div");
  pagesEl.id = "zunMPages";
  ["feed","chats","post","conta","mais"].forEach(function(id){
    var s = document.createElement("section");
    s.dataset.tab = id;
    pagesEl.appendChild(s);
  });
  // sub-abas Público|Privado dentro de chats
  subNavEl = document.createElement("div");
  subNavEl.id = "zunMSub";
  var b1 = document.createElement("button"); b1.dataset.chat = "pub"; b1.textContent = t.pub;
  var b2 = document.createElement("button"); b2.dataset.chat = "priv"; b2.textContent = t.priv;
  b1.onclick = function(){ showChat("pub"); };
  b2.onclick = function(){ showChat("priv"); };
  subNavEl.appendChild(b1); subNavEl.appendChild(b2);
  var chatSec = pagesEl.querySelector('section[data-tab="chats"]');
  chatSec.insertBefore(subNavEl, chatSec.firstChild);
  // barra inferior
  barEl = document.createElement("nav");
  barEl.id = "zunMBar";
  [["feed","📰",t.feed],["chats","💬",t.chats],["post","➕",t.post],["conta","👤",t.conta],["mais","☰",t.mais]].forEach(function(d){
    var b = document.createElement("button");
    b.dataset.tab = d[0];
    var ic = document.createElement("span"); ic.className = "ic"; ic.textContent = d[1];
    var lb = document.createElement("span"); lb.textContent = d[2];
    var dot = document.createElement("span"); dot.className = "dot"; dot.hidden = true;
    b.appendChild(ic); b.appendChild(lb); b.appendChild(dot);
    b.onclick = function(){ showTab(d[0]); };
    barEl.appendChild(b);
  });
  built = true;
  return true;
}

function pageOf(node){
  try{
    var s = node.closest ? node.closest("#zunMPages section") : null;
    return s ? s.dataset.tab : null;
  }catch(e){ return null; }
}
function showChat(which){
  storeSet(LS_CHAT, which);
  try{
    var btns = subNavEl.querySelectorAll("button");
    btns.forEach(function(b){ b.classList.toggle("on", b.dataset.chat===which); });
    var pub = document.getElementById("pubBox"), priv = null;
    var pl = document.getElementById("privLog");
    priv = pl ? pl.closest(".box") : null;
    if(pub) pub.hidden = (which!=="pub");
    if(priv) priv.hidden = (which!=="priv");
  }catch(e){}
}
function showTab(id, silent){
  cur = id;
  storeSet(LS_TAB, id);
  try{
    pagesEl.querySelectorAll("section").forEach(function(s){
      s.classList.toggle("on", s.dataset.tab===id);
    });
    barEl.querySelectorAll("button").forEach(function(b){
      b.classList.toggle("on", b.dataset.tab===id);
    });
    if(id==="chats") showChat(store(LS_CHAT, "pub"));
  }catch(e){}
  if(!silent){ try{ window.scrollTo(0,0); }catch(e){} }
}
function syncDots(){
  try{
    var badge = document.getElementById("zunBadge");
    var n = (badge && !badge.hidden) ? badge.textContent : "";
    barEl.querySelectorAll("button").forEach(function(b){
      var dot = b.querySelector(".dot");
      if(!dot) return;
      dot.hidden = !n;
      dot.title = n ? (n+" não lidas") : "";
    });
  }catch(e){}
}
var ucOrig = null;
function dockUc(){
  try{
    var uc = document.getElementById("userCountEl");
    var brand = document.querySelector("#top .top-brand");
    if(!uc || !brand) return;
    if(uc.parentNode === brand) return;
    ucOrig = {parent:uc.parentNode, next:uc.nextSibling};
    brand.appendChild(uc);
  }catch(e){}
}
function undockUc(){
  try{
    var uc = document.getElementById("userCountEl");
    if(!uc || !ucOrig) return;
    if(ucOrig.next && ucOrig.next.parentNode===ucOrig.parent) ucOrig.parent.insertBefore(uc, ucOrig.next);
    else ucOrig.parent.appendChild(uc);
    ucOrig = null;
  }catch(e){}
}

function activate(){
  if(active) return;
  if(!built && !build()) return;
  var B = findBoxes();
  if(!B) return; // boxes fora do lugar — não mexe em nada
  active = true;
  try{
    var secs = {};
    pagesEl.querySelectorAll("section").forEach(function(s){ secs[s.dataset.tab] = s; });
    function mv(el, tab, before){
      if(!el) return;
      var s = secs[tab];
      if(before && s.firstChild) s.insertBefore(el, s.firstChild);
      else s.appendChild(el);
    }
    mv(B.feed,"feed"); mv(B.pub,"chats"); mv(B.priv,"chats");
    mv(B.post,"post"); mv(B.user,"conta");
    mv(B.sobre,"mais"); mv(B.mir,"mais"); mv(B.sug,"mais");
    if(B.seo) mv(B.seo,"mais");
    // subnav volta p/ topo do chats
    var cs = secs.chats;
    cs.insertBefore(subNavEl, cs.firstChild);
    B.cols.forEach(function(c){ c.hidden = true; });
    if(B.seoBox) B.seoBox.hidden = true;
    document.getElementById("wrap").appendChild(pagesEl);
    document.body.appendChild(barEl);
    document.body.classList.add("zun-mobile");
    dockUc();
  }catch(e){ active = false; return; }
  // intercepta scroll/focus p/ abrir a aba certa (ex: notificações)
  if(!origSIV){
    origSIV = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function(){
      try{
        if(active){
          var pg = pageOf(this);
          if(pg && pg!==cur) showTab(pg, true);
          if(pg==="chats"){
            var pb = document.getElementById("pubBox");
            if(pb && (this===pb || pb.contains(this))) showChat("pub");
            var pl = document.getElementById("privLog");
            if(pl && (this===pl || pl.contains(this) || (this.closest&&this.closest(".box")&&this.closest(".box").contains(pl)))) showChat("priv");
          }
        }
      }catch(e){}
      return origSIV.apply(this, arguments);
    };
  }
  if(!origFocus){
    origFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = function(){
      try{
        if(active){
          var pg = pageOf(this);
          if(pg && pg!==cur) showTab(pg, true);
        }
      }catch(e){}
      return origFocus.apply(this, arguments);
    };
  }
  showTab(store(LS_TAB, "feed"), true);
  showChat(store(LS_CHAT, "pub"));
  // espelha badge de não-lidas nas abas
  try{
    var badge = document.getElementById("zunBadge");
    if(badge && !badge._zunMobObs){
      badge._zunMobObs = true;
      new MutationObserver(syncDots).observe(badge, {attributes:true, childList:true, characterData:true, subtree:true});
    }
  }catch(e){}
  syncDots();
  try{ paintNightMirror(); }catch(e){}
}
function deactivate(){
  if(!active) return;
  active = false;
  try{ document.body.classList.remove("zun-mobile"); }catch(e){}
  try{ undockUc(); }catch(e){}
  try{ if(barEl && barEl.parentNode) barEl.parentNode.removeChild(barEl); }catch(e){}
  try{ if(pagesEl && pagesEl.parentNode) pagesEl.parentNode.removeChild(pagesEl); }catch(e){}
  // devolve boxes à posição original
  try{
    saved.forEach(function(r){
      if(!r.el) return;
      if(r.next && r.next.parentNode===r.parent) r.parent.insertBefore(r.el, r.next);
      else r.parent.appendChild(r.el);
    });
    saved.forEach(function(r){
      try{ if(r.el.hasAttribute("hidden") && (r.el.id==="pubBox" || (r.el.querySelector&&r.el.querySelector("#privLog")))) r.el.hidden = false; }catch(e){}
    });
    var B = findBoxes();
    if(B){ B.cols.forEach(function(c){ c.hidden = false; }); if(B.seoBox) B.seoBox.hidden = false; }
  }catch(e){}
}

// espelha estado do modo noturno p/ CSS própria
function paintNightMirror(){
  try{ document.body.classList.toggle("zun-night", !!document.getElementById("zunNightCss")); }catch(e){}
}
try{
  new MutationObserver(paintNightMirror).observe(document.head, {childList:true});
}catch(e){}
try{ paintNightMirror(); }catch(e){}

function onChange(){
  try{ if(MQ.matches) activate(); else deactivate(); }catch(e){}
}
try{
  if(MQ.addEventListener) MQ.addEventListener("change", onChange);
  else if(MQ.addListener) MQ.addListener(onChange);
}catch(e){}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", onChange);
else onChange();
try{ window.zunMobileGo = function(t){ try{ if(active) showTab(t||"feed"); }catch(e){} }; }catch(e){}
})();
