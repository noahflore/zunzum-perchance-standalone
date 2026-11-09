/* zundm — amigos + DM instantâneo estilo facebook antigo/zap + presença por usuário.
   Exige amizade p/ conversar. Ticks ✓/✓✓, "digitando...", fotos/vídeos/gifs,
   emojis personalizados (ZunEmoji), compressão genérica + tetos (imagem 30MB,
   resto 10MB comprimido), proteção de cor via zunfix (headers com .zun-mhead).
   NÃO mexe no visualizador total. */
(function(){
"use strict";
if(typeof window.zunBusy!=="function"){window.zunBusy=function(btn,on,label){try{if(!btn)return "";if(on){btn.disabled=true;try{btn.style.opacity=".45";btn.style.cursor="wait";}catch(e){}try{if(label&&btn.textContent!==undefined&&/^[\u270F\uD83D\uDDD1\u274C\u2716\u2715x]$/.test(btn.textContent.trim())===false&&btn.children.length===0){btn.dataset.zunBusyOld=btn.textContent;btn.textContent=label;}}catch(e){}}else{btn.disabled=false;try{btn.style.opacity="";btn.style.cursor="";}catch(e){}try{if(btn.dataset&&btn.dataset.zunBusyOld){btn.textContent=btn.dataset.zunBusyOld;delete btn.dataset.zunBusyOld;}}catch(e){}}}catch(e){}return "";};}
function $(id){ return document.getElementById(id); }
function low(n){ return String(n||"").replace(/^@/,"").toLowerCase(); }
function esc2(s){ try{ if(typeof esc==="function") return esc(s); }catch(e){} let d=document.createElement("div"); d.textContent=String(s==null?"":s); return d.innerHTML; }
function zme(){ try{ return (typeof me!=="undefined"&&me&&me.nick)?me:null; }catch(e){ return null; } }
function zauth(){ let m=zme(); return m?{nick:m.nick,hash:m.hash}:null; }
function zokNick(n){ return /^[A-Za-z0-9-_]{2,20}$/.test(n||""); }
async function zrpc(name,data){
  try{
    if(typeof rpc==="function") return await rpc(name,data);
    if(typeof crpc==="function") return await crpc(name,data);
  }catch(e){ throw e; }
  throw new Error("sem rpc");
}
function zhealDM(log){
  try{
    if(log&&window.zunHealList) window.zunHealList([log]);
    else { let r=$("zunDMRoot"); if(r&&window.zunHealRoot) window.zunHealRoot(r); }
  }catch(e){}
}
function zFocus(el){ try{ el.focus({preventScroll:true}); }catch(e){ try{ el.focus(); }catch(e2){} } }
/* âncora de scroll do DM: gruda na bolha que estava no topo visível p/ a
   reconstrução do log (poll 6s, enhance de emojis) não puxar a tela */
function zAnchorSaveDM(log){
  try{
    let cr = log.getBoundingClientRect(), best = null, bestTop = 1e12;
    log.querySelectorAll(".zun-bub").forEach(el=>{
      let r = el.getBoundingClientRect();
      if(r.bottom > cr.top+4 && r.top < bestTop){ bestTop = r.top; best = el; }
    });
    if(!best) return null;
    return {k:best.dataset.zk, off:bestTop-cr.top};
  }catch(e){ return null; }
}
function zAnchorRestoreDM(log, anc){
  try{
    if(!anc||!anc.k) return false;
    let list = log.querySelectorAll(".zun-bub");
    for(let i=0;i<list.length;i++){
      if(list[i].dataset.zk===anc.k){
        let cr = log.getBoundingClientRect();
        log.scrollTop += (list[i].getBoundingClientRect().top-cr.top)-anc.off;
        return true;
      }
    }
  }catch(e){}
  return false;
}
/* carimbo de rolagem programática: scrollTop atribuído via JS dispara scroll
   CONFIÁVEL no Chrome — sem isso o pin do abrir marcaria visto sozinho.
   Carimba no elemento (todos os caminhos passam pelo log). */
function zStampPinLog(log){ try{ log._pinAt=Date.now(); }catch(e){} }
function zPinBottomDM(o, toBottom, fallbackSt, anc){
  try{ zStampPinLog(o.log); }catch(e){}
  try{
    if(toBottom){ o.log.scrollTop = o.log.scrollHeight; }
    else if(!zAnchorRestoreDM(o.log, anc)){ o.log.scrollTop = fallbackSt; }
    else {
      let _a = anc, _o = o, _stA = 0;
      try{ _stA = o.log.scrollTop||0; }catch(e){}
      requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
        /* usuário rolou nesses 2 frames? então não encosta (era yank) */
        try{ if((( _o.log.scrollTop)||0) !== _stA) return; }catch(e){ return; }
        try{ if((_o.log.scrollHeight-_o.log.scrollTop-_o.log.clientHeight)>120) zAnchorRestoreDM(_o.log, _a); }catch(e){}
        try{ zTrustSaveDM(_o.log); }catch(e){}
      }); });
    }
    try{ zTrustSaveDM(o.log); }catch(e){}
  }catch(e){}
  if(!toBottom) return;
  try{
    if(o._pinT) clearTimeout(o._pinT);
    o._pinT = setTimeout(()=>{
      try{
        if(o.log.isConnected&&(o.log.scrollHeight-o.log.scrollTop-o.log.clientHeight)<120){
          try{ zStampPinLog(o.log); }catch(e){}
          o.log.scrollTop = o.log.scrollHeight;
        }
      }catch(e){}
    }, 600);
  }catch(e){}
}
/* mídia do DM que carrega depois (foto/vídeo/gif) não pode puxar a tela:
   usa o ponto de confiança (expansão não muda scrollTop; se o usuário rolou,
   só re-salva e não mexe) */
function zTrustSaveDM(log){
  try{
    let a = zAnchorSaveDM(log);
    if(a) log._trust = {k:a.k, off:a.off, st:(log.scrollTop||0), bot:((log.scrollHeight-log.scrollTop-log.clientHeight)<60)};
  }catch(e){}
}
function zTrustRestoreDM(log){
  try{ zStampPinLog(log); }catch(e){}
  try{
    let t = log._trust;
    if(!t) return false;
    if((log.scrollTop||0) !== t.st) return false;
    if(t.bot){ log.scrollTop = log.scrollHeight; zTrustSaveDM(log); return true; }
    return !!zAnchorRestoreDM(log, t);
  }catch(e){ return false; }
}
function zMediaSteadyDM(log){
  try{
    if(!log || log._zmed) return; log._zmed = true;
    let pend = false;
    function onMedia(ev){
      try{
        let t = ev.target;
        if(!t || (t.tagName!=="IMG"&&t.tagName!=="VIDEO") || !log.contains(t)) return;
        if(pend) return; pend = true;
        requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
          pend = false;
          try{ if(!zTrustRestoreDM(log)) zTrustSaveDM(log); }catch(e){}
        }); });
      }catch(e){ pend = false; }
    }
    log.addEventListener("load", onMedia, true);
    log.addEventListener("loadedmetadata", onMedia, true);
    log.addEventListener("loadeddata", onMedia, true);
    log.addEventListener("error", onMedia, true);
  }catch(e){}
}
/* fixa no fim mesmo com imagens/emojis carregando depois (só se ainda estiver no fim) */
function zPinBottom(o, toBottom, fallbackSt){
  try{ zStampPinLog(o.log); }catch(e){}
  try{
    if(toBottom) o.log.scrollTop = o.log.scrollHeight;
    else o.log.scrollTop = fallbackSt;
  }catch(e){}
  if(!toBottom) return;
  try{
    if(o._pinT) clearTimeout(o._pinT);
    o._pinT = setTimeout(()=>{
      try{
        if(o.log.isConnected&&(o.log.scrollHeight-o.log.scrollTop-o.log.clientHeight)<120){
          try{ zStampPinLog(o.log); }catch(e){}
          o.log.scrollTop = o.log.scrollHeight;
        }
      }catch(e){}
    }, 600);
  }catch(e){}
}

/* ---------- presença por usuário (menos visualizador total) ---------- */
var zStCache = {};
try{ zStCache = JSON.parse(localStorage.getItem("zunStCache")||"{}")||{}; }catch(e){ zStCache={}; }
function zStSave(){
  try{
    /* teto p/ não estourar quota do localStorage no celular */
    let ks=Object.keys(zStCache);
    if(ks.length>300){ let cut={}; ks.slice(-300).forEach(k=>{ cut[k]=zStCache[k]; }); zStCache=cut; }
    localStorage.setItem("zunStCache", JSON.stringify(zStCache));
  }catch(e){}
}
function zOnLowers(){
  let s = new Set();
  try{ if(typeof onlineNicks!=="undefined"&&onlineNicks) onlineNicks.forEach(n=>s.add(String(n).toLowerCase())); }catch(e){}
  return s;
}
function zEff(nick){
  let l = low(nick), ex = (zStCache[l]||"").toLowerCase();
  if(ex==="offline") return "offline";
  if(ex==="ausente") return "ausente";
  if(zOnLowers().has(l)) return "online";
  if(ex==="online") return "offline";
  return "offline";
}
function zDot(st,title){
  let s=document.createElement("span"); s.className="zun-st "+(st==="online"?"on":st==="ausente"?"aus":"off");
  s.title=title||(st==="online"?"online":st==="ausente"?"ausente/suspenso":"offline");
  return s;
}
async function zBulk(nicks){
  nicks=(nicks||[]).map(low).filter((v,i,a)=>v&&a.indexOf(v)===i).slice(0,30);
  if(!nicks.length) return {};
  try{
    let r=JSON.parse(await zrpc("statusBulk", JSON.stringify(nicks)));
    if(r&&r.ok&&r.st){ Object.keys(r.st).forEach(k=>{ zStCache[k]=r.st[k]||""; }); zStSave(); return r.st; }
  }catch(e){}
  return {};
}
async function zRefreshStatuses(){
  try{
    let set = new Set();
    try{ let a0=zauth(); if(a0) set.add(low(a0.nick)); }catch(e0){}
    try{ Object.keys(zOpen).forEach(k=>set.add(k)); }catch(e){}
    try{ (zFriends||[]).forEach(f=>set.add(low(f.nick))); }catch(e){}
    try{ (zIncoming||[]).forEach(f=>set.add(low(f.nick))); }catch(e){}
    try{ if(typeof profSel!=="undefined"&&profSel) set.add(low(profSel)); }catch(e){}
    try{
      let cn=document.querySelectorAll(".chatname");
      for(let i=0;i<cn.length&&set.size<30;i++){ let t=(cn[i].textContent||"").replace(/^@/,"").trim(); if(zokNick(t)) set.add(t.toLowerCase()); }
    }catch(e){}
    if(!set.size) return;
    await zBulk([...set]);
    try{ zRepaintDots(); }catch(e){}
    try{ zPaintFriendDots(); }catch(e){}
    try{ zPaintDMHeaders(); }catch(e){}
    try{
      let a0=zauth();
      if(a0){ let lk=low(a0.nick); let sv=zStCache[lk]||""; if(sv) zPaintMyStatus(sv); }
    }catch(e){}
  }catch(e){}
}
function zRepaintDots(){
  /* FIX reload (2026-11-02): antes só atualizava dot existente; se feed/chat
     pintou antes da presença chegar (caso normal no reload), não havia dot e
     o online nunca aparecia. Agora cria o dot que falta. Feed usa dot como
     irmão dentro de .who (não filho de .chatname), tratado no 2º bloco. */
  try{
    document.querySelectorAll(".chatname").forEach(nm=>{
      try{
        let inWho = false;
        try{ inWho = !!(nm.parentElement && nm.parentElement.classList && nm.parentElement.classList.contains("who")); }catch(e){}
        if(inWho) return;
        let t=(nm.textContent||"").replace(/^@/,"").trim();
        if(!zokNick(t)) return;
        let st=zEff(t);
        let old=null;
        try{ old=nm.querySelector(":scope > .onDot"); }catch(e){ try{ old=nm.querySelector(".onDot"); }catch(e2){} }
        /* nunca remove/reinsere (mudaria a largura da linha e requebraria o
           texto = micro-puxão): esconde mantendo o espaço */
        if(st==="offline"){ if(old) old.style.visibility="hidden"; return; }
        if(st==="ausente"){
          if(!old){ let d=document.createElement("span"); d.className="onDot zun-st-aus"; d.title="ausente/suspenso"; d.style.background="#f39c12"; nm.appendChild(d); }
          else { old.classList.add("zun-st-aus"); old.style.background="#f39c12"; old.style.visibility=""; old.title="ausente/suspenso"; }
          return;
        }
        if(!old){ let d=document.createElement("span"); d.className="onDot"; d.title="online"; nm.appendChild(d); }
        else{ old.classList.remove("zun-st-aus"); old.style.background=""; old.style.visibility=""; old.title="online"; }
      }catch(e){}
    });
    try{
      document.querySelectorAll(".who").forEach(function(who){
        try{
          let nm=null;
          try{ nm=who.querySelector(":scope > .chatname"); }catch(e){ try{ nm=who.querySelector(".chatname"); }catch(e2){} }
          if(!nm) return;
          try{ if(nm.querySelector(":scope > .onDot")) return; }catch(e){}
          let t=(nm.textContent||"").replace(/^@/,"").trim();
          if(!zokNick(t)) return;
          let st=zEff(t);
          let sib=null;
          try{ for(let i=0;i<who.children.length;i++){ let c=who.children[i]; if(c!==nm && c.classList && c.classList.contains("onDot")){ sib=c; break; } } }catch(e){}
          if(st==="offline"){ if(sib) sib.style.visibility="hidden"; return; }
          if(st==="ausente"){
            if(!sib){ let d=document.createElement("span"); d.className="onDot zun-st-aus"; d.title="ausente/suspenso"; d.style.background="#f39c12"; who.appendChild(d); }
            else{ sib.classList.add("zun-st-aus"); sib.style.background="#f39c12"; sib.style.visibility=""; sib.title="ausente/suspenso"; }
            return;
          }
          if(!sib){ let d=document.createElement("span"); d.className="onDot"; d.title="online"; who.appendChild(d); }
          else{ sib.classList.remove("zun-st-aus"); sib.style.background=""; sib.style.visibility=""; sib.title="online"; }
        }catch(e){}
      });
    }catch(e){}
    try{
      document.querySelectorAll(".miniAv[data-nick]").forEach(function(b){
        try{
          let st="offline";
          try{ st=zEff(b.dataset.nick||""); }catch(e){ try{ st=zOnLowers().has(String(b.dataset.nick||"").toLowerCase())?"online":"offline"; }catch(e2){} }
          b.classList.toggle("on", st==="online");
        }catch(e){}
      });
    }catch(e){}
  }catch(e){}
}
try{ window.zRepaintDots=zRepaintDots; }catch(e){}
/* respeita offline/ausente no onDot geral (feed/chats) sem tocar no total */
function zWrapOnDot(){
  try{
    if(typeof onDot!=="function"||onDot._zunDM) return;
    let orig=onDot;
    let fn=function(nick){
      try{
        let st=zEff(nick);
        if(st==="offline") return null;
        if(st==="ausente"){ let s=document.createElement("span"); s.className="onDot zun-st-aus"; s.title="ausente/suspenso"; s.style.background="#f39c12"; return s; }
      }catch(e){}
      try{ return orig(nick); }catch(e2){ return null; }
    };
    fn._zunDM=1;
    onDot=fn; try{ window.onDot=fn; }catch(e){}
  }catch(e){}
}

/* ---------- amigos ---------- */
var zFriends=[], zIncoming=[], zOutgoing=[], zFriendAt=0;
/* amigos com cache em disco: a lista pinta na hora do reload e a rede
   atualiza por cima. Avatares da lista entram no cache de avatar + disco. */
function zFrLsKey(){ try{ let a=zauth(); return "zunFriendsV1:" + String((a&&a.nick)||"anon").toLowerCase(); }catch(e){ return "zunFriendsV1:anon"; } }
function zFrRemember(){
  try{
    let o = {at:Date.now(), friends:zFriends||[], incoming:zIncoming||[], outgoing:zOutgoing||[]};
    localStorage.setItem(zFrLsKey(), JSON.stringify(o).slice(0,200000));
  }catch(e){}
}
function zFrRecallPaint(){
  try{
    let o = JSON.parse(localStorage.getItem(zFrLsKey())||"null");
    if(!o || !o.at || (Date.now()-o.at > 1800000)) return false;
    if(!Array.isArray(o.friends)) return false;
    zFriends = o.friends||[]; zIncoming = o.incoming||[]; zOutgoing = o.outgoing||[];
    try{ zPaintPanel(); }catch(e){}
    try{ zPaintProfRow(); }catch(e){}
    try{
      (zFriends||[]).forEach(f=>{ if(f&&f.avatar){ try{ if(typeof zunAvRemember==="function") zunAvRemember(f.nick, f.avatar, f.fx); }catch(e){} try{ if(typeof zunAvWarm==="function") zunAvWarm(f.avatar); }catch(e){} } });
    }catch(e){}
    return true;
  }catch(e){ return false; }
}
/* pré-busca escalonada dos perfis dos amigos p/ o cache (abre perfil na hora).
   1 a cada 2s, no máx 8, só com a aba visível — sem estourar rate. */
var _zFrPreT = 0;
function zFrPrefetch(){
  try{
    if(_zFrPreT || document.hidden) return;
    let ns = [];
    try{ (zFriends||[]).forEach(f=>{ if(f&&f.nick) ns.push(f.nick); }); }catch(e){}
    ns = ns.slice(0,8);
    if(!ns.length) return;
    _zFrPreT = 1;
    let i = 0;
    function step(){
      try{
        if(i>=ns.length || document.hidden){ _zFrPreT = 0; return; }
        let n = ns[i++];
        let need = true;
        try{ if(typeof zunProfRecall==="function" && zunProfRecall(n)) need = false; }catch(e){}
        if(need){
          try{
            (typeof crpc==="function"?crpc:zrpc)("profileGet", n).then(r=>{
              try{ r = JSON.parse(r); }catch(e){ r = null; }
              if(r && r.ok){
                try{ if(typeof zunProfRemember==="function") zunProfRemember(r.nick, r); }catch(e){}
                try{ if(r.avatar && typeof zunAvRemember==="function") zunAvRemember(n, r.avatar, r.fx); }catch(e){}
                try{ if(r.avatar && typeof zunAvWarm==="function") zunAvWarm(r.avatar); }catch(e){}
              }
            }).catch(()=>{});
          }catch(e){}
        }
      }catch(e){}
      setTimeout(step, 2000);
    }
    setTimeout(step, 2000);
  }catch(e){ try{ _zFrPreT = 0; }catch(e2){} }
}
function zFriendCat(nick){
  let l=low(nick);
  try{ if((zFriends||[]).some(f=>low(f.nick)===l)) return "friends"; }catch(e){}
  try{ if((zIncoming||[]).some(f=>low(f.nick)===l)) return "incoming"; }catch(e){}
  try{ if((zOutgoing||[]).some(f=>low(f.nick)===l)) return "outgoing"; }catch(e){}
  return "none";
}
async function zLoadFriends(force, noPaint){
  let a=zauth(); if(!a) { zFriends=[]; zIncoming=[]; zOutgoing=[]; try{zPaintPanel();}catch(e){} return; }
  if(!force&&Date.now()-zFriendAt<15000) return;
  /* pinta o disco na hora (se houver) e atualiza por cima */
  if(!force){
    let painted = false;
    try{ painted = zFrRecallPaint(); }catch(e){}
    if(painted){ try{ zFriendAt = Date.now()-10000; }catch(e){} }
  }
  try{
    let r=JSON.parse(await zrpc("friendList", JSON.stringify(a)));
    if(r&&r.ok){ zFriends=r.friends||[]; zIncoming=r.incoming||[]; zOutgoing=r.outgoing||[]; zFriendAt=Date.now();
      try{ zFriends.forEach(f=>{ if(f&&f.st!==undefined) zStCache[low(f.nick)]=f.st||""; }); zStSave(); }catch(e){}
      try{
        (zFriends||[]).forEach(f=>{ if(f&&f.avatar){ try{ if(typeof zunAvRemember==="function") zunAvRemember(f.nick, f.avatar, f.fx); }catch(e){} try{ if(typeof zunAvWarm==="function") zunAvWarm(f.avatar); }catch(e){} } });
      }catch(e){}
      try{ zFrRemember(); }catch(e){}
      try{ zFrPrefetch(); }catch(e){}
      if(!noPaint){ try{zPaintPanel();}catch(e){} try{zPaintProfRow();}catch(e){} }
    }
  }catch(e){}
}
function zIsFriend(nick){ let l=low(nick); return zFriends.some(f=>low(f.nick)===l); }
/* corrida com timeout: zrpc não tem prazo, então uma resposta perdida deixava
   promise pendente p/ sempre. estoura em 8s p/ ninguém ficar preso. */
function zTimeout(p, ms){ return Promise.race([p, new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout")), ms||8000))]); }
async function zStateOf(peer){
  let a=zauth(); if(!a) return null;
  try{ let r=JSON.parse(await zTimeout(zrpc("friendState", JSON.stringify({nick:a.nick,hash:a.hash,peer})),8000)); return r&&r.ok?r:null; }catch(e){ return null; }
}
async function zAct(kind,peer){
  let a=zauth(); if(!a){ alert("entre com nick+senha primeiro."); return null; }
  let map={req:"friendReq",accept:"friendAccept",decline:"friendDecline",remove:"friendRemove"};
  let body={nick:a.nick,hash:a.hash};
  if(kind==="req") body.to=peer; else if(kind==="accept"||kind==="decline") body.from=peer; else body.peer=peer;
  try{
    let r=JSON.parse(await zrpc(map[kind], JSON.stringify(body)));
    zFriendAt=0; await zLoadFriends(true); await zRefreshStatuses();
    return r;
  }catch(e){ return {ok:0,err:"rede"}; }
}
function zStSvg(color){ return '<svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4.5" fill="'+color+'"/></svg>'; }
function zStMeta(v){ return v==="ausente"?{c:"#f39c12",t:"suspenso"}:v==="offline"?{c:"#95a5a6",t:"offline"}:{c:"#2ecc40",t:"online"}; }
function zPaintMyStatus(v){
  try{
    let m=zStMeta(v);
    let cur=document.querySelector("#meStCur");
    if(cur){ cur.title="clique para trocar seu status"; cur.innerHTML=zStSvg(m.c)+' <span>'+m.t+'</span> <span class="meStArrow">▼</span>'; }
    document.querySelectorAll("#meStList .meStOpt").forEach(o=>{ try{ o.setAttribute("aria-selected",o.dataset.v===v?"true":"false"); }catch(e){} });
  }catch(e){}
}
function zToggleStList(force){
  try{
    let list=document.querySelector("#meStList"), cur=document.querySelector("#meStCur");
    if(!list||!cur) return;
    let open=(typeof force==="boolean")?force:list.hidden;
    list.hidden=!open; cur.setAttribute("aria-expanded",open?"true":"false");
  }catch(e){}
}
async function zSetMyStatus(v){
  try{
    zPaintMyStatus(v); zToggleStList(false);
    try{ localStorage.setItem("zunMyStatus",v); }catch(e){}
    let a=zauth(); if(!a) return;
    try{ await zrpc("statusSet", JSON.stringify({nick:a.nick,hash:a.hash,st:v})); }catch(e){}
    try{ zStCache[low(a.nick)]=v; zStSave(); }catch(e){}
    zRepaintDots();
  }catch(e){}
}
function zEnsurePanel(){
  let p=$("zunFriendPanel"); if(p&&p.isConnected) return p;
  try{
    let ab=$("authBox"); let host=ab&&ab.closest?ab.closest(".box"):null;
    p=document.createElement("div"); p.className="box"; p.id="zunFriendPanel";
    p.innerHTML='<h3 class="zun-mhead">amigos <span id="zunFrCount" class="meta"></span></h3>'
      +'<div id="zunFrIn"></div><div id="zunFrList"><div class="meta">entre com nick+senha p/ ver amigos.</div></div>';
    if(host&&host.parentNode) host.parentNode.insertBefore(p, host.nextSibling);
    else ($("wrap")||document.body).appendChild(p);
    try{
      let cur=""; try{ cur=localStorage.getItem("zunMyStatus")||""; }catch(e){}
      if(!cur){ try{ let m=zme(); let lk=m?low(m.nick):""; if(lk&&zStCache[lk]) cur=zStCache[lk]; }catch(e){} }
      zPaintMyStatus(cur||"online");
      try{
        let list=document.querySelector("#meStList");
        if(list&&!list.dataset.built){
          list.dataset.built="1";
          ["online","ausente","offline"].forEach(v=>{
            let m=zStMeta(v);
            let o=document.createElement("button");
            o.type="button"; o.className="meStOpt"; o.dataset.v=v; o.setAttribute("role","option");
            o.innerHTML=zStSvg(m.c)+' <span>'+m.t+'</span>';
            o.onclick=()=>zSetMyStatus(v);
            list.appendChild(o);
          });
          let mc=document.querySelector("#meStCur");
          if(mc) mc.onclick=(e)=>{ try{ e.stopPropagation(); }catch(_){} zToggleStList(); };
          document.addEventListener("click",e=>{ try{ let b=document.querySelector("#meStBox"); if(b&&!b.contains(e.target)) zToggleStList(false); }catch(_){} });
          document.addEventListener("keydown",e=>{ if(e.key==="Escape") zToggleStList(false); });
        }
      }catch(e){}
      let fb=document.querySelector("#meFindBtn");
      if(fb) fb.onclick=()=>{ try{ if(typeof openUserSearch==="function") openUserSearch(""); }catch(e){} };
    }catch(e){}
    try{ if(window.zunTagMHeads) window.zunTagMHeads(); }catch(e){}
    try{ if(window.zunHealRoot) window.zunHealRoot(p); }catch(e){}
  }catch(e){}
  return p;
}
function zPaintFriendDots(){ try{ zEnsurePanel(); }catch(e){} }
function zPaintPanel(){
  let p=zEnsurePanel(); if(!p) return;
  try{
    let cnt=p.querySelector("#zunFrCount"); if(cnt) cnt.textContent=zFriends.length?("("+zFriends.length+")"):"";
    let box=p.querySelector("#zunFrIn"); box.innerHTML="";
    if(zIncoming.length){
      let h=document.createElement("div"); h.className="meta"; h.textContent=_zdmt("pedidos ("+zIncoming.length+"):"); box.appendChild(h);
      zIncoming.forEach(u=>{
        let row=document.createElement("div"); row.className="zun-frow";
        row.appendChild(zFav(u.nick,u.avatar,u.fx));
        let nm=document.createElement("span"); nm.style.fontWeight="bold"; nm.textContent="@"+u.nick; nm.style.cursor="pointer";
        try{ if(typeof paintZNick==="function") paintZNick(nm,u.nick); nm.textContent="@"+u.nick; }catch(e){}
        nm.onclick=()=>{ try{ openProfile(u.nick); }catch(e){} };
        row.appendChild(nm);
        let ok=document.createElement("button"); ok.textContent=_zdmt("aceitar");
        ok.onclick=async()=>{ ok.disabled=true; await zAct("accept",u.nick); };
        let no=document.createElement("button"); no.textContent=_zdmt("recusar");
        no.onclick=async()=>{ no.disabled=true; await zAct("decline",u.nick); };
        row.appendChild(ok); row.appendChild(no); box.appendChild(row);
      });
    }
    let list=p.querySelector("#zunFrList"); list.innerHTML="";
    let a=zauth();
    if(!a){ let e=document.createElement("div"); e.className="meta"; e.textContent=_zdmt("entre com nick+senha p/ ver amigos."); list.appendChild(e); return; }
    if(!zFriends.length){
      let e=document.createElement("div"); e.className="meta";
      e.textContent=zOutgoing.length?(_zdmt("nenhum amigo ainda — "+zOutgoing.length+" pedido(s) enviado(s). abra um perfil e adicione!")):(_zdmt("nenhum amigo ainda — abra um perfil e clique em adicionar aos amigos!"));
      list.appendChild(e);
    }
    zFriends.forEach(u=>{
      let row=document.createElement("div"); row.className="zun-frow";
      row.appendChild(zFav(u.nick,u.avatar,u.fx));
      let nm=document.createElement("span"); nm.style.fontWeight="bold"; nm.style.cursor="pointer"; nm.textContent="@"+u.nick;
      try{ if(typeof paintZNick==="function") paintZNick(nm,u.nick); nm.textContent="@"+u.nick; }catch(e){}
      nm.onclick=()=>{ try{ openProfile(u.nick); }catch(e){} };
      row.appendChild(nm);
      try{ row.appendChild(zDot(zEff(u.nick))); }catch(e){}
      let un=zUnread[low(u.nick)]||0;
      if(un){ let b=document.createElement("span"); b.className="zun-badge"; b.textContent=un; row.appendChild(b); }
      let sp=document.createElement("span"); sp.style.flex="1"; row.appendChild(sp);
      let cv=document.createElement("button"); cv.textContent=_zdmt("conversar"); cv.title=_zdmt("abrir mensagem instantânea");
      cv.onclick=()=>zDMOpen(u.nick);
      let rm=document.createElement("button"); rm.textContent="x"; rm.title=_zdmt("remover amizade");
      rm.onclick=async()=>{ if(!confirm("Remover @"+u.nick+" dos amigos? DMs antigas somem p/ vocês dois conversarem de novo só com novo pedido.")) return; await zAct("remove",u.nick); try{zDMClose(u.nick);}catch(e){} };
      row.appendChild(cv); row.appendChild(rm); list.appendChild(row);
    });
    try{ if(window.ZunEmoji&&window.ZunEmoji.enhance) window.ZunEmoji.enhance(list); }catch(e){}
    try{
      if(typeof ensureZNickStyles==="function"){
        let _pn = [];
        try{ (zFriends||[]).forEach(f=>{ if(f&&f.nick) _pn.push(f.nick); }); }catch(e){}
        try{ (zIncoming||[]).forEach(f=>{ if(f&&f.nick) _pn.push(f.nick); }); }catch(e){}
        if(_pn.length) ensureZNickStyles(_pn);
      }
    }catch(e){}
    try{ if(window.zunHealRoot) window.zunHealRoot(p); }catch(e){}
  }catch(e){}
}
function zFav(nick,avatar,fx){
  let s=document.createElement("span"); s.className="zun-fav";
  let L = String(nick||"?").slice(0,1).toUpperCase();
  /* efeito (FASE 14): do dado, ou do cache (com busca em fundo se faltar) */
  function _fx(){ try{
    if(fx!==undefined && fx!==null && fx!=="") return void zunAvFxApply(s, fx);
    if(typeof zunAvFxGet==="function"){ var _f = zunAvFxGet(nick); if(_f) return void zunAvFxApply(s, _f); }
    if(typeof zunAvFxApplyNick==="function") zunAvFxApplyNick(s, nick);
  }catch(e){} }
  if(avatar){
    /* página de pin nunca carrega no <img>: usa a direta resolvida; sem cache,
       mostra a letra e insere a foto quando resolver (sem img quebrada no meio) */
    let a = avatar, isPin = false, direct = "";
    try{ isPin = (typeof window.zunIsPinPage==="function" && window.zunIsPinPage(a)); }catch(e){}
    if(isPin){ try{ direct = (typeof window.zunPinDirectCached==="function") ? (window.zunPinDirectCached(a)||"") : ""; }catch(e){ direct = ""; } }
    if(isPin && !direct){
      s.textContent = L;
      try{
        if(typeof window.zunResolvePin==="function"){
          window.zunResolvePin(a).then(function(dd){
            if(!dd || !s.isConnected) return;
            try{
              let im2 = document.createElement("img");
              im2.loading = "lazy"; im2.referrerPolicy = "no-referrer";
              im2.onerror = ()=>{ try{ im2.remove(); }catch(e){} if(!s.querySelector("img")) s.textContent = L; };
              im2.onload = ()=>{ try{ s.textContent = ""; s.appendChild(im2); }catch(e){} };
              im2.src = dd;
            }catch(e){}
          }).catch(function(){});
        }
      }catch(e){}
      _fx();
      return s;
    }
    let im=document.createElement("img"); im.src=direct||a; im.loading="lazy"; im.referrerPolicy="no-referrer"; im.onerror=()=>{ try{im.remove();}catch(e){} s.textContent=L; }; s.appendChild(im);
  }
  else s.textContent=L;
  _fx();
  return s;
}
function _zdmt(x){ try{ return (window.zunzumTr?window.zunzumTr(x):x); }catch(e){ return x; } }
/* linha de amizade dentro do perfil */
var zProfRowGen = 0;
function zPaintProfRow(){
  try{
    let card=$("profCard"); if(!card) return;
    let anchor=null;
    try{ anchor=$("profInviteBtn")?$("profInviteBtn").parentNode:null; }catch(e){}
    if(!anchor) return;
    let row=$("zunFriendRow");
    if(!row){ row=document.createElement("div"); row.id="zunFriendRow"; row.style.cssText="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;align-items:center"; anchor.after(row); }
    row.innerHTML="";
    let target=""; try{ target=(typeof profSel!=="undefined"&&profSel)||""; }catch(e){}
    let m=zme();
    if(!target||/^anon-[a-z0-9]{6,12}$/.test(target)){ row.hidden=true; return; }
    row.hidden=false;
    if(!m){ let s=document.createElement("span"); s.className="meta"; s.textContent=_zdmt("entre com nick+senha p/ adicionar aos amigos."); row.appendChild(s); return; }
    if(low(target)===low(m.nick)){
      let s=document.createElement("span"); s.className="meta"; s.textContent=_zdmt("esse é você! divulgue seu perfil p/ fazer amigos 📈"); row.appendChild(s); return;
    }
    /* pinta na hora pelo cache local (amigos carregados no boot + eventos) —
       zero rede ao abrir, zero spinner. a verificação de verdade acontece
       só no clique. se o cache estiver velho, uma recarga silenciosa corrige
       a linha sem spinner e só se o estado mudou. */
    let gen=++zProfRowGen, myTarget=target;
    function rowStale(){ try{ if(gen!==zProfRowGen) return true; let cur=(typeof profSel!=="undefined"&&profSel)||""; if(low(cur)!==low(myTarget)) return true; }catch(e){ return true; } return false; }
    function paintCat(cat){
      row.innerHTML="";
      try{ row.appendChild(zDot(zEff(myTarget))); }catch(e){}
      if(cat==="friends"){
        let cv=document.createElement("button"); cv.textContent=_zdmt("💬 conversar"); cv.title=_zdmt("abrir mensagem instantânea (em cima)");
        cv.style.fontWeight="bold"; cv.onclick=()=>zDMOpen(myTarget);
        let rm=document.createElement("button"); rm.textContent=_zdmt("remover amigo");
        rm.onclick=async()=>{ if(!confirm(_zdmt("Remover @"+myTarget+" dos amigos?"))) return; rm.disabled=true; rm.textContent=_zdmt("removendo..."); try{ await zTimeout(zAct("remove",myTarget),15000); }catch(e){} zPaintProfRow(); };
        row.appendChild(cv); row.appendChild(rm);
      } else if(cat==="incoming"){
        let ok=document.createElement("button"); ok.textContent=_zdmt("✅ aceitar amizade"); ok.onclick=async()=>{ ok.disabled=true; ok.textContent=_zdmt("aceitando..."); try{ await zTimeout(zAct("accept",myTarget),15000); }catch(e){} zPaintProfRow(); };
        let no=document.createElement("button"); no.textContent=_zdmt("recusar"); no.onclick=async()=>{ no.disabled=true; try{ await zTimeout(zAct("decline",myTarget),15000); }catch(e){} zPaintProfRow(); };
        row.appendChild(ok); row.appendChild(no);
      } else if(cat==="outgoing"){
        let s=document.createElement("span"); s.className="meta"; s.textContent=_zdmt("⏳ pedido enviado — aguarde aceitar"); row.appendChild(s);
      } else {
        let add=document.createElement("button"); add.textContent=_zdmt("➕ adicionar aos amigos");
        add.onclick=async()=>{
          add.disabled=true; add.textContent=_zdmt("verificando...");
          let st=null;
          try{ st=await zStateOf(myTarget); }catch(e){ st=null; }
          if(!st){ add.disabled=false; add.textContent=_zdmt("➕ adicionar aos amigos"); alert(_zdmt("sem conexão, tente de novo")); return; }
          if(st.friends||st.incoming||st.outgoing){ zPaintProfRow(); return; }
          add.textContent=_zdmt("enviando...");
          let rr=null; try{ rr=await zTimeout(zAct("req",myTarget),15000); }catch(e){}
          if(rr&&rr.ok){ add.textContent=_zdmt("pedido enviado!"); } else { add.disabled=false; add.textContent=_zdmt("➕ adicionar aos amigos"); alert(_zdmt("não deu: ")+((rr&&rr.err)||_zdmt("erro"))); return; }
          zPaintProfRow();
        };
        row.appendChild(add);
      }
      try{ if(window.zunHealRoot) window.zunHealRoot(row); }catch(e){}
      return cat;
    }
    let paintedCat = paintCat(zFriendCat(myTarget));
    try{
      let staleCache = !zFriendAt || (Date.now()-zFriendAt > 60000);
      if(staleCache && zme()){
        zLoadFriends(true, true).then(()=>{ try{
          if(gen!==zProfRowGen) return;
          let cur=""; try{ cur=(typeof profSel!=="undefined"&&profSel)||""; }catch(e){}
          if(low(cur)!==low(myTarget)) return;
          if(zFriendCat(myTarget)!==paintedCat) zPaintProfRow();
        }catch(e){} }).catch(()=>{});
      }
    }catch(e){}
  }catch(e){}
}
/* botões de amizade nos resultados da busca */
function zHookUserSearch(){
  try{
    let list=$("userSearchList"); if(!list||list._zunDM) return; list._zunDM=1;
    new MutationObserver(()=>{
      try{
        list.querySelectorAll(".urow").forEach(row=>{
          try{
            if(row._zunDM) return; row._zunDM=1;
            let nm=row.querySelector(".unick"); if(!nm) return;
            let nick=(nm.textContent||"").replace(/^@/,"").trim(); if(!zokNick(nick)) return;
            let m=zme(); if(!m||low(nick)===low(m.nick)) return;
            let b=document.createElement("button"); b.textContent="＋"; b.title=_zdmt("adicionar aos amigos");
            b.style.marginLeft="4px";
            if(zIsFriend(nick)){ b.textContent="💬"; b.title=_zdmt("conversar"); b.onclick=(e)=>{ e.stopPropagation(); zDMOpen(nick); }; }
            else b.onclick=async(e)=>{ e.stopPropagation(); b.disabled=true; let r=await zAct("req",nick); b.textContent=(r&&r.ok)?"⏳":"＋"; b.disabled=false; };
            row.appendChild(b);
          }catch(e){}
        });
      }catch(e){}
    }).observe(list,{childList:true});
  }catch(e){}
}

/* ---------- DM ---------- */
var zOpen={}, zUnread={}, zTypeUntil={}, zLastTypeSent={};
/* DM ponta a ponta PRÓPRIA (`src/zundme2e.js`, sem plugin): cada conta tem
   1 par ECDH P-256 (pública no banco FASE 13, privada só no aparelho +
   backup cifrado). Envio p/ humano com pública = envelope duplo "ENC2:"
   (metade p/ o par, metade p/ si); texto longo é fatiado em 2+ envelopes;
   par sem chave = NADA sai: a msg espera na outbox e vai sozinha quando a
   chave aparece (a 1ª msg espera o par online). "ENC1:" legado só ABRE o
   histórico antigo (sem FASE 13, cai nele por falta de E2E). Bot = claro
   (zdmEncMaybe/zdmIsBot — ela precisa ler p/ responder; DMs ao bot são
   públicas p/ o operador). Servidor guarda só cifra; TOFU nas públicas
   (fingerprint no cadeado p/ conferir fora da banda). */
var zDMKeys={};
function zdmB64e(buf){ try{ if(typeof b64e==="function") return b64e(buf); }catch(e){} let u=new Uint8Array(buf), s=""; for(let i=0;i<u.length;i++) s+=String.fromCharCode(u[i]); return btoa(s); }
function zdmB64d(s){ try{ if(typeof b64d==="function") return new Uint8Array(b64d(s)); }catch(e){} let b=atob(String(s||"")), u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
async function zdmKeyFor(x,y){
  x=low(x); y=low(y); if(!x||!y) throw new Error("nick");
  let k=x<y?(x+"|"+y):(y+"|"+x);
  if(zDMKeys[k]) return zDMKeys[k];
  let b=await crypto.subtle.digest("SHA-256", new TextEncoder().encode("zunzum-dm-v1:"+k));
  let key=await crypto.subtle.importKey("raw", b, "AES-GCM", false, ["encrypt","decrypt"]);
  zDMKeys[k]=key; return key;
}
async function zdmEnc(peer, text, url){
  text=String(text||""); url=String(url||"");
  let meL=""; try{ meL=low((zme()||{}).nick||""); }catch(e){}
  let key=await zdmKeyFor(meL||"?", peer);
  let iv=crypto.getRandomValues(new Uint8Array(12));
  let ct=await crypto.subtle.encrypt({name:"AES-GCM", iv:iv}, key, new TextEncoder().encode(JSON.stringify({t:text, u:url})));
  return {text:"ENC1:"+zdmB64e(iv)+":"+zdmB64e(ct), url:""};
}
/* a zunzunzinha é um bot sem chave: DM p/ ela vai em CLARO (ela precisa ler
   p/ responder; a IA dela vê o texto de todo jeito). Humano-humano continua
   cifrado. Mensagem antiga dela em claro abre normal (compat). */
function zdmIsBot(nick){ try{ return String(nick||"").replace(/^@/,"").toLowerCase()==="zunzunzinha"; }catch(e){ return false; } }
async function zdmEncMaybe(peer, text, url){
  if(zdmIsBot(peer)) return {text:String(text||""), url:String(url||""), bot:true};
  /* NADA sai sem criptografia: humano sem chave do par NÃO cai mais p/ o
     ENC1 ofuscado (o legado só ABRE o histórico antigo) — a msg vai p/ a
     outbox e é enviada sozinha assim que a chave do par aparecer. */
  /* Sem infra E2E (modo local/sem FASE 13 não há E2E possível): legado
     ofuscado direto, como antes — a fila só faz sentido com E2E. */
  let infra=false;
  try{ infra=!!(window.ZunDME2E&&window.ZunDME2E.available&&await window.ZunDME2E.available()); }catch(e){}
  if(!infra){ try{ let e1=await zdmEnc(peer, text, url); return {text:e1.text, url:e1.url, legacy:true}; }catch(e){ return {e2e:false, why:"err"}; } }
  try{
    if(window.ZunDME2E && typeof window.ZunDME2E.encMaybe==="function"){
      let r2=await window.ZunDME2E.encMaybe(peer, text, url);
      if(r2 && r2.e2e) return {text:r2.text, url:r2.url, e2e:true};
      if(r2 && r2.err==="size") return {e2e:false, why:"size"};
    }
  }catch(e){}
  return {e2e:false, why:"nokey"};
}
/* parte o texto p/ caber no envelope E2E (JSON ≤1300B por parte; url vai
   na 1ª). Texto longo vira 2+ mensagens cifradas — nunca ofuscada. */
function zdmChunk(text, url){
  text=String(text||""); url=String(url||"");
  let enc=null; try{ enc=new TextEncoder(); }catch(e){ return [{t:text.slice(0,1000),u:url}]; }
  let parts=[], cur="", first=true;
  let sizeOf=(t,u)=>{ try{ return enc.encode(JSON.stringify({t:t,u:u})).length; }catch(e){ return (t||"").length; } };
  for(let ch of text){
    let u=first?url:"";
    if(cur && sizeOf(cur+ch,u)>1300){ parts.push({t:cur,u:u}); cur=""; first=false; }
    cur+=ch;
  }
  parts.push({t:cur,u:first?url:""});
  return parts.filter(p=>p.t||p.u);
}
/* outbox: minhas msgs ainda NÃO enviadas (par sem chave p/ E2E). Disco
   (por par, máx 20) + espelho no banco FASE 15 (`dm_outbox`, cifrado P/ SI
   — o servidor vê só cifra). O disco cobre o offline; o banco cobre a
   TROCA DE APARELHO (o novo puxa a fila após restaurar a privada). A fila
   anda sozinha quando a chave do par aparece. */
function zOutId(){ try{ return "o"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36)+Math.floor(Math.random()*46656).toString(36); }catch(e){ return "o"+Date.now(); } }
function zOutKey(){ try{ let a=zauth(); return a?("zunDMOut:"+low(a.nick)):null; }catch(e){ return null; } }
function zOutLoad(peer){ try{ let k=zOutKey(); if(!k) return []; let o=JSON.parse(localStorage.getItem(k)||"{}")||{}; let a=o[low(peer)]; return Array.isArray(a)?a.slice(-20):[]; }catch(e){ return []; } }
function zOutSave(peer, arr){ try{ let k=zOutKey(); if(!k) return; let o={}; try{ o=JSON.parse(localStorage.getItem(k)||"{}")||{}; }catch(e){} o[low(peer)]=(arr||[]).slice(-20); localStorage.setItem(k, JSON.stringify(o)); }catch(e){} }
function zOutPush(peer, item){ try{ let a=zOutLoad(peer); a.push(item); zOutSave(peer, a); }catch(e){} }
function zOutShift(peer){ try{ let a=zOutLoad(peer); let it=a.shift(); zOutSave(peer, a); return it||null; }catch(e){ return null; } }
/* linhas antigas (pré-id) ganham id 1x — o espelho do banco é por id */
function zOutEnsureIds(peer){ try{ let a=zOutLoad(peer), ch=false; a.forEach(function(it){ if(it&&!it.id){ it.id=zOutId(); ch=true; } }); if(ch) zOutSave(peer, a); return a; }catch(e){ return []; } }
/* quais linhas EU subi p/ o banco (p/ o anti-duplicata entre aparelhos) */
function zOutSynKey(){ try{ let a=zauth(); return a?("zunDMOutSyn:"+low(a.nick)):null; }catch(e){ return null; } }
function zOutSynHas(id){ try{ let k=zOutSynKey(); if(!k||!id) return false; return !!((JSON.parse(localStorage.getItem(k)||"{}")||{})[id]); }catch(e){ return false; } }
function zOutSynAdd(id){ try{ let k=zOutSynKey(); if(!k||!id) return; let o={}; try{ o=JSON.parse(localStorage.getItem(k)||"{}")||{}; }catch(e){} o[id]=1; let ks=Object.keys(o); if(ks.length>200){ let n={}; ks.slice(-200).forEach(function(x){ n[x]=1; }); o=n; } localStorage.setItem(k, JSON.stringify(o)); }catch(e){} }
function zOutSynDel(id){ try{ let k=zOutSynKey(); if(!k||!id) return; let o={}; try{ o=JSON.parse(localStorage.getItem(k)||"{}")||{}; }catch(e){} if(o[id]){ delete o[id]; try{ localStorage.setItem(k, JSON.stringify(o)); }catch(e){} } }catch(e){} }
/* ---------- espelho da fila no banco (FASE 15) ---------- */
var _zOutDbOk=null, _zOutDbAt=0;
async function zOutDb(){
  try{
    let a=zauth(); if(!a) return null;
    if(!(window.__sb&&window.__sb.client)) return null;
    let c=await window.__sb.client(); if(!c) return null;
    let now=Date.now();
    if(_zOutDbOk===true&&now-_zOutDbAt<60000) return c;
    if(_zOutDbOk===false&&now-_zOutDbAt<60000) return null;
    let r=await c.from("dm_outbox").select("id").limit(1);
    if(r&&r.error){ _zOutDbOk=false; _zOutDbAt=now; return null; }
    _zOutDbOk=true; _zOutDbAt=now; return c;
  }catch(e){ return null; }
}
/* sobe 1 item p/ o banco (blob cifrado p/ si — servidor nunca lê o claro) */
async function zOutSyncPush(peer, item){
  try{
    if(!item||!item.id) return;
    let E=window.ZunDME2E;
    if(!E||typeof E.encSelfParts!=="function") return;
    let c=await zOutDb(); if(!c) return;
    let r=await E.encSelfParts((item.parts&&item.parts.length)?item.parts:[{t:item.t||"",u:item.u||""}]);
    if(!r||!r.ok) return;
    let a=zauth(); if(!a) return;
    let w=await c.from("dm_outbox").upsert({id:String(item.id).slice(0,64), sender:String(a.nick).toLowerCase(), peer:low(peer), blob:r.blob, mtype:String(item.mtype||"").slice(0,100)}, {onConflict:"id"});
    if(w&&!w.error) zOutSynAdd(item.id);
  }catch(e){}
}
async function zOutSyncDel(id){
  try{ if(!id) return; let c=await zOutDb(); if(!c) return; await c.from("dm_outbox").delete().eq("id", String(id).slice(0,64)); }catch(e){}
}
/* puxa as linhas do banco p/ o par (decifra c/ a privada restaurada) */
async function zOutSyncPullRows(peer, rows){
  try{
    let E=window.ZunDME2E;
    if(!E||typeof E.decSelfBlob!=="function") return;
    rows=rows||[]; if(!rows.length) return;
    let local=zOutEnsureIds(peer), have={}, added=false;
    local.forEach(function(it){ if(it&&it.id) have[it.id]=1; });
    for(let i=0;i<rows.length;i++){
      let row=rows[i]||{}, rid=String(row.id||"");
      if(!rid||have[rid]) continue;
      let d=null; try{ d=await E.decSelfBlob(row.blob); }catch(e){ d=null; }
      /* sem a chave velha neste aparelho (girou + trocou)? mantém no banco:
         outro aparelho com a chave ainda pode abrir/enviar. */
      if(!d||!d.ok||!(d.parts||[]).length) continue;
      let t="", u="";
      try{ d.parts.forEach(function(p,ix){ t+=(p&&(p.t||"")); if(ix===0) u=(p&&(p.u||"")); }); }catch(e){}
      local.push({id:rid, t:t, u:u, mtype:String(row.mtype||""), parts:d.parts, at:Date.now()});
      have[rid]=1; added=true;
      zOutSynAdd(rid);
    }
    if(added){ zOutSave(peer, local); try{ let o=zOpen[low(peer)]; if(o) zOutboxPaint(o); }catch(e){} }
  }catch(e){}
}
async function zOutSyncPull(peer){
  try{
    let c=await zOutDb(); if(!c) return;
    let a=zauth(); if(!a) return;
    let q=await c.from("dm_outbox").select("id,peer,blob,mtype").eq("sender", String(a.nick).toLowerCase()).eq("peer", low(peer)).order("created_at",{ascending:true}).limit(20);
    await zOutSyncPullRows(peer, (q&&q.data)||[]);
  }catch(e){}
}
/* login/aparelho novo: puxa a fila inteira (todos os pares) de 1x */
async function zOutSyncPullAll(){
  try{
    let c=await zOutDb(); if(!c) return;
    let a=zauth(); if(!a) return;
    let q=await c.from("dm_outbox").select("id,peer,blob,mtype").eq("sender", String(a.nick).toLowerCase()).order("created_at",{ascending:true}).limit(100);
    let rows=(q&&q.data)||[]; if(!rows.length) return;
    let byPeer={};
    rows.forEach(function(r){ let p=low((r&&r.peer)||""); if(!p) return; (byPeer[p]=byPeer[p]||[]).push(r); });
    for(let p in byPeer){ try{ await zOutSyncPullRows(p, byPeer[p]); }catch(e){} }
  }catch(e){}
}
/* giro de chave: re-cifra as linhas p/ a chave nova (chamado pelo rotDo).
   Linha que não abre aqui (chave velha sem histórico) fica p/ outro aparelho. */
async function zOutRekeyAll(){
  try{
    let E=window.ZunDME2E;
    if(!E||typeof E.decSelfBlob!=="function"||typeof E.encSelfParts!=="function") return;
    let c=await zOutDb(); if(!c) return;
    let a=zauth(); if(!a) return;
    let q=await c.from("dm_outbox").select("id,blob").eq("sender", String(a.nick).toLowerCase()).limit(100);
    let rows=(q&&q.data)||[]; if(!rows.length) return;
    for(let i=0;i<rows.length;i++){
      try{
        let d=await E.decSelfBlob(rows[i].blob);
        if(!d||!d.ok) continue;
        let r2=await E.encSelfParts(d.parts);
        if(!r2||!r2.ok) continue;
        await c.from("dm_outbox").update({blob:r2.blob}).eq("id", rows[i].id);
      }catch(e){}
    }
  }catch(e){}
}
try{ window.__zunOutRekey=function(){ try{ zOutRekeyAll(); }catch(e){} }; }catch(e){}
async function zdmDecMsg(myLower, peerLower, m){
  try{
    /* E2E sem a lib (JS velho em cache): nunca mostrar a cifra crua — trava
       explicativa em vez de "ENC2:..." na tela */
    try{
      if(m&&typeof m.t==="string"&&m.t.indexOf("ENC2:")===0&&!(window.ZunDME2E&&typeof window.ZunDME2E.decMsg==="function")){
        m._lock=1; m._lockMsg="🔒 ponta a ponta — recarregue a página p/ descriptografar (app desatualizado)"; return m;
      }
    }catch(e){}
    try{
      if(window.ZunDME2E && typeof window.ZunDME2E.decMsg==="function"){
        try{ let _e2=await window.ZunDME2E.decMsg(myLower, peerLower, m); if(_e2) return m; }catch(ee){}
      }
    }catch(e){}
    if(!m||typeof m.t!=="string"||m.t.indexOf("ENC1:")!==0) return m;
    let p=m.t.split(":"), iv, ct;
    if(p.length<3){ m._lock=1; return m; }
    iv=zdmB64d(p[1]); ct=zdmB64d(p.slice(2).join(":"));
    let key=await zdmKeyFor(myLower, peerLower);
    let pt=await crypto.subtle.decrypt({name:"AES-GCM", iv:iv}, key, ct);
    let o=JSON.parse(new TextDecoder().decode(pt));
    m.t=String((o&&o.t)||""); m.u=String((o&&o.u)||"");
    return m;
  }catch(e){ try{ m._lock=1; }catch(e2){} return m; }
}
try{ window.__zdmCrypto={key:zdmKeyFor, enc:zdmEnc, dec:zdmDecMsg, maybe:zdmEncMaybe, isBot:zdmIsBot, outPull:function(p){ try{ return zOutSyncPull(p); }catch(e){} }, outPullAll:function(){ try{ return zOutSyncPullAll(); }catch(e){} }, outDrop:function(peer,id){ try{ return zOutDrop(peer,id); }catch(e){ return false; } }}; }catch(e){}
/* não-lidas persistentes: espelho em localStorage p/ pintar instantâneo no
   login antes do dmUnread responder; o servidor é a autoridade (seen por msg) */
function zUnreadKey(){ try{ let a=zauth(); return a?("zunDMUnread:"+low(a.nick)):null; }catch(e){ return null; } }
function zUnreadLoad(){
  try{
    let k=zUnreadKey(); if(!k) return;
    let o=JSON.parse(localStorage.getItem(k)||"{}")||{};
    Object.keys(o).forEach(p=>{ let n=parseInt(o[p],10); if(n>0&&n<1000) zUnread[low(p)]=n; });
  }catch(e){}
}
function zUnreadSave(){
  try{
    let k=zUnreadKey(); if(!k) return;
    let o={};
    Object.keys(zUnread).forEach(p=>{ if(zUnread[p]>0) o[p]=zUnread[p]; });
    localStorage.setItem(k, JSON.stringify(o));
  }catch(e){}
}
/* total p/ o notify.js somar no título sem brigar */
window.__zunDMUnreadTotal=function(){ try{ let t=0; Object.keys(zUnread).forEach(k=>{ t+=zUnread[k]||0; }); return t; }catch(e){ return 0; } };
/* dedup exata de eventos realtime: o servidor publica dmm:/dms: no canal
   pessoal (dm:) E no da conversa (dmc:), então cada evento chega 2x. Sem isso
   cada msg rendia 2× (não-lida+bip). O payload inclui remetente+id (dmm:) ou
   leitor+hora (dms:), então a igualdade é exata: msg diferente nunca é
   confundida com duplicata. */
var zEvtSeen=[];
function zEvtDup(s){
  try{
    if(zEvtSeen.indexOf(s)>=0) return true;
    zEvtSeen.push(s);
    if(zEvtSeen.length>60) zEvtSeen.splice(0, zEvtSeen.length-60);
  }catch(e){}
  return false;
}
/* "key:from:mid" (novo) ou "key" (formato antigo, transição de deploy). */
function zParseMM(rest){
  try{
    let a=rest.indexOf(":"), b=rest.lastIndexOf(":");
    if(a>0&&b>a){
      let key=rest.slice(0,a), from=rest.slice(a+1,b), mid=rest.slice(b+1);
      if(key.indexOf("|")>=0&&/^[a-z0-9-_]{2,20}$/.test(from)) return {key:key,from:from,mid:mid};
    }
  }catch(e){}
  return {key:rest,from:"",mid:""};
}
/* "key:reader:at" (novo) ou "key" (antigo). */
function zParseMS(rest){
  try{
    let a=rest.indexOf(":");
    if(a>0){
      let key=rest.slice(0,a);
      if(key.indexOf("|")>=0) return {key:key};
    }
  }catch(e){}
  return {key:rest};
}
function zEnsureDM(){
  let r=$("zunDMRoot");
  if(r&&r.isConnected) return r;
  try{ let old=$("zunDMRoot"); if(old) old.remove(); }catch(e){}
  r=document.createElement("div"); r.id="zunDMRoot"; document.body.appendChild(r);
  let bar=$("zunDMBar"); if(!bar){ bar=document.createElement("div"); bar.id="zunDMBar"; document.body.appendChild(bar); }
  try{ if(window.zunHealRoot) window.zunHealRoot(r); }catch(e){}
  return r;
}
function zDMKey(a,b){ a=low(a); b=low(b); return a<b?a+"|"+b:b+"|"+a; }
async function zDMOpen(peer,opts){
  peer=String(peer||"").replace(/^@/,"").trim(); if(!zokNick(peer)) return;
  let keepUnseen=false; try{ keepUnseen=!!(opts&&opts.preserve); }catch(e){}
  let a=zauth(); if(!a){ alert("entre com nick+senha p/ conversar."); return; }
  if(low(peer)===low(a.nick)){ alert("esse é você 🙂"); return; }
  /* amizade em 3 vias: confirmado (abre), negado (avisa), inconclusivo
     (timeout/rede — espera 1x de novo e cai p/ o cache local em vez de
     acusar "não é seu amigo" à toa). */
  let st=null;
  try{ st=await zStateOf(peer); }catch(e){ st=null; }
  if(st&&st.ok&&!st.friends){ alert("@"+peer+" ainda não é seu amigo — clique em adicionar aos amigos primeiro."); try{zPaintProfRow();}catch(e){} return; }
  if(!(st&&st.ok&&st.friends)){
    try{ st=await zStateOf(peer); }catch(e){ st=null; }
    if(st&&st.ok&&!st.friends){ alert("@"+peer+" ainda não é seu amigo — clique em adicionar aos amigos primeiro."); try{zPaintProfRow();}catch(e){} return; }
    if(!(st&&st.ok&&st.friends)){
      let localFriend=false;
      try{ zFrRecallPaint(); }catch(e){}
      try{ localFriend=zIsFriend(peer); }catch(e){}
      if(!localFriend){ alert("sem conexão p/ confirmar a amizade — tente de novo em instantes (não deu p/ falar com o servidor)."); return; }
    }
  }
  zEnsureDM();
  let l=low(peer);
  if(zOpen[l]&&zOpen[l].win.isConnected){ if(zOpen[l].min) zDMMax(peer); else { zFocus(zOpen[l].input); zDMRefresh(l,true); } return; }
  try{ await zrpc("subDMConv", JSON.stringify({nick:a.nick,hash:a.hash,peer})); }catch(e){}
  let win=document.createElement("div"); win.className="zun-dm-win";
  win.innerHTML='<div class="zun-dm-h zun-mhead"><span class="zun-dm-av">?</span><span class="zun-dm-peer"></span><span class="zun-tbadge"></span><button class="zun-min" title="minimizar">–</button><button class="zun-x" title="fechar">x</button></div>'
  +'<div class="zun-dm-priv meta">verificando criptografia…</div>'
    +'<div class="zun-dm-log chatlog"></div><div class="zun-typing" hidden></div>'
    +'<div class="zun-comp"><textarea rows="1" maxlength="2000" placeholder="mensagem..."></textarea>'
    +'<div class="zun-row"><button class="zun-emoji" title="emoji">😀</button><button class="zun-gif" title="GIFs da galera" style="font-size:12px;font-weight:bold">GIF</button><button class="zun-attach" title="foto/vídeo/gif/arquivo">📎</button><input type="file" class="zun-file" accept="image/gif,image/*,video/*" hidden><button class="zun-send">enviar</button><span class="zun-st2 meta"></span></div></div>';
  zEnsureDM().appendChild(win);
  try{ if(window.ZunFmtBar){ var _zi = win.querySelector("textarea"); if(_zi) ZunFmtBar.attach(_zi, {compact:true}); } }catch(e){}
  let o={peer:peer,lower:l,win:win,log:win.querySelector(".zun-dm-log"),typing:win.querySelector(".zun-typing"),input:win.querySelector("textarea"),file:win.querySelector(".zun-file"),st2:win.querySelector(".zun-st2"),msgs:[],min:false,pendNew:0,pill:null};
  try{ zMediaSteadyDM(o.log); }catch(e){}
  try{
    let pill=document.createElement("button"); pill.className="zun-newpill"; pill.hidden=true;
    pill.onclick=()=>{ try{ zStampPinLog(o.log); o.log.scrollTop=o.log.scrollHeight; }catch(e){} o.pendNew=0; o._noAutoSeen=false; zHideNewPill(l); zFocus(o.input); zDMRefresh(l); };
    win.appendChild(pill); o.pill=pill;
    o.log.addEventListener("scroll",(ev)=>{ try{
      /* scroll programático (pin/abrir) dispara scroll CONFIÁVEL: ignora o
         que vier até 500ms após um ajuste nosso; gesto real passa */
      if(ev&&ev.isTrusted===false) return;
      try{ if(Date.now()-((o.log&&o.log._pinAt)||0)<500) return; }catch(e){}
      if((o.log.scrollHeight-o.log.scrollTop-o.log.clientHeight)<48){ o.pendNew=0; o._noAutoSeen=false; zHideNewPill(l); }
    }catch(e){} },{passive:true});
  }catch(e){}
  win.querySelector(".zun-dm-peer").textContent="@"+peer;
  try{ if(typeof paintZNick==="function") paintZNick(win.querySelector(".zun-dm-peer"), peer); }catch(e){}
  try{ if(typeof ensureZNickStyles==="function") ensureZNickStyles([peer]); }catch(e){}
  zOpen[l]=o;
  /* preserve (restore no login): marca ANTES do refresh inicial p/ ele não
     dar dmSeen automático e apagar as não-lidas antes de ler */
  try{ if(keepUnseen) o._noAutoSeen=true; }catch(e){}
  win.querySelector(".zun-x").onclick=()=>zDMClose(peer);
  win.querySelector(".zun-min").onclick=()=>{ if(o.min) zDMMax(peer); else zDMMin(peer); };
  win.querySelector(".zun-dm-h").onclick=(e)=>{ if(e.target.closest("button")) return; if(o.min) zDMMax(peer); zFocus(o.input); };
  o.input.addEventListener("input",()=>{
    try{ o.input.style.height="auto"; o.input.style.height=Math.min(o.input.scrollHeight,110)+"px"; }catch(e){}
    try{ if(o._noAutoSeen){ o._noAutoSeen=false; zDMRefresh(l,true); } }catch(e){}
    let now=Date.now();
    if(now-(zLastTypeSent[l]||0)>2500){ zLastTypeSent[l]=now; let aa=zauth(); if(aa) zrpc("dmType", JSON.stringify({nick:aa.nick,hash:aa.hash,peer})).catch(()=>{}); }
  });
  o.input.addEventListener("keydown",(e)=>{
    if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); zDMSend(l); }
    if(e.key==="Escape") zDMMin(peer);
  });
  /* focar a caixa de uma janela restaurada = "vi": marca visto sem digitar.
     ignora o foco programático da abertura (primeiros 2s de vida) */
  try{ o._bornAt=Date.now(); }catch(e){}
  o.input.addEventListener("focus",()=>{ try{ if(o._noAutoSeen&&Date.now()-(o._bornAt||0)>2000){ o._noAutoSeen=false; zDMRefresh(l,true); } }catch(e){} });
  win.querySelector(".zun-send").onclick=()=>zDMSend(l);
  win.querySelector(".zun-emoji").onclick=(e)=>{ e.stopPropagation(); try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(o.input); }catch(e2){} try{ var mob = matchMedia("(max-width:900px)").matches; if(!mob) zFocus(o.input); else if(document.activeElement===o.input) o.input.blur(); }catch(e3){} };
  try{ win.querySelector(".zun-gif").onclick=(e)=>{ e.stopPropagation(); try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(o.input, "gm"); }catch(e2){} try{ if(matchMedia("(max-width:900px)").matches){ if(document.activeElement===o.input) o.input.blur(); } else zFocus(o.input); }catch(e3){} }; }catch(eG){}
  win.querySelector(".zun-attach").onclick=()=>{ try{ o.file.click(); }catch(e){} };
  o.file.onchange=()=>{ if(o.file.files[0]) zDMSend(l); };
  try{ if(window.zunTagMHeads) window.zunTagMHeads(); }catch(e){}
  zhealDM();
  await zDMRefresh(l,true,true);
  /* restore (preserve): NÃO rouba o foco — além de evitar o teclado abrindo
     sozinho no celular, o scroll-ate-foco dispararia o listener de scroll
     (confiável) e limparia o _noAutoSeen antes do usuário ver */
  if(!keepUnseen) zFocus(o.input);
  try{ zPersistOpen(); }catch(e){}
  return o;
}
/* aviso "↓ novas" quando chega msg e o usuário está lendo o histórico:
   fica onde está (sem puxão) e desce quando quiser */
function zShowNewPill(l){
  try{
    let o=zOpen[l]; if(!o||!o.pill||o.min) return;
    let n=o.pendNew||0;
    o.pill.textContent="↓ "+(n>1?n+" novas":"nova");
    o.pill.hidden=false;
  }catch(e){}
}
function zHideNewPill(l){
  try{ let o=zOpen[l]; if(o&&o.pill) o.pill.hidden=true; }catch(e){}
}
function zDMClose(peer){
  let l=low(peer), o=zOpen[l]; if(!o) return;
  try{ o.win.remove(); }catch(e){}
  delete zOpen[l]; delete zUnread[l];
  try{ let a=zauth(); if(a) zrpc("unsubDMConv", JSON.stringify({nick:a.nick,hash:a.hash,peer})).catch(()=>{}); }catch(e){}
  try{ zPaintBar(); zPaintPanel(); zPaintTitle(); zPersistOpen(); }catch(e){}
}
function zDMMin(peer){
  let l=low(peer), o=zOpen[l]; if(!o) return;
  o.min=true; try{ o.win.classList.add("min"); }catch(e){}
  zPaintBadge(l); zPaintBar(); zPersistOpen();
}
function zDMMax(peer){
  let l=low(peer), o=zOpen[l]; if(!o) return;
  o.min=false; o._noAutoSeen=false; try{ o.win.classList.remove("min"); }catch(e){}
  zPaintBadge(l); zPaintBar(); zDMRefresh(l,true,true); zFocus(o.input);
}
/* distintivo de não-lidas no cabeçalho da janela */
function zPaintBadge(l){
  try{
    let o=zOpen[l]; if(!o) return;
    let t=o.win.querySelector(".zun-tbadge"); if(!t) return;
    let un=zUnread[l]||0;
    t.innerHTML=un?('<span class="zun-badge">'+un+'</span>'):"";
  }catch(e){}
  try{ zPaintE2E(l); }catch(e){}
}
/* cadeado E2E no header + aviso da conversa (zPaintBadge chama sempre) */
function zPaintE2E(l){
  try{
    let o=zOpen[l]; if(!o||!o.win) return;
    let h=o.win.querySelector(".zun-dm-h"); if(!h) return;
    let eb=h.querySelector(":scope > .zun-e2e");
    if(!eb){ eb=document.createElement("span"); eb.className="zun-e2e"; eb.style.cssText="font-size:11px;opacity:.85;margin-left:4px"; h.insertBefore(eb, h.querySelector(".zun-tbadge")); }
    let pv=o.win.querySelector(".zun-dm-priv");
    if(zdmIsBot(o.peer)){ eb.textContent="🤖"; eb.title="DM com a zunzunzinha: vai em claro (ela precisa ler p/ responder) — trate como pública"; if(pv) pv.textContent="com a zunzunzinha vai em claro: ela precisa ler p/ responder"; return; }
    /* sem E2E (ou sem conseguir confirmar): o aviso legado, verdadeiro */
    var LEG = "conversa ofuscada (não é ponta-a-ponta): quem opera o site consegue ler · com a zunzunzinha vai em claro";
    if(!(window.ZunDME2E&&window.ZunDME2E.state)){ eb.textContent="🔓"; eb.title="não deu p/ confirmar a criptografia"; if(pv) pv.textContent=LEG; return; }
    window.ZunDME2E.state(low(o.peer)).then(st=>{
      try{
        if(!eb.isConnected) return;
        if(!st||st.mode==="unknown"){ eb.textContent="🔓"; eb.title="não deu p/ confirmar a criptografia"; if(pv) pv.textContent=LEG; return; }
        if(st.mode==="e2e"){ eb.textContent="🔒"; eb.title="ponta a ponta · chave "+(st.fp||"?")+" — confira com seu contato fora daqui"; if(pv) pv.textContent="🔒 ponta a ponta: nem quem opera o site lê · chave "+(st.fp||"?"); }
        else { eb.textContent="🔓"; eb.title="aguardando @"+o.peer+" publicar a chave — mensagens ficam na fila, nada sai sem criptografia"; if(pv) pv.textContent="⏳ aguardando @"+o.peer+" p/ ponta a ponta — a 1ª mensagem só sai cifrada"; }
      }catch(e){}
    }).catch(()=>{});
  }catch(e){}
}
function zFlash(l){
  try{
    let o=zOpen[l]; if(!o) return;
    let h=o.win.querySelector(".zun-dm-h"); if(!h) return;
    h.classList.remove("zun-flash"); void h.offsetWidth; h.classList.add("zun-flash");
    setTimeout(()=>{ try{ h.classList.remove("zun-flash"); }catch(e){} },2300);
  }catch(e){}
}
/* (N) na aba do navegador enquanto houver não-lidas (soma DM + notify) */
var zBaseTitle="";
function zPaintTitle(){
  try{
    if(!zBaseTitle) zBaseTitle=document.title.replace(/^\(\d+\)\s*💬\s*/,"");
    let tot=0; Object.keys(zUnread).forEach(k=>{ tot+=zUnread[k]||0; });
    try{ if(window.ZNotify&&typeof window.ZNotify.total==="function") tot+=window.ZNotify.total()||0; }catch(e){}
    try{ zUnreadSave(); }catch(e){}
    document.title=tot?("("+tot+") 💬 "+zBaseTitle):zBaseTitle;
  }catch(e){}
}
/* bip curto de mensagem nova (só após algum clique na página) */
function zBeep(){
  try{
    let C=window.AudioContext||window.webkitAudioContext; if(!C) return;
    zBeep._c=zBeep._c||new C();
    let c=zBeep._c, t=c.currentTime;
    let o=c.createOscillator(), g=c.createGain();
    o.type="sine"; o.frequency.setValueAtTime(720,t); o.frequency.setValueAtTime(540,t+0.12);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.25,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.28);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+0.3);
  }catch(e){}
}
function zPaintBar(){
  let bar=$("zunDMBar"); if(!bar) return; bar.innerHTML="";
  Object.keys(zOpen).forEach(l=>{
    let o=zOpen[l]; if(!o||!o.min) return;
    let b=document.createElement("button"); b.textContent="💬 @"+o.peer;
    let un=zUnread[l]||0; if(un){ let s=document.createElement("span"); s.className="zun-badge"; s.textContent=un; b.appendChild(s); }
    b.onclick=()=>zDMMax(o.peer); bar.appendChild(b);
  });
}
function zPaintDMHeaders(){
  try{
    Object.keys(zOpen).forEach(l=>{
      let o=zOpen[l]; if(!o) return;
      let h=o.win.querySelector(".zun-dm-h"); if(!h) return;
      /* atualiza o dot no lugar (sem remover/reinserir) p/ não pulsar o header */
      try{
        let st=zEff(o.peer), cls="zun-st "+(st==="online"?"on":st==="ausente"?"aus":"off");
        let old=h.querySelector(":scope > .zun-st");
        if(old){ if(old.className!==cls) old.className=cls; old.title=(st==="online"?"online":st==="ausente"?"ausente/suspenso":"offline"); }
        else h.insertBefore(zDot(st), h.querySelector(".zun-tbadge"));
      }catch(e){}
      try{
        let av=h.querySelector(".zun-dm-av");
        if(av&&!av.querySelector("img")&&typeof getAvatar==="function"){
          getAvatar(o.peer).then(u=>{ if(u&&av.isConnected&&!av.querySelector("img")){ av.textContent=""; let im=document.createElement("img"); im.src=u; im.loading="lazy"; im.referrerPolicy="no-referrer"; im.onerror=()=>{try{im.remove();}catch(e){}}; av.appendChild(im); try{ if(typeof zunAvFxApplyNick==="function") zunAvFxApplyNick(av, o.peer); }catch(e){} } }).catch(()=>{});
        }
        if(av&&!av.textContent.trim()&&!av.querySelector("img")) av.textContent=o.peer.slice(0,1).toUpperCase();
      }catch(e){}
    });
  }catch(e){}
}
/* citar p/ responder na DM (mesmo padrão do chat pub/priv: [q=@nick]trecho[/q]
   no composer, render via fmtChat). Usa o zunQuoteInsert/zunQuoteOf global
   (app.js carrega antes); fallback local idêntico se não existir. Trecho é
   texto puro (sem aninhar [q]), máx 200 chars; sem texto vira @nick. */
function zDMQuoteOf(m){
  try{
    if(typeof zunQuoteOf==="function") return zunQuoteOf(m);
    let n=String((m&&m.f)||"");
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(n)) return null;
    let t=String((m&&m.t)||"").replace(/\[\/?q(?:=@[A-Za-z0-9-_]{2,20})?\]/gi,"").replace(/\s+/g," ").trim().slice(0,200);
    return {nick:n,text:t};
  }catch(e){ return null; }
}
function zDMQuoteInsert(inputEl,q){
  try{
    if(typeof zunQuoteInsert==="function") return zunQuoteInsert(inputEl,q);
    if(!inputEl||!q) return false;
    let tag=q.text?("[q=@"+q.nick+"]"+q.text+"[/q]\n"):("@"+q.nick+" ");
    try{
      let v=String(inputEl.value||"");
      let s=(inputEl.selectionStart!=null?inputEl.selectionStart:v.length);
      let e=(inputEl.selectionEnd!=null?inputEl.selectionEnd:v.length);
      if(typeof inputEl.setRangeText==="function") inputEl.setRangeText(tag,s,e,"end");
      else inputEl.value=v+(v&&!/\s$/.test(v)?" ":"")+tag;
    }catch(e2){ try{ inputEl.value+=tag; }catch(e3){ return false; } }
    try{ inputEl.dispatchEvent(new Event("input",{bubbles:true})); }catch(e4){}
    try{ inputEl.focus({preventDefault:true}); }catch(e5){ try{ inputEl.focus(); }catch(e6){} }
    return true;
  }catch(e){ return false; }
}
function zDMQuoteGo(inputEl,m){
  try{ let q=zDMQuoteOf(m); if(!q) return; zDMQuoteInsert(inputEl,q); }catch(e){}
}
function zDMQuoteBtn(inputEl,m){
  let qb=document.createElement("button"); qb.title="citar p/ responder"; qb.textContent="↩";
  qb.style.cssText="font-size:10px;padding:1px 6px;border:1px solid #b6c9db;background:#eef4fb;border-radius:5px;cursor:pointer";
  qb.onclick=(ev)=>{ try{ if(ev) ev.stopPropagation(); }catch(e){} zDMQuoteGo(inputEl,m); };
  return qb;
}
/* esqueleto fantasma da DM (o mesmo do pub/priv, app.js zunChatSkeleton):
   o log abre com linhas na altura de msg real em vez de vazio — não parece
   que a msg "sumiu". Só pinta em log vazio: bolha, fila pendente ou aviso
   de erro contam como conteúdo e não são tocados. */
function zDMSkeleton(o){
  try{
    if(!o||!o.log||!o.log.isConnected) return false;
    if(typeof zunChatSkeleton!=="function") return false;
    if(o.log.querySelector("[data-zk],.zskel,.zun-pend,.zun-err")) return false;
    return !!zunChatSkeleton(o.log, 24);
  }catch(e){ return false; }
}
/* aviso inline no log da DM (erro de rede, par sem conta, sem amizade):
   sem isso a janela abria vazia e parecia "quebrada". Some sozinho no
   próximo refresh com sucesso. */
function zDMNote(o,msg){
  try{
    if(!o||!o.log||!o.log.isConnected) return;
    let old=null;
    try{ old=o.log.querySelector(":scope > .zun-err"); }catch(e){ try{ old=o.log.querySelector(".zun-err"); }catch(e2){} }
    if(old){ try{ old.textContent="⚠️ "+msg; }catch(e){} return; }
    let d=document.createElement("div"); d.className="zun-err"; d.textContent="⚠️ "+msg;
    o.log.appendChild(d);
  }catch(e){}
}
function zBubble(m,mine,inputEl,ix,cv){
  let d=document.createElement("div"); d.className="zun-bub "+(mine?"mine":"theirs");
  /* índice junto na chave: duas msgs iguais no mesmo ms teriam a mesma chave
     e o restore caía na bolha errada (de cima) = PUXÃO P/ CIMA */
  try{ d.dataset.zk = String(m.at||0)+"|"+low(m.f)+"|"+String(m.t||"").length+"|"+(m.u||"").length+"|"+(ix||0); }catch(e){}
  if(m&&m._lock){
    let tx=document.createElement("div"); tx.className="zun-tx"; tx.textContent=(m&&m._lockMsg)||"🔒 mensagem cifrada (ofuscada, não ponta-a-ponta) — não abriu neste navegador"; d.appendChild(tx);
    /* ↻ tentar de novo: recarrega a pública do par (ele pode ter girado a
       chave), garante a minha (backup/outra aba) e refaz a leitura. Cura o
       "falha em decifrar" intermitente sem precisar fechar a DM. */
    try{
      if(cv&&cv.peer&&window.ZunDME2E){
        let rb=document.createElement("button"); rb.title="tentar descriptografar de novo"; rb.textContent="↻ tentar de novo";
        rb.style.cssText="font-size:10px;padding:1px 6px;border:1px solid #b6c9db;background:#eef4fb;border-radius:5px;cursor:pointer;margin-top:3px;align-self:flex-start";
        rb.onclick=async(ev)=>{ try{ if(ev) ev.stopPropagation(); }catch(e){}
          window.zunBusy(rb,true,"⏳");
          try{ if(window.ZunDME2E.forget) window.ZunDME2E.forget(cv.peer); }catch(e){}
          try{ await window.ZunDME2E.ensureMine(); }catch(e){}
          try{ await window.ZunDME2E.syncBackup(); }catch(e){}
          /* segue trancado? a custódia existe mas não abre: oferece a senha */
          try{ if(window.ZunDME2E.backupStatus && (await window.ZunDME2E.backupStatus())==="locked"){ zunDMRestoreModal(); } }catch(e){}
          try{ zDMRefresh(low(cv.peer),true); }catch(e){}
          window.zunBusy(rb,false);
        };
        d.appendChild(rb);
      }
    }catch(e){}
    let mt=document.createElement("div"); mt.className="zun-meta"; try{ mt.textContent=new Date(m.at).toLocaleString(); }catch(e){} d.appendChild(mt);
    return d;
  }
  let txDiv=null;
  if(m.t){ let tx=document.createElement("div"); tx.className="zun-tx"; try{ tx.innerHTML=(typeof fmtChat==="function"?fmtChat(m.t):esc2(m.t))+(m.ed?" (editada)":""); }catch(e){ tx.textContent=m.t+(m.ed?" (editada)":""); } txDiv=tx; d.appendChild(tx);
    /* YouTube na DM: mesma fachada do feed (ytFacade) — thumb leve, iframe
       só ao clicar. Reuso proposital p/ não cometer os erros clássicos:
       sem youtube-nocookie e sem enablejsapi/origin (erro 153), allow cheio
       p/ o autoplay do clique funcionar no mobile, link "YouTube ↗" p/ vídeo
       com incorporação bloqueada (101/150), e DOM puro (textContent acima +
       nós criados, nunca innerHTML com texto do usuário = sem XSS). */
    try{
      if(typeof ytFacadesFor==="function" && /youtu/i.test(m.t))
        ytFacadesFor(m.t, 2).forEach(function(f){ d.appendChild(f); });
    }catch(e){}
    /* clique no texto cita p/ responder (igual pub/priv): ignora clique em
       link/botão, seleção de texto e caixa de edição aberta */
    if(txDiv&&!m._lock&&inputEl){
      try{
        txDiv.style.cursor="pointer"; txDiv.title="citar p/ responder";
        txDiv.onclick=(ev)=>{ try{
          if(ev&&ev.target&&ev.target.closest&&ev.target.closest("a,button")) return;
          try{ let sel=window.getSelection(); if(sel&&!sel.isCollapsed&&txDiv.contains(sel.anchorNode)) return; }catch(e){}
          try{ if(txDiv.parentNode&&txDiv.parentNode.querySelector(".zun-dm-edit")) return; }catch(e){}
          zDMQuoteGo(inputEl,m);
        }catch(e){} };
      }catch(e){}
    }
  }
  /* gate de esquema (fix #8): inner url de DM forjada (ENC1 artesanal com
     chave pública-derivada) chegava aqui — só https vira link/mídia. */
  if(m.u && !/^https:\/\//i.test(String(m.u||""))){ let _na=document.createElement("div"); _na.className="meta"; _na.textContent="[anexo indisponível]"; d.appendChild(_na); }
  else if(m.u){
    let y=String(m.y||"");
    if(!y&&typeof guessMime==="function"){ try{ y=guessMime(m.u); }catch(e){} }
    if(y.indexOf("image/")===0){ let im=document.createElement("img"); im.className="chatimg"; try{ let dd=window.ZunDim&&window.ZunDim.get(m.u); if(dd){ im.setAttribute("width",dd[0]); im.setAttribute("height",dd[1]); } }catch(e){} im.referrerPolicy = "no-referrer"; im.loading="lazy"; im.src=m.u; im.onerror=()=>{try{im.remove();}catch(e){}}; d.appendChild(im); }
    else if(y.indexOf("video/")===0){ let v=document.createElement("video"); v.controls=true; try{ let dd2=window.ZunDim&&window.ZunDim.get(m.u); if(dd2){ v.setAttribute("width",dd2[0]); v.setAttribute("height",dd2[1]); } }catch(e){} v.referrerPolicy = "no-referrer"; v.src=m.u; v.style.maxWidth="100%"; d.appendChild(v); }
    else if(y.indexOf("audio/")===0){ let au=document.createElement("audio"); au.controls=true; au.referrerPolicy = "no-referrer"; au.src=m.u; au.style.maxWidth="100%"; d.appendChild(au); }
    else if(y.indexOf("gz/")===0){ let og=""; try{ og=(typeof zunGzOrigOf==="function"?zunGzOrigOf(y):""); }catch(e){} let s=document.createElement("div"); s.className="meta"; s.textContent="📦 comprimido"+(og?" ("+og+")":""); d.appendChild(s); let a2=document.createElement("a"); a2.href=m.u; a2.target="_blank"; a2.rel="noopener noreferrer"; a2.textContent="baixar .gz"; d.appendChild(a2); }
    else { let a2=document.createElement("a"); a2.href=m.u; a2.target="_blank"; a2.rel="noopener noreferrer"; a2.textContent="abrir anexo"; d.appendChild(a2); }
  }
  let mt=document.createElement("div"); mt.className="zun-meta";
  try{ let hh=""; if(typeof chatTime==="function") hh=chatTime(m.at); else hh=new Date(m.at).toLocaleString(); mt.textContent=hh; }catch(e){}
  if(mine){ let tk=document.createElement("span"); tk.className="zun-tick "+(m.seen?"seen":"sent"); tk.textContent=m.seen?"✓✓":"✓"; tk.title=m.seen?"visto":"enviado"; mt.appendChild(tk); }
  d.appendChild(mt);
  try{
    if(mine&&m.u&&m.u.indexOf("https://")===0&&(String(m.y||"")==="image/gif"||/\.gif([?#]|$)/i.test(m.u))&&window.ZunGifmoji){
      let gb=document.createElement("button"); gb.textContent="✨ emoji"; gb.title="virar emoji público (pequeno e comprimido)";
      gb.style.cssText="font-size:10px;padding:1px 6px;border:1px solid #b6c9db;background:#eef4fb;border-radius:5px;cursor:pointer;margin-top:3px;align-self:flex-end";
      gb.onclick=()=>{ try{ window.ZunGifmoji.promoteFromUrl(m.u, inputEl||null); }catch(e){} };
      d.appendChild(gb);
    }
  }catch(e){}
  try{
    if(mine&&m.id&&cv&&cv.peer){
      let row=document.createElement("div"); row.style.cssText="display:flex;gap:6px;justify-content:flex-end;margin-top:2px";
      try{ if(!m._lock&&inputEl) row.appendChild(zDMQuoteBtn(inputEl,m)); }catch(e){}
      let eb=document.createElement("button"); eb.title="editar mensagem"; if(typeof zunSvgPencilBtn==="function") zunSvgPencilBtn(eb); else eb.textContent="✏️";
      eb.style.cssText="font-size:10px;padding:1px 6px;border:1px solid #b6c9db;background:#eef4fb;border-radius:5px;cursor:pointer";
      eb.onclick=()=>{ try{ zDMEditMsg(cv, m, txDiv, null, eb); }catch(e){} };
      let db=document.createElement("button"); db.title="apagar mensagem"; if(typeof zunSvgTrashBtn==="function") zunSvgTrashBtn(db); else db.textContent="🗑️";
      db.style.cssText=eb.style.cssText;
      db.onclick=async ()=>{ if(!confirm("apagar esta mensagem?")) return; window.zunBusy(db,true,"\u23F3 apagando..."); try{ let a=zauth(); if(!a){ window.zunBusy(db,false); return; } try{ d.style.display="none"; }catch(e){} let r=JSON.parse(await zrpc("dmDel", JSON.stringify({nick:a.nick,hash:a.hash,peer:cv.peer,id:m.id}))); if(r&&r.queued&&!r.local){ try{ zDMRefresh(low(cv.peer),true); }catch(e){} } else if(r&&r.ok){ try{ zDMRefresh(low(cv.peer),true); }catch(e){} } else { try{ d.style.display=""; }catch(e){} } }catch(e){} window.zunBusy(db,false); };
      row.appendChild(eb); row.appendChild(db); d.appendChild(row);
    }
  }catch(e){}
  try{
    if(!mine&&!m._lock&&inputEl){
      let row=document.createElement("div"); row.style.cssText="display:flex;gap:6px;justify-content:flex-start;margin-top:2px";
      row.appendChild(zDMQuoteBtn(inputEl,m)); d.appendChild(row);
    }
  }catch(e){}
  return d;
}
/* edição inline de DM própria */
function zDMEditMsg(cv,m,txDiv,notice,eb){
  try{
    if(!cv||!m||!m.id) return;
    let a=zauth(); if(!a) return;
    if(txDiv&&txDiv.parentNode&&txDiv.parentNode.querySelector(".zun-dm-edit")) return;
    let old=String(m.t||"");
    let box=document.createElement("div"); box.className="zun-dm-edit"; box.style.marginTop="3px";
    let inp=document.createElement("input"); inp.value=old; inp.maxLength=2000; inp.style.width="100%"; inp.style.boxSizing="border-box";
    let sv=document.createElement("button"); sv.textContent="ok"; sv.style.marginRight="4px";
    let cx=document.createElement("button"); cx.textContent="x";
    box.appendChild(inp); box.appendChild(sv); box.appendChild(cx);
    if(notice){ try{ let _nm=document.createElement("div"); _nm.className="meta"; _nm.textContent=String(notice); box.appendChild(_nm); }catch(e){} }
    if(txDiv){ txDiv.style.display="none"; txDiv.parentNode.insertBefore(box, txDiv.nextSibling); }
    try{ if(window.ZunFmtBar) ZunFmtBar.attach(inp, {compact:true}); }catch(e){}
    try{ inp.focus(); inp.select(); }catch(e){}
    cx.onclick=()=>{ if(txDiv) txDiv.style.display=""; try{ box.remove(); }catch(e){} };
    sv.onclick=async ()=>{
      let t=inp.value.trim();
      if(!t||t===old){ if(txDiv) txDiv.style.display=""; try{ box.remove(); }catch(e){} return; }
      t=t.slice(0,2000);
      let oldHtml="";
      try{ oldHtml=txDiv?txDiv.innerHTML:""; if(txDiv){ try{ txDiv.innerHTML=(typeof fmtChat==="function"?fmtChat(t):esc2(t))+" (editada)"; txDiv.style.display=""; }catch(e){} } }catch(e){}
      try{ box.remove(); }catch(e){}
      try{
        let wt=t, wu=m.u||"";
      try{
        let enc2=await zdmEncMaybe(cv.peer, wt, wu);
        if(enc2&&(enc2.e2e||enc2.bot||enc2.legacy)){ wt=enc2.text; wu=enc2.url; }
        else{ try{ if(txDiv) txDiv.innerHTML=oldHtml; }catch(e){} try{ zDMEditMsg(cv, m, txDiv, "sem chave — tente de novo", eb); }catch(e){} return; }
      }catch(e){}
      let r=null;
      try{ r=JSON.parse(await zrpc("dmEdit", JSON.stringify({nick:a.nick,hash:a.hash,peer:cv.peer,id:m.id,text:wt,url:wu,mtype:m.y||""}))); }catch(e){}
        if(r&&r.ok){ try{ m.t=t; m.ed=1; }catch(e){} try{ zDMRefresh(low(cv.peer),true); }catch(e){} return; }
        try{ if(txDiv) txDiv.innerHTML=oldHtml; }catch(e){}
        try{ if(eb&&typeof flashBtn==="function") flashBtn(eb, !r?"sem servidor":"erro"); }catch(e){}
      }catch(e){}
    };
  }catch(e){}
}
/* troca só o ✓/✓✓ no lugar (o bubble continua o mesmo nó) */
function zTicksInPlace(o,mym){
  try{
    let kids=o.log.children;
    for(let ix=0;ix<o.msgs.length&&ix<kids.length;ix++){
      let m=o.msgs[ix];
      if(low(m.f)!==mym) continue;
      let tk=kids[ix].querySelector(":scope > .zun-meta > .zun-tick");
      if(!tk) continue;
      let seen=!!m.seen, want=seen?"seen":"sent";
      if(!tk.classList.contains(want)){ tk.className="zun-tick "+want; tk.textContent=seen?"✓✓":"✓"; tk.title=seen?"visto":"enviado"; }
    }
  }catch(e){}
}
/* chave da última mensagem: distingue "chegou msg nova" de "só virou ✓✓" */
function zMsgKey(m){
  try{ return String((m&&m.id)||"")+"|"+String((m&&m.at)||0)+"|"+low(m&&m.f)+"|"+String((m&&m.t)||"").length+"|"+String((m&&m.u)||"")+((m&&m.ed)?"|e":""); }catch(e){ return ""; }
}
/* assinatura barata do estado visível: evita reconstruir o log à toa (piscadas) */
function zSig(msgs,mym){
  try{
    let seenMine=0, unTheirs=0, last=null, ch=0;
    for(let i=0;i<msgs.length;i++){ let m=msgs[i]; if(low(m.f)===mym){ if(m.seen) seenMine++; } else if(!m.seen) unTheirs++; last=m; ch+=String((m&&m.id)||"").length+String((m&&m.t)||"").length+String((m&&m.u)||"").length+((m&&m.ed)?7:0); }
    return msgs.length+"|"+seenMine+"|"+unTheirs+"|"+(last?(last.id+"|"+last.at+"|"+(last.t||"").length+"|"+(last.u||"")+(last.ed?"|e":"")):"-")+"|"+ch;
  }catch(e){ return String((msgs||[]).length); }
}
/* sincroniza não-lidas com o servidor (autoridade). notify=true: toast + bip
   no login quando houver novidades. Troca o mapa (limpa zeradas/ex-amigos);
   se chegou DM no meio da sincronia, roda de novo 1x p/ não perder badge. */
var zSyncing=false, zDmmDuringSync=false;
async function zSyncUnread(notify){
  if(zSyncing) return null;
  let a=zauth(); if(!a) return null;
  zSyncing=true; zDmmDuringSync=false;
  try{
    let r=JSON.parse(await zrpc("dmUnread", JSON.stringify({nick:a.nick,hash:a.hash})));
    if(!r||!r.ok) return null;
    let un=(r&&r.un)||{}, fresh={};
    Object.keys(un).forEach(peer=>{
      let n=parseInt(un[peer]&&un[peer].n,10)||0;
      if(n>0) fresh[low(peer)]={n:n, nick:peer, at:(un[peer]&&un[peer].at)||0};
    });
    zUnread={};
    Object.keys(fresh).forEach(l=>{ zUnread[l]=fresh[l].n; });
    try{ zUnreadSave(); }catch(e){}
    try{ zPaintPanel(); }catch(e){}
    try{ Object.keys(zOpen).forEach(l=>zPaintBadge(l)); zPaintBar(); }catch(e){}
    zPaintTitle();
    if(notify){
      let tot=parseInt(r.total,10)||0;
      if(tot>0){ zUnreadToast(tot, fresh); zBeep(); }
    }
    return r;
  }catch(e){ return null; }
  finally{
    zSyncing=false;
    try{ if(zDmmDuringSync){ zDmmDuringSync=false; setTimeout(()=>zSyncUnread(false), 600); } }catch(e){}
  }
}
/* aviso de login: "N mensagens novas: @a (3), @b (1)" — some sozinho */
function zUnreadToast(tot, fresh){
  try{
    let old=$("zunUnreadToast"); if(old) old.remove();
    let peers=Object.keys(fresh||{}).sort((a,b)=>(((fresh[b]||{}).at||0)-((fresh[a]||{}).at||0))).slice(0,3);
    if(!peers.length) return;
    let d=document.createElement("div"); d.id="zunUnreadToast";
    d.style.cssText="position:fixed;left:10px;bottom:10px;z-index:210;max-width:min(340px,92vw);background:#33507a;color:#fff;border:1px solid #6aa5d7;border-radius:10px;padding:8px 10px;font-size:12px;box-shadow:0 8px 24px rgba(20,40,70,.4);cursor:pointer;text-align:left";
    let names=peers.map(l=>"@"+((fresh[l]||{}).nick||l)+" ("+((fresh[l]||{}).n||0)+")").join(", ");
    d.textContent="💬 "+tot+(tot>1?" mensagens novas":" mensagem nova")+": "+names;
    d.title="abrir conversa";
    d.onclick=()=>{ try{ d.remove(); }catch(e){} try{ zDMOpen(peers[0]); }catch(e){} };
    document.body.appendChild(d);
    setTimeout(()=>{ try{ if(d.isConnected) d.remove(); }catch(e){} },9000);
  }catch(e){}
}
async function zDMRefresh(l,force,pin){
  let o=zOpen[l]; if(!o) return;
  let a=zauth(); if(!a) return;
  /* guarda anti-corrida: se outra refresh da mesma conversa começou depois,
     esta resposta (velha) é descartada */
  o._seq=(o._seq||0)+1; let mySeq=o._seq;
  /* egress: poller de 6s começa pelo tiny (~3KB: ids+flags). Corpos (~20KB)
     só quando algo muda — ou no backstop a cada 10 ciclos (pega edições,
     que não mudam id). Falhou? cai no full de sempre. */
  o._tinyN=(o._tinyN||0)+1;
  if(!force&&!pin&&o.msgs&&o.msgs.length&&(o._tinyN%10!==0)){
    try{
      let tqr=JSON.parse(await zrpc("dmGet", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer,tiny:1})));
      if(tqr&&tqr.ok&&zOpen[l]===o&&o._seq===mySeq){
        let tk=tqr.ticks||[], same=tk.length===o.msgs.length, mymT=low(a.nick);
        if(same){ for(let _i=0;_i<tk.length;_i++){ let _m=o.msgs[_i], _t=tk[_i];
          if(String(_t.id)!==String(_m.id)||low(_t.a)!==low(_m.f)||!!_t.s!==!!_m.seen||!!_t.e!==!!_m.ed||!!_t.u!==!!(_m.u||"")){ same=false; break; } } }
        if(same){
          if(tqr.st!==undefined){ zStCache[l]=tqr.st||""; zStSave(); }
          for(let _j=0;_j<tk.length;_j++){ o.msgs[_j].seen=tk[_j].s?1:0; o.msgs[_j].ed=tk[_j].e?1:0; }
          zPaintDMHeaders();
          try{ zTicksInPlace(o,mymT); }catch(e){}
          try{ let _e=o.log.querySelector(":scope > .zun-err"); if(_e) _e.remove(); }catch(e){ try{ let _e2=o.log.querySelector(".zun-err"); if(_e2) _e2.remove(); }catch(e2){} }
          let stillNew=false;
          try{ for(let _m of o.msgs){ if(low(_m.f)!==mymT&&!_m.seen){ stillNew=true; break; } } }catch(e){}
          if(stillNew&&!o.min&&!o._noAutoSeen){ try{ await zrpc("dmSeen", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer})); stillNew=false; try{ for(let _m of o.msgs){ if(low(_m.f)!==mymT) _m.seen=1; } }catch(e){} }catch(e){} }
          o._sig=zSig(o.msgs,mymT);
          if(!stillNew&&!o.min&&!o._noAutoSeen&&zUnread[l]){ zUnread[l]=0; try{zPaintPanel();}catch(e){} zPaintBar(); }
          else zPaintBadge(l);
          try{ zOutboxPaint(o); }catch(e){}
          try{ if(zOutLoad(o.peer).length&&!o._flushing) zOutboxFlush(l); }catch(e){}
          return;
        }
      }
    }catch(e){}
  }
  try{
    let r=null;
    /* esqueleto fantasma igual ao do pub/priv: o log abre preenchido com
       linhas-fantasma enquanto o banco não responde. O realtime (dmm:) chama
       este mesmo refresh com force — mas janela com conteúdo nunca é tocada
       (o guard do zDMSkeleton só pinta em log vazio). */
    try{ zDMSkeleton(o); }catch(e){}
    try{ r=JSON.parse(await zrpc("dmGet", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer}))); }catch(e){ r=null; }
    if(zOpen[l]!==o||o._seq!==mySeq) return;
    if(!r||!r.ok){
      /* falha visível em vez de janela vazia "quebrada": só avisa quando o
         usuário está esperando (abrir/enviar/desminimizar) ou o log ainda
         está vazio; poll de fundo com histórico continua silencioso */
      try{
        let first=!o.msgs||!o.msgs.length;
        if(pin||force||first){
          let msg="sem conexão — tentando de novo sozinho";
          try{
            let er=String((r&&r.err)||"");
            if(er==="noid") msg="@"+o.peer+" não encontrado (conta apagada ou renomeada?)";
            else if(er==="amigos") msg="vocês não são mais amigos — peça um novo pedido de amizade";
            else if(er==="auth") msg="sessão expirada — entre de novo";
          }catch(e){}
          zDMNote(o,msg);
          try{ o.st2.textContent=msg; }catch(e){}
        }
      }catch(e){}
      return;
    }
    if(r.st!==undefined){ zStCache[l]=r.st||""; zStSave(); }
    let prevMsgs = o.msgs||[];
    o.msgs=r.msgs||[];
    let mym=low(a.nick);
    try{ await Promise.all(o.msgs.map(m=>zdmDecMsg(mym, low(o.peer), m))); }catch(e){}
    let sig=zSig(o.msgs,mym);
    if(!force&&sig===o._sig){ zPaintDMHeaders(); try{ zOutboxPaint(o); }catch(e){} try{ if(zOutLoad(o.peer).length&&!o._flushing) zOutboxFlush(l); }catch(e){} return; }
    o._sig=sig;
    /* só virou ✓→✓✓ (mesmas msgs, mesmos ids)? atualiza os ticks no lugar,
       sem reconstruir o log = zero shift de layout, zero puxão */
    let sameKeys=false;
    try{
      sameKeys=(o.msgs.length===prevMsgs.length&&prevMsgs.length>0);
      if(sameKeys){ for(let _ki=0;_ki<o.msgs.length;_ki++){ if(zMsgKey(o.msgs[_ki])!==zMsgKey(prevMsgs[_ki])){ sameKeys=false; break; } } }
    }catch(e){ sameKeys=false; }
    if(sameKeys){
      try{ zTicksInPlace(o,mym); }catch(e){}
      try{ let _e=o.log.querySelector(":scope > .zun-err"); if(_e) _e.remove(); }catch(e){ try{ let _e2=o.log.querySelector(".zun-err"); if(_e2) _e2.remove(); }catch(e2){} }
      zPaintDMHeaders();
      let stillNew=false;
      try{ for(let _m of o.msgs){ if(low(_m.f)!==mym&&!_m.seen){ stillNew=true; break; } } }catch(e){}
      /* mesmo sem reconstruir: quem está com a janela aberta e já interagiu
         (sem _noAutoSeen) marca visto aqui também — senão o dmSeen só
         aconteceria quando chegasse msg nova */
      if(stillNew&&!o.min&&!o._noAutoSeen){ try{ await zrpc("dmSeen", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer})); stillNew=false; try{ for(let _m of o.msgs){ if(low(_m.f)!==mym) _m.seen=1; } }catch(e){} }catch(e){} }
      if(!stillNew&&!o.min&&!o._noAutoSeen&&zUnread[l]){ zUnread[l]=0; try{zPaintPanel();}catch(e){} zPaintBar(); zPaintTitle(); }
      else zPaintBadge(l);
      try{ zOutboxPaint(o); }catch(e){}
      try{ if(zOutLoad(o.peer).length&&!o._flushing) zOutboxFlush(l); }catch(e){}
      return;
    }
    /* conteúdo realmente novo? (chegou msg / enviou) — se foi só flip de
       ✓→✓✓ (o outro lado leu), NÃO puxa p/ o fim: respeita onde está lendo */
    let isNew = true;
    try{
      let _nl = o.msgs.length?o.msgs[o.msgs.length-1]:null;
      let _pl = prevMsgs.length?prevMsgs[prevMsgs.length-1]:null;
      isNew = (o.msgs.length!==prevMsgs.length) || (zMsgKey(_nl)!==zMsgKey(_pl));
    }catch(e){ isNew = true; }
    let wasBottom=true;
    try{ wasBottom=(o.log.scrollHeight-o.log.scrollTop-o.log.clientHeight<48); }catch(e){}
    let st=0, ancDM=null; try{ st=o.log.scrollTop; ancDM=zAnchorSaveDM(o.log); }catch(e){}
    o.log.innerHTML="";
    o.msgs.forEach((m,ix)=>{ try{ o.log.appendChild(zBubble(m,low(m.f)===mym,o.input,ix,o)); }catch(e){} });
    try{ if(window.ZunEmoji&&window.ZunEmoji.enhance) window.ZunEmoji.enhance(o.log); }catch(e){}
    try{ if(window.ZunGifmoji&&window.ZunGifmoji.enhance) window.ZunGifmoji.enhance(o.log); }catch(e){}
    zPaintDMHeaders(); zhealDM(o.log);
    /* msg nova com usuário no fim → acompanha; lendo histórico → fica onde
       está + aviso "↓ novas" (sem puxão). pin=true (abrir/enviar/desminimizar)
       SEMPRE desce: sem o "&&isNew" o update realtime (dmm) consumia a
       novidade antes e o próprio envio não descia */
    if(isNew && !wasBottom && !o.min && prevMsgs.length && !pin){
      o.pendNew=(o.pendNew||0)+Math.max(1,o.msgs.length-prevMsgs.length);
      zShowNewPill(l);
    }
    if(wasBottom||pin){ o.pendNew=0; zHideNewPill(l); }
    zPinBottomDM(o, wasBottom||pin, st, ancDM);
    let hasNew=o.msgs.some(m=>low(m.f)!==mym&&!m.seen);
    /* minimizado = ainda não leu: não marca visto nem zera o distintivo.
       _noAutoSeen = janela restaurada no login: preserva até interagir */
    if(hasNew&&!o.min&&!o._noAutoSeen){ try{ await zrpc("dmSeen", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer})); }catch(e){} }
    if(!o.min&&!o._noAutoSeen&&zUnread[l]){ zUnread[l]=0; try{zPaintPanel();}catch(e){} zPaintBar(); }
    zPaintBadge(l); zPaintTitle();
    try{ zOutboxPaint(o); }catch(e){}
    /* conversa vazia de verdade: mesma dica "diga oi" do pub/priv em vez de
       log em branco. Vem DEPOIS da fila (pendente conta como conteúdo) e o
       skeleton remove sozinho (data-zempty) quando pinta. */
    try{ if(window.ZunEmoji&&window.ZunEmoji.emptyHint) window.ZunEmoji.emptyHint(o.log); }catch(e){}
    try{ if(zOutLoad(o.peer).length&&!o._flushing) zOutboxFlush(l); }catch(e){}
  }catch(e){}
}
async function zDMSend(l){
  let o=zOpen[l]; if(!o) return;
  let a=zauth(); if(!a) return;
  try{ o._noAutoSeen=false; }catch(e){}
  let t=""; try{ t=o.input.value.trim().slice(0,2000); }catch(e){}
  let f=null; try{ f=o.file.files[0]||null; }catch(e){}
  if(!t&&!f) return;
  /* PC lento: Enter duplo enquanto o 1º ainda comprime/envia não gera 2º
     envio (o servidor tb responde dup:1, mas nem chega a mandar de novo). */
  if(o._sending) return; o._sending=true;
  o.st2.textContent="enviando...";
  let url="",mtype="",bbytes=0;
  try{
    if(f){
      if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ o.st2.textContent="svg bloqueado (use png/jpg)"; o._sending=false; return; }
      try{ if(typeof prepUpload==="function") f=await prepUpload(f,1024,0.82,(s)=>{ o.st2.textContent=s; }); }catch(e){ if(/svg/i.test((e&&e.message)||"")){ o.st2.textContent="svg bloqueado"; o._sending=false; return; } }
      let max=10485760; try{ if(typeof zunMaxFor==="function") max=zunMaxFor(f); else if(typeof ZUN_MAX_FILE!=="undefined"&&ZUN_MAX_FILE>0) max=ZUN_MAX_FILE; }catch(e){}
      if(f.size>max){ try{ o.st2.textContent=(typeof zunLimitMsg==="function"?zunLimitMsg(f):"arquivo muito grande (máx 10MB comprimido)"); }catch(_e){ o.st2.textContent="arquivo muito grande (máx 10MB comprimido)"; } o._sending=false; return; }
      o.st2.textContent="enviando...";
      let up=null;
      try{ up=await zunUpload(f,{expires:Date.now()+1000*60*60*24*30}); }catch(e){ o.st2.textContent="erro upload"; o._sending=false; return; }
      if(!up||up.error){ try{ o.st2.textContent=((up&&up.error==="grande")?(typeof zunLimitMsg==="function"?zunLimitMsg(f):"arquivo muito grande (máx 10MB comprimido)"):"erro upload"); }catch(_e){ o.st2.textContent="erro upload"; } o._sending=false; return; }
      url=up.url; try{ mtype=(typeof zunGzMtype==="function"?zunGzMtype(f):f.type)||""; }catch(e){ mtype=f.type||""; }
      try{ bbytes=f.size||0; }catch(e){}
    }
    let wireT=t, wireU=url;
    if(zdmIsBot(o.peer)){
      /* bot: claro direto (ela precisa ler p/ responder) */
      let r=JSON.parse(await zrpc("dmPush", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer,text:t,url:url,mtype,bytes:bbytes})));
      /* outbox r51: filado — a msg está guardada, o drain rejoga sozinho. */
      if(r&&r.queued&&!r.local){ o.input.value=""; try{ o.file.value=""; }catch(e){} o.st2.textContent="na fila — envia sozinho"; o._sending=false; return; }
      if(!r||!r.ok){
        let w=parseInt((r&&r.wait)||0)||0;
        if(r&&r.err==="spam") o.st2.textContent="🚫 spam! aguarde "+w+"s";
        else if(r&&r.err==="devagar") o.st2.textContent="⏳ devagar! aguarde "+w+"s";
        else o.st2.textContent="erro: "+((r&&r.err)||"?");
        o._sending=false; return;
      }
      o.input.value=""; try{ o.file.value=""; }catch(e){} o.st2.textContent="";
      try{ o.input.style.height="38px"; }catch(e){}
      await zDMRefresh(l,true,true); o._sending=false;
      return;
    }
    let infra=false;
    try{ infra=!!(window.ZunDME2E&&window.ZunDME2E.available&&await window.ZunDME2E.available()); }catch(e){}
    if(!infra){
      /* sem infra E2E (modo local/sem FASE 13): legado ofuscado direto */
      let wireT=t, wireU=url;
      try{ let enc=await zdmEnc(o.peer, t, url); wireT=enc.text; wireU=enc.url; }catch(e){}
      let r=JSON.parse(await zrpc("dmPush", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer,text:wireT,url:wireU,mtype,bytes:bbytes})));
      /* outbox r51: filado — a msg está guardada, o drain rejoga sozinho. */
      if(r&&r.queued&&!r.local){ o.input.value=""; try{ o.file.value=""; }catch(e){} o.st2.textContent="na fila — envia sozinho"; o._sending=false; return; }
      if(!r||!r.ok){
        let w=parseInt((r&&r.wait)||0)||0;
        if(r&&r.err==="spam") o.st2.textContent="🚫 spam! aguarde "+w+"s";
        else if(r&&r.err==="devagar") o.st2.textContent="⏳ devagar! aguarde "+w+"s";
        else o.st2.textContent="erro: "+((r&&r.err)||"?");
        o._sending=false; return;
      }
      o.input.value=""; try{ o.file.value=""; }catch(e){} o.st2.textContent="";
      try{ o.input.style.height="38px"; }catch(e){}
      await zDMRefresh(l,true,true); o._sending=false;
      return;
    }
    /* humano com E2E: TUDO pela fila — cifra agora ou espera a chave do
       par. Nada sai sem ponta a ponta (a 1ª msg espera o par online). */
    let parts=zdmChunk(t, url);
    if(!parts.length){ o.st2.textContent=""; o._sending=false; return; }
    let _it0={id:zOutId(), t:t, u:url, mtype:mtype, bytes:bbytes, parts:parts, at:Date.now()};
    zOutPush(o.peer, _it0);
    try{ zOutSyncPush(o.peer, _it0); }catch(e){}
    o.input.value=""; try{ o.file.value=""; }catch(e){} o.st2.textContent="";
    try{ o.input.style.height="38px"; }catch(e){}
    try{ zOutboxPaint(o); }catch(e){}
    o._sending=false;
    try{ zOutboxFlush(l); }catch(e){}
  }catch(e){ try{ o.st2.textContent="sem conexão"; }catch(e2){} }
  finally{ try{ o._sending=false; }catch(e){} }
}
/* pinta a fila no fim do log (bolhas ⏳) — somem sozinhas ao enviar */
function zOutboxPaint(o){
  try{
    if(!o||!o.log||!o.log.isConnected) return;
    o.log.querySelectorAll(":scope > .zun-pend").forEach(function(n){ try{ n.remove(); }catch(e){} });
    let q=[]; try{ q=zOutEnsureIds(o.peer); }catch(e){ try{ q=zOutLoad(o.peer); }catch(e2){} }
    q.forEach(function(it){
      let d=document.createElement("div"); d.className="zun-bub mine zun-pend";
      let tx=document.createElement("div"); tx.className="zun-tx";
      /* pendente mostra cor/citação igual à enviada (era texto puro e a cor
         "sumia" p/ mim até o envio) */
      let praw=String((it&&it.t)||"")||"(anexo)";
      try{ tx.innerHTML=(typeof fmtChat==="function"?fmtChat(praw):esc2(praw)); }catch(e){ tx.textContent=praw; }
      d.appendChild(tx);
      let mt=document.createElement("div"); mt.className="zun-meta";
      mt.textContent=(it&&it.err)?zOutErrMsg(it.err, o.peer):("⏳ aguardando @"+o.peer+"…");
      d.appendChild(mt);
      /* fila tbm edita/apaga (igual às enviadas): mexe no disco + banco */
      try{
        if(it&&it.id){
          let row=document.createElement("div"); row.style.cssText="display:flex;gap:6px;justify-content:flex-end;margin-top:2px";
          let eb=document.createElement("button"); eb.title="editar mensagem da fila"; if(typeof zunSvgPencilBtn==="function") zunSvgPencilBtn(eb); else eb.textContent="✏️";
          eb.style.cssText="font-size:10px;padding:1px 6px;border:1px solid #b6c9db;background:#eef4fb;border-radius:5px;cursor:pointer";
          eb.onclick=function(){ try{ zOutEditMsg(o, it, tx); }catch(e){} };
          let db=document.createElement("button"); db.title="apagar mensagem da fila"; if(typeof zunSvgTrashBtn==="function") zunSvgTrashBtn(db); else db.textContent="🗑️";
          db.style.cssText=eb.style.cssText;
          db.onclick=function(){ if(!confirm("apagar esta mensagem da fila?")) return; try{ zOutDrop(o.peer, it.id); }catch(e){} };
          row.appendChild(eb); row.appendChild(db); d.appendChild(row);
        }
      }catch(e){}
      o.log.appendChild(d);
    });
    if(q.length){ try{ o.log.scrollTop=o.log.scrollHeight; }catch(e){} }
  }catch(e){}
}
/* apaga 1 item da fila (disco + banco) */
function zOutDrop(peer, id){
  try{
    if(!id) return false;
    let arr=[]; try{ arr=zOutLoad(peer).filter(function(x){ return !x||!x.id||x.id!==id; }); }catch(e){ arr=[]; }
    zOutSave(peer, arr);
    zOutSynDel(id);
    try{ zOutSyncDel(id); }catch(e){}
    try{ let o=zOpen[low(peer)]; if(o) zOutboxPaint(o); }catch(e){}
    return true;
  }catch(e){ return false; }
}
/* remove 1 item da fila por id (o flush usa p/ não depender da posição) */
function zOutRemoveId(peer, id){
  try{
    if(!id) return false;
    let arr=zOutLoad(peer), out=arr.filter(function(x){ return !x||!x.id||x.id!==id; });
    if(out.length===arr.length) return false;
    zOutSave(peer, out);
    try{ let o=zOpen[low(peer)]; if(o) zOutboxPaint(o); }catch(e){}
    return true;
  }catch(e){ return false; }
}
/* motivo do item parado na fila (erro definitivo do servidor) */
function zOutErrMsg(er, peer){
  er=String(er||"");
  if(er==="amigos") return "⚠️ vocês não são mais amigos — item parado (peça novo pedido p/ reenviar)";
  if(er==="noid") return "⚠️ @"+peer+" não encontrado — item parado";
  if(er==="auth") return "⚠️ sessão expirada — entre de novo e reenvie";
  if(er==="vazio") return "⚠️ mensagem vazia — edite ou apague";
  if(er==="url") return "⚠️ anexo inválido — edite ou apague";
  return "⚠️ erro ("+er+") — item parado";
}
/* edição inline de item da fila (disco + banco; tenta enviar em seguida) */
function zOutEditMsg(o, it, txDiv){
  try{
    if(!o||!it||!it.id) return;
    let a=zauth(); if(!a) return;
    if(txDiv&&txDiv.parentNode&&txDiv.parentNode.querySelector(".zun-dm-edit")) return;
    let old=String(it.t||"");
    let box=document.createElement("div"); box.className="zun-dm-edit"; box.style.marginTop="3px";
    let inp=document.createElement("input"); inp.value=old; inp.maxLength=2000; inp.style.width="100%"; inp.style.boxSizing="border-box";
    let sv=document.createElement("button"); sv.textContent="ok"; sv.style.marginRight="4px";
    let cx=document.createElement("button"); cx.textContent="x";
    box.appendChild(inp); box.appendChild(sv); box.appendChild(cx);
    if(txDiv){ txDiv.style.display="none"; txDiv.parentNode.insertBefore(box, txDiv.nextSibling); }
    try{ if(window.ZunFmtBar) ZunFmtBar.attach(inp, {compact:true}); }catch(e){}
    try{ inp.focus(); inp.select(); }catch(e){}
    cx.onclick=function(){ if(txDiv) txDiv.style.display=""; try{ box.remove(); }catch(e){} };
    sv.onclick=function(){
      let t=""; try{ t=inp.value.trim().slice(0,2000); }catch(e){}
      if(!t||t===old){ if(txDiv) txDiv.style.display=""; try{ box.remove(); }catch(e){} return; }
      let oldHtml="";
      try{ oldHtml=txDiv?txDiv.innerHTML:""; if(txDiv){ try{ txDiv.innerHTML=(typeof fmtChat==="function"?fmtChat(t):esc2(t))+" (editada)"; txDiv.style.display=""; }catch(e){} } }catch(e){}
      try{ box.remove(); }catch(e){}
      try{
        let parts=zdmChunk(t, it.u||"");
        if(!parts.length){ try{ if(txDiv) txDiv.innerHTML=oldHtml; }catch(e){} return; }
        let arr=zOutEnsureIds(o.peer), cur=null;
        for(let i=0;i<arr.length;i++){ if(arr[i]&&arr[i].id===it.id){ arr[i].t=t; arr[i].parts=parts; try{ delete arr[i].err; }catch(e){} cur=arr[i]; break; } }
        if(!cur){ try{ if(txDiv) txDiv.innerHTML=oldHtml; }catch(e){} return; }
        zOutSave(o.peer, arr);
        try{ zOutSyncPush(o.peer, cur); }catch(e){}
        try{ zOutboxPaint(o); }catch(e){}
        try{ zOutboxFlush(low(o.peer)); }catch(e){}
      }catch(e){ try{ if(txDiv) txDiv.innerHTML=oldHtml; }catch(e2){} }
    };
  }catch(e){}
}
/* tenta enviar a fila: cifra cada parte; par ainda sem chave = continua
   na fila (o vigia de 20s + cada refresh tentam de novo sozinhos) */
async function zOutboxFlush(l){
  let o=zOpen[l]; if(!o) return;
  if(o._flushing) return; o._flushing=true;
  let moved=false;
  try{
    let a=zauth(); if(!a) return;
    if(!window.ZunDME2E||typeof window.ZunDME2E.encMaybe!=="function") return;
    /* puxa o espelho do banco antes (aparelho novo / outra aba pode ter fila) */
    try{ await zOutSyncPull(l); }catch(e){}
    /* linhas antigas sem id ganham id (remoção por id depende disso) */
    try{ zOutEnsureIds(o.peer); }catch(e){}
    for(;;){
      let q=zOutLoad(o.peer);
      if(!q.length) break;
      /* 1º item sem erro definitivo (erro definitivo não prende a fila:
         fica marcado p/ o dono ver/editar/apagar, os outros andam) */
      let it=null;
      for(let k=0;k<q.length;k++){ if(q[k]&&!q[k].err){ it=q[k]; break; } }
      if(!it) break;
      /* outro aparelho meu já enviou e apagou a linha? some local tbm, sem
         reenviar (evita a msg sair 2x). Só vale p/ linha que EU subi
         (zOutSynHas); sem FASE 15 no banco, segue o fluxo local de antes. */
      if(it&&it.id&&zOutSynHas(it.id)){
        try{
          let _c0=await zOutDb();
          if(_c0){
            let _ex=await _c0.from("dm_outbox").select("id").eq("id", String(it.id)).limit(1).maybeSingle();
            if(!_ex||!_ex.data){ zOutRemoveId(o.peer, it.id); zOutSynDel(it.id); try{ zOutboxPaint(o); }catch(e){} continue; }
          }
        }catch(e){}
      }
      /* apagada da fila (🗑️) enquanto o envio estava em voo? desiste */
      if(it&&it.id){
        try{ let _q=zOutLoad(o.peer); if(!_q.some(function(x){ return x&&x.id&&x.id===it.id; })){ continue; } }catch(e){}
      }
      let wires=[], okEnc=true, noKey=false;
      for(let p of (it.parts||[{t:(it&&it.t)||"",u:(it&&it.u)||""}])){
        let r2=null;
        try{ r2=await window.ZunDME2E.encMaybe(o.peer, (p&&p.t)||"", (p&&p.u)||""); }catch(e){ r2=null; }
        if(!r2||!r2.e2e){
          if(r2&&r2.err==="size"){ zOutRemoveId(o.peer, it.id); try{ o.st2.textContent="mensagem muito longa"; }catch(e){} }
          else noKey=true;
          okEnc=false; break;
        }
        wires.push({t:r2.text, u:r2.url});
      }
      if(!okEnc){ try{ if(noKey) o.st2.textContent="⏳ aguardando @"+o.peer+"…"; }catch(e){} break; }
      let ok=true, why="", derr="";
      for(let w of wires){
        try{
          let r=JSON.parse(await zrpc("dmPush", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer,text:w.t,url:w.u,mtype:(it&&it.mtype)||"",bytes:((it&&it.bytes)||(w&&w.bytes)||0)})));
          if(!r||!r.ok){
            let er=String((r&&r.err)||"");
            if(er==="spam"||er==="devagar"){ why="⏳ aguarde "+(parseInt((r&&r.wait)||0)||0)+"s"; }
            else if(er==="amigos"||er==="noid"||er==="auth"||er==="vazio"||er==="url"){ derr=er; }
            else { why="sem conexão — tenta de novo sozinho"; }
            ok=false; break;
          }
        }catch(e){ why="sem conexão — tenta de novo sozinho"; ok=false; break; }
      }
      if(derr){
        /* definitivo: marca o item (não some; o dono vê o motivo, edita p/
           tentar de novo ou apaga) e passa p/ o próximo da fila */
        try{
          let arr=zOutLoad(o.peer);
          for(let k=0;k<arr.length;k++){ if(arr[k]&&arr[k].id===it.id){ arr[k].err=derr; break; } }
          zOutSave(o.peer, arr);
        }catch(e){}
        try{ o.st2.textContent=zOutErrMsg(derr, o.peer); }catch(e){}
        try{ zOutboxPaint(o); }catch(e){}
        continue;
      }
      if(!ok){ try{ if(why) o.st2.textContent=why; }catch(e){} break; }
      zOutRemoveId(o.peer, it.id); moved=true;
      try{ if(it&&it.id){ zOutSyncDel(it.id); zOutSynDel(it.id); } }catch(e){}
      try{ zOutboxPaint(o); }catch(e){}
    }
  }finally{ try{ o._flushing=false; }catch(e){} }
  if(moved){ try{ await zDMRefresh(l,true); }catch(e){} }
}
/* vigia: a fila anda sozinha quando a chave do par aparece (20s, com a
   janela aberta e a aba visível) */
try{ if(!window._zunOutTick){ window._zunOutTick=setInterval(function(){ try{
  if(document.hidden) return;
  Object.keys(zOpen).forEach(function(l){ try{ var o=zOpen[l]; if(o&&o.win&&o.win.isConnected&&zOutLoad(o.peer).length&&!o._flushing) zOutboxFlush(l); }catch(e){} });
}catch(e){} },20000); } }catch(e){}
function zOnType(l,fromL){
  let o=zOpen[l]; if(!o) return;
  let a=zme(); if(a&&low(a.nick)===fromL) return;
  zTypeUntil[l]=Date.now()+4000;
  zShowTyping(l);
  setTimeout(()=>{ try{ if(Date.now()>=(zTypeUntil[l]||0)){ o.typing.hidden=true; } }catch(e){} },4200);
}
function zShowTyping(l){
  let o=zOpen[l]; if(!o) return;
  if(Date.now()<(zTypeUntil[l]||0)){ o.typing.hidden=false; o.typing.textContent="@"+o.peer+" digitando..."; }
  else o.typing.hidden=true;
}
function zPersistOpen(){
  try{ let a=zauth(); if(!a) return; localStorage.setItem("zunDMOpen:"+low(a.nick), JSON.stringify(Object.keys(zOpen).slice(0,3).map(l=>({l:l,min:zOpen[l]&&zOpen[l].min?1:0})))); }catch(e){}
}
async function zRestoreOpen(){
  try{
    let a=zauth(); if(!a) return;
    /* login/aparelho novo: puxa a fila do banco antes de abrir as janelas */
    try{ zOutSyncPullAll(); }catch(e){}
    let arr=[]; try{ arr=JSON.parse(localStorage.getItem("zunDMOpen:"+low(a.nick))||"[]")||[]; }catch(e){}
    for(let i=0;i<arr.length&&i<3;i++){
      try{
        let e=arr[i], nick=(typeof e==="string")?e:(e&&e.l), wasMin=!!(e&&e.min);
        if(!zokNick(nick)||!zIsFriend(nick)) continue;
        await zDMOpen(nick,{preserve:true});
        /* login: preserva não-lidas até o usuário interagir (ver/enviar) */
        try{ let oo=zOpen[low(nick)]; if(oo) oo._noAutoSeen=true; }catch(e){}
        if(wasMin) zDMMin(nick);
      }catch(e){}
    }
  }catch(e){}
}
/* realtime via pubsub (canais dm:/dmc:) */
function zHookSocket(){
  try{
    let s=null; try{ s=(typeof socket!=="undefined"&&socket)?socket:null; }catch(e){}
    if(!s) return;
    if(!s._zunDMMsg){
      s._zunDMMsg=1;
      s.addEventListener("message", async(ev)=>{
      try{
        let d=typeof ev.data==="string"?ev.data:"";
        if(d.indexOf("dmm:")===0){
          let pm=zParseMM(d.slice(4)), key=pm.key;
          /* duplicata entregue pelo outro canal? atualiza a conversa aberta,
             mas nunca soma não-lida nem bipa de novo */
          let dup=zEvtDup("m:"+d.slice(4));
          let m0=zme(), ml0=m0?low(m0.nick):"";
          let fromMe=!!(pm.from&&ml0&&pm.from===ml0);
          let ls=Object.keys(zOpen), hit=false;
          try{ if(zSyncing) zDmmDuringSync=true; }catch(e){}
          for(let i=0;i<ls.length;i++){
            let o=zOpen[ls[i]];
            if(o&&zDMKey(o.peer,low((zme()||{}).nick||""))===key){
              hit=true;
              /* eco da própria msg (outra aba/device): sincroniza, sem notificar */
              if(o.min&&!fromMe&&!dup){ zUnread[ls[i]]=(zUnread[ls[i]]||0)+1; zPaintBadge(ls[i]); zFlash(ls[i]); zBeep(); try{zPaintPanel();}catch(e){} zPaintTitle(); }
              zDMRefresh(ls[i],true);
              break;
            }
          }
          if(hit) return;
          /* sem janela aberta: msg própria nunca notifica; duplicata não renotifica */
          if(fromMe||dup) return;
          let parts=key.split("|"); let m=zme(); let ml=m?low(m.nick):"";
          let peerL=parts[0]===ml?parts[1]:parts[0];
          if(peerL&&zokNick(peerL)){ zUnread[peerL]=(zUnread[peerL]||0)+1; try{zPaintPanel();}catch(e){} zBeep(); zPaintTitle(); }
          zLoadFriends(true);
        } else if(d.indexOf("dmd:")===0){
          /* msg apagada (ou editada pelo outro lado): refaz a conversa aberta */
          try{
            if(!zEvtDup("d:"+d.slice(4))){
              let pm=zParseMM(d.slice(4)), key=pm.key;
              try{ if(zSyncing) zDmmDuringSync=true; }catch(e){}
              let m0=zme(), ml0=m0?low(m0.nick):"";
              Object.keys(zOpen).forEach(l=>{ try{ let o=zOpen[l]; if(o&&zDMKey(o.peer,ml0)===key) zDMRefresh(l,true); }catch(e){} });
            }
          }catch(e){}
        } else if(d.indexOf("dms:")===0){
          let key=zParseMS(d.slice(4)).key;
          if(zEvtDup("s:"+d.slice(4))) return;
          Object.keys(zOpen).forEach(l=>{ let o=zOpen[l]; try{ if(o&&zDMKey(o.peer,low((zme()||{}).nick||""))===key) zDMRefresh(l,true); }catch(e){} });
        } else if(d.indexOf("dmt:")===0){
          let rest=d.slice(4), ix=rest.lastIndexOf(":"), key=rest.slice(0,ix), from=rest.slice(ix+1);
          Object.keys(zOpen).forEach(l=>{ try{ if(zOpen[l]&&zDMKey(zOpen[l].peer,low((zme()||{}).nick||""))===key) zOnType(l,from); }catch(e){} });
        } else if(d.indexOf("frq:")===0||d.indexOf("fra:")===0||d.indexOf("frx:")===0){
          zFriendAt=0; await zLoadFriends(true); try{zPaintProfRow();}catch(e){} await zRefreshStatuses();
        }
      }catch(e){}
    });
    }
    if(!s._zunDMOpen){
      s._zunDMOpen=1;
      try{ s.addEventListener("open", ()=>{ try{ zSubDM(); }catch(e){} }); }catch(e){}
    }
  }catch(e){}
}
async function zSubDM(){
  try{ let a=zauth(); if(!a) return; await zrpc("subDM", JSON.stringify(a)); }catch(e){}
}
/* observa abertura do perfil p/ pintar linha de amizade */
function zHookProfile(){
  try{
    if(typeof openProfile==="function"&&!openProfile._zunDM){
      let orig=openProfile;
      let fn=async function(){ let r=await orig.apply(this,arguments); try{zPaintProfRow();}catch(e){} try{zRefreshStatuses();}catch(e){} return r; };
      fn._zunDM=1; openProfile=fn; try{window.openProfile=fn;}catch(e){}
    }
  }catch(e){}
  try{
    let pm=$("profModal");
    if(pm&&!pm._zunDM){ pm._zunDM=1; new MutationObserver(()=>{ try{ if(!pm.hidden) zPaintProfRow(); }catch(e){} }).observe(pm,{attributes:true,attributeFilter:["hidden"]}); }
  }catch(e){}
}
function zTick(){
  try{
    /* aba oculta (celular em 2º plano): não gasta rede/bateria; ressincroniza ao voltar */
    if(document.hidden) return;
    Object.keys(zOpen).forEach(l=>zShowTyping(l));
    let anyOpen=Object.keys(zOpen).length>0;
    if(anyOpen){ Object.keys(zOpen).forEach(l=>{ zDMRefresh(l); }); }
  }catch(e){}
}
/* voltou p/ a aba (celular troca de app e volta): ressincroniza tudo */
document.addEventListener("visibilitychange",()=>{
  try{
    if(document.hidden) return;
    zTick(); zRefreshStatuses(); zSyncUnread(false);
  }catch(e){}
});
async function zBoot(){
  zEnsureDM(); zEnsurePanel(); zWrapOnDot(); zHookSocket(); zHookProfile(); zHookUserSearch();
  try{ await zSubDM(); }catch(e){}
  try{ zUnreadLoad(); zPaintTitle(); }catch(e){}
  try{ await zLoadFriends(true); }catch(e){}
  try{ await zSyncUnread(true); }catch(e){}
  try{ await zRefreshStatuses(); }catch(e){}
  try{ await zRestoreOpen(); }catch(e){}
  try{ zPaintBar(); }catch(e){}
  zhealDM();
}
let zBooted=false;
function zTryBoot(){
  try{
    let hasMe=false; try{ hasMe=(typeof me!=="undefined"); }catch(e){}
    if(!hasMe) return;
    if(!zBooted){ zBooted=true; zBoot(); }
    zHookSocket(); zWrapOnDot(); zHookProfile(); zHookUserSearch(); zEnsurePanel(); zEnsureDM();
  }catch(e){}
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>{ setTimeout(zTryBoot,800); });
else setTimeout(zTryBoot,800);
setTimeout(zTryBoot,2000); setTimeout(zTryBoot,4500);
setInterval(()=>{ try{ zHookSocket(); }catch(e){} },5000);
let zLastSubMe="";
setInterval(()=>{ try{
  if(window.__ecoSkip&&window.__ecoSkip("dmchk",2,6,12)) return; // ECO: checagem de login/amigos mais espaçada
  let a=zauth();
  let cur=a?low(a.nick):"";
  if(!cur && zLastSubMe){ zLastSubMe=""; try{ if(window.zunDMCloseAllOnLogout) window.zunDMCloseAllOnLogout(); }catch(e){} return; }
  if(cur&&cur!==zLastSubMe){ zLastSubMe=cur; zFriendAt=0; zSubDM(); zLoadFriends(true); zRefreshStatuses(); }
  else if(cur){ zLoadFriends(); }
} catch(e){} },5000);
setInterval(()=>{ try{ if(window.__ecoSkip&&window.__ecoSkip("dmsub",2,6,12)) return; if(zme()){ zSubDM(); } }catch(e){} },30000);
setInterval(()=>{ try{ if(window.__ecoSkip&&window.__ecoSkip("dmst",2,6,12)) return; zRefreshStatuses(); }catch(e){} },20000);
setInterval(()=>{ try{ if(window.__ecoSkip&&window.__ecoSkip("dmtick",2,5,10)) return; zTick(); }catch(e){} },6000);
document.addEventListener("pointerdown",()=>{ try{ zHookUserSearch(); }catch(e){} },{passive:true});
window.zunDMOpen=zDMOpen; window.zunDMClose=zDMClose; window.zunDMRenderAll=function(){ Object.keys(zOpen).forEach(l=>zDMRefresh(l,true)); };
window.zunDMRestore=zRestoreOpen; window.zunDMSyncUnread=zSyncUnread;
window.zunFriendReload=function(){ zFriendAt=0; return zLoadFriends(true); };
/* LOGOFF: fecha TODAS as janelas de DM desta aba, limpa nao-lidas/titulo/barra.
   Nao toca no localStorage das outras contas (chaves sao por nick). */
window.zunDMCloseAllOnLogout=function(){
  try{
    Object.keys(zOpen).forEach(l=>{
      try{ let o=zOpen[l]; if(o&&o.peer){ try{ zrpc("unsubDMConv", JSON.stringify({peer:o.peer})).catch(()=>{}); }catch(e){} } }catch(e){}
      try{ let o2=zOpen[l]; if(o2&&o2.win) o2.win.remove(); }catch(e){}
    });
  }catch(e){}
  try{ Object.keys(zOpen).forEach(l=>{ delete zOpen[l]; }); }catch(e){}
  try{ Object.keys(zUnread).forEach(k=>{ delete zUnread[k]; }); Object.keys(zTypeUntil).forEach(k=>{ delete zTypeUntil[k]; }); Object.keys(zLastTypeSent).forEach(k=>{ delete zLastTypeSent[k]; }); }catch(e){}
  try{ zLastSubMe=""; zFriendAt=0; zFriends=[]; zIncoming=[]; zOutgoing=[]; }catch(e){}
  try{ let bar=document.getElementById("zunDMBar"); if(bar) bar.innerHTML=""; }catch(e){}
  try{ let r=document.getElementById("zunDMRoot"); if(r) r.innerHTML=""; }catch(e){}
  try{ document.title=document.title.replace(/^\(\d+\)\s*💬\s*/,""); }catch(e){}
  try{ zPaintPanel(); }catch(e){}
  try{ zPaintTitle(); }catch(e){}
};
/* LOGIN (nova conta nesta aba): assina canal proprio, recarrega amigos e restaura DMs.
   Sem chave local + custódia trancada = oferece recuperar com a senha (1x/sessão). */
window.zunDMOnLogin=async function(){
  try{ zLastSubMe=""; zFriendAt=0; }catch(e){}
  try{ if(window.ZunDME2E){ window.ZunDME2E.ensureMine().catch(()=>{}); window.ZunDME2E.syncBackup().catch(()=>{}); } }catch(e){}
  try{
    if(window.ZunDME2E && window.ZunDME2E.backupStatus){
      window.ZunDME2E.backupStatus().then(function(st){
        try{ if(st==="locked" && !window._zunBkModalOnce){ window._zunBkModalOnce=1; zunDMRestoreModal(); } }catch(e){}
      }).catch(()=>{});
    }
  }catch(e){}
  try{ await zSubDM(); }catch(e){}
  try{ await zLoadFriends(true); }catch(e){}
  try{ await zRefreshStatuses(); }catch(e){}
  try{ await zSyncUnread(true); }catch(e){}
  try{ await zRestoreOpen(); }catch(e){}
  try{ zPaintBar(); }catch(e){}
};
/* Modal "recuperar conversas": aparelho sem a chave + custódia no servidor.
   Digitar a senha UMA vez restaura; "começar do zero" gera chave nova (as
   antigas seguem trancadas aqui; as novas voltam a funcionar). */
function zunDMRestoreModal(){
  try{
    if(document.getElementById("zunBkModal")) return;
    if(!window.ZunDME2E || !window.ZunDME2E.restoreWithPassword) return;
    let ov=document.createElement("div"); ov.id="zunBkModal";
    ov.style.cssText="position:fixed;inset:0;background:rgba(20,40,70,.55);display:flex;align-items:flex-start;justify-content:center;padding:12vh 12px;z-index:90";
    let card=document.createElement("div");
    card.style.cssText="background:#fff;border:3px solid #111;border-radius:12px;box-shadow:8px 8px 0 #111;padding:16px;max-width:420px;width:100%;text-align:left;color:#111";
    card.innerHTML='<div style="font-size:15px;font-weight:bold;margin-bottom:6px">🔑 Recuperar conversas</div>'
      +'<div class="meta" style="font-size:13px;margin-bottom:8px">Este aparelho não tem sua chave de conversa. Digite sua senha <b>uma vez</b> para recuperar suas mensagens. A senha não fica salva.</div>'
      +'<input type="password" autocomplete="current-password" placeholder="sua senha" style="margin-bottom:6px">'
      +'<div class="zunBkErr" style="font-size:12px;color:#c00;min-height:16px;margin-bottom:6px"></div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap"><button class="zunBkGo">recuperar</button><button class="zunBkNo">agora não</button></div>'
      +'<div style="margin-top:8px;font-size:12px"><a href="#" class="zunBkZero">esqueci a senha / começar do zero neste aparelho</a></div>';
    ov.appendChild(card); document.body.appendChild(ov);
    let inp=card.querySelector("input"), err=card.querySelector(".zunBkErr");
    try{ setTimeout(()=>{ try{ inp.focus(); }catch(e){} },100); }catch(e){}
    let close=function(){ try{ ov.remove(); }catch(e){} };
    card.querySelector(".zunBkNo").onclick=function(){ close(); };
    ov.addEventListener("pointerdown",function(ev){ try{ if(ev.target===ov) close(); }catch(e){} });
    card.querySelector(".zunBkZero").onclick=function(ev){
      try{ if(ev) ev.preventDefault(); }catch(e){}
      if(!confirm("Começar do zero NESTE aparelho? As mensagens antigas NÃO vão abrir aqui (seguem normais nos outros aparelhos). As novas voltam a funcionar.")) return;
      err.textContent="gerando chave nova...";
      window.ZunDME2E.startFresh().then(function(r){
        if(r && r.ok){ close(); try{ window.zunDMRenderAll(); }catch(e){} }
        else err.textContent="não deu — tente de novo";
      }).catch(function(){ err.textContent="sem conexão"; });
    };
    let go=async function(){
      err.textContent="verificando...";
      let r=null;
      try{ r=await window.ZunDME2E.restoreWithPassword(inp.value); }catch(e){ r=null; }
      try{ inp.value=""; }catch(e){}
      if(r && r.ok){ close(); try{ window.zunDMRenderAll(); }catch(e){} return; }
      err.textContent=(r && r.err==="devagar") ? "muitas tentativas — aguarde 1 minuto" : "senha errada (se a certa não abre, a cópia é antiga — use 'começar do zero' abaixo)";
    };
    card.querySelector(".zunBkGo").onclick=function(){ go(); };
    inp.addEventListener("keydown",function(ev){ try{ if(ev.key==="Enter"){ ev.preventDefault(); go(); } }catch(e){} });
  }catch(e){}
}
window.zunDMRestoreKeys=zunDMRestoreModal;
window.__zunDMEvt={dup:zEvtDup,parseMM:zParseMM,parseMS:zParseMS};
window.__zunDMBubble=zBubble;
})();
