(function(){
"use strict";
var MOB = matchMedia("(max-width:900px)").matches || matchMedia("(pointer:coarse)").matches || (navigator.userAgent||"").length>0 && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent||"");
if(!document.querySelector('meta[name="viewport"]')){
  var m = document.createElement("meta"); m.name = "viewport"; m.content = "width=device-width,initial-scale=1,viewport-fit=cover";
  document.head.appendChild(m);
}
var css = document.createElement("style"); css.id = "zunMobileCss";
css.textContent = ".post,.chatlog div{content-visibility:auto;contain-intrinsic-size:auto 60px}"
+"#zunBadge{display:inline-block;min-width:20px;text-align:center;background:#d33;color:#fff;border-radius:10px;font-size:12px;font-weight:bold;padding:1px 6px;margin-left:8px;cursor:pointer;vertical-align:middle}"
+"#zunBadge[hidden]{display:none!important}"
+"#zunNotifPop{position:fixed;top:52px;right:12px;z-index:9999;background:#fff;border:1px solid #6aa5d7;border-radius:8px;padding:8px 10px;font-size:13px;max-width:280px;box-shadow:0 4px 14px #0003;color:#222;text-align:left}"
+"#zunNotifPop button{margin:2px 4px 2px 0;font-size:12px}"
+"#zunSoundBtn{margin-left:6px}"
+"input,textarea,select{font-size:16px}"
+"@media(max-width:900px){.chatlog{max-height:38vh}#feedCtn{max-height:60vh}#top{position:sticky;top:0;z-index:40}#top button{min-height:36px;padding:6px 10px}#wrap{padding:0 6px}.post img,.post video,.chatimg{height:auto}}"
+"@media(pointer:coarse){.fbar button{min-height:36px;min-width:36px}#pubBtn,#privSendBtn,#postBtn{min-height:44px;padding:8px 14px}}"
+"@media(prefers-reduced-motion:reduce){.spin{animation:none}}";
document.head.appendChild(css);
var BASE_TITLE = document.title || "zunzum";
var store = { get: function(k,d){ try{ var v = localStorage.getItem(k); return v==null?d:v; }catch(e){ return d; } }, set: function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} } };
var soundOn = store.get("zunzumSound","1") !== "0";
var AC = null, lastBeep = 0;
function ac(){
  if(!soundOn) return null;
  try{
    if(!AC) AC = new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state === "suspended") AC.resume();
    return AC;
  }catch(e){ return null; }
}
function tone(f, t0, dur, type, vol){
  var c = ac(); if(!c) return;
  try{
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || "sine"; o.frequency.value = f;
    var t = c.currentTime + (t0||0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol||0.18, t+0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t+dur+0.05);
  }catch(e){}
}
var JINGLES = {
  soft: [[880,0,0.12]],
  mention: [[1320,0,0.1],[1760,0.09,0.14]],
  priv: [[660,0,0.12],[990,0.1,0.14]],
  invite: [[784,0,0.12],[1046,0.11,0.16]],
  depo: [[523,0,0.12],[659,0.1,0.12],[784,0.2,0.18]],
  peak: [[523,0,0.1],[659,0.09,0.1],[784,0.18,0.1],[1046,0.27,0.2]]
};
function play(kind){
  if(!soundOn) return;
  var now = Date.now();
  if(now - lastBeep < 1800 && kind !== "peak" && kind !== "invite") return;
  lastBeep = now;
  (JINGLES[kind]||JINGLES.soft).forEach(function(n){ tone(n[0],n[1],n[2],"sine",0.16); });
}
function buzz(p){ try{ if(navigator.vibrate && MOB) navigator.vibrate(p||[40]); }catch(e){} }
["pointerdown","touchstart","keydown"].forEach(function(ev){
  document.addEventListener(ev, function(){ try{ ac(); }catch(e){} }, {passive:true, once:false});
});
var notifAsked = false;
["pointerdown","touchstart"].forEach(function(ev){
  document.addEventListener(ev, function(){
    if(notifAsked) return; notifAsked = true;
    try{ if("Notification" in window && Notification.permission === "default"){ Notification.requestPermission().catch(function(){}); } }catch(e){ try{ Notification.requestPermission(); }catch(e2){} }
  }, {passive:true});
});
function sysNotify(title, body, tag){
  try{
    if(!("Notification" in window) || Notification.permission !== "granted" || !document.hidden) return;
    var n = new Notification(title, {body:String(body||"").slice(0,140), tag:tag||"zunzum", renotify:true});
    n.onclick = function(){ try{ window.focus(); }catch(e){} try{ n.close(); }catch(e2){} clearAll(); };
    setTimeout(function(){ try{ n.close(); }catch(e){} }, 9000);
  }catch(e){}
}
var unread = {feed:0, pub:0, priv:0, inv:0, depo:0};
var topBar = document.getElementById("top");
var topBtns = document.getElementById("topBtns") || topBar;
var badge = document.getElementById("zunBadge");
if(!badge && topBar){
  badge = document.createElement("span");
  badge.id = "zunBadge"; badge.hidden = true; badge.title = "notificações não lidas — clique p/ ver";
  badge.onclick = function(){ togglePop(); };
  topBtns.appendChild(badge);
} else if(badge){ badge.onclick = function(){ togglePop(); }; try{ if(badge.parentNode!==topBtns) topBtns.appendChild(badge); }catch(e){} }
var sndBtn = document.getElementById("zunSoundBtn");
if(!sndBtn && topBar){
  sndBtn = document.createElement("button");
  sndBtn.id = "zunSoundBtn"; sndBtn.title = "ligar/desligar som de notificação";
  topBtns.appendChild(sndBtn);
} else if(sndBtn){ try{ if(sndBtn.parentNode!==topBtns) topBtns.appendChild(sndBtn); }catch(e){} }
function paintSnd(){ if(sndBtn) sndBtn.textContent = soundOn ? "🔊" : "🔇"; }
if(sndBtn) sndBtn.onclick = function(){ soundOn = !soundOn; store.set("zunzumSound", soundOn?"1":"0"); paintSnd(); if(soundOn) play("soft"); };
paintSnd();
var nightBtn = document.getElementById("zunNightBtn");
if(!nightBtn && topBar){
  nightBtn = document.createElement("button");
  nightBtn.id = "zunNightBtn"; nightBtn.title = "modo noturno: auto / ligado / desligado";
  nightBtn.onclick = function(){
    var cur = store.get("zunzumNight","auto");
    store.set("zunzumNight", cur === "auto" ? "off" : cur === "off" ? "on" : "auto");
    paintNight();
  };
  topBtns.appendChild(nightBtn);
} else if(nightBtn){ try{ if(nightBtn.parentNode!==topBtns) topBtns.appendChild(nightBtn); }catch(e){} }
function nightActive(){
  var p = store.get("zunzumNight","auto");
  if(p === "on") return true;
  if(p === "off") return false;
  var h = new Date().getHours(); return h >= 19 || h < 6;
}
function paintNight(){
  try{
    var el = document.getElementById("zunNightCss"), hasSite = null;
    try{ hasSite = localStorage.getItem("orkutSiteTheme"); }catch(e){}
    if(nightBtn) nightBtn.textContent = nightActive() && !hasSite ? "☀️" : "🌙";
    if(!nightActive() || hasSite){ if(el) el.remove(); return; }
    if(!el){ el = document.createElement("style"); el.id = "zunNightCss"; document.head.appendChild(el); }
    el.textContent = "body{background:#141422!important;color:#e8e8f2!important}#wrap .box,#seoBox,#seoBox .box{background:#1e1e30!important;color:#e8e8f2!important;border-color:#3a3a5c!important}#wrap .box h3,#seoBox h3{background:#2a2a45!important;color:#cfd2ff!important}#top{background:#1e1e30!important;color:#e8e8f2!important}#top .meta{color:#cfd2ff!important}#top button{background:#2a2a45!important;color:#e8e8f2!important;border-color:#4a4a6c!important}#zunNotifPop{background:#1e1e30!important;color:#e8e8f2!important;border-color:#3a3a5c!important}#wrap input,#wrap select,#wrap textarea{background:#262640!important;color:#e8e8f2!important;border-color:#3a3a5c!important}#wrap .box button,#seoBox button{background:#2a2a45!important;color:#e8e8f2!important;border-color:#3a3a5c!important}#wrap .post[data-ai-post]{background:#2a2a45!important;border-color:#3a3a5c!important}#seoBox a{color:#cfd2ff!important}#profCard{background:#1e1e30!important;color:#e8e8f2!important}#profCard .meta{color:#aaa!important}#profCard button{background:#2a2a45!important;color:#e8e8f2!important;border-color:#3a3a5c!important}#profCard input,#profCard select,#profCard textarea{background:#262640!important;color:#e8e8f2!important;border-color:#3a3a5c!important}#profCard a{color:#cfd2ff!important}#profCard .chatname{color:#cfd2ff!important}#profMural h3{color:#cfd2ff!important}#searchCard{background:#1e1e30!important;color:#e8e8f2!important}#searchCard .meta{color:#aaa!important}#searchCard input,#searchCard select,#searchCard textarea{background:#262640!important;color:#e8e8f2!important;border-color:#3a3a5c!important}#searchCard button{background:#2a2a45!important;color:#e8e8f2!important;border-color:#3a3a5c!important}#divulgarCard{background:#1e1e30!important;color:#e8e8f2!important}#divulgarCard .meta{color:#aaa!important}#divulgarCard input,#divulgarCard select,#divulgarCard textarea{background:#262640!important;color:#e8e8f2!important;border-color:#3a3a5c!important}#divulgarCard button{background:#2a2a45!important;color:#e8e8f2!important;border-color:#3a3a5c!important}.chatlog div{border-color:#333!important}.mention,.mention-me{color:#111!important}";
  }catch(e){}
}
paintNight();
function total(){ return unread.feed+unread.pub+unread.priv+unread.inv+unread.depo; }
var KIND_LABEL = {feed:"feed", pub:"chat público", priv:"privado", inv:"convites", depo:"depoimentos"};
var KIND_TARGET = {feed:"feedCtn", pub:"pubLog", priv:"privLog", inv:"privInviteMsg", depo:"profDepo"};
function describe(){
  var parts = [];
  ["feed","pub","priv","inv","depo"].forEach(function(k){ if(unread[k]>0) parts.push(unread[k]+" "+KIND_LABEL[k]); });
  return parts.length ? parts.join(", ") : "nada";
}
function togglePop(){
  var p = document.getElementById("zunNotifPop");
  if(p && !p.hidden){ p.hidden = true; return; }
  showPop();
}
function showPop(){
  var p = document.getElementById("zunNotifPop");
  if(!p){ p = document.createElement("div"); p.id = "zunNotifPop"; document.body.appendChild(p); }
  p.innerHTML = "";
  var t = document.createElement("div");
  t.style.fontWeight = "bold"; t.style.marginBottom = "4px";
  t.textContent = total()>0 ? "não lidas ("+total()+"):" : "nenhuma notificação";
  p.appendChild(t);
  ["feed","pub","priv","inv","depo"].forEach(function(k){
    if(!(unread[k]>0)) return;
    var row = document.createElement("div");
    var b = document.createElement("button");
    b.textContent = "ver "+KIND_LABEL[k]+" ("+unread[k]+")";
    b.onclick = function(){ goKind(k); };
    row.appendChild(b);
    p.appendChild(row);
  });
  var clr = document.createElement("button");
  clr.textContent = total()>0 ? "limpar tudo" : "fechar";
  clr.onclick = function(){ clearAll(); };
  p.appendChild(clr);
  p.hidden = false;
}
function goKind(k){
  clearKind(k);
  if(total()<=0){ var p = document.getElementById("zunNotifPop"); if(p) p.hidden = true; }
  else showPop();
  var id = KIND_TARGET[k];
  var el = id ? document.getElementById(id) : null;
  if(el){ try{ el.scrollIntoView({block:"nearest"}); }catch(e){} try{ var f = el.querySelector("input,textarea"); if(f) f.focus({preventScroll:true}); }catch(e2){} }
}
function paint(){
  var t = total();
  if(badge){ badge.hidden = t<=0; badge.textContent = t>99 ? "99+" : String(t); badge.title = t>0 ? describe()+" — clique p/ ver" : "notificações não lidas"; }
  if(t<=0){ var p = document.getElementById("zunNotifPop"); if(p) p.hidden = true; }
  try{
    document.title = t>0 ? "("+t+") "+BASE_TITLE : BASE_TITLE;
    var fav = document.querySelector("link[rel~='icon']");
    if(fav && !fav.dataset.orig) fav.dataset.orig = fav.href;
  }catch(e){}
}
function bump(kind, sound, custom){
  unread[kind] = Math.min(99, (unread[kind]||0)+1);
  paint();
  if(sound){ play(sound); }
  try{
    if(document.hidden && sound){
      var titles = {feed:"novo post no feed", pub:"nova mensagem no chat", priv:"nova mensagem privada", inv:"convite p/ privado", depo:"novo depoimento"};
      var t = (custom && custom.title) || ("zunzum · " + (titles[kind] || "novidade"));
      var b = (custom && custom.body) || (kind === "inv" ? "alguém te convidou p/ o privado — toque p/ abrir" : kind === "depo" ? "alguém deixou depoimento p/ você — toque p/ ver" : "toque p/ abrir o zunzum");
      sysNotify(t, b, "zun-" + kind);
    }
  }catch(e){}
}
function clearKind(k){ unread[k]=0; paint(); }
function clearAll(){ unread.feed=unread.pub=unread.priv=unread.inv=unread.depo=0; paint(); }
function myNick(){
  try{
    var s = JSON.parse(localStorage.getItem("orkutSession")||"null");
    return (s && s.nick ? String(s.nick).toLowerCase() : "");
  }catch(e){ return ""; }
}
function mentionsMe(text){
  var n = myNick(); if(!n) return false;
  return new RegExp("(^|\\s)@"+n+"\\b","i").test(String(text||""));
}
document.addEventListener("visibilitychange", function(){ if(!document.hidden){ BASE_TITLE = BASE_TITLE.replace(/^\(\d+\)\s*/,""); clearAll(); } });
function seenStoreKey(kind){ return "zunzumSeen_"+kind; }
function loadSeen(kind){
  var s = {};
  try{
    var a = JSON.parse(localStorage.getItem(seenStoreKey(kind))||"null");
    if(Array.isArray(a)) a.forEach(function(k){ if(typeof k==="string") s[k]=1; });
  }catch(e){}
  return s;
}
var seenSaveAt = {};
function saveSeen(kind, seen){
  try{
    var now = Date.now();
    if(seenSaveAt[kind] && now-seenSaveAt[kind]<5000) return;
    seenSaveAt[kind] = now;
    localStorage.setItem(seenStoreKey(kind), JSON.stringify(Object.keys(seen).slice(-300)));
  }catch(e){}
}
function watch(id, kind, soundKind){
  var el = document.getElementById(id);
  if(!el || el._zunWatch) return;
  el._zunWatch = true;
  var pending = [];
  var seen = loadSeen(kind), order = Object.keys(seen), primed = false;
  function keyOf(n){
    var tm = "";
    try{ var me2 = n.querySelector ? n.querySelector(".meta") : null; tm = me2 ? me2.textContent : ""; }catch(e){}
    return ((n.textContent||"").slice(0,120)+"|"+tm).slice(0,200);
  }
  function remember(k){
    if(seen[k]) return false;
    seen[k] = 1; order.push(k);
    if(order.length>600){ var old = order.shift(); try{ delete seen[old]; }catch(e){} }
    saveSeen(kind, seen);
    return true;
  }
  try{ Array.prototype.forEach.call(el.childNodes, function(n){ if(n.nodeType===1) remember(keyOf(n)); }); }catch(e){}
  try{ localStorage.setItem(seenStoreKey(kind), JSON.stringify(Object.keys(seen).slice(-300))); }catch(e){}
  var mo = new MutationObserver(function(muts){
    muts.forEach(function(mu){
      mu.addedNodes.forEach(function(n){
        if(n.nodeType===1) pending.push(n);
      });
    });
    if(!pending.length) return;
    requestAnimationFrame(function(){
      var nodes = pending.splice(0, pending.length);
      if(!primed){
        primed = true;
        nodes.forEach(function(n){ remember(keyOf(n)); });
        return;
      }
      var me = myNick();
      nodes.forEach(function(n){
        var k = keyOf(n);
        if(!remember(k)) return;
        var txt = (n.textContent||"").slice(0,600);
        var sender = "";
        try{ var cn = n.querySelector ? n.querySelector(".chatname") : null; sender = cn ? cn.textContent.replace(/^@/,"").toLowerCase() : ""; }catch(e){}
        if(me && sender && sender===me) return;
        try{ var ZB = window.ZunBlock || null; if(ZB && ZB.hasAcc()){ var sn0 = String(sender||"").replace(/^@/,"").toLowerCase(); if(sn0 && ZB.blocked(sn0)){ try{ n.remove(); }catch(e){} return; } if(ZB.quiet(sn0)) return; } }catch(e){}
        if(n.dataset && n.dataset.joinNick){
          var jn = String(n.dataset.joinNick||"");
          if(me && jn.toLowerCase()===me) return;
          return;
        }
        var mine = false;
        try{
          if(me && new RegExp("@"+me+"\\b","i").test(txt) && n.querySelector && n.querySelector(".chatname") && n.querySelector(".chatname").textContent.toLowerCase().indexOf(me)>=0) mine = true;
        }catch(e){}
        if(mine) return;
        if(kind==="pub"){
          if(mentionsMe(txt)){ bump("pub","mention"); buzz([50,40,50]); }
          else if(document.hidden){ bump("pub","soft"); }
          else {
            var log = document.getElementById("pubLog");
            if(log && (log.scrollHeight - log.scrollTop - log.clientHeight > 120)) bump("pub", null);
          }
        }else if(kind==="priv"){
          if(mentionsMe(txt)){
            var from = sender ? "@"+sender : "alguém";
            bump("priv","mention",{title:"zunzum · te mencionaram no privado",body:from+": "+txt.slice(0,120)});
            buzz([50,40,50]);
          } else {
            bump("priv", document.hidden ? "priv" : "soft"); buzz([40]);
          }
        }else if(kind==="feed"){
          if(mentionsMe(txt)){ bump("feed","mention"); }
        }
      });
    });
  });
  mo.observe(el, {childList:true});
}
function hook(name, fn){
  try{
    var prev = window[name];
    if(typeof prev !== "function" || prev._zunHooked) return;
    var w = function(){ try{ var a0 = String(arguments[0]||"").replace(/^@/,""); if(a0 && window.ZunBlock && window.ZunBlock.quiet(a0)) return; }catch(e){} try{ fn.apply(null, arguments); }catch(e){} return prev.apply(this, arguments); };
    w._zunHooked = true;
    window[name] = w;
  }catch(e){}
}
hook("notifyDepo", function(from){ bump("depo","depo"); buzz([50,40,80]); });
hook("notifyPrivJoin", function(nick){ var m = myNick(); if(m && String(nick||"").toLowerCase()===m) return; bump("priv","invite",{title:"zunzum · entrou no privado",body:"@"+String(nick||"").slice(0,20)+" entrou no privado pela primeira vez"}); buzz([60,50,60]); });
hook("queuePrivReq", function(from, room){ bump("priv","invite",{title:"zunzum · pedido p/ entrar",body:"@"+String(from||"").slice(0,20)+" quer entrar na sua sala "+String(room||"").slice(0,30)}); buzz([60,50,60]); });
hook("notifyPrivApproved", function(){ bump("priv","invite",{title:"zunzum · liberado!",body:"o dono aprovou sua entrada no privado — toque p/ abrir"}); buzz([60,50,60]); });
hook("queuePrivInvite", function(){ bump("inv","invite"); buzz([60,50,60]); });
hook("celebratePeak", function(){ play("peak"); });
hook("paintInviteToast", function(){ bump("inv", null); });
watch("pubLog","pub");
watch("privLog","priv");
watch("feedCtn","feed");
[["pubInput","pub"],["privMsgInput","priv"],["feedCtn","feed"]].forEach(function(p){
  var el = document.getElementById(p[0]);
  if(!el) return;
  el.addEventListener("focus", function(){ clearKind(p[1]); }, {passive:true});
  el.addEventListener("pointerdown", function(){ clearKind(p[1]); }, {passive:true});
});
try{
  var thMeta = document.createElement("meta"); thMeta.name = "theme-color"; thMeta.content = "#6aa5d7"; document.head.appendChild(thMeta);
  var manLink = document.createElement("link"); manLink.rel = "manifest"; manLink.href = "src/manifest.webmanifest"; document.head.appendChild(manLink);
    var appleIcon = document.createElement("link"); appleIcon.rel = "apple-touch-icon"; appleIcon.href = "https://user.uploads.dev/file/c8408537dd35bb624eee9560b37e5fa8.jpg"; document.head.appendChild(appleIcon);
  try{ if("serviceWorker" in navigator){ window.addEventListener("load", function(){ try{ navigator.serviceWorker.register("sw.js").catch(function(){}); }catch(e){} }); } }catch(e){}
  window.addEventListener("beforeinstallprompt", function(e){
    try{
      e.preventDefault();
      if(document.getElementById("zunInstallBtn") || !topBar) return;
      var ib = document.createElement("button"); ib.id = "zunInstallBtn"; ib.textContent = "📲 instalar app";
      ib.onclick = function(){ try{ e.prompt(); }catch(err){} };
      topBar.appendChild(ib);
    }catch(err){}
  });
}catch(e){}
window.ZNotify = { bump:bump, play:play, clearAll:clearAll, clearKind:clearKind, showPop:showPop, get muted(){ return !soundOn; }, isMobile: MOB };
paint();
})();
