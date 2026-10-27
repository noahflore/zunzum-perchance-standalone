(function(){
"use strict";
/* zunzum DJ sync — "o que tô ouvindo" + "tocar junto no mesmo tempo"
   - Quem TEM conta pode ligar o 📡 no dj ia: publica vid+pos+playing (RPC djShare).
   - Quem tá no feed / chat público / privado vê 🎧 no nick e pode sincronizar.
   - Sincronizar = toca o mesmo YouTube no mesmo segundo (via window.__dj.playSync).
   - "seguir" mantém junto: troca de faixa re-sincroniza, drift >10s dá seek.
   Servidor: RPCs djShare/djStop/djList/subDj em index.html (DB.dj, expira em 3min).
*/
let liveMap = {};   // lower -> {nick, vid, by, title, pos, playing, at}
let liveAt = 0;
let shareOn = false;
try{ shareOn = localStorage.getItem("zunzumDJShare")==="1"; }catch(e){}
let followNick = ""; // lower (sessão)
let lastShareVid = "", lastPushAt = 0, lastCreds = null;
let refreshing = false;

function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function myMe(){ try{ if(typeof me!=="undefined") return me||null; }catch(e){} return null; }
function isLocal(){ try{ if(typeof localMode!=="undefined" && localMode) return true; }catch(e){} return false; }
function sock(){ try{ if(typeof socket!=="undefined") return socket||null; }catch(e){} return null; }
function isConn(){ try{ if(typeof connected!=="undefined") return !!connected; }catch(e){} return false; }
async function callRpc(name, data){
  try{
    if(typeof rpc!=="undefined" && rpc) return await rpc(name, data);
  }catch(e){ throw e; }
  throw new Error("sem servidor");
}
function normNick(n){ return String(n||"").replace(/^@/,"").toLowerCase().trim(); }
function esc(s){ try{ var d = document.createElement("div"); d.textContent = String(s==null?"":s); return d.innerHTML; }catch(e){ return ""; } }

// ---------- css ----------
try{
  if(!document.getElementById("djSyncCss")){
    let st = document.createElement("style"); st.id = "djSyncCss";
    st.textContent = ".djSyncBadge{background:none;border:none;cursor:pointer;font-size:11px;padding:0 2px;vertical-align:baseline;line-height:1}"
    +".djSyncBadge:hover{transform:scale(1.25)}"
    +"#djShareBtn.on{background:#2ecc40!important}"
    +"#djLiveBox{font-size:11px;color:#9fb3c8;max-width:300px;display:flex;flex-direction:column;gap:2px}"
    +"#djLiveBox .djLiveRow{display:flex;gap:4px;align-items:center;white-space:nowrap;overflow:hidden}"
    +"#djLiveBox .djLiveName{color:#7CFC98;font-weight:bold;overflow:hidden;text-overflow:ellipsis;flex:1 1 auto}"
    +"#djLiveBox button{background:#2c3e50;color:#fff;border:none;border-radius:6px;padding:2px 7px;cursor:pointer;font-size:11px;flex:none}"
    +"#djLiveBox button:hover{background:#3d566e}"
    +"#djFollowPill{position:fixed;left:50%;transform:translateX(-50%);bottom:86px;z-index:9001;background:#1c2733;color:#fff;border:1px solid #2ecc40;border-radius:20px;padding:6px 12px;font-size:12px;display:flex;gap:8px;align-items:center;box-shadow:0 4px 14px #0008;max-width:92vw}"
    +"#djFollowPill button{background:#2ecc40;color:#fff;border:none;border-radius:12px;padding:2px 10px;cursor:pointer;font-size:11px}"
    +"#djToast{position:fixed;left:50%;transform:translateX(-50%);bottom:130px;z-index:9002;background:#1c2733;color:#fff;border-radius:8px;padding:8px 14px;font-size:13px;box-shadow:0 4px 14px #0008;max-width:92vw;text-align:center}"
    +"body.zun-mobile #djFollowPill{bottom:150px!important}";
    document.head.appendChild(st);
  }
}catch(e){}

function toast(msg, ms){
  try{
    let t = document.getElementById("djToast");
    if(!t){ t = document.createElement("div"); t.id = "djToast"; t.hidden = true; document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(t._tm);
    t._tm = setTimeout(()=>{ t.hidden = true; }, ms||3500);
  }catch(e){}
}

// ---------- lista ao vivo ----------
async function refreshLive(){
  if(refreshing) return;
  refreshing = true;
  try{
    if(isLocal()){ liveMap = {}; liveAt = Date.now(); paintLiveBox(); refreshBadges(); return; }
    if(!isConn()) return;
    let raw = await callRpc("djList", "");
    let arr = [];
    try{ arr = JSON.parse(raw); }catch(e){ arr = []; }
    if(!Array.isArray(arr)) arr = [];
    let now = Date.now(), mp = {};
    arr.forEach(v=>{
      if(!v || !v.vid || !/^[A-Za-z0-9_-]{6,20}$/.test(String(v.vid))) return;
      if(now-(+v.at||0) > 180000) return;
      let k = normNick(v.nick||"");
      if(!k) return;
      mp[k] = {nick:String(v.nick||"").slice(0,20), vid:String(v.vid), by:String(v.by||"").slice(0,60), title:String(v.title||"").slice(0,80), pos:Math.max(0,Math.min(7200,+v.pos||0)), playing:v.playing?1:0, at:(+v.at||now)};
    });
    liveMap = mp; liveAt = now;
    /* só repinta se a lista MUDOU (vid/título/playing/nicks): pos anda sozinho
       e não aparece em nenhum texto, então repintar a cada 15s era só churn */
    let sig = "";
    try{ sig = Object.keys(mp).sort().map(k=>k+"="+(mp[k].vid||"")+(mp[k].playing?"p":"")+(mp[k].title||"")).join("|"); }catch(e){}
    if(sig !== refreshLive._sig){
      refreshLive._sig = sig;
      paintLiveBox(); setBadgeObs(Object.keys(mp).length>0); refreshBadges(); paintFollowPill(); paintProfDj();
    }
  }catch(e){}
  finally{ refreshing = false; }
}
function liveInfo(nick){
  let k = normNick(nick);
  return (k && liveMap[k]) || null;
}
function targetPos(entry){
  let base = +entry.pos||0;
  if(entry.playing) base += Math.max(0, (Date.now()-(+entry.at||Date.now()))/1000);
  return Math.max(0, Math.floor(base));
}

// ---------- badges no feed/chat ----------
function badgeFor(nick){
  let info = liveInfo(nick);
  if(!info) return null;
  let b = document.createElement("button");
  b.className = "djSyncBadge";
  b.textContent = info.playing ? "🎧" : "⏸🎧";
  let label = (info.by ? info.by+" — " : "")+(info.title||info.vid);
  b.title = "@"+info.nick+" ouvindo: "+label.slice(0,60)+" — clique p/ tocar junto";
  b.dataset.djNick = info.nick;
  b.dataset.djState = (info.playing?"1":"0")+info.vid;
  b.onclick = (ev)=>{ ev.stopPropagation(); syncTo(info.nick); };
  return b;
}
function refreshBadges(){
  /* INCREMENTAL (antes: removia TODAS e recriava a cada chamada): só mexe no
     que mudou — remove badge de quem parou, atualiza play/pause no lugar,
     adiciona só a faltante. Varredura barata e sem churn no DOM. */
  try{
    let live = {};
    Object.keys(liveMap).forEach(k=>{ live[k]=1; });
    try{ let s = JSON.parse((sessionStorage.getItem("orkutSession")||localStorage.getItem("orkutSession")||"null")); if(s&&s.nick) delete live[normNick(s.nick)]; }catch(e){}
    let roots = [];
    try{
      let f = document.getElementById("feedCtn"); if(f) roots.push(f);
      let p = document.getElementById("pubLog"); if(p) roots.push(p);
      let v = document.getElementById("privLog"); if(v) roots.push(v);
    }catch(e){}
    if(!roots.length) return;
    if(!Object.keys(live).length){
      // ninguém compartilhando: só limpa se ainda houver badge velha
      try{
        if(document.querySelector(".djSyncBadge")) document.querySelectorAll(".djSyncBadge").forEach(x=>x.remove());
      }catch(e){}
      return;
    }
    roots.forEach(root=>{
      root.querySelectorAll(".chatname").forEach(nm=>{
        try{
          let raw = (nm.firstChild && nm.firstChild.nodeType===3) ? nm.firstChild.textContent : nm.textContent;
          let nick = normNick(String(raw||"").split(/\s/)[0]);
          if(!nick) return;
          let ex = nm.querySelector(":scope > .djSyncBadge");
          if(ex){
            let info = liveInfo(nick);
            if(!info || !live[nick]){ ex.remove(); return; }
            let want = (info.playing?"1":"0")+info.vid;
            if(ex.dataset.djState !== want){
              let b = badgeFor(nick);
              if(b) ex.replaceWith(b); else ex.remove();
            }
            return;
          }
          if(!live[nick]) return;
          let b = badgeFor(nick);
          if(b) nm.appendChild(b);
        }catch(e){}
      });
    });
  }catch(e){}
}
/* Observador PREGUIÇOSO (antes: 3 MutationObservers com subtree ligados p/
   sempre + intervalo de 5s re-anexando): só observa enquanto alguém está
   compartilhando; quando a lista esvazia, desconecta e zera o custo. */
let badgeObs = null, badgeObsOn = false;
function setBadgeObs(on){
  try{
    on = !!on;
    if(on === badgeObsOn && badgeObs) return;
    badgeObsOn = on;
    if(!on){ try{ if(badgeObs) badgeObs.disconnect(); }catch(e){} return; }
    if(!badgeObs){
      badgeObs = new MutationObserver(()=>{
        try{
          clearTimeout(badgeObs._tm);
          badgeObs._tm = setTimeout(()=>{ try{ if(Object.keys(liveMap).length) refreshBadges(); }catch(e){} }, 400);
        }catch(e){}
      });
    }
    ["feedCtn","pubLog","privLog"].forEach(id=>{
      try{
        let el = document.getElementById(id);
        if(el) badgeObs.observe(el, {childList:true, subtree:true});
      }catch(e){}
    });
  }catch(e){}
}

// ---------- perfil: mostra "ouvindo agora" ----------
function paintProfDj(){
  try{
    let modal = document.getElementById("profModal");
    if(!modal || modal.hidden) return;
    let old = document.getElementById("profDjLive");
    if(old) old.remove();
    let nickEl = document.getElementById("profNick");
    if(!nickEl) return;
    let nick = normNick(nickEl.textContent||"");
    let info = nick && liveInfo(nick);
    if(!info) return;
    let stats = document.getElementById("profStats");
    if(!stats || !stats.parentNode) return;
    let box = document.createElement("div");
    box.id = "profDjLive";
    box.style.cssText = "margin:8px 0;padding:8px 10px;border-radius:10px;background:#12241a;border:1px solid #2ecc40;font-size:13px;color:#c9f2d4";
    let label = (info.by ? info.by+" — " : "")+(info.title||"");
    box.appendChild(document.createTextNode((info.playing?"🎧 ouvindo agora: ":"⏸🎧 pausou em: ")+label.slice(0,80)+" "));
    let b = document.createElement("button");
    b.textContent = "tocar junto";
    b.style.cssText = "background:#2ecc40;color:#fff;border:none;border-radius:6px;padding:3px 10px;cursor:pointer;margin-left:6px";
    b.onclick = ()=>syncTo(info.nick);
    box.appendChild(b);
    stats.parentNode.insertBefore(box, stats.nextSibling);
  }catch(e){}
}

// ---------- compartilhar o que tô ouvindo ----------
function djState(){
  try{ if(window.__dj && window.__dj.current) return window.__dj.current(); }catch(e){}
  return null;
}
async function pushShare(force){
  try{
    let m = myMe();
    if(!shareOn || !m || isLocal()) return;
    if(!isConn()) return;
    let cur = djState();
    if(!cur || !cur.vid){
      // sem faixa: não spamma stop, só avisa que parou se trocou de faixa
      if(force && lastShareVid){
        lastShareVid = "";
        try{ await callRpc("djStop", JSON.stringify({nick:m.nick, hash:m.hash})); }catch(e){}
      }
      return;
    }
    let now = Date.now();
    if(!force && cur.vid===lastShareVid && now-lastPushAt < 8000) return;
    if(!/^[A-Za-z0-9_-]{6,20}$/.test(cur.vid)) return;
    lastShareVid = cur.vid; lastPushAt = now;
    lastCreds = {nick:m.nick, hash:m.hash};
    await callRpc("djShare", JSON.stringify({nick:m.nick, hash:m.hash, vid:cur.vid, by:String(cur.by||"").slice(0,60), title:String(cur.title||"").slice(0,80), pos:Math.max(0,Math.min(7200,+cur.pos||0)), playing:cur.playing?1:0}));
  }catch(e){}
}
async function stopShare(){
  lastShareVid = "";
  try{
    let c = lastCreds || myMe();
    if(c && c.nick && c.hash && isConn() && !isLocal()){
      await callRpc("djStop", JSON.stringify({nick:c.nick, hash:c.hash}));
    }
  }catch(e){}
  lastCreds = null;
}
function paintShareBtn(){
  try{
    let b = document.getElementById("djShareBtn");
    if(!b) return;
    let m = myMe();
    if(!m){
      b.classList.remove("on");
      b.textContent = "📡";
      b.title = "entre com nick+senha p/ mostrar o que você tá ouvindo";
      b.style.opacity = ".5";
      return;
    }
    if(isLocal()){
      b.classList.remove("on");
      b.textContent = "📡";
      b.title = "salve o generator p/ mostrar o que tá ouvindo";
      b.style.opacity = ".5";
      return;
    }
    b.style.opacity = "";
    b.classList.toggle("on", !!shareOn);
    b.textContent = shareOn ? "📡" : "📡";
    /* djState() chama getCurrentTime/getPlayerState no iframe do YouTube (IPC
       caro): só precisa quando o share está LIGADO (é o único título que usa) */
    let cur = shareOn ? djState() : null;
    let what = cur && cur.vid ? ((cur.by?cur.by+" — ":"")+(cur.title||"")).slice(0,40) : "nada tocando";
    b.title = shareOn ? ("mostrando no feed/chat: "+what+" — clique p/ desligar") : "mostrar no feed/chat o que tô ouvindo no dj ia";
  }catch(e){}
}
function ensureShareUI(){
  try{
    let bar = document.getElementById("djBar");
    if(!bar) return false;
    if(document.getElementById("djShareBtn")){ paintShareBtn(); paintLiveBox(); return true; }
    let row = bar.querySelector("div > div");
    if(!row) return false;
    let b = document.createElement("button");
    b.id = "djShareBtn";
    b.textContent = "📡";
    b.title = "mostrar o que tô ouvindo";
    b.style.cssText = "background:#2c3e50;color:#fff;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px";
    b.onclick = ()=>{
      let m = myMe();
      if(!m){ toast("entre com nick+senha p/ mostrar o que você tá ouvindo 📡"); return; }
      if(isLocal()){ toast("salve o generator p/ mostrar o que tá ouvindo"); return; }
      shareOn = !shareOn;
      lsSet("zunzumDJShare", shareOn?"1":"0");
      paintShareBtn();
      if(shareOn){ toast("📡 agora o feed e o chat veem o que você tá ouvindo 🎧"); pushShare(true); }
      else { stopShare(); toast("📡 desligado — ninguém mais vê sua música"); refreshLive(); }
    };
    row.appendChild(b);
    // caixa "ao vivo" dentro da coluna do dj
    try{
      let col = bar.children[1] || bar;
      let box = document.createElement("div");
      box.id = "djLiveBox";
      col.appendChild(box);
    }catch(e){}
    paintShareBtn(); paintLiveBox();
    return true;
  }catch(e){ return false; }
}
function paintLiveBox(){
  try{
    let box = document.getElementById("djLiveBox");
    if(!box) return;
    box.innerHTML = "";
    let ks = Object.keys(liveMap);
    let m = myMe();
    ks = ks.filter(k=>!m || k!==normNick(m.nick));
    if(!ks.length){ box.textContent = ""; return; }
    let t = document.createElement("div");
    t.textContent = "🎧 ouvindo agora ("+ks.length+"):";
    box.appendChild(t);
    ks.slice(0,5).forEach(k=>{
      let v = liveMap[k];
      let row = document.createElement("div"); row.className = "djLiveRow";
      let nm = document.createElement("span"); nm.className = "djLiveName";
      nm.textContent = "@"+v.nick+": "+((v.by?v.by+" — ":"")+(v.title||"")).slice(0,34);
      nm.title = "@"+v.nick+" — "+((v.by?v.by+" — ":"")+(v.title||"")).slice(0,80)+" — clique p/ tocar junto";
      nm.style.cursor = "pointer";
      nm.onclick = ()=>syncTo(v.nick);
      row.appendChild(nm);
      let j = document.createElement("button"); j.textContent = "tocar junto";
      j.title = "toca a mesma música no mesmo ponto";
      j.onclick = ()=>syncTo(v.nick);
      row.appendChild(j);
      let f = document.createElement("button"); f.textContent = followNick===k ? "✓ seguindo" : "seguir";
      f.title = "segue cada troca de música e corrige o tempo sozinho";
      f.onclick = ()=>{ if(followNick===k){ followNick = ""; paintLiveBox(); paintFollowPill(); } else { syncTo(v.nick, true); } };
      row.appendChild(f);
      box.appendChild(row);
    });
  }catch(e){}
}

// ---------- sincronizar ----------
function ensureMusicLoaded(){
  try{
    if(window.__dj && window.__dj.playSync) return Promise.resolve(true);
    if(typeof _loadLazyNow==="function"){ try{ _loadLazyNow(); }catch(e){} }
    else if(window._lazyQueue){
      try{
        if(!window._lazyStarted){ window._lazyStarted = true; }
        ["src/music.js"].forEach(src=>{
          if(!document.querySelector('script[src="'+src+'"]')){
            let s = document.createElement("script"); s.src = src; document.body.appendChild(s);
          }
        });
      }catch(e){}
    }
  }catch(e){}
  return new Promise(res=>{
    let t0 = Date.now();
    (function wait(){
      if(window.__dj && window.__dj.playSync) return res(true);
      if(Date.now()-t0 > 12000) return res(false);
      setTimeout(wait, 400);
    })();
  });
}
async function syncTo(nick, follow){
  try{
    nick = String(nick||"").replace(/^@/,"").trim().slice(0,20);
    if(!nick){ return; }
    await refreshLive();
    let info = liveInfo(nick);
    if(!info){ toast("@"+nick+" não tá compartilhando agora"); return; }
    let ok = await ensureMusicLoaded();
    if(!ok || !window.__dj || !window.__dj.playSync){ toast("dj ia ainda carregando... tente de novo em segundos"); return; }
    let pos = targetPos(info);
    let ok2 = false;
    try{ ok2 = window.__dj.playSync(info.vid, info.by||("@"+info.nick), info.title||info.vid, pos); }catch(e){ ok2 = false; }
    if(!ok2){ toast("não consegui tocar essa faixa"); return; }
    if(follow) followNick = normNick(nick);
    else if(followNick && followNick===normNick(nick)){ /* mantém */ }
    paintLiveBox(); paintFollowPill();
    let label = ((info.by?info.by+" — ":"")+(info.title||"")).slice(0,50);
    toast("🎧 tocando junto com @"+info.nick+": "+label+(follow?" (seguindo ✓)":""));
  }catch(e){ toast("não consegui sincronizar"); }
}
async function followTick(){
  try{
    if(!followNick) return;
    if(document.hidden) return;
    let info = liveMap[followNick];
    if(!info){ await refreshLive(); info = liveMap[followNick]; if(!info){ followNick = ""; paintLiveBox(); paintFollowPill(); return; } }
    if(!window.__dj || !window.__dj.current || !window.__dj.playSync) return;
    let cur = null;
    try{ cur = window.__dj.current(); }catch(e){}
    let want = targetPos(info);
    if(!cur || cur.vid!==info.vid){
      try{ window.__dj.playSync(info.vid, info.by||("@"+info.nick), info.title||info.vid, want); }catch(e){}
      return;
    }
    let drift = Math.abs((+cur.pos||0)-want);
    if(drift > 10){
      try{ window.__dj.seek(want); }catch(e){}
    }
  }catch(e){}
}
function paintFollowPill(){
  try{
    let old = document.getElementById("djFollowPill");
    if(old) old.remove();
    if(!followNick) return;
    let info = liveMap[followNick];
    if(!info){ followNick = ""; return; }
    let p = document.createElement("div"); p.id = "djFollowPill";
    let tx = document.createElement("span");
    tx.textContent = "🎧 seguindo @"+info.nick+": "+((info.by?info.by+" — ":"")+(info.title||"")).slice(0,40);
    tx.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
    p.appendChild(tx);
    let stop = document.createElement("button"); stop.textContent = "parar";
    stop.onclick = ()=>{ followNick = ""; paintLiveBox(); paintFollowPill(); };
    p.appendChild(stop);
    document.body.appendChild(p);
  }catch(e){}
}

// ---------- socket: atualiza na hora ----------
function hookSocket(){
  try{
    let s = sock();
    if(!s || s._djHook) return;
    s._djHook = 1;
    s.addEventListener("message", (ev)=>{
      try{
        let d = typeof ev.data==="string" ? ev.data : "";
        if(d==="dj" || d.indexOf("dj")==0){ refreshLive(); }
      }catch(e){}
    });
    try{ callRpc("subDj", "").catch(()=>{}); }catch(e){}
  }catch(e){}
}

// ---------- loops (consolidados: 4 timers em vez de 8, parados com aba oculta) ----------
setInterval(()=>{
  // rápido (5s): gancho do socket + re-anexa observador se a lista recriou os logs
  try{ if(!document.hidden) hookSocket(); }catch(e){}
  try{
    if(badgeObsOn && !document.hidden && badgeObs){
      ["feedCtn","pubLog","privLog"].forEach(id=>{
        try{ let el = document.getElementById(id); if(el) badgeObs.observe(el, {childList:true, subtree:true}); }catch(e){}
      });
    }
  }catch(e){}
}, 5000);
setInterval(()=>{
  // médio (8s): publica posição + percebe troca de faixa + vigia login/logout
  try{
    if(document.hidden) return;
    pushShare(false); paintShareBtn();
    try{
      let cur = djState();
      let v = (cur && cur.vid) || "";
      if(shareOn && v && v!==lastShareVid){ pushShare(true); }
    }catch(e){}
    try{
      let m = myMe();
      if(lastCreds && (!m || normNick(m.nick)!==normNick(lastCreds.nick))){
        try{
          if(isConn() && !isLocal()) callRpc("djStop", JSON.stringify({nick:lastCreds.nick, hash:lastCreds.hash})).catch(()=>{});
        }catch(e){}
        lastCreds = m ? {nick:m.nick, hash:m.hash} : null;
        paintShareBtn();
      } else if(m && !lastCreds && shareOn){
        lastCreds = {nick:m.nick, hash:m.hash};
      }
    }catch(e){}
  }catch(e){}
}, 8000);
setInterval(()=>{ if(!document.hidden) refreshLive(); }, 15000);
setInterval(()=>{ followTick(); }, 12000); // followTick já pula com aba oculta
/* botão 📡: votação rápida (2s) só até aparecer; depois só um vigia lento (20s)
   caso a barra seja reconstruída. Antes era a cada 1,5s p/ sempre. */
let shareUiFast = setInterval(()=>{
  try{ if(ensureShareUI()){ clearInterval(shareUiFast); shareUiFast = null; } }catch(e){}
}, 2000);
setInterval(()=>{
  try{ if(!shareUiFast && !document.getElementById("djShareBtn") && document.getElementById("djBar")) ensureShareUI(); }catch(e){}
}, 20000);
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden){ refreshLive(); pushShare(false); } });

window.__djSync = {
  list:function(){ return Object.values(liveMap); },
  has:function(n){ return !!liveInfo(n); },
  info:function(n){ return liveInfo(n)||null; },
  refresh:refreshLive,
  sync:syncTo,
  _setLive:function(arr){ try{ liveMap = {}; (arr||[]).forEach(v=>{ let k = normNick(v.nick||""); if(k) liveMap[k] = v; }); setBadgeObs(Object.keys(liveMap).length>0); paintLiveBox(); refreshBadges(); paintFollowPill(); }catch(e){} },
  get following(){ return followNick; }
};
window.__djWantSync = syncTo;
setTimeout(refreshLive, 2500);
setTimeout(ensureShareUI, 3000);
})();
