/* sb3.js — Supabase parte 3: conta/sessões, depo, nodal, dj, gifmoji,
   sug/ann, pkey, ref, theme/html/nickStyle, bio/hist, zz/ai/mir, replyDel/Edit,
   profView, nickBulk + ponte realtime → mensagens legado.
   Carregar DEPOIS de sb2.js. Encadeia window.sbRpc (sb → sb2 → sb3). */
(function(){
"use strict";
if(typeof window === "undefined" || !window.sbRpc) return;
var prevRpc = window.sbRpc;

function J(o){ try{ return JSON.stringify(o); }catch(e){ return '{"ok":0}'; } }
function cleanNick(n){ return String(n||"").replace(/\s+/g,"-").slice(0,20); }
function sbBadKey(k){ return /^(prototype|__proto__|constructor)$/i.test(String(k||"")); }
function okNick(n){ return /^[A-Za-z0-9-_]{2,20}$/.test(n||"") && !sbBadKey(n); }
/* re-seal r2: single-use de ticket zcap (paridade server-plugin/espelho/bonto).
   Sem o {used}, o mesmo ticket valia 2x em 10min no path Supabase. Ganho
   prático ~nulo (ticket é amarrado ao nick), mas a paridade fecha a porta. */
var _zcapUsedSb3 = {};
function escLike(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/%/g,"\\%").replace(/_/g,"\\_"); }
function okAnon(a){ return /^anon-[a-z0-9]{6,12}$/.test(a||""); }
function okHash(h){ return /^[0-9a-f]{64}$/.test(String(h||"")); }
function sbId(p){ return (p||"x") + Date.now().toString(36) + Math.floor(Math.random()*46656).toString(36); }
function low(s){ return String(s||"").toLowerCase(); }
function sbAnonTokOk(t){ return /^zat_[0-9a-f]{32}$/.test(String(t||"")); }
function sbAnonTokNew3(){
  try{
    var b = new Uint8Array(16), s = "", abc = "0123456789abcdef", i;
    if(window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
    else for(i=0;i<16;i++) b[i] = Math.floor(Math.random()*256);
    for(i=0;i<16;i++) s += abc[b[i]%16];
    return "zat_"+s+s.slice(0,16);
  }catch(e){ return "zat_"+Math.floor(Math.random()*1e16).toString(16)+"0000000000000000".slice(0,32).slice(0,32); }
}
async function sbShahex3(s){
  try{
    if(window.crypto && window.crypto.subtle){
      var b = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s||"")));
      return Array.prototype.map.call(new Uint8Array(b), function(x){ return ("0"+x.toString(16)).slice(-2); }).join("");
    }
  }catch(e){}
  return "fb"+String(String(s||"").length)+Math.floor(Math.random()*1e16).toString(16);
}
async function sbAnonHash3(t, dom){ if(!sbAnonTokOk(t)) return null; return await sbShahex3(dom+"|"+String(t||"")); }
async function sbAnonClaim3(sb, anon, tok){
  var a = String(anon||"").toLowerCase();
  try{
    var ex = await sb.from("anon_claims").select("tok_hash").eq("anon", a).limit(1).maybeSingle();
    if(ex && ex.error && /relation|table|column|schema|does not exist|404/i.test(String((ex.error.message||"")+(ex.error.code||"")))) return {st:2};
    if(ex && ex.data && ex.data.tok_hash){
      var h = await sbAnonHash3(tok, "zunzum-anon-hash-v1");
      if(!h) return {st:-1};
      return (h===ex.data.tok_hash) ? {st:1} : {st:-1};
    }
    /* Round 4: mintagem (paridade com sb.js) — antes retornava {st:0} sem
       token, então sugPush/nodal anon nunca tinham dono. */
    var nt = sbAnonTokNew3();
    var nh = await sbAnonHash3(nt, "zunzum-anon-hash-v1");
    try{
      var ins = await sb.from("anon_claims").insert({anon:a, tok_hash:nh});
      if(ins && ins.error && /duplicate|already|unique|conflict/i.test(String(ins.error.message||""))) return {st:-1};
      if(ins && ins.error && /relation|table|column|schema|does not exist|404/i.test(String((ins.error.message||"")+(ins.error.code||"")))) return {st:2};
    }catch(e2){ return {st:2}; }
    return {st:0, tok:nt};
  }catch(e){ return {st:2}; }
}
function ms(t){ try{ return Date.parse(t)||0; }catch(e){ return 0; } }
function dmKey(a,b){ a=low(a); b=low(b); return a<b?a+"|"+b:b+"|"+a; }
function sbEmail(n){ return low(n) + "@zunzum.social"; }
/* host estrito (espelho do okUrlStrict do servidor): bloqueia userinfo,
   localhost, IP privado/reservado e .onion/.local — a URL vira <img>/<video>
   no cliente e seria sonda de rede local + tracker. */
function sbHostOk(u){
  try{
    var x = new URL(String(u || ""));
    if(x.protocol !== "https:" || x.username || x.password) return false;
    if(/[\s<>"'`\\]/.test(String(u))) return false;
    var hn = String(x.hostname || "").toLowerCase();
    if(!hn || hn.length > 253 || hn.indexOf("..") >= 0 || /[^a-z0-9.-]/.test(hn)) return false;
    try{ var _pt3 = parseInt(x.port||"", 10); if(x.port && !(_pt3>=1 && _pt3<=65535)) return false; }catch(e){}
    if(hn === "localhost" || hn === "localhost.localdomain") return false;
    if(hn === "onion" || hn.slice(-6) === ".onion" || hn === "local" ||
       hn.slice(-6) === ".local" || hn.slice(-10) === ".localhost") return false;
    var _num3 = /^[0-9.]+$/.test(hn) || /0x/i.test(hn);
    if(_num3){
      var _q3 = null;
      var _p13 = function(p){ p=String(p||""); if(!p) return -1;
        if(/^0x[0-9a-f]+$/i.test(p)){ var _v=parseInt(p,16); return (_v>=0&&_v<=255)?_v:-1; }
        if(/^0[0-7]+$/.test(p)&&p.length>1){ var _o=parseInt(p,8); return (_o>=0&&_o<=255)?_o:-1; }
        if(!/^\d+$/.test(p)) return -1; var _d=parseInt(p,10); return (_d>=0&&_d<=255)?_d:-1; };
      try{
        if(/^\d+$/.test(hn)){ var _n323=parseInt(hn,10); if(_n323<0||_n323>4294967295) return false; _q3=[(_n323>>>24)&255,(_n323>>>16)&255,(_n323>>>8)&255,_n323&255]; }
        else if(/^0x[0-9a-f]+$/i.test(hn)){ var _h323=parseInt(hn,16); if(_h323<0||_h323>4294967295) return false; _q3=[(_h323>>>24)&255,(_h323>>>16)&255,(_h323>>>8)&255,_h323&255]; }
        else if(/^0[0-7]+$/.test(hn)&&hn.length>1){ var _o323=parseInt(hn,8); if(_o323<0||_o323>4294967295) return false; _q3=[(_o323>>>24)&255,(_o323>>>16)&255,(_o323>>>8)&255,_o323&255]; }
        else { var _pp3=hn.split("."); if(_pp3.length===4){ var _ok3=true,_qq3=[]; for(var _i3=0;_i3<4;_i3++){ var _v23=_p13(_pp3[_i3]); if(_v23<0){_ok3=false;break;} _qq3.push(_v23); } _q3=_ok3?_qq3:null; } }
      }catch(e){ _q3 = null; }
      if(!_q3) return false;
      if(_q3[0]===127||_q3[0]===0||_q3[0]===10) return false;
      if(_q3[0]===172&&_q3[1]>=16&&_q3[1]<=31) return false;
      if(_q3[0]===192&&_q3[1]===168) return false;
      if(_q3[0]===169&&_q3[1]===254) return false;
      if(_q3[0]===192&&_q3[1]===0&&(_q3[2]===0||_q3[2]===2)) return false;
      if(_q3[0]>=224) return false;
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
/* senha GoTrue derivada do hash do app. ATENÇÃO: o algoritmo é público, então
   QUEM ROUBAR o hash deriva a senha e loga no Supabase — a derivação NÃO é
   barreira; a proteção real é não vazar o hash.
   Contas antigas (senha = hash puro) migram no 1º login (derivada → legada
   → troca p/ derivada). */
function sbGoPass(h){
  try{
    var b = new TextEncoder().encode("zunzum-gotrue-v1:" + String(h || ""));
    if(crypto.subtle && crypto.subtle.digest){
      return crypto.subtle.digest("SHA-256", b).then(function(d){
        return Array.prototype.map.call(new Uint8Array(d),
          function(x){ return ("0" + x.toString(16)).slice(-2); }).join("");
      });
    }
  }catch(e){}
  return Promise.resolve(String(h || ""));
}
/* C1 v2 com salt por nick (paridade sb.js). */
function sbGoPass2(nick, h){
  try{
    var b2 = new TextEncoder().encode("zunzum-gotrue-v2:" + String(nick||"").toLowerCase() + ":" + String(h||""));
    if(crypto.subtle && crypto.subtle.digest){
      return crypto.subtle.digest("SHA-256", b2).then(function(d){
        return Array.prototype.map.call(new Uint8Array(d),
          function(x){ return ("0" + x.toString(16)).slice(-2); }).join("");
      });
    }
  }catch(e){}
  return Promise.resolve(String(h || ""));
}
async function sbSignIn(s, email, hash, captcha, nickHint){
  var _nl2 = "";
  try{ _nl2 = String(nickHint||email||"").replace(/@zunzum\.social$/i,"").toLowerCase(); }catch(e){}
  var derived2 = await sbGoPass2(_nl2, hash);
  var derived = await sbGoPass(hash);
  var opt = captcha ? {captchaToken: String(captcha).slice(0, 2048)} : undefined;
  var si = await s.auth.signInWithPassword({email:email, password:derived2, options:opt});
  if(!si.error) return si;
  si = await s.auth.signInWithPassword({email:email, password:derived, options:opt});
  if(!si.error){ try{ await s.auth.updateUser({password:derived2}); }catch(e){} return si; }
  if(derived === String(hash)) return si;
  var leg = await s.auth.signInWithPassword({email:email, password:String(hash), options:opt});
  if(leg.error) return leg;
  try{ await s.auth.updateUser({password:derived2}); }catch(e){}
  return leg;
}
function sbCaptchaErr(e){ return /captcha/i.test(String((e && e.message) || e || "")); }
function okUrl(u){
  u = String(u||""); if(!u) return "";
  if(u.length>2000 || u.indexOf("https://")!==0) return null;
  if(/[\s<>"'`\\]/.test(u)) return null;
  var rest = u.slice(8).split("/")[0].split("?")[0].split("#")[0];
  if(!rest || rest.indexOf("@")>=0 || /[^A-Za-z0-9.-]/.test(rest.split(":")[0])) return null;
  if(!sbHostOk(u)) return null;
  return u;
}
var ZNICK_FONTS = ["", "Verdana","Arial","Georgia","Trebuchet MS","Courier New","Comic Sans MS","Impact","Palatino","Tahoma","Times New Roman","monospace","cursive","fantasy","system-ui"];
function cleanNickStyle(ns){
  if(!ns || typeof ns !== "object") return null;
  var out = {};
  var c = String(ns.c||ns.color||"");
  if(/^#[0-9a-fA-F]{6}$/.test(c)) out.c = c.toLowerCase();
  var f = String(ns.f||ns.font||"").slice(0,30);
  if(f && ZNICK_FONTS.indexOf(f)>=0) out.f = f;
  var fx = parseInt(ns.fx!==undefined?ns.fx:(ns.effect!==undefined?ns.effect:0),10);
  if(!(fx>=0 && fx<=29)) fx = 0;
  out.fx = fx;
  if(!out.c && !out.f && !out.fx) return null;
  return out;
}
function cleanNodalTag(t){
  var c = String(t||"").trim().replace(/^#+/,"").toLowerCase().replace(/[^a-z0-9-_]/g,"").slice(0,24);
  if(/^(geral|priv|dm|api|www)$/.test(c)) return "";
  return c;
}
function okNodalTag(t){ return /^[a-z0-9-_]{2,24}$/.test(t||"") && !/^(geral|priv|dm|api|www)$/.test(t); }

async function sb(){ return window.__sb.client(); }
function emit(s){ try{ window.__sb.emit(s); }catch(e){} }
/* perfil mínimo p/ sessão: tenta com pw8 (FASE 9); sem a coluna (pré-migração)
   refaz sem ela e devolve pw8=undefined (= forte, fail-open até o dono rodar
   a FASE 9 — evita derrubar o login de todo mundo antes da migração). */
async function profLite(s, uid){
  var r = null;
  try{ r = await s.from("profiles").select("nick,deleted_at,pw8").eq("user_id", uid).limit(1).maybeSingle(); }catch(e){ r = null; }
  if(r && !r.error && r.data) return r.data;
  try{ r = await s.from("profiles").select("nick,deleted_at").eq("user_id", uid).limit(1).maybeSingle(); }catch(e2){ return null; }
  if(r && !r.error && r.data){ r.data.pw8 = undefined; return r.data; }
  return null;
}

/* ---------- sessão: GoTrue primeiro, hash do app como fallback ---------- */
var _meCache = null, _meCacheAt = 0, _lastNb = 0, _silentAt = 0, _lastPet = {};
async function ensureMe(o){
  o = o || {};
  var want = "";
  try{ want = cleanNick(String(o.nick||"").replace(/^@/,"")).toLowerCase(); }catch(e){ want = ""; }
  if(!okNick(want)) want = "";
  try{
    var s = await sb();
    var g = await s.auth.getSession();
    var u = g && g.data && g.data.session && g.data.session.user;
    if(u){
      var got = null, dropped = false;
      if(_meCache && _meCache.uid === u.id && Date.now()-_meCacheAt < 300000) got = _meCache;
      else{
        var _pl = await profLite(s, u.id);
        if(_pl && _pl.nick){
          got = {nick:_pl.nick, lower:low(_pl.nick), uid:u.id, del:!!_pl.deleted_at, pw8:_pl.pw8};
          _meCache = got; _meCacheAt = Date.now();
        }
      }
      if(got && want && got.lower !== want){
        /* fail-closed: a sessão é de OUTRO usuário, não serve p/ este
           chamador. Derruba a sessão obsoleta e cai p/ o login silencioso
           como o nick declarado (ou null → "auth"). Antes retornava o
           usuário errado em silêncio (writes/DMs como conta errada). */
        try{ await s.auth.signOut(); }catch(e2){}
        _meCache = null; _meCacheAt = 0;
        got = null; dropped = true;
      }
      if(got) return got;
      if(!dropped) return null;
    }
  }catch(e){}
  /* C1: fallback hash-direto DEPRECADO mas mantido p/ compat (outra aba sem
     sessão GoTrue). Throttle 2s global p/ não virar oráculo de pass-the-hash;
     o caminho preferido é a sessão GoTrue persistida. */
  var nick = cleanNick(String(o.nick||"").replace(/^@/,""));
  var h = String(o.hash||"");
  if(okNick(nick) && okHash(h)){
    try{
      var _st = Date.now(); if(_st - _silentAt < 2000) return null; _silentAt = _st;
      var s2 = await sb();
      var si = await sbSignIn(s2, sbEmail(nick), h, undefined, nick);
      if(si && !si.error){
        _meCache = null; _meCacheAt = 0;
        var g2 = await s2.auth.getSession();
        var u2 = g2 && g2.data && g2.data.session && g2.data.session.user;
        if(u2){
          var _pl2 = await profLite(s2, u2.id);
          if(_pl2 && _pl2.nick){
            _meCache = {nick:_pl2.nick, lower:low(_pl2.nick), uid:u2.id, del:!!_pl2.deleted_at, pw8:_pl2.pw8};
            _meCacheAt = Date.now();
            return _meCache;
          }
        }
      }
    }catch(e){}
  }
  return null;
}
function meLowerNow(){ return (_meCache && _meCache.lower) || ""; }

/* ---------- dono (cache 5min) ---------- */
var _ownerNick = null, _ownerAt = 0;
async function ownerNick(s){
  if(_ownerNick !== null && Date.now()-_ownerAt < 300000) return _ownerNick;
  try{
    var r = await s.from("site_config").select("value").eq("key","owner_nick").limit(1).maybeSingle();
    var n = r && r.data && r.data.value && r.data.value.nick;
    _ownerNick = n ? low(n) : "";
  }catch(e){ _ownerNick = ""; }
  _ownerAt = Date.now();
  return _ownerNick;
}
async function isOwner(s, meLower){
  if(!meLower) return false;
  var on = await ownerNick(s);
  return !!on && on === meLower;
}
function dropOwnerCache(){ _ownerNick = null; _ownerAt = 0; }

/* F1 Supabase (paridade needStrong): logado !pw8 não escreve (fraca-pw).
   Leituras, vias de migração e subscriptions passam. Anon passa (sem sessão).
   pw8=undefined (pré-FASE 9) = permite (fail-open até a migração SQL). */
var SB3_PASS = {register:1, sessLogin:1, sessLogout:1, pwChange:1, cliVer:1,
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
async function sbNeedStrongDeny3(s, o){
  try{
    var me = await ensureMe(o);
    if(!me) return null;
    if(me.pw8 === false) return J({ok:0, err:"fraca-pw"});
    return null;
  }catch(e){ return null; }
}
/* ================= RPC ================= */
async function sbRpc3(name, data){
  try{ if(!window.sbConfigured || !window.sbConfigured()) return prevRpc(name, data); }catch(e){ return prevRpc(name, data); }
  if(name === "dmType"){
    // typing humano-humano: broadcast realtime + comportamento antigo
    try{
      var oT = {};
      try{ oT = JSON.parse(String(data||"{}")); }catch(e){ oT = {}; }
      var meT = await ensureMe(oT);
      var peerT = cleanNick(String(oT.peer||oT.to||"").replace(/^@/,""));
      if(meT && !meT.del && okNick(peerT)){
        ensureSubs();
        await busSend("dmt", {key:dmKey(meT.lower, peerT.toLowerCase()), from:meT.lower});
      }
    }catch(e){}
    return prevRpc(name, data);
  }

  var o = {};
  try{ var t = String(data == null ? "" : (typeof data === "string" ? data : JSON.stringify(data))); o = t ? JSON.parse(t) : {}; }
  catch(e){ o = {}; }
  var raw = (typeof data === "string" && o && typeof o !== "object") ? String(data) : data;
  var s = await sb();
  var me = null, meL = "";
  // RPCs que precisam de login chamam needMe(); leituras públicas não
  async function needMe(){
    if(!me && !meL){
      me = await ensureMe(o);
      meL = me ? me.lower : "";
    }
    return me;
  }
  if(!SB3_PASS[name]){
    var _deny3 = await sbNeedStrongDeny3(s, o);
    if(_deny3) return _deny3;
  }

  switch(name){

  /* ---------- conta / sessões ---------- */
  case "register": {
    var nick = cleanNick(String(o.nick||""));
    if(!okNick(nick)) return J({ok:0, err:"nick"});
    if(!okHash(o.hash)) return J({ok:0, err:"hash"});
    var kl = nick.toLowerCase();
    if(kl === "zunzunzinha" || kl.replace(/[-_]/g,"") === "zunzunzinha") return J({ok:0, err:"reservado"});
    /* conta de teste (*_teste): SÓ o dono cria (não entra no contador — o
       contador aqui é consulta ao vivo, ver presence em sb.js) */
    /* conta de teste (*_teste): SÓ o dono cria. NÃO usar ensureMe(o) aqui: o.nick
       é a CONTA NOVA, e o fail-closed do ensureMe derrubaria a sessão do dono.
       Lê o usuário atual da sessão GoTrue sem tocar nela. */
    if(/_teste$/i.test(kl)){ try{ var _sessU = null; try{ var _gg = await s.auth.getSession(); _sessU = _gg && _gg.data && _gg.data.session && _gg.data.session.user; }catch(eSU){} var _sessLower = ""; if(_sessU){ try{ var _rr = await s.from("profiles").select("nick").eq("user_id", _sessU.id).limit(1).maybeSingle(); if(_rr && _rr.data && _rr.data.nick) _sessLower = low(_rr.data.nick); }catch(eSP){} } if(!(await isOwner(s, _sessLower))) return J({ok:0, err:"dono"}); }catch(eOwn){ return J({ok:0, err:"dono"}); } }
    /* captcha ANTES do branch de existência (anti-enumeração: sem ticket a
       resposta é sempre "captcha", existente ou não). */
    try{
      var _ZCap = (typeof window!=="undefined" && window.ZunCap) ? window.ZunCap : null;
      if(_ZCap && !_ZCap.verify(String(o.zcap||""), kl, {used:_zcapUsedSb3})) return J({ok:0, err:"captcha"});
    }catch(e){ return J({ok:0, err:"captcha"}); }
    var em = sbEmail(nick);
    var cap = String(o.captcha || "").slice(0, 2048) || undefined;
    /* existência primeiro: login em conta existente NÃO exige pwLen (o pwLen
       aqui é o da senha ATUAL e serve de prova p/ migrar; exigir 8+ brickava
       a migração de conta fraca — paridade server-plugin, que só exige pwLen
       p/ contas NOVAS). */
    var _ex0 = null;
    try{ _ex0 = await s.from("profiles").select("nick,user_id,pw8").ilike("nick", escLike(nick)).limit(1).maybeSingle(); }catch(e){ _ex0 = null; }
    var _row0 = _ex0 && _ex0.data;
    if(_row0 && _row0.user_id){
      var si0 = await sbSignIn(s, em, String(o.hash), cap, nick);
      if(si0.error){
        if(sbCaptchaErr(si0.error)) return J({ok:0, err:"captcha"});
        return J({ok:0, err:"senha"});
      }
      var gg0 = await s.auth.getSession();
      var uu0 = gg0 && gg0.data && gg0.data.session && gg0.data.session.user;
      if(!uu0) return J({ok:0, err:"auth"});
      var pf0 = await profLite(s, uu0.id);
      var p0 = pf0 || {nick:nick};
      var restored0 = 0;
      if(p0.deleted_at){
        try{ await s.from("profiles").update({deleted_at:null}).eq("user_id", uu0.id); restored0 = 1; }catch(e){}
      }
      _meCache = {nick:p0.nick, lower:low(p0.nick), uid:uu0.id, del:0, pw8:p0.pw8}; _meCacheAt = Date.now();
      var out0 = {ok:1, nick:p0.nick, created:ms(p0.created)||Date.now(),
        avatar:p0.avatar||"", th:p0.th||null, pg:p0.pg||"", ns:p0.ns||null, del:0, test:0};
      if(restored0) out0.restored = 1;
      try{ if(p0.pw8 === false) out0.weak = 1; }catch(e){}
      return J(out0);
    }
    /* conta NOVA: pwLen>=8 (paridade server-plugin round 6 — antes NaN passava). */
    try{ var pl = parseInt(o.pwLen,10); if(isNaN(pl) || pl < 8) return J({ok:0, err:"senha-curta"}); }catch(e){ return J({ok:0, err:"senha-curta"}); }
    /* C1: cria já em v2 (com salt do nick). */
    var up = await s.auth.signUp({email:em, password:await sbGoPass2(nick, String(o.hash)), options:cap ? {captchaToken:cap} : undefined});
    if(up.error){
      var upm = String((up.error&&up.error.message)||"");
      if(/captcha/i.test(upm)) return J({ok:0, err:"captcha"});
      if(/already|registered|exists|duplicate/i.test(upm)){
        /* corrida: virou existente entre o pre-check e o signUp → login */
        var si = await sbSignIn(s, em, String(o.hash), cap, nick);
        if(si.error){
          if(sbCaptchaErr(si.error)) return J({ok:0, err:"captcha"});
          return J({ok:0, err:"senha"});
        }
      } else return J({ok:0, err:"auth"});
    }
    var gg = await s.auth.getSession();
    var uu = gg && gg.data && gg.data.session && gg.data.session.user;
    if(!uu) return J({ok:0, err:"auth"});
    var ex = await s.from("profiles").select("nick,user_id,pw8").ilike("nick", escLike(nick)).limit(1).maybeSingle();
    var row = ex && ex.data;
    if(!row){
      var ins = await s.from("profiles").insert({nick:nick, user_id:uu.id, pw8:true});
      if(ins.error){
        var re = await s.from("profiles").select("nick,user_id,pw8").ilike("nick", escLike(nick)).limit(1).maybeSingle();
        row = re && re.data;
        if(!row || (row.user_id && row.user_id !== uu.id)) return J({ok:0, err:"nick-taken"});
      }
    } else if(row.user_id && row.user_id !== uu.id){
      return J({ok:0, err:"nick-taken"});
    } else if(!row.user_id){
      await s.from("profiles").update({user_id:uu.id, pw8:true}).ilike("nick", escLike(nick)).is("user_id", null);
    }
    var pf = await s.from("profiles").select("*").eq("user_id", uu.id).limit(1).maybeSingle();
    var p = (pf && pf.data) || {nick:nick, avatar:"", created:new Date().toISOString(), th:null, pg:"", ns:null, deleted_at:null};
    var restored = 0;
    if(p.deleted_at){
      try{ await s.from("profiles").update({deleted_at:null}).eq("user_id", uu.id); restored = 1; }catch(e){}
    }
    try{
      var rk = cleanNick(String(o.ref||"").replace(/^@/,"")).toLowerCase();
      if(rk && rk !== low(p.nick) && /^[a-z0-9-_]{2,20}$/.test(rk)){
        var rex = await s.from("profiles").select("nick").eq("nick", rk).limit(1).maybeSingle();
        var rex2 = await s.from("profiles").select("nick").ilike("nick", escLike(rk)).is("deleted_at", null).limit(1).maybeSingle();
        if(rex2 && rex2.data){
          /* declara o indicador via claim_ref() (sem escrita direta em refs);
             fallback legado p/ schema sem a função. */
          try{
            var crf = await s.rpc("claim_ref", {p_by:String(rex2.data.nick||"")});
            if(crf.error) throw crf.error;
          }catch(eRef){
            try{
              var rbe = await s.from("ref_by").select("by_nick").eq("nick", low(p.nick)).limit(1).maybeSingle();
              if(!(rbe && rbe.data)) await s.from("ref_by").insert({nick:low(p.nick), by_nick:low(rex2.data.nick)});
            }catch(eRef2){}
          }
        }
      }
    }catch(e){}
    _meCache = {nick:p.nick, lower:low(p.nick), uid:uu.id, del:0, pw8:p.pw8}; _meCacheAt = Date.now();
    var out = {ok:1, nick:p.nick, created:ms(p.created)||Date.now(),
      avatar:p.avatar||"", th:p.th||null, pg:p.pg||"", ns:p.ns||null, del:0, test:(/_teste$/i.test(kl)?1:0)};
    if(restored) out.restored = 1; else out.fresh = 1;
    try{ if(p.pw8 === false) out.weak = 1; }catch(e){}
    return J(out);
  }

  case "pwChange": {
    var nh = String(o.newHash||"");
    if(!/^[0-9a-f]{64}$/.test(nh)) return J({ok:0, err:"bad"});
    /* paridade server-plugin: nova senha precisa de 8+ letras (sem isso o
       migrante "migra" p/ outra senha fraca e o pw8 nunca vira true). */
    try{ var _nl3 = parseInt(o.newLen,10); if(isNaN(_nl3) || _nl3 < 8) return J({ok:0, err:"senha-curta"}); }catch(e){ return J({ok:0, err:"senha-curta"}); }
    var nk = cleanNick(String(o.nick||"").replace(/^@/,""));
    if(!okNick(nk)) return J({ok:0, err:"auth"});
    var cred = okHash(o.hash) ? String(o.hash) : (okHash(o.proof) ? String(o.proof) : "");
    // se o.hash for igual ao atual, o ensureMe já loga; senão tenta proof
    var mme = await ensureMe(o);
    if(!mme || mme.lower !== nk.toLowerCase()){
      if(!cred) return J({ok:0, err:"auth"});
      try{
        var sii = await sbSignIn(s, sbEmail(nk), cred, undefined, nk);
        if(sii.error) return J({ok:0, err:"atual"});
        mme = await ensureMe(o);
      }catch(e){ return J({ok:0, err:"auth"}); }
    }
    if(!mme) return J({ok:0, err:"auth"});
    if(mme.del) return J({ok:0, err:"inativa"});
    /* C1: nova senha já em v2. */
    var up2 = await s.auth.updateUser({password:await sbGoPass2(nk, nh)});
    if(up2.error) return J({ok:0, err:"bad"});
    /* MIG v2: senha nova 8+ ⇒ conta forte (ignora erro pré-FASE 9). */
    try{ await s.from("profiles").update({pw8:true}).eq("user_id", mme.uid); }catch(e){}
    _meCache = null; _meCacheAt = 0;
    await ensureMe({nick:mme.nick, hash:nh});
    return J({ok:1});
  }

  case "sessLogin": {
    var slm = await ensureMe(o);
    if(!slm) return J({ok:0, err:"auth"});
    // o app guarda o token retornado como credencial: devolve o hash (reutilizável)
    var _sl = {ok:1, token: okHash(o.hash) ? String(o.hash) : ""};
    try{ if(slm.pw8 === false) _sl.weak = 1; }catch(e){}
    return J(_sl);
  }

  case "sessLogout": {
    try{ await s.auth.signOut(); }catch(e){}
    _meCache = null; _meCacheAt = 0;
    return J({ok:1});
  }

  case "accountDelReq": {
    var adm = await needMe();
    if(!adm) return J({ok:0, err:"auth"});
    var nowIso = new Date().toISOString();
    await s.from("profiles").update({deleted_at:nowIso}).eq("user_id", adm.uid);
    _meCache.del = 1;
    return J({ok:1, del:Date.now()});
  }
  case "accountDelCancel": {
    var acm = await needMe();
    if(!acm) return J({ok:0, err:"auth"});
    await s.from("profiles").update({deleted_at:null}).eq("user_id", acm.uid);
    _meCache.del = 0;
    return J({ok:1, del:0});
  }
  case "accountDelStatus": {
    var asm = await needMe();
    if(!asm) return J({ok:0});
    var st = await s.from("profiles").select("deleted_at").eq("user_id", asm.uid).limit(1).maybeSingle();
    var dd = st && st.data && st.data.deleted_at;
    return J({ok:1, del: dd ? ms(dd) : 0});
  }

  case "refMe": {
    var rnk = cleanNick(String(typeof o === "string" ? o : (o.nick||data||"")).replace(/^@/,"")).toLowerCase();
    if(!rnk) return J({n:0});
    var rf = await s.from("refs").select("n").eq("nick", rnk).limit(1).maybeSingle();
    return J({n:(rf && rf.data && rf.data.n) || 0});
  }
  case "refTop": {
    var rt = await s.from("refs").select("nick,n").order("n", {ascending:false}).limit(20);
    var arr = [];
    var rows = (rt.data||[]).filter(function(r){ return r && r.n > 0; });
    if(rows.length){
      var pnames = rows.map(function(r){ return r.nick; });
      var pu = await s.from("profiles").select("nick").in("nick", pnames).is("deleted_at", null);
      var okset = {};
      (pu.data||[]).forEach(function(p){ okset[low(p.nick)] = p.nick; });
      rows.forEach(function(r){
        if(arr.length >= 10) return;
        var cn = okset[low(r.nick)];
        if(cn) arr.push({nick:cn, n:r.n});
      });
    }
    return J(arr);
  }

  /* ---------- feed: replies ---------- */
  case "replyDel": case "replyEdit": {
    var rme = await needMe();
    var rkey = rme ? "@"+rme.nick : String(o.anon||"").slice(0,20);
    if(rme){ if(!okNick(rme.nick)) return J({ok:0, err:"auth"}); if(rme.del) return J({ok:0, err:"inativa"}); }
    else if(!okAnon(rkey)) return J({ok:0, err:"auth"});
    var rr = await s.from("feed_replies").select("id,author,anon_tok").eq("id", String(o.rid||"")).limit(1).maybeSingle();
    if(rr && rr.error && /column|anon_tok|schema/i.test(String(rr.error.message||""))){
      rr = await s.from("feed_replies").select("id,author").eq("id", String(o.rid||"")).limit(1).maybeSingle();
    }
    if(!rr.data) return J({ok:0, err:"noid"});
    var ra = String(rr.data.author||"");
    if(ra !== rkey && !(rme && ra.toLowerCase() === "@"+rmeL())) return J({ok:0, err:"dono"});
    if(!rme){
      var _ck3 = await sbAnonClaim3(s, rkey, o.anonTok);
      /* C3 fail-closed: tabela ausente (st:2) também nega. */
      if(_ck3.st!==-1 && _ck3.st!==0 && _ck3.st!==1) return J({ok:0, err:"dono"});
      if(_ck3.st===-1) return J({ok:0, err:"dono"});
      if(_ck3.st===1 && rr.data && rr.data.anon_tok){
        var _ih3 = await sbAnonHash3(o.itemTok, "zunzum-anon-item-v1");
        if(!_ih3 || _ih3!==rr.data.anon_tok) return J({ok:0, err:"dono"});
      }
    }
    if(name === "replyDel"){
      await s.from("feed_replies").delete().eq("id", String(o.rid||""));
    } else {
      var rtx = String(o.text||"").slice(0,300);
      if(!rtx) return J({ok:0, err:"vazio"});
      await s.from("feed_replies").update({body:rtx, edited:true}).eq("id", String(o.rid||""));
    }
    return J({ok:1});
    function rmeL(){ return rme ? rme.lower : ""; }
  }

  /* ---------- depoimentos ---------- */
  case "depoGet": {
    var dto = cleanNick(String(o.to||"").replace(/^@/,""));
    if(!okNick(dto)) return J({ok:0});
    var dpu = await s.from("profiles").select("nick").ilike("nick", escLike(dto)).is("deleted_at", null).limit(1).maybeSingle();
    if(!dpu.data) return J({ok:0});
    var dt = dpu.data.nick;
    var all = await s.from("depoimentos").select("*").ilike("target", escLike(dt)).order("created_at", {ascending:false}).limit(60);
    var acc = [], pend = [];
    (all.data||[]).reverse().forEach(function(d){
      var m = {id:d.id, f:d.from_nick, t:d.body, u:d.media_url||"", at:ms(d.created_at)};
      if(d.approved) acc.push(m); else pend.push(m);
    });
    var mine = await needMe();
    var showPend = (mine && mine.lower === low(dt)) ? pend.slice(-30) : [];
    return J({ok:1, acc:acc.slice(-30), pend:showPend});
  }
  case "depoPush": {
    var dpm = await needMe();
    if(!dpm) return J({ok:0, err:"auth"});
    if(dpm.del) return J({ok:0, err:"inativa"});
    var dpt = cleanNick(String(o.to||"").replace(/^@/,""));
    if(!okNick(dpt)) return J({ok:0, err:"nick"});
    var dptu = await s.from("profiles").select("nick").ilike("nick", escLike(dpt)).is("deleted_at", null).limit(1).maybeSingle();
    if(!dptu.data) return J({ok:0, err:"noid"});
    dpt = dptu.data.nick;
    if(dpt.toLowerCase() === dpm.lower) return J({ok:0, err:"eu"});
    var dpx = String(o.text||"").slice(0,300), dpu2 = String(o.url||"").slice(0,500);
    if(!dpx && !dpu2) return J({ok:0, err:"vazio"});
    if(dpu2 && okUrl(dpu2) === null) return J({ok:0, err:"url"});
    var cnt = await s.from("depoimentos").select("id,created_at", {count:"exact"}).ilike("target", escLike(dpt)).order("created_at", {ascending:true}).limit(1);
    if((cnt.count||0) >= 30){
      var oldest = await s.from("depoimentos").select("id").ilike("target", escLike(dpt)).order("created_at", {ascending:true}).limit(1).maybeSingle();
      if(oldest.data) await s.from("depoimentos").delete().eq("id", oldest.data.id);
    }
    var dins = await s.from("depoimentos").insert({id:sbId("d"), target:dpt.toLowerCase(),
      from_nick:dpm.nick, body:dpx, media_url:dpu2});
    if(dins.error) return J({ok:0, err:"spam"});
    return J({ok:1});
  }
  case "depoOk": {
    var dok = await needMe();
    if(!dok) return J({ok:0, err:"auth"});
    if(dok.del) return J({ok:0, err:"inativa"});
    var dkt = cleanNick(String(o.to||dok.nick).replace(/^@/,"")).toLowerCase();
    if(dkt !== dok.lower) return J({ok:0, err:"dono"});
    var drow = await s.from("depoimentos").select("id").eq("id", String(o.id||"")).ilike("target", escLike(dok.nick)).limit(1).maybeSingle();
    if(!drow.data) return J({ok:0, err:"noid"});
    if(o.v) await s.from("depoimentos").update({approved:true}).eq("id", String(o.id||""));
    else await s.from("depoimentos").delete().eq("id", String(o.id||""));
    return J({ok:1});
  }
  case "depoDel": {
    var ddl = await needMe();
    if(!ddl) return J({ok:0, err:"auth"});
    if(ddl.del) return J({ok:0, err:"inativa"});
    var ddr = await s.from("depoimentos").select("id,target,from_nick").eq("id", String(o.id||"")).limit(1).maybeSingle();
    if(!ddr.data) return J({ok:0, err:"noid"});
    if(low(ddr.data.target) !== ddl.lower && low(ddr.data.from_nick) !== ddl.lower) return J({ok:0, err:"dono"});
    await s.from("depoimentos").delete().eq("id", String(o.id||""));
    return J({ok:1});
  }

  /* ---------- nodal ---------- */
  case "nodalOpen": {
    var ntag = cleanNodalTag(o.tag||"");
    if(!okNodalTag(ntag)) return J({ok:0, err:"tag"});
    var nme = await needMe();
    var nwho = nme ? "@"+nme.nick : String(o.anon||"").slice(0,20);
    if(nme){ if(nme.del) return J({ok:0, err:"inativa"}); }
    else if(!okAnon(nwho)) return J({ok:0, err:"auth"});
    /* Round 4: anon com token (paridade servidor). */
    var _nTok = null;
    if(!nme){
      var _ckN = await sbAnonClaim3(s, nwho, o.anonTok);
      if(_ckN.st!==-1 && _ckN.st!==0 && _ckN.st!==1) return J({ok:0, err:"anon-taken"});
      if(_ckN.st===-1) return J({ok:0, err:"anon-taken"});
      if(_ckN.st===0 && _ckN.tok) _nTok = _ckN.tok;
    }
    var exn = await s.from("nodal_rooms").select("*").eq("tag", ntag).limit(1).maybeSingle();
    if(exn.data && ms(exn.data.expires_at) > Date.now()){
      var ems = await s.from("nodal_msgs").select("*").eq("tag", ntag).order("created_at", {ascending:true}).limit(100);
      var _ex0 = {ok:1, created:0, nodal:nodalMeta(exn.data, (ems.data||[]).length), msgs:(ems.data||[]).map(nodalMsg)};
      if(_nTok) _ex0.anonTok = _nTok;
      return J(_ex0);
    }
    if(exn.data) await s.from("nodal_rooms").delete().eq("tag", ntag);
    var mine5 = await s.from("nodal_rooms").select("tag", {count:"exact", head:true}).eq("owner_nick", nwho).gt("expires_at", new Date().toISOString());
    if((mine5.count||0) >= 5) return J({ok:0, err:"cheio"});
    var ttl = parseInt(o.ttlMin, 10) || 1440;
    if(!(ttl >= 10)) ttl = 10;
    if(ttl > 10080) ttl = 10080;
    var nexp = new Date(Date.now()+ttl*60000).toISOString();
    var nins = await s.from("nodal_rooms").insert({tag:ntag, owner_nick:nwho, expires_at:nexp});
    if(nins.error) return J({ok:0, err:"auth"});
    var nn = await s.from("nodal_rooms").select("*").eq("tag", ntag).limit(1).maybeSingle();
    var _ex1 = {ok:1, created:1, nodal:nodalMeta(nn.data||{tag:ntag, owner_nick:nwho, created_at:new Date().toISOString(), expires_at:nexp}, 0), msgs:[]};
    if(_nTok) _ex1.anonTok = _nTok;
    return J(_ex1);
  }
  case "nodalGet": {
    var gtag = cleanNodalTag(o.tag||"");
    if(!okNodalTag(gtag)) return J({ok:0, err:"tag"});
    var gr = await s.from("nodal_rooms").select("*").eq("tag", gtag).limit(1).maybeSingle();
    if(!gr.data || ms(gr.data.expires_at) <= Date.now()){
      if(gr.data) await s.from("nodal_rooms").delete().eq("tag", gtag);
      return J({ok:0, err:"expired"});
    }
    var gms = await s.from("nodal_msgs").select("*").eq("tag", gtag).order("created_at", {ascending:true}).limit(100);
    return J({ok:1, nodal:nodalMeta(gr.data, (gms.data||[]).length), msgs:(gms.data||[]).map(nodalMsg)});
  }
  case "nodalPush": {
    var ptag = cleanNodalTag(o.tag||"");
    if(!okNodalTag(ptag)) return J({ok:0, err:"tag"});
    var pme = await needMe();
    var pwho = pme ? "@"+pme.nick : String(o.anon||"").slice(0,20);
    if(pme){ if(pme.del) return J({ok:0, err:"inativa"}); }
    else if(!okAnon(pwho)) return J({ok:0, err:"auth"});
    var _pTok = null;
    if(!pme){
      var _ckP = await sbAnonClaim3(s, pwho, o.anonTok);
      if(_ckP.st!==-1 && _ckP.st!==0 && _ckP.st!==1) return J({ok:0, err:"anon-taken"});
      if(_ckP.st===-1) return J({ok:0, err:"anon-taken"});
      if(_ckP.st===0 && _ckP.tok) _pTok = _ckP.tok;
    }
    var pr = await s.from("nodal_rooms").select("tag,expires_at").eq("tag", ptag).limit(1).maybeSingle();
    if(!pr.data || ms(pr.data.expires_at) <= Date.now()) return J({ok:0, err:"expired"});
    var ptx = String(o.text||"").slice(0,500), pur = String(o.url||"").slice(0,500);
    if(!ptx && !pur) return J({ok:0, err:"vazio"});
    if(pur && okUrl(pur) === null) return J({ok:0, err:"url"});
    var pins2 = await s.from("nodal_msgs").insert({id:sbId("g"), tag:ptag, author:pwho,
      body:ptx, media_url:pur, media_type:String(o.mtype||"").slice(0,60)});
    if(pins2.error) return J({ok:0, err:"spam"});
    try{
      var pcnt = await s.from("nodal_msgs").select("id", {count:"exact"}).eq("tag", ptag);
      if((pcnt.count||0) > 60){
        var pold = await s.from("nodal_msgs").select("id").eq("tag", ptag).order("created_at", {ascending:true}).limit((pcnt.count||0)-60);
        for(var pi2=0; pi2<((pold.data)||[]).length; pi2++) await s.from("nodal_msgs").delete().eq("id", pold.data[pi2].id);
      }
    }catch(e){}
    if(_pTok) return J({ok:1, anonTok:_pTok});
    return J({ok:1});
  }
  case "nodalMsgDel": case "nodalMsgEdit": {
    var xme = await needMe();
    var xwho = xme ? "@"+xme.nick : String(o.anon||"").slice(0,20);
    if(xme){ if(xme.del) return J({ok:0, err:"inativa"}); }
    else if(!okAnon(xwho)) return J({ok:0, err:"auth"});
    if(!xme){
      var _ckX = await sbAnonClaim3(s, xwho, o.anonTok);
      if(_ckX.st!==-1 && _ckX.st!==0 && _ckX.st!==1) return J({ok:0, err:"anon-taken"});
      if(_ckX.st===-1) return J({ok:0, err:"anon-taken"});
    }
    var xtag = cleanNodalTag(o.tag||"");
    if(!okNodalTag(xtag)) return J({ok:0, err:"tag"});
    var xr = await s.from("nodal_msgs").select("id,tag,author").eq("id", String(o.id||"").slice(0,40)).limit(1).maybeSingle();
    if(!xr.data || xr.data.tag !== xtag) return J({ok:0, err:"noid"});
    var xrm = await s.from("nodal_rooms").select("owner_nick").eq("tag", xtag).limit(1).maybeSingle();
    var xown = xrm.data ? String(xrm.data.owner_nick||"") : "";
    if(name === "nodalMsgDel"){
      if(xr.data.author !== xwho && xown !== xwho) return J({ok:0, err:"dono"});
      await s.from("nodal_msgs").delete().eq("id", String(o.id||"").slice(0,40));
    } else {
      if(xr.data.author !== xwho) return J({ok:0, err:"dono"});
      var xet = String(o.text||"").slice(0,500), xeu = String(o.url||"").slice(0,500);
      if(!xet && !xeu) return J({ok:0, err:"vazio"});
      if(xeu && okUrl(xeu) === null) return J({ok:0, err:"url"});
      await s.from("nodal_msgs").update({body:xet, media_url:xeu, edited:true}).eq("id", String(o.id||"").slice(0,40));
    }
    return J({ok:1});
  }
  case "subNodal": return "ok";

  /* ---------- dj ---------- */
  case "djShare": {
    var djm = await needMe();
    if(!djm) return J({ok:0, err:"auth"});
    if(djm.del) return J({ok:0, err:"inativa"});
    var vid = String(o.vid||"").slice(0,20);
    if(!/^[A-Za-z0-9_-]{6,20}$/.test(vid)) return J({ok:0, err:"bad"});
    await s.from("dj_presence").upsert({nick:djm.nick, vid:vid,
      by_nick:String(o.by||"").slice(0,60), title:String(o.title||"").slice(0,80),
      pos:Math.max(0, Math.min(7200, parseInt(o.pos)||0)), playing:o.playing?1:0,
      at:new Date().toISOString()}, {onConflict:"nick"});
    return J({ok:1});
  }
  case "djStop": {
    var dsm = await needMe();
    if(dsm) await s.from("dj_presence").delete().eq("nick", dsm.nick);
    return J({ok:1});
  }
  case "djList": {
    var dl = await s.from("dj_presence").select("*").gt("at", new Date(Date.now()-180000).toISOString()).order("at", {ascending:false}).limit(20);
    return J((dl.data||[]).filter(function(v){ return v && v.vid; }).map(function(v){
      return {nick:v.nick, vid:v.vid, by:v.by_nick||"", title:v.title||"", pos:v.pos||0, playing:v.playing||0, at:ms(v.at)};
    }));
  }
  case "subDj": return "ok";

  /* ---------- gifmoji ---------- */
  case "gifmojiList": {
    var gl = await s.from("gifmoji").select("*").order("created_at", {ascending:true}).limit(200);
    return J({ok:1, items:(gl.data||[]).filter(function(g){ return g && g.name && String(g.url||"").indexOf("https://")===0; }).map(function(g){
      return {name:g.name, url:g.url, w:g.w||64, h:g.h||64, ero:!!g.ero, furry:!!g.furry, by:g.by_nick||"", at:ms(g.at||g.created_at)};
    })});
  }
  case "gifmojiAdd": {
    var gme = await needMe();
    if(!gme) return J({ok:0, err:"auth"});
    if(gme.del) return J({ok:0, err:"inativa"});
    var gnm = String(o.name||"").toLowerCase();
    if(!/^[a-z0-9]{2,14}$/.test(gnm)) return J({ok:0, err:"nome"});
    var gurl = String(o.url||"").slice(0,2000);
    if(okUrl(gurl) === null || !gurl) return J({ok:0, err:"url"});
    var gex = await s.from("gifmoji").select("*").eq("name", gnm).limit(1).maybeSingle();
    var gitem = {id:gnm, name:gnm, url:gurl,
      w:Math.min(256, Math.max(1, parseInt(o.w)||64)), h:Math.min(256, Math.max(1, parseInt(o.h)||64)),
      ero:o.ero?true:false, furry:o.furry?true:false, by_nick:gme.nick, at:new Date().toISOString()};
    /* re-seal r2: id SEMPRE (PK sem default — sem isso o insert falhava com
       23502 e o ok:1 abaixo era falso, nada era gravado). name é único. */
    if(gex.data){
      if(low(gex.data.by_nick||"") !== gme.lower) return J({ok:0, err:"existe"});
      var gup = await s.from("gifmoji").update(gitem).eq("name", gnm);
      if(gup.error) return J({ok:0, err:"nuvem"});
    } else {
      var gmine = await s.from("gifmoji").select("name", {count:"exact", head:true}).ilike("by_nick", escLike(gme.nick));
      if((gmine.count||0) >= 20) return J({ok:0, err:"cheio"});
      var gin = await s.from("gifmoji").insert(gitem);
      if(gin.error) return J({ok:0, err:"nuvem"});
    }
    return J({ok:1, name:gnm});
  }

  /* ---------- sugestões + comunicado ---------- */
  case "sugPush": {
    var spm = await needMe();
    var skey = spm ? "@"+spm.nick : String(o.anon||"").slice(0,20);
    if(spm){ if(spm.del) return J({ok:0, err:"inativa"}); }
    else if(!okAnon(skey)) return J({ok:0, err:"auth"});
    /* Round 4: anon com token (paridade servidor) — antes qualquer anon
       forjado postava como outro. */
    var _sugTok3 = null;
    if(!spm){
      var _ckS3 = await sbAnonClaim3(s, skey, o.anonTok);
      if(_ckS3.st!==-1 && _ckS3.st!==0 && _ckS3.st!==1) return J({ok:0, err:"anon-taken"});
      if(_ckS3.st===-1) return J({ok:0, err:"anon-taken"});
      if(_ckS3.st===0 && _ckS3.tok) _sugTok3 = _ckS3.tok;
    }
    var stx = String(o.text||"").slice(0,500);
    if(!stx) return J({ok:0, err:"vazio"});
    var sins = await s.from("suggestions").insert({id:sbId("s"),
      kind:o.kind==="bug"?"bug":"ideia", body:stx, nick:skey});
    if(sins.error) return J({ok:0, err:"spam"});
    if(_sugTok3) return J({ok:1, anonTok:_sugTok3});
    return J({ok:1});
  }
  case "sugWho": {
    var ow = await s.from("site_config").select("value").eq("key","owner_nick").limit(1).maybeSingle();
    var on2 = ow && ow.data && ow.data.value && ow.data.value.nick;
    return J({ok:1, configured:!!on2});
  }
  case "sugClaim": {
    var scm = await needMe();
    if(!scm) return J({ok:0, err:"auth"});
    var cr = await s.rpc("claim_owner");
    if(cr.error || !cr.data || cr.data.ok !== 1){
      var taken = cr && cr.data && cr.data.err === "taken";
      return J(taken ? {ok:0, err:"taken"} : {ok:0, err:"auth"});
    }
    dropOwnerCache();
    return J({ok:1});
  }
  case "sugGet": {
    var sgm = await needMe();
    if(!sgm || !(await isOwner(s, sgm.lower))) return J({ok:0});
    var sg = await s.from("suggestions").select("*").order("created_at", {ascending:true}).limit(200);
    return J((sg.data||[]).slice(-200).map(function(x){
      return {id:x.id, k:x.kind||"ideia", t:x.body||"", n:x.nick||"", at:ms(x.created_at)};
    }));
  }
  case "sugCount": {
    var scm2 = await needMe();
    if(!scm2 || !(await isOwner(s, scm2.lower))) return J({ok:0});
    var scc = await s.from("suggestions").select("id", {count:"exact", head:true});
    return J({n:scc.count||0});
  }
  case "sugDel": {
    var sdm = await needMe();
    if(!sdm || !(await isOwner(s, sdm.lower))) return J({ok:0});
    if(o.clear){ await s.from("suggestions").delete().neq("id", ""); return J({ok:1}); }
    var sid = String(o.id||"");
    var sdel = await s.from("suggestions").delete().eq("id", sid).select("id");
    if(!(sdel.data && sdel.data.length)) return J({ok:0});
    return J({ok:1});
  }
  case "annPush": {
    var anm = await needMe();
    if(!anm || !(await isOwner(s, anm.lower))) return J({ok:0, err:"auth"});
    var atx = String(o.text||"").slice(0,500);
    if(!atx) return J({ok:0, err:"vazio"});
    await s.from("feed_posts").insert({id:sbId("p"), author:"📢support-zunzum", body:atx});
    return J({ok:1});
  }

  /* ---------- perfil: conta visual ---------- */
  case "themeSet": {
    var thm = await needMe();
    if(!thm) return J({ok:0, err:"auth"});
    if(thm.del) return J({ok:0, err:"inativa"});
    if(o.th === null || o.th === undefined){
      await s.from("profiles").update({th:null}).eq("user_id", thm.uid);
      return J({ok:1});
    }
    /* backstop anti-defacement (espelho do cleanRoomTheme do servidor):
       o cliente sanitiza, mas a linha guardada não pode ter CSS ativo —
       cliente alternativo leria direto do banco. */
    var thCss = String((o.th && (o.th.css||"")) || "").slice(0,2000);
    /* Round 4 paridade servidor: strip </style + <script antes da sonda. */
    thCss = thCss.replace(/<\/style/gi, "").replace(/<script/gi, "");
    var thProbe = thCss.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\\([0-9a-fA-F]{1,6})\s?/g, function(m,h){ try{ var v=parseInt(h,16); if(!v||v>0x10FFFF) return ""; return String.fromCharCode(v); }catch(e){ return ""; } }).replace(/\\/g,"");
    if(/<\s*script/i.test(thProbe) || /<\/style/i.test(thProbe)) return J({ok:0, err:"tema"});
    if(/url\s*\(/i.test(thProbe) || /position\s*:\s*(fixed|sticky|absolute)/i.test(thProbe) ||
       /z-index\s*:/i.test(thProbe) || /content\s*:/i.test(thProbe) || /@import/i.test(thProbe) ||
       /expression\s*\(/i.test(thProbe) || /behaviou?r\s*:/i.test(thProbe) ||
       /-moz-binding/i.test(thProbe) || /javascript\s*:/i.test(thProbe))
      return J({ok:0, err:"tema"});
    var lst = String(o.th.st||o.th.style||"padrao").toLowerCase();
    if(lst === "retrô") lst = "retro";
    await s.from("profiles").update({th:{p:String(o.th.p||"").slice(0,20), bg:String(o.th.bg||""),
      cd:String(o.th.cd||o.th.card||""), tx:String(o.th.tx||""), ac:String(o.th.ac||o.th.acc||""),
      st:lst.slice(0,20), css:thCss.slice(0,2000)}}).eq("user_id", thm.uid);
    return J({ok:1});
  }
  case "htmlSet": {
    var htm = await needMe();
    if(!htm) return J({ok:0, err:"auth"});
    if(htm.del) return J({ok:0, err:"inativa"});
    var pg = String(o.pg == null ? "" : o.pg);
    if(pg.length > 8000) return J({ok:0, err:"grande"});
    /* defesa em profundidade (espelho do servidor): o cliente sanitiza
       (zunSanitizePg) e isola em iframe sandbox, mas o banco não guarda XSS
       armazenado puro. Regra p/ quem renderiza pg: NUNCA faça
       innerHTML = pg sem passar por zunSanitizePg + iframe sandbox. */
    var pgProbe = pg.replace(/\/\*[\s\S]*?\*\//g,"").replace(/<!--[\s\S]*?-->/g,"").replace(/\\([0-9a-fA-F]{1,6})\s?/g, function(m,h){ try{ var v=parseInt(h,16); if(!v||v>0x10FFFF) return ""; return String.fromCharCode(v); }catch(e){ return ""; } }).replace(/\\/g,"").replace(/&#x?([0-9a-fA-F]+);?/g, function(m,h){ try{ var v=/x/i.test(m)?parseInt(h,16):parseInt(h,10); if(!v||v>0x10FFFF) return ""; return String.fromCharCode(v); }catch(e){ return ""; } }).replace(/\\/g,"");
    if(/<\s*script/i.test(pgProbe) || /<\s*(iframe|object|embed|form|input|button|meta|link|base|title|svg|math|style|frame|frameset)\b/i.test(pgProbe)) return J({ok:0, err:"html"});
    if(/on\w+\s*=/i.test(pgProbe) || /javascript\s*:/i.test(pgProbe) ||
       /data\s*:/i.test(pgProbe) || /vbscript\s*:/i.test(pgProbe) ||
       /srcdoc\s*=/i.test(pgProbe) || /@import/i.test(pgProbe) ||
       /expression\s*\(/i.test(pgProbe) || /-moz-binding/i.test(pgProbe)) return J({ok:0, err:"html"});
    await s.from("profiles").update({pg:pg}).eq("user_id", htm.uid);
    return J({ok:1});
  }
  case "nickStyleSet": {
    var nsm = await needMe();
    if(!nsm) return J({ok:0, err:"auth"});
    if(nsm.del) return J({ok:0, err:"inativa"});
    if(o.ns === null || o.ns === undefined){
      await s.from("profiles").update({ns:null}).eq("user_id", nsm.uid);
      return J({ok:1});
    }
    var cns = cleanNickStyle(o.ns);
    if(o.ns && !cns) return J({ok:0, err:"bad"});
    await s.from("profiles").update({ns:cns}).eq("user_id", nsm.uid);
    return J({ok:1, ns:cns||null});
  }
  case "profView": {
    var pvn = cleanNick(String(typeof o === "string" ? o : (o.nick||data||"")).replace(/^@/,""));
    if(!okNick(pvn)) return J({ok:0});
    var bv = await s.rpc("bump_views", {p_nick:pvn});
    if(bv.error || !bv.data || bv.data.ok !== 1) return J({ok:0});
    return J(bv.data);
  }
  case "nickBulk": {
    /* anti-colheita: 1.5s por chamada, igual a userSearch/profileGet */
    var nowNb = Date.now();
    if(nowNb - (_lastNb || 0) < 1500) return J({ok:0, err:"rate"});
    _lastNb = nowNb;
    var narr = null;
    try{ var oo2 = (o && typeof o === "object" && !Array.isArray(o)) ? o : JSON.parse(String(data)); narr = Array.isArray(oo2) ? oo2 : (oo2.nicks||oo2.users||null); }catch(e){ narr = null; }
    if(!narr) narr = String(data||"").split(",");
    if(!Array.isArray(narr)) return J({ok:0, err:"bad"});
    var ln = narr.slice(0,30).map(function(n){ return String(n||"").replace(/^@/,"").trim().toLowerCase(); }).filter(function(n){ return /^[a-z0-9-_]{2,20}$/.test(n); });
    if(!ln.length) return J({ok:1, styles:{}});
    var nb = await s.from("profiles").select("nick,ns").in("nick", ln);
    var nout = {};
    ln.forEach(function(n){ nout[n] = null; });
    (nb.data||[]).forEach(function(p){ nout[low(p.nick)] = p.ns||null; });
    return J({ok:1, styles:nout});
  }

  /* ---------- pkey / bio / hist ---------- */
  case "pkeyPut": {
    var pkm = await needMe();
    if(!pkm) return J({ok:0, err:"auth"});
    if(pkm.del) return J({ok:0, err:"inativa"});
    var blob = String(o.blob||"").slice(0,700);
    /* hex legado (editKey em claro, compat) ou ENC1: (editKey cifrado no
       cliente — o servidor só guarda opaco). Limites folgados p/ base64. */
    if(!/^(?:[0-9a-f]{1,300}|ENC1:[A-Za-z0-9+/=]{8,64}:[A-Za-z0-9+/=]{16,640})$/.test(blob)) return J({ok:0, err:"bad"});
    await s.from("user_keys").upsert({nick:pkm.nick, blob:blob}, {onConflict:"nick"});
    return J({ok:1});
  }
  /* ===== bichinho virtual (zunpet): 1 registro por CONTA (user_id, estável
     mesmo se o nick for reaproveitado), SÓ o dono lê/escreve.
     Sem migração aplicada a tabela não existe: select/upsert falham e o
     cliente segue só-local (fail-closed). Espelha os RPCs petGet/petSet do
     server-plugin (mesmos nomes/forma) p/ o cliente não distinguir backend. */
  case "petGet": {
    var pgm = await needMe();
    if(!pgm || !pgm.uid) return J(null);
    var pgr = await s.from("pet_state").select("*").eq("user_id", pgm.uid).limit(1).maybeSingle();
    if(!pgr.data) return J(null);
    var pr = pgr.data;
    return J({m:(pr.m===1||pr.m===2)?pr.m:0, e:+pr.e||0, h:pr.h|0, d:pr.d|0, b:pr.b|0,
      o:Math.max(0,Math.min(8,pr.o|0)), x:pr.x|0, y:pr.y|0, lt:+pr.lt||0, lf:+pr.lf||0, q:!!pr.q, ds:!!pr.ds,
      w:(pr.w==null?50:Math.max(0,Math.min(100,pr.w|0)))});
  }
  case "petSet": {
    var psm = await needMe();
    if(!psm || !psm.uid) return J({ok:0, err:"auth"});
    if(psm.del) return J({ok:0, err:"inativa"});
    var nowPs = Date.now();
    if(nowPs - (_lastPet[psm.lower]||0) < 5000) return J({ok:0, err:"devagar"});
    _lastPet[psm.lower] = nowPs;
    if(Object.keys(_lastPet).length > 500) _lastPet = {};
    var pp = (o.pet&&typeof o.pet==="object") ? o.pet : {};
    var cN = function(v,a,b){ v = Number(v); if(!isFinite(v)) v = a; return Math.max(a, Math.min(b, v)); };
    var mm = (pp.m===1||pp.m===2) ? pp.m : 0;
    if(!mm) return J({ok:0, err:"vazio"});
    var tnPs = Date.now();
    var upr = await s.from("pet_state").upsert({user_id:psm.uid, nick:psm.nick, m:mm,
      e:Math.round(cN(pp.e,0,tnPs+60000)), h:Math.round(cN(pp.h,0,100)), d:Math.round(cN(pp.d,0,100)),
      b:Math.round(cN(pp.b,0,100)), o:Math.max(0,Math.min(8,parseInt(pp.o,10)||0)),
      x:Math.round(cN(pp.x,0,4000)), y:Math.round(cN(pp.y,0,4000)),
      lt:Math.round(cN(pp.lt,0,tnPs+60000)), lf:Math.round(cN(pp.lf,0,tnPs+60000)),
      w:Math.round(cN(pp.w,50,0,100)),
      q:!!pp.q, ds:!!pp.ds, updated_at:new Date().toISOString()}, {onConflict:"user_id"});
    if(upr.error) return J({ok:0, err:"nuvem"});
    return J({ok:1});
  }
  case "pkeyGet": {
    var pkg = await needMe();
    if(!pkg) return J({ok:0});
    var pgr = await s.from("user_keys").select("blob").eq("nick", pkg.nick).limit(1).maybeSingle();
    if(!pgr.data || !pgr.data.blob) return J({ok:0});
    return J({ok:1, blob:pgr.data.blob});
  }
  case "bioGet": {
    var bk = String(typeof o === "string" ? o : (o.k||o.key||data||"")).toLowerCase().trim().slice(0,80);
    if(!bk) return J(null);
    var bgr = await s.from("bio_wiki").select("*").eq("key", bk).limit(1).maybeSingle();
    if(!bgr.data) return J(null);
    return J({a:bgr.data.answer||"", l:bgr.data.links||[], at:ms(bgr.data.updated_at), v:bgr.data.v||0});
  }
  case "bioSet": {
    var bsm = await needMe();
    if(!bsm) return J({ok:0, err:"auth"});
    if(bsm.del) return J({ok:0, err:"inativa"});
    var bsk = String(o.k||"").toLowerCase().trim().slice(0,80);
    var bsa = String(o.a||"").slice(0,1500);
    if(bsk.length < 2 || !bsa) return J({ok:0, err:"vazio"});
    var bl = Array.isArray(o.l) ? o.l.slice(0,8).map(function(x){
      var u2 = String((x&&x.u)||"").slice(0,500);
      if(u2 && okUrl(u2) === null) u2 = "";
      return {t:String((x&&x.t)||"").slice(0,120), u:u2, d:String((x&&x.d)||"").slice(0,200)};
    }) : [];
    await s.from("bio_wiki").upsert({key:bsk, answer:bsa, links:bl, v:parseInt(o.v)||0}, {onConflict:"key"});
    return J({ok:1});
  }
  case "histPush": {
    /* histórico é DADO PRIVADO (buscas do usuário): antes aceitava anon
       arbitrário como nick — qualquer um gravava/lia histórico com o nick
       alheio (inclusive "@vitima"). Paridade com o servidor: só conta
       logada grava/lê o PRÓPRIO (RLS do banco já barrava insert anon, mas o
       app não deve nem tentar). */
    var hpm = await needMe();
    if(!hpm || hpm.del) return J({ok:0});
    if(!o.q) return J({ok:0});
    await s.from("search_hist").insert({nick:"@"+hpm.nick, q:String(o.q).slice(0,120)});
    try{
      var hold = await s.from("search_hist").select("q,created_at").eq("nick", "@"+hpm.nick).order("created_at", {ascending:false}).limit(25);
      var extra = (hold.data||[]).slice(20);
      for(var hi=0; hi<extra.length; hi++) await s.from("search_hist").delete().eq("nick", "@"+hpm.nick).eq("q", extra[hi].q);
    }catch(e){}
    return J({ok:1});
  }
  case "histGet": {
    var hgm = await needMe();
    if(!hgm || hgm.del) return J([]);
    var hgl = await s.from("search_hist").select("q,created_at").eq("nick", "@"+hgm.nick).order("created_at", {ascending:false}).limit(20);
    return J((hgl.data||[]).reverse().map(function(r){ return {q:r.q, at:ms(r.created_at)}; }));
  }

  /* ---------- zunzunzinha (bot): qualquer conta logada opera ---------- */
  case "zzDay": {
    var zd = await s.rpc("zz_day");
    if(zd.error || !zd.data) return J({ok:0});
    return J(zd.data);
  }
  case "zzClaim": {
    var zck = String(o.kind||"");
    if(zck !== "depo" && zck !== "dm" && zck !== "mural") return J({ok:0, err:"bad"});
    if(!(await needMe())) return J({ok:0, err:"auth"});
    var zc = await s.rpc("zz_claim", {p_kind:zck});
    if(zc.error || !zc.data) return J({ok:0});
    return J(zc.data);
  }
  case "zzDmPend": {
    if(!(await needMe())) return J({ok:0, err:"claim"});
    var zdp = await s.rpc("zz_dm_pend", {p_token:String(o.token||"")});
    if(zdp.error || !zdp.data) return J({ok:0, err:"claim"});
    return J(zdp.data);
  }
  case "zzDmSend": {
    if(!(await needMe())) return J({ok:0, err:"claim"});
    var zds = await s.rpc("zz_dm_send", {p_token:String(o.token||""), p_key:String(o.key||""), p_text:String(o.text||"").slice(0,1000)});
    if(zds.error || !zds.data) return J({ok:0, err:"claim"});
    return J(zds.data);
  }
  case "zzDmType": {
    if(!(await needMe())) return J({ok:0, err:"claim"});
    var zdt = await s.rpc("zz_dm_type", {p_token:String(o.token||""), p_key:String(o.key||"")});
    if(zdt.error || !zdt.data) return J({ok:0, err:"claim"});
    try{
      var zparts = String(o.key||"").toLowerCase().split("|");
      if(zparts.length === 2){
        ensureSubs();
        await busSend("dmt", {key:zparts.slice().sort().join("|"), from:"zunzunzinha"});
      }
    }catch(e){}
    return J(zdt.data);
  }
  case "zzMuralDone": {
    if(!(await needMe())) return J({ok:0, err:"claim"});
    var zmd = await s.rpc("zz_mural_done", {p_token:String(o.token||"")});
    if(zmd.error || !zmd.data) return J({ok:0, err:"claim"});
    return J(zmd.data);
  }
  case "zzRelease": {
    var zr = await s.rpc("zz_release", {p_token:String((o&&o.token)||"")});
    if(zr.error || !zr.data) return J({ok:0});
    return J(zr.data);
  }
  case "zzDepoPend": {
    if(!(await needMe())) return J({ok:0, err:"claim"});
    var zdp2 = await s.rpc("zz_depo_pend", {p_token:String(o.token||"")});
    if(zdp2.error || !zdp2.data) return J({ok:0, err:"claim"});
    return J(zdp2.data);
  }
  case "zzDepoNo": {
    if(!(await needMe())) return J({ok:0, err:"claim"});
    var zdn = await s.rpc("zz_depo_no", {p_token:String(o.token||""), p_id:String(o.id||""), p_dm:String(o.dm||"").slice(0,500)});
    if(zdn.error || !zdn.data) return J({ok:0, err:"claim"});
    return J(zdn.data);
  }
  case "zzDepo": {
    if(!(await needMe())) return J({ok:0, err:"claim"});
    var zdd = await s.rpc("zz_depo", {p_token:String(o.token||""), p_id:String(o.id||""), p_text:String(o.text||"").slice(0,300)});
    if(zdd.error || !zdd.data) return J({ok:0, err:"claim"});
    return J(zdd.data);
  }

  /* ---------- mascote IA (só dono) ---------- */
  case "aiClaim": {
    var aim = await needMe();
    if(!aim || !(await isOwner(s, aim.lower))) return J({ok:0});
    var ac = await s.rpc("ai_claim");
    if(ac.error || !ac.data) return J({ok:0});
    return J(ac.data);
  }
  case "aiFeed": {
    var afm = await needMe();
    if(!afm || !(await isOwner(s, afm.lower))) return J({ok:0, err:"auth"});
    var af = await s.rpc("ai_feed", {p_token:String(o.token||""), p_text:String(o.text||"").slice(0,300)});
    if(af.error || !af.data) return J({ok:0, err:"claim"});
    return J(af.data);
  }

  /* ---------- espelho nostr (só dono) ---------- */
  case "mirClaim": {
    var mcm = await needMe();
    if(!mcm || !(await isOwner(s, mcm.lower))) return J({ok:0, err:"auth"});
    var ids = Array.isArray(o) ? o : (o && Array.isArray(o.ids) ? o.ids : null);
    if(!ids) return J({ok:0, err:"bad"});
    var mc = await s.rpc("mir_claim", {p_ids:ids.slice(0,10).map(function(x){ return String(x||"").slice(0,80); })});
    if(mc.error || !mc.data) return J({ok:0, err:"bad"});
    return J(mc.data);
  }
  case "mirSpot": {
    var msm = await needMe();
    if(!msm || !(await isOwner(s, msm.lower))) return J({ok:0, err:"auth"});
    var msp = await s.rpc("mir_spot", {p_id:String((o&&(o.id||o.spot))||"").slice(0,80)});
    if(msp.error || !msp.data) return J({ok:0, err:"bad"});
    return J(msp.data);
  }
  case "mirAi": {
    var mam = await needMe();
    if(!mam || !(await isOwner(s, mam.lower))) return J({ok:0, err:"auth"});
    var ma = await s.rpc("mir_ai", {p_kind:String((o&&(o.k||o.kind))||"")});
    if(ma.error || !ma.data) return J({ok:0, err:"bad"});
    return J(ma.data);
  }
  case "mirReset": {
    var mrm = await needMe();
    if(!mrm || !(await isOwner(s, mrm.lower))) return J({ok:0});
    var mr = await s.rpc("mir_reset");
    if(mr.error) return J({ok:0});
    return J({ok:1});
  }
  /* ---------- cutover server-plugin → Supabase (FASE 10, 2026-10-26) ----------
     4 RPCs que ainda caíam em sb-todo no path Supabase (132 no server-plugin,
     128 cobertos). Todos com paridade de auth/dono com o server-plugin. */
  case "recountUsers": {
    var rcm = await needMe();
    if(!rcm || !(await isOwner(s, rcm.lower))) return J({ok:0, err:"dono"});
    try{
      var rq = await s.from("profiles").select("nick").is("deleted_at", null).limit(5000);
      var rows = (rq.data||[]).filter(function(x){
        var n = low(x.nick||"");
        if(!n || n === "zunzunzinha") return false;
        if(/_teste$/.test(n)) return false;
        return true;
      });
      return J({ok:1, total:rows.length});
    }catch(e){ return J({ok:0, err:"dono"}); }
  }
  case "mirGet": {
    /* modelo local (src/mirror.js): a chave NUNCA sai do navegador; o servidor
       antigo guardava db.mir.priv só p/ o dono ler. No Supabase o equivalente é
       mir_meta key='priv'. Sem linha → empty (nunca configurado). */
    var mgm = await needMe();
    if(!mgm || !(await isOwner(s, mgm.lower))) return J({ok:1, empty:1, legacy:1});
    try{
      var mg = await s.from("mir_meta").select("value").eq("key", "priv").limit(1).maybeSingle();
      var pv = mg && mg.data && mg.data.value && (mg.data.value.priv || mg.data.value.hex || mg.data.value.key);
      if(pv && /^[0-9a-fA-F]{64}$/.test(String(pv))) return J({ok:1, priv:String(pv).toLowerCase(), lastSpot:0});
      return J({ok:1, empty:1});
    }catch(e){ return J({ok:1, empty:1}); }
  }
  case "mirSet": {
    var msm2 = await needMe();
    if(!msm2 || !(await isOwner(s, msm2.lower))) return J({ok:0, err:"auth"});
    var mp2 = String((o&&(o.priv||o.key))||"").trim();
    if(!/^[0-9a-fA-F]{64}$/.test(mp2)) return J({ok:0, err:"bad"});
    try{
      var mex = await s.from("mir_meta").select("key").eq("key", "priv").limit(1).maybeSingle();
      if(mex && mex.data) return J({ok:0, err:"taken"});
    }catch(e){}
    try{
      var mins = await s.from("mir_meta").upsert({key:"priv", value:{priv:mp2.toLowerCase()}}, {onConflict:"key"});
      if(mins.error) return J({ok:0, err:"auth"});
    }catch(e){ return J({ok:0, err:"auth"}); }
    return J({ok:1});
  }
  case "gifmojiDel": {
    var gdm = await needMe();
    if(!gdm) return J({ok:0, err:"auth"});
    if(gdm.del) return J({ok:0, err:"inativa"});
    var gdn = String(o.name||"").toLowerCase();
    if(!/^[a-z0-9]{2,14}$/.test(gdn)) return J({ok:0, err:"bad"});
    try{
      var gex2 = await s.from("gifmoji").select("name,by_nick").eq("name", gdn).limit(1).maybeSingle();
      if(!gex2.data) return J({ok:0, err:"noid"});
      var own3 = low(gex2.data.by_nick||"") === gdm.lower;
      var dono3 = await isOwner(s, gdm.lower);
      if(!own3 && !dono3) return J({ok:0, err:"dono"});
      await s.from("gifmoji").delete().eq("name", gdn);
      return J({ok:1});
    }catch(e){ return J({ok:0, err:"bad"}); }
  }

  /* ---------- subs (ponte realtime cobre; shims p/ compat) ---------- */
  case "subDepo": case "unsubDepo":
  case "subInv": case "unsubInv":
  case "subAppr": case "unsubAppr":
  case "subDM": case "unsubDM":
  case "subDMConv": case "unsubDMConv":
    ensureSubs();
    return "ok";

  default:
    return prevRpc(name, data);
  }
}

function nodalMeta(n, nm){
  return {tag:n.tag||"", owner:n.owner_nick||"", at:ms(n.created_at||n.at), exp:ms(n.expires_at||n.exp)||0, ttl:0, n:nm||0};
}
function nodalMsg(m){
  return {id:m.id, f:String(m.author||"").replace(/^@/,""), t:m.body||"", u:m.media_url||"", y:m.media_type||"", at:ms(m.created_at), ed:!!m.edited};
}

window.sbRpc = sbRpc3;

/* ================= ponte realtime → mensagens legado ================= */
var _subsOn = false, _busCh = null;
function ensureSubs(){
  if(_subsOn) return;
  try{ if(!window.sbConfigured || !window.sbConfigured()) return; }catch(e){ return; }
  _subsOn = true;
  (async function(){
    try{
      var s = await sb();
      var bus = s.channel("zun-bus");
      bus.on("broadcast", {event:"dmt"}, function(pl){
        try{
          var p = (pl && pl.payload) || {};
          if(p.key && p.from) emit("dmt:"+p.key+":"+low(p.from));
        }catch(e){}
      });
      try{ await bus.subscribe(); _busCh = bus; }catch(e){}
      function sub(table, fn, noG){
        try{
          var ch = s.channel("zun3-"+table);
          ch.on("postgres_changes", {event:"*", schema:"public", table:table}, function(pl){
            try{
              if(!noG) emit("1");
              if(fn) fn(pl);
            }catch(e){}
          });
          ch.subscribe();
        }catch(e){}
      }
      ["room_msgs","room_topics","priv_msgs","gifmoji","bio_wiki","dj_presence","nodal_rooms","nodal_msgs"].forEach(function(t){
        sub(t, t === "dj_presence" ? function(){ emit("dj"); } : (t === "nodal_rooms" || t === "nodal_msgs" ? onNodal : null), t === "dj_presence" || t === "nodal_rooms" || t === "nodal_msgs");
      });
      /* FASE 10: salas (lista muda sem msg), fila do DJ e sugestões não tinham
         canal — roomDel/roomCreate e djShare novo não pintavam ao vivo. */
      sub("rooms", null, false);
      sub("dj_queue", function(){ emit("dj"); }, true);
      sub("suggestions", null, false);
      sub("dm_msgs", onDm, true);
      sub("friend_reqs", function(){ emit("frq:"); }, true);
      sub("friends", function(){ emit("frq:"); }, true);
      sub("depoimentos", onDepo, true);
      sub("priv_rooms", onPrivRoom, true);
      sub("priv_members", onPrivMember, true);
      sub("priv_reqs", onPrivReq, true);
    }catch(e){ _subsOn = false; }
  })();
}
async function busSend(evt, payload){
  try{
    ensureSubs();
    for(var i=0; i<20 && !_busCh; i++) await new Promise(function(r){ setTimeout(r, 100); });
    if(_busCh) await _busCh.send({type:"broadcast", event:evt, payload:payload});
  }catch(e){}
}
function rowNew(pl){ return (pl && (pl.new || pl.newRow)) || {}; }
function rowOld(pl){ return (pl && (pl.old || pl.oldRow)) || {}; }

function onDm(pl){
  try{
    var et = pl.eventType, nw = rowNew(pl), od = rowOld(pl);
    if(et === "INSERT"){
      var key = String(nw.conv||""), au = low(String(nw.author||"").replace(/^@/,"")), id = String(nw.id||"");
      if(key.indexOf("|") > 0 && au) emit("dmm:"+key+":"+au+":"+id);
    } else if(et === "DELETE"){
      var k2 = String((od&&od.conv) || (nw&&nw.conv) || "");
      if(k2.indexOf("|") > 0) emit("dmd:"+k2);
    } else {
      var k3 = String(nw.conv||"");
      if(k3.indexOf("|") < 0) return;
      if(nw.seen && !(od && od.seen)){
        var parts = k3.split("|");
        var reader = low(String(nw.author||"")) === parts[0] ? parts[1] : parts[0];
        emit("dms:"+k3+":"+reader+":"+Date.now());
      } else {
        emit("dmd:"+k3);
      }
    }
  }catch(e){}
}
function onDepo(pl){
  try{
    var r = rowNew(pl); if(!r.target) r = rowOld(pl);
    if(!r.target) return;
    if(low(r.target) === meLowerNow() && r.from_nick) emit("depo:"+r.from_nick);
  }catch(e){}
}
function onNodal(pl){
  try{
    var r = rowNew(pl); if(!r.tag) r = rowOld(pl);
    var tag = String(r.tag||"");
    var cur = "";
    try{ cur = (window.NOD && window.NOD.tag) || ""; }catch(e){}
    if(tag && cur && tag === cur) emit("nodal:"+tag);
  }catch(e){}
}
function onPrivRoom(pl){
  try{
    if(pl.eventType !== "UPDATE") return;
    var nw = rowNew(pl);
    var code = String(nw.code||"");
    if(code && code === String(window.privRoom||"")) emit("lock:"+code);
  }catch(e){}
}
function onPrivMember(pl){
  try{
    if(pl.eventType !== "INSERT") return;
    var r = rowNew(pl);
    var code = String(r.code||""), nk = String(r.nick||"");
    if(!code || !nk) return;
    var meL = meLowerNow();
    if(meL && low(nk) === meL){ emit("pok:"+code); return; }
    if(code === String(window.privRoom||"")) emit("join:"+nk);
  }catch(e){}
}
function onPrivReq(pl){
  try{
    var meL = meLowerNow();
    if(pl.eventType === "INSERT"){
      var r = rowNew(pl);
      var code = String(r.code||""), nk = String(r.nick||""), fn = String(r.from_nick||"");
      if(!code || !nk) return;
      if(meL && low(nk) === meL){ emit("inv:"+J({f:fn, r:code})); return; }
      (async function(){
        try{
          var s = await sb();
          var ow = await s.from("priv_rooms").select("owner_nick").eq("code", code).limit(1).maybeSingle();
          if(ow.data && meLowerNow() && low(ow.data.owner_nick||"") === meLowerNow())
            emit("req:"+J({f:nk, r:code}));
        }catch(e){}
      })();
    } else if(pl.eventType === "DELETE"){
      var d = rowOld(pl);
      var dc = String(d.code||""), dn = String(d.nick||"");
      if(!dc || !dn) return;
      if(meL && low(dn) === meL){
        setTimeout(function(){
          (async function(){
            try{
              var s2 = await sb();
              var mm = await s2.from("priv_members").select("nick").eq("code", dc).ilike("nick", escLike(meLowerNow())).limit(1).maybeSingle();
              if(!(mm.data)) emit("pno:"+dc);
            }catch(e){}
          })();
        }, 2000);
      }
    }
  }catch(e){}
}

/* subs sobem junto com o socket (e no 1º RPC, p/ quem chama rpc direto) */
try{
  if(window.sbSocket && !window.sbSocket._sb3){
    (function(){
      var mk = window.sbSocket;
      var wrapped = function(){ var sk = mk(); var b = sk._boot; sk._boot = async function(){ await b(); try{ ensureSubs(); }catch(e){} }; return sk; };
      wrapped._sb3 = true;
      window.sbSocket = wrapped;
    })();
  }
  try{ window.sbEnsureSubs = ensureSubs; }catch(e){}
}catch(e){}

})();
