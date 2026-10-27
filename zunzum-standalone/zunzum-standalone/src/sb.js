/* sb.js — adaptador Supabase (substitui o server-plugin).
   FASE 1: núcleo + auth + feed + pub + perfis + presença + realtime.
   Conceito: `sbSocket()` imita a API do createServerSocket
   (addEventListener open/message/close, opened, closed, rpc) para o app
   quase não mudar. Respostas têm o MESMO formato JSON dos RPCs antigos.

   Config (definir antes de carregar o app, ex. no console ou em
   window.ZUN_SUPABASE_URL / window.ZUN_SUPABASE_KEY):
     window.ZUN_SUPABASE_URL = "https://xyz.supabase.co";
     window.ZUN_SUPABASE_KEY = "<anon key>";
*/
(function(){
"use strict";

var _sb = null;       // supabase client
var _sbBoot = null;   // promise do import
var _me = null;       // {nick} (sessão lógica)
var _msgHandlers = []; // onmessage (strings legado: "1", "depo:x", ...)

function supaCfg(){
  var u = "", k = "";
  try{
    /* trava de origem: fora do domínio oficial (ou iframe estranho), o app
       nem cria o client — sem conexão com o banco (ver src/site-guard.js).
       undefined = guarda não carregou: segue (o RLS protege os dados). */
    if(window.__zunOriginOk===false) return {url:"", key:""};
    u = String(window.ZUN_SUPABASE_URL || "").replace(/\/+$/, "");
    k = String(window.ZUN_SUPABASE_KEY || "");
    if(!u){ try{ u = String(localStorage.getItem("ZUN_SUPABASE_URL")||"").replace(/\/+$/,""); }catch(e){} }
    if(!k){ try{ k = String(localStorage.getItem("ZUN_SUPABASE_KEY")||""); }catch(e){} }
  }catch(e){}
  return {url:u, key:k};
}

function sbConfigured(){
  var c = supaCfg();
  return /^https:\/\//.test(c.url) && c.key.length > 20;
}
try{ window.sbConfigured = sbConfigured; }catch(e){}

var _sb = null;       // supabase client
var _sbBoot = null;   // promise do import
var _me = null;       // {nick} (sessão lógica)
var _msgHandlers = []; // onmessage (strings legado: "1", "depo:x", ...)

async function sbClient(){
  if(_sb) return _sb;
  if(!_sbBoot){
    _sbBoot = (async function(){
      var cfg = supaCfg();
      var mod = await import("https://esm.sh/@supabase/supabase-js@2.118.0");
      _sb = mod.createClient(cfg.url, cfg.key, {
        auth: {
          storage: window.sessionStorage, // token por aba, como o atual
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      return _sb;
    })();
  }
  return _sbBoot;
}

/* ---------- auth (nick + senha derivada, sem email p/ o usuário) ----------
   O app calcula hashPw("orkut-"+senha) = 64 hex e guarda em me.hash.
   A senha real do GoTrue é derivada (SHA-256("zunzum-gotrue-v1:"+hash)).
   ATENÇÃO: o algoritmo é público (código aberto), então QUEM ROUBAR o hash
   do app deriva a senha e loga no Supabase — a derivação NÃO é barreira.
   A proteção real é não vazar o hash (sessão opaca, sessionStorage, sem
   hash em disco/logs). Contas antigas (senha = hash puro) migram no 1º
   login: tenta a derivada, cai p/ legada, e troca p/ derivada em seguida. */
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
/* C1: KDF v2 com salt por nick (migração progressiva).
   v1 = SHA256("zunzum-gotrue-v1:"+hash) — mesmo p/ todo mundo, algoritmo
   público: quem rouba o hash deriva a senha. v2 amarra o nick:
   SHA256("zunzum-gotrue-v2:"+lower(nick)+":"+hash) — o hash vazado de um
   nick não serve p/ outro, e rainbow-table global quebra. Ordem de tentativa
   no login: v2 → v1 → legada (hash puro); sucesso em v1/legada migra p/ v2. */
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
/* throttle best-effort no cliente (a barreira real é o throttle_ok no Postgres
   + captcha; aqui é só p/ não martelar o GoTrue em loop acidental). */
var _sbRegAt = 0, _sbLogAt = 0;
/* re-seal r2: single-use de ticket zcap (ver sb3 _zcapUsedSb3). */
var _zcapUsedSb = {};
function sbEmail(n){ return String(n||"").toLowerCase() + "@zunzum.social"; }
function cleanNick(n){ return String(n||"").replace(/\s+/g,"-").slice(0,20); }
function sbBadKey(k){ return /^(prototype|__proto__|constructor)$/i.test(String(k||"")); }
function okNick(n){ return /^[A-Za-z0-9-_]{2,20}$/.test(n||"") && !sbBadKey(n); }
function okAnon(a){ return /^anon-[a-z0-9]{6,12}$/.test(a||""); }
/* anon com token — caminho Supabase (produção).
   MIGRAÇÃO SQL necessária p/ enforcement real (sem ela, o adapter valida
   sozinho e cai p/ legado — REST direto bypassa, como já acontece c/ URL):
   create table if not exists anon_claims (anon text primary key, tok_hash text not null, created_at timestamptz default now());
   alter table feed_posts add column if not exists anon_tok text;
   alter table feed_replies add column if not exists anon_tok text;
   -- RLS/RPC SECURITY DEFINER a cargo do dono (anon sem JWT não dá p/
   -- distinguir via RLS simples; o enforcement total exige função RPC que
   -- compara o hash sem expor a tabela). Até lá: feedPush já exige login,
   -- então o impacto aqui é só like/reply anon — que passam a exigir token
   -- quando a tabela existir, e legado quando não existir. */
function sbAnonTokOk(t){ return /^zat_[0-9a-f]{32}$/.test(String(t||"")); }
function sbAnonRnd(n){ var s="", abc="0123456789abcdef", b=null; try{ b = new Uint8Array(n); if(window.crypto&&window.crypto.getRandomValues) window.crypto.getRandomValues(b); else for(var i=0;i<n;i++) b[i]=Math.floor(Math.random()*256); for(var j=0;j<n;j++) s+=abc[b[j]%16]; return s; }catch(e){ s=""; for(var k=0;k<n;k++) s+=abc[Math.floor(Math.random()*16)]; return s; } }
function sbAnonTokNew(){ return "zat_"+sbAnonRnd(16)+sbAnonRnd(16).slice(0,16); }
async function sbShahex(s){
  try{
    if(window.crypto && window.crypto.subtle){
      var b = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s||"")));
      return Array.prototype.map.call(new Uint8Array(b), function(x){ return ("0"+x.toString(16)).slice(-2); }).join("");
    }
  }catch(e){}
  return "fb"+String(String(s||"").length)+sbAnonRnd(16);
}
async function sbAnonHash(t, dom){ if(!sbAnonTokOk(t)) return null; return await sbShahex(dom+"|"+String(t||"")); }
/* retorna {st:0 livre |1 ok |-1 negado |2 sem-tabela, tok?:novo} */
async function sbAnonClaim(sb, anon, tok){
  var a = String(anon||"").toLowerCase();
  try{
    var ex = await sb.from("anon_claims").select("tok_hash").eq("anon", a).limit(1).maybeSingle();
    if(ex && ex.error && /relation|table|column|schema|does not exist|404/i.test(String((ex.error.message||"")+(ex.error.code||"")))) return {st:2};
    if(ex && ex.data && ex.data.tok_hash){
      var h = await sbAnonHash(tok, "zunzum-anon-hash-v1");
      if(!h) return {st:-1};
      return (h===ex.data.tok_hash) ? {st:1} : {st:-1};
    }
    var nt = sbAnonTokNew();
    var nh = await sbAnonHash(nt, "zunzum-anon-hash-v1");
    try{
      var ins = await sb.from("anon_claims").insert({anon:a, tok_hash:nh});
      if(ins && ins.error && /duplicate|already|unique|conflict/i.test(String(ins.error.message||""))) return {st:-1};
      if(ins && ins.error && /relation|table|column|schema|does not exist|404/i.test(String((ins.error.message||"")+(ins.error.code||"")))) return {st:2};
    }catch(e2){ return {st:2}; }
    return {st:0, tok:nt};
  }catch(e){ return {st:2}; }
}
/* LIKE-escape (fix 2026-10-24): ilike() trata %/_ como curinga mesmo sem
 * % em volta — nick "a_c" casaria "abc". Todo valor que vai p/ ilike()
 * passa por aqui; o default escape do Postgres (\\) faz \% e \_ literais. */
function escLike(s){ return String(s||"").replace(/\\/g,"\\\\").replace(/%/g,"\\%").replace(/_/g,"\\_"); }
function sbId(p){
  return (p||"x") + Date.now().toString(36) + Math.floor(Math.random()*46656).toString(36);
}
function J(o){ try{ return JSON.stringify(o); }catch(e){ return '{"ok":0}'; } }

async function sbSessionNick(){
  try{
    var sb = await sbClient();
    var g = await sb.auth.getUser();
    var u = g && g.data && g.data.user;
    if(!u) return null;
    var r = await sb.from("profiles").select("nick").eq("user_id", u.id).limit(1).maybeSingle();
    if(r && r.data && r.data.nick) return r.data.nick;
    return null;
  }catch(e){ return null; }
}
function okHash(h){ return /^[0-9a-f]{64}$/.test(String(h||"")); }
/* host estrito (espelho do okUrlStrict do server-plugin): o cliente renderiza
   <img>/<video> com a URL, então localhost/IP privado/.onion vira sonda de
   rede local + tracker. */
function sbHostOk(u){
  try{
    var x = new URL(String(u || ""));
    if(x.protocol !== "https:" || x.username || x.password) return false;
    if(/[\s<>"'`\\]/.test(String(u))) return false;
    var hn = String(x.hostname || "").toLowerCase();
    if(!hn || hn.length > 253 || hn.indexOf("..") >= 0 || /[^a-z0-9.-]/.test(hn)) return false;
    try{ var _pt = parseInt(x.port||"", 10); if(x.port && !(_pt>=1 && _pt<=65535)) return false; }catch(e){}
    if(hn === "localhost" || hn === "localhost.localdomain") return false;
    if(hn === "onion" || hn.slice(-6) === ".onion" || hn === "local" ||
       hn.slice(-6) === ".local" || hn.slice(-10) === ".localhost") return false;
    /* Round 4: forma numérica (decimal/hex/octal) normalizada p/ quad. */
    var _num = /^[0-9.]+$/.test(hn) || /0x/i.test(hn);
    if(_num){
      var _q = null;
      var _p1 = function(p){ p=String(p||""); if(!p) return -1;
        if(/^0x[0-9a-f]+$/i.test(p)){ var _v=parseInt(p,16); return (_v>=0&&_v<=255)?_v:-1; }
        if(/^0[0-7]+$/.test(p)&&p.length>1){ var _o=parseInt(p,8); return (_o>=0&&_o<=255)?_o:-1; }
        if(!/^\d+$/.test(p)) return -1; var _d=parseInt(p,10); return (_d>=0&&_d<=255)?_d:-1; };
      try{
        if(/^\d+$/.test(hn)){ var _n32=parseInt(hn,10); if(_n32<0||_n32>4294967295) return false; _q=[(_n32>>>24)&255,(_n32>>>16)&255,(_n32>>>8)&255,_n32&255]; }
        else if(/^0x[0-9a-f]+$/i.test(hn)){ var _h32=parseInt(hn,16); if(_h32<0||_h32>4294967295) return false; _q=[(_h32>>>24)&255,(_h32>>>16)&255,(_h32>>>8)&255,_h32&255]; }
        else if(/^0[0-7]+$/.test(hn)&&hn.length>1){ var _o32=parseInt(hn,8); if(_o32<0||_o32>4294967295) return false; _q=[(_o32>>>24)&255,(_o32>>>16)&255,(_o32>>>8)&255,_o32&255]; }
        else { var _pp=hn.split("."); if(_pp.length===4){ var _ok=true,_qq=[]; for(var _i=0;_i<4;_i++){ var _v2=_p1(_pp[_i]); if(_v2<0){_ok=false;break;} _qq.push(_v2); } _q=_ok?_qq:null; } }
      }catch(e){ _q = null; }
      if(!_q) return false;
      if(_q[0]===127||_q[0]===0||_q[0]===10) return false;
      if(_q[0]===172&&_q[1]>=16&&_q[1]<=31) return false;
      if(_q[0]===192&&_q[1]===168) return false;
      if(_q[0]===169&&_q[1]===254) return false;
      if(_q[0]===192&&_q[1]===0&&(_q[2]===0||_q[2]===2)) return false;
      if(_q[0]>=224) return false;
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
/* login com migração: tenta a senha derivada; se falhar, tenta a legada
   (hash puro) e, conseguindo, troca p/ derivada na hora.
   C1: ordem v2 (com salt do nick) → v1 → legada; sucesso em v1/legada
   migra p/ v2 na hora (updateUser). */
async function sbSignIn(sb, email, hash, captcha, nickHint){
  var _nl = "";
  try{ _nl = String(nickHint||email||"").replace(/@zunzum\.social$/i,"").toLowerCase(); }catch(e){}
  var derived2 = await sbGoPass2(_nl, hash);
  var derived = await sbGoPass(hash);
  var opt = captcha ? {captchaToken: String(captcha).slice(0, 2048)} : undefined;
  var si = await sb.auth.signInWithPassword({email:email, password:derived2, options:opt});
  if(!si.error) return {si:si, migrated:true};
  si = await sb.auth.signInWithPassword({email:email, password:derived, options:opt});
  if(!si.error){ try{ await sb.auth.updateUser({password:derived2}); }catch(e){} return {si:si, migrated:true}; }
  if(derived === String(hash)) return {si:si, migrated:false};
  var leg = await sb.auth.signInWithPassword({email:email, password:String(hash), options:opt});
  if(leg.error) return {si:leg, migrated:false};
  try{ await sb.auth.updateUser({password:derived2}); }catch(e){}
  return {si:leg, migrated:true};
}
function sbCaptchaErr(e){ return /captcha/i.test(String((e && e.message) || e || "")); }
async function sbProfileByUid(sb, uid){
  try{
    var r = await sb.from("profiles").select("nick,avatar,created,th,pg,ns,pw8,deleted_at").eq("user_id", uid).limit(1).maybeSingle();
    return (r && r.data) || null;
  }catch(e){ return null; }
}
async function sbRegister(nick, hash, captcha, extra){
  nick = cleanNick(nick);
  if(!okNick(nick)) return {ok:0, err:"nick"};
  if(!okHash(hash)) return {ok:0, err:"hash"};
  if(nick.toLowerCase()==="zunzunzinha" || nick.toLowerCase().replace(/[-_]/g,"")==="zunzunzinha")
    return {ok:0, err:"reservado"};
  /* C2 paridade sb3/server-plugin: pwLen>=8 + zcap ANTES do branch de
     existência (anti-enumeração: sem ticket a resposta é sempre captcha).
     extra pode ser string zcap ou {pwLen,zcap}. */
  try{
    var _ex = extra||{};
    var _pl = parseInt((typeof _ex==="object"?_ex.pwLen:_ex),10);
    if(typeof _ex==="string") _pl = NaN;
    // chamadores antigos (sbLogin legado) passam só captcha: exige pwLen via 3º arg? mantém compat: se extra ausente, tenta ler de `captcha` objeto
    if(isNaN(_pl) && _ex && typeof _ex==="object" && _ex.pwLen!=null) _pl = parseInt(_ex.pwLen,10);
    // se o chamador não informou pwLen, não dá p/ validar — rejeita (fail-closed); chamadas internas passam {pwLen:99} p/ login
    if(isNaN(_pl)) return {ok:0, err:"senha-curta"};
    if(_pl < 8) return {ok:0, err:"senha-curta"};
  }catch(e){ return {ok:0, err:"senha-curta"}; }
  try{
    var _zc = (extra && typeof extra==="object") ? String(extra.zcap||"") : "";
    if(window.ZunCap && !_zc) { /* sem ticket nem tenta — evita oráculo */ return {ok:0, err:"captcha"}; }
    /* re-seal r2: single-use (paridade sb3/espelho/server/bonto). */
    if(window.ZunCap && !window.ZunCap.verify(_zc, nick.toLowerCase(), {used:_zcapUsedSb})) return {ok:0, err:"captcha"};
  }catch(e){ return {ok:0, err:"captcha"}; }
  try{ var _nowR = Date.now(); if(_nowR - _sbRegAt < 1500) return {ok:0, err:"rate"}; _sbRegAt = _nowR; }catch(e){}
  var sb = await sbClient();
  var email = sbEmail(nick);
  var cap = captcha ? String(captcha).slice(0, 2048) : undefined;
  var up = await sb.auth.signUp({email:email, password:await sbGoPass2(nick, hash), options:cap ? {captchaToken:cap} : undefined});
  if(up.error){
    var m = String((up.error && up.error.message)||"");
    if(/captcha/i.test(m)) return {ok:0, err:"captcha"};
    if(/already|registered|exists|duplicate/i.test(m)){
      var rs = await sbSignIn(sb, email, hash, cap, nick);
      if(rs.si.error){
        if(sbCaptchaErr(rs.si.error)) return {ok:0, err:"captcha"};
        return {ok:0, err:"senha"};
      }
    } else return {ok:0, err:"auth"};
  }
  var g = await sb.auth.getUser();
  var uid = g && g.data && g.data.user && g.data.user.id;
  if(!uid) return {ok:0, err:"auth"};
  // vincula perfil: cria, ou assume linha-semente (user_id nulo), ou valida dono
  var ex = await sb.from("profiles").select("nick,user_id,pw8").ilike("nick", escLike(nick)).limit(1).maybeSingle();
  var row = ex && ex.data;
  if(!row){
    var ins = await sb.from("profiles").insert({nick:nick, user_id:uid, pw8:true});
    if(ins.error) {
      // corrida: outra aba criou; tenta ler de novo
      var re = await sb.from("profiles").select("nick,user_id").ilike("nick", escLike(nick)).limit(1).maybeSingle();
      row = re && re.data;
      if(!row || (row.user_id && row.user_id !== uid)) return {ok:0, err:"nick-taken"};
    }
  } else if(row.user_id && row.user_id !== uid){
    return {ok:0, err:"nick-taken"};
  } else if(!row.user_id){
    var cl = await sb.from("profiles").update({user_id:uid, pw8:true}).ilike("nick", escLike(nick)).is("user_id", null);
    if(cl.error) return {ok:0, err:"auth"};
  }
  var p = await sbProfileByUid(sb, uid);
  if(!p) return {ok:0, err:"auth"};
  var restored = 0;
  if(p.deleted_at){
    try{ await sb.from("profiles").update({deleted_at:null}).eq("user_id", uid); restored = 1; }catch(e){}
  }
  _me = {nick:p.nick};
  var _rout = {ok:1, nick:p.nick, created:Date.parse(p.created)||Date.now(),
    avatar:p.avatar||"", th:p.th||null, pg:p.pg||"", ns:p.ns||null,
    del:0, restored:restored||undefined};
  try{ if(!p.pw8) _rout.weak = 1; }catch(e){}
  return _rout;
}

async function sbLogin(nick, hash, captcha){
  nick = cleanNick(nick);
  if(!okNick(nick)) return {ok:0, err:"auth"};
  if(!okHash(hash)) return {ok:0, err:"auth"};
  try{ var _nowL = Date.now(); if(_nowL - _sbLogAt < 1200) return {ok:0, err:"rate"}; _sbLogAt = _nowL; }catch(e){}
  var sb = await sbClient();
  var li = await sbSignIn(sb, sbEmail(nick), hash, captcha, nick);
  if(li.si.error) {
    // nick existe com outra senha, ou nem existe
    var ex = await sb.from("profiles").select("nick").ilike("nick", escLike(nick)).limit(1).maybeSingle();
    if(ex && ex.data) return {ok:0, err:"senha"};
    return {ok:0, err:"noid"};
  }
  var g = await sb.auth.getUser();
  var uid = g && g.data && g.data.user && g.data.user.id;
  var p = uid ? await sbProfileByUid(sb, uid) : null;
  if(!p) return {ok:0, err:"auth"};
  _me = {nick:p.nick};
  var _lout = {ok:1, nick:p.nick, created:Date.parse(p.created)||Date.now(),
    avatar:p.avatar||"", th:p.th||null, pg:p.pg||"", ns:p.ns||null,
    del:p.deleted_at?1:0};
  try{ if(!p.pw8) _lout.weak = 1; }catch(e){}
  return _lout;
}

async function sbLogout(){
  try{ var sb = await sbClient(); await sb.auth.signOut(); }catch(e){}
  _me = null;
}

/* ---------- realtime → mensagens legado ---------- */
var _chans = {};
var _lastPg = 0, _lastUs = 0; // throttle anti-colheita (profileGet/userSearch)
function emitMsg(s){
  _msgHandlers.slice().forEach(function(fn){ try{ fn(s); }catch(e){} });
}
async function ensureTableChan(table, filterFn, msgFn){
  var key = table + "|" + (filterFn || "");
  if(_chans[key]) return _chans[key];
  var sb = await sbClient();
  var ch = sb.channel("zun-" + key);
  var spec = {event:"*", schema:"public", table:table};
  if(filterFn) spec.filter = filterFn;
  ch.on("postgres_changes", spec, function(payload){
    try{
      var s = msgFn(payload);
      if(s) emitMsg(s);
    }catch(e){}
  });
  await ch.subscribe();
  _chans[key] = ch;
  return ch;
}
// invalidação geral do app (equivale ao "1" antigo em cada canal)
function invAll(){
  emitMsg("1");
}

/* ---------- linhas → formato legado ---------- */
function feedRow(p, likes, replies){
  var lk = [], rx = {};
  (likes||[]).forEach(function(l){ lk.push(l.liker); rx[l.liker] = l.reaction || "curti"; });
  var rp = (replies||[]).map(function(r){
    return {id:r.id, n:r.author, t:r.body, at:Date.parse(r.created_at), to:r.reply_to||null, ed:!!r.edited};
  });
  return {id:p.id, n:p.author, t:p.body, u:p.media_url||"", y:p.media_type||"",
    at:Date.parse(p.created_at), lk:lk, rx:rx, rp:rp, ed:!!p.edited};
}

/* ---------- sbRpc(name, dataString) → string JSON ---------- */
/* F1 Supabase (paridade com needStrong do server-plugin): conta logada com
   !pw8 não escreve (err:"fraca-pw" — "fraca" sozinho é código de sala privada
   fraco, outro fluxo). Anon (sem sessão GoTrue) passa (anon não tem senha p/
   migrar). Coluna ausente (pré-FASE 9) ou erro de leitura = permite (fail-open
   pré-migração; pós-FASE 9 a coluna existe e o gate nega). Leituras e as vias
   de migração (register/sessLogin/sessLogout/pwChange/cliVer) passam. */
var _pw8Warned = false;
async function sbNeedStrongDeny(sb){
  try{
    var g = await sb.auth.getUser();
    var u = g && g.data && g.data.user;
    if(!u) return null;
    var r;
    try{ r = await sb.from("profiles").select("pw8").eq("user_id", u.id).limit(1).maybeSingle(); }
    catch(e){ return null; }
    if(r && r.error){
      var m = String((r.error.message||"")+(r.error.code||""));
      if(/pw8|column|schema|relation|does not exist|404/i.test(m)){
        if(!_pw8Warned){ _pw8Warned = true; try{ console.warn("[zunzum] FASE 9 pendente: rode src/supabase-fase9.sql"); }catch(e){} }
        return null;
      }
      return null;
    }
    var row = r && r.data;
    if(!row || row.pw8) return null;
    return J({ok:0, err:"fraca-pw"});
  }catch(e){ return null; }
}
var SB_PASS = {cliVer:1, register:1, sessLogin:1, sessLogout:1, pwChange:1,
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
async function sbRpc(name, data){
  var sb = await sbClient();
  var o = {};
  /* re-seal r2: aceita objeto OU string (sb2/sb3 já aceitavam via stringify;
     aqui objeto virava "[object Object]"→{} e zerava os args). Contrato oficial
     continua sendo string (é o que o app passa). */
  try{ o = (typeof data === "object" && data !== null) ? data : JSON.parse(String(data||"{}").length ? String(data) : "{}"); }
  catch(e){ o = {}; }
  var me = _me && _me.nick ? _me.nick : await sbSessionNick();
  if(me) _me = {nick:me};
  if(!SB_PASS[name]){
    var _deny = await sbNeedStrongDeny(sb);
    if(_deny) return _deny;
  }

  switch(name){

  case "cliVer":
    /* v13 = código novo; mig:0 POR ENQUANTO (não força o painel no boot).
       Ligar mig:1 junto com a FASE 9 (profiles.pw8) — antes disso o gate é
       fail-open e forçar todo mundo só irrita sem proteger (e quem migrar
       agora teria que migrar DE NOVO depois do SQL, pois pw8 nasceria false). */
    return J({ok:1, v:13, mig:0});

  case "sugWho": {
    var ow = await sb.from("site_config").select("value").eq("key","owner_nick").limit(1).maybeSingle();
    return J({ok:1, configured:!!(ow && ow.data)});
  }

  case "feedGet": {
    var f = await sb.from("feed_posts").select("*").order("created_at",{ascending:false}).limit(80);
    var posts = (f.data||[]).reverse();
    var ids = posts.map(function(p){ return p.id; });
    var likes = [], reps = [];
    if(ids.length){
      var lq = await sb.from("feed_likes").select("*").in("post_id", ids);
      likes = lq.data||[];
      var rq = await sb.from("feed_replies").select("*").in("post_id", ids).order("created_at",{ascending:true});
      reps = rq.data||[];
    }
    var out = posts.map(function(p){
      return feedRow(p, likes.filter(function(l){ return l.post_id===p.id; }),
        reps.filter(function(r){ return r.post_id===p.id; }));
    });
    return J(out);
  }

  case "feedPush": {
    if(!me) return J({ok:0, err:"auth"});
    var text = String(o.text||"").slice(0,500), url = String(o.url||"").slice(0,500);
    if(!text && !url) return J({ok:0, err:"vazio"});
    if(url && !sbHostOk(url)) return J({ok:0, err:"url"});
    var ins = await sb.from("feed_posts").insert({
      id: sbId("p"), author:"@"+cleanNick(me), body:text,
      media_url:url, media_type:String(o.mtype||"").slice(0,60)
    });
    if(ins.error) return J({ok:0, err:"spam"});
    return J({ok:1});
  }

  case "like": {
    var key = me ? "@"+cleanNick(me) : String(o.anon||"").slice(0,20);
    if(me){ if(!okNick(me)) return J({ok:0, err:"auth"}); }
    else if(!okAnon(key)) return J({ok:0, err:"auth"});
    var _lkTok = null;
    if(!me){
      var _ck = await sbAnonClaim(sb, key, o.anonTok);
      /* C3 fail-closed: st:2 (tabela ausente) também nega — antes só -1
         negava e o legado passava sem dono (impersonation). */
      if(_ck.st!==-1 && _ck.st!==0 && _ck.st!==1) return J({ok:0, err:"anon-taken"});
      if(_ck.st===-1) return J({ok:0, err:"anon-taken"});
      if(_ck.st===0 && _ck.tok) _lkTok = _ck.tok;
    }
    var AL = ["curti","amei","adorei","haha","uau","triste","ok"];
    var r = AL.indexOf(String(o.r||"curti"))>=0 ? String(o.r) : "curti";
    var pid = String(o.id||"").slice(0,40);
    var cur = await sb.from("feed_likes").select("*").eq("post_id",pid).eq("liker",key).limit(1).maybeSingle();
    var liked = true, mine = r;
    if(cur && cur.data){
      if((cur.data.reaction||"curti") !== r){
        await sb.from("feed_likes").update({reaction:r}).eq("post_id",pid).eq("liker",key);
      } else {
        await sb.from("feed_likes").delete().eq("post_id",pid).eq("liker",key);
        liked = false; mine = null;
      }
    } else {
      var li = await sb.from("feed_likes").insert({post_id:pid, liker:key, reaction:r});
      if(li.error) return J({ok:0, err:"noid"});
    }
    var all = await sb.from("feed_likes").select("liker,reaction").eq("post_id",pid);
    var counts = {};
    (all.data||[]).forEach(function(l){ var t=l.reaction||"curti"; counts[t]=(counts[t]||0)+1; });
    var _lr = {ok:1, likes:(all.data||[]).length, liked:liked, mine:mine, counts:counts};
    if(_lkTok) _lr.anonTok = _lkTok;
    return J(_lr);
  }

  case "reply": {
    var rk = me ? "@"+cleanNick(me) : String(o.anon||"").slice(0,20);
    if(me){ if(!okNick(me)) return J({ok:0, err:"auth"}); }
    else if(!okAnon(rk)) return J({ok:0, err:"auth"});
    var _rpTok = null, _rpItem = null;
    if(!me){
      var _ck2 = await sbAnonClaim(sb, rk, o.anonTok);
      /* C3 fail-closed (ver like acima). */
      if(_ck2.st!==-1 && _ck2.st!==0 && _ck2.st!==1) return J({ok:0, err:"anon-taken"});
      if(_ck2.st===-1) return J({ok:0, err:"anon-taken"});
      if(_ck2.st===0 && _ck2.tok) _rpTok = _ck2.tok;
      _rpItem = sbAnonTokNew();
    }
    var rt = String(o.text||"").slice(0,300);
    if(!rt) return J({ok:0, err:"vazio"});
    var rid = sbId("r");
    var _row = {id:rid, post_id:String(o.id||"").slice(0,40), author:rk, body:rt, reply_to:String(o.to||"")||null};
    if(_rpItem){
      var _ih = await sbAnonHash(_rpItem, "zunzum-anon-item-v1");
      if(_ih){ try{ _row.anon_tok = _ih; }catch(e){} }
    }
    var ri = await sb.from("feed_replies").insert(_row);
    if(ri.error){
      if(_rpItem && /column|anon_tok|schema/i.test(String(ri.error.message||""))){
        var ri2 = await sb.from("feed_replies").insert({id:rid, post_id:String(o.id||"").slice(0,40), author:rk, body:rt, reply_to:String(o.to||"")||null});
        if(ri2.error) return J({ok:0, err:"noid"});
      } else return J({ok:0, err:"noid"});
    }
    var _rr2 = {ok:1, rid:rid};
    if(_rpTok) _rr2.anonTok = _rpTok;
    if(_rpItem) _rr2.itemTok = _rpItem;
    return J(_rr2);
  }

  case "feedDel": {
    if(!me) return J({ok:0, err:"auth"});
    var fid = String(o.id||"").slice(0,40);
    var fr = await sb.from("feed_posts").select("author").eq("id",fid).limit(1).maybeSingle();
    if(!fr.data) return J({ok:0, err:"noid"});
    var own = await isOwnerSb(sb);
    if("@" + cleanNick(me) !== fr.data.author && !(fr.data.author==="📢support-zunzum" && own))
      return J({ok:0, err:"dono"});
    await sb.from("feed_posts").delete().eq("id",fid);
    return J({ok:1});
  }

  case "feedEdit": {
    if(!me) return J({ok:0, err:"auth"});
    var fe = await sb.from("feed_posts").select("author").eq("id",String(o.id||"").slice(0,40)).limit(1).maybeSingle();
    if(!fe.data) return J({ok:0, err:"noid"});
    var own2 = await isOwnerSb(sb);
    if("@" + cleanNick(me) !== fe.data.author && !(fe.data.author==="📢support-zunzum" && own2))
      return J({ok:0, err:"dono"});
    var et = String(o.text||"").slice(0,500), eu = String(o.url||"").slice(0,500);
    if(!et && !eu) return J({ok:0, err:"vazio"});
    if(eu && !sbHostOk(eu)) return J({ok:0, err:"url"});
    await sb.from("feed_posts").update({body:et, media_url:eu, edited:true}).eq("id",String(o.id||"").slice(0,40));
    return J({ok:1});
  }

  case "pubGet": {
    var pg = await sb.from("pub_msgs").select("*").order("created_at",{ascending:false}).limit(100);
    return J((pg.data||[]).reverse().map(function(m){
      return {id:m.id, f:m.author.replace(/^@/,""), t:m.body, u:m.media_url||"", y:m.media_type||"", at:Date.parse(m.created_at)};
    }));
  }

  case "pubPush": {
    if(!me) return J({ok:0, err:"auth"});
    var pt = String(o.text||"").slice(0,500), pu = String(o.url||"").slice(0,500);
    if(!pt && !pu) return J({ok:0, err:"vazio"});
    if(pu && !sbHostOk(pu)) return J({ok:0, err:"url"});
    var pi = await sb.from("pub_msgs").insert({id:sbId("m"), author:"@"+cleanNick(me),
      body:pt, media_url:pu, media_type:String(o.mtype||"").slice(0,60)});
    if(pi.error) return J({ok:0, err:"spam"});
    /* crédito de convite no 1º chat: via claim_ref() (sem escrita direta em
       refs); fallback legado p/ schema sem a função. */
    try{
      var _cr = await sb.rpc("claim_ref", {p_by:""});
      if(_cr.error){
        var _rb = await sb.from("ref_by").select("by_nick").eq("nick", String(me).toLowerCase()).limit(1).maybeSingle();
        if(_rb && _rb.data && _rb.data.by_nick){
          await sb.from("ref_by").delete().eq("nick", String(me).toLowerCase());
          var _rc = await sb.from("refs").select("n").eq("nick", _rb.data.by_nick).limit(1).maybeSingle();
          await sb.from("refs").upsert({nick:_rb.data.by_nick, n:((_rc && _rc.data && _rc.data.n)||0)+1});
        }
      }
    }catch(e){}
    return J({ok:1});
  }

  case "profileGet": {
    /* anti-colheita: 1.5s por chamada, igual ao server-plugin (userSearch/profileGet) */
    var nowPg = Date.now();
    if(nowPg - (_lastPg || 0) < 1500) return J({ok:0, err:"rate"});
    _lastPg = nowPg;
    var pn = cleanNick(String(typeof o==="string"?o:(o.nick||data||"")).replace(/^@/,""));
    var pq = await sb.from("profiles").select("*").ilike("nick",escLike(pn)).limit(1).maybeSingle();
    if(!pq.data) return J({ok:0});
    var u = pq.data;
    if(u.deleted_at) return J({ok:0});
    var fp = await sb.from("feed_posts").select("id").eq("author","@"+u.nick).limit(1000);
    var lk = await sb.from("feed_likes").select("post_id").eq("liker","@"+u.nick).limit(1000);
    var dep = await sb.from("depoimentos").select("id").eq("target",u.nick.toLowerCase()).eq("approved",true).limit(1000);
    var rf = await sb.from("refs").select("n").eq("nick",u.nick.toLowerCase()).limit(1).maybeSingle();
    return J({ok:1, nick:u.nick, avatar:u.avatar||"", created:Date.parse(u.created),
      posts:(fp.data||[]).length, likes:(lk.data||[]).length, pub:0,
      dep:(dep.data||[]).length, inv:(rf.data&&rf.data.n)||0, views:u.views||0,
      th:u.th||null, pg:u.pg||"", ns:u.ns||null});
  }

  case "avatarSet": {
    if(!me) return J({ok:0, err:"auth"});
    var au = String(o.url||"").slice(0,500);
    if(au && !sbHostOk(au)) return J({ok:0, err:"url"});
    await sb.from("profiles").update({avatar:au}).eq("user_id",(await sb.auth.getUser()).data.user.id);
    return J({ok:1, avatar:au});
  }

  case "presence": {
    var hb_at = new Date().toISOString();
    if(me){
      try{ await sb.from("heartbeats").upsert({nick:me.toLowerCase(), at:hb_at}); }catch(e){}
    }
    /* purge automático (1x/dia, sem dono): carona no heartbeat — qualquer
       visitante dispara; a função mesma se limita a 23h (autoridade é ela).
       Sem await (não atrasa a presença); erro nunca quebra nada. */
    try{
      var _plt = 0;
      try{ _plt = parseInt(localStorage.getItem("zzTickAt")||"0", 10)||0; }catch(eLS){}
      if(Date.now()-_plt > 20*3600000){
        try{ localStorage.setItem("zzTickAt", String(Date.now())); }catch(eLS2){}
        try{ sb.rpc("zz_purge_tick").then(function(){}).catch(function(){}); }catch(eRpc){}
      }
    }catch(eTick){}
    var on = await sb.from("heartbeats").select("nick").gt("at", new Date(Date.now()-90000).toISOString()).limit(100);
    /* "pessoas atuais": exclui inativas (deleted_at) e contas de teste (*_teste).
       O _ escapado casa o sufixo literal; fallback p/ contagem cheia se o
       filtro negado não for suportado (nunca zerar o contador por erro). */
    var totCount = 0;
    try{
      var totQ = sb.from("profiles").select("nick",{count:"exact", head:true}).is("deleted_at", null);
      try{ totQ = totQ.not("nick", "ilike", "%\\_teste"); }catch(eNot){}
      var tot = await totQ;
      if(tot && !tot.error && tot.count!=null) totCount = tot.count;
      else { var totF = await sb.from("profiles").select("nick",{count:"exact", head:true}); if(totF && totF.count!=null) totCount = totF.count; }
    }catch(eTT){}
    var nl = (on.data||[]).map(function(r){ return r.nick; });
    /* round8 paridade server-plugin: sem inflar (antes *2). */
    return J({ok:1, total: totCount, online: nl.length, nicks: nl.slice(0,100), maxOn: 0, rec:0});
  }

  case "userSearch": {
    var nowUs = Date.now();
    if(nowUs - (_lastUs || 0) < 1500) return J({ok:0, err:"rate"});
    _lastUs = nowUs;
    var q = String(o.q||o.nick||data||"").replace(/^@/,"").trim().toLowerCase().slice(0,20);
    if(q.length<2) return J({ok:0, err:"vazio"});
    /* fix LIKE-wildcard (2026-10-24): %/_ do visitante não viram curinga */
    var us = await sb.from("profiles").select("nick,avatar,ns").ilike("nick","%"+escLike(q)+"%").is("deleted_at",null).limit(20);
    return J({ok:1, users:(us.data||[]).map(function(x){ return {nick:x.nick, avatar:x.avatar||"", ns:x.ns||null}; }),
      total: (us.data||[]).length});
  }

  default:
    return J({ok:0, err:"sb-todo"});
  }
}

async function isOwnerSb(sb){
  try{
    var me = _me && _me.nick ? _me.nick : await sbSessionNick();
    if(!me) return false;
    var ow = await sb.from("site_config").select("value").eq("key","owner_nick").limit(1).maybeSingle();
    var on = ow && ow.data && ow.data.value && ow.data.value.nick;
    return !!on && String(on).toLowerCase() === String(me).toLowerCase();
  }catch(e){ return false; }
}

/* ---------- socket shim (mesma superfície do server-plugin) ---------- */
function sbSocket(){
  var listeners = {open:[], message:[], close:[]};
  var openedResolve, closedReject;
  var opened = new Promise(function(res){ openedResolve = res; });
  var closed = new Promise(function(_, rej){ closedReject = rej; });
  closed.catch(function(){});
  var api = {
    addEventListener: function(ev, fn){
      if(ev==="open") listeners.open.push(fn);
      else if(ev==="message") listeners.message.push(fn);
      else if(ev==="close") listeners.close.push(fn);
    },
    get opened(){ return opened; },
    get closed(){ return closed; },
    rpc: {},
    _subs: []
  };
  // rpc.* → sbRpc
  api.rpc = new Proxy({}, { get: function(_, prop){
    return function(data){ return window.sbRpc(prop, data); };
  }});
  api._boot = async function(){
    try{
      await sbClient();
      var nick = await sbSessionNick();
      if(nick) _me = {nick:nick};
      // canais realtime → mensagens legado
      await ensureTableChan("feed_posts", null, function(){ return "1"; });
      await ensureTableChan("feed_replies", null, function(){ return "1"; });
      await ensureTableChan("feed_likes", null, function(){ return "1"; });
      await ensureTableChan("pub_msgs", null, function(){ return "1"; });
      await ensureTableChan("profiles", null, function(){ return "1"; });
      listeners.open.forEach(function(fn){ try{ fn({}); }catch(e){} });
      openedResolve();
      _msgHandlers.push(function(s){
        listeners.message.forEach(function(fn){ try{ fn({data:s}); }catch(e){} });
      });
    }catch(e){
      listeners.close.forEach(function(fn){ try{ fn({code:1011}); }catch(e2){} });
      try{ closedReject(e); }catch(e2){}
    }
  };
  setTimeout(function(){ api._boot(); }, 0);
  return api;
}
/* access_token do Supabase p/ provar o nick no backend Bonto (vínculo
   anti-squat): null se sem sessão. */
async function sbGetToken(){
  try{
    var sb = await sbClient();
    var g = await sb.auth.getSession();
    var s = g && g.data && g.data.session;
    return (s && s.access_token) || null;
  }catch(e){ return null; }
}
try{ window.sbSocket = sbSocket; window.sbRpc = sbRpc;
  window.sbRegister = sbRegister; window.sbLogin = sbLogin; window.sbLogout = sbLogout;
  window.sbSessionNick = sbSessionNick; window.sbGetToken = sbGetToken;
  window.__sb = {client: sbClient, emit: emitMsg, chan: ensureTableChan, goPass: sbGoPass, hostOk: sbHostOk}; }catch(e){}

})();
