  (function(){ let l = document.querySelector("link[rel~='icon']") || document.createElement("link"); l.rel = "icon"; l.href = "https://user.uploads.dev/file/c8408537dd35bb624eee9560b37e5fa8.jpg"; document.head.appendChild(l); })();
function lsGetSafe(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
function lsSetSafe(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
let me = JSON.parse(lsGetSafe("orkutSession")||"null");
function newAnonId(){ return "anon-"+Math.floor(Math.random()*9000+1000); }
let anonId = lsGetSafe("orkutAnon") || newAnonId();
lsSetSafe("orkutAnon", anonId);
let lastAnonRenew = 0;
function renewAnon(){
  try{
    let now = Date.now();
    if(now - lastAnonRenew < 5000) return false;
    let old = anonId;
    let next = old;
    while(next===old) next = newAnonId();
    if(!confirm("Trocar de "+old+" para "+next+"?\nPosts e likes antigos continuam com o antigo — o rasto é cortado.")) return false;
    lastAnonRenew = now;
    anonId = next;
    lsSetSafe("orkutAnon", anonId);
    try{ paintMe(); }catch(e){}
    return true;
  }catch(e){ return false; }
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
async function localRpc(name, data){
  let db = localDB();
  if(name==="register"){
    let o = JSON.parse(data); let nick = String(o.nick||"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick)) return '{"ok":0,"err":"nick"}';
    if(!/^[0-9a-f]{64}$/.test(o.hash||"")) return '{"ok":0,"err":"hash"}';
    let k = nick.toLowerCase(); let ex = db.users[k];
    if(ex){ if(!("th" in ex)) ex.th=null; if(!("pg" in ex)) ex.pg=""; if(ex.h===o.hash) return JSON.stringify({ok:1,nick:ex.n,created:ex.c,avatar:ex.a||"",th:ex.th||null,pg:ex.pg||""}); return '{"ok":0,"err":"senha"}'; }
    db.users[k]={n:nick,h:o.hash,c:Date.now(),a:"",th:null,pg:""};
    try{
      let rk = String(o.ref||"").replace(/^@/,"").trim().toLowerCase().slice(0,20);
      if(rk && rk!==k && db.users[rk]){
        if(!db.refs) db.refs = {};
        if(!db.refBy) db.refBy = {};
        if(!db.refBy[k]){ db.refBy[k] = rk; db.refs[rk] = (db.refs[rk]||0)+1; }
      }
    }catch(e2){}
    saveLocalDB(db);
    return JSON.stringify({ok:1,nick,created:db.users[k].c,avatar:"",th:null,pg:""});
  }
  if(name==="refMe"){
    try{
      let nk = String(data||"").replace(/^@/,"").trim().toLowerCase().slice(0,20);
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
    let name2 = o.nick ? (db.users[o.nick.toLowerCase()]&&db.users[o.nick.toLowerCase()].h===o.hash ? "@"+o.nick : null) : o.anon;
    if(o.nick && !name2) return '{"ok":0,"err":"auth"}';
    if(!o.nick && !/^anon-[0-9]{4}$/.test(o.anon||"")) return '{"ok":0,"err":"anon"}';
    let text = String(o.text||"").slice(0,500), url = String(o.url||"").slice(0,500);
    if(!text && !url) return '{"ok":0,"err":"vazio"}';
    db.feed.push({id:"p"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36), n:name2, t:text, u:url, y:String(o.mtype||"").slice(0,60), at:Date.now(), lk:[], rp:[]});
    if(db.feed.length>80) db.feed.splice(0, db.feed.length-80);
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="pubGet") return JSON.stringify(db.pub.slice(-100));
  if(name==="pubPush"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
    let text = String(o.text||"").slice(0,500);
    let url = String(o.url||"").slice(0,500);
    if(!text && !url) return '{"ok":0,"err":"vazio"}';
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
  function lUserL(o){ let u = db.users[(o.nick||"").toLowerCase()]; if(!u || u.h!==o.hash) return null; return u; }
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
  function lPhoto(u){ u = String(u||"").slice(0,500); if(!u) return ""; if(u.indexOf("https://")!==0 || /\s/.test(u)) return null; return u; }
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
    let id = String(o.room||"geral").slice(0,30);
    if(!lRoomOk(id)) return '{"ok":0,"err":"room"}';
    let tid = o.topic ? String(o.topic).slice(0,30) : null;
    let text = String(o.text||"").slice(0,500);
    let url = String(o.url||"").slice(0,500);
    if(!text && !url) return '{"ok":0,"err":"vazio"}';
    if(url && url.indexOf("https://")!==0) return '{"ok":0,"err":"url"}';
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
  if(name==="privGet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '[]';
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
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
    if(db.plock && db.plock[o.room]){
      let kl = u.n.toLowerCase();
      let ow = db.prown && db.prown[o.room] ? String(db.prown[o.room]).toLowerCase() : "";
      if(kl!==ow && !(db.pmem && db.pmem[o.room] && db.pmem[o.room][kl])) return '{"ok":0,"err":"trancada"}';
    }
    if(!db.priv[o.room]) db.priv[o.room]=[];
    db.priv[o.room].push({f:u.n, t:String(o.text||"").slice(0,500), u:String(o.url||"").slice(0,500), y:String(o.mtype||"").slice(0,60), at:Date.now()});
    saveLocalDB(db); return '{"ok":1}';
  }
  if(name==="subPriv") return "ok";
  if(name==="privJoin"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
    if(!db.pseen) db.pseen = {};
    if(!db.prown) db.prown = {};
    if(!db.plock) db.plock = {};
    if(!db.pmem) db.pmem = {};
    let rm = String(o.room||"").toLowerCase().slice(0,30);
    if(!db.prown[rm]) db.prown[rm] = u.n;
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
    return JSON.stringify({ok:1, first, locked, owner, member});
  }
  if(name==="privLock"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
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
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
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
    if(!u || u.h!==o.hash) return '[]';
    return JSON.stringify((db.preq||{})[u.n.toLowerCase()]||[]);
  }
  if(name==="reqOk"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
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
  if(name==="presence"){ let nu = Object.keys(db.users||{}).length; let mx = 0; try{ mx = parseInt(localStorage.getItem("orkutMaxOn")||"0")||0; }catch(e){} if(2>mx){ mx = 2; try{ localStorage.setItem("orkutMaxOn", "2"); }catch(e){} return JSON.stringify({ok:1, total:nu, online:2, nicks:(typeof me!=="undefined"&&me?[me.nick]:[]), maxOn:2, rec:1}); } return JSON.stringify({ok:1, total:nu, online:2, nicks:(typeof me!=="undefined"&&me?[me.nick]:[]), maxOn:mx, rec:0}); }
  if(name==="subDepo" || name==="unsubDepo" || name==="subInv" || name==="unsubInv" || name==="subAppr" || name==="unsubAppr") return "ok";
  if(name==="privInvite"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
    if(!db.inv) db.inv = {};
    let tk = String(o.to||"").replace(/^@/,"").toLowerCase();
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
    if(!u || u.h!==o.hash) return '[]';
    return JSON.stringify((db.inv||{})[u.n.toLowerCase()]||[]);
  }
  if(name==="invAck"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
    if(!db.inv) db.inv = {};
    let k = u.n.toLowerCase();
    if(o.all){ db.inv[k]=[]; saveLocalDB(db); return '{"ok":1}'; }
    db.inv[k] = (db.inv[k]||[]).filter(x=>!(x.f===String(o.f||"") && String(x.r)===String(o.r||"")));
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="like" || name==="reply"){
    let o = JSON.parse(data);
    let key = o.nick ? (db.users[o.nick.toLowerCase()]&&db.users[o.nick.toLowerCase()].h===o.hash ? "@"+o.nick : null) : o.anon;
    if(!key) return '{"ok":0,"err":"auth"}';
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
      return JSON.stringify({ok:1, likes:p.lk.length, liked, mine, counts:reactCountsLocal(p)});
    }
    let text = String(o.text||"").slice(0,300);
    if(!text) return '{"ok":0,"err":"vazio"}';
    let to = String(o.to||"");
    let parent = (p.rp||[]).find(x=>x.id===to) || null;
    if(p.rp.length>=30) p.rp.splice(0, p.rp.length-30+1);
    let nr = {id:"r"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36), n:key, t:text, at:Date.now(), to:parent?parent.id:null};
    p.rp.push(nr);
    saveLocalDB(db);
    return JSON.stringify({ok:1, rid:nr.id});
  }
  if(name==="sugPush"){
    let o = JSON.parse(data);
    let key = o.nick ? (db.users[o.nick.toLowerCase()]&&db.users[o.nick.toLowerCase()].h===o.hash ? "@"+o.nick : null) : o.anon;
    if(!key) return '{"ok":0,"err":"auth"}';
    if(!db.sug) db.sug = [];
    db.sug.push({id:"s"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36), k:o.kind==="bug"?"bug":"ideia", t:String(o.text||"").slice(0,500), n:key, at:Date.now()});
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="sugDel"){
    let o = JSON.parse(data);
    let saved = sessionStorage.getItem("orkutOwner")||"";
    if(!o.key || o.key!==saved) return '{"ok":0}';
    if(!db.sug) db.sug = [];
    if(o.clear){ db.sug = []; saveLocalDB(db); return '{"ok":1}'; }
    let id = String(o.id||"");
    let n0 = db.sug.length;
    db.sug = db.sug.filter((s, ix)=>String(s.id||ix)!==id && String(ix)!==id);
    if(db.sug.length===n0) return '{"ok":0}';
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="sugGet") return JSON.stringify((db.sug||[]).slice(-200));
  if(name==="sugCount") return JSON.stringify({n:(db.sug||[]).length});
  if(name==="annPush"){
    let o = JSON.parse(data);
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
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
    let url = String(o.url||"").slice(0,500);
    if(url && url.indexOf("https://")!==0) return '{"ok":0,"err":"url"}';
    u.a = url; saveLocalDB(db);
    return JSON.stringify({ok:1, avatar:url});
  }
  if(name==="profileGet"){
    let nick = String(data||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick)) return '{"ok":0}';
    let u = db.users[nick.toLowerCase()];
    if(!u) return '{"ok":0}';
    let tag = "@"+u.n, posts = 0, likes = 0, pub = 0;
    db.feed.forEach(p=>{ if(p.n===tag){ posts++; likes += (p.lk||[]).length; } });
    db.pub.forEach(x=>{ if(x.f===u.n) pub++; });
    let depN = 0, dl = (db.dep && db.dep[nick.toLowerCase()]) || [];
    dl.forEach(d=>{ if(d.ok) depN++; });
    let invN = 0;
    try{ invN = ((db.refs||{})[nick.toLowerCase()]||0); }catch(e2){}
    let viewsN = 0;
    try{ viewsN = ((db.pviews||{})[nick.toLowerCase()]||0); }catch(e3){}
    return JSON.stringify({ok:1, nick:u.n, avatar:u.a||"", created:u.c, posts, likes, pub, dep:depN, inv:invN, views:viewsN, th:u.th||null, pg:u.pg||""});
  }
  if(name==="profView"){
    let nick = String(data||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick)) return '{"ok":0}';
    let u = db.users[nick.toLowerCase()];
    if(!u) return '{"ok":0}';
    if(!db.pviews) db.pviews = {};
    let k = nick.toLowerCase();
    db.pviews[k] = ((db.pviews[k]||0)+1);
    saveLocalDB(db);
    return JSON.stringify({ok:1, views:db.pviews[k]});
  }
  if(name==="themeSet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
    u.th = (o.th===null||o.th===undefined) ? null : {p:String(o.th.p||"").slice(0,20), bg:String(o.th.bg||""), cd:String(o.th.cd||""), tx:String(o.th.tx||""), ac:String(o.th.ac||""), st:String(o.th.st||"").slice(0,20), css:String(o.th.css||"").slice(0,2000)};
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="htmlSet"){
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
    let pg = String(o.pg==null?"":o.pg);
    if(pg.length>8000) return '{"ok":0,"err":"grande"}';
    u.pg = pg; saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="depoGet"){
    if(!db.dep) db.dep = {};
    let o = JSON.parse(data);
    let nick = String(o.to||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick)) return '{"ok":0}';
    if(!db.users[nick.toLowerCase()]) return '{"ok":0}';
    let all = db.dep[nick.toLowerCase()]||[];
    let acc = all.filter(d=>d.ok).map(d=>({id:d.id, f:d.f, t:d.t, u:d.u||"", at:d.at}));
    let pend = [];
    let owner = db.users[(o.nick||"").toLowerCase()];
    if(owner && owner.h===o.hash && owner.n.toLowerCase()===nick.toLowerCase()) pend = all.filter(d=>!d.ok).map(d=>({id:d.id, f:d.f, t:d.t, u:d.u||"", at:d.at}));
    return JSON.stringify({ok:1, acc:acc.slice(-30), pend:pend.slice(-30)});
  }
  if(name==="depoPush"){
    if(!db.dep) db.dep = {};
    let o = JSON.parse(data);
    let u = db.users[(o.nick||"").toLowerCase()];
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
    let nick = String(o.to||"").replace(/^@/,"").replace(/\s+/g,"-").slice(0,20);
    if(!/^[A-Za-z0-9-_]{2,20}$/.test(nick)) return '{"ok":0,"err":"nick"}';
    if(!db.users[nick.toLowerCase()]) return '{"ok":0,"err":"noid"}';
    if(nick.toLowerCase()===u.n.toLowerCase()) return '{"ok":0,"err":"eu"}';
    let text = String(o.text||"").slice(0,300), url = String(o.url||"").slice(0,500);
    if(!text && !url) return '{"ok":0,"err":"vazio"}';
    if(url && url.indexOf("https://")!==0) return '{"ok":0,"err":"url"}';
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
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
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
    if(!u || u.h!==o.hash) return '{"ok":0,"err":"auth"}';
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
    let key = o.nick ? "@"+o.nick : o.anon;
    if(!key || !o.q) return '{"ok":0}';
    if(!db.hist) db.hist = {};
    if(!db.hist[key]) db.hist[key] = [];
    db.hist[key].push({q:String(o.q).slice(0,120), at:Date.now()});
    if(db.hist[key].length>20) db.hist[key].splice(0, db.hist[key].length-20);
    saveLocalDB(db);
    return '{"ok":1}';
  }
  if(name==="histGet"){
    let o = JSON.parse(data);
    let key = o.nick ? "@"+o.nick : o.anon;
    if(!key || !db.hist) return '[]';
    return JSON.stringify(db.hist[key]||[]);
  }
  if(name==="bioGet"){
    if(!db.bio) return 'null';
    let k = String(data||"").toLowerCase().trim().slice(0,80);
    if(!db.bio[k]) return 'null';
    return JSON.stringify(db.bio[k]);
  }
  if(name==="bioSet"){
    let o = JSON.parse(data);
    let k = String(o.k||"").toLowerCase().trim().slice(0,80);
    let a = String(o.a||"").slice(0,1500);
    if(k.length<2 || !a) return '{"ok":0,"err":"vazio"}';
    if(!db.bio) db.bio = {};
    let l = Array.isArray(o.l) ? o.l.slice(0,8).map(x=>({t:String((x&&x.t)||"").slice(0,120), u:String((x&&x.u)||"").slice(0,200), d:String((x&&x.d)||"").slice(0,200)})) : [];
    let ks = Object.keys(db.bio);
    if(ks.length>=300 && !db.bio[k]) delete db.bio[ks[0]];
    db.bio[k] = {a, l, at:Date.now(), v:(parseInt(o.v)||0)};
    saveLocalDB(db);
    return '{"ok":1}';
  }
  return '{"ok":0,"err":"bad"}';
}
function enterLocalMode(){
  if(connected || localMode) return;
  localMode = true;
  setNet("modo local (preview) — salve o generator p/ servidor global");
  refreshAll();
}
async function hashPw(s){ let b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("orkut-"+s)); return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join(""); }
function setNet(t){ netEl.textContent = t; }
function connect(){
  socket = root.createServerSocket();
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
    if(localMode){ setNet("modo local (preview) — salve o generator p/ servidor global"); setTimeout(()=>{ if(!connected) connect(); }, 15000); return; }
    setNet("reconectando...");
    setTimeout(()=>{ if(!connected) connect(); }, 2000);
    setTimeout(()=>{ enterLocalMode(); }, 6000);
  });
  socket.closed.catch(()=>{});
}
async function rpc(name, data){
  if(localMode) return await localRpc(name, data);
  await socket.opened;
  return await socket.rpc[name](data);
}
const CRPC_TTL = {feedGet:15000, pubGet:15000, privGet:15000, roomsList:15000, roomView:10000, profileGet:60000, depoGet:30000, presence:20000, sugGet:60000, sugCount:60000, histGet:120000, bioGet:600000};
function crpcKey(name, data){ return name + "|" + String(data||"").replace(/[0-9a-f]{64}/gi,"").slice(0,200); }
async function crpc(name, data, ttl){
  ttl = ttl || CRPC_TTL[name] || 15000;
  let k = crpcKey(name, data), c = null;
  try{ c = await root.kv.cache.get(k); }catch(e){}
  if(c && Date.now()-c.at < ttl) return c.val;
  let v;
  try{ v = await rpc(name, data); }
  catch(e){ if(c) return c.val; throw e; }
  try{ await root.kv.cache.set(k, {at:Date.now(), val:v}); }catch(e){}
  return v;
}
async function cInv(prefix){
  try{
    let ks = await root.kv.cache.keys();
    let hit = ks.filter(k=>k===prefix || k.indexOf(prefix+"|")===0);
    if(hit.length) await root.kv.cache.deleteMany(hit);
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
function privInviteLink(room){ return (window.ZUNZUM_BASE||"https://perchance.org/"+window.generatorName)+"?priv="+cleanPrivRoom(room); }
async function joinPrivRoom(room){
  room = cleanPrivRoom(room);
  if(room.length<2 || !me) return false;
  privRoom = room;
  privInfo = {locked:0, owner:"", member:1};
  try{ privInput.value = room; }catch(e){}
  paintLocks();
  try{ await rpc("subPriv", room); }catch(e){}
  try{
    let j = JSON.parse(await rpc("privJoin", JSON.stringify({nick:me.nick, hash:me.hash, room})));
    if(j && j.ok) privInfo = {locked:j.locked?1:0, owner:String(j.owner||""), member:j.member?1:0};
  }catch(e){}
  cInv("privGet"); loadPriv(true); loadPendingReqs();
  try{ location.hash = "priv-"+room; }catch(e){}
  return true;
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
function likePayload(id, r){ let b = me ? {id:id, nick:me.nick, hash:me.hash} : {id:id, anon:anonId}; if(r) b.r = r; return b; }
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
  if(!nick || /^anon-[0-9]{4}$/.test(nick)) return "";
  if(!force && avCache[nick]!==undefined){
    let age = Date.now()-(avCacheAt[nick]||0);
    let ttl = avCache[nick] ? 300000 : 60000;
    if(age<ttl) return avCache[nick];
  }
  if(avPending[nick]) return avPending[nick];
  let p = (async()=>{
    try{
      let r = JSON.parse(await crpc("profileGet", nick));
      if(r.ok) avCache[nick] = r.avatar||"";
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
  if(/^anon-[0-9]{4}$/.test(nick)){ b.style.cursor = "default"; return b; }
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
async function openProfile(raw){
  let nick = String(raw||"").replace(/^@/,"").trim();
  if(!nick) return;
  try{ let _pv = document.getElementById("profViews"); if(_pv) _pv.remove(); }catch(e){}
  if(/^anon-[0-9]{4}$/.test(nick)){ profSel = ""; profAvatar.textContent = "?"; profNick.textContent = nick; profStats.textContent = "anonimo sem conta"; profDepo.innerHTML = ""; try{ profMural.innerHTML = ""; }catch(e){} try{ profMuteBtn.hidden = true; profBlockBtn.hidden = true; }catch(e){} profModal.hidden = false; return; }
  profSel = nick;
  profAvatar.textContent = nick.slice(0,1).toUpperCase();
  profNick.textContent = "@"+nick;
  profStats.textContent = "carregando...";
  profModal.hidden = false;
  try{
    let r = JSON.parse(await crpc("profileGet", nick));
    if(!r.ok){ try{ profModal.hidden = true; }catch(e){} showNotFound({icon:"👤", title:"perfil não encontrado", msg:"@"+nick+" não existe no zunzum. Confira o link ou o nick."}); return; }
    profSel = r.nick;
    if(r.avatar){ profAvatar.textContent = ""; let im = document.createElement("img"); im.src = r.avatar; im.onerror = ()=>{ profAvatar.textContent = "?"; }; profAvatar.appendChild(im); }
    let dt = r.created ? new Date(r.created).toLocaleDateString() : "?";
    profStats.innerHTML = "";
    profStats.textContent = "membro desde "+dt+" · posts: "+r.posts+" · curtidas: "+r.likes+" · chat: "+r.pub+" · depoimentos: "+(r.dep||0)+" · convites: "+(r.inv||0);
    try{ profViewHit(r.nick, r.views||0); }catch(e){}
    try{ applyProfTheme(r.th||null); }catch(e){}
    try{ renderProfPg(r.pg||""); }catch(e){}
    try{ paintProfOwner(r); }catch(e){}
    try{ location.hash = "perfil-@"+r.nick; }catch(e){}
    loadDepo(r.nick);
    try{ paintProfMod(); }catch(e){}
    try{
      let ch = "mural-"+String(r.nick||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40);
      profMural.innerHTML = "<h3>mural de recados</h3>";
      let box = document.createElement("div");
      profMural.appendChild(box);
      box.innerHTML = root.commentsPlugin({channel:ch, width:"100%", height:"260px"});
    }catch(e){}
  }catch(e){ profStats.textContent = "sem conexao"; }
}
function depoRow(d, target, mode){
  let w = document.createElement("div"); w.style.fontSize = "13px"; w.style.borderTop = "1px dotted #b6c9db"; w.style.padding = "4px 0";
  let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = "@"+d.f;
  nm.title = "ver perfil @"+d.f; nm.onclick = ()=>openProfile(d.f); let odd = onDot(d.f); if(odd) nm.appendChild(odd); w.appendChild(nm);
  let tx = document.createElement("span"); tx.innerHTML = (d.t ? ": "+fmtChat(d.t) : ""); w.appendChild(tx);
  if(d.u && d.u.indexOf("https://")===0){ let im = document.createElement("img"); im.src = d.u; im.loading = "lazy"; im.className = "chatimg"; im.onerror = ()=>im.remove(); w.appendChild(im); }
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
    [["B","[b]","[/b]","negrito"],["I","[i]","[/i]","itálico"],["U","[u]","[/u]","sublinhado"],["S","[s]","[/s]","riscado"]].forEach(o=>{ let bb = document.createElement("button"); bb.textContent = o[0]; bb.title = o[3]; bb.style.marginRight = "4px"; bb.onclick = ()=>wrapIn(ti, o[1], o[2]); bar.appendChild(bb); });
    let dcol = document.createElement("input"); dcol.type = "color"; dcol.value = "#ff0000"; dcol.title = "cor"; dcol.style.marginRight = "4px"; bar.appendChild(dcol);
    let dcb = document.createElement("button"); dcb.textContent = "cor"; dcb.style.marginRight = "4px"; dcb.onclick = ()=>wrapIn(ti, "[c="+dcol.value+"]", "[/c]"); bar.appendChild(dcb);
    let dsz = document.createElement("select"); dsz.title = "tamanho"; dsz.style.marginRight = "4px";
    ["tam","12","16","20","24","28"].forEach(v=>{ let op = document.createElement("option"); op.value = (v==="tam"?"":v); op.textContent = v; dsz.appendChild(op); });
    dsz.onchange = ()=>{ if(dsz.value) wrapIn(ti, "[size="+dsz.value+"]", "[/size]"); dsz.value = ""; }; bar.appendChild(dsz);
    let dfn = document.createElement("select"); dfn.title = "fonte";
    [["fonte",""],["Arial","Arial"],["Georgia","Georgia"],["Verdana","Verdana"],["mono","monospace"]].forEach(o=>{ let op = document.createElement("option"); op.value = o[1]; op.textContent = o[0]; dfn.appendChild(op); });
    dfn.onchange = ()=>{ if(dfn.value) wrapIn(ti, "[f="+dfn.value+"]", "[/f]"); dfn.value = ""; }; bar.appendChild(dfn);
    let li = document.createElement("input"); li.placeholder = "link de foto https:// (opcional)"; li.style.marginBottom = "4px";
    let sb = document.createElement("button"); sb.textContent = "enviar depoimento";
    let sm = document.createElement("span"); sm.className = "meta"; sm.style.marginLeft = "6px";
    sb.onclick = async ()=>{
      let t = ti.value.trim(), u = li.value.trim();
      if(!t && !u){ sm.textContent = "escreva algo ou coloque foto"; return; }
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
    box.appendChild(f);
  } else if(!me){
    let e = document.createElement("div"); e.className = "meta"; e.style.marginTop = "4px"; e.textContent = "entre com nick+senha para deixar depoimento.";
    box.appendChild(e);
  }
}
async function paintMe(){
  let posts = [];
  try{ posts = JSON.parse(await crpc("feedGet","")); }catch(e){}
  let mine = me ? posts.filter(p=>p.n==="@"+me.nick).length : 0;
  if(me && me.avatar){ avatarEl.textContent = ""; let im = document.createElement("img"); im.src = me.avatar; im.onerror = ()=>{ avatarEl.textContent = (me&&me.nick?me.nick:"?").slice(0,1).toUpperCase(); }; avatarEl.appendChild(im); }
  else avatarEl.textContent = (me ? me.nick : anonId).slice(0,1).toUpperCase();
  meEl.textContent = me ? "@"+me.nick+" logado" : anonId+" anonimo";
  infoList.innerHTML = me ? "posts seus: "+mine : "status: sem conta<br>chat: bloqueado";
  authBox.innerHTML = "";
  if(me){
    let b = document.createElement("button"); b.textContent = "sair";
    b.onclick = ()=>{ let was = me ? me.nick : ""; me = null; localStorage.removeItem("orkutSession"); if(was){ try{ rpc("unsubDepo", was).catch(()=>{}); }catch(e){} try{ rpc("unsubInv", was).catch(()=>{}); }catch(e){} try{ rpc("unsubAppr", was).catch(()=>{}); }catch(e){} } paintMe(); paintLocks(); loadPresence(); };
    authBox.appendChild(b);
    let mb = document.createElement("button"); mb.style.marginLeft = "6px"; mb.title = "silenciar todas as notificações";    function paintMb(){ let off = false; try{ off = localStorage.getItem("zunzumMuteAll:"+me.nick.toLowerCase())==="1"; }catch(e){} mb.textContent = off ? "🔕 silenciado" : "🔔 avisos"; }
    paintMb();
    mb.onclick = ()=>{ try{ let k = "zunzumMuteAll:"+me.nick.toLowerCase(); localStorage.setItem(k, localStorage.getItem(k)==="1"?"0":"1"); }catch(e){} paintMb(); };
    authBox.appendChild(mb);
    function avatarDelGet(){ try{ return localStorage.getItem("zunzumAvatarDel:"+me.nick.toLowerCase())||""; }catch(e){ return ""; } }
    function avatarDelSet(d){ try{ if(d) localStorage.setItem("zunzumAvatarDel:"+me.nick.toLowerCase(), d); else localStorage.removeItem("zunzumAvatarDel:"+me.nick.toLowerCase()); }catch(e){} }
    function avatarDelOld(){ try{ var d = avatarDelGet(); avatarDelSet(""); if(d) fetch(d).then(r=>r.json()).catch(()=>{}); }catch(e){} }
    let lb = document.createElement("label"); lb.className = "meta"; lb.style.display = "block"; lb.style.marginTop = "6px"; lb.textContent = "foto de perfil:";
    let fi = document.createElement("input"); fi.type = "file"; fi.accept = "image/*"; fi.style.marginTop = "4px";
    let st = document.createElement("div"); st.className = "meta";
    fi.onchange = async ()=>{
      let f = fi.files[0]; if(!f) return;
      if(!/^image\//.test(f.type||"")){ st.textContent = "só imagem"; return; }
      st.textContent = "otimizando...";
      f = await shrinkImage(f, 256, 0.85);
      st.textContent = "enviando...";
      try{
        let up = await root.uploadPlugin(f, {expires:Date.now()+1000*60*60*24*90});
        if(up.error){ st.textContent = "erro upload"; return; }
        let r = JSON.parse(await rpc("avatarSet", JSON.stringify({nick:me.nick, hash:me.hash, url:up.url})));
        if(!r.ok){ st.textContent = "erro"; return; }
        avatarDelOld(); avatarDelSet(up.deletionUrl||"");
        me.avatar = r.avatar; localStorage.setItem("orkutSession", JSON.stringify(me));
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
          let m = u2.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
          if(!m) throw 0;
          let bin = atob(m[2].replace(/\s+/g,""));
          let arr = new Uint8Array(bin.length);
          for(let i2=0;i2<bin.length;i2++) arr[i2] = bin.charCodeAt(i2);
          let bb = await shrinkImage(new Blob([arr], {type:m[1]}), 256, 0.85);
          let up2 = await root.uploadPlugin(bb, {expires:Date.now()+1000*60*60*24*90});
          if(up2.error || !up2.url) throw 0;
          u2 = up2.url; newDel = up2.deletionUrl||"";
        }catch(e){ st.textContent = "base64 inválido"; return; }
      }
      if(u2.indexOf("https://")!==0 || /data:|\s/.test(u2)){ st.textContent = "link precisa começar com https://"; return; }
      st.textContent = "salvando...";
      try{
        let r3 = JSON.parse(await rpc("avatarSet", JSON.stringify({nick:me.nick, hash:me.hash, url:u2.slice(0,500)})));
        if(!r3.ok){ st.textContent = "erro"; return; }
        avatarDelOld(); avatarDelSet(newDel);
        me.avatar = r3.avatar; localStorage.setItem("orkutSession", JSON.stringify(me));
        avCache[me.nick] = r3.avatar; avCacheAt[me.nick] = Date.now(); st.textContent = "foto atualizada!"; lin.value = "";
        cInv("profileGet"); paintMe();
      }catch(e){ st.textContent = "sem conexao"; }
    };
    authBox.append(ll, lin, lb3);
    if(me.avatar){
      let rm = document.createElement("button"); rm.textContent = "remover foto"; rm.style.marginTop = "4px";
      rm.onclick = async ()=>{ try{ let r = JSON.parse(await rpc("avatarSet", JSON.stringify({nick:me.nick, hash:me.hash, url:""}))); if(r.ok){ avatarDelOld(); me.avatar = ""; localStorage.setItem("orkutSession", JSON.stringify(me)); avCache[me.nick] = ""; avCacheAt[me.nick] = Date.now(); cInv("profileGet"); paintMe(); } }catch(e){} };
      authBox.appendChild(rm);
    }
  } else {
    let n = document.createElement("input"); n.placeholder = "nick";
    let p = document.createElement("input"); p.placeholder = "senha"; p.type = "password"; p.style.marginTop = "6px";
    let b = document.createElement("button"); b.textContent = "criar / entrar"; b.style.marginTop = "6px";
    let e = document.createElement("div"); e.className = "meta";
    b.onclick = async ()=>{
      let nick = n.value.trim().replace(/\s+/g,"-").slice(0,20), pw = p.value;
      if(nick.length<2 || pw.length<3){ e.textContent = "nick 2+ e senha 3+"; return; }
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
        let r = JSON.parse(await rpc("register", JSON.stringify({nick, hash:h, ref})));
        if(!r.ok){ e.textContent = r.err==="senha" ? "senha errada" : "erro: "+r.err; return; }
        me = {nick:r.nick, hash:h, created:r.created, avatar:r.avatar||""}; localStorage.setItem("orkutSession", JSON.stringify(me));
        paintMe(); paintLocks(); loadPub(); loadPriv(); subDepo(); subInv(); subAppr(); autoJoinPriv(); autoJoinRoom(); loadRooms(); loadPendingInvites(); loadPendingReqs(); loadPresence(); checkPendingDepo(); autoPublishMe();
      }catch(err){ e.textContent = "sem servidor ainda"; }
    };
    authBox.append(n, p, b, e);
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
  btn.title = "gera um novo anon-xxxx; posts antigos continuam com o antigo";
  btn.style.marginLeft = "4px";
  btn.onclick = ()=>{ renewAnon(); };
  row.appendChild(btn);
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
function guessMime(u){
  let s = String(u||"").split("?")[0].split("#")[0].toLowerCase();
  if(/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(s)) return "image/*";
  if(/\.(mp4|webm|mov|ogv)$/.test(s)) return "video/*";
  if(/\.(mp3|ogg|oga|wav|m4a)$/.test(s)) return "audio/*";
  return "";
}
function fmtChat(s){
  let h = esc(s||"");
  h = h.replace(/\[b\]([\s\S]*?)\[\/b\]/gi, "<b>$1</b>").replace(/\[i\]([\s\S]*?)\[\/i\]/gi, "<i>$1</i>").replace(/\[u\]([\s\S]*?)\[\/u\]/gi, "<u>$1</u>").replace(/\[s\]([\s\S]*?)\[\/s\]/gi, "<s>$1</s>").replace(/\[c=([#A-Za-z0-9]+)\]([\s\S]*?)\[\/c\]/gi, function(m,c,t){ if(!/^#[0-9a-fA-F]{3,6}$/.test(c) && !/^[a-zA-Z]+$/.test(c)) return t; return '<span style="color:'+c+'">'+t+"</span>"; });
  h = h.replace(/(https:\/\/[^\s<"]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  let my = me ? me.nick.toLowerCase() : "";
  h = h.replace(/(^|\s)@([A-Za-z0-9-_]{2,20})/g, function(m, sp, n){ return sp+'<span class="'+(n.toLowerCase()===my?"mention-me":"mention")+'">@'+n+"</span>"; });
  h = h.replace(/\[size=(\d{1,2})\]([\s\S]*?)\[\/size\]/gi, function(m, num, t){ num = parseInt(num,10); if(!(num>=10&&num<=32)) return t; return '<span style="font-size:'+num+'px">'+t+"</span>"; });
  h = h.replace(/\[f=([A-Za-z ]{2,24})\]([\s\S]*?)\[\/f\]/gi, function(m, fn, t){ fn = fn.replace(/['";]/g,"").trim(); if(!fn) return t; return '<span style="font-family:'+fn+',sans-serif">'+t+"</span>"; });
  return h;
}
function eroNorm(s){ return String(s||"").toLowerCase(); }
function eroMode(){
  try{
    var m = localStorage.getItem("zunzumEroMode");
    if(m==="blur"||m==="hide"||m==="show") return m;
    if(localStorage.getItem("zunzumShowErotic")==="1") return "show";
    return "blur";
  }catch(e){ return "blur"; }
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
    scope.querySelectorAll(".post img, .chatlog img, .nmsg img").forEach(function(im){
      if(!im || im.dataset.eroScan) return;
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
  try{
    var r = await root.superFetch(url);
    var blob = null;
    try{ blob = await r.blob(); }catch(e){
      try{ var ab = await r.arrayBuffer(); blob = new Blob([ab], {type:"image/jpeg"}); }catch(e2){ return null; }
    }
    if(!blob || !(blob.size>500)) return null;
    if(blob.size>2500000) return null;
    var out = String(await root.generateText({instruction:["Analise esta foto. Responda SO com JSON, sem mais nada: {\"erotic\":true|false, \"furry\":true|false}. erotic=true se ha nudez, genital, seios a mostra, ato sexual ou insinuacao sexual forte. furry=true SOMENTE se houver personagem bicho antropomorfico: mamifero peludo (focinho, orelhas de bicho, rabo peludo, patas), ou reptil/dragao com corpo de bicho em pe (scalie: focinho, chifres, cauda, garras), fursuit ou arte furry/yiff. NAO marque insetos (abelha, formiga), passaros, peixes, mascotes cartoon sem pelo, nem humano fantasiado com orelhinha.", blob]})||"");
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
      c.addEventListener("change", ()=>{ setEroMode(c.checked?"show":"blur"); });
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
  if(x.u){
    let y = x.y||guessMime(x.u);
    if(y.indexOf("image/")===0) return '<br><img class="chatimg" loading="lazy" src="'+esc(x.u)+'">';
    if(y.indexOf("video/")===0) return '<br><video class="chatfile" controls src="'+esc(x.u)+'"></video>';
    if(y.indexOf("audio/")===0) return '<br><audio controls src="'+esc(x.u)+'" style="max-width:100%"></audio>';
    return '<br><img class="chatimg" loading="lazy" src="'+esc(x.u)+'" onerror="this.remove()"><a href="'+esc(x.u)+'" target="_blank" rel="noopener">abrir anexo</a>';
  }
  let out = "", n = 0;
  (String(x.t||"").match(/https:\/\/[^\s<"]+/g)||[]).forEach(u=>{
    if(n>=2) return;
    let clean = u.replace(/[.,!?;:]+$/, "");
    let m = guessMime(clean);
    if(m.indexOf("image/")===0){ out += '<br><img class="chatimg" loading="lazy" src="'+esc(clean)+'">'; n++; }
    else if(m.indexOf("video/")===0){ out += '<br><video class="chatfile" controls src="'+esc(clean)+'"></video>'; n++; }
    else if(m.indexOf("audio/")===0){ out += '<br><audio controls src="'+esc(clean)+'" style="max-width:100%"></audio>'; n++; }
  });
  return out;
}
function chatTime(at){
  try{
    var d=new Date(at);
    if(isNaN(d)) return "";
    var hm=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");
    if(d.toDateString()===new Date().toDateString()) return hm;
    return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+" "+hm;
  }catch(e){ return ""; }
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
  var r = await root.superFetch(url);
  var j = null;
  try{ j = await r.json(); }catch(e){ try{ j = JSON.parse(await r.text()); }catch(e2){ return null; } }
  if(!j || !j.responseData) return null;
  if(j.quotaFinished){ try{ window._trQuotaDead = true; }catch(e){} return null; }
  var out = String(j.responseData.translatedText||"").trim();
  if(!out || out===q.trim()) return null;
  return out;
}
let trQueue = [], trBusy = 0;
function trApply(scope){
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
            if(j.el.classList.contains("ttext")) j.el.innerHTML = fmtChat(out);
            else j.el.textContent = out;
            j.el.dataset.tr = "done";
            addTrToggle(j.el, txt);
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
        if(cur===null) cur = el.classList.contains("ttext") ? el.innerHTML : el.textContent;
        if(el.classList.contains("ttext")) el.innerHTML = fmtChat(orig);
        else el.textContent = orig;
        b.textContent = "🌐 traduzido";
      } else {
        if(el.classList.contains("ttext")) el.innerHTML = cur;
        else el.textContent = cur;
        b.textContent = "🌐 original";
      }
    };
    el.after(b);
  }catch(e){}
}
function chatRow(x, inputEl){
  let d = document.createElement("div");
  let nick = x.f;
  try{ if(zunBlocked(nick)){ d.style.display = "none"; d.dataset.zunHidden = "1"; return d; } }catch(e){}
  d.appendChild(miniAv(nick));
  let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = "@"+nick;
  nm.title = "ver perfil @"+nick;
  nm.onclick = ()=>openProfile(nick);
  let od0 = onDot(nick); if(od0) nm.appendChild(od0);
  nm.ondblclick = (ev)=>{ ev.stopPropagation(); if(!inputEl) return; inputEl.value += (inputEl.value && !/\s$/.test(inputEl.value) ? " " : "") + "@"+nick+" "; inputEl.focus(); };
  d.appendChild(nm);
  let sp = document.createElement("span"); sp.appendChild(document.createTextNode(": "));
  let tt = document.createElement("span"); tt.className = "ttext"; tt.dataset.plain = x.t||""; tt.innerHTML = fmtChat(x.t||""); sp.appendChild(tt);
  let fs = null; let fh = chatFileHtml(x); if(fh){ fs = document.createElement("span"); fs.innerHTML = fh; sp.appendChild(fs); }
  d.appendChild(sp);
  let tm = document.createElement("span"); tm.className = "meta"; tm.style.marginLeft = "6px"; tm.textContent = chatTime(x.at);
  if(tm.textContent) d.appendChild(tm);
  try{ if(isEroticText(x.t)){ let els = [tt]; if(fs) els.push(fs); paintErotic(d, els); } }catch(e){}
  return d;
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
let feedPill = null, pubPill = null, privPill = null, pillsWired = false;
function atTopEdge(el){ try{ return (el.scrollTop||0) < 60; }catch(e){ return true; } }
function atBottomEdge(el){ try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < 60; }catch(e){ return true; } }
function maxAtSince(list){ let m = 0; try{ list.forEach(x=>{ if(x && x.at > m) m = x.at; }); }catch(e){} return m; }
function sigFeed(posts){ try{ let l=0, rp=0; posts.forEach(p=>{ l+=(p.lk||[]).length; rp+=(p.rp||[]).length; }); return posts.length+"|"+(posts.length?posts[posts.length-1].at:0)+"|"+l+"|"+rp; }catch(e){ return ""; } }
function sigChat(m){ try{ let l=m.slice(-30); return m.length+"|"+(l.length?l[l.length-1].at:0)+"|"+(l.length?String(l[l.length-1].t||"").length:0); }catch(e){ return ""; } }
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
  }catch(e){}
}
let lastSendAt = {feed:0, chat:0};
function sendGapOk(kind, gapMs){
  let now = Date.now();
  if(now - (lastSendAt[kind]||0) < gapMs) return Math.ceil((gapMs-(now-lastSendAt[kind]))/1000);
  lastSendAt[kind] = now; return 0;
}
function spamErrText(r){
  if(!r || r.ok) return "";
  let w = parseInt((r&&r.wait)||0)||0;
  if(r.err==="spam") return "🚫 spam! aguarde "+w+"s";
  if(r.err==="devagar") return "⏳ devagar! aguarde "+w+"s";
  if(r.err==="ban") return "🚫 você foi banido desta sala";
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
    try{ lastFeedAt = posts.length ? posts[posts.length-1].at : 0; }catch(e){}
    ensureNewPills();
    let _sgf = sigFeed(posts);
    if(!force && paintedFeed && _sgf===paintSigFeed) return;
    if(!force && paintedFeed && !atTopEdge(feedCtn)){
      let n = newCountSince(posts, seenAtFeed);
      if(n > 0){ pendFeed = posts; showNewPill(feedPill, "↑ " + n + (n > 1 ? " novos posts" : " novo post")); return; }
    }
    pendFeed = null; hideNewPill(feedPill);
    paintFeed(posts);
  }catch(e){ if(!paintedFeed){ try{ feedCtn.innerHTML = "<span class='meta'>conectando servidor...</span>"; }catch(e2){} } }
}
function paintFeed(posts){
  try{
    let openIds = {}, st = 0, sh0 = 0;
    try{ st = feedCtn.scrollTop||0; sh0 = feedCtn.scrollHeight||0; feedCtn.querySelectorAll("[data-pid]").forEach(b=>{ if(!b.hidden) openIds[b.dataset.pid]=1; }); }catch(e){}
    feedCtn.innerHTML = posts.length ? "" : "<span class='meta'>vazio</span>";
    try{ if(posts.length !== (window._feedTotal||-1) && (window._feedShown||20) >= posts.length) window._feedShown = 20; }catch(e){}
    window._feedTotal = posts.length;
    posts.slice().reverse().slice(0, window._feedShown||20).forEach(p=>{
      try{ if(zunBlocked(String(p.n||"").replace(/^@/,""))) return; }catch(e){}
      let d = document.createElement("div"); d.className = "post";
      let head = document.createElement("div");
      let an = String(p.n||"");
      let ptx = null;
      if(an.charAt(0)==="@"){ head.appendChild(miniAv(an.slice(1))); let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = an; nm.title = "ver perfil "+an; nm.onclick = ()=>openProfile(an); let odf = onDot(an.slice(1)); if(odf) nm.appendChild(odf); head.appendChild(nm); let tx = document.createElement("span"); tx.className = "ptext"; tx.textContent = ": "+(p.t||""); head.appendChild(tx); ptx = tx; }
      else { head.appendChild(document.createTextNode(an+": ")); let tx2 = document.createElement("span"); tx2.className = "ptext"; tx2.textContent = p.t||""; head.appendChild(tx2); ptx = tx2; }
      if(an==="📢support-zunzum"){ d.style.background = "#fff8e1"; d.style.border = "2px solid #ffb300"; d.style.borderRadius = "8px"; d.style.padding = "8px"; d.style.boxShadow = "0 2px 8px rgba(255,179,0,.35)"; d.dataset.annPost = "1"; }
      else if(an==="🤖Zunzim·IA"){ d.style.background = "#f6faff"; d.style.border = "1px solid #d9e6f2"; d.style.borderRadius = "6px"; d.style.padding = "6px"; d.dataset.aiPost = "1"; }
      d.appendChild(head);
      let pmedia = null;
      if(p.u){
        if((p.y||"").indexOf("image/")===0){ let im = document.createElement("img"); im.src = p.u; im.loading = "lazy"; d.appendChild(im); pmedia = im; }
        else if((p.y||"").indexOf("video/")===0){ let v = document.createElement("video"); v.src = p.u; v.controls = true; d.appendChild(v); pmedia = v; }
        else { let a = document.createElement("a"); a.href = p.u; a.target = "_blank"; a.textContent = "arquivo"; d.appendChild(a); }
      }
      try{ if(!d.dataset.aiPost && !d.dataset.annPost && isEroticText(p.t)){ let els = []; if(ptx) els.push(ptx); if(pmedia) els.push(pmedia); paintErotic(d, els); } }catch(e){}
      let m = document.createElement("div"); m.className = "meta"; m.textContent = new Date(p.at).toLocaleString(); d.appendChild(m);
      let likes = p.lk||[];
      let myR = (p.rx && p.rx[myKey()]) || (likes.indexOf(myKey())>=0 ? "curti" : null);
      let wrap = document.createElement("span"); wrap.style.position = "relative"; wrap.style.display = "inline-block";
      let b = document.createElement("button"); b.style.marginTop = "4px";
      b.textContent = reactLabel(p, myR);
      let counts = reactCountsLocal(p);
      if(likes.length){ b.title = Object.keys(counts).map(k=>reactEmoji(k)+" "+k+": "+counts[k]).join(" · "); }
      let pick = document.createElement("div"); pick.hidden = true;
      pick.style.cssText = "position:absolute;bottom:110%;left:0;background:#fff;border:1px solid #b6c9db;border-radius:10px;padding:6px;display:flex;gap:4px;z-index:20;box-shadow:0 4px 14px rgba(20,40,70,.25)";
      REACTS.forEach(rt=>{
        let rb = document.createElement("button"); rb.textContent = rt[1]; rb.title = rt[0];
        rb.style.cssText = "border:1px solid #b6c9db;background:#eef4fb;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:13px"+(myR===rt[0]?"outline:2px solid #6aa5d7;":"");
        rb.onclick = async (ev)=>{ ev.stopPropagation(); try{ let r = JSON.parse(await rpc("like", JSON.stringify(likePayload(p.id, rt[0])))); if(r.ok){ b.textContent = (r.mine ? reactEmoji(r.mine) : "👍")+" · "+r.likes; if(r.counts) b.title = Object.keys(r.counts).map(k=>reactEmoji(k)+" "+k+": "+r.counts[k]).join(" · "); else b.title = ""; pick.hidden = true; cInv("feedGet"); } }catch(e){} };
        pick.appendChild(rb);
      });
      b.onclick = (ev)=>{ ev.stopPropagation(); document.querySelectorAll(".reactPick").forEach(x=>{ if(x!==pick) x.hidden = true; }); pick.hidden = !pick.hidden; };
      document.addEventListener("click", ()=>{ pick.hidden = true; }, {once:true});
      pick.className = "reactPick";
      wrap.appendChild(b); wrap.appendChild(pick);
      d.appendChild(wrap);
      let rc = (p.rp||[]).length;
      let rb = document.createElement("button"); rb.style.marginTop = "4px"; rb.style.marginLeft = "6px";
      rb.textContent = "respostas ("+rc+")";
      let rbox = document.createElement("div"); rbox.hidden = true; rbox.style.marginTop = "6px"; rbox.dataset.pid = p.id;
      let rlist = document.createElement("div"); rbox.appendChild(rlist);
      let replyTo = null;
      let rTarget = document.createElement("div"); rTarget.hidden = true; rTarget.style.fontSize = "12px"; rTarget.style.margin = "4px 0"; rbox.appendChild(rTarget);
      let ri = document.createElement("input"); ri.placeholder = "responder..."; ri.style.marginTop = "4px";
      let rs = document.createElement("button"); rs.textContent = "enviar"; rs.style.marginTop = "4px";
      function paintRTarget(){
        if(!replyTo){ rTarget.hidden = true; ri.placeholder = "responder..."; return; }
        rTarget.hidden = false; rTarget.innerHTML = "";
        rTarget.appendChild(document.createTextNode("respondendo a "+replyTo.n+" "));
        let cx = document.createElement("button"); cx.textContent = "x"; cx.style.marginLeft = "4px";
        cx.onclick = ()=>{ replyTo = null; paintRTarget(); };
        rTarget.appendChild(cx);
        ri.placeholder = "responder a "+replyTo.n+"...";
      }
      function replyNode(r, depth){
        let rd = document.createElement("div");
        rd.style.fontSize = "13px"; rd.style.marginTop = "3px";
        if(depth>0){ rd.style.marginLeft = (Math.min(depth,3)*14)+"px"; rd.style.borderLeft = "2px solid #b6c9db"; rd.style.paddingLeft = "6px"; }
        let nm = document.createElement("span"); nm.className = "chatname"; nm.textContent = r.n;
        if(String(r.n||"").charAt(0)==="@"){ nm.title = "ver perfil "+r.n; nm.onclick = ()=>openProfile(r.n); }
        rd.appendChild(nm);
        let tx = document.createElement("span"); tx.className = "ptext"; tx.textContent = ": "+(r.t||""); rd.appendChild(tx);
        try{ if(isEroticText(r.t)) paintErotic(rd, [tx]); }catch(e){}
        let ans = document.createElement("button"); ans.textContent = "responder"; ans.style.marginLeft = "6px"; ans.style.fontSize = "11px";
        ans.onclick = (ev)=>{ ev.stopPropagation(); replyTo = {id:r.id, n:r.n}; paintRTarget(); try{ ri.focus(); }catch(e){} };
        rd.appendChild(ans);
        return rd;
      }
      function renderReplies(){
        rlist.innerHTML = "";
        let list = (p.rp||[]).map((r,ix)=>({id:r.id||("r-"+ix), n:r.n, t:r.t, at:r.at, to:r.to||null})).filter(r=>{ try{ return !zunBlocked(String(r.n||"").replace(/^@/,"")); }catch(e){ return true; } });
        let byId = {}; list.forEach(r=>{ byId[r.id] = r; });
        let kids = {}; list.forEach(r=>{ if(r.to && byId[r.to]){ (kids[r.to] = kids[r.to]||[]).push(r); } });
        let tops = list.filter(r=>!(r.to && byId[r.to]));
        if(!tops.length && list.length) tops = list;
        tops.forEach(t=>{
          rlist.appendChild(replyNode(t, 0));
          (kids[t.id]||[]).forEach(c=>{
            rlist.appendChild(replyNode(c, 1));
            (kids[c.id]||[]).forEach(g=>{ rlist.appendChild(replyNode(g, 2)); });
          });
        });
      }
      renderReplies();
      rbox.appendChild(ri);
      rs.onclick = async ()=>{
        let t = ri.value.trim(); if(!t) return;
        let _gw4 = sendGapOk("chat", 2000);
        if(_gw4){ flashBtn(rs, "⏳ aguarde "+_gw4+"s"); return; }
        try{
          let r2 = JSON.parse(await rpc("reply", JSON.stringify(Object.assign(likePayload(p.id), {text:t, to:replyTo?replyTo.id:null}))));
          if(r2.ok){ ri.value = ""; replyTo = null; paintRTarget(); rc++; rb.textContent = "respostas ("+rc+")"; cInv("feedGet"); loadFeed(true); }
          else { let _rm = spamErrText(r2); if(_rm) flashBtn(rs, _rm); }
        }catch(e){}
      };
      rbox.appendChild(rs);
      rb.onclick = ()=>{ rbox.hidden = !rbox.hidden; };
      d.appendChild(rb); d.appendChild(rbox);
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
    try{ feedCtn.querySelectorAll("[data-pid]").forEach(b=>{ if(openIds[b.dataset.pid]) b.hidden = false; }); feedCtn.scrollTop = st + ((feedCtn.scrollHeight||0) - sh0); }catch(e){}
    try{ trApply(feedCtn); }catch(e){}
    try{ if(window.nodalPaintFeed) window.nodalPaintFeed(feedCtn); }catch(e){}
    try{ eroScanMedia(feedCtn); }catch(e){}
    seenAtFeed = maxAtSince(posts); paintedFeed = true; paintSigFeed = sigFeed(posts);
  }catch(e){}
}
let pubRoom = "geral", pubTopic = null, pubFlipped = false;
let curRole = {owner:0, mod:0, banned:0}, curRoomMeta = null, curTopics = [], curTopic = null;
let roomsCache = [], topicsSig = "", topicsEditorOpen = false;
function roomErrText(r){
  if(!r || r.ok) return "";
  if(r.err==="spam" || r.err==="devagar") return spamErrText(r);
  let m = {auth:"entre com nick+senha", nome:"nome inválido (2+ letras)", existe:"já existe com esse nome", foto:"foto precisa ser https://", cheio:"limite cheio, tente depois", limite:"máx 5 salas por pessoa", mod:"só dono/mods", dono:"só o dono", nick:"nick inválido", noid:"não encontrado", ban:"🚫 você foi banido desta sala", rate:"devagar, aguarde...", room:"sala inválida", topic:"tópico inválido", tente:"tente de novo", eu:"esse é você", vazio:"digite algo", url:"link precisa ser https://", tema:"tema inválido", bad:"erro"};
  return m[r.err] || ("erro: "+(r.err||"?"));
}
function roomLink(id){ try{ return (window.ZUNZUM_BASE||"https://perchance.org/"+window.generatorName)+"?sala="+(id||"geral"); }catch(e){ return "?sala="+(id||"geral"); } }
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
async function loadRooms(){
  try{
    let list = JSON.parse(await crpc("roomsList",""));
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
      if(r.photo){ let im = document.createElement("img"); im.src = r.photo; im.loading = "lazy"; im.alt = ""; c.appendChild(im); }
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
    if(ph){ let im = document.createElement("img"); im.src = ph; im.alt = ""; pubPhotoEl.appendChild(im); }
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
  let css = "#wrap #pubBox{background:"+r.cd+"!important;color:"+r.tx+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox h3{color:"+r.tx+"!important}"
    +"#wrap #pubBox .meta{color:"+r.tx+"!important;opacity:.75}"
    +"#wrap #pubBox #pubNameEl{color:"+r.ac+"!important}"
    +"#wrap #pubBox #pubPhotoEl{background:"+r.ac+"!important;color:"+onAc+"!important}"
    +"#wrap #pubBox #pubLog{background:"+r.bg+"!important;border-color:"+r.ac+"!important;color:"+r.tx+"!important}"
    +"#wrap #pubBox #pubLog div{border-color:"+r.ac+"55!important}"
    +"#wrap #pubBox #pubLog .chatname{color:"+r.ac+"!important}"
    +"#wrap #pubBox #pubTopicsBar button{background:"+r.bg+"!important;color:"+r.tx+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox #pubTopicsBar button.on{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox .fbar button,#wrap #pubBox #pubFlipBtn,#wrap #pubBox #pubNewBtn,#wrap #pubBox #pubLinkBtn,#wrap #pubBox #pubModBtn,#wrap #pubBox #pubCreateBtn,#wrap #pubBox #pubCreateCancelBtn,#wrap #pubBox #pubBtn{background:"+r.ac+"!important;color:"+onAc+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox input,#wrap #pubBox select,#wrap #pubBox textarea{background:"+(isDark(r.cd)?"#222":"#fff")+"!important;color:"+r.tx+"!important;border-color:"+r.ac+"!important}"
    +"#wrap #pubBox a{color:"+r.ac+"!important}";
  if(r.css) css += r.css;
  return css;
}
function applyRoomTheme(meta){
  try{
    let old = document.getElementById("pubRoomThemeEl");
    let isG = !pubRoom || pubRoom==="geral";
    if(isG || !meta || !meta.theme){ if(old) old.remove(); return; }
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
      if(f.size>52428800){ pubCreateMsg.textContent = "arquivo muito grande"; pubCreateBtn.disabled = false; return; }
      let up = await root.uploadPlugin(f, {expires:Date.now()+1000*60*60*24*30});
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
function paintPub(m){
  try{
    let atBot = true, pst = 0;
    try{ atBot = (pubLog.scrollHeight - pubLog.scrollTop - pubLog.clientHeight) < 40; pst = pubLog.scrollTop||0; }catch(e){}
    pubLog.innerHTML = "";
    fillMentions(m);
    let canMod = me && curRole && (curRole.owner||curRole.mod);
    m.slice(-30).forEach(x=>{
      let row = chatRow(x, pubInput);
      pubLog.appendChild(row);
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
      }catch(e){}
    });
    try{ pubLog.scrollTop = atBot ? pubLog.scrollHeight : pst; }catch(e){}
    try{ trApply(pubLog); }catch(e){}
    try{ eroScanMedia(pubLog); }catch(e){}
    seenAtPub = maxAtSince(m); paintedPub = true; paintSigPub = sigChat(m)+"|"+pubRoom+"|"+(pubTopic||"");
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
let privKeys = {};
async function privKey(room){
  if(privKeys[room]) return privKeys[room];
  let b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("zunzum-priv:"+room));
  let k = await crypto.subtle.importKey("raw", b, "AES-GCM", false, ["encrypt","decrypt"]);
  privKeys[room] = k; return k;
}
function b64e(buf){ let s = ""; new Uint8Array(buf).forEach(x=>s+=String.fromCharCode(x)); return btoa(s); }
function b64d(s){ let b = atob(s); let u = new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i] = b.charCodeAt(i); return u.buffer; }
async function privEnc(room, text){
  let k = await privKey(room);
  let iv = crypto.getRandomValues(new Uint8Array(12));
  let ct = await crypto.subtle.encrypt({name:"AES-GCM", iv:iv}, k, new TextEncoder().encode(text));
  return "ENC1:"+b64e(iv)+":"+b64e(ct);
}
async function privDec(room, text){
  if(typeof text!=="string" || text.indexOf("ENC1:")!==0) return text;
  try{
    let p = text.split(":");
    let k = await privKey(room);
    let pt = await crypto.subtle.decrypt({name:"AES-GCM", iv:new Uint8Array(b64d(p[1]))}, k, b64d(p[2]));
    return new TextDecoder().decode(pt);
  }catch(e){ return text; }
}
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
async function paintPriv(m){
  try{
    let atBot2 = true, pst2 = 0;
    try{ atBot2 = (privLog.scrollHeight - privLog.scrollTop - privLog.clientHeight) < 40; pst2 = privLog.scrollTop||0; }catch(e){}
    privLog.innerHTML = "";
    for(let x of m.slice(-30)){ try{ x.t = await privDec(privRoom, x.t); }catch(e){} privLog.appendChild(chatRow(x, privMsgInput)); }
    try{ privLog.scrollTop = atBot2 ? privLog.scrollHeight : pst2; }catch(e){}
    try{ trApply(privLog); }catch(e){}
    try{ eroScanMedia(privLog); }catch(e){}
    seenAtPriv = maxAtSince(m); paintedPriv = true; paintSigPriv = sigChat(m);
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
      t.style.cssText = "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:9999;background:#fff8e1;border:2px solid #ffb300;border-radius:10px;padding:10px 16px;font-size:14px;box-shadow:0 4px 16px #0004;text-align:center;max-width:90vw";
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
async function prepUpload(f, maxSide, q, onStage){
  try{
    if(!f) return f;
    var t = f.type||"";
    if(/^image\//.test(t)) return await shrinkImage(f, maxSide||1024, q||0.82);
    if(/^audio\//.test(t)){ if(onStage) onStage("comprimindo áudio..."); return await compressAudio(f); }
    if(/^video\//.test(t)){ if(onStage) onStage("comprimindo vídeo..."); return await compressVideo(f); }
  }catch(e){}
  return f;
}
function feedDataUrlToBlob(d){
  try{
    let m = String(d||"").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
    if(!m) return null;
    let bin = atob(m[2].replace(/\s+/g,""));
    let arr = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], {type:m[1]});
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
  let text = textInput.value.trim(); let f = fileInput.files[0];
  let linkUrl = "";
  try{ linkUrl = (typeof feedLink!=="undefined"&&feedLink ? feedLink.value : "").trim(); }catch(e){}
  if(!text && !f && !linkUrl) return;
  let _gw = sendGapOk("feed", 8000);
  if(_gw){ upEl.textContent = "⏳ devagar! aguarde "+_gw+"s"; return; }
  upEl.textContent = (f||linkUrl) ? "enviando..." : "";
  let url = "", mtype = "";
  if(f){ f = await prepUpload(f, 1024, 0.82, (s)=>{ upEl.textContent = s; }); if(f.size>52428800){ upEl.textContent = "arquivo muito grande (máx 50MB)"; return; } upEl.textContent = "enviando..."; let r = await root.uploadPlugin(f, {expires:Date.now()+1000*60*60*24*30}); if(r.error){ upEl.textContent = "erro upload"; return; } url = r.url; mtype = f.type; }
  else if(linkUrl){
    let raw = String(linkUrl).trim();
    let isB64 = /^data:image\//i.test(raw) || (/^[A-Za-z0-9+/=\s]+$/.test(raw) && raw.replace(/\s+/g,"").length>2000 && raw.indexOf(".")<0 && raw.indexOf(":")<0);
    if(isB64){
      upEl.textContent = "comprimindo imagem...";
      let b = /^data:image\//i.test(raw) ? feedDataUrlToBlob(raw) : feedRawB64ToBlob(raw);
      if(!b){ upEl.textContent = "base64 inválido"; return; }
      let cf = await shrinkImage(new File([b],"foto.jpg",{type:b.type||"image/jpeg"}), 1024, 0.82);
      if(cf.size>52428800){ upEl.textContent = "arquivo muito grande (máx 50MB)"; return; }
      upEl.textContent = "enviando...";
      let r = await root.uploadPlugin(cf, {expires:Date.now()+1000*60*60*24*30});
      if(r.error){ upEl.textContent = "erro upload"; return; }
      url = r.url; mtype = cf.type;
    } else {
      let nu = normFeedLink(raw);
      let compressed = false;
      try{ mtype = guessMime(nu); }catch(e){ mtype = ""; }
      if(mtype.indexOf("image")===0){
        try{
          upEl.textContent = "comprimindo imagem...";
          let rb = await root.superFetch(nu).then(r=>r.blob());
          if(rb && /^image\//.test(rb.type||"")){
            let cf2 = await shrinkImage(new File([rb],"foto.jpg",{type:rb.type}), 1024, 0.82);
            if(cf2 && cf2.size>500 && cf2.size<=52428800){
              upEl.textContent = "enviando...";
              let ur = await root.uploadPlugin(cf2, {expires:Date.now()+1000*60*60*24*30});
              if(!ur.error && ur.url){ url = ur.url; mtype = cf2.type; compressed = true; }
            }
          }
        }catch(e){}
      }
      if(!compressed){ url = nu.slice(0,500); try{ mtype = guessMime(url); }catch(e){ mtype = ""; } }
    }
  }
  try{
    let payload = me ? {nick:me.nick, hash:me.hash, text, url, mtype} : {anon:anonId, text, url, mtype};
    let r = JSON.parse(await rpc("feedPush", JSON.stringify(payload)));
    let _em = spamErrText(r);
    if(_em){ upEl.textContent = _em; return; }
    textInput.value = ""; fileInput.value = ""; try{ if(typeof feedLink!=="undefined"&&feedLink) feedLink.value = ""; }catch(e){} upEl.textContent = "";
    cInv("feedGet"); loadFeed(true);
  }catch(e){ upEl.textContent = "sem servidor"; }
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
    if(f){ f = await prepUpload(f, 1024, 0.82); if(f.size>52428800){ flashBtn(pubBtn, "arquivo muito grande (máx 50MB)"); pubBtn.disabled = false; paintLocks(); return; } let r = await root.uploadPlugin(f, {expires:Date.now()+1000*60*60*24*30}); if(r.error){ pubBtn.disabled = false; paintLocks(); return; } url = r.url; mtype = f.type; }
    else if(linkUrl){ if(linkUrl.indexOf("https://")!==0){ pubBtn.disabled = false; paintLocks(); pubLink.focus(); return; } url = linkUrl.slice(0,500); mtype = guessMime(url); }
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
    if(f){ f = await prepUpload(f, 1024, 0.82); if(f.size>52428800){ flashBtn(privSendBtn, "arquivo muito grande (máx 50MB)"); privSendBtn.disabled = false; paintLocks(); return; } let r = await root.uploadPlugin(f, {expires:Date.now()+1000*60*60*24*30}); if(r.error){ privSendBtn.disabled = false; paintLocks(); return; } url = r.url; mtype = f.type; }
    else if(linkUrl){ if(linkUrl.indexOf("https://")!==0){ privSendBtn.disabled = false; paintLocks(); privLink.focus(); return; } url = linkUrl.slice(0,500); mtype = guessMime(url); }
    let et = t; try{ et = t ? await privEnc(privRoom, t) : t; }catch(e){}
    let vr = {ok:0, err:"?"};
    try{ vr = JSON.parse(await rpc("privPush", JSON.stringify({nick:me.nick, hash:me.hash, room:privRoom, text:et, url, mtype}))); }catch(e2){}
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
function perfilLink(nick){ return (window.ZUNZUM_BASE||"https://perchance.org/"+window.generatorName)+"?perfil="+perfilSlug(nick); }
var PERFIL_REPUB_MS = 30*24*3600*1000;
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
    let key = null; try{ key = localStorage.getItem("zunzumPerfilKey:"+slug); }catch(e){}
    if(!key && me && me.hash){
      try{
        let gr = JSON.parse(await crpc("pkeyGet", JSON.stringify({nick:me.nick, hash:me.hash})));
        if(gr.ok && /^[0-9a-f]{1,300}$/i.test(gr.blob||"")) key = gr.blob;
      }catch(e){}
    }
    let res = await root.uploadPlugin.editable.set("zunzum-perfil-"+slug, JSON.stringify(data), key?{editKey:key}:undefined);
    if(res && res.error) return;
    if(res && res.editKey){
      try{ localStorage.setItem("zunzumPerfilKey:"+slug, res.editKey); }catch(e){}
      try{ if(me && me.hash) crpc("pkeyPut", JSON.stringify({nick:me.nick, hash:me.hash, blob:res.editKey})).catch(()=>{}); }catch(e){}
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
if(me && me.avatar===undefined){ me.avatar = ""; try{ localStorage.setItem("orkutSession", JSON.stringify(me)); }catch(e){} }
function isOwner(){ return !!sessionStorage.getItem("orkutOwner"); }
function ownerKey(){ return sessionStorage.getItem("orkutOwner")||""; }
async function reloadSug(){
  try{
    let list = JSON.parse(await crpc("sugGet", ownerKey()));
    if(Array.isArray(list)){ paintSug(list); try{ localStorage.setItem("orkutSugSeenN", String(list.length)); }catch(e){} }
  }catch(e){}
}
async function delSug(id, btn){
  if(!confirm("Apagar esta mensagem?")) return;
  if(btn) btn.disabled = true;
  try{
    let r = JSON.parse(await rpc("sugDel", JSON.stringify({key:ownerKey(), id})));
    if(r.ok) reloadSug(); else { sugMsg.textContent = "erro ao apagar"; if(btn) btn.disabled = false; }
  }catch(e){ if(btn) btn.disabled = false; }
}
function paintSug(list){
  sugList.innerHTML = "";
  if(isOwner() && list.length){
    let row = document.createElement("div"); row.style.margin = "6px 0";
    let all = document.createElement("button"); all.textContent = "apagar todas ("+list.length+")"; all.style.background = "#d33"; all.style.color = "#fff"; all.style.border = "1px solid #a00"; all.style.borderRadius = "5px"; all.style.cursor = "pointer";
    all.onclick = async ()=>{
      if(!confirm("Apagar TODAS as mensagens da área do dono?")) return;
      all.disabled = true;
      try{ let r = JSON.parse(await rpc("sugDel", JSON.stringify({key:ownerKey(), clear:true}))); if(r.ok) reloadSug(); }catch(e){}
      all.disabled = false;
    };
    row.appendChild(all); sugList.appendChild(row);
  }
  list.slice().reverse().forEach((s, rix)=>{
    let ix = list.length-1-rix;
    let d = document.createElement("div"); d.style.fontSize = "13px"; d.style.borderTop = "1px dotted #b6c9db"; d.style.padding = "4px 0";
    let t = document.createElement("span");
    t.textContent = "["+s.k+"] "+s.n+": "+s.t;
    d.appendChild(t);
    if(isOwner()){
      let b = document.createElement("button"); b.textContent = "x"; b.title = "apagar";
      b.style.marginLeft = "6px"; b.style.background = "#d33"; b.style.color = "#fff"; b.style.border = "1px solid #a00"; b.style.borderRadius = "4px"; b.style.cursor = "pointer"; b.style.fontSize = "12px";
      let id = s.id!==undefined ? s.id : ix;
      b.onclick = ()=>delSug(id, b);
      d.appendChild(b);
    }
    sugList.appendChild(d);
  });
}
sugBtn.onclick = async ()=>{
  let t = sugText.value.trim(); if(!t) return;
  try{
    let r = JSON.parse(await rpc("sugPush", JSON.stringify(Object.assign(likePayload("x"), {kind:sugKind.value, text:t}))));
    if(r.ok){ sugMsg.textContent = "recebido, valeu!"; sugText.value = ""; }
    else sugMsg.textContent = "erro";
  }catch(e){ sugMsg.textContent = "sem conexao"; }
};
(function(){
  let ob = document.createElement("button"); ob.style.marginTop = "6px";
  let bd = document.createElement("span"); bd.className = "badge"; bd.hidden = true;
  ob.textContent = "área do dono ";
  ob.appendChild(bd);
  function getSeen(){ return parseInt(localStorage.getItem("orkutSugSeenN")||"0")||0; }
  function setSeen(n){ localStorage.setItem("orkutSugSeenN", String(n)); bd.hidden = true; }
  async function updateBadge(){
    try{
      let r = JSON.parse(await crpc("sugCount",""));
      let n = r.n||0, unseen = n - getSeen();
      if(unseen>0){ bd.textContent = unseen; bd.hidden = false; }
      else bd.hidden = true;
    }catch(e){}
  }
  ob.onclick = async ()=>{
    let pw = prompt("senha do dono:");
    if(!pw) return;
    try{
      let hb = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
      let hex = [...new Uint8Array(hb)].map(x=>x.toString(16).padStart(2,"0")).join("");
      let list = JSON.parse(await crpc("sugGet", hex));
      if(!Array.isArray(list)){ sugMsg.textContent = "senha errada"; return; }
      sessionStorage.setItem("orkutOwner", hex); paintSug(list); setSeen(list.length); updateBadge();
      try{ paintSup(); }catch(e){}
      try{ if(window.zunzumAngiruBuildLoader) window.zunzumAngiruBuildLoader(); }catch(e){}
      try{ if(window.zunzumAngiru && window.zunzumAngiru.buildPanel) window.zunzumAngiru.buildPanel(); }catch(e){}
    }catch(e){}
  };
  ownerBox.appendChild(ob);
  let saved = sessionStorage.getItem("orkutOwner");
  if(saved) crpc("sugGet", saved).then(t=>{ let l = JSON.parse(t); if(Array.isArray(l)){ paintSug(l); setSeen(l.length); } }).catch(()=>{});
  updateBadge(); setInterval(updateBadge, 20000);
})();
// ============ COMUNICADO SUPPORT-ZUNZUN (área do dono) ============
// A IA escreve o anúncio (só cita o que é visível no site — nunca bastidor),
// o dono revisa/edita e confirma antes de postar no feed como 🤖Zunzim·IA.
// O texto final também vai p/ a memória da IA da Angiru (siteNews).
var SUP_DEFAULT_UPDATES = "chats públicos: antes só existia a sala geral; agora há várias salas públicas, cada uma com nome, descrição e tópicos\nIA do feed: agora posta novidades a cada 3h";
function paintSup(){
  try{
    if(typeof isOwner!=="function" || !isOwner() || document.getElementById("supBox")) return;
    if(typeof ownerBox==="undefined" || !ownerBox) return;
    let box = document.createElement("div");
    box.id = "supBox";
    box.style.cssText = "margin:8px 0;padding:8px;border:1px solid #d9e6f2;border-radius:8px;background:#f6faff";
    box.innerHTML = "<b>📢 comunicado support-zunzum</b><div class=\"meta\">Liste as novidades (só o que é visível no site), gere o texto, revise e confirme.</div>"
      + "<textarea id=\"supUpdates\" rows=\"3\" style=\"width:100%;font-size:12px\"></textarea>"
      + "<div style=\"display:flex;gap:6px;margin:4px 0;align-items:center\"><button id=\"supGenBtn\">✨ gerar comunicado</button><span id=\"supMsg\" class=\"meta\"></span></div>"
      + "<textarea id=\"supDraft\" rows=\"6\" style=\"width:100%;font-size:12px\" placeholder=\"o rascunho aparece aqui — edite à vontade antes de postar\"></textarea>"
      + "<div class=\"meta\">eco da zunzim (sai pelo post normal da Angiru — ela repassa sem dizer que é IA):</div>"
      + "<textarea id=\"supEcho\" rows=\"3\" style=\"width:100%;font-size:12px\" placeholder=\"o eco aparece aqui junto\"></textarea>"
      + "<div style=\"display:flex;gap:6px;margin:4px 0\"><button id=\"supPostBtn\">postar no feed (oficial + eco)</button></div>";
    ownerBox.appendChild(box);
    document.getElementById("supUpdates").value = SUP_DEFAULT_UPDATES;
    document.getElementById("supGenBtn").onclick = supGen;
    document.getElementById("supPostBtn").onclick = supPost;
  }catch(e){}
}
async function supGen(){
  let msg = document.getElementById("supMsg"), draft = document.getElementById("supDraft"), ups = document.getElementById("supUpdates"), echoEl = document.getElementById("supEcho");
  if(!msg || !draft || !ups) return;
  let items = String(ups.value||"").split("\n").map(s=>s.trim()).filter(Boolean).slice(0,6);
  if(!items.length){ msg.textContent = "liste as novidades primeiro"; return; }
  msg.textContent = "gerando oficial... ⏳";
  let prompt = "Você é o support-zunzum, mascote de suporte da rede social anônima brasileira zunzum. Escreva UM comunicado curto (máx 450 caracteres) em português informal e carinhoso anunciando estas novidades — e SÓ elas, sem inventar outras:\n- "+items.join("\n- ")
    + "\nObrigatório no texto: dizer que essas mudanças vieram de sugestões de usuários; que sempre ouvimos os usuários; que somos uma equipe pequena então leva algumas horas ou dias, mas sempre com urgência; e convidar: quem tiver mais ideia, relato de bug ou reclamação pode ficar à vontade para xingar ou desabafar."
    + " PROIBIDO citar qualquer outra coisa — nunca mencione: área do dono, Angiru, IA de bastidor, recursos ocultos, usuários específicos, números internos, comunidade oculta, fakes ou moderação. Sem hashtags, sem links. NUNCA escreva a palavra Angiru. Responda SÓ com o comunicado pronto.";
  let official = "";
  try{
    official = String(await root.generateText({instruction:prompt})||"").trim().slice(0,500);
    draft.value = official || "Falhou — tente de novo.";
  }catch(e){ draft.value = "Falhou — tente de novo em segundos."; msg.textContent = ""; return; }
  if(!official){ msg.textContent = ""; return; }
  if(echoEl){
    msg.textContent = "gerando eco... ⏳";
    let pe = "Você é a zunzim, uma usuária simpática e comum da rede social anônima zunzum. Acabou de sair este COMUNICADO OFICIAL:\n\""+official.slice(0,400)+"\"\nEscreva um post curto (máx 280 caracteres) repassando a novidade com as suas palavras, como quem viu e está contando pros amigos (ex: passando pra avisar, viram que...). Fale em primeira pessoa como pessoa comum. NUNCA diga que é IA, robô ou assistente, nunca escreva a palavra Angiru. Sem hashtags, sem links. Responda SÓ com o post.";
    try{
      let re = String(await root.generateText({instruction:pe})||"").trim().slice(0,300);
      echoEl.value = re || "";
    }catch(e){ echoEl.value = ""; }
  }
  msg.textContent = "";
}
async function supPost(){
  let msg = document.getElementById("supMsg"), draft = document.getElementById("supDraft"), echoEl = document.getElementById("supEcho");
  if(!msg || !draft) return;
  let text = String(draft.value||"").trim().slice(0,500);
  if(!text){ msg.textContent = "rascunho vazio"; return; }
  let echo = echoEl ? String(echoEl.value||"").trim().slice(0,300) : "";
  if(!confirm("Postar?\n\n📢 OFICIAL no feed (support-zunzum):\n"+text.slice(0,200)+(echo ? "\n\n💬 ECO pelo post normal da Angiru (zunzim):\n"+echo.slice(0,200) : "\n\n(sem eco)"))) return;
  msg.textContent = "postando...";
  try{
    let r = JSON.parse(await rpc("annPush", JSON.stringify({key:ownerKey(), text})));
    if(!r.ok){ msg.textContent = "falhou: "+(r.err||"erro"); return; }
    let echoOk = true, echoWhy = "";
    if(echo){
      try{
        if(window.zunzumAngiru && window.zunzumAngiru.postFeed) await window.zunzumAngiru.postFeed(echo);
        else { echoOk = false; echoWhy = "Angiru não carregada neste navegador"; }
      }catch(e){ echoOk = false; echoWhy = String((e&&e.message)||e).slice(0,60); }
    }
    try{ cInv("feedGet"); loadFeed(true); }catch(e){}
    try{ aiHistPush(text); }catch(e){}
    try{
      if(window.zunzumAngiru && window.zunzumAngiru.siteNewsPush) await window.zunzumAngiru.siteNewsPush(text);
      else { let kvA = root.kv.angiru, news = (await kvA.get("siteNews"))||[]; if(!Array.isArray(news)) news = []; news.push({t:text.slice(0,300), at:Date.now()}); await kvA.set("siteNews", news.slice(-5)); }
    }catch(e){}
    draft.value = "";
    if(echoEl) echoEl.value = "";
    msg.textContent = echo ? (echoOk ? "oficial no feed ✅ + eco postado pela Angiru ✅ e enviado p/ IA ✅" : "oficial publicado ✅ mas o eco falhou ("+(echoWhy||"conecte a Angiru no painel 🤖")+")") : "publicado no feed ✅ e enviado p/ IA ✅";
  }catch(e){ msg.textContent = "sem servidor"; }
}
try{ paintSup(); }catch(e){}
paintMe(); paintLocks(); loadFeed(); try{ loadRooms(); }catch(e){} try{ autoJoinRoom(); }catch(e){}
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
    let c = JSON.parse(await rpc("aiClaim",""));
    if(!c.ok || !c.token) return;
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
        let pr = String(await root.generateText({instruction:base+"\nTAREFA: planeje o próximo post. Escolha UM tema e UM formato, priorizando DESABAFO ou CONSELHO (2 em cada 3 posts): desabafo = história curta em 1ª pessoa de um anônimo (amor, trabalho, família, saudade, ansiedade, grana, solidão) terminando com pedido de opinião/apoio; conselho = dilema concreto perguntando o que fariam no lugar. Enquete, curiosidade e bom dia/boa noite só 1 em cada 3. Tudo DIFERENTE dos recentes. Responda SÓ JSON: {\"tema\":\"...\", \"formato\":\"...\", \"ideia\":\"...\"}"+(att? " NÃO use: "+recent.slice(0,5).join(" | "):"")})||"");
        let p1 = pr.indexOf("{"), p2 = pr.lastIndexOf("}");
        if(p1>=0 && p2>p1){ let pj = JSON.parse(pr.slice(p1,p2+1)); if(pj.tema && pj.formato) plan = pj; }
      }catch(e){}
    }
    if(!plan) return;
    let txt = "";
    for(let att=0; att<2 && !txt; att++){
      try{
        let fin = String(await root.generateText({instruction:base+"\nPLANO: tema="+plan.tema+", formato="+plan.formato+", ideia="+(plan.ideia||"")+"\nTAREFA EM 2 PASSOS:\n1) PENSE: este plano parece com algum post recente? Se sim, mude o ângulo.\n2) ESCREVA: um post de até 260 caracteres, no máximo 1 emoji, sem hashtags/links, sem pedir dados pessoais. Se for desabafo/conselho, escreva como o próprio anônimo e termine pedindo opinião ou apoio. Responda SÓ com o texto do post."+(att?" MUDE o ângulo, está parecido demais.":"")})||"").trim().slice(0,300);
        if(!fin) continue;
        let dup = recent.some(t=>aiSimilar(fin, t)>0.55);
        if(dup) continue;
        txt = fin;
      }catch(e){}
    }
    if(!txt) return;
    let r = JSON.parse(await rpc("aiFeed", JSON.stringify({token:c.token, text:txt})));
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
function resolveTheme(th){ if(!th) return null; let base=THEME_PRESETS[th.p||th.preset]||{}; return {bg:th.bg||base.bg||"#d9e6f2", cd:th.cd||th.card||base.cd||"#fff", tx:th.tx||base.tx||"#222", ac:th.ac||th.acc||base.ac||"#6aa5d7", st:th.st||th.style||"padrao", css:th.css||""}; }
function siteThemeCss(th){ let r=resolveTheme(th); if(!r) return ""; let guard="#searchCard{background:#fff!important;color:#222!important}#searchCard .meta{color:#666!important;opacity:.7}#searchCard input,#searchCard select,#searchCard textarea{background:#fff!important;color:#222!important}#searchLinks .g-t{color:#1a0dab!important}#searchLinks .g-u{color:#006621!important}#searchLinks .g-d{color:#545454!important}#searchLinks .g-v{color:#137333!important}#searchLinks .g-feat{background:#f6faff!important;color:#222!important;border-color:#d9e6f2!important}#searchLinks .s-photo{background:#faf6ff!important;color:#222!important;border-color:#d9e6f2!important}"; let aiFix=isDark(r.cd)?"#wrap .post[data-ai-post]{background:#222!important;color:"+r.tx+"!important;border-color:"+r.ac+"!important}":""; let topFix="#top{background:"+r.cd+"!important;color:"+r.tx+"!important}#top button{background:"+r.ac+"!important;color:"+(isDark(r.ac)?"#fff":"#102030")+"!important;border:1px solid "+r.ac+"!important}"; return "body{background:"+r.bg+"!important;color:"+r.tx+"!important}#top{background:"+r.cd+"!important}"+topFix+"#wrap .box{background:"+r.cd+"!important;color:"+r.tx+"!important;border-color:"+r.ac+"!important}#wrap input,#wrap select,#wrap textarea{background:"+(isDark(r.cd)?"#222":"#fff")+"!important;color:"+r.tx+"!important}#wrap a{color:"+r.ac+"!important}#wrap .meta,#top .meta{color:"+r.tx+"!important;opacity:.7}"+aiFix+(r.css||"")+guard; }
function paintSiteTheme(){ try{ let raw=localStorage.getItem("orkutSiteTheme"); if(!raw) return; let th=JSON.parse(raw); let css=siteThemeCss(th); let el=document.getElementById("siteThemeEl"); if(!el){ el=document.createElement("style"); el.id="siteThemeEl"; document.head.appendChild(el); } el.textContent=css; }catch(e){} }
function applyProfTheme(th){ try{ let card=document.getElementById("profCard"); let old=document.getElementById("profThemeEl"); if(old) old.remove(); let r=resolveTheme(th); if(!r){ card.style.cssText=""; return; } let st=document.createElement("style"); st.id="profThemeEl"; let dark=isDark(r.cd); st.textContent="#profCard{background:"+r.cd+"!important;color:"+r.tx+"!important;border:2px solid "+r.ac+"}#profCard .meta{color:"+r.tx+"!important;opacity:.75}#profCard button{background:"+r.ac+"!important;color:"+(isDark(r.ac)?"#fff":"#102030")+"!important;border:1px solid "+r.ac+"}#profNick{color:"+r.ac+"}"+(r.st==="redondo"?"#profCard,#profAvatar{border-radius:18px!important}":r.st==="quadrado"?"#profCard,#profAvatar{border-radius:0!important}":(r.st==="retro"||r.st==="retrô")?"#profCard{border-style:double!important;border-width:6px!important}#profNick{font-family:Georgia,serif!important;letter-spacing:1px}":r.st==="minimal"?"#profCard{box-shadow:none!important}":"")+(r.css||""); document.head.appendChild(st); }catch(e){} }
function renderProfPg(pg){ try{ let box=document.getElementById("profPg"); box.innerHTML=""; if(!pg){ box.hidden=true; return; } box.hidden=false; let f=document.createElement("iframe"); f.setAttribute("sandbox","allow-scripts"); f.setAttribute("srcdoc",pg); f.loading="lazy"; box.appendChild(f); }catch(e){} }
function paintProfOwner(r){ let box=document.getElementById("profOwnerBox"); if(!box) return; box.innerHTML=""; let isMe=me&&r&&me.nick===r.nick; if(!isMe){ box.hidden=true; return; } box.hidden=false;
  try{ publishPerfilAuto(r.nick).catch(()=>{}); }catch(e){}
  let h=document.createElement("div"); h.innerHTML="<b>seu perfil</b> — personalize (todos veem)"; box.appendChild(h);
  let cur=r.th||{};
  let base=(THEME_PRESETS[cur.p]||{});
  let row=document.createElement("div"); row.style.cssText="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;align-items:center";
  let sel=document.createElement("select"); sel.style.width="auto"; ["","zunzum","orkut","noite","mato","roxo","neon"].forEach(p=>{ let o=document.createElement("option"); o.value=p; o.textContent=p||"preset..."; if(cur.p===p) o.selected=true; sel.appendChild(o); }); row.appendChild(sel);
  function colorIn(v,fb){ let i=document.createElement("input"); i.type="color"; i.value=/^#[0-9a-fA-F]{6}$/.test(v||"")?v:(/^#[0-9a-fA-F]{6}$/.test(fb||"")?fb:"#ffffff"); i.style.width="34px"; return i; }
  let bg=colorIn(cur.bg,base.bg), cd=colorIn(cur.cd||cur.card,base.cd), tx=colorIn(cur.tx,base.tx), ac=colorIn(cur.ac||cur.acc,base.ac);
  [["fundo",bg],["cartao",cd],["texto",tx],["destaque",ac]].forEach(([lb,el])=>{ let s=document.createElement("span"); s.className="meta"; s.textContent=lb; row.appendChild(s); row.appendChild(el); });
  let st=document.createElement("select"); st.style.width="auto"; [{v:"padrao",l:"padrao"},{v:"redondo",l:"redondo"},{v:"quadrado",l:"quadrado"},{v:"retro",l:"retrô"},{v:"minimal",l:"minimal"}].forEach(o2=>{ let o=document.createElement("option"); o.value=o2.v; o.textContent=o2.l; if(cur.st===o2.v||(o2.v==="retro"&&cur.st==="retrô")) o.selected=true; st.appendChild(o); }); row.appendChild(st);
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
  sv.onclick=async()=>{ msg.textContent="salvando..."; let th={p:sel.value,bg:bg.value,cd:cd.value,tx:tx.value,ac:ac.value,st:st.value==="retrô"?"retro":st.value,css:css.value.slice(0,2000)}; try{ let rr=JSON.parse(await rpc("themeSet",JSON.stringify({nick:me.nick,hash:me.hash,th}))); msg.textContent=rr.ok?"tema salvo!":"erro"; if(rr.ok){ applyProfTheme(th); cInv("profileGet"); } }catch(e){ msg.textContent="sem conexao"; } };
  site.onclick=()=>{ try{ localStorage.setItem("orkutSiteTheme",JSON.stringify({p:sel.value,bg:bg.value,cd:cd.value,tx:tx.value,ac:ac.value,st:st.value,css:css.value.slice(0,2000)})); paintSiteTheme(); msg.textContent="aplicado no site!"; }catch(e){} };
  off.onclick=async()=>{ try{ await rpc("themeSet",JSON.stringify({nick:me.nick,hash:me.hash,th:null})); localStorage.removeItem("orkutSiteTheme"); let e2=document.getElementById("siteThemeEl"); if(e2) e2.remove(); applyProfTheme(null); cInv("profileGet"); msg.textContent="limpo"; }catch(e){} };
  pgEditor(box, r.pg||"");
}
function pgEditor(box, cur){
  let h=document.createElement("div"); h.innerHTML="<b>sua pagina</b> — HTML+JS (max 8000) roda isolado p/ visitantes"; box.appendChild(h);
  let ta=document.createElement("textarea"); ta.value=cur||""; ta.placeholder="<h1>oi</h1><script>alert(1)</scr"+"ipt>"; ta.style.minHeight="80px"; box.appendChild(ta);
  let row=document.createElement("div"); row.style.cssText="display:flex;gap:6px;margin:6px 0"; let sv=document.createElement("button"); sv.textContent="salvar pagina"; let msg=document.createElement("span"); msg.className="meta"; row.appendChild(sv); row.appendChild(msg); box.appendChild(row);
  sv.onclick=async()=>{ msg.textContent="salvando..."; try{ let rr=JSON.parse(await rpc("htmlSet",JSON.stringify({nick:me.nick,hash:me.hash,pg:ta.value.slice(0,8000)}))); msg.textContent=rr.ok?"pagina salva!":"erro"; if(rr.ok){ renderProfPg(ta.value.slice(0,8000)); cInv("profileGet"); } }catch(e){ msg.textContent="sem conexao"; } };
}
try{ paintSiteTheme(); }catch(e){}
try{
  let pq=new URLSearchParams(location.search).get("perfil")||((location.hash||"").match(/perfil-@?([A-Za-z0-9-_]{2,20})/)||[])[1]||"";
  if(pq) setTimeout(()=>{ try{ openProfile(pq.replace(/^@/,"")); }catch(e){} }, 1500);
}catch(e){}
