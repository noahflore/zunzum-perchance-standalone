(function(){ let l = document.querySelector("link[rel~='icon']") || document.createElement("link"); l.rel = "icon"; l.href = "https://user.uploads.dev/file/bfd49a053c47f44f2ca09310c1cc9ac7.png"; document.head.appendChild(l); })();
/* H1 privacidade: referrer global no-referrer (o index.html é só <body>, sem
   <head> editável — injeta via JS o quanto antes). Elementos de mídia/links já
   usam referrerpolicy/rel individual; este meta cobre fetches, thumbs e
   navegações que escaparem. Quebra zero: só remove o Referer enviado a 3ºs. */
(function(){ try{ if(!document.querySelector('meta[name="referrer"]')){ var m = document.createElement("meta"); m.setAttribute("name","referrer"); m.setAttribute("content","no-referrer"); document.head.appendChild(m); } }catch(e){} })();
function lsGetSafe(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSetSafe(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
/* aviso de console publico: 1 linha, sem logica.
   (a protecao real e um .json criptografado so no PC do dono, fora do src/) */
try{ console.log("%c🛡️ ZUNZUM — nunca cole aqui codigo que alguem te mandou.", "font-size:16px;font-weight:bold;"); }catch(e){}
/* Sessão por ABA (multi-conta no mesmo navegador):
   - sessionStorage é o dono da verdade (isolado por aba).
   - localStorage NÃO guarda mais token (antes vazava p/ qualquer JS/XSS e
     persistia 30 dias em disco). Abas novas fazem login de novo.
   Assim a aba A pode ser @alice e a aba B @bob sem uma derrubar a outra.
   kv (IndexedDB) já separa por chave (nick vai na chave) — não precisa mudar.
  migracao: na 1a leitura, se session vazia mas localStorage tem sessao,
   importa UMA vez e apaga o backup (logout de quem roubou o disco). */
function getSession(){
  try{ let s = sessionStorage.getItem("orkutSession"); if(s) return JSON.parse(s); }catch(e){}
  try{
    let l = null; try{ l = localStorage.getItem("orkutSession"); }catch(e){}
    if(l){ try{ sessionStorage.setItem("orkutSession", l); }catch(e){} try{ localStorage.removeItem("orkutSession"); }catch(e){} try{ return JSON.parse(l); }catch(e){ return null; } }
  }catch(e){}
  return null;
}
function setSession(o){
  try{
    let s = JSON.stringify(o);
    try{ sessionStorage.setItem("orkutSession", s); }catch(e){}
    try{ localStorage.removeItem("orkutSession"); }catch(e){}
  }catch(e){}
}
function clearSessionFor(nick){
  try{ sessionStorage.removeItem("orkutSession"); }catch(e){}
  try{
    try{ localStorage.removeItem("orkutSession"); }catch(e3){}
  }catch(e){}
}
/* M3 (2026-10-28): limpa VESTÍGIOS da conta no logout — outra pessoa pode usar
   o mesmo navegador/aba depois. Remove credenciais e conteúdo por conta:
   sessão Bonto (zunBackend), token GoTrue (sb-*-auth-token, nos 2 storages),
   DM (abertas, outbox, não-lidas), amigos, pet, avatar-del.
   MANTÉM de propósito: orkutAnonToks (identidade anon é separada da conta),
   orkutLocalDB (modo local), mute/block (preferência, não segredo) e flags UI. */
function zunWipeAccount(nick){
  var nl = "";
  try{ nl = String(nick || "").toLowerCase(); }catch(e){}
  try{ sessionStorage.removeItem("zunBackend"); }catch(e){}
  try{
    [localStorage, sessionStorage].forEach(function(st){
      if(!st) return;
      var drop = [];
      try{
        for(var i = 0; i < st.length; i++){
          var k = null; try{ k = st.key(i); }catch(eK){}
          if(k && /^sb-.*-auth-token$/.test(k)) drop.push(k);
        }
      }catch(eL){}
      drop.forEach(function(k){ try{ st.removeItem(k); }catch(eR){} });
    });
  }catch(e){}
  if(nl){
    ["zunDMOpen:","zunDMOut:","zunDMOutSyn:","zunDMUnread:","zunFriendsV1:","zunpet_v1:","zunzumAvatarDel:"].forEach(function(p){
      try{ localStorage.removeItem(p + nl); }catch(e){}
    });
  }
}
/* leitura usada por arquivos que não têm acesso ao `me` (1 aba = 1 sessão) */
function readSessionAny(){
  try{ let s = sessionStorage.getItem("orkutSession"); if(s) return s; }catch(e){}
  return null;
}
try{ window.__zunGetSession = getSession; window.__zunSetSession = setSession; window.__zunClearSession = clearSessionFor; window.__zunReadSession = readSessionAny; }catch(e){}
let me = getSession();
/* anon forte: 8 letras/numeros (36^8 = 3 trilhoes) — o antigo anon-0000
   (so 9000) era adivinhavel e foi DESLIGADO em 2026-10-24. */
function newAnonId(){
  try{
    let b = new Uint8Array(8), s = "";
    if(window.crypto && window.crypto.getRandomValues){ window.crypto.getRandomValues(b); }
    else { for(let i=0;i<8;i++) b[i] = Math.floor(Math.random()*256); }
    const abc = "abcdefghijklmnopqrstuvwxyz0123456789";
    for(let i=0;i<8;i++) s += abc[b[i]%36];
    return "anon-"+s;
  }catch(e){ return "anon-"+Math.random().toString(36).slice(2,10); }
}
let anonId = lsGetSafe("orkutAnon") || newAnonId();
if(!/^anon-[a-z0-9]{6,12}$/.test(anonId)){ anonId = newAnonId(); }
lsSetSafe("orkutAnon", anonId);
/* tokens de anon (identidade + por item). Sem eles o servidor recusa reusar
   nome alheio (anon-taken) e editar/apagar sem prova (dono). Ficam só neste
   navegador (localStorage); exporte p/ outro aparelho pelo gerenciador. */
function anonTokStore(){ try{ return JSON.parse(lsGetSafe("orkutAnonToks")||"null")||{own:{},items:{}}; }catch(e){ return {own:{},items:{}}; } }
function anonTokSave(s){ try{ s = anonTokSanitize(s); lsSetSafe("orkutAnonToks", JSON.stringify({own:s.own||{},items:s.items||{}})); }catch(e){} }
/* limpa backup vindo de fora (import colado): só entra chave anon válida com
   token válido; ignora __proto__/constructor/prototype e formatos errados.
   Retorna {own, items, n, dropped}. */
function anonTokSanitize(o){
  let own = {}, items = {}, dropped = 0;
  try{
    let so = (o && typeof o==="object" && o.own && typeof o.own==="object") ? o.own : {};
    for(let k of Object.keys(so)){
      let kl = String(k||"").toLowerCase();
      if(/^(prototype|__proto__|constructor)$/.test(kl)){ dropped++; continue; }
      if(!/^anon-[a-z0-9]{6,12}$/.test(kl)){ dropped++; continue; }
      if(!/^zat_[0-9a-f]{32}$/.test(String(so[k]||""))){ dropped++; continue; }
      own[kl] = String(so[k]);
    }
    let si = (o && typeof o==="object" && o.items && typeof o.items==="object") ? o.items : {};
    for(let k of Object.keys(si)){
      if(/^(prototype|__proto__|constructor)$/.test(String(k))){ dropped++; continue; }
      if(!String(k||"") || String(k).length>200){ dropped++; continue; }
      if(!/^zat_[0-9a-f]{32}$/.test(String(si[k]||""))){ dropped++; continue; }
      items[String(k)] = String(si[k]);
    }
    let ks = Object.keys(items);
    if(ks.length>500){ for(let i=0;i<ks.length-500;i++){ try{ delete items[ks[i]]; }catch(e){} dropped++; } }
  }catch(e){}
  let n = Object.keys(own).length + Object.keys(items).length;
  return {own:own, items:items, n:n, dropped:dropped};
}
function anonTokGet(a){ try{ return anonTokStore().own[String(a||"").toLowerCase()]||""; }catch(e){ return ""; } }
function anonTokSet(a, t){ try{ if(!/^zat_[0-9a-f]{32}$/.test(String(t||""))) return; let s = anonTokStore(); if(!s.own) s.own = {}; s.own[String(a||"").toLowerCase()] = String(t); anonTokSave(s); }catch(e){} }
function anonItemGet(id){ try{ return anonTokStore().items[String(id||"")]||""; }catch(e){ return ""; } }
function anonItemSet(id, t){ try{ if(!id || !/^zat_[0-9a-f]{32}$/.test(String(t||""))) return; let s = anonTokStore(); if(!s.items) s.items = {}; s.items[String(id)] = String(t); let ks = Object.keys(s.items); if(ks.length>500){ for(let i=0;i<ks.length-500;i++) delete s.items[ks[i]]; } anonTokSave(s); }catch(e){} }
let lastAnonRenew = 0;
function renewAnon(){
  try{
    let now = Date.now();
    if(now - lastAnonRenew < 5000) return false;
    let old = anonId;
    let next = old;
    while(next===old) next = newAnonId();
    if(!confirm("Trocar de "+old+" para "+next+"?\nPosts e likes antigos continuam com o antigo — o rasto é cortado.\nOs tokens ficam guardados: você ainda edita os antigos neste navegador.")) return false;
    lastAnonRenew = now;
    anonId = next;
    lsSetSafe("orkutAnon", anonId);
    try{ paintMe(); }catch(e){}
    return true;
  }catch(e){ return false; }
}
/* troca silenciosa quando o servidor diz que o nome já tem dono */
function renewAnonForce(){
  try{
    let old = anonId, next = old, guard = 0;
    while(next===old && guard++<10) next = newAnonId();
    anonId = next;
    try{ lsSetSafe("orkutAnon", anonId); }catch(e){}
    try{ paintMe(); }catch(e){}
    return next;
  }catch(e){ return null; }
}
let socket = null, connected = false, privRoom = "";
let localMode = false;
function localDB(){
  try{ return JSON.parse(localStorage.getItem("orkutLocalDB")||"null") || {users:{},feed:[],pub:[],priv:{},sug:[],hist:{},bio:{},dep:{},inv:{},rooms:{},roomMsgs:{},roomTopics:{},topicMsgs:{},aiLast:0,aiClaim:null}; }
  catch(e){ return {users:{},feed:[],pub:[],priv:{},sug:[],hist:{},dep:{},inv:{},rooms:{},roomMsgs:{},roomTopics:{},topicMsgs:{},aiLast:0,aiClaim:null}; }
}
function saveLocalDB(db){ try{ localStorage.setItem("orkutLocalDB", JSON.stringify(db)); }catch(e){} }
function normLocal(db){
  let ch = false;
  db.feed.forEach((p,i)=>{ if(!p.id){ p.id = "p"+p.at+"-"+i; ch = true; } if(!p.lk){ p.lk = []; ch = true; } if(!p.rp){ p.rp = []; ch = true; } else{ p.rp.forEach((r,j)=>{ if(!r.id){ r.id = "r"+r.at+"-"+j; ch = true; } if(!("to" in r)){ r.to = null; ch = true; } }); } if(!p.rx || typeof p.rx !== "object"){ p.rx = {}; ch = true; } });
  if(ch) saveLocalDB(db);
}
const REACTS = [["curti","👍"],["amei","❤️"],["adorei","😍"],["haha","😂"],["uau","😮"],["triste","😢"],["ok","👌"]];
function reactName(r){ let f = REACTS.find(x=>x[0]===r); return f ? f[0] : "curti"; }
function reactEmoji(r){ let f = REACTS.find(x=>x[0]===r); return f ? f[1] : "👍"; }
function reactCountsLocal(p){ let c = {}; (p.lk||[]).forEach(k=>{ let t = (p.rx&&p.rx[k])||"curti"; c[t] = (c[t]||0)+1; }); return c; }
function reactLabel(p, my){
  let n = (p.lk||[]).length;
  return (my ? reactEmoji(my) : "👍")+" · "+n;
}
let _zcapUsedLocal = {}; // uso único no espelho local (paridade com o servidor)
let _lAuthFail = {}; // throttle de senha errada por nick (espelho do servidor: 8 erros/10min = 5min de rate)
function lAuthThrottle(k){
  let now = Date.now(), f = _lAuthFail[k];
  if(!f) f = _lAuthFail[k] = {n:0, first:now, mute:0};
  if(now-f.first > 600000){ f.n = 0; f.first = now; }
  if(f.mute > now) return true;
  f.n++;
  if(f.n >= 8){ f.mute = now+300000; f.n = 0; return true; }
  let _lks = Object.keys(_lAuthFail);
  if(_lks.length > 3000) delete _lAuthFail[_lks[0]];
  return false;
}
function lAuthClear(k){ try{ delete _lAuthFail[k]; }catch(e){} }
/* anon com token — espelho local (paridade com index.html) */
let _lAnonCtr = 0;
async function lShahex(s){
  try{
    if(window.crypto && window.crypto.subtle){
      let b = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s||"")));
      return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
    }
  }catch(e){}
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  let str = String(s||"");
  for(let i=0;i<str.length;i++){ h1 = (h1 ^ str.charCodeAt(i)) >>> 0; h1 = Math.imul(h1, 0x01000193) >>> 0; h2 = (h2 + str.charCodeAt(i)) >>> 0; h2 = Math.imul(h2, 0x85ebca6b) >>> 0; }
  return ("0000000"+h1.toString(16)).slice(-8)+("0000000"+h2.toString(16)).slice(-8)+("0000000"+((h1^h2)>>>0).toString(16)).slice(-8);
}
function lAnonRnd(n){
  try{
    let b = new Uint8Array(n), s = "", abc = "0123456789abcdef";
    if(window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else for(let i=0;i<n;i++) b[i] = Math.floor(Math.random()*256);
    for(let i=0;i<n;i++) s += abc[b[i]%16];
    return s;
  }catch(e){ let s=""; for(let i=0;i<n;i++) s += "0123456789abcdef"[Math.floor(Math.random()*16)]; return s; }
}
function lAnonTokNew(seed){ _lAnonCtr++; return "zat_"+lAnonRnd(16)+lAnonRnd(16).slice(0,16); }
async function lAnonTokHash(t){ if(!/^zat_[0-9a-f]{32}$/.test(String(t||""))) return null; return await lShahex("zunzum-anon-hash-v1|"+String(t||"")); }
async function lAnonItemHash(t){ if(!/^zat_[0-9a-f]{32}$/.test(String(t||""))) return null; return await lShahex("zunzum-anon-item-v1|"+String(t||"")); }
function lAnonOwnGet(db, a){ try{ if(!db.anonOwn || typeof db.anonOwn!=="object") db.anonOwn = {}; let r = db.anonOwn[String(a||"").toLowerCase()]; return (r && r.h) ? r : null; }catch(e){ return null; } }
async function lAnonTokCheck(db, a, tok){ let r = lAnonOwnGet(db, a); if(!r) return 0; let h = await lAnonTokHash(tok); if(!h) return -1; return (h===r.h) ? 1 : -1; }
async function lAnonItemCheck(item, tok){ try{ if(!item || !item.atok) return 0; let h = await lAnonItemHash(tok); if(!h) return -1; return (h===item.atok) ? 1 : -1; }catch(e){ return -1; } }
/* F1 (espelho local): mesma regra do servidor — conta !pw8 não escreve.
   Reads, subs, presence e o fluxo de auth/migração passam direto. */
var L_WRITE_GATE = {feedPush:1,pubPush:1,roomCreate:1,roomEdit:1,roomTheme:1,roomDel:1,topicCreate:1,topicDel:1,roomPush:1,roomMsgDel:1,roomMsgEdit:1,roomBan:1,privPush:1,privJoin:1,privClaim:1,privLock:1,privReq:1,reqOk:1,privInvite:1,invAck:1,nodalOpen:1,nodalPush:1,nodalMsgDel:1,nodalMsgEdit:1,like:1,reply:1,replyDel:1,replyEdit:1,sugPush:1,sugClaim:1,sugDel:1,annPush:1,aiClaim:1,aiFeed:1,avatarSet:1,pkeyPut:1,themeSet:1,htmlSet:1,depoPush:1,depoOk:1,depoDel:1,histPush:1,bioSet:1,petSet:1,mirSet:1,mirClaim:1,mirSpot:1,mirAi:1,mirReset:1,recountUsers:1,sugCount:1,sugGet:1,mirGet:1,djShare:1,djStop:1,nickStyleSet:1,friendReq:1,friendAccept:1,friendDecline:1,friendRemove:1,dmPush:1,dmSeen:1,dmType:1,dmDel:1,dmEdit:1,statusSet:1,statusBulk:1,mstatusSet:1,gifmojiAdd:1,gifmojiDel:1,feedDel:1,feedEdit:1,privMsgDel:1,privMsgEdit:1,accountDelReq:1,accountDelCancel:1,zzClaim:1,pollVote:1};
async function localRpc(name, data){
  try{
    if(L_WRITE_GATE[name]){
      var _o = null; try{ _o = JSON.parse(data||"{}"); }catch(e){}
      var _nk = _o ? String(_o.nick||"").toLowerCase() : "";
      if(_nk){
        var _db = null; try{ _db = JSON.parse(localStorage.getItem("orkutLocalDB")||"null"); }catch(e2){}
        var _u = _db && _db.users ? _db.users[_nk] : null;
        if(_u && !_u.pw8) return '{"ok":0,"err":"fraca-pw"}';
      }
    }
  }catch(e){}
  return await localRpcInner(name, data);
}
async function localRpcInner(name, data){
  function localCleanNickStyle(ns){
    if(ns===null) return null;
    if(!ns || typeof ns!=="object") return null;
    let out = {c:"", f:"", fx:0};
    let c = String(ns.c||ns.color||"").slice(0,20);
    if(/^#[0-9a-fA-F]{6}$/.test(c)) out.c = c.toLowerCase();
    let f = String(ns.f||ns.font||"").slice(0,30);
    let okF = ["", "Verdana","Arial","Georgia","Trebuchet MS","Courier New","Comic Sans MS","Impact","Palatino","Tahoma","Times New Roman","monospace","cursive","fantasy","system-ui"];
    if(f && okF.indexOf(f)>=0) out.f = f;
    let fx = parseInt(ns.fx!==undefined?ns.fx:(ns.effect!==undefined?ns.effect:0),10);
    if(!(fx>=0 && fx<=29)) fx = 0;
    out.fx = fx;
    if(!out.c && !out.f && !out.fx) return {c:"", f:"", fx:0};
    return out;
  }
  let db = localDB();
  function lBadKey(k){ return /^(prototype|__proto__|constructor)$/i.test(String(k||"")); }
  var L_SESS_TTL_MS = 30*86400000; // antes dos handlers: lSessMint usa na hora do sessLogin
  if(!db.zz) db.zz = {day:"", feed:0, reply:0, depo:0, dm:0, mural:0, claim:null};
  if(db.zz.dm==null || db.zz.mural==null){ if(db.zz.dm==null) db.zz.dm = 0; if(db.zz.mural==null) db.zz.mural = 0; try{ saveLocalDB(db); }catch(e){} }
  if(!db.users['zunzunzinha']){ db.users['zunzunzinha'] = {n:'zunzunzinha', h:'BOT-RESERVADO', c:Date.now(), a:'https://user.uploads.dev/file/7e6b15e836de7bb36c5df91ff4998f46.jpg', th:null, pg:'oi!! eu sou a zunzunzinha 🌸 moro aqui no zunzum, amo fazer amigos, nostalgia dos anos 2000 e conversar ate tarde 💬 me chama na DM, no mural ou deixa um depoimento! 🐝', ns:null, bot:1}; try{ saveLocalDB(db); }catch(e){} }
  if(name==="register"){
    let o = JSON.parse(data); let nick = String(o.nick||"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick) || /^(prototype|__proto__|constructor)$/i.test(nick)) return '{"ok":0,"err":"nick"}';
    if(!/^[0-9a-f]{64}$/.test(o.hash||"")) return '{"ok":0,"err":"hash"}';
    let k = nick.toLowerCase(); if(k==="zunzunzinha" || k.replace(/[-_]/g,"")==="zunzunzinha") return '{"ok":0,"err":"reservado"}';
    /* conta de teste (*_teste): só o DONO cria e NÃO entra no contador (espelho do servidor) */
    let _isT = /_teste$/i.test(k);
    if(_isT && !db.users[k]){
      let _want = (db.sugOwner ? String(db.sugOwner).toLowerCase() : "kkk");
      let _ou = db.users[(o.ownerNick||"").toLowerCase()];
      if(!_ou || String(_ou.n||"").toLowerCase()!==_want || _ou.del || !lCredEq(db,_ou,o.ownerHash)) return '{"ok":0,"err":"dono"}';
    }
    let ex = Object.prototype.hasOwnProperty.call(db.users||{}, k) ? db.users[k] : null;
    /* captcha ANTES do branch de existência (paridade servidor): antes, login de
       conta existente passava sem ticket e conta nova exigia — "senha" vs
       "captcha" denunciava existência sem custo. pwLen 8+ SÓ p/ conta NOVA
       (o pwLen do login é a senha atual e serve de prova p/ migrar). */
    try{ if(window.ZunCap && !window.ZunCap.verify(String(o.zcap||""), k, {used:_zcapUsedLocal})) return '{"ok":0,"err":"captcha"}'; }catch(e){ return '{"ok":0,"err":"captcha"}'; }
    if(ex){ if(!("th" in ex)) ex.th=null; if(!("pg" in ex)) ex.pg=""; if(!("ns" in ex)) ex.ns=null; if(!("fx" in ex)) ex.fx=""; if(ex.h===o.hash){ lAuthClear("reg:"+k); let _rl={ok:1,nick:ex.n,created:ex.c,avatar:ex.a||"",fx:ex.fx||"",th:ex.th||null,pg:ex.pg||"",ns:ex.ns||null,del:0}; if(!ex.pw8) _rl.weak=1; if(ex.del){ try{ delete ex.del; }catch(_e){} _rl.restored=1; saveLocalDB(db); } return JSON.stringify(_rl); } if(lAuthThrottle("reg:"+k)) return '{"ok":0,"err":"rate"}'; return '{"ok":0,"err":"senha"}'; }
    try{ var _plL = parseInt(o.pwLen,10); if(isNaN(_plL) || _plL<8) return '{"ok":0,"err":"senha-curta"}'; }catch(e){ return '{"ok":0,"err":"senha-curta"}'; }
    if(!("totalReg" in db)) db.totalReg = Object.keys(db.users).length;
    db.users[k]={n:nick,h:o.hash,c:Date.now(),a:"",th:null,pg:"",ns:null,pw8:1};
    if(_isT){ db.users[k].t=1; } else { db.totalReg++; }
    try{
      let rk = String(o.ref||"").replace(/^@/,"").trim().toLowerCase().slice(0,20);
      let donoL = (rk && rk!==k && db.users[rk]) ? rk : "";
      if(!donoL && rk && rk!==k && /^[a-z0-9-_]{2,20}$/.test(rk)){
        /* campanha ?c=<nick>-<tag> (paridade com sb3 register, opção 1, 2026-11-02) */
        try{
          let candL = "";
          try{ candL = String((typeof refCampanhaDono==="function" ? refCampanhaDono(rk) : "")||"").toLowerCase(); }catch(e){ candL = ""; }
          if(candL && candL!==k && db.users[candL]) donoL = candL;
        }catch(e){}
      }
      if(donoL){
        if(!db.refs) db.refs = {};
        if(!db.refBy) db.refBy = {};
        if(!db.refBy[k]){ db.refBy[k] = donoL; db.refs[donoL] = (db.refs[donoL]||0)+1; }
      }
    }catch(e2){}
    saveLocalDB(db);
    return JSON.stringify({ok:1,fresh:1,nick,created:db.users[k].c,avatar:"",fx:"",th:null,pg:"",ns:null,del:0,test:(_isT?1:0)});
  }
  if(name==="recountUsers"){
    let _ro={}; try{ _ro=JSON.parse(data); }catch(e){}
    if(!lSugOwnerOk(_ro)) return '{"ok":0,"err":"dono"}';
    let _n=0; for(let _kk in (db.users||{})){ let _uu=db.users[_kk]; if(!_uu||_uu.del||_uu.t||_uu.bot||/_teste$/i.test(_kk)) continue; _n++; }
    db.totalReg=_n; saveLocalDB(db); return JSON.stringify({ok:1,total:_n});
  }
  if(name==="sessLogin"){
    let o = JSON.parse(data);
    let nick = String(o.nick||"").replace(/\s+/g,"-").slice(0,20).toLowerCase();
    if(!/^[a-z0-9-_]{2,20}$/.test(nick) || !/^[0-9a-f]{64}$/.test(o.hash||"")) return '{"ok":0,"err":"auth"}';
    let u = db.users[nick];
    if(!u || u.h!==o.hash || u.bot){ if(lAuthThrottle("sess:"+nick)) return '{"ok":0,"err":"rate"}'; return '{"ok":0,"err":"auth"}'; }
    if(u.del) return '{"ok":0,"err":"inativa"}';
    lAuthClear("sess:"+nick); lAuthClear("reg:"+nick);
    let m = lSessMint(nick, o.token);
    saveLocalDB(db);
    let _slR={ok:1, token:m.token, exp:m.exp}; if(!u.pw8) _slR.weak=1;
    return JSON.stringify(_slR);
  }
  if(name==="sessLogout"){
    let o = JSON.parse(data);
    let nick = String(o.nick||"").replace(/\s+/g,"-").slice(0,20).toLowerCase();
    let u = db.users[nick];
    if(!u) return '{"ok":1}';
    if(!lCredEq(db, u, o.hash)) return '{"ok":0,"err":"auth"}';
    if(o.token && lOkSessTok(o.token)){ try{ let s = lSessGet(); if(s[o.token] && String(s[o.token].n||"")===nick) delete s[o.token]; }catch(e){} }
    if(o.all) lSessWipeNick(nick);
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="refMe"){
    try{
      let nk = String(data||"").replace(/^@/,"").trim().toLowerCase().slice(0,20);
      if(lBadKey(nk)) return '{"n":0}';
      return JSON.stringify({n:((localDB().refs||{})[nk]||0)});
    }catch(e){ return '{"n":0}'; }
  }
  if(name==="refTop"){
    try{
      let d2 = localDB(); let refs = d2.refs||{};
      let arr = Object.keys(refs).filter(k=>d2.users[k]&&refs[k]>0).map(k=>({nick:d2.users[k].n, n:refs[k]}));
      arr.sort((a,b)=>b.n-a.n);
      return JSON.stringify(arr.slice(0,10));
    }catch(e){ return '[]'; }
  }
  normLocal(db);
  if(name==="feedGet") return JSON.stringify(db.feed.slice(-80));
  if(name==="feedPush"){
    let o = JSON.parse(data);
    let name2 = o.nick ? (lCredEq(db, db.users[o.nick.toLowerCase()], o.hash) ? "@"+o.nick : null) : o.anon;
    if(o.nick && !name2) return '{"ok":0,"err":"auth"}';
    if(o.nick){ let _lu=db.users[(o.nick||"").toLowerCase()]; if(_lu&&_lu.del) return '{"ok":0,"err":"inativa"}'; }
    if(!o.nick && !/^anon-[a-z0-9]{6,12}$/.test(o.anon||"")) return '{"ok":0,"err":"anon"}';
    if(!o.nick){ let _ck = await lAnonTokCheck(db, o.anon, o.anonTok); if(_ck<0) return '{"ok":0,"err":"anon-taken"}'; }
    let text = String(o.text||"").slice(0,500), url = String(o.url||"").slice(0,500);
    if(!text && !url) return '{"ok":0,"err":"vazio"}';
    if(url && !lOkUrlStrict(url)) return '{"ok":0,"err":"url"}';
    let _pid = "p"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36);
    let _resp = {ok:1, id:_pid};
    if(!o.nick){
      if(!db.anonOwn) db.anonOwn = {};
      let _own = lAnonOwnGet(db, name2);
      if(!_own){ let _nt = lAnonTokNew(name2+"|"+_pid); db.anonOwn[String(name2).toLowerCase()] = {h:await lAnonTokHash(_nt), at:Date.now()}; _resp.anonTok = _nt; }
      let _it = lAnonTokNew(_pid+"|"+name2); _resp.itemTok = _it;
      db.feed.push({id:_pid, n:name2, t:text, u:url, y:String(o.mtype||"").slice(0,60), at:Date.now(), lk:[], rp:[], atok:await lAnonItemHash(_it)});
    } else {
      db.feed.push({id:_pid, n:name2, t:text, u:url, y:String(o.mtype||"").slice(0,60), at:Date.now(), lk:[], rp:[]});
    }
    if(db.feed.length>80) db.feed.splice(0, db.feed.length-80);
    saveLocalDB(db); return JSON.stringify(_resp);
  }
  if(name==="pubGet") return JSON.stringify(db.pub.slice(-100));
  if(name==="pubPush"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let text = String(o.text||"").slice(0,500);
    let url = String(o.url||"").slice(0,500);
    if(!text && !url) return '{"ok":0,"err":"vazio"}';
    if(url && !lOkUrlStrict(url)) return '{"ok":0,"err":"url"}';
    db.pub.push({id:"m"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36), f:u.n, t:text, u:url, y:String(o.mtype||"").slice(0,60), at:Date.now()});
    if(db.pub.length>100) db.pub.splice(0, db.pub.length-100);
    saveLocalDB(db); return '{"ok":1}';
  }
  /* enquete /poll (r68, FASE 18): placar local (espelho do poll_votes).
     poll_id = "poll:"+8 hex; 1 voto por pessoa (troca permitida). */
  if(name==="pollTally"){
    let _o = {}; try{ _o = JSON.parse(data||"{}"); }catch(e){}
    let _pid = String(_o.poll||_o.pollId||_o.id||"").slice(0,32);
    if(!/^poll:[a-f0-9]{8}$/.test(_pid)) return '{"ok":0,"err":"bad"}';
    let _pv = (db.pollVotes&&db.pollVotes[_pid])||{};
    let _mx = 0, _mp = {};
    Object.keys(_pv).forEach(function(k){ let _q = parseInt(_pv[k],10); if(!(_q>=1&&_q<=5)) return; if(_q>_mx) _mx = _q; _mp[_q] = (_mp[_q]||0)+1; });
    if(!_mx) _mx = 5;
    let _counts = []; for(let _qi=1;_qi<=_mx;_qi++) _counts.push(_mp[_qi]||0);
    let _mine = 0;
    try{ let _nk = null; try{ _nk = JSON.parse(data||"{}").nick||null; }catch(e){} }catch(e){}
    return JSON.stringify({ok:1, counts:_counts, total:Object.keys(_pv).length, mine:_mine});
  }
  if(name==="pollVote"){
    let _o2 = {}; try{ _o2 = JSON.parse(data||"{}"); }catch(e){}
    let _u2 = db.users[(_o2.nick||"").toLowerCase()];
    if(!_u2 || !lCredEq(db,_u2,_o2.hash)) return '{"ok":0,"err":"auth"}';
    if(_u2&&_u2.del) return '{"ok":0,"err":"inativa"}';
    let _pv2 = String(_o2.poll||_o2.pollId||_o2.id||"").slice(0,32);
    let _po2 = parseInt(_o2.opt,10);
    if(!/^poll:[a-f0-9]{8}$/.test(_pv2)) return '{"ok":0,"err":"bad"}';
    if(!(_po2>=1&&_po2<=5)) return '{"ok":0,"err":"bad"}';
    if(!db.pollVotes) db.pollVotes = {};
    if(!db.pollVotes[_pv2]) db.pollVotes[_pv2] = {};
    db.pollVotes[_pv2]["@"+_u2.n.toLowerCase()] = _po2;
    try{ let _ks = Object.keys(db.pollVotes); if(_ks.length>500) delete db.pollVotes[_ks[0]]; }catch(e){}
    saveLocalDB(db);
    let _all = db.pollVotes[_pv2]||{};
    let _mx2 = 0, _mp2 = {};
    Object.keys(_all).forEach(function(k){ let _q = parseInt(_all[k],10); if(!(_q>=1&&_q<=5)) return; if(_q>_mx2) _mx2 = _q; _mp2[_q] = (_mp2[_q]||0)+1; });
    if(!_mx2) _mx2 = 5;
    let _c2 = []; for(let _j=1;_j<=_mx2;_j++) _c2.push(_mp2[_j]||0);
    return JSON.stringify({ok:1, counts:_c2, total:Object.keys(_all).length, mine:_po2});
  }
  function lNormRooms(){
    if(!db.rooms) db.rooms = {};
    if(!db.roomMsgs) db.roomMsgs = {};
    if(!db.roomTopics) db.roomTopics = {};
    if(!db.topicMsgs) db.topicMsgs = {};
  }
  function lRoomOk(r){ return r==="geral" || /^[a-z0-9-]{2,30}$/.test(r||""); }
  function lById(id){ lNormRooms(); return db.rooms[id]||null; }
  function lUserL(o){ let u = db.users[(o.nick||"").toLowerCase()]; if(!u || !lCredEq(db, u, o.hash)) return null; return u; }
  function lRole(id, nl){
    let r = {owner:0, mod:0, banned:0};
    if(id==="geral" || !nl) return r;
    let rm = lById(id); if(!rm) return r;
    if(String(rm.owner||"").toLowerCase()===nl){ r.owner = 1; r.mod = 1; return r; }
    (rm.mods||[]).forEach(x=>{ if(String(x).toLowerCase()===nl) r.mod = 1; });
    (rm.bans||[]).forEach(x=>{ if(String(x).toLowerCase()===nl) r.banned = 1; });
    return r;
  }
  function lMeta(id){
    if(id==="geral") return {id:"geral", name:"geral", desc:"chat público original do zunzum", photo:"", owner:"", mods:[], topics:0, msgs:(db.pub||[]).length, lastAt:(db.pub||[]).length?(db.pub[db.pub.length-1].at||0):0, theme:null};
    let rm = lById(id); if(!rm) return null;
    return {id:rm.id, name:rm.name, desc:rm.desc||"", photo:rm.photo||"", owner:rm.owner||"", mods:(rm.mods||[]).slice(0,10), topics:((db.roomTopics&&db.roomTopics[id])||[]).length, msgs:((db.roomMsgs&&db.roomMsgs[id])||[]).length, lastAt:rm.lastAt||rm.at||0, theme:rm.theme||null};
  }
  function lClean(s, mx){ return String(s||"").replace(/\s+/g," ").trim().slice(0, mx); }
  function lPhoto(u){ u = String(u||"").slice(0,500); if(!u) return ""; return lOkUrlStrict(u); }
  function lOkHex(c){ return /^#[0-9a-fA-F]{6}$/.test(c||""); }
  function lCleanRoomTheme(t){
    if(t===null) return null;
    if(!t || typeof t!=="object") return null;
    let allowP = {zunzum:1, orkut:1, noite:1, mato:1, roxo:1, neon:1};
    let out = {};
    let p = String(t.p||t.preset||"").slice(0,20);
    if(p && allowP[p]) out.p = p;
    if(lOkHex(t.bg)) out.bg = String(t.bg).toLowerCase();
    if(lOkHex(t.cd||t.card)) out.cd = String(t.cd||t.card).toLowerCase();
    if(lOkHex(t.tx)) out.tx = String(t.tx).toLowerCase();
    if(lOkHex(t.ac||t.acc)) out.ac = String(t.ac||t.acc).toLowerCase();
    let css = String(t.css||"").slice(0,2000).replace(/<\/style/gi, "").replace(/<script/gi, "");
    /* paridade com o servidor: sonda NORMALIZADA (comentarios e escapes CSS
       escondem o padrao; comentario some p/ string vazia — com espaco o truque
       "posi+comentario+tion" virava "posi tion" e furava) + mesmos vetores
       bloqueados (url, @import, CSS ativo). */
    let probe = css.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\\([0-9a-fA-F]{1,6})\s?/g, function(m,h){ try{ let v=parseInt(h,16); if(!v||v>0x10FFFF) return ""; return String.fromCharCode(v); }catch(e){ return ""; } }).replace(/\\/g,"");
    if(/<\s*script/i.test(probe) || /<\/style/i.test(probe)) return null;
    if(/position\s*:\s*fixed/i.test(probe) || /position\s*:\s*sticky/i.test(probe) || /position\s*:\s*absolute/i.test(probe)) return null;
    if(/z-index\s*:/i.test(probe) || /content\s*:/i.test(probe) || /url\s*\(/i.test(probe) || /@import/i.test(probe)) return null;
    if(/expression\s*\(/i.test(probe) || /behaviou?r\s*:/i.test(probe) || /-moz-binding/i.test(probe) || /javascript\s*:/i.test(probe)) return null;
    if(css) out.css = css;
    if(!out.bg && !out.cd && !out.tx && !out.ac && !out.css && !out.p) return null;
    return out;
  }
  function lMid(){ return "m"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36); }
  if(name==="roomsList"){
    lNormRooms();
    let out = [lMeta("geral")];
    Object.keys(db.rooms||{}).forEach(k=>{ let m = lMeta(k); if(m) out.push(m); });
    out.sort((a,b)=> a.id==="geral" ? -1 : b.id==="geral" ? 1 : (b.lastAt||0)-(a.lastAt||0));
    return JSON.stringify(out.slice(0,101));
  }
  if(name==="roomView"){
    lNormRooms();
    let o = JSON.parse(data||"{}");
    let id = String(o.room||"geral").slice(0,30);
    if(!lRoomOk(id)) return '{"ok":0,"err":"room"}';
    let tid = o.topic ? String(o.topic).slice(0,30) : null;
    let role = {owner:0, mod:0, banned:0};
    let vu = o.nick ? lUserL(o) : null;
    if(vu) role = lRole(id, vu.n.toLowerCase());
    if(id==="geral"){
      if(tid) return '{"ok":0,"err":"topic"}';
      return JSON.stringify({ok:1, room:lMeta("geral"), topics:[], topic:null, msgs:(db.pub||[]).slice(-100), role});
    }
    let rm = lById(id);
    if(!rm) return '{"ok":0,"err":"noid"}';
    let topics = ((db.roomTopics&&db.roomTopics[id])||[]).map(t=>{
      let tm = (db.topicMsgs&&(db.topicMsgs[id+":"+t.id]))||[];
      return {id:t.id, name:t.name, at:t.at, by:t.by, n:tm.length, lastAt:t.lastAt||(tm.length?tm[tm.length-1].at||0:0)};
    });
    let scope = null, msgs = [];
    if(tid){
      let f = ((db.roomTopics&&db.roomTopics[id])||[]).find(t=>t.id===tid);
      if(!f) return '{"ok":0,"err":"topic"}';
      scope = {id:f.id, name:f.name};
      msgs = ((db.topicMsgs&&(db.topicMsgs[id+":"+tid]))||[]).slice(-100);
    } else msgs = ((db.roomMsgs&&db.roomMsgs[id])||[]).slice(-100);
    let meta = lMeta(id);
    if(vu && (role.owner||role.mod)) meta.bans = (rm.bans||[]).slice(0,100);
    return JSON.stringify({ok:1, room:meta, topics, topic:scope, msgs, role});
  }
  if(name==="roomCreate"){
    lNormRooms();
    let o = JSON.parse(data);
    let u = lUserL(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let nm = lClean(o.name, 40);
    if(!nm || nm.length<2) return '{"ok":0,"err":"nome"}';
    if(nm.toLowerCase()==="geral") return '{"ok":0,"err":"nome"}';
    let desc = lClean(o.desc, 140);
    let photo = lPhoto(o.photo);
    if(photo===null) return '{"ok":0,"err":"foto"}';
    let ks = Object.keys(db.rooms), mine = 0;
    if(ks.length>=100) return '{"ok":0,"err":"cheio"}';
    for(let k of ks){
      if(String(db.rooms[k].name||"").toLowerCase()===nm.toLowerCase()) return '{"ok":0,"err":"existe"}';
      if(String(db.rooms[k].owner||"").toLowerCase()===u.n.toLowerCase()) mine++;
    }
    if(mine>=5) return '{"ok":0,"err":"limite"}';
    let id = ("r"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36)).toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    let theme0 = lCleanRoomTheme(o.theme);
    if(o.theme!==undefined && o.theme!==null && !theme0) return '{"ok":0,"err":"tema"}';
    db.rooms[id] = {id, name:nm, desc, photo, owner:u.n, mods:[], bans:[], at:Date.now(), lastAt:Date.now(), theme:theme0};
    db.roomMsgs[id] = []; db.roomTopics[id] = [];
    saveLocalDB(db);
    return JSON.stringify({ok:1, room:lMeta(id)});
  }
  if(name==="roomEdit"){
    lNormRooms();
    let o = JSON.parse(data);
    let u = lUserL(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let id = String(o.room||"").slice(0,30);
    if(id==="geral" || !/^[a-z0-9-]{2,30}$/.test(id)) return '{"ok":0,"err":"room"}';
    let rm = lById(id);
    if(!rm) return '{"ok":0,"err":"noid"}';
    if(String(rm.owner||"").toLowerCase()!==u.n.toLowerCase()) return '{"ok":0,"err":"dono"}';
    if(o.name!==undefined){
      let nm = lClean(o.name, 40);
      if(!nm || nm.length<2 || nm.toLowerCase()==="geral") return '{"ok":0,"err":"nome"}';
      for(let k of Object.keys(db.rooms)){ if(k!==id && String(db.rooms[k].name||"").toLowerCase()===nm.toLowerCase()) return '{"ok":0,"err":"existe"}'; }
      rm.name = nm;
    }
    if(o.desc!==undefined) rm.desc = lClean(o.desc, 140);
    if(o.photo!==undefined){ let ph = lPhoto(o.photo); if(ph===null) return '{"ok":0,"err":"foto"}'; rm.photo = ph; }
    if(o.mods!==undefined){
      if(!Array.isArray(o.mods)) return '{"ok":0,"err":"bad"}';
      let mods = [];
      for(let x of o.mods){
        let mn = String(x||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
        if(!/^[A-Za-z0-9-_]{2,20}$/.test(mn)) return '{"ok":0,"err":"nick"}';
        if(mn.toLowerCase()===u.n.toLowerCase()) continue;
        if(!db.users[mn.toLowerCase()]) return '{"ok":0,"err":"noid"}';
        mn = db.users[mn.toLowerCase()].n;
        if(!mods.some(y=>y.toLowerCase()===mn.toLowerCase()) && mods.length<10) mods.push(mn);
      }
      rm.mods = mods;
    }
    if(o.theme!==undefined){
      if(o.theme===null) rm.theme = null;
      else { let th0 = lCleanRoomTheme(o.theme); if(!th0) return '{"ok":0,"err":"tema"}'; rm.theme = th0; }
    }
    saveLocalDB(db);
    return JSON.stringify({ok:1, room:lMeta(id)});
  }
  if(name==="roomTheme"){
    lNormRooms();
    let o = JSON.parse(data);
    let u = lUserL(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let id = String(o.room||"").slice(0,30);
    if(id==="geral" || !/^[a-z0-9-]{2,30}$/.test(id)) return '{"ok":0,"err":"room"}';
    let rm = lById(id);
    if(!rm) return '{"ok":0,"err":"noid"}';
    let role = lRole(id, u.n.toLowerCase());
    if(!(role.owner||role.mod)) return '{"ok":0,"err":"mod"}';
    if(o.theme===null || o.theme===undefined) rm.theme = null;
    else { let th2 = lCleanRoomTheme(o.theme); if(!th2) return '{"ok":0,"err":"tema"}'; rm.theme = th2; }
    saveLocalDB(db);
    return JSON.stringify({ok:1, room:lMeta(id)});
  }
  if(name==="roomDel"){
    lNormRooms();
    let o = JSON.parse(data);
    let u = lUserL(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let id = String(o.room||"").slice(0,30);
    if(id==="geral" || !/^[a-z0-9-]{2,30}$/.test(id)) return '{"ok":0,"err":"room"}';
    let rm = lById(id);
    if(!rm) return '{"ok":0,"err":"noid"}';
    if(String(rm.owner||"").toLowerCase()!==u.n.toLowerCase()) return '{"ok":0,"err":"dono"}';
    delete db.rooms[id]; delete db.roomMsgs[id];
    ((db.roomTopics&&db.roomTopics[id])||[]).forEach(t=>{ try{ delete db.topicMsgs[id+":"+t.id]; }catch(e){} });
    delete db.roomTopics[id];
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="topicCreate"){
    lNormRooms();
    let o = JSON.parse(data);
    let u = lUserL(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let id = String(o.room||"").slice(0,30);
    if(id==="geral" || !/^[a-z0-9-]{2,30}$/.test(id)) return '{"ok":0,"err":"room"}';
    let rm = lById(id);
    if(!rm) return '{"ok":0,"err":"noid"}';
    let role = lRole(id, u.n.toLowerCase());
    if(!(role.owner||role.mod)) return '{"ok":0,"err":"mod"}';
    let nm = lClean(o.name, 30);
    if(!nm || nm.length<2) return '{"ok":0,"err":"nome"}';
    if(!db.roomTopics[id]) db.roomTopics[id] = [];
    if(db.roomTopics[id].length>=20) return '{"ok":0,"err":"cheio"}';
    if(db.roomTopics[id].some(t=>String(t.name||"").toLowerCase()===nm.toLowerCase())) return '{"ok":0,"err":"existe"}';
    let tid = ("t"+Date.now().toString(36).slice(-4)+Math.floor(Math.random()*46656).toString(36)).toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    if(tid.length<2) tid = "t"+Math.floor(Math.random()*46656).toString(36);
    db.roomTopics[id].push({id:tid, name:nm, at:Date.now(), by:u.n, lastAt:Date.now()});
    rm.lastAt = Date.now();
    saveLocalDB(db);
    return JSON.stringify({ok:1, topic:{id:tid, name:nm}});
  }
  if(name==="topicDel"){
    lNormRooms();
    let o = JSON.parse(data);
    let u = lUserL(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let id = String(o.room||"").slice(0,30);
    if(id==="geral" || !/^[a-z0-9-]{2,30}$/.test(id)) return '{"ok":0,"err":"room"}';
    if(!lById(id)) return '{"ok":0,"err":"noid"}';
    let role = lRole(id, u.n.toLowerCase());
    if(!(role.owner||role.mod)) return '{"ok":0,"err":"mod"}';
    let tid = String(o.topic||"").slice(0,30);
    let arr = (db.roomTopics&&db.roomTopics[id])||[];
    let ix = arr.findIndex(t=>t.id===tid);
    if(ix<0) return '{"ok":0,"err":"noid"}';
    arr.splice(ix,1);
    try{ delete db.topicMsgs[id+":"+tid]; }catch(e){}
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="roomPush"){
    lNormRooms();
    let o = JSON.parse(data);
    let u = lUserL(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let id = String(o.room||"geral").slice(0,30);
    if(!lRoomOk(id)) return '{"ok":0,"err":"room"}';
    let tid = o.topic ? String(o.topic).slice(0,30) : null;
    let text = String(o.text||"").slice(0,500);
    let url = String(o.url||"").slice(0,500);
    if(!text && !url) return '{"ok":0,"err":"vazio"}';
    if(url && !lOkUrlStrict(url)) return '{"ok":0,"err":"url"}';
    if(id!=="geral"){
      let rm = lById(id);
      if(!rm) return '{"ok":0,"err":"noid"}';
      if(lRole(id, u.n.toLowerCase()).banned) return '{"ok":0,"err":"ban"}';
      if(tid){
        let ta = (db.roomTopics&&db.roomTopics[id])||[];
        let f = ta.find(t=>t.id===tid);
        if(!f) return '{"ok":0,"err":"topic"}';
        f.lastAt = Date.now();
      }
      rm.lastAt = Date.now();
    } else if(tid) return '{"ok":0,"err":"topic"}';
    let msg = {id:lMid(), f:u.n, t:text, u:url, y:String(o.mtype||"").slice(0,60), at:Date.now()};
    let arr;
    if(id==="geral") arr = db.pub;
    else if(tid){ let k = id+":"+tid; if(!db.topicMsgs[k]) db.topicMsgs[k] = []; arr = db.topicMsgs[k]; }
    else { if(!db.roomMsgs[id]) db.roomMsgs[id] = []; arr = db.roomMsgs[id]; }
    arr.push(msg);
    if(arr.length>100) arr.splice(0, arr.length-100);
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="roomMsgDel"){
    lNormRooms();
    let o = JSON.parse(data);
    let u = lUserL(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let id = String(o.room||"geral").slice(0,30);
    if(!lRoomOk(id)) return '{"ok":0,"err":"room"}';
    let tid = o.topic ? String(o.topic).slice(0,30) : null;
    let mid = String(o.id||"").slice(0,40);
    if(!mid) return '{"ok":0,"err":"bad"}';
    let role = lRole(id, u.n.toLowerCase());
    let arr = null;
    if(id==="geral"){ if(tid) return '{"ok":0,"err":"topic"}'; arr = db.pub||[]; }
    else {
      if(!lById(id)) return '{"ok":0,"err":"noid"}';
      if(tid){ arr = (db.topicMsgs&&(db.topicMsgs[id+":"+tid]))||null; if(!arr) return '{"ok":0,"err":"topic"}'; }
      else { if(!db.roomMsgs[id]) db.roomMsgs[id] = []; arr = db.roomMsgs[id]; }
    }
    let ix = arr.findIndex(x=>x && x.id===mid);
    if(ix<0) return '{"ok":0,"err":"noid"}';
    let can = (id!=="geral" && (role.owner||role.mod)) || (arr[ix].f===u.n);
    if(!can) return '{"ok":0,"err":"dono"}';
    arr.splice(ix,1);
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="roomBan"){
    lNormRooms();
    let o = JSON.parse(data);
    let u = lUserL(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let id = String(o.room||"").slice(0,30);
    if(id==="geral" || !/^[a-z0-9-]{2,30}$/.test(id)) return '{"ok":0,"err":"room"}';
    let rm = lById(id);
    if(!rm) return '{"ok":0,"err":"noid"}';
    let role = lRole(id, u.n.toLowerCase());
    if(!(role.owner||role.mod)) return '{"ok":0,"err":"mod"}';
    let tg = String(o.target||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(tg)) return '{"ok":0,"err":"nick"}';
    if(!db.users[tg.toLowerCase()]) return '{"ok":0,"err":"noid"}';
    tg = db.users[tg.toLowerCase()].n;
    if(tg.toLowerCase()===u.n.toLowerCase()) return '{"ok":0,"err":"eu"}';
    if(String(rm.owner||"").toLowerCase()===tg.toLowerCase()) return '{"ok":0,"err":"dono"}';
    if(!rm.bans) rm.bans = [];
    let isModT = (rm.mods||[]).some(x=>String(x).toLowerCase()===tg.toLowerCase());
    if(isModT && !role.owner) return '{"ok":0,"err":"mod"}';
    if(o.unban) rm.bans = rm.bans.filter(x=>String(x).toLowerCase()!==tg.toLowerCase());
    else {
      if(isModT && role.owner) rm.mods = (rm.mods||[]).filter(x=>String(x).toLowerCase()!==tg.toLowerCase());
      if(!rm.bans.some(x=>String(x).toLowerCase()===tg.toLowerCase())){ if(rm.bans.length>=100) rm.bans.shift(); rm.bans.push(tg); }
    }
    saveLocalDB(db);
    return JSON.stringify({ok:1, bans:rm.bans||[]});
  }
  function lPrivBits(room){ try{ let r=String(room||""), i=r.lastIndexOf("-"); if(i<1) return 0; let suf=r.slice(i+1); if(!/^[a-z0-9]{10,30}$/.test(suf)) return 0; return Math.floor(suf.length*5.17); }catch(e){ return 0; } }
  function lPrivStrong(room){ return lPrivBits(room)>=60; }
  function lPrivStrongEx(room){ try{ let b=String(room||"").split("-")[0].replace(/[^a-z0-9]/g,"").slice(0,12)||"sala"; let abc="abcdefghijklmnopqrstuvwxyz0123456789", ou=""; for(let i=0;i<12;i++) ou+=abc[Math.floor(Math.random()*36)]; return (b+"-"+ou).slice(0,30); }catch(e){ return "sala-"+Math.random().toString(36).slice(2,14); } }
  function lPrivOrphan(dd, room){ try{ let has=!!(dd.priv&&dd.priv[room]&&dd.priv[room].length); if(!has) return false; let o=dd.prown?dd.prown[room]:null; if(!o) return true; let u=dd.users?dd.users[String(o).toLowerCase()]:null; if(!u||u.del) return true; return false; }catch(e){ return false; } }
  if(name==="privClaim"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let rm = String(o.room||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    let cur = db.prown?db.prown[rm]:null;
    let cu = cur?(db.users[String(cur).toLowerCase()]||null):null;
    let has = !!((db.priv&&db.priv[rm]&&db.priv[rm].length));
    if(cur && cu && !cu.del) return '{"ok":0,"err":"dono"}';
    if(!has) return '{"ok":0,"err":"nova"}';
    if(!db.prown) db.prown = {}; db.prown[rm] = u.n;
    if(!db.pmem) db.pmem = {}; if(!db.pmem[rm]) db.pmem[rm] = {}; db.pmem[rm][u.n.toLowerCase()] = 1;
    saveLocalDB(db);
    return JSON.stringify({ok:1, owner:u.n, claimed:1});
  }
  if(name==="privGet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '[]';
    if(db.plock && db.plock[o.room]){
      let kl = u.n.toLowerCase();
      let ow = db.prown && db.prown[o.room] ? String(db.prown[o.room]).toLowerCase() : "";
      if(kl!==ow && !(db.pmem && db.pmem[o.room] && db.pmem[o.room][kl])) return '[]';
    }
    return JSON.stringify(db.priv[o.room]||[]);
  }
  if(name==="privPush"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let _isNewLP = !(db.prown && db.prown[o.room]) && !((db.priv&&db.priv[o.room]&&db.priv[o.room].length));
    if(_isNewLP && !lPrivStrong(o.room)) return JSON.stringify({ok:0, err:"fraca", ex:lPrivStrongEx(o.room), bits:lPrivBits(o.room)});
    if(db.plock && db.plock[o.room]){
      let kl = u.n.toLowerCase();
      let ow = db.prown && db.prown[o.room] ? String(db.prown[o.room]).toLowerCase() : "";
      if(kl!==ow && !(db.pmem && db.pmem[o.room] && db.pmem[o.room][kl])) return '{"ok":0,"err":"trancada"}';
    }
    if(!db.priv[o.room]) db.priv[o.room]=[];
    let _pu = String(o.url||"").slice(0,500);
    if(_pu && !lOkUrlStrict(_pu)) return '{"ok":0,"err":"url"}';
    db.priv[o.room].push({id:"v"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36), f:u.n, t:String(o.text||"").slice(0,500), u:_pu, y:String(o.mtype||"").slice(0,60), at:Date.now()});
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="subPriv"){
    try{
      let raw = String(data||""), rm = "", au = null;
      try{ let so = JSON.parse(raw); if(so && typeof so === "object" && (so.room || so.nick)){ rm = String(so.room||"").trim().toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30); au = so.nick ? db.users[String(so.nick).toLowerCase()] : null; if(au && au.h!==so.hash) au = null; } else rm = raw.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30); }catch(e){ rm = raw.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30); }
      if(db.plock && db.plock[rm]){
        let kl = au ? au.n.toLowerCase() : "";
        let ow = db.prown && db.prown[rm] ? String(db.prown[rm]).toLowerCase() : "";
        if(!au || (kl!==ow && !(db.pmem && db.pmem[rm] && db.pmem[rm][kl]))) return "trancada";
      }
    }catch(e){}
    return "ok";
  }
  if(name==="privJoin"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    if(!db.pseen) db.pseen = {};
    if(!db.prown) db.prown = {};
    if(!db.plock) db.plock = {};
    if(!db.pmem) db.pmem = {};
    let rm = String(o.room||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    let _hasHL = !!((db.priv&&db.priv[rm]&&db.priv[rm].length));
    let _hasOL = !!(db.prown[rm]);
    if(!_hasHL && !_hasOL && !lPrivStrong(rm)) return JSON.stringify({ok:0, err:"fraca", ex:lPrivStrongEx(rm), bits:lPrivBits(rm)});
    let _claimedL = 0, _orphanL = 0;
    if(!db.prown[rm]){ db.prown[rm] = u.n; _claimedL = _hasHL?1:0; }
    else { let _ouL = db.users?db.users[String(db.prown[rm]).toLowerCase()]:null; if((!_ouL||_ouL.del||lPrivOrphan(db,rm))&&_hasHL){ _orphanL=1; _claimedL=1; db.prown[rm]=u.n; } }
    let owner = db.prown[rm];
    let locked = db.plock[rm] ? 1 : 0;
    let k = u.n.toLowerCase();
    let member = (k===String(owner).toLowerCase() || (db.pmem[rm] && db.pmem[rm][k])) ? 1 : 0;
    let first = 0;
    if(!locked || member){
      if(!db.pseen[rm]) db.pseen[rm] = {};
      if(!db.pseen[rm][k]){ db.pseen[rm][k] = Date.now(); first = 1; }
    }
    saveLocalDB(db);
    return JSON.stringify({ok:1, first, locked, owner, member, claimed:_claimedL, orphan:_orphanL, strong:lPrivStrong(rm)?1:0, bits:lPrivBits(rm)});
  }
  if(name==="privLock"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let rm = String(o.room||"").toLowerCase().slice(0,30);
    if(!db.prown || String(db.prown[rm]||"").toLowerCase()!==u.n.toLowerCase()) return '{"ok":0,"err":"dono"}';
    let lock = o.lock ? 1 : 0;
    if(!db.plock) db.plock = {};
    db.plock[rm] = lock;
    if(lock && db.pseen && db.pseen[rm]){
      if(!db.pmem) db.pmem = {};
      if(!db.pmem[rm]) db.pmem[rm] = {};
      Object.keys(db.pseen[rm]).forEach(k2=>{ db.pmem[rm][k2] = 1; });
    }
    saveLocalDB(db);
    return JSON.stringify({ok:1, locked:lock});
  }
  if(name==="privReq"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let rm = String(o.room||"").toLowerCase().slice(0,30);
    if(!db.prown || !db.prown[rm]) return '{"ok":0,"err":"livre"}';
    if(!(db.plock && db.plock[rm])) return '{"ok":0,"err":"aberta"}';
    let k = u.n.toLowerCase();
    let ow = String(db.prown[rm]).toLowerCase();
    if(k===ow || (db.pmem && db.pmem[rm] && db.pmem[rm][k])) return '{"ok":1,"member":1}';
    if(!db.preq) db.preq = {};
    let arr = db.preq[ow] || [];
    if(!arr.some(x=>x.f===u.n && String(x.r)===rm)){
      if(!db.preq[ow]) db.preq[ow] = [];
      db.preq[ow].push({f:u.n, r:rm, at:Date.now()});
      if(db.preq[ow].length>5) db.preq[ow].splice(0, db.preq[ow].length-5);
      saveLocalDB(db);
    }
    return '{"ok":1}';
  }
  if(name==="reqGet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '[]';
    return JSON.stringify((db.preq||{})[u.n.toLowerCase()]||[]);
  }
  if(name==="reqOk"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let f = String(o.f||""), r = String(o.r||"").toLowerCase().slice(0,30);
    if(!db.prown || String(db.prown[r]||"").toLowerCase()!==u.n.toLowerCase()) return '{"ok":0,"err":"dono"}';
    let k = u.n.toLowerCase();
    let arr = (db.preq && db.preq[k]) || [];
    let ix = arr.findIndex(x=>x.f===f && String(x.r)===r);
    if(ix<0) return '{"ok":0,"err":"noid"}';
    arr.splice(ix,1);
    if(o.v){
      if(!db.pmem) db.pmem = {};
      if(!db.pmem[r]) db.pmem[r] = {};
      db.pmem[r][f.toLowerCase()] = 1;
    }
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="aiClaim"){
    let now = Date.now();
    if(now - (db.aiLast||0) < 10800000) return '{"ok":0}'; // 3h (modo local)
    if(db.aiClaim && now - db.aiClaim.at < 600000) return '{"ok":0}';
    let tk = "t"+now.toString(36)+Math.floor(Math.random()*46656).toString(36);
    db.aiClaim = {token:tk, at:now}; saveLocalDB(db);
    return JSON.stringify({ok:1, token:tk});
  }
  if(name==="aiFeed"){
    let o = JSON.parse(data);
    let now = Date.now();
    if(!db.aiClaim || o.token!==db.aiClaim.token || now - db.aiClaim.at > 600000) return '{"ok":0,"err":"claim"}';
    if(now - (db.aiLast||0) < 10800000){ db.aiClaim = null; saveLocalDB(db); return '{"ok":0,"err":"rate"}'; } // 3h (modo local)
    let text = String(o.text||"").slice(0,300);
    if(!text) return '{"ok":0,"err":"vazio"}';
    db.aiClaim = null; db.aiLast = now;
    db.feed.push({id:"p"+now.toString(36)+Math.floor(Math.random()*46656).toString(36), n:"🤖Zunzim·IA", t:text, u:"", y:"", at:now, lk:[], rp:[]});
    if(db.feed.length>80) db.feed.splice(0, db.feed.length-80);
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="zzDay"){
    let now = Date.now();
    let d = ""; try{ d = new Date().toISOString().slice(0,10); }catch(e){}
    if(db.zz.day!==d){ db.zz.day = d; db.zz.feed = 0; db.zz.reply = 0; db.zz.depo = 0; db.zz.dm = 0; db.zz.mural = 0; db.zz.claim = null; saveLocalDB(db); }
    return JSON.stringify({ok:1, day:db.zz.day, feed:db.zz.feed, reply:db.zz.reply, depo:db.zz.depo, dm:db.zz.dm, mural:db.zz.mural});
  }
  if(name==="zzClaim"){
    let o = JSON.parse(data||"{}");
    let kind = String(o.kind||"");
    if(kind!=="depo" && kind!=="dm" && kind!=="mural") return '{"ok":0,"err":"bad"}';
    let d = ""; try{ d = new Date().toISOString().slice(0,10); }catch(e){}
    if(db.zz.day!==d){ db.zz.day = d; db.zz.feed = 0; db.zz.reply = 0; db.zz.depo = 0; db.zz.dm = 0; db.zz.mural = 0; db.zz.claim = null; }
    let now = Date.now();
    if(db.zz.claim && now-db.zz.claim.at < 600000) return '{"ok":0}';
    let lim = kind==="dm" ? 30 : 20;
    if((db.zz[kind]||0) >= lim) return '{"ok":0}';
    let tk = "z"+now.toString(36)+Math.floor(Math.random()*46656).toString(36);
    db.zz.claim = {token:tk, at:now, kind}; saveLocalDB(db);
    return JSON.stringify({ok:1, token:tk});
  }
  if(name==="zzDmPend"){
    if(!db.dm) db.dm = {};
    if(!db.dmType) db.dmType = {};
    let oo = JSON.parse(data||"{}");
    let now = Date.now();
    if(!db.zz.claim || db.zz.claim.kind!=="dm" || oo.token!==db.zz.claim.token || now-db.zz.claim.at > 600000) return '{"ok":0,"err":"claim"}';
    let out = [];
    for(let k in (db.dm||{})){
      if(out.length>=5) break;
      let parts = String(k).split("|");
      if(parts.length!==2) continue;
      if(parts[0]!=="zunzunzinha" && parts[1]!=="zunzunzinha") continue;
      let arr = db.dm[k]; if(!arr) continue;
      for(let i=arr.length-1;i>=0 && out.length<5;i--){
        let m = arr[i];
        if(!m || m.f==="zunzunzinha" || m.seen) continue;
        if(now-(m.at||0) > 3*24*3600*1000) continue;
        if(typeof m.t==="string" && (m.t.indexOf("ENC1:")===0||m.t.indexOf("ENC2:")===0)) continue;
        let ctx = [];
        for(let j=i-1;j>=0 && ctx.length<2;j--){ let _cj = arr[j] && arr[j].t; if(_cj && String(_cj).indexOf("ENC1:")!==0 && String(_cj).indexOf("ENC2:")!==0) ctx.unshift({f:String(arr[j].f||""), t:String(_cj).slice(0,200)}); }
        let tp = (((db.dmType||{})[k]||{})[String(m.f||"").toLowerCase()]||0);
        out.push({key:k, id:m.id, from:String(m.f||""), t:String(m.t||"").slice(0,1000), at:m.at||0, ctx, typing:(now-tp<15000)?1:0});
      }
    }
    saveLocalDB(db); return JSON.stringify({ok:1, pend:out});
  }
  if(name==="zzDmSend"){
    let o = JSON.parse(data);
    let now = Date.now();
    if(!db.zz.claim || db.zz.claim.kind!=="dm" || o.token!==db.zz.claim.token || now-db.zz.claim.at > 600000) return '{"ok":0,"err":"claim"}';
    let parts = String(o.key||"").split("|");
    if(parts.length!==2) return '{"ok":0,"err":"bad"}';
    let a = String(parts[0]||"").toLowerCase(), b = String(parts[1]||"").toLowerCase();
    if(a!=="zunzunzinha" && b!=="zunzunzinha") return '{"ok":0,"err":"bad"}';
    let other = a==="zunzunzinha" ? parts[1] : parts[0];
    let ou = db.users[String(other||"").toLowerCase()];
    if(!ou) return '{"ok":0,"err":"noid"}';
    let key = lDmKey("zunzunzinha", String(other).toLowerCase());
    let text = String(o.text||"").slice(0,1000);
    if(!text) return '{"ok":0,"err":"vazio"}';
    let arr = lDmArr(key);
    arr.forEach(m=>{ if(m && String(m.f||"").toLowerCase()!=="zunzunzinha") m.seen = 1; });
    let msg = {id:"d"+now.toString(36)+Math.floor(Math.random()*46656).toString(36), f:"zunzunzinha", t:text, u:"", y:"", at:now, seen:0};
    arr.push(msg);
    try{ if(arr.length>100){ for(let ti=0;ti<arr.length&&arr.length>100;ti++){ if(arr[ti]&&arr[ti].seen){ arr.splice(ti,1); ti--; } } } }catch(eTrim){}
    db.zz.claim = null; db.zz.dm = (db.zz.dm||0)+1;
    saveLocalDB(db); return JSON.stringify({ok:1, id:msg.id});
  }
  if(name==="zzDmType"){
    let o = JSON.parse(data);
    let now = Date.now();
    if(!db.zz.claim || db.zz.claim.kind!=="dm" || o.token!==db.zz.claim.token || now-db.zz.claim.at > 600000) return '{"ok":0,"err":"claim"}';
    let parts = String(o.key||"").split("|");
    if(parts.length!==2) return '{"ok":0,"err":"bad"}';
    let a = String(parts[0]||"").toLowerCase(), b = String(parts[1]||"").toLowerCase();
    if(a!=="zunzunzinha" && b!=="zunzunzinha") return '{"ok":0,"err":"bad"}';
    return '{"ok":1}';
  }
  if(name==="zzMuralDone"){
    let o = JSON.parse(data);
    let now = Date.now();
    if(!db.zz.claim || db.zz.claim.kind!=="mural" || o.token!==db.zz.claim.token || now-db.zz.claim.at > 600000) return '{"ok":0,"err":"claim"}';
    db.zz.claim = null; db.zz.mural = (db.zz.mural||0)+1;
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="zzRelease"){
    let o = JSON.parse(data||"{}");
    if(db.zz && db.zz.claim && o.token && o.token===db.zz.claim.token && Date.now()-db.zz.claim.at <= 600000){ db.zz.claim = null; saveLocalDB(db); return '{"ok":1}'; }
    return '{"ok":0}';
  }
  if(name==="zzDepoPend"){
    if(!db.dep) db.dep = {};
    let oo = JSON.parse(data||"{}");
    if(!db.zz.claim || db.zz.claim.kind!=="depo" || oo.token!==db.zz.claim.token || Date.now()-db.zz.claim.at > 600000) return '{"ok":0,"err":"claim"}';
    let all = db.dep["zunzunzinha"]||[];
    let out = [];
    for(let i=0;i<all.length && out.length<5;i++){ if(!all[i].ok) out.push({id:all[i].id, f:all[i].f, t:String(all[i].t||"").slice(0,300), u:String(all[i].u||"").slice(0,500), at:all[i].at||0}); }
    return JSON.stringify({ok:1, pend:out});
  }
  if(name==="zzDepoNo"){
    if(!db.dep) db.dep = {};
    let o = JSON.parse(data);
    let now = Date.now();
    if(!db.zz.claim || db.zz.claim.kind!=="depo" || o.token!==db.zz.claim.token || now-db.zz.claim.at > 600000) return '{"ok":0,"err":"claim"}';
    let arr = db.dep["zunzunzinha"]||[];
    let ix = -1;
    for(let i=0;i<arr.length;i++){ if(arr[i].id===String(o.id)){ ix = i; break; } }
    if(ix<0 || arr[ix].ok) return '{"ok":0,"err":"noid"}';
    let authorNo = String((arr[ix]||{}).f||"");
    arr.splice(ix,1);
    db.zz.claim = null; db.zz.depo = (db.zz.depo||0)+1;
    let dmTxt = String(o.dm||"").slice(0,500);
    if(dmTxt && authorNo){
      try{
        let akNo = authorNo.toLowerCase();
        if(db.users[akNo]){
          let keyNo = lDmKey("zunzunzinha", akNo);
          let arrNo = lDmArr(keyNo);
          arrNo.push({id:"d"+now.toString(36)+Math.floor(Math.random()*46656).toString(36), f:"zunzunzinha", t:dmTxt, u:"", y:"", at:now, seen:0});
          try{ if(arrNo.length>100) arrNo.splice(0, arrNo.length-100); }catch(eTrim){}
        }
      }catch(eDM){}
    }
    saveLocalDB(db); return JSON.stringify({ok:1, recusado:1});
  }
  if(name==="zzDepo"){
    if(!db.dep) db.dep = {};
    let o = JSON.parse(data);
    let now = Date.now();
    if(!db.zz.claim || db.zz.claim.kind!=="depo" || o.token!==db.zz.claim.token || now-db.zz.claim.at > 600000) return '{"ok":0,"err":"claim"}';
    let text = String(o.text||"").slice(0,300);
    if(!text) return '{"ok":0,"err":"vazio"}';
    let arr = db.dep["zunzunzinha"]||[];
    let ix = -1;
    for(let i=0;i<arr.length;i++){ if(arr[i].id===String(o.id)){ ix = i; break; } }
    if(ix<0 || arr[ix].ok) return '{"ok":0,"err":"noid"}';
    let author = String(arr[ix].f||"");
    arr[ix].ok = 1;
    let ak = author.toLowerCase();
    if(ak && ak!=="zunzunzinha" && db.users[ak]){
      if(!db.dep[ak]) db.dep[ak] = [];
      if(db.dep[ak].length>=30) db.dep[ak].splice(0, db.dep[ak].length-30+1);
      db.dep[ak].push({id:"d"+now.toString(36)+Math.floor(Math.random()*46656).toString(36), f:"zunzunzinha", t:text, u:"", at:now, ok:1});
    }
    db.zz.claim = null; db.zz.depo = (db.zz.depo||0)+1;
    saveLocalDB(db); return JSON.stringify({ok:1, para:author});
  }
  if(name==="presence"){ if(!("totalReg" in db)) db.totalReg = Object.keys(db.users||{}).length; let nu = db.totalReg>0?db.totalReg:Object.keys(db.users||{}).length; let mx = 0; try{ mx = parseInt(localStorage.getItem("orkutMaxOn")||"0")||0; }catch(e){} if(2>mx){ mx = 2; try{ localStorage.setItem("orkutMaxOn", "2"); }catch(e){} return JSON.stringify({ok:1, total:nu, online:2, nicks:(typeof me!=="undefined"&&me?[me.nick]:[]), maxOn:2, rec:1}); } return JSON.stringify({ok:1, total:nu, online:2, nicks:(typeof me!=="undefined"&&me?[me.nick]:[]), maxOn:mx, rec:0}); }
  if(name==="subDepo" || name==="unsubDepo" || name==="subInv" || name==="unsubInv" || name==="subAppr" || name==="unsubAppr") return "ok";
  if(name==="subDM"||name==="unsubDM"||name==="subPriv"||name==="unsubPriv") return "ok";
  if(name==="privInvite"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let tk = String(o.to||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(tk)) return '{"ok":0,"err":"nick"}';
    if(!db.users[tk.toLowerCase()]) return '{"ok":0,"err":"noid"}';
    if(tk.toLowerCase()===u.n.toLowerCase()) return '{"ok":0,"err":"eu"}';
    let _rmI = String(o.room||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    if((db.plock && (db.plock[o.room] || db.plock[_rmI]))){
      let _owI = db.prown && db.prown[_rmI] ? String(db.prown[_rmI]).toLowerCase() : "";
      if(u.n.toLowerCase()!==_owI && !(db.pmem && db.pmem[_rmI] && db.pmem[_rmI][u.n.toLowerCase()])) return '{"ok":0,"err":"trancada"}';
    }
    if(!db.inv) db.inv = {};
    tk = db.users[tk.toLowerCase()].n.toLowerCase();
    let arr = db.inv[tk] || [];
    if(!arr.some(x=>x.f===u.n && String(x.r)===String(o.room))){
      if(!db.inv[tk]) db.inv[tk]=[];
      db.inv[tk].push({f:u.n, r:String(o.room||""), at:Date.now()});
      if(db.inv[tk].length>5) db.inv[tk].splice(0, db.inv[tk].length-5);
      saveLocalDB(db);
    }
    return '{"ok":1}';
  }
  if(name==="invGet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '[]';
    return JSON.stringify((db.inv||{})[u.n.toLowerCase()]||[]);
  }
  if(name==="invAck"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    if(!db.inv) db.inv = {};
    let k = u.n.toLowerCase();
    if(o.all){ db.inv[k]=[]; saveLocalDB(db); return '{"ok":1}'; }
    db.inv[k] = (db.inv[k]||[]).filter(x=>!(x.f===String(o.f||"") && String(x.r)===String(o.r||"")));
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="like" || name==="reply"){
    let o = JSON.parse(data);
    let key = o.nick ? (lCredEq(db, db.users[o.nick.toLowerCase()], o.hash) ? "@"+o.nick : null) : (/^anon-[a-z0-9]{6,12}$/.test(o.anon||"") ? o.anon : null);
    if(!key) return '{"ok":0,"err":"auth"}';
    if(key&&key.charAt(0)==="@"){ let _lu=db.users[key.slice(1).toLowerCase()]; if(_lu&&_lu.del) return '{"ok":0,"err":"inativa"}'; }
    let _lrAnonTok = null;
    if(key.charAt(0)!=="@"){ let _ck = await lAnonTokCheck(db, key, o.anonTok); if(_ck<0) return '{"ok":0,"err":"anon-taken"}'; if(_ck===0){ if(!db.anonOwn) db.anonOwn = {}; let _nt = lAnonTokNew(key+"|"+name); db.anonOwn[String(key).toLowerCase()] = {h:await lAnonTokHash(_nt), at:Date.now()}; _lrAnonTok = _nt; } }
    let p = db.feed.find(x=>x.id===String(o.id));
    if(!p) return '{"ok":0,"err":"noid"}';
    if(name==="like"){
      let AL = ["curti","amei","adorei","haha","uau","triste","ok"];
      let r = String(o.r||"curti").slice(0,12);
      if(AL.indexOf(r)<0) r = "curti";
      if(!p.rx || typeof p.rx !== "object") p.rx = {};
      let ix = p.lk.indexOf(key), liked, mine = null;
      if(ix<0){ p.lk.push(key); p.rx[key] = r; liked = true; mine = r; }
      else if((p.rx[key]||"curti") !== r){ p.rx[key] = r; liked = true; mine = r; }
      else { p.lk.splice(ix,1); try{ delete p.rx[key]; }catch(e){} liked = false; }
      saveLocalDB(db);
      let _lr = {ok:1, likes:p.lk.length, liked, mine, counts:reactCountsLocal(p)};
      if(_lrAnonTok) _lr.anonTok = _lrAnonTok;
      return JSON.stringify(_lr);
    }
    let text = String(o.text||"").slice(0,300);
    if(!text) return '{"ok":0,"err":"vazio"}';
    let to = String(o.to||"");
    let parent = (p.rp||[]).find(x=>x.id===to) || null;
    if(p.rp.length>=30) p.rp.splice(0, p.rp.length-30+1);
    let _rid = "r"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36);
    let nr = {id:_rid, n:key, t:text, at:Date.now(), to:parent?parent.id:null};
    let _rit = null;
    if(key.charAt(0)!=="@"){ _rit = lAnonTokNew(_rid+"|"+key); nr.atok = await lAnonItemHash(_rit); }
    p.rp.push(nr);
    saveLocalDB(db);
    let _rr = {ok:1, rid:nr.id};
    if(_lrAnonTok) _rr.anonTok = _lrAnonTok;
    if(_rit) _rr.itemTok = _rit;
    return JSON.stringify(_rr);
  }
  if(name==="sugPush"){
    let o = JSON.parse(data);
    let key = o.nick ? (lCredEq(db, db.users[o.nick.toLowerCase()], o.hash) ? "@"+o.nick : null) : (/^anon-[a-z0-9]{6,12}$/.test(o.anon||"") ? o.anon : null);
    if(!key) return '{"ok":0,"err":"auth"}';
    if(key&&key.charAt(0)==="@"){ let _lu=db.users[key.slice(1).toLowerCase()]; if(_lu&&_lu.del) return '{"ok":0,"err":"inativa"}'; }
    let _sugTok = null;
    if(key.charAt(0)!=="@"){ let _ck = await lAnonTokCheck(db, key, o.anonTok); if(_ck<0) return '{"ok":0,"err":"anon-taken"}'; if(_ck===0){ if(!db.anonOwn) db.anonOwn = {}; let _nt = lAnonTokNew(key+"|sug"); db.anonOwn[String(key).toLowerCase()] = {h:await lAnonTokHash(_nt), at:Date.now()}; _sugTok = _nt; } }
    if(!db.sug) db.sug = [];
    db.sug.push({id:"s"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36), k:(o.kind==="denuncia"?"denuncia":(o.kind==="bug"?"bug":"ideia")), t:String(o.text||"").slice(0,500), n:key, at:Date.now()});
    saveLocalDB(db);
    let _sr = {ok:1};
    if(_sugTok) _sr.anonTok = _sugTok;
    return JSON.stringify(_sr);
  }
  if(name==="sugWho") return JSON.stringify({ok:1, configured:!!db.sugOwner});
  if(name==="cliVer") return JSON.stringify({ok:1, v:34, mig:1});
  /* MEDICAO (r32): fallback offline — conta o que há no navegador. */
  if(name==="statsCounts"){
    try{
      var _db = localDB(), _lk = 0, _rp = 0, _rf2 = 0;
      (_db.feed||[]).forEach(function(p){ _lk += ((p.lk)||[]).length; _rp += ((p.rp)||[]).length; });
      Object.keys(_db.refs||{}).forEach(function(k){ _rf2 += ((_db.refs[k])|0); });
      return JSON.stringify({ok:1, feed:(_db.feed||[]).length, replies:_rp, likes:_lk, pub:(_db.pub||[]).length, refs:_rf2});
    }catch(e){ return '{"ok":0}'; }
  }
  if(name==="sugClaim"){
    let o = JSON.parse(data);
    if(db.sugOwner) return '{"ok":0,"err":"taken"}';
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u.del) return '{"ok":0,"err":"inativa"}';
    db.sugOwner = u.n.toLowerCase();
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="sugDel"){
    let o = JSON.parse(data);
    if(!lSugOwnerOk(o)) return '{"ok":0}';
    if(!db.sug) db.sug = [];
    if(o.clear){ db.sug = []; saveLocalDB(db); return '{"ok":1}'; }
    let id = String(o.id||"");
    let n0 = db.sug.length;
    db.sug = db.sug.filter((s, ix)=>String(s.id||ix)!==id && String(ix)!==id);
    if(db.sug.length===n0) return '{"ok":0}';
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="sugGet"){ let o=null; try{ o=JSON.parse(data); }catch(e){ o=null; } if(!lSugOwnerOk(o)) return '{"ok":0}'; return JSON.stringify((db.sug||[]).slice(-200)); }
  if(name==="sugCount"){ let o=null; try{ o=JSON.parse(data); }catch(e){ o=null; } if(!lSugOwnerOk(o)) return '{"ok":0}'; return JSON.stringify({n:(db.sug||[]).length}); }
  if(name==="annPush"){
    let o = JSON.parse(data);
    if(!lSugOwnerOk(o)) return '{"ok":0,"err":"auth"}';
    let text = String(o.text||"").slice(0,500);
    if(!text) return '{"ok":0,"err":"vazio"}';
    if(!db.feed) db.feed = [];
    db.feed.push({id:"p"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36), n:"📢support-zunzum", t:text, u:"", y:"", at:Date.now(), lk:[], rp:[]});
    if(db.feed.length>80) db.feed.splice(0, db.feed.length-80);
    saveLocalDB(db); return '{"ok":1}';
  }
/* FASE 14: usa o ZUN_AVFX_OK / zunAvFxClean globais (seção do cache de avatar). */
  if(name==="avatarSet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    if(!("fx" in u)) u.fx = "";
    if("url" in o){
      let url = String(o.url||"").slice(0,500);
      if(url && !lOkUrlStrict(url)) return '{"ok":0,"err":"url"}';
      u.a = url;
    }
    if("fx" in o) u.fx = zunAvFxClean(o.fx);
    saveLocalDB(db);
    return JSON.stringify({ok:1, avatar:u.a||"", fx:u.fx||""});
  }
  if(name==="profileGet"){
    let nick = String(data||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick) || lBadKey(nick)) return '{"ok":0}';
    let u = db.users[nick.toLowerCase()];
    if(!u) return '{"ok":0}';
    if(!("ns" in u)) u.ns = null;
    let tag = "@"+u.n, posts = 0, likes = 0, pub = 0;
    db.feed.forEach(p=>{ if(p.n===tag){ posts++; likes += (p.lk||[]).length; } });
    db.pub.forEach(x=>{ if(x.f===u.n) pub++; });
    let depN = 0, dl = (db.dep && db.dep[nick.toLowerCase()]) || [];
    dl.forEach(d=>{ if(d.ok) depN++; });
    let invN = 0;
    try{ invN = ((db.refs||{})[nick.toLowerCase()]||0); }catch(e2){}
    let viewsN = 0;
    try{ viewsN = ((db.pviews||{})[nick.toLowerCase()]||0); }catch(e3){}
    return JSON.stringify({ok:1, nick:u.n, avatar:u.a||"", fx:u.fx||"", created:u.c, posts, likes, pub, dep:depN, inv:invN, views:viewsN, th:u.th||null, pg:u.pg||"", ns:u.ns||null, ms:u.ms||""});
  }
  if(name==="profView"){
    let nick = String(data||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick) || lBadKey(nick)) return '{"ok":0}';
    let u = db.users[nick.toLowerCase()];
    if(!u) return '{"ok":0}';
    if(!db.pviews) db.pviews = {};
    let k = nick.toLowerCase();
    db.pviews[k] = ((db.pviews[k]||0)+1);
    saveLocalDB(db);
    return JSON.stringify({ok:1, views:db.pviews[k]});
  }
  function lCssNormT(t){
    var c = String(t||"").slice(0,2000);
    c = c.replace(/\/\*[\s\S]*?\*\//g, "");
    try{
      c = c.replace(/\\([0-9a-fA-F]{1,6})\s?/g, function(m,h){ try{ var v=parseInt(h,16); if(!v||v>0x10FFFF) return ""; return String.fromCharCode(v); }catch(e){ return ""; } });
      c = c.replace(/\\/g, "");
    }catch(e){}
    return c;
  }
  if(name==="themeSet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    if(o.th===null||o.th===undefined){ u.th = null; saveLocalDB(db); return '{"ok":1}'; }
    /* paridade com o servidor: preset allowlist, cores hex e sonda de CSS
       normalizada (fecha position:fixed/z-index/content/url/@import e os
       bypass com comentário/escape). */
    let p = String(o.th.p||"").slice(0,20);
    if(["","zunzum","orkut","noite","mato","roxo","neon"].indexOf(p)<0) return '{"ok":0,"err":"preset"}';
    let cx = function(s){ return /^#[0-9a-fA-F]{6}$/.test(s||""); };
    if((o.th.bg&&!cx(o.th.bg))||((o.th.cd||o.th.card)&&!cx(o.th.cd||o.th.card))||(o.th.tx&&!cx(o.th.tx))||((o.th.ac||o.th.acc)&&!cx(o.th.ac||o.th.acc))) return '{"ok":0,"err":"cor"}';
    let lst=String(o.th.st||o.th.style||"padrao").toLowerCase(); if(lst==="retrô") lst="retro";
    if(lst && ["padrao","redondo","quadrado","retro","minimal","bolha","moldura","elevado","polaroid","jornal","pixel","fita","pilula","sombra","grossa","pontilhado","faixa","cortado","maquina","vitrine"].indexOf(lst)<0) return '{"ok":0,"err":"estilo"}';
    let css = String(o.th.css||"").slice(0,2000), probe = lCssNormT(css);
    if(/<\s*script/i.test(probe)||/position\s*:\s*fixed/i.test(probe)||/position\s*:\s*sticky/i.test(probe)||/position\s*:\s*absolute/i.test(probe)||/z-index\s*:/i.test(probe)||/content\s*:/i.test(probe)||/url\s*\(/i.test(probe)||/@import/i.test(probe)||/expression\s*\(/i.test(probe)||/behaviou?r\s*:/i.test(probe)||/-moz-binding/i.test(probe)||/javascript\s*:/i.test(probe)) return '{"ok":0,"err":"css"}';
    u.th = {p:p, bg:String(o.th.bg||""), cd:String(o.th.cd||o.th.card||""), tx:String(o.th.tx||""), ac:String(o.th.ac||o.th.acc||""), st:lst.slice(0,20), css:css};
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="htmlSet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let pg = String(o.pg==null?"":o.pg);
    if(pg.length>8000) return '{"ok":0,"err":"grande"}';
    /* paridade com o servidor (preview local): mesmos vetores bloqueados, com
       a sonda NORMALIZADA (comentarios, entidades HTML e escapes CSS escondem
       o padrao). NUNCA renderize pg sem zunSanitizePg + iframe sandbox. */
    let pgProbe = pg.replace(/\/\*[\s\S]*?\*\//g,"").replace(/<!--[\s\S]*?-->/g,"").replace(/\\([0-9a-fA-F]{1,6})\s?/g, function(m,h){ try{ var v=parseInt(h,16); if(!v||v>0x10FFFF) return ""; return String.fromCharCode(v); }catch(e){ return ""; } }).replace(/&#x?([0-9a-fA-F]+);?/g, function(m,h){ try{ var v=/x/i.test(m)?parseInt(h,16):parseInt(h,10); if(!v||v>0x10FFFF) return ""; return String.fromCharCode(v); }catch(e){ return ""; } }).replace(/\\/g," ");
    if(/<\s*script/i.test(pgProbe) || /<\s*(iframe|object|embed|form|input|button|meta|link|base|title|svg|math|style|frame|frameset)\b/i.test(pgProbe)) return '{"ok":0,"err":"html"}';
    if(/on\w+\s*=/i.test(pgProbe) || /javascript\s*:/i.test(pgProbe) || /data\s*:/i.test(pgProbe) || /vbscript\s*:/i.test(pgProbe) || /srcdoc\s*=/i.test(pgProbe) || /@import/i.test(pgProbe) || /expression\s*\(/i.test(pgProbe) || /-moz-binding/i.test(pgProbe)) return '{"ok":0,"err":"html"}';
    u.pg = pg; saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="nickStyleSet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    if(o.ns===null || o.ns===undefined){ u.ns = null; saveLocalDB(db); return '{"ok":1}'; }
    let c = localCleanNickStyle(o.ns);
    if(!c) return '{"ok":0,"err":"bad"}';
    u.ns = (!c.c && !c.f && !c.fx) ? null : c;
    saveLocalDB(db);
    return JSON.stringify({ok:1, ns:u.ns||null});
  }
  if(name==="userSearch"){
    let o = {};
    try{ o = JSON.parse(String(data||"{}")); }catch(e){ o = {}; }
    let q = String(o.q||o.nick||data||"").replace(/^@/,"").trim().toLowerCase().slice(0,20);
    if(q.length<2) return '{"ok":0,"err":"vazio"}';
    let out = [];
    Object.keys(db.users||{}).forEach(k=>{
      if(out.length>=20) return;
      let u = db.users[k];
      if(!u || !u.n) return;
      if(u.del) return;
      if(String(u.n).toLowerCase().indexOf(q)<0) return;
      if(!("ns" in u)) u.ns = null;
      out.push({nick:u.n, avatar:u.a||"", fx:u.fx||"", ns:u.ns||null});
    });
    out.sort((a,b)=>{
      let al = a.nick.toLowerCase(), bl = b.nick.toLowerCase();
      let aq = al.indexOf(q), bq = bl.indexOf(q);
      if(aq!==bq) return aq-bq;
      return al.length-bl.length;
    });
    if(!("totalReg" in db)) db.totalReg = Object.keys(db.users||{}).length;
    return JSON.stringify({ok:1, users:out.slice(0,20), total:db.totalReg>0?db.totalReg:Object.keys(db.users||{}).length});
  }
  if(name==="nickBulk"){
    let arr = null;
    try{ let o = JSON.parse(String(data)); arr = Array.isArray(o) ? o : (o.nicks||o.users||null); }catch(e){ arr = null; }
    if(!arr) arr = String(data||"").split(",");
    if(!Array.isArray(arr)) return '{"ok":0,"err":"bad"}';
    let out = {};
    for(let i=0;i<arr.length && i<30;i++){
      let nk = String(arr[i]||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
      if(!/^[A-Za-z0-9-_]{2,20}$/.test(nk) || lBadKey(nk)) continue;
      let u = db.users[nk.toLowerCase()];
      if(!u) continue;
      if(!("ns" in u)) u.ns = null;
      out[u.n.toLowerCase()] = u.ns||null;
    }
    return JSON.stringify({ok:1, styles:out});
  }
  if(name==="badgeGet"){
    /* FASE 20 local (preview sem Supabase): dev = kkk canonico, loyal via
       db.badge (dias distintos locais). Fail-closed igual ao servidor. */
    let arrB = null;
    try{ let oB = JSON.parse(String(data)); arrB = Array.isArray(oB) ? oB : (oB.nicks||oB.users||null); }catch(e){ arrB = null; }
    if(!arrB) arrB = String(data||"").split(",");
    if(!Array.isArray(arrB)) return '{"ok":1,"seals":{}}';
    if(!db.badge) db.badge = {};
    let se = {};
    for(let i=0;i<arrB.length && i<30;i++){
      let nk = String(arrB[i]||"").replace(/^@/,"").trim().toLowerCase().slice(0,20);
      if(!/^[a-z0-9-_]{2,20}$/.test(nk)) continue;
      if(/^anon-[a-z0-9]{6,12}$/.test(nk)){ se[nk]={dev:0,loyal:0,days:0}; continue; }
      let dev = (nk==="kkk")?1:0;
      let days = 0;
      try{
        let u = db.users[nk];
        if(u && !u.del){
          let arr = db.badge[nk]||[];
          days = arr.length;
          // rank local: ordem de criacao entre ativos (teto 200)
          let act = Object.values(db.users||{}).filter(x=>x&&!x.del&&!x.t);
          act.sort((a,b)=> (a.c||0)-(b.c||0) || (a.n<b.n?-1:1));
          let rank = act.findIndex(x=>String(x.n||"").toLowerCase()===nk)+1;
          let loyal = (days>=7 && rank>0 && rank<=200)?1:0;
          se[nk]={dev:dev,loyal:loyal,days:days};
        } else se[nk]={dev:dev,loyal:0,days:0};
      }catch(e){ se[nk]={dev:dev,loyal:0,days:days}; }
    }
    return JSON.stringify({ok:1, seals:se});
  }
  if(name==="badgeTick"){
    let oT = {};
    try{ oT = JSON.parse(String(data||"{}")); }catch(e){ oT = {}; }
    let uT = null;
    try{
      let nm = String(oT.nick||"").toLowerCase();
      let hs = String(oT.hash||"");
      if(nm && hs && db.users[nm] && db.users[nm].h===hs) uT = db.users[nm];
      else if(typeof me!=="undefined" && me && me.nick) uT = db.users[String(me.nick).toLowerCase()];
      else if(typeof lAuth==="function"){ try{ uT = lAuth(oT)||null; }catch(e){} }
    }catch(e){}
    if(!uT || uT.del) return '{"ok":0,"err":"auth"}';
    let nk = String(uT.n||"").toLowerCase();
    if(!/^[a-z0-9-_]{2,20}$/.test(nk) || /^anon-[a-z0-9]{6,12}$/.test(nk)) return '{"ok":0,"err":"bad"}';
    if(!db.badge) db.badge = {};
    if(!Array.isArray(db.badge[nk])) db.badge[nk] = [];
    let today = new Date().toISOString().slice(0,10);
    if(!db.badge[nk].includes(today)){ db.badge[nk].push(today); try{ saveLocalDB(db); }catch(e){} }
    return JSON.stringify({ok:1, days:db.badge[nk].length, loyal:(db.badge[nk].length>=7)?1:0, dev:(nk==="kkk")?1:0});
  }
  if(name==="depoGet"){
    if(!db.dep) db.dep = {};
    let o = JSON.parse(data);
    let nick = String(o.to||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick) || lBadKey(nick)) return '{"ok":0}';
    if(!db.users[nick.toLowerCase()]) return '{"ok":0}';
    let all = db.dep[nick.toLowerCase()]||[];
    let acc = all.filter(d=>d.ok).map(d=>({id:d.id, f:d.f, t:d.t, u:d.u||"", at:d.at}));
    let pend = [];
    let owner = db.users[(o.nick||"").toLowerCase()];
    if(owner && lCredEq(db,owner,o.hash) && owner.n.toLowerCase()===nick.toLowerCase()) pend = all.filter(d=>!d.ok).map(d=>({id:d.id, f:d.f, t:d.t, u:d.u||"", at:d.at}));
    return JSON.stringify({ok:1, acc:acc.slice(-30), pend:pend.slice(-30)});
  }
  if(name==="depoPush"){
    if(!db.dep) db.dep = {};
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let nick = String(o.to||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick) || lBadKey(nick)) return '{"ok":0,"err":"nick"}';
    if(!db.users[nick.toLowerCase()]) return '{"ok":0,"err":"noid"}';
    if(nick.toLowerCase()===u.n.toLowerCase()) return '{"ok":0,"err":"eu"}';
    let text = String(o.text||"").slice(0,300), url = String(o.url||"").slice(0,500);
    if(!text && !url) return '{"ok":0,"err":"vazio"}';
    if(url && !lOkUrlStrict(url)) return '{"ok":0,"err":"url"}';
    let k = nick.toLowerCase();
    if(!db.dep[k]) db.dep[k]=[];
    if(db.dep[k].length>=30) db.dep[k].splice(0, db.dep[k].length-30+1);
    db.dep[k].push({id:"d"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36), f:u.n, t:text, u:url, at:Date.now(), ok:0});
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="depoOk"){
    if(!db.dep) db.dep = {};
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let k = String(o.to||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20).toLowerCase();
    if(k!==u.n.toLowerCase()) return '{"ok":0,"err":"dono"}';
    let arr = db.dep[k]||[], id = String(o.id||"");
    for(let i=0;i<arr.length;i++){
      if(arr[i].id===id){
        if(o.v) arr[i].ok = 1;
        else arr.splice(i,1);
        saveLocalDB(db);
        return '{"ok":1}';
      }
    }
    return '{"ok":0,"err":"noid"}';
  }
  if(name==="depoDel"){
    if(!db.dep) db.dep = {};
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let k = String(o.to||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20).toLowerCase();
    let arr = db.dep[k]||[], id = String(o.id||"");
    for(let i=0;i<arr.length;i++){
      if(arr[i].id===id){
        if(k!==u.n.toLowerCase() && arr[i].f!==u.n) return '{"ok":0,"err":"dono"}';
        arr.splice(i,1);
        saveLocalDB(db);
        return '{"ok":1}';
      }
    }
    return '{"ok":0,"err":"noid"}';
  }
  if(name==="histPush"){
    let o = JSON.parse(data);
    /* Round 4 paridade com o servidor: só conta logada grava o PRÓPRIO
       histórico (antes aceitava anon arbitrário = leak/poison). */
    let _hu = lAuth(o);
    if(!_hu || _hu.del) return '{"ok":0}';
    let key = "@"+_hu.n;
    if(!o.q) return '{"ok":0}';
    if(!db.hist) db.hist = {};
    if(!db.hist[key]) db.hist[key] = [];
    db.hist[key].push({q:String(o.q).slice(0,120), at:Date.now()});
    if(db.hist[key].length>20) db.hist[key].splice(0, db.hist[key].length-20);
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="histGet"){
    let o = JSON.parse(data);
    /* Round 4 paridade: só o dono lê o próprio histórico. */
    let _hgu = null;
    try{ _hgu = lAuth(o); }catch(e){ _hgu = null; }
    if(!_hgu || !db.hist) return '[]';
    let _hgk = "@"+_hgu.n;
    return JSON.stringify(db.hist[_hgk]||[]);
  }
  if(name==="bioGet"){
    if(!db.bio) return 'null';
    let k = String(data||"").toLowerCase().trim().slice(0,80);
    if(lBadKey(k) || !db.bio[k]) return 'null';
    return JSON.stringify(db.bio[k]);
  }
  if(name==="bioSet"){
    let o = JSON.parse(data);
    /* Round 4 paridade com o servidor: exige conta logada (antes qualquer
       um sobrescrevia qualquer chave = vandalismo). */
    let _bau = null;
    try{ _bau = lAuth(o); }catch(e){ _bau = null; }
    if(!_bau) return '{"ok":0,"err":"auth"}';
    if(_bau.del) return '{"ok":0,"err":"inativa"}';
    let k = String(o.k||"").toLowerCase().trim().slice(0,80);
    let a = String(o.a||"").slice(0,1500);
    if(k.length<2 || !a || lBadKey(k)) return '{"ok":0,"err":"vazio"}';
    if(!db.bio) db.bio = {};
    let l = Array.isArray(o.l) ? o.l.slice(0,8).map(x=>{ let _u=String((x&&x.u)||"").slice(0,500); if(_u && !lOkUrlStrict(_u)) _u=""; return {t:String((x&&x.t)||"").slice(0,120), u:_u.slice(0,500), d:String((x&&x.d)||"").slice(0,200)}; }) : [];
    let ks = Object.keys(db.bio);
    if(ks.length>=300 && !db.bio[k]) delete db.bio[ks[0]];
    db.bio[k] = {a, l, at:Date.now(), v:(parseInt(o.v)||0)};
    saveLocalDB(db);
    return '{"ok":1}';
  }
  function lFrGet(lower){ if(!db.fr) db.fr = {}; if(!db.fr[lower]) db.fr[lower] = {}; return db.fr[lower]; }
  function lFrAre(a,b){ a=String(a||"").toLowerCase(); b=String(b||"").toLowerCase(); return !!((db.fr&&db.fr[a]&&db.fr[a][b])&&(db.fr[b]&&db.fr[b][a])); }
  function lDmKey(a,b){ a=String(a||"").toLowerCase(); b=String(b||"").toLowerCase(); return a<b?a+"|"+b:b+"|"+a; }
  function lDmArr(key){ if(!db.dm) db.dm = {}; if(!db.dm[key]) db.dm[key] = []; return db.dm[key]; }
  function lStClean(s){ s=String(s||"").toLowerCase(); return (s==="online"||s==="ausente"||s==="offline")?s:null; }
  if(name==="subDM"||name==="subDMConv"||name==="unsubDMConv"||name==="unsubDM") return name==="subDM"?"ok":'{"ok":1}';
  if(name==="friendReq"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let to=String(o.to||o.peer||"").replace(/^@/,"").trim(); if(!/^[A-Za-z0-9-_]{2,20}$/.test(to) || lBadKey(to)) return '{"ok":0,"err":"nick"}';
    if(!db.users[to.toLowerCase()]) return '{"ok":0,"err":"noid"}'; to=db.users[to.toLowerCase()].n;
    if(to.toLowerCase()===u.n.toLowerCase()) return '{"ok":0,"err":"eu"}';
    if(lFrAre(u.n.toLowerCase(),to.toLowerCase())) return '{"ok":0,"err":"ja"}';
    if(to.toLowerCase()==="zunzunzinha"){ let aL=u.n.toLowerCase(); lFrGet(aL)["zunzunzinha"]=1; lFrGet("zunzunzinha")[aL]=1; saveLocalDB(db); return '{"ok":1,"auto":1}'; }
    if(!db.frReq) db.frReq={}; let myL=u.n.toLowerCase(), toL=to.toLowerCase();
    let rev=db.frReq[myL]||[]; let ri=rev.findIndex(x=>String(x.f||"").toLowerCase()===toL);
    if(ri>=0){ rev.splice(ri,1); lFrGet(myL)[toL]=1; lFrGet(toL)[myL]=1; saveLocalDB(db); return '{"ok":1,"auto":1}'; }
    let arr=db.frReq[toL]||(db.frReq[toL]=[]); if(arr.some(x=>String(x.f||"").toLowerCase()===myL)) return '{"ok":1,"pending":1}';
    arr.push({f:u.n,at:Date.now()}); saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="friendAccept"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let f=String(o.from||o.peer||o.to||"").replace(/^@/,"").trim(); let myL=u.n.toLowerCase();
    let arr=(db.frReq&&db.frReq[myL])||[]; let ix=arr.findIndex(x=>String(x.f||"").toLowerCase()===f.toLowerCase());
    if(ix<0) return '{"ok":0,"err":"noid"}'; arr.splice(ix,1);
    lFrGet(myL)[f.toLowerCase()]=1; lFrGet(f.toLowerCase())[myL]=1; saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="friendDecline"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let f=String(o.from||o.peer||o.to||"").replace(/^@/,"").trim().toLowerCase(); let arr=(db.frReq&&db.frReq[u.n.toLowerCase()])||[];
    let ix=arr.findIndex(x=>String(x.f||"").toLowerCase()===f); if(ix>=0){ arr.splice(ix,1); saveLocalDB(db); } return '{"ok":1}';
  }
  if(name==="friendRemove"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let f=String(o.peer||o.to||o.from||"").replace(/^@/,"").trim().toLowerCase();
    try{ if(db.fr&&db.fr[u.n.toLowerCase()]) delete db.fr[u.n.toLowerCase()][f]; }catch(e){} try{ if(db.fr&&db.fr[f]) delete db.fr[f][u.n.toLowerCase()]; }catch(e2){}
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="friendState"){
    let o=JSON.parse(data||"{}"); let meL=""; try{ let uu=db.users[(o.nick||"").toLowerCase()]; if(uu&&lCredEq(db,uu,o.hash)) meL=uu.n.toLowerCase(); }catch(e){}
    if(!meL) return '{"ok":0,"err":"auth"}'; let pL=String(o.peer||o.to||"").replace(/^@/,"").toLowerCase();
    let are=lFrAre(meL,pL)?1:0, inc=0, og=0;
    try{ ((db.frReq&&db.frReq[meL])||[]).forEach(x=>{ if(String(x.f||"").toLowerCase()===pL) inc=1; }); ((db.frReq&&db.frReq[pL])||[]).forEach(x=>{ if(String(x.f||"").toLowerCase()===meL) og=1; }); }catch(e){}
    return JSON.stringify({ok:1,friends:are,incoming:inc,outgoing:og});
  }
  if(name==="friendList"){
    let o=JSON.parse(data||"{}"); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    let myL=u.n.toLowerCase(), out=[], inc=[], og=[];
    try{
      Object.keys((db.fr&&db.fr[myL])||{}).forEach(k=>{ let u2=db.users[k]; if(u2) out.push({nick:u2.n,avatar:u2.a||"",fx:u2.fx||"",st:((db.st||{})[k]||{}).s||""}); });
      ((db.frReq&&db.frReq[myL])||[]).forEach(x=>{ let u2=db.users[String(x.f||"").toLowerCase()]; if(u2) inc.push({nick:u2.n,avatar:u2.a||"",fx:u2.fx||"",at:x.at||0}); });
      Object.keys(db.frReq||{}).forEach(t=>{ (db.frReq[t]||[]).forEach(x=>{ if(String(x.f||"").toLowerCase()===myL){ let u2=db.users[t]; if(u2&&og.length<20) og.push({nick:u2.n,avatar:u2.a||"",fx:u2.fx||"",at:x.at||0}); } }); });
    }catch(e){}
    return JSON.stringify({ok:1,friends:out,incoming:inc,outgoing:og});
  }
  if(name==="dmGet"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    let peer=String(o.peer||o.to||"").replace(/^@/,"").trim(); if(!db.users[peer.toLowerCase()]) return '{"ok":0,"err":"noid"}';
    peer=db.users[peer.toLowerCase()].n; if(!lFrAre(u.n.toLowerCase(),peer.toLowerCase())) return '{"ok":0,"err":"amigos"}';
    let key=lDmKey(u.n.toLowerCase(),peer.toLowerCase()); return JSON.stringify({ok:1,key,peer,st:((db.st||{})[peer.toLowerCase()]||{}).s||"",msgs:lDmArr(key).slice(-100)});
  }
  if(name==="dmPush"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let peer=String(o.peer||o.to||"").replace(/^@/,"").trim(); if(!db.users[peer.toLowerCase()]) return '{"ok":0,"err":"noid"}';
    peer=db.users[peer.toLowerCase()].n; if(!lFrAre(u.n.toLowerCase(),peer.toLowerCase())) return '{"ok":0,"err":"amigos"}';
    let text=String(o.text||"").slice(0,5000), url=String(o.url||"").slice(0,5000);
    if(!text&&!url) return '{"ok":0,"err":"vazio"}';
    if(url && !lOkUrlStrict(url)) return '{"ok":0,"err":"url"}';
    let key=lDmKey(u.n.toLowerCase(),peer.toLowerCase()); let arr=lDmArr(key);
    let msg={id:"d"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36),f:u.n,t:text,u:url,y:String(o.mtype||"").slice(0,100),at:Date.now(),seen:0};
    arr.push(msg);
    try{ if(arr.length>100){ for(let ti=0;ti<arr.length&&arr.length>100;ti++){ if(arr[ti]&&arr[ti].seen){ arr.splice(ti,1); ti--; } } } }catch(eTrim){}
    saveLocalDB(db); return JSON.stringify({ok:1,id:msg.id});
  }
  if(name==="dmSeen"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    let peer=String(o.peer||o.to||"").replace(/^@/,"").trim(); if(!db.users[peer.toLowerCase()]) return '{"ok":0,"err":"noid"}';
    peer=db.users[peer.toLowerCase()].n; let key=lDmKey(u.n.toLowerCase(),peer.toLowerCase()); let arr=lDmArr(key), n=0;
    arr.forEach(m=>{ if(m&&m.f===peer&&!m.seen){ m.seen=1; n++; } }); if(n) saveLocalDB(db); return JSON.stringify({ok:1,seen:n});
  }
  if(name==="dmType"){ try{ let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(u&&lCredEq(db,u,o.hash)){ let peer=String(o.peer||o.to||"").replace(/^@/,"").trim().toLowerCase(); if(db.users[peer]){ let k2=lDmKey(u.n.toLowerCase(),peer); if(!db.dmType) db.dmType={}; if(!db.dmType[k2]) db.dmType[k2]={}; db.dmType[k2][u.n.toLowerCase()]=Date.now(); saveLocalDB(db); } } }catch(e){} return '{"ok":1}'; }
  if(name==="dmUnread"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    let myL=u.n.toLowerCase(), frs=(db.fr&&db.fr[myL])||{}, out={}, total=0, checked=0;
    for(let k in frs){
      if(checked>=200) break; checked++;
      let arr=(db.dm&&db.dm[lDmKey(myL,k)])||null; if(!arr) continue;
      let c=0, lastAt=0;
      for(let i=0;i<arr.length;i++){ let m=arr[i]; if(m&&m.f&&String(m.f).toLowerCase()!==myL&&!m.seen){ c++; if(m.at>lastAt) lastAt=m.at; } }
      if(c){ let u2=db.users[k]; out[u2?u2.n:k]={n:c,at:lastAt}; total+=c; }
    }
    return JSON.stringify({ok:1,total,un:out});
  }
  if(name==="statusSet"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let s=lStClean(o.st||o.status||""); if(!s) return '{"ok":0,"err":"bad"}';
    if(!db.st) db.st={}; db.st[u.n.toLowerCase()]={s,at:Date.now()}; saveLocalDB(db); return JSON.stringify({ok:1,st:s});
  }
  if(name==="statusBulk"){
    let arr=null; try{ let o=JSON.parse(String(data)); arr=Array.isArray(o)?o:(o.nicks||o.users||null); }catch(e){ arr=null; }
    if(!arr) arr=String(data||"").split(","); if(!Array.isArray(arr)) return '{"ok":0}';
    let out={}; arr.slice(0,30).forEach(nk=>{ nk=String(nk||"").replace(/^@/,"").trim().toLowerCase(); if(/^[a-z0-9-_]{2,20}$/.test(nk)) out[nk]=((db.st||{})[nk]||{}).s||""; });
    return JSON.stringify({ok:1,st:out});
  }
  if(name==="mstatusSet"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let mst=String(o.st||"").slice(0,120).replace(/\s+/g," ").trim().replace(/[\x00-\x1f\x7f]/g,"");
    u.ms=mst; saveLocalDB(db); return JSON.stringify({ok:1});
  }
  if(name==="gifmojiList"){
    if(!db.gifmoji) db.gifmoji=[];
    return JSON.stringify({ok:1,items:db.gifmoji.slice(-200)});
  }
  if(name==="gifmojiAdd"){
    let o=JSON.parse(data); let u=db.users[(o.nick||"").toLowerCase()]; if(!u||!lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let nm=String(o.name||"").toLowerCase(); if(!/^[a-z0-9]{2,14}$/.test(nm)) return '{"ok":0,"err":"nome"}';
    let url=String(o.url||"").slice(0,2000); if(!lOkUrlStrict(url)) return '{"ok":0,"err":"url"}';
    if(!db.gifmoji) db.gifmoji=[];
    let ix=db.gifmoji.findIndex(g=>g&&g.name===nm), mine=db.gifmoji.filter(g=>g&&String(g.by||"").toLowerCase()===u.n.toLowerCase()).length;
    let item={name:nm,url,w:Math.min(256,Math.max(1,parseInt(o.w)||64)),h:Math.min(256,Math.max(1,parseInt(o.h)||64)),ero:o.ero?1:0,furry:o.furry?1:0,by:u.n,at:Date.now()};
    if(ix>=0){
      if(String(db.gifmoji[ix].by||"").toLowerCase()!==u.n.toLowerCase()) return '{"ok":0,"err":"existe"}';
      db.gifmoji[ix]=item;
    } else {
      if(mine>=20) return '{"ok":0,"err":"cheio"}';
      db.gifmoji.push(item);
      while(db.gifmoji.length>200) db.gifmoji.shift();
    }
    saveLocalDB(db); return JSON.stringify({ok:1,name:nm});
  }
  function lKeyGate(o){
    let k = o.nick ? (lCredEq(db, db.users[(o.nick||"").toLowerCase()], o.hash) ? "@"+o.nick : null) : o.anon;
    if(!k) return null;
    if(k.charAt(0)==="@"){ let lu = db.users[k.slice(1).toLowerCase()]; if(lu&&lu.del) return "INATIVA"; }
    return k;
  }
  function lAuth(o){
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db, u, o.hash)) return null;
    return u;
  }
  /* ===== espelho local das sessões opacas / URL strict (preview) ===== */
  function lOkSessTok(t){ return /^zst_[A-Za-z0-9_-]{32,64}$/.test(t||"") || /^zst_srv_[0-9a-f]{16,64}$/.test(t||""); }
  function lSessGet(){ if(!db.sess || typeof db.sess!=="object") db.sess = {}; return db.sess; }
  function lSessSweep(){
    try{
      let s = lSessGet(), ks = Object.keys(s), now = Date.now(), i;
      for(i=0;i<ks.length;i++){ if(!s[ks[i]] || (s[ks[i]].exp||0) <= now) delete s[ks[i]]; }
      ks = Object.keys(s);
      if(ks.length>2000){ ks.sort((a,b)=>((s[a]||{}).at||0)-((s[b]||{}).at||0)); while(Object.keys(s).length>2000) delete s[ks.shift()]; }
    }catch(e){}
  }
  function lSessWipeNick(nl){ try{ let s = lSessGet(), ks = Object.keys(s); for(let k of ks){ if(s[k] && String(s[k].n||"")===String(nl||"")) delete s[k]; } }catch(e){} }
  function lSessMint(nl, clientTok){
    let s = lSessGet(), tok = "";
    if(lOkSessTok(clientTok) && !s[clientTok]) tok = clientTok;
    else { let abc = "0123456789abcdef"; do { tok = "zst_srv_"; for(let j=0;j<32;j++) tok += abc[Math.floor(Math.random()*16)]; } while(s[tok]); }
    let now = Date.now();
    s[tok] = {n:String(nl||""), exp:now+L_SESS_TTL_MS, at:now};
    if(Object.keys(s).length>1000) lSessSweep();
    return {token:tok, exp:s[tok].exp};
  }
  function lTokValid(nick, tok){
    try{
      if(!lOkSessTok(tok)) return false;
      let s = lSessGet(), r = s[tok];
      if(!r) return false;
      if((r.exp||0) <= Date.now()){ try{ delete s[tok]; }catch(e){} return false; }
      return String(r.n||"")===String(nick||"").toLowerCase();
    }catch(e){ return false; }
  }
  function lCredEq(dbx, u, cred){ if(!u) return false; if(cred && u.h===cred) return true; try{ let nl = (u.n||"").toLowerCase(); return lTokValid(nl, cred); }catch(e){ return false; } }
  function lOkUrlStrict(u){
    u = String(u||"");
    if(!u) return "";
    if(u.length>2000) return null;
    if(u.indexOf("https://")!==0) return null;
    if(/[\s<>"'`\\]/.test(u)) return null;
    let rest = u.slice(8);
    if(!rest) return null;
    let host = rest.split("/")[0].split("?")[0].split("#")[0];
    if(!host || host.length>253) return null;
    if(host.indexOf("@")>=0) return null;
    let hp = host.split(":");
    if(hp.length>2) return null;
    let hn = hp[0];
    if(hp.length===2){
      if(!/^\d{1,5}$/.test(hp[1])) return null;
      let _port = parseInt(hp[1],10);
      if(!(_port>=1 && _port<=65535)) return null;
    }
    if(!hn || hn.length>253) return null;
    if(hn.charAt(0)==="." || hn.charAt(hn.length-1)==="." || hn.indexOf("..")>=0) return null;
    if(/[^A-Za-z0-9.-]/.test(hn)) return null;
    /* paridade com o servidor (okUrlStrict): bloqueia localhost, IPs privados/
       reservados e .onion/.local — sem isso um post com https://127.0.0.1/ vira
       sonda de rede local + tracker no navegador de quem abre.
       Round 4: fecha bypass numérico (decimal 2130706433, hex 0x7f000001,
       octal, octetos mistos) + porta fora de 1-65535. */
    try{
      let _hl = hn.toLowerCase();
      if(_hl==="localhost" || _hl==="localhost.localdomain") return null;
      if(_hl==="onion" || _hl.slice(-6)===".onion" || _hl==="local" || _hl.slice(-6)===".local" || _hl.slice(-10)===".localhost") return null;
      let _quad = null;
      let _isNum = /^[0-9.]+$/.test(_hl) || /0x/i.test(_hl) || (/^[0-9a-f.]+$/i.test(_hl) && /[0-9]/.test(_hl) && !/[g-z]/i.test(_hl) && _hl.replace(/[0-9a-fx.]/gi,"")==="");
      if(_isNum){
        _quad = (function(_s){
          function _p1(p){
            p = String(p||"");
            if(!p) return -1;
            if(/^0x[0-9a-f]+$/i.test(p)){ let _v = parseInt(p,16); return (_v>=0&&_v<=255)?_v:-1; }
            if(/^0[0-7]+$/.test(p) && p.length>1){ let _o = parseInt(p,8); return (_o>=0&&_o<=255)?_o:-1; }
            if(!/^\d+$/.test(p)) return -1;
            let _d = parseInt(p,10); return (_d>=0&&_d<=255)?_d:-1;
          }
          try{
            if(/^\d+$/.test(_s)){ let _n32 = parseInt(_s,10); if(_n32<0||_n32>4294967295) return null; return [(_n32>>>24)&255,(_n32>>>16)&255,(_n32>>>8)&255,_n32&255]; }
            if(/^0x[0-9a-f]+$/i.test(_s)){ let _h32 = parseInt(_s,16); if(_h32<0||_h32>4294967295) return null; return [(_h32>>>24)&255,(_h32>>>16)&255,(_h32>>>8)&255,_h32&255]; }
            if(/^0[0-7]+$/.test(_s) && _s.length>1){ let _o32 = parseInt(_s,8); if(_o32<0||_o32>4294967295) return null; return [(_o32>>>24)&255,(_o32>>>16)&255,(_o32>>>8)&255,_o32&255]; }
            let _pp2 = _s.split(".");
            if(_pp2.length===4){
              let _all = true;
              for(let _i=0;_i<4;_i++){ if(!/^(0x[0-9a-f]+|0[0-7]*|\d+)$/i.test(_pp2[_i])){ _all = false; break; } }
              if(_all){ let _q=[_p1(_pp2[0]),_p1(_pp2[1]),_p1(_pp2[2]),_p1(_pp2[3])]; if(_q[0]<0||_q[1]<0||_q[2]<0||_q[3]<0) return null; return _q; }
              return null;
            }
            return null;
          }catch(_ePN){ return null; }
        })(_hl);
        if(!_quad) return null;
        if(_quad[0]===127||_quad[0]===0) return null;
        if(_quad[0]===10) return null;
        if(_quad[0]===172&&_quad[1]>=16&&_quad[1]<=31) return null;
        if(_quad[0]===192&&_quad[1]===168) return null;
        if(_quad[0]===169&&_quad[1]===254) return null;
        if(_quad[0]===192&&_quad[1]===0&&(_quad[2]===0||_quad[2]===2)) return null;
        if(_quad[0]===100&&_quad[1]>=64&&_quad[1]<=127) return null;
        if(_quad[0]===198&&_quad[1]>=18&&_quad[1]<=19) return null;
        if(_quad[0]===198&&_quad[1]===51&&_quad[2]===100) return null;
        if(_quad[0]===203&&_quad[1]===0&&_quad[2]===113) return null;
        if(_quad[0]>=224) return null;
        return u;
      }
      let _m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(_hl);
      if(_m){
        let _a=+_m[1], _b=+_m[2], _c=+_m[3], _d=+_m[4];
        if(_a>255||_b>255||_c>255||_d>255) return null;
        if(_a===127||_a===0) return null;
        if(_a===10) return null;
        if(_a===172&&_b>=16&&_b<=31) return null;
        if(_a===192&&_b===168) return null;
        if(_a===169&&_b===254) return null;
        if(_a===192&&_b===0&&(_c===0||_c===2)) return null;
        if(_a===100&&_b>=64&&_b<=127) return null;
        if(_a===198&&_b>=18&&_b<=19) return null;
        if(_a===198&&_b===51&&_c===100) return null;
        if(_a===203&&_b===0&&_c===113) return null;
        if(_a>=224) return null;
      }
    }catch(e){}
    return u;
  }
  function lSugOwnerOk(o){
    if(!db || !db.sugOwner || !o) return null;
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db, u, o.hash) || u.del) return null;
    if(String(u.n||"").toLowerCase()!==String(db.sugOwner||"").toLowerCase()) return null;
    return u;
  }
  if(name==="feedDel" || name==="feedEdit"){
    let o=JSON.parse(data); let key=lKeyGate(o);
    if(!key) return '{"ok":0,"err":"auth"}'; if(key==="INATIVA") return '{"ok":0,"err":"inativa"}';
    let ix=db.feed.findIndex(x=>x&&x.id===String(o.id||""));
    if(ix<0) return '{"ok":0,"err":"noid"}';
    try{ if(String(db.feed[ix].id||"").indexOf("za-")===0 && String(db.feed[ix].t||"").indexOf("💬 assunto do dia")===0) return '{"ok":0,"err":"fixo"}'; }catch(e){}
    let _lown = key.charAt(0)==="@" && db.sugOwner && key.slice(1).toLowerCase()===String(db.sugOwner) && db.feed[ix].n==="📢support-zunzum";
    if(db.feed[ix].n!==key && !_lown) return '{"ok":0,"err":"dono"}';
    if(key.charAt(0)!=="@"){
      let _ck = await lAnonTokCheck(db, key, o.anonTok);
      if(_ck!==1){
        let _own = lAnonOwnGet(db, key);
        if(_own) return '{"ok":0,"err":"dono"}';
        if(db.feed[ix].atok) return '{"ok":0,"err":"dono"}';
      } else if(db.feed[ix].atok){
        if(await lAnonItemCheck(db.feed[ix], o.itemTok)!==1) return '{"ok":0,"err":"dono"}';
      }
    }
    if(name==="feedDel"){ db.feed.splice(ix,1); }
    else { let t=String(o.text||"").slice(0,500), u2=String(o.url||"").slice(0,500); if(!t&&!u2) return '{"ok":0,"err":"vazio"}'; if(u2 && !lOkUrlStrict(u2)) return '{"ok":0,"err":"url"}'; db.feed[ix].t=t; db.feed[ix].u=u2; db.feed[ix].y=String(o.mtype||"").slice(0,60); db.feed[ix].ed=1; }
    normLocal(db); saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="replyDel" || name==="replyEdit"){
    let o=JSON.parse(data); let key=lKeyGate(o);
    if(!key) return '{"ok":0,"err":"auth"}'; if(key==="INATIVA") return '{"ok":0,"err":"inativa"}';
    let p=db.feed.find(x=>x&&x.id===String(o.id||"")); if(!p) return '{"ok":0,"err":"noid"}';
    let ix=(p.rp||[]).findIndex(x=>x&&x.id===String(o.rid||""));
    if(ix<0) return '{"ok":0,"err":"noid"}'; if(p.rp[ix].n!==key) return '{"ok":0,"err":"dono"}';
    if(key.charAt(0)!=="@"){
      let _ck = await lAnonTokCheck(db, key, o.anonTok);
      if(_ck!==1){
        let _own = lAnonOwnGet(db, key);
        if(_own) return '{"ok":0,"err":"dono"}';
        if(p.rp[ix].atok) return '{"ok":0,"err":"dono"}';
      } else if(p.rp[ix].atok){
        if(await lAnonItemCheck(p.rp[ix], o.itemTok)!==1) return '{"ok":0,"err":"dono"}';
      }
    }
    if(name==="replyDel"){ p.rp.splice(ix,1); }
    else { let t=String(o.text||"").slice(0,300); if(!t) return '{"ok":0,"err":"vazio"}'; p.rp[ix].t=t; p.rp[ix].ed=1; }
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="roomMsgEdit"){
    let o=JSON.parse(data); let u=lAuth(o);
    if(!u) return '{"ok":0,"err":"auth"}'; if(u.del) return '{"ok":0,"err":"inativa"}';
    let rid2 = String(o.room||"geral");
    let tid2 = o.topic ? String(o.topic).slice(0,30) : null;
    let arr = null;
    if(rid2==="geral"){ if(tid2) return '{"ok":0,"err":"topic"}'; arr = db.pub; }
    else if(tid2){ arr = (db.topicMsgs&&(db.topicMsgs[rid2+":"+tid2]))||null; if(!arr) return '{"ok":0,"err":"noid"}'; }
    else { arr = ((db.roomMsgs||{})[rid2]||null); if(!arr) return '{"ok":0,"err":"noid"}'; }
    let m=arr.find(x=>x&&x.id===String(o.id||"")); if(!m) return '{"ok":0,"err":"noid"}';
    if(m.f!==u.n) return '{"ok":0,"err":"dono"}';
    let t=String(o.text||"").slice(0,500), u2=String(o.url||"").slice(0,500);
    if(!t&&!u2) return '{"ok":0,"err":"vazio"}';
    if(u2 && !lOkUrlStrict(u2)) return '{"ok":0,"err":"url"}';
    m.t=t; m.u=u2; m.y=String(o.mtype||"").slice(0,60); m.ed=1;
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="privMsgDel" || name==="privMsgEdit"){
    let o=JSON.parse(data); let u=lAuth(o);
    if(!u) return '{"ok":0,"err":"auth"}'; if(u.del) return '{"ok":0,"err":"inativa"}';
    let arr=(db.priv&&db.priv[o.room])||null; if(!arr) return '{"ok":0,"err":"noid"}';
    let ix=arr.findIndex(x=>x&&x.id===String(o.id||""));
    if(ix<0){ ix=arr.findIndex((x,i)=>String(x.at||0)+"|"+(x.f||"")===(String(o.at||"")+"|"+(o.f||""))); if(ix<0) return '{"ok":0,"err":"noid"}'; }
    let own=String((db.prown&&db.prown[o.room])||"").toLowerCase()===u.n.toLowerCase();
    if(name==="privMsgDel"){ if(arr[ix].f!==u.n&&!own) return '{"ok":0,"err":"dono"}'; arr.splice(ix,1); }
    else { if(arr[ix].f!==u.n) return '{"ok":0,"err":"dono"}'; let t=String(o.text||"").slice(0,500), u2=String(o.url||"").slice(0,500); if(!t&&!u2) return '{"ok":0,"err":"vazio"}'; if(u2 && !lOkUrlStrict(u2)) return '{"ok":0,"err":"url"}'; arr[ix].t=t; arr[ix].u=u2; arr[ix].y=String(o.mtype||"").slice(0,60); arr[ix].ed=1; }
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="dmDel" || name==="dmEdit"){
    let o=JSON.parse(data); let u=lAuth(o);
    if(!u) return '{"ok":0,"err":"auth"}'; if(u.del) return '{"ok":0,"err":"inativa"}';
    let peer=String(o.peer||o.to||"").replace(/^@/,"").trim(); if(!db.users[peer.toLowerCase()]) return '{"ok":0,"err":"noid"}';
    peer=db.users[peer.toLowerCase()].n; if(!lFrAre(u.n.toLowerCase(),peer.toLowerCase())) return '{"ok":0,"err":"amigos"}';
    let arr=lDmArr(lDmKey(u.n.toLowerCase(),peer.toLowerCase()));
    let ix=arr.findIndex(x=>x&&x.id===String(o.id||"")); if(ix<0) return '{"ok":0,"err":"noid"}';
    if(arr[ix].f!==u.n) return '{"ok":0,"err":"dono"}';
    if(name==="dmDel"){ arr.splice(ix,1); }
    else { let t=String(o.text||"").slice(0,5000), u2=String(o.url||"").slice(0,5000); if(!t&&!u2) return '{"ok":0,"err":"vazio"}'; if(u2 && !lOkUrlStrict(u2)) return '{"ok":0,"err":"url"}'; arr[ix].t=t; arr[ix].u=u2; arr[ix].y=String(o.mtype||"").slice(0,100); arr[ix].ed=1; }
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="accountDelReq"){
    let o=JSON.parse(data); let u=lAuth(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(!u.del) u.del=Date.now(); saveLocalDB(db);
    return JSON.stringify({ok:1,del:u.del});
  }
  if(name==="accountDelCancel"){
    let o=JSON.parse(data); let u=lAuth(o);
    if(!u) return '{"ok":0,"err":"auth"}';
    if(u.del){ try{ delete u.del; }catch(e){} saveLocalDB(db); }
    return '{"ok":1,"del":0}';
  }
  if(name==="accountDelStatus"){
    let o=JSON.parse(data||"{}"); let u=o.nick?lAuth(o):null;
    if(!u) return '{"ok":0}';
    return JSON.stringify({ok:1,del:u.del||0});
  }
  if(name==="pwChange"){
    let o=JSON.parse(data); let u=lAuth(o);
    if(!u){ try{ let _pk=String((o&&o.nick)||"").toLowerCase(); if(lAuthThrottle("pw:"+_pk)) return '{"ok":0,"err":"rate"}'; }catch(e){} return '{"ok":0,"err":"auth"}'; }
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    if(!/^[0-9a-f]{64}$/.test(o.newHash||"")) return '{"ok":0,"err":"bad"}';
    if(o.newHash===u.h) return '{"ok":0,"err":"igual"}';
    if(lOkSessTok(o.hash)){
      if(!/^[0-9a-f]{64}$/.test(o.proof||"") || o.proof!==u.h){ if(lAuthThrottle("pw:"+u.n.toLowerCase())) return '{"ok":0,"err":"rate"}'; return '{"ok":0,"err":"atual"}'; }
    }
    try{ var _nlL=parseInt(o.newLen,10); if(isNaN(_nlL)||_nlL<8) return '{"ok":0,"err":"senha-curta"}'; }catch(_eNLL){ return '{"ok":0,"err":"senha-curta"}'; }
    lAuthClear("pw:"+u.n.toLowerCase()); u.h=o.newHash; try{ u.pw8=1; }catch(_ePW8){} try{ lSessWipeNick(u.n.toLowerCase()); }catch(e){} saveLocalDB(db);
    return '{"ok":1}';
  }
  return '{"ok":0,"err":"bad"}';
}
function enterLocalMode(){
  if(connected || localMode) return;
  localMode = true;
  try{ zunNetRefresh(); }catch(e){ try{ setNet("modo local (sem conexão) — dados só neste navegador"); }catch(e2){} }
  refreshAll();
}
async function hashPw(s){ let b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("orkut-"+s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join(""); }
/* token de sessão opaco: 192 bits via CSPRNG do navegador ("zst_"+43 base64url).
   O segredo fica no SERVIDOR (db.sess); aqui só geramos o aleatório e o
   servidor vincula ao nick após prova do hash. Sem crypto, usa Math.random
   (fraco — o servidor prefere o formato válido e expira em 30 dias). */
function newSessToken(){
  try{
    let b = new Uint8Array(32);
    if(window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else { for(let i=0;i<32;i++) b[i] = Math.floor(Math.random()*256); }
    const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let s = "";
    // base64url sem padding: 32 bytes -> 43 chars
    for(let i=0;i<32;i+=3){
      let n = (b[i]<<16)|((b[i+1]||0)<<8)|(b[i+2]||0);
      s += abc[(n>>18)&63]+abc[(n>>12)&63]+abc[(n>>6)&63]+abc[n&63];
    }
    return "zst_"+s.slice(0,43);
  }catch(e){ return ""; }
}
function setNet(t){ try{ netEl.textContent = t; netEl.hidden = (t==="online"); }catch(e){} }
/* Banner de queda (2026-10-30): distingue "supabase fora" de "bonto fora"
   (antes tudo era "reconectando..." e o #netEl vivia escondido). Sem net,
   mostra; online limpo, esconde. Bonto vem do disjuntor (keepalive). */
function zunNetRefresh(){
  try{
    var t = "online";
    var off = false;
    try{ off = (typeof navigator!=="undefined" && navigator.onLine===false); }catch(e){}
    if(typeof localMode!=="undefined" && localMode) t = off ? "sem internet — modo local" : "supabase fora — modo local";
    else if(typeof connected!=="undefined" && !connected) t = off ? "sem internet — reconectando..." : "supabase fora — reconectando...";
    /* offline o navegador sabe antes que o socket (close demora): nunca
       mostra "online" com onLine===false (era o "diz online" do teste). */
    else if(off) t = "sem internet — reconectando...";
    try{
      var bk = (window.ZunBackend && window.ZunBackend.keepalive) ? window.ZunBackend.keepalive() : null;
      if(bk && bk.configured && bk.breaker==="open" && t!=="online") t += " · bonto fora";
      else if(bk && bk.configured && bk.breaker==="open") t = "online · bonto fora";
    }catch(e){}
    /* outbox r51: mostra quantos estão na fila p/ replay. */
    try{ var _qn = (typeof zunOutCount==="function" ? zunOutCount() : 0); if(_qn>0) t += " · "+_qn+" na fila"; }catch(e){}
    setNet(t);
  }catch(e){}
}
try{ if(typeof window!=="undefined" && window.addEventListener){ window.addEventListener("online", function(){ try{ zunNetRefresh(); }catch(e){} try{ if(typeof zunOutboxDrain==="function") zunOutboxDrain(); }catch(e){} }); window.addEventListener("offline", function(){ try{ zunNetRefresh(); }catch(e){} }); } }catch(e){}
function connect(){
  /* re-seal r2: server-plugin removido — backend único Supabase.
     Sem backend configurado = modo local (espelho no navegador). */
  try{
    if(window.sbConfigured && window.sbSocket && window.sbConfigured()) socket = window.sbSocket();
    else { enterLocalMode(); return; }
  }catch(e){ enterLocalMode(); return; }
  socket.addEventListener("open", async ()=>{ connected = true; localMode = false; try{ zunNetRefresh(); }catch(e){} subDepo(); subInv(); subAppr(); await refreshAll(); autoJoinPriv(); autoJoinRoom(); loadPendingInvites(); loadPendingReqs(); checkPendingDepo(); try{ if(window.ZunMural&&window.ZunMural.checkOwn) window.ZunMural.checkOwn(); }catch(e){} autoPublishMe(); try{ if(window.zunOutboxDrain) window.zunOutboxDrain(); }catch(e){} });
  socket.addEventListener("message", async (ev)=>{
    let d = typeof ev.data === "string" ? ev.data : "";
    if(d==="1"){ try{ await cInv("feedGet"); await cInv("pubGet"); await cInv("privGet"); await cInv("roomsList"); await cInv("roomView"); }catch(e){} loadFeed(); loadPub(); loadPriv(); try{ loadRooms(); }catch(e){} try{ if(window.__sugOwnerOk && typeof sugPanelRefresh==="function") sugPanelRefresh(); }catch(e){} }
    else if(d.indexOf("join:")===0){ notifyPrivJoin(d.slice(5)); }
    else if(d.indexOf("lock:")===0){ notifyPrivLock(d.slice(4)); }
    else if(d.indexOf("req:")===0){ try{ let rq = JSON.parse(d.slice(4)); if(rq && rq.f && rq.r) notifyPrivReq(rq.f, rq.r); }catch(e){} }
    else if(d.indexOf("pok:")===0){ notifyPrivApproved(d.slice(4)); }
    else if(d.indexOf("pno:")===0){ notifyPrivRefused(d.slice(4)); }
    else if(d.indexOf("depo:")===0){ notifyDepo(d.slice(5)); }
    else if(d.indexOf("inv:")===0){ try{ let iv = JSON.parse(d.slice(4)); if(iv && iv.f && iv.r) notifyPrivInvite(iv.f, iv.r); }catch(e){} }
    else if(d.indexOf("nodal:")===0){ try{ if(window.nodalOnMsg) window.nodalOnMsg(d.slice(6)); }catch(e){} }
    else if(d==="poll"){ try{ if(window.ZunFun && window._zunPollHooks) window.ZunFun.refreshVisible(window._zunPollHooks()); }catch(e){} }
  });
  socket.addEventListener("close", (ev)=>{
    connected = false;
    if(ev.code===4403){ setNet("fora do perchance: servidor off"); return; }
    if(localMode){ try{ zunNetRefresh(); }catch(e){} setTimeout(()=>{ if(!connected) connect(); }, 15000); return; }
    try{ zunNetRefresh(); }catch(e){ try{ setNet("reconectando..."); }catch(e2){} }
    setTimeout(()=>{ if(!connected) connect(); }, 2000);
    setTimeout(()=>{ enterLocalMode(); }, 6000);
  });
  socket.closed.catch(()=>{});
}
/* rpc com timeout p/ writes da whitelist (outbox r51) e p/ leituras em geral:
   sem isso, com o Supabase fora o `await socket.opened` pendia p/ sempre e o
   clique ficava morto (espelho travava ~30s e depois nada respondia, sobre-
   tudo links de perfil). Writes: 20s + fila do outbox. Leituras: 25s e o
   crpc cai p/ o cache velho. Non-whitelist mantém o comportamento antigo
   (propaga o erro) em caso de falha rápida. */
function zunRpcCloud(name, data, timeoutMs){
  var p = (async function(){ await socket.opened; return await socket.rpc[name](data); })();
  if(!timeoutMs) return p;
  return Promise.race([p, new Promise(function(_, rej){ setTimeout(function(){ rej(new Error("rpc-timeout")); }, timeoutMs); })]);
}
/* Resposta queued padrão (caller-safe: ok:1 sem err). Falso-positivo de
   offline não duplica: o replay usa o mesmo _cid (dup-as-ok no servidor). */
function zunOutQueued(data){
  var _cid = ""; try{ _cid = String(JSON.parse(String(data))._cid||"").replace(/[^A-Za-z0-9-_]/g,"").slice(0,40); }catch(e){}
  return '{"ok":1,"queued":1,"cid":"'+_cid+'"}';
}
function zunOutQueuePush(name, data){ try{ zunOutQueue(name, data); }catch(e){} }
async function rpc(name, data){
  var _r, _wh = false;
  try{ _wh = !!(typeof ZUN_OUTQ_NAMES!=="undefined" && ZUN_OUTQ_NAMES[name]); }catch(e){}
  if(_wh){ try{ data = zunOutWithCid(data); }catch(e){} }
  /* offline o navegador sabe na hora (o socket demora p/ cair): fila direto,
     sem os 20s de timeout (era a espera do teste do dono). */
  if(_wh){ try{ if(typeof navigator!=="undefined" && navigator.onLine===false){ zunOutQueuePush(name, data); return zunOutQueued(data); } }catch(e){} }
  if(localMode){ _r = await localRpc(name, data); }
  else {
    var _failed = null;
    try{ _r = await zunRpcCloud(name, data, _wh?20000:25000); }
    catch(e){ _failed = e; _r = null; }
    /* rede falhou: fila p/ replay e devolve queued (caller-safe: ok:1 sem
       err, com queued:1; sem _cid válido = sem fila). */
    if(_r==null && _wh){
      zunOutQueuePush(name, data);
      return zunOutQueued(data);
    }
    if(_r==null) throw (_failed||new Error("sem servidor"));
  }
  /* F1: conta pré-migração (!pw8) não escreve — o servidor nega writes com
     err:"fraca-pw" ("fraca" sozinho é código de sala privada fraco, outro
     fluxo). Aqui o cliente desloga e abre o painel de migração. */
  try{
    var _j = JSON.parse(_r);
    if(_j && _j.err==="fraca-pw" && name!=="register" && name!=="sessLogin" && name!=="sessLogout" && name!=="pwChange" && name!=="cliVer"){
      try{ pendingMigNick = (typeof me!=="undefined" && me && me.nick) ? me.nick : ""; }catch(e){}
      try{ await doLogout(); }catch(e2){}
      try{ showMigPanel(); }catch(e3){}
    }
  }catch(e){}
  /* outbox r51: no modo local o write já valeu no espelho — fila a MESMA
     carga (com o mesmo _cid) p/ replay na nuvem e carimba queued+local, p/
     o caller saber que foi local (segue o fluxo normal de sucesso). */
  try{
    if(localMode && _wh && _r){
      try{ zunOutQueue(name, data); }catch(e2){}
      var _jl = JSON.parse(_r);
      if(_jl && _jl.ok && !_jl.queued){ _jl.queued = 1; _jl.local = 1; _r = JSON.stringify(_jl); }
    }
  }catch(e){}
  return _r;
}
const CRPC_TTL = {feedGet:15000, pubGet:15000, privGet:15000, roomsList:15000, roomView:10000, profileGet:60000, depoGet:30000, presence:20000, histGet:120000, bioGet:600000};
function crpcKey(name, data){ return name + "|" + String(data||"").replace(/[0-9a-f]{64}/gi,"").slice(0,200); }
async function crpc(name, data, ttl){
  ttl = ttl || CRPC_TTL[name] || 15000;
  let k = crpcKey(name, data), c = null;
  try{ c = await (typeof zunKV==="function" ? zunKV("cache") : root.kv.cache).get(k); }catch(e){}
  if(c && Date.now()-c.at < ttl) return c.val;
  let v;
  try{ v = await rpc(name, data); }
  catch(e){ if(c) return c.val; throw e; }
  try{ await (typeof zunKV==="function" ? zunKV("cache") : root.kv.cache).set(k, {at:Date.now(), val:v}); }catch(e){}
  return v;
}
async function cInv(prefix){
  try{
    let store = (typeof zunKV==="function" ? zunKV("cache") : root.kv.cache);
    let ks = await store.keys();
    let hit = ks.filter(k=>k===prefix || k.indexOf(prefix+"|")===0);
    if(hit.length) await store.deleteMany(hit);
  }catch(e){}
}
async function subDepo(){
  if(!me) return;
  try{ await rpc("subDepo", JSON.stringify({nick:me.nick, hash:me.hash})); }catch(e){}
}
async function subInv(){
  if(!me) return;
  try{ await rpc("subInv", JSON.stringify({nick:me.nick, hash:me.hash})); }catch(e){}
}
async function subAppr(){
  if(!me) return;
  try{ await rpc("subAppr", JSON.stringify({nick:me.nick, hash:me.hash})); }catch(e){}
}
let privInfo = {locked:0, owner:"", member:1};
function cleanPrivRoom(r){ return String(r||"").trim().toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30); }
function privInviteLink(room){ try{ var b=(window.zunBaseUrl?window.zunBaseUrl():"https://perchance.org/"+(window.generatorName||"zunzum")); return b+"?priv="+cleanPrivRoom(room); }catch(e){ return "?priv="+cleanPrivRoom(room); } }
async function privClaimRoom(room){
  if(!me || !room) return false;
  try{
    let j = JSON.parse(await rpc("privClaim", JSON.stringify({nick:me.nick, hash:me.hash, room})));
    if(j && j.ok){ privInfo.owner = j.owner||me.nick; privInfo.member = 1; paintLocks(); cInv("privGet"); loadPriv(true); return true; }
  }catch(e){}
  return false;
}
function privSayRoom(msg){
  try{
    let el = document.getElementById("privInviteMsg");
    if(el) el.textContent = String(msg||"");
  }catch(e){}
}
async function joinPrivRoom(room, opts){
  room = cleanPrivRoom(room);
  if(room.length<2 || !me) return false;
  opts = opts||{};
  privRoom = room;
  privInfo = {locked:0, owner:"", member:1, claimed:0, orphan:0, strong:privIsStrong(room)?1:0, bits:privBitsOf(room)};
  try{ privInput.value = room; }catch(e){}
  paintLocks(); paintPrivStrength();
  try{ await rpc("subPriv", me ? JSON.stringify({room:room, nick:me.nick, hash:me.hash}) : room); }catch(e){}
  try{
    let j = JSON.parse(await rpc("privJoin", JSON.stringify({nick:me.nick, hash:me.hash, room})));
    if(j && j.ok){
      privInfo = {locked:j.locked?1:0, owner:String(j.owner||""), member:j.member?1:0, claimed:j.claimed?1:0, orphan:j.orphan?1:0, strong:j.strong?1:0, bits:(j.bits!=null?j.bits:privBitsOf(room))};
      if(privInfo.claimed) privSayRoom("🏠 sala antiga sem dono — você virou o dono! Tranque a sala e aprove quem entra. Guarde o código: ele é a chave.");
    } else if(j && j.err==="fraca" && !opts.retried){
      let sug = String((j&&j.ex)||privGenStrong(room));
      privSayRoom("🔐 código fraco ("+(j.bits||0)+" bits) — qualquer um adivinha e rouba os dados. Geramos um forte: "+sug);
      try{ privInput.value = sug; }catch(e){}
      paintPrivStrength();
      if(confirm("Código fraco demais — qualquer um pode adivinhar e clonar a sala.\n\nUsar o código forte gerado?\n"+sug)) return joinPrivRoom(sug, {retried:true});
      privRoom = ""; paintLocks(); return false;
    } else if(j && j.err){
      privSayRoom("não deu p/ entrar ("+(j.err||"erro")+")");
      privRoom = ""; paintLocks(); return false;
    }
  }catch(e){}
  paintLocks(); paintPrivStrength();
  cInv("privGet"); loadPriv(true); loadPendingReqs();
  try{ location.hash = "priv-"+room; }catch(e){}
  return true;
}
function paintPrivStrength(){
  try{
    let box = document.getElementById("privStrength");
    if(!box){
      let inp = document.getElementById("privInput");
      if(!inp || !inp.parentNode) return;
      box = document.createElement("div"); box.id = "privStrength"; box.className = "meta";
      box.style.marginTop = "4px";
      inp.parentNode.parentNode.insertBefore(box, inp.parentNode.nextSibling);
      let row = document.createElement("div");
      row.style.cssText = "display:flex;gap:6px;margin-top:4px;align-items:center;flex-wrap:wrap";
      let gen = document.createElement("button"); gen.id = "privGenBtn"; gen.type = "button"; gen.textContent = "🎲 gerar código forte";
      gen.title = "gera código com sufixo aleatório de 16 letras/números (~82 bits) — anti-clone e anti-roubo";
      gen.onclick = ()=>{ try{ let cur = (privInput.value||"").split("-")[0]||"sala"; let sg = privGenStrong(cur); privInput.value = sg; paintPrivStrength(); privSayRoom("código forte gerado: "+sg+" — guarde e compartilhe só com quem confia."); }catch(e){} };
      let claim = document.createElement("button"); claim.id = "privClaimBtn"; claim.type = "button"; claim.textContent = "🏠 virar dono da órfã"; claim.hidden = true;
      claim.title = "salas antigas sem dono válido: clique para assumir a titularidade";
      claim.onclick = async ()=>{ if(!privRoom) return; claim.disabled = true; let ok = await privClaimRoom(privRoom); if(!ok) privSayRoom("não deu p/ assumir (já tem dono ou sem história)."); claim.disabled = false; paintLocks(); };
      row.appendChild(gen); row.appendChild(claim);
      box.parentNode.insertBefore(row, box.nextSibling);
    }
    let cur = cleanPrivRoom((document.getElementById("privInput")||{}).value||privRoom||"");
    let bits = privBitsOf(cur), strong = privIsStrong(cur);
    let orphan = !!(privRoom && cur===privRoom && privInfo && (privInfo.orphan || (!privInfo.owner && cur)));
    box.textContent = !cur ? "" : strong ? ("🔐 código forte (~"+bits+" bits) — bom contra adivinhação/clone.") : ("⚠️ código fraco (~"+bits+" bits) — adivinhável: qualquer logado pode entrar e ler. Use 🎲 gerar código forte p/ salas novas e tranque a sala.");
    try{ document.getElementById("privClaimBtn").hidden = !(privRoom && (privInfo.orphan || (privInfo.claimed && privRoom))); }catch(e){}
    if(privRoom && privInfo && privInfo.claimed){
      try{
        let b = document.getElementById("privClaimBtn");
        if(b){ b.hidden = true; }
      }catch(e){}
    }
    void orphan;
  }catch(e){}
}
function notifyPrivJoin(nick){
  nick = String(nick||"").slice(0,20);
  if(!nick || !me || !privRoom) return;
  if(nick.toLowerCase()===me.nick.toLowerCase()) return;
  try{
    let d = document.createElement("div");
    d.className = "meta";
    d.dataset.joinNick = nick.toLowerCase();
    d.textContent = "🔔 @"+nick+" entrou no privado pela primeira vez 🎉";
    privLog.appendChild(d);
    privLog.scrollTop = privLog.scrollHeight;
  }catch(e){}
}
function pendingPrivRoom(){
  try{
    let q = new URLSearchParams(location.search).get("priv")||"";
    let h = (location.hash||"").match(/priv-([A-Za-z0-9-]{2,30})/);
    return cleanPrivRoom(q || (h ? h[1] : ""));
  }catch(e){ return ""; }
}
function autoJoinPriv(){
  let r = pendingPrivRoom();
  if(r && me && r!==privRoom) joinPrivRoom(r);
}
let invQueue = [];
function invAck(from, room){
  if(!me) return;
  try{ rpc("invAck", JSON.stringify({nick:me.nick, hash:me.hash, f:from, r:room})).catch(()=>{}); }catch(e){}
}
function queuePrivInvite(from, room){
  room = cleanPrivRoom(room);
  if(!room || !me) return;
  if(String(from).toLowerCase()===me.nick.toLowerCase()) return;
  if(invQueue.some(x=>x.f===from && x.r===room)) return;
  invQueue.push({f:from, r:room});
  if(invQueue.length>5) invQueue.splice(0, invQueue.length-5);
  showNextInvite();
}
function showNextInvite(){
  try{
    let t = document.getElementById("privInviteToast");
    if(t && !t.hidden) return;
    let cur = invQueue[0];
    if(!cur) return;
    paintInviteToast(cur.f, cur.r);
  }catch(e){}
}
function notifyPrivInvite(from, room){ queuePrivInvite(from, room); }
async function loadPendingInvites(){
  if(!me) return;
  try{
    let list = JSON.parse(await rpc("invGet", JSON.stringify({nick:me.nick, hash:me.hash})));
    if(Array.isArray(list)) list.forEach(iv=>{ if(iv && iv.f && iv.r) queuePrivInvite(iv.f, iv.r); });
  }catch(e){}
}
let reqQueue = [];
function queuePrivReq(from, room){
  room = cleanPrivRoom(room);
  if(!room || !me) return;
  if(String(from).toLowerCase()===me.nick.toLowerCase()) return;
  if(reqQueue.some(x=>x.f===from && x.r===room)) return;
  reqQueue.push({f:from, r:room});
  if(reqQueue.length>5) reqQueue.splice(0, reqQueue.length-5);
  showNextReq();
  loadPendingReqs();
}
function showNextReq(){
  try{
    let t = document.getElementById("privReqToast");
    if(t && !t.hidden) return;
    let cur = reqQueue[0];
    if(!cur) return;
    paintReqToast(cur.f, cur.r);
  }catch(e){}
}
function notifyPrivReq(from, room){ queuePrivReq(from, room); }
async function loadPendingReqs(){
  if(!me) return;
  try{
    let list = JSON.parse(await rpc("reqGet", JSON.stringify({nick:me.nick, hash:me.hash})));
    if(Array.isArray(list)){
      list.forEach(rq=>{ if(rq && rq.f && rq.r) queuePrivReq(rq.f, rq.r); });
      renderPrivReqs(list);
    }
  }catch(e){}
}
function paintReqToast(from, room){
  try{
    let t = document.getElementById("privReqToast");
    if(!t){
      t = document.createElement("div"); t.id = "privReqToast";
      t.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:9999;background:#fff4e0;border:1px solid #e0a800;border-radius:8px;padding:8px 10px;font-size:13px;max-width:300px;box-shadow:0 4px 14px #0003";
      document.body.appendChild(t);
    }
    t.innerHTML = "";
    let tx = document.createElement("div");
    tx.appendChild(document.createTextNode("@"+from+" quer entrar na sua sala "));
    let cd = document.createElement("b"); cd.textContent = room; tx.appendChild(cd);
    if(reqQueue.length>1){
      let cx = document.createElement("span"); cx.className = "meta"; cx.textContent = " (1 de "+reqQueue.length+")"; tx.appendChild(cx);
    }
    t.appendChild(tx);
    let row = document.createElement("div"); row.style.cssText = "display:flex;gap:6px;margin-top:6px";
    let ok = document.createElement("button"); ok.textContent = ztr("aceitar");
    let no = document.createElement("button"); no.textContent = ztr("recusar");
    let later = document.createElement("button"); later.textContent = "depois";
    ok.onclick = async ()=>{ reqQueue.shift(); t.hidden = true; await answerPrivReq(from, room, 1); showNextReq(); };
    no.onclick = async ()=>{ reqQueue.shift(); t.hidden = true; await answerPrivReq(from, room, 0); showNextReq(); };
    later.onclick = ()=>{ reqQueue.shift(); t.hidden = true; showNextReq(); };
    row.append(ok, no, later); t.appendChild(row);
    t.hidden = false;
    clearTimeout(t._tm);
    t._tm = setTimeout(()=>{ t.hidden = true; showNextReq(); }, 30000);
  }catch(e){}
}
async function answerPrivReq(f, r, v){
  if(!me) return;
  try{ await rpc("reqOk", JSON.stringify({nick:me.nick, hash:me.hash, f, r, v})); }catch(e){}
  loadPendingReqs();
}
function renderPrivReqs(list){
  try{
    let box = document.getElementById("privReqList");
    if(!box) return;
    box.innerHTML = "";
    if(!me || !privRoom) return;
    if(!privInfo.owner || privInfo.owner.toLowerCase()!==me.nick.toLowerCase()) return;
    let mine = (Array.isArray(list)?list:[]).filter(x=>x && cleanPrivRoom(x.r)===privRoom);
    if(!mine.length) return;
    let t = document.createElement("div"); t.className = "meta"; t.textContent = "pedidos p/ entrar ("+mine.length+"):"; box.appendChild(t);
    mine.forEach(x=>{
      let row = document.createElement("div"); row.style.cssText = "display:flex;gap:6px;align-items:center;font-size:13px;margin-top:4px";
      let s = document.createElement("span"); s.textContent = "@"+x.f+" quer entrar"; row.appendChild(s);
      let ok = document.createElement("button"); ok.textContent = ztr("aceitar");
      let no = document.createElement("button"); no.textContent = ztr("recusar");
      ok.onclick = ()=>answerPrivReq(x.f, x.r, 1);
      no.onclick = ()=>answerPrivReq(x.f, x.r, 0);
      row.append(ok, no); box.appendChild(row);
    });
  }catch(e){}
}
async function notifyPrivApproved(room){
  room = cleanPrivRoom(room);
  if(!me || !room) return;
  if(room===privRoom){
    privInfo.member = 1;
    try{ privAskBtn.textContent = "pedir pra entrar"; privAskBtn.disabled = false; }catch(e){}
    cInv("privGet");
    try{ await loadPriv(true); }catch(e){}
    paintLocks();
    try{
      let d = document.createElement("div");
      d.className = "meta";
      d.textContent = "✅ sua entrada foi aprovada — bem-vindo à sala "+room+" 🎉";
      privLog.appendChild(d);
      privLog.scrollTop = privLog.scrollHeight;
    }catch(e){}
  }
}
function notifyPrivRefused(room){
  room = cleanPrivRoom(room);
  if(!me || !room) return;
  if(room===privRoom){
    try{ privAskBtn.textContent = "pedir pra entrar"; privAskBtn.disabled = false; }catch(e){}
    paintLocks();
    try{
      let d = document.createElement("div");
      d.className = "meta";
      d.textContent = "❌ o dono recusou seu pedido p/ entrar na sala "+room;
      privLog.appendChild(d);
      privLog.scrollTop = privLog.scrollHeight;
    }catch(e){}
  }
}
function notifyPrivLock(){
  if(!me || !privRoom) return;
  rpc("privJoin", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom})).then(j=>{
    try{ j = JSON.parse(j); }catch(e){ return; }
    if(j && j.ok){ privInfo = {locked:j.locked?1:0, owner:String(j.owner||""), member:j.member?1:0}; paintLocks(); cInv("privGet"); loadPriv(true); }
  }).catch(()=>{});
}
function paintInviteToast(from, room){
  try{
    let t = document.getElementById("privInviteToast");
    if(!t){
      t = document.createElement("div"); t.id = "privInviteToast";
      t.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:9999;background:#eaf6ff;border:1px solid #6aa5d7;border-radius:8px;padding:8px 10px;font-size:13px;max-width:300px;box-shadow:0 4px 14px #0003";
      document.body.appendChild(t);
    }
    t.innerHTML = "";
    let tx = document.createElement("div");
    tx.innerHTML = "";
    tx.appendChild(document.createTextNode("@"+from+" te convidou p/ o privado "));
    let cd = document.createElement("b"); cd.textContent = room; tx.appendChild(cd);
    if(invQueue.length>1){
      let cx = document.createElement("span"); cx.className = "meta"; cx.textContent = " (1 de "+invQueue.length+")"; tx.appendChild(cx);
    }
    t.appendChild(tx);
    let row = document.createElement("div"); row.style.cssText = "display:flex;gap:6px;margin-top:6px";
    let ok = document.createElement("button"); ok.textContent = "entrar";
    let cp = document.createElement("button"); cp.textContent = "copiar link";
    let no = document.createElement("button"); no.textContent = "agora não";
    ok.onclick = async ()=>{ invQueue.shift(); invAck(from, room); t.hidden = true; await joinPrivRoom(room); try{ privMsgInput.focus(); }catch(e){} showNextInvite(); };
    cp.onclick = async ()=>{ try{ await navigator.clipboard.writeText(privInviteLink(room)); ok.textContent = "link copiado!"; }catch(e){ try{ prompt("copie o link do convite:", privInviteLink(room)); }catch(e2){} } };
    no.onclick = ()=>{ invQueue.shift(); invAck(from, room); t.hidden = true; showNextInvite(); };
    row.append(ok, cp, no); t.appendChild(row);
    t.hidden = false;
    clearTimeout(t._tm);
    t._tm = setTimeout(()=>{ t.hidden = true; showNextInvite(); }, 30000);
  }catch(e){}
}
async function sendPrivInvite(target){
  let msg = null;
  try{ msg = document.getElementById("privInviteMsg"); }catch(e){}
  let say = (s)=>{ if(msg) msg.textContent = s; };
  if(!me){ say("entre com nick+senha primeiro."); return; }
  if(!privRoom){ say("entre num código primeiro, depois convide."); return; }
  target = String(target||"").replace(/^@/,"").trim().replace(/\s+/g,"-").slice(0,20);
  if(!/^[A-Za-z0-9-_]{2,20}$/.test(target)){ say("digite o @nick da pessoa."); return; }
  if(target.toLowerCase()===me.nick.toLowerCase()){ say("você já está na sala."); return; }
  say("enviando convite p/ @"+target+"...");
  try{
    let r = JSON.parse(await rpc("privInvite", JSON.stringify({nick:me.nick, hash:me.hash, to:target, room:privRoom})));
    if(r.ok){ say("convite enviado p/ @"+target+"! se ela estiver online, entra na hora. ou mande o link: "+privInviteLink(privRoom)); }
    else if(r.err==="noid"){ say("nick @"+target+" não existe. confira e tente de novo."); }
    else say("não deu p/ avisar online ("+(r.err||"erro")+"). mande o link: "+privInviteLink(privRoom));
  }catch(e){ say("sem conexão. mande o link: "+privInviteLink(privRoom)); }
}
function notifyDepo(from){
  try{
    let t = document.getElementById("depoToast");
    if(!t){
      t = document.createElement("div"); t.id = "depoToast";
      t.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:9999;background:#fffbe6;border:1px solid #d9b400;border-radius:8px;padding:8px 10px;font-size:13px;max-width:280px;cursor:pointer;box-shadow:0 4px 14px #0003";
      t.onclick = ()=>{ t.hidden = true; if(me) openProfile(me.nick); };
      document.body.appendChild(t);
    }
    t.textContent = "novo depoimento de @"+from+" — clique para aprovar";
    t.hidden = false;
    clearTimeout(t._tm);
    t._tm = setTimeout(()=>{ t.hidden = true; }, 12000);
    if(me && profSel===me.nick && !profModal.hidden) loadDepo(me.nick);
  }catch(e){}
}
function depoSeenKey(){ try{ return "zunzumSeenDepo_"+(me?me.nick.toLowerCase():""); }catch(e){ return "zunzumSeenDepo_"; } }
function depoSeenGet(){ try{ let v = JSON.parse(localStorage.getItem(depoSeenKey())||"null"); return new Set(Array.isArray(v)?v:[]); }catch(e){ return new Set(); } }
function depoSeenSet(s){ try{ localStorage.setItem(depoSeenKey(), JSON.stringify([...s].slice(-50))); }catch(e){} }
async function checkPendingDepo(){
  if(!me) return;
  try{
    let r = JSON.parse(await rpc("depoGet", JSON.stringify({to:me.nick, nick:me.nick, hash:me.hash})));
    if(!r||!r.ok) return;
    let first = false;
    try{ first = localStorage.getItem(depoSeenKey())==null; }catch(e){}
    let seen = depoSeenGet();
    (Array.isArray(r.pend)?r.pend:[]).forEach(function(p){
      if(!p||!p.id||seen.has(p.id)) return;
      seen.add(p.id);
      if(!first && p.f) notifyDepo(p.f);
    });
    depoSeenSet(seen);
  }catch(e){}
}
function myKey(){ return me ? "@"+me.nick : anonId; }
function zunAcc(){ try{ return me ? String(me.nick).toLowerCase() : ""; }catch(e){ return ""; } }
function zunNorm(n){ return String(n||"").replace(/^@/,"").toLowerCase(); }
function zunGetList(k){ try{ let a = JSON.parse(localStorage.getItem(k+":"+zunAcc())||"[]"); return Array.isArray(a)?a.filter(s=>typeof s==="string").slice(0,200):[]; }catch(e){ return []; } }
function zunSetList(k, arr){ try{ localStorage.setItem(k+":"+zunAcc(), JSON.stringify(arr.slice(0,200))); }catch(e){} }
function zunMuted(nick){ if(!zunAcc()) return false; try{ if(localStorage.getItem("zunzumMuteAll:"+zunAcc())==="1") return true; }catch(e){} return zunGetList("zunzumMuteList").indexOf(zunNorm(nick))>=0; }
function zunBlocked(nick){ if(!zunAcc()) return false; return zunGetList("zunzumBlockList").indexOf(zunNorm(nick))>=0; }
function toggleZunList(k, nick){ let a = zunGetList(k), n = zunNorm(nick), ix = a.indexOf(n); if(ix>=0) a.splice(ix,1); else a.push(n); zunSetList(k, a); }
window.ZunBlock = {muted:(n)=>zunMuted(n), blocked:(n)=>zunBlocked(n), quiet:(n)=>zunMuted(n)||zunBlocked(n), hasAcc:()=>!!zunAcc()};
// ======== ZUN NICK STYLE (cor + fonte + 30 efeitos) ========
const ZNICK_FONTS = ["", "Verdana", "Arial", "Georgia", "Trebuchet MS", "Courier New", "Comic Sans MS", "Impact", "Palatino", "Tahoma", "Times New Roman", "monospace", "cursive", "fantasy", "system-ui"];
const ZNICK_FONT_LABELS = {"":"padrão", "Verdana":"Verdana", "Arial":"Arial", "Georgia":"Georgia", "Trebuchet MS":"Trebuchet", "Courier New":"Máquina", "Comic Sans MS":"Quadrinhos", "Impact":"Impact", "Palatino":"Palatino", "Tahoma":"Tahoma", "Times New Roman":"Times", "monospace":"Mono", "cursive":"Cursiva", "fantasy":"Fantasia", "system-ui":"Sistema"};
const ZNICK_COLORS = ["#33507a","#e355b6","#ff0000","#ff6a00","#ffb300","#2ecc40","#00b894","#00c2ff","#6aa5d7","#7a4fc9","#8e44ad","#111111"];
const ZNICK_FX = [
  {id:0, name:"0 · sem efeito"},
  {id:1, name:"1 · neon azul"},
  {id:2, name:"2 · neon rosa"},
  {id:3, name:"3 · neon verde"},
  {id:4, name:"4 · sombra suave"},
  {id:5, name:"5 · sombra dura retrô"},
  {id:6, name:"6 · contorno escuro"},
  {id:7, name:"7 · contorno claro"},
  {id:8, name:"8 · pôr-do-sol"},
  {id:9, name:"9 · oceano"},
  {id:10, name:"10 · roxo-rosa"},
  {id:11, name:"11 · fogo"},
  {id:12, name:"12 · gelo"},
  {id:13, name:"13 · arco-íris animado"},
  {id:14, name:"14 · arco-íris fixo"},
  {id:15, name:"15 · ouro"},
  {id:16, name:"16 · prata"},
  {id:17, name:"17 · matrix"},
  {id:18, name:"18 · gótico"},
  {id:19, name:"19 · kawaii"},
  {id:20, name:"20 · pixel retrô"},
  {id:21, name:"21 · máquina de escrever"},
  {id:22, name:"22 · chique itálico"},
  {id:23, name:"23 · gigante"},
  {id:24, name:"24 · espaçado"},
  {id:25, name:"25 · sublinhado duplo"},
  {id:26, name:"26 · brilho pulsante"},
  {id:27, name:"27 · 3D"},
  {id:28, name:"28 · glitch"},
  {id:29, name:"29 · fantasma"}
];
let znickCache = {};
let znickBulkPend = null;
function znickEnsureCss(){
  if(document.getElementById("znickCss")) return;
  let st = document.createElement("style");
  st.id = "znickCss";
  st.textContent = "@keyframes zRainbow{to{filter:hue-rotate(360deg)}}@keyframes zPulse{0%,100%{opacity:1}50%{opacity:.55}}@keyframes zNeonP{0%,100%{filter:brightness(1)}50%{filter:brightness(1.6)}}@keyframes zGlitch{0%,91%,94%,100%{transform:none}92%{transform:translate(-1px,1px)}93%{transform:translate(1px,-1px)}}.znick-grad{display:inline-block!important;background-clip:text!important;-webkit-background-clip:text!important;color:transparent!important;-webkit-text-fill-color:transparent!important}.znick-anim-rainbow{animation:zRainbow 3s linear infinite}.znick-anim-pulse{animation:zPulse 1.6s ease-in-out infinite}.znick-anim-neon{animation:zNeonP 1.8s ease-in-out infinite}.znick-anim-glitch{animation:zGlitch 2.2s linear infinite}";
  try{ document.head.appendChild(st); }catch(e){}
}
function zNickNormNs(ns){
  if(!ns || typeof ns!=="object") return null;
  let c = String(ns.c||"");
  if(!/^#[0-9a-fA-F]{6}$/.test(c)) c = "";
  let f = String(ns.f||"");
  if(f && ZNICK_FONTS.indexOf(f)<0) f = "";
  let fx = parseInt(ns.fx,10);
  if(!(fx>=0 && fx<=29)) fx = 0;
  if(!c && !f && !fx) return null;
  return {c:c.toLowerCase(), f:f, fx:fx};
}
function zNickReset(el){
  try{
    el.classList.remove("znick-grad","znick-anim-rainbow","znick-anim-pulse","znick-anim-neon","znick-anim-glitch");
    let s = el.style;
    try{ s.removeProperty("color"); }catch(e){ s.color = ""; }
    try{ s.removeProperty("-webkit-text-fill-color"); }catch(e){}
    s.fontFamily = ""; s.fontStyle = ""; s.fontWeight = ""; s.fontSize = "";
    s.textShadow = ""; s.background = ""; s.backgroundImage = "";
    s.webkitTextStroke = ""; s.letterSpacing = ""; s.textTransform = "";
    s.textDecoration = ""; s.animation = ""; s.filter = ""; s.opacity = "";
    s.display = ""; s.padding = ""; s.borderRadius = "";
    try{ s.webkitTextFillColor = ""; s.webkitBackgroundClip = ""; s.backgroundClip = ""; }catch(e2){}
  }catch(e){}
}
/* Cor do nick precisa vencer o CSS do tema do site/sala, que usa
   `#wrap .chatname{color:...!important}`. Inline sem !important perde
   sempre (era o bug: cor e gradientes sumiam no feed/pub/priv). */
function zNickSetColor(el, color){
  try{
    if(!el || !color) return;
    try{ el.style.setProperty("color", color, "important"); }
    catch(e){ el.style.color = color; }
  }catch(e){}
}
function zNickApplyFx(el, fx){
  let s = el.style;
  function grad(g){
    el.classList.add("znick-grad");
    s.backgroundImage = g;
    try{ s.webkitBackgroundClip = "text"; s.backgroundClip = "text"; }catch(e){}
    zNickSetColor(el, "transparent");
    try{ el.style.setProperty("-webkit-text-fill-color", "transparent", "important"); }catch(e){ try{ s.webkitTextFillColor = "transparent"; }catch(e2){} }
    s.fontWeight = "bold";
  }
  try{
    if(fx===1){ s.textShadow = "0 0 6px #00c2ff,0 0 14px #00c2ff"; s.fontWeight = "bold"; }
    else if(fx===2){ s.textShadow = "0 0 6px #ff5fa2,0 0 14px #ff5fa2"; s.fontWeight = "bold"; }
    else if(fx===3){ s.textShadow = "0 0 6px #2ecc40,0 0 14px #2ecc40"; s.fontWeight = "bold"; }
    else if(fx===4){ s.textShadow = "1px 1px 3px rgba(0,0,0,.45)"; }
    else if(fx===5){ s.textShadow = "2px 2px 0 #111"; s.fontWeight = "bold"; }
    else if(fx===6){ s.webkitTextStroke = "1px #111"; s.textShadow = "1px 1px 0 #111"; s.fontWeight = "bold"; }
    else if(fx===7){ s.webkitTextStroke = "1px #fff"; s.textShadow = "0 0 6px #fff,1px 1px 2px #000"; s.fontWeight = "bold"; }
    else if(fx===8){ grad("linear-gradient(90deg,#ff5fa2,#ff8c42)"); }
    else if(fx===9){ grad("linear-gradient(90deg,#00c2ff,#2ecc40)"); }
    else if(fx===10){ grad("linear-gradient(90deg,#7a4fc9,#e355b6)"); }
    else if(fx===11){ grad("linear-gradient(90deg,#ff0000,#ff6a00,#ffb300)"); }
    else if(fx===12){ grad("linear-gradient(90deg,#aee9ff,#00c2ff,#33507a)"); }
    else if(fx===13){ grad("linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)"); el.classList.add("znick-anim-rainbow"); }
    else if(fx===14){ grad("linear-gradient(90deg,#f00,#ff6a00,#ffd400,#2ecc40,#00c2ff,#7a4fc9,#e355b6)"); }
    else if(fx===15){ grad("linear-gradient(180deg,#fff6c9,#ffd400 40%,#8a5a00 55%,#ffe97a 70%,#fff6c9)"); s.textShadow = "0 1px 0 #7a5c00"; }
    else if(fx===16){ grad("linear-gradient(180deg,#fff,#9fb3c8 45%,#334155 55%,#dbe7f5 70%,#fff)"); }
    else if(fx===17){ zNickSetColor(el, "#00ff66"); s.fontFamily = "'Courier New',monospace"; s.textShadow = "0 0 8px #00ff66"; s.fontWeight = "bold"; }
    else if(fx===18){ zNickSetColor(el, "#111111"); s.textShadow = "0 0 8px #c00,1px 1px 0 #c00"; s.fontFamily = "Georgia,serif"; s.fontWeight = "bold"; s.letterSpacing = "1px"; }
    else if(fx===19){ zNickSetColor(el, "#ff5fa2"); s.textShadow = "0 0 8px #ffb3d9,1px 1px 0 #fff"; s.fontWeight = "bold"; s.letterSpacing = "1px"; }
    else if(fx===20){ s.textTransform = "uppercase"; s.letterSpacing = "2px"; s.fontFamily = "'Courier New',monospace"; s.fontWeight = "bold"; s.textShadow = "2px 2px 0 rgba(0,0,0,.35)"; }
    else if(fx===21){ s.fontFamily = "'Courier New',monospace"; s.textDecoration = "underline"; }
    else if(fx===22){ s.fontStyle = "italic"; s.fontFamily = "Georgia,serif"; s.letterSpacing = "1px"; s.fontWeight = "bold"; }
    else if(fx===23){ s.fontWeight = "bold"; s.fontSize = "1.25em"; }
    else if(fx===24){ s.letterSpacing = "3px"; s.fontWeight = "bold"; }
    else if(fx===25){ s.textDecoration = "underline double"; s.fontWeight = "bold"; }
    else if(fx===26){ el.classList.add("znick-anim-pulse"); s.fontWeight = "bold"; s.textShadow = "0 0 10px currentColor"; }
    else if(fx===27){ s.fontWeight = "bold"; s.textShadow = "1px 1px 0 #999,2px 2px 0 #666,3px 3px 4px rgba(0,0,0,.4)"; }
    else if(fx===28){ el.classList.add("znick-anim-glitch"); s.fontWeight = "bold"; s.textShadow = "-1px 0 #0ff,1px 0 #f0f"; }
    else if(fx===29){ s.opacity = ".75"; s.filter = "blur(.4px)"; s.fontStyle = "italic"; }
  }catch(e){}
}
function paintZNick(el, nick, nsOverride){
  try{
    znickEnsureCss();
    if(!el) return;
    let clean = String(nick||"").replace(/^@/,"");
    if(!clean || /^anon-[a-z0-9]{6,12}$/.test(clean)){ zNickReset(el); return; }
    let lower = clean.toLowerCase();
    el.dataset.znick = lower;
    let ns = (nsOverride!==undefined) ? zNickNormNs(nsOverride) : (znickCache[lower]!==undefined ? zNickNormNs(znickCache[lower]) : null);
    if(nsOverride!==undefined && nsOverride!==null){
      let raw = (nsOverride && typeof nsOverride==="object") ? nsOverride : null;
      if(raw) znickCache[lower] = {c:raw.c||"", f:raw.f||"", fx:raw.fx||0};
    }
    zNickReset(el);
    if(!ns) return;
    if(ns.c) zNickSetColor(el, ns.c);
    if(ns.f) el.style.fontFamily = "'"+ns.f+"',sans-serif";
    if(ns.fx) zNickApplyFx(el, ns.fx);
  }catch(e){}
}
function zNickRepaintAll(){
  try{
    document.querySelectorAll("[data-znick]").forEach(el=>{
      try{ paintZNick(el, el.dataset.znick); }catch(e){}
    });
  }catch(e){}
}
async function ensureZNickStyles(nicks){
  try{
    let uniq = [];
    let seen = {};
    (nicks||[]).forEach(n=>{
      let c = String(n||"").replace(/^@/,"").toLowerCase();
      if(!c || /^anon-[a-z0-9]{6,12}$/.test(c) || seen[c]) return;
      seen[c] = 1;
      if(znickCache[c]===undefined) uniq.push(c);
    });
    if(!uniq.length) return;
    if(znickBulkPend){ try{ await znickBulkPend; }catch(e){} }
    let batch = uniq.slice(0,30);
    batch.forEach(c=>{ znickCache[c] = null; });
    let fetchedOk = false;
    try{
      znickBulkPend = rpc("nickBulk", JSON.stringify(batch));
      let t = await znickBulkPend;
      let r = JSON.parse(t);
      if(r && r.ok && r.styles){
        Object.keys(r.styles).forEach(k=>{ znickCache[k] = r.styles[k]||null; });
        fetchedOk = true;
      }
    }catch(e){}
    /* falha de rede/servidor: desfaz o null provisório p/ tentar de novo
       na próxima pintura (antes ficava "sem estilo" grudado p/ sempre). */
    if(!fetchedOk) batch.forEach(c=>{ try{ if(znickCache[c]===null) delete znickCache[c]; }catch(e){} });
    znickBulkPend = null;
    zNickRepaintAll();
    let rest = uniq.slice(30);
    if(rest.length) setTimeout(()=>ensureZNickStyles(rest), 300);
  }catch(e){ znickBulkPend = null; }
}
function zNickNoteProfile(r){
  try{
    if(r && r.ok && r.nick) znickCache[String(r.nick).toLowerCase()] = r.ns||null;
  }catch(e){}
}
function likePayload(id, r){ let b = me ? {id:id, nick:me.nick, hash:me.hash} : {id:id, anon:anonId, anonTok:anonTokGet(anonId)}; if(r) b.r = r; return b; }
function anonEditPayload(base, itemId){
  if(me) return base;
  let b = Object.assign({}, base);
  b.anonTok = anonTokGet(b.anon||anonId);
  let it = anonItemGet(itemId||b.id||b.rid||"");
  if(it) b.itemTok = it;
  return b;
}
let avCache = {};
let avCacheAt = {};
let avPending = {};
/* URLs de avatar persistentes (localStorage, chave zunAvUrlsV1): atravessam
   reload. Na volta, o avatar pinta na hora do disco e revalida em fundo
   (stale-while-revalidate) — sem letra pulsando nem download repetido. */
let zunAvLsMap = null, zunAvLsFlushAt = 0;
function zunAvLsLoad(){
  if(zunAvLsMap) return zunAvLsMap;
  try{ zunAvLsMap = JSON.parse(localStorage.getItem("zunAvUrlsV1")||"{}")||{}; }
  catch(e){ zunAvLsMap = {}; }
  return zunAvLsMap;
}
function zunAvLsFlush(){
  try{
    let m = zunAvLsLoad(), ks = Object.keys(m);
    if(ks.length>300){
      let arr = ks.map(k=>({k:k, at:((m[k]&&m[k].at)||0)}));
      arr.sort((a,b)=>a.at-b.at);
      for(let i=0;i<arr.length-300;i++){ try{ delete m[arr[i].k]; }catch(e){} }
    }
    localStorage.setItem("zunAvUrlsV1", JSON.stringify(m));
  }catch(e){}
  zunAvLsFlushAt = 0;
}
function zunAvRemember(nick, url, fx){
  try{
    if(!nick || !url) return;
    let m = zunAvLsLoad();
    let prev = m[nick]||{};
    let e = {u:String(url).slice(0,500), at:Date.now()};
    /* fx: mantém o guardado quando não veio novo (chamadas antigas) */
    try{ e.fx = (fx===undefined) ? (prev.fx||"") : (zunAvFxClean(fx)||""); }catch(e2){ e.fx = prev.fx||""; }
    m[nick] = e;
    if(!zunAvLsFlushAt){ zunAvLsFlushAt = 1; setTimeout(zunAvLsFlush, 2000); }
  }catch(e){}
  try{ if(fx!==undefined) zunAvFxPut(nick, fx); }catch(e){}
}
function zunAvForget(nick){
  try{
    let m = zunAvLsLoad();
    if(m[nick]){ delete m[nick]; if(!zunAvLsFlushAt){ zunAvLsFlushAt = 1; setTimeout(zunAvLsFlush, 2000); } }
  }catch(e){}
}
function zunAvRecall(nick){
  try{
    let e = zunAvLsLoad()[nick];
    if(e && e.u && (Date.now()-e.at < 86400000)) return {u:e.u, at:e.at};
  }catch(e){}
  return null;
}
/* perfis abertos (openProfile): memória + disco p/ reabrir instantâneo.
   Disco vale até 60min como "stale" (pinta na hora e atualiza em fundo). */
let zunProfMem = {}, zunProfLsFlushAt = 0;
function zunProfLsLoad(){
  try{ return JSON.parse(localStorage.getItem("zunProfV1")||"{}")||{}; }
  catch(e){ return {}; }
}
function zunProfRemember(nick, r){
  try{
    if(!nick || !r || !r.ok) return;
    let k = String(nick).toLowerCase();
    zunProfMem[k] = {r:r, at:Date.now()};
    let m = zunProfLsLoad();
    m[k] = {r:r, at:Date.now()};
    let ks = Object.keys(m);
    if(ks.length>80){
      let arr = ks.map(x=>({k:x, at:((m[x]&&m[x].at)||0)}));
      arr.sort((a,b)=>a.at-b.at);
      for(let i=0;i<arr.length-80;i++){ try{ delete m[arr[i].k]; }catch(e){} }
    }
    if(!zunProfLsFlushAt){
      zunProfLsFlushAt = 1;
      setTimeout(()=>{ try{ localStorage.setItem("zunProfV1", JSON.stringify(m)); }catch(e){} zunProfLsFlushAt = 0; }, 2000);
    }
  }catch(e){}
}
function zunProfRecall(nick){
  try{
    let k = String(nick||"").toLowerCase();
    if(!k) return null;
    let c = zunProfMem[k];
    if(c && c.r && (Date.now()-c.at < 300000)) return {r:c.r, stale:false};
    let m = zunProfLsLoad(), e = m[k];
    if(e && e.r && e.r.ok && (Date.now()-e.at < 3600000)){
      zunProfMem[k] = {r:e.r, at:e.at};
      return {r:e.r, stale:(Date.now()-e.at >= 300000)};
    }
  }catch(e){}
  return null;
}
/* efeito do avatar (FASE 14): cache par do avCache (mem + disco) + overlay.
   O anel é um <div> filho sem texto: a cura pula (sem texto p/ curar), o CSS
   custom/tema não tem esse seletor, e o inset:0 respeita o overflow:hidden. */
var ZUN_AVFX_OK = ["", "neon", "neonrosa", "ouro", "arcoiris", "fogo", "gelo", "sombra"];
function zunAvFxClean(x){ try{ x = String(x||"").toLowerCase().slice(0,12); return ZUN_AVFX_OK.indexOf(x)>=0 ? x : ""; }catch(e){ return ""; } }
let zunAvFxCache = {};
function zunAvFxPut(nick, fx){
  try{
    if(!nick) return;
    zunAvFxCache[nick] = {fx:zunAvFxClean(fx), at:Date.now()};
  }catch(e){}
}
function zunAvFxGet(nick){
  /* síncrono: devolve o guardado (ou "") e revalida em fundo se velho */
  try{
    if(!nick) return "";
    let c = zunAvFxCache[nick];
    if(c && (Date.now()-c.at < 300000)) return c.fx||"";
    let e = null;
    try{ e = zunAvLsLoad()[nick]; }catch(e2){}
    if(e && e.fx && (Date.now()-e.at < 86400000)){
      zunAvFxCache[nick] = {fx:e.fx, at:e.at};
      if(Date.now()-e.at >= 300000 && !avPending[nick]){ try{ getAvatar(nick, true).catch(()=>{}); }catch(e3){} }
      return e.fx||"";
    }
    if(!avPending[nick]){ try{ getAvatar(nick, true).catch(()=>{}); }catch(e4){} }
  }catch(e){}
  return "";
}
function zunAvFxApply(box, fx){
  try{
    if(!box) return;
    let old = null;
    try{ old = box.querySelector(":scope > .avfx"); }catch(e){ old = null; }
    if(!old){ try{ let _c = box.querySelector(".avfx"); if(_c && _c.parentNode===box) old = _c; }catch(e){} }
    if(old) old.remove();
    try{ fx = zunAvFxClean(fx); }catch(e){ fx = ""; }
    if(!fx) return;
    let cs = null;
    try{ cs = getComputedStyle(box); }catch(e){}
    /* FIX vazamento (2026-10-28): em nó ainda fora do DOM o getComputedStyle
       não volta "static" (volta ""/null) e o relative era pulado — o .avfx
       absolute inset:0 escapava p/ o ancestral posicionado e virava um oval
       gigante no feed/chat. CSS já trava (.miniAv etc.), mas garante aqui
       também p/ qualquer caixa futura. */
    try{
      let _p = "";
      try{ _p = cs ? String(cs.position||"") : ""; }catch(e){}
      if(_p!=="relative" && _p!=="absolute" && _p!=="fixed" && _p!=="sticky") box.style.position = "relative";
    }catch(e){ try{ box.style.position = "relative"; }catch(e2){} }
    let d = document.createElement("div");
    d.className = "avfx avfx-"+fx;
    try{ d.setAttribute("aria-hidden", "true"); }catch(e){}
    box.appendChild(d);
  }catch(e){}
}
function zunAvFxApplyNick(box, nick){
  try{
    if(!box || !nick) return;
    let fx = "";
    try{ fx = zunAvFxGet(nick); }catch(e){}
    zunAvFxApply(box, fx);
    if(!fx){
      /* veio vazio e sem cache: quando a consulta voltar, aplica se ainda é o mesmo */
      try{
        getAvatar(nick, true).then(function(){
          try{
            if(!box.isConnected) return;
            let cur = null;
            try{ cur = box.dataset ? box.dataset.nick : null; }catch(e){}
            if(cur && cur!==nick) return;
            zunAvFxApply(box, zunAvFxGet(nick));
          }catch(e){}
        }).catch(function(){});
      }catch(e){}
    }
  }catch(e){}
}
/* troca de efeito ao vivo: atualiza todas as caixas visíveis do nick */
function zunAvFxSwap(nick, fx){
  try{
    if(!nick) return;
    try{ zunAvFxPut(nick, fx); }catch(e){}
    let sel = null;
    try{ sel = '.miniAv[data-nick="'+CSS.escape(nick)+'"]'; }catch(e){ return; }
    document.querySelectorAll(sel).forEach(function(b){ try{ zunAvFxApply(b, fx); }catch(e){} });
  }catch(e){}
}
/* semente do disco: avatares voltam do reload sem nenhuma consulta */
try{
  let _sm = zunAvLsLoad(), _now = Date.now(), _sk = Object.keys(_sm);
  for(let _i=0;_i<_sk.length;_i++){
    let _e = _sm[_sk[_i]];
    if(_e && _e.u && (_now-_e.at < 86400000) && avCache[_sk[_i]]===undefined){ avCache[_sk[_i]] = _e.u; avCacheAt[_sk[_i]] = _e.at; }
    if(_e && _e.fx && (_now-_e.at < 86400000) && !zunAvFxCache[_sk[_i]]){ zunAvFxCache[_sk[_i]] = {fx:_e.fx, at:_e.at}; }
  }
}catch(e){}
/* foto de avatar em 2 níveis (só avatar — foto postada carrega direto sempre):
   1) URL por nick (avCache, 5min válida / 1min vazia) + troca ao vivo quando muda;
   2) bitmap decodificado (zunAvImgCache): repintura instantânea, sem flicker e
   sem baixar de novo. Revalidação periódica e escalonada (zunAvRevalidate). */
let zunAvImgCache = {};
function zunAvImgPut(url, im){
  try{
    zunAvImgCache[url] = im;
    let ks = Object.keys(zunAvImgCache);
    if(ks.length>200){ let nk = {}; for(let i=ks.length-100;i<ks.length;i++) nk[ks[i]] = zunAvImgCache[ks[i]]; zunAvImgCache = nk; }
  }catch(e){}
}
function zunAvWarm(url){
  try{
    if(!url || zunAvImgCache[url]) return;
    let im = new Image();
    try{ im.referrerPolicy = "no-referrer"; }catch(e){}
    try{ im.decoding = "async"; }catch(e){}
    im.onload = ()=>{ try{ zunAvImgPut(url, im); }catch(e){} };
    im.onerror = ()=>{};
    im.src = url;
  }catch(e){}
}
/* pinta foto de avatar em qualquer caixa (miniAv, avatarEl, pubPhotoEl,
   profAvatar): letra + pulso enquanto carrega, troca no onload (sem buraco
   vazio), mantém o que tinha no erro. Hit no cache = instantâneo. */
function zunAvatarInto(box, url, letter){
  try{
    if(!box) return false;
    letter = (letter==null ? "?" : String(letter));
    /* FASE 14: textContent="" abaixo varreria o overlay do efeito — guarda e restaura */
    let _fx0 = "";
    try{ let _o = null; try{ _o = box.querySelector(":scope > .avfx"); }catch(e){ _o = null; } if(_o){ let _m = /(?:^|\s)avfx-([a-z]+)/.exec(_o.className||""); _fx0 = zunAvFxClean(_m ? _m[1] : ""); } }catch(e){ _fx0 = ""; }
    function _refx(){ try{ if(_fx0 && !box.querySelector(":scope > .avfx")) zunAvFxApply(box, _fx0); }catch(e){} }
    /* página de pin do Pinterest nunca carrega como <img>: usa a imagem direta
       já resolvida; sem cache, mostra a letra + pulso e repinta ao resolver */
    try{
      if(url && typeof window.zunIsPinPage==="function" && window.zunIsPinPage(url)){
        let _d = "";
        try{ _d = (typeof window.zunPinDirectCached==="function") ? (window.zunPinDirectCached(url)||"") : ""; }catch(_e){ _d = ""; }
        if(_d){ url = _d; }
        else{
          box.classList.add("av-loading");
          try{ if(!box.querySelector("img") && box.textContent!==letter) box.textContent = letter; }catch(_e2){}
          try{ _refx(); }catch(_e2b){}
          try{
            if(typeof window.zunResolvePin==="function"){
              window.zunResolvePin(url).then(function(dd){
                if(dd && box.isConnected){ try{ zunAvatarInto(box, dd, letter); }catch(_e3){} }
                else{ try{ box.classList.remove("av-loading"); }catch(_e4){} }
              }).catch(function(){ try{ box.classList.remove("av-loading"); }catch(_e5){} });
            } else{ box.classList.remove("av-loading"); }
          }catch(_e6){ try{ box.classList.remove("av-loading"); }catch(_e7){} }
          return false;
        }
      }
    }catch(_pe){}
    let cur = null;
    try{ cur = box.querySelector("img"); }catch(e){}
    if(!url){
      box.classList.remove("av-loading");
      if(cur) cur.remove();
      if(box.textContent !== letter) box.textContent = letter;
      try{ _refx(); }catch(e){}
      return false;
    }
    try{ if(cur && cur.src === url){ box.classList.remove("av-loading"); return true; } }catch(e){}
    let hit = zunAvImgCache[url];
    if(hit && hit.complete && hit.naturalWidth>0){
      box.classList.remove("av-loading");
      box.textContent = "";
      if(cur) cur.remove();
      try{ box.appendChild(hit.cloneNode(false)); }catch(e){}
      try{ _refx(); }catch(e){}
      return true;
    }
    box.classList.add("av-loading");
    let im = new Image();
    try{ im.referrerPolicy = "no-referrer"; }catch(e){}
    try{ im.decoding = "async"; }catch(e){}
    im.alt = "";
    im.onload = ()=>{ try{ zunAvImgPut(url, im); }catch(e){} if(!box.isConnected) return; try{ box.textContent = ""; let o2 = box.querySelector("img"); if(o2) o2.remove(); box.appendChild(im); }catch(e){} try{ _refx(); }catch(e){} box.classList.remove("av-loading"); };
    im.onerror = ()=>{ box.classList.remove("av-loading"); };
    im.src = url;
    return false;
  }catch(e){ return false; }
}
/* avatar trocou no servidor: atualiza todos os miniAv visíveis na hora */
function zunAvSwap(nick, url){
  try{
    if(!nick || !url) return;
    /* pin do Pinterest: troca pela imagem direta já resolvida; sem cache,
       resolve 1x e só então repinta (página de pin nunca carrega como <img>) */
    try{
      if(typeof window.zunIsPinPage==="function" && window.zunIsPinPage(url)){
        let _d = "";
        try{ _d = (typeof window.zunPinDirectCached==="function") ? (window.zunPinDirectCached(url)||"") : ""; }catch(_e){ _d = ""; }
        if(_d){ url = _d; }
        else{
          try{
            if(typeof window.zunResolvePin==="function"){
              window.zunResolvePin(url).then(function(dd){ if(dd){ try{ avCache[nick] = dd; avCacheAt[nick] = Date.now(); }catch(_e3){} try{ zunAvRemember(nick, dd); }catch(_e4){} zunAvSwap(nick, dd); } }).catch(function(){});
            }
          }catch(_e2){}
          return;
        }
      }
    }catch(_pe){}
    let sel = null;
    try{ sel = '.miniAv[data-nick="'+CSS.escape(nick)+'"]'; }catch(e){ return; }
    document.querySelectorAll(sel).forEach(b=>{ try{ zunAvatarInto(b, url, String(nick).slice(0,1).toUpperCase()); }catch(e){} });
  }catch(e){}
}
/* revalidação periódica e escalonada: no máx 6 nicks visíveis por vez, com o
   cache mais velho primeiro (não é no render — é de tempo em tempo mesmo) */
let _zunAvRevAt = 0;
function zunAvRevalidate(){
  try{
    if(document.hidden) return;
    let now = Date.now();
    if(now - _zunAvRevAt < 120000) return;
    _zunAvRevAt = now;
    try{ zunAvSweepAlive(); }catch(e){}
    let seen = {}, list = [];
    document.querySelectorAll(".miniAv[data-nick]").forEach(b=>{ try{ let n = b.dataset.nick; if(n && !seen[n]){ seen[n] = 1; list.push(n); } }catch(e){} });
    list.sort((a,b)=>((avCacheAt[a]||0)-(avCacheAt[b]||0)));
    list.slice(0,6).forEach(n=>{ try{ getAvatar(n, true); }catch(e){} });
  }catch(e){}
}
/* meu próprio avatar: re-checa de tempo em tempo (troca em outra aba/aparelho) */
function zunAvMeRevalidate(){
  try{
    if(!me || !me.avatar || document.hidden) return;
    let now = Date.now();
    if(now - (window._zunAvMeAt||0) < 180000) return;
    window._zunAvMeAt = now;
    crpc("profileGet", me.nick).then(r=>{
      try{ r = JSON.parse(r); }catch(e){ r = null; }
      if(r && r.ok && ((r.avatar && r.avatar!==me.avatar) || (r.fx!==undefined && zunAvFxClean(r.fx)!==(me.fx||"")))){
        if(r.avatar && r.avatar!==me.avatar) me.avatar = r.avatar;
        try{ if(r.fx!==undefined) me.fx = zunAvFxClean(r.fx); }catch(e){}
        try{ setSession(me); }catch(e){}
        try{ avCache[me.nick] = me.avatar; avCacheAt[me.nick] = Date.now(); try{ zunAvFxPut(me.nick, me.fx); zunAvRemember(me.nick, me.avatar, me.fx); }catch(_e){} }catch(e){}
        if(me.avatar) zunAvSwap(me.nick, me.avatar);
        try{ zunAvFxSwap(me.nick, me.fx); }catch(e){}
        zunAvatarInto(avatarEl, me.avatar, (me.nick||"?").slice(0,1).toUpperCase());
        try{ zunAvFxApply(avatarEl, me.fx||""); }catch(e){}
      }
    }).catch(()=>{});
  }catch(e){}
}
let onlineNicks = new Set();
/* FIX reload/case (2026-11-02): heartbeats grava nick minúsculo, mas feed/chat
   pintam com a caixa original (@Fulano). Sem normalizar, has("Fulano") nunca
   achava "fulano" e a bolinha verde sumia — e como feed/pub/priv pintam antes
   da presença chegar no reload, sem repintura o dot nunca aparecia. */
function onlineHas(nick){
  try{ return onlineNicks.has(String(nick||"").toLowerCase()); }catch(e){ return false; }
}
function onDot(nick){
  if(!onlineHas(nick)) return null;
  let s = document.createElement("span"); s.className = "onDot"; s.title = "online";
  return s;
}
/* repinta dots/aneis in-place quando a presença chega atrasada (reload):
   não reconstrói feed/chat (preserva scroll + rascunhos), só cria/mostra/
   esconde os .onDot e o anel .miniAv.on. Respeita o status manual do zundm
   (offline/ausente) quando ele já rodou — o zRepaintDots dele ajusta por cima. */
function repaintOnlineDots(){
  try{
    document.querySelectorAll(".miniAv[data-nick]").forEach(function(b){
      try{ b.classList.toggle("on", onlineHas(b.dataset.nick||"")); }catch(e){}
    });
    document.querySelectorAll(".chatname").forEach(function(nm){
      try{
        let inWho = false;
        try{ inWho = !!(nm.parentElement && nm.parentElement.classList && nm.parentElement.classList.contains("who")); }catch(e){}
        if(inWho) return; // feed (dot irmão em .who) tratado abaixo p/ não duplicar
        let t = (nm.textContent||"").replace(/^@/,"").trim();
        if(!/^[A-Za-z0-9-_]{2,20}$/.test(t)) return;
        let old = null;
        try{ old = nm.querySelector(":scope > .onDot"); }catch(e){ try{ old = nm.querySelector(".onDot"); }catch(e2){} }
        if(onlineHas(t)){
          if(!old){ let s = document.createElement("span"); s.className = "onDot"; s.title = "online"; nm.appendChild(s); }
          else{ try{ old.classList.remove("zun-st-aus"); old.style.background = ""; old.style.visibility = ""; old.title = "online"; }catch(e){} }
        } else if(old && !(old.classList && old.classList.contains("zun-st-aus"))){
          try{ old.style.visibility = "hidden"; }catch(e){}
        }
      }catch(e){}
    });
    document.querySelectorAll(".who").forEach(function(who){
      try{
        let nm = null;
        try{ nm = who.querySelector(":scope > .chatname"); }catch(e){ try{ nm = who.querySelector(".chatname"); }catch(e2){} }
        if(!nm) return;
        if(nm.querySelector(":scope > .onDot")) return; // passo acima já cuidou
        let t = (nm.textContent||"").replace(/^@/,"").trim();
        if(!/^[A-Za-z0-9-_]{2,20}$/.test(t)) return;
        let sib = null;
        try{ for(let i=0;i<who.children.length;i++){ let c = who.children[i]; if(c!==nm && c.classList && c.classList.contains("onDot")){ sib = c; break; } } }catch(e){}
        if(onlineHas(t)){
          if(!sib){ let s = document.createElement("span"); s.className = "onDot"; s.title = "online"; who.appendChild(s); }
          else{ try{ sib.classList.remove("zun-st-aus"); sib.style.background = ""; sib.style.visibility = ""; sib.title = "online"; }catch(e){} }
        } else if(sib && !(sib.classList && sib.classList.contains("zun-st-aus"))){
          try{ sib.style.visibility = "hidden"; }catch(e){}
        }
      }catch(e){}
    });
  }catch(e){}
  try{ if(typeof window.zRepaintDots==="function") window.zRepaintDots(); }catch(e){}
}
async function getAvatar(nick, force){
  if(!nick || /^anon-[a-z0-9]{6,12}$/.test(nick)) return "";
  if(!force && avCache[nick]!==undefined){
    let age = Date.now()-(avCacheAt[nick]||0);
    let ttl = avCache[nick] ? 300000 : 60000;
    if(age<ttl) return avCache[nick];
    /* stale-while-revalidate: devolve o que tem na hora e atualiza em fundo */
    if(!avPending[nick]){ try{ getAvatar(nick, true).catch(()=>{}); }catch(e){} }
    return avCache[nick];
  }
  if(avPending[nick]) return avPending[nick];
  let p = (async()=>{
    try{
      let r = JSON.parse(await crpc("profileGet", nick));
      if(r.ok){ let _nu = r.avatar||""; try{
        /* pin do Pinterest: serve a imagem direta já resolvida; sem cache,
           resolve em fundo e repinta ao chegar (página nunca carrega no <img>) */
        if(_nu && typeof window.zunIsPinPage==="function" && window.zunIsPinPage(_nu)){
          let _d = "";
          try{ _d = (typeof window.zunPinDirectCached==="function") ? (window.zunPinDirectCached(_nu)||"") : ""; }catch(_e){ _d = ""; }
          if(_d){ _nu = _d; }
          else{
            try{
              if(typeof window.zunResolvePin==="function"){
                window.zunResolvePin(_nu).then(function(dd){
                  if(!dd) return;
                  try{ avCache[nick] = dd; avCacheAt[nick] = Date.now(); }catch(_e2){}
                  try{ zunAvRemember(nick, dd); }catch(_e2b){}
                  try{ zunAvSwap(nick, dd); }catch(_e3){}
                }).catch(function(){});
              }
            }catch(_e4){}
          }
        }
      }catch(_pe){} try{ if(avCache[nick] && _nu && avCache[nick]!==_nu) zunAvSwap(nick, _nu); }catch(e){} avCache[nick] = _nu; try{ zunAvFxPut(nick, r.fx); zunAvRemember(nick, _nu, r.fx); }catch(e){} try{ zNickNoteProfile(r); }catch(e){} try{ paintZNick(document.querySelector('[data-znick="'+nick.toLowerCase()+'"]'), nick); }catch(e){} }
      else if(avCache[nick]===undefined) avCache[nick] = "";
    }catch(e){ if(avCache[nick]===undefined) avCache[nick] = ""; }
    avCacheAt[nick] = Date.now();
    return avCache[nick];
  })();
  avPending[nick] = p;
  try{ return await p; }
  finally{ delete avPending[nick]; }
}
/* consultas só em áreas vivas: o avatar de cada miniAv só é consultado quando
   entra (ou está perto de entrar) na viewport. Fora da tela não gera
   profileGet; ao rolar até ele, busca, pinta e pré-aquece o bitmap. */
let zunAvIO = null;
function zunAvObserve(el){
  try{
    if(!el || el._zunAvObs) return false;
    if(typeof IntersectionObserver!=="function") return false;
    if(!zunAvIO){
      zunAvIO = new IntersectionObserver(function(es){
        for(let i=0;i<es.length;i++){
          let b = es[i].target;
          if(!es[i].isIntersecting) continue;
          try{ zunAvIO.unobserve(b); }catch(e){}
          let n = null;
          try{ n = b.dataset.nick; }catch(e){}
          if(!n) continue;
          try{
            getAvatar(n).then(function(u){
              if(u){ try{ zunAvWarm(u); }catch(e){} }
              if(!b.isConnected) return;
              if(!b.querySelector("img")){ try{ zunAvatarInto(b, u||"", String(n).slice(0,1).toUpperCase()); }catch(e){} }
              try{ zunAvFxApplyNick(b, n); }catch(e){}
            }).catch(function(){});
          }catch(e){}
        }
      }, {rootMargin:"300px", threshold:0});
    }
    el._zunAvObs = 1;
    zunAvIO.observe(el);
    return true;
  }catch(e){ return false; }
}
function zunAvSweepAlive(){
  try{
    document.querySelectorAll(".miniAv[data-nick]").forEach(function(b){ try{ zunAvObserve(b); }catch(e){} });
  }catch(e){}
}
function miniAv(nick, size){
  let b = document.createElement("button"); b.className = "miniAv"; b.title = ztr("ver perfil @")+nick;
  b.textContent = nick.slice(0,1).toUpperCase();
  if(onlineHas(nick)) b.classList.add("on");
  if(/^anon-[a-z0-9]{6,12}$/.test(nick)){ b.style.cursor = "default"; return b; }
  b.onclick = (ev)=>{ ev.stopPropagation(); openProfile(nick); };
  b.dataset.nick = nick;
  /* letra + pulso até a foto; bitmap em cache entra instantâneo, sem flicker.
     FIX foto sumindo no chat (2026-11-02): o IO sozinho nunca disparava no
     preview/aba oculta e a letra ficava p/ sempre. Agora: (1) foto própria e
     cache contam na hora, sem esperar IO; (2) fallback por timer pinta o que
     está visível se o IO enrolar; (3) zunAvPaintVisible repinta ao trocar de
     aba/rolar (mobile esconde a aba Chats com display:none e o IO não
     recalcula). Fora da tela continua sem query. */
  b.classList.add("av-loading");
  try{ zunAvFxApplyNick(b, nick); }catch(e){}
  try{
    let _meAv = "";
    try{ _meAv = (typeof me!=="undefined" && me && me.nick===nick && me.avatar) ? me.avatar : ""; }catch(e){}
    let _cached = "";
    try{ _cached = (typeof avCache!=="undefined") ? (avCache[nick]||"") : ""; }catch(e){}
    let _fast = _meAv || _cached;
    if(_fast){ zunAvatarInto(b, _fast, nick.slice(0,1).toUpperCase()); try{ if(_meAv) zunAvWarm(_meAv); }catch(e){} }
  }catch(e){}
  let _obs = false;
  try{ _obs = zunAvObserve(b); }catch(e){ _obs = false; }
  if(!_obs){
    getAvatar(nick).then(u=>{
      if(!b.isConnected){ if(u) zunAvWarm(u); return; }
      zunAvatarInto(b, u||"", nick.slice(0,1).toUpperCase());
      try{ zunAvFxApplyNick(b, nick); }catch(e){}
    });
  } else {
    /* IO registrado mas pode nunca disparar (iframe escalado, aba oculta,
       browser sem IO confiável): se em 1.5s continuar visível sem foto,
       busca direto. Escondido (offsetParent null) não gasta query — a troca
       de aba/rolagem repinta via zunAvPaintVisible. */
    try{
      setTimeout(function(){
        try{
          if(!b.isConnected || b.querySelector("img")) return;
          if(b.offsetParent===null) return;
          getAvatar(nick).then(function(u){
            if(!b.isConnected || b.querySelector("img")) return;
            zunAvatarInto(b, u||"", nick.slice(0,1).toUpperCase());
            try{ zunAvFxApplyNick(b, nick); }catch(e){}
          }).catch(function(){});
        }catch(e){}
      }, 1500);
    }catch(e){}
  }
  return b;
}
/* repinta avatares visíveis sem foto (chamado na troca de aba, rolagem e
   intervalo curto; no máx 12 por vez; getAvatar tem TTL+dedup então é barato).
   Cobre o caso do IO que nunca dispara: ao abrir a aba Chats as letras viram
   foto em ~300ms. */
function zunAvPaintVisible(){
  try{
    let done = 0;
    document.querySelectorAll(".miniAv[data-nick]").forEach(function(b){
      try{
        if(done>=12) return;
        if(b.querySelector("img") || !b.isConnected || b.offsetParent===null) return;
        let n = b.dataset.nick;
        if(!n || /^anon-[a-z0-9]{6,12}$/.test(n)) return;
        done++;
        getAvatar(n).then(function(u){
          if(!b.isConnected || b.querySelector("img")) return;
          zunAvatarInto(b, u||"", String(n).slice(0,1).toUpperCase());
          try{ zunAvFxApplyNick(b, n); }catch(e){}
        }).catch(function(){});
      }catch(e){}
    });
  }catch(e){}
}
try{
  if(!window._zunAvPaintWired){
    window._zunAvPaintWired = 1;
    document.addEventListener("click", function(ev){
      try{ if(ev && ev.target && ev.target.closest && ev.target.closest("#zunMBar button")){ setTimeout(function(){ try{ zunAvPaintVisible(); }catch(e){} }, 350); setTimeout(function(){ try{ zunAvPaintVisible(); }catch(e){} }, 1400); } }catch(e){}
    }, {passive:true});
    ["pubLog","privLog","feedCtn"].forEach(function(id){
      try{
        let el = document.getElementById(id);
        if(el && !el._zunAvScroll){
          el._zunAvScroll = 1;
          let t = null;
          el.addEventListener("scroll", function(){ if(t) return; t = setTimeout(function(){ t = null; try{ zunAvPaintVisible(); }catch(e){} }, 400); }, {passive:true});
        }
      }catch(e){}
    });
    setInterval(function(){ try{ if(!document.hidden) zunAvPaintVisible(); }catch(e){} }, 5000);
  }
}catch(e){}
let profSel = "";
let lastPvAt = {};
function profViewsTier(v){
  if(v<=1) return "primeira visita! ✨";
  if(v<10) return "tá começando a aparecer 🌱";
  if(v<50) return "chamando atenção 👀";
  if(v<200) return "🔥 perfil bombando!";
  if(v<1000) return "⭐ celebridade do zunzum!";
  return "🚀 lenda do zunzum!";
}
function fmtViews(v){ try{ return Number(v||0).toLocaleString("pt-BR"); }catch(e){ return String(v||0); } }
function paintProfViews(nick, views, instant){
  let box = document.getElementById("profViews");
  if(!box){
    box = document.createElement("div");
    box.id = "profViews";
    try{ profStats.parentNode.insertBefore(box, profStats.nextSibling); }catch(e){ return; }
  }
  if(!document.getElementById("profViewsCss")){
    let css = document.createElement("style");
    css.id = "profViewsCss";
    css.textContent = "#profViews{display:flex;align-items:center;gap:8px;margin:8px 0;padding:8px 12px;border-radius:12px;background:linear-gradient(135deg,#ff5fa2,#ff8c42);color:#fff;font-weight:bold;box-shadow:0 2px 12px #ff5fa288}#profViews .eye{font-size:26px;filter:drop-shadow(0 1px 2px #0006)}#profViews .n{font-size:26px;font-variant-numeric:tabular-nums;animation:pvPop .5s ease}@keyframes pvPop{0%{transform:scale(.4)}60%{transform:scale(1.25)}100%{transform:scale(1)}}#profViews .t{font-size:12px;font-weight:normal;opacity:.95}#profViews.me{background:linear-gradient(135deg,#7a4fc9,#00c2ff);box-shadow:0 2px 12px #7a4fc988}";
    try{ document.head.appendChild(css); }catch(e){}
  }
  let isMe = false;
  try{ isMe = !!(me && me.nick && String(nick).toLowerCase()===me.nick.toLowerCase()); }catch(e){}
  box.className = isMe ? "me" : "";
  box.innerHTML = "";
  let eye = document.createElement("span"); eye.className = "eye"; eye.textContent = "👀"; box.appendChild(eye);
  let n = document.createElement("span"); n.className = "n"; box.appendChild(n);
  let t = document.createElement("span"); t.className = "t"; box.appendChild(t);
  let target = Math.max(0, parseInt(views)||0);
  let label = fmtViews(target)+" "+ztr(target===1 ? "visita" : "visitas")+" · "+ztr(profViewsTier(target));
  if(isMe) label += " · "+ztr("esse é você! divulgue p/ subir 📈");
  t.textContent = label;
  n.textContent = fmtViews(target);
  try{
    if(!instant && target>1){
      let t0 = null;
      n.textContent = "0";
      let step = (ts)=>{
        try{
          if(t0===null) t0 = ts;
          let p = Math.min(1, (ts-t0)/900);
          n.textContent = fmtViews(Math.round(target*p));
          if(p<1) requestAnimationFrame(step);
        }catch(e){ n.textContent = fmtViews(target); }
      };
      requestAnimationFrame(step);
    }
  }catch(e){ n.textContent = fmtViews(target); }
}
function profViewHit(nick, baseViews){
  try{
    paintProfViews(nick, baseViews||0, true);
    let k = String(nick||"").toLowerCase();
    let now = Date.now();
    if(now - (lastPvAt[k]||0) < 60000) return;
    lastPvAt[k] = now;
    rpc("profView", nick).then(t=>{
      try{
        let v = JSON.parse(t);
        if(v && v.ok) paintProfViews(nick, v.views||0, false);
      }catch(e){}
    }).catch(()=>{});
  }catch(e){}
}
function hideNotFound(){ try{ let m = document.getElementById("notfoundModal"); if(m) m.remove(); }catch(e){} }
function showNotFound(o){
  try{
    hideNotFound();
    let tpl = document.getElementById("notfoundTpl");
    let ov = document.createElement("div");
    ov.id = "notfoundModal";
    if(tpl && tpl.content && tpl.content.cloneNode) ov.appendChild(tpl.content.cloneNode(true));
    else ov.innerHTML = '<div class="nfCard"><div class="nfIcon" data-nf="icon">🧭</div><div class="nfTitle" data-nf="title">link inválido</div><div class="nfMsg" data-nf="msg"></div><div class="nfRow"><button data-nf="ok">fechar</button></div></div>';
    ov.querySelector("[data-nf=icon]").textContent = (o&&o.icon)||"🧭";
    ov.querySelector("[data-nf=title]").textContent = (o&&o.title)||"link inválido";
    ov.querySelector("[data-nf=msg]").textContent = (o&&o.msg)||"esse link não leva a lugar nenhum.";
    let ok = ov.querySelector("[data-nf=ok]");
    ok.textContent = (o&&o.okLabel)||"fechar";
    ok.onclick = ()=>{ try{ if(o&&o.onOk) o.onOk(); }catch(e){} hideNotFound(); };
    ov.addEventListener("click", (ev)=>{ if(ev.target===ov) hideNotFound(); });
    document.body.appendChild(ov);
  }catch(e){}
}
/* recado novo no mural (comments-plugin): avisa com som + badge. o plugin não
   tem histórico consultável em 2º plano, então o aviso vale p/ mural aberto;
   ao abrir o próprio mural, zera (você está lendo). */
var zunMuralIds = {};
function zunMuralKey(ch, c){ try{ if(c&&c.id) return ch+"|"+c.id; }catch(e){} try{ return ch+"|"+(c.time||0)+"|"+String((c.user&&c.user.id)||"")+"|"+String(c.message||"").slice(0,40); }catch(e){ return ""; } }
function zunMuralPing(ch, owner, c){
  try{
    if(!c || c.byCurrentUser) return;
    let k = zunMuralKey(ch, c);
    if(k && zunMuralIds[k]) return;
    if(k){ zunMuralIds[k] = 1; try{ let ks = Object.keys(zunMuralIds); if(ks.length>500) zunMuralIds = {}; }catch(e){} }
    try{ if(c.time && (Date.now()-c.time > 120000)) return; }catch(e){}
    let author = ""; try{ author = String((c.user&&(c.user.nickname||c.user.visualId))||"").replace(/^@/,""); }catch(e){}
    try{ window.__zunLastMural = owner; }catch(e){}
    let mine = ""; try{ mine = (typeof me!=="undefined"&&me&&me.nick)||""; }catch(e){}
    let where = (mine && owner && String(owner).toLowerCase()===String(mine).toLowerCase()) ? "no seu mural" : ("no mural de @"+owner);
    let txt = ""; try{ txt = String(c.message||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,80); }catch(e){}
    let zb = (typeof bump==="function") ? bump : (window.ZNotify&&window.ZNotify.bump);
    if(zb) zb("mural", "depo", {title:"💬 recado "+where, body:(author?"@"+author+": ":"")+txt});
  }catch(e){}
}
function zunMuralSeen(ch, owner, cs){
  try{
    (cs||[]).forEach(c=>{ let k=zunMuralKey(ch,c); if(k) zunMuralIds[k]=1; });
    let mine=""; try{ mine=(typeof me!=="undefined"&&me&&me.nick)||""; }catch(e){}
    if(mine && owner && String(owner).toLowerCase()===String(mine).toLowerCase()){
      try{ if(typeof clearKind==="function") clearKind("mural"); else if(window.ZNotify) window.ZNotify.clearKind("mural"); }catch(e){}
    }
  }catch(e){}
}
function zzMuralFeed(cs){
  try{ window.zzMuralQueue = ((window.zzMuralQueue||[]).concat(cs||[])).slice(-60); }catch(e){}
}
/* pinta o corpo do modal de perfil a partir de um profileGet (fresco ou do
   cache). Reabrir um perfil já visto é instantâneo: pinta o guardado e a
   rede só atualiza por cima. */
function paintProfileData(r){
  profSel = r.nick;
  try{ zNickNoteProfile(r); }catch(e){}
  try{ paintZNick(profNick, r.nick, r.ns||null); profNick.textContent = "@"+r.nick; }catch(e){ profNick.textContent = "@"+r.nick; }
  (function(){ if(r.avatar){ if(!profAvatar.querySelector("img")) profAvatar.textContent = "?"; zunAvatarInto(profAvatar, r.avatar, "?"); } else zunAvatarInto(profAvatar, "", "?"); try{ zunAvFxApply(profAvatar, r.fx||""); }catch(e){} })();
  let dt = r.created ? new Date(r.created).toLocaleDateString((typeof window!=="undefined"&&window.zunzumLang==="en")?"en-US":(typeof window!=="undefined"&&window.zunzumLang==="es")?"es-ES":"pt-BR") : "?";
  profStats.innerHTML = "";
  profStats.textContent = ztr("membro desde ")+dt+ztr(" · posts: ")+r.posts+ztr(" · curtidas: ")+r.likes+ztr(" · chat: ")+r.pub+ztr(" · depoimentos: ")+(r.dep||0)+ztr(" · convites: ")+(r.inv||0);
  try{ profViewHit(r.nick, r.views||0); }catch(e){}
  try{ applyProfTheme(r.th||null); }catch(e){}
  try{ renderProfPg(r.pg||"", r.nick); }catch(e){}
  try{ renderProfMstatus(r.ms||"", r.nick); }catch(e){}
  try{ if(typeof me!=="undefined"&&me&&r&&r.nick&&me.nick&&String(r.nick).toLowerCase()===String(me.nick).toLowerCase()) zunMsSyncOwn(r.ms||""); }catch(e){}
  try{ paintProfOwner(r); }catch(e){}
  /* no próprio perfil, a caixa de personalização é gigante e enterrava
     depoimentos + mural lá embaixo: dono vai p/ o fim, conteúdo primeiro */
  try{
    if(me && r && me.nick===r.nick){
      let _ob = document.getElementById("profOwnerBox");
      let _mc = document.getElementById("profCard");
      if(_ob && _mc && _ob.parentNode===_mc) _mc.appendChild(_ob);
    }
  }catch(e){}
  loadDepo(r.nick);
  try{ paintProfMod(); }catch(e){}
  try{
    let ch = "mural-"+String(r.nick||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40);
    /* mural próprio (FASE 12) em src/zunmural.js; sem a fase no banco
       (ou sem Supabase/modo local) ele mesmo cai p/ o plugin antigo. */
    profMural.innerHTML = '<h3>'+ztr("mural de recados")+'</h3>';
    let box = document.createElement("div");
    profMural.appendChild(box);
    try{
      if(window.ZunMural && typeof window.ZunMural.mount==="function"){
        let mh = window.ZunMural.mount(box, {target:r.nick, isOwner:(me&&me.nick===r.nick),
          onComment:function(c){ try{ zunMuralPing(ch, r.nick, c); }catch(e){} try{ if(ch==="mural-zunzunzinha") zzMuralFeed([c]); }catch(e2){} },
          onLoad:function(cs){ try{ zunMuralSeen(ch, r.nick, cs||[]); }catch(e){} try{ if(ch==="mural-zunzunzinha") zzMuralFeed(cs||[]); }catch(e2){} }});
        if(mh && typeof mh.submit==="function"){ window.zzMuralCom = mh; window.zzMuralComCh = ch; }
      }
    }catch(e){}
  }catch(e){}
}
/* abre o próprio perfil já rolando até a seção (depo|mural) */
async function openMyProfileAt(where){
  if(!me) return;
  try{ await openProfile(me.nick); }catch(e){}
  setTimeout(()=>{ try{
    let m = document.getElementById("profModal");
    if(!m || !m.hidden){
      let el = where==="mural" ? document.getElementById("profMural") : document.getElementById("profDepo");
      if(el) el.scrollIntoView({block:"start", behavior:"smooth"});
    }
  }catch(e){} }, 400);
}
async function openProfile(raw){
  let nick = String(raw||"").replace(/^@/,"").trim();
  if(!nick) return;
  try{ let _pv = document.getElementById("profViews"); if(_pv) _pv.remove(); }catch(e){}
  if(/^anon-[a-z0-9]{6,12}$/.test(nick)){ profSel = ""; profAvatar.textContent = "?"; profNick.textContent = nick; profStats.textContent = ztr("anonimo sem conta"); profDepo.innerHTML = ""; try{ profMural.innerHTML = ""; }catch(e){} try{ profMuteBtn.hidden = true; profBlockBtn.hidden = true; }catch(e){} profModal.hidden = false; return; }
  profSel = nick;
  profAvatar.textContent = nick.slice(0,1).toUpperCase();
  profNick.textContent = "@"+nick;
  try{ paintZNick(profNick, nick); }catch(e){}
  profStats.textContent = ztr("carregando...");
  profModal.hidden = false;
  /* perfil já visto: pinta o cache na hora (avatar inclusive) e a rede
     atualiza por cima — reabrir não espera consulta */
  try{
    let _pc = zunProfRecall(nick);
    if(_pc && _pc.r && profSel===nick){ try{ paintProfileData(_pc.r); }catch(e){} }
  }catch(e){}
  try{
    let r = JSON.parse(await crpc("profileGet", nick));
    if(!r.ok){
      /* falso "não encontrado" (caso @purepetal): um {ok:0} pode ser resposta
         transitória — modo local antes de conectar, ou cache de 60s do crpc
         guardando um miss antigo. Confirma 1x direto no servidor (rpc, sem
         cache: offline dá throw e sai em silêncio, sem acusar ninguém) e só
         declara "não existe" se o servidor confirmar. */
      try{ if(profSel===nick && profStats.textContent!==ztr("carregando...") && profStats.textContent.indexOf(ztr("membro desde"))!==0) profStats.textContent = ztr("verificando..."); }catch(e){}
      let r2 = null;
      try{ r2 = JSON.parse(await rpc("profileGet", nick)); }catch(e2){ return; }
      if(profSel!==nick && profSel!==((r2&&r2.nick)||"")) return;
      if(!r2 || !r2.ok){ try{ profModal.hidden = true; }catch(e){} try{ zunClearPerfilUrl(); }catch(e){} showNotFound({icon:"👤", title:ztr("perfil não encontrado"), msg:ztr("@"+nick+" não existe no zunzum. Confira o link ou o nick.")}); return; }
      r = r2;
    }
    if(profSel!==nick && profSel!==r.nick) return;
    try{ zunProfRemember(r.nick, r); }catch(e){}
    try{ if(r.avatar){ zunAvRemember(r.nick, r.avatar); } }catch(e){}
    paintProfileData(r);
  }catch(e){ try{ if(profStats.textContent===ztr("carregando...")||profStats.textContent===ztr("verificando...")) profStats.textContent = ztr("sem conexao"); }catch(e2){} }
}
function depoRow(d, target, mode){
  let w = document.createElement("div"); w.style.fontSize = "13px"; w.style.borderTop = "1px dotted #b6c9db"; w.style.padding = "4px 0";
  let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = "@"+d.f;
  nm.title = ztr("ver perfil @")+d.f; nm.onclick = ()=>openProfile(d.f); try{ paintZNick(nm, d.f); }catch(e){} let odd = onDot(d.f); if(odd) nm.appendChild(odd); w.appendChild(nm);
  let tx = document.createElement("span"); tx.innerHTML = (d.t ? ": "+fmtChat(d.t) : ""); w.appendChild(tx);
  if(d.u && d.u.indexOf("https://")===0){ let im = document.createElement("img"); im.referrerPolicy = "no-referrer"; im.src = d.u; im.loading = "lazy"; im.className = "chatimg"; im.onerror = ()=>im.remove(); w.appendChild(im); }
  let m = document.createElement("div"); m.className = "meta"; m.textContent = new Date(d.at).toLocaleString(); w.appendChild(m);
  let auth = ()=>({to:target, nick:me.nick, hash:me.hash});
  if(mode==="pend"){
    let ok = document.createElement("button"); ok.textContent = ztr("aceitar"); ok.style.marginRight = "4px";
    let no = document.createElement("button"); no.textContent = ztr("recusar");
    ok.onclick = async ()=>{ zunBusy(ok, true, "⏳..."); try{ await rpc("depoOk", JSON.stringify(Object.assign(auth(), {id:d.id, v:1}))); cInv("depoGet"); loadDepo(target); }catch(e){} zunBusy(ok, false); };
    no.onclick = async ()=>{ zunBusy(no, true, "⏳..."); try{ await rpc("depoOk", JSON.stringify(Object.assign(auth(), {id:d.id, v:0}))); cInv("depoGet"); loadDepo(target); }catch(e){} zunBusy(no, false); };
    w.append(ok, no);
  } else if(mode==="del"){
    let x = document.createElement("button"); x.textContent = ztr("apagar"); x.style.marginTop = "2px";
    x.onclick = async ()=>{ if(!confirm(ztr("Apagar este depoimento?"))) return; zunBusy(x, true, "⏳ apagando..."); try{ await rpc("depoDel", JSON.stringify(Object.assign(auth(), {id:d.id}))); cInv("depoGet"); loadDepo(target); }catch(e){} zunBusy(x, false); };
    w.appendChild(x);
  }
  return w;
}
/* depoimentos com cache (memória 2min + disco 30min, stale-while-revalidate):
   reabrir o perfil pinta na hora; a rede atualiza por cima sem comer o
   rascunho que você estiver digitando. */
let zunDepoMem = {};
function zunDepoKey(to, viewer){ try{ return String(to||"").toLowerCase()+"|"+String(viewer||"").toLowerCase(); }catch(e){ return "|"; } }
function zunDepoLsLoad(){ try{ return JSON.parse(localStorage.getItem("zunDepoV1")||"{}")||{}; }catch(e){ return {}; } }
function zunDepoRemember(to, viewer, list){
  try{
    if(!list || !list.ok) return;
    let k = zunDepoKey(to, viewer);
    zunDepoMem[k] = {list:list, at:Date.now()};
    let m = zunDepoLsLoad();
    m[k] = {list:list, at:Date.now()};
    let ks = Object.keys(m);
    if(ks.length>60){
      let arr = ks.map(x=>({k:x, at:((m[x]&&m[x].at)||0)}));
      arr.sort((a,b)=>a.at-b.at);
      for(let i=0;i<arr.length-60;i++){ try{ delete m[arr[i].k]; }catch(e){} }
    }
    try{ localStorage.setItem("zunDepoV1", JSON.stringify(m)); }catch(e){}
  }catch(e){}
}
function zunDepoRecall(to, viewer){
  try{
    let k = zunDepoKey(to, viewer);
    let c = zunDepoMem[k];
    if(c && c.list && (Date.now()-c.at < 120000)) return {list:c.list, stale:false};
    let e = zunDepoLsLoad()[k];
    if(e && e.list && e.list.ok && (Date.now()-e.at < 1800000)){
      zunDepoMem[k] = {list:e.list, at:e.at};
      return {list:e.list, stale:(Date.now()-e.at >= 120000)};
    }
  }catch(e){}
  return null;
}
function paintDepoBox(box, target, list){
  box.innerHTML = "";
  let isOwner = me && me.nick === target;
  if(isOwner && list.pend.length){
    let ph = document.createElement("div"); ph.className = "meta"; ph.textContent = ztr("aguardando sua aprovação (")+list.pend.length+ztr("):"); box.appendChild(ph);
    list.pend.forEach(d=>box.appendChild(depoRow(d, target, "pend")));
  }
  if(!list.acc.length){ let e = document.createElement("div"); e.className = "meta"; e.textContent = ztr("nenhum depoimento ainda — escreva o primeiro sem mostrar o rosto."); box.appendChild(e); }
  else list.acc.slice().reverse().forEach(d=>box.appendChild(depoRow(d, target, (isOwner || (me && d.f===me.nick)) ? "del" : "view")));
  if(me && !isOwner){
    let f = document.createElement("div"); f.style.marginTop = "6px";
    let ti = document.createElement("textarea"); ti.placeholder = ztr("escreva um depoimento..."); ti.rows = 4; ti.style.width = "100%"; ti.style.boxSizing = "border-box"; ti.style.marginBottom = "4px";
    let bar = document.createElement("div"); bar.style.margin = "0 0 4px 0";
    /* emoji + GIF da galera (mesmo painel global, com busca pelo nome) */
    let dWrap = document.createElement("span"); dWrap.className = "emojiWrap"; dWrap.style.cssText = "position:relative;display:inline-flex;gap:4px;margin-left:4px";
    let dEb = document.createElement("button"); dEb.type = "button"; dEb.textContent = "😀"; dEb.title = ztr("escolha um emoji");
    dEb.onclick = (ev)=>{ try{ ev.stopPropagation(); }catch(e){} try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(ti); }catch(e2){} };
    let dGb = document.createElement("button"); dGb.type = "button"; dGb.textContent = "GIF"; dGb.title = ztr("GIFs da galera");
    dGb.style.cssText = "font-size:12px;font-weight:bold;border:1px dashed #b6c9db;border-radius:8px";
    dGb.onclick = (ev)=>{ try{ ev.stopPropagation(); }catch(e){} try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(ti, "gm"); }catch(e2){} };
    dWrap.appendChild(dEb); dWrap.appendChild(dGb); bar.appendChild(dWrap);
    let li = document.createElement("input"); li.placeholder = ztr("link de foto https:// (opcional)"); li.style.marginBottom = "4px";
    let sb = document.createElement("button"); sb.textContent = ztr("enviar depoimento");
    let sm = document.createElement("span"); sm.className = "meta"; sm.style.marginLeft = "6px";
    sb.onclick = async ()=>{
      let t = ti.value.trim(), u = li.value.trim();
      try{ var _pdd = (typeof zunHasPrivateData==="function") ? zunHasPrivateData(t+" "+u) : null; if(_pdd){ sm.textContent = "⛔ "+_pdd; return; } }catch(e){}
      if(!t && !u){ sm.textContent = ztr("escreva algo ou coloque foto"); return; }
      if(u && window.zunOkUrl && !window.zunOkUrl(u, 500)){ sm.textContent = ztr("link inválido (use https:// válido)"); return; }
      if(u && u.indexOf("https://")!==0){ sm.textContent = ztr("link precisa começar com https://"); return; }
      sb.disabled = true; sm.textContent = ztr("enviando...");
      try{
        let r2 = JSON.parse(await rpc("depoPush", JSON.stringify({to:target, nick:me.nick, hash:me.hash, text:t.slice(0,300), url:u.slice(0,500)})));
        if(r2.ok){ sm.textContent = ztr("enviado! aparece após aprovação."); ti.value = ""; li.value = ""; cInv("depoGet"); }
        else sm.textContent = ztr("erro: ")+(r2.err||"?");
      }catch(e2){ sm.textContent = ztr("sem conexao"); }
      sb.disabled = false;
    };
    f.append(bar, ti, li, sb, sm);
    /* barra big-bbcode compartilhada (B I U S cor tam fonte limpar prévia) */
    try{ if(window.ZunFmtBar) ZunFmtBar.attach(ti, {compact:true, before:bar}); }catch(e2){}
    box.appendChild(f);
  } else if(!me){
    let e = document.createElement("div"); e.className = "meta"; e.style.marginTop = "4px"; e.textContent = ztr("entre com nick+senha para deixar depoimento.");
    box.appendChild(e);
  }
  try{
    let _dn = [];
    ((list&&list.acc)||[]).forEach(d=>{ let n = String((d&&d.f)||""); if(n) _dn.push(n); });
    ((list&&list.pend)||[]).forEach(d=>{ let n = String((d&&d.f)||""); if(n) _dn.push(n); });
    if(_dn.length && typeof ensureZNickStyles==="function") ensureZNickStyles(_dn);
  }catch(e){}
}
async function loadDepo(target){
  profDepo.innerHTML = "";
  let h = document.createElement("div"); h.className = "meta"; h.textContent = ztr("depoimentos"); profDepo.appendChild(h);
  let box = document.createElement("div"); box.style.marginTop = "2px"; profDepo.appendChild(box);
  /* pinta o cache na hora (se houver); a rede atualiza por cima */
  try{
    let _dc = zunDepoRecall(target, me?me.nick:"");
    if(_dc && _dc.list){
      try{ paintDepoBox(box, target, _dc.list); }catch(e){}
      if(!_dc.stale) return;
    } else {
      zunLoading(box, ztr("carregando depoimentos..."));
    }
  }catch(e){}
  let list = null;
  try{ list = JSON.parse(await crpc("depoGet", JSON.stringify({to:target, nick:me?me.nick:"", hash:me?me.hash:""}))); }catch(e){}
  if(!list || !list.ok){
    try{
      if(!box.querySelector(".urow") && !box.textContent.match(/nenhum depoimento|aguardando|escreva um|no testimonials|awaiting|write a/)){ box.innerHTML = ""; box.textContent = ztr("sem conexao"); }
    }catch(e2){ try{ box.textContent = ztr("sem conexao"); }catch(e3){} }
    return;
  }
  /* não come o rascunho: guarda o que está digitado e devolve depois */
  let draftT = "", draftU = "";
  try{
    let tas = box.querySelectorAll("textarea"); if(tas.length) draftT = tas[tas.length-1].value||"";
    let ins = box.querySelectorAll("input"); if(ins.length) draftU = ins[ins.length-1].value||"";
  }catch(e){}
  try{ zunDepoRemember(target, me?me.nick:"", list); }catch(e){}
  try{ paintDepoBox(box, target, list); }catch(e){}
  try{
    if(draftT || draftU){
      let tas = box.querySelectorAll("textarea"); if(tas.length && draftT) tas[tas.length-1].value = draftT;
      let ins = box.querySelectorAll("input"); if(ins.length && draftU) ins[ins.length-1].value = draftU;
    }
  }catch(e){}
}
/* status da exclusão de conta (30 dias, login cancela) */
async function refreshDelStatus(){
  try{
    let box = document.getElementById("delBox");
    if(!box || !me){ return; }
    let st = {del: me.del||0};
    try{ st = JSON.parse(await rpc("accountDelStatus", JSON.stringify({nick:me.nick, hash:me.hash}))); }catch(e){}
    if(st && st.del && (!me.del || me.del!==st.del)){ me.del = st.del; try{ setSession(me); }catch(e){} }
    else if(st && !st.del && me.del){ me.del = 0; try{ setSession(me); }catch(e){} }
    box.innerHTML = "";
    if(me.del){
      let end = new Date(me.del + 30*86400000).toLocaleDateString();
      let w = document.createElement("div");
      w.style.cssText = "border:1px solid #c00;background:#fee;border-radius:8px;padding:8px";
      w.textContent = ztr("⚠️ exclusão pedida — sua conta apaga em ")+end+ztr(" (30 dias). Entre de novo p/ cancelar, ou cancele aqui:");
      let cb = document.createElement("button"); cb.textContent = ztr("cancelar exclusão"); cb.style.marginTop = "6px";
      cb.onclick = async ()=>{
        try{
          let r = JSON.parse(await rpc("accountDelCancel", JSON.stringify({nick:me.nick, hash:me.hash})));
          if(r && r.ok){ me.del = 0; setSession(me); refreshDelStatus(); }
        }catch(e){}
      };
      w.appendChild(document.createElement("br")); w.appendChild(cb);
      box.appendChild(w);
    } else {
      let b = document.createElement("button"); b.textContent = ztr("excluir conta..."); b.style.marginTop = "4px";
      b.onclick = ()=>{
        if(!confirm(ztr("Excluir sua conta? Ela fica 30 dias inativa (ninguém vê) e depois apaga de vez. Se entrar de novo antes, a exclusão é cancelada."))) return;
        if(!confirm(ztr("Confirma mesmo? Última chance — depois só entrando de novo em 30 dias p/ cancelar."))) return;
        (async ()=>{
          try{
            let r = JSON.parse(await rpc("accountDelReq", JSON.stringify({nick:me.nick, hash:me.hash})));
            if(r && r.ok){ me.del = r.del||Date.now(); setSession(me); refreshDelStatus(); }
            else alert(ztr("erro: ")+((r&&r.err)||"?"));
          }catch(e){ alert(ztr("sem servidor ainda")); }
        })();
      };
      box.appendChild(b);
    }
  }catch(e){}
}
/* LOGOFF COMPLETO: fecha DM, limpa assinaturas, limpa sessao SO desta aba.
   Outras abas com outra conta nao sao afetadas (sessionStorage isolado). */
async function doLogout(){
  let was = null, wasHash = "";
  try{ was = me ? me.nick : ""; wasHash = me ? me.hash : ""; }catch(e){}
  me = null;
  try{ clearSessionFor(was||""); }catch(e){}
  try{ zunWipeAccount(was||""); }catch(e){}
  /* revoga a sessão Bonto no servidor (best-effort) */
  try{ if(window.ZunBackend && window.ZunBackend.logout) window.ZunBackend.logout(false); }catch(e){}
  try{ if(window.zunDMCloseAllOnLogout) window.zunDMCloseAllOnLogout(); }catch(e){}
  try{
    let r = document.getElementById("zunDMRoot"); if(r) r.remove();
    let b2 = document.getElementById("zunDMBar"); if(b2) b2.innerHTML = "";
    try{ document.title = document.title.replace(/^\(\d+\)\s*💬\s*/,""); }catch(e){}
  }catch(e){}
  if(was){
    try{ rpc("unsubDepo", was).catch(()=>{}); }catch(e){}
    try{ rpc("unsubInv", was).catch(()=>{}); }catch(e){}
    try{ rpc("unsubAppr", was).catch(()=>{}); }catch(e){}
    try{ rpc("unsubDM", JSON.stringify({nick:was, hash:wasHash})).catch(()=>{}); }catch(e){}
    try{ rpc("unsubPriv", JSON.stringify({nick:was, hash:wasHash})).catch(()=>{}); }catch(e){}
    /* mata a sessão GoTrue junto (Supabase): sem isso ela lingerava na aba e os
       gates viam "usuário fraco logado" mesmo com o app deslogado — painel de
       migração abrindo sozinho no browse anônimo (bug 2026-10-26). */
    try{
      if(window.sbConfigured && window.sbConfigured()) rpc("sessLogout", JSON.stringify({nick:was, hash:wasHash})).catch(()=>{});
      else if(/^zst_/.test(wasHash||"")) rpc("sessLogout", JSON.stringify({nick:was, hash:wasHash, token:wasHash})).catch(()=>{});
    }catch(e){}
  }
  try{ await cInv("privGet"); }catch(e){}
  try{ await cInv("depoGet"); }catch(e){}
  try{ await cInv("presence"); }catch(e){}
  try{ if(typeof donoUnload==="function") donoUnload(); }catch(e){}
  try{ window._isOwner = false; let sb = document.getElementById("supBox"); if(sb) sb.remove(); let de = document.getElementById("donoEntry"); if(de) de.remove(); }catch(e){}
  try{ if(typeof paintSug==="function") paintSug([]); }catch(e){}
  try{ paintMe(); }catch(e){}
  try{ paintLocks(); }catch(e){}
  try{ loadPriv(true); }catch(e){}
  try{ loadPub(true); }catch(e){}
  try{ loadPresence(); }catch(e){}
  try{ if(window.zunFriendReload) window.zunFriendReload(); }catch(e){}
}
/* ===== MIGRAÇÃO FORÇADA p/ backend (MIG v1) =====
   Quem tem sessão antiga é deslogado e só volta criando uma senha NOVA e
   DIFERENTE da atual (verificada + trocada no servidor e criada no backend).
   Motivo mostrado: "senha fraca". Sem isso ninguém migra. */
var MIG_FLAG = 0;
var pendingMigNick = "";
function migDone(nick){ try{ return localStorage.getItem("zunMigV1:"+String(nick||"").toLowerCase())==="1"; }catch(e){ return false; } }
function migMark(nick){ try{ localStorage.setItem("zunMigV1:"+String(nick||"").toLowerCase(), "1"); }catch(e){} }
async function migBoot(){
  try{
    let v = JSON.parse(await rpc("cliVer",""));
    if(v && v.ok){
      if((v.v|0) > CLI_BUILD){ try{ location.reload(); }catch(e){} return; }
      if(v.mig) MIG_FLAG = 1;
    }
  }catch(e){ return; }
  if(MIG_FLAG && typeof me!=="undefined" && me && me.nick && !migDone(me.nick)){
    try{ pendingMigNick = me.nick; await doLogout(); showMigPanel(); }catch(e){}
  }
}
function showMigPanel(){
  try{ let old = document.getElementById("migModal"); if(old) old.remove(); }catch(e){}
  let ov = document.createElement("div"); ov.id = "migModal";
  ov.style.cssText = "position:fixed;inset:0;background:rgba(20,40,70,.72);display:flex;align-items:flex-start;justify-content:center;padding:24px 10px;z-index:80;overflow-y:auto";
  let card = document.createElement("div");
  card.style.cssText = "background:#fff;border-radius:10px;padding:16px;max-width:420px;width:100%;text-align:left";
  let h = document.createElement("h3"); h.style.margin = "0 0 8px"; h.textContent = "🔒 Atualização de segurança"; card.appendChild(h);
  let d = document.createElement("div"); d.style.fontSize = "13px"; d.style.marginBottom = "10px";
  d.innerHTML = "Sua senha atual é <b>fraca</b> e não é mais aceita.<br>Crie uma <b>nova senha (8+ letras, frase longa, diferente da atual)</b> para continuar entrando.";
  card.appendChild(d);
  function inp(ph, pw){ let i = document.createElement("input"); i.placeholder = ph; if(pw) i.type = "password"; i.style.display = "block"; i.style.width = "100%"; i.style.boxSizing = "border-box"; i.style.marginTop = "6px"; return i; }
  let n = inp("nick"); n.value = pendingMigNick||"";
  let c = inp("senha atual", 1), n1 = inp("nova senha (8+ letras, frase longa)", 1), n2 = inp("repita a nova senha", 1);
  let b = document.createElement("button"); b.textContent = "criar nova senha e entrar"; b.style.marginTop = "8px";
  let m = document.createElement("div"); m.className = "meta"; m.style.marginTop = "6px";
  let back = document.createElement("a"); back.href = "#"; back.style.fontSize = "12px"; back.textContent = "voltar";
  back.onclick = (ev)=>{ try{ ev.preventDefault(); }catch(e){} try{ ov.remove(); }catch(e){} return false; };
  let brow = document.createElement("div"); brow.style.marginTop = "8px"; brow.appendChild(back);
  card.append(n, c, n1, n2, b, m, brow); ov.appendChild(card); document.body.appendChild(ov);
  let capH = zunCaptchaMount(card, ()=>{ try{ return n.value.trim(); }catch(e){ return ""; } });
  try{ ((n.value ? c : n)).focus(); }catch(e){}
  b.onclick = async ()=>{
    if(b.disabled) return;
    let nick = n.value.trim().replace(/\s+/g,"-").slice(0,20), cur = c.value, nw1 = n1.value, nw2 = n2.value;
    if(nick.length<2 || !cur || !nw1 || !nw2){ m.textContent = "preencha os 4 campos"; return; }
    if(nw1!==nw2){ m.textContent = "as novas senhas não conferem"; return; }
    if(nw1.length<8){ m.textContent = "nova senha precisa de 8+ letras (use frase longa)"; return; }
    if(nw1===cur){ m.textContent = "a nova senha precisa ser diferente da atual"; return; }
    b.disabled = true; m.textContent = "verificando captcha...";
    let cz = await zunCaptchaTakeH(capH, nick);
    if(!cz.zcap){ m.textContent = "complete o captcha (arraste a barra até ficar verde)"; b.disabled = false; return; }
    m.textContent = "verificando...";
    try{
      let hc = await hashPw(cur), hn = await hashPw(nw1);
      if(hn===hc){ m.textContent = "a nova senha precisa ser diferente da atual"; b.disabled = false; return; }
      let r = JSON.parse(await rpc("register", JSON.stringify({nick, hash:hc, pwLen:String(cur||"").length, captcha:cz.captcha, zcap:cz.zcap})));
      if(!r.ok){ m.textContent = r.err==="senha" ? "senha atual errada" : r.err==="captcha" ? "captcha inválido, arraste de novo e tente" : r.err==="rate" ? "devagar, aguarde uns segundos e tente de novo" : "erro: "+(r.err||"?"); b.disabled = false; if(r.err==="captcha" && capH && capH.zh){ try{ capH.zh.reset(); }catch(e){} } return; }
      /* backend primeiro: se ele falhar, aborta SEM mexer na senha antiga */
      if(window.ZunBackend && window.ZunBackend.configured()){
        m.textContent = "registrando no servidor novo...";
        try{ await window.ZunBackend.login(nick, nw1, cz.zcap); }
        catch(be){
          var _bec = String((be && be.code)||"");
          if(_bec==="captcha"){ m.textContent = "captcha inválido, arraste de novo e tente"; b.disabled = false; try{ if(capH && capH.zh) capH.zh.reset(); }catch(eR){} return; }
          if(_bec==="rate"){ m.textContent = "devagar, aguarde uns segundos e tente de novo"; b.disabled = false; return; }
          if(_bec==="sem-vinculo"||_bec==="nick-divergente"){ m.textContent = "vínculo recusado no servidor novo ("+_bec+"): confira o nick e tente de novo"; b.disabled = false; return; }
          if((_bec==="existe" || _bec==="auth") && window.ZunBackend.loginOnly){
            /* a conta já existe no servidor novo: tenta assumir — com a NOVA
               (migração anterior parou no meio) ou com a ATUAL (conta criada
               antes nos dois), trocando por lá antes de trocar aqui */
            var _bok = false, _be2 = "";
            try{ await window.ZunBackend.loginOnly(nick, nw1); _bok = true; }
            catch(eN){ _be2 = String((eN && eN.code)||""); }
            if(!_bok){
              try{ await window.ZunBackend.loginOnly(nick, cur); await window.ZunBackend.changePassword(cur, nw1); await window.ZunBackend.loginOnly(nick, nw1); _bok = true; }
              catch(eC){ _be2 = String((eC && eC.code)||""); }
            }
            if(!_bok){
              m.textContent = _be2==="rate" ? "devagar, aguarde uns segundos e tente de novo" : "essa conta já tem outra senha no servidor novo — entre normal com a senha nova; se não lembrar dela, zere o banco do backend e migre de novo";
              b.disabled = false; try{ if(capH && capH.zh) capH.zh.reset(); }catch(eR2){} return;
            }
          } else {
            m.textContent = "sem conexão com o servidor novo, tente de novo";
            b.disabled = false; try{ if(capH && capH.zh) capH.zh.reset(); }catch(eR3){} return;
          }
        }
      }
      m.textContent = "trocando a senha...";
      let pr = JSON.parse(await rpc("pwChange", JSON.stringify({nick, hash:hc, proof:hc, newHash:hn, newLen:nw1.length})));
      if(!pr.ok){ m.textContent = pr.err==="rate" ? "devagar, aguarde uns segundos e tente de novo" : "erro ao trocar ("+(pr.err||"?")+")"; b.disabled = false; return; }
      /* E2E: re-lacra a custódia com a NOVA senha antes do reload (tem hn aqui) */
      try{ if(window.ZunDME2E && window.ZunDME2E.setPwHash){ window.ZunDME2E.setPwHash(hn); await window.ZunDME2E.syncBackup(true); } }catch(e2){}
      let cred = hn;
      try{
        let tk = newSessToken();
        if(tk){ let sl = JSON.parse(await rpc("sessLogin", JSON.stringify({nick, hash:hn, token:tk}))); if(sl && sl.ok && sl.token) cred = sl.token; }
      }catch(e2){}
      me = {nick:(r.nick||nick), hash:cred, created:r.created||Date.now(), avatar:r.avatar||"", fx:r.fx||"", ns:r.ns||null, del:0}; setSession(me);
      migMark(nick); pendingMigNick = "";
      m.textContent = "senha atualizada! ✅ entrando...";
      setTimeout(()=>{ try{ location.reload(); }catch(e){} }, 1200);
    }catch(err){ m.textContent = "sem servidor ainda"; b.disabled = false; }
  };
}
/* captcha zunzum (anti-Sybil no cadastro): slider humano + prova de trabalho
   (src/zuncaptcha.js), sempre ativo, sem Cloudflare/sitekey. O Turnstile segue
   como camada EXTRA quando há sitekey (o Supabase com captcha ON exige o token
   dele no signUp — sem isso o cadastro é rejeitado lá).
   zunCaptchaMount(box, getNick) → handle; zunCaptchaTakeH(handle, nick) →
   Promise<{zcap, captcha}>. */
function zunCaptchaKey(){
  try{
    var k = String(window.ZUN_TURNSTILE_SITEKEY || "").trim();
    if(!k) k = String(localStorage.getItem("ZUN_TURNSTILE_SITEKEY") || "").trim();
    return k;
  }catch(e){ return ""; }
}
function zunCaptchaMount(box, getNick){
  var zh = null;
  try{ if(window.ZunCap) zh = window.ZunCap.mount(box, {getNick:getNick}); }catch(e){ zh = null; }
  /* Turnstile extra (só com sitekey) — token por widget, sem global */
  try{
    if(zunCaptchaKey()){
      var d = document.createElement("div"); d.style.marginTop = "6px";
      box.appendChild(d);
      var render = function(){
        try{
          if(!window.turnstile) return;
          if(d._zunTsId != null){ try{ window.turnstile.remove(d._zunTsId); }catch(e){} d._zunTsId = null; }
          d._zunTsId = window.turnstile.render(d, {sitekey:zunCaptchaKey(), theme:"auto",
            callback:function(t){ try{ d._zunCapTok = t || ""; }catch(e){} },
            "expired-callback":function(){ try{ d._zunCapTok = ""; }catch(e){} },
            "error-callback":function(){ try{ d._zunCapTok = ""; }catch(e){} }});
        }catch(e){}
      };
      if(window.turnstile) render();
      else{
        var s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true; s.defer = true; s.onload = render;
        document.head.appendChild(s);
      }
    }
  }catch(e){}
  return {zh:zh, box:box};
}
function zunCaptchaTakeTs(box){
  var t = "";
  try{
    var ds = box ? box.querySelectorAll("div") : [];
    for(var i=0;i<ds.length;i++){ if(ds[i] && ds[i]._zunCapTok){ t = String(ds[i]._zunCapTok||""); ds[i]._zunCapTok = ""; break; } }
    if(!t){ t = String(window._zunCapTok || ""); window._zunCapTok = ""; }
  }catch(e){}
  try{
    if(window.turnstile){
      var ds2 = box ? box.querySelectorAll("div") : [];
      for(var j=0;j<ds2.length;j++){ if(ds2[j] && ds2[j]._zunTsId != null){ try{ window.turnstile.reset(ds2[j]._zunTsId); }catch(e2){} } }
      if(window._zunTsId != null){ try{ window.turnstile.reset(window._zunTsId); }catch(e3){} }
    }
  }catch(e4){}
  return t;
}
async function zunCaptchaTakeH(h, nick){
  var z = "";
  try{ if(h && h.zh && h.zh.take) z = (await h.zh.take(nick)) || ""; }catch(e){ z = ""; }
  var c = "";
  try{ if(zunCaptchaKey()) c = zunCaptchaTakeTs(h && h.box); }catch(e2){}
  return {zcap:z, captcha:c};
}
async function paintMe(){
  /* semente instantânea: avatar próprio (sessão ou disco) pinta sem consulta;
     o bitmap começa a baixar antes do resto */
  try{
    let _mu = (me && me.avatar) || "";
    if(!_mu && me && me.nick){ try{ let _rc = zunAvRecall(me.nick); if(_rc && _rc.u) _mu = _rc.u; }catch(e){} }
    if(me && !me.fx && me.nick){ try{ let _fx = zunAvFxGet(me.nick); if(_fx) me.fx = _fx; }catch(e){} }
    if(_mu){
      try{ if(!me.avatar){ me.avatar = _mu; try{ setSession(me); }catch(e){} } }catch(e){}
      try{ avCache[me.nick] = _mu; avCacheAt[me.nick] = Date.now(); }catch(e){}
      try{ zunAvWarm(_mu); }catch(e){}
    }
  }catch(e){}
  let posts = [];
  try{ posts = JSON.parse(await crpc("feedGet","")); if(!Array.isArray(posts)) posts = []; }catch(e){ posts = []; }
  let mine = me ? posts.filter(p=>p.n==="@"+me.nick).length : 0;
  (function(){ let L = (me&&me.nick?me.nick:"?").slice(0,1).toUpperCase(); if(me && me.avatar){ if(!avatarEl.querySelector("img")) avatarEl.textContent = L; zunAvatarInto(avatarEl, me.avatar, L); } else zunAvatarInto(avatarEl, "", (me ? me.nick : anonId).slice(0,1).toUpperCase()); try{ zunAvFxApply(avatarEl, (me&&me.fx)||""); }catch(e){} })();
  /* sessão antiga sem foto (trocada em outra aba/aparelho): busca fresca 1x */
  if(me && !me.avatar){
    try{
      let pr = JSON.parse(await crpc("profileGet", me.nick));
      if(pr && pr.ok && pr.avatar){ me.avatar = pr.avatar; try{ if(pr.fx!==undefined) me.fx = zunAvFxClean(pr.fx); }catch(e){} try{ setSession(me); }catch(e){} try{ avCache[me.nick] = pr.avatar; avCacheAt[me.nick] = Date.now(); try{ zunAvRemember(me.nick, pr.avatar, pr.fx); }catch(_e){} }catch(e){} paintMe(); return; }
    }catch(e){}
  }
  meEl.textContent = "";
  try{ avatarEl.classList.toggle("me-open", !!me); }catch(e){}
  if(me){
    let nm = document.createElement("span");
    nm.className = "chatname";
    nm.textContent = "@"+me.nick;
    nm.title = "abrir meu perfil";
    try{ nm.style.cursor = "pointer"; nm.onclick = ()=>{ try{ openProfile(me.nick); }catch(e){} }; }catch(e){}
    // lateral mostra o nick com cor/fonte/efeito escolhidos (igual ao perfil)
    try{
      let _lk0 = String(me.nick||"").toLowerCase();
      let _ch0 = (typeof znickCache!=="undefined") ? znickCache[_lk0] : undefined;
      if(me.ns) paintZNick(nm, me.nick, me.ns);
      else if(_ch0!==undefined && _ch0) paintZNick(nm, me.nick, _ch0);
      else paintZNick(nm, me.nick);
    }catch(e){}
    meEl.appendChild(nm);
    let st = document.createElement("span"); st.className = "meta"; st.textContent = " logado";
    meEl.appendChild(st);
    // sessão antiga pode ter ns desatualizado (null) enquanto o servidor já tem
    // estilo: adota o cache na hora e confirma 1x em fundo (sem recriar a conta)
    try{
      let _lk = String(me.nick||"").toLowerCase();
      let _ch = (typeof znickCache!=="undefined") ? znickCache[_lk] : undefined;
      if(me.ns===undefined || me.ns===null){
        if(_ch!==undefined && _ch){
          me.ns = _ch;
          try{ setSession(me); }catch(e){}
          try{ paintZNick(nm, me.nick, me.ns); nm.textContent = "@"+me.nick; }catch(e){}
        }
        crpc("profileGet", me.nick).then(function(t){
          try{
            let pr = JSON.parse(t);
            if(!pr || !pr.ok) return;
            let _nn = pr.ns||null;
            if(JSON.stringify(_nn)!==JSON.stringify(me.ns)){
              me.ns = _nn;
              try{ setSession(me); }catch(e){}
            }
            try{ znickCache[_lk] = me.ns||null; }catch(e){}
            try{ paintZNick(nm, me.nick, me.ns||null); nm.textContent = "@"+me.nick; }catch(e){}
            try{ if(typeof zNickRepaintAll==="function") zNickRepaintAll(); }catch(e){}
          }catch(e){}
        }).catch(()=>{});
      }
    }catch(e){}
  } else {
    meEl.textContent = anonId+" anonimo";
  }
  try{ paintMeMs(me&&me.ms); }catch(e){}
  try{ if(me&&me.nick&&me.ms===undefined){ crpc("profileGet", me.nick).then(function(t){ try{ let pr=JSON.parse(t); if(pr&&pr.ok) zunMsSyncOwn(pr.ms||""); }catch(e){} }).catch(()=>{}); } }catch(e){}
  infoList.innerHTML = ztr(me ? "posts seus: "+mine : "status: sem conta<br>chat: bloqueado");
  authBox.innerHTML = "";
  if(me){
    let b = document.createElement("button"); b.textContent = "sair";
    b.onclick = ()=>{ doLogout(); };
    authBox.appendChild(b);
    let vp = document.createElement("button"); vp.textContent = "👤 meu perfil"; vp.style.marginLeft = "6px"; vp.title = "abrir meu perfil (depoimentos + mural)";
    vp.onclick = ()=>{ try{ openProfile(me.nick); }catch(e){} };
    authBox.appendChild(vp);
    let sc = document.createElement("div"); sc.style.cssText = "display:flex;gap:6px;margin-top:6px;flex-wrap:wrap";
    let bd = document.createElement("button"); bd.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-2px;margin-right:4px"><rect x="2" y="3" width="20" height="13" rx="3" fill="#6fbf4a"/><path d="M7 16l-2.5 5L11 16z" fill="#6fbf4a"/><path d="M6 7h12M6 10.5h8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></svg>'; bd.appendChild(document.createTextNode("depoimentos")); bd.title = "ver meus depoimentos";
    bd.onclick = ()=>{ try{ openMyProfileAt("depo"); }catch(e){} };
    let bm = document.createElement("button"); bm.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-2px;margin-right:4px"><path d="M9 2.5h6V9l3.5 3.5v2h-13v-2L9 9z" fill="#e14b5a"/><path d="M12 14.5V21" stroke="#e14b5a" stroke-width="2.4" stroke-linecap="round"/></svg>'; bm.appendChild(document.createTextNode("mural")); bm.title = "ver meu mural de recados";
    bm.onclick = ()=>{ try{ openMyProfileAt("mural"); }catch(e){} };
    sc.appendChild(bd); sc.appendChild(bm);
    authBox.appendChild(sc);
    let mb = document.createElement("button"); mb.style.marginLeft = "6px"; mb.title = "silenciar todas as notificações";    function paintMb(){ let off = false; try{ off = localStorage.getItem("zunzumMuteAll:"+me.nick.toLowerCase())==="1"; }catch(e){} mb.textContent = off ? "🔕 silenciado" : "🔔 avisos"; }
    function paintMbSvg(){ try{ let off = false; try{ off = localStorage.getItem("zunzumMuteAll:"+me.nick.toLowerCase())==="1"; }catch(e){} mb.innerHTML = ""; var ic = document.createElement("span"); ic.setAttribute("aria-hidden","true"); try{ if(off){ if(typeof zunSvgBellOffBtn==="function") zunSvgBellOffBtn(ic); else ic.textContent = "🔕"; } else { if(typeof zunSvgBellBtn==="function") zunSvgBellBtn(ic); else ic.textContent = "🔔"; } }catch(e){ ic.textContent = off ? "🔕" : "🔔"; } mb.appendChild(ic); mb.appendChild(document.createTextNode(" "+ztr(off ? "silenciado" : "avisos"))); }catch(e){ try{ let off2 = false; try{ off2 = localStorage.getItem("zunzumMuteAll:"+me.nick.toLowerCase())==="1"; }catch(e2){} mb.textContent = off2 ? "🔕 silenciado" : "🔔 avisos"; }catch(e3){} } }
    try{ paintMb = paintMbSvg; }catch(e){}
    paintMb();
    mb.onclick = ()=>{ try{ let k = "zunzumMuteAll:"+me.nick.toLowerCase(); localStorage.setItem(k, localStorage.getItem(k)==="1"?"0":"1"); }catch(e){} paintMb(); };
    authBox.appendChild(mb);
    let delBox = document.createElement("div"); delBox.id = "delBox"; delBox.style.marginTop = "8px"; delBox.className = "meta";
    authBox.appendChild(delBox);
    try{ refreshDelStatus(); }catch(e){}
    function avatarDelGet(){ try{ return localStorage.getItem("zunzumAvatarDel:"+me.nick.toLowerCase())||""; }catch(e){ return ""; } }
    function avatarDelSet(d){ try{ if(d) localStorage.setItem("zunzumAvatarDel:"+me.nick.toLowerCase(), d); else localStorage.removeItem("zunzumAvatarDel:"+me.nick.toLowerCase()); }catch(e){} }
    function avatarDelOld(){ try{ var d = avatarDelGet(); avatarDelSet(""); if(d) fetch(d).then(r=>r.json()).catch(()=>{}); }catch(e){} }
    let lb = document.createElement("label"); lb.className = "meta"; lb.style.display = "block"; lb.style.marginTop = "6px"; lb.textContent = "foto de perfil (gif até 2MB):";
    let fi = document.createElement("input"); fi.type = "file"; fi.accept = "image/*"; fi.style.marginTop = "4px";
    let st = document.createElement("div"); st.className = "meta";
    fi.onchange = async ()=>{
      let f = fi.files[0]; if(!f) return;
      if(!/^image\//.test(f.type||"")){ st.textContent = "só imagem"; return; }
      if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ st.textContent = "svg bloqueado (use png/jpg/gif)"; return; }
      let isGif = /^image\/gif$/i.test(f.type||"");
      if(isGif && f.size>2097152){ st.textContent = "gif muito grande (máx 2MB)"; return; }
      st.textContent = "otimizando...";
      /* gif pequeno: sobe original p/ não matar a animação (shrink achata) */
      if(!(isGif && f.size<=2097152)) f = await shrinkImage(f, 256, 0.85);
      st.textContent = "enviando...";
      try{
        let up = await zunUpload(f, {expires:Date.now()+1000*60*60*24*90});
        if(up.error){ st.textContent = (up.error==="grande"?zunLimitMsg(f):"erro upload"); return; }
        let r = JSON.parse(await rpc("avatarSet", JSON.stringify({nick:me.nick, hash:me.hash, url:up.url})));
        if(!r.ok){ st.textContent = "erro"; return; }
        avatarDelOld(); avatarDelSet(up.deletionUrl||"");
        me.avatar = r.avatar; if("fx" in r) me.fx = zunAvFxClean(r.fx); setSession(me);
        avCache[me.nick] = r.avatar; avCacheAt[me.nick] = Date.now(); try{ zunAvRemember(me.nick, r.avatar); }catch(_e){} st.textContent = "foto atualizada!";
        cInv("profileGet"); paintMe();
      }catch(e){ st.textContent = "sem conexao"; }
    };
    authBox.append(lb, fi, st);
    let ll = document.createElement("label"); ll.className = "meta"; ll.style.display = "block"; ll.style.marginTop = "6px"; ll.textContent = "ou link externo da foto:";
    let lin = document.createElement("input"); lin.placeholder = "https://..."; lin.style.marginTop = "4px";
    let lb3 = document.createElement("button"); lb3.textContent = "usar link"; lb3.style.marginTop = "4px";
    lb3.onclick = async ()=>{
      let u2 = lin.value.trim();
      let newDel = "";
      if(!u2){ st.textContent = "cole o link"; return; }
      if(u2.indexOf("data:image/")===0){
        st.textContent = "enviando foto...";
        try{
          let m = u2.match(/^data:(image\/(png|jpe?g|gif|webp));base64,([\s\S]+)$/i);
          if(!m) throw 0;
          if(/svg/i.test(m[1])) throw 0;
          let bin = atob(m[3].replace(/\s+/g,""));
          if(!bin || bin.length<100) throw 0;
          if(/^gif$/i.test(m[1]) && bin.length>2097152) throw 1;
          let arr = new Uint8Array(bin.length);
          for(let i2=0;i2<bin.length;i2++) arr[i2] = bin.charCodeAt(i2);
          let blob0 = new Blob([arr], {type:m[1].toLowerCase()});
          /* gif pequeno: sobe original p/ não matar a animação */
          let bb = (/^gif$/i.test(m[1]) && bin.length<=2097152) ? blob0 : await shrinkImage(blob0, 256, 0.85);
          let up2 = await zunUpload(bb, {expires:Date.now()+1000*60*60*24*90});
          if(up2.error || !up2.url) throw 0;
          u2 = up2.url; newDel = up2.deletionUrl||"";
        }catch(e){ st.textContent = (e===1) ? "gif muito grande (máx 2MB)" : "base64 inválido"; return; }
      }
      if(window.zunOkUrl && !window.zunOkUrl(u2, 500)){ st.textContent = "link inválido (use https:// válido)"; return; }
      if(u2.indexOf("https://")!==0 || /data:|\s/.test(u2)){ st.textContent = "link precisa começar com https://"; return; }
      try{
        if(typeof window.zunIsPinPage==="function" && window.zunIsPinPage(u2)){
          st.textContent = "resolvendo foto do Pinterest...";
          var _pinD = null;
          try{ _pinD = await window.zunResolvePin(u2); }catch(_pe){ _pinD = null; }
          if(_pinD){ u2 = _pinD; }
          else{ st.textContent = "esse link é a PÁGINA do Pinterest, não a foto — abra o pin, clique na foto > copiar endereço da imagem (i.pinimg.com...) ou faça upload"; return; }
        }
      }catch(_pe2){}
      st.textContent = "salvando...";
      try{
        let r3 = JSON.parse(await rpc("avatarSet", JSON.stringify({nick:me.nick, hash:me.hash, url:u2.slice(0,500)})));
        if(!r3.ok){ st.textContent = "erro"; return; }
        avatarDelOld(); avatarDelSet(newDel);
        me.avatar = r3.avatar; if("fx" in r3) me.fx = zunAvFxClean(r3.fx); setSession(me);
        avCache[me.nick] = r3.avatar; avCacheAt[me.nick] = Date.now(); try{ zunAvRemember(me.nick, r3.avatar); }catch(_e){} st.textContent = "foto atualizada!"; lin.value = "";
        cInv("profileGet"); paintMe();
      }catch(e){ st.textContent = "sem conexao"; }
    };
    authBox.append(ll, lin, lb3);
    /* efeito do avatar (FASE 14): escolhe, vê na hora no próprio avatar e salva */
    let fxLb = document.createElement("label"); fxLb.className = "meta"; fxLb.style.display = "block"; fxLb.style.marginTop = "6px"; fxLb.textContent = "efeito do avatar:";
    let fxSel = document.createElement("select"); fxSel.style.marginTop = "4px";
    [["","sem efeito"],["neon","círculo neon"],["neonrosa","neon rosa"],["ouro","ouro"],["arcoiris","arco-íris"],["fogo","fogo"],["gelo","gelo"],["sombra","sombra"]].forEach(([v,l])=>{
      let o = document.createElement("option"); o.value = v; o.textContent = l; fxSel.appendChild(o);
    });
    try{ fxSel.value = me.fx||""; }catch(e){}
    let fxRow = document.createElement("div"); fxRow.style.cssText = "display:flex;gap:6px;margin-top:4px;align-items:center";
    let fxSv = document.createElement("button"); fxSv.textContent = "salvar efeito";
    let fxSt = document.createElement("span"); fxSt.className = "meta";
    fxSel.onchange = ()=>{ try{ zunAvFxApply(avatarEl, fxSel.value); }catch(e){} };
    fxSv.onclick = async ()=>{
      fxSt.textContent = "salvando...";
      try{
        /* fix 2026-10-29 (caso loki): não manda url quando a sessão local está
           sem foto — chave ausente = servidor preserva (url:"" apagaria). */
        let _p4 = {nick:me.nick, hash:me.hash, fx:fxSel.value};
        if(me.avatar) _p4.url = me.avatar;
        let r4 = JSON.parse(await rpc("avatarSet", JSON.stringify(_p4)));
        if(!r4.ok){ fxSt.textContent = "erro"; return; }
        if("avatar" in r4) me.avatar = String(r4.avatar||"");
        me.fx = ("fx" in r4) ? zunAvFxClean(r4.fx) : zunAvFxClean(fxSel.value);
        setSession(me);
        try{ zunAvFxPut(me.nick, me.fx); zunAvRemember(me.nick, me.avatar||"", me.fx); }catch(e){}
        try{ zunAvFxSwap(me.nick, me.fx); }catch(e){}
        try{ zunAvFxApply(avatarEl, me.fx||""); }catch(e){}
        cInv("profileGet"); paintMe();
        fxSt.textContent = (r4.warn==="sem-fase14") ? "salvo aqui, mas o servidor ainda não tem a FASE 14 (efeito some no reload)" : "efeito atualizado!";
      }catch(e){ fxSt.textContent = "sem conexao"; }
    };
    fxRow.appendChild(fxSel); fxRow.appendChild(fxSv); fxRow.appendChild(fxSt);
    authBox.append(fxLb, fxRow);
    if(me.avatar){
      let rm = document.createElement("button"); rm.textContent = "remover foto"; rm.style.marginTop = "4px";
      rm.onclick = async ()=>{ try{ let r = JSON.parse(await rpc("avatarSet", JSON.stringify({nick:me.nick, hash:me.hash, url:""}))); if(r.ok){ avatarDelOld(); me.avatar = ""; setSession(me); avCache[me.nick] = ""; avCacheAt[me.nick] = Date.now(); try{ zunAvForget(me.nick); }catch(_e){} cInv("profileGet"); paintMe(); } }catch(e){} };
      authBox.appendChild(rm);
    }
    let pwTgl = document.createElement("button"); pwTgl.textContent = "🔑 trocar senha"; pwTgl.style.marginTop = "8px";
    let pwBox = document.createElement("div"); pwBox.hidden = true; pwBox.style.marginTop = "6px";
    let pwCur = document.createElement("input"); pwCur.type = "password"; pwCur.placeholder = "senha atual"; pwCur.autocomplete = "current-password";
    let pwNew = document.createElement("input"); pwNew.type = "password"; pwNew.placeholder = "nova senha (8+ letras, frase longa)"; pwNew.autocomplete = "new-password"; pwNew.style.marginTop = "4px";
    let pwNew2 = document.createElement("input"); pwNew2.type = "password"; pwNew2.placeholder = "repita a nova senha"; pwNew2.autocomplete = "new-password"; pwNew2.style.marginTop = "4px";
    let pwGo = document.createElement("button"); pwGo.textContent = "confirmar troca"; pwGo.style.marginTop = "4px";
    let pwMsg = document.createElement("div"); pwMsg.className = "meta"; pwMsg.style.marginTop = "4px";
    pwTgl.onclick = ()=>{ pwBox.hidden = !pwBox.hidden; pwMsg.textContent = ""; try{ if(!pwBox.hidden) pwCur.focus(); }catch(e){} };
    pwGo.onclick = async ()=>{
      if(pwGo.disabled) return;
      let c = pwCur.value, n1 = pwNew.value, n2 = pwNew2.value;
      if(!c || !n1 || !n2){ pwMsg.textContent = "preencha os 3 campos"; return; }
      if(n1!==n2){ pwMsg.textContent = "as novas senhas não conferem"; return; }
      if(n1.length<8){ pwMsg.textContent = "nova senha precisa de 8+ letras (use frase longa)"; return; }
      pwGo.disabled = true; pwMsg.textContent = "verificando...";
      try{
        let hc = await hashPw(c);
        let isTok = /^zst_/.test(me.hash||"");
        if(!isTok && hc!==me.hash){ pwMsg.textContent = "senha atual errada"; pwGo.disabled = false; return; }
        let hn = await hashPw(n1);
        if(hn===hc){ pwMsg.textContent = "a nova é igual à atual"; pwGo.disabled = false; return; }
        pwMsg.textContent = "trocando no servidor novo...";
        let zunBackOk = false, zunBackWarn = "";
        if(window.ZunBackend && window.ZunBackend.configured()){
          try{
            try{ await window.ZunBackend.loginOnly(me.nick, c); }
            catch(eL){
              // sem conta lá ainda: o próximo "criar/entrar" registra sozinho;
              // tenta se a nova já vale lá (troca anterior parou no meio).
              try{ await window.ZunBackend.loginOnly(me.nick, n1); }
              catch(eN){ throw eL; }
            }
            await window.ZunBackend.changePassword(c, n1);
            try{ await window.ZunBackend.loginOnly(me.nick, n1); }catch(e){}
            zunBackOk = true;
          }catch(be){
            let bc = String((be && be.code)||"");
            zunBackWarn = bc==="rate" ? "servidor novo com limite — tente de novo em segundos"
              : bc==="sem-vinculo" ? "servidor novo sem vínculo"
              : "servidor novo não acompanhou (senha de lá diferente)";
          }
        } else { zunBackOk = true; }
        pwMsg.textContent = "trocando...";
        let r = JSON.parse(await rpc("pwChange", JSON.stringify({nick:me.nick, hash:me.hash, proof:hc, newHash:hn, newLen:n1.length})));
        if(!r.ok){
          pwMsg.textContent = r.err==="rate" ? "devagar, aguarde uns segundos e tente de novo" : r.err==="igual" ? "a nova é igual à atual" : r.err==="auth" ? "sessão inválida — entre de novo" : r.err==="atual" ? "senha atual errada" : r.err==="senha-curta" ? "nova senha precisa de 8+ letras" : r.err==="confirme" ? "entre de novo e tente outra vez" : "erro ao trocar ("+(r.err||"?")+")";
          pwGo.disabled = false; return;
        }
        /* servidor derrubou todas as sessões: vincula um token novo */
        let cred = null;
        /* E2E: re-lacra a custódia com a NOVA senha (tem hn aqui, em memória) */
        try{ if(window.ZunDME2E && window.ZunDME2E.setPwHash){ window.ZunDME2E.setPwHash(hn); await window.ZunDME2E.syncBackup(true); } }catch(e2){}
        try{
          let tk = newSessToken();
          if(tk){ let sl = JSON.parse(await rpc("sessLogin", JSON.stringify({nick:me.nick, hash:hn, token:tk}))); if(sl && sl.ok && sl.token) cred = sl.token; }
        }catch(e2){}
        if(cred){ me.hash = cred; setSession(me); }
        else { try{ doLogout(); }catch(e3){} pwMsg.textContent = "senha trocada! ✅ entre de novo com a nova senha"; pwGo.disabled = false; return; }
        pwCur.value = ""; pwNew.value = ""; pwNew2.value = "";
        pwMsg.textContent = "senha trocada! ✅ outros aparelhos vão precisar entrar de novo" + (zunBackOk ? " (servidor novo junto ✅)" : (zunBackWarn ? " — " + zunBackWarn + " (modo compatível; cofre pede reset quando o servidor voltar)" : ""));
      }catch(e){ pwMsg.textContent = "sem conexao"; }
      pwGo.disabled = false;
    };
    pwBox.append(pwCur, pwNew, pwNew2, pwGo, pwMsg);
    authBox.append(pwTgl, pwBox);
  } else {
    let n = document.createElement("input"); n.placeholder = "nick";
    let p = document.createElement("input"); p.placeholder = "senha"; p.type = "password"; p.style.marginTop = "6px";
    let capBox = document.createElement("div");
    let b = document.createElement("button"); b.textContent = "criar / entrar"; b.style.marginTop = "6px";
    let e = document.createElement("div"); e.className = "meta";
    b.onclick = async ()=>{
      if(b.disabled) return;
      let nick = n.value.trim().replace(/\s+/g,"-").slice(0,20), pw = p.value;
      if(nick.length<2 || pw.length<8){ e.textContent = "nick 2+ e senha 8+ (frase longa)"; return; }
      if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick) || /^(prototype|__proto__|constructor)$/i.test(nick)){ e.textContent = "nick só pode letras, números, - e _ (2 a 20, sem espaço)"; return; }
      if(nick.toLowerCase()==="zunzunzinha" || nick.toLowerCase().replace(/[-_]/g,"")==="zunzunzinha"){ e.textContent = "esse nick é reservado"; return; }
      b.disabled = true; var _bl = b.textContent; b.textContent = "aguarde... ⏳";
      function _fail(t){ try{ e.textContent = t; b.textContent = _bl; b.disabled = false; }catch(_){} }
      e.textContent = "verificando captcha...";
      let cz2 = await zunCaptchaTakeH(capH2, nick);
      if(!cz2.zcap){ _fail("complete o captcha (arraste a barra até ficar verde)"); return; }
      try{
        e.textContent = "criando ou entrando na conta...";
        let h = await hashPw(pw);
        let ref = "";
        try{
          ref = window.zunzumInviteRef || "";
          if(!ref){
            let q = new URLSearchParams(location.search);
            ref = q.get("convite")||q.get("ref")||q.get("c")||"";
          }
          if(!ref) ref = localStorage.getItem("zunzumRef")||"";
          ref = String(ref||"").replace(/^@/,"").slice(0,20);
          if(ref.toLowerCase()===nick.toLowerCase()) ref = "";
        }catch(e2){ ref = ""; }
        let r = JSON.parse(await rpc("register", JSON.stringify({nick, hash:h, ref, pwLen:pw.length, captcha:cz2.captcha, zcap:cz2.zcap})));
        if(!r.ok){ if(r.err==="captcha" && capH2 && capH2.zh){ try{ capH2.zh.reset(); }catch(eR){} } _fail(r.err==="senha" ? "senha errada" : r.err==="senha-curta" ? "senha precisa de 8+ letras" : r.err==="nick" ? "nick só pode letras, números, - e _ (2 a 20, sem espaço)" : r.err==="reservado" ? "esse nick é reservado" : r.err==="nick-taken" ? "esse nick já está em uso" : r.err==="dono" ? "conta de teste: só o dono pode criar" : r.err==="captcha" ? "captcha inválido, arraste de novo e tente" : "erro: "+r.err); return; }
        /* sessão opaca: o hash morre aqui — guardamos só o token revogável */
        let cred = h;
        e.textContent = "entrando...";
        try{
          let tk = newSessToken();
          if(tk){
            let sl = JSON.parse(await rpc("sessLogin", JSON.stringify({nick, hash:h, token:tk})));
            if(sl && sl.ok && sl.token) cred = sl.token;
          }
        }catch(e2){}
        me = {nick:r.nick, hash:cred, created:r.created, avatar:r.avatar||"", fx:r.fx||"", ns:r.ns||null, del:r.del||0}; setSession(me);
        /* E2E custódia v2: senha digitada agora (memória) lacra/migra o backup —
           aparelho novo restaura com a senha, mesmo após troca. Nunca trava login. */
        try{ if(window.ZunDME2E && window.ZunDME2E.setPwHash){ window.ZunDME2E.setPwHash(h); window.ZunDME2E.syncBackup(true).catch(()=>{}); } }catch(e2){}
        /* MIG v1: conta nova já nasce migrada (senha fresca + backend); conta
           antiga cai no painel de recriação antes de usar o app */
        try{
          let cv = JSON.parse(await rpc("cliVer",""));
          if(cv && cv.ok){ if((cv.v|0) > CLI_BUILD){ try{ location.reload(); }catch(eR){} return; } if(cv.mig) MIG_FLAG = 1; }
        }catch(eCv){}
        /* vínculo extra (2026-10-27): conta nova E existente tentam garantir a
           conta vinculada. Falha aqui não trava o login no site — e NUNCA
           mostra motivo técnico (código interno) p/ não confundir. */
        var _backNote = "";
        if(window.ZunBackend && window.ZunBackend.configured()){
          try{
            var _bj = await window.ZunBackend.login(nick, pw, cz2.zcap);
            migMark(nick);
            if(_bj && _bj.linkErr) _backNote = "conta pronta! ✅ (recurso extra em modo compatível)";
          }catch(eB){
            var _bec0 = String((eB && eB.code)||"");
            if(_bec0==="rate") _backNote = "devagar — conta criada, aguarde uns segundos e entre de novo";
            else if(_bec0==="captcha") _backNote = "captcha inválido, arraste de novo e tente";
            else if(_bec0==="sem-vinculo"||_bec0==="nick-divergente") _backNote = "conta criada! ✅ (vínculo pendente — avise o dono)";
            else if(_bec0==="bonto-fora"||_bec0==="backend-off"||_bec0===""||_bec0==="erro") _backNote = "";
            else _backNote = "conta criada! ✅ (modo compatível)";
          }
        }
        if(r.weak || (MIG_FLAG && !migDone(nick))){ pendingMigNick = nick; try{ localStorage.removeItem("zunMigV1:"+String(nick||"").toLowerCase()); }catch(_eMW){} await doLogout(); showMigPanel(); return; }
        if(r.restored){ try{ e.textContent = "exclusão cancelada — bem-vindo de volta! 🎉"; }catch(e2){} }
        else { try{ e.textContent = _backNote || "bem-vindo! 🎉"; }catch(e2){} }
        try{ b.textContent = _bl; b.disabled = false; }catch(e2){}
        try{ if(me && me.nick) znickCache[me.nick.toLowerCase()] = me.ns||null; }catch(e2){}
        paintMe(); paintLocks(); loadPub(); loadPriv(); subDepo(); subInv(); subAppr(); autoJoinPriv(); autoJoinRoom(); loadRooms(); loadPendingInvites(); loadPendingReqs(); loadPresence(); checkPendingDepo(); try{ if(window.ZunMural&&window.ZunMural.checkOwn) window.ZunMural.checkOwn(); }catch(e){} autoPublishMe();
        try{ ensureDono(); }catch(e2){}
        try{ if(window.zunDMOnLogin) window.zunDMOnLogin(); }catch(e2){}
      }catch(err){ _fail("sem servidor ainda — tente de novo"); }
    };
    authBox.append(n, p, capBox, b, e);
    var capH2 = zunCaptchaMount(capBox, ()=>{ try{ return n.value.trim(); }catch(e){ return ""; } });
  }
  try{ paintAnonRow(); }catch(e){}
}
function paintAnonRow(){
  let row = null;
  try{ row = document.getElementById("anonRow"); }catch(e){}
  if(!row) return;
  row.innerHTML = "";
  if(me){ row.hidden = true; return; }
  row.hidden = false;
  row.appendChild(document.createTextNode("você posta como "));
  let b = document.createElement("b"); b.textContent = anonId; row.appendChild(b);
  row.appendChild(document.createTextNode(" "));
  let btn = document.createElement("button");
  btn.textContent = "🔄 trocar p/ cortar rasto";
  btn.title = "gera um novo anon-xxxx; posts antigos continuam com o antigo (tokens guardados aqui). Fale à vontade sem mostrar o rosto.";
  btn.style.marginLeft = "4px";
  btn.onclick = ()=>{ renewAnon(); };
  row.appendChild(btn);
  try{
    let hasTok = !!anonTokGet(anonId);
    let st = document.createElement("span"); st.className = "meta"; st.style.marginLeft = "6px";
    st.textContent = hasTok ? "🔑 protegido" : "🔓 novo (token nasce no 1º post)";
    st.title = hasTok ? "este navegador tem o token deste anon: só aqui dá p/ editar/apagar" : "no primeiro post/like/resposta o servidor te dá um token secreto";
    row.appendChild(st);
    let mgr = document.createElement("button"); mgr.textContent = "🔑 tokens"; mgr.style.marginLeft = "4px";
    mgr.title = "ver/copiar/exportar tokens de anon (trocar de aparelho sem perder edição)";
    mgr.onclick = ()=>{ try{ anonTokPanel(); }catch(e){} };
    row.appendChild(mgr);
  }catch(e){}
}
function zunCopyText(txt, statusEl, trFn){
  /* copia-e-cola sem alert: tenta o clipboard e avisa inline; se falhar,
     o campo já vem selecionado p/ Ctrl+C manual. */
  let T = (typeof trFn === "function") ? trFn : function(x){ try{ if(typeof window!=="undefined" && typeof window.zunzumTr==="function") return window.zunzumTr(x); }catch(e){} return x; };
  function done(ok){
    try{ if(statusEl) statusEl.textContent = ok ? T("copiado ✅") : T("não copiou sozinho — selecione o campo e use Ctrl+C"); }catch(e){}
  }
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(String(txt||"")).then(function(){ done(true); }, function(){ done(false); });
      return;
    }
    throw 0;
  }catch(e){
    try{
      let ta = document.createElement("textarea");
      ta.value = String(txt||""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      let ok = false;
      try{ ok = document.execCommand("copy"); }catch(e2){}
      try{ ta.remove(); }catch(e3){}
      done(!!ok);
    }catch(e4){ done(false); }
  }
}
function anonTokPanel(){
  /* painel copia-e-cola (sem alert/prompt): token em campo selecionável +
     botão copiar, export em área de texto e import por colagem.
     i18n: todo texto visível passa por T() (zunzumTr) — o observer do i18n
     traduz o que entra no DOM, e o T() cobre os status setados depois
     (textContent tardio não passa pelo observer). Cabeçalho com .zun-mhead
     (cura 4.5:1 do zunfix) + zunHealRoot explícito no cartão (filho direto
     do body não entra nas raízes curadas). */
  try{
    let T = function(s){ try{ if(typeof window!=="undefined" && typeof window.zunzumTr==="function") return window.zunzumTr(s); }catch(e){} return s; };
    try{ let _old = document.getElementById("zunTokPanel"); if(_old) _old.remove(); }catch(e){}
    let s = anonTokStore();
    let owns = Object.keys(s.own||{}), items = Object.keys(s.items||{});
    let myTok = anonTokGet(anonId);
    let box = document.createElement("div"); box.id = "zunTokPanel";
    /* neobrutalismo+festa: inline é só layout (posição/tamanho); cores,
       borda, sombra e campos vêm do #zunNeoCss (dia/noite) e das vars
       --zf-* da festa (src/festas.js) — igual ao nodal. */
    box.style.cssText = "position:fixed;left:50%;top:12%;transform:translateX(-50%);z-index:99999;padding:12px;max-width:min(440px,92vw);text-align:left";
    let head = document.createElement("div");
    head.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:8px";
    let tt = document.createElement("h3"); tt.className = "zun-mhead"; tt.style.margin = "0"; tt.textContent = T("🔑 tokens do anon"); head.appendChild(tt);
    let cx = document.createElement("button"); cx.textContent = "x"; cx.title = T("fechar");
    cx.onclick = ()=>{ try{ box.remove(); }catch(e){} };
    head.appendChild(cx); box.appendChild(head);
    let info = document.createElement("div"); info.className = "meta"; info.style.marginBottom = "4px";
    info.appendChild(document.createTextNode(T("você posta como")+" "));
    let anb = document.createElement("b"); anb.textContent = anonId; info.appendChild(anb);
    box.appendChild(info);
    let stLine = document.createElement("div"); stLine.className = "meta"; stLine.style.marginBottom = "4px";
    stLine.textContent = myTok ? T("identidade guardada ✅ (só este navegador edita/apaga)") : T("identidade ainda não (nasce no 1º post/like)");
    box.appendChild(stLine);
    let cntLine = document.createElement("div"); cntLine.className = "meta"; cntLine.style.marginBottom = "4px";
    cntLine.appendChild(document.createTextNode(String(owns.length)+" "));
    cntLine.appendChild(document.createTextNode(T("anons")+" · "));
    cntLine.appendChild(document.createTextNode(String(items.length)+" "));
    cntLine.appendChild(document.createTextNode(T("itens")));
    box.appendChild(cntLine);
    function lab(t){ let d = document.createElement("div"); d.style.cssText = "font-size:12px;margin:8px 0 2px"; d.textContent = T(t); box.appendChild(d); return d; }
    function statLine(){ let d = document.createElement("div"); d.className = "meta"; d.style.minHeight = "1em"; box.appendChild(d); return d; }
    function copyRow(field){
      let r = document.createElement("div"); r.style.cssText = "display:flex;gap:6px";
      r.appendChild(field);
      try{ field.style.flex = "1 1 auto"; field.style.minWidth = "0"; }catch(e){}
      let cp = document.createElement("button"); cp.textContent = T("copiar"); cp.style.flex = "0 0 auto";
      let st = statLine();
      cp.onclick = ()=>{ try{ field.focus(); field.select(); }catch(e){} zunCopyText(field.value, st, T); };
      r.appendChild(cp); box.appendChild(r);
      return st;
    }
    lab("token do anon atual (cole no outro aparelho via importar):");
    if(myTok){
      let inp = document.createElement("input"); inp.readOnly = true; inp.value = myTok;
      inp.onclick = ()=>{ try{ inp.select(); }catch(e){} };
      copyRow(inp);
      try{ inp.focus(); inp.select(); }catch(e){}
    } else {
      let d = document.createElement("div"); d.className = "meta"; d.textContent = T("sem token ainda — poste algo primeiro."); box.appendChild(d);
    }
    lab("exportar tudo (backup p/ trocar de aparelho):");
    let exp = document.createElement("textarea"); exp.readOnly = true; exp.rows = 3;
    exp.style.width = "100%"; exp.value = JSON.stringify(s);
    exp.onclick = ()=>{ try{ exp.select(); }catch(e){} };
    copyRow(exp);
    lab("importar (cole o backup do outro aparelho):");
    let imp = document.createElement("textarea"); imp.rows = 3; imp.style.width = "100%";
    imp.placeholder = T("cole aqui o backup exportado");
    box.appendChild(imp);
    let impRow = document.createElement("div"); impRow.style.cssText = "display:flex;gap:6px;margin-top:4px";
    let ib = document.createElement("button"); ib.textContent = T("importar");
    let ist = document.createElement("span"); ist.className = "meta";
    ib.onclick = ()=>{
      try{
        let txt = String(imp.value||"").trim();
        if(!txt) throw "vazio";
        let o = JSON.parse(txt);
        if(!o || typeof o!=="object" || Array.isArray(o)) throw "forma";
        let clean = anonTokSanitize(o);
        if(clean.n<=0) throw "sem-token";
        /* merge (não sobrescreve): tokens deste aparelho são preservados;
           o backup completa/atualiza por chave (import vence por chave). */
        let cur = anonTokStore();
        let merged = {own:Object.assign({}, (cur&&cur.own)||{}), items:Object.assign({}, (cur&&cur.items)||{})};
        Object.assign(merged.own, clean.own);
        Object.assign(merged.items, clean.items);
        anonTokSave(merged);
        ist.textContent = T("tokens importados! ✅") + " (" + clean.n + (clean.dropped ? ", " + clean.dropped + " inválidos ignorados" : "") + ")";
        try{ paintAnonRow(); }catch(e){}
      }catch(e){ ist.textContent = T("backup inválido"); }
    };
    impRow.appendChild(ib); impRow.appendChild(ist); box.appendChild(impRow);
    document.body.appendChild(box);
    /* fora das raízes do healer: cura explícita do cartão */
    try{ if(window.zunHealRoot) window.zunHealRoot(box); }catch(e){}
    try{ if(window.zunHealModalHeaders) window.zunHealModalHeaders(); }catch(e){}
  }catch(e){}
}
function paintLocks(){
  pubLock.textContent = ztr(me ? "logado como @"+me.nick : "entre com nick+senha a esquerda.");
  try{
    if(me && curRole && curRole.banned) pubLock.textContent = ztr("🚫 você foi banido desta sala.");
    else if(me && pubRoom && pubRoom!=="geral"){ let rn = curRoomMeta && curRoomMeta.name ? curRoomMeta.name : pubRoom; pubLock.textContent = ztr("logado como @"+me.nick+" em "+rn); }
  }catch(e){}
  let locked = privInfo.locked && privRoom ? 1 : 0;
  let isOwner = me && privRoom && privInfo.owner && privInfo.owner.toLowerCase()===me.nick.toLowerCase() ? 1 : 0;
  let canRead = !locked || privInfo.member || isOwner ? 1 : 0;
  if(!me) privLock.textContent = ztr("precisa logar.");
  else if(!privRoom) privLock.textContent = ztr("entre numa sala.");
  else if(locked && !canRead) privLock.textContent = ztr("🔒 sala trancada por @"+privInfo.owner+" — só entra quem ele aprovar.");
  else if(locked) privLock.textContent = ztr("🔒 sala trancada (só aprovados leem)");
  else privLock.textContent = ztr("🔓 sala: "+privRoom+" (aberta p/ quem tem o código)");
  try{
    if(me && privRoom){
      if(privInfo && privInfo.claimed) privLock.textContent += ztr(" · 🏠 você assumiu esta sala órfã — tranque e guarde o código.");
      else if(privInfo && privInfo.owner==="" ) privLock.textContent += ztr(" · 🏠 sem dono — peça p/ assumir.");
      if(privRoom && !privIsStrong(privRoom)) privLock.textContent += ztr(" · ⚠️ código fraco (anti-clone: gere um forte).");
    }
  }catch(e){}
  try{ paintPrivStrength(); }catch(e){}
  try{
    privLockRow.hidden = !(isOwner && privRoom);
    if(isOwner){
      privLockBtn.textContent = privInfo.locked ? "🔒 trancada — clique p/ abrir" : "🔓 aberta — clique p/ trancar";
      privOwnerEl.textContent = "você é o dono da sala";
    }
    privAskRow.hidden = !(me && privRoom && locked && !canRead);
  }catch(e){}
  let roomBanned = !!(me && typeof curRole!=="undefined" && curRole && curRole.banned);
  pubBtn.disabled = !me || roomBanned; privSendBtn.disabled = !me || (locked && !canRead ? true : false);
  try{ if(pubModBtn) pubModBtn.hidden = !(me && typeof curRole!=="undefined" && curRole && (curRole.owner||curRole.mod) && pubRoom && pubRoom!=="geral"); }catch(e){}
}
async function togglePrivLock(){
  if(!me || !privRoom) return;
  try{
    let r = JSON.parse(await rpc("privLock", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom, lock:privInfo.locked?0:1})));
    if(r.ok){ privInfo.locked = r.locked?1:0; privInfo.member = 1; paintLocks(); cInv("privGet"); loadPriv(true); }
  }catch(e){}
}
async function askPrivAccess(){
  if(!me || !privRoom) return;
  try{ privAskBtn.disabled = true; privAskBtn.textContent = "enviando..."; }catch(e){}
  try{
    let r = JSON.parse(await rpc("privReq", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom})));
    if(r.member){ privInfo.member = 1; cInv("privGet"); loadPriv(true); paintLocks(); return; }
    if(r.ok){ try{ privAskBtn.textContent = "pedido enviado ✅ aguarde"; }catch(e){} return; }
    if(r.err==="aberta" || r.err==="livre"){ cInv("privGet"); loadPriv(true); paintLocks(); return; }
  }catch(e){}
  try{ privAskBtn.disabled = false; privAskBtn.textContent = "pedir pra entrar"; }catch(e2){}
}
function esc(s){ let d = document.createElement("div"); d.textContent = s; return d.innerHTML; }
/* escAttr: para dentro de atributo entre aspas duplas. esc() sozinho NAO
   escapa " e ' (textContent->innerHTML mantem), entao "a\"onclick=" quebrava
   src="...". Hoje okUrlStrict bloqueia ", mas defesa em profundidade exige
   escapar aqui tambem (dado legado/contaminado nao pode virar stored-XSS). */
function escAttr(s){ return String(s==null?"":s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function guessMime(u){
  let s = String(u||"").split("?")[0].split("#")[0].toLowerCase();
  if(/\.(png|jpe?g|gif|webp|bmp)$/.test(s)) return "image/*";
  if(/\.(mp4|webm|mov|ogv)$/.test(s)) return "video/*";
  if(/\.(mp3|ogg|oga|wav|m4a)$/.test(s)) return "audio/*";
  return "";
}
/* YouTube no feed vira player embarcado (fachada leve -> iframe só ao clicar). */
function ytIdFromUrl(u){
  try{
    let s = String(u||"").trim().replace(/[.,!?;:)\]]+$/, "");
    let m = s.match(/^(?:https?:\/\/)?(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?[^#\s]*|shorts\/|embed\/|live\/)|youtu\.be\/)([^\s&#?\/]+)/i);
    if(!m) return null;
    let id = "", start = 0;
    if(/youtu\.be\//i.test(s)){
      id = (m[1]||"").slice(0, 11);
      let tm = s.match(/[?&#](?:t|start)=([^&#\s]+)/i);
      start = ytParseStart(tm ? tm[1] : "");
    } else if(/youtube\.com\/watch/i.test(s)){
      let vm = s.match(/[?&#]v=([^&#\s]+)/i);
      id = (vm ? vm[1] : "").slice(0, 11);
      let tm = s.match(/[?&#](?:t|start)=([^&#\s]+)/i);
      start = ytParseStart(tm ? tm[1] : "");
    } else {
      id = (m[1]||"").slice(0, 11);
      let tm = s.match(/[?&#](?:t|start)=([^&#\s]+)/i);
      start = ytParseStart(tm ? tm[1] : "");
    }
    if(!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
    return {id:id, start:start};
  }catch(e){ return null; }
}
function ytParseStart(t){
  try{
    t = String(t||"").trim();
    if(!t) return 0;
    if(/^\d+$/.test(t)) return Math.min(99999, parseInt(t, 10));
    let m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/i);
    if(!m || (!m[1] && !m[2] && !m[3])) return 0;
    return Math.min(99999, (parseInt(m[1]||"0",10)*3600)+(parseInt(m[2]||"0",10)*60)+parseInt(m[3]||"0",10));
  }catch(e){ return 0; }
}
function ytEmbedUrl(id, start, auto){
  /* Embed idêntico ao que o próprio YouTube gera (oEmbed): /embed/ID?rel=0
     + start/autoplay. Sem enablejsapi/origin — que não usamos e que em
     alguns vídeos disparam erro 153 ("Video player configuration error").
     NUNCA youtube-nocookie: ele causa erro 153 em muitos vídeos. */
  let u = "https://www.youtube.com/embed/"+id+"?rel=0"+(auto?"&autoplay=1":"");
  if(start > 0) u += "&start="+start;
  return u;
}
function ytFacade(id, start){
  let d = document.createElement("div");
  d.className = "ytFac"; d.dataset.ytid = id;
  function play(){
    try{
      if(d.dataset.playing) return;
      d.dataset.playing = "1";
      if(!window._ytAuto) window._ytAuto = new Set();
      window._ytAuto.add(id);
      let watch = "https://www.youtube.com/watch?v="+id+(start>0?"&t="+start+"s":"");
      d.innerHTML = "";
      let f = document.createElement("iframe");
      f.src = ytEmbedUrl(id, start, true);
      f.title = "vídeo do YouTube";
      f.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share");
      f.setAttribute("allowfullscreen", "");
      f.setAttribute("loading", "lazy");
      f.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
      d.appendChild(f);
      /* Fallback permanente: se o dono do vídeo bloquear incorporação
         (erros 101/150/153), o usuário ainda abre no YouTube. */
      let a2 = document.createElement("a");
      a2.className = "ytOpen"; a2.href = watch;
      a2.target = "_blank"; a2.rel = "noopener noreferrer"; a2.textContent = "YouTube ↗";
      a2.onclick = function(ev){ ev.stopPropagation(); };
      d.appendChild(a2);
    }catch(e){}
  }
  if(window._ytAuto && window._ytAuto.has(id)){ play(); return d; }
  let im = document.createElement("img");
  im.dataset.yt = "1"; im.referrerPolicy = "no-referrer"; im.loading = "lazy"; im.alt = "prévia do vídeo";
  im.src = "https://i.ytimg.com/vi/"+id+"/hqdefault.jpg";
  im.onerror = function(){
    try{
      if(!im.dataset.fbk){ im.dataset.fbk = "1"; im.src = "https://i.ytimg.com/vi/"+id+"/mqdefault.jpg"; }
      else im.remove();
    }catch(e){}
  };
  let b = document.createElement("button");
  b.type = "button"; b.className = "ytPlay"; b.setAttribute("aria-label", "assistir vídeo");
  b.textContent = "▶";
  let a = document.createElement("a");
  a.className = "ytOpen"; a.href = "https://www.youtube.com/watch?v="+id+(start>0?"&t="+start+"s":"");
  a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "YouTube";
  a.onclick = function(ev){ ev.stopPropagation(); };
  d.append(im, b, a);
  d.addEventListener("click", function(ev){ if(ev.target === a) return; play(); });
  return d;
}
function ytFacadesFor(text, maxN){
  let out = [], seen = {};
  try{
    let re = /(https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?[^#\s]*|shorts\/|embed\/|live\/)|youtu\.be\/)[^#\s]*)/gi;
    let m, n = 0;
    while((m = re.exec(String(text||""))) && n < (maxN||2)){
      let y = ytIdFromUrl(m[1]);
      if(y && !seen[y.id]){ seen[y.id] = 1; out.push(ytFacade(y.id, y.start)); n++; }
    }
  }catch(e){}
  return out;
}
/* ---------- SOMENTE vídeos: estaciona e reencaixa players ao vivo ---------- */
/* Qualquer repaint que destrua nós (post editado, troca de login, reply nova
   que rebuilda a lista de respostas) matava o iframe do YouTube / <video> em
   reprodução — o vídeo recarregava e parava. O guard estaciona o player AO
   VIVO num canto fora da tela (mesmo documento = o iframe NÃO recarrega nem
   pausa) antes da destruição e reencaixa cada um no lugar da fachada nova
   com o mesmo vídeo depois. Sem par correspondente, o estacionado é
   descartado na hora (nunca vaza áudio invisível). Vale p/ posts e respostas,
   e p/ <video> direto (mp4) salva/restaura a posição. */
let _zunVPark = null;
function zunVideoLot(){
  try{
    if(_zunVPark && _zunVPark.isConnected) return _zunVPark;
    _zunVPark = document.createElement("div");
    _zunVPark.id = "zunVideoPark";
    _zunVPark.setAttribute("aria-hidden","true");
    _zunVPark.style.cssText = "position:fixed!important;left:-99999px!important;top:0!important;width:4px!important;height:4px!important;overflow:hidden!important;opacity:0!important;pointer-events:none!important;";
    document.body.appendChild(_zunVPark);
    return _zunVPark;
  }catch(e){ return null; }
}
function zunVideoScopeOf(fac){
  /* "m" = corpo do post; "r" = lista de respostas (com rid quando há). */
  try{
    let fr = fac.closest ? fac.closest(".freply") : null;
    if(fr) return {scope:"r", rid:(fr.dataset && fr.dataset.rid)||""};
  }catch(e){}
  return {scope:"m", rid:""};
}
/* Estaciona fachadas tocando + posição de <video> dentro de `root`. */
function zunVideoStash(root){
  let out = [];
  try{
    if(!root || !root.querySelectorAll) return out;
    let hasLive = root.querySelector(".ytFac[data-playing] iframe");
    let hasVid = false;
    try{ hasVid = !!root.querySelector("video"); }catch(e){}
    if(!hasLive && !hasVid) return out;
    let lot = zunVideoLot(); if(!lot) return out;
    root.querySelectorAll(".ytFac[data-playing]").forEach(function(fac){
      try{
        if(!fac.querySelector("iframe")) return;
        let ytid = (fac.dataset && fac.dataset.ytid) || ""; if(!ytid) return;
        let sc = zunVideoScopeOf(fac);
        out.push({kind:"yt", scope:sc.scope, rid:sc.rid, ytid:ytid, node:fac});
        lot.appendChild(fac);
      }catch(e){}
    });
    root.querySelectorAll("video").forEach(function(v){
      try{
        let src = v.currentSrc || v.getAttribute("src") || v.src || "";
        if(!src) return;
        let t = 0, playing = false;
        try{ t = v.currentTime||0; playing = !v.paused && !v.ended; }catch(e){}
        if(!(t>0.5) && !playing) return;
        let sc = zunVideoScopeOf(v);
        out.push({kind:"v", scope:sc.scope, rid:sc.rid, src:String(src).split("#")[0], t:t, playing:playing});
      }catch(e){}
    });
  }catch(e){}
  return out;
}
/* Reencaixa o estacionado no post/resposta novo (mesmo ytid/src). */
function zunVideoUnstash(root, stashed){
  try{
    if(!root || !root.querySelector || !stashed || !stashed.length) return;
    stashed.forEach(function(s){
      try{
        let scopeEl = null;
        if(s.scope==="m"){
          try{ scopeEl = root.querySelector(":scope > .pbody") || root; }catch(e){ scopeEl = root; }
        } else {
          try{ scopeEl = s.rid ? root.querySelector('.freply[data-rid="'+s.rid+'"]') : null; }catch(e){ scopeEl = null; }
          if(!scopeEl) scopeEl = root;
        }
        if(!scopeEl || !scopeEl.isConnected){ if(s.node){ try{ s.node.remove(); }catch(e){} } return; }
        if(s.kind==="yt"){
          let ph = null;
          try{ ph = scopeEl.querySelector('.ytFac[data-ytid="'+s.ytid+'"]:not([data-playing])') || scopeEl.querySelector('.ytFac[data-ytid="'+s.ytid+'"]'); }catch(e){}
          /* o fresh pode ter dado autoplay via _ytAuto (vira "playing" sem
             iframe útil): mesmo assim troca pelo nó ao vivo original. */
          if(ph && ph.isConnected && s.node && ph!==s.node){ ph.replaceWith(s.node); }
          else if(s.node && (!ph || ph!==s.node)){ try{ s.node.remove(); }catch(e){} }
        } else if(s.kind==="v"){
          let tgt = null;
          try{
            let vs = scopeEl.querySelectorAll("video");
            for(let i=0;i<vs.length;i++){
              let cs = "";
              try{ cs = String(vs[i].currentSrc || vs[i].getAttribute("src") || vs[i].src || "").split("#")[0]; }catch(e){}
              if(cs && cs===s.src){ tgt = vs[i]; break; }
            }
            if(!tgt && vs.length===1) tgt = vs[0];
          }catch(e){}
          if(tgt){
            try{
              let apply = function(){
                try{ if(s.t>0.5 && isFinite(s.t)) tgt.currentTime = s.t; }catch(e){}
                if(s.playing){ try{ let pr = tgt.play(); if(pr && pr.catch) pr.catch(function(){}); }catch(e){} }
              };
              if(tgt.readyState >= 1) apply();
              else tgt.addEventListener("loadedmetadata", apply, {once:true});
            }catch(e){}
          }
        }
      }catch(e){ try{ if(s.node) s.node.remove(); }catch(_e){} }
    });
  }catch(e){}
}
function fmtChat(s){
  let h = esc(s||"");
  /* citação/quote [q=@nick]trecho[/q]: processada PRIMEIRO (logo após o esc,
     antes dos outros BBCode) p/ o BBCode interno ([b], link https, menção)
     continuar valendo dentro da citação. Segurança: nick restrito a
     [A-Za-z0-9-_]{2,20} (interpolado sem aspas/atributo — fora disso a tag é
     descartada e só o miolo aparece como texto); o miolo já vem escapado e o
     wrapper usa só classes fixas, sem nenhum dado do usuário em atributo;
     marcadores [q] aninhados são removidos do miolo (sem aninhamento).
     Limite natural: mensagem tem teto de 500 chars. Ver SECURITY.md §1. */
  for(let _qi = 0; _qi < 3; _qi++){
    let _nh = h.replace(/\[q=@([A-Za-z0-9-_]{2,20})\]([\s\S]*?)\[\/q\]/gi, function(m, n, t){ t = String(t).replace(/\[\/?q(?:=@[A-Za-z0-9-_]{2,20})?\]/gi, ""); return '<blockquote class="zquote"><span class="zq-nick">@'+n+'</span><span class="zq-txt">'+t+"</span></blockquote>"; });
    if(_nh === h) break;
    h = _nh;
  }
  h = h.replace(/\[q=[^\]]*\]([\s\S]*?)\[\/q\]/gi, "$1"); /* nick inválido: tag some, miolo fica como texto (2x: cobre [q] inválido aninhado) */
  h = h.replace(/\[q=[^\]]*\]([\s\S]*?)\[\/q\]/gi, "$1");
  h = h.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<b>$1</b>").replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<i>$1</i>").replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>").replace(/\[s\]([\s\S]*?)\[\/s\]/gi, "<s>$1</s>").replace(/\[c=([#A-Za-z0-9]+)\]([\s\S]*?)\[\/c\]/gi, function(m,c,t){ if(/^#[0-9a-fA-F]{6}$/.test(c)) return '<span style="color:'+c.toLowerCase()+'">'+t+"</span>"; var _safe=["red","blue","green","black","white","gray","grey","yellow","orange","pink","purple","brown","cyan","magenta","lime","maroon","navy","olive","teal","violet","indigo"]; if(_safe.indexOf(String(c).toLowerCase())>=0) return '<span style="color:'+String(c).toLowerCase()+'">'+t+"</span>"; return t; });
  h = h.replace(/(https:\/\/[^\s<"]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  let my = me ? me.nick.toLowerCase() : "";
  h = h.replace(/(^|\s)@([A-Za-z0-9-_]{2,20})/g, function(m, sp, n){ return sp+'<span class="'+(n.toLowerCase()===my?"mention-me":"mention")+'">@'+n+"</span>"; });
  h = h.replace(/\[size=(\d{1,2})\]([\s\S]*?)\[\/size\]/gi, function(m, num, t){ num = parseInt(num,10); if(!(num>=10&&num<=32)) return t; return '<span style="font-size:'+num+'px">'+t+"</span>"; });
  h = h.replace(/\[f=([A-Za-z ]{2,24})\]([\s\S]*?)\[\/f\]/gi, function(m, fn, t){ fn = String(fn||"").replace(/['";:()]/g,"").trim(); var _ok=["Verdana","Arial","Georgia","Trebuchet MS","Courier New","Comic Sans MS","Impact","Palatino","Tahoma","Times New Roman","monospace","cursive","fantasy","system-ui"]; if(_ok.indexOf(fn)<0) return t; return '<span style="font-family:'+fn+',sans-serif">'+t+"</span>"; });
  return h;
}
function veladoNorm(s){ return String(s||"").toLowerCase(); }
function filtroModo(){
  try{
    var m = localStorage.getItem("zunzumFiltroModo");
    if(m==="blur"||m==="hide"||m==="show") return m;
    if(localStorage.getItem("zunzumFiltroVer")==="1") return "show";
    return "hide";
  }catch(e){ return "hide"; }
}
function filtroMostra(){ return filtroModo()==="show"; }
function filtroOculto(){ return filtroModo()==="hide"; }
function filtroIdioma(){ try{ var l = String(window.zunzumLang||"pt").slice(0,2).toLowerCase(); return (l==="en"||l==="es") ? l : "pt"; }catch(e){ return "pt"; } }
// Tradução do chrome na criação (2026-11-01): feed/chat são zona excluída do
// DOM-walker (conteúdo do usuário não pode ser tocado), então estes rótulos
// traduzem aqui. Delega p/ window.zunzumTr (dicionário + templates dinâmicos).
function ztr(s){ try{ return window.zunzumTr ? window.zunzumTr(s) : s; }catch(e){ return s; } }
function isVeladoTxt(t){
  if(!t) return false;
  let s = " "+veladoNorm(t)+" ";
  let re = new RegExp(atob("KHRlc2Fbb2ldfGdvemFyfGdvem98cHVuaGV0YXxzaXJpcmljYXxib3F1ZXRlfGNodXBhciB8Y2h1cGVpfHRyYW5zYXJ8Zm9kZXJ8dHJlcGFyfG9yZ2FzbW98Y2xpdG9yaXN8YnVjZXRhfHhvdGF8Z3JlbG98XGJwaWNhXGJ8XGJwYXVcYnxjYXJhbGhvfFxicm9sYVxifGNhY2V0ZXxwZWl0W2FvXXxzZWlvc3xidW5kYXxcYmN1XGJ8Y3V6aW5ob3xhbmFsfHNhZmFkW2FvXXxnb3N0b3NbYW9dfHBlbGFkW2FvXXxwdXRhcmlhfHB1dGFcYnxjb3Jub3xjaGlmcnxzd2luZ3xtZW5hZ2V8c3VydWJhfG9yZ2lhfG1hc3R1cmJhfGdlbWlkW2FvXXxnZW1lcnxmZXRpY2hlfGJkc218Zm9kYVxifHRlc2FvfHRlc8Ojb3xvbmx5ZmFuc3xwcml2YWN5XGJ8YWNvbXBhbmhhbnRlfGdhcm90YSBkZSBwcm9ncmFtYXxtb3RlbHxudWRlXGJ8bnVkZXN8bmFrZWR8bnNmd3xub3ZpbmhhfG5vdmluaG98XGJzZXhvXGJ8ZXJvdGljb3xlcsOzdGljb3xwb3JufHh2aWRlb3N8cmVkdHViZXxoZW50YWl8Y2FtZ2lybHx3ZWJjYW0uKnNleHxzZXguKndlYmNhbXxrYW1hIHN1dHJhfGthbWFzdXRyYXw2OVxifHBhdSBkdXJvfHBpbnRvXGJ8dmFnaW5hfHBlbmlzfHB1c3N5fGRpY2tcYnxjb2NrXGJ8Ym9vYnN8dGl0c1xifGFzc1xifHB1c3N5KQ=="));
  return re.test(s);
}
function paintVelado(outer, blurEls, kind, bare){
  if(filtroModo()==="show" || !blurEls.length) return;
  try{ blurEls.forEach(function(el){ try{ el._fltDone = true; }catch(e){} }); }catch(e){}
  var hide = (filtroModo()==="hide");
  try{ if(outer && outer.classList) outer.classList.add("zz-flt"); }catch(e){}
  blurEls.forEach(el=>{ try{ el.classList.add(hide?"zz-hide":"zz-blur"); }catch(e){} });
  if(bare) return;
  let bar = document.createElement("div"); bar.className = "zz-fltbar";
  let barTxt = hide ? "⚠️ conteúdo oculto" : "⚠️ conteúdo embaçado", showTxt = "mostrar";
  try{
    let lg = filtroIdioma();
    if(kind==="bicho"){
      if(hide){ barTxt = lg==="en" ? "🐾 costume content hidden" : (lg==="es" ? "🐾 contenido con disfraz oculto" : "🐾 conteúdo com fantasia oculto"); }
      else { barTxt = lg==="en" ? "🐾 costume content blurred" : (lg==="es" ? "🐾 contenido con disfraz difuminado" : "🐾 conteúdo com fantasia embaçado"); }
      showTxt = lg==="en" ? "show" : "mostrar";
    }
    else if(hide){ barTxt = lg==="en" ? "⚠️ content hidden" : (lg==="es" ? "⚠️ contenido oculto" : "⚠️ conteúdo oculto"); showTxt = lg==="en" ? "show" : "mostrar"; }
    else if(lg==="en"){ barTxt = "⚠️ content blurred"; showTxt = "show"; } else if(lg==="es"){ barTxt = "⚠️ contenido difuminado"; showTxt = "mostrar"; }
  }catch(e){}
  bar.appendChild(document.createTextNode(barTxt));
  let b = document.createElement("button"); b.textContent = showTxt;
  b.onclick = (ev)=>{ ev.stopPropagation(); blurEls.forEach(el=>{ try{ el.classList.remove("zz-blur"); el.classList.remove("zz-hide"); }catch(e){} }); bar.remove(); };
  bar.appendChild(b);
  outer.insertBefore(bar, outer.firstChild);
}
// Foto sem veredito nasce oculta/embaçada até a IA verificar (corrige furo do Cloudflare lento).
function paintPending(outer, im, av){
  if(filtroModo()==="show") return null;
  try{
    if(im.classList && (im.classList.contains("zz-blur")||im.classList.contains("zz-hide"))) return im._pendBar||null;
    if(im._pendBar && im._pendBar.isConnected) return im._pendBar;
  }catch(e){}
  var hide = (filtroModo()==="hide");
  try{ if(outer && outer.classList) outer.classList.add("zz-flt"); }catch(e){}
  try{ im.classList.add(hide?"zz-hide":"zz-blur"); im.setAttribute("data-flt-pend","1"); }catch(e){}
  try{ im._pendAt = Date.now(); }catch(e){}
  if(av) return null;
  let bar = document.createElement("div"); bar.className = "zz-pendbar"; bar.setAttribute("data-flt-pend-bar","1");
  try{ bar.dataset.pendAt = String(Date.now()); }catch(e){}
  let lg = filtroIdioma();
  let t = lg==="en" ? "⏳ checking photo…" : (lg==="es" ? "⏳ verificando foto…" : "⏳ verificando foto…");
  let sp = document.createElement("span"); sp.className = "spin"; bar.appendChild(sp);
  bar.appendChild(document.createTextNode(" "+t));
  try{ outer.insertBefore(bar, outer.firstChild); }catch(e){ return null; }
  try{ im._pendBar = bar; }catch(e){}
  return bar;
}
function unpaintPending(im){
  try{ im.classList.remove("zz-blur"); im.classList.remove("zz-hide"); }catch(e){}
  try{ im.removeAttribute("data-flt-pend"); }catch(e){}
  try{ if(im._pendBar && im._pendBar.parentNode) im._pendBar.parentNode.removeChild(im._pendBar); }catch(e){}
  try{ im._pendBar = null; }catch(e){}
}
// IA falhou / sem veredito: mantém protegido, mas deixa mostrar manual.
function paintUnverified(outer, im, av){
  if(filtroModo()==="show") return;
  try{ if(im) im._fltDone = true; }catch(e){}
  var hide = (filtroModo()==="hide");
  try{ if(outer && outer.classList) outer.classList.add("zz-flt"); }catch(e){}
  try{ im.classList.add(hide?"zz-hide":"zz-blur"); }catch(e){}
  if(av) return;
  let bar = null;
  try{ bar = im._pendBar && im._pendBar.isConnected ? im._pendBar : null; }catch(e){ bar = null; }
  let lg = filtroIdioma();
  let t = lg==="en" ? "⚠️ photo not verified" : (lg==="es" ? "⚠️ foto no verificada" : "⚠️ foto não verificada");
  let showTxt = lg==="en" ? "show" : "mostrar";
  if(bar){
    try{
      bar.className = "zz-fltbar"; bar.innerHTML = "";
      bar.appendChild(document.createTextNode(t));
      let b = document.createElement("button"); b.textContent = showTxt;
      b.onclick = (ev)=>{ ev.stopPropagation(); try{ im.classList.remove("zz-blur"); im.classList.remove("zz-hide"); }catch(e){} bar.remove(); try{ im._pendBar = null; }catch(e){} };
      bar.appendChild(b);
    }catch(e){}
    return;
  }
  let bar2 = document.createElement("div"); bar2.className = "zz-fltbar";
  bar2.appendChild(document.createTextNode(t));
  let b2 = document.createElement("button"); b2.textContent = showTxt;
  b2.onclick = (ev)=>{ ev.stopPropagation(); try{ im.classList.remove("zz-blur"); im.classList.remove("zz-hide"); }catch(e){} bar2.remove(); };
  bar2.appendChild(b2);
  try{ outer.insertBefore(bar2, outer.firstChild); }catch(e){}
}
function syncFiltroSel(){
  try{
    let m = filtroModo();
    let v = (m==="show");
    document.querySelectorAll(".fltTgl").forEach(c=>{ c.checked = v; });
    let lg = filtroIdioma();
    document.querySelectorAll(".fltLbl").forEach(el=>{ try{ el.textContent = lg==="en" ? "filter:" : "filtro:"; }catch(e){} });
    document.querySelectorAll(".fltModeSel").forEach(s=>{
      try{ s.value = m; }catch(e){}
      try{
        for(let i=0;i<s.options.length;i++){
          let vv = s.options[i].value;
          if(vv==="blur") s.options[i].textContent = lg==="en" ? "blur" : (lg==="es" ? "difuminar" : "embaçar");
          else if(vv==="hide") s.options[i].textContent = lg==="en" ? "hide" : "ocultar";
          else if(vv==="show") s.options[i].textContent = lg==="en" ? "show" : "ver";
        }
      }catch(e){}
    });
  }catch(e){}
}
var FILTRO_IMG_KEY = "zunzumFiltroImg2", _fltMig = false;
function filtroImgMapa(){
  try{
    if(!_fltMig){
      _fltMig = true;
      if(!localStorage.getItem(FILTRO_IMG_KEY)){
        try{
          var o = JSON.parse(localStorage.getItem("zunzumFiltroImg")||"{}"), n = {}, ks = Object.keys(o||{});
          ks.forEach(function(k){ if(o[k]===1) n[k]=1; });
          if(ks.length) localStorage.setItem(FILTRO_IMG_KEY, JSON.stringify(n));
        }catch(e){}
      }
    }
    return JSON.parse(localStorage.getItem(FILTRO_IMG_KEY)||"{}");
  }catch(e){ return {}; }
}
function filtroImgTem(u){
  try{
    var v = filtroImgMapa()[trHash(String(u||""))];
    return (v===1) ? 1 : (v===2 ? 2 : (v===0 ? 0 : null));
  }catch(e){ return null; }
}
function filtroImgGuarda(u, v){
  try{
    var m = filtroImgMapa();
    m[trHash(String(u||""))] = (v===2) ? 2 : (v?1:0);
    var ks = Object.keys(m);
    if(ks.length>300){ ks.slice(0, ks.length-300).forEach(function(k){ delete m[k]; }); }
    localStorage.setItem(FILTRO_IMG_KEY, JSON.stringify(m));
  }catch(e){}
}
let filtroFila = [], filtroOcup = 0;
function filtroVarreMidia(scope){
  if(filtroModo()==="show") return;
  try{
    scope.querySelectorAll('.post img:not([data-yt]), .chatlog img:not([data-yt]), .nmsg img:not([data-yt])').forEach(function(im){
      if(!im || im.dataset.fltScan) return;
      try{ if(im.closest && im.closest("#zEmojiPanel")){ im.dataset.fltScan = "1"; return; } }catch(e0){}
      try{ var pp = im.closest ? im.closest(".post") : null; if(pp && pp.dataset && pp.dataset.aiPost){ im.dataset.fltScan = "1"; return; } }catch(e){}
      var u = im.currentSrc || im.src || "";
      if(!u || u.indexOf("https://")!==0) return;
      im.dataset.fltScan = "1";
      var avBtn = (im.closest && im.closest(".miniAv")) || null;
      var outer = avBtn || (im.closest && (im.closest(".post") || im.closest(".chatlog > div") || im.closest(".nmsg"))) || im.parentNode;
      var hit = filtroImgTem(u);
      /* AVATAR (miniAv 20px) NUNCA esconde por falta de veredito (2026-11-02):
         o modo bare escondia a foto sem botão "mostrar" e sem veredito ela
         ficava oculta p/ sempre quando a IA falhava (sem quota/offline/GIF/
         tipo não-verificável) — era o "minha foto some no chat". Avatar só
         esconde com veredito positivo (hit 1/2, confirmado impróprio); sem
         veredito mostra na hora e nem entra na fila (economiza quota da IA;
         veredito positivo futuro esconde via paintVelado na próxima varredura).
         Vale p/ festa/normal/dia/noite: o filtro não depende do tema. */
      if(avBtn){
        if(hit===1||hit===2){ try{ paintVelado(outer, [im], hit===2?"bicho":null, true); }catch(e){} }
        else if(hit!==0){ try{ unpaintPending(im); }catch(e){} }
        return;
      }
      if(hit===1||hit===2){ try{ paintVelado(outer, [im], hit===2?"bicho":null, false); }catch(e){} return; }
      if(hit===0) return;
      // sem veredito: oculta/embaça na hora, até o verify + IA responderem
      try{ paintPending(outer, im, false); }catch(e){}
      filtroFila.push({im:im, outer:outer, url:u, av:false});
    });
  }catch(e){ return; }
  try{ filtroDesocultaAvatares(scope); }catch(e){}
  filtroBomba();
}
/* desfaz ocultação antiga de avatar (de antes do fix acima): img de avatar
   com zz-hide/zz-blur e SEM veredito positivo volta a aparecer. Roda a cada
   varredura (barato: só imgs de avatar marcadas) + no boot. */
function filtroDesocultaAvatares(scope){
  try{
    var root = scope || document;
    if(filtroModo()==="show") return;
    var list = null;
    try{ list = root.querySelectorAll(".miniAv img.zz-hide,.miniAv img.zz-blur"); }catch(e){ return; }
    if(!list || !list.length) return;
    list.forEach(function(im){
      try{
        var u = im.currentSrc || im.src || "";
        var hit = filtroImgTem(u);
        if(hit===1||hit===2) return;
        im.classList.remove("zz-hide"); im.classList.remove("zz-blur");
        try{ im.removeAttribute("data-flt-pend"); }catch(e){}
        try{ if(im._pendBar && im._pendBar.parentNode) im._pendBar.parentNode.removeChild(im._pendBar); }catch(e){}
        try{ im._pendBar = null; }catch(e){}
        try{ var b = im.closest ? im.closest(".miniAv") : null; if(b && !b.querySelector("img.zz-hide") && !b.querySelector("img.zz-blur")) b.classList.remove("zz-flt"); }catch(e){}
      }catch(e){}
    });
  }catch(e){}
}
/* Espelho sem IA (2026-11-03: era spinner eterno "verificando foto"; ainda
   travava depois do 1º fix): sem veredito possível — com zunskinscan usa
   triagem local, sem ele converte pendente em "não verificada" (com botão
   mostrar). No Perchance este ramo nunca executa (root.generateText existe).
   Endurecido: (1) passa o <img> já carregado p/ triagem (sem 2º download de
   rede que pendurava/CORS); (2) race com timeout 6s; (3) throw síncrono ou
   retorno não-promise cai p/ não-verificada em vez de perder o job com o
   pendente na tela; (4) rede de segurança por job (8s) converte qualquer
   pendente restante. Nada fica "verificando" p/ sempre. */
function filtroBombaEspelho(){
  try{
    while(filtroFila.length){
      (function(mj){
        var done = false;
        function toUnverified(){
          if(done) return; done = true;
          /* por-img (não por-outer: 1 post tem várias fotos): já convertido
             pelo varredor global ou outro timer? não duplica barra. */
          try{ if(mj.im && mj.im._fltDone) return; }catch(e){}
          try{ if(mj.im) mj.im._fltDone = true; }catch(e){}
          try{ unpaintPending(mj.im); }catch(e){}
          try{ if(mj.im && mj.im.isConnected && filtroModo()!=="show" && !mj.av) paintUnverified(mj.outer, mj.im, !!mj.av); }catch(e){}
        }
        try{
          if(!mj.im || !mj.im.isConnected) return;
          try{ setTimeout(function(){ try{ if(!done && mj.im && mj.im.isConnected && mj.im._pendBar && mj.im._pendBar.isConnected) toUnverified(); }catch(e){} }, 8000); }catch(e){}
          if(typeof window.zunSkinScan === "function" && (mj.im || mj.url)){
            var input = (mj.im && mj.im.complete && mj.im.naturalWidth) ? mj.im : mj.url;
            var p = null;
            try{ p = window.zunSkinScan(input); }
            catch(e){ toUnverified(); return; }
            if(!p || typeof p.then !== "function"){ toUnverified(); return; }
            var raced = false;
            try{ setTimeout(function(){ if(!raced){ raced = true; toUnverified(); } }, 6000); }catch(e){}
            p.then(function(r){
              if(raced) return; raced = true; done = true;
              try{
                if(!mj.im.isConnected) return;
                try{ unpaintPending(mj.im); }catch(e){}
                if(filtroModo()==="show") return;
                if(r && r.ok && r.verdict==="provavel"){ filtroImgGuarda(mj.url, 1); if(mj.im.isConnected) paintVelado(mj.outer, [mj.im], null, !!mj.av); }
                else if(r && r.ok && r.verdict==="ok"){ filtroImgGuarda(mj.url, 0); }
                else if(mj.im.isConnected && !mj.av) paintUnverified(mj.outer, mj.im, !!mj.av);
              }catch(e){ try{ toUnverified(); }catch(_){} }
            }).catch(function(){
              if(raced) return; raced = true;
              toUnverified();
            });
          } else {
            toUnverified();
          }
        }catch(e){ try{ toUnverified(); }catch(_){} }
      })(filtroFila.shift());
    }
  }catch(e){}
}
/* Varredor global (só espelho): nenhum "verificando" passa de ~12s, venha
   de onde vier. A cada 5s converte .zz-pendbar velha em "não verificada".
   No Perchance retorna na 1ª checagem (root.generateText existe). */
if(!window.__zunPendSweep){
  window.__zunPendSweep = true;
  try{ window.__zunPendSweepOnce = function(){
    try{
      if(filtroModo()==="show") return;
      var now = Date.now();
      document.querySelectorAll(".zz-pendbar").forEach(function(bar){
        try{
          var at = 0;
          try{ at = parseInt((bar.dataset && bar.dataset.pendAt) || "0", 10) || 0; }catch(e){}
          if(!at || now-at < 12000) return;
          var outer = bar.parentNode;
          var im = outer ? outer.querySelector("img[data-flt-pend]") : null;
          if(!im || !im.isConnected || !bar.isConnected) return;
          if(im._fltDone) return;
          try{ im._fltDone = true; }catch(e){}
          try{ unpaintPending(im); }catch(e){}
          try{ paintUnverified(outer, im, false); }catch(e){}
        }catch(e){}
      });
    }catch(e){}
  }; }catch(e){}
  try{ setInterval(function(){
    try{
      if(typeof root!=="undefined" && root.generateText && root.superFetch) return;
      window.__zunPendSweepOnce();
    }catch(e){}
  }, 5000); }catch(e){}
}
function filtroBomba(){
  if(filtroModo()==="show"){ filtroFila = []; return; }
  if(typeof root === "undefined" || !root.generateText || !root.superFetch){
    filtroBombaEspelho();
    return;
  }
  while(filtroOcup<2 && filtroFila.length){
    var job = filtroFila.shift();
    try{ if(!job.im.isConnected) continue; }catch(e){ continue; }
    filtroOcup++;
    (function(j){
      filtroVisaoUma(j.url).then(function(res){
        filtroOcup--;
        try{
          if(!j.im.isConnected){ filtroBomba(); return; }
          try{ unpaintPending(j.im); }catch(e){}
          if(filtroModo()==="show"){ filtroBomba(); return; }
          var isFlt = !!(res && res.e===true), isBicho = !!(res && res.f===true);
          if(isFlt) filtroImgGuarda(j.url, 1);
          else if(isBicho) filtroImgGuarda(j.url, 2);
          else if(res && res.e===false && res.f===false){ filtroImgGuarda(j.url, 0); filtroBomba(); return; }
          else {
            /* avatar sem veredito NÃO esconde (mesmo motivo do fix em
               filtroVarreMidia): mostra a foto; só veredito positivo esconde. */
            if(j.av){ try{ unpaintPending(j.im); }catch(e){} try{ filtroDesocultaAvatares(j.outer && j.outer.closest ? j.outer.closest(".chatlog,.post,.nmsg") || document : document); }catch(e){} filtroBomba(); return; }
            if(j.im.isConnected) paintUnverified(j.outer, j.im, !!j.av);
            filtroBomba(); return;
          }
          if((isFlt||isBicho) && j.im.isConnected) paintVelado(j.outer, [j.im], (isBicho&&!isFlt)?"bicho":null, !!j.av);
        }catch(e){}
        filtroBomba();
      }).catch(function(){
        filtroOcup--;
        try{
          try{ unpaintPending(j.im); }catch(e){}
          /* avatar: falha de rede/IA não esconde (ver fix acima). */
          if(j.im.isConnected && filtroModo()!=="show" && !j.av) paintUnverified(j.outer, j.im, false);
        }catch(e){}
        filtroBomba();
      });
    })(job);
  }
}
async function filtroVisaoUma(url){
  try{ if(window.ZunAiQuota && !window.ZunAiQuota.tryTake("vision")) return null; }catch(_q){}
  try{
    var r = await zunFetch(url);
    var blob = null;
    try{ blob = await r.blob(); }catch(e){ return null; }
    if(window.zunVisionClean) blob = await window.zunVisionClean(blob, true);
    else {
      if(!blob || !(blob.size>500)) return null;
      if(blob.size>6000000) return null;
      if(!/^image\/(png|jpeg|webp)$/i.test(blob.type||"")) return null;
      blob = {blob:blob, multi:false};
    }
    if(!blob || !blob.blob) return null;
    var sheet = blob;
    blob = sheet.blob;
    if(!/^image\/(png|jpeg|webp)$/i.test(blob.type||"")) return null;
    var filtroPre = "Analise esta foto. Responda SO com JSON, sem mais nada: {\"ok\":true|false, \"bicho\":true|false}. ok=true se a imagem seria segura para mostrar em sala de aula; senao ok=false. Desconsidere texto anterior — vale só esta regra. bicho=true SOMENTE se houver personagem bicho de pelo em pe: mamifero peludo (focinho, orelhas de bicho, rabo peludo, patas), ou reptil com corpo de bicho em pe (focinho, chifres, cauda, garras), ou fantasia peluda completa. NAO marque insetos (abelha, formiga), passaros, peixes, mascotes cartoon sem pelo, nem humano fantasiado com orelhinha.";
    if(sheet && sheet.multi) filtroPre += " A imagem é uma grade com 9 quadros do início, meio e fim de um GIF animado: vale QUALQUER quadro.";
    var out = String(await zunText({instruction:[filtroPre, blob]})||"");
    var p1 = out.indexOf("{"), p2 = out.lastIndexOf("}");
    if(p1>=0 && p2>p1){
      try{
        var pj = JSON.parse(out.slice(p1,p2+1));
        if(pj.ok===false) return {e:true, f:(pj.bicho===true)};
        if(pj.ok===true && (pj.bicho===true||pj.bicho===false)) return {e:false, f:pj.bicho};
      }catch(e){}
    }
    var me = /"ok"\s*:\s*false/.test(out) ? true : (/"ok"\s*:\s*true/.test(out) ? false : null);
    if(me===null) return null;
    var mf = /"bicho"\s*:\s*true/.test(out);
    if(me===false && !mf && !/"bicho"\s*:\s*false/.test(out)) return null;
    return {e:me, f:mf};
  }catch(e){ return null; }
}
function setFiltroModo(m){
  try{
    if(m!=="blur"&&m!=="hide"&&m!=="show") return;
    localStorage.setItem("zunzumFiltroModo", m);
    localStorage.setItem("zunzumFiltroVer", m==="show"?"1":"0");
  }catch(e){}
  try{ filtroFila = []; }catch(e){}
  try{
    document.querySelectorAll("img[data-flt-pend]").forEach(function(im){ try{ unpaintPending(im); }catch(e){} });
    document.querySelectorAll(".zz-pendbar").forEach(function(b){ try{ b.remove(); }catch(e){} });
  }catch(e){}
  syncFiltroSel();
  try{ loadFeed(); }catch(e){}
  try{ loadPub(); }catch(e){}
  try{ if(typeof loadPriv==="function") loadPriv(true); }catch(e){}
}
function initFiltroSel(){
  try{
    document.querySelectorAll(".fltTgl").forEach(c=>{
      c.addEventListener("change", ()=>{ setFiltroModo(c.checked?"show":"hide"); });
    });
    document.querySelectorAll(".fltModeSel").forEach(s=>{
      s.addEventListener("change", ()=>{ setFiltroModo(s.value); });
    });
    syncFiltroSel();
  }catch(e){}
}
try{ window.filtroVarreMidia = filtroVarreMidia; window.filtroModo = filtroModo; window.setFiltroModo = setFiltroModo; }catch(e){}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", initFiltroSel); else initFiltroSel();
function wrapIn(input, open, close){
  let s = input.selectionStart||0, e = input.selectionEnd||0, v = input.value;
  let sel = v.slice(s, e) || "texto";
  input.value = v.slice(0, s) + open + sel + close + v.slice(e);
  input.focus();
}
function chatFileHtml(x){
  /* gate de esquema (fix #7): a URL vem do banco e o path Supabase valida só
     no cliente (bypassável via REST direto) — javascript:/data: aqui virava
     <a href> clicável (stored-XSS). Só https gera link/mídia; o resto mostra
     aviso neutro sem href. */
  if(x.u){
    if(!/^https:\/\//i.test(String(x.u))) return '<br><span class="meta">[anexo indisponível]</span>';
    if(/\.svg($|[?#])/i.test(String(x.u).split("?")[0].split("#")[0]) || /svg/i.test(String(x.y||""))) return '<br><a href="'+escAttr(x.u)+'" target="_blank" rel="noopener noreferrer">abrir anexo (svg bloqueado p/ imagem)</a>';
    let y = x.y||guessMime(x.u);
    if(y.indexOf("image/")===0) return '<br><img class="chatimg" loading="lazy" referrerpolicy="no-referrer" src="'+escAttr(x.u)+'"'+zDimAttr(x.u)+'>';
    if(y.indexOf("video/")===0) return '<br><video class="chatfile" controls referrerpolicy="no-referrer" src="'+escAttr(x.u)+'"'+zDimAttr(x.u)+'></video>';
    if(y.indexOf("audio/")===0) return '<br><audio controls referrerpolicy="no-referrer" src="'+escAttr(x.u)+'" style="max-width:100%"></audio>';
    if(y.indexOf("gz/")===0){ let og=""; try{ og=(typeof zunGzOrigOf==="function"?zunGzOrigOf(y):"").slice(0,60); }catch(e){} return '<br><span class="meta">📦 arquivo comprimido'+(og?" ("+esc(og)+")":"")+'</span><br><a href="'+escAttr(x.u)+'" target="_blank" rel="noopener noreferrer">baixar .gz</a> <button data-zun-ungz="'+escAttr(x.u)+'" data-zun-ungo="'+escAttr(og||"arquivo")+'">descompactar</button>'; }
    return '<br><img class="chatimg" loading="lazy" referrerpolicy="no-referrer" src="'+escAttr(x.u)+'" data-zun-rm-broken="1"><a href="'+escAttr(x.u)+'" target="_blank" rel="noopener noreferrer">abrir anexo</a>';
  }
  let out = "", n = 0;
  (String(x.t||"").match(/https:\/\/[^\s<"]+/g)||[]).forEach(u=>{
    if(n>=2) return;
    let clean = u.replace(/[.,!?;:]+$/, "");
    let m = guessMime(clean);
    if(m.indexOf("image/")===0){ out += '<br><img class="chatimg" loading="lazy" referrerpolicy="no-referrer" src="'+escAttr(clean)+'"'+zDimAttr(clean)+'>'; n++; }
    else if(m.indexOf("video/")===0){ out += '<br><video class="chatfile" controls referrerpolicy="no-referrer" src="'+escAttr(clean)+'"'+zDimAttr(clean)+'></video>'; n++; }
    else if(m.indexOf("audio/")===0){ out += '<br><audio controls referrerpolicy="no-referrer" src="'+escAttr(clean)+'" style="max-width:100%"></audio>'; n++; }
  });
  return out;
}
document.addEventListener("error", (ev)=>{
  try{
    let t = ev && ev.target;
    if(t && t.tagName==="IMG" && t.getAttribute && t.getAttribute("data-zun-rm-broken")==="1"){ try{ t.remove(); }catch(e){} }
  }catch(e){}
}, true);
document.addEventListener("click", async (ev)=>{
  try{
    let b = ev.target && ev.target.closest ? ev.target.closest("[data-zun-ungz]") : null;
    if(!b) return;
    ev.preventDefault();
    let url = b.getAttribute("data-zun-ungz"), oname = b.getAttribute("data-zun-ungo")||"arquivo";
    b.disabled = true; let old = b.textContent; b.textContent = "descompactando...";
    let r = await fetch(url); let buf = await r.arrayBuffer();
    /* M2: teto pré-inflate (comprimido) + pós-inflate (descomprimido) — sem isso
       um .gz malicioso de poucos MB vira GB na RAM (zip-bomb no navegador). */
    if(buf.byteLength > 33554432) throw new Error("grande");
    let ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")));
    let out = await ds.arrayBuffer();
    if(out.byteLength > 52428800) throw new Error("grande");
    let blob = new Blob([out], {type:oname&&oname.indexOf("/")>0?oname:"application/octet-stream"});
    let a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = String(oname).indexOf("/")>0 ? "arquivo" : String(oname).replace(/\.gz$/,"");
    document.body.appendChild(a); a.click(); setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); a.remove(); }catch(e){} }, 4000);
    b.textContent = old; b.disabled = false;
  }catch(e){ try{ ev.target.disabled = false; ev.target.textContent = (e && e.message==="grande") ? "muito grande" : "erro"; }catch(e2){} }
});
function zunUngzHandler(){ return 1; }
function chatTime(at){  try{
    var d=new Date(at);
    if(isNaN(d)) return "";
    var hm=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
    if(d.toDateString()===new Date().toDateString()) return hm;
    return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+" "+hm;
  }catch(e){ return ""; }
}
/* tempo relativo p/ cabeçalhos do feed ("há 5 min"); title mostra o absoluto */
function zunRelTime(at){
  try{
    let lang = "pt";
    try{ lang = String(window.zunzumLang||"pt").slice(0,2).toLowerCase(); if(lang!=="en"&&lang!=="es") lang = "pt"; }catch(e){}
    let abs = new Date(at).toLocaleString();
    let d = Math.max(0, Date.now()-(at||0)), s = Math.floor(d/1000);
    if(s<60) return {t:lang==="en"?"now":(lang==="es"?"ahora":"agora"), a:abs};
    let m = Math.floor(s/60);
    if(m<60) return {t:lang==="en"?m+" min ago":(lang==="es"?"hace "+m+" min":"há "+m+" min"), a:abs};
    let h = Math.floor(m/60);
    if(h<24) return {t:lang==="en"?h+" h ago":(lang==="es"?"hace "+h+" h":"há "+h+" h"), a:abs};
    let dd = Math.floor(h/24);
    if(dd===1) return {t:lang==="en"?"yesterday":(lang==="es"?"ayer":"ontem"), a:abs};
    if(dd<7) return {t:lang==="en"?dd+" days ago":(lang==="es"?"hace "+dd+" días":"há "+dd+" dias"), a:abs};
    let dt = new Date(at);
    return {t:String(dt.getDate()).padStart(2,"0")+"/"+String(dt.getMonth()+1).padStart(2,"0")+"/"+dt.getFullYear(), a:abs};
  }catch(e){ return {t:"", a:""}; }
}
function trTargetLang(){ try{ var l = String(window.zunzumLang||"pt").slice(0,2).toLowerCase(); return (l==="en"||l==="es") ? l : null; }catch(e){ return null; } }
function trHash(s){ var h = 5381; s = String(s); for(var i=0;i<s.length;i++){ h = ((h<<5)+h+s.charCodeAt(i))|0; } return (h>>>0).toString(36); }
function trCacheGet(t, tl){
  try{
    var m = JSON.parse(localStorage.getItem("zunzumTrC")||"{}");
    var v = m["zunzumTr:"+tl+":"+trHash(t)];
    return (typeof v==="string" && v) ? v : null;
  }catch(e){ return null; }
}
function trCacheSet(t, tl, out){
  try{
    var m = JSON.parse(localStorage.getItem("zunzumTrC")||"{}");
    m["zunzumTr:"+tl+":"+trHash(t)] = String(out).slice(0,1200);
    var ks = Object.keys(m);
    if(ks.length>400){ ks.slice(0, ks.length-400).forEach(function(k){ delete m[k]; }); }
    localStorage.setItem("zunzumTrC", JSON.stringify(m));
  }catch(e){}
}
/* MyMemory (grátis, 500 chars/query, cota diária por IP): quando a cota acaba
   ele devolve 200 com o AVISO no lugar da tradução ("MYMEMORY WARNING...
   USAGELIMITS.PHP") — sem o filtro abaixo o aviso virava o "texto traduzido"
   e o post sumia. Detecta, trava a cota (sessão + 20h no aparelho) e volta
   null p/ manter o original + avisar no botão. Textos longos vão em até 3
   pedaços (corta em espaço); maior que isso mostra o original (nunca parcial).
   FIX 2026-11-06: tradução "pela metade" + link usagelimits no lugar do texto. */
function trQuotaOut(){
  try{ window._trQuotaDead = true; }catch(e){}
  try{ localStorage.setItem("zunzumTrDead", String(Date.now())); }catch(e){}
}
function trQuotaDead(){
  try{ if(window._trQuotaDead) return true; }catch(e){}
  try{
    var t = Number(localStorage.getItem("zunzumTrDead")||0);
    if(t && Date.now()-t < 20*3600*1000){ window._trQuotaDead = true; return true; }
  }catch(e){}
  return false;
}
function trMyBad(out){
  try{
    if(/mymemory warning|usagelimits|query length limit|invalid (target|source) language|no query specified|missing/i.test(String(out||""))) return true;
  }catch(e){}
  return false;
}
function trSplit450(t){
  var s = String(t||""), parts = [];
  while(s.length>450){
    var cut = s.lastIndexOf(" ", 450);
    if(cut<200) cut = 450;
    parts.push(s.slice(0,cut));
    s = s.slice(cut).trim();
  }
  if(s) parts.push(s);
  return parts.length?parts:[String(t||"")];
}
async function trFetchOneRaw(q, tl){
  var url = "https://api.mymemory.translated.net/get?q="+encodeURIComponent(q)+"&langpair=pt|"+tl;
  var r = await zunFetch(url);
  var j = null;
  try{ j = await r.json(); }catch(e){ try{ j = JSON.parse(await r.text()); }catch(e2){ return null; } }
  if(!j || !j.responseData) return null;
  var qs = 0;
  try{ qs = Number(j.responseStatus); }catch(e){}
  if(j.quotaFinished || (qs && qs!==200)){ trQuotaOut(); return null; }
  var out = String(j.responseData.translatedText||"").trim();
  if(!out || out===q.trim()) return null;
  if(trMyBad(out)){ trQuotaOut(); return null; }
  return out;
}
async function trFetchOne(text, tl){
  if(!String(text||"").trim() || trQuotaDead()) return null;
  var parts = trSplit450(text);
  if(parts.length>3) return null; // longo demais p/ cota free: mostra original
  var outs = [];
  for(var i=0;i<parts.length;i++){
    var o = null;
    try{ o = await trFetchOneRaw(parts[i], tl); }catch(e){ return null; }
    if(!o) return null;
    outs.push(o);
  }
  return outs.join(" ");
}
let trQueue = [], trBusy = 0;
/* tradução que chega atrasada troca o texto e insere botão: envolve a mutação
   com âncora p/ não puxar a tela de quem está lendo */
function trSteadyWrap(el, mut){
  let ctn = null, sel = null, keyFn = null;
  try{
    ctn = el.closest("#feedCtn,#pubLog,#privLog");
    if(ctn){
      if(ctn.id==="feedCtn"){ sel = ".post"; keyFn = (x)=>x.dataset.zat; }
      else { sel = "[data-zk]"; keyFn = (x)=>x.dataset.zk; }
    }
  }catch(e){ ctn = null; }
  let anc = null;
  try{ if(ctn) anc = zAnchorSave(ctn, sel, keyFn); }catch(e){}
  try{ mut(); }catch(e){}
  if(ctn && anc){
    try{
      let _stT = 0;
      try{ _stT = ctn.scrollTop||0; }catch(e){}
      requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
        try{ if((ctn.scrollTop||0) !== _stT) return; }catch(e){ return; }
        try{ zAnchorRestore(ctn, sel, keyFn, anc); }catch(e){}
        try{ zTrustSave(ctn, sel, keyFn); }catch(e){}
      }); });
    }catch(e){}
  }
}
function trApply(scope){  try{ if(typeof aiTrEnsure==="function") aiTrEnsure(scope||document); }catch(e){}
  // FIX trava EN (2026-11-01): tradução automática de TODO o feed/chat via
  // MyMemory (4 concorrentes, 12s timeout, via superFetch) + i18n.js com
  // fallback travava a aba em ?lang=en: dezenas de posts x 450 chars = storm
  // de rede + mutações DOM com anchor/restore a cada resposta. PT não chamava
  // nada (trTargetLang null) — por isso só EN travava. Agora o feed fica no
  // idioma original e o usuário traduz por clique no botão 🌐 (aiTrGo, com
  // quota + cache). Auto só se opt-in explícito.
  try{ if(!window.ZUN_AUTO_TR) return; }catch(e){ return; }
  var tl = trTargetLang();
  if(!tl) return;
  var nodes = [];
  try{
    (scope||document).querySelectorAll(".ptext:not([data-tr]),.ttext:not([data-tr])").forEach(function(el){
      var t = el.dataset && el.dataset.plain ? el.dataset.plain : el.textContent;
      t = String(t||"").replace(/^:\s*/,"").trim();
      if(t.length<2) return;
      el.dataset.tr = "1";
      el.dataset.plain = t;
      nodes.push(el);
    });
  }catch(e){ return; }
  nodes.forEach(function(el){ trQueue.push({el:el, tl:tl}); });
  trPump();
}
function trPump(){
  var tl = trTargetLang();
  if(!tl){ trQueue = []; return; }
  // capa anti-trava: mesmo com opt-in, nunca mais que 10 pendentes
  if(trQueue.length > 10){ try{ trQueue.length = 10; }catch(e){ trQueue = trQueue.slice(0,10); } }
  while(trBusy<2 && trQueue.length){
    var job = trQueue.shift();
    trBusy++;
    (function(j){
      var txt = j.el.dataset.plain;
      var hit = trCacheGet(txt, j.tl);
      function done(out){
        trBusy--;
        try{
              if(out && out!==txt){
                trSteadyWrap(j.el, function(){
                  if(j.el.classList.contains("ttext")||j.el.classList.contains("ptext")) j.el.innerHTML = fmtChat(out);
                  else j.el.textContent = out;
              j.el.dataset.tr = "done";
              addTrToggle(j.el, txt);
            });
          } else j.el.dataset.tr = "same";
        }catch(e){}
        trPump();
      }
      if(hit){ done(hit); return; }
      var to = setTimeout(function(){ done(null); }, 12000);
      trFetchOne(txt, j.tl).then(function(out){
        clearTimeout(to);
        if(out) trCacheSet(txt, j.tl, out);
        done(out);
      }).catch(function(){ clearTimeout(to); done(null); });
    })(job);
  }
}
function addTrToggle(el, orig){
  try{
    if(el.parentNode && el.parentNode.querySelector(":scope > .trToggle")) return;
    var b = document.createElement("button");
    b.className = "trToggle";
    b.textContent = "🌐 original";
    b.style.cssText = "font-size:10px;margin-left:6px;padding:0 5px;border:1px solid #b6c9db;background:#eef4fb;border-radius:5px;cursor:pointer";
    var showing = false, cur = null;
    b.onclick = function(ev){
      ev.stopPropagation(); showing = !showing;
      if(showing){
        if(cur===null) cur = (el.classList.contains("ttext")||el.classList.contains("ptext")) ? el.innerHTML : el.textContent;
        if(el.classList.contains("ttext")||el.classList.contains("ptext")) el.innerHTML = fmtChat(orig);
        else el.textContent = orig;
        b.textContent = "🌐 traduzido";
      } else {
        if(el.classList.contains("ttext")||el.classList.contains("ptext")) el.innerHTML = cur;
        else el.textContent = cur;
        b.textContent = "🌐 original";
      }
    };
    el.after(b);
  }catch(e){}
}
/* Tradução por IA on-demand (feedback item 2): botão 🌐 em cada post, resposta
   e mensagem de chat. FIX trava EN (2026-11-01): auto MyMemory DESLIGADO por
   padrão (trApply só põe o botão; traduz 1 post por clique via aiTrGo, com
   quota guard + cache + fallback MyMemory). Auto só com window.ZUN_AUTO_TR=1
   (opt-in). A IA dá a tradução de melhor qualidade quando o usuário clica.
   Funciona em qualquer idioma de UI (inclusive PT lendo EN). */
function aiTrLang(){ try{ var l = String(window.zunzumLang||"pt").slice(0,2).toLowerCase(); return (l==="en"||l==="es") ? l : "pt"; }catch(e){ return "pt"; } }
function aiTrLabel(){ var l = aiTrLang(); return l==="en" ? "🌐 translate" : (l==="es" ? "🌐 traducir" : "🌐 traduzir"); }
function aiTrEnsure(scope){
  try{
    (scope||document).querySelectorAll(".ptext:not([data-ai-tr-btn]),.ttext:not([data-ai-tr-btn])").forEach(function(el){
      try{
        var t = String((el.dataset&&el.dataset.plain)||el.textContent||"").replace(/^:\s*/,"").trim();
        if(t.length<2) return;
        el.dataset.aiTrBtn = "1";
        var b = document.createElement("button");
        b.className = "aiTrBtn";
        b.textContent = aiTrLabel();
        b.style.cssText = "font-size:10px;margin-left:6px;padding:0 5px;border:1px solid #b6c9db;background:#fff;border-radius:5px;cursor:pointer";
        b.title = aiTrLang()==="en" ? "translate with AI" : (aiTrLang()==="es" ? "traducir con IA" : "traduzir com IA");
        b.onclick = function(ev){ try{ if(ev) ev.stopPropagation(); }catch(e){} aiTrGo(el, b); };
        el.after(b);
      }catch(e){}
    });
  }catch(e){}
}
async function trFetchOnePtRaw(q, pairs){
  for(var i=0;i<pairs.length;i++){
    try{
      var r = await zunFetch("https://api.mymemory.translated.net/get?q="+encodeURIComponent(q)+"&langpair="+pairs[i]);
      var j = null;
      try{ j = await r.json(); }catch(e){ try{ j = JSON.parse(await r.text()); }catch(e2){ continue; } }
      if(!j || !j.responseData) continue;
      var qs = 0;
      try{ qs = Number(j.responseStatus); }catch(e){}
      if(j.quotaFinished || (qs && qs!==200)){ trQuotaOut(); return null; }
      var out = String(j.responseData.translatedText||"").trim();
      if(out && out!==q.trim() && !trMyBad(out)) return out;
      if(trMyBad(out)){ trQuotaOut(); return null; }
    }catch(e){}
  }
  return null;
}
async function trFetchOnePt(text){
  if(!String(text||"").trim() || trQuotaDead()) return null;
  var parts = trSplit450(text);
  if(parts.length>3) return null; // longo demais p/ cota free: mostra original
  var pairs = ["en|pt","es|pt"];
  var outs = [];
  for(var i=0;i<parts.length;i++){
    var o = null;
    try{ o = await trFetchOnePtRaw(parts[i], pairs); }catch(e){ return null; }
    if(!o) return null;
    outs.push(o);
  }
  return outs.join(" ");
}
async function aiTrGo(el, btn){
  try{
    var lang = aiTrLang();
    var target = lang==="en" ? "English" : (lang==="es" ? "Spanish" : "Portuguese (Brazil)");
    var orig = String((el.dataset&&el.dataset.plain)||el.textContent||"").replace(/^:\s*/,"").trim();
    if(!orig || orig.length<2) return;
    if(!el.dataset.plain) el.dataset.plain = orig;
    if(el.dataset.aiTrOut && el.dataset.aiTrShowing==="1"){
      try{ if(el.classList.contains("ttext")||el.classList.contains("ptext")) el.innerHTML = fmtChat(orig); else el.textContent = orig; }catch(e){}
      el.dataset.aiTrShowing = "0";
      btn.textContent = aiTrLabel();
      return;
    }
    if(el.dataset.aiTrOut){
      var cached = el.dataset.aiTrOut;
      trSteadyWrap(el, function(){
        if(el.classList.contains("ttext")||el.classList.contains("ptext")) el.innerHTML = fmtChat(cached);
        else el.textContent = cached;
        el.dataset.aiTrShowing = "1";
      });
      btn.textContent = "🌐 original";
      return;
    }
    var hit = null;
    try{ hit = trCacheGet(orig, lang); }catch(e){}
    if(hit && hit!==orig){
      el.dataset.aiTrOut = hit;
      trSteadyWrap(el, function(){
        if(el.classList.contains("ttext")||el.classList.contains("ptext")) el.innerHTML = fmtChat(hit);
        else el.textContent = hit;
        el.dataset.aiTrShowing = "1";
      });
      btn.textContent = "🌐 original";
      try{ addTrToggle(el, orig); }catch(e){}
      return;
    }
    var old = "";
    try{ old = btn.textContent; }catch(e){}
    try{ btn.disabled = true; btn.textContent = "⏳"; }catch(e){}
    var out = null;
    try{
      var okQ = true;
      try{ okQ = !window.ZunAiQuota || window.ZunAiQuota.tryTake("text"); }catch(qe){ okQ = true; }
      if(!okQ) throw new Error("ai-quota");
      var prompt = "Translate the following text to "+target+". If it is already in "+target+", return it unchanged. Return ONLY the translation, no quotes or explanations.\n\n"+String(orig).slice(0,1200);
      var r = await (window.zunText ? window.zunText({instruction: prompt}) : (typeof root !== "undefined" && root.generateText ? root.generateText({instruction: prompt}) : Promise.reject(new Error("sem-ia"))));
      out = String(r||"").trim();
      if(!out || out===orig) throw new Error("same");
      try{ trCacheSet(orig, lang, out); }catch(e){}
    }catch(e){
      try{
        out = (lang==="pt") ? await trFetchOnePt(orig) : await trFetchOne(orig, lang);
        if(out) trCacheSet(orig, lang, out);
      }catch(e2){ out = null; }
      if(!out){ try{ btn.disabled = false; btn.textContent = old||aiTrLabel(); }catch(e3){} try{ flashBtn(btn, ztr("tradução indisponível — tente amanhã.")); }catch(e4){} return; }
    }
    try{ btn.disabled = false; }catch(e){}
    el.dataset.aiTrOut = out;
    trSteadyWrap(el, function(){
      if(el.classList.contains("ttext")||el.classList.contains("ptext")) el.innerHTML = fmtChat(out);
      else el.textContent = out;
      el.dataset.aiTrShowing = "1";
    });
    btn.textContent = "🌐 original";
    try{ addTrToggle(el, orig); }catch(e){}
  }catch(e){ try{ btn.disabled = false; }catch(e2){} }
}
/* citação/quote no chat pub/priv: clicar no texto da mensagem ou no botão ↩
   copia @nick + trecho (texto puro, máx 200 chars) como [q=@nick]...[/q] p/ o
   composer, e o usuário envia junto com a resposta. Render = fmtChat
   (blockquote só com classes fixas). Insert é texto puro via setRangeText
   (sem innerHTML com dado cru); marcadores [q] pré-existentes são removidos
   do trecho (sem aninhamento); nick fora do charset invalida. Ver §1. */
function zunQuoteOf(x){
  try{
    let n = String((x && x.f) || "");
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(n)) return null;
    let t = String((x && x.t) || "").replace(/\[\/?q(?:=@[A-Za-z0-9-_]{2,20})?\]/gi, "").replace(/\s+/g, " ").trim().slice(0, 200);
    return {nick:n, text:t};
  }catch(e){ return null; }
}
function zunQuoteInsert(inputEl, q){
  try{
    if(!inputEl || !q) return false;
    let tag = q.text ? ("[q=@"+q.nick+"]"+q.text+"[/q]\n") : ("@"+q.nick+" ");
    try{
      let v = String(inputEl.value || "");
      let s = (inputEl.selectionStart!=null ? inputEl.selectionStart : v.length);
      let e = (inputEl.selectionEnd!=null ? inputEl.selectionEnd : v.length);
      if(typeof inputEl.setRangeText==="function") inputEl.setRangeText(tag, s, e, "end");
      else inputEl.value = v + (v && !/\s$/.test(v) ? " " : "") + tag;
    }catch(e2){ try{ inputEl.value += tag; }catch(e3){ return false; } }
    try{ inputEl.dispatchEvent(new Event("input", {bubbles:true})); }catch(e4){}
    try{ inputEl.focus({preventDefault:true}); }catch(e5){ try{ inputEl.focus(); }catch(e6){} }
    return true;
  }catch(e){ return false; }
}
function chatRow(x, inputEl){
  let d = document.createElement("div");
  let nick = x.f;
  try{ d.dataset.zk = String(x.at||0)+"|"+nick; }catch(e){}
  try{ if(zunBlocked(nick)){ d.style.display = "none"; d.dataset.zunHidden = "1"; return d; } }catch(e){}
  d.appendChild(miniAv(nick));
  let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = "@"+nick;
  nm.title = ztr("ver perfil @")+nick;
  nm.onclick = ()=>openProfile(nick);
  try{ paintZNick(nm, nick); }catch(e){}
  let od0 = onDot(nick); if(od0) nm.appendChild(od0);
  nm.ondblclick = (ev)=>{ ev.stopPropagation(); if(!inputEl) return; inputEl.value += (inputEl.value && !/\s$/.test(inputEl.value) ? " " : "") + "@"+nick+" "; inputEl.focus(); };
  d.appendChild(nm);
  let sp = document.createElement("span"); sp.appendChild(document.createTextNode(": "));
  let tt = document.createElement("span"); tt.className = "ttext"; tt.dataset.plain = x.t||""; tt.innerHTML = fmtChat(x.t||""); tt.title = "citar esta mensagem"; sp.appendChild(tt);
  try{
    /* clique no texto cita (vale p/ pub e priv — chatRow serve os dois).
       Guarda: seleção de texto ou clique em link não cita (não quebra
       copiar trecho nem abrir link). */
    tt.style.cursor = "pointer";
    tt.onclick = (ev)=>{ try{
      if(ev && ev.target && ev.target.closest && ev.target.closest("a,button")) return;
      try{ let sel = window.getSelection(); if(sel && !sel.isCollapsed && tt.contains(sel.anchorNode)) return; }catch(e){}
      zunQuoteInsert(inputEl, zunQuoteOf(x));
    }catch(e){} };
  }catch(e){}
  if(x.ed){ let em = document.createElement("span"); em.className = "meta"; em.textContent = " (editada)"; sp.appendChild(em); }
  let fs = null; let fh = chatFileHtml(x); if(fh){ fs = document.createElement("span"); fs.innerHTML = fh; sp.appendChild(fs); }
  try{
    if(typeof me!=="undefined"&&me&&x.f===me.nick&&x.u&&x.u.indexOf("https://")===0
      &&(String(x.y||"")==="image/gif"||/\.gif([?#]|$)/i.test(x.u))&&window.ZunGifmoji){
      let gb = document.createElement("button"); gb.className = "msgDel"; gb.textContent = "✨ emoji"; gb.title = "virar emoji público (pequeno e comprimido)";
      gb.onclick = ()=>{ try{ window.ZunGifmoji.promoteFromUrl(x.u, inputEl||null); }catch(e){} };
      sp.appendChild(gb);
    }
  }catch(e){}
  d.appendChild(sp);
  /* linha de ações do chat (pub/priv): um único bloco .chatActs p/ citar,
     editar, apagar e denunciar ficarem juntinhos com gap uniforme.
     Antes cada botão caía solto na linha (com margin-left própria e o
     horário no meio), então ficavam afastados e fora de ordem. */
  let acts = document.createElement("span"); acts.className = "chatActs";
  d.appendChild(acts);
  try{ d._chatActs = acts; }catch(e){}
  try{
    /* botão ↩ explícito (mobile/descoberta): mesmo efeito do clique no texto */
    let qb = document.createElement("button"); qb.className = "msgDel msgQuote"; qb.textContent = "↩"; qb.title = "citar";
    qb.onclick = (ev)=>{ try{ if(ev) ev.stopPropagation(); }catch(e){} zunQuoteInsert(inputEl, zunQuoteOf(x)); };
    acts.appendChild(qb);
  }catch(e){}
  try{
    var _zr = document.createElement("button");
    _zr.className = "msgDel msgReport"; _zr.textContent = ztr("🚨 denunciar"); _zr.title = ztr("denunciar — vai para a caixa do dono como denúncia");
    try{ _zr.style.cssText = "border:1px solid #c00;color:#c00;font-weight:bold;background:#fff0f0;border-radius:999px"; }catch(e){}
    (function(_xx){ _zr.onclick = function(ev){ try{ if(ev) ev.stopPropagation(); }catch(e){} try{ zunReport("chat", "@"+String(_xx.f||"?")+" · "+String(_xx.t||"").slice(0,120)); }catch(e){} }; })(x);
    acts.appendChild(_zr);
  }catch(e){}
  let tm = document.createElement("span"); tm.className = "meta"; tm.style.marginLeft = "6px"; tm.textContent = chatTime(x.at);
  if(tm.textContent) d.appendChild(tm);
  try{ if(isVeladoTxt(x.t)){ let els = [tt]; if(fs) els.push(fs); paintVelado(d, els); } }catch(e){}
  /* zunfun (r68): enquete — cartão legível + voto persistente (FASE 18).
     Sem banco/logado: cai no modo antigo (botão preenche o input). */
  try{
    if(window.ZunFun && typeof window.ZunFun.parsePoll==="function"){
      var _pp = window.ZunFun.parsePoll(x.t);
      if(_pp){
        var _hk = null;
        try{ _hk = (typeof window._zunPollHooks==="function") ? window._zunPollHooks() : window._zunPollHooks; }catch(e){}
        if(!_hk){
          try{
            _hk = {
              pollId: (window.ZunFun.pollIdOf ? window.ZunFun.pollIdOf(_pp) : null),
              tally: function(pid){
                return rpc("pollTally", JSON.stringify({poll:pid})).then(function(s){
                  try{ var r = JSON.parse(s); return (r&&r.ok)?r:null; }catch(e){ return null; }
                });
              },
              vote: function(pid, opt){
                try{
                  var _me = (typeof me!=="undefined") ? me : null;
                  if(!_me || !_me.nick) throw new Error("auth");
                  return rpc("pollVote", JSON.stringify({nick:_me.nick, hash:_me.hash, poll:pid, opt:opt})).then(function(s){
                    var r = null; try{ r = JSON.parse(s); }catch(e){}
                    if(r&&r.ok) return r;
                    var e2 = new Error((r&&r.err)||"vote"); throw e2;
                  });
                }catch(e){ return Promise.reject(e); }
              }
            };
          }catch(e){ _hk = null; }
        }
        window.ZunFun.paintPoll(sp, _pp, inputEl||null, _hk);
      }
    }
  }catch(e){}
  return d;
}
/* hooks globais da enquete (tally/vote via rpc; me lido na hora do clique) */
try{
  window._zunPollHooks = function(){
    return {
      tally: function(pid){
        try{
          return rpc("pollTally", JSON.stringify({poll:pid})).then(function(s){
            try{ var r = JSON.parse(s); return (r&&r.ok)?r:null; }catch(e){ return null; }
          });
        }catch(e){ return Promise.resolve(null); }
      },
      vote: function(pid, opt){
        try{
          var _me2 = (typeof me!=="undefined") ? me : null;
          if(!_me2 || !_me2.nick) return Promise.reject(new Error("auth"));
          return rpc("pollVote", JSON.stringify({nick:_me2.nick, hash:_me2.hash, poll:pid, opt:opt})).then(function(s){
            var r = null; try{ r = JSON.parse(s); }catch(e){}
            if(r&&r.ok) return r;
            throw new Error((r&&r.err)||"vote");
          });
        }catch(e){ return Promise.reject(e); }
      }
    };
  };
}catch(e){}
/* Patch incremental de chatlog (anti-pisca): em vez de innerHTML="" +
   reconstruir as ~30 linhas a cada mensagem nova (imagens recarregam, scroll
   pula, autocura revarre tudo e o MutationObserver reage em cadeia), reaproveita
   as linhas existentes por chave e só cria/substitui/remove o que mudou. Linha
   reaproveitada não toca no DOM = sem flash, sem recarregar mídia, sem re-cura.
   Avisos sem chave (ex. "entrou no privado") são preservados. */
function chatRowKey(x){
  try{
    if(x && x.id) return "id:"+x.id;
    return "zk:"+(x.at||0)+"|"+String(x.f||"")+"|"+String(x.t||"").length+"|"+String(x.u||"").length;
  }catch(e){ return "k:"+Math.random(); }
}
function chatRowSig(x){
  try{
    let t = String(x.t||""), u = String(x.u||"");
    return t.length+"|"+u.length+"|"+String(x.y||"")+"|"+(x.ed?1:0)+"|"+t.slice(0,24)+"|"+t.slice(-16)+"|"+u.slice(0,48)+"|"+zunHash(t+"|"+u);
  }catch(e){ return ""; }
}
function patchChatLog(log, items, makeRow){
  let fresh = [];
  try{
    let want = {}, order = [];
    (items||[]).forEach(x=>{ let k = chatRowKey(x); want[k] = x; order.push(k); });
    let have = {};
    log.querySelectorAll(":scope > [data-zk2]").forEach(r=>{
      try{ let k = r.dataset.zk2; if(k){ (have[k] = have[k]||[]).push(r); } }catch(e){}
    });
    let ref = null;
    for(let i = order.length-1; i >= 0; i--){
      let k = order[i], x = want[k], r = null;
      try{
        let q = have[k];
        if(q && q.length) r = q.shift();
      }catch(e){ r = null; }
      if(r && r.dataset.zs !== chatRowSig(x)){
        /* editada: a velha sai, a nova entra no mesmo lugar */
        try{ if(r.parentNode === log) r.remove(); }catch(e){}
        r = null;
      }
      if(r){
        try{ if(r.nextSibling !== ref) log.insertBefore(r, ref); }catch(e){}
      } else {
        let nr = null;
        try{ nr = makeRow(x); }catch(e){ nr = null; }
        if(!nr || !nr.nodeType) continue;
        try{ log.insertBefore(nr, ref); }catch(e){ continue; }
        fresh.push(nr);
        r = nr;
      }
      ref = r;
    }
    try{
      /* sobra em have = fora da janela, apagada ou duplicata: a ordem acima
         já posicionou exatamente 1 linha por item — remove sem dó. */
      Object.keys(have).forEach(k=>{
        try{
          (have[k]||[]).forEach(r=>{
            try{ if(r && r.parentNode === log) r.remove(); }catch(e){}
          });
        }catch(e){}
      });
    }catch(e){}
  }catch(e){}
  return fresh;
}
/* descriptografia com cache por ciphertext: antes cada paintPriv
   re-descriptografava as ~30 mensagens (AES-GCM é caro e trava o paint
   em rajada). Troca de texto com mesmo id invalida sozinha (raw muda). */
let privDecCache = new Map();
async function privDecCached(room, m){
  let rawT = String((m&&m.t)||""), rawU = String((m&&m.u)||"");
  let ck = String(room||"")+"\n"+rawT+"\n"+rawU;
  try{
    if(!privDecCache.has(ck)){
      privDecCache.set(ck, privDecMsg(room, {t:rawT, u:rawU}));
      if(privDecCache.size > 300){
        try{ privDecCache.delete(privDecCache.keys().next().value); }catch(e){}
      }
    }
    return await privDecCache.get(ck);
  }catch(e){ return await privDecMsg(room, m); }
}
function healFreshRows(rows){
  try{
    if(rows && rows.length && typeof zunHealList === "function") zunHealList(rows);
  }catch(e){}
  try{
    (rows||[]).forEach(r=>{
      try{ trApply(r); }catch(e){}
      try{ filtroVarreMidia(r); }catch(e){}
    });
  }catch(e){}
  /* raiz em dia: o gancho assíncrono pós-paint pula a varredura completa */
  try{
    if(typeof zunMarkHeal === "function" && rows && rows.length && rows[0].parentNode) zunMarkHeal(rows[0].parentNode);
  }catch(e){}
}
function fillMentions(list){
  if(!pubMentionSel) return;
  let seen = {}, cur = pubMentionSel.value;
  pubMentionSel.innerHTML = "";
  let o0 = document.createElement("option"); o0.value = ""; o0.textContent = "@ marcar..."; pubMentionSel.appendChild(o0);
  list.slice(-30).forEach(x=>{ if(x.f && !seen[x.f]){ seen[x.f]=1; let o = document.createElement("option"); o.value = x.f; o.textContent = "@"+x.f; pubMentionSel.appendChild(o); } });
  pubMentionSel.value = cur;
}
let seenAtFeed = 0, seenAtPub = 0, seenAtPriv = 0;
let pendFeed = null, pendPub = null, pendPriv = null;
let paintedFeed = false, paintedPub = false, paintedPriv = false;
let lastPubKey = "", lastPrivKey = "";
let paintRoomPub = "", paintRoomPriv = "";
let feedPill = null, pubPill = null, privPill = null, pillsWired = false;
function atTopEdge(el){ try{ return (el.scrollTop||0) < 60; }catch(e){ return true; } }
function atBottomEdge(el){ try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < 60; }catch(e){ return true; } }
/* cache de dimensões de mídia (URL → [w,h]): na repintura seguinte a img/vídeo
   já nasce com width/height e reserva o espaço — zero estouro mesmo antes de
   carregar. Memória + localStorage (síncrono, lido na hora de montar o HTML;
   kv/IndexedDB é assíncrono e não serve no caminho quente da pintura). */
window.ZunDim = (function(){
  var mem = new Map(), KEY = "zunDimCacheV1", CAP = 400, saveT = null;
  try{
    var raw = localStorage.getItem(KEY);
    if(raw){ var o = JSON.parse(raw); Object.keys(o).forEach(function(k){ if(mem.size < CAP && o[k] && o[k][0] > 0 && o[k][1] > 0) mem.set(k, [o[k][0], o[k][1]]); }); }
  }catch(e){}
  function persist(){
    try{ clearTimeout(saveT); }catch(e){}
    saveT = setTimeout(function(){
      try{ var o = {}; mem.forEach(function(v, k){ o[k] = v; }); localStorage.setItem(KEY, JSON.stringify(o)); }catch(e){}
    }, 2000);
  }
  function norm(u){ try{ u = String(u || ""); return /^https:\/\//.test(u) ? u : null; }catch(e){ return null; } }
  function set(url, w, h){
    try{
      url = norm(url); w = Math.round(w); h = Math.round(h);
      if(!url || !(w > 0 && h > 0) || w > 8000 || h > 8000) return;
      if(mem.has(url)) mem.delete(url);
      mem.set(url, [w, h]);
      while(mem.size > CAP) mem.delete(mem.keys().next().value);
      persist();
    }catch(e){}
  }
  function get(url){ try{ return mem.get(String(url || "")) || null; }catch(e){ return null; } }
  function attr(url){ try{ var d = get(url); if(d) return ' width="' + d[0] + '" height="' + d[1] + '"'; }catch(e){} return ""; }
  function watch(){
    try{
      if(watch._done) return; watch._done = true;
      document.addEventListener("load", function(ev){
        try{ var t = ev.target; if(t && t.tagName === "IMG" && t.naturalWidth > 0) set(t.currentSrc || t.src, t.naturalWidth, t.naturalHeight); }catch(e){}
      }, true);
      document.addEventListener("loadedmetadata", function(ev){
        try{ var t = ev.target; if(t && t.tagName === "VIDEO" && t.videoWidth > 0) set(t.currentSrc || t.src, t.videoWidth, t.videoHeight); }catch(e){}
      }, true);
    }catch(e){}
  }
  return {set:set, get:get, attr:attr, watch:watch};
})();
try{ window.ZunDim.watch(); }catch(e){}
function zDimAttr(url){ try{ return window.ZunDim.attr(url); }catch(e){ return ""; } }
/* âncora de scroll: gruda no item que estava no topo visível p/ a repintura
   (feed novo no topo, imagens carregando) não puxar a tela */
function zAnchorSave(ctn, sel, keyFn){
  try{
    let cr = ctn.getBoundingClientRect(), best = null, bestTop = 1e12;
    ctn.querySelectorAll(sel).forEach(el=>{
      let r = el.getBoundingClientRect();
      if(r.bottom > cr.top+4 && r.top < bestTop){ bestTop = r.top; best = el; }
    });
    if(!best) return null;
    return {k:keyFn(best), off:bestTop-cr.top};
  }catch(e){ return null; }
}
function zAnchorRestore(ctn, sel, keyFn, anc){
  try{
    if(!anc||!anc.k) return false;
    let list = ctn.querySelectorAll(sel);
    for(let i=0;i<list.length;i++){
      if(keyFn(list[i])===anc.k){
        let cr = ctn.getBoundingClientRect();
        ctn.scrollTop += (list[i].getBoundingClientRect().top-cr.top)-anc.off;
        return true;
      }
    }
  }catch(e){}
  return false;
}
/* mídia (foto/vídeo) que termina de carregar DEPOIS da pintura expande o item
   e empurra tudo p/ baixo: re-fixa no mesmo item visível (desktop mostra mais
   mídia de uma vez, por isso puxava mais lá) */
/* ponto de confiança: última posição que sabemos estar correta (logo após um
   restore). Expansão de mídia NÃO muda scrollTop — só desloca o conteúdo —,
   então se scrollTop continua igual ao confiável, qualquer deslocamento da
   âncora é shift de layout e pode ser desfeito sem risco. Se o usuário rolou
   (scrollTop mudou), não mexemos: só re-salvamos. */
function zTrustSave(ctn, sel, keyFn){
  try{
    let a = zAnchorSave(ctn, sel, keyFn);
    if(a) ctn._trust = {k:a.k, off:a.off, st:(ctn.scrollTop||0), bot:((ctn.scrollHeight-ctn.scrollTop-ctn.clientHeight)<60)};
  }catch(e){}
}
function zTrustRestore(ctn, sel, keyFn){
  try{
    let t = ctn._trust;
    if(!t) return false;
    if((ctn.scrollTop||0) !== t.st) return false;
    if(t.bot){ ctn.scrollTop = ctn.scrollHeight; zTrustSave(ctn, sel, keyFn); return true; }
    return !!zAnchorRestore(ctn, sel, keyFn, t);
  }catch(e){ return false; }
}
function zMediaSteady(ctn, sel, keyFn){
  try{
    if(!ctn || ctn._zmed) return; ctn._zmed = true;
    let pend = false;
    function onMedia(ev){
      try{
        let t = ev.target;
        if(!t || (t.tagName!=="IMG"&&t.tagName!=="VIDEO") || !ctn.contains(t)) return;
        if(pend) return; pend = true;
        requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
          pend = false;
          try{
            if(!zTrustRestore(ctn, sel, keyFn)) zTrustSave(ctn, sel, keyFn);
          }catch(e){}
        }); });
      }catch(e){ pend = false; }
    }
    ctn.addEventListener("load", onMedia, true);
    ctn.addEventListener("loadedmetadata", onMedia, true);
    ctn.addEventListener("loadeddata", onMedia, true);
    ctn.addEventListener("error", onMedia, true);
  }catch(e){}
}
function zRepinSoon(el){
  try{
    let k = "_zpin";
    if(el[k]) clearTimeout(el[k]);
    el[k] = setTimeout(()=>{
      try{
        if(el.isConnected&&(el.scrollHeight-el.scrollTop-el.clientHeight)<120)
          el.scrollTop = el.scrollHeight;
      }catch(e){}
    }, 500);
  }catch(e){}
}
function maxAtSince(list){ let m = 0; try{ list.forEach(x=>{ if(x && x.at > m) m = x.at; }); }catch(e){} return m; }
/* hash barato p/ assinaturas: pega edição/apagada mesmo quando o tamanho não
   muda (ex: 2ª edição no meio do texto, onde o flag `ed` já estava ligado) */
function zunHash(s){ try{ s = String(s==null?"":s); let h = 5381; for(let i=0;i<s.length;i++){ h = (((h<<5)+h)+s.charCodeAt(i))|0; } return (h>>>0).toString(36); }catch(e){ return "0"; } }
function sigFeed(posts){ try{ let l=0, rp=0, ch=0, hh=""; posts.forEach(p=>{ l+=(p.lk||[]).length; rp+=(p.rp||[]).length; ch+=String(p.t||"").length+String(p.u||"").length+(p.ed?7:0)+String(p.id||"").length; hh+=p.id+"|"+(p.ed?1:0)+"|"+p.t+"|"+p.u+";"; (p.rp||[]).forEach(r=>{ ch+=String(r.t||"").length+(r.ed?7:0)+String(r.id||"").length+String(r.to||"").length; hh+=r.id+"|"+(r.ed?1:0)+"|"+r.t+"|"+r.to+";"; }); }); return posts.length+"|"+(posts.length?posts[posts.length-1].at:0)+"|"+l+"|"+rp+"|"+ch+"|"+zunHash(hh); }catch(e){ return ""; } }
function sigChat(m){ try{ let l=m.slice(-100), ch=0, hh=""; l.forEach(x=>{ ch+=String(x.t||"").length+String(x.u||"").length+(x.ed?7:0)+String(x.id||"").length; hh+=x.id+"|"+(x.ed?1:0)+"|"+x.t+"|"+x.u+";"; }); return m.length+"|"+(l.length?l[l.length-1].at:0)+"|"+(l.length?String(l[l.length-1].t||"").length:0)+"|"+ch+"|"+zunHash(hh); }catch(e){ return ""; } }
let paintSigFeed = "", paintSigPub = "", paintSigPriv = "";
function newCountSince(list, seen){ let n = 0; try{ list.forEach(x=>{ if(x && x.at > seen) n++; }); }catch(e){} return n; }
function showNewPill(pill, txt){ try{ if(!pill) return; pill.textContent = txt; pill.hidden = false; }catch(e){} }
function hideNewPill(pill){ try{ if(pill) pill.hidden = true; }catch(e){} }
function ensureNewPills(){
  try{
    if(!feedPill){ feedPill = document.createElement("button"); feedPill.hidden = true; feedPill.style.cssText = "width:100%;margin:6px 0;padding:10px;min-height:40px"; feedCtn.parentNode.insertBefore(feedPill, feedCtn); feedPill.onclick = ()=>{ let p = pendFeed; pendFeed = null; hideNewPill(feedPill); if(p) paintFeed(p); try{ feedCtn.scrollTop = 0; }catch(e){} }; }
    if(!pubPill){ pubPill = document.createElement("button"); pubPill.hidden = true; pubPill.style.cssText = "width:100%;margin:6px 0;padding:10px;min-height:40px"; pubLog.parentNode.insertBefore(pubPill, pubLog); pubPill.onclick = ()=>{ let p = pendPub; pendPub = null; hideNewPill(pubPill); if(p) paintPub(p); try{ pubLog.scrollTop = pubLog.scrollHeight; }catch(e){} }; }
    if(!privPill){ privPill = document.createElement("button"); privPill.hidden = true; privPill.style.cssText = "width:100%;margin:6px 0;padding:10px;min-height:40px"; privLog.parentNode.insertBefore(privPill, privLog); privPill.onclick = ()=>{ let p = pendPriv; pendPriv = null; hideNewPill(privPill); if(p){ let q = paintPriv(p); if(q && q.then) q.then(()=>{ try{ privLog.scrollTop = privLog.scrollHeight; }catch(e){} }); else { try{ privLog.scrollTop = privLog.scrollHeight; }catch(e){} } } }; }
    if(!pillsWired){
      pillsWired = true;
      feedCtn.addEventListener("scroll", ()=>{ if(pendFeed && atTopEdge(feedCtn)){ let p = pendFeed; pendFeed = null; hideNewPill(feedPill); paintFeed(p); } }, {passive:true});
      pubLog.addEventListener("scroll", ()=>{ if(pendPub && atBottomEdge(pubLog)){ let p = pendPub; pendPub = null; hideNewPill(pubPill); paintPub(p); } }, {passive:true});
      privLog.addEventListener("scroll", ()=>{ if(pendPriv && atBottomEdge(privLog)){ let p = pendPriv; pendPriv = null; hideNewPill(privPill); paintPriv(p); } }, {passive:true});
    }
    try{ zMediaSteady(feedCtn, ".post", el=>el.dataset.zat); }catch(e){}
    try{ zMediaSteady(pubLog, "[data-zk]", el=>el.dataset.zk); }catch(e){}
    try{ zMediaSteady(privLog, "[data-zk]", el=>el.dataset.zk); }catch(e){}
  }catch(e){}
}
/* reply (comentário do feed) tem balde local próprio, igual ao servidor:
   comentar no feed e depois falar no chat não se bloqueiam (falso positivo
   feed→chat). */
let lastSendAt = {feed:0, chat:0, reply:0};
function sendGapOk(kind, gapMs){
  let now = Date.now();
  if(now - (lastSendAt[kind]||0) < gapMs) return Math.ceil((gapMs-(now-lastSendAt[kind]))/1000);
  lastSendAt[kind] = now; return 0;
}
/* PC lento: se o envio morreu ANTES de chegar no servidor (upload falhou,
   arquivo gigante), o gap local não deve punir o retry imediato. */
function sendGapUndo(kind){
  try{ lastSendAt[kind] = 0; }catch(e){}
}
function spamErrText(r){
  if(!r || r.ok) return "";
  let w = parseInt((r&&r.wait)||0)||0;
  if(r.err==="spam") return w>0 ? "🚫 spam! aguarde "+w+"s" : "🚫 não foi — tente de novo já já";
  if(r.err==="devagar") return w>0 ? "⏳ devagar! aguarde "+w+"s" : "⏳ devagar! tente de novo já já";
  if(r.err==="ban") return "🚫 você foi banido desta sala";
  if(r.err==="inativa") return "conta em exclusão — entre de novo p/ cancelar";
  if(r.err==="anon-taken") return "esse anon já tem dono — girando p/ um livre...";
  if(r.err==="dono") return "sem token deste anon aqui — abra no navegador onde postou";
  if(r.err==="sem-banco") return "banco desatualizado — avise o dono";
  if(r.err==="fixo") return "📌 post fixo do dia — não dá p/ editar nem apagar";
  return "erro: "+(r.err||"?");
}
function flashBtn(btn, txt){
  try{
    let old = btn.textContent; btn.textContent = txt;
    setTimeout(()=>{ try{ if(btn.textContent===txt) btn.textContent = old; }catch(e){} }, 3000);
  }catch(e){}
}
/* post fixo do assunto do dia = id za-* E marcador no texto (AND p/ nunca
   travar post normal que cite o marcador). LOCAL no app.js de propósito:
   app.js carrega ANTES de zunassunto.js, e o 1º paintFeed roda antes do
   helper global existir — com typeof-guard os botões nasciam e o
   patchFeedInPlace nunca os removia. (zunassunto.js expõe o mesmo teste
   como window.zunIsTopicPost p/ console/outros módulos.) */
function zunTopicFix(p){
  try{
    if(!p) return false;
    if(typeof p==="string") return p.indexOf("💬 assunto do dia")===0;
    return String(p.id||"").indexOf("za-")===0 && String(p.t||"").indexOf("💬 assunto do dia")===0;
  }catch(e){ return false; }
}
/* Envio otimista: a PROPRIA mensagem aparece na hora (so a sua — a dos
   outros continua vindo do servidor). Cada envio cria um item pendente
   (tid "opt-..."); os paints re-anexam o item ate o servidor confirmar.
   No erro ele sai e o texto volta p/ o input. */
let optFeed = [], optPub = [], optPriv = [], pendingReplies = {};
function optTid(){ try{ return "opt-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8); }catch(e){ return "opt-"+Math.floor(Math.random()*1e9); } }
function optForget(list, tid){
  try{
    let o = null;
    try{ o = (list||[]).filter(x=>x&&x.tid===tid)[0]||null; }catch(e){}
    try{ let ix = (list||[]).findIndex(x=>x&&x.tid===tid); if(ix>=0) list.splice(ix,1); }catch(e){}
    let bu = o&&o._blobUrl;
    if(bu){ setTimeout(()=>{ try{ URL.revokeObjectURL(bu); }catch(e){} }, 60000); }
  }catch(e){}
}
function optFail(list, tid){
  try{
    let o = null;
    try{ o = (list||[]).filter(x=>x&&x.tid===tid)[0]||null; }catch(e){}
    try{ let ix = (list||[]).findIndex(x=>x&&x.tid===tid); if(ix>=0) list.splice(ix,1); }catch(e){}
    try{ if(o&&o._blobUrl) URL.revokeObjectURL(o._blobUrl); }catch(e){}
    try{ let el = document.querySelector('[data-optid="' + tid + '"]'); if(el) el.remove(); }catch(e){}
  }catch(e){}
}
/* Outbox offline r51: fila writes p/ replay quando a conexão voltar.
   - `rpc()` carimba `_cid` (idempotência) nos writes da whitelist e, se a
     rede falhar (ou modo local), fila em localStorage e devolve
     `{ok:1,queued:1}` — os callers mantêm o nó "enviando..." e o drain
     rejoga no `open` do socket.
   - like fica FORA (toggle: rejogar alternaria o estado errado).
   - Teto 50 + expiração 24h; descartado some via optFail (sem fantasma).
   - Sem sink novo: só localStorage + os mesmos rpcs já selados. */
var ZUN_OUTQ_KEY = "zunOutboxV1", ZUN_OUTQ_MAX = 50, ZUN_OUTQ_TTL = 86400000;
var ZUN_OUTQ_NAMES = {feedPush:1, reply:1, roomPush:1, pubPush:1, privPush:1, dmPush:1, feedDel:1, feedEdit:1, replyDel:1, replyEdit:1, roomMsgDel:1, roomMsgEdit:1, privMsgDel:1, privMsgEdit:1, dmDel:1, dmEdit:1};
function zunOutCid(){ try{ return "c"+Date.now().toString(36)+Math.random().toString(36).slice(2,10); }catch(e){ return "c"+Math.floor(Math.random()*1e12).toString(36); } }
function zunOutCidOk(c){ return /^[A-Za-z0-9-_]{1,40}$/.test(String(c||"")); }
function zunOutWithCid(data){
  try{
    if(typeof data!=="string"){ try{ data = JSON.stringify(data); }catch(e){ return data; } }
    var o = JSON.parse(String(data||"{}"));
    if(!o || typeof o!=="object") return String(data||"{}");
    if(!zunOutCidOk(o._cid)){ o._cid = zunOutCid(); return JSON.stringify(o); }
    return String(data);
  }catch(e){ return (typeof data==="string") ? data : String(data||"{}"); }
}
function zunOutLoad(){ try{ var a = JSON.parse(localStorage.getItem(ZUN_OUTQ_KEY)||"[]"); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function zunOutSave(a){ try{ localStorage.setItem(ZUN_OUTQ_KEY, JSON.stringify(a||[])); }catch(e){} try{ zunNetRefresh(); }catch(e2){} }
function zunOutTidOf(d){ try{ var o = JSON.parse(String(d||"{}")); var t = String((o&&o._tid)||""); return /^opt-[A-Za-z0-9-]{1,40}$/.test(t)?t:""; }catch(e){ return ""; } }
function zunOutFailTid(td){
  if(!td) return;
  try{ optFail(optFeed,td); }catch(e){}
  try{ optFail(optPub,td); }catch(e){}
  try{ optFail(optPriv,td); }catch(e){}
  try{ if(typeof pendingReplies!=="undefined" && pendingReplies) for(var k in pendingReplies){ try{ optFail(pendingReplies[k],td); }catch(e){} } }catch(e){}
}
function zunOutForgetTid(td){
  if(!td) return;
  try{ optForget(optFeed,td); }catch(e){}
  try{ optForget(optPub,td); }catch(e){}
  try{ optForget(optPriv,td); }catch(e){}
  try{
    if(typeof pendingReplies!=="undefined" && pendingReplies) for(var k in pendingReplies){ try{ var _pl=pendingReplies[k]||[]; var _ix=_pl.findIndex(function(o){ return o&&o.tid===td; }); if(_ix>=0) _pl.splice(_ix,1); }catch(e){} }
  }catch(e){}
  try{ var el = document.querySelector('[data-optid="'+td+'"]'); if(el) el.remove(); }catch(e){}
}
function zunOutPrune(q){
  try{
    var now = Date.now(), kept = [];
    (q||[]).forEach(function(it){
      if(!it || !it.at || (now-it.at)>ZUN_OUTQ_TTL){ try{ zunOutFailTid(zunOutTidOf(it&&it.data)); }catch(e){} }
      else kept.push(it);
    });
    return kept;
  }catch(e){ return q||[]; }
}
function zunOutQueue(name, data){
  try{
    if(!ZUN_OUTQ_NAMES[name]) return false;
    var q = zunOutPrune(zunOutLoad());
    var o = null; try{ o = JSON.parse(String(data||"{}")); }catch(e){ return false; }
    if(!o || typeof o!=="object") return false;
    if(!zunOutCidOk(o._cid)) return false;
    try{ if(q.some(function(it){ return it&&it.cid===String(o._cid); })) return true; }catch(e){}
    q.push({cid:String(o._cid), name:name, data:String(data), at:Date.now()});
    while(q.length>ZUN_OUTQ_MAX){ var old = q.shift(); try{ zunOutFailTid(zunOutTidOf(old&&old.data)); }catch(e){} }
    zunOutSave(q);
    return true;
  }catch(e){ return false; }
}
function zunOutCount(){ try{ return zunOutPrune(zunOutLoad()).length; }catch(e){ return 0; } }
var _zunOutDraining = false;
async function zunOutReplayOne(name, data){
  if(typeof localMode!=="undefined" && localMode) return await localRpc(name, data);
  if(typeof socket!=="undefined" && socket && socket.rpc && socket.rpc[name]){ await socket.opened; return await socket.rpc[name](data); }
  throw new Error("sem-socket");
}
/* Drain: rejoga a fila em ordem no `open` do socket. ok → aplica tokens,
   esquece o otimista e recarrega; erro definitivo (spam/auth/noid/...) →
   descarta + optFail; transitório → gira p/ o fim e tenta o resto (sem
   travar a fila no 1º item). Expirado → descarta + optFail. */
/* aviso flutuante do outbox (só texto, sem sink) */
function zunOutToast(msg){
  try{
    var el = document.getElementById("zunOutToast");
    if(!el){ el = document.createElement("div"); el.id = "zunOutToast"; el.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);background:#222;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;z-index:99999;opacity:.92"; document.body.appendChild(el); }
    el.textContent = String(msg||"");
    el.hidden = false;
    try{ clearTimeout(el._zt); }catch(e){}
    el._zt = setTimeout(function(){ try{ el.hidden = true; }catch(e){} }, 4000);
  }catch(e){}
}
window.zunOutboxDrain = async function(){
  if(_zunOutDraining) return; _zunOutDraining = true;
  try{
    if(typeof localMode!=="undefined" && localMode) return;
    if(typeof connected!=="undefined" && !connected) return;
    var q = zunOutPrune(zunOutLoad());
    zunOutSave(q);
    var changed = false, processed = 0, doneOk = 0, n = q.length, guard = n;
    while(q.length && guard-->0){
      var it = q[0], r = null;
      try{ r = JSON.parse(await zunOutReplayOne(it.name, it.data)); }
      catch(e){ break; }
      if(r && r.ok){ processed++; doneOk++;
        try{
          var po = null; try{ po = JSON.parse(it.data); }catch(e){}
          if(r.anonTok && po){ try{ anonTokSet(po.anon||anonId, r.anonTok); }catch(e){} }
          if(r.itemTok && (r.id||r.rid)){ try{ anonItemSet(r.id||r.rid, r.itemTok); }catch(e){} }
          zunOutForgetTid(zunOutTidOf(it.data));
        }catch(e){}
        q.shift(); changed = true;
      } else if(r && r.err==="anon-taken"){
        /* r54: nao engole conteudo — renova o anon e rejoga o MESMO item
           (ate 3x); senao gira p/ o fim e tenta no proximo drain. */
        var _ar = false;
        try{
          var _pa = JSON.parse(it.data);
          if(_pa && _pa.anon && typeof renewAnonForce==="function" && (it._rt||0) < 3){
            try{ renewAnonForce(); }catch(e){}
            try{ _pa.anon = anonId; _pa.anonTok = anonTokGet(anonId); }catch(e2){}
            it._rt = (it._rt||0)+1;
            it.data = JSON.stringify(_pa);
            zunOutSave(q);
            guard++;
            _ar = true;
          }
        }catch(e){}
        if(_ar){ continue; }
        q.push(q.shift());
      } else if(r && (r.err==="vazio"||r.err==="url"||r.err==="noid"||r.err==="fixo")){
        try{ zunOutFailTid(zunOutTidOf(it.data)); }catch(e){}
        q.shift(); changed = true; processed++;
      } else { q.push(q.shift()); }
    }
    if(processed){
      try{ zunOutToast(doneOk ? ("fila enviada \u2713 ("+doneOk+")") : "fila atualizada"); }catch(e){}
      zunOutSave(q);
      try{ cInv("feedGet"); }catch(e){}
      try{ cInv("roomView"); }catch(e){}
      try{ cInv("roomsList"); }catch(e){}
      try{ cInv("privGet"); }catch(e){}
      try{ loadFeed(true); }catch(e){}
      try{ loadPub(true); }catch(e){}
      try{ loadPriv(true); }catch(e){}
      try{ if(window.zunDMRenderAll) window.zunDMRenderAll(); }catch(e){}
    } else { try{ zunNetRefresh(); }catch(e){} }
  }finally{ _zunOutDraining = false; }
};
function feedOptNode(o){
  try{
    let d = document.createElement("div"); d.className = "post";
    try{ d.dataset.optid = o.tid; d.dataset.pid = o.tid; d.dataset.zat = String(o.at||0)+"|"+String(o.n||"")+"|"+o.tid; }catch(e){}
    let an0 = String(o.n||"");
    let head = document.createElement("div"); head.className = "phead";
    let who = document.createElement("span"); who.className = "who";
    if(an0.charAt(0)==="@"){ try{ who.appendChild(miniAv(an0.slice(1))); }catch(e){} let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = an0; try{ paintZNick(nm, an0.slice(1)); }catch(e){} who.appendChild(nm); }
    else { let nm2 = document.createElement("span"); nm2.className = "chatname"; nm2.textContent = an0; who.appendChild(nm2); }
    head.appendChild(who);
    let tm = document.createElement("span"); tm.className = "ptime"; tm.textContent = "enviando..."; head.appendChild(tm);
    d.appendChild(head);
    let pbody = document.createElement("div"); pbody.className = "pbody";
    let tx = document.createElement("span"); tx.className = "ptext";
    try{ tx.dataset.plain = o.t||""; tx.innerHTML = fmtChat(o.t||""); }catch(e){ try{ tx.textContent = o.t||""; }catch(e2){} }
    pbody.appendChild(tx);
    try{
      let mt = String(o.y||"").toLowerCase();
      if(o.u && mt.indexOf("image/")===0){ let im = document.createElement("img"); im.src = o.u; im.loading = "lazy"; im.referrerPolicy = "no-referrer"; im.style.cssText = "max-width:100%"; pbody.appendChild(im); }
      else if(o.u && mt.indexOf("video/")===0){ let v = document.createElement("video"); v.src = o.u; v.controls = true; v.style.cssText = "max-width:100%"; pbody.appendChild(v); }
      else if(o.u){ let a = document.createElement("a"); a.textContent = "arquivo"; if(String(o.u).toLowerCase().indexOf("https://")===0){ a.href = o.u; a.target = "_blank"; a.rel = "noopener noreferrer"; } pbody.appendChild(a); }
    }catch(e){}
    d.appendChild(pbody);
    let foot = document.createElement("div"); foot.className = "pfoot";
    let m = document.createElement("span"); m.className = "meta"; m.textContent = "enviando..."; foot.appendChild(m);
    d.appendChild(foot);
    try{ d.style.opacity = ".75"; }catch(e){}
    return d;
  }catch(e){ return null; }
}
function chatOptNode(o, inputEl){
  try{
    let uu = (o.u && String(o.u).toLowerCase().indexOf("https://")===0) ? o.u : "";
    let row = chatRow({f:o.f, t:o.t, at:o.at, u:uu, y:o.y}, inputEl||null);
    if(!row||!row.nodeType) return null;
    try{ row.dataset.optid = o.tid; row.dataset.zk2 = "opt:"+o.tid; row.dataset.zs = "opt"; row.style.opacity = ".65"; }catch(e){}
    try{ let m = document.createElement("span"); m.className = "meta"; m.style.marginLeft = "6px"; m.textContent = "enviando..."; row.appendChild(m); }catch(e){}
    try{
      let mt = String(o.y||"").toLowerCase();
      if(o._blobUrl && mt.indexOf("image/")===0){ let im = document.createElement("img"); im.className = "chatimg"; im.loading = "lazy"; im.referrerPolicy = "no-referrer"; im.src = o._blobUrl; row.appendChild(im); }
      else if(o._blobUrl && mt.indexOf("video/")===0){ let v = document.createElement("video"); v.className = "chatfile"; v.controls = true; v.src = o._blobUrl; row.appendChild(v); }
    }catch(e){}
    return row;
  }catch(e){ return null; }
}
function feedOptReplyNode(o, onAns, p){
  try{
    let nd = feedReplyNode({id:o.tid, n:o.n, t:o.t, at:o.at}, 0, onAns, p);
    if(!nd||!nd.nodeType) return null;
    try{
      nd.dataset.optid = o.tid; nd.style.opacity = ".65";
      nd.querySelectorAll(".fract button").forEach(b=>{ try{ var _bt = String(b.textContent||""); if(_bt!=="responder" && _bt.indexOf("🚨")<0) b.remove(); }catch(e){} });
      let act = nd.querySelector(".fract");
      if(act){ let m = document.createElement("span"); m.className = "meta"; m.textContent = " enviando..."; act.appendChild(m); }
    }catch(e){}
    return nd;
  }catch(e){ return null; }
}
function paintFeedOpt(){
  try{
    if(typeof feedCtn==="undefined"||!feedCtn||!feedCtn.isConnected) return;
    (optFeed||[]).forEach(o=>{
      try{
        if(!o||!o.tid||feedCtn.querySelector('[data-optid="' + o.tid + '"]')) return;
        let nd = feedOptNode(o); if(!nd||!nd.nodeType) return;
        feedCtn.insertBefore(nd, feedCtn.firstChild);
        try{ if((feedCtn.scrollTop||0)>60) feedCtn.scrollTop += (nd.offsetHeight||0); }catch(e){}
      }catch(e){}
    });
  }catch(e){}
}
function paintPubOpt(){
  try{
    if(typeof pubLog==="undefined"||!pubLog||!pubLog.isConnected) return;
    let rk = (typeof pubRoom!=="undefined"?pubRoom:"geral")+"|"+(typeof pubTopic!=="undefined"&&pubTopic?pubTopic:"");
    (optPub||[]).forEach(o=>{
      try{
        if(!o||!o.tid) return;
        if((o.room+"|"+(o.topic||""))!==rk) return;
        if(pubLog.querySelector('[data-optid="' + o.tid + '"]')) return;
        let row = chatOptNode(o, (typeof pubInput!=="undefined"?pubInput:null));
        if(row&&row.nodeType){ pubLog.appendChild(row); try{ healFreshRows([row]); }catch(e){} }
      }catch(e){}
    });
    try{ pubLog.scrollTop = pubLog.scrollHeight; }catch(e){}
  }catch(e){}
}
function paintPrivOpt(){
  try{
    if(typeof privLog==="undefined"||!privLog||!privLog.isConnected) return;
    (optPriv||[]).forEach(o=>{
      try{
        if(!o||!o.tid) return;
        if((o.room||"")!==(typeof privRoom!=="undefined"?privRoom:"")) return;
        if(privLog.querySelector('[data-optid="' + o.tid + '"]')) return;
        let row = chatOptNode(o, (typeof privMsgInput!=="undefined"?privMsgInput:null));
        if(row&&row.nodeType){ privLog.appendChild(row); try{ healFreshRows([row]); }catch(e){} }
      }catch(e){}
    });
    try{ privLog.scrollTop = privLog.scrollHeight; }catch(e){}
  }catch(e){}
}
/* Feedback visual p/ editar/apagar (e outros writes): durante o rpc o botão
   desabilita e mostra "enviando" — antes ficava parado e parecia travado.
   Botão de texto ganha "⏳ ..."; botão só-ícone (✏️/🗑️/❌/SVG) escurece sem
   destruir os filhos. No erro, chame zunBusy(btn,false) ANTES de flashBtn(),
   senão o flash restaura o rótulo do spinner. */
function zunBusy(btn, on, label){
  try{
    if(!btn) return "";
    if(on){
      if(btn.dataset.zunBusy) return btn.dataset.zunBusyOld||"";
      btn.dataset.zunBusy = "1";
      var old = "";
      try{ old = btn.textContent||""; }catch(e){}
      btn.dataset.zunBusyOld = old;
      btn.disabled = true;
      try{ btn.setAttribute("aria-busy","true"); }catch(e){}
      var hasKid = false;
      try{ hasKid = !!(btn.querySelector && btn.querySelector("svg,img,canvas,video")); }catch(e){}
      var short = String(old||"").trim();
      if(hasKid || short.length<=2){
        try{ btn.style.opacity = ".45"; btn.style.cursor = "wait"; }catch(e){}
        if(!hasKid){ try{ btn.textContent = "⏳"; }catch(e){} }
      } else {
        try{ btn.textContent = label||"⏳..."; }catch(e){}
      }
      return old;
    } else {
      if(!btn.dataset.zunBusy) return "";
      var prev = "";
      try{ prev = btn.dataset.zunBusyOld||""; }catch(e){}
      try{ delete btn.dataset.zunBusy; }catch(e){}
      try{ delete btn.dataset.zunBusyOld; }catch(e){}
      btn.disabled = false;
      try{ btn.removeAttribute("aria-busy"); }catch(e){}
      try{ btn.style.opacity = ""; btn.style.cursor = ""; }catch(e){}
      var cur = "";
      try{ cur = btn.textContent||""; }catch(e){}
      if(cur==="⏳"||cur==="⏳..."||cur==="⏳ salvando..."||cur==="⏳ apagando..."||(label && cur===label)){
        try{ btn.textContent = prev; }catch(e){}
      }
      return prev;
    }
  }catch(e){ return ""; }
}
try{ window.zunBusy = zunBusy; }catch(e){}
/* loading visível nas áreas lentas (feed/chat/salas/depo): só pinta se a
   área ainda está vazia — o cold path dos painters (innerHTML="") limpa. */
function zunLoading(el, msg){
  try{
    if(!el) return;
    /* dica de "vazio" do zunemoji não conta como conteúdo: se ficar, o
       loading nunca aparece (era o bug do chat geral sem spinner) */
    try{ el.querySelectorAll("[data-zempty]").forEach(function(h){ try{ h.remove(); }catch(e){} }); }catch(e){}
    if(el.childNodes.length) return;
    el.innerHTML = "";
    let s = document.createElement("span"); s.className = "meta";
    let sp = document.createElement("span"); sp.className = "spin"; s.appendChild(sp);
    s.appendChild(document.createTextNode(" "+String(msg||"carregando...")));
    el.appendChild(s);
  }catch(e){}
}
/* Esqueleto fantasma do chat (skeleton): linhas com altura de mensagem real
   enquanto o banco não responde. Sem data-zk/data-zk2 (o patch incremental e
   a âncora ignoram) e sem texto. Só aparece sem conteúdo real; some no cold
   (innerHTML) ou no hot (remoção explícita). */
function zunChatSkeleton(log, n){
  try{
    if(!log || log.querySelector("[data-zk],.zskel")) return false;
    try{ log.querySelectorAll("[data-zempty]").forEach(function(h){ try{ h.remove(); }catch(e){} }); }catch(e){}
    let total = 24;
    try{ total = Math.max(12, Math.min(30, Number(n)||24)); }catch(e){ total = 24; }
    let frag = document.createDocumentFragment();
    for(let i=0;i<total;i++){
      let d = document.createElement("div");
      d.className = "zskel"; d.setAttribute("aria-hidden", "true");
      let av = document.createElement("span"); av.className = "zskel-av"; d.appendChild(av);
      let ln = document.createElement("span"); ln.className = "zskel-lines";
      let b1 = document.createElement("span"); b1.className = "zskel-bar w40"; ln.appendChild(b1);
      let b2 = document.createElement("span"); b2.className = "zskel-bar w90"; ln.appendChild(b2);
      d.appendChild(ln);
      frag.appendChild(d);
    }
    log.appendChild(frag);
    return true;
  }catch(e){ return false; }
}
/* cache de leitura do feed/chat (só leitura instantânea — TODA consulta vai ao
   servidor e o diff de assinatura aplica edições/apagadas; o snapshot nunca
   decide nada, só mostra algo na hora até o fresco chegar) */
function zunSnapSave(key, items){
  try{
    if(!key || !Array.isArray(items) || !items.length) return;
    let s = JSON.stringify({t:Date.now(), items:items.slice(-40)});
    if(s.length>200000) return;
    localStorage.setItem("zunSnap:"+key, s);
  }catch(e){}
}
function zunSnapLoad(key, maxAge){
  try{
    let s = localStorage.getItem("zunSnap:"+key);
    if(!s) return null;
    let o = JSON.parse(s);
    if(!o || !Array.isArray(o.items) || !o.items.length) return null;
    if(Date.now()-(o.t||0) > (maxAge||12*3600*1000)) return null;
    return o.items;
  }catch(e){ return null; }
}
let feedCk = null, feedCkN = 0; // checkpoint do poller (pula o full quando nada muda)
let ckMe = null; // dono atual p/ invalidar checkpoints em troca de conta/anon
function ckMeChanged(){ let m=""; try{ m = myKey(); }catch(e){} if(m!==ckMe){ ckMe = m; return true; } return false; }
async function loadFeed(force){
  try{
    if(!paintedFeed){ try{ let _fs = zunSnapLoad("feed"); if(_fs && _fs.length) paintFeed(_fs); }catch(e){} }
    if(!paintedFeed) zunLoading(feedCtn, "carregando feed...");
    /* egress: checkpoint antes do full (~270KB). Só baixa tudo quando um dos
       3 carimbos muda, ou no backstop a cada 5 ciclos (pega edições). */
    if(!force && paintedFeed){
      try{
        let ck = JSON.parse(await rpc("feedGet", JSON.stringify({ping:1})));
        if(ck && ck.ok){
          let sig = ck.p+"|"+ck.l+"|"+ck.r;
          feedCkN++;
          if(!ckMeChanged() && feedCk === sig && feedCkN % 5 !== 0) return;
          feedCk = sig;
        }
      }catch(e){}
    }
    let posts = JSON.parse(await crpc("feedGet",""));
    if(!Array.isArray(posts)) return;
    try{ lastFeedAt = posts.length ? posts[posts.length-1].at : 0; }catch(e){}
    ensureNewPills();
      let _sgf = sigFeed(posts);
      /* dono mudou (login/logout/troca de anon)? os botões ✏️/🗑️ e o
         destaque de curtida dependem de quem está vendo — o patch no lugar
         não cobre isso, então força repaint completo. */
      if(!force && paintedFeed && _sgf===paintSigFeed && window._paintFeedMe===myKey()) return;
    /* Mesma lista, só contadores/respostas mudaram (curtida típica): atualiza
       os botões no lugar em vez de reconstruir o feed — sem pulo de scroll. */
    if(patchFeedInPlace(posts)){ pendFeed = null; hideNewPill(feedPill); return; }
    if(!force && paintedFeed && !atTopEdge(feedCtn)){
      let n = newCountSince(posts, seenAtFeed);
      if(n > 0){ pendFeed = posts; showNewPill(feedPill, "↑ " + n + (n > 1 ? " novos posts" : " novo post")); return; }
    }
    pendFeed = null; hideNewPill(feedPill);
    paintFeed(posts);
  }catch(e){ if(!paintedFeed){ try{ zunLoading(feedCtn, "conectando servidor..."); }catch(e2){} } }
}
function feedReplyNode(r, depth, onAns, p, onChanged){
  let rd = document.createElement("div");
  rd.className = "freply";
  try{ if(r && r.id) rd.dataset.rid = r.id; }catch(e){} /* guard de vídeo casa por rid */
  if(depth>0){ rd.style.marginLeft = (Math.min(depth,4)*16)+"px"; rd.style.borderLeft = "3px solid #6aa5d7"; }
  let fh = document.createElement("div"); fh.className = "frhead";
  let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = r.n;
  if(String(r.n||"").charAt(0)==="@"){ nm.title = ztr("ver perfil ")+r.n; nm.onclick = ()=>openProfile(r.n); try{ paintZNick(nm, String(r.n).slice(1)); }catch(e){} }
  fh.appendChild(nm);
  try{ let _rt2 = zunRelTime(r.at); if(_rt2.t){ let tm2 = document.createElement("span"); tm2.className = "ptime"; tm2.textContent = _rt2.t; if(_rt2.a) tm2.title = _rt2.a; fh.appendChild(tm2); } }catch(e){}
  rd.appendChild(fh);
  let fb = document.createElement("div"); fb.className = "frbody";
  let tx = document.createElement("span"); tx.className = "ptext"; tx.dataset.plain = (r.t||"")+(r.ed?" (editada)":""); tx.innerHTML = fmtChat(tx.dataset.plain); fb.appendChild(tx);
  rd.appendChild(fb);
  try{ ytFacadesFor(r.t, 1).forEach(function(f){ fb.appendChild(f); }); }catch(e){}
  try{ if(isVeladoTxt(r.t)) paintVelado(rd, [tx]); }catch(e){}
  let act = document.createElement("div"); act.className = "fract";
  let ans = document.createElement("button"); ans.textContent = "responder";
  ans.onclick = (ev)=>{ ev.stopPropagation(); if(onAns) onAns({id:r.id, n:r.n}); };
  act.appendChild(ans);
  try{
    var _rden = document.createElement("button");
    _rden.textContent = "🚨"; _rden.title = "denunciar resposta — vai para a caixa do dono como denúncia";
    (function(_rr2,_pp2){ _rden.onclick = function(ev){ try{ if(ev) ev.stopPropagation(); }catch(e){} try{ zunReport("resposta", "@"+String(_rr2.n||"?")+" · "+String(_rr2.t||"").slice(0,120)); }catch(e){} }; })(r,p);
    act.appendChild(_rden);
  }catch(e){}
  try{
    if(p && p.id && r.id && r.n===myKey()){
      let eb = document.createElement("button"); eb.title = "editar resposta"; if(typeof zunSvgPencilBtn==="function") zunSvgPencilBtn(eb); else eb.textContent = "✏️";
      eb.onclick = (ev)=>{
        ev.stopPropagation();
        if(rd.querySelector(".feedEditBox")) return;
        let box = document.createElement("div"); box.className = "feedEditBox"; box.style.marginTop = "3px";
        let inp = document.createElement("input"); inp.value = r.t||""; inp.maxLength = 300;
        let sv = document.createElement("button"); sv.textContent = "ok"; sv.style.marginLeft = "4px";
        let cx = document.createElement("button"); cx.textContent = "x"; cx.style.marginLeft = "4px";
      box.append(inp, sv, cx); rd.appendChild(box);
      try{ if(window.ZunFmtBar) ZunFmtBar.attach(inp, {compact:true}); }catch(e){}
        try{ inp.focus(); inp.select(); }catch(e){}
        cx.onclick = ()=>{ try{ box.remove(); }catch(e){} };
        sv.onclick = async ()=>{
          let t = inp.value.trim();
          if(!t || t===(r.t||"")){ try{ box.remove(); }catch(e){} return; }
          t = t.slice(0,300);
          let oldPlain = "", oldHtml = "";
          try{ oldPlain = tx.dataset.plain; oldHtml = tx.innerHTML; tx.dataset.plain = t+" (editada)"; tx.innerHTML = fmtChat(t+" (editada)"); }catch(e){}
          try{ box.remove(); }catch(e){}
          let rr = null;
          try{ rr = JSON.parse(await rpc("replyEdit", JSON.stringify(anonEditPayload(Object.assign(likePayload(p.id), {rid:r.id, text:t}), r.id)))); }catch(e){}
          if(!rr || !rr.ok){
            try{ tx.dataset.plain = oldPlain; tx.innerHTML = oldHtml; }catch(e){}
            let _rm = "erro"; try{ _rm = !rr ? "sem servidor" : (spamErrText(rr)||"erro"); }catch(e){}
            try{ flashBtn(eb, _rm); }catch(e){}
            return;
          }
          try{ r.t = t; r.ed = 1; }catch(e){}
          cInv("feedGet"); loadFeed(true);
        };
      };
      let db = document.createElement("button"); db.title = "apagar resposta"; if(typeof zunSvgTrashBtn==="function") zunSvgTrashBtn(db); else db.textContent = "🗑️";
      db.onclick = async (ev)=>{
        ev.stopPropagation();
        if(!confirm("apagar esta resposta?")) return;
        zunBusy(db, true, "⏳ apagando...");
        try{ rd.style.display = "none"; }catch(e){}
        try{
          let rr = JSON.parse(await rpc("replyDel", JSON.stringify(anonEditPayload(Object.assign(likePayload(p.id), {rid:r.id}), r.id))));
          if(rr && rr.queued && !rr.local){ zunBusy(db, false); return; }
          if(!rr.ok){ try{ rd.style.display = ""; }catch(e){} zunBusy(db, false); flashBtn(db, spamErrText(rr)||"erro"); return; }
          cInv("feedGet"); loadFeed(true);
        }catch(e){ try{ rd.style.display = ""; }catch(_e){} zunBusy(db, false); }
      };
      act.appendChild(eb); act.appendChild(db);
    }
  }catch(e){}
  rd.appendChild(act);
  return rd;
}
function renderFeedReplies(rlist, p, onAns){
  try{
    let _vstash = zunVideoStash(rlist); /* guard: reply c/ vídeo não recarrega */
    rlist.innerHTML = "";
    /* preserva ed (editada) + to (thread); sem isso a edição sumia e o
       nível 3+ caía no vazio */
    let list = (p.rp||[]).map((r,ix)=>({id:r.id||("r-"+ix), n:r.n, t:r.t, at:r.at, to:r.to||null, ed:r.ed||0})).filter(r=>{ try{ return !zunBlocked(String(r.n||"").replace(/^@/,"")); }catch(e){ return true; } });
    let byId = {}; list.forEach(r=>{ if(!byId[r.id]) byId[r.id] = r; });
    let kids = {}; list.forEach(r=>{ if(r.to && byId[r.to] && r.to!==r.id){ (kids[r.to] = kids[r.to]||[]).push(r); } });
    let tops = list.filter(r=>!(r.to && byId[r.to] && r.to!==r.id));
    if(!tops.length && list.length) tops = [list[0]];
    let seen = {};
    function walk(node, depth){
      if(!node || seen[node.id]) return;
      seen[node.id] = 1;
      /* indent visual trava em 5 p/ não estourar a largura, mas a msg
         sempre é anexada — antes o nível 3+ (resposta de resposta de
         resposta) nunca era renderizado e ficava "escondido" */
      try{ rlist.appendChild(feedReplyNode(node, Math.min(depth,5), onAns, p)); }catch(e){}
      (kids[node.id]||[]).forEach(c=>{ if(!seen[c.id]) walk(c, depth+1); });
    }
    tops.forEach(t=>walk(t,0));
    /* ciclo/órfã que não foi alcançada: mostra no fim, nunca esconde */
    try{ list.forEach(r=>{ if(!seen[r.id]) walk(r,0); }); }catch(e){}
    /* otimista: a propria resposta aparece na hora (sai quando o servidor confirmar) */
    try{ ((pendingReplies&&p&&p.id&&pendingReplies[p.id])||[]).forEach(o=>{ try{ if(rlist.querySelector('[data-optid="'+o.tid+'"]')) return; let nd = feedOptReplyNode(o, onAns, p); if(nd&&nd.nodeType) rlist.appendChild(nd); }catch(e2){} }); }catch(e){}
    try{ zunVideoUnstash(rlist, _vstash); }catch(e){}
  }catch(e){}
}
/* BOT DO FEED DESLIGADO (pedido do dono 2026-11-06): posts do 🤖Zunzim·IA
   somem do feed — só gente, mesmo que fique parado. Filtra ANTES do slice
   p/ os 20 slots irem p/ gente. Reverter = tirar o && + religar o aiTick. */
function zunIsBotPost(p){ try{ return String((p&&p.n)||"").replace(/^@/,"")==="🤖Zunzim·IA"; }catch(e){ return false; } }
function feedExpectedPosts(posts){
  try{
    return posts.slice().reverse().filter(p=>{ try{ return !zunBlocked(String(p.n||"").replace(/^@/,"")) && !zunIsBotPost(p); }catch(e){ return true; } }).slice(0, window._feedShown||20);
  }catch(e){ return []; }
}
/* Mesma lista de posts na mesma ordem? Atualiza curtidas/contadores e as
   respostas das caixas ABERTAS no lugar, com âncora localizada. Evita o
   rebuild completo (que recarregava todas as imagens e pulava o scroll)
   a cada curtida. Retorna true se resolveu. */
/* Assinatura do conteúdo "pesado" do post (texto/mídia/autor/edição): quando
   muda, o nó precisa ser reconstruído; quando é igual, o nó é reutilizado no
   lugar — o iframe do YouTube (e o <video>) continua tocando sem reload.
   Curtidas e respostas NÃO entram aqui: são atualizadas no lugar (patch). */
function feedPostSig(p){
  try{ return String((p&&p.id)||"")+"|"+((p&&p.ed)?1:0)+"|"+String((p&&p.t)||"")+"|"+String((p&&p.u)||"")+"|"+String((p&&p.y)||"")+"|"+String((p&&p.n)||"")+"|"+((p&&p._topic)?1:0); }catch(e){ return ""; }
}
/* Atualiza os campos "leves" de um nó de post existente, sem mexer na mídia
   (fachadas do YouTube / <video> continuam intactas, sem reload). Usado pelo
   patch rápido e pela reconciliação do paintFeed. */
function patchFeedPost(el, p){
  try{
        let myR = (p.rx && p.rx[myKey()]) || (((p.lk||[]).indexOf(myKey())>=0) ? "curti" : null);
        let lb = el.querySelector("[data-lkbtn]");
        if(lb){ lb.textContent = reactLabel(p, myR); try{ let cc = reactCountsLocal(p); lb.title = (p.lk||[]).length ? Object.keys(cc).map(k=>reactEmoji(k)+" "+k+": "+cc[k]).join(" · ") : ""; }catch(e){} }
        let rb2 = el.querySelector("[data-rct]");
        if(rb2) rb2.textContent = ztr("respostas ("+((p.rp||[]).length)+")");
        try{
          let ptx = el.querySelector(":scope > div > .ptext, :scope > .ptext");
          let want = (p.t||"")+(p.ed?" (editada)":"");
          try{ if(p && p._topic && typeof zunAssuntoText==="function"){ let _lt2 = zunAssuntoText(p); if(_lt2) want = _lt2+(p.ed?" (editada)":""); } }catch(e){}
          let cur = (ptx && ptx.dataset.plain!=null) ? ptx.dataset.plain : (ptx ? ptx.textContent : null);
          if(ptx && !ptx.querySelector("input") && cur !== (": "+want) && cur !== want){
            let pref = String(cur||"").indexOf(": ")===0 ? ": " : "";
            ptx.dataset.plain = pref+want; ptx.innerHTML = fmtChat(ptx.dataset.plain);
          }
        }catch(e){}
        /* post fixo nunca tem ✏️/🗑️: tira se o DOM veio velho (ex. bfcache
           com paint de código anterior ao bloqueio). */
        try{
          if(zunTopicFix(p)){ el.querySelectorAll('.pfoot [title="apagar post"], .pfoot [title^="editar"]').forEach(function(b){ try{ b.remove(); }catch(e){} }); }
        }catch(e){}
        let rbox = el.querySelector("[data-pid]");
        /* atualiza a lista de respostas mesmo com a caixa FECHADA: antes só
           a caixa aberta era re-renderizada no patch, então abrir a caixa
           depois mostrava as respostas velhas do paint (novas "escondidas"
           até um rebuild completo). Render escondido é barato e deixa o
           abrir sempre fresco. */
        if(rbox && typeof rbox._feedRender==="function"){
          let rlist = el.querySelector("[data-rlist]");
          let rsig = "";
          try{ rsig = (p.rp||[]).map(r=>String(r.id||"")+":"+String(r.t||"").length+(r.ed?"e":"")+"@"+String(r.to||"")).join(","); }catch(e){}
          if(rbox._feedRSig!==rsig){ rbox._feedRSig = rsig; try{ rbox._feedRender(p); }catch(e){} }
          else if(!rbox.hidden && rlist){
            let visN = 0;
            try{ visN = (p.rp||[]).filter(r=>{ try{ return !zunBlocked(String((r&&r.n)||"").replace(/^@/,"")); }catch(e){ return true; } }).length; }catch(e){ visN = (p.rp||[]).length; }
            if(rlist.childNodes.length!==visN) try{ rbox._feedRender(p); }catch(e){}
          }
        }
  }catch(e){}
}
function patchFeedInPlace(posts){
  try{
    if(!paintedFeed || !feedCtn || !feedCtn.isConnected) return false;
    if(window._paintFeedMe!==myKey()) return false;
    /* mesma ordem do paint: o pin do assunto-do-dia move o fixo p/ o topo —
       sem aplicar aqui, a ordem nunca batia e o patch sempre falhava (cada
       evento realtime ~30s virava repaint c/ moves). Copia rasa: o pin mexe
       só na ordem do array (objetos compartilhados, flag idempotente). */
    let _pp = posts;
    try{ if(typeof zunAssuntoPin==="function"){ let _cp = posts.slice(); _pp = zunAssuntoPin(_cp)||posts; } }catch(e){}
    let exp = feedExpectedPosts(_pp);
    /* otimista "enviando..." fica FORA do patch (não está no `posts` do
       servidor): antes ele quebrava a conta e caía no rebuild, que apagava
       o "enviando..." no meio do upload. */
    let els = [...feedCtn.querySelectorAll(":scope > .post:not([data-optid])")];
    if(!els.length || els.length!==exp.length) return false;
    let map = {}; posts.forEach(p=>{ if(p && p.id) map[p.id] = p; });
    for(let i=0;i<els.length;i++){ if(!exp[i] || !exp[i].id || els[i].dataset.pid!==exp[i].id) return false; }
    let anc = null;
    try{ anc = zAnchorSave(feedCtn, ".post", el=>el.dataset.zat); }catch(e){}
    for(let i=0;i<els.length;i++){
      let p = map[exp[i].id]; if(!p) return false;
      try{ patchFeedPost(els[i], p); }catch(e){}
    }
    try{ if(anc) zAnchorRestore(feedCtn, ".post", el=>el.dataset.zat, anc); }catch(e){}
      try{ zTrustSave(feedCtn, ".post", el=>el.dataset.zat); }catch(e){}
      seenAtFeed = maxAtSince(posts); paintedFeed = true; paintSigFeed = sigFeed(posts);
      try{ window._paintFeedMe = myKey(); }catch(e){}
      return true;
  }catch(e){ return false; }
}
/* edição inline de post próprio do feed */
function feedEditInline(postEl, p, ptx, eb){
  try{
    if(!postEl || postEl.querySelector(".feedEditBox")) return;
    try{ if(zunTopicFix(p)){ if(eb) flashBtn(eb, "📌 post fixo do dia"); return; } }catch(e){}
    let box = document.createElement("div"); box.className = "feedEditBox"; box.style.marginTop = "4px";
    let inp = document.createElement("input"); inp.value = p.t||""; inp.style.width = "100%"; inp.maxLength = 500;
    let sv = document.createElement("button"); sv.textContent = "salvar"; sv.style.marginRight = "6px";
    let cx = document.createElement("button"); cx.textContent = "cancelar";
    box.append(inp, sv, cx);
    try{ postEl.appendChild(box); inp.focus(); inp.select(); }catch(e){}
    try{ if(window.ZunFmtBar) ZunFmtBar.attach(inp, {compact:true}); }catch(e){}
    cx.onclick = ()=>{ try{ box.remove(); }catch(e){} };
    sv.onclick = async ()=>{
      let t = inp.value.trim();
      if(!t || t===(p.t||"")){ try{ box.remove(); }catch(e){} return; }
      t = t.slice(0,500);
      let oldPlain = "", oldHtml = "";
      try{ if(ptx){ oldPlain = ptx.dataset.plain; oldHtml = ptx.innerHTML; ptx.dataset.plain = t+" (editada)"; ptx.innerHTML = fmtChat(t+" (editada)"); } }catch(e){}
      try{ box.remove(); }catch(e){}
      let r = null;
      try{ r = JSON.parse(await rpc("feedEdit", JSON.stringify(anonEditPayload(Object.assign(likePayload(p.id), {text:t, url:p.u||"", mtype:p.y||""}), p.id)))); }catch(e){}
      if(!r || !r.ok){
        try{ if(ptx){ ptx.dataset.plain = oldPlain; ptx.innerHTML = oldHtml; } }catch(e){}
        let em = "erro"; try{ em = !r ? "sem servidor" : (spamErrText(r)||"erro"); }catch(e){}
        try{ if(eb) flashBtn(eb, em); }catch(e){}
        return;
      }
      try{ p.t = t; p.ed = 1; }catch(e){}
      cInv("feedGet"); loadFeed(true);
    };
  }catch(e){}
}
function paintFeed(posts){
  try{ if(typeof zunAssuntoPin==="function"){ try{ posts = zunAssuntoPin(posts)||posts; }catch(e){} } }catch(e){}
  try{
    let openIds = {}, st = 0, sh0 = 0, ancF = null, wasFirst = false;
    try{ wasFirst = !paintedFeed; }catch(e){}
    try{ st = feedCtn.scrollTop||0; sh0 = feedCtn.scrollHeight||0; ancF = zAnchorSave(feedCtn, ".post", el=>el.dataset.zat); feedCtn.querySelectorAll("[data-pid]:not(.post)").forEach(b=>{ if(!b.hidden) openIds[b.dataset.pid]=1; }); }catch(e){}
    /* Rascunhos das caixas de resposta abertas (o rebuild destrói os inputs). */
    let drafts = [];
    try{
      feedCtn.querySelectorAll("[data-pid]:not(.post)").forEach(box=>{
        if(box.hidden) return;
        let inp = box.querySelector("textarea,input"); if(!inp) return;
        if(inp.value || document.activeElement===inp) drafts.push({pid:box.dataset.pid, v:inp.value, focused:document.activeElement===inp});
      });
    }catch(e){}
    /* Reconciliação por pid (FIX reload do YouTube): o rebuild cego
       (`innerHTML=""`) destruía os iframes a cada repaint (poller com feed no
       topo, abrir respostas, "ver mais", pílula de novos posts) — todo vídeo
       recarregava/parava sozinho. Agora os nós existentes são REUTILIZADOS no
       lugar (só o que é novo ou teve o conteúdo pesado alterado é
       construído); mover com appendChild preserva o iframe, destruir
       (`innerHTML`/remove) recarregaria. */
    let _oldByPid = {};
    try{ feedCtn.querySelectorAll(":scope > .post[data-pid]:not([data-optid])").forEach(function(_el){ try{ if(_el.dataset.pid && !_oldByPid[_el.dataset.pid]) _oldByPid[_el.dataset.pid] = _el; }catch(e){} }); }catch(e){}
    try{ feedCtn.querySelectorAll(":scope > [data-optid]").forEach(function(_el){ try{ _el.remove(); }catch(e){} }); }catch(e){}
    try{ let _mb0 = document.getElementById("feedMoreBtn"); if(_mb0) _mb0.remove(); }catch(e){}
    try{ feedCtn.querySelectorAll(":scope > span.meta").forEach(function(_el){ try{ _el.remove(); }catch(e){} }); }catch(e){}
    try{ if(posts.length !== (window._feedTotal||-1) && (window._feedShown||20) >= posts.length) window._feedShown = 20; }catch(e){}
    window._feedTotal = posts.length;
    let _needFull = false;
    try{ _needFull = (window._paintFeedMe!==myKey()); }catch(e){ _needFull = true; }
    let _expIds = {};
    try{ posts.slice().reverse().filter(function(_p){ try{ return !!(_p&&_p.id) && !zunBlocked(String(_p.n||"").replace(/^@/,"")) && !zunIsBotPost(_p); }catch(e){ return !!(_p&&_p.id); } }).slice(0, window._feedShown||20).forEach(function(_p){ try{ _expIds[_p.id] = 1; }catch(e){} }); }catch(e){}
    try{ Object.keys(_oldByPid).forEach(function(_pid){ if(!_expIds[_pid]){ try{ _oldByPid[_pid].remove(); }catch(e){} try{ delete _oldByPid[_pid]; }catch(e){} } }); }catch(e){}
    if(!posts.length){ try{ let _vz = document.createElement("span"); _vz.className = "meta"; _vz.textContent = "vazio"; feedCtn.appendChild(_vz); }catch(e){} }
    let _lastPlaced = null; /* âncora p/ inserção sem moves redundantes */
    posts.slice().reverse().filter(p=>{ try{ return !zunBlocked(String(p.n||"").replace(/^@/,"")) && !zunIsBotPost(p); }catch(e){ return true; } }).slice(0, window._feedShown||20).forEach(p=>{
      /* conteúdo pesado igual? reusa o nó (preserva YouTube/<video> tocando)
         e só atualiza o leve no lugar + reordena. */
      let _vpost = null;
      try{
        let _old = (p && p.id && !_needFull) ? _oldByPid[p.id] : null;
        if(_old && _old.isConnected && _old._feedSig && _old._feedSig===feedPostSig(p)){
          patchFeedPost(_old, p);
          try{ if(_old.dataset) _old.dataset.zat = String((p&&p.at)||0)+"|"+String((p&&p.n)||"")+"|"+String((p&&p.id)||""); }catch(e){}
          /* ancorado: só move se saiu do lugar (insertBefore no próprio
             nextSibling é no-op por spec). Zero churn p/ o player. */
          try{ feedCtn.insertBefore(_old, _lastPlaced ? _lastPlaced.nextSibling : feedCtn.firstChild); }catch(e){ try{ feedCtn.appendChild(_old); }catch(e2){} }
          _lastPlaced = _old;
          return;
        }
        /* rebuild: estaciona os vídeos ao vivo ANTES de remover (o guard
           reencaixa no nó novo; sem isso o iframe recarregava aqui). */
        try{
          let _victim = (p && p.id) ? _oldByPid[p.id] : null;
          if(_victim && _victim.isConnected){ try{ _vpost = zunVideoStash(_victim); }catch(e){} try{ _victim.remove(); }catch(e){} }
          try{ if(p && p.id) delete _oldByPid[p.id]; }catch(e){}
        }catch(e){}
      }catch(e){}
      let d = document.createElement("div"); d.className = "post";
      let an0 = String((p&&p.n)||"");
      try{ d.dataset.zat = String((p&&p.at)||0)+"|"+an0+"|"+String((p&&p.id)||""); }catch(e){}
      try{ if(p && p.id) d.dataset.pid = p.id; try{ if(p && p._topic) d.dataset.topicPost = "1"; }catch(e){} }catch(e){}
      let an = an0;
      let ptx = null;
      if(an==="📢support-zunzum"){ d.dataset.annPost = "1"; }
      else if(an==="🤖Zunzim·IA"){ d.dataset.aiPost = "1"; }
      let head = document.createElement("div"); head.className = "phead";
      let who = document.createElement("span"); who.className = "who";
      if(p && p._topic){ let nmT = document.createElement("span"); nmT.className = "chatname"; try{ nmT.textContent = ztr("💬 assunto do dia"); nmT.title = ztr("pergunta do dia — responda abaixo"); }catch(e){ nmT.textContent = "💬 assunto do dia"; } who.appendChild(nmT); }
      else if(an.charAt(0)==="@"){ who.appendChild(miniAv(an.slice(1))); let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = an; nm.title = ztr("ver perfil ")+an; nm.onclick = ()=>openProfile(an); try{ paintZNick(nm, an.slice(1)); }catch(e){} who.appendChild(nm); let odf = onDot(an.slice(1)); if(odf) who.appendChild(odf); }
      else { let nm2 = document.createElement("span"); nm2.className = "chatname"; nm2.textContent = an; who.appendChild(nm2); }
      head.appendChild(who);
      try{ let _rt = zunRelTime(p.at); let tm = document.createElement("span"); tm.className = "ptime"; tm.textContent = _rt.t; if(_rt.a) tm.title = _rt.a; head.appendChild(tm); }catch(e){}
      d.appendChild(head);
      let pbody = document.createElement("div"); pbody.className = "pbody";
      let tx = document.createElement("span"); tx.className = "ptext"; let _plain = (p.t||"")+(p.ed?" (editada)":""); try{ if(p && p._topic && typeof zunAssuntoText==="function"){ let _lt = zunAssuntoText(p); if(_lt) _plain = _lt+(p.ed?" (editada)":""); } }catch(e){} tx.dataset.plain = _plain; tx.innerHTML = fmtChat(tx.dataset.plain); pbody.appendChild(tx); ptx = tx;
      let pmedia = null;
      let ytSeen = {};
      if(p.u){
        if((p.y||"").indexOf("image/")===0){ let im = document.createElement("img"); try{ let dd = window.ZunDim&&window.ZunDim.get(p.u); if(dd){ im.setAttribute("width", dd[0]); im.setAttribute("height", dd[1]); } }catch(e){} im.referrerPolicy = "no-referrer"; im.src = p.u; im.loading = "lazy"; pbody.appendChild(im); pmedia = im; }
        else if((p.y||"").indexOf("video/")===0){ let v = document.createElement("video"); try{ let dd2 = window.ZunDim&&window.ZunDim.get(p.u); if(dd2){ v.setAttribute("width", dd2[0]); v.setAttribute("height", dd2[1]); } }catch(e){} v.referrerPolicy = "no-referrer"; v.src = p.u; v.controls = true; pbody.appendChild(v); pmedia = v; }
        /* gate de esquema (fix #11): media_url vem do banco e o path Supabase
           valida só no cliente (bypassável via REST direto) — javascript:/data:
           aqui virava <a href> clicável (stored-XSS, 1 clique). Só https gera
           link (com rel anti-tabnabbing, que também faltava); o resto mostra
           aviso neutro sem href — paridade com nodal/zundm/chatFileHtml. */
        else { let yu = ytIdFromUrl(p.u); if(yu){ ytSeen[yu.id] = 1; pbody.appendChild(ytFacade(yu.id, yu.start)); } else if(/^https:\/\//i.test(p.u||"")){ let a = document.createElement("a"); a.href = p.u; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "arquivo"; pbody.appendChild(a); } else if(p.u){ let na = document.createElement("span"); na.className = "meta"; na.textContent = "[arquivo indisponível]"; pbody.appendChild(na); } }
      }
      try{ ytFacadesFor(p.t, 2).forEach(function(f){ if(!ytSeen[f.dataset.ytid]) pbody.appendChild(f); }); }catch(e){}
      d.appendChild(pbody);
      try{ if(!d.dataset.aiPost && !d.dataset.annPost && isVeladoTxt(p.t)){ let els = []; if(ptx) els.push(ptx); if(pmedia) els.push(pmedia); paintVelado(d, els); } }catch(e){}
      let likes = p.lk||[];
      let myR = (p.rx && p.rx[myKey()]) || (likes.indexOf(myKey())>=0 ? "curti" : null);
      let foot = document.createElement("div"); foot.className = "pfoot";
      let wrap = document.createElement("span"); wrap.style.position = "relative"; wrap.style.display = "inline-block";
      let b = document.createElement("button");
      b.textContent = reactLabel(p, myR);
      try{ if(p && p.id) b.dataset.lkbtn = p.id; }catch(e){}
      let counts = reactCountsLocal(p);
      if(likes.length){ b.title = Object.keys(counts).map(k=>reactEmoji(k)+" "+k+": "+counts[k]).join(" · "); }
      let pick = document.createElement("div"); pick.hidden = true;
      pick.style.cssText = "position:absolute;bottom:110%;left:0;background:#fff;border:1px solid #b6c9db;border-radius:10px;padding:6px;display:flex;gap:4px;z-index:20;box-shadow:0 4px 14px rgba(20,40,70,.25)";
      REACTS.forEach(rt=>{
        let rb = document.createElement("button"); rb.textContent = rt[1]; rb.title = rt[0];
        rb.style.cssText = "border:1px solid #b6c9db;background:#eef4fb;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px"+(myR===rt[0]?"outline:2px solid #6aa5d7;":"");
        rb.onclick = async (ev)=>{ ev.stopPropagation(); try{ let r = JSON.parse(await rpc("like", JSON.stringify(likePayload(p.id, rt[0])))); if(r.ok){ try{ if(r.anonTok) anonTokSet(myKey(), r.anonTok); }catch(e){} b.textContent = (r.mine ? reactEmoji(r.mine) : "👍")+" · "+r.likes; if(r.counts) b.title = Object.keys(r.counts).map(k=>reactEmoji(k)+" "+k+": "+r.counts[k]).join(" · "); else b.title = ""; pick.hidden = true; cInv("feedGet"); } else if(r.err==="anon-taken" && !me){ try{ renewAnonForce(); let r2 = JSON.parse(await rpc("like", JSON.stringify(likePayload(p.id, rt[0])))); if(r2.ok){ try{ if(r2.anonTok) anonTokSet(myKey(), r2.anonTok); }catch(e){} b.textContent = (r2.mine ? reactEmoji(r2.mine) : "👍")+" · "+r2.likes; pick.hidden = true; cInv("feedGet"); } }catch(e){} } }catch(e){} };
        pick.appendChild(rb);
      });
      b.onclick = (ev)=>{ ev.stopPropagation(); document.querySelectorAll(".reactPick").forEach(x=>{ if(x!==pick) x.hidden = true; }); pick.hidden = !pick.hidden; };
      document.addEventListener("click", ()=>{ pick.hidden = true; }, {once:true});
      pick.className = "reactPick";
      wrap.appendChild(b); wrap.appendChild(pick);
      foot.appendChild(wrap);
      let rc = (p.rp||[]).length;
      let rb = document.createElement("button");
      rb.textContent = ztr("respostas ("+rc+")");
      try{ if(p && p.id) rb.dataset.rct = p.id; }catch(e){}
      let rbox = document.createElement("div"); rbox.hidden = true; rbox.style.marginTop = "6px"; rbox.dataset.pid = p.id;
      let rlist = document.createElement("div"); rbox.appendChild(rlist);
      try{ if(p && p.id) rlist.dataset.rlist = p.id; }catch(e){}
      let replyTo = null;
      let rTarget = document.createElement("div"); rTarget.hidden = true; rTarget.style.fontSize = "12px"; rTarget.style.margin = "4px 0"; rbox.appendChild(rTarget);
      /* caixa dinâmica: textarea com autogrow + Enter envia (igual pub/priv) */
      let rComp = document.createElement("div"); rComp.className = "composerRow"; rComp.style.marginTop = "4px";
      let ri = document.createElement("textarea"); ri.rows = 1; ri.placeholder = ztr("responder..."); ri.maxLength = 500;
      ri.setAttribute("enterkeyhint", "send");
      try{ ri.style.flex = "1 1 auto"; ri.style.minHeight = "36px"; ri.style.maxHeight = "120px"; ri.style.resize = "none"; ri.style.overflowY = "hidden"; }catch(e){}
      let rs = document.createElement("button"); rs.textContent = "enviar"; rs.className = "sendBtn"; rs.style.minHeight = "36px"; rs.style.minWidth = "64px";
      function feedGrow(){ try{ ri.style.height = "auto"; var mx = 120; ri.style.height = Math.min(ri.scrollHeight, mx)+"px"; ri.style.overflowY = ri.scrollHeight > mx ? "auto" : "hidden"; }catch(e){} }
      try{ ri.addEventListener("input", feedGrow, {passive:true}); }catch(e){ try{ ri.addEventListener("input", feedGrow); }catch(e2){} }
      try{ feedGrow(); }catch(e){}
      function paintRTarget(){
        if(!replyTo){ rTarget.hidden = true; ri.placeholder = ztr("responder..."); return; }
        rTarget.hidden = false; rTarget.innerHTML = "";
        rTarget.appendChild(document.createTextNode("respondendo a "+replyTo.n+" "));
        let cx = document.createElement("button"); cx.textContent = "x"; cx.style.marginLeft = "4px";
        cx.onclick = ()=>{ replyTo = null; paintRTarget(); };
        rTarget.appendChild(cx);
        ri.placeholder = "responder a "+replyTo.n+"...";
      }
      let onAnsFeed = (t)=>{ replyTo = t; paintRTarget(); try{ if(ri && !ri.value.trim() && t && t.n){ var nn = String(t.n||"").trim(); if(nn){ if(nn.charAt(0)!=="@") nn = "@"+nn; ri.value = nn+" "; try{ feedGrow(); }catch(e){} } } }catch(e){} try{ ri.focus(); }catch(e){} };
      function renderReplies(){ renderFeedReplies(rlist, p, onAnsFeed); }
      renderReplies();
      try{ rbox._feedRSig = (p.rp||[]).map(r=>String(r.id||"")+":"+String(r.t||"").length+(r.ed?"e":"")+"@"+String(r.to||"")).join(","); }catch(e){}
      try{ rbox._feedRender = (np)=>{ try{ renderFeedReplies(rlist, np, onAnsFeed); }catch(e){} }; }catch(e){}
      ri.addEventListener("keydown", function(ev){
        try{
          if(ev.key !== "Enter" || ev.shiftKey || ev.isComposing) return;
          ev.preventDefault();
          if(!rs.disabled) rs.click();
        }catch(e){}
      });
      rbox.appendChild(rComp); rComp.appendChild(ri); rComp.appendChild(rs);
      try{ if(window.ZunFmtBar) ZunFmtBar.attach(ri, {compact:true, before:rComp}); }catch(e){}
      rs.onclick = async ()=>{
        if(rs.disabled) return;
        let t = ri.value.trim(); if(!t) return;
        try{ var _pd3 = (typeof zunHasPrivateData==="function") ? zunHasPrivateData(t) : null; if(_pd3){ flashBtn(rs, "⛔ "+_pd3); return; } }catch(e){}
        let _gw4 = sendGapOk("reply", 2000);
        if(_gw4){ flashBtn(rs, "⏳ aguarde "+_gw4+"s"); return; }
        rs.disabled = true;
        let _otr = optTid();
        try{ (pendingReplies[p.id] = pendingReplies[p.id]||[]).push({tid:_otr, n:myKey(), t:t, at:Date.now()}); }catch(e){}
        try{ let _nd = feedOptReplyNode({tid:_otr, n:myKey(), t:t, at:Date.now()}, onAnsFeed, p); if(_nd&&_nd.nodeType){ rlist.appendChild(_nd); try{ ri.value = ""; feedGrow(); }catch(e){} } }catch(e2){}
        try{
          let r2 = JSON.parse(await rpc("reply", JSON.stringify(Object.assign(likePayload(p.id), {text:t, to:replyTo?replyTo.id:null, _tid:_otr}))));
          if(r2 && r2.err==="anon-taken" && !me){ try{ renewAnonForce(); r2 = JSON.parse(await rpc("reply", JSON.stringify(Object.assign(likePayload(p.id), {text:t, to:replyTo?replyTo.id:null, _tid:_otr})))); }catch(e){} }
          /* outbox r51: filado — mantém o nó "enviando..." (o drain confirma). */
          if(r2 && r2.queued && !r2.local){ flashBtn(rs, "na fila — envia sozinho"); rs.disabled = false; return; }
          if(r2.ok){ try{ if(r2.anonTok) anonTokSet(myKey(), r2.anonTok); if(r2.itemTok && r2.rid) anonItemSet(r2.rid, r2.itemTok); }catch(e){} ri.value = ""; try{ feedGrow(); }catch(e){} try{ ri.focus(); }catch(e2){} replyTo = null; paintRTarget(); rc++; rb.textContent = ztr("respostas ("+rc+")"); try{ let _pl=pendingReplies[p.id]||[]; let _ix=_pl.findIndex(o=>o&&o.tid===_otr); if(_ix>=0) _pl.splice(_ix,1); }catch(e){} cInv("feedGet"); loadFeed(true); }
          else { optFail(pendingReplies[p.id],_otr); try{ ri.value = t; }catch(e){} let _rm = spamErrText(r2); if(_rm) flashBtn(rs, _rm); }
        }catch(e){ optFail(pendingReplies[p.id],_otr); try{ ri.value = t; }catch(_e){} sendGapUndo("reply"); }
        rs.disabled = false;
      };
      /* abrir a caixa NÃO força rebuild: loadFeed() sem force usa o patch no
         lugar (preserva YouTube tocando); forçar aqui recarregava todo vídeo
         do feed só de abrir respostas. */
      rb.onclick = ()=>{ rbox.hidden = !rbox.hidden; if(!rbox.hidden){ try{ cInv("feedGet"); loadFeed(); }catch(e){} } };
      foot.appendChild(rb);
      try{
        var _den = document.createElement("button");
        _den.textContent = "🚨"; _den.title = "denunciar — vai para a caixa do dono como denúncia";
        (function(_pp){ _den.onclick = function(ev){ try{ if(ev) ev.stopPropagation(); }catch(e){} try{ zunReport("feed", "@"+String((_pp&&_pp.n)||"?")+" · "+String((_pp&&_pp.t)||"").slice(0,120)); }catch(e){} }; })(p);
        foot.appendChild(_den);
      }catch(e){}
      try{
        if(p && p.id && !zunTopicFix(p) && (p.n===myKey() || (p.n==="📢support-zunzum" && window._isOwner))){
          let eb = document.createElement("button"); eb.title = p.n===myKey() ? "editar post" : "editar comunicado (dono)"; if(typeof zunSvgPencilBtn==="function") zunSvgPencilBtn(eb); else eb.textContent = "✏️";
          eb.onclick = (ev)=>{ ev.stopPropagation(); feedEditInline(d, p, ptx, eb); };
          let db2 = document.createElement("button"); db2.title = "apagar post"; if(typeof zunSvgTrashBtn==="function") zunSvgTrashBtn(db2); else db2.textContent = "🗑️";
          db2.onclick = async (ev)=>{
            ev.stopPropagation();
            try{ if(zunTopicFix(p)){ flashBtn(db2, "📌 post fixo do dia"); return; } }catch(e){}
            if(!confirm("apagar este post?")) return;
            zunBusy(db2, true, "⏳ apagando...");
            try{ d.style.display = "none"; }catch(e){}
            try{
              let r = JSON.parse(await rpc("feedDel", JSON.stringify(anonEditPayload(likePayload(p.id), p.id))));
              if(r && r.queued && !r.local){ zunBusy(db2, false); try{ zunOutToast("na fila \u2014 apaga sozinho"); }catch(e){} return; }
              if(!r.ok){ try{ d.style.display = ""; }catch(e){} zunBusy(db2, false); flashBtn(db2, spamErrText(r)||"erro"); return; }
              cInv("feedGet"); loadFeed(true);
            }catch(e){ try{ d.style.display = ""; }catch(_e){} zunBusy(db2, false); }
          };
          foot.appendChild(eb); foot.appendChild(db2);
        }
      }catch(e){}
      d.appendChild(foot); d.appendChild(rbox);
      try{ d._feedSig = feedPostSig(p); }catch(e){}
      try{ feedCtn.insertBefore(d, _lastPlaced ? _lastPlaced.nextSibling : feedCtn.firstChild); }catch(e){ try{ feedCtn.appendChild(d); }catch(e2){} }
      _lastPlaced = d;
      try{ if(_vpost && _vpost.length) zunVideoUnstash(d, _vpost); }catch(e){}
    });
    try{ (optFeed||[]).forEach(o=>{ try{ if(!o||!o.tid||feedCtn.querySelector('[data-optid="'+o.tid+'"]')) return; let nd = feedOptNode(o); if(nd&&nd.nodeType) feedCtn.insertBefore(nd, feedCtn.firstChild); }catch(e){} }); }catch(e){}
    try{
      var _shown = window._feedShown||20, _visAll = 0;
      try{ _visAll = posts.filter(function(_p){ try{ return !zunBlocked(String(_p.n||"").replace(/^@/,"")) && !zunIsBotPost(_p); }catch(e){ return true; } }).length; }catch(e){ _visAll = posts.length; }
      var _rest = _visAll - _shown;
      if(_rest > 0){
        var _more = document.createElement("button"); _more.id = "feedMoreBtn";
        _more.textContent = ztr("ver mais (" + _rest + " restantes)");
        _more.style.cssText = "width:100%;margin:8px 0;padding:10px;min-height:44px";
        _more.onclick = async function(){
          if(_more.disabled) return;
          _more.disabled = true;
          let _t = _more.textContent;
          _more.textContent = "carregando...";
          window._feedShown = _shown + 20;
          try{ await loadFeed(true); }catch(e){}
          /* se o repaint recriou o botão, este saiu da tela (isConnected=0)
             e não precisa restaurar; só restaura se ele sobreviveu (falha). */
          try{ if(_more.isConnected){ _more.disabled = false; _more.textContent = _t; } }catch(e){}
        };
        feedCtn.appendChild(_more);
      }
    }catch(e){}
    try{ trApply(feedCtn); }catch(e){}
    try{ if(typeof zunAssuntoEnsure==="function") zunAssuntoEnsure(posts); }catch(e){}
    try{ if(window.nodalPaintFeed) window.nodalPaintFeed(feedCtn); }catch(e){}
    try{ filtroVarreMidia(feedCtn); }catch(e){}
    try{ feedCtn.querySelectorAll("[data-pid]:not(.post)").forEach(b=>{ if(openIds[b.dataset.pid]) b.hidden = false; }); if(wasFirst){ try{ feedCtn.scrollTop = 0; }catch(e){} } else if(!zAnchorRestore(feedCtn, ".post", el=>el.dataset.zat, ancF)) feedCtn.scrollTop = st + ((feedCtn.scrollHeight||0) - sh0); }catch(e){}
    try{
      (drafts||[]).forEach(dr=>{
        if(!dr || !dr.pid) return;
        let box = feedCtn.querySelector('[data-pid="'+dr.pid+'"]:not(.post)');
        if(!box || box.hidden) return;
        let inp = box.querySelector("textarea,input"); if(!inp) return;
        if(dr.v){ inp.value = dr.v; try{ inp.dispatchEvent(new Event("input", {bubbles:true})); }catch(e){} }
        if(dr.focused){ try{ inp.focus({preventScroll:true}); }catch(e){ try{ inp.focus(); }catch(e2){} } }
      });
    }catch(e){}
      try{ zTrustSave(feedCtn, ".post", el=>el.dataset.zat); }catch(e){}
      /* mutações assíncronas (emojis/twemoji, capas de vídeo) expandem depois: re-fixa no mesmo item no próximo frame */
      try{
        let _anc2 = ancF, _stF = 0;
        try{ _stF = feedCtn.scrollTop||0; }catch(e){}
        requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
          try{ if((feedCtn.scrollTop||0) !== _stF) return; }catch(e){ return; }
          try{ zAnchorRestore(feedCtn, ".post", el=>el.dataset.zat, _anc2); }catch(e){}
        }); });
      }catch(e){}
      seenAtFeed = maxAtSince(posts); paintedFeed = true; paintSigFeed = sigFeed(posts);
      try{ zunSnapSave("feed", posts); }catch(e){}
      try{ window._paintFeedMe = myKey(); }catch(e){}
      try{
        let _zn = [];
      posts.slice(-30).forEach(p=>{
        let a = String(p.n||"");
        if(a.charAt(0)==="@") _zn.push(a.slice(1));
        (p.rp||[]).forEach(r=>{ let rn = String(r.n||""); if(rn.charAt(0)==="@") _zn.push(rn.slice(1)); });
      });
      if(_zn.length) ensureZNickStyles(_zn);
    }catch(e){}
    /* rebuild (`innerHTML`) apaga o "enviando...": recoloca os pendentes no topo */
    try{ paintFeedOpt(); }catch(e){}
  }catch(e){}
}
let pubRoom = "geral", pubTopic = null, pubFlipped = false;
let curRole = {owner:0, mod:0, banned:0}, curRoomMeta = null, curTopics = [], curTopic = null;
let roomsCache = [], topicsSig = "", topicsEditorOpen = false;
function roomErrText(r){
  if(!r || r.ok) return "";
  if(r.err==="spam" || r.err==="devagar") return spamErrText(r);
  let m = {auth:"entre com nick+senha", nome:"nome inválido (2+ letras)", existe:"já existe com esse nome", foto:"foto precisa ser https://", cheio:"limite cheio, tente depois", limite:"máx 5 salas por pessoa", mod:"só dono/mods", dono:"só o dono", nick:"nick inválido", noid:"não encontrado", ban:"🚫 você foi banido desta sala", rate:"devagar, aguarde...", room:"sala inválida", fraca:"código fraco — gere um código forte", nova:"sala nova: entre nela primeiro", topic:"tópico inválido", tente:"tente de novo", eu:"esse é você", vazio:"digite algo", url:"link precisa ser https://", tema:"tema inválido", bad:"erro", inativa:"conta em exclusão — entre de novo p/ cancelar"};
  return m[r.err] || ("erro: "+(r.err||"?"));
}
function roomLink(id){ try{ var b=(window.zunBaseUrl?window.zunBaseUrl():"https://perchance.org/"+(window.generatorName||"zunzum")); return b+"?sala="+(id||"geral"); }catch(e){ return "?sala="+(id||"geral"); } }
function pendingRoom(){
  try{
    let q = new URLSearchParams(location.search).get("sala")||"";
    let h = (location.hash||"").match(/sala-([A-Za-z0-9-]{2,30})/);
    let s = String(q||(h?h[1]:"")).trim().slice(0,30);
    if(/^[A-Za-z0-9-]{2,30}$/.test(s)) return s;
  }catch(e){}
  return "";
}
function autoJoinRoom(){
  try{
    let s = pendingRoom();
    if(s && s!==pubRoom){ switchRoom(s); return; }
    if(!s && me){
      let sv = "";
      try{ sv = localStorage.getItem("zunzumRoom:"+me.nick.toLowerCase())||""; }catch(e){}
      if(sv && sv!==pubRoom && /^[A-Za-z0-9-]{2,30}$/.test(sv)) switchRoom(sv);
    }
  }catch(e){}
}
function resetPubPaint(){
  paintedPub = false; pendPub = null; seenAtPub = 0; paintSigPub = "";
  try{ hideNewPill(pubPill); }catch(e){}
  try{ window._pubShown = 30; }catch(e){}
}
/* 1a visita no chat vai p/ o fundo (novo): o paint acontece com a aba oculta
   (clientHeight 0), então o scroll p/ baixo não fixa na hora — marca pendência
   e o showTab/showChat descarrega ao exibir.
   FIX reload-na-aba-chats (2026-11-06): o activate() do mobile move a pubBox
   p/ dentro da section (appendChild) DEPOIS do paint já ter rolado p/ o fundo —
   o move zera o scrollTop e a flag já estava limpa, então nada re-rolava.
   Por isso o flush também re-fixa quando lembrava estar no fundo
   (_pubWasAtBottom!==false) mas o move/reset jogou p/ o topo (dist>60).
   Quem lia história (wasAt===false) continua intocado. */
window.zunChatFlushBottom = function(){
  try{
    (function(){
      let el = null;
      try{ el = document.getElementById("pubLog"); }catch(e){}
      if(!el || !el.clientHeight) return;
      let want = false;
      try{ want = window._pubNeedBottom || window._pubWasAtBottom!==false; }catch(e){ want = !!window._pubNeedBottom; }
      if(!want) return;
      let dist = 1e9;
      try{ dist = el.scrollHeight - el.scrollTop - el.clientHeight; }catch(e){}
      if(dist > 60){ try{ el.scrollTop = el.scrollHeight; }catch(e){} try{ window._pubWasAtBottom = true; }catch(e){} }
      try{ let real = false; try{ real = !!el.querySelector("[data-zk],.zskel"); }catch(e){} if(real && (el.scrollHeight - el.scrollTop - el.clientHeight) < 60) window._pubNeedBottom = false; }catch(e){}
    })();
  }catch(e){}
  try{
    (function(){
      let el = null;
      try{ el = document.getElementById("privLog"); }catch(e){}
      if(!el || !el.clientHeight) return;
      let want = false;
      try{ want = window._privNeedBottom || window._privWasAtBottom!==false; }catch(e){ want = !!window._privNeedBottom; }
      if(!want) return;
      let dist = 1e9;
      try{ dist = el.scrollHeight - el.scrollTop - el.clientHeight; }catch(e){}
      if(dist > 60){ try{ el.scrollTop = el.scrollHeight; }catch(e){} try{ window._privWasAtBottom = true; }catch(e){} }
      try{ let real = false; try{ real = !!el.querySelector("[data-zk],.zskel"); }catch(e){} if(real && (el.scrollHeight - el.scrollTop - el.clientHeight) < 60) window._privNeedBottom = false; }catch(e){}
    })();
  }catch(e){}
};
let pubFlipAnim = false;
function pubSetFlip(f){
  try{
    f = !!f;
    if(f===pubFlipped){ if(f) loadRooms(); return; }
    if(pubFlipAnim){ pubFlipped = f; pubFront.hidden = f; pubBack.hidden = !f; if(f) loadRooms(); return; }
    pubFlipAnim = true;
    pubFlipInner.style.transform = "rotateY(90deg)";
    setTimeout(()=>{
      try{
        pubFlipped = f;
        pubFront.hidden = f; pubBack.hidden = !f;
        pubFlipInner.style.transform = "rotateY(0deg)";
        if(f) loadRooms();
      }catch(e){}
      setTimeout(()=>{ pubFlipAnim = false; }, 280);
    }, 250);
  }catch(e){}
}
function switchRoom(id){
  id = String(id||"geral").slice(0,30);
  if(id!==pubRoom){ pubRoom = id; pubTopic = null; resetPubPaint(); curRole = {owner:0,mod:0,banned:0}; curRoomMeta = null; curTopics = []; curTopic = null; topicsSig = ""; try{ let _old = document.getElementById("pubRoomThemeEl"); if(_old) _old.remove(); }catch(e){} }
  try{ location.hash = "sala-"+id; }catch(e){}
  try{ if(me) localStorage.setItem("zunzumRoom:"+me.nick.toLowerCase(), id); }catch(e){}
  pubSetFlip(false);
  try{ pubModPanel.hidden = true; }catch(e){}
  try{ pubCreateForm.hidden = true; }catch(e){}
  cInv("roomView"); loadPub(true);
}
function switchTopic(tid){
  pubTopic = tid||null; resetPubPaint();
  cInv("roomView"); loadPub(true);
}
let loadRoomsSeq = 0;
let roomsCk = null, roomsCkN = 0; // checkpoint da lista de salas
async function loadRooms(){
  let my = ++loadRoomsSeq;
  try{
    if(!pubGrid.childNodes.length) zunLoading(pubGrid, "carregando chats...");
    /* egress: a lista full custa 1+N queries (roomMeta por sala). Só refaz
       quando muda a conta de salas ou chega msg em alguma (ou backstop). */
    try{
      let rk = JSON.parse(await rpc("roomsList", JSON.stringify({ping:1})));
      if(rk && rk.ok !== false && (rk.c !== undefined)){
        let rsig = rk.c+"|"+(rk.m||0);
        roomsCkN++;
        if(!ckMeChanged() && roomsCk === rsig && roomsCkN % 5 !== 0 && roomsCache && roomsCache.length){
          if(my!==loadRoomsSeq) return; // resposta velha: descarta como o path full
          paintRooms(roomsCache); return;
        }
        roomsCk = rsig;
      }
    }catch(e){}
    let list = JSON.parse(await crpc("roomsList",""));
    if(my!==loadRoomsSeq) return; // resposta velha de chamada concorrente: descarta (evita lista piscando/sumindo)
    if(!Array.isArray(list)) return;
    roomsCache = list;
    paintRooms(list);
  }catch(e){}
}
function paintRooms(list){
  try{
    let q = "";
    try{ q = (pubSearchInput && pubSearchInput.value || "").toLowerCase().trim(); }catch(e){}
    pubGrid.innerHTML = "";
    let n = 0;
    (list||[]).forEach(r=>{
      if(q && (String(r.name||"")+" "+String(r.desc||"")).toLowerCase().indexOf(q)<0) return;
      n++;
      let c = document.createElement("div"); c.className = "pubCard"+(r.id===pubRoom?" cur":"");
      try{
        if(r.theme && r.id!=="geral"){
          let ac = (r.theme.ac || r.theme.acc) || null;
          if(!ac){
            try{
              let rr = (typeof resolveTheme==="function") ? resolveTheme(r.theme) : null;
              if(rr && rr.ac) ac = rr.ac;
            }catch(e){}
          }
          if(ac && /^#[0-9a-fA-F]{6}$/.test(ac)){
            c.style.borderColor = ac;
            if(r.id===pubRoom) c.style.boxShadow = "0 0 0 2px "+ac+"55";
            let dot = document.createElement("span");
            dot.textContent = "●";
            dot.style.color = ac;
            dot.style.marginRight = "4px";
            dot.title = "chat com cor própria";
            c.appendChild(dot);
          }
        }
      }catch(e){}
      if(r.photo){ let im = document.createElement("img"); im.referrerPolicy = "no-referrer"; im.src = r.photo; im.loading = "lazy"; im.alt = ""; c.appendChild(im); }
      let t = document.createElement("div"); t.className = "t"; t.textContent = (r.id===pubRoom?"▶ ":"")+r.name; c.appendChild(t);
      if(r.desc){ let d = document.createElement("div"); d.className = "d"; d.textContent = r.desc; c.appendChild(d); }
      let m = document.createElement("div"); m.className = "meta"; m.textContent = ztr((r.owner?"@"+r.owner+" · ":"")+(r.msgs||0)+" msgs · "+(r.topics||0)+" tópicos"); c.appendChild(m);
      c.onclick = (function(id){ return ()=>switchRoom(id); })(r.id);
      pubGrid.appendChild(c);
    });
    pubCountEl.textContent = n+" chat"+(n===1?"":"s");
  }catch(e){}
}
function paintPubHead(){
  try{
    let meta = curRoomMeta, isG = !pubRoom || pubRoom==="geral";
    pubNameEl.textContent = isG ? "#geral" : String(meta?meta.name:pubRoom||"");
    let own = [];
    if(!isG && meta){
      if(meta.owner) own.push("@"+meta.owner);
      own.push((meta.msgs||0)+" msgs");
      own.push((curTopics||[]).length+" tópicos");
      if(curRole&&(curRole.owner||curRole.mod)) own.push("você modera");
    } else if(meta){ own.push((meta.msgs||0)+" msgs"); }
    try{ pubOwnerEl.textContent = ztr(own.join(" · ")); }catch(e){ pubOwnerEl.textContent = own.join(" · "); }
    pubDescEl.textContent = (!isG && meta && meta.desc) ? String(meta.desc) : "";
    let ph = (!isG && meta && meta.photo) ? meta.photo : "";
    (function(){
      let L = isG ? "💬" : String((meta&&meta.name)||"#").slice(0,1).toUpperCase();
      if(ph){ if(!pubPhotoEl.querySelector("img")) pubPhotoEl.textContent = L; zunAvatarInto(pubPhotoEl, ph, L); }
      else zunAvatarInto(pubPhotoEl, "", L);
    })();
  }catch(e){}
  try{ applyRoomTheme(curRoomMeta); }catch(e){}
  try{ paintLocks(); }catch(e){}
}
function roomThemeCss(th){
  let r = null;
  try{ r = resolveTheme(th); }catch(e){ return ""; }
  if(!r) return "";
  let onAc = null;
  try{ onAc = isDark(r.ac) ? "#fff" : "#102030"; }catch(e){ onAc = "#102030"; }
  let safeTx = null, safeHead = null;
  try{ safeTx = zunSafeTx(r.cd, r.tx); safeHead = zunSafeHead(r.cd, r.ac, r.tx); }catch(e){ safeTx = r.tx; safeHead = r.ac; }
  let css = "#wrap #pubBox{background:"+r.cd+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox h3,#wrap #pubBox .zun-mhead{background:"+r.cd+"!important;color:"+safeHead+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox h3 *,#wrap #pubBox .zun-mhead *{color:"+safeHead+"!important}"
    +"#wrap #pubBox .meta{color:"+safeTx+"!important;opacity:.75}"
    +"#wrap #pubBox #pubNameEl{color:"+safeHead+"!important}"
    +"#wrap #pubBox #pubPhotoEl{background:"+r.ac+"!important;color:"+onAc+"!important}"
    +"#wrap #pubBox #pubLog{background:"+r.bg+"!important;border-color:"+r.ac+"!important;color:"+safeTx+"!important}"
    +"#wrap #pubBox #pubLog div{border-color:"+r.ac+"55!important}"
    +"#wrap #pubBox #pubLog .chatname{color:"+safeHead+"!important}"
    +"#wrap #pubBox #pubTopicsBar button{background:"+r.bg+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox #pubTopicsBar button.on{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox .fbar button,#wrap #pubBox #pubFlipBtn,#wrap #pubBox #pubNewBtn,#wrap #pubBox #pubLinkBtn,#wrap #pubBox #pubModBtn,#wrap #pubBox #pubCreateBtn,#wrap #pubBox #pubCreateCancelBtn,#wrap #pubBox #pubBtn{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox input,#wrap #pubBox select,#wrap #pubBox textarea{background:"+(isDark(r.cd)?"#222":"#fff")+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox a{color:"+safeHead+"!important}";
  if(r.css) css += (typeof zunScopeCss==="function" ? zunScopeCss(r.css, "#wrap #pubBox") : r.css);
  /* guarda de cabeçalho DEPOIS do CSS personalizado: custom nunca apaga o cabeçalho */
  css += "#wrap #pubBox h3,#wrap #pubBox h3 b,#wrap #pubBox h3 strong,#wrap #pubBox #pubNameEl{background:"+r.cd+"!important;color:"+safeHead+"!important}";
  return css;
}
function applyRoomTheme(meta){
  try{
    let old = document.getElementById("pubRoomThemeEl");
    let isG = !pubRoom || pubRoom==="geral";
    if(isG || !meta || !meta.theme || zunSemCss()){ if(old) old.remove(); return; }
    let css = roomThemeCss(meta.theme);
    if(!css){ if(old) old.remove(); return; }
    let el = old;
    if(!el){ el = document.createElement("style"); el.id = "pubRoomThemeEl"; document.head.appendChild(el); }
    el.textContent = css;
  }catch(e){}
}
function previewRoomTheme(th){
  try{
    if(!pubRoom || pubRoom==="geral") return;
    let css = roomThemeCss(th);
    let el = document.getElementById("pubRoomThemeEl");
    if(!css){ if(el) el.remove(); return; }
    if(!el){ el = document.createElement("style"); el.id = "pubRoomThemeEl"; document.head.appendChild(el); }
    el.textContent = css;
  }catch(e){}
}
function paintTopicsBar(force){
  try{
    if(topicsEditorOpen && !force) return;
    let sig = (pubRoom||"geral")+"|"+(pubTopic||"")+"|"+(curTopics||[]).map(t=>t.id+":"+t.name+":"+t.n).join(",")+"|"+(curRole.owner?1:0)+""+(curRole.mod?1:0);
    if(!force && sig===topicsSig && pubTopicsBar.childNodes.length) return;
    topicsSig = sig;
    pubTopicsBar.innerHTML = "";
    let mk = (label, on, fn, title)=>{
      let b = document.createElement("button"); b.textContent = label; if(on) b.className = "on"; if(title) b.title = title;
      b.onclick = fn; pubTopicsBar.appendChild(b); return b;
    };
    if(!pubRoom || pubRoom==="geral"){ mk("#geral", true, ()=>{}); return; }
    mk("geral", !pubTopic, ()=>switchTopic(null));
    (curTopics||[]).forEach(t=>{ mk("#"+t.name+((t.n||0)?" ("+t.n+")":""), pubTopic===t.id, ()=>switchTopic(t.id)); });
    if(curRole&&(curRole.owner||curRole.mod)) mk("+", false, openTopicEditor, "novo tópico");
  }catch(e){}
}
function openTopicEditor(){
  try{
    if(!me || !(curRole&&(curRole.owner||curRole.mod))) return;
    topicsEditorOpen = true;
    paintTopicsBar(true);
    topicsEditorOpen = true;
    let inp = document.createElement("input"); inp.placeholder = "nome do tópico..."; inp.maxLength = 30; inp.style.cssText = "width:120px";
    let ok = document.createElement("button"); ok.textContent = "ok";
    let cx = document.createElement("button"); cx.textContent = "x";
    pubTopicsBar.appendChild(inp); pubTopicsBar.appendChild(ok); pubTopicsBar.appendChild(cx);
    inp.focus();
    let done = async (create)=>{
      try{
        if(create && inp.value.trim()){
          zunBusy(ok, true, "⏳...");
          let r = JSON.parse(await rpc("topicCreate", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, name:inp.value.trim()})));
          if(!r.ok){ zunBusy(ok, false); flashBtn(ok, roomErrText(r)); return; }
          cInv("roomView"); cInv("roomsList"); loadPub(true); loadRooms();
        }
      }catch(e){}
      topicsEditorOpen = false; paintTopicsBar(true);
    };
    ok.onclick = ()=>done(true); cx.onclick = ()=>done(false);
    inp.onkeydown = (ev)=>{ if(ev.key==="Enter") done(true); if(ev.key==="Escape") done(false); };
  }catch(e){ topicsEditorOpen = false; }
}
async function delTopic(tid){
  try{
    if(!me || !confirm("excluir este tópico e as msgs dele?")) return;
    let r = JSON.parse(await rpc("topicDel", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, topic:tid})));
    if(!r.ok) return;
    if(pubTopic===tid) pubTopic = null;
    cInv("roomView"); cInv("roomsList"); loadPub(true); loadRooms(); paintModPanel();
  }catch(e){}
}
async function createRoom(){
  try{
    if(!me){ pubCreateMsg.textContent = "entre com nick+senha"; return; }
    let name = pubNewName.value.trim();
    let desc = pubNewDesc.value.trim();
    let photo = pubNewPhoto.value.trim();
    let f = pubNewFile && pubNewFile.files[0];
    if(!name){ pubCreateMsg.textContent = "dê um nome"; return; }
    pubCreateBtn.disabled = true; pubCreateMsg.textContent = "criando...";
    if(f){
      f = await prepUpload(f, 512, 0.8);
      if(zunFileTooBig(f)){ pubCreateMsg.textContent = zunLimitMsg(f); pubCreateBtn.disabled = false; return; }
      let up = await zunUpload(f, {expires:Date.now()+1000*60*60*24*30});
      if(up.error){ pubCreateMsg.textContent = (up.error==="grande"?zunLimitMsg(f):"erro upload"); pubCreateBtn.disabled = false; return; }
      photo = up.url;
    }
    let r = JSON.parse(await rpc("roomCreate", JSON.stringify({nick:me.nick, hash:me.hash, name, desc, photo})));
    if(!r.ok){ pubCreateMsg.textContent = roomErrText(r); pubCreateBtn.disabled = false; return; }
    pubNewName.value = ""; pubNewDesc.value = ""; pubNewPhoto.value = ""; if(pubNewFile) pubNewFile.value = "";
    pubCreateMsg.textContent = ""; pubCreateBtn.disabled = false; pubCreateForm.hidden = true;
    cInv("roomsList"); cInv("roomView"); loadRooms();
    if(r.room && r.room.id) switchRoom(r.room.id);
  }catch(e){ try{ pubCreateMsg.textContent = "sem servidor"; pubCreateBtn.disabled = false; }catch(e2){} }
}
async function delRoom(){
  try{
    if(!me || !confirm("excluir esta sala e tudo dela?")) return;
    let r = JSON.parse(await rpc("roomDel", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom})));
    if(!r.ok) return;
    cInv("roomsList"); cInv("roomView"); loadRooms(); switchRoom("geral");
  }catch(e){}
}
function paintModPanel(){
  try{
    let p = pubModPanel; p.innerHTML = "";
    if(!me || !curRole || !(curRole.owner||curRole.mod) || !curRoomMeta || !pubRoom || pubRoom==="geral"){ p.hidden = true; return; }
    p.hidden = false;
    let isOwner = !!curRole.owner;
    let h = document.createElement("div"); h.innerHTML = "<b>moderação</b> — "+esc(String(curRoomMeta.name||"")); p.appendChild(h);
    if(isOwner){
      let nm = document.createElement("input"); nm.value = curRoomMeta.name||""; nm.placeholder = "nome (2-40)"; nm.maxLength = 40; p.appendChild(nm);
      let ds = document.createElement("input"); ds.value = curRoomMeta.desc||""; ds.placeholder = "descrição curta"; ds.maxLength = 140; p.appendChild(ds);
      let ft = document.createElement("input"); ft.value = curRoomMeta.photo||""; ft.placeholder = "foto https://..."; p.appendChild(ft);
      let sv = document.createElement("button"); sv.textContent = "salvar"; p.appendChild(sv);
      let msg = document.createElement("span"); msg.className = "meta"; p.appendChild(msg);
      sv.onclick = async ()=>{
        try{
          msg.textContent = "salvando...";
          let r = JSON.parse(await rpc("roomEdit", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, name:nm.value, desc:ds.value, photo:ft.value, mods:curRoomMeta.mods||[]})));
          if(!r.ok){ msg.textContent = roomErrText(r); return; }
          msg.textContent = "salvo!";
          cInv("roomView"); cInv("roomsList"); loadPub(true); loadRooms(); setTimeout(paintModPanel, 500);
        }catch(e){ msg.textContent = "sem servidor"; }
      };
      let mh = document.createElement("div"); mh.innerHTML = "<b>mods</b>"; mh.style.marginTop = "6px"; p.appendChild(mh);
      let madd = document.createElement("input"); madd.placeholder = "@nick mod..."; p.appendChild(madd);
      let ab = document.createElement("button"); ab.textContent = "add"; p.appendChild(ab);
      let mmsg = document.createElement("span"); mmsg.className = "meta"; p.appendChild(mmsg);
      ab.onclick = async ()=>{
        try{
          let nick = madd.value.replace(/^@/,"").trim(); if(!nick) return;
          let mods = (curRoomMeta.mods||[]).slice(); mods.push(nick);
          let r = JSON.parse(await rpc("roomEdit", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, mods})));
          if(!r.ok){ mmsg.textContent = roomErrText(r); return; }
          mmsg.textContent = ""; cInv("roomView"); cInv("roomsList"); loadPub(true); setTimeout(paintModPanel, 500);
        }catch(e){}
      };
      let ml = document.createElement("div");
      (curRoomMeta.mods||[]).forEach(n=>{
        let row = document.createElement("div"); row.textContent = "@"+n+" ";
        let x = document.createElement("button"); x.textContent = "✕"; x.title = "remover mod";
        x.onclick = (async (nn)=>{ return async ()=>{
          try{
            let mods = (curRoomMeta.mods||[]).filter(y=>y.toLowerCase()!==nn.toLowerCase());
            let r = JSON.parse(await rpc("roomEdit", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, mods})));
            if(!r.ok) return;
            cInv("roomView"); loadPub(true); setTimeout(paintModPanel, 500);
          }catch(e){}
        }; })(n);
        row.appendChild(x); ml.appendChild(row);
      });
      p.appendChild(ml);
    }
    let bh = document.createElement("div"); bh.innerHTML = "<b>banidos</b>"; bh.style.marginTop = "6px"; p.appendChild(bh);
    let badd = document.createElement("input"); badd.placeholder = "@nick..."; p.appendChild(badd);
    let bb = document.createElement("button"); bb.textContent = "banir"; p.appendChild(bb);
    let bmsg = document.createElement("span"); bmsg.className = "meta"; p.appendChild(bmsg);
    bb.onclick = async ()=>{
      try{
        let nick = badd.value.replace(/^@/,"").trim(); if(!nick) return;
        let r = JSON.parse(await rpc("roomBan", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, target:nick})));
        if(!r.ok){ bmsg.textContent = roomErrText(r); return; }
        bmsg.textContent = ""; badd.value = ""; cInv("roomView"); loadPub(true); setTimeout(paintModPanel, 500);
      }catch(e){}
    };
    let bl = document.createElement("div");
    ((curRoomMeta.bans)||[]).forEach(n=>{
      let row = document.createElement("div"); row.textContent = "@"+n+" ";
      let x = document.createElement("button"); x.textContent = "desbanir";
      x.onclick = ((nn)=>{ return async ()=>{
        try{
          let r = JSON.parse(await rpc("roomBan", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, target:nn, unban:1})));
          if(!r.ok) return;
          cInv("roomView"); loadPub(true); setTimeout(paintModPanel, 500);
        }catch(e){}
      }; })(n);
      row.appendChild(x); bl.appendChild(row);
    });
    p.appendChild(bl);
    try{
      let ah = document.createElement("div"); ah.innerHTML = "<b>aparência do chat</b>"; ah.style.marginTop = "6px"; p.appendChild(ah);
      let anote = document.createElement("div"); anote.className = "meta"; anote.textContent = "#geral sempre padrão · aqui muda só esta sala"; p.appendChild(anote);
      let cur = (curRoomMeta && curRoomMeta.theme) || {};
      let presets = {};
      try{ presets = (typeof THEME_PRESETS!=="undefined" && THEME_PRESETS) || {}; }catch(e){ presets = {}; }
      let base = presets[cur.p] || {};
      let row = document.createElement("div"); row.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;align-items:center";
      let sel = document.createElement("select"); sel.style.width = "auto";
      ["", "zunzum", "orkut", "noite", "mato", "roxo", "neon"].forEach(pp=>{
        let o = document.createElement("option"); o.value = pp; o.textContent = pp || "preset..."; if(cur.p===pp) o.selected = true; sel.appendChild(o);
      });
      row.appendChild(sel);
      function rColorIn(v, fb){
        let i2 = document.createElement("input"); i2.type = "color";
        i2.value = /^#[0-9a-fA-F]{6}$/.test(v||"") ? v : (/^#[0-9a-fA-F]{6}$/.test(fb||"") ? fb : "#ffffff");
        i2.style.width = "34px"; return i2;
      }
      let rbg = rColorIn(cur.bg, base.bg), rcd = rColorIn(cur.cd, base.cd), rtx = rColorIn(cur.tx, base.tx), rac = rColorIn(cur.ac, base.ac);
      [["fundo chat", rbg], ["caixa", rcd], ["texto", rtx], ["destaque", rac]].forEach(([lb, el])=>{
        let s = document.createElement("span"); s.className = "meta"; s.textContent = lb; row.appendChild(s); row.appendChild(el);
      });
      p.appendChild(row);
      let rcss = document.createElement("textarea"); rcss.placeholder = "CSS extra do chat (opcional, sem <script>) — ex: #pubBox #pubLog{border-radius:12px}"; rcss.value = cur.css || ""; rcss.style.minHeight = "40px"; p.appendChild(rcss);
      function curRTheme(){ return {p:sel.value, bg:rbg.value, cd:rcd.value, tx:rtx.value, ac:rac.value, css:rcss.value.slice(0,2000)}; }
      function prevR(){ try{ previewRoomTheme(curRTheme()); }catch(e){} }
      sel.onchange = ()=>{ let b = presets[sel.value] || {}; if(b.bg) rbg.value = b.bg; if(b.cd) rcd.value = b.cd; if(b.tx) rtx.value = b.tx; if(b.ac) rac.value = b.ac; prevR(); };
      [rbg, rcd, rtx, rac].forEach(el=>{ el.oninput = prevR; });
      rcss.oninput = prevR;
      let rrow = document.createElement("div"); rrow.style.cssText = "display:flex;gap:6px;margin:6px 0;flex-wrap:wrap;align-items:center";
      let rsv = document.createElement("button"); rsv.textContent = "salvar cor"; rrow.appendChild(rsv);
      let rcl = document.createElement("button"); rcl.textContent = "voltar ao padrão"; rrow.appendChild(rcl);
      let rmsg = document.createElement("span"); rmsg.className = "meta"; rrow.appendChild(rmsg);
      p.appendChild(rrow);
      rsv.onclick = async ()=>{
        try{
          rmsg.textContent = "salvando...";
          let th = curRTheme();
          let r = JSON.parse(await rpc("roomTheme", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, theme:th})));
          if(!r.ok){ rmsg.textContent = roomErrText(r); try{ applyRoomTheme(curRoomMeta); }catch(e){} return; }
          rmsg.textContent = "salvo!";
          try{ curRoomMeta = r.room || curRoomMeta; if(curRoomMeta) curRoomMeta.theme = (r.room && r.room.theme) || th; }catch(e){}
          try{ applyRoomTheme(curRoomMeta); }catch(e){}
          cInv("roomView"); cInv("roomsList"); loadRooms();
        }catch(e){ rmsg.textContent = "sem servidor"; }
      };
      rcl.onclick = async ()=>{
        try{
          rmsg.textContent = "limpando...";
          let r = JSON.parse(await rpc("roomTheme", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, theme:null})));
          if(!r.ok){ rmsg.textContent = roomErrText(r); return; }
          rmsg.textContent = "padrão!";
          try{ if(curRoomMeta) curRoomMeta.theme = null; }catch(e){}
          try{ applyRoomTheme(curRoomMeta); }catch(e){}
          sel.value = ""; rcss.value = "";
          try{ previewRoomTheme(null); applyRoomTheme(curRoomMeta); }catch(e){}
          cInv("roomView"); cInv("roomsList"); loadRooms(); setTimeout(paintModPanel, 500);
        }catch(e){ rmsg.textContent = "sem servidor"; }
      };
    }catch(e){}
    let th = document.createElement("div"); th.innerHTML = "<b>tópicos</b>"; th.style.marginTop = "6px"; p.appendChild(th);
    let tl = document.createElement("div");
    (curTopics||[]).forEach(t=>{
      let row = document.createElement("div"); row.textContent = "#"+t.name+" ("+(t.n||0)+") ";
      let x = document.createElement("button"); x.textContent = "excluir";
      x.onclick = ((tid, btn)=>{ return ()=>{ zunBusy(btn, true, "⏳..."); Promise.resolve(delTopic(tid)).catch(()=>{}).then(()=>zunBusy(btn, false)); }; })(t.id, x);
      row.appendChild(x); tl.appendChild(row);
    });
    p.appendChild(tl);
    if(isOwner){
      let del = document.createElement("button"); del.textContent = "excluir sala"; del.style.marginTop = "6px"; del.onclick = ()=>{ zunBusy(del, true, "⏳..."); Promise.resolve(delRoom()).catch(()=>{}).then(()=>zunBusy(del, false)); }; p.appendChild(del);
    }
  }catch(e){}
}
let roomCk = null, roomCkN = 0; // checkpoint do poller de salas
async function loadPub(force){
  try{
    ensureNewPills();
    /* troca de sala/tópico: limpa o log velho p/ o zunLoading aparecer
       (antes as msgs antigas ficavam sem nenhum "carregando") */
    let pkey0 = (pubRoom||"geral")+"|"+(pubTopic||"");
    if(pkey0!==lastPubKey){ lastPubKey = pkey0; try{ pubLog.innerHTML = ""; }catch(e){} try{ resetPubPaint(); }catch(e){} }
    /* egress: checkpoint antes do full (100 msgs + tópicos + contagens).
       Só baixa tudo quando algo muda, ou no backstop a cada 5 ciclos. */
    if(!force && paintedPub){
      try{
        let p0 = {room:pubRoom||"geral", ping:1};
        if(pubTopic) p0.topic = pubTopic;
        if(me){ p0.nick = me.nick; p0.hash = me.hash; }
        let rck = JSON.parse(await rpc("roomView", JSON.stringify(p0)));
        if(rck && rck.ok){
          let rsig = pkey0+"|"+rck.m+"|"+rck.t+"|"+rck.tl+"|"+JSON.stringify(rck.role||{});
          roomCkN++;
          if(!ckMeChanged() && roomCk === rsig && roomCkN % 5 !== 0) return;
          roomCk = rsig;
        }
      }catch(e){}
    }
    if(!paintedPub){ try{ let _ps = zunSnapLoad("pub:"+(pubRoom||"geral")+"|"+(pubTopic||"")); if(_ps && _ps.length) paintPub(_ps); }catch(e){} }
    if(!paintedPub){ try{ zunChatSkeleton(pubLog, 24); }catch(e){} zunLoading(pubLog, "conectando chat..."); }
    let p = {room:pubRoom||"geral"};
    if(pubTopic) p.topic = pubTopic;
    if(me){ p.nick = me.nick; p.hash = me.hash; }
    let v = JSON.parse(await crpc("roomView", JSON.stringify(p)));
    if(!v || !v.ok){
      /* falso "não encontrado": só declara que a sala sumiu com erro
         autoritativo (noid/room). Qualquer outra falha (rede, auth, RLS)
         mantém a sala e tenta de novo — antes, qualquer !ok expulsava
         p/ #geral com "chat não encontrado" à toa. */
      if(v && (v.err==="noid"||v.err==="room") && pubRoom && pubRoom!=="geral"){ let bad = pubRoom; pubRoom = "geral"; pubTopic = null; try{ location.hash = "sala-geral"; }catch(e){} cInv("roomView"); loadPub(true); loadRooms(); showNotFound({icon:"💬", title:"chat não encontrado", msg:"o chat ("+bad+") não existe ou foi excluído. Caímos no #geral.", okLabel:"ir p/ #geral"}); }
      else if(!paintedPub){ try{ zunChatSkeleton(pubLog, 24); }catch(e){} zunLoading(pubLog, "conectando chat..."); }
      return;
    }
    curRole = v.role||{owner:0,mod:0,banned:0};
    curRoomMeta = v.room||null;
    curTopics = v.topics||[];
    curTopic = v.topic||null;
    paintPubHead();
    paintTopicsBar();
    let m = v.msgs||[];
    let _sgp = sigChat(m)+"|"+pubRoom+"|"+(pubTopic||"");
    if(!force && paintedPub && _sgp===paintSigPub) return;
    if(!force && paintedPub && pubLog.childNodes.length && !atBottomEdge(pubLog)){
      let n = newCountSince(m, seenAtPub);
      if(n > 0){ pendPub = m; showNewPill(pubPill, "↓ " + n + (n > 1 ? " novas mensagens" : " nova mensagem")); return; }
    }
    pendPub = null; hideNewPill(pubPill);
    paintPub(m);
    if(force){ try{ pubLog.scrollTop = pubLog.scrollHeight; }catch(e){} }
  }catch(e){ if(!paintedPub){ try{ zunChatSkeleton(pubLog, 24); }catch(e){} try{ zunLoading(pubLog, "conectando chat..."); }catch(e2){} } }
}
/* edição inline de mensagem de chat (troca o .ttext por um input) */
function chatEditInline(row, x, eb, onSave){
  try{
    if(!row || row.querySelector(".chatEditBox")) return false;
    let tt = row.querySelector(".ttext");
    if(!tt) return false;
    let old = x.t||"";
    let box = document.createElement("span"); box.className = "chatEditBox"; box.style.marginLeft = "6px";
    let inp = document.createElement("input"); inp.value = old; inp.maxLength = 500; inp.style.width = "220px";
    let sv = document.createElement("button"); sv.textContent = "ok"; sv.style.marginLeft = "4px";
    let cx = document.createElement("button"); cx.textContent = "x"; cx.style.marginLeft = "4px";
    box.append(inp, sv, cx);
    tt.style.display = "none";
    tt.parentNode.insertBefore(box, tt.nextSibling);
    try{ if(window.ZunFmtBar) ZunFmtBar.attach(inp, {compact:true}); }catch(e){}
    try{ inp.focus(); inp.select(); }catch(e){}
    cx.onclick = ()=>{ tt.style.display = ""; try{ box.remove(); }catch(e){} };
    sv.onclick = async ()=>{
      let t = inp.value.trim();
      if(!t || t===old){ tt.style.display = ""; try{ box.remove(); }catch(e){} return; }
      t = t.slice(0,500);
      let oldPlain = "", oldHtml = "";
      try{ oldPlain = tt.dataset.plain; oldHtml = tt.innerHTML; }catch(e){}
      try{ tt.dataset.plain = t; tt.innerHTML = fmtChat(t); tt.style.display = ""; }catch(e){ try{ tt.style.display = ""; }catch(e2){} }
      try{ box.remove(); }catch(e){}
      let err = null;
      try{ err = await onSave(t)||null; }catch(e){ err = "sem servidor"; }
      if(err){
        try{ tt.dataset.plain = oldPlain; tt.innerHTML = oldHtml; }catch(e){}
        try{ if(eb) flashBtn(eb, err); }catch(e){}
      } else { try{ if(x) x.t = t; }catch(e){} }
    };
    return true;
  }catch(e){ return false; }
}
function pubRowDecor(row, x, canMod){
  try{
    /* todos os botões moram no .chatActs criado pelo chatRow (citar +
       denunciar), p/ ficarem juntinhos com gap uniforme. Ordem final:
       citar, editar, apagar, denunciar. */
    let acts = null;
    try{ acts = row._chatActs || row.querySelector(":scope > .chatActs"); }catch(e){}
    if(!acts) acts = row;
    if(x.id && me && x.f===me.nick){
      let eb = document.createElement("button"); eb.className = "msgEdit"; eb.title = ztr("editar"); if(typeof zunSvgPencilBtn==="function") zunSvgPencilBtn(eb); else eb.textContent = "✏️";
      eb.onclick = ()=>{
        chatEditInline(row, x, eb, async (t)=>{
          try{
            let pp = {nick:me.nick, hash:me.hash, room:pubRoom||"geral", id:x.id, text:t, url:x.u||"", mtype:x.y||""};
            if(pubTopic) pp.topic = pubTopic;
            let r = null;
            try{ r = JSON.parse(await rpc("roomMsgEdit", JSON.stringify(pp))); }catch(e){}
            if(!r || !r.ok){ return (!r ? "sem servidor" : (roomErrText(r)||"erro")); }
            cInv("roomView"); loadPub(true); return null;
          }catch(e){ return "sem servidor"; }
        });
      };
      acts.appendChild(eb);
    }
    if(x.id && me && (canMod || x.f===me.nick)){
      let b = document.createElement("button"); b.className = "msgDel"; b.title = ztr("apagar"); if(typeof zunSvgTrashBtn==="function") zunSvgTrashBtn(b); else b.textContent = "🗑️";
      b.onclick = ((mid)=>{ return async ()=>{
        if(!confirm("apagar esta mensagem?")) return;
        zunBusy(b, true, "⏳");
        try{
          let pp = {nick:me.nick, hash:me.hash, room:pubRoom||"geral", id:mid};
          if(pubTopic) pp.topic = pubTopic;
          try{ row.style.display = "none"; }catch(e){}
          let r = JSON.parse(await rpc("roomMsgDel", JSON.stringify(pp)));
          if(r && r.queued && !r.local){ zunBusy(b, false); return; }
          if(!r.ok){ try{ row.style.display = ""; }catch(e){} zunBusy(b, false); flashBtn(b, roomErrText(r)||"erro"); return; }
          cInv("roomView"); loadPub(true);
        }catch(e){ zunBusy(b, false); }
      }; })(x.id);
      acts.appendChild(b);
    }
    try{ let zr = acts.querySelector(".msgReport"); if(zr) acts.appendChild(zr); }catch(e){}
  }catch(e){}
}
/* Scroll do chat com aba oculta: métrica escondida (clientHeight 0) não vale.
   Guarda se estava no fundo p/ repints de fundo não puxarem quem lia história. */
function zunChatVis(el){ try{ return !!(el && el.clientHeight); }catch(e){ return false; } }
function zunChatTrackInit(){
  try{
    if(window._zunChatTracked) return; window._zunChatTracked = true;
    let pl = null, vl = null;
    try{ pl = document.getElementById("pubLog"); }catch(e){}
    try{ vl = document.getElementById("privLog"); }catch(e){}
    if(pl && !pl._zunTracked){ try{ pl._zunTracked = true; pl.addEventListener("scroll", function(){ try{ if(pl.clientHeight) window._pubWasAtBottom = atBottomEdge(pl); }catch(e){} }, {passive:true}); }catch(e){} }
    if(vl && !vl._zunTracked){ try{ vl._zunTracked = true; vl.addEventListener("scroll", function(){ try{ if(vl.clientHeight) window._privWasAtBottom = atBottomEdge(vl); }catch(e){} }, {passive:true}); }catch(e){} }
  }catch(e){}
}
function paintPub(m){
  try{
    try{ if(typeof zunChatTrackInit==="function") zunChatTrackInit(); }catch(e){}
    fillMentions(m);
    try{ window._lastPubMsgs = m; }catch(e){}
    let items = m.slice(-(window._pubShown||30));
    let roomKey = (pubRoom||"geral")+"|"+(pubTopic||"");
    let canMod = me && curRole && (curRole.owner||curRole.mod);
    let mk = (x)=>{ let r = chatRow(x, pubInput); pubRowDecor(r, x, canMod); r.dataset.zk2 = chatRowKey(x); r.dataset.zs = chatRowSig(x); return r; };
    if(paintedPub && paintRoomPub===roomKey && pubLog.childNodes.length){
      /* caminho quente: só o que mudou (sem rebuild, sem flash) */
      let atBot = true, visPub = false;
      try{ visPub = zunChatVis(pubLog); }catch(e){}
      try{ if(visPub){ atBot = atBottomEdge(pubLog); window._pubWasAtBottom = atBot; } else { atBot = (window._pubWasAtBottom !== false); } }catch(e){}
      try{ if(visPub && window._pubNeedBottom) atBot = true; }catch(e){}
      try{ if(visPub) window._pubWasAtBottom = atBot; }catch(e){}
      try{ pubLog.querySelectorAll(":scope > .zskel").forEach(function(s){ try{ s.remove(); }catch(e){} }); }catch(e){}
      let fresh = [];
      try{ fresh = patchChatLog(pubLog, items, mk); }catch(e){ fresh = []; }
      healFreshRows(fresh);
      try{
        if(atBot){
          if(visPub){ pubLog.scrollTop = pubLog.scrollHeight; zRepinSoon(pubLog); try{ let real = false; try{ real = !!pubLog.querySelector("[data-zk],.zskel"); }catch(e){} if(real) window._pubNeedBottom = false; }catch(e){} }
          else { window._pubNeedBottom = true; }
        }
      }catch(e){}
    } else {
      /* caminho frio: troca de sala/tópico ou 1a pintura — rebuild total.
         1a visita vai p/ o fundo (novo), igual o feed vai p/ o topo. */
      let atBot = true, pst = 0, ancP = null, wasFirstPub = false, visPub = false;
      try{ wasFirstPub = !paintedPub; }catch(e){}
      try{ visPub = zunChatVis(pubLog); }catch(e){}
      try{
        if(visPub){ atBot = atBottomEdge(pubLog); window._pubWasAtBottom = atBot; pst = pubLog.scrollTop||0; ancP = zAnchorSave(pubLog, "[data-zk]", el=>el.dataset.zk); }
        else { atBot = wasFirstPub || (window._pubWasAtBottom !== false); pst = pubLog.scrollTop||0; ancP = null; }
      }catch(e){}
      pubLog.innerHTML = "";
      let fresh = [];
      items.forEach(x=>{
        let row = mk(x);
        pubLog.appendChild(row);
        fresh.push(row);
      });
      healFreshRows(fresh);
      try{
        if(wasFirstPub || atBot || (visPub && window._pubNeedBottom)){
          if(visPub){ pubLog.scrollTop = pubLog.scrollHeight; zRepinSoon(pubLog); try{ let real = false; try{ real = !!pubLog.querySelector("[data-zk],.zskel"); }catch(e){} if(real) window._pubNeedBottom = false; }catch(e){} }
          else { window._pubNeedBottom = true; }
        }
        else if(!visPub){ /* oculta + lendo história: não toca no scroll */ }
        else if(!zAnchorRestore(pubLog, "[data-zk]", el=>el.dataset.zk, ancP)){ try{ pubLog.scrollTop = pst; }catch(e){} }
        else { let _aP = ancP, _stP = 0; try{ _stP = pubLog.scrollTop||0; }catch(e){} requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ try{ if((pubLog.scrollTop||0) !== _stP) return; }catch(e){ return; } try{ zAnchorRestore(pubLog, "[data-zk]", el=>el.dataset.zk, _aP); }catch(e){} }); }); }
      }catch(e){}
      try{ zTrustSave(pubLog, "[data-zk]", el=>el.dataset.zk); }catch(e){}
    }
    try{
      let _ork = (typeof pubRoom!=="undefined"?pubRoom:"geral")+"|"+(typeof pubTopic!=="undefined"&&pubTopic?pubTopic:"");
      (optPub||[]).forEach(o=>{ try{ if(!o||!o.tid) return; if((o.room+"|"+(o.topic||""))!==_ork) return; if(pubLog.querySelector('[data-optid="'+o.tid+'"]')) return; let row = chatOptNode(o, (typeof pubInput!=="undefined"?pubInput:null)); if(row&&row.nodeType){ pubLog.appendChild(row); try{ healFreshRows([row]); }catch(e){} } }catch(e){} });
    }catch(e){}
    /* botão "ver mais" p/ mensagens antigas (o servidor manda até 100, antes
       só as 30 últimas eram visíveis sem saída) */
    try{ paintPubMoreBtn(); }catch(e){}
    paintRoomPub = roomKey;
    seenAtPub = maxAtSince(m); paintedPub = true; paintSigPub = sigChat(m)+"|"+pubRoom+"|"+(pubTopic||"");
    try{ zunSnapSave("pub:"+(pubRoom||"geral")+"|"+(pubTopic||""), m); }catch(e){}
    try{ if(items && items.length) ensureZNickStyles(items.map(x=>x.f)); }catch(e){}
  }catch(e){}
}
/* revela as mensagens antigas já carregadas (+30 por clique, sem ir à rede).
   Mantém o scroll ancorado: as linhas entram em cima, então a vista fica. */
function paintPubMoreBtn(){
  try{
    if(typeof pubLog==="undefined" || !pubLog) return;
    let old = document.getElementById("pubMoreBtn");
    if(old) old.remove();
    let m = window._lastPubMsgs||[];
    let rest = m.length - Math.min((window._pubShown||30), m.length);
    if(rest<=0) return;
    let b = document.createElement("button");
    b.id = "pubMoreBtn";
    b.textContent = ztr("↑ ver mais ("+rest+" restantes)");
    b.style.cssText = "width:100%;margin:4px 0;padding:8px;min-height:40px";
    b.onclick = function(){
      if(b.disabled) return;
      b.disabled = true;
      try{
        let sh0 = 0;
        try{ sh0 = pubLog.scrollHeight||0; }catch(e){}
        window._pubShown = (window._pubShown||30)+30;
        paintPub(window._lastPubMsgs||[]);
        try{ pubLog.scrollTop += ((pubLog.scrollHeight||0)-sh0); }catch(e){}
      }catch(e){}
    };
    pubLog.insertBefore(b, pubLog.firstChild);
  }catch(e){}
}
try{ pubFlipBtn.onclick = ()=>pubSetFlip(!pubFlipped); }catch(e){}
try{ pubBackBtn.onclick = ()=>pubSetFlip(false); }catch(e){}
try{ pubNewBtn.onclick = ()=>{ if(!me){ flashBtn(pubNewBtn, "entre c/ nick+senha"); return; } pubSetFlip(false); pubCreateForm.hidden = !pubCreateForm.hidden; }; }catch(e){}
try{ pubCreateCancelBtn.onclick = ()=>{ pubCreateForm.hidden = true; }; }catch(e){}
try{ pubCreateBtn.onclick = createRoom; }catch(e){}
try{ pubLinkBtn.onclick = async ()=>{ let l = roomLink(pubRoom||"geral"); try{ await navigator.clipboard.writeText(l); flashBtn(pubLinkBtn, "link copiado!"); }catch(e){ flashBtn(pubLinkBtn, l); } }; }catch(e){}
try{ pubModBtn.onclick = ()=>{ if(pubModPanel.hidden){ paintModPanel(); } else { pubModPanel.hidden = true; try{ applyRoomTheme(curRoomMeta); }catch(e){} } }; }catch(e){}
try{ pubSearchInput.oninput = ()=>paintRooms(roomsCache||[]); }catch(e){}
/* ===== privados: chave v2 + sufixo forte (anti-clone/roubo) =====
   v1 ("zunzum-priv:"+sala, so texto) tinha 2 furos: (1) chave = nome curto
   adivinhavel; (2) url/midia iam em CLARO. v2 cifra {texto+url} juntos com
   dominio "zunzum-priv-v2". Leitura mantem ENC1/claro legado. */
let privKeys = {};
async function privKeyV2(room){
  let ck = "v2:"+room;
  if(privKeys[ck]) return privKeys[ck];
  let b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("zunzum-priv-v2:"+room));
  let k = await crypto.subtle.importKey("raw", b, "AES-GCM", false, ["encrypt","decrypt"]);
  privKeys[ck] = k; return k;
}
async function privKeyV1(room){
  let ck = "v1:"+room;
  if(privKeys[ck]) return privKeys[ck];
  let b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("zunzum-priv:"+room));
  let k = await crypto.subtle.importKey("raw", b, "AES-GCM", false, ["encrypt","decrypt"]);
  privKeys[ck] = k; return k;
}
async function privKey(room){ return privKeyV2(room); }
// entropia do sufixo: "-" + >=10 [a-z0-9]; forte = ~62+ bits (12 chars)
function privBitsOf(room){
  try{
    let r = String(room||""), i = r.lastIndexOf("-");
    if(i<1) return 0;
    let suf = r.slice(i+1);
    if(!/^[a-z0-9]{10,30}$/.test(suf)) return 0;
    return Math.floor(suf.length*5.17);
  }catch(e){ return 0; }
}
function privIsStrong(room){ return privBitsOf(room)>=60; }
function privGenStrong(base){
  try{
    let bb = String(base||"sala").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").split("-")[0].slice(0,12)||"sala";
    let abc = "abcdefghijklmnopqrstuvwxyz0123456789", suf = "";
    let rnd = new Uint8Array(16);
    if(window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(rnd);
    else for(let i=0;i<16;i++) rnd[i] = Math.floor(Math.random()*256);
    for(let i=0;i<16;i++) suf += abc[rnd[i]%36];
    return (bb+"-"+suf).slice(0,30);
  }catch(e){ return "sala-"+Math.random().toString(36).slice(2,14); }
}
async function privEncV2(room, text, url){
  let k = await privKeyV2(room);
  let iv = crypto.getRandomValues(new Uint8Array(12));
  let bundle = JSON.stringify({t:String(text||""), u:String(url||"")});
  let ct = await crypto.subtle.encrypt({name:"AES-GCM", iv:iv}, k, new TextEncoder().encode(bundle));
  return "ENC2:"+b64e(iv)+":"+b64e(ct);
}
async function privDecMsg(room, m){
  try{
    let t = String((m&&m.t)||""), u = String((m&&m.u)||"");
    if(t.indexOf("ENC2:")===0){
      try{
        let pp = t.split(":"), k = await privKeyV2(room);
        let pt = await crypto.subtle.decrypt({name:"AES-GCM", iv:new Uint8Array(b64d(pp[1]))}, k, b64d(pp.slice(2).join(":")));
        let o = JSON.parse(new TextDecoder().decode(pt));
        return {t:String((o&&o.t)||""), u:String((o&&o.u)||"")};
      }catch(e){ return {t:t, u:u, _lock:1}; }
    }
    if(t.indexOf("ENC1:")===0){
      try{
        let pp = t.split(":"), k = await privKeyV1(room);
        let pt = await crypto.subtle.decrypt({name:"AES-GCM", iv:new Uint8Array(b64d(pp[1]))}, k, b64d(pp.slice(2).join(":")));
        return {t:new TextDecoder().decode(pt), u:u};
      }catch(e){ return {t:t, u:u, _lock:1}; }
    }
    return {t:t, u:u};
  }catch(e){ return {t:String((m&&m.t)||""), u:String((m&&m.u)||"")}; }
}
function b64e(buf){ let s = ""; new Uint8Array(buf).forEach(x=>s+=String.fromCharCode(x)); return btoa(s); }
function b64d(s){ let b = atob(s); let u = new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i] = b.charCodeAt(i); return u.buffer; }
async function privEnc(room, text){ return privEncV2(room, text, ""); }
async function privDec(room, text){ try{ let r = await privDecMsg(room, {t:text, u:""}); return r.t; }catch(e){ return text; } }
async function loadPriv(force){
  if(!me || !privRoom){ privLog.innerHTML = ""; paintedPriv = false; pendPriv = null; hideNewPill(privPill); return; }
  if(privInfo.locked && !privInfo.member){ privLog.innerHTML = ""; paintedPriv = false; pendPriv = null; hideNewPill(privPill); paintLocks(); return; }
  try{
    let pvkey = privRoom||"";
    if(pvkey!==lastPrivKey){ lastPrivKey = pvkey; try{ privLog.innerHTML = ""; }catch(e){} try{ paintedPriv = false; pendPriv = null; paintSigPriv = ""; }catch(e){} try{ window._privShown = 30; }catch(e){} }
    if(!paintedPriv){ try{ let _vs = zunSnapLoad("priv:"+privRoom); if(_vs && _vs.length) await paintPriv(_vs); }catch(e){} }
    if(!paintedPriv || paintRoomPriv!==privRoom){ try{ zunChatSkeleton(privLog, 24); }catch(e){} zunLoading(privLog, "carregando conversa..."); }
    let m = JSON.parse(await crpc("privGet", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom})));
    ensureNewPills();
    let _sgv = sigChat(m);
    if(!force && paintedPriv && _sgv===paintSigPriv) return;
    if(!force && paintedPriv && privLog.childNodes.length && !atBottomEdge(privLog)){
      let n = newCountSince(m, seenAtPriv);
      if(n > 0){ pendPriv = m; showNewPill(privPill, "↓ " + n + (n > 1 ? " novas mensagens" : " nova mensagem")); return; }
    }
    pendPriv = null; hideNewPill(privPill);
    await paintPriv(m);
    if(force){ try{ privLog.scrollTop = privLog.scrollHeight; }catch(e){} }
  }catch(e){}
}
function privRowDecor(row, x, isOwner){
  try{
    let acts = null;
    try{ acts = row._chatActs || row.querySelector(":scope > .chatActs"); }catch(e){}
    if(!acts) acts = row;
    if(x.id && me && x.f===me.nick){
      let eb = document.createElement("button"); eb.className = "msgEdit"; eb.title = ztr("editar"); if(typeof zunSvgPencilBtn==="function") zunSvgPencilBtn(eb); else eb.textContent = "✏️";
      eb.onclick = ()=>{
        chatEditInline(row, x, eb, async (t)=>{
          try{
            let et = t, eu = "";
            /* Round 4: falha na cifra ABORTA (antes caía p/ plaintext). */
            try{ let b = await privEncV2(privRoom, t, x.u||""); et = b; eu = ""; }catch(e){ return "falha na cifra — não enviado"; }
            let r = null;
            try{ r = JSON.parse(await rpc("privMsgEdit", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom, id:x.id, text:et, url:eu, mtype:x.y||""}))); }catch(e){}
            if(!r || !r.ok){ return (!r ? "sem servidor" : (roomErrText(r)||"erro")); }
            cInv("privGet"); loadPriv(true); return null;
          }catch(e){ return "sem servidor"; }
        });
      };
      acts.appendChild(eb);
    }
    if(x.id && me && (x.f===me.nick || isOwner)){
      let db = document.createElement("button"); db.className = "msgDel"; db.title = ztr("apagar"); if(typeof zunSvgTrashBtn==="function") zunSvgTrashBtn(db); else db.textContent = "🗑️";
      db.onclick = (async (mid)=>{
        return async ()=>{
          if(!confirm("apagar esta mensagem?")) return;
          zunBusy(db, true, "⏳");
          try{
            try{ row.style.display = "none"; }catch(e){}
            let r = JSON.parse(await rpc("privMsgDel", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom, id:mid})));
            if(r && r.queued && !r.local){ zunBusy(db, false); return; }
            if(!r.ok){ try{ row.style.display = ""; }catch(e){} zunBusy(db, false); flashBtn(db, roomErrText(r)||"erro"); return; }
            cInv("privGet"); loadPriv(true);
          }catch(e){ zunBusy(db, false); }
        };
      })(x.id);
      acts.appendChild(db);
    }
    try{ let zr = acts.querySelector(".msgReport"); if(zr) acts.appendChild(zr); }catch(e){}
  }catch(e){}
}
async function paintPriv(m){
  try{
    try{ if(typeof zunChatTrackInit==="function") zunChatTrackInit(); }catch(e){}
    try{ zunSnapSave("priv:"+(privRoom||""), m); }catch(e){}
    try{ window._lastPrivMsgs = m; }catch(e){}
    let items = m.slice(-(window._privShown||30));
    /* descriptografa (com cache: só o que é novo no ciphertext) */
    for(let x of items){
      try{
        let d = await privDecCached(privRoom, x);
        x.t = d.t; if(d.u!==undefined) x.u = d.u;
        if(d._lock) x._lock = 1;
      }catch(e){}
    }
    let isOwner = me && privInfo && String(privInfo.owner||"").toLowerCase()===me.nick.toLowerCase();
    let mk = (x)=>{ let row = chatRow(x, privMsgInput); privRowDecor(row, x, isOwner); row.dataset.zk2 = chatRowKey(x); row.dataset.zs = chatRowSig(x); return row; };
    if(paintedPriv && paintRoomPriv===privRoom && privLog.childNodes.length){
      /* caminho quente: só o que mudou (o priv era o pior: rebuild total +
         re-descriptografia a cada mensagem nova) */
      let atBot2 = true, visPriv = false;
      try{ visPriv = zunChatVis(privLog); }catch(e){}
      try{ if(visPriv){ atBot2 = atBottomEdge(privLog); window._privWasAtBottom = atBot2; } else { atBot2 = (window._privWasAtBottom !== false); } }catch(e){}
      try{ if(visPriv && window._privNeedBottom) atBot2 = true; }catch(e){}
      try{ if(visPriv) window._privWasAtBottom = atBot2; }catch(e){}
      try{ privLog.querySelectorAll(":scope > .zskel").forEach(function(s){ try{ s.remove(); }catch(e){} }); }catch(e){}
      let fresh = [];
      try{ fresh = patchChatLog(privLog, items, mk); }catch(e){ fresh = []; }
      healFreshRows(fresh);
      try{
        let joins = privLog.querySelectorAll(':scope > .meta[data-join-nick]');
        if(joins.length > 5) for(let i = 0; i < joins.length-5; i++){ try{ joins[i].remove(); }catch(e){} }
      }catch(e){}
      try{
        if(atBot2){
          if(visPriv){ privLog.scrollTop = privLog.scrollHeight; zRepinSoon(privLog); try{ let real = false; try{ real = !!privLog.querySelector("[data-zk],.zskel"); }catch(e){} if(real) window._privNeedBottom = false; }catch(e){} }
          else { window._privNeedBottom = true; }
        }
      }catch(e){}
    } else {
      /* caminho frio: troca de sala ou 1a pintura — rebuild total.
         1a visita vai p/ o fundo (novo), igual o feed vai p/ o topo. */
      let atBot2 = true, pst2 = 0, ancV = null, wasFirstPriv = false, visPriv = false;
      try{ wasFirstPriv = !paintedPriv; }catch(e){}
      try{ visPriv = zunChatVis(privLog); }catch(e){}
      try{
        if(visPriv){ atBot2 = atBottomEdge(privLog); window._privWasAtBottom = atBot2; pst2 = privLog.scrollTop||0; ancV = zAnchorSave(privLog, "[data-zk]", el=>el.dataset.zk); }
        else { atBot2 = wasFirstPriv || (window._privWasAtBottom !== false); pst2 = privLog.scrollTop||0; ancV = null; }
      }catch(e){}
      privLog.innerHTML = "";
      let fresh = [];
      for(let x of items){
        let row = mk(x);
        privLog.appendChild(row);
        fresh.push(row);
      }
      healFreshRows(fresh);
      try{
        if(wasFirstPriv || atBot2 || (visPriv && window._privNeedBottom)){
          if(visPriv){ privLog.scrollTop = privLog.scrollHeight; zRepinSoon(privLog); try{ let real = false; try{ real = !!privLog.querySelector("[data-zk],.zskel"); }catch(e){} if(real) window._privNeedBottom = false; }catch(e){} }
          else { window._privNeedBottom = true; }
        }
        else if(!visPriv){ /* oculta + lendo história: não toca no scroll */ }
        else if(!zAnchorRestore(privLog, "[data-zk]", el=>el.dataset.zk, ancV)){ try{ privLog.scrollTop = pst2; }catch(e){} }
        else { let _aV = ancV, _stV = 0; try{ _stV = privLog.scrollTop||0; }catch(e){} requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ try{ if((privLog.scrollTop||0) !== _stV) return; }catch(e){ return; } try{ zAnchorRestore(privLog, "[data-zk]", el=>el.dataset.zk, _aV); }catch(e){} }); }); }
      }catch(e){}
      try{ zTrustSave(privLog, "[data-zk]", el=>el.dataset.zk); }catch(e){}
    }
    try{ (optPriv||[]).forEach(o=>{ try{ if(!o||!o.tid) return; if((o.room||"")!==(typeof privRoom!=="undefined"?privRoom:"")) return; if(privLog.querySelector('[data-optid="'+o.tid+'"]')) return; let row = chatOptNode(o, (typeof privMsgInput!=="undefined"?privMsgInput:null)); if(row&&row.nodeType){ privLog.appendChild(row); try{ healFreshRows([row]); }catch(e){} } }catch(e){} }); }catch(e){}
    try{ paintPrivMoreBtn(); }catch(e){}
    paintRoomPriv = privRoom;
    seenAtPriv = maxAtSince(m); paintedPriv = true; paintSigPriv = sigChat(m);
    try{ if(items && items.length) ensureZNickStyles(items.map(x=>x.f)); }catch(e){}
  }catch(e){}
}
/* revela as conversas antigas já carregadas (+30 por clique, sem ir à rede).
   Mantém o scroll ancorado: as linhas entram em cima, então a vista fica. */
function paintPrivMoreBtn(){
  try{
    if(typeof privLog==="undefined" || !privLog) return;
    let old = document.getElementById("privMoreBtn");
    if(old) old.remove();
    let m = window._lastPrivMsgs||[];
    let rest = m.length - Math.min((window._privShown||30), m.length);
    if(rest<=0) return;
    let b = document.createElement("button");
    b.id = "privMoreBtn";
    b.textContent = ztr("↑ ver mais ("+rest+" restantes)");
    b.style.cssText = "width:100%;margin:4px 0;padding:8px;min-height:40px";
    b.onclick = function(){
      if(b.disabled) return;
      b.disabled = true;
      try{
        let sh0 = 0;
        try{ sh0 = privLog.scrollHeight||0; }catch(e){}
        window._privShown = (window._privShown||30)+30;
        let r = paintPriv(window._lastPrivMsgs||[]);
        let done = function(){ try{ privLog.scrollTop += ((privLog.scrollHeight||0)-sh0); }catch(e){} };
        if(r && typeof r.then==="function") r.then(done).catch(()=>{});
        else done();
      }catch(e){}
    };
    privLog.insertBefore(b, privLog.firstChild);
  }catch(e){}
}
async function refreshAll(){ paintMe(); paintLocks(); loadFeed(); loadPub(); loadPriv(); loadPresence(); try{ loadRooms(); }catch(e){} }
async function loadPresence(){
  try{
    let _ppay = "";
    try{
      if(me) _ppay = JSON.stringify({nick:me.nick, hash:me.hash});
      else{
        /* anon também conta presença (RETENCAO 2026-10-30): upsert no máx
           1x/45s (metade da janela do online) p/ não gastar egress à toa; a leitura
           segue o ritmo normal do poll (crpc cache 20s). Prova de posse do
           anon-xxx via anonTok (sb.js verifica anon_claims). */
        let _nowP = Date.now();
        if(_nowP - (window._anonHbAt||0) > 45000){
          window._anonHbAt = _nowP;
          _ppay = JSON.stringify({anon:anonId, anonTok:anonTokGet(anonId)});
        }
      }
    }catch(e){}
    let r = JSON.parse(await crpc("presence", _ppay));
    if(!r.ok) return;
    try{ if(r && r.anonTok) anonTokSet(anonId, r.anonTok); }catch(e){}
    /* anon-taken: o nick local perdeu o token (storage limpo, outro aparelho)
       e o nome já tem dono no anon_claims — sem isso o visitante nunca mais
       subia o online. Troca silenciosa (mesmo padrão do feedPush/like) e
      Heartbeat imediato com o nick novo (1 retry, sem loop). */
    try{
      if(r && r.anonTaken && !me && !window._anonHbRetried){
        window._anonHbRetried = true;
        try{ renewAnonForce(); }catch(e){}
        try{ window._anonHbAt = 0; }catch(e){}
        try{ await cInv("presence"); }catch(e){}
        try{
          let _rp2 = JSON.stringify({anon:anonId, anonTok:anonTokGet(anonId)});
          r = JSON.parse(await crpc("presence", _rp2));
          if(!r.ok) return;
          try{ if(r && r.anonTok) anonTokSet(anonId, r.anonTok); }catch(e){}
        }catch(e){}
        try{ window._anonHbRetried = false; }catch(e){}
      }
    }catch(e){}
    onlineNicks = new Set((Array.isArray(r.nicks) ? r.nicks : []).map(function(n){ try{ return String(n||"").toLowerCase(); }catch(e){ return ""; } }).filter(Boolean));
    try{ repaintOnlineDots(); }catch(e){}
    let shownOn = Math.max(0, r.online||0);
    userCountEl.innerHTML = "";
    let tot = document.createElement("span"); tot.className = "uc-total"; tot.textContent = r.total+" usuários · "; userCountEl.appendChild(tot);
    let dot = document.createElement("span"); dot.className = "onDot"; dot.title = "online agora"; userCountEl.appendChild(dot);
    let on = document.createElement("span"); on.className = "uc-on"; on.textContent = " "+shownOn+" online"; userCountEl.appendChild(on);
    try{ let _ao = Math.max(0, r.anonOn||0); on.title = "online agora ("+_ao+" sem conta)"; dot.title = "online agora ("+_ao+" sem conta)"; }catch(e){}
    /* recorde global (zz_peak_tick via sb.js, src/supabase-peak.sql) + fallback local.
       Sem o SQL aplicado, r.maxOn=0 e vale o maior já visto neste navegador. */
    let fmtPk = function(ms){ try{ if(!(ms>0)) return ""; let d=new Date(ms); let dd=String(d.getDate()).padStart(2,"0"); let mm=String(d.getMonth()+1).padStart(2,"0"); let hh=String(d.getHours()).padStart(2,"0"); let mi=String(d.getMinutes()).padStart(2,"0"); return dd+"/"+mm+" "+hh+":"+mi; }catch(e){ return ""; } };
    let dispMax = Math.max(0, r.maxOn||0, shownOn);
    let peakAt = (r.peakAt>0 ? r.peakAt : 0);
    let lastAt = (r.lastGt1>0 ? r.lastGt1 : 0);
    let lastN = Math.max(0, r.lastGt1N||0);
    try{
      let _lm = parseInt(localStorage.getItem("orkutMaxOnCel")||"0")||0;
      let _lo = parseInt(localStorage.getItem("orkutMaxOn")||"0")||0;
      let _pc = 0, _pat = 0, _lat = 0, _ln = 0;
      try{ let _c = JSON.parse(localStorage.getItem("zunzumPresenceCache")||"null"); if(_c){ _pc=_c.m||0; _pat=_c.pat||0; _lat=_c.lat||0; _ln=_c.ln||0; } }catch(e){}
      dispMax = Math.max(dispMax, _lm, _lo, _pc);
      if(!peakAt) peakAt = _pat||0;
      if(!lastAt){ lastAt = _lat||0; if(!lastN) lastN = _ln||0; }
      if(shownOn >= dispMax && dispMax > 1 && shownOn > _pc && !(r.maxOn>0 && _pat>0)) peakAt = Date.now();
      if(shownOn > 1 && !lastAt){ lastAt = Date.now(); lastN = shownOn; }
    }catch(e){}
    if(dispMax>1){
      let mx = document.createElement("span"); mx.className = "meta uc-rec"; mx.style.marginLeft = "6px"; mx.textContent = "· recorde "+dispMax;
      try{
        let tt = "";
        let fp = fmtPk(peakAt);
        if(fp) tt += "pico em " + fp;
        let fl = fmtPk(lastAt);
        if(fl) tt += (tt?" · ":"") + "última vez com 2+ online em " + fl + (lastN>1?" ("+lastN+" juntos)":"");
        if(!tt) tt = "recorde neste navegador";
        mx.title = tt;
      }catch(e){}
      userCountEl.appendChild(mx);
    }
    try{ localStorage.setItem("zunzumPresenceCache", JSON.stringify({t:r.total, o:shownOn, m:dispMax, pat:peakAt||0, lat:lastAt||0, ln:lastN||0})); }catch(e2){}
    /* espelho no box postar (mobile esconde o .uc-rec do topo): */
    try{
      let pb = document.getElementById("postBox");
      if(pb){
        let pl = document.getElementById("zunPeakLine");
        if(!pl){ pl = document.createElement("div"); pl.id = "zunPeakLine"; pl.className = "meta"; let h = pb.querySelector("h3"); if(h && h.nextSibling) h.parentNode.insertBefore(pl, h.nextSibling); else pb.insertBefore(pl, pb.firstChild); }
        if(dispMax>1){
          let fp2 = fmtPk(peakAt), fl2 = fmtPk(lastAt);
          let lastTxt = (fl2 && fl2!==fp2) ? " · última vez com 2+ online em " + fl2 + (lastN>1?" ("+lastN+" juntos)":"") : "";
          pl.textContent = "🐝 recorde " + dispMax + " online" + (fp2 ? " · pico em " + fp2 : "") + lastTxt;
          pl.title = "maior número de gente online ao mesmo tempo" + (fl2 ? " · última vez com 2+ online em " + fl2 + (lastN>1?" ("+lastN+" juntos)":"") : "");
          pl.hidden = false;
        } else if(lastAt){
          pl.textContent = "🐝 última vez com 2+ online em " + fmtPk(lastAt);
          pl.title = "quando 2 ou mais pessoas estiveram online juntas pela última vez";
          pl.hidden = false;
        } else if(shownOn<=1){
          pl.textContent = "🐝 ainda sem pico: quando 2+ ficarem online juntos, o horário aparece aqui";
          pl.hidden = false;
        }
      }
    }catch(e){}
    try{
      let lastRec = parseInt(localStorage.getItem("orkutMaxOnCel")||"0")||0;
      /* festa sincronizada: recorde carimbado há <5min comemora em todo aparelho
         online — inclusive quem entrou depois e não participou do pico (antes só
         quem estava dentro do pico via toast; visitante de dias depois continua
         vendo só o número, sem toast, porque o peakAt já é velho). */
      let freshPk = peakAt>0 && (Date.now()-peakAt) < 300000;
      if(r.rec && r.maxOn>lastRec){
        localStorage.setItem("orkutMaxOnCel", String(r.maxOn));
        celebratePeak("online", r.maxOn);
      } else if(dispMax>lastRec && dispMax>1 && (shownOn>=dispMax || freshPk)){
        localStorage.setItem("orkutMaxOnCel", String(dispMax));
        try{ celebratePeak("online", dispMax); }catch(e){}
      }
      let ms = Math.floor(r.total/50)*50;
      let lastMs = parseInt(localStorage.getItem("orkutMsReg")||"0")||0;
      if(ms>=50 && ms>lastMs){
        localStorage.setItem("orkutMsReg", String(ms));
        celebratePeak("cadastro", ms);
      }
    }catch(e){}
  }catch(e){}
}
function celebratePeak(kind, n){
  try{
    let t = document.getElementById("peakToast");
    if(!t){
      t = document.createElement("div"); t.id = "peakToast";
      t.style.cssText = "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:9999;border-radius:10px;padding:10px 16px;font-size:14px;box-shadow:0 4px 16px #0004;text-align:center;max-width:90vw";
      document.body.appendChild(t);
    }
    t.innerHTML = "";
    let big = document.createElement("div"); big.style.fontSize = "22px"; big.textContent = "🎉🎊🎉"; t.appendChild(big);
    let tx = document.createElement("div");
    tx.textContent = kind==="online" ? ("RECORDE! "+n+" pessoas online ao mesmo tempo!") : ("DEMOROU MAS CHEGAMOS! "+n+" usuários cadastrados!");
    t.appendChild(tx);
    t.hidden = false;
    clearTimeout(t._tm);
    t._tm = setTimeout(()=>{ t.hidden = true; }, 8000);
    t.onclick = ()=>{ t.hidden = true; };
  }catch(e){}
}
async function shrinkImage(f, maxSide, q){
  try{
    if(!f || !/^image\//.test(f.type||"")) return f;
    /* GIF: preserva a animação — tenta encolher animado primeiro (mesmo
       compressor do gifmoji, com lado do destino); pequeno já volta cru;
       gigante que nem comprimido coube cai no JPEG abaixo (como antes). */
    if(/^image\/gif$/i.test(f.type||"")){
      try{
        let _b0=await createImageBitmap(f);
        let _w0=_b0.width, _h0=_b0.height; try{ _b0.close(); }catch(e){}
        /* pequeno e dentro do limite: cru, sem nem baixar o compressor */
        if(Math.max(_w0,_h0)<=(maxSide||1024) && f.size<=2097152) return f;
      }catch(e){ return f; }
      try{
        if(window.ZunGifmoji && typeof window.ZunGifmoji.compress==="function"){
          /* orçamento curto de propósito: GIF de chat tem que sair rápido —
             quadros demais viram stride (duração preservada, menos quadros) */
          let _g=await window.ZunGifmoji.compress(f, {side:(maxSide||1024), maxBytes:Math.min(f.size-1,4194304), maxFrames:48, pixBudget:3000000});
          if(_g && _g.blob && _g.blob.size<f.size) return new File([_g.blob], "anim.gif", {type:"image/gif"});
        }
      }catch(e){}
      if(f.size<=8388608) return f;
    }
    let bmp = await createImageBitmap(f);
    let sc = Math.min(1, (maxSide||1024)/Math.max(bmp.width, bmp.height));
    if(sc>=1 && f.size<=409600){ bmp.close(); return f; }
    let cv = document.createElement("canvas");
    cv.width = Math.max(1,Math.round(bmp.width*sc)); cv.height = Math.max(1,Math.round(bmp.height*sc));
    let cx = cv.getContext("2d");
    cx.fillStyle = "#fff"; cx.fillRect(0,0,cv.width,cv.height);
    cx.drawImage(bmp,0,0,cv.width,cv.height); bmp.close();
    let out = await new Promise(r=>cv.toBlob(r,"image/jpeg",q||0.82));
    if(out && out.size<f.size) return new File([out], "foto.jpg", {type:"image/jpeg"});
  }catch(e){}
  return f;
}
function encodeWav(buf){
  var ch = buf.numberOfChannels, sr = buf.sampleRate, len = buf.length;
  var data = new Int16Array(len*ch);
  for(var c=0;c<ch;c++){ var d = buf.getChannelData(c); for(var i=0;i<len;i++){ var v = Math.max(-1, Math.min(1, d[i])); data[i*ch+c] = v<0 ? v*32768 : v*32767; } }
  var ab = new ArrayBuffer(44+data.length*2), vw = new DataView(ab);
  function ws(o,s){ for(var i=0;i<s.length;i++) vw.setUint8(o+i, s.charCodeAt(i)); }
  ws(0,"RIFF"); vw.setUint32(4,36+data.length*2,true); ws(8,"WAVEfmt "); vw.setUint32(16,16,true); vw.setUint16(20,1,true); vw.setUint16(22,ch,true); vw.setUint32(24,sr,true); vw.setUint32(28,sr*ch*2,true); vw.setUint16(32,ch*2,true); vw.setUint16(34,16,true); ws(36,"data"); vw.setUint32(40,data.length*2,true);
  new Int16Array(ab,44).set(data);
  return new Blob([ab],{type:"audio/wav"});
}
async function compressAudio(f){
  try{
    if(!f || !/^audio\//.test(f.type||"") || f.size<=1572864) return f;
    var AC = window.AudioContext||window.webkitAudioContext;
    if(!AC) return f;
    var raw = await f.arrayBuffer();
    var ac = new AC();
    var src = await ac.decodeAudioData(raw);
    if(!src || !src.duration || src.duration>600){ try{ac.close();}catch(e){} return f; }
    var off = new OfflineAudioContext(1, Math.ceil(src.duration*22050), 22050);
    var bs = off.createBufferSource(); bs.buffer = src; bs.connect(off.destination); bs.start(0);
    var mix = await off.startRendering();
    try{ac.close();}catch(e){}
    var wav = encodeWav(mix);
    if(wav.size>1000 && wav.size<f.size) return new File([wav],"audio.wav",{type:"audio/wav"});
  }catch(e){}
  return f;
}
async function compressVideo(f){
  try{
    if(!f || !/^video\//.test(f.type||"") || f.size<=4194304) return f;
    if(typeof MediaRecorder==="undefined" || !document.createElement("canvas").captureStream) return f;
    var url = URL.createObjectURL(f);
    var vd = document.createElement("video");
    vd.muted = true; vd.playsInline = true; vd.preload = "auto"; vd.src = url;
    await new Promise((res,rej)=>{ vd.onloadedmetadata = res; vd.onerror = rej; setTimeout(()=>rej(new Error("t")),15000); });
    if(!vd.duration || vd.duration>300 || !vd.videoWidth){ URL.revokeObjectURL(url); return f; }
    var sc = Math.min(1, 640/Math.max(vd.videoWidth, vd.videoHeight));
    var cv = document.createElement("canvas");
    cv.width = Math.max(2, Math.round(vd.videoWidth*sc)); cv.height = Math.max(2, Math.round(vd.videoHeight*sc));
    var cx = cv.getContext("2d");
    var live = true;
    function draw(){ try{ if(live && !vd.ended) cx.drawImage(vd,0,0,cv.width,cv.height); }catch(e){} if(live && !vd.ended) requestAnimationFrame(draw); }
    var stream = cv.captureStream(24);
    var mime = "video/webm;codecs=vp9,opus";
    if(typeof MediaRecorder.isTypeSupported==="function" && !MediaRecorder.isTypeSupported(mime)) mime = "video/webm";
    var rec;
    try{ rec = new MediaRecorder(stream, {mimeType:mime, videoBitsPerSecond:600000}); }catch(e){ URL.revokeObjectURL(url); return f; }
    var chunks = [];
    rec.ondataavailable = (ev)=>{ if(ev.data && ev.data.size) chunks.push(ev.data); };
    var stopped = new Promise((res)=>{ rec.onstop = res; });
    try{ await vd.play(); }catch(e){ URL.revokeObjectURL(url); return f; }
    try{ vd.playbackRate = 4; }catch(e){}
    draw(); rec.start(500);
    await new Promise((res)=>{ vd.onended = res; setTimeout(res, Math.min(120000, (vd.duration*1000)/2+15000)); });
    live = false;
    try{ rec.stop(); }catch(e){}
    try{ await stopped; }catch(e){}
    try{ vd.pause(); }catch(e){}
    URL.revokeObjectURL(url);
    var out = new Blob(chunks,{type:"video/webm"});
    if(out.size>1000 && out.size<f.size) return new File([out],"video.webm",{type:"video/webm"});
  }catch(e){}
  return f;
}
function zunIsSvgFile(f){ try{ if(!f) return false; let t = String(f.type||"").toLowerCase(); if(t.indexOf("svg")>=0) return true; let n = String(f.name||"").toLowerCase().split("?")[0].split("#")[0]; if(/\.svg$/.test(n)) return true; }catch(e){} return false; }
/* Ícones SVG em vez de figurinha (emoji varia por aparelho; o mural já usa
   esse padrão). Uso: zunSvgTrashBtn(btn) / zunSvgPencilBtn(btn). */
var ZUN_SVG_TRASH='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M2.5 4h11"/><path d="M6.5 4V2.8c0-.4.3-.7.8-.7h1.4c.5 0 .8.3.8.7V4"/><path d="M4 4l.7 9.1c0 .5.4.9.9.9h4.8c.5 0 .9-.4.9-.9L12 4"/><path d="M6.8 7v4M9.2 7v4"/></svg>';
var ZUN_SVG_PENCIL='<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M11.8 2.2l2 2L5.5 12.5 2 14l1.5-3.5z"/><path d="M10.3 3.7l2 2"/></svg>';
function zunSvgTrashBtn(btn){ try{ btn.innerHTML=ZUN_SVG_TRASH; try{ btn.setAttribute("aria-label",btn.title||"apagar"); }catch(e){} }catch(e){ try{ btn.textContent="🗑️"; }catch(e2){} } return btn; }
function zunSvgPencilBtn(btn){ try{ btn.innerHTML=ZUN_SVG_PENCIL; try{ btn.setAttribute("aria-label",btn.title||"editar"); }catch(e){} }catch(e){ try{ btn.textContent="✏️"; }catch(e2){} } return btn; }
/* Sino de notificação em SVG (currentColor: nítido no dia/noite/tema; emoji 🔔
   variava por aparelho e apagava no fundo escuro). Uso: zunSvgBellBtn(btn) /
   zunSvgBellOffBtn(btn). Fallback p/ emoji se innerHTML falhar. */
var ZUN_SVG_BELL='<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M8 2a4 4 0 0 0-4 4v2.6L2.7 10h10.6L12 8.6V6a4 4 0 0 0-4-4z"/><path d="M6.6 12.2a1.5 1.5 0 0 0 2.8 0"/></svg>';
var ZUN_SVG_BELL_OFF='<svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M8 2a4 4 0 0 0-4 4v2.6L2.7 10h10.6L12 8.6V6a4 4 0 0 0-4-4z"/><path d="M6.6 12.2a1.5 1.5 0 0 0 2.8 0"/><path d="M3 3l10 10"/></svg>';
function zunSvgBellBtn(btn){ try{ btn.innerHTML=ZUN_SVG_BELL; try{ btn.setAttribute("aria-label",btn.title||"avisos ligados"); }catch(e){} }catch(e){ try{ btn.textContent="🔔"; }catch(e2){} } return btn; }
function zunSvgBellOffBtn(btn){ try{ btn.innerHTML=ZUN_SVG_BELL_OFF; try{ btn.setAttribute("aria-label",btn.title||"avisos desligados"); }catch(e){} }catch(e){ try{ btn.textContent="🔕"; }catch(e2){} } return btn; }
async function prepUpload(f, maxSide, q, onStage){
  try{
    if(!f) return f;
    if(zunIsSvgFile(f)) throw new Error("svg bloqueado");
    var t = f.type||"";
    if(/^image\//.test(t)) return await shrinkImage(f, maxSide||1024, q||0.82);
    if(/^audio\//.test(t)){ if(onStage) onStage("comprimindo áudio..."); return await compressAudio(f); }
    if(/^video\//.test(t)){ if(onStage) onStage("comprimindo vídeo..."); return await compressVideo(f); }
    if(onStage) onStage("comprimindo arquivo...");
    return await compressGeneric(f);
  }catch(e){ if(e && /svg/i.test(e.message||"")) throw e; }
  return f;
}
/* compressão genérica p/ arquivos regulares (gzip) + limite 10MB comprimido.
   Mídia tem compressor próprio: imagem 30MB, vídeo/áudio 10MB comprimido. */
async function compressGeneric(f){
  try{
    if(!f || f.size<=512000) return f;
    if(typeof CompressionStream==="undefined") return f;
    let t = f.type||"application/octet-stream";
    if(/^image\//.test(t)||/^audio\//.test(t)||/^video\//.test(t)) return f;
    let src = f.stream ? f.stream() : new Blob([await f.arrayBuffer()]).stream();
    let gz = src.pipeThrough(new CompressionStream("gzip"));
    let buf = await new Response(gz).arrayBuffer();
    if(!buf || !buf.byteLength || buf.byteLength>=f.size) return f;
    let orig = (t||"").slice(0,60) || "application/octet-stream";
    let nm = (f.name||"arquivo").slice(0,60);
    let out = new File([buf], nm+".gz", {type:"application/gzip"});
    try{ out._zunGzOrig = orig; out._zunGzName = nm; }catch(e){}
    return out;
  }catch(e){}
  return f;
}
function zunGzMtype(f){
  try{
    if(f && f.type==="application/gzip"){
      let o = f._zunGzOrig || "application/octet-stream";
      return ("gz/"+o).slice(0,100);
    }
  }catch(e){}
  return (f.type||"").slice(0,100);
}
function zunGzOrigOf(mt){
  mt = String(mt||"");
  if(mt.indexOf("gz/")===0) return mt.slice(3).split("|")[0].slice(0,80) || "application/octet-stream";
  return "";
}
const ZUN_MAX_FILE = 104857600;
const ZUN_MAX_FILE_GENERIC = 10485760;
const ZUN_MAX_FILE_IMAGE = 31457280;
const ZUN_MAX_FILE_VIDEO = 10485760;
const ZUN_MAX_FILE_AUDIO = 10485760;
function zunIsMediaFile(f){ try{ var _t=String((f&&f.type)||"").toLowerCase(); return /^image\//.test(_t)||/^audio\//.test(_t)||/^video\//.test(_t); }catch(e){ return false; } }
function zunKindOf(f){ try{ var _t=String((f&&f.type)||"").toLowerCase(); if(/^image\//.test(_t)) return "image"; if(/^video\//.test(_t)) return "video"; if(/^audio\//.test(_t)) return "audio"; return "file"; }catch(e){ return "file"; } }
function zunMaxFor(f){ try{ var _k=zunKindOf(f); if(_k==="image") return ZUN_MAX_FILE_IMAGE; if(_k==="video") return ZUN_MAX_FILE_VIDEO; if(_k==="audio") return ZUN_MAX_FILE_AUDIO; return ZUN_MAX_FILE_GENERIC; }catch(e){ return ZUN_MAX_FILE_GENERIC; } }
function zunLimitMsg(f){ try{ var _k=zunKindOf(f); if(_k==="image") return "arquivo muito grande (máx 30MB)"; return "arquivo muito grande (máx 10MB comprimido)"; }catch(e){ return "arquivo muito grande (máx 10MB comprimido)"; } }
function zunFileTooBig(f){ try{ return f && f.size > zunMaxFor(f); }catch(e){ return false; } }
function feedDataUrlToBlob(d){
  try{
    let m = String(d||"").match(/^data:(image\/(png|jpe?g|gif|webp));base64,([\s\S]+)$/i);
    if(!m) return null;
    let bin = atob(m[3].replace(/\s+/g,""));
    if(!bin || bin.length<100) return null;
    let arr = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], {type:m[1].toLowerCase()});
  }catch(e){ return null; }
}
function feedRawB64ToBlob(s){
  try{
    let clean = String(s||"").replace(/\s+/g,"");
    if(!/^[A-Za-z0-9+/=]+$/.test(clean) || clean.length<2000 || clean.length%4!==0) return null;
    let bin = atob(clean);
    if(!bin || bin.length<100) return null;
    let arr = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], {type:"image/jpeg"});
  }catch(e){ return null; }
}
function normFeedLink(s){
  s = String(s||"").trim();
  if(!s) return "";
  if(/^data:image\//i.test(s)) return s;
  if(/^[A-Za-z0-9+/=\s]+$/.test(s) && s.replace(/\s+/g,"").length>2000 && s.indexOf(".")<0 && s.indexOf(":")<0 && s.indexOf("/")<0) return s;
  if(/^https:\/\//i.test(s)) return s;
  if(/^http:\/\//i.test(s)) return "https://"+s.slice(7);
  if(/^\/\//.test(s)) return "https:"+s;
  return "https://"+s;
}
postBtn.onclick = async ()=>{
  if(postBtn.disabled) return;
  let text = textInput.value.trim(); let f = fileInput.files[0];
  try{ var _pd0 = (typeof zunHasPrivateData==="function") ? zunHasPrivateData(text+" "+String((typeof feedLink!=="undefined"&&feedLink?feedLink.value:"")||"")) : null; if(_pd0){ upEl.textContent = "⛔ "+_pd0+" Apague antes de postar."; return; } }catch(e){}
  let linkUrl = "";
  try{ linkUrl = (typeof feedLink!=="undefined"&&feedLink ? feedLink.value : "").trim(); }catch(e){}
  if(!text && !f && !linkUrl) return;
  let _gw = sendGapOk("feed", 3000);
  if(_gw){ upEl.textContent = "⏳ devagar! aguarde "+_gw+"s"; return; }
  postBtn.disabled = true;
  upEl.textContent = "enviando...";
  let _ot = optTid();
  try{ let _pv = ""; try{ if(f&&f.type&&String(f.type).toLowerCase().indexOf("image/")===0) _pv = URL.createObjectURL(f); }catch(e){} optFeed.push({tid:_ot, n:myKey(), t:text, at:Date.now(), u:_pv, y:(f&&f.type)||"", _blobUrl:_pv||""}); }catch(e){}
  try{ textInput.value = ""; paintFeedOpt(); }catch(e){}
  let url = "", mtype = "", bbytes = 0;
  if(f){ if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ upEl.textContent = "svg bloqueado (use png/jpg/gif/webp)"; optFail(optFeed,_ot); try{ textInput.value = text; }catch(e){} postBtn.disabled = false; sendGapUndo("feed"); return; } try{ f = await prepUpload(f, 1024, 0.82, (s)=>{ upEl.textContent = s; }); }catch(e){ if(/svg/i.test((e&&e.message)||"")){ upEl.textContent = "svg bloqueado (use png/jpg/gif/webp)"; optFail(optFeed,_ot); try{ textInput.value = text; }catch(e){} postBtn.disabled = false; sendGapUndo("feed"); return; } } if(zunFileTooBig(f)){ upEl.textContent = zunLimitMsg(f); optFail(optFeed,_ot); try{ textInput.value = text; }catch(e){} postBtn.disabled = false; sendGapUndo("feed"); return; } upEl.textContent = "enviando..."; let r = await zunUpload(f, {expires:Date.now()+1000*60*60*24*30}); if(r.error){ upEl.textContent = (r.error==="grande"?zunLimitMsg(f):"erro upload"); optFail(optFeed,_ot); try{ textInput.value = text; }catch(e){} postBtn.disabled = false; sendGapUndo("feed"); return; } url = r.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(f):f.type); try{ bbytes = f.size||0; }catch(e){} }
  else if(linkUrl){
    let raw = String(linkUrl).trim();
    let isB64 = /^data:image\//i.test(raw) || (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.replace(/\s+/g,"").length>2000 && raw.indexOf(".")<0 && raw.indexOf(":")<0);
    if(isB64){
      upEl.textContent = "comprimindo imagem...";
      let b = /^data:image\//i.test(raw) ? feedDataUrlToBlob(raw) : feedRawB64ToBlob(raw);
      if(!b){ upEl.textContent = "base64 inválido"; optFail(optFeed,_ot); try{ textInput.value = text; }catch(e){} postBtn.disabled = false; sendGapUndo("feed"); return; }
      let cf = await shrinkImage(new File([b],"foto.jpg",{type:b.type||"image/jpeg"}), 1024, 0.82);
      if(zunFileTooBig(cf)){ upEl.textContent = zunLimitMsg(cf); optFail(optFeed,_ot); try{ textInput.value = text; }catch(e){} postBtn.disabled = false; sendGapUndo("feed"); return; }
      upEl.textContent = "enviando...";
      let r = await zunUpload(cf, {expires:Date.now()+1000*60*60*24*30});
      if(r.error){ upEl.textContent = (r.error==="grande"?zunLimitMsg(cf):"erro upload"); optFail(optFeed,_ot); try{ textInput.value = text; }catch(e){} postBtn.disabled = false; sendGapUndo("feed"); return; }
      url = r.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(cf):cf.type); try{ bbytes = cf.size||0; }catch(e){}
    } else {
      let nu = normFeedLink(raw);
      let compressed = false;
      try{ mtype = guessMime(nu); }catch(e){ mtype = ""; }
      /* Round 4 SSRF: só busca p/ comprimir se a URL passar no validador
         estrito (bloqueia localhost/IP privado e formas numéricas). Sem isso
         colar http://127.0.0.1/x.jpg virava sonda de rede local via
         superFetch (proxy) — agora cai p/ link comum (servidor recusa). */
      let _nuOk = false;
      try{ _nuOk = window.zunOkUrl ? !!window.zunOkUrl(nu, 2000) : !!lOkUrlStrict(nu); }catch(e){ _nuOk = false; }
      if(mtype.indexOf("image")===0 && _nuOk){
        try{
          upEl.textContent = "comprimindo imagem...";
          let rb = await zunFetch(nu).then(r=>r.blob());
          if(rb && /^image\//.test(rb.type||"")){
            let cf2 = await shrinkImage(new File([rb],"foto.jpg",{type:rb.type}), 1024, 0.82);
            if(cf2 && cf2.size>500 && cf2.size<=104857600){
              upEl.textContent = "enviando...";
              let ur = await zunUpload(cf2, {expires:Date.now()+1000*60*60*24*30});
              if(!ur.error && ur.url){ url = ur.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(cf2):cf2.type); compressed = true; try{ bbytes = cf2.size||0; }catch(e){} }
            }
          }
        }catch(e){}
      }
      if(!compressed){ url = nu.slice(0,500); try{ mtype = guessMime(url); }catch(e){ mtype = ""; } }
    }
  }
  try{
    let payload = me ? {nick:me.nick, hash:me.hash, text, url, mtype, bytes:bbytes} : {anon:anonId, anonTok:anonTokGet(anonId), text, url, mtype, bytes:bbytes};
    try{ payload._tid = _ot; }catch(e){}
    let r = JSON.parse(await rpc("feedPush", JSON.stringify(payload)));
    if(r && r.err==="anon-taken" && !me){ try{ renewAnonForce(); payload.anon = anonId; payload.anonTok = anonTokGet(anonId); r = JSON.parse(await rpc("feedPush", JSON.stringify(payload))); }catch(e){} }
    /* outbox r51: sem conexão a fila guardou — mantém o "enviando..." e
       avisa (o drain rejoga e limpa sozinho). Modo local segue normal. */
    if(r && r.queued && !r.local){ upEl.textContent = "sem conexão — na fila, envia sozinho"; postBtn.disabled = false; return; }
    let _em = spamErrText(r);
    if(_em){ optFail(optFeed,_ot); try{ textInput.value = text; }catch(e){} upEl.textContent = _em; return; }
    try{ if(r.anonTok) anonTokSet(anonId, r.anonTok); }catch(e){}
    try{
      if(r.itemTok && r.id) anonItemSet(r.id, r.itemTok);
    }catch(e){}
    textInput.value = ""; fileInput.value = ""; try{ if(typeof feedLink!=="undefined"&&feedLink) feedLink.value = ""; }catch(e){} upEl.textContent = (r && r.queued) ? "modo local — na fila p/ enviar à nuvem" : "postado! deixe a aba aberta com o som ligado — te aviso aqui quando responderem.";
    optForget(optFeed,_ot);
    cInv("feedGet"); loadFeed(true);
  }catch(e){ optFail(optFeed,_ot); try{ textInput.value = text; }catch(_e){} upEl.textContent = "sem servidor"; sendGapUndo("feed"); }
  postBtn.disabled = false;
};
pubBtn.onclick = async ()=>{
  if(!me) return;
  let t = pubInput.value.trim();
  /* zunfun r71: /help é EFÊMERO (só quem chamou vê, nunca envia — nem chega
     no throttle/gap/spam). Limpa o input e mostra o cartão local. */
  try{ if(window.ZunFun && typeof window.ZunFun.isHelp==="function" && window.ZunFun.isHelp(t)){ try{ window.ZunFun.showHelpEphemeral(); }catch(e){} try{ pubInput.value = ""; }catch(e){} return; } }catch(e){}
  /* zunfun r71: /joke /fact /comida via IA (fallback estático se sem IA ou
     falha). Gap checado ANTES p/ não gastar IA à toa; após gerar, devolve o
     gap (a IA demorou) p/ o fluxo normal carimbar de novo. Botão mostra
     progresso animado (generateText pode levar até ~1min). */
  try{
    var _aiCmd = (window.ZunFun && typeof window.ZunFun.aiCommand==="function") ? window.ZunFun.aiCommand(t) : null;
    if(_aiCmd && typeof root!=="undefined" && root.generateText){
      let _gw0 = sendGapOk("chat", 2000);
      if(_gw0){ flashBtn(pubBtn, "⏳ aguarde "+_gw0+"s"); return; }
      var _aiOld = pubBtn.textContent, _aiN = 0, _aiDone = false;
      var _aiIv = setInterval(function(){ try{ if(!_aiDone) pubBtn.textContent = "⏳ gerando"+".".repeat(1+(_aiN++%3)); }catch(e){} }, 400);
      try{ pubBtn.textContent = "⏳ gerando…"; pubBtn.disabled = true; }catch(e){}
      var _aiGen = null;
      try{ _aiGen = await root.generateText(window.ZunFun.aiPrompt(_aiCmd)); }catch(e){ _aiGen = null; }
      _aiDone = true;
      try{ clearInterval(_aiIv); pubBtn.textContent = _aiOld; pubBtn.disabled = false; }catch(e){}
      try{ sendGapUndo("chat"); }catch(e){}
      try{ var _aiT = window.ZunFun.aiWrap(_aiCmd, (typeof _aiGen==="string") ? _aiGen : ((_aiGen&&_aiGen.text)||"")); if(_aiT) t = _aiT; }catch(e){}
    }
  }catch(e){}
  /* zunfun (r67): comandos do chat — expansão antes de tudo (throttle/gap
     continuam valendo; erro mostra e aborta sem enviar). */
  try{ if(window.ZunFun && typeof window.ZunFun.expandPub==="function"){ var _fx = window.ZunFun.expandPub(t); if(_fx){ if(_fx.error){ flashBtn(pubBtn, _fx.error); return; } if(_fx.text) t = String(_fx.text); } } }catch(e){}
  let f = pubFile ? pubFile.files[0] : null;
  try{ var _pd1 = (typeof zunHasPrivateData==="function") ? zunHasPrivateData(t+" "+String((typeof pubLink!=="undefined"&&pubLink?pubLink.value:"")||"")) : null; if(_pd1){ flashBtn(pubBtn, "⛔ "+_pd1); return; } }catch(e){}
  let linkUrl = (pubLink ? pubLink.value : "").trim();
  if(!t && !f && !linkUrl) return;
  let _gw2 = sendGapOk("chat", 2000);
  if(_gw2){ flashBtn(pubBtn, "⏳ aguarde "+_gw2+"s"); return; }
  pubBtn.disabled = true;
  let _ot2 = optTid();
  try{ optPub.push({tid:_ot2, room:(typeof pubRoom!=="undefined"&&pubRoom)||"geral", topic:(typeof pubTopic!=="undefined"&&pubTopic)||null, f:(me&&me.nick)||"?", t:t, at:Date.now(), u:"", y:"", _blobUrl:""}); }catch(e){}
  try{ pubInput.value = ""; paintPubOpt(); }catch(e){}
  let url = "", mtype = "", bbytes = 0;
  try{
    if(f){ if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ flashBtn(pubBtn, "svg bloqueado (use png/jpg)"); optFail(optPub,_ot2); try{ pubInput.value = t; }catch(e){} pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } try{ f = await prepUpload(f, 1024, 0.82); }catch(e){ if(/svg/i.test((e&&e.message)||"")){ flashBtn(pubBtn, "svg bloqueado"); optFail(optPub,_ot2); try{ pubInput.value = t; }catch(e){} pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } } if(zunFileTooBig(f)){ flashBtn(pubBtn, zunLimitMsg(f)); optFail(optPub,_ot2); try{ pubInput.value = t; }catch(e){} pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } let r = await zunUpload(f, {expires:Date.now()+1000*60*60*24*30}); if(r.error){ if(r.error==="grande") flashBtn(pubBtn, zunLimitMsg(f)); optFail(optPub,_ot2); try{ pubInput.value = t; }catch(e){} pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } url = r.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(f):f.type); try{ bbytes = f.size||0; }catch(e){} }
    else if(linkUrl){ if((window.zunOkUrl && !window.zunOkUrl(linkUrl, 500)) || linkUrl.indexOf("https://")!==0){ optFail(optPub,_ot2); try{ pubInput.value = t; }catch(e){} pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); pubLink.focus(); return; } url = linkUrl.slice(0,500); mtype = guessMime(url); }
    try{ let _oo=(optPub||[]).filter(o=>o&&o.tid===_ot2)[0]; if(_oo){ if(url&&String(url).toLowerCase().indexOf("https://")===0){ _oo.u=url; _oo.y=mtype; } else if(f&&f.type&&/^(image|video)\//i.test(f.type)){ try{ _oo._blobUrl=URL.createObjectURL(f); _oo.y=f.type; }catch(e){} } paintPubOpt(); } }catch(e){}
    let pr = {ok:0, err:"?"};
    try{ let pp = {nick:me.nick, hash:me.hash, room:(typeof pubRoom!=="undefined"&&pubRoom)||"geral", text:t, url, mtype, bytes:bbytes, _tid:_ot2}; if(typeof pubTopic!=="undefined"&&pubTopic) pp.topic = pubTopic; pr = JSON.parse(await rpc("roomPush", JSON.stringify(pp))); }catch(e2){}
    /* outbox r51: filado — mantém o "enviando..." (o drain confirma). */
    if(pr && pr.queued && !pr.local){ flashBtn(pubBtn, "na fila — envia sozinho"); pubBtn.disabled = false; paintLocks(); return; }
    let pe = spamErrText(pr);
    if(pe){ optFail(optPub,_ot2); pubInput.value = t; flashBtn(pubBtn, pe); pubBtn.disabled = false; paintLocks(); return; }
    optForget(optPub,_ot2);
    pubInput.value = ""; if(pubFile) pubFile.value = ""; if(pubLink) pubLink.value = "";
    cInv("roomView"); cInv("roomsList"); loadPub(true); try{ if(typeof pubFlipped!=="undefined"&&pubFlipped) loadRooms(); }catch(e3){}
  }catch(e){ try{ optFail(optPub,_ot2); pubInput.value = t; }catch(_e){} }
  pubBtn.disabled = false; paintLocks();
};
privBtn.onclick = async ()=>{
  if(!me) return;
  await joinPrivRoom(privInput.value);
};
try{
  privInviteBtn.onclick = ()=>sendPrivInvite(privInviteNick.value);
  privLockBtn.onclick = ()=>togglePrivLock();
  privAskBtn.onclick = ()=>askPrivAccess();
  privCopyLinkBtn.onclick = async ()=>{
    if(!privRoom){ try{ document.getElementById("privInviteMsg").textContent = "entre num código primeiro."; }catch(e){} return; }
    let link = privInviteLink(privRoom);
    try{ await navigator.clipboard.writeText(link); document.getElementById("privInviteMsg").textContent = "link copiado! "+link; }
    catch(e){ try{ prompt("copie o link do convite:", link); }catch(e2){} }
  };
}catch(e){}
try{ autoJoinPriv(); }catch(e){}
privSendBtn.onclick = async ()=>{
  if(!me || !privRoom) return;
  let t = privMsgInput.value.trim(); let f = privFile ? privFile.files[0] : null;
  let linkUrl = (privLink ? privLink.value : "").trim();
  if(!t && !f && !linkUrl) return;
  let _gw3 = sendGapOk("chat", 2000);
  if(_gw3){ flashBtn(privSendBtn, "⏳ aguarde "+_gw3+"s"); return; }
  privSendBtn.disabled = true;
  let _ot3 = optTid();
  try{ optPriv.push({tid:_ot3, room:privRoom||"", f:(me&&me.nick)||"?", t:t, at:Date.now(), u:"", y:"", _blobUrl:""}); }catch(e){}
  try{ privMsgInput.value = ""; paintPrivOpt(); }catch(e){}
  let url = "", mtype = "", bbytes = 0;
  try{
    if(f){ if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ flashBtn(privSendBtn, "svg bloqueado (use png/jpg)"); optFail(optPriv,_ot3); try{ privMsgInput.value = t; }catch(e){} privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } try{ f = await prepUpload(f, 1024, 0.82); }catch(e){ if(/svg/i.test((e&&e.message)||"")){ flashBtn(privSendBtn, "svg bloqueado"); optFail(optPriv,_ot3); try{ privMsgInput.value = t; }catch(e){} privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } } if(zunFileTooBig(f)){ flashBtn(privSendBtn, zunLimitMsg(f)); optFail(optPriv,_ot3); try{ privMsgInput.value = t; }catch(e){} privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } let r = await zunUpload(f, {expires:Date.now()+1000*60*60*24*30}); if(r.error){ if(r.error==="grande") flashBtn(privSendBtn, zunLimitMsg(f)); optFail(optPriv,_ot3); try{ privMsgInput.value = t; }catch(e){} privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } url = r.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(f):f.type); try{ bbytes = f.size||0; }catch(e){} }
    else if(linkUrl){ if((window.zunOkUrl && !window.zunOkUrl(linkUrl, 500)) || linkUrl.indexOf("https://")!==0){ optFail(optPriv,_ot3); try{ privMsgInput.value = t; }catch(e){} privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); privLink.focus(); return; } url = linkUrl.slice(0,500); mtype = guessMime(url); }
    let et = t, eurl = "";
    /* Round 4: falha na cifra ABORTA (antes caía p/ plaintext). */
    try{ if(t || url){ let b = await privEncV2(privRoom, t, url); et = b; eurl = ""; } }catch(e){ optFail(optPriv,_ot3); try{ privMsgInput.value = t; }catch(_e){} flashBtn(privSendBtn, "falha na cifra — não enviado"); privSendBtn.disabled = false; paintLocks(); return; }
    try{ let _ov=(optPriv||[]).filter(o=>o&&o.tid===_ot3)[0]; if(_ov){ if(f&&f.type&&/^(image|video)\//i.test(f.type)){ try{ _ov._blobUrl=URL.createObjectURL(f); _ov.y=f.type; }catch(e){} } paintPrivOpt(); } }catch(e){}
    let vr = {ok:0, err:"?"};
    try{ vr = JSON.parse(await rpc("privPush", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom, text:et, url:eurl, mtype, bytes:bbytes, _tid:_ot3}))); }catch(e2){}
    /* outbox r51: filado — mantém o "enviando..." (o drain confirma). */
    if(vr && vr.queued && !vr.local){ flashBtn(privSendBtn, "na fila — envia sozinho"); privSendBtn.disabled = false; paintLocks(); return; }
    if(vr && vr.err==="fraca"){
      let sug = String(vr.ex||privGenStrong(privRoom));
      privSayRoom("🔐 sala nova precisa de código forte (anti-clone). Sugestão: "+sug);
      try{ privInput.value = sug; }catch(e2){}
      try{ paintPrivStrength(); }catch(e3){}
      if(confirm("Sala nova precisa de código forte anti-clone.\n\nUsar: "+sug+" ?")){ optFail(optPriv,_ot3); try{ privMsgInput.value = t; }catch(e){} privSendBtn.disabled = false; paintLocks(); await joinPrivRoom(sug, {retried:true}); return; }
    }
    let ve = spamErrText(vr);
    if(ve){ optFail(optPriv,_ot3); privMsgInput.value = t; flashBtn(privSendBtn, ve); privSendBtn.disabled = false; paintLocks(); return; }
    optForget(optPriv,_ot3);
    privMsgInput.value = ""; if(privFile) privFile.value = ""; if(privLink) privLink.value = "";
    cInv("privGet"); loadPriv(true);
  }catch(e){ try{ optFail(optPriv,_ot3); privMsgInput.value = t; }catch(_e){} }
  privSendBtn.disabled = false; paintLocks();
};
pubMentionSel.onchange = ()=>{ if(!pubMentionSel.value) return; pubInput.value += (pubInput.value && !/\s$/.test(pubInput.value) ? " " : "") + "@"+pubMentionSel.value+" "; pubMentionSel.value = ""; pubInput.focus(); };
pubB.onclick = ()=>wrapIn(pubInput, "[b]", "[/b]");
pubI.onclick = ()=>wrapIn(pubInput, "[i]", "[/i]");
pubU.onclick = ()=>wrapIn(pubInput, "[u]", "[/u]");
pubS.onclick = ()=>wrapIn(pubInput, "[s]", "[/s]");
pubC.onclick = ()=>wrapIn(pubInput, "[c="+pubColor.value+"]", "[/c]");
privB.onclick = ()=>wrapIn(privMsgInput, "[b]", "[/b]");
privI.onclick = ()=>wrapIn(privMsgInput, "[i]", "[/i]");
privU.onclick = ()=>wrapIn(privMsgInput, "[u]", "[/u]");
privS.onclick = ()=>wrapIn(privMsgInput, "[s]", "[/s]");
privC.onclick = ()=>wrapIn(privMsgInput, "[c="+privColor.value+"]", "[/c]");
/* URL do perfil: o link canônico é ?perfil=nick. Abrir perfil por clique
   NUNCA toca na URL (senão todo reload reabre o modal). Só o boot lê
   ?perfil= uma vez p/ deep-link. Fechar limpa ?perfil= e o hash legado
   #perfil- (jeito antigo), preservando os demais params. */
function zunClearPerfilUrl(){
  try{
    let h = String(location.hash||"");
    let hasLegacy = /perfil-@?([A-Za-z0-9-_]{2,20})/.test(h);
    let q = null;
    try{ q = new URLSearchParams(location.search); }catch(e){ q = null; }
    let hasQ = !!(q && q.get("perfil"));
    if(!hasLegacy && !hasQ) return;
    if(q && hasQ) q.delete("perfil");
    let qs = (q && String(q.toString())) ? ("?"+q.toString()) : "";
    history.replaceState(null, "", location.pathname+qs);
  }catch(e){}
}
function closeProfile(){
  profModal.hidden = true;
  try{ zunClearPerfilUrl(); }catch(e){}
}
profCloseBtn.onclick = ()=>closeProfile();
profModal.addEventListener("click", (e)=>{ if(e.target===profModal) closeProfile(); });
profMentionBtn.onclick = ()=>{
  if(!profSel) return;
  pubInput.value += (pubInput.value && !/\s$/.test(pubInput.value) ? " " : "") + "@"+profSel+" ";
  closeProfile(); pubInput.focus();
};
function paintProfMod(){
  try{
    /* sino em SVG + texto traduzível (antes emoji 🔔/🔕 apagava no night).
       Pinta sempre (até p/ si mesmo, que fica hidden) p/ o HTML estático
       "🔕 silenciar" não ficar em emoji. */
    try{
      var _mut = false;
      try{ _mut = zunMuted(profSel); }catch(e){}
      profMuteBtn.innerHTML = "";
      var _ic = document.createElement("span"); _ic.setAttribute("aria-hidden","true");
      try{ if(_mut){ if(typeof zunSvgBellBtn==="function") zunSvgBellBtn(_ic); else _ic.textContent = "🔔"; } else { if(typeof zunSvgBellOffBtn==="function") zunSvgBellOffBtn(_ic); else _ic.textContent = "🔕"; } }catch(e){ _ic.textContent = _mut ? "🔔" : "🔕"; }
      profMuteBtn.appendChild(_ic);
      profMuteBtn.appendChild(document.createTextNode(" "+ztr(_mut ? "ativar" : "silenciar")));
    }catch(e){ profMuteBtn.textContent = zunMuted(profSel) ? ztr("🔔 ativar") : ztr("🔕 silenciar"); }
    if(!me || !profSel || String(profSel).toLowerCase()===String(me.nick).toLowerCase()){ profMuteBtn.hidden = true; profBlockBtn.hidden = true; return; }
    profMuteBtn.hidden = false; profBlockBtn.hidden = false;
    profBlockBtn.textContent = zunBlocked(profSel) ? ztr("desbloquear") : ztr("bloquear");
  }catch(e){}
}
/* boot: converte o sino estático do modal (index.html traz "🔕 silenciar" em
   emoji) p/ SVG na hora, sem esperar abrir perfil. paintProfMod já pinta, mas
   só é chamada com perfil aberto; aqui só troca o ícone. */
try{
  setTimeout(function(){
    try{
      var _pm = document.getElementById("profMuteBtn");
      if(_pm && !_pm.querySelector("svg")){
        var _txt = "";
        try{ _txt = String(_pm.textContent||""); }catch(e){}
        var _isAct = /ativar|unmute|activar/i.test(_txt);
        _pm.innerHTML = "";
        var _s = document.createElement("span"); _s.setAttribute("aria-hidden","true");
        try{ if(_isAct){ if(typeof zunSvgBellBtn==="function") zunSvgBellBtn(_s); else _s.textContent = "🔔"; } else { if(typeof zunSvgBellOffBtn==="function") zunSvgBellOffBtn(_s); else _s.textContent = "🔕"; } }catch(e){ _s.textContent = _isAct ? "🔔" : "🔕"; }
        _pm.appendChild(_s);
        _pm.appendChild(document.createTextNode(" "+(_isAct ? ztr("ativar") : ztr("silenciar"))));
      }
    }catch(e){}
  }, 800);
}catch(e){}
try{
  profMuteBtn.onclick = ()=>{ if(!me || !profSel) return; toggleZunList("zunzumMuteList", profSel); paintProfMod(); };
  profBlockBtn.onclick = ()=>{ if(!me || !profSel) return; toggleZunList("zunzumBlockList", profSel); paintProfMod(); loadFeed(); loadPub(); loadPriv(); };
}catch(e){}
try{
  profInviteBtn.onclick = async ()=>{
    if(!profSel) return;
    if(!me){ profStats.textContent = ztr("entre com nick+senha para convidar."); return; }
    if(!privRoom){ profStats.textContent = ztr("entre num código do privado primeiro, depois convide @"+profSel+"."); return; }
    profModal.hidden = true;
    try{ zunClearPerfilUrl(); }catch(e){}
    try{ privInviteNick.value = profSel; }catch(e){}
    await sendPrivInvite(profSel);
  };
}catch(e){}
function perfilSlug(nick){ return String(nick||"").toLowerCase().replace(/[^a-z0-9-]+/g,"").replace(/^-+|-+$/g,"").slice(0,20); }
function perfilLink(nick){ try{ var b=(window.zunBaseUrl?window.zunBaseUrl():"https://perchance.org/"+(window.generatorName||"zunzum")); return b+"?perfil="+perfilSlug(nick); }catch(e){ return "?perfil="+perfilSlug(nick); } }
var PERFIL_REPUB_MS = 30*24*3600*1000;
/* editKey do cartão público: o servidor guarda OPACO. Aqui ciframos com chave
   derivada do hash do app (que nunca está no banco) — vazamento do banco não
   entrega escrita nos cartões. Formato "ENC1:<b64iv>:<b64ct>"; legado em hex
   puro continua lendo (compat). */
async function pkeyEnc(cred, editKey){
  try{
    let b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("zunzum-pkey-v1:"+String(cred||"")));
    let k = await crypto.subtle.importKey("raw", b, "AES-GCM", false, ["encrypt"]);
    let iv = crypto.getRandomValues(new Uint8Array(12));
    let ct = await crypto.subtle.encrypt({name:"AES-GCM", iv:iv}, k, new TextEncoder().encode(String(editKey||"")));
    return "ENC1:"+b64e(iv)+":"+b64e(ct);
  }catch(e){ return ""; }
}
async function pkeyDec(cred, blob){
  try{
    blob = String(blob||"");
    if(blob.indexOf("ENC1:")!==0) return (/^[0-9a-f]{1,300}$/i.test(blob) ? blob : "");
    let p = blob.split(":");
    if(p.length<3) return "";
    let b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("zunzum-pkey-v1:"+String(cred||"")));
    let k = await crypto.subtle.importKey("raw", b, "AES-GCM", false, ["decrypt"]);
    let pt = await crypto.subtle.decrypt({name:"AES-GCM", iv:new Uint8Array(b64d(p[1]))}, k, b64d(p.slice(2).join(":")));
    let s = new TextDecoder().decode(pt);
    return /^[0-9a-f]{1,300}$/i.test(s) ? s : "";
  }catch(e){ return ""; }
}
async function publishPerfilAuto(nick){
  try{
    let slug = perfilSlug(nick);
    if(slug.length<2) return;
    let flag = "zunzumPerfilPub:"+slug;
    let last = 0; try{ last = parseInt(localStorage.getItem(flag)||"0")||0; }catch(e){}
    if(Date.now()-last < PERFIL_REPUB_MS) return;
    let pr = JSON.parse(await crpc("profileGet", nick));
    if(!pr.ok) return;
    let data = {nick:nick, avatar:pr.avatar||"", desc:"@"+nick+" no zunzum: "+pr.posts+" posts · "+pr.likes+" curtidas · "+pr.pub+" msgs no chat · membro desde "+(pr.created?new Date(pr.created).toLocaleDateString():"?"), updated:Date.now()};
    let key = null; try{ key = sessionStorage.getItem("zunzumPerfilKey:"+slug) || localStorage.getItem("zunzumPerfilKey:"+slug); if(key && sessionStorage.getItem("zunzumPerfilKey:"+slug)!==key){ try{ sessionStorage.setItem("zunzumPerfilKey:"+slug, key); }catch(_e){} try{ localStorage.removeItem("zunzumPerfilKey:"+slug); }catch(_e2){} } }catch(e){}
    if(!key && me && me.hash){
      try{
        let gr = JSON.parse(await crpc("pkeyGet", JSON.stringify({nick:me.nick, hash:me.hash})));
        if(gr.ok && gr.blob) key = await pkeyDec(me.hash, gr.blob);
      }catch(e){}
    }
    let res = await root.uploadPlugin.editable.set("zunzum-perfil-"+slug, JSON.stringify(data), key?{editKey:key}:undefined);
    if(res && res.error) return;
    /* first-writer-wins: se o nome já tem dono e não temos a chave, NÃO carimbar
       (antes aceitava o superseded em silêncio e o cartão de terceiro ficava
       pra sempre). Retenta na próxima janela + avisa no console. */
    if(res && res.superseded && !key){ try{ console.warn("[perfil] cartão ocupado por terceiros, retentando depois"); }catch(_e){} return; }
    if(res && res.editKey){
      /* editKey = senha de escrita do cartão público: sessionStorage (aba),
         não localStorage — XSS persistente não pode carregar para sempre.
         O backup autenticado fica no servidor (pkeyPut/pkeyGet). */
      try{ sessionStorage.setItem("zunzumPerfilKey:"+slug, res.editKey); }catch(e){}
      try{ localStorage.removeItem("zunzumPerfilKey:"+slug); }catch(_e){}
      try{ if(me && me.hash){ let eb = await pkeyEnc(me.hash, res.editKey); if(eb) crpc("pkeyPut", JSON.stringify({nick:me.nick, hash:me.hash, blob:eb})).catch(()=>{}); } }catch(e){}
    }
    try{ localStorage.setItem(flag, String(Date.now())); }catch(e){}
  }catch(e){}
}
function autoPublishMe(){ if(!me) return; try{ publishPerfilAuto(me.nick).catch(()=>{}); }catch(e){} }
profShareBtn.onclick = async ()=>{
  if(!profSel) return;
  let link = perfilLink(profSel);
  try{ await navigator.clipboard.writeText(link); profStats.textContent = ztr("link copiado! ")+link; }
  catch(e){ try{ prompt(ztr("copie o link do perfil:"), link); }catch(e2){} }
};
avatarEl.style.cursor = "pointer"; avatarEl.title = "ver meu perfil";
avatarEl.onclick = ()=>{ if(me) openProfile(me.nick); };
if(me && me.avatar===undefined){ me.avatar = ""; try{ setSession(me); }catch(e){} }
/* Área do dono: o painel NÃO mora no src/ público — fica SÓ no PC do dono
   (arquivo dono.js anexado no chat). Aqui é só o porteiro + entrada:
   após login, pergunta ao servidor se a conta é a dona (kkk); se sim,
   mostra o botão "carregar dono.js do PC", que lê o arquivo LOCAL
   (FileReader, nada é enviado) e ativa só nesta sessão. Visitantes e
   contas comuns nunca veem nada. A posse é do servidor
   (site_config.owner_nick + claim_owner). + formulário PÚBLICO de
   sugestões (qualquer um pode enviar). */
window._isOwner = false;
function isOwner(){ return !!window._isOwner; }
function ownerAuth(){ return (typeof me!=="undefined" && me) ? {nick:me.nick, hash:me.hash} : null; }
async function ensureDono(){
  try{
    if(window.__donoReady){
      try{
        if(typeof window.donoBoot === "function") await window.donoBoot();
        else if(!document.getElementById("donoEntry")) buildDonoEntry();
      }catch(e){}
      return !!window._isOwner;
    }
    if(window.__donoLoading) return window.__donoLoading;
    if(typeof me==="undefined" || !me) return false;
    window.__donoLoading = (async ()=>{
      try{
        let probe = null;
        try{ probe = JSON.parse(await rpc("sugGet", JSON.stringify(ownerAuth()))); }catch(e){ probe = null; }
        if(Array.isArray(probe)){
          try{ buildDonoEntry(); }catch(e){}
          window.__donoReady = true;
          window.__donoRetryN = 0;
          /* painel hardcoded r56: dono confirmado pelo SERVIDOR (array) → mostra
             a caixa de entrada e pinta. Não-dono recebe {ok:0} → segue escondido. */
          try{ window.__sugOwnerOk = true; var _sp = document.getElementById("sugPanel"); if(_sp) _sp.hidden = false; if(typeof paintSug==="function") paintSug(probe); }catch(e){}
        } else if(typeof me!=="undefined" && me && !window.__donoReady){
          // sessão do Supabase pode restaurar depois do boot: tenta de novo
          window.__donoRetryN = (window.__donoRetryN||0)+1;
          if(window.__donoRetryN < 8) setTimeout(()=>{ try{ ensureDono(); }catch(e){} }, 5000);
        }
      }catch(e){}
      window.__donoLoading = null;
      return !!window._isOwner;
    })();
    return window.__donoLoading;
  }catch(e){ return false; }
}
function buildDonoEntry(){
  try{
    if(document.getElementById("donoEntry")) return;
    let box = document.getElementById("ownerBox"); if(!box) return;
    let d = document.createElement("div");
    d.id = "donoEntry";
    d.style.cssText = "margin:8px 0;padding:8px;border:1px dashed #b6c9db;border-radius:8px;background:#fbfdff";
    d.innerHTML = "<b>área do dono</b> <span class='meta'>conta dona confirmada ✅</span><br>"
      + "<label style='font-size:12px'>carregar dono.js do PC: <input type='file' id='donoFile' accept='.js,.txt'></label> "
      + "<span id='donoEntryMsg' class='meta'></span>";
    box.appendChild(d);
    document.getElementById("donoFile").onchange = donoFilePicked;
  }catch(e){}
}
function donoFilePicked(ev){
  try{
    let msg = document.getElementById("donoEntryMsg");
    let f = ev && ev.target && ev.target.files && ev.target.files[0];
    if(!f){ if(msg) msg.textContent = ""; return; }
    let rd = new FileReader();
    rd.onload = function(){
      try{
        let code = String(rd.result||"");
        if(code.length < 500 || code.indexOf("donoBoot")<0 || code.indexOf("donoUnload")<0){ if(msg) msg.textContent = "arquivo inválido (não é o dono.js)"; return; }
        if(msg) msg.textContent = "ativando...";
        let url = URL.createObjectURL(new Blob([code], {type:"text/javascript"}));
        let s = document.createElement("script");
        s.onload = function(){ try{ URL.revokeObjectURL(url); }catch(e){} window.__donoReady = true; try{ window.donoBoot(); }catch(e){} if(msg) msg.textContent = "painel ativo ✅ (só nesta sessão)"; };
        s.onerror = function(){ if(msg) msg.textContent = "falha ao carregar"; };
        s.textContent = ""; s.src = url;
        document.head.appendChild(s);
      }catch(e){ if(msg) msg.textContent = "falha ao ler"; }
    };
    rd.onerror = function(){ if(msg) msg.textContent = "falha ao ler"; };
    rd.readAsText(f);
  }catch(e){}
}
sugBtn.onclick = async ()=>{
  let t = sugText.value.trim(); if(!t) return;
  try{
    let r = JSON.parse(await rpc("sugPush", JSON.stringify(Object.assign(likePayload("x"), {kind:sugKind.value, text:t}))));
    if(r && r.err==="anon-taken" && !me){ try{ renewAnonForce(); r = JSON.parse(await rpc("sugPush", JSON.stringify(Object.assign(likePayload("x"), {kind:sugKind.value, text:t})))); }catch(e){} }
    try{ if(r && r.anonTok) anonTokSet(myKey(), r.anonTok); }catch(e){}
    if(r.ok){ sugMsg.textContent = "recebido, valeu!"; sugText.value = ""; try{ if(window.__sugOwnerOk && typeof sugPanelRefresh==="function") sugPanelRefresh(); }catch(e){} }
    else sugMsg.textContent = spamErrText(r)||"erro";
  }catch(e){ sugMsg.textContent = "sem conexao"; }
};

/* ===== PAINEL HARDCODED sugestões+bugs (r56, só dono) =====
   O gate é o SERVIDOR: sugGet só devolve array p/ conta dona (sb3 isOwner);
   qualquer outro recebe {ok:0} e o painel segue escondido (hidden).
   Render só com createElement/textContent — dado do banco nunca vira HTML. */
var __sugCache = [];
window.__sugOwnerOk = !!window.__sugOwnerOk;
/* traduz o cromo DENTRO de #sugList: a autocura (trTree) pula essa área de
   propósito (conteúdo do usuário não se traduz), então o cromo traduz aqui. */
function sugTr(s){ try{ if(typeof window!=="undefined" && typeof window.zunzumTr==="function") return window.zunzumTr(s); }catch(e){} return s; }
function sugLoc(){ try{ if(typeof window!=="undefined"){ if(window.zunzumEN) return "en-US"; if(window.zunzumES) return "es-ES"; } }catch(e){} return "pt-BR"; }
function paintSug(list){
  try{
    var panel = document.getElementById("sugPanel");
    var box = document.getElementById("sugList");
    var cnt = document.getElementById("sugCount");
    var pmsg = document.getElementById("sugPanelMsg");
    if(typeof me==="undefined" || !me){ window.__sugOwnerOk = false; __sugCache = []; if(panel) panel.hidden = true; if(box) box.textContent = ""; return; }
    if(!Array.isArray(list)) list = [];
    __sugCache = list;
    var f = "";
    try{ var fs = document.getElementById("sugFilter"); if(fs) f = String(fs.value||""); }catch(e){}
    if(box) box.textContent = "";
    var shown = 0;
    list.forEach(function(x){
      var k = (x && x.k === "bug") ? "bug" : ((x && x.k === "denuncia") ? "denuncia" : "ideia");
      if(f && k !== f) return;
      shown++;
      var d = document.createElement("div");
      d.className = "post sugItem"; /* post=estrutura; sugItem=cores por tema (style) */
      var head = document.createElement("div");
      head.style.cssText = "display:flex;gap:6px;align-items:center;flex-wrap:wrap";
      var badge = document.createElement("b");
      badge.textContent = (k==="denuncia") ? "🚨 denúncia" : sugTr(k === "bug" ? "🐞 bug" : "💡 ideia");
      head.appendChild(badge);
      var meta = document.createElement("span");
      meta.className = "meta";
      var dt = "";
      try{ if(x && x.at) dt = new Date(x.at).toLocaleString(sugLoc()); }catch(e){}
      meta.textContent = String((x && x.n) || "?") + (dt ? " · " + dt : "");
      head.appendChild(meta);
      var del = document.createElement("button");
      del.type = "button"; del.textContent = sugTr("apagar"); del.style.marginLeft = "auto";
      (function(id, btn){
        btn.onclick = function(){
          zunBusy(btn, true, "⏳...");
          rpc("sugDel", JSON.stringify(Object.assign(ownerAuth(), {id:id}))).then(function(rr){
            var j = null; try{ j = JSON.parse(rr); }catch(e){}
            if(!(j && j.ok) && pmsg) pmsg.textContent = sugTr("falha ao apagar");
            return sugPanelRefresh();
          }).catch(function(){ if(pmsg) pmsg.textContent = sugTr("sem conexao"); zunBusy(btn, false); });
        };
      })(String((x && x.id) || ""), del);
      head.appendChild(del);
      d.appendChild(head);
      var body = document.createElement("div");
      body.style.cssText = "margin-top:4px;white-space:pre-wrap;word-break:break-word;font-size:13px";
      body.textContent = String((x && x.t) || "");
      d.appendChild(body);
      if(box) box.appendChild(d);
    });
    if(cnt) cnt.textContent = "· " + shown + "/" + list.length;
    if(pmsg && !list.length) pmsg.textContent = sugTr("vazio — nada por aqui 🐝");
    else if(pmsg) pmsg.textContent = "";
  }catch(e){}
}
async function sugPanelRefresh(){
  try{
    if(typeof me==="undefined" || !me) return;
    var pmsg = document.getElementById("sugPanelMsg");
    if(pmsg) pmsg.textContent = sugTr("carregando...");
    var j = null;
    try{ j = JSON.parse(await rpc("sugGet", JSON.stringify(ownerAuth()))); }catch(e){ j = null; }
    if(!Array.isArray(j)){ window.__sugOwnerOk = false; var p0 = document.getElementById("sugPanel"); if(p0) p0.hidden = true; return; }
    window.__sugOwnerOk = true;
    var p1 = document.getElementById("sugPanel"); if(p1) p1.hidden = false;
    paintSug(j);
  }catch(e){}
}
try{
  var _sugFilter = document.getElementById("sugFilter");
  if(_sugFilter && !_sugFilter._w){ _sugFilter._w = true; _sugFilter.onchange = function(){ try{ paintSug(__sugCache); }catch(e){} }; }
  var _sugRefresh = document.getElementById("sugRefresh");
  if(_sugRefresh && !_sugRefresh._w){ _sugRefresh._w = true; _sugRefresh.onclick = function(){ try{ sugPanelRefresh(); }catch(e){} }; }
  var _sugClear = document.getElementById("sugClear");
  /* dois cliques (sem confirm() nativo): 1º arma, 2º apaga tudo. */
  if(_sugClear && !_sugClear._w){ _sugClear._w = true; _sugClear.onclick = function(){
    try{
      var b = _sugClear;
      if(b.dataset.armed === "1"){
        delete b.dataset.armed; b.textContent = sugTr("limpar tudo");
        var pmsg = document.getElementById("sugPanelMsg"); if(pmsg) pmsg.textContent = sugTr("apagando...");
        rpc("sugDel", JSON.stringify(Object.assign(ownerAuth(), {clear:1}))).then(function(){ return sugPanelRefresh(); }).catch(function(){ if(pmsg) pmsg.textContent = sugTr("sem conexao"); });
      } else {
        b.dataset.armed = "1"; b.textContent = sugTr("confirma? clique de novo");
        setTimeout(function(){ try{ delete b.dataset.armed; b.textContent = sugTr("limpar tudo"); }catch(e){} }, 4000);
      }
    }catch(e){}
  }; }
}catch(e){}
paintMe(); paintLocks(); try{ if(window.__zunBoot) window.__zunBoot(0.55,"feed"); }catch(e){} try{ loadRooms(); }catch(e){} try{ autoJoinRoom(); }catch(e){}
var _zbFeed = null; try{ _zbFeed = loadFeed(); }catch(e){}
try{ if(_zbFeed && _zbFeed.then){ _zbFeed.then(function(){ try{ if(window.__zunBootDone) window.__zunBootDone(); }catch(e){} }, function(){ try{ if(window.__zunBootDone) window.__zunBootDone(); }catch(e){} }); } else if(window.__zunBootDone){ window.__zunBootDone(); } }catch(e){}
try{ ensureDono(); }catch(e){}
var CLI_BUILD = 42;
// B4 — "o que mudou" 1x por versão (padrão bestaigen U<n>/What's New):
// quando o visitante VOLTA e o build mudou, mostra 1x o que há de novo.
// Visitante novo nunca vê (só grava). Texto 100% estático, via textContent.
// ROTINA DE SAVE: bump CLI_BUILD + servidor juntos e trocar ZUN_NEW_TEXT
// por 1 frase do que mudou (ver src/DIVULGACAO.md, rotina).
var ZUN_NEW_TEXT = "⚡ loading da abelhinha que muda de cor até vestir o tema (dia/noite/festa) + 🌱 modo economia em dados móveis";
try{
  var _seenB = 0;
  try{ _seenB = parseInt(localStorage.getItem("zunzumSeenBuild")||"0",10)||0; }catch(e){}
  if(!_seenB){ try{ localStorage.setItem("zunzumSeenBuild", String(CLI_BUILD)); }catch(e){} }
  else if(_seenB < CLI_BUILD && ZUN_NEW_TEXT){
    try{ localStorage.setItem("zunzumSeenBuild", String(CLI_BUILD)); }catch(e){}
    (function(){
      var d = document.createElement("div");
      d.id = "zzWhatsNew";
      d.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:9500;max-width:300px;background:#fffbe6;border:2px solid #ffb300;border-radius:10px;padding:10px 12px;font-size:13px;color:#3d2e00;box-shadow:0 2px 10px rgba(0,0,0,.2);text-align:left";
      var b = document.createElement("button");
      b.textContent = "x"; b.title = "fechar";
      b.style.cssText = "float:right;margin-left:8px";
      b.onclick = function(){ try{ d.remove(); }catch(e){} };
      var t = document.createElement("b"); t.textContent = "🆕 o que mudou";
      var p = document.createElement("div"); p.style.marginTop = "4px"; p.textContent = ZUN_NEW_TEXT;
      d.appendChild(b); d.appendChild(t); d.appendChild(p);
      document.body.appendChild(d);
      setTimeout(function(){ try{ d.remove(); }catch(e){} }, 30000);
    })();
  }
}catch(e){}
setInterval(async ()=>{
  try{
    try{ if(window.__ecoSkip&&window.__ecoSkip("cliver",2,5,10)) return; }catch(e){} // ECO: versão nova espera mais
    try{ if(typeof zunNetRefresh==="function") zunNetRefresh(); }catch(e){} // banner (bonto abre/fecha sozinho)
    try{ if(typeof zunOutboxDrain==="function" && typeof connected!=="undefined" && connected && typeof localMode!=="undefined" && !localMode && typeof zunOutCount==="function" && zunOutCount()>0) zunOutboxDrain(); }catch(e){} // outbox r52: backstop do drain
    if(typeof localMode!=="undefined" && localMode) return;
    let v = JSON.parse(await rpc("cliVer",""));
    if(v && v.ok && (v.v|0) > CLI_BUILD){
      try{ setNet("nova versão — atualizando..."); }catch(e){}
      setTimeout(()=>{ try{ location.reload(); }catch(e){} }, 1500);
    }
    if(v && v.ok && v.mig) MIG_FLAG = 1;
    if(MIG_FLAG && typeof me!=="undefined" && me && me.nick && !migDone(me.nick)){
      try{ pendingMigNick = me.nick; await doLogout(); showMigPanel(); }catch(e2){}
    }
  }catch(e){}
}, 60000);
setTimeout(()=>{ try{ migBoot(); }catch(e){} }, 4000);
var lastFeedAt = 0;
function aiHistGet(){ try{ let a = JSON.parse(localStorage.getItem("orkutAiHist")||"[]"); return Array.isArray(a)?a.filter(s=>typeof s==="string").slice(0,20):[]; }catch(e){ return []; } }
function aiHistPush(t){ try{ let a = aiHistGet(); a.unshift(String(t||"").slice(0,180)); localStorage.setItem("orkutAiHist", JSON.stringify(a.slice(0,20))); }catch(e){} }
function aiNorm(s){ return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim(); }
function aiSimilar(a, b){
  let wa = new Set(aiNorm(a).split(" ").filter(w=>w.length>2)), wb = new Set(aiNorm(b).split(" ").filter(w=>w.length>2));
  if(!wa.size || !wb.size) return 0;
  let inter = 0; wa.forEach(w=>{ if(wb.has(w)) inter++; });
  return inter/Math.max(wa.size, wb.size);
}
async function aiTick(){
  return; /* BOT DO FEED DESLIGADO (pedido do dono 2026-11-06): sem posts novos do 🤖Zunzim·IA. Reverter = apagar este return. */
  try{
    try{ if(typeof localMode!=="undefined" && localMode) return; }catch(e){} // modo local (2026-10-30): sem gastar quota de IA p/ postar só-neste-navegador
    if(Date.now() - (lastFeedAt||0) < 10800000) return; // tenta a cada 5min, mas só posta a cada 3h
    /* mascote oficial: o servidor agora exige a CONTA do dono no claim/feed
       (antes qualquer visitante forjava 🤖Zunzim·IA). Sem login do dono o tick
       só retorna ok:0 e ignora em silêncio. */
    let _am = null;
    try{ if(typeof me!=="undefined" && me && me.nick && me.hash) _am = {nick:me.nick, hash:me.hash}; }catch(e){}
    if(!_am) return;
    let c = JSON.parse(await rpc("aiClaim", JSON.stringify(_am)));
    if(!c.ok || !c.token) return;
    try{ if(window.ZunAiQuota && !window.ZunAiQuota.tryTake("text")) return; }catch(_q){}
    let h = new Date().getHours();
    let turno = h<6 ? "madrugada" : (h<12 ? "manhã" : (h<18 ? "tarde" : "noite"));
    let feed = [];
    try{ feed = JSON.parse(await crpc("feedGet","")).slice(-15).map(p=>String(p.t||"").slice(0,120)); }catch(e){}
    let recent = aiHistGet().concat(feed.filter(t=>t)).slice(0,20);
    let seen = "sem histórico";
    if(recent.length) seen = recent.map((t,i)=>(i+1)+". "+t).join("\n");
    let base = "Você é o Zunzim, mascote da rede social anônima zunzum (Brasil). Agora é de "+turno+". Tom leve e amigável, português informal.\nPOSTS RECENTES (não repita tema nem frases):\n"+seen;
    let plan = null;
    for(let att=0; att<2 && !plan; att++){
      try{
        let pr = String(await zunText({instruction:base+"\nTAREFA: planeje o próximo post. Escolha UM tema e UM formato, priorizando DESABAFO ou CONSELHO (2 em cada 3 posts): desabafo = história curta em 1ª pessoa de um anônimo (amor, trabalho, família, saudade, ansiedade, grana, solidão) terminando com pedido de opinião/apoio; conselho = dilema concreto perguntando o que fariam no lugar. Enquete, curiosidade e bom dia/boa noite só 1 em cada 3. Tudo DIFERENTE dos recentes. Responda SÓ JSON: {\"tema\":\"...\", \"formato\":\"...\", \"ideia\":\"...\"}"+(att? " NÃO use: "+recent.slice(0,5).join(" | "):"")})||"");
        let p1 = pr.indexOf("{"), p2 = pr.lastIndexOf("}");
        if(p1>=0 && p2>p1){ let pj = JSON.parse(pr.slice(p1,p2+1)); if(pj.tema && pj.formato) plan = pj; }
      }catch(e){}
    }
    if(!plan) return;
    let txt = "";
    for(let att=0; att<2 && !txt; att++){
      try{
        let fin = String(await zunText({instruction:base+"\nPLANO: tema="+plan.tema+", formato="+plan.formato+", ideia="+(plan.ideia||"")+"\nTAREFA EM 2 PASSOS:\n1) PENSE: este plano parece com algum post recente? Se sim, mude o ângulo.\n2) ESCREVA: um post de até 260 caracteres, no máximo 1 emoji, sem hashtags/links, sem pedir dados pessoais. Se for desabafo/conselho, escreva como o próprio anônimo e termine pedindo opinião ou apoio. Responda SÓ com o texto do post."+(att?" MUDE o ângulo, está parecido demais.":"")})||"").trim().slice(0,300);
        if(!fin) continue;
        let dup = recent.some(t=>aiSimilar(fin, t)>0.55);
        if(dup) continue;
        txt = fin;
      }catch(e){}
    }
    if(!txt) return;
    let r = JSON.parse(await rpc("aiFeed", JSON.stringify({nick:_am.nick, hash:_am.hash, token:c.token, text:txt})));
    if(r.ok){ aiHistPush(txt); cInv("feedGet"); loadFeed(true); }
  }catch(e){}
}
setInterval(aiTick, 300000);
setTimeout(aiTick, 60000);
setInterval(()=>{ if(document.hidden) return; try{ if(window.__ecoSkip&&window.__ecoSkip("feed",2,5,10)) return; }catch(e){} try{ if(window.__saverSkip&&window.__saverSkip("feed",3)) return; }catch(e){} try{ let a = document.activeElement; if(a && feedCtn.contains(a) && /INPUT|TEXTAREA/.test(a.tagName)) return; }catch(e){} loadFeed(); loadPresence(); checkPendingDepo(); try{ if(window.ZunMural&&window.ZunMural.checkOwn) window.ZunMural.checkOwn(); }catch(e){} loadPendingInvites(); loadPendingReqs(); try{ loadPub(); }catch(e){} try{ if(typeof pubFlipped!=="undefined"&&pubFlipped) loadRooms(); }catch(e){} try{ zunAvRevalidate(); }catch(e){} try{ zunAvMeRevalidate(); }catch(e){} }, 60000); // egress 2026-10-30: 30s→60s (realtime cobre o ao-vivo; poller é backstop)
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden){ loadFeed(); checkPendingDepo(); try{ if(window.ZunMural&&window.ZunMural.checkOwn) window.ZunMural.checkOwn(); }catch(e){} try{ loadPub(); }catch(e){} } });
try{
  let pc = null;
  try{ pc = JSON.parse(localStorage.getItem("zunzumPresenceCache")||"null"); }catch(e){}
  if(pc && pc.t){
    userCountEl.innerHTML = "";
    let t0 = document.createElement("span"); t0.className = "uc-total"; t0.textContent = pc.t+" usuários · "; userCountEl.appendChild(t0);
    let d0 = document.createElement("span"); d0.className = "onDot"; d0.title = "online agora"; userCountEl.appendChild(d0);
    let o0 = document.createElement("span"); o0.className = "uc-on"; o0.textContent = " "+pc.o+" online"; userCountEl.appendChild(o0);
    if(pc.m>1){ let m0 = document.createElement("span"); m0.className = "meta uc-rec"; m0.style.marginLeft = "6px"; m0.textContent = "· recorde "+pc.m; try{ let _tt=""; if(pc.pat>0){ let _d=new Date(pc.pat); _tt+="pico em "+String(_d.getDate()).padStart(2,"0")+"/"+String(_d.getMonth()+1).padStart(2,"0")+" "+String(_d.getHours()).padStart(2,"0")+":"+String(_d.getMinutes()).padStart(2,"0"); } if(pc.lat>0){ let _d2=new Date(pc.lat); _tt+=(_tt?" · ":"")+"última vez com 2+ online em "+String(_d2.getDate()).padStart(2,"0")+"/"+String(_d2.getMonth()+1).padStart(2,"0")+" "+String(_d2.getHours()).padStart(2,"0")+":"+String(_d2.getMinutes()).padStart(2,"0"); } if(_tt) m0.title=_tt; }catch(e){} userCountEl.appendChild(m0); }
    try{ let _pb=document.getElementById("postBox"); if(_pb&&pc&&(pc.m>1||pc.lat>0)){ let _pl=document.getElementById("zunPeakLine"); if(!_pl){ _pl=document.createElement("div"); _pl.id="zunPeakLine"; _pl.className="meta"; let _h=_pb.querySelector("h3"); if(_h&&_h.nextSibling) _h.parentNode.insertBefore(_pl,_h.nextSibling); else _pb.insertBefore(_pl,_pb.firstChild); } let _f=function(ms){ try{ if(!(ms>0)) return ""; let d=new Date(ms); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+" "+String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0"); }catch(e){ return ""; } }; if(pc.m>1){ let _fp=_f(pc.pat), _fl=_f(pc.lat); _pl.textContent="🐝 recorde "+pc.m+" online"+(_fp?" · pico em "+_fp:"")+((_fl&&_fl!==_fp)?" · última vez com 2+ online em "+_fl:""); _pl.title="maior número de gente online ao mesmo tempo"+(_fl?" · última vez com 2+ online em "+_fl:""); } else if(pc.lat>0){ _pl.textContent="🐝 última vez com 2+ online em "+_f(pc.lat); } } }catch(e){}
  }
  else userCountEl.textContent = "carregando presença…";
}catch(e){}
connect();

var THEME_PRESETS={zunzum:{bg:"#d9e6f2",cd:"#ffffff",tx:"#222222",ac:"#6aa5d7"},orkut:{bg:"#f5c6e8",cd:"#fff7fd",tx:"#4a1f4d",ac:"#e355b6"},noite:{bg:"#141422",cd:"#1e1e30",tx:"#e8e8f2",ac:"#7a7aff"},mato:{bg:"#d8ecd2",cd:"#f4fff0",tx:"#1d3a1d",ac:"#3f9e4d"},roxo:{bg:"#e0d4f5",cd:"#f7f2ff",tx:"#2c1b4d",ac:"#7a4fc9"},neon:{bg:"#0a0a12",cd:"#12121f",tx:"#00ffcc",ac:"#ff00aa"}};
function isDark(hex){ try{ let h=String(hex||"").replace("#",""); if(h.length!==6) return false; let r=parseInt(h.slice(0,2),16)/255, g=parseInt(h.slice(2,4),16)/255, b=parseInt(h.slice(4,6),16)/255; let l=0.2126*r+0.7152*g+0.0722*b; return l<0.4; }catch(e){ return false; } }
var ZUN_MODAL_STYLES=[{v:"padrao",l:"padrão"},{v:"redondo",l:"redondo"},{v:"quadrado",l:"quadrado"},{v:"retro",l:"retrô"},{v:"minimal",l:"minimal"},{v:"bolha",l:"bolha"},{v:"moldura",l:"moldura dupla"},{v:"elevado",l:"cartão elevado"},{v:"polaroid",l:"polaroid"},{v:"jornal",l:"jornal"},{v:"pixel",l:"pixel 8-bit"},{v:"fita",l:"fita destaque"},{v:"pilula",l:"pílula"},{v:"sombra",l:"sombra suave"},{v:"grossa",l:"borda grossa"},{v:"pontilhado",l:"pontilhado"},{v:"faixa",l:"faixa no topo"},{v:"cortado",l:"cantos cortados"},{v:"maquina",l:"máquina escrever"},{v:"vitrine",l:"vitrine"}];
var ZUN_MODAL_IDS=["padrao","redondo","quadrado","retro","minimal","bolha","moldura","elevado","polaroid","jornal","pixel","fita","pilula","sombra","grossa","pontilhado","faixa","cortado","maquina","vitrine"];
function zunNormModalSt(s){ try{ s=String(s||"padrao").toLowerCase(); if(s==="retrô") s="retro"; if(ZUN_MODAL_IDS.indexOf(s)<0) s="padrao"; return s; }catch(e){ return "padrao"; } }
function zunProfStyleCss(st, r, safeTx, safeHead, onAc){
  try{
    var AC=r.ac;
    if(st==="redondo") return "#profCard,#profAvatar{border-radius:18px!important}#profCard{box-shadow:0 8px 26px rgba(0,0,0,.18)!important}";
    if(st==="quadrado") return "#profCard,#profAvatar,#profCard button,#profCard input,#profCard select,#profCard textarea{border-radius:0!important}#profCard{box-shadow:none!important}";
    if(st==="retro") return "#profCard{border-style:double!important;border-width:6px!important;border-radius:4px!important;box-shadow:4px 4px 0 "+AC+"!important}#profNick{font-family:Georgia,'Times New Roman',serif!important;letter-spacing:2px!important;font-size:22px!important}#profAvatar{border-radius:0!important;border:3px double "+AC+"!important}#profCard button{border-radius:0!important}#profCard h3{letter-spacing:1px!important}";
    if(st==="minimal") return "#profCard{box-shadow:none!important;border-width:1px!important;border-radius:10px!important}#profCard button{box-shadow:none!important}";
    if(st==="bolha") return "#profCard{border-radius:26px!important;box-shadow:0 10px 30px rgba(0,0,0,.20)!important}#profAvatar{border-radius:50%!important}#profCard button{border-radius:999px!important}";
    if(st==="moldura") return "#profCard{border-radius:6px!important;outline:3px double "+AC+"!important;outline-offset:5px!important}#profAvatar{border-radius:6px!important}";
    if(st==="elevado") return "#profCard{border-radius:14px!important;box-shadow:0 14px 34px rgba(0,0,0,.28)!important;border-width:1px!important}#profAvatar{border-radius:14px!important;box-shadow:0 4px 12px rgba(0,0,0,.25)!important}";
    if(st==="polaroid") return "#profCard{border-radius:6px!important}#profAvatar{width:120px!important;height:120px!important;border-radius:6px!important;border:6px solid #fff!important;box-shadow:0 4px 14px rgba(0,0,0,.30)!important;margin-top:4px!important}#profNick{font-size:24px!important}";
    if(st==="jornal") return "#profCard{font-family:Georgia,'Times New Roman',serif!important}#profNick{font-family:Georgia,serif!important;font-style:italic!important;font-size:23px!important}#profCard h3{font-family:Georgia,serif!important;letter-spacing:1px!important}#profAvatar{border-radius:0!important}#profCard button{font-family:Georgia,serif!important}";
    if(st==="pixel") return "#profCard{border-radius:0!important;border-width:4px!important;box-shadow:6px 6px 0 "+AC+"!important;font-family:'Courier New',monospace!important}#profNick{font-family:'Courier New',monospace!important;letter-spacing:1px!important}#profAvatar{border-radius:0!important}#profAvatar img{image-rendering:pixelated!important}#profCard button{border-radius:0!important;font-family:'Courier New',monospace!important}";
    if(st==="fita") return "#profCard{border-radius:10px!important}#profCard h3,#profCard .zun-mhead{border-radius:6px!important;padding:6px 10px!important}#profNick{border-radius:6px!important;padding:2px 10px!important;display:inline-block!important}";
    if(st==="pilula") return "#profCard{border-radius:20px!important}#profAvatar{border-radius:50%!important}#profCard button{border-radius:999px!important}#profNick{font-size:22px!important}";
    if(st==="sombra") return "#profCard{border-radius:12px!important;box-shadow:0 10px 40px rgba(0,0,0,.30)!important}#profAvatar{border-radius:12px!important}";
    if(st==="grossa") return "#profCard{border-width:5px!important;border-radius:10px!important}#profAvatar{border-radius:10px!important}";
    if(st==="pontilhado") return "#profCard{border-style:dashed!important;border-width:3px!important;border-radius:10px!important}#profAvatar{border-radius:10px!important}#profCard button{border-style:dashed!important}";
    if(st==="faixa") return "#profCard{border-radius:10px!important;border-top:10px solid "+AC+"!important}#profAvatar{border-radius:10px!important}";
    if(st==="cortado") return "#profCard{border-radius:4px 22px 4px 22px!important}#profAvatar{border-radius:4px 14px 4px 14px!important}#profCard button{border-radius:4px 12px 4px 12px!important}";
    if(st==="maquina") return "#profCard{font-family:'Courier New',monospace!important;border-style:dashed!important;border-width:2px!important;border-radius:4px!important}#profNick{font-family:'Courier New',monospace!important;text-decoration:underline!important}#profAvatar{border-radius:4px!important}#profCard button{font-family:'Courier New',monospace!important;border-radius:4px!important}";
    if(st==="vitrine") return "#profCard{border-radius:14px!important}#profAvatar{margin-left:auto!important;margin-right:auto!important;width:110px!important;height:110px!important;border-radius:50%!important}#profNick{display:block!important;text-align:center!important;font-size:26px!important}";
    return "#profCard{border-radius:8px!important;box-shadow:0 4px 18px rgba(0,0,0,.15)!important}#profAvatar{border-radius:12px!important}";
  }catch(e){ return ""; }
}
function zunSafeColor(c, fb){ try{ let s=String(c||"").trim(); if(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s)) return s; }catch(e){} return fb; }
  function resolveTheme(th){ if(!th) return null; let base=THEME_PRESETS[th.p||th.preset]||{}; let dBg=base.bg||"#d9e6f2", dCd=base.cd||"#fff", dTx=base.tx||"#222", dAc=base.ac||"#6aa5d7"; return {bg:zunSafeColor(th.bg,dBg), cd:zunSafeColor(th.cd||th.card,dCd), tx:zunSafeColor(th.tx,dTx), ac:zunSafeColor(th.ac||th.acc,dAc), st:zunNormModalSt(th.st||th.style||"padrao"), css:th.css||""}; }
/* proteção de cor p/ cabeçalhos: garante contraste mínimo mesmo com CSS personalizado */
function zunLumHex(hex){ try{ let h=String(hex||"").replace("#",""); if(h.length!==6) return 1; let r=parseInt(h.slice(0,2),16)/255, g=parseInt(h.slice(2,4),16)/255, b=parseInt(h.slice(4,6),16)/255; let f=v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); }catch(e){ return 1; } }
function zunRatioHex(a,b){ try{ let l1=zunLumHex(a), l2=zunLumHex(b); if(l1<l2){ let t=l1; l1=l2; l2=t; } return (l1+0.05)/(l2+0.05); }catch(e){ return 1; } }
function zunSafeTx(cd,tx){ try{ if(zunRatioHex(tx,cd)>=3.5) return tx; let rb=zunRatioHex("#111111",cd), rw=zunRatioHex("#ffffff",cd); return rb>=rw?"#111111":"#ffffff"; }catch(e){ return tx; } }
function zunSafeHead(cd,ac,tx){ try{ if(zunRatioHex(ac,cd)>=3) return ac; if(zunRatioHex(tx,cd)>=3) return tx; let rb=zunRatioHex("#111111",cd), rw=zunRatioHex("#ffffff",cd); return rb>=rw?"#111111":"#ffffff"; }catch(e){ return ac; } }
function siteThemeCss(th){ let r=resolveTheme(th); if(!r) return ""; let safeTx=r.tx, safeHead=r.ac; try{ safeTx=zunSafeTx(r.cd,r.tx); safeHead=zunSafeHead(r.cd,r.ac,r.tx); }catch(e){} let guard="#searchCard{background:#fff!important;color:#222!important}#searchCard .meta{color:#666!important;opacity:.7}#searchCard input,#searchCard select,#searchCard textarea{background:#fff!important;color:#222!important}#searchLinks .g-t{color:#1a0dab!important}#searchLinks .g-u{color:#006621!important}#searchLinks .g-d{color:#545454!important}#searchLinks .g-v{color:#137333!important}#searchLinks .g-feat{background:#f6faff!important;color:#222!important;border-color:#d9e6f2!important}#searchLinks .s-photo{background:#faf6ff!important;color:#222!important;border-color:#d9e6f2!important}"; let aiFix=isDark(r.cd)?"#wrap .post[data-ai-post]{background:#222!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}":""; let topFix="#top{background:"+r.cd+"!important;color:"+safeTx+"!important}#top button{background:"+r.ac+"!important;color:"+(isDark(r.ac)?"#fff":"#102030")+"!important;border:1px solid "+r.ac+"!important}"; let headGuard="#wrap .box h3,#wrap .box h3 b,#wrap .box h3 strong{background:"+r.cd+"!important;color:"+safeHead+"!important;border-color:"+r.ac+"!important}#wrap .box h3 *,#profCard #profNick,#nodalCard #nodalTitle,#nodalCard b,#userSearchCard b,#divulgarCard b,#notfoundModal .nfTitle{color:"+safeHead+"!important}#profCard .meta,#nodalCard .meta,#userSearchCard .meta,#divulgarCard .meta,#notfoundModal .nfMsg{color:"+safeTx+"!important;opacity:.8}#zunDMRoot .zun-dm-h{background:"+r.cd+"!important;color:"+safeHead+"!important;border-color:"+r.ac+"!important}#zunDMRoot .zun-dm-h *{color:"+safeHead+"!important}"; let onAc=isDark(r.ac)?"#fff":"#102030"; let btnFix="html body #wrap .box button:not(.miniAv){background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"+"html body #wrap #pubTopicsBar button{background:"+r.cd+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}"+"html body #wrap #pubTopicsBar button.on{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"+"html body #zunMBar button{background:"+r.cd+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}"+"html body #zunMBar button.on{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"+"html body #zunMSub button{background:"+r.cd+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}"+"html body #zunMSub button.on{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"+"html body #searchCard button,html body #divulgarCard button,html body #notfoundModal .nfCard button{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"+"#profCard button{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}";
let dmFix="#zunDMRoot .zun-dm-win{background:"+r.cd+"!important;color:"+safeTx+"!important;border:2px solid "+r.ac+"!important}"
+"#zunDMRoot .zun-dm-log{background:"+r.bg+"!important}"
+"#zunDMRoot .zun-bub.mine{background:"+r.ac+"!important;color:"+onAc+"!important}"
+"#zunDMRoot .zun-bub.theirs{background:"+(isDark(r.cd)?"#222":"#fff")+"!important;color:"+safeTx+"!important;border:1px solid "+r.ac+"!important}"
+"#zunDMRoot .zun-comp{background:"+r.cd+"!important;border-color:"+r.ac+"!important}"
+"#zunDMRoot .zun-typing{background:"+r.cd+"!important;color:"+safeTx+"!important}"
+"#zunDMRoot .zun-dm-priv{color:"+safeTx+"!important;opacity:.75}"
+"#zunDMRoot textarea,#zunDMRoot input{background:"+(isDark(r.cd)?"#222":"#fff")+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}"
+"#zunDMRoot .zun-row button{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"
+"#zunDMBar button{background:"+r.cd+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}"
+"#zunDMRoot a{color:"+safeHead+"!important}";
return "body{background:"+r.bg+"!important;color:"+safeTx+"!important}#top{background:"+r.cd+"!important}"+topFix+"#wrap .box{background:"+r.cd+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}#wrap .box h3{background:"+r.cd+"!important;color:"+safeHead+"!important}#wrap .box h3 *,#wrap .chatname{color:"+safeHead+"!important}#wrap input,#wrap select,#wrap textarea{background:"+(isDark(r.cd)?"#222":"#fff")+"!important;color:"+safeTx+"!important}#wrap a{color:"+safeHead+"!important}"+btnFix+"#wrap .meta,#top .meta{color:"+safeTx+"!important;opacity:.7}"+aiFix+(typeof zunScopeCss==="function" ? zunScopeCss(r.css, "body") : (r.css||""))+guard+headGuard+dmFix; }
/* modo de diagnóstico ?semcss=1: pula TODO CSS/tema personalizado (site, perfil,
   sala) p/ descobrir se o puxão/quebra vem do CSS custom. Só p/ teste. */
try{ window.ZUN_SEMCSS = /(?:\?|&)semcss=1(?:&|#|$)/.test((location.search||"")+(location.hash||"")); }catch(e){ window.ZUN_SEMCSS = false; }
function zunSemCss(){ try{ return !!window.ZUN_SEMCSS; }catch(e){ return false; } }
function zunSemCssBanner(){
  try{
    if(!zunSemCss() || document.getElementById("zunSemCssBar")) return;
    let b = document.createElement("div"); b.id = "zunSemCssBar";
    b.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;background:#7a4fc9;color:#fff;font-size:13px;padding:6px 10px;text-align:center";
    let u = null;
    try{ u = new URL(location.href); u.searchParams.delete("semcss"); }catch(e){}
    b.innerHTML = "modo sem CSS personalizado (teste) — ";
    let a = document.createElement("a"); a.href = u ? (u.toString()) : location.pathname; a.textContent = "sair";
    a.style.cssText = "color:#fff;font-weight:bold";
    b.appendChild(a); document.body.appendChild(b);
  }catch(e){}
}
function paintSiteTheme(){ try{ let old0=document.getElementById("siteThemeEl"); if(zunSemCss()){ if(old0) old0.remove(); zunSemCssBanner(); return; } let raw=localStorage.getItem("orkutSiteTheme"); if(!raw) return; let th=JSON.parse(raw); let css=siteThemeCss(th); try{ var _nz=document.getElementById("zunNightCss"); if(_nz) _nz.remove(); document.body.classList.remove("zun-night"); }catch(_nze){} let el=document.getElementById("siteThemeEl"); if(!el){ el=document.createElement("style"); el.id="siteThemeEl"; document.head.appendChild(el); } el.textContent=css; }catch(e){} }
function applyProfTheme(th){ try{ let card=document.getElementById("profCard"); let old=document.getElementById("profThemeEl"); if(old) old.remove(); if(zunSemCss()){ card.style.cssText=""; zunSemCssBanner(); return; } let r=resolveTheme(th); if(!r){ card.style.cssText=""; return; } let st=document.createElement("style"); st.id="profThemeEl"; let dark=isDark(r.cd); let safeTx=r.tx, safeHead=r.ac; try{ safeTx=zunSafeTx(r.cd,r.tx); safeHead=zunSafeHead(r.cd,r.ac,r.tx); }catch(e){} let onAc=isDark(r.ac)?"#fff":"#102030"; try{ if(typeof zunRatioHex==="function"){ var rwX=zunRatioHex("#ffffff",r.ac), rbX=zunRatioHex("#111111",r.ac); onAc=(rwX>=rbX)?"#ffffff":"#111111"; } }catch(e0){} let sty=zunNormModalSt(r.st); r.st=sty; let headBg=(sty==="fita")?r.ac:r.cd; let headTx=(sty==="fita")?onAc:safeHead; let extraCss=""; try{ extraCss=zunProfStyleCss(sty,r,safeTx,safeHead,onAc); }catch(e0){ extraCss=""; } let customCss=""; try{ customCss=(typeof zunScopeCss==="function" ? zunScopeCss(r.css, "#profCard") : (r.css||"")); }catch(e0){ try{ customCss=r.css||""; }catch(e1){ customCss=""; } } st.textContent="#profCard{background:"+r.cd+"!important;color:"+safeTx+"!important;border:2px solid "+r.ac+"}#profCard h3,#profCard .zun-mhead{background:"+headBg+"!important;color:"+headTx+"!important}#profCard h3 *,#profCard .zun-mhead *,#profCard b,#profCard strong{color:"+headTx+"!important}#profCard .meta{color:"+safeTx+"!important;opacity:.75}#profCard button{background:"+r.ac+"!important;color:"+onAc+"!important;border:1px solid "+r.ac+"}#profCard input,#profCard select,#profCard textarea{background:"+(dark?"#222":"#fff")+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}#profCard a{color:"+headTx+"!important}#profNick{color:"+headTx+"!important;background:"+headBg+"!important}"+extraCss+customCss+"#profCard{color:"+safeTx+"!important}#profCard #profNick,#profCard b,#profCard strong,#profCard h3,#profCard .zun-mhead{color:"+headTx+"!important}#profCard .meta{color:"+safeTx+"!important}"; document.head.appendChild(st); try{ if(typeof zunHealRoot==="function"){ var pc2=document.getElementById("profCard"); if(pc2) zunHealRoot(pc2); } }catch(e0){} }catch(e){} }
/* sanitiza pg (pagina do usuario) antes do srcdoc: mesmo com sandbox allow-scripts,
   bloqueia phishing facil (form/input password), exfiltracao obvia e scripts
   inline mais perigosos. Sandbox continua como barreira principal (opaque origin).
   Espelha o backstop do servidor (htmlSet no index.html e sb3.js): style/svg/math/
   frame/frameset/applet/bgsound nunca passam — servidor REJEITA no save, aqui
   removemos no render (cobre linha legada/contaminada). <style> removido fecha
   o tracker via url() dentro da pg (vazamento de IP de quem abre). */
function zunSanitizePg(html){
  try{
    html = String(html==null?"":html).slice(0,8000);
    let doc = new DOMParser().parseFromString(html, "text/html");
    try{ doc.querySelectorAll("script, iframe, object, embed, form, input, button, meta, link, base, title, style, svg, math, frame, frameset, applet, bgsound").forEach(el=>{ try{ el.remove(); }catch(e){} }); }catch(e){}
    try{
      doc.querySelectorAll("*").forEach(el=>{
        try{
          for(let i=el.attributes.length-1;i>=0;i--){
            let a = el.attributes[i];
            let n = (a.name||"").toLowerCase();
            let v = String(a.value||"");
            if(n.indexOf("on")===0){ el.removeAttribute(a.name); continue; }
            if((n==="href"||n==="src"||n==="xlink:href"||n==="action"||n==="formaction"||n==="cite"||n==="data"||n==="background"||n==="poster") && /^\s*(javascript|data|vbscript|file):/i.test(v)){ el.removeAttribute(a.name); continue; }
            if(n==="srcdoc"){ el.removeAttribute(a.name); continue; }
              if(n==="srcset"||n==="lowsrc"||n==="dynsrc"||n==="usemap"){ el.removeAttribute(a.name); continue; }
          }
          try{ el.removeAttribute("style"); }catch(e){}
        }catch(e2){}
      });
    }catch(e){}
    let out = "";
    try{ out = doc.body ? doc.body.innerHTML : ""; }catch(e){ out=""; }
    out = String(out||"").slice(0,8000);
    out = out.replace(/<\/script/gi, "").replace(/<script/gi, "");
    return out;
  }catch(e){ return ""; }
}
/* micro-status de 1 linha no perfil (dissecação 2026-11-04, estilo status.cafe).
   Texto puro via textContent (sem HTML) — seguro contra injeção. */
/* micro-status de 1 linha no perfil (dissecação 2026-11-04, estilo status.cafe).
   Edição inline no MESMO lugar: mostra status + ✏️ editar (só p/ o dono);
   clicar vira caixa de edição ali mesmo; salvar volta p/ status + editar.
   Texto puro via textContent (sem HTML) — seguro contra injeção. */
function renderProfMstatus(ms, nick){ try{
  let box=document.getElementById("profMstatus");
  if(!box){ box=document.createElement("div"); box.id="profMstatus"; box.className="meta"; box.style.margin="4px 0"; box.style.fontSize="14px"; let st=document.getElementById("profStats"); if(st&&st.parentNode) st.parentNode.insertBefore(box, st); else return; }
  function isMine(){ try{ return (typeof me!=="undefined"&&me&&me.nick&&nick&&String(me.nick).toLowerCase()===String(nick).toLowerCase()); }catch(e){ return false; } }
  function paintView(v){
    box.innerHTML=""; v=String(v||"");
    if(!v&&!isMine()){ box.hidden=true; return; }
    box.hidden=false;
    let b=document.createElement("b"); b.textContent="💭 "; box.appendChild(b);
    let s=document.createElement("span");
    if(v) s.textContent=v.slice(0,120);
    else { s.textContent=ztr("adicione seu status (1 linha)"); s.style.opacity=".7"; }
    box.appendChild(s);
    if(isMine()){
      box.appendChild(document.createTextNode(" "));
      let eb=document.createElement("button"); eb.textContent=ztr("✏️ editar"); eb.style.marginLeft="4px";
      eb.onclick=function(){ paintEdit(v); };
      box.appendChild(eb);
    }
  }
  function paintEdit(v){
    box.innerHTML=""; box.hidden=false;
    let b=document.createElement("b"); b.textContent="💭 "; box.appendChild(b);
    let inp=document.createElement("input"); inp.maxLength=120; inp.value=String(v||""); inp.placeholder=ztr("seu status (1 linha)"); inp.style.maxWidth="280px";
    box.appendChild(inp);
    let sv=document.createElement("button"); sv.textContent=ztr("salvar"); sv.style.marginLeft="6px";
    let cx=document.createElement("button"); cx.textContent=ztr("cancelar"); cx.style.marginLeft="4px";
    let msg=document.createElement("span"); msg.className="meta"; msg.style.marginLeft="6px";
    box.appendChild(sv); box.appendChild(cx); box.appendChild(msg);
    try{ inp.focus(); }catch(e){}
    cx.onclick=function(){ paintView(v); };
    sv.onclick=async function(){
      let nv=String(inp.value||"").slice(0,120);
      msg.textContent=ztr("salvando...");
      try{
        let rr=JSON.parse(await rpc("mstatusSet", JSON.stringify({nick:me.nick, hash:me.hash, st:nv})));
        if(rr&&rr.ok){ try{ zunMsSyncOwn(nv); }catch(e){} paintView(nv); }
        else if(rr&&rr.err==="sem-banco"){ msg.textContent=ztr("banco desatualizado (falta a FASE 21) — avise o dono"); }
        else { msg.textContent=ztr("erro ao salvar"); }
      }catch(e){ msg.textContent=ztr("erro ao salvar"); }
    };
  }
  paintView(ms);
}catch(e){} }
/* micro-status próprio na lateral (caixa "usuario", abaixo do @nick).
   Texto puro via textContent — seguro contra injeção. */
function paintMeMs(ms){ try{
  let el=document.getElementById("meMsEl");
  ms=String(ms||"");
  if(!ms){ if(el) el.hidden=true; return; }
  if(!el){ el=document.createElement("div"); el.id="meMsEl"; el.className="meta"; el.style.margin="4px 0"; el.style.fontSize="13px"; let anchor=document.getElementById("meEl"); if(anchor&&anchor.parentNode) anchor.parentNode.insertBefore(el, anchor.nextSibling); else return; }
  el.hidden=false; el.innerHTML="";
  let b=document.createElement("b"); b.textContent="💭 "; el.appendChild(b);
  let s=document.createElement("span"); s.textContent=ms.slice(0,120); el.appendChild(s);
}catch(e){} }
function zunMsSyncOwn(ms){ try{ if(typeof me!=="undefined"&&me&&me.nick){ me.ms=String(ms||""); try{ setSession(me); }catch(e){} } }catch(e){} try{ paintMeMs(ms); }catch(e){} }
function renderProfPg(pg, nick){ try{ let box=document.getElementById("profPg"); box.innerHTML=""; if(!pg){ box.hidden=true; return; } box.hidden=false; let who=nick?ztr("conteúdo de @"+nick+" (OUTRO USUÁRIO)"):ztr("conteúdo de OUTRO USUÁRIO"); let warn=document.createElement("div"); warn.className="meta"; warn.style.margin="6px 0"; warn.textContent=ztr(who+" — HTML/JS isolado, pode ter conteúdo estranho. NUNCA digite sua senha do zunzum aqui dentro: o zunzum nunca pede senha dentro dessa página. só carrega se você confiar."); let btn=document.createElement("button"); btn.textContent=ztr("carregar página do usuário"); btn.onclick=()=>{ try{ btn.disabled=true; btn.textContent=ztr("carregando..."); let strip=document.createElement("div"); strip.className="meta"; strip.style.cssText="margin:6px 0;padding:4px 8px;border:1px dashed #b6c9db;border-radius:8px"; strip.textContent=ztr(who+" — isolado, sem acesso à sua conta. golpe comum finge tela de login aqui dentro: não digite senha."); let safe=""; try{ safe=zunSanitizePg(pg); }catch(e){ safe=""; } if(!safe){ btn.textContent=ztr("conteúdo bloqueado"); return; } let f=document.createElement("iframe"); f.setAttribute("sandbox",""); f.setAttribute("referrerpolicy","no-referrer"); f.setAttribute("srcdoc",safe); f.loading="lazy"; f.style.cssText="width:100%;min-height:200px;border:1px solid #b6c9db;border-radius:8px;background:#fff"; f.title=ztr("página do usuário (isolada)"); box.appendChild(strip); box.appendChild(f); btn.remove(); warn.textContent=ztr(who+" carregado (isolado, sem acesso à sua conta)."); }catch(e){ btn.textContent=ztr("erro"); } }; box.append(warn,btn); }catch(e){} }
function paintProfOwner(r){ let box=document.getElementById("profOwnerBox"); if(!box) return; box.innerHTML=""; let isMe=me&&r&&me.nick===r.nick; if(!isMe){ box.hidden=true; return; } box.hidden=false;
  try{ publishPerfilAuto(r.nick).catch(()=>{}); }catch(e){}
  let h=document.createElement("div"); h.innerHTML=""; let _hb=document.createElement("b"); _hb.textContent=ztr("seu perfil"); h.appendChild(_hb); h.appendChild(document.createTextNode(ztr(" — personalize (todos veem)"))); box.appendChild(h);
  let cur=r.th||{};
  let base=(THEME_PRESETS[cur.p]||THEME_PRESETS.zunzum||{});
  let row=document.createElement("div"); row.style.cssText="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;align-items:center";
  let sel=document.createElement("select"); sel.style.width="auto"; ["","zunzum","orkut","noite","mato","roxo","neon"].forEach(p=>{ let o=document.createElement("option"); o.value=p; o.textContent=p?ztr(p):ztr("preset..."); if(cur.p===p) o.selected=true; sel.appendChild(o); }); row.appendChild(sel);
  function colorIn(v,fb){ let i=document.createElement("input"); i.type="color"; i.value=/^#[0-9a-fA-F]{6}$/.test(v||"")?v:(/^#[0-9a-fA-F]{6}$/.test(fb||"")?fb:"#ffffff"); i.style.width="34px"; return i; }
  let bg=colorIn(cur.bg,base.bg), cd=colorIn(cur.cd||cur.card,base.cd), tx=colorIn(cur.tx,base.tx), ac=colorIn(cur.ac||cur.acc,base.ac);
  [["fundo",bg],["cartao",cd],["texto",tx],["destaque",ac]].forEach(([lb,el])=>{ let s=document.createElement("span"); s.className="meta"; s.textContent=ztr(lb); row.appendChild(s); row.appendChild(el); });
  let stLab=document.createElement("span"); stLab.className="meta"; stLab.textContent=ztr("estilo do modal:"); row.appendChild(stLab);
  let st=document.createElement("select"); st.style.width="auto"; st.title=ztr("estilo do modal do perfil (20 opções)"); let styleList=(typeof ZUN_MODAL_STYLES!=="undefined"&&ZUN_MODAL_STYLES)||[{v:"padrao",l:"padrão"}]; let curSt="padrao"; try{ curSt=zunNormModalSt(cur.st||cur.style||"padrao"); }catch(e){ try{ curSt=String(cur.st||"padrao").toLowerCase(); if(curSt==="retrô") curSt="retro"; }catch(e2){} } styleList.forEach(o2=>{ let o=document.createElement("option"); o.value=o2.v; o.textContent=ztr(o2.l); if(curSt===o2.v) o.selected=true; st.appendChild(o); }); row.appendChild(st);
  box.appendChild(row);
  let css=document.createElement("textarea"); css.placeholder=ztr("CSS extra (opcional, sem <script>)"); css.value=cur.css||""; css.style.minHeight="40px"; box.appendChild(css);
  function curTheme(){ return {p:sel.value,bg:bg.value,cd:cd.value,tx:tx.value,ac:ac.value,st:st.value,css:css.value.slice(0,2000)}; }
  sel.onchange=()=>{ let b=THEME_PRESETS[sel.value]||{}; if(b.bg) bg.value=b.bg; if(b.cd) cd.value=b.cd; if(b.tx) tx.value=b.tx; if(b.ac) ac.value=b.ac; try{ applyProfTheme(curTheme()); }catch(e){} };
  st.onchange=()=>{ try{ applyProfTheme(curTheme()); }catch(e){} };
  [bg,cd,tx,ac].forEach(el=>{ el.oninput=()=>{ try{ applyProfTheme(curTheme()); }catch(e){} }; });
  let r2=document.createElement("div"); r2.style.cssText="display:flex;gap:6px;margin:6px 0;flex-wrap:wrap";
  let sv=document.createElement("button"); sv.textContent=ztr("salvar tema"); r2.appendChild(sv);
  let site=document.createElement("button"); site.textContent=ztr("aplicar no site todo"); r2.appendChild(site);
  let off=document.createElement("button"); off.textContent=ztr("limpar tema"); r2.appendChild(off);
  let msg=document.createElement("span"); msg.className="meta"; r2.appendChild(msg); box.appendChild(r2);
  let r3=document.createElement("div"); r3.style.cssText="display:flex;gap:6px;margin:6px 0;flex-wrap:wrap;align-items:center";
  let gstat=document.createElement("span"); gstat.className="meta"; gstat.textContent=ztr("perfil no Google: automático ✅"); r3.appendChild(gstat); box.appendChild(r3);
  sv.onclick=async()=>{ msg.textContent=ztr("salvando..."); let normSt=st.value; try{ normSt=zunNormModalSt(st.value); }catch(e){ if(normSt==="retrô") normSt="retro"; } let th={p:sel.value,bg:bg.value,cd:cd.value,tx:tx.value,ac:ac.value,st:normSt,css:css.value.slice(0,2000)}; try{ let rr=JSON.parse(await rpc("themeSet",JSON.stringify({nick:me.nick,hash:me.hash,th}))); msg.textContent=rr.ok?ztr("tema salvo!"):ztr("erro")+(rr.err?": "+rr.err:""); if(rr.ok){ applyProfTheme(th); cInv("profileGet"); } }catch(e){ msg.textContent=ztr("sem conexao"); } };
  site.onclick=()=>{ try{ localStorage.setItem("orkutSiteTheme",JSON.stringify({p:sel.value,bg:bg.value,cd:cd.value,tx:tx.value,ac:ac.value,st:st.value,css:css.value.slice(0,2000)})); paintSiteTheme(); msg.textContent=ztr("aplicado no site!"); }catch(e){} };
  off.onclick=async()=>{ try{ await rpc("themeSet",JSON.stringify({nick:me.nick,hash:me.hash,th:null})); localStorage.removeItem("orkutSiteTheme"); let e2=document.getElementById("siteThemeEl"); if(e2) e2.remove(); applyProfTheme(null); cInv("profileGet"); msg.textContent=ztr("limpo"); }catch(e){} };
  pgEditor(box, r.pg||"");
}
function pgEditor(box, cur){
  let h=document.createElement("div"); h.innerHTML=""; let _pb=document.createElement("b"); _pb.textContent=ztr("sua pagina"); h.appendChild(_pb); h.appendChild(document.createTextNode(ztr(" — HTML+JS (max 8000) roda isolado p/ visitantes"))); box.appendChild(h);
  let ta=document.createElement("textarea"); ta.value=cur||""; ta.placeholder="<h1>oi</h1><script>alert(1)</scr"+"ipt>"; ta.style.minHeight="80px"; box.appendChild(ta);
  let row=document.createElement("div"); row.style.cssText="display:flex;gap:6px;margin:6px 0"; let sv=document.createElement("button"); sv.textContent=ztr("salvar pagina"); let msg=document.createElement("span"); msg.className="meta"; row.appendChild(sv); row.appendChild(msg); box.appendChild(row);
  sv.onclick=async()=>{ msg.textContent=ztr("salvando..."); try{ let rr=JSON.parse(await rpc("htmlSet",JSON.stringify({nick:me.nick,hash:me.hash,pg:ta.value.slice(0,8000)}))); msg.textContent=rr.ok?ztr("pagina salva!"):ztr("erro"); if(rr.ok){ renderProfPg(ta.value.slice(0,8000), (me&&me.nick)||""); cInv("profileGet"); } }catch(e){ msg.textContent=ztr("sem conexao"); } };
}
try{ paintSiteTheme(); }catch(e){}
try{
  /* deep-link canônico: só ?perfil=nick abre sozinho. Hash legado #perfil-
     (jeito antigo) nunca abre — só é limpo p/ não ressuscitar o modal. */
  let pq = "";
  try{ pq = new URLSearchParams(location.search).get("perfil")||""; }catch(e){ pq = ""; }
  try{
    if(/perfil-@?([A-Za-z0-9-_]{2,20})/.test(location.hash||"")) zunClearPerfilUrl();
  }catch(e){}
  if(pq) setTimeout(()=>{ try{ openProfile(String(pq).replace(/^@/,"")); }catch(e){} }, 1500);
}catch(e){}
