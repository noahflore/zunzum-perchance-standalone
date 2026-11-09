(function(){
"use strict";
/* ZUN SAVER — modo economia de internet (rede fraca / dados móveis).
   Pedido do dono (2026-11-09): "mapear o site todo e criar uma função de
   economia de internet para rede fraca e deixa ativado automaticamente se
   for dados móveis".

   MAPA DO SITE (onde a internet vai — o que o saver segura):
   1) POLLERS (REST Supabase, JSON pequeno mas somado): feed+pub+presence a
      cada 60s (app.js), nodal 10s (nodal.js), dj ao-vivo 15s + seguir 12s
      (djsync.js), gifmoji 120s (gifmoji.js), views 60s + seo 15s/60s.
      → saver pula 2 de cada 3 ticks (feed 60s→180s, nodal 10s→30s...).
      Tick de usuário (postar, trocar de sala, voltar p/ aba) NÃO é pulado.
   2) MÍDIA (o grosso dos MBs): fotos/vídeos do feed, chats pub/priv, DMs,
      nodais, depoimentos, busca; fachadas YouTube (thumb+iframe); GIFs da
      galera; bichinho/pet e festa (imagens/CSS). Avatares (20px) e logo NÃO
      entram — são KBs e quebram navegação se sumirem.
   3) TERCEIROS: Twemoji SVG (jsdelivr, 1 por emoji diferente), gifuct/gifenc
      via esm.sh (só quando abre picker/converte), YouTube iframe_api (só no
      DJ). → saver troca Twemoji por glifo nativo e segura fachada do YT.
   4) TEMPO REAL (websocket Supabase): BARATO perto do polling e evita
      refetch — o saver NÃO desliga (o eco L3 é que desliga em teto de cota).
   5) LAZY (_lazyQueue, 1x): music/djsync/mirror/zunzunzinha — JS pequeno,
      o custo é o runtime; com o skip acima já cai sozinho. Sem bloqueio.
   O que o saver faz: classe body.zun-saver (mata animação/festa/pulso),
   click-to-load em foto/vídeo/YT, Twemoji→texto, skip de pollers, botão +
   barra com contador de MB poupados. Sem login, sem servidor, por aparelho.
*/
var LS = "zunzumSaverMode"; // "auto" (padrão) | "on" | "off"
var mode = "auto";
try{ var _m = String(localStorage.getItem(LS)||"auto").toLowerCase(); if(_m==="on"||_m==="off"||_m==="auto") mode = _m; }catch(e){}
try{
  var _q = String(new URLSearchParams(location.search).get("saver")||new URLSearchParams(location.search).get("economia")||"").toLowerCase();
  if(_q==="1"||_q==="on") mode = "on";
  else if(_q==="0"||_q==="off") mode = "off";
}catch(e){}
function conn(){
  try{ return navigator.connection||navigator.mozConnection||navigator.webkitConnection||null; }catch(e){ return null; }
}
function netInfo(){
  var c = conn(), o = {type:"", eff:"", save:false, down:0, rtt:0};
  try{
    if(c){
      o.type = String(c.type||"").toLowerCase();
      o.eff = String(c.effectiveType||"").toLowerCase();
      o.save = (c.saveData===true);
      o.down = +c.downlink||0;
      o.rtt = +c.rtt||0;
    }
  }catch(e){}
  return o;
}
function autoWant(){
  var n = netInfo();
  if(n.save) return true; // usuário pediu economia no Android/Chrome
  if(n.type==="cellular") return true; // <-- dados móveis: liga sozinho
  if(n.eff==="slow-2g"||n.eff==="2g"||n.eff==="3g") return true; // rede fraca
  if(n.down>0 && n.down<0.7) return true;
  if(n.rtt>800) return true;
  return false;
}
function isOn(){
  if(mode==="on") return true;
  if(mode==="off") return false;
  return autoWant();
}
var _cnt = {};
function saverSkip(key, k){
  try{
    if(!isOn()){ return false; }
    k = Math.max(2, +k||3);
    _cnt[key] = ((_cnt[key]||0)+1);
    return (_cnt[key]%k)!==0;
  }catch(e){ return false; }
}
try{
  window.__saverOn = isOn;
  window.__saverSkip = saverSkip;
  window.__saverNet = netInfo;
}catch(e){}
var LANG = "pt";
try{ LANG = String(window.zunzumLang||(navigator.language||"pt")).toLowerCase().slice(0,2); }catch(e){}
if(LANG!=="en"&&LANG!=="es") LANG = "pt";
var T = {
  on:  LANG==="en"?"on (saving)":LANG==="es"?"activo (ahorrando)":"ligada (economizando)",
  off: LANG==="en"?"off":LANG==="es"?"desactivado":"desligada",
  auto: LANG==="en"?"auto":LANG==="es"?"auto":"auto",
  btn: LANG==="en"?"🌱 saver":LANG==="es"?"🌱 ahorro":"🌱 economia",
  tip: LANG==="en"?"data saver (tap: auto→ON→OFF)":LANG==="es"?"ahorro de datos (toca: auto→ON→OFF)":"economia de internet (toque: auto→ON→OFF)",
  btnOn:  LANG==="en"?"🌿 saver ON":LANG==="es"?"🌿 ahorro ON":"🌿 economia ON",
  bar: LANG==="en"?"🌿 saver ON — photos/videos load on tap · updates every ~3 min":"🌿 ahorro activo — fotos/videos solo al tocar · se actualiza cada ~3 min",
  bar2: "🌿 economia ativa — fotos/vídeos só ao tocar · atualiza a cada ~3 min",
  load: LANG==="en"?"load visible media":LANG==="es"?"cargar lo visible":"carregar o da tela",
  turnOff: LANG==="en"?"turn off":LANG==="es"?"apagar":"desligar",
  photo: LANG==="en"?"📷 photo — tap to load":LANG==="es"?"📷 foto — toca para cargar":"📷 foto — tocar p/ carregar",
  gif: LANG==="en"?"🎞️ GIF — tap to load":LANG==="es"?"🎞️ GIF — toca para cargar":"🎞️ GIF — tocar p/ carregar",
  video: LANG==="en"?"🎬 video — tap to load":LANG==="es"?"🎬 video — toca para cargar":"🎬 vídeo — tocar p/ carregar",
  yt: LANG==="en"?"▶ YouTube video — tap to load":LANG==="es"?"▶ video de YouTube — toca para cargar":"▶ vídeo do YouTube — tocar p/ carregar",
  audio: LANG==="en"?"🎧 audio — tap to load":LANG==="es"?"🎧 audio — toca para cargar":"🎧 áudio — tocar p/ carregar",
  file: LANG==="en"?"📎 file — tap to load":LANG==="es"?"📎 archivo — toca para cargar":"📎 arquivo — tocar p/ carregar"
};
if(LANG!=="en"&&LANG!=="es") T.bar = T.bar2;
var blocked = 0, estKB = 0;
function estAdd(kind, url){
  var kb = 150;
  try{
    var u = String(url||"").toLowerCase();
    if(kind==="video") kb = 2500;
    else if(kind==="yt") kb = 300;
    else if(kind==="audio") kb = 800;
    else if(/\.gif(\?|$)/.test(u)) kb = 800;
  }catch(e){}
  blocked++; estKB += kb;
}
function fmtMB(){
  if(estKB<1024) return String(Math.round(estKB)+" KB");
  return String((estKB/1024).toFixed(1)).replace(".",",")+" MB";
}
/* ---------- CSS ---------- */
try{
  if(!document.getElementById("zunSaverCss")){
    var st = document.createElement("style");
    st.id = "zunSaverCss";
    st.textContent =
      "body.zun-saver *:not(.spin):not(.av-loading){animation:none!important;transition:none!important}"
      + "body.zun-saver .avfx{animation:none!important;opacity:.9}"
      + "body.zun-saver #zCombo{display:none!important}"
      + "html body #zunSaverBtn.on{background:#111;color:#fff;border-color:#111}"
      + "html body #zunSaverBar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#FFF7FB;border:3px ridge #F896C8;border-radius:10px;box-shadow:4px 4px 0 #E664AE;padding:6px 10px;margin:8px auto;max-width:1100px;font-size:13px;color:#111;box-sizing:border-box}"
      + "html body #zunSaverBar button{background:#FFDAED;color:#111;border:2px solid #E664AE;border-radius:6px;box-shadow:2px 2px 0 #E664AE;font-weight:bold;cursor:pointer;font-size:12px;padding:3px 10px}"
      + "html body .zun-saver-ph{display:flex;align-items:center;gap:8px;background:#FFF7FB;border:2px dashed #E664AE;border-radius:8px;padding:8px 10px;margin-top:6px;font-size:13px;color:#111;max-width:100%}"
      + "html body .zun-saver-ph button{background:#FFDAED;color:#111;border:2px solid #E664AE;border-radius:999px;box-shadow:2px 2px 0 #E664AE;font-weight:bold;cursor:pointer;flex:none;font-size:12px;padding:3px 10px}"
      + "html body .zun-saver-ph .meta{font-size:11px;opacity:.75}"
      + "html body.zun-night:not([data-zunfesta]) #zunSaverBtn.on{background:#FFDD00!important;color:#111!important;border-color:#FFDD00!important}"
      + "html body.zun-night:not([data-zunfesta]) #zunSaverBar{background:#17143B!important;color:#E7C8E7!important;border:3px ridge #6A3E9A!important;box-shadow:4px 4px 0 #6A3E9A!important}"
      + "html body.zun-night:not([data-zunfesta]) #zunSaverBar button{background:#4A227B!important;color:#E7C8E7!important;border:2px solid #9663C9!important;box-shadow:2px 2px 0 #6A3E9A!important}"
      + "html body.zun-night:not([data-zunfesta]) .zun-saver-ph{background:#4A227B!important;color:#E7C8E7!important;border-color:#9663C9!important}"
      + "html body.zun-night:not([data-zunfesta]) .zun-saver-ph button{background:#17143B!important;color:#E7C8E7!important;border:2px solid #9663C9!important;box-shadow:2px 2px 0 #6A3E9A!important}"
      + "html body[data-zunfesta] #zunSaverBar{background:var(--zf-card,#4A227B)!important;color:var(--zf-ink,#E7C8E7)!important;border-color:var(--zf-line,#6A3E9A)!important}"
      + "html body[data-zunfesta] #zunSaverBar button{background:var(--zf-ac,#C266A7)!important;color:var(--zf-on,#E7C8E7)!important;border-color:var(--zf-line,#6A3E9A)!important}"
      + "html body[data-zunfesta][data-zunfesta] #zunSaverBtn{background:var(--zf-card,#4A227B)!important;color:var(--zf-ink,#E7C8E7)!important;border-top-color:var(--zf-card,#4A227B)!important;border-left-color:var(--zf-card,#4A227B)!important;border-bottom-color:var(--zf-line,#6A3E9A)!important;border-right-color:var(--zf-line,#6A3E9A)!important}"
      + "html body[data-zunfesta][data-zunfesta] #zunSaverBtn.on{background:var(--zf-ac,#C266A7)!important;color:var(--zf-on,#E7C8E7)!important;border-color:var(--zf-line,#6A3E9A)!important}"
      + "html body[data-zunfesta] .zun-saver-ph{background:var(--zf-card,#4A227B)!important;color:var(--zf-ink,#E7C8E7)!important;border-color:var(--zf-line,#6A3E9A)!important}"
      + "html body[data-zunfesta] .zun-saver-ph button{background:var(--zf-ac,#C266A7)!important;color:var(--zf-on,#E7C8E7)!important;border-color:var(--zf-line,#6A3E9A)!important}";
    document.head.appendChild(st);
  }
}catch(e){}
/* ---------- botão no topo + barra ---------- */
var btn = null, bar = null, barMsg = null, barStat = null;
function btnLabel(){
  var on = isOn();
  var full = on ? T.btnOn : T.btn;
  var sp = full.split(" ");
  var ico = sp.shift();
  return ico + '<span class="btn-txt"> ' + sp.join(" ") + "</span>";
}
function paintBtn(){
  try{
    if(!btn) return;
    var on = isOn();
    btn.innerHTML = btnLabel();
    btn.classList.toggle("on", !!on);
    var n = netInfo();
    var why = on ? (" ("+T.on+(mode==="auto" ? (n.type==="cellular"?" · dados móveis":(n.eff?" · rede "+n.eff:" · rede fraca")):"")+")")
                 : (" ("+(mode==="auto"?T.auto:T.off)+")");
    btn.title = T.tip + " — " + (on?T.on:T.off) + (mode==="auto"?" ("+T.auto+")":"");
  }catch(e){}
}
function paintBar(){
  try{
    if(!bar) return;
    var on = isOn();
    bar.hidden = !on;
    if(on && barMsg) barMsg.textContent = T.bar;
    if(on && barStat) barStat.textContent = blocked>0 ? ("· "+blocked+" mídias seguradas (~"+fmtMB()+")") : "";
  }catch(e){}
}
function apply(){
  try{ document.body.classList.toggle("zun-saver", !!isOn()); }catch(e){}
  paintBtn(); paintBar();
  try{ document.dispatchEvent(new CustomEvent("zun-saver", {detail:{on:isOn(), mode:mode}})); }catch(e){}
}
function cycle(){
  mode = (mode==="auto") ? "on" : (mode==="on" ? "off" : "auto");
  try{ localStorage.setItem(LS, mode); }catch(e){}
  try{ if(!isOn()){ for(var k in _cnt){ try{ _cnt[k]=0; }catch(e){} } } }catch(e){}
  apply();
}
function ensureBtn(){
  try{
    if(btn && btn.isConnected) return true;
    var box = document.getElementById("topBtns");
    if(!box) return false;
    if(document.getElementById("zunSaverBtn")){ btn = document.getElementById("zunSaverBtn"); paintBtn(); return true; }
    btn = document.createElement("button");
    btn.id = "zunSaverBtn";
    btn.type = "button";
    btn.onclick = cycle;
    box.appendChild(btn);
    paintBtn();
    return true;
  }catch(e){ return false; }
}
function ensureBar(){
  try{
    if(bar && bar.isConnected) return true;
    if(document.getElementById("zunSaverBar")){ bar = document.getElementById("zunSaverBar"); barMsg = bar.querySelector("[data-svmsg]"); barStat = bar.querySelector("[data-svstat]"); paintBar(); return true; }
    var top = document.getElementById("top");
    if(!top || !top.parentNode) return false;
    bar = document.createElement("div");
    bar.id = "zunSaverBar";
    bar.hidden = true;
    barMsg = document.createElement("span");
    barMsg.setAttribute("data-svmsg","");
    bar.appendChild(barMsg);
    barStat = document.createElement("span");
    barStat.setAttribute("data-svstat","");
    barStat.className = "meta";
    bar.appendChild(barStat);
    var bLoad = document.createElement("button");
    bLoad.type = "button"; bLoad.textContent = T.load;
    bLoad.onclick = function(){ try{ loadVisible(); }catch(e){} };
    bar.appendChild(bLoad);
    var bOff = document.createElement("button");
    bOff.type = "button"; bOff.textContent = T.turnOff;
    bOff.onclick = function(){ mode = "off"; try{ localStorage.setItem(LS, mode); }catch(e){} apply(); };
    bar.appendChild(bOff);
    top.parentNode.insertBefore(bar, top.nextSibling);
    paintBar();
    return true;
  }catch(e){ return false; }
}
/* ---------- click-to-load ---------- */
function inAvatar(el){
  try{ return !!(el.closest && el.closest(".miniAv,#avatarEl,#profAvatar,#pubPhotoEl,.uav,.zun-dm-av,.zun-fav,#topLogoImg,.avfx")); }catch(e){ return false; }
}
function inContent(el){
  try{
    if(!el || !el.closest) return false;
    return !!(el.closest("#feedCtn,#pubLog,#privLog,#nodalLog,#searchLinks,#profDepo,#profMural,#zunDMRoot,#divulgarCard .g-feat,.s-photo"));
  }catch(e){ return false; }
}
function alreadyLive(img){
  try{ return !!(img.complete && img.naturalWidth>0); }catch(e){ return false; }
}
function phFor(kind, url){
  var s = document.createElement("span");
  s.className = "zun-saver-ph";
  var b = document.createElement("button");
  b.type = "button";
  b.textContent = kind==="video"?T.video:kind==="yt"?T.yt:kind==="audio"?T.audio:kind==="gif"?T.gif:(/\.(mp3|ogg|wav|m4a)(\?|$)/i.test(String(url||""))?T.audio:T.photo);
  s.appendChild(b);
  var m = document.createElement("span");
  m.className = "meta";
  try{
    var u = String(url||"");
    var nm = u.split("?")[0].split("/").pop().slice(0,28);
    m.textContent = nm ? (" "+nm) : "";
  }catch(e){}
  s.appendChild(m);
  return {box:s, btn:b};
}
function clearPxMark(el){
  // libera p/ o proxy reavaliar no próximo pump (privacidade mantida no load explícito)
  try{ if(el && el.dataset && el.dataset.zunpx && el.dataset.zunpx!=="px") delete el.dataset.zunpx; }catch(e){}
}
function holdImg(img){
  try{
    if(!img || img.dataset.zunSaver || img.dataset.zunSaverOff) return false;
    if(inAvatar(img)) return false;
    try{ if(img.closest && img.closest(".zun-saver-ph")) return false; }catch(e){}
    try{ if(img.closest && img.closest(".ytFac")) return false; }catch(e){} // a fachada cobre o thumb
    if(!inContent(img)) return false;
    var cls = String(img.className||"");
    if(/(^|\s)zem-uni(\s|$)/.test(cls)){
      // Twemoji remoto → glifo nativo (economiza o SVG sem perder o emoji)
      var alt = img.getAttribute("alt")||"•";
      var sp = document.createElement("span");
      sp.textContent = alt;
      sp.setAttribute("data-zun-saver-tw","1");
      img.parentNode.replaceChild(sp, img);
      estKB += 4;
      return true;
    }
    if(/zem-anim|zEmoji|zun-emoji/.test(cls)) return false;
    var src = img.getAttribute("src")||img.currentSrc||"";
    if(!src || /^data:/i.test(src)) return false;
    if(alreadyLive(img)) return false;
    var isGif = /\.gif(\?|$)/i.test(src);
    img.dataset.zunSaver = "1";
    img.dataset.zunSaverSrc = src;
    var ss = img.getAttribute("srcset");
    if(ss){ img.dataset.zunSaverSrcset = ss; }
    try{ img.removeAttribute("src"); }catch(e){}
    try{ img.removeAttribute("srcset"); }catch(e){}
    try{ img.loading = "lazy"; }catch(e){}
    try{ img.hidden = true; }catch(e){}
    var ph = phFor(isGif?"gif":"img", src);
    estAdd(isGif?"gif":"img", src);
    ph.btn.onclick = function(){
      try{
        var s0 = img.dataset.zunSaverSrc||"";
        if(s0) img.src = s0;
        var s1 = img.dataset.zunSaverSrcset||"";
        if(s1){ try{ img.srcset = s1; }catch(e){} }
        img.hidden = false;
        try{ delete img.dataset.zunSaver; }catch(e){ try{ img.removeAttribute("data-zun-saver"); }catch(_){} }
        try{ img.dataset.zunSaverOff = "1"; }catch(e){} // usuário liberou: não segurar de novo
        clearPxMark(img);
        if(ph.box.parentNode) ph.box.parentNode.removeChild(ph.box);
        paintBar();
      }catch(e){}
    };
    try{ img.parentNode.insertBefore(ph.box, img); }catch(e){ return false; }
    paintBar();
    return true;
  }catch(e){ return false; }
}
function holdVideo(v){
  try{
    if(!v || v.dataset.zunSaver || v.dataset.zunSaverOff) return false;
    if(!inContent(v)) return false;
    var src = v.getAttribute("src")||"";
    try{
      if(!src){
        var s1 = v.querySelector("source[src]");
        if(s1) src = s1.getAttribute("src")||"";
      }
    }catch(e){}
    if(!src) return false;
    v.dataset.zunSaver = "1";
    v.dataset.zunSaverSrc = src;
    try{ v.pause(); }catch(e){}
    try{ v.removeAttribute("src"); }catch(e){}
    try{
      var ss = v.querySelectorAll("source[src]");
      for(var i=0;i<ss.length;i++){ var s = ss[i]; s.dataset.zunSaverSrc = s.getAttribute("src")||""; try{ s.removeAttribute("src"); }catch(e){} }
    }catch(e){}
    try{ v.preload = "none"; }catch(e){}
    try{ v.hidden = true; }catch(e){}
    try{ v.load(); }catch(e){}
    var ph = phFor("video", src);
    estAdd("video", src);
    ph.btn.onclick = function(){
      try{
        var s0 = v.dataset.zunSaverSrc||"";
        if(s0 && !v.getAttribute("src")) v.src = s0;
        try{
          var rs = v.querySelectorAll("source[data-zun-saver-src]");
          for(var j=0;j<rs.length;j++){ var r = rs[j]; if(!r.getAttribute("src")) r.src = r.dataset.zunSaverSrc||""; }
        }catch(e){}
        v.hidden = false;
        try{ v.controls = true; }catch(e){}
        try{ v.load(); }catch(e){}
        try{ delete v.dataset.zunSaver; }catch(e){ try{ v.removeAttribute("data-zun-saver"); }catch(_){} }
        try{ v.dataset.zunSaverOff = "1"; }catch(e){} // usuário liberou: não segurar de novo
        if(ph.box.parentNode) ph.box.parentNode.removeChild(ph.box);
        paintBar();
      }catch(e){}
    };
    try{ v.parentNode.insertBefore(ph.box, v); }catch(e){ return false; }
    paintBar();
    return true;
  }catch(e){ return false; }
}
function holdYt(fac){
  try{
    if(!fac || fac.dataset.zunSaver || fac.dataset.zunSaverOff) return false;
    fac.dataset.zunSaver = "1";
    var id = "";
    try{ id = fac.getAttribute("data-ytid")||""; }catch(e){}
    var html = "";
    try{ html = fac.innerHTML; }catch(e){}
    fac.dataset.zunSaverHtml = "__kept__"; // não guarda HTML (pode ser grande); reconstrói no clique
    try{ fac.setAttribute("data-zun-saver-ythtml-len", String(html.length||0)); }catch(e){}
    fac.innerHTML = "";
    var ph = phFor("yt", "https://youtu.be/"+id);
    estAdd("yt", id);
    ph.btn.onclick = function(){
      try{
        delete fac.dataset.zunSaver;
        try{ fac.dataset.zunSaverOff = "1"; }catch(e){} // usuário liberou: não segurar de novo
        fac.innerHTML = html;
        if(ph.box.parentNode) ph.box.parentNode.removeChild(ph.box);
        paintBar();
      }catch(e){}
    };
    fac.appendChild(ph.box);
    paintBar();
    return true;
  }catch(e){ return false; }
}
function sweep(root){
  try{
    if(!isOn()) return;
    var scope = root||document;
    var imgs = null, vids = null, yts = null;
    try{ imgs = scope.querySelectorAll ? scope.querySelectorAll("img") : []; }catch(e){ imgs = []; }
    try{ vids = scope.querySelectorAll ? scope.querySelectorAll("video") : []; }catch(e){ vids = []; }
    try{ yts = scope.querySelectorAll ? scope.querySelectorAll(".ytFac:not([data-playing]):not([data-zun-saver])") : []; }catch(e){ yts = []; }
    var i;
    if(yts) for(i=0;i<yts.length;i++){ try{ holdYt(yts[i]); }catch(e){} }
    if(imgs) for(i=0;i<imgs.length;i++){ try{ holdImg(imgs[i]); }catch(e){} }
    if(vids) for(i=0;i<vids.length;i++){ try{ holdVideo(vids[i]); }catch(e){} }
  }catch(e){}
}
var _sweepT = null;
function sweepSoon(){
  try{
    if(_sweepT) return;
    _sweepT = setTimeout(function(){ _sweepT = null; try{ sweep(document); }catch(e){} }, 300);
  }catch(e){}
}
function loadVisible(){
  try{
    var boxes = document.querySelectorAll(".zun-saver-ph button");
    var vh = window.innerHeight||800;
    var n = 0;
    for(var i=0;i<boxes.length && n<30;i++){
      try{
        var r = boxes[i].getBoundingClientRect();
        if(r.top>-200 && r.top<vh+600){ boxes[i].click(); n++; }
      }catch(e){}
    }
    return n;
  }catch(e){ return 0; }
}
try{
  var _mo = new MutationObserver(function(muts){
    try{
      if(!isOn()) return;
      for(var i=0;i<muts.length;i++){
        var mu = muts[i];
        if(mu.addedNodes && mu.addedNodes.length){ sweepSoon(); break; }
      }
    }catch(e){}
  });
  try{ _mo.observe(document.documentElement||document.body, {childList:true, subtree:true}); }catch(e){}
}catch(e){}
try{
  var _c = conn();
  if(_c && _c.addEventListener){
    _c.addEventListener("change", function(){
      try{
        if(mode!=="auto") return;
        for(var k in _cnt){ try{ _cnt[k]=0; }catch(e){} }
        apply();
        sweepSoon();
      }catch(e){}
    });
  }
}catch(e){}
window.ZunSaver = {
  isOn:isOn, mode:function(){ return mode; },
  set:function(m){ if(m==="on"||m==="off"||m==="auto"){ mode = m; try{ localStorage.setItem(LS, mode); }catch(e){} apply(); sweepSoon(); } return mode; },
  loadVisible:loadVisible,
  stats:function(){ return {blocked:blocked, estKB:Math.round(estKB), on:isOn(), mode:mode, net:netInfo()}; }
};
var _tries = 0;
var _bootIv = setInterval(function(){
  try{
    _tries++;
    var a = ensureBtn(), b = ensureBar();
    if(a && b){ clearInterval(_bootIv); }
    else if(_tries>40){ clearInterval(_bootIv); }
    apply();
    if(isOn()) sweepSoon();
  }catch(e){}
}, 800);
try{ apply(); }catch(e){}
try{ if(isOn()) setTimeout(function(){ try{ sweep(document); }catch(e){} }, 1200); }catch(e){}
})();
