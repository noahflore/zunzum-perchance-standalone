/* zundm — amigos + DM instantâneo estilo facebook antigo/zap + presença por usuário.
   Exige amizade p/ conversar. Ticks ✓/✓✓, "digitando...", fotos/vídeos/gifs,
   emojis personalizados (ZunEmoji), compressão genérica + 100MB, proteção de
   cor via zunfix (headers com .zun-mhead). NÃO mexe no visualizador total. */
(function(){
"use strict";
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
      if(a0){ let lk=low(a0.nick); let sv=zStCache[lk]||""; let sel=$("zunStatusSel"); if(sel&&sv&&(sel.value!==sv)) sel.value=sv; }
    }catch(e){}
  }catch(e){}
}
function zRepaintDots(){
  try{
    document.querySelectorAll(".chatname").forEach(nm=>{
      try{
        let t=(nm.textContent||"").replace(/^@/,"").trim();
        if(!zokNick(t)) return;
        let st=zEff(t);
        let old=nm.querySelector(":scope > .onDot");
        /* nunca remove/reinsere (mudaria a largura da linha e requebraria o
           texto = micro-puxão): esconde mantendo o espaço */
        if(st==="offline"){ if(old) old.style.visibility="hidden"; return; }
        if(st==="ausente"){
          if(!old){ let d=document.createElement("span"); d.className="onDot zun-st-aus"; d.title="ausente/suspenso"; nm.appendChild(d); }
          else { old.classList.add("zun-st-aus"); old.style.background="#f39c12"; old.style.visibility=""; old.title="ausente/suspenso"; }
          return;
        }
        if(st==="online"&&old){ old.classList.remove("zun-st-aus"); old.style.background=""; old.style.visibility=""; old.title="online"; }
      }catch(e){}
    });
  }catch(e){}
}
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
  try{
    let r=JSON.parse(await zrpc("friendList", JSON.stringify(a)));
    if(r&&r.ok){ zFriends=r.friends||[]; zIncoming=r.incoming||[]; zOutgoing=r.outgoing||[]; zFriendAt=Date.now();
      try{ zFriends.forEach(f=>{ if(f&&f.st!==undefined) zStCache[low(f.nick)]=f.st||""; }); zStSave(); }catch(e){}
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
function zEnsurePanel(){
  let p=$("zunFriendPanel"); if(p&&p.isConnected) return p;
  try{
    let ab=$("authBox"); let host=ab&&ab.closest?ab.closest(".box"):null;
    p=document.createElement("div"); p.className="box"; p.id="zunFriendPanel";
    p.innerHTML='<h3 class="zun-mhead">amigos <span id="zunFrCount" class="meta"></span></h3>'
      +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><span class="meta">você está:</span><select id="zunStatusSel"><option value="online">🟢 online</option><option value="ausente">🌙 suspenso</option><option value="offline">⚫ offline</option></select><button id="zunFrFind" title="buscar gente por nick">🔍 buscar gente</button></div>'
      +'<div id="zunFrIn"></div><div id="zunFrList"><div class="meta">entre com nick+senha p/ ver amigos.</div></div>';
    if(host&&host.parentNode) host.parentNode.insertBefore(p, host.nextSibling);
    else ($("wrap")||document.body).appendChild(p);
    let sel=p.querySelector("#zunStatusSel");
    try{
      let cur=""; try{ cur=localStorage.getItem("zunMyStatus")||""; }catch(e){}
      if(cur) sel.value=cur;
      else { let m=zme(); let lk=m?low(m.nick):""; if(lk&&zStCache[lk]) sel.value=zStCache[lk]||"online"; }
    }catch(e){}
    sel.onchange=async()=>{
      let v=sel.value; try{ localStorage.setItem("zunMyStatus",v); }catch(e){}
      let a=zauth(); if(!a) return;
      try{ await zrpc("statusSet", JSON.stringify({nick:a.nick,hash:a.hash,st:v})); }catch(e){}
      try{ zStCache[low(a.nick)]=v; zStSave(); }catch(e){}
      zRepaintDots();
    };
    p.querySelector("#zunFrFind").onclick=()=>{ try{ if(typeof openUserSearch==="function") openUserSearch(""); }catch(e){} };
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
      let h=document.createElement("div"); h.className="meta"; h.textContent="pedidos ("+zIncoming.length+":"; box.appendChild(h);
      zIncoming.forEach(u=>{
        let row=document.createElement("div"); row.className="zun-frow";
        row.appendChild(zFav(u.nick,u.avatar));
        let nm=document.createElement("span"); nm.style.fontWeight="bold"; nm.textContent="@"+u.nick; nm.style.cursor="pointer";
        try{ if(typeof paintZNick==="function") paintZNick(nm,u.nick); nm.textContent="@"+u.nick; }catch(e){}
        nm.onclick=()=>{ try{ openProfile(u.nick); }catch(e){} };
        row.appendChild(nm);
        let ok=document.createElement("button"); ok.textContent="aceitar";
        ok.onclick=async()=>{ ok.disabled=true; await zAct("accept",u.nick); };
        let no=document.createElement("button"); no.textContent="recusar";
        no.onclick=async()=>{ no.disabled=true; await zAct("decline",u.nick); };
        row.appendChild(ok); row.appendChild(no); box.appendChild(row);
      });
    }
    let list=p.querySelector("#zunFrList"); list.innerHTML="";
    let a=zauth();
    if(!a){ let e=document.createElement("div"); e.className="meta"; e.textContent="entre com nick+senha p/ ver amigos."; list.appendChild(e); return; }
    if(!zFriends.length){
      let e=document.createElement("div"); e.className="meta";
      e.textContent=zOutgoing.length?("nenhum amigo ainda — "+zOutgoing.length+" pedido(s) enviado(s). abra um perfil e adicione!"):"nenhum amigo ainda — abra um perfil e clique em adicionar aos amigos!";
      list.appendChild(e);
    }
    zFriends.forEach(u=>{
      let row=document.createElement("div"); row.className="zun-frow";
      row.appendChild(zFav(u.nick,u.avatar));
      let nm=document.createElement("span"); nm.style.fontWeight="bold"; nm.style.cursor="pointer"; nm.textContent="@"+u.nick;
      try{ if(typeof paintZNick==="function") paintZNick(nm,u.nick); nm.textContent="@"+u.nick; }catch(e){}
      nm.onclick=()=>{ try{ openProfile(u.nick); }catch(e){} };
      row.appendChild(nm);
      try{ row.appendChild(zDot(zEff(u.nick))); }catch(e){}
      let un=zUnread[low(u.nick)]||0;
      if(un){ let b=document.createElement("span"); b.className="zun-badge"; b.textContent=un; row.appendChild(b); }
      let sp=document.createElement("span"); sp.style.flex="1"; row.appendChild(sp);
      let cv=document.createElement("button"); cv.textContent="conversar"; cv.title="abrir mensagem instantânea";
      cv.onclick=()=>zDMOpen(u.nick);
      let rm=document.createElement("button"); rm.textContent="x"; rm.title="remover amizade";
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
function zFav(nick,avatar){
  let s=document.createElement("span"); s.className="zun-fav";
  if(avatar){ let im=document.createElement("img"); im.src=avatar; im.loading="lazy"; im.referrerPolicy="no-referrer"; im.onerror=()=>{ try{im.remove();}catch(e){} s.textContent=String(nick||"?").slice(0,1).toUpperCase(); }; s.appendChild(im); }
  else s.textContent=String(nick||"?").slice(0,1).toUpperCase();
  return s;
}
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
    if(!m){ let s=document.createElement("span"); s.className="meta"; s.textContent="entre com nick+senha p/ adicionar aos amigos."; row.appendChild(s); return; }
    if(low(target)===low(m.nick)){
      let s=document.createElement("span"); s.className="meta"; s.textContent="esse é você! divulgue seu perfil p/ fazer amigos 📈"; row.appendChild(s); return;
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
        let cv=document.createElement("button"); cv.textContent="💬 conversar"; cv.title="abrir mensagem instantânea (em cima)";
        cv.style.fontWeight="bold"; cv.onclick=()=>zDMOpen(myTarget);
        let rm=document.createElement("button"); rm.textContent="remover amigo";
        rm.onclick=async()=>{ if(!confirm("Remover @"+myTarget+" dos amigos?")) return; rm.disabled=true; rm.textContent="removendo..."; try{ await zTimeout(zAct("remove",myTarget),15000); }catch(e){} zPaintProfRow(); };
        row.appendChild(cv); row.appendChild(rm);
      } else if(cat==="incoming"){
        let ok=document.createElement("button"); ok.textContent="✅ aceitar amizade"; ok.onclick=async()=>{ ok.disabled=true; ok.textContent="aceitando..."; try{ await zTimeout(zAct("accept",myTarget),15000); }catch(e){} zPaintProfRow(); };
        let no=document.createElement("button"); no.textContent="recusar"; no.onclick=async()=>{ no.disabled=true; try{ await zTimeout(zAct("decline",myTarget),15000); }catch(e){} zPaintProfRow(); };
        row.appendChild(ok); row.appendChild(no);
      } else if(cat==="outgoing"){
        let s=document.createElement("span"); s.className="meta"; s.textContent="⏳ pedido enviado — aguarde aceitar"; row.appendChild(s);
      } else {
        let add=document.createElement("button"); add.textContent="➕ adicionar aos amigos";
        add.onclick=async()=>{
          add.disabled=true; add.textContent="verificando...";
          let st=null;
          try{ st=await zStateOf(myTarget); }catch(e){ st=null; }
          if(!st){ add.disabled=false; add.textContent="➕ adicionar aos amigos"; alert("sem conexão, tente de novo"); return; }
          if(st.friends||st.incoming||st.outgoing){ zPaintProfRow(); return; }
          add.textContent="enviando...";
          let rr=null; try{ rr=await zTimeout(zAct("req",myTarget),15000); }catch(e){}
          if(rr&&rr.ok){ add.textContent="pedido enviado!"; } else { add.disabled=false; add.textContent="➕ adicionar aos amigos"; alert("não deu: "+((rr&&rr.err)||"erro")); return; }
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
            let b=document.createElement("button"); b.textContent="＋"; b.title="adicionar aos amigos";
            b.style.marginLeft="4px";
            if(zIsFriend(nick)){ b.textContent="💬"; b.title="conversar"; b.onclick=(e)=>{ e.stopPropagation(); zDMOpen(nick); }; }
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
/* DM com cifra local (AES-GCM 256, chave por conversa — mesmo modelo das salas
   privadas): chave = SHA-256("zunzum-dm-v1:"+a+"|"+b) com os nicks em ordem.
   No servidor vai só "ENC1:<iv>:<ct>" (texto+url cifrados juntos); mensagem
   antiga em claro abre normal (compat). NÃO é E2E contra o servidor: a chave
   deriva só dos nicks (públicos), então o servidor — e qualquer claim-holder
   do bot via zzDmPend — consegue derivar e ler. É ofuscação contra leitura
   casual no banco, não segredo. EXCEÇÃO: p/ a zunzunzinha vai em CLARO
   (zdmEncMaybe) — ela é um bot sem chave e precisa ler p/ responder; DMs ao
   bot devem ser tratadas como públicas p/ o operador do site. */
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
  if(zdmIsBot(peer)) return {text:String(text||""), url:String(url||"")};
  return await zdmEnc(peer, text, url);
}
async function zdmDecMsg(myLower, peerLower, m){
  try{
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
try{ window.__zdmCrypto={key:zdmKeyFor, enc:zdmEnc, dec:zdmDecMsg, maybe:zdmEncMaybe, isBot:zdmIsBot}; }catch(e){}
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
  let st=await zStateOf(peer);
  if(!st||!st.friends){ alert("@"+peer+" ainda não é seu amigo — clique em adicionar aos amigos primeiro."); try{zPaintProfRow();}catch(e){} return; }
  zEnsureDM();
  let l=low(peer);
  if(zOpen[l]&&zOpen[l].win.isConnected){ if(zOpen[l].min) zDMMax(peer); else { zFocus(zOpen[l].input); zDMRefresh(l,true); } return; }
  try{ await zrpc("subDMConv", JSON.stringify({nick:a.nick,hash:a.hash,peer})); }catch(e){}
  let win=document.createElement("div"); win.className="zun-dm-win";
  win.innerHTML='<div class="zun-dm-h zun-mhead"><span class="zun-dm-av">?</span><span class="zun-dm-peer"></span><span class="zun-tbadge"></span><button class="zun-min" title="minimizar">–</button><button class="zun-x" title="fechar">x</button></div>'
  +'<div class="zun-dm-priv meta">conversa ofuscada (não é ponta-a-ponta): quem opera o site consegue ler · com a zunzunzinha vai em claro</div>'
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
          getAvatar(o.peer).then(u=>{ if(u&&av.isConnected&&!av.querySelector("img")){ av.textContent=""; let im=document.createElement("img"); im.src=u; im.loading="lazy"; im.referrerPolicy="no-referrer"; im.onerror=()=>{try{im.remove();}catch(e){}}; av.appendChild(im); } }).catch(()=>{});
        }
        if(av&&!av.textContent.trim()&&!av.querySelector("img")) av.textContent=o.peer.slice(0,1).toUpperCase();
      }catch(e){}
    });
  }catch(e){}
}
function zBubble(m,mine,inputEl,ix,cv){
  let d=document.createElement("div"); d.className="zun-bub "+(mine?"mine":"theirs");
  /* índice junto na chave: duas msgs iguais no mesmo ms teriam a mesma chave
     e o restore caía na bolha errada (de cima) = PUXÃO P/ CIMA */
  try{ d.dataset.zk = String(m.at||0)+"|"+low(m.f)+"|"+String(m.t||"").length+"|"+(m.u||"").length+"|"+(ix||0); }catch(e){}
  if(m&&m._lock){
    let tx=document.createElement("div"); tx.className="zun-tx"; tx.textContent="🔒 mensagem cifrada (ofuscada, não ponta-a-ponta) — não abriu neste navegador"; d.appendChild(tx);
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
      let eb=document.createElement("button"); eb.textContent="✏️"; eb.title="editar mensagem";
      eb.style.cssText="font-size:10px;padding:1px 6px;border:1px solid #b6c9db;background:#eef4fb;border-radius:5px;cursor:pointer";
      eb.onclick=()=>{ try{ zDMEditMsg(cv, m, txDiv); }catch(e){} };
      let db=document.createElement("button"); db.textContent="🗑️"; db.title="apagar mensagem";
      db.style.cssText=eb.style.cssText;
      db.onclick=async ()=>{ if(!confirm("apagar esta mensagem?")) return; try{ let a=zauth(); if(!a) return; let r=JSON.parse(await zrpc("dmDel", JSON.stringify({nick:a.nick,hash:a.hash,peer:cv.peer,id:m.id}))); if(r&&r.ok){ try{ zDMRefresh(low(cv.peer),true); }catch(e){} } }catch(e){} };
      row.appendChild(eb); row.appendChild(db); d.appendChild(row);
    }
  }catch(e){}
  return d;
}
/* edição inline de DM própria */
function zDMEditMsg(cv,m,txDiv){
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
    if(txDiv){ txDiv.style.display="none"; txDiv.parentNode.insertBefore(box, txDiv.nextSibling); }
    try{ if(window.ZunFmtBar) ZunFmtBar.attach(inp, {compact:true}); }catch(e){}
    try{ inp.focus(); inp.select(); }catch(e){}
    cx.onclick=()=>{ if(txDiv) txDiv.style.display=""; try{ box.remove(); }catch(e){} };
    sv.onclick=async ()=>{
      let t=inp.value.trim();
      if(!t||t===old){ if(txDiv) txDiv.style.display=""; try{ box.remove(); }catch(e){} return; }
      sv.disabled=true;
      try{
        let wt=t.slice(0,2000), wu=m.u||"";
      try{ let enc2=await zdmEncMaybe(cv.peer, wt, wu); wt=enc2.text; wu=enc2.url; }catch(e){}
      let r=JSON.parse(await zrpc("dmEdit", JSON.stringify({nick:a.nick,hash:a.hash,peer:cv.peer,id:m.id,text:wt,url:wu,mtype:m.y||""})));
        if(r&&r.ok){ try{ zDMRefresh(low(cv.peer),true); }catch(e){} }
      }catch(e){}
      sv.disabled=false;
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
  try{
    let r=JSON.parse(await zrpc("dmGet", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer})));
    if(zOpen[l]!==o||o._seq!==mySeq) return;
    if(!r||!r.ok) return;
    if(r.st!==undefined){ zStCache[l]=r.st||""; zStSave(); }
    let prevMsgs = o.msgs||[];
    o.msgs=r.msgs||[];
    let mym=low(a.nick);
    try{ await Promise.all(o.msgs.map(m=>zdmDecMsg(mym, low(o.peer), m))); }catch(e){}
    let sig=zSig(o.msgs,mym);
    if(!force&&sig===o._sig){ zPaintDMHeaders(); return; }
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
      zPaintDMHeaders();
      let stillNew=false;
      try{ for(let _m of o.msgs){ if(low(_m.f)!==mym&&!_m.seen){ stillNew=true; break; } } }catch(e){}
      /* mesmo sem reconstruir: quem está com a janela aberta e já interagiu
         (sem _noAutoSeen) marca visto aqui também — senão o dmSeen só
         aconteceria quando chegasse msg nova */
      if(stillNew&&!o.min&&!o._noAutoSeen){ try{ await zrpc("dmSeen", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer})); stillNew=false; try{ for(let _m of o.msgs){ if(low(_m.f)!==mym) _m.seen=1; } }catch(e){} }catch(e){} }
      if(!stillNew&&!o.min&&!o._noAutoSeen&&zUnread[l]){ zUnread[l]=0; try{zPaintPanel();}catch(e){} zPaintBar(); zPaintTitle(); }
      else zPaintBadge(l);
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
  let url="",mtype="";
  try{
    if(f){
      if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ o.st2.textContent="svg bloqueado (use png/jpg)"; o._sending=false; return; }
      try{ if(typeof prepUpload==="function") f=await prepUpload(f,1024,0.82,(s)=>{ o.st2.textContent=s; }); }catch(e){ if(/svg/i.test((e&&e.message)||"")){ o.st2.textContent="svg bloqueado"; o._sending=false; return; } }
      let max=104857600; try{ if(typeof ZUN_MAX_FILE!=="undefined"&&ZUN_MAX_FILE>0) max=ZUN_MAX_FILE; }catch(e){}
      if(f.size>max){ o.st2.textContent="arquivo muito grande (máx 100MB comprimido)"; o._sending=false; return; }
      o.st2.textContent="enviando...";
      let up=null;
      try{ up=await zunUpload(f,{expires:Date.now()+1000*60*60*24*30}); }catch(e){ o.st2.textContent="erro upload"; o._sending=false; return; }
      if(!up||up.error){ o.st2.textContent="erro upload"; o._sending=false; return; }
      url=up.url; try{ mtype=(typeof zunGzMtype==="function"?zunGzMtype(f):f.type)||""; }catch(e){ mtype=f.type||""; }
    }
    let wireT=t, wireU=url;
    try{ let enc=await zdmEncMaybe(o.peer, t, url); wireT=enc.text; wireU=enc.url; }catch(e){}
    let r=JSON.parse(await zrpc("dmPush", JSON.stringify({nick:a.nick,hash:a.hash,peer:o.peer,text:wireT,url:wireU,mtype})));
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
  }catch(e){ o.st2.textContent="sem conexão"; o._sending=false; }
}
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
  let a=zauth();
  let cur=a?low(a.nick):"";
  if(!cur && zLastSubMe){ zLastSubMe=""; try{ if(window.zunDMCloseAllOnLogout) window.zunDMCloseAllOnLogout(); }catch(e){} return; }
  if(cur&&cur!==zLastSubMe){ zLastSubMe=cur; zFriendAt=0; zSubDM(); zLoadFriends(true); zRefreshStatuses(); }
  else if(cur){ zLoadFriends(); }
} catch(e){} },5000);
setInterval(()=>{ try{ if(zme()){ zSubDM(); } }catch(e){} },30000);
setInterval(()=>{ try{ zRefreshStatuses(); }catch(e){} },20000);
setInterval(()=>{ try{ zTick(); }catch(e){} },6000);
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
/* LOGIN (nova conta nesta aba): assina canal proprio, recarrega amigos e restaura DMs */
window.zunDMOnLogin=async function(){
  try{ zLastSubMe=""; zFriendAt=0; }catch(e){}
  try{ await zSubDM(); }catch(e){}
  try{ await zLoadFriends(true); }catch(e){}
  try{ await zRefreshStatuses(); }catch(e){}
  try{ await zSyncUnread(true); }catch(e){}
  try{ await zRestoreOpen(); }catch(e){}
  try{ zPaintBar(); }catch(e){}
};
window.__zunDMEvt={dup:zEvtDup,parseMM:zParseMM,parseMS:zParseMS};
window.__zunDMBubble=zBubble;
})();
