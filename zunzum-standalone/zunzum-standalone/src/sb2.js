/* sb2.js — Supabase adapter parte 2: salas, priv, DM, amigos, depo,
   nodal, dj/gifmoji/wiki, dono/comunicados, conta. Estende window.sbRpc.
   Carregar DEPOIS de sb.js. */
(function(){
"use strict";
if(typeof window === "undefined" || !window.sbRpc) return;

var origRpc = window.sbRpc;
function J(o){ try{ return JSON.stringify(o); }catch(e){ return '{"ok":0}'; } }
function cleanNick(n){ return String(n||"").replace(/\s+/g,"-").slice(0,20); }
function sbBadKey(k){ return /^(prototype|__proto__|constructor)$/i.test(String(k||"")); }
function okNick(n){ return /^[A-Za-z0-9-_]{2,20}$/.test(n||"") && !sbBadKey(n); }
function okAnon(a){ return /^anon-[a-z0-9]{6,12}$/.test(a||""); }
/* LIKE-escape (fix 2026-10-24): ver sb.js — todo valor de ilike() passa aqui */
function escLike(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/%/g,"\\%").replace(/_/g,"\\_"); }
function sbId(p){ return (p||"x") + Date.now().toString(36) + Math.floor(Math.random()*46656).toString(36); }
function sbHostOk(u){
  try{
    var x = new URL(String(u || ""));
    if(x.protocol !== "https:" || x.username || x.password) return false;
    if(/[\s<>"'`\\]/.test(String(u))) return false;
    var hn = String(x.hostname || "").toLowerCase();
    if(!hn || hn.length > 253 || hn.indexOf("..") >= 0 || /[^a-z0-9.-]/.test(hn)) return false;
    try{ var _pt2 = parseInt(x.port||"", 10); if(x.port && !(_pt2>=1 && _pt2<=65535)) return false; }catch(e){}
    if(hn === "localhost" || hn === "localhost.localdomain") return false;
    if(hn === "onion" || hn.slice(-6) === ".onion" || hn === "local" ||
       hn.slice(-6) === ".local" || hn.slice(-10) === ".localhost") return false;
    var _num2 = /^[0-9.]+$/.test(hn) || /0x/i.test(hn);
    if(_num2){
      var _q2 = null;
      var _p12 = function(p){ p=String(p||""); if(!p) return -1;
        if(/^0x[0-9a-f]+$/i.test(p)){ var _v=parseInt(p,16); return (_v>=0&&_v<=255)?_v:-1; }
        if(/^0[0-7]+$/.test(p)&&p.length>1){ var _o=parseInt(p,8); return (_o>=0&&_o<=255)?_o:-1; }
        if(!/^\d+$/.test(p)) return -1; var _d=parseInt(p,10); return (_d>=0&&_d<=255)?_d:-1; };
      try{
        if(/^\d+$/.test(hn)){ var _n322=parseInt(hn,10); if(_n322<0||_n322>4294967295) return false; _q2=[(_n322>>>24)&255,(_n322>>>16)&255,(_n322>>>8)&255,_n322&255]; }
        else if(/^0x[0-9a-f]+$/i.test(hn)){ var _h322=parseInt(hn,16); if(_h322<0||_h322>4294967295) return false; _q2=[(_h322>>>24)&255,(_h322>>>16)&255,(_h322>>>8)&255,_h322&255]; }
        else if(/^0[0-7]+$/.test(hn)&&hn.length>1){ var _o322=parseInt(hn,8); if(_o322<0||_o322>4294967295) return false; _q2=[(_o322>>>24)&255,(_o322>>>16)&255,(_o322>>>8)&255,_o322&255]; }
        else { var _pp2=hn.split("."); if(_pp2.length===4){ var _ok2=true,_qq2=[]; for(var _i2=0;_i2<4;_i2++){ var _v22=_p12(_pp2[_i2]); if(_v22<0){_ok2=false;break;} _qq2.push(_v22); } _q2=_ok2?_qq2:null; } }
      }catch(e){ _q2 = null; }
      if(!_q2) return false;
      if(_q2[0]===127||_q2[0]===0||_q2[0]===10) return false;
      if(_q2[0]===172&&_q2[1]>=16&&_q2[1]<=31) return false;
      if(_q2[0]===192&&_q2[1]===168) return false;
      if(_q2[0]===169&&_q2[1]===254) return false;
      if(_q2[0]===192&&_q2[1]===0&&(_q2[2]===0||_q2[2]===2)) return false;
      if(_q2[0]>=224) return false;
      return true;
    }
    var m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hn);
    if(m){
      var a = +m[1], b = +m[2], c = +m[3], d = +m[4];
      if(a > 255 || b > 255 || c > 255 || d > 255) return false;
      if(a === 127 || a === 0 || a === 10) return false;
      if(a === 172 && b >= 16 && b <= 31) return false;
      if(a === 192 && b === 168) return false;
      if(a === 169 && b === 254) return false;
      if(a === 192 && b === 0 && (c === 0 || c === 2)) return false;
      if(a >= 224) return false;
    }
    return true;
  }catch(e){ return false; }
}
function okUrl(u){
  u = String(u||""); if(!u) return "";
  if(u.length>2000 || u.indexOf("https://")!==0) return null;
  if(/[\s<>"'`\\]/.test(u)) return null;
  var rest = u.slice(8).split("/")[0].split("?")[0].split("#")[0];
  if(!rest || rest.indexOf("@")>=0 || /[^A-Za-z0-9.-]/.test(rest.split(":")[0])) return null;
  /* anti-SSRF/tracker local (espelho do okUrlStrict do servidor) */
  if(!sbHostOk(u)) return null;
  return u;
}
/* espelho do cleanRoomTheme do server-plugin: o cliente aplica com
   zunScopeCss, mas o banco não pode guardar CSS ativo p/ cliente
   alternativo ler direto (position fixa, tracker via url(, etc). */
function cleanRoomThemeSb(t){
  if(t === null) return null;
  if(!t || typeof t !== "object") return null;
  var allowP = {zunzum:1, orkut:1, noite:1, mato:1, roxo:1, neon:1};
  var out = {};
  var p = String(t.p||t.preset||"").slice(0,20);
  if(p && allowP[p]) out.p = p;
  function hx(c){ return /^#[0-9a-fA-F]{6}$/.test(c||""); }
  if(hx(t.bg)) out.bg = String(t.bg).toLowerCase();
  if(hx(t.cd||t.card)) out.cd = String(t.cd||t.card).toLowerCase();
  if(hx(t.tx)) out.tx = String(t.tx).toLowerCase();
  if(hx(t.ac||t.acc)) out.ac = String(t.ac||t.acc).toLowerCase();
  var css = String(t.css||"").slice(0,2000);
  var probe = css.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\\([0-9a-fA-F]{1,6})\s?/g, function(m,h){ try{ var v=parseInt(h,16); if(!v||v>0x10FFFF) return ""; return String.fromCharCode(v); }catch(e){ return ""; } }).replace(/\\/g,"");
  if(/<\s*script/i.test(probe) || /<\/style/i.test(probe)) return null;
  if(/position\s*:\s*fixed/i.test(probe) || /position\s*:\s*sticky/i.test(probe) || /position\s*:\s*absolute/i.test(probe) || /z-index\s*:/i.test(probe) || /content\s*:/i.test(probe) || /url\s*\(/i.test(probe) || /@import/i.test(probe) || /expression\s*\(/i.test(probe) || /behaviou?r\s*:/i.test(probe) || /-moz-binding/i.test(probe) || /javascript\s*:/i.test(probe)) return null;
  if(css) out.css = css;
  if(!out.bg && !out.cd && !out.tx && !out.ac && !out.css && !out.p) return null;
  return out;
}
function privBits(room){
  try{
    var r = String(room||""), i = r.lastIndexOf("-");
    if(i<1) return 0;
    var suf = r.slice(i+1);
    if(!/^[a-z0-9]{10,30}$/.test(suf)) return 0;
    return Math.floor(suf.length*5.17);
  }catch(e){ return 0; }
}
function privStrong(room){ return privBits(room)>=60; }
function privStrongEx(room){
  try{
    var base = String(room||"").split("-")[0].replace(/[^a-z0-9]/g,"").slice(0,12) || "sala";
    var abc = "abcdefghijklmnopqrstuvwxyz0123456789", out = "";
    for(var i=0;i<12;i++) out += abc[Math.floor(Math.random()*36)];
    return (base+"-"+out).slice(0,30);
  }catch(e){ return "sala-"+Math.random().toString(36).slice(2,14); }
}
function dmKey(a,b){
  a = String(a||"").toLowerCase(); b = String(b||"").toLowerCase();
  return a < b ? a+"|"+b : b+"|"+a;
}
async function sb(){ return window.__sb.client(); }
async function myNick(){
  try{
    var s = await sb(), g = await s.auth.getUser(), u = g && g.data && g.data.user;
    if(!u) return null;
    var r = await s.from("profiles").select("nick").eq("user_id", u.id).limit(1).maybeSingle();
    return (r && r.data && r.data.nick) || null;
  }catch(e){ return null; }
}
async function isOwner(s, me){
  try{
    var ow = await s.from("site_config").select("value").eq("key","owner_nick").limit(1).maybeSingle();
    var on = ow && ow.data && ow.data.value && ow.data.value.nick;
    return !!on && String(on).toLowerCase() === String(me||"").toLowerCase();
  }catch(e){ return false; }
}
function msgRow(m){
  return {id:m.id, f:String(m.author||"").replace(/^@/,""), t:m.body||"", u:m.media_url||"",
    y:m.media_type||"", at:Date.parse(m.created_at), ed:!!m.edited};
}
async function touchRef(s, me){
  // crédito de convite no PRIMEIRO chat real (ref_by → refs, uma vez):
  // via claim_ref() (sem escrita direta em refs); fallback p/ schema antigo.
  try{
    var cr = await s.rpc("claim_ref", {p_by:""});
    if(!cr.error) return;
  }catch(e0){}
  try{
    var rb = await s.from("ref_by").select("by_nick").eq("nick", String(me).toLowerCase()).limit(1).maybeSingle();
    if(rb && rb.data && rb.data.by_nick){
      var by = rb.data.by_nick;
      await s.from("ref_by").delete().eq("nick", String(me).toLowerCase());
      var cur = await s.from("refs").select("n").eq("nick", by).limit(1).maybeSingle();
      await s.from("refs").upsert({nick:by, n:((cur && cur.data && cur.data.n)||0)+1});
    }
  }catch(e){}
}
/* leitura mínima de sala privada via priv_peek() (não vaza lista de salas).
   Retorna {owner, locked, has} ou null (→ fallback legado). */
async function peekRoom(s, code){
  try{
    var r = await s.rpc("priv_peek", {p_code:code});
    if(r && !r.error && r.data){
      if(r.data.exists === false) return {exists:false};
      if(r.data.ok === 1 && r.data.exists) return r.data;
    }
    return null;
  }catch(e){ return null; }
}
async function roomMeta(s, id){
  if(id === "geral"){
    var pg = await s.from("pub_msgs").select("created_at").order("created_at",{ascending:false}).limit(1).maybeSingle();
    return {id:"geral", name:"geral", desc:"chat público original do zunzum", photo:"",
      owner:"", mods:[], topics:0, msgs:0,
      lastAt: pg.data ? Date.parse(pg.data.created_at) : 0, theme:null};
  }
  var r = await s.from("rooms").select("*").eq("id", id).limit(1).maybeSingle();
  if(!r.data) return null;
  var rm = r.data;
  var tc = await s.from("room_topics").select("id",{count:"exact",head:true}).eq("room_id", id);
  var mc = await s.from("room_msgs").select("id",{count:"exact",head:true}).eq("room_id", id).is("topic_id", null);
  return {id:rm.id, name:rm.name, desc:rm.descr||"", photo:rm.photo||"", owner:rm.owner_nick||"",
    mods:(rm.mods||[]).slice(0,10), topics:tc.count||0, msgs:mc.count||0,
    lastAt: rm.last_at ? Date.parse(rm.last_at) : 0, theme:rm.theme||null};
}
async function roleIn(s, id, meLower){
  var r = {owner:0, mod:0, banned:0};
  if(id === "geral" || !meLower) return r;
  var q = await s.from("rooms").select("owner_nick,mods,bans").eq("id", id).limit(1).maybeSingle();
  if(!q.data) return r;
  var rm = q.data;
  if(String(rm.owner_nick||"").toLowerCase() === meLower){ r.owner = 1; r.mod = 1; return r; }
  (rm.mods||[]).forEach(function(x){ if(String(x).toLowerCase()===meLower) r.mod = 1; });
  (rm.bans||[]).forEach(function(x){ if(String(x).toLowerCase()===meLower) r.banned = 1; });
  return r;
}

var SB2_PASS = {register:1, sessLogin:1, sessLogout:1, pwChange:1, cliVer:1,
  sugWho:1, feedGet:1, pubGet:1, profileGet:1, userSearch:1,
  roomsList:1, roomView:1, privGet:1, reqGet:1, invGet:1,
  friendState:1, friendList:1, dmGet:1, dmUnread:1, statusBulk:1,
  depoGet:1, nodalGet:1, djList:1, gifmojiList:1, refMe:1, refTop:1,
  bioGet:1, histGet:1, profView:1, nickBulk:1, pkeyGet:1, petGet:1,
  accountDelStatus:1, sugCount:1, sugGet:1,
  zzDay:1, zzDmPend:1, zzDepoPend:1, zzMuralDone:1, aiFeed:1,
  subDepo:1, unsubDepo:1, subInv:1, unsubInv:1, subAppr:1, unsubAppr:1,
  subDM:1, unsubDM:1, subDMConv:1, unsubDMConv:1, subNodal:1, subDj:1,
  subPriv:1, unsubPriv:1, presence:1};
var _pw8Warned2 = false;
async function sbNeedStrongDeny2(s){
  try{
    var g = await s.auth.getUser();
    var u = g && g.data && g.data.user;
    if(!u) return null;
    var r;
    try{ r = await s.from("profiles").select("pw8").eq("user_id", u.id).limit(1).maybeSingle(); }
    catch(e){ return null; }
    if(r && r.error){
      var m = String((r.error.message||"")+(r.error.code||""));
      if(/pw8|column|schema|relation|does not exist|404/i.test(m)){
        if(!_pw8Warned2){ _pw8Warned2 = true; try{ console.warn("[zunzum] FASE 9 pendente: rode src/supabase-fase9.sql"); }catch(e){} }
        return null;
      }
      return null;
    }
    var row = r && r.data;
    if(!row || row.pw8) return null;
    return J({ok:0, err:"fraca-pw"});
  }catch(e){ return null; }
}
async function sbRpc2(name, data){
  var s = await sb();
  var o = {};
  try{ var t = String(data == null ? "" : (typeof data === "string" ? data : JSON.stringify(data))); o = t ? JSON.parse(t) : {}; }
  catch(e){ o = {}; }
  var me = await myNick();
  var meL = me ? String(me).toLowerCase() : "";
  /* F1 Supabase (paridade needStrong): logado !pw8 não escreve (fraca-pw).
     Anon passa; coluna ausente (pré-FASE 9)/erro = permite (fail-open). */
  if(!SB2_PASS[name]){
    var _d2 = await sbNeedStrongDeny2(s);
    if(_d2) return _d2;
  }

  switch(name){

  /* ---------- salas ---------- */
  case "roomsList": {
    var all = await s.from("rooms").select("id,last_at").order("last_at",{ascending:false}).limit(100);
    var out = [await roomMeta(s, "geral")];
    for(var i=0;i<((all.data)||[]).length;i++){
      var m = await roomMeta(s, all.data[i].id);
      if(m) out.push(m);
    }
    return J(out.slice(0,101));
  }
  case "roomView": {
    var id = String(o.room||"geral").slice(0,30);
    if(id !== "geral" && !/^[a-z0-9-]{2,30}$/.test(id)) return J({ok:0, err:"room"});
    var tid = o.topic ? String(o.topic).slice(0,30) : null;
    var role = await roleIn(s, id, meL);
    if(id === "geral"){
      if(tid) return J({ok:0, err:"topic"});
      var gm = await s.from("pub_msgs").select("*").order("created_at",{ascending:true}).limit(100);
      return J({ok:1, room:await roomMeta(s,"geral"), topics:[], topic:null,
        msgs:(gm.data||[]).map(msgRow), role:role});
    }
    var rm = await s.from("rooms").select("id").eq("id", id).limit(1).maybeSingle();
    if(!rm.data) return J({ok:0, err:"noid"});
    var tps = await s.from("room_topics").select("*").eq("room_id", id).order("last_at",{ascending:true});
    var topics = [];
    for(var ti=0; ti<((tps.data)||[]).length; ti++){
      var t = tps.data[ti];
      var cn = await s.from("room_msgs").select("id,created_at",{count:"exact"}).eq("room_id", id).eq("topic_id", t.id).order("created_at",{ascending:false}).limit(1);
      var arr = cn.data||[];
      topics.push({id:t.id, name:t.name, at:Date.parse(t.created_at), by:t.by_nick||"",
        n: cn.count||0, lastAt: arr.length ? Date.parse(arr[0].created_at) : Date.parse(t.last_at)});
    }
    var msgs = [];
    if(tid){
      if(!topics.some(function(t){ return t.id===tid; })) return J({ok:0, err:"topic"});
      var tm = await s.from("room_msgs").select("*").eq("room_id", id).eq("topic_id", tid).order("created_at",{ascending:true}).limit(100);
      msgs = (tm.data||[]).map(msgRow);
      var tf = topics.filter(function(t){ return t.id===tid; })[0];
      var meta = await roomMeta(s, id);
      if(role.owner || role.mod){
        var full = await s.from("rooms").select("bans").eq("id", id).limit(1).maybeSingle();
        meta.bans = (full.data && full.data.bans) || [];
      }
      return J({ok:1, room:meta, topics:topics, topic:{id:tf.id, name:tf.name}, msgs:msgs, role:role});
    }
    var mm = await s.from("room_msgs").select("*").eq("room_id", id).is("topic_id", null).order("created_at",{ascending:true}).limit(100);
    msgs = (mm.data||[]).map(msgRow);
    var meta2 = await roomMeta(s, id);
    if(role.owner || role.mod){
      var full2 = await s.from("rooms").select("bans").eq("id", id).limit(1).maybeSingle();
      meta2.bans = (full2.data && full2.data.bans) || [];
    }
    return J({ok:1, room:meta2, topics:topics, topic:null, msgs:msgs, role:role});
  }
  case "roomCreate": {
    if(!me) return J({ok:0, err:"auth"});
    var nm = String(o.name||"").replace(/\s+/g," ").trim().slice(0,40);
    if(!nm || nm.length<2 || nm.toLowerCase()==="geral") return J({ok:0, err:"nome"});
    var desc = String(o.desc||"").replace(/\s+/g," ").trim().slice(0,140);
    var photo = okUrl(o.photo);
    if(photo === null) return J({ok:0, err:"foto"});
    var ks = await s.from("rooms").select("id,name,owner_nick").limit(100);
    var arr = ks.data||[];
    if(arr.length >= 100) return J({ok:0, err:"cheio"});
    if(arr.some(function(r){ return String(r.name||"").toLowerCase()===nm.toLowerCase(); })) return J({ok:0, err:"existe"});
    if(arr.filter(function(r){ return String(r.owner_nick||"").toLowerCase()===meL; }).length >= 5) return J({ok:0, err:"limite"});
    var nid = ("r"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36)).toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    var thC = cleanRoomThemeSb(o.theme);
    if(o.theme !== undefined && o.theme !== null && !thC) return J({ok:0, err:"tema"});
    await s.from("rooms").insert({id:nid, name:nm, descr:desc, photo:photo||"", owner_nick:me, mods:[], bans:[], theme:thC||null});
    return J({ok:1, room:await roomMeta(s, nid)});
  }
  case "roomEdit": {
    if(!me) return J({ok:0, err:"auth"});
    var eid = String(o.room||"").slice(0,30);
    var er = await s.from("rooms").select("*").eq("id", eid).limit(1).maybeSingle();
    if(!er.data) return J({ok:0, err:"noid"});
    if(String(er.data.owner_nick||"").toLowerCase() !== meL) return J({ok:0, err:"dono"});
    var upd = {};
    if(o.name !== undefined){
      var nn = String(o.name||"").replace(/\s+/g," ").trim().slice(0,40);
      if(!nn || nn.length<2 || nn.toLowerCase()==="geral") return J({ok:0, err:"nome"});
      var dup = await s.from("rooms").select("id").ilike("name", escLike(nn)).limit(5);
      if((dup.data||[]).some(function(r){ return r.id !== eid; })) return J({ok:0, err:"existe"});
      upd.name = nn;
    }
    if(o.desc !== undefined) upd.descr = String(o.desc||"").replace(/\s+/g," ").trim().slice(0,140);
    if(o.photo !== undefined){ var ph = okUrl(o.photo); if(ph === null) return J({ok:0, err:"foto"}); upd.photo = ph; }
    if(o.mods !== undefined){
      if(!Array.isArray(o.mods)) return J({ok:0, err:"bad"});
      var mods = [];
      for(var mi=0; mi<o.mods.length && mods.length<10; mi++){
        var mn = cleanNick(String(o.mods[mi]||"").replace(/^@/,""));
        if(!okNick(mn)) return J({ok:0, err:"nick"});
        if(mn.toLowerCase() === meL) continue;
        var ex = await s.from("profiles").select("nick").ilike("nick", escLike(mn)).limit(1).maybeSingle();
        if(!ex.data) return J({ok:0, err:"noid"});
        if(!mods.some(function(y){ return y.toLowerCase()===ex.data.nick.toLowerCase(); })) mods.push(ex.data.nick);
      }
      upd.mods = mods;
    }
    if(o.theme !== undefined){ if(o.theme === null) upd.theme = null; else { var thE = cleanRoomThemeSb(o.theme); if(!thE) return J({ok:0, err:"tema"}); upd.theme = thE; } }
    await s.from("rooms").update(upd).eq("id", eid);
    return J({ok:1, room:await roomMeta(s, eid)});
  }
  case "roomTheme": {
    if(!me) return J({ok:0, err:"auth"});
    var thid = String(o.room||"").slice(0,30);
    var rl = await roleIn(s, thid, meL);
    if(!(rl.owner || rl.mod)) return J({ok:0, err:"dono"});
    if(o.theme === null || o.theme === undefined) await s.from("rooms").update({theme:null}).eq("id", thid);
    else { var thT = cleanRoomThemeSb(o.theme); if(!thT) return J({ok:0, err:"tema"}); await s.from("rooms").update({theme:thT}).eq("id", thid); }
    return J({ok:1});
  }
  case "roomDel": {
    if(!me) return J({ok:0, err:"auth"});
    var did = String(o.room||o.id||"").slice(0,30);
    if(did === "geral") return J({ok:0, err:"room"});
    var dr = await s.from("rooms").select("owner_nick").eq("id", did).limit(1).maybeSingle();
    if(!dr.data) return J({ok:0, err:"noid"});
    if(String(dr.data.owner_nick||"").toLowerCase() !== meL) return J({ok:0, err:"dono"});
    await s.from("rooms").delete().eq("id", did);
    return J({ok:1});
  }
  case "topicCreate": {
    if(!me) return J({ok:0, err:"auth"});
    var tr = String(o.room||"").slice(0,30);
    var tn = String(o.name||o.topic||"").replace(/\s+/g," ").trim().slice(0,40);
    if(!tn || tn.length < 2) return J({ok:0, err:"nome"});
    var tid2 = ("t"+Date.now().toString(36)+Math.floor(Math.random()*46656).toString(36)).toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    var ti = await s.from("room_topics").insert({id:tid2, room_id:tr, name:tn, by_nick:me});
    if(ti.error) return J({ok:0, err:"noid"});
    return J({ok:1, id:tid2});
  }
  case "topicDel": {
    if(!me) return J({ok:0, err:"auth"});
    var tdr = String(o.room||"").slice(0,30), tdt = String(o.topic||o.id||"").slice(0,30);
    var rl2 = await roleIn(s, tdr, meL);
    if(!(rl2.owner || rl2.mod)) return J({ok:0, err:"dono"});
    await s.from("room_msgs").delete().eq("room_id", tdr).eq("topic_id", tdt);
    await s.from("room_topics").delete().eq("room_id", tdr).eq("id", tdt);
    return J({ok:1});
  }
  case "roomPush": {
    var rpRoom = String(o.room||"geral").slice(0,30);
    var rpT = String(o.text||"").slice(0,500), rpU = String(o.url||"").slice(0,500);
    if(!rpT && !rpU) return J({ok:0, err:"vazio"});
    if(rpU && okUrl(rpU) === null) return J({ok:0, err:"url"});
    if(rpRoom === "geral"){
      if(!me) return J({ok:0, err:"auth"});
      var gi = await s.from("pub_msgs").insert({id:sbId("m"), author:"@"+cleanNick(me),
        body:rpT, media_url:rpU, media_type:String(o.mtype||"").slice(0,60)});
      if(gi.error) return J({ok:0, err:"spam"});
      touchRef(s, me);
      return J({ok:1});
    }
    var key = me ? cleanNick(me) : String(o.anon||"").slice(0,20);
    if(me){ if(!okNick(me)) return J({ok:0, err:"auth"}); }
    else if(!okAnon(key)) return J({ok:0, err:"auth"});
    var rl3 = me ? await roleIn(s, rpRoom, meL) : {banned:0};
    if(rl3.banned) return J({ok:0, err:"banido"});
    var rpi = await s.from("room_msgs").insert({id:sbId("m"), room_id:rpRoom,
      topic_id: o.topic ? String(o.topic).slice(0,30) : null, author:key,
      body:rpT, media_url:rpU, media_type:String(o.mtype||"").slice(0,60)});
    if(rpi.error) return J({ok:0, err:"noid"});
    if(me) touchRef(s, me);
    return J({ok:1});
  }
  case "roomMsgDel": {
    if(!me) return J({ok:0, err:"auth"});
    var md = await s.from("room_msgs").select("author,room_id").eq("id", String(o.id||"").slice(0,40)).limit(1).maybeSingle();
    if(!md.data) return J({ok:0, err:"noid"});
    var rl4 = await roleIn(s, md.data.room_id, meL);
    if(String(md.data.author||"").toLowerCase() !== meL && !(rl4.owner || rl4.mod)) return J({ok:0, err:"dono"});
    await s.from("room_msgs").delete().eq("id", String(o.id||"").slice(0,40));
    return J({ok:1});
  }
  case "roomMsgEdit": case "roomBan": {
    if(name === "roomBan"){
      if(!me) return J({ok:0, err:"auth"});
      var okb = await s.rpc("room_ban", {p_room:String(o.room||"").slice(0,30),
        p_target:String(o.target||o.nick||"").replace(/^@/,"").slice(0,20), p_ban:!!(o.ban ?? o.v ?? true)});
      /* FASE 10/re-seal r2: s.rpc devolve {data,error} (sempre truthy) — checar
         data===true, senão a negação da função virava falso ok:1. */
      return J(okb && !okb.error && okb.data === true ? {ok:1} : {ok:0, err:"dono"});
    }
    if(!me) return J({ok:0, err:"auth"});
    var edm = await s.from("room_msgs").select("author").eq("id", String(o.id||"").slice(0,40)).limit(1).maybeSingle();
    if(!edm.data) return J({ok:0, err:"noid"});
    if(String(edm.data.author||"").toLowerCase() !== meL) return J({ok:0, err:"dono"});
    var et2 = String(o.text||"").slice(0,500), eu2 = String(o.url||"").slice(0,500);
    if(!et2 && !eu2) return J({ok:0, err:"vazio"});
    if(eu2 && okUrl(eu2) === null) return J({ok:0, err:"url"});
    await s.from("room_msgs").update({body:et2, media_url:eu2, edited:true}).eq("id", String(o.id||"").slice(0,40));
    return J({ok:1});
  }

  /* ---------- privadas ---------- */
  case "privJoin": {
    if(!me) return J({ok:0, err:"auth"});
    var pj = String(o.room||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    if(pj.length < 2) return J({ok:0, err:"room"});
    var hasH = false, hasO = false, pk0 = await peekRoom(s, pj);
    if(pk0){
      hasH = !!pk0.has; hasO = !!pk0.exists;
    } else {
      var has = await s.from("priv_msgs").select("id",{count:"exact",head:true}).eq("code", pj);
      var owr = await s.from("priv_rooms").select("owner_nick").eq("code", pj).limit(1).maybeSingle();
      hasH = (has.count||0) > 0; hasO = !!(owr.data);
    }
    if(!hasH && !hasO && !privStrong(pj))
      return J({ok:0, err:"fraca", ex:privStrongEx(pj), bits:privBits(pj)});
    var res = await s.rpc("priv_enter", {p_code:pj});
    if(res.error) return J({ok:0, err:"auth"});
    var rj = res.data || {};
    return J({ok:1, first:0, locked:rj.locked?1:0, owner:rj.owner||"", member:rj.member?1:0,
      claimed:rj.claimed?1:0, orphan:0, strong:privStrong(pj)?1:0, bits:privBits(pj)});
  }
  case "privClaim": {
    if(!me) return J({ok:0, err:"auth"});
    var pc = String(o.room||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    var pk1 = await peekRoom(s, pc);
    if(pk1 ? !pk1.has : (await s.from("priv_msgs").select("id",{count:"exact",head:true}).eq("code", pc)).count === 0)
      return J({ok:0, err:"nova"});
    var cl = await s.rpc("priv_claim", {p_code:pc});
    if(cl.error || !cl.data || cl.data.ok !== 1){
      var ex2 = await s.from("priv_rooms").select("owner_nick").eq("code", pc).limit(1).maybeSingle();
      if(ex2.data && ex2.data.owner_nick) return J({ok:0, err:"dono"});
      return J({ok:0, err:"auth"});
    }
    return J({ok:1, owner:me, claimed:1});
  }
  case "privGet": {
    if(!me) return J("[]");
    var pg2 = String(o.room||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    /* paridade com o server-plugin: sala trancada só entrega p/ dono/membro.
       Sem isso, qualquer logado com o código lia tudo (o invAck dispensa só
       o convite, não vira membro). Fail-closed: se a RLS bloquear a leitura
       de priv_rooms, o select de msgs abaixo também falha → "[]". */
    try{
      var or0 = await s.from("priv_rooms").select("owner_nick,locked").eq("code", pg2).limit(1).maybeSingle();
      if(or0 && or0.data && or0.data.locked){
        if(String(or0.data.owner_nick||"").toLowerCase() !== meL){
          var mb0 = await s.from("priv_members").select("nick").eq("code", pg2).ilike("nick", escLike(me)).limit(1).maybeSingle();
          if(!mb0 || !mb0.data) return J("[]");
        }
      }
    }catch(eG0){}
    var pm = await s.from("priv_msgs").select("*").eq("code", pg2).order("created_at",{ascending:true}).limit(100);
    if(pm.error) return J("[]");
    return J((pm.data||[]).map(msgRow));
  }
  case "privPush": {
    if(!me) return J({ok:0, err:"auth"});
    var pp = String(o.room||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    var ppOwner = "", ppLocked = false, ppHas = false, pk2 = await peekRoom(s, pp);
    if(pk2){
      ppOwner = String(pk2.owner || ""); ppLocked = !!pk2.locked; ppHas = !!pk2.has;
    } else {
      var has3 = await s.from("priv_msgs").select("id",{count:"exact",head:true}).eq("code", pp);
      var ow3 = await s.from("priv_rooms").select("owner_nick,locked").eq("code", pp).limit(1).maybeSingle();
      ppHas = (has3.count||0) > 0;
      if(ow3.data){ ppOwner = String(ow3.data.owner_nick || ""); ppLocked = !!ow3.data.locked; }
    }
    var isNew = !ppOwner && !ppHas;
    if(isNew && !privStrong(pp))
      return J({ok:0, err:"fraca", ex:privStrongEx(pp), bits:privBits(pp)});
    if(ppLocked){
      var mmb = await s.from("priv_members").select("nick").eq("code", pp).ilike("nick", escLike(me)).limit(1).maybeSingle();
      if(ppOwner.toLowerCase() !== meL && !mmb.data) return J({ok:0, err:"trancada"});
    }
    var ptxt = String(o.text||"").slice(0,500), purl = String(o.url||"").slice(0,500);
    if(!ptxt && !purl) return J({ok:0, err:"vazio"});
    if(purl && okUrl(purl) === null) return J({ok:0, err:"url"});
    /* vínculo via priv_enter (FASE 4 bloqueia escrita direta em priv_members):
       cria membro+grant em sala aberta/nova. Em trancada este ponto só é
       alcançado por dono/membro (checado acima), sem efeito colateral. */
    try{
      var pe0 = await s.rpc("priv_enter", {p_code:pp});
      if(pe0.error) throw pe0.error;
    }catch(eP){
      try{ await s.from("priv_members").upsert({code:pp, nick:meL},{onConflict:"code,nick"}); }catch(eM){}
    }
    var pins = await s.from("priv_msgs").insert({id:sbId("v"), code:pp, author:cleanNick(me),
      body:ptxt, media_url:purl, media_type:String(o.mtype||"").slice(0,60)});
    if(pins.error) return J({ok:0, err:"spam"});
    return J({ok:1});
  }
  case "privLock": {
    if(!me) return J({ok:0, err:"auth"});
    var pl = String(o.room||"").toLowerCase().slice(0,30);
    var ol = await s.from("priv_rooms").select("owner_nick").eq("code", pl).limit(1).maybeSingle();
    if(!ol.data || String(ol.data.owner_nick||"").toLowerCase() !== meL) return J({ok:0, err:"dono"});
    var lock = o.lock ? true : false;
    await s.from("priv_rooms").update({locked:lock}).eq("code", pl);
    return J({ok:1, locked:lock?1:0});
  }
  case "privReq": {
    if(!me) return J({ok:0, err:"auth"});
    var prq = String(o.room||"").toLowerCase().slice(0,30);
    var rqOwn = "", rqLock = false, pk3 = await peekRoom(s, prq);
    if(pk3 && pk3.exists){ rqOwn = String(pk3.owner || ""); rqLock = !!pk3.locked; }
    else {
      var rq = await s.from("priv_rooms").select("owner_nick,locked").eq("code", prq).limit(1).maybeSingle();
      if(rq.data){ rqOwn = String(rq.data.owner_nick || ""); rqLock = !!rq.data.locked; }
    }
    if(!rqOwn) return J({ok:0, err:"livre"});
    if(!rqLock) return J({ok:0, err:"aberta"});
    if(rqOwn.toLowerCase() === meL) return J({ok:1, member:1});
    var m2 = await s.from("priv_members").select("nick").eq("code", prq).ilike("nick", escLike(me)).limit(1).maybeSingle();
    if(m2.data) return J({ok:1, member:1});
    await s.from("priv_reqs").upsert({code:prq, nick:meL, from_nick:meL},{onConflict:"code,nick"});
    return J({ok:1});
  }
  case "reqGet": {
    if(!me) return J("[]");
    var rg = await s.from("priv_reqs").select("code,nick,from_nick").eq("code", "_x_").limit(0);
    // pedidos feitos AOS cômodos onde sou dono: busca códigos meus
    var mine = await s.from("priv_rooms").select("code").ilike("owner_nick", escLike(me)).limit(20);
    var codes = (mine.data||[]).map(function(r){ return r.code; });
    if(!codes.length) return J("[]");
    var rq2 = await s.from("priv_reqs").select("*").in("code", codes).order("created_at",{ascending:true}).limit(50);
    return J((rq2.data||[]).map(function(r){ return {f:r.nick, r:r.code, at:Date.parse(r.created_at)}; }));
  }
  case "reqOk": {
    if(!me) return J({ok:0, err:"auth"});
    var rk = String(o.r||o.room||"").toLowerCase().slice(0,30);
    var rf = String(o.f||"").replace(/^@/,"").slice(0,20);
    var ow4 = await s.from("priv_rooms").select("owner_nick").eq("code", rk).limit(1).maybeSingle();
    if(!ow4.data || String(ow4.data.owner_nick||"").toLowerCase() !== meL) return J({ok:0, err:"dono"});
    /* via função (FASE 4: membro+grant atômicos; escrita direta está bloqueada).
       Fallback p/ escrita direta caso a FASE 4 ainda não tenha rodado no banco. */
    try{
      var ap = await s.rpc("priv_approve", {p_code:rk, p_nick:rf.toLowerCase(), p_ok:!!o.v});
      if(ap.error) throw ap.error;
      if(!ap.data || ap.data.ok !== 1) return J({ok:0, err:(ap.data&&ap.data.err)||"auth"});
    }catch(eA){
      await s.from("priv_reqs").delete().eq("code", rk).ilike("nick", escLike(rf));
      if(o.v){
        var mOk = false;
        try{ var um = await s.from("priv_members").upsert({code:rk, nick:rf.toLowerCase()},{onConflict:"code,nick"}); mOk = !um.error; }catch(eM){}
        try{ await s.from("priv_grants").upsert({code:rk, nick:rf.toLowerCase()},{onConflict:"code,nick"}); }catch(eG){}
        if(!mOk) return J({ok:0, err:"auth"});
      }
    }
    return J({ok:1});
  }
  case "privInvite": {
    if(!me) return J({ok:0, err:"auth"});
    var ivc = String(o.room||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,30);
    var tgt = cleanNick(String(o.to||"").replace(/^@/,""));
    if(!okNick(tgt)) return J({ok:0, err:"nick"});
    var ex3 = await s.from("profiles").select("nick").ilike("nick", escLike(tgt)).limit(1).maybeSingle();
    if(!ex3.data) return J({ok:0, err:"noid"});
    /* convidar p/ sala trancada sem ser dono/membro virava spam + porta de
       entrada indevida (aceitar convite = virar membro de sala alheia).
       Aberta/nova continua livre (semântica de sala aberta). */
    try{
      var ivr = await s.from("priv_rooms").select("owner_nick,locked").eq("code", ivc).limit(1).maybeSingle();
      if(ivr && ivr.data && ivr.data.locked){
        if(String(ivr.data.owner_nick||"").toLowerCase() !== meL){
          var ivm = await s.from("priv_members").select("nick").eq("code", ivc).ilike("nick", escLike(me)).limit(1).maybeSingle();
          if(!ivm || !ivm.data) return J({ok:0, err:"trancada"});
        }
      }
    }catch(eIV){}
    await s.from("priv_reqs").upsert({code:ivc, nick:ex3.data.nick.toLowerCase(), from_nick:meL},{onConflict:"code,nick"});
    return J({ok:1});
  }
  case "invGet": {
    if(!me) return J("[]");
    var iv = await s.from("priv_reqs").select("*").eq("nick", meL).order("created_at",{ascending:true}).limit(50);
    return J((iv.data||[]).map(function(r){ return {f:r.from_nick, r:r.code, at:Date.parse(r.created_at)}; }));
  }
  case "invAck": {
    if(!me) return J({ok:0, err:"auth"});
    var akc = String(o.r||o.room||"").toLowerCase().slice(0,30);
    /* via função (FASE 4: valida o convite e cria membro+grant; escrita direta
       de grant próprio está bloqueada). Fallback p/ escrita direta pré-FASE 4. */
    try{
      var ac = await s.rpc("priv_accept", {p_code:akc});
      if(ac.error) throw ac.error;
      if(!ac.data || ac.data.ok !== 1) return J({ok:0, err:(ac.data&&ac.data.err)||"auth"});
    }catch(eA){
      await s.from("priv_reqs").delete().eq("code", akc).eq("nick", meL);
      var mOk2 = false;
      try{ var um2 = await s.from("priv_members").upsert({code:akc, nick:meL},{onConflict:"code,nick"}); mOk2 = !um2.error; }catch(eM){}
      try{ await s.from("priv_grants").upsert({code:akc, nick:meL},{onConflict:"code,nick"}); }catch(eG){}
      if(!mOk2) return J({ok:0, err:"auth"});
    }
    return J({ok:1});
  }
  case "privMsgDel": case "privMsgEdit": {
    if(!me) return J({ok:0, err:"auth"});
    var pmed = await s.from("priv_msgs").select("author,code").eq("id", String(o.id||"").slice(0,40)).limit(1).maybeSingle();
    if(!pmed.data) return J({ok:0, err:"noid"});
    var ow5 = await s.from("priv_rooms").select("owner_nick").eq("code", pmed.data.code).limit(1).maybeSingle();
    var isOw = ow5.data && String(ow5.data.owner_nick||"").toLowerCase() === meL;
    if(name === "privMsgDel"){
      if(String(pmed.data.author||"").toLowerCase() !== meL && !isOw) return J({ok:0, err:"dono"});
      await s.from("priv_msgs").delete().eq("id", String(o.id||"").slice(0,40));
    } else {
      if(String(pmed.data.author||"").toLowerCase() !== meL) return J({ok:0, err:"dono"});
      var pet = String(o.text||"").slice(0,500), peu = String(o.url||"").slice(0,500);
      if(!pet && !peu) return J({ok:0, err:"vazio"});
      if(peu && okUrl(peu) === null) return J({ok:0, err:"url"});
      await s.from("priv_msgs").update({body:pet, media_url:peu, edited:true}).eq("id", String(o.id||"").slice(0,40));
    }
    return J({ok:1});
  }
  case "subPriv": case "unsubPriv": return "ok";

  /* ---------- DM / amigos / status ---------- */
  case "friendReq": {
    if(!me) return J({ok:0, err:"auth"});
    var to = cleanNick(String(o.to||o.peer||"").replace(/^@/,""));
    if(!okNick(to)) return J({ok:0, err:"nick"});
    var tu = await s.from("profiles").select("nick").ilike("nick", escLike(to)).is("deleted_at", null).limit(1).maybeSingle();
    if(!tu.data) return J({ok:0, err:"noid"});
    to = tu.data.nick;
    if(to.toLowerCase() === meL) return J({ok:0, err:"eu"});
    var fr = await s.from("friends").select("a").eq("a", meL < to.toLowerCase() ? meL : to.toLowerCase()).eq("b", meL < to.toLowerCase() ? to.toLowerCase() : meL).limit(1).maybeSingle();
    if(fr.data) return J({ok:0, err:"ja"});
    if(to.toLowerCase() === "zunzunzinha"){
      var aL = meL;
      await s.from("friends").upsert([{a:aL < "zunzunzinha" ? aL : "zunzunzinha", b:aL < "zunzunzinha" ? "zunzunzinha" : aL}],{onConflict:"a,b"});
      return J({ok:1, auto:1});
    }
    var rev = await s.from("friend_reqs").select("*").eq("target", meL).ilike("from_nick", escLike(to)).limit(1).maybeSingle();
    if(rev.data){
      await s.from("friend_reqs").delete().eq("target", meL).ilike("from_nick", escLike(to));
      await s.from("friends").upsert({a: meL < to.toLowerCase() ? meL : to.toLowerCase(), b: meL < to.toLowerCase() ? to.toLowerCase() : meL},{onConflict:"a,b"});
      return J({ok:1, auto:1});
    }
    var pe = await s.from("friend_reqs").select("*").eq("target", to.toLowerCase()).ilike("from_nick", escLike(me)).limit(1).maybeSingle();
    if(pe.data) return J({ok:1, pending:1});
    await s.from("friend_reqs").insert({target:to.toLowerCase(), from_nick:me});
    return J({ok:1});
  }
  case "friendAccept": case "friendDecline": case "friendRemove": {
    if(!me) return J({ok:0, err:"auth"});
    var fp = cleanNick(String(o.from||o.peer||o.to||"").replace(/^@/,"")).toLowerCase();
    /* fix filter-break (2026-10-24): fp ia cru p/ o filtro or= — vírgula/
     * parêntese quebravam a lógica. Charset restrito antes de montar. */
    if(!okNick(fp)) return J({ok:0, err:"nick"});
    if(name === "friendRemove"){
      var ks = await s.from("friends").select("a,b").or("and(a.eq."+meL+",b.eq."+fp+"),and(a.eq."+fp+",b.eq."+meL+")").limit(5);
      for(var ri=0; ri<((ks.data)||[]).length; ri++) await s.from("friends").delete().eq("a", ks.data[ri].a).eq("b", ks.data[ri].b);
      return J({ok:1});
    }
    var rq3 = await s.from("friend_reqs").select("*").eq("target", meL).eq("from_nick", fp).limit(1).maybeSingle();
    // from_nick pode ter case diferente; tenta ilike
    if(!rq3.data){
      var rq4 = await s.from("friend_reqs").select("*").eq("target", meL).ilike("from_nick", escLike(fp)).limit(1).maybeSingle();
      rq3 = rq4;
    }
    if(!rq3.data) return J({ok:0, err:"noid"});
    await s.from("friend_reqs").delete().eq("target", meL).eq("from_nick", rq3.data.from_nick);
    if(name === "friendAccept")
      await s.from("friends").upsert({a: meL < fp ? meL : fp, b: meL < fp ? fp : meL},{onConflict:"a,b"});
    return J({ok:1});
  }
  case "friendState": {
    var meS = meL;
    if(!meS) return J({ok:0, err:"auth"});
    var pL = cleanNick(String(o.peer||o.to||"").replace(/^@/,"")).toLowerCase();
    /* fix filter-break (2026-10-24): idem friendRemove — pL cru no or=. */
    if(!okNick(pL)) return J({ok:0, err:"nick"});
    var ar = await s.from("friends").select("a").or("and(a.eq."+meS+",b.eq."+pL+"),and(a.eq."+pL+",b.eq."+meS+")").limit(1).maybeSingle();
    var inc = await s.from("friend_reqs").select("from_nick").eq("target", meS).ilike("from_nick", escLike(pL)).limit(1).maybeSingle();
    var og = await s.from("friend_reqs").select("target").ilike("from_nick", escLike(me)).eq("target", pL).limit(1).maybeSingle();
    return J({ok:1, friends:ar.data?1:0, incoming:inc.data?1:0, outgoing:og.data?1:0});
  }
  case "friendList": {
    if(!me) return J({ok:0, err:"auth"});
    var fl = await s.from("friends").select("a,b").or("a.eq."+meL+",b.eq."+meL).limit(200);
    var nicks = [];
    (fl.data||[]).forEach(function(r){ nicks.push(r.a === meL ? r.b : r.a); });
    var profs = nicks.length ? await s.from("profiles").select("nick,avatar,status").in("nick", nicks) : {data:[]};
    var pmap = {};
    (profs.data||[]).forEach(function(p){ pmap[String(p.nick).toLowerCase()] = p; });
    var out = nicks.map(function(n){ var p = pmap[n]||{}; return {nick:p.nick||n, avatar:p.avatar||"", st:p.status||""}; });
    var inc2 = await s.from("friend_reqs").select("from_nick").eq("target", meL).limit(50);
    var og2 = await s.from("friend_reqs").select("target").ilike("from_nick", escLike(me)).limit(20);
    return J({ok:1, friends:out,
      incoming:(inc2.data||[]).map(function(r){ return {nick:r.from_nick, avatar:"", at:0}; }),
      outgoing:(og2.data||[]).map(function(r){ return {nick:r.target, avatar:"", at:0}; })});
  }
  case "dmGet": {
    if(!me) return J({ok:0, err:"auth"});
    var peer = cleanNick(String(o.peer||o.to||"").replace(/^@/,""));
    var pu2 = await s.from("profiles").select("nick,status").ilike("nick", escLike(peer)).is("deleted_at", null).limit(1).maybeSingle();
    if(!pu2.data) return J({ok:0, err:"noid"});
    peer = pu2.data.nick;
    var key2 = dmKey(meL, peer.toLowerCase());
    var are = await s.from("friends").select("a").or("and(a.eq."+meL+",b.eq."+peer.toLowerCase()+"),and(a.eq."+peer.toLowerCase()+",b.eq."+meL+")").limit(1).maybeSingle();
    if(!are.data) return J({ok:0, err:"amigos"});
    var dm = await s.from("dm_msgs").select("*").eq("conv", key2).order("created_at",{ascending:true}).limit(100);
    return J({ok:1, key:key2, peer:peer, st:pu2.data.status||"",
      msgs:(dm.data||[]).map(function(m){ return {id:m.id, f:m.author, t:m.body, u:m.media_url||"", y:m.media_type||"", at:Date.parse(m.created_at), seen:!!m.seen, ed:!!m.edited}; })});
  }
  case "dmPush": {
    if(!me) return J({ok:0, err:"auth"});
    var dp = cleanNick(String(o.peer||o.to||"").replace(/^@/,""));
    var du = await s.from("profiles").select("nick").ilike("nick", escLike(dp)).is("deleted_at", null).limit(1).maybeSingle();
    if(!du.data) return J({ok:0, err:"noid"});
    dp = du.data.nick;
    var ar2 = await s.from("friends").select("a").or("and(a.eq."+meL+",b.eq."+dp.toLowerCase()+"),and(a.eq."+dp.toLowerCase()+",b.eq."+meL+")").limit(1).maybeSingle();
    if(!ar2.data) return J({ok:0, err:"amigos"});
    var dtext = String(o.text||"").slice(0,5000), durl = String(o.url||"").slice(0,5000);
    if(!dtext && !durl) return J({ok:0, err:"vazio"});
    if(durl && okUrl(durl) === null) return J({ok:0, err:"url"});
    var dk = dmKey(meL, dp.toLowerCase());
    var mid = sbId("d");
    var dins = await s.from("dm_msgs").insert({id:mid, conv:dk, author:cleanNick(me),
      body:dtext, media_url:durl, media_type:String(o.mtype||"").slice(0,100)});
    if(dins.error) return J({ok:0, err:"spam"});
    return J({ok:1, id:mid});
  }
  case "dmSeen": {
    if(!me) return J({ok:0, err:"auth"});
    var sp = cleanNick(String(o.peer||o.to||"").replace(/^@/,"")).toLowerCase();
    var sk = dmKey(meL, sp);
    var seen = await s.from("dm_msgs").update({seen:true}).eq("conv", sk).neq("author", cleanNick(me)).eq("seen", false).select("id");
    return J({ok:1, seen:(seen.data||[]).length});
  }
  case "dmUnread": {
    if(!me) return J({ok:0, err:"auth"});
    var fl2 = await s.from("friends").select("a,b").or("a.eq."+meL+",b.eq."+meL).limit(200);
    var keys = (fl2.data||[]).map(function(r){ var o2 = r.a === meL ? r.b : r.a; return dmKey(meL, o2); });
    if(!keys.length) return J({ok:1, total:0, un:{}});
    var um = await s.from("dm_msgs").select("conv,author,created_at").in("conv", keys).eq("seen", false).neq("author", cleanNick(me)).limit(500);
    var un = {}, total = 0;
    (um.data||[]).forEach(function(m){
      var parts = String(m.conv).split("|");
      var other = parts[0] === meL ? parts[1] : parts[0];
      if(!un[other]) un[other] = {n:0, at:0};
      un[other].n++; total++;
      var at = Date.parse(m.created_at);
      if(at > un[other].at) un[other].at = at;
    });
    return J({ok:1, total:total, un:un});
  }
  case "dmType": return J({ok:1});
  case "dmDel": case "dmEdit": {
    if(!me) return J({ok:0, err:"auth"});
    var dd = await s.from("dm_msgs").select("author").eq("id", String(o.id||"").slice(0,40)).limit(1).maybeSingle();
    if(!dd.data) return J({ok:0, err:"noid"});
    if(String(dd.data.author||"").toLowerCase() !== meL) return J({ok:0, err:"dono"});
    if(name === "dmDel") await s.from("dm_msgs").delete().eq("id", String(o.id||"").slice(0,40));
    else {
      var dt = String(o.text||"").slice(0,5000);
      await s.from("dm_msgs").update({body:dt, edited:true}).eq("id", String(o.id||"").slice(0,40));
    }
    return J({ok:1});
  }
  case "statusSet": {
    if(!me) return J({ok:0, err:"auth"});
    var st = String(o.st||o.status||"").toLowerCase();
    if(["online","ausente","offline"].indexOf(st) < 0) return J({ok:0, err:"bad"});
    await s.from("profiles").update({status:st}).eq("user_id", (await s.auth.getUser()).data.user.id);
    return J({ok:1, st:st});
  }
  case "statusBulk": {
    var arr2 = null;
    try{ var oo = typeof o === "object" && o !== null && !Array.isArray(o) ? o : JSON.parse(String(data)); arr2 = Array.isArray(oo) ? oo : (oo.nicks||oo.users||null); }catch(e){ arr2 = null; }
    if(!arr2) arr2 = String(data||"").split(",");
    if(!Array.isArray(arr2)) return J({ok:0});
    var l = arr2.slice(0,30).map(function(n){ return String(n||"").replace(/^@/,"").trim().toLowerCase(); }).filter(function(n){ return /^[a-z0-9-_]{2,20}$/.test(n); });
    if(!l.length) return J({ok:1, st:{}});
    var stq = await s.from("profiles").select("nick,status").in("nick", l);
    var out2 = {};
    l.forEach(function(n){ out2[n] = ""; });
    (stq.data||[]).forEach(function(p){ out2[String(p.nick).toLowerCase()] = p.status||""; });
    return J({ok:1, st:out2});
  }

  default:
    return origRpc(name, data);
  }
}

window.sbRpc = sbRpc2;
try{ window.__sb2 = true; }catch(e){}
})();
