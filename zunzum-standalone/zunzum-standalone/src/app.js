(function(){ let l = document.querySelector("link[rel~='icon']") || document.createElement("link"); l.rel = "icon"; l.href = "https://user.uploads.dev/file/c8408537dd35bb624eee9560b37e5fa8.jpg"; document.head.appendChild(l); })();
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
function anonTokSave(s){ try{ lsSetSafe("orkutAnonToks", JSON.stringify({own:s.own||{},items:s.items||{}})); }catch(e){} }
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
var L_WRITE_GATE = {feedPush:1,pubPush:1,roomCreate:1,roomEdit:1,roomTheme:1,roomDel:1,topicCreate:1,topicDel:1,roomPush:1,roomMsgDel:1,roomMsgEdit:1,roomBan:1,privPush:1,privJoin:1,privClaim:1,privLock:1,privReq:1,reqOk:1,privInvite:1,invAck:1,nodalOpen:1,nodalPush:1,nodalMsgDel:1,nodalMsgEdit:1,like:1,reply:1,replyDel:1,replyEdit:1,sugPush:1,sugClaim:1,sugDel:1,annPush:1,aiClaim:1,aiFeed:1,avatarSet:1,pkeyPut:1,themeSet:1,htmlSet:1,depoPush:1,depoOk:1,depoDel:1,histPush:1,bioSet:1,petSet:1,mirSet:1,mirClaim:1,mirSpot:1,mirAi:1,mirReset:1,recountUsers:1,sugCount:1,sugGet:1,mirGet:1,djShare:1,djStop:1,nickStyleSet:1,friendReq:1,friendAccept:1,friendDecline:1,friendRemove:1,dmPush:1,dmSeen:1,dmType:1,dmDel:1,dmEdit:1,statusSet:1,statusBulk:1,gifmojiAdd:1,gifmojiDel:1,feedDel:1,feedEdit:1,privMsgDel:1,privMsgEdit:1,accountDelReq:1,accountDelCancel:1,zzClaim:1};
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
    if(ex){ if(!("th" in ex)) ex.th=null; if(!("pg" in ex)) ex.pg=""; if(!("ns" in ex)) ex.ns=null; if(ex.h===o.hash){ lAuthClear("reg:"+k); let _rl={ok:1,nick:ex.n,created:ex.c,avatar:ex.a||"",th:ex.th||null,pg:ex.pg||"",ns:ex.ns||null,del:0}; if(!ex.pw8) _rl.weak=1; if(ex.del){ try{ delete ex.del; }catch(_e){} _rl.restored=1; saveLocalDB(db); } return JSON.stringify(_rl); } if(lAuthThrottle("reg:"+k)) return '{"ok":0,"err":"rate"}'; return '{"ok":0,"err":"senha"}'; }
    try{ var _plL = parseInt(o.pwLen,10); if(isNaN(_plL) || _plL<8) return '{"ok":0,"err":"senha-curta"}'; }catch(e){ return '{"ok":0,"err":"senha-curta"}'; }
    if(!("totalReg" in db)) db.totalReg = Object.keys(db.users).length;
    db.users[k]={n:nick,h:o.hash,c:Date.now(),a:"",th:null,pg:"",ns:null,pw8:1};
    if(_isT){ db.users[k].t=1; } else { db.totalReg++; }
    try{
      let rk = String(o.ref||"").replace(/^@/,"").trim().toLowerCase().slice(0,20);
      if(rk && rk!==k && db.users[rk]){
        if(!db.refs) db.refs = {};
        if(!db.refBy) db.refBy = {};
        if(!db.refBy[k]){ db.refBy[k] = rk; db.refs[rk] = (db.refs[rk]||0)+1; }
      }
    }catch(e2){}
    saveLocalDB(db);
    return JSON.stringify({ok:1,fresh:1,nick,created:db.users[k].c,avatar:"",th:null,pg:"",ns:null,del:0,test:(_isT?1:0)});
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
        if(typeof m.t==="string" && m.t.indexOf("ENC1:")===0) continue;
        let ctx = [];
        for(let j=i-1;j>=0 && ctx.length<2;j--){ let _cj = arr[j] && arr[j].t; if(_cj && String(_cj).indexOf("ENC1:")!==0) ctx.unshift({f:String(arr[j].f||""), t:String(_cj).slice(0,200)}); }
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
    db.sug.push({id:"s"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36), k:o.kind==="bug"?"bug":"ideia", t:String(o.text||"").slice(0,500), n:key, at:Date.now()});
    saveLocalDB(db);
    let _sr = {ok:1};
    if(_sugTok) _sr.anonTok = _sugTok;
    return JSON.stringify(_sr);
  }
  if(name==="sugWho") return JSON.stringify({ok:1, configured:!!db.sugOwner});
  if(name==="cliVer") return JSON.stringify({ok:1, v:13, mig:1});
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
  if(name==="avatarSet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || !lCredEq(db,u,o.hash)) return '{"ok":0,"err":"auth"}';
    if(u&&u.del) return '{"ok":0,"err":"inativa"}';
    let url = String(o.url||"").slice(0,500);
    if(url && !lOkUrlStrict(url)) return '{"ok":0,"err":"url"}';
    u.a = url; saveLocalDB(db);
    return JSON.stringify({ok:1, avatar:url});
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
    return JSON.stringify({ok:1, nick:u.n, avatar:u.a||"", created:u.c, posts, likes, pub, dep:depN, inv:invN, views:viewsN, th:u.th||null, pg:u.pg||"", ns:u.ns||null});
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
      out.push({nick:u.n, avatar:u.a||"", ns:u.ns||null});
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
      Object.keys((db.fr&&db.fr[myL])||{}).forEach(k=>{ let u2=db.users[k]; if(u2) out.push({nick:u2.n,avatar:u2.a||"",st:((db.st||{})[k]||{}).s||""}); });
      ((db.frReq&&db.frReq[myL])||[]).forEach(x=>{ let u2=db.users[String(x.f||"").toLowerCase()]; if(u2) inc.push({nick:u2.n,avatar:u2.a||"",at:x.at||0}); });
      Object.keys(db.frReq||{}).forEach(t=>{ (db.frReq[t]||[]).forEach(x=>{ if(String(x.f||"").toLowerCase()===myL){ let u2=db.users[t]; if(u2&&og.length<20) og.push({nick:u2.n,avatar:u2.a||"",at:x.at||0}); } }); });
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
    let arr = String(o.room||"geral")==="geral" ? db.pub : ((db.roomMsgs||{})[String(o.room||"")]||null);
    if(!arr) return '{"ok":0,"err":"noid"}';
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
  setNet("modo local (sem conexão) — dados só neste navegador");
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
function setNet(t){ netEl.textContent = t; }
function connect(){
  /* re-seal r2: server-plugin removido — backend único Supabase.
     Sem backend configurado = modo local (espelho no navegador). */
  try{
    if(window.sbConfigured && window.sbSocket && window.sbConfigured()) socket = window.sbSocket();
    else { enterLocalMode(); return; }
  }catch(e){ enterLocalMode(); return; }
  socket.addEventListener("open", async ()=>{ connected = true; localMode = false; setNet("online"); subDepo(); subInv(); subAppr(); await refreshAll(); autoJoinPriv(); autoJoinRoom(); loadPendingInvites(); loadPendingReqs(); checkPendingDepo(); autoPublishMe(); });
  socket.addEventListener("message", async (ev)=>{
    let d = typeof ev.data === "string" ? ev.data : "";
    if(d==="1"){ try{ await cInv("feedGet"); await cInv("pubGet"); await cInv("privGet"); await cInv("roomsList"); await cInv("roomView"); }catch(e){} loadFeed(); loadPub(); loadPriv(); try{ loadRooms(); }catch(e){} }
    else if(d.indexOf("join:")===0){ notifyPrivJoin(d.slice(5)); }
    else if(d.indexOf("lock:")===0){ notifyPrivLock(d.slice(4)); }
    else if(d.indexOf("req:")===0){ try{ let rq = JSON.parse(d.slice(4)); if(rq && rq.f && rq.r) notifyPrivReq(rq.f, rq.r); }catch(e){} }
    else if(d.indexOf("pok:")===0){ notifyPrivApproved(d.slice(4)); }
    else if(d.indexOf("pno:")===0){ notifyPrivRefused(d.slice(4)); }
    else if(d.indexOf("depo:")===0){ notifyDepo(d.slice(5)); }
    else if(d.indexOf("inv:")===0){ try{ let iv = JSON.parse(d.slice(4)); if(iv && iv.f && iv.r) notifyPrivInvite(iv.f, iv.r); }catch(e){} }
    else if(d.indexOf("nodal:")===0){ try{ if(window.nodalOnMsg) window.nodalOnMsg(d.slice(6)); }catch(e){} }
  });
  socket.addEventListener("close", (ev)=>{
    connected = false;
    if(ev.code===4403){ setNet("fora do perchance: servidor off"); return; }
    if(localMode){ setNet("modo local (sem conexão) — dados só neste navegador"); setTimeout(()=>{ if(!connected) connect(); }, 15000); return; }
    setNet("reconectando...");
    setTimeout(()=>{ if(!connected) connect(); }, 2000);
    setTimeout(()=>{ enterLocalMode(); }, 6000);
  });
  socket.closed.catch(()=>{});
}
async function rpc(name, data){
  var _r;
  if(localMode) _r = await localRpc(name, data);
  else { await socket.opened; _r = await socket.rpc[name](data); }
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
function privInviteLink(room){ return "https://perchance.org/"+window.generatorName+"?priv="+cleanPrivRoom(room); }
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
    let ok = document.createElement("button"); ok.textContent = "aceitar";
    let no = document.createElement("button"); no.textContent = "recusar";
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
      let ok = document.createElement("button"); ok.textContent = "aceitar";
      let no = document.createElement("button"); no.textContent = "recusar";
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
let onlineNicks = new Set();
let onJit = 0;
function onDot(nick){
  if(!onlineNicks.has(nick)) return null;
  let s = document.createElement("span"); s.className = "onDot"; s.title = "online";
  return s;
}
async function getAvatar(nick, force){
  if(!nick || /^anon-[a-z0-9]{6,12}$/.test(nick)) return "";
  if(!force && avCache[nick]!==undefined){
    let age = Date.now()-(avCacheAt[nick]||0);
    let ttl = avCache[nick] ? 300000 : 60000;
    if(age<ttl) return avCache[nick];
  }
  if(avPending[nick]) return avPending[nick];
  let p = (async()=>{
    try{
      let r = JSON.parse(await crpc("profileGet", nick));
      if(r.ok){ avCache[nick] = r.avatar||""; try{ zNickNoteProfile(r); }catch(e){} try{ paintZNick(document.querySelector('[data-znick="'+nick.toLowerCase()+'"]'), nick); }catch(e){} }
      else if(avCache[nick]===undefined) avCache[nick] = "";
    }catch(e){ if(avCache[nick]===undefined) avCache[nick] = ""; }
    avCacheAt[nick] = Date.now();
    return avCache[nick];
  })();
  avPending[nick] = p;
  try{ return await p; }
  finally{ delete avPending[nick]; }
}
function miniAv(nick, size){
  let b = document.createElement("button"); b.className = "miniAv"; b.title = "ver perfil @"+nick;
  b.textContent = nick.slice(0,1).toUpperCase();
  if(onlineNicks.has(nick)) b.classList.add("on");
  if(/^anon-[a-z0-9]{6,12}$/.test(nick)){ b.style.cursor = "default"; return b; }
  b.onclick = (ev)=>{ ev.stopPropagation(); openProfile(nick); };
  b.dataset.nick = nick;
  getAvatar(nick).then(u=>{ if(!b.isConnected && !document.contains(b)){} if(u){ b.textContent = ""; let old = b.querySelector("img"); if(old) old.remove(); let im = document.createElement("img"); im.src = u; im.loading = "lazy"; im.referrerPolicy = "no-referrer"; im.onerror = ()=>{ try{ im.remove(); }catch(e){} if(!b.querySelector("img")) b.textContent = nick.slice(0,1).toUpperCase(); avCache[nick] = ""; avCacheAt[nick] = 0; }; b.appendChild(im); } });
  return b;
}
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
  let label = fmtViews(target)+" "+(target===1 ? "visita" : "visitas")+" · "+profViewsTier(target);
  if(isMe) label += " · esse é você! divulgue p/ subir 📈";
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
async function openProfile(raw){
  let nick = String(raw||"").replace(/^@/,"").trim();
  if(!nick) return;
  try{ let _pv = document.getElementById("profViews"); if(_pv) _pv.remove(); }catch(e){}
  if(/^anon-[a-z0-9]{6,12}$/.test(nick)){ profSel = ""; profAvatar.textContent = "?"; profNick.textContent = nick; profStats.textContent = "anonimo sem conta"; profDepo.innerHTML = ""; try{ profMural.innerHTML = ""; }catch(e){} try{ profMuteBtn.hidden = true; profBlockBtn.hidden = true; }catch(e){} profModal.hidden = false; return; }
  profSel = nick;
  profAvatar.textContent = nick.slice(0,1).toUpperCase();
  profNick.textContent = "@"+nick;
  try{ paintZNick(profNick, nick); }catch(e){}
  profStats.textContent = "carregando...";
  profModal.hidden = false;
  try{
    let r = JSON.parse(await crpc("profileGet", nick));
    if(!r.ok){ try{ profModal.hidden = true; }catch(e){} showNotFound({icon:"👤", title:"perfil não encontrado", msg:"@"+nick+" não existe no zunzum. Confira o link ou o nick."}); return; }
    profSel = r.nick;
    try{ zNickNoteProfile(r); }catch(e){}
    try{ paintZNick(profNick, r.nick, r.ns||null); profNick.textContent = "@"+r.nick; }catch(e){ profNick.textContent = "@"+r.nick; }
    if(r.avatar){ profAvatar.textContent = ""; let im = document.createElement("img"); im.referrerPolicy = "no-referrer"; im.src = r.avatar; im.onerror = ()=>{ profAvatar.textContent = "?"; }; profAvatar.appendChild(im); }
    let dt = r.created ? new Date(r.created).toLocaleDateString() : "?";
    profStats.innerHTML = "";
    profStats.textContent = "membro desde "+dt+" · posts: "+r.posts+" · curtidas: "+r.likes+" · chat: "+r.pub+" · depoimentos: "+(r.dep||0)+" · convites: "+(r.inv||0);
    try{ profViewHit(r.nick, r.views||0); }catch(e){}
    try{ applyProfTheme(r.th||null); }catch(e){}
    try{ renderProfPg(r.pg||"", r.nick); }catch(e){}
    try{ paintProfOwner(r); }catch(e){}
    try{ location.hash = "perfil-@"+r.nick; }catch(e){}
    loadDepo(r.nick);
    try{ paintProfMod(); }catch(e){}
    try{
      let ch = "mural-"+String(r.nick||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40);
      profMural.innerHTML = '<h3>mural de recados</h3><div class="meta">o nome no mural é digitado livremente e pode ser fake — só depoimentos e DMs são assinados. confira o perfil antes de confiar.</div>';
      let box = document.createElement("div");
      profMural.appendChild(box);
      let mcom = null;
      try{ mcom = root.commentsPlugin({channel:ch, width:"100%", height:"260px",
        onComment:function(c){ try{ zunMuralPing(ch, r.nick, c); }catch(e){} try{ if(ch==="mural-zunzunzinha") zzMuralFeed([c]); }catch(e2){} },
        onLoad:function(cs){ try{ zunMuralSeen(ch, r.nick, cs||[]); }catch(e){} try{ if(ch==="mural-zunzunzinha") zzMuralFeed(cs||[]); }catch(e2){} }
      }); }catch(e){}
      try{ if(mcom && typeof mcom.submit==="function"){ window.zzMuralCom = mcom; window.zzMuralComCh = ch; } }catch(e){}
      try{ box.innerHTML = mcom||""; }catch(e){}
      /* guarda do mural (plugin terceiro): a saída do comments-plugin entra via
         innerHTML por desenho do plugin. Remove o que plugin nenhum precisa p/
         mural funcionar: <script>, <form>, tags de embed e on* / javascript: /
         style ativo — sem isso um comentário malicioso no plugin viraria
         stored-XSS no perfil. (2026-10-26: +form/action/formaction/style.) */
      try{
        box.querySelectorAll("script, iframe, object, embed, link, meta, base, form, style, svg, math, input, button, select, textarea, details, dialog, frame, frameset").forEach(el=>{ try{ el.remove(); }catch(e){} });
        box.querySelectorAll("*").forEach(el=>{
          try{
            for(let i=el.attributes.length-1;i>=0;i--){
              let a = el.attributes[i], n = (a.name||"").toLowerCase(), v = String(a.value||"");
              if(n.indexOf("on")===0){ el.removeAttribute(a.name); continue; }
              if(n==="srcdoc"){ el.removeAttribute(a.name); continue; }
              if(n==="srcset"||n==="lowsrc"||n==="dynsrc"||n==="usemap"){ el.removeAttribute(a.name); continue; }
              if((n==="href"||n==="src"||n==="xlink:href"||n==="action"||n==="formaction"||n==="cite"||n==="data"||n==="background"||n==="poster") && /^\s*(javascript|data|vbscript|file):/i.test(v)){ el.removeAttribute(a.name); continue; }
              if(n==="style"){ let st = v.toLowerCase(); if(st.indexOf("expression(")>=0||st.indexOf("javascript:")>=0||st.indexOf("url(")>=0) el.removeAttribute(a.name); }
            }
          }catch(e){}
        });
        /* realtime do plugin insere nos depois do guard — reaplica sem loop */
        try{
          if(box._muralObs) try{ box._muralObs.disconnect(); }catch(_eMO1){}
          let _mScrubT = null;
          let _muralScrub2 = ()=>{
            try{
              box.querySelectorAll("style, svg, math, input, button, select, textarea").forEach(el=>{ try{ el.remove(); }catch(_eR){} });
              box.querySelectorAll("*").forEach(el=>{
                try{
                  for(let _ai=el.attributes.length-1;_ai>=0;_ai--){
                    let _aa = el.attributes[_ai], _nn = (_aa.name||"").toLowerCase();
                    if(_nn.indexOf("on")===0) el.removeAttribute(_aa.name);
                    else if(_nn==="srcdoc"||_nn==="srcset"||_nn==="lowsrc"||_nn==="dynsrc"||_nn==="usemap") el.removeAttribute(_aa.name);
                  }
                }catch(_eA){}
              });
            }catch(_eS){}
          };
          box._muralObs = new MutationObserver(()=>{ try{ if(_mScrubT) return; _mScrubT = setTimeout(()=>{ _mScrubT = null; _muralScrub2(); }, 60); }catch(_eM){} });
          box._muralObs.observe(box, {childList:true, subtree:true});
        }catch(_eMO){}
      }catch(e){}
    }catch(e){}
  }catch(e){ profStats.textContent = "sem conexao"; }
}
function depoRow(d, target, mode){
  let w = document.createElement("div"); w.style.fontSize = "13px"; w.style.borderTop = "1px dotted #b6c9db"; w.style.padding = "4px 0";
  let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = "@"+d.f;
  nm.title = "ver perfil @"+d.f; nm.onclick = ()=>openProfile(d.f); try{ paintZNick(nm, d.f); }catch(e){} let odd = onDot(d.f); if(odd) nm.appendChild(odd); w.appendChild(nm);
  let tx = document.createElement("span"); tx.innerHTML = (d.t ? ": "+fmtChat(d.t) : ""); w.appendChild(tx);
  if(d.u && d.u.indexOf("https://")===0){ let im = document.createElement("img"); im.referrerPolicy = "no-referrer"; im.src = d.u; im.loading = "lazy"; im.className = "chatimg"; im.onerror = ()=>im.remove(); w.appendChild(im); }
  let m = document.createElement("div"); m.className = "meta"; m.textContent = new Date(d.at).toLocaleString(); w.appendChild(m);
  let auth = ()=>({to:target, nick:me.nick, hash:me.hash});
  if(mode==="pend"){
    let ok = document.createElement("button"); ok.textContent = "aceitar"; ok.style.marginRight = "4px";
    let no = document.createElement("button"); no.textContent = "recusar";
    ok.onclick = async ()=>{ ok.disabled = true; try{ await rpc("depoOk", JSON.stringify(Object.assign(auth(), {id:d.id, v:1}))); cInv("depoGet"); loadDepo(target); }catch(e){ ok.disabled = false; } };
    no.onclick = async ()=>{ no.disabled = true; try{ await rpc("depoOk", JSON.stringify(Object.assign(auth(), {id:d.id, v:0}))); cInv("depoGet"); loadDepo(target); }catch(e){ no.disabled = false; } };
    w.append(ok, no);
  } else if(mode==="del"){
    let x = document.createElement("button"); x.textContent = "apagar"; x.style.marginTop = "2px";
    x.onclick = async ()=>{ if(!confirm("Apagar este depoimento?")) return; x.disabled = true; try{ await rpc("depoDel", JSON.stringify(Object.assign(auth(), {id:d.id}))); cInv("depoGet"); loadDepo(target); }catch(e){ x.disabled = false; } };
    w.appendChild(x);
  }
  return w;
}
async function loadDepo(target){
  profDepo.innerHTML = "";
  let h = document.createElement("div"); h.className = "meta"; h.textContent = "depoimentos"; profDepo.appendChild(h);
  let box = document.createElement("div"); box.style.marginTop = "2px"; profDepo.appendChild(box);
  let list = null;
  try{ list = JSON.parse(await crpc("depoGet", JSON.stringify({to:target, nick:me?me.nick:"", hash:me?me.hash:""}))); }catch(e){}
  if(!list || !list.ok){ box.textContent = "sem conexao"; return; }
  let isOwner = me && me.nick === target;
  if(isOwner && list.pend.length){
    let ph = document.createElement("div"); ph.className = "meta"; ph.textContent = "aguardando sua aprovação ("+list.pend.length+"):"; box.appendChild(ph);
    list.pend.forEach(d=>box.appendChild(depoRow(d, target, "pend")));
  }
  if(!list.acc.length){ let e = document.createElement("div"); e.className = "meta"; e.textContent = "nenhum depoimento ainda."; box.appendChild(e); }
  else list.acc.slice().reverse().forEach(d=>box.appendChild(depoRow(d, target, (isOwner || (me && d.f===me.nick)) ? "del" : "view")));
  if(me && !isOwner){
    let f = document.createElement("div"); f.style.marginTop = "6px";
    let ti = document.createElement("textarea"); ti.placeholder = "escreva um depoimento..."; ti.rows = 4; ti.style.width = "100%"; ti.style.boxSizing = "border-box"; ti.style.marginBottom = "4px";
    let bar = document.createElement("div"); bar.style.margin = "0 0 4px 0";
    /* emoji + GIF da galera (mesmo painel global, com busca pelo nome) */
    let dWrap = document.createElement("span"); dWrap.className = "emojiWrap"; dWrap.style.cssText = "position:relative;display:inline-flex;gap:4px;margin-left:4px";
    let dEb = document.createElement("button"); dEb.type = "button"; dEb.textContent = "😀"; dEb.title = "escolha um emoji";
    dEb.onclick = (ev)=>{ try{ ev.stopPropagation(); }catch(e){} try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(ti); }catch(e2){} };
    let dGb = document.createElement("button"); dGb.type = "button"; dGb.textContent = "GIF"; dGb.title = "GIFs da galera";
    dGb.style.cssText = "font-size:12px;font-weight:bold;border:1px dashed #b6c9db;border-radius:8px";
    dGb.onclick = (ev)=>{ try{ ev.stopPropagation(); }catch(e){} try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(ti, "gm"); }catch(e2){} };
    dWrap.appendChild(dEb); dWrap.appendChild(dGb); bar.appendChild(dWrap);
    let li = document.createElement("input"); li.placeholder = "link de foto https:// (opcional)"; li.style.marginBottom = "4px";
    let sb = document.createElement("button"); sb.textContent = "enviar depoimento";
    let sm = document.createElement("span"); sm.className = "meta"; sm.style.marginLeft = "6px";
    sb.onclick = async ()=>{
      let t = ti.value.trim(), u = li.value.trim();
      if(!t && !u){ sm.textContent = "escreva algo ou coloque foto"; return; }
      if(u && window.zunOkUrl && !window.zunOkUrl(u, 500)){ sm.textContent = "link inválido (use https:// válido)"; return; }
      if(u && u.indexOf("https://")!==0){ sm.textContent = "link precisa começar com https://"; return; }
      sb.disabled = true; sm.textContent = "enviando...";
      try{
        let r2 = JSON.parse(await rpc("depoPush", JSON.stringify({to:target, nick:me.nick, hash:me.hash, text:t.slice(0,300), url:u.slice(0,500)})));
        if(r2.ok){ sm.textContent = "enviado! aparece após aprovação."; ti.value = ""; li.value = ""; cInv("depoGet"); }
        else sm.textContent = "erro: "+(r2.err||"?");
      }catch(e2){ sm.textContent = "sem conexao"; }
      sb.disabled = false;
    };
    f.append(bar, ti, li, sb, sm);
    /* barra big-bbcode compartilhada (B I U S cor tam fonte limpar prévia) */
    try{ if(window.ZunFmtBar) ZunFmtBar.attach(ti, {compact:true, before:bar}); }catch(e2){}
    box.appendChild(f);
  } else if(!me){
    let e = document.createElement("div"); e.className = "meta"; e.style.marginTop = "4px"; e.textContent = "entre com nick+senha para deixar depoimento.";
    box.appendChild(e);
  }
  try{
    let _dn = [];
    ((list&&list.acc)||[]).forEach(d=>{ let n = String((d&&d.f)||""); if(n) _dn.push(n); });
    ((list&&list.pend)||[]).forEach(d=>{ let n = String((d&&d.f)||""); if(n) _dn.push(n); });
    if(_dn.length && typeof ensureZNickStyles==="function") ensureZNickStyles(_dn);
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
      w.textContent = "⚠️ exclusão pedida — sua conta apaga em "+end+" (30 dias). Entre de novo p/ cancelar, ou cancele aqui:";
      let cb = document.createElement("button"); cb.textContent = "cancelar exclusão"; cb.style.marginTop = "6px";
      cb.onclick = async ()=>{
        try{
          let r = JSON.parse(await rpc("accountDelCancel", JSON.stringify({nick:me.nick, hash:me.hash})));
          if(r && r.ok){ me.del = 0; setSession(me); refreshDelStatus(); }
        }catch(e){}
      };
      w.appendChild(document.createElement("br")); w.appendChild(cb);
      box.appendChild(w);
    } else {
      let b = document.createElement("button"); b.textContent = "excluir conta..."; b.style.marginTop = "4px";
      b.onclick = ()=>{
        if(!confirm("Excluir sua conta? Ela fica 30 dias inativa (ninguém vê) e depois apaga de vez. Se entrar de novo antes, a exclusão é cancelada.")) return;
        if(!confirm("Confirma mesmo? Última chance — depois só entrando de novo em 30 dias p/ cancelar.")) return;
        (async ()=>{
          try{
            let r = JSON.parse(await rpc("accountDelReq", JSON.stringify({nick:me.nick, hash:me.hash})));
            if(r && r.ok){ me.del = r.del||Date.now(); setSession(me); refreshDelStatus(); }
            else alert("erro: "+((r&&r.err)||"?"));
          }catch(e){ alert("sem servidor ainda"); }
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
    if(!cz.zcap){ m.textContent = "complete o captcha (arraste até o fim)"; b.disabled = false; return; }
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
      let cred = hn;
      try{
        let tk = newSessToken();
        if(tk){ let sl = JSON.parse(await rpc("sessLogin", JSON.stringify({nick, hash:hn, token:tk}))); if(sl && sl.ok && sl.token) cred = sl.token; }
      }catch(e2){}
      me = {nick:(r.nick||nick), hash:cred, created:r.created||Date.now(), avatar:r.avatar||"", ns:r.ns||null, del:0}; setSession(me);
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
  let posts = [];
  try{ posts = JSON.parse(await crpc("feedGet","")); if(!Array.isArray(posts)) posts = []; }catch(e){ posts = []; }
  let mine = me ? posts.filter(p=>p.n==="@"+me.nick).length : 0;
  if(me && me.avatar){ avatarEl.textContent = ""; let im = document.createElement("img"); im.referrerPolicy = "no-referrer"; im.src = me.avatar; im.onerror = ()=>{ avatarEl.textContent = (me&&me.nick?me.nick:"?").slice(0,1).toUpperCase(); }; avatarEl.appendChild(im); }
  else avatarEl.textContent = (me ? me.nick : anonId).slice(0,1).toUpperCase();
  /* sessão antiga sem foto (trocada em outra aba/aparelho): busca fresca 1x */
  if(me && !me.avatar){
    try{
      let pr = JSON.parse(await crpc("profileGet", me.nick));
      if(pr && pr.ok && pr.avatar){ me.avatar = pr.avatar; try{ setSession(me); }catch(e){} try{ avCache[me.nick] = pr.avatar; avCacheAt[me.nick] = Date.now(); }catch(e){} paintMe(); return; }
    }catch(e){}
  }
  meEl.textContent = me ? "@"+me.nick+" logado" : anonId+" anonimo";
  infoList.innerHTML = me ? "posts seus: "+mine : "status: sem conta<br>chat: bloqueado";
  authBox.innerHTML = "";
  if(me){
    let b = document.createElement("button"); b.textContent = "sair";
    b.onclick = ()=>{ doLogout(); };
    authBox.appendChild(b);
    let mb = document.createElement("button"); mb.style.marginLeft = "6px"; mb.title = "silenciar todas as notificações";    function paintMb(){ let off = false; try{ off = localStorage.getItem("zunzumMuteAll:"+me.nick.toLowerCase())==="1"; }catch(e){} mb.textContent = off ? "🔕 silenciado" : "🔔 avisos"; }
    paintMb();
    mb.onclick = ()=>{ try{ let k = "zunzumMuteAll:"+me.nick.toLowerCase(); localStorage.setItem(k, localStorage.getItem(k)==="1"?"0":"1"); }catch(e){} paintMb(); };
    authBox.appendChild(mb);
    let delBox = document.createElement("div"); delBox.id = "delBox"; delBox.style.marginTop = "8px"; delBox.className = "meta";
    authBox.appendChild(delBox);
    try{ refreshDelStatus(); }catch(e){}
    function avatarDelGet(){ try{ return localStorage.getItem("zunzumAvatarDel:"+me.nick.toLowerCase())||""; }catch(e){ return ""; } }
    function avatarDelSet(d){ try{ if(d) localStorage.setItem("zunzumAvatarDel:"+me.nick.toLowerCase(), d); else localStorage.removeItem("zunzumAvatarDel:"+me.nick.toLowerCase()); }catch(e){} }
    function avatarDelOld(){ try{ var d = avatarDelGet(); avatarDelSet(""); if(d) fetch(d).then(r=>r.json()).catch(()=>{}); }catch(e){} }
    let lb = document.createElement("label"); lb.className = "meta"; lb.style.display = "block"; lb.style.marginTop = "6px"; lb.textContent = "foto de perfil:";
    let fi = document.createElement("input"); fi.type = "file"; fi.accept = "image/*"; fi.style.marginTop = "4px";
    let st = document.createElement("div"); st.className = "meta";
    fi.onchange = async ()=>{
      let f = fi.files[0]; if(!f) return;
      if(!/^image\//.test(f.type||"")){ st.textContent = "só imagem"; return; }
      if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ st.textContent = "svg bloqueado (use png/jpg)"; return; }
      st.textContent = "otimizando...";
      f = await shrinkImage(f, 256, 0.85);
      st.textContent = "enviando...";
      try{
        let up = await zunUpload(f, {expires:Date.now()+1000*60*60*24*90});
        if(up.error){ st.textContent = "erro upload"; return; }
        let r = JSON.parse(await rpc("avatarSet", JSON.stringify({nick:me.nick, hash:me.hash, url:up.url})));
        if(!r.ok){ st.textContent = "erro"; return; }
        avatarDelOld(); avatarDelSet(up.deletionUrl||"");
        me.avatar = r.avatar; setSession(me);
        avCache[me.nick] = r.avatar; avCacheAt[me.nick] = Date.now(); st.textContent = "foto atualizada!";
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
          let bin = atob(m[2].replace(/\s+/g,""));
          let arr = new Uint8Array(bin.length);
          for(let i2=0;i2<bin.length;i2++) arr[i2] = bin.charCodeAt(i2);
          let bb = await shrinkImage(new Blob([arr], {type:m[1].toLowerCase()}), 256, 0.85);
          let up2 = await zunUpload(bb, {expires:Date.now()+1000*60*60*24*90});
          if(up2.error || !up2.url) throw 0;
          u2 = up2.url; newDel = up2.deletionUrl||"";
        }catch(e){ st.textContent = "base64 inválido"; return; }
      }
      if(window.zunOkUrl && !window.zunOkUrl(u2, 500)){ st.textContent = "link inválido (use https:// válido)"; return; }
      if(u2.indexOf("https://")!==0 || /data:|\s/.test(u2)){ st.textContent = "link precisa começar com https://"; return; }
      st.textContent = "salvando...";
      try{
        let r3 = JSON.parse(await rpc("avatarSet", JSON.stringify({nick:me.nick, hash:me.hash, url:u2.slice(0,500)})));
        if(!r3.ok){ st.textContent = "erro"; return; }
        avatarDelOld(); avatarDelSet(newDel);
        me.avatar = r3.avatar; setSession(me);
        avCache[me.nick] = r3.avatar; avCacheAt[me.nick] = Date.now(); st.textContent = "foto atualizada!"; lin.value = "";
        cInv("profileGet"); paintMe();
      }catch(e){ st.textContent = "sem conexao"; }
    };
    authBox.append(ll, lin, lb3);
    if(me.avatar){
      let rm = document.createElement("button"); rm.textContent = "remover foto"; rm.style.marginTop = "4px";
      rm.onclick = async ()=>{ try{ let r = JSON.parse(await rpc("avatarSet", JSON.stringify({nick:me.nick, hash:me.hash, url:""}))); if(r.ok){ avatarDelOld(); me.avatar = ""; setSession(me); avCache[me.nick] = ""; avCacheAt[me.nick] = Date.now(); cInv("profileGet"); paintMe(); } }catch(e){} };
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
        pwMsg.textContent = "trocando...";
        let r = JSON.parse(await rpc("pwChange", JSON.stringify({nick:me.nick, hash:me.hash, proof:hc, newHash:hn, newLen:n1.length})));
        if(!r.ok){
          pwMsg.textContent = r.err==="rate" ? "devagar, aguarde uns segundos e tente de novo" : r.err==="igual" ? "a nova é igual à atual" : r.err==="auth" ? "sessão inválida — entre de novo" : r.err==="atual" ? "senha atual errada" : r.err==="senha-curta" ? "nova senha precisa de 8+ letras" : r.err==="confirme" ? "entre de novo e tente outra vez" : "erro ao trocar ("+(r.err||"?")+")";
          pwGo.disabled = false; return;
        }
        /* servidor derrubou todas as sessões: vincula um token novo */
        let cred = null;
        try{
          let tk = newSessToken();
          if(tk){ let sl = JSON.parse(await rpc("sessLogin", JSON.stringify({nick:me.nick, hash:hn, token:tk}))); if(sl && sl.ok && sl.token) cred = sl.token; }
        }catch(e2){}
        if(cred){ me.hash = cred; setSession(me); }
        else { try{ doLogout(); }catch(e3){} pwMsg.textContent = "senha trocada! ✅ entre de novo com a nova senha"; pwGo.disabled = false; return; }
        pwCur.value = ""; pwNew.value = ""; pwNew2.value = "";
        pwMsg.textContent = "senha trocada! ✅ outros aparelhos vão precisar entrar de novo";
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
      let nick = n.value.trim().replace(/\s+/g,"-").slice(0,20), pw = p.value;
      if(nick.length<2 || pw.length<8){ e.textContent = "nick 2+ e senha 8+ (frase longa)"; return; }
      e.textContent = "verificando captcha...";
      let cz2 = await zunCaptchaTakeH(capH2, nick);
      if(!cz2.zcap){ e.textContent = "complete o captcha (arraste até o fim)"; return; }
      try{
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
        if(!r.ok){ if(r.err==="captcha" && capH2 && capH2.zh){ try{ capH2.zh.reset(); }catch(eR){} } e.textContent = r.err==="senha" ? "senha errada" : r.err==="senha-curta" ? "senha precisa de 8+ letras" : r.err==="dono" ? "conta de teste: só o dono pode criar" : r.err==="captcha" ? "captcha inválido, arraste de novo e tente" : "erro: "+r.err; return; }
        /* sessão opaca: o hash morre aqui — guardamos só o token revogável */
        let cred = h;
        try{
          let tk = newSessToken();
          if(tk){
            let sl = JSON.parse(await rpc("sessLogin", JSON.stringify({nick, hash:h, token:tk})));
            if(sl && sl.ok && sl.token) cred = sl.token;
          }
        }catch(e2){}
        me = {nick:r.nick, hash:cred, created:r.created, avatar:r.avatar||"", ns:r.ns||null, del:r.del||0}; setSession(me);
        /* MIG v1: conta nova já nasce migrada (senha fresca + backend); conta
           antiga cai no painel de recriação antes de usar o app */
        try{
          let cv = JSON.parse(await rpc("cliVer",""));
          if(cv && cv.ok){ if((cv.v|0) > CLI_BUILD){ try{ location.reload(); }catch(eR){} return; } if(cv.mig) MIG_FLAG = 1; }
        }catch(eCv){}
        /* vínculo Bonto (anti-squat, 2026-10-27): conta nova E existente tentam
           garantir a conta vinculada (registro com prova ou link). Falha aqui
           não trava o login no site — recursos novos caem p/ os plugins. */
        if(window.ZunBackend && window.ZunBackend.configured()){
          try{
            var _bj = await window.ZunBackend.login(nick, pw, cz2.zcap);
            migMark(nick);
            if(_bj && _bj.linkErr){ try{ e.textContent = "aviso: conta do servidor novo sem vínculo ("+_bj.linkErr+") — valendo o modo compatível"; }catch(e2){} }
            else { try{ e.textContent = "servidor novo vinculado ✅"; }catch(e2){} }
          }catch(eB){
            var _bec0 = String((eB && eB.code)||"erro");
            if(_bec0==="sem-vinculo"||_bec0==="nick-divergente"){ try{ e.textContent = "servidor novo: sem vínculo com este nick do site ("+_bec0+") — avise o dono"; }catch(e2){} }
            else { try{ e.textContent = "servidor novo: "+_bec0+" — tente de novo"; }catch(e2){} }
          }
        }
        if(r.weak || (MIG_FLAG && !migDone(nick))){ pendingMigNick = nick; try{ localStorage.removeItem("zunMigV1:"+String(nick||"").toLowerCase()); }catch(_eMW){} await doLogout(); showMigPanel(); return; }
        if(r.restored){ try{ e.textContent = "exclusão cancelada — bem-vindo de volta! 🎉"; }catch(e2){} }
        try{ if(me && me.nick) znickCache[me.nick.toLowerCase()] = me.ns||null; }catch(e2){}
        paintMe(); paintLocks(); loadPub(); loadPriv(); subDepo(); subInv(); subAppr(); autoJoinPriv(); autoJoinRoom(); loadRooms(); loadPendingInvites(); loadPendingReqs(); loadPresence(); checkPendingDepo(); autoPublishMe();
        try{ ensureDono(); }catch(e2){}
        try{ if(window.zunDMOnLogin) window.zunDMOnLogin(); }catch(e2){}
      }catch(err){ e.textContent = "sem servidor ainda"; }
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
  btn.title = "gera um novo anon-xxxx; posts antigos continuam com o antigo (tokens guardados aqui)";
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
function anonTokPanel(){
  try{
    let s = anonTokStore();
    let owns = Object.keys(s.own||{}), items = Object.keys(s.items||{});
    let msg = "ANON ATUAL: "+anonId+"\n";
    msg += "token identidade: "+(anonTokGet(anonId)?"guardado ✅ (só este navegador edita/apaga)":"ainda não (nasce no 1º post/like) ")+"\n";
    msg += "anons com token aqui: "+owns.length+" | posts/respostas com token: "+items.length+"\n\n";
    msg += "Opções (digite):\n1 = copiar token do anon atual\n2 = exportar tudo (copiar)\n3 = importar (colar)\n\n";
    msg += owns.slice(0,10).map(a=>"• "+a).join("\n");
    let op = prompt(msg+"", "1");
    if(op===null) return;
    op = String(op).trim();
    if(op==="1"){
      let t = anonTokGet(anonId);
      if(!t){ alert("sem token ainda — poste algo primeiro."); return; }
      try{ navigator.clipboard.writeText(t); alert("token copiado! Guarde: "+t); }
      catch(e){ prompt("copie o token:", t); }
    } else if(op==="2"){
      let j = JSON.stringify(s);
      try{ navigator.clipboard.writeText(j); alert("exportado ("+owns.length+" anons, "+items.length+" itens). Cole no outro aparelho via opção 3."); }
      catch(e){ prompt("copie o backup:", j); }
    } else if(op==="3"){
      let j = prompt("cole o backup exportado no outro aparelho:");
      if(!j) return;
      let o = JSON.parse(j);
      if(!o || typeof o!=="object" || !o.own) throw 0;
      anonTokSave({own:o.own||{}, items:o.items||{}});
      alert("tokens importados! ✅");
      try{ paintAnonRow(); }catch(e){}
    }
  }catch(e){ alert("backup inválido"); }
}
function paintLocks(){
  pubLock.textContent = me ? "logado como @"+me.nick : "entre com nick+senha a esquerda.";
  try{
    if(me && curRole && curRole.banned) pubLock.textContent = "🚫 você foi banido desta sala.";
    else if(me && pubRoom && pubRoom!=="geral"){ let rn = curRoomMeta && curRoomMeta.name ? curRoomMeta.name : pubRoom; pubLock.textContent = "logado como @"+me.nick+" em "+rn; }
  }catch(e){}
  let locked = privInfo.locked && privRoom ? 1 : 0;
  let isOwner = me && privRoom && privInfo.owner && privInfo.owner.toLowerCase()===me.nick.toLowerCase() ? 1 : 0;
  let canRead = !locked || privInfo.member || isOwner ? 1 : 0;
  if(!me) privLock.textContent = "precisa logar.";
  else if(!privRoom) privLock.textContent = "entre numa sala.";
  else if(locked && !canRead) privLock.textContent = "🔒 sala trancada por @"+privInfo.owner+" — só entra quem ele aprovar.";
  else if(locked) privLock.textContent = "🔒 sala trancada (só aprovados leem)";
  else privLock.textContent = "🔓 sala: "+privRoom+" (aberta p/ quem tem o código)";
  try{
    if(me && privRoom){
      if(privInfo && privInfo.claimed) privLock.textContent += " · 🏠 você assumiu esta sala órfã — tranque e guarde o código.";
      else if(privInfo && privInfo.owner==="" ) privLock.textContent += " · 🏠 sem dono — peça p/ assumir.";
      if(privRoom && !privIsStrong(privRoom)) privLock.textContent += " · ⚠️ código fraco (anti-clone: gere um forte).";
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
function eroNorm(s){ return String(s||"").toLowerCase(); }
function eroMode(){
  try{
    var m = localStorage.getItem("zunzumEroMode");
    if(m==="blur"||m==="hide"||m==="show") return m;
    if(localStorage.getItem("zunzumShowErotic")==="1") return "show";
    return "hide";
  }catch(e){ return "hide"; }
}
function showErotic(){ return eroMode()==="show"; }
function eroHide(){ return eroMode()==="hide"; }
function eroLang(){ try{ var l = String(window.zunzumLang||"pt").slice(0,2).toLowerCase(); return (l==="en"||l==="es") ? l : "pt"; }catch(e){ return "pt"; } }
function isEroticText(t){
  if(!t) return false;
  let s = " "+eroNorm(t)+" ";
  let re = /(tesa[oi]|gozar|gozo|punheta|siririca|boquete|chupar |chupei|transar|foder|trepar|orgasmo|clitoris|buceta|xota|grelo|\bpica\b|\bpau\b|caralho|\brola\b|cacete|peit[ao]|seios|bunda|\bcu\b|cuzinho|anal|safad[ao]|gostos[ao]|pelad[ao]|putaria|puta\b|corno|chifr|swing|menage|suruba|orgia|masturba|gemid[ao]|gemer|fetiche|bdsm|foda\b|tesao|tesão|onlyfans|privacy\b|acompanhante|garota de programa|motel|nude\b|nudes|naked|nsfw|novinha|novinho|\bsexo\b|erotico|erótico|porn|xvideos|redtube|hentai|camgirl|webcam.*sex|sex.*webcam|kama sutra|kamasutra|69\b|pau duro|pinto\b|vagina|penis|pussy|dick\b|cock\b|boobs|tits\b|ass\b|pussy)/;
  return re.test(s);
}
function paintErotic(outer, blurEls, kind, bare){
  if(eroMode()==="show" || !blurEls.length) return;
  var hide = (eroMode()==="hide");
  try{ if(outer && outer.classList) outer.classList.add("zz-ero"); }catch(e){}
  blurEls.forEach(el=>{ try{ el.classList.add(hide?"zz-hide":"zz-blur"); }catch(e){} });
  if(bare) return;
  let bar = document.createElement("div"); bar.className = "zz-erobar";
  let barTxt = hide ? "🔞 conteúdo erótico oculto" : "🔞 conteúdo erótico embaçado", showTxt = "mostrar";
  try{
    let lg = eroLang();
    if(kind==="furry"){
      if(hide){ barTxt = lg==="en" ? "🐾 furry content hidden" : (lg==="es" ? "🐾 contenido furry oculto" : "🐾 conteúdo furry oculto"); }
      else { barTxt = lg==="en" ? "🐾 furry content blurred" : (lg==="es" ? "🐾 contenido furry difuminado" : "🐾 conteúdo furry embaçado"); }
      showTxt = lg==="en" ? "show" : "mostrar";
    }
    else if(hide){ barTxt = lg==="en" ? "🔞 erotic content hidden" : (lg==="es" ? "🔞 contenido erótico oculto" : "🔞 conteúdo erótico oculto"); showTxt = lg==="en" ? "show" : "mostrar"; }
    else if(lg==="en"){ barTxt = "🔞 erotic content blurred"; showTxt = "show"; } else if(lg==="es"){ barTxt = "🔞 contenido erótico difuminado"; showTxt = "mostrar"; }
  }catch(e){}
  bar.appendChild(document.createTextNode(barTxt));
  let b = document.createElement("button"); b.textContent = showTxt;
  b.onclick = (ev)=>{ ev.stopPropagation(); blurEls.forEach(el=>{ try{ el.classList.remove("zz-blur"); el.classList.remove("zz-hide"); }catch(e){} }); bar.remove(); };
  bar.appendChild(b);
  outer.insertBefore(bar, outer.firstChild);
}
// Foto sem veredito nasce oculta/embaçada até a IA verificar (corrige furo do Cloudflare lento).
function paintPending(outer, im, av){
  if(eroMode()==="show") return null;
  try{
    if(im.classList && (im.classList.contains("zz-blur")||im.classList.contains("zz-hide"))) return im._pendBar||null;
    if(im._pendBar && im._pendBar.isConnected) return im._pendBar;
  }catch(e){}
  var hide = (eroMode()==="hide");
  try{ if(outer && outer.classList) outer.classList.add("zz-ero"); }catch(e){}
  try{ im.classList.add(hide?"zz-hide":"zz-blur"); im.setAttribute("data-ero-pend","1"); }catch(e){}
  if(av) return null;
  let bar = document.createElement("div"); bar.className = "zz-pendbar"; bar.setAttribute("data-ero-pend-bar","1");
  let lg = eroLang();
  let t = lg==="en" ? "⏳ checking photo…" : (lg==="es" ? "⏳ verificando foto…" : "⏳ verificando foto…");
  let sp = document.createElement("span"); sp.className = "spin"; bar.appendChild(sp);
  bar.appendChild(document.createTextNode(" "+t));
  try{ outer.insertBefore(bar, outer.firstChild); }catch(e){ return null; }
  try{ im._pendBar = bar; }catch(e){}
  return bar;
}
function unpaintPending(im){
  try{ im.classList.remove("zz-blur"); im.classList.remove("zz-hide"); }catch(e){}
  try{ im.removeAttribute("data-ero-pend"); }catch(e){}
  try{ if(im._pendBar && im._pendBar.parentNode) im._pendBar.parentNode.removeChild(im._pendBar); }catch(e){}
  try{ im._pendBar = null; }catch(e){}
}
// IA falhou / sem veredito: mantém protegido, mas deixa mostrar manual.
function paintUnverified(outer, im, av){
  if(eroMode()==="show") return;
  var hide = (eroMode()==="hide");
  try{ if(outer && outer.classList) outer.classList.add("zz-ero"); }catch(e){}
  try{ im.classList.add(hide?"zz-hide":"zz-blur"); }catch(e){}
  if(av) return;
  let bar = null;
  try{ bar = im._pendBar && im._pendBar.isConnected ? im._pendBar : null; }catch(e){ bar = null; }
  let lg = eroLang();
  let t = lg==="en" ? "⚠️ photo not verified" : (lg==="es" ? "⚠️ foto no verificada" : "⚠️ foto não verificada");
  let showTxt = lg==="en" ? "show" : "mostrar";
  if(bar){
    try{
      bar.className = "zz-erobar"; bar.innerHTML = "";
      bar.appendChild(document.createTextNode(t));
      let b = document.createElement("button"); b.textContent = showTxt;
      b.onclick = (ev)=>{ ev.stopPropagation(); try{ im.classList.remove("zz-blur"); im.classList.remove("zz-hide"); }catch(e){} bar.remove(); try{ im._pendBar = null; }catch(e){} };
      bar.appendChild(b);
    }catch(e){}
    return;
  }
  let bar2 = document.createElement("div"); bar2.className = "zz-erobar";
  bar2.appendChild(document.createTextNode(t));
  let b2 = document.createElement("button"); b2.textContent = showTxt;
  b2.onclick = (ev)=>{ ev.stopPropagation(); try{ im.classList.remove("zz-blur"); im.classList.remove("zz-hide"); }catch(e){} bar2.remove(); };
  bar2.appendChild(b2);
  try{ outer.insertBefore(bar2, outer.firstChild); }catch(e){}
}
function syncEroTgl(){
  try{
    let m = eroMode();
    let v = (m==="show");
    document.querySelectorAll(".eroTgl").forEach(c=>{ c.checked = v; });
    let lg = eroLang();
    document.querySelectorAll(".eroLbl").forEach(el=>{ try{ el.textContent = lg==="en" ? "🔞 erotic:" : (lg==="es" ? "🔞 erótico:" : "🔞 erótico:"); }catch(e){} });
    document.querySelectorAll(".eroModeSel").forEach(s=>{
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
var ERO_IMG_KEY = "zunzumEroImg2", _eroMig = false;
function eroImgMap(){
  try{
    if(!_eroMig){
      _eroMig = true;
      if(!localStorage.getItem(ERO_IMG_KEY)){
        try{
          var o = JSON.parse(localStorage.getItem("zunzumEroImg")||"{}"), n = {}, ks = Object.keys(o||{});
          ks.forEach(function(k){ if(o[k]===1) n[k]=1; });
          if(ks.length) localStorage.setItem(ERO_IMG_KEY, JSON.stringify(n));
        }catch(e){}
      }
    }
    return JSON.parse(localStorage.getItem(ERO_IMG_KEY)||"{}");
  }catch(e){ return {}; }
}
function eroImgCacheGet(u){
  try{
    var v = eroImgMap()[trHash(String(u||""))];
    return (v===1) ? 1 : (v===2 ? 2 : (v===0 ? 0 : null));
  }catch(e){ return null; }
}
function eroImgCacheSet(u, v){
  try{
    var m = eroImgMap();
    m[trHash(String(u||""))] = (v===2) ? 2 : (v?1:0);
    var ks = Object.keys(m);
    if(ks.length>300){ ks.slice(0, ks.length-300).forEach(function(k){ delete m[k]; }); }
    localStorage.setItem(ERO_IMG_KEY, JSON.stringify(m));
  }catch(e){}
}
let eroVQ = [], eroVBusy = 0;
function eroScanMedia(scope){
  if(eroMode()==="show") return;
  try{
    scope.querySelectorAll('.post img:not([data-yt]), .chatlog img:not([data-yt]), .nmsg img:not([data-yt])').forEach(function(im){
      if(!im || im.dataset.eroScan) return;
      try{ if(im.closest && im.closest("#zEmojiPanel")){ im.dataset.eroScan = "1"; return; } }catch(e0){}
      try{ var pp = im.closest ? im.closest(".post") : null; if(pp && pp.dataset && pp.dataset.aiPost){ im.dataset.eroScan = "1"; return; } }catch(e){}
      var u = im.currentSrc || im.src || "";
      if(!u || u.indexOf("https://")!==0) return;
      im.dataset.eroScan = "1";
      var avBtn = (im.closest && im.closest(".miniAv")) || null;
      var outer = avBtn || (im.closest && (im.closest(".post") || im.closest(".chatlog > div") || im.closest(".nmsg"))) || im.parentNode;
      var hit = eroImgCacheGet(u);
      if(hit===1||hit===2){ try{ paintErotic(outer, [im], hit===2?"furry":null, !!avBtn); }catch(e){} return; }
      if(hit===0) return;
      // sem veredito: oculta/embaça na hora, até o verify + IA responderem
      try{ paintPending(outer, im, !!avBtn); }catch(e){}
      eroVQ.push({im:im, outer:outer, url:u, av:!!avBtn});
    });
  }catch(e){ return; }
  eroVPump();
}
function eroVPump(){
  if(eroMode()==="show"){ eroVQ = []; return; }
  if(!root.generateText || !root.superFetch){
    if(eroVQ.length && !window._eroPumpRetry){
      window._eroPumpRetry = true;
      setTimeout(function(){ try{ window._eroPumpRetry = false; }catch(e){} try{ eroVPump(); }catch(e){} }, 2000);
    }
    return;
  }
  while(eroVBusy<2 && eroVQ.length){
    var job = eroVQ.shift();
    try{ if(!job.im.isConnected) continue; }catch(e){ continue; }
    eroVBusy++;
    (function(j){
      eroVisionOne(j.url).then(function(res){
        eroVBusy--;
        try{
          if(!j.im.isConnected){ eroVPump(); return; }
          try{ unpaintPending(j.im); }catch(e){}
          if(eroMode()==="show"){ eroVPump(); return; }
          var isEro = !!(res && res.e===true), isFur = !!(res && res.f===true);
          if(isEro) eroImgCacheSet(j.url, 1);
          else if(isFur) eroImgCacheSet(j.url, 2);
          else if(res && res.e===false && res.f===false){ eroImgCacheSet(j.url, 0); eroVPump(); return; }
          else {
            if(j.im.isConnected) paintUnverified(j.outer, j.im, !!j.av);
            eroVPump(); return;
          }
          if((isEro||isFur) && j.im.isConnected) paintErotic(j.outer, [j.im], (isFur&&!isEro)?"furry":null, !!j.av);
        }catch(e){}
        eroVPump();
      }).catch(function(){
        eroVBusy--;
        try{
          try{ unpaintPending(j.im); }catch(e){}
          if(j.im.isConnected && eroMode()!=="show") paintUnverified(j.outer, j.im, !!j.av);
        }catch(e){}
        eroVPump();
      });
    })(job);
  }
}
async function eroVisionOne(url){
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
    var eroPre = "Analise esta foto. Responda SO com JSON, sem mais nada: {\"erotic\":true|false, \"furry\":true|false}. erotic=true se ha nudez, genital, seios a mostra, ato sexual ou insinuacao sexual forte. furry=true SOMENTE se houver personagem bicho antropomorfico: mamifero peludo (focinho, orelhas de bicho, rabo peludo, patas), ou reptil/dragao com corpo de bicho em pe (scalie: focinho, chifres, cauda, garras), fursuit ou arte furry/yiff. NAO marque insetos (abelha, formiga), passaros, peixes, mascotes cartoon sem pelo, nem humano fantasiado com orelhinha.";
    if(sheet && sheet.multi) eroPre += " A imagem é uma grade com 9 quadros do início, meio e fim de um GIF animado: vale QUALQUER quadro.";
    var out = String(await zunText({instruction:[eroPre, blob]})||"");
    var p1 = out.indexOf("{"), p2 = out.lastIndexOf("}");
    if(p1>=0 && p2>p1){
      try{
        var pj = JSON.parse(out.slice(p1,p2+1));
        if(pj.erotic===true) return {e:true, f:(pj.furry===true)};
        if(pj.erotic===false && (pj.furry===true||pj.furry===false)) return {e:false, f:pj.furry};
      }catch(e){}
    }
    var me = /"erotic"\s*:\s*true/.test(out) ? true : (/"erotic"\s*:\s*false/.test(out) ? false : null);
    if(me===null) return null;
    var mf = /"furry"\s*:\s*true/.test(out);
    if(me===false && !mf && !/"furry"\s*:\s*false/.test(out)) return null;
    return {e:me, f:mf};
  }catch(e){ return null; }
}
function setEroMode(m){
  try{
    if(m!=="blur"&&m!=="hide"&&m!=="show") return;
    localStorage.setItem("zunzumEroMode", m);
    localStorage.setItem("zunzumShowErotic", m==="show"?"1":"0");
  }catch(e){}
  try{ eroVQ = []; }catch(e){}
  try{
    document.querySelectorAll("img[data-ero-pend]").forEach(function(im){ try{ unpaintPending(im); }catch(e){} });
    document.querySelectorAll(".zz-pendbar").forEach(function(b){ try{ b.remove(); }catch(e){} });
  }catch(e){}
  syncEroTgl();
  try{ loadFeed(); }catch(e){}
  try{ loadPub(); }catch(e){}
  try{ if(typeof loadPriv==="function") loadPriv(true); }catch(e){}
}
function initEroTgl(){
  try{
    document.querySelectorAll(".eroTgl").forEach(c=>{
      c.addEventListener("change", ()=>{ setEroMode(c.checked?"show":"hide"); });
    });
    document.querySelectorAll(".eroModeSel").forEach(s=>{
      s.addEventListener("change", ()=>{ setEroMode(s.value); });
    });
    syncEroTgl();
  }catch(e){}
}
try{ window.eroScanMedia = eroScanMedia; window.eroMode = eroMode; window.setEroMode = setEroMode; }catch(e){}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", initEroTgl); else initEroTgl();
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
    let ds = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip")));
    let out = await ds.arrayBuffer();
    let blob = new Blob([out], {type:oname&&oname.indexOf("/")>0?oname:"application/octet-stream"});
    let a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = String(oname).indexOf("/")>0 ? "arquivo" : String(oname).replace(/\.gz$/,"");
    document.body.appendChild(a); a.click(); setTimeout(()=>{ try{ URL.revokeObjectURL(a.href); a.remove(); }catch(e){} }, 4000);
    b.textContent = old; b.disabled = false;
  }catch(e){ try{ ev.target.disabled = false; ev.target.textContent = "erro"; }catch(e2){} }
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
async function trFetchOne(text, tl){
  var q = String(text||"").slice(0,450);
  if(!q.trim() || window._trQuotaDead) return null;
  var url = "https://api.mymemory.translated.net/get?q="+encodeURIComponent(q)+"&langpair=pt|"+tl;
  var r = await zunFetch(url);
  var j = null;
  try{ j = await r.json(); }catch(e){ try{ j = JSON.parse(await r.text()); }catch(e2){ return null; } }
  if(!j || !j.responseData) return null;
  if(j.quotaFinished){ try{ window._trQuotaDead = true; }catch(e){} return null; }
  var out = String(j.responseData.translatedText||"").trim();
  if(!out || out===q.trim()) return null;
  return out;
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
function trApply(scope){  var tl = trTargetLang();
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
  while(trBusy<4 && trQueue.length){
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
  nm.title = "ver perfil @"+nick;
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
  try{
    /* botão ↩ explícito (mobile/descoberta): mesmo efeito do clique no texto */
    let qb = document.createElement("button"); qb.className = "msgDel msgQuote"; qb.textContent = "↩"; qb.title = "citar";
    qb.onclick = (ev)=>{ try{ if(ev) ev.stopPropagation(); }catch(e){} zunQuoteInsert(inputEl, zunQuoteOf(x)); };
    d.appendChild(qb);
  }catch(e){}
  let tm = document.createElement("span"); tm.className = "meta"; tm.style.marginLeft = "6px"; tm.textContent = chatTime(x.at);
  if(tm.textContent) d.appendChild(tm);
  try{ if(isEroticText(x.t)){ let els = [tt]; if(fs) els.push(fs); paintErotic(d, els); } }catch(e){}
  return d;
}
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
    return t.length+"|"+u.length+"|"+String(x.y||"")+"|"+(x.ed?1:0)+"|"+t.slice(0,24)+"|"+t.slice(-16)+"|"+u.slice(0,48);
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
      try{ eroScanMedia(r); }catch(e){}
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
function sigFeed(posts){ try{ let l=0, rp=0, ch=0; posts.forEach(p=>{ l+=(p.lk||[]).length; rp+=(p.rp||[]).length; ch+=String(p.t||"").length+String(p.u||"").length+(p.ed?7:0)+String(p.id||"").length; (p.rp||[]).forEach(r=>{ ch+=String(r.t||"").length+(r.ed?7:0)+String(r.id||"").length+String(r.to||"").length; }); }); return posts.length+"|"+(posts.length?posts[posts.length-1].at:0)+"|"+l+"|"+rp+"|"+ch; }catch(e){ return ""; } }
function sigChat(m){ try{ let l=m.slice(-30), ch=0; l.forEach(x=>{ ch+=String(x.t||"").length+String(x.u||"").length+(x.ed?7:0)+String(x.id||"").length; }); return m.length+"|"+(l.length?l[l.length-1].at:0)+"|"+(l.length?String(l[l.length-1].t||"").length:0)+"|"+ch; }catch(e){ return ""; } }
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
  if(r.err==="spam") return "🚫 spam! aguarde "+w+"s";
  if(r.err==="devagar") return "⏳ devagar! aguarde "+w+"s";
  if(r.err==="ban") return "🚫 você foi banido desta sala";
  if(r.err==="inativa") return "conta em exclusão — entre de novo p/ cancelar";
  if(r.err==="anon-taken") return "esse anon já tem dono — girando p/ um livre...";
  if(r.err==="dono") return "sem token deste anon aqui — abra no navegador onde postou";
  return "erro: "+(r.err||"?");
}
function flashBtn(btn, txt){
  try{
    let old = btn.textContent; btn.textContent = txt;
    setTimeout(()=>{ try{ if(btn.textContent===txt) btn.textContent = old; }catch(e){} }, 3000);
  }catch(e){}
}
async function loadFeed(force){
  try{
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
  }catch(e){ if(!paintedFeed){ try{ feedCtn.innerHTML = "<span class='meta'>conectando servidor...</span>"; }catch(e2){} } }
}
function feedReplyNode(r, depth, onAns, p, onChanged){
  let rd = document.createElement("div");
  rd.className = "freply";
  if(depth>0){ rd.style.marginLeft = (Math.min(depth,4)*16)+"px"; rd.style.borderLeft = "3px solid #6aa5d7"; }
  let fh = document.createElement("div"); fh.className = "frhead";
  let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = r.n;
  if(String(r.n||"").charAt(0)==="@"){ nm.title = "ver perfil "+r.n; nm.onclick = ()=>openProfile(r.n); try{ paintZNick(nm, String(r.n).slice(1)); }catch(e){} }
  fh.appendChild(nm);
  try{ let _rt2 = zunRelTime(r.at); if(_rt2.t){ let tm2 = document.createElement("span"); tm2.className = "ptime"; tm2.textContent = _rt2.t; if(_rt2.a) tm2.title = _rt2.a; fh.appendChild(tm2); } }catch(e){}
  rd.appendChild(fh);
  let fb = document.createElement("div"); fb.className = "frbody";
  let tx = document.createElement("span"); tx.className = "ptext"; tx.dataset.plain = (r.t||"")+(r.ed?" (editada)":""); tx.innerHTML = fmtChat(tx.dataset.plain); fb.appendChild(tx);
  rd.appendChild(fb);
  try{ ytFacadesFor(r.t, 1).forEach(function(f){ fb.appendChild(f); }); }catch(e){}
  try{ if(isEroticText(r.t)) paintErotic(rd, [tx]); }catch(e){}
  let act = document.createElement("div"); act.className = "fract";
  let ans = document.createElement("button"); ans.textContent = "responder";
  ans.onclick = (ev)=>{ ev.stopPropagation(); if(onAns) onAns({id:r.id, n:r.n}); };
  act.appendChild(ans);
  try{
    if(p && p.id && r.id && r.n===myKey()){
      let eb = document.createElement("button"); eb.textContent = "✏️"; eb.title = "editar resposta";
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
          sv.disabled = true;
          try{
            let rr = JSON.parse(await rpc("replyEdit", JSON.stringify(anonEditPayload(Object.assign(likePayload(p.id), {rid:r.id, text:t.slice(0,300)}), r.id))));
            if(!rr.ok){ flashBtn(sv, spamErrText(rr)||"erro"); sv.disabled = false; return; }
            cInv("feedGet"); loadFeed(true);
          }catch(e){ sv.disabled = false; }
        };
      };
      let db = document.createElement("button"); db.textContent = "🗑️"; db.title = "apagar resposta";
      db.onclick = async (ev)=>{
        ev.stopPropagation();
        if(!confirm("apagar esta resposta?")) return;
        try{
          let rr = JSON.parse(await rpc("replyDel", JSON.stringify(anonEditPayload(Object.assign(likePayload(p.id), {rid:r.id}), r.id))));
          if(!rr.ok){ flashBtn(db, spamErrText(rr)||"erro"); return; }
          cInv("feedGet"); loadFeed(true);
        }catch(e){}
      };
      act.appendChild(eb); act.appendChild(db);
    }
  }catch(e){}
  rd.appendChild(act);
  return rd;
}
function renderFeedReplies(rlist, p, onAns){
  try{
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
  }catch(e){}
}
function feedExpectedPosts(posts){
  try{
    return posts.slice().reverse().slice(0, window._feedShown||20).filter(p=>{ try{ return !zunBlocked(String(p.n||"").replace(/^@/,"")); }catch(e){ return true; } });
  }catch(e){ return []; }
}
/* Mesma lista de posts na mesma ordem? Atualiza curtidas/contadores e as
   respostas das caixas ABERTAS no lugar, com âncora localizada. Evita o
   rebuild completo (que recarregava todas as imagens e pulava o scroll)
   a cada curtida. Retorna true se resolveu. */
function patchFeedInPlace(posts){
  try{
    if(!paintedFeed || !feedCtn || !feedCtn.isConnected) return false;
    if(window._paintFeedMe!==myKey()) return false;
    let exp = feedExpectedPosts(posts);
    let els = [...feedCtn.querySelectorAll(":scope > .post")];
    if(!els.length || els.length!==exp.length) return false;
    let map = {}; posts.forEach(p=>{ if(p && p.id) map[p.id] = p; });
    for(let i=0;i<els.length;i++){ if(!exp[i] || !exp[i].id || els[i].dataset.pid!==exp[i].id) return false; }
    let anc = null;
    try{ anc = zAnchorSave(feedCtn, ".post", el=>el.dataset.zat); }catch(e){}
    for(let i=0;i<els.length;i++){
      let p = map[exp[i].id]; if(!p) return false;
      try{
        let myR = (p.rx && p.rx[myKey()]) || (((p.lk||[]).indexOf(myKey())>=0) ? "curti" : null);
        let lb = els[i].querySelector("[data-lkbtn]");
        if(lb){ lb.textContent = reactLabel(p, myR); try{ let cc = reactCountsLocal(p); lb.title = (p.lk||[]).length ? Object.keys(cc).map(k=>reactEmoji(k)+" "+k+": "+cc[k]).join(" · ") : ""; }catch(e){} }
        let rb2 = els[i].querySelector("[data-rct]");
        if(rb2) rb2.textContent = "respostas ("+((p.rp||[]).length)+")";
        try{
          let ptx = els[i].querySelector(":scope > div > .ptext, :scope > .ptext");
          let want = (p.t||"")+(p.ed?" (editada)":"");
          let cur = (ptx && ptx.dataset.plain!=null) ? ptx.dataset.plain : (ptx ? ptx.textContent : null);
          if(ptx && !ptx.querySelector("input") && cur !== (": "+want) && cur !== want){
            let pref = String(cur||"").indexOf(": ")===0 ? ": " : "";
            ptx.dataset.plain = pref+want; ptx.innerHTML = fmtChat(ptx.dataset.plain);
          }
        }catch(e){}
        let rbox = els[i].querySelector("[data-pid]");
        /* atualiza a lista de respostas mesmo com a caixa FECHADA: antes só
           a caixa aberta era re-renderizada no patch, então abrir a caixa
           depois mostrava as respostas velhas do paint (novas "escondidas"
           até um rebuild completo). Render escondido é barato e deixa o
           abrir sempre fresco. */
        if(rbox && typeof rbox._feedRender==="function"){
          let rlist = els[i].querySelector("[data-rlist]");
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
    try{ if(anc) zAnchorRestore(feedCtn, ".post", el=>el.dataset.zat, anc); }catch(e){}
      try{ zTrustSave(feedCtn, ".post", el=>el.dataset.zat); }catch(e){}
      seenAtFeed = maxAtSince(posts); paintedFeed = true; paintSigFeed = sigFeed(posts);
      try{ window._paintFeedMe = myKey(); }catch(e){}
      return true;
  }catch(e){ return false; }
}
/* edição inline de post próprio do feed */
function feedEditInline(postEl, p, ptx){
  try{
    if(!postEl || postEl.querySelector(".feedEditBox")) return;
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
      sv.disabled = true;
      try{
        let r = JSON.parse(await rpc("feedEdit", JSON.stringify(anonEditPayload(Object.assign(likePayload(p.id), {text:t.slice(0,500), url:p.u||"", mtype:p.y||""}), p.id))));
        if(!r.ok){ flashBtn(sv, spamErrText(r)||"erro"); sv.disabled = false; return; }
        cInv("feedGet"); loadFeed(true);
      }catch(e){ sv.disabled = false; }
    };
  }catch(e){}
}
function paintFeed(posts){
  try{
    let openIds = {}, st = 0, sh0 = 0, ancF = null;
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
    feedCtn.innerHTML = posts.length ? "" : "<span class='meta'>vazio</span>";
    try{ if(posts.length !== (window._feedTotal||-1) && (window._feedShown||20) >= posts.length) window._feedShown = 20; }catch(e){}
    window._feedTotal = posts.length;
    posts.slice().reverse().slice(0, window._feedShown||20).forEach(p=>{
      try{ if(zunBlocked(String(p.n||"").replace(/^@/,""))) return; }catch(e){}
      let d = document.createElement("div"); d.className = "post";
      let an0 = String((p&&p.n)||"");
      try{ d.dataset.zat = String((p&&p.at)||0)+"|"+an0+"|"+String((p&&p.id)||""); }catch(e){}
      try{ if(p && p.id) d.dataset.pid = p.id; }catch(e){}
      let an = an0;
      let ptx = null;
      if(an==="📢support-zunzum"){ d.dataset.annPost = "1"; }
      else if(an==="🤖Zunzim·IA"){ d.dataset.aiPost = "1"; }
      let head = document.createElement("div"); head.className = "phead";
      let who = document.createElement("span"); who.className = "who";
      if(an.charAt(0)==="@"){ who.appendChild(miniAv(an.slice(1))); let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = an; nm.title = "ver perfil "+an; nm.onclick = ()=>openProfile(an); try{ paintZNick(nm, an.slice(1)); }catch(e){} who.appendChild(nm); let odf = onDot(an.slice(1)); if(odf) who.appendChild(odf); }
      else { let nm2 = document.createElement("span"); nm2.className = "chatname"; nm2.textContent = an; who.appendChild(nm2); }
      head.appendChild(who);
      try{ let _rt = zunRelTime(p.at); let tm = document.createElement("span"); tm.className = "ptime"; tm.textContent = _rt.t; if(_rt.a) tm.title = _rt.a; head.appendChild(tm); }catch(e){}
      d.appendChild(head);
      let pbody = document.createElement("div"); pbody.className = "pbody";
      let tx = document.createElement("span"); tx.className = "ptext"; tx.dataset.plain = (p.t||"")+(p.ed?" (editada)":""); tx.innerHTML = fmtChat(tx.dataset.plain); pbody.appendChild(tx); ptx = tx;
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
      try{ if(!d.dataset.aiPost && !d.dataset.annPost && isEroticText(p.t)){ let els = []; if(ptx) els.push(ptx); if(pmedia) els.push(pmedia); paintErotic(d, els); } }catch(e){}
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
      rb.textContent = "respostas ("+rc+")";
      try{ if(p && p.id) rb.dataset.rct = p.id; }catch(e){}
      let rbox = document.createElement("div"); rbox.hidden = true; rbox.style.marginTop = "6px"; rbox.dataset.pid = p.id;
      let rlist = document.createElement("div"); rbox.appendChild(rlist);
      try{ if(p && p.id) rlist.dataset.rlist = p.id; }catch(e){}
      let replyTo = null;
      let rTarget = document.createElement("div"); rTarget.hidden = true; rTarget.style.fontSize = "12px"; rTarget.style.margin = "4px 0"; rbox.appendChild(rTarget);
      /* caixa dinâmica: textarea com autogrow + Enter envia (igual pub/priv) */
      let rComp = document.createElement("div"); rComp.className = "composerRow"; rComp.style.marginTop = "4px";
      let ri = document.createElement("textarea"); ri.rows = 1; ri.placeholder = "responder..."; ri.maxLength = 500;
      ri.setAttribute("enterkeyhint", "send");
      try{ ri.style.flex = "1 1 auto"; ri.style.minHeight = "36px"; ri.style.maxHeight = "120px"; ri.style.resize = "none"; ri.style.overflowY = "hidden"; }catch(e){}
      let rs = document.createElement("button"); rs.textContent = "enviar"; rs.className = "sendBtn"; rs.style.minHeight = "36px"; rs.style.minWidth = "64px";
      function feedGrow(){ try{ ri.style.height = "auto"; var mx = 120; ri.style.height = Math.min(ri.scrollHeight, mx)+"px"; ri.style.overflowY = ri.scrollHeight > mx ? "auto" : "hidden"; }catch(e){} }
      try{ ri.addEventListener("input", feedGrow, {passive:true}); }catch(e){ try{ ri.addEventListener("input", feedGrow); }catch(e2){} }
      try{ feedGrow(); }catch(e){}
      function paintRTarget(){
        if(!replyTo){ rTarget.hidden = true; ri.placeholder = "responder..."; return; }
        rTarget.hidden = false; rTarget.innerHTML = "";
        rTarget.appendChild(document.createTextNode("respondendo a "+replyTo.n+" "));
        let cx = document.createElement("button"); cx.textContent = "x"; cx.style.marginLeft = "4px";
        cx.onclick = ()=>{ replyTo = null; paintRTarget(); };
        rTarget.appendChild(cx);
        ri.placeholder = "responder a "+replyTo.n+"...";
      }
      let onAnsFeed = (t)=>{ replyTo = t; paintRTarget(); try{ ri.focus(); }catch(e){} };
      function renderReplies(){ renderFeedReplies(rlist, p, onAnsFeed); }
      renderReplies();
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
        let _gw4 = sendGapOk("reply", 2000);
        if(_gw4){ flashBtn(rs, "⏳ aguarde "+_gw4+"s"); return; }
        rs.disabled = true;
        try{
          let r2 = JSON.parse(await rpc("reply", JSON.stringify(Object.assign(likePayload(p.id), {text:t, to:replyTo?replyTo.id:null}))));
          if(r2 && r2.err==="anon-taken" && !me){ try{ renewAnonForce(); r2 = JSON.parse(await rpc("reply", JSON.stringify(Object.assign(likePayload(p.id), {text:t, to:replyTo?replyTo.id:null})))); }catch(e){} }
          if(r2.ok){ try{ if(r2.anonTok) anonTokSet(myKey(), r2.anonTok); if(r2.itemTok && r2.rid) anonItemSet(r2.rid, r2.itemTok); }catch(e){} ri.value = ""; try{ feedGrow(); }catch(e){} try{ ri.focus(); }catch(e2){} replyTo = null; paintRTarget(); rc++; rb.textContent = "respostas ("+rc+")"; cInv("feedGet"); loadFeed(true); }
          else { let _rm = spamErrText(r2); if(_rm) flashBtn(rs, _rm); }
        }catch(e){ sendGapUndo("reply"); }
        rs.disabled = false;
      };
      rb.onclick = ()=>{ rbox.hidden = !rbox.hidden; if(!rbox.hidden){ try{ cInv("feedGet"); loadFeed(true); }catch(e){} } };
      foot.appendChild(rb);
      try{
        if(p && p.id && (p.n===myKey() || (p.n==="📢support-zunzum" && window._isOwner))){
          let eb = document.createElement("button"); eb.textContent = "✏️"; eb.title = p.n===myKey() ? "editar post" : "editar comunicado (dono)";
          eb.onclick = (ev)=>{ ev.stopPropagation(); feedEditInline(d, p, ptx); };
          let db2 = document.createElement("button"); db2.textContent = "🗑️"; db2.title = "apagar post";
          db2.onclick = async (ev)=>{
            ev.stopPropagation();
            if(!confirm("apagar este post?")) return;
            try{
              let r = JSON.parse(await rpc("feedDel", JSON.stringify(anonEditPayload(likePayload(p.id), p.id))));
              if(!r.ok){ flashBtn(db2, spamErrText(r)||"erro"); return; }
              cInv("feedGet"); loadFeed(true);
            }catch(e){}
          };
          foot.appendChild(eb); foot.appendChild(db2);
        }
      }catch(e){}
      d.appendChild(foot); d.appendChild(rbox);
      feedCtn.appendChild(d);
    });
    try{
      var _shown = window._feedShown||20, _rest = posts.length - _shown;
      if(_rest > 0){
        var _more = document.createElement("button"); _more.id = "feedMoreBtn";
        _more.textContent = "ver mais (" + _rest + " restantes)";
        _more.style.cssText = "width:100%;margin:8px 0;padding:10px;min-height:44px";
        _more.onclick = function(){ window._feedShown = _shown + 20; loadFeed(true); };
        feedCtn.appendChild(_more);
      }
    }catch(e){}
    try{ trApply(feedCtn); }catch(e){}
    try{ if(window.nodalPaintFeed) window.nodalPaintFeed(feedCtn); }catch(e){}
    try{ eroScanMedia(feedCtn); }catch(e){}
    try{ feedCtn.querySelectorAll("[data-pid]:not(.post)").forEach(b=>{ if(openIds[b.dataset.pid]) b.hidden = false; }); if(!zAnchorRestore(feedCtn, ".post", el=>el.dataset.zat, ancF)) feedCtn.scrollTop = st + ((feedCtn.scrollHeight||0) - sh0); }catch(e){}
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
function roomLink(id){ try{ return "https://perchance.org/"+window.generatorName+"?sala="+(id||"geral"); }catch(e){ return "?sala="+(id||"geral"); } }
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
}
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
async function loadRooms(){
  let my = ++loadRoomsSeq;
  try{
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
      let m = document.createElement("div"); m.className = "meta"; m.textContent = (r.owner?"@"+r.owner+" · ":"")+(r.msgs||0)+" msgs · "+(r.topics||0)+" tópicos"; c.appendChild(m);
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
    pubOwnerEl.textContent = own.join(" · ");
    pubDescEl.textContent = (!isG && meta && meta.desc) ? String(meta.desc) : "";
    let ph = (!isG && meta && meta.photo) ? meta.photo : "";
    pubPhotoEl.innerHTML = "";
    if(ph){ let im = document.createElement("img"); im.referrerPolicy = "no-referrer"; im.src = ph; im.alt = ""; pubPhotoEl.appendChild(im); }
    else pubPhotoEl.textContent = isG ? "💬" : String((meta&&meta.name)||"#").slice(0,1).toUpperCase();
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
          ok.disabled = true;
          let r = JSON.parse(await rpc("topicCreate", JSON.stringify({nick:me.nick, hash:me.hash, room:pubRoom, name:inp.value.trim()})));
          if(!r.ok){ flashBtn(ok, roomErrText(r)); ok.disabled = false; return; }
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
      if(f.size>104857600){ pubCreateMsg.textContent = "arquivo muito grande"; pubCreateBtn.disabled = false; return; }
      let up = await zunUpload(f, {expires:Date.now()+1000*60*60*24*30});
      if(up.error){ pubCreateMsg.textContent = "erro upload"; pubCreateBtn.disabled = false; return; }
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
      x.onclick = ((tid)=>{ return ()=>delTopic(tid); })(t.id);
      row.appendChild(x); tl.appendChild(row);
    });
    p.appendChild(tl);
    if(isOwner){
      let del = document.createElement("button"); del.textContent = "excluir sala"; del.style.marginTop = "6px"; del.onclick = delRoom; p.appendChild(del);
    }
  }catch(e){}
}
async function loadPub(force){
  try{
    ensureNewPills();
    let p = {room:pubRoom||"geral"};
    if(pubTopic) p.topic = pubTopic;
    if(me){ p.nick = me.nick; p.hash = me.hash; }
    let v = JSON.parse(await crpc("roomView", JSON.stringify(p)));
    if(!v || !v.ok){
      if(pubRoom && pubRoom!=="geral"){ let bad = pubRoom; pubRoom = "geral"; pubTopic = null; try{ location.hash = "sala-geral"; }catch(e){} cInv("roomView"); loadPub(true); loadRooms(); showNotFound({icon:"💬", title:"chat não encontrado", msg:"o chat ("+bad+") não existe ou foi excluído. Caímos no #geral.", okLabel:"ir p/ #geral"}); }
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
  }catch(e){}
}
/* edição inline de mensagem de chat (troca o .ttext por um input) */
function chatEditInline(row, x, onSave){
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
      sv.disabled = true;
      try{ await onSave(t.slice(0,500)); }catch(e){}
      sv.disabled = false;
    };
    return true;
  }catch(e){ return false; }
}
function pubRowDecor(row, x, canMod){
  try{
    if(x.id && me && (canMod || x.f===me.nick)){
      let b = document.createElement("button"); b.className = "msgDel"; b.textContent = "❌"; b.title = "apagar";
      b.onclick = ((mid)=>{ return async ()=>{
        if(!confirm("apagar esta mensagem?")) return;
        try{
          let pp = {nick:me.nick, hash:me.hash, room:pubRoom||"geral", id:mid};
          if(pubTopic) pp.topic = pubTopic;
          let r = JSON.parse(await rpc("roomMsgDel", JSON.stringify(pp)));
          if(!r.ok){ flashBtn(b, roomErrText(r)||"erro"); return; }
          cInv("roomView"); loadPub(true);
        }catch(e){}
      }; })(x.id);
      row.appendChild(b);
    }
    if(x.id && me && x.f===me.nick){
      let eb = document.createElement("button"); eb.className = "msgEdit"; eb.textContent = "✏️"; eb.title = "editar";
      eb.onclick = ()=>{
        chatEditInline(row, x, async (t)=>{
          try{
            let pp = {nick:me.nick, hash:me.hash, room:pubRoom||"geral", id:x.id, text:t, url:x.u||"", mtype:x.y||""};
            if(pubTopic) pp.topic = pubTopic;
            let r = JSON.parse(await rpc("roomMsgEdit", JSON.stringify(pp)));
            if(!r.ok){ flashBtn(eb, roomErrText(r)||"erro"); return; }
            cInv("roomView"); loadPub(true);
          }catch(e){}
        });
      };
      row.appendChild(eb);
    }
  }catch(e){}
}
function paintPub(m){
  try{
    fillMentions(m);
    let items = m.slice(-30);
    let roomKey = (pubRoom||"geral")+"|"+(pubTopic||"");
    let canMod = me && curRole && (curRole.owner||curRole.mod);
    let mk = (x)=>{ let r = chatRow(x, pubInput); pubRowDecor(r, x, canMod); r.dataset.zk2 = chatRowKey(x); r.dataset.zs = chatRowSig(x); return r; };
    if(paintedPub && paintRoomPub===roomKey && pubLog.childNodes.length){
      /* caminho quente: só o que mudou (sem rebuild, sem flash) */
      let atBot = true;
      try{ atBot = (pubLog.scrollHeight - pubLog.scrollTop - pubLog.clientHeight) < 40; }catch(e){}
      let fresh = [];
      try{ fresh = patchChatLog(pubLog, items, mk); }catch(e){ fresh = []; }
      healFreshRows(fresh);
      try{ if(atBot){ pubLog.scrollTop = pubLog.scrollHeight; zRepinSoon(pubLog); } }catch(e){}
    } else {
      /* caminho frio: troca de sala/tópico ou 1a pintura — rebuild total */
      let atBot = true, pst = 0, ancP = null;
      try{ atBot = (pubLog.scrollHeight - pubLog.scrollTop - pubLog.clientHeight) < 40; pst = pubLog.scrollTop||0; ancP = zAnchorSave(pubLog, "[data-zk]", el=>el.dataset.zk); }catch(e){}
      pubLog.innerHTML = "";
      let fresh = [];
      items.forEach(x=>{
        let row = mk(x);
        pubLog.appendChild(row);
        fresh.push(row);
      });
      healFreshRows(fresh);
      try{
        if(atBot){ pubLog.scrollTop = pubLog.scrollHeight; zRepinSoon(pubLog); }
        else if(!zAnchorRestore(pubLog, "[data-zk]", el=>el.dataset.zk, ancP)){ try{ pubLog.scrollTop = pst; }catch(e){} }
        else { let _aP = ancP, _stP = 0; try{ _stP = pubLog.scrollTop||0; }catch(e){} requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ try{ if((pubLog.scrollTop||0) !== _stP) return; }catch(e){ return; } try{ zAnchorRestore(pubLog, "[data-zk]", el=>el.dataset.zk, _aP); }catch(e){} }); }); }
      }catch(e){}
      try{ zTrustSave(pubLog, "[data-zk]", el=>el.dataset.zk); }catch(e){}
    }
    paintRoomPub = roomKey;
    seenAtPub = maxAtSince(m); paintedPub = true; paintSigPub = sigChat(m)+"|"+pubRoom+"|"+(pubTopic||"");
    try{ if(m && m.length) ensureZNickStyles(m.slice(-30).map(x=>x.f)); }catch(e){}
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
    if(x.id && me && (x.f===me.nick || isOwner)){
      let db = document.createElement("button"); db.className = "msgDel"; db.textContent = "❌"; db.title = "apagar";
      db.onclick = (async (mid)=>{
        return async ()=>{
          if(!confirm("apagar esta mensagem?")) return;
          try{
            let r = JSON.parse(await rpc("privMsgDel", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom, id:mid})));
            if(!r.ok){ flashBtn(db, roomErrText(r)||"erro"); return; }
            cInv("privGet"); loadPriv(true);
          }catch(e){}
        };
      })(x.id);
      row.appendChild(db);
    }
    if(x.id && me && x.f===me.nick){
      let eb = document.createElement("button"); eb.className = "msgEdit"; eb.textContent = "✏️"; eb.title = "editar";
      eb.onclick = ()=>{
        chatEditInline(row, x, async (t)=>{
          try{
            let et = t, eu = "";
            /* Round 4: falha na cifra ABORTA (antes caía p/ plaintext). */
            try{ let b = await privEncV2(privRoom, t, x.u||""); et = b; eu = ""; }catch(e){ flashBtn(eb, "falha na cifra — não enviado"); return; }
            let r = JSON.parse(await rpc("privMsgEdit", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom, id:x.id, text:et, url:eu, mtype:x.y||""})));
            if(!r.ok){ flashBtn(eb, roomErrText(r)||"erro"); return; }
            cInv("privGet"); loadPriv(true);
          }catch(e){}
        });
      };
      row.appendChild(eb);
    }
  }catch(e){}
}
async function paintPriv(m){
  try{
    let items = m.slice(-30);
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
      let atBot2 = true;
      try{ atBot2 = (privLog.scrollHeight - privLog.scrollTop - privLog.clientHeight) < 40; }catch(e){}
      let fresh = [];
      try{ fresh = patchChatLog(privLog, items, mk); }catch(e){ fresh = []; }
      healFreshRows(fresh);
      try{
        let joins = privLog.querySelectorAll(':scope > .meta[data-join-nick]');
        if(joins.length > 5) for(let i = 0; i < joins.length-5; i++){ try{ joins[i].remove(); }catch(e){} }
      }catch(e){}
      try{ if(atBot2){ privLog.scrollTop = privLog.scrollHeight; zRepinSoon(privLog); } }catch(e){}
    } else {
      /* caminho frio: troca de sala ou 1a pintura — rebuild total */
      let atBot2 = true, pst2 = 0, ancV = null;
      try{ atBot2 = (privLog.scrollHeight - privLog.scrollTop - privLog.clientHeight) < 40; pst2 = privLog.scrollTop||0; ancV = zAnchorSave(privLog, "[data-zk]", el=>el.dataset.zk); }catch(e){}
      privLog.innerHTML = "";
      let fresh = [];
      for(let x of items){
        let row = mk(x);
        privLog.appendChild(row);
        fresh.push(row);
      }
      healFreshRows(fresh);
      try{
        if(atBot2){ privLog.scrollTop = privLog.scrollHeight; zRepinSoon(privLog); }
        else if(!zAnchorRestore(privLog, "[data-zk]", el=>el.dataset.zk, ancV)){ try{ privLog.scrollTop = pst2; }catch(e){} }
        else { let _aV = ancV, _stV = 0; try{ _stV = privLog.scrollTop||0; }catch(e){} requestAnimationFrame(()=>{ requestAnimationFrame(()=>{ try{ if((privLog.scrollTop||0) !== _stV) return; }catch(e){ return; } try{ zAnchorRestore(privLog, "[data-zk]", el=>el.dataset.zk, _aV); }catch(e){} }); }); }
      }catch(e){}
      try{ zTrustSave(privLog, "[data-zk]", el=>el.dataset.zk); }catch(e){}
    }
    paintRoomPriv = privRoom;
    seenAtPriv = maxAtSince(m); paintedPriv = true; paintSigPriv = sigChat(m);
    try{ if(m && m.length) ensureZNickStyles(m.slice(-30).map(x=>x.f)); }catch(e){}
  }catch(e){}
}
async function refreshAll(){ paintMe(); paintLocks(); loadFeed(); loadPub(); loadPriv(); loadPresence(); try{ loadRooms(); }catch(e){} }
async function loadPresence(){
  try{
    let r = JSON.parse(await crpc("presence", me ? JSON.stringify({nick:me.nick, hash:me.hash}) : ""));
    if(!r.ok) return;
    onlineNicks = new Set(Array.isArray(r.nicks) ? r.nicks : []);
    onJit += [-1,0,1,2][Math.floor(Math.random()*4)];
    if(onJit>3) onJit = 3; if(onJit<-1) onJit = -1;
    let shownOn = Math.max(1, (r.online||0)+onJit);
    userCountEl.innerHTML = "";
    let tot = document.createElement("span"); tot.className = "uc-total"; tot.textContent = r.total+" usuários · "; userCountEl.appendChild(tot);
    let dot = document.createElement("span"); dot.className = "onDot"; dot.title = "online agora"; userCountEl.appendChild(dot);
    let on = document.createElement("span"); on.className = "uc-on"; on.textContent = " "+shownOn+" online"; userCountEl.appendChild(on);
    if(r.maxOn>1){
      let mx = document.createElement("span"); mx.className = "meta uc-rec"; mx.style.marginLeft = "6px"; mx.textContent = "· recorde "+r.maxOn; userCountEl.appendChild(mx);
    }
    try{ localStorage.setItem("zunzumPresenceCache", JSON.stringify({t:r.total, o:shownOn, m:r.maxOn||0})); }catch(e2){}
    try{
      let lastRec = parseInt(localStorage.getItem("orkutMaxOnCel")||"0")||0;      if(r.rec && r.maxOn>lastRec){
        localStorage.setItem("orkutMaxOnCel", String(r.maxOn));
        celebratePeak("online", r.maxOn);
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
    if(/^image\/gif$/i.test(f.type||"") && f.size<=8388608) return f; // GIF: preserva animação, nunca achata em JPEG (só GIF gigante cai no JPEG abaixo)
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
/* compressão genérica p/ QUALQUER outro arquivo (gzip) + limite 100MB comprimido */
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
function zunFileTooBig(f){ try{ return f && f.size > ZUN_MAX_FILE; }catch(e){ return false; } }
function feedDataUrlToBlob(d){
  try{
    let m = String(d||"").match(/^data:(image\/(png|jpe?g|gif|webp));base64,([\s\S]+)$/i);
    if(!m) return null;
    let bin = atob(m[2].replace(/\s+/g,""));
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
  let linkUrl = "";
  try{ linkUrl = (typeof feedLink!=="undefined"&&feedLink ? feedLink.value : "").trim(); }catch(e){}
  if(!text && !f && !linkUrl) return;
  let _gw = sendGapOk("feed", 3000);
  if(_gw){ upEl.textContent = "⏳ devagar! aguarde "+_gw+"s"; return; }
  postBtn.disabled = true;
  upEl.textContent = "enviando...";
  let url = "", mtype = "";
  if(f){ if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ upEl.textContent = "svg bloqueado (use png/jpg/gif/webp)"; postBtn.disabled = false; sendGapUndo("feed"); return; } try{ f = await prepUpload(f, 1024, 0.82, (s)=>{ upEl.textContent = s; }); }catch(e){ if(/svg/i.test((e&&e.message)||"")){ upEl.textContent = "svg bloqueado (use png/jpg/gif/webp)"; postBtn.disabled = false; sendGapUndo("feed"); return; } } if(f.size>104857600){ upEl.textContent = "arquivo muito grande (máx 100MB)"; postBtn.disabled = false; sendGapUndo("feed"); return; } upEl.textContent = "enviando..."; let r = await zunUpload(f, {expires:Date.now()+1000*60*60*24*30}); if(r.error){ upEl.textContent = "erro upload"; postBtn.disabled = false; sendGapUndo("feed"); return; } url = r.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(f):f.type); }
  else if(linkUrl){
    let raw = String(linkUrl).trim();
    let isB64 = /^data:image\//i.test(raw) || (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.replace(/\s+/g,"").length>2000 && raw.indexOf(".")<0 && raw.indexOf(":")<0);
    if(isB64){
      upEl.textContent = "comprimindo imagem...";
      let b = /^data:image\//i.test(raw) ? feedDataUrlToBlob(raw) : feedRawB64ToBlob(raw);
      if(!b){ upEl.textContent = "base64 inválido"; postBtn.disabled = false; sendGapUndo("feed"); return; }
      let cf = await shrinkImage(new File([b],"foto.jpg",{type:b.type||"image/jpeg"}), 1024, 0.82);
      if(cf.size>104857600){ upEl.textContent = "arquivo muito grande (máx 100MB)"; postBtn.disabled = false; sendGapUndo("feed"); return; }
      upEl.textContent = "enviando...";
      let r = await zunUpload(cf, {expires:Date.now()+1000*60*60*24*30});
      if(r.error){ upEl.textContent = "erro upload"; postBtn.disabled = false; sendGapUndo("feed"); return; }
      url = r.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(cf):cf.type);
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
              if(!ur.error && ur.url){ url = ur.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(cf2):cf2.type); compressed = true; }
            }
          }
        }catch(e){}
      }
      if(!compressed){ url = nu.slice(0,500); try{ mtype = guessMime(url); }catch(e){ mtype = ""; } }
    }
  }
  try{
    let payload = me ? {nick:me.nick, hash:me.hash, text, url, mtype} : {anon:anonId, anonTok:anonTokGet(anonId), text, url, mtype};
    let r = JSON.parse(await rpc("feedPush", JSON.stringify(payload)));
    if(r && r.err==="anon-taken" && !me){ try{ renewAnonForce(); payload.anon = anonId; payload.anonTok = anonTokGet(anonId); r = JSON.parse(await rpc("feedPush", JSON.stringify(payload))); }catch(e){} }
    let _em = spamErrText(r);
    if(_em){ upEl.textContent = _em; return; }
    try{ if(r.anonTok) anonTokSet(anonId, r.anonTok); }catch(e){}
    try{
      if(r.itemTok && r.id) anonItemSet(r.id, r.itemTok);
    }catch(e){}
    textInput.value = ""; fileInput.value = ""; try{ if(typeof feedLink!=="undefined"&&feedLink) feedLink.value = ""; }catch(e){} upEl.textContent = "";
    cInv("feedGet"); loadFeed(true);
  }catch(e){ upEl.textContent = "sem servidor"; sendGapUndo("feed"); }
  postBtn.disabled = false;
};
pubBtn.onclick = async ()=>{
  if(!me) return;
  let t = pubInput.value.trim(); let f = pubFile ? pubFile.files[0] : null;
  let linkUrl = (pubLink ? pubLink.value : "").trim();
  if(!t && !f && !linkUrl) return;
  let _gw2 = sendGapOk("chat", 2000);
  if(_gw2){ flashBtn(pubBtn, "⏳ aguarde "+_gw2+"s"); return; }
  pubBtn.disabled = true;
  let url = "", mtype = "";
  try{
    if(f){ if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ flashBtn(pubBtn, "svg bloqueado (use png/jpg)"); pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } try{ f = await prepUpload(f, 1024, 0.82); }catch(e){ if(/svg/i.test((e&&e.message)||"")){ flashBtn(pubBtn, "svg bloqueado"); pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } } if(f.size>104857600){ flashBtn(pubBtn, "arquivo muito grande (máx 100MB)"); pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } let r = await zunUpload(f, {expires:Date.now()+1000*60*60*24*30}); if(r.error){ pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } url = r.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(f):f.type); }
    else if(linkUrl){ if((window.zunOkUrl && !window.zunOkUrl(linkUrl, 500)) || linkUrl.indexOf("https://")!==0){ pubBtn.disabled = false; sendGapUndo("chat"); paintLocks(); pubLink.focus(); return; } url = linkUrl.slice(0,500); mtype = guessMime(url); }
    let pr = {ok:0, err:"?"};
    try{ let pp = {nick:me.nick, hash:me.hash, room:(typeof pubRoom!=="undefined"&&pubRoom)||"geral", text:t, url, mtype}; if(typeof pubTopic!=="undefined"&&pubTopic) pp.topic = pubTopic; pr = JSON.parse(await rpc("roomPush", JSON.stringify(pp))); }catch(e2){}
    let pe = spamErrText(pr);
    if(pe){ pubInput.value = t; flashBtn(pubBtn, pe); pubBtn.disabled = false; paintLocks(); return; }
    pubInput.value = ""; if(pubFile) pubFile.value = ""; if(pubLink) pubLink.value = "";
    cInv("roomView"); cInv("roomsList"); loadPub(true); try{ if(typeof pubFlipped!=="undefined"&&pubFlipped) loadRooms(); }catch(e3){}
  }catch(e){}
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
  let url = "", mtype = "";
  try{
    if(f){ if(typeof zunIsSvgFile==="function" && zunIsSvgFile(f)){ flashBtn(privSendBtn, "svg bloqueado (use png/jpg)"); privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } try{ f = await prepUpload(f, 1024, 0.82); }catch(e){ if(/svg/i.test((e&&e.message)||"")){ flashBtn(privSendBtn, "svg bloqueado"); privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } } if(f.size>104857600){ flashBtn(privSendBtn, "arquivo muito grande (máx 100MB)"); privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } let r = await zunUpload(f, {expires:Date.now()+1000*60*60*24*30}); if(r.error){ privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); return; } url = r.url; mtype = (typeof zunGzMtype==="function"?zunGzMtype(f):f.type); }
    else if(linkUrl){ if((window.zunOkUrl && !window.zunOkUrl(linkUrl, 500)) || linkUrl.indexOf("https://")!==0){ privSendBtn.disabled = false; sendGapUndo("chat"); paintLocks(); privLink.focus(); return; } url = linkUrl.slice(0,500); mtype = guessMime(url); }
    let et = t, eurl = "";
    /* Round 4: falha na cifra ABORTA (antes caía p/ plaintext). */
    try{ if(t || url){ let b = await privEncV2(privRoom, t, url); et = b; eurl = ""; } }catch(e){ flashBtn(privSendBtn, "falha na cifra — não enviado"); privSendBtn.disabled = false; paintLocks(); return; }
    let vr = {ok:0, err:"?"};
    try{ vr = JSON.parse(await rpc("privPush", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom, text:et, url:eurl, mtype}))); }catch(e2){}
    if(vr && vr.err==="fraca"){
      let sug = String(vr.ex||privGenStrong(privRoom));
      privSayRoom("🔐 sala nova precisa de código forte (anti-clone). Sugestão: "+sug);
      try{ privInput.value = sug; }catch(e2){}
      try{ paintPrivStrength(); }catch(e3){}
      if(confirm("Sala nova precisa de código forte anti-clone.\n\nUsar: "+sug+" ?")){ privSendBtn.disabled = false; paintLocks(); await joinPrivRoom(sug, {retried:true}); return; }
    }
    let ve = spamErrText(vr);
    if(ve){ privMsgInput.value = t; flashBtn(privSendBtn, ve); privSendBtn.disabled = false; paintLocks(); return; }
    privMsgInput.value = ""; if(privFile) privFile.value = ""; if(privLink) privLink.value = "";
    cInv("privGet"); loadPriv(true);
  }catch(e){}
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
function closeProfile(){
  profModal.hidden = true;
  try{
    if(/perfil-@?([A-Za-z0-9-_]{2,20})/.test(location.hash||"")){
      history.replaceState(null, "", location.pathname+location.search);
    }
  }catch(e){}
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
    if(!me || !profSel || String(profSel).toLowerCase()===String(me.nick).toLowerCase()){ profMuteBtn.hidden = true; profBlockBtn.hidden = true; return; }
    profMuteBtn.hidden = false; profBlockBtn.hidden = false;
    profMuteBtn.textContent = zunMuted(profSel) ? "🔔 ativar" : "🔕 silenciar";
    profBlockBtn.textContent = zunBlocked(profSel) ? "desbloquear" : "bloquear";
  }catch(e){}
}
try{
  profMuteBtn.onclick = ()=>{ if(!me || !profSel) return; toggleZunList("zunzumMuteList", profSel); paintProfMod(); };
  profBlockBtn.onclick = ()=>{ if(!me || !profSel) return; toggleZunList("zunzumBlockList", profSel); paintProfMod(); loadFeed(); loadPub(); loadPriv(); };
}catch(e){}
try{
  profInviteBtn.onclick = async ()=>{
    if(!profSel) return;
    if(!me){ profStats.textContent = "entre com nick+senha para convidar."; return; }
    if(!privRoom){ profStats.textContent = "entre num código do privado primeiro, depois convide @"+profSel+"."; return; }
    profModal.hidden = true;
    try{
      if(/perfil-@?([A-Za-z0-9-_]{2,20})/.test(location.hash||"")) history.replaceState(null, "", location.pathname+location.search);
    }catch(e){}
    try{ privInviteNick.value = profSel; }catch(e){}
    await sendPrivInvite(profSel);
  };
}catch(e){}
function perfilSlug(nick){ return String(nick||"").toLowerCase().replace(/[^a-z0-9-]+/g,"").replace(/^-+|-+$/g,"").slice(0,20); }
function perfilLink(nick){ return "https://perchance.org/"+window.generatorName+"?perfil="+perfilSlug(nick); }
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
  try{ await navigator.clipboard.writeText(link); profStats.textContent = "link copiado! "+link; }
  catch(e){ try{ prompt("copie o link do perfil:", link); }catch(e2){} }
  try{ location.hash = "perfil-@"+profSel; }catch(e){}
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
    if(r.ok){ sugMsg.textContent = "recebido, valeu!"; sugText.value = ""; }
    else sugMsg.textContent = spamErrText(r)||"erro";
  }catch(e){ sugMsg.textContent = "sem conexao"; }
};
paintMe(); paintLocks(); loadFeed(); try{ loadRooms(); }catch(e){} try{ autoJoinRoom(); }catch(e){}
try{ ensureDono(); }catch(e){}
var CLI_BUILD = 13;
setInterval(async ()=>{
  try{
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
  try{
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
setInterval(()=>{ if(document.hidden) return; try{ let a = document.activeElement; if(a && feedCtn.contains(a) && /INPUT|TEXTAREA/.test(a.tagName)) return; }catch(e){} loadFeed(); loadPresence(); checkPendingDepo(); loadPendingInvites(); loadPendingReqs(); try{ loadPub(); }catch(e){} try{ if(typeof pubFlipped!=="undefined"&&pubFlipped) loadRooms(); }catch(e){} }, 30000);
document.addEventListener("visibilitychange", ()=>{ if(!document.hidden){ loadFeed(); checkPendingDepo(); try{ loadPub(); }catch(e){} } });
try{
  let pc = null;
  try{ pc = JSON.parse(localStorage.getItem("zunzumPresenceCache")||"null"); }catch(e){}
  if(pc && pc.t){
    userCountEl.innerHTML = "";
    let t0 = document.createElement("span"); t0.className = "uc-total"; t0.textContent = pc.t+" usuários · "; userCountEl.appendChild(t0);
    let d0 = document.createElement("span"); d0.className = "onDot"; d0.title = "online agora"; userCountEl.appendChild(d0);
    let o0 = document.createElement("span"); o0.className = "uc-on"; o0.textContent = " "+pc.o+" online"; userCountEl.appendChild(o0);
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
function siteThemeCss(th){ let r=resolveTheme(th); if(!r) return ""; let safeTx=r.tx, safeHead=r.ac; try{ safeTx=zunSafeTx(r.cd,r.tx); safeHead=zunSafeHead(r.cd,r.ac,r.tx); }catch(e){} let guard="#searchCard{background:#fff!important;color:#222!important}#searchCard .meta{color:#666!important;opacity:.7}#searchCard input,#searchCard select,#searchCard textarea{background:#fff!important;color:#222!important}#searchLinks .g-t{color:#1a0dab!important}#searchLinks .g-u{color:#006621!important}#searchLinks .g-d{color:#545454!important}#searchLinks .g-v{color:#137333!important}#searchLinks .g-feat{background:#f6faff!important;color:#222!important;border-color:#d9e6f2!important}#searchLinks .s-photo{background:#faf6ff!important;color:#222!important;border-color:#d9e6f2!important}"; let aiFix=isDark(r.cd)?"#wrap .post[data-ai-post]{background:#222!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}":""; let topFix="#top{background:"+r.cd+"!important;color:"+safeTx+"!important}#top button{background:"+r.ac+"!important;color:"+(isDark(r.ac)?"#fff":"#102030")+"!important;border:1px solid "+r.ac+"!important}"; let headGuard="#wrap .box h3,#wrap .box h3 b,#wrap .box h3 strong{background:"+r.cd+"!important;color:"+safeHead+"!important;border-color:"+r.ac+"!important}#wrap .box h3 *,#profCard #profNick,#nodalCard #nodalTitle,#nodalCard b,#userSearchCard b,#divulgarCard b,#notfoundModal .nfTitle{color:"+safeHead+"!important}#profCard .meta,#nodalCard .meta,#userSearchCard .meta,#divulgarCard .meta,#notfoundModal .nfMsg{color:"+safeTx+"!important;opacity:.8}#zunDMRoot .zun-dm-h{background:"+r.cd+"!important;color:"+safeHead+"!important;border-color:"+r.ac+"!important}#zunDMRoot .zun-dm-h *{color:"+safeHead+"!important}"; return "body{background:"+r.bg+"!important;color:"+safeTx+"!important}#top{background:"+r.cd+"!important}"+topFix+"#wrap .box{background:"+r.cd+"!important;color:"+safeTx+"!important;border-color:"+r.ac+"!important}#wrap .box h3{background:"+r.cd+"!important;color:"+safeHead+"!important}#wrap .box h3 *,#wrap .chatname{color:"+safeHead+"!important}#wrap input,#wrap select,#wrap textarea{background:"+(isDark(r.cd)?"#222":"#fff")+"!important;color:"+safeTx+"!important}#wrap a{color:"+safeHead+"!important}#wrap .meta,#top .meta{color:"+safeTx+"!important;opacity:.7}"+aiFix+(typeof zunScopeCss==="function" ? zunScopeCss(r.css, "body") : (r.css||""))+guard+headGuard; }
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
function paintSiteTheme(){ try{ let old0=document.getElementById("siteThemeEl"); if(zunSemCss()){ if(old0) old0.remove(); zunSemCssBanner(); return; } let raw=localStorage.getItem("orkutSiteTheme"); if(!raw) return; let th=JSON.parse(raw); let css=siteThemeCss(th); let el=document.getElementById("siteThemeEl"); if(!el){ el=document.createElement("style"); el.id="siteThemeEl"; document.head.appendChild(el); } el.textContent=css; }catch(e){} }
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
            if((n==="href"||n==="src"||n==="xlink:href"||n==="action") && /^\s*(javascript|data|vbscript|file):/i.test(v)){ el.removeAttribute(a.name); continue; }
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
function renderProfPg(pg, nick){ try{ let box=document.getElementById("profPg"); box.innerHTML=""; if(!pg){ box.hidden=true; return; } box.hidden=false; let who=nick?("conteúdo de @"+nick+" (OUTRO USUÁRIO)"):("conteúdo de OUTRO USUÁRIO"); let warn=document.createElement("div"); warn.className="meta"; warn.style.margin="6px 0"; warn.textContent=who+" — HTML/JS isolado, pode ter conteúdo estranho. NUNCA digite sua senha do zunzum aqui dentro: o zunzum nunca pede senha dentro dessa página. só carrega se você confiar."; let btn=document.createElement("button"); btn.textContent="carregar página do usuário"; btn.onclick=()=>{ try{ btn.disabled=true; btn.textContent="carregando..."; let strip=document.createElement("div"); strip.className="meta"; strip.style.cssText="margin:6px 0;padding:4px 8px;border:1px dashed #b6c9db;border-radius:8px"; strip.textContent=who+" — isolado, sem acesso à sua conta. golpe comum finge tela de login aqui dentro: não digite senha."; let safe=""; try{ safe=zunSanitizePg(pg); }catch(e){ safe=""; } if(!safe){ btn.textContent="conteúdo bloqueado"; return; } let f=document.createElement("iframe"); f.setAttribute("sandbox",""); f.setAttribute("referrerpolicy","no-referrer"); f.setAttribute("srcdoc",safe); f.loading="lazy"; f.style.cssText="width:100%;min-height:200px;border:1px solid #b6c9db;border-radius:8px;background:#fff"; f.title="página do usuário (isolada)"; box.appendChild(strip); box.appendChild(f); btn.remove(); warn.textContent=who+" carregado (isolado, sem acesso à sua conta)."; }catch(e){ btn.textContent="erro"; } }; box.append(warn,btn); }catch(e){} }
function paintProfOwner(r){ let box=document.getElementById("profOwnerBox"); if(!box) return; box.innerHTML=""; let isMe=me&&r&&me.nick===r.nick; if(!isMe){ box.hidden=true; return; } box.hidden=false;
  try{ publishPerfilAuto(r.nick).catch(()=>{}); }catch(e){}
  let h=document.createElement("div"); h.innerHTML="<b>seu perfil</b> — personalize (todos veem)"; box.appendChild(h);
  let cur=r.th||{};
  let base=(THEME_PRESETS[cur.p]||THEME_PRESETS.zunzum||{});
  let row=document.createElement("div"); row.style.cssText="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;align-items:center";
  let sel=document.createElement("select"); sel.style.width="auto"; ["","zunzum","orkut","noite","mato","roxo","neon"].forEach(p=>{ let o=document.createElement("option"); o.value=p; o.textContent=p||"preset..."; if(cur.p===p) o.selected=true; sel.appendChild(o); }); row.appendChild(sel);
  function colorIn(v,fb){ let i=document.createElement("input"); i.type="color"; i.value=/^#[0-9a-fA-F]{6}$/.test(v||"")?v:(/^#[0-9a-fA-F]{6}$/.test(fb||"")?fb:"#ffffff"); i.style.width="34px"; return i; }
  let bg=colorIn(cur.bg,base.bg), cd=colorIn(cur.cd||cur.card,base.cd), tx=colorIn(cur.tx,base.tx), ac=colorIn(cur.ac||cur.acc,base.ac);
  [["fundo",bg],["cartao",cd],["texto",tx],["destaque",ac]].forEach(([lb,el])=>{ let s=document.createElement("span"); s.className="meta"; s.textContent=lb; row.appendChild(s); row.appendChild(el); });
  let stLab=document.createElement("span"); stLab.className="meta"; stLab.textContent="estilo do modal:"; row.appendChild(stLab);
  let st=document.createElement("select"); st.style.width="auto"; st.title="estilo do modal do perfil (20 opções)"; let styleList=(typeof ZUN_MODAL_STYLES!=="undefined"&&ZUN_MODAL_STYLES)||[{v:"padrao",l:"padrão"}]; let curSt="padrao"; try{ curSt=zunNormModalSt(cur.st||cur.style||"padrao"); }catch(e){ try{ curSt=String(cur.st||"padrao").toLowerCase(); if(curSt==="retrô") curSt="retro"; }catch(e2){} } styleList.forEach(o2=>{ let o=document.createElement("option"); o.value=o2.v; o.textContent=o2.l; if(curSt===o2.v) o.selected=true; st.appendChild(o); }); row.appendChild(st);
  box.appendChild(row);
  let css=document.createElement("textarea"); css.placeholder="CSS extra (opcional, sem <script>)"; css.value=cur.css||""; css.style.minHeight="40px"; box.appendChild(css);
  function curTheme(){ return {p:sel.value,bg:bg.value,cd:cd.value,tx:tx.value,ac:ac.value,st:st.value,css:css.value.slice(0,2000)}; }
  sel.onchange=()=>{ let b=THEME_PRESETS[sel.value]||{}; if(b.bg) bg.value=b.bg; if(b.cd) cd.value=b.cd; if(b.tx) tx.value=b.tx; if(b.ac) ac.value=b.ac; try{ applyProfTheme(curTheme()); }catch(e){} };
  st.onchange=()=>{ try{ applyProfTheme(curTheme()); }catch(e){} };
  [bg,cd,tx,ac].forEach(el=>{ el.oninput=()=>{ try{ applyProfTheme(curTheme()); }catch(e){} }; });
  let r2=document.createElement("div"); r2.style.cssText="display:flex;gap:6px;margin:6px 0;flex-wrap:wrap";
  let sv=document.createElement("button"); sv.textContent="salvar tema"; r2.appendChild(sv);
  let site=document.createElement("button"); site.textContent="aplicar no site todo"; r2.appendChild(site);
  let off=document.createElement("button"); off.textContent="limpar tema"; r2.appendChild(off);
  let msg=document.createElement("span"); msg.className="meta"; r2.appendChild(msg); box.appendChild(r2);
  let r3=document.createElement("div"); r3.style.cssText="display:flex;gap:6px;margin:6px 0;flex-wrap:wrap;align-items:center";
  let gstat=document.createElement("span"); gstat.className="meta"; gstat.textContent="perfil no Google: automático ✅"; r3.appendChild(gstat); box.appendChild(r3);
  sv.onclick=async()=>{ msg.textContent="salvando..."; let normSt=st.value; try{ normSt=zunNormModalSt(st.value); }catch(e){ if(normSt==="retrô") normSt="retro"; } let th={p:sel.value,bg:bg.value,cd:cd.value,tx:tx.value,ac:ac.value,st:normSt,css:css.value.slice(0,2000)}; try{ let rr=JSON.parse(await rpc("themeSet",JSON.stringify({nick:me.nick,hash:me.hash,th}))); msg.textContent=rr.ok?"tema salvo!":"erro"+(rr.err?": "+rr.err:""); if(rr.ok){ applyProfTheme(th); cInv("profileGet"); } }catch(e){ msg.textContent="sem conexao"; } };
  site.onclick=()=>{ try{ localStorage.setItem("orkutSiteTheme",JSON.stringify({p:sel.value,bg:bg.value,cd:cd.value,tx:tx.value,ac:ac.value,st:st.value,css:css.value.slice(0,2000)})); paintSiteTheme(); msg.textContent="aplicado no site!"; }catch(e){} };
  off.onclick=async()=>{ try{ await rpc("themeSet",JSON.stringify({nick:me.nick,hash:me.hash,th:null})); localStorage.removeItem("orkutSiteTheme"); let e2=document.getElementById("siteThemeEl"); if(e2) e2.remove(); applyProfTheme(null); cInv("profileGet"); msg.textContent="limpo"; }catch(e){} };
  pgEditor(box, r.pg||"");
}
function pgEditor(box, cur){
  let h=document.createElement("div"); h.innerHTML="<b>sua pagina</b> — HTML+JS (max 8000) roda isolado p/ visitantes"; box.appendChild(h);
  let ta=document.createElement("textarea"); ta.value=cur||""; ta.placeholder="<h1>oi</h1><script>alert(1)</scr"+"ipt>"; ta.style.minHeight="80px"; box.appendChild(ta);
  let row=document.createElement("div"); row.style.cssText="display:flex;gap:6px;margin:6px 0"; let sv=document.createElement("button"); sv.textContent="salvar pagina"; let msg=document.createElement("span"); msg.className="meta"; row.appendChild(sv); row.appendChild(msg); box.appendChild(row);
  sv.onclick=async()=>{ msg.textContent="salvando..."; try{ let rr=JSON.parse(await rpc("htmlSet",JSON.stringify({nick:me.nick,hash:me.hash,pg:ta.value.slice(0,8000)}))); msg.textContent=rr.ok?"pagina salva!":"erro"; if(rr.ok){ renderProfPg(ta.value.slice(0,8000), (me&&me.nick)||""); cInv("profileGet"); } }catch(e){ msg.textContent="sem conexao"; } };
}
try{ paintSiteTheme(); }catch(e){}
try{
  let pq=new URLSearchParams(location.search).get("perfil")||((location.hash||"").match(/perfil-@?([A-Za-z0-9-_]{2,20})/)||[])[1]||"";
  if(pq) setTimeout(()=>{ try{ openProfile(pq.replace(/^@/,"")); }catch(e){} }, 1500);
}catch(e){}
