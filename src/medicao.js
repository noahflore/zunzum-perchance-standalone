/* medicao.js — medição diária/semanal/mensal, CRIPTOGRAFADA (ver src/MEDICAO.md).
   Modelo: a chave PÚBLICA do dono fica aqui (cifrar qualquer um cifra, só o
   dono decifra). A chave PRIVADA NUNCA entra no src/ — fica no PC do dono
   (dono.js) e é colada só na hora de ler (variável de memória, sem disco).
   Sem UI e sem auto-run: só roda quando o dono chama no console.
   Setup (1x): await medicaoSetup() → gera o par, mostra a pública p/ colar
   em MED_PUBKEY (1 save) e a privada p/ guardar fora do repo.
   Uso (online): await medicaoAgora() → cifra o snapshot e salva em kv.
   Leitura: await medicaoLer("PRIVADA...") → exige nick do dono logado +
   chave privada; chave errada = nada abre.
   Cifra 100% NATIVA (WebCrypto: ECDH P-256 + AES-GCM, sem plugin — regra 2). */
(function(){
"use strict";
/* COLAR AQUI a chave pública do dono (1 save). Placeholder = coleta recusa. */
var MED_PUBKEY = '{"crv":"P-256","ext":true,"key_ops":[],"kty":"EC","x":"kUxSDy0i73jyH_BclX977AseSCm8oPva24tHT1hwVrE","y":"t-DSqCoSEwna7F4vE7fk5IEBBRwIz82P4s_72Ktxzuw"}';
/* Nick do dono (minúsculas, sem @). Leitura exige sessão deste nick + chave. */
var MED_OWNER = "kkk";
/* Arquivo editável (URL estável, leitura pública, escrita só c/ editKey).
   Conteúdo 100% cifrado — pode ser público. EditKey fica SÓ no navegador
   do dono (localStorage) + backup no dono.js; NUNCA no src/. */
var MED_FILE = "zunzum-medicao-log";
function medEditKey(){ try{ return localStorage.getItem("zunzumMedEditKey") || ""; }catch(e){ return ""; } }
function medGuardarEditKey(k){ try{ if(k) localStorage.setItem("zunzumMedEditKey", String(k)); }catch(e){} }
/* Cofre no Supabase (tabela owner_secrets, RLS: só o dono). Puxa a editKey
   sozinha quando o dono loga — zero console em aparelho novo. */
async function medSb(){
  try{
    if(window.__sb && typeof window.__sb.client === "function") return await window.__sb.client();
  }catch(e){}
  return null;
}
async function medChaveRemota(){
  try{
    var sb = await medSb();
    if(!sb) return "";
    var r = await sb.from("owner_secrets").select("value").eq("key", "medicao_editkey").limit(1).maybeSingle();
    if(r && !r.error && r.data && r.data.value) return String(r.data.value);
  }catch(e){}
  return "";
}
async function medChaveGuardarRemota(ek){
  try{
    var sb = await medSb();
    if(!sb || !ek) return false;
    var r = await sb.from("owner_secrets").upsert({key:"medicao_editkey", value:String(ek)});
    return !(r && r.error);
  }catch(e){ return false; }
}
/* r38: a editKey local vale p/ este arquivo? testa com escrita inócua
   (regrava o conteúdo idêntico — exige editKey válida, sem mudar nada). */
async function medChaveLocalVale(ek){
  try{
    var up = null;
    try{ up = root.uploadPlugin; }catch(e){}
    if(!up || !up.editable || !ek) return false;
    var cur = await up.editable.get(MED_FILE);
    if(cur === null || cur === undefined) cur = "[]";
    var r = await up.editable.set(MED_FILE, String(cur), {editKey:String(ek)});
    return !(r && r.error);
  }catch(e){ return false; }
}
function meuNick(){
  try{
    if(window.me && window.me.nick) return String(window.me.nick).toLowerCase();
    var raw = null;
    try{ raw = sessionStorage.getItem("orkutSession") || localStorage.getItem("orkutSession"); }catch(e){ raw = null; }
    var m = JSON.parse(raw || "null");
    return (m && m.nick) ? String(m.nick).toLowerCase() : "";
  }catch(e){ return ""; }
}
async function zunRpc(name, data){
  if(typeof crpc === "function"){
    if(name === "presence") return await crpc(name, data || "", 20000);
    if(name === "statsCounts") return await crpc(name, data || "", 20000);
  }
  if(typeof rpc === "function") return await rpc(name, data);
  throw new Error("norpc");
}
function sec(){
  /* WebCrypto nativo (ECDH P-256 + AES-GCM) — sem plugin (regra 2). */
  var c = null;
  try{ c = window.crypto && window.crypto.subtle ? window.crypto.subtle : null; }catch(e){}
  if(!c) return null;
  function b64e(bytes){
    var s = "", i;
    for(i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64d(s){
    var bin = atob(String(s || ""));
    var b = new Uint8Array(bin.length);
    for(var i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
    return b;
  }
  function te(s){ return new TextEncoder().encode(String(s)); }
  function td(b){ return new TextDecoder().decode(b); }
  async function impPub(j){
    var o = JSON.parse(String(j));
    if(!o || o.kty !== "EC" || o.crv !== "P-256" || !o.x || !o.y) throw new Error("pubkey");
    return await c.importKey("jwk", o, {name:"ECDH", namedCurve:"P-256"}, true, []);
  }
  async function impPriv(j){
    var o = JSON.parse(String(j));
    if(!o || !o.d) throw new Error("privkey");
    return await c.importKey("jwk", o, {name:"ECDH", namedCurve:"P-256"}, true, ["deriveKey"]);
  }
  return {
    generateKeyPair:function(){
      /* sync-looking p/ manter o contrato do medicaoSetup (devolve promessa). */
      return c.generateKey({name:"ECDH", namedCurve:"P-256"}, true, ["deriveKey"]).then(function(kp){
        return Promise.all([c.exportKey("jwk", kp.publicKey), c.exportKey("jwk", kp.privateKey)]);
      }).then(function(jwks){ return {public:JSON.stringify(jwks[0]), private:JSON.stringify(jwks[1])}; });
    },
    encrypt:function(plain, pub){
      var ownerPub = null, eph = null, key = null, iv = null;
      return impPub(pub).then(function(p){ ownerPub = p; return c.generateKey({name:"ECDH", namedCurve:"P-256"}, true, ["deriveKey"]); })
      .then(function(e){ eph = e; return c.deriveKey({name:"ECDH", public:ownerPub}, eph.privateKey, {name:"AES-GCM", length:256}, false, ["encrypt"]); })
      .then(function(k){ key = k; iv = window.crypto.getRandomValues(new Uint8Array(12)); return c.encrypt({name:"AES-GCM", iv:iv}, key, te(plain)); })
      .then(function(ct){ return c.exportKey("jwk", eph.publicKey).then(function(ej){ return JSON.stringify({e:ej, iv:b64e(iv), ct:b64e(new Uint8Array(ct))}); }); });
    },
    decrypt:function(bundle, priv){
      var o = JSON.parse(String(bundle || ""));
      if(!o || !o.e || !o.iv || !o.ct) throw new Error("bundle");
      var privK = null, ephPub = null, key = null;
      return impPriv(priv).then(function(k){ privK = k; return c.importKey("jwk", o.e, {name:"ECDH", namedCurve:"P-256"}, true, []); })
      .then(function(e){ ephPub = e; return c.deriveKey({name:"ECDH", public:ephPub}, privK, {name:"AES-GCM", length:256}, false, ["decrypt"]); })
      .then(function(k){ key = k; return c.decrypt({name:"AES-GCM", iv:b64d(o.iv)}, key, b64d(o.ct)); })
      .then(function(pt){ return td(pt); });
    }
  };
}
function diaLocal(d){
  d = d || new Date();
  var m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
}
function kvMed(){
  return (typeof zunKV === "function") ? zunKV("medicao") : root.kv.medicao;
}
async function medicaoSetup(modo){
  var s = sec();
  if(!s) return {err:"WebCrypto indisponível neste navegador"};
  var kp = null, reuso = (modo === "arquivo" && MED_PUBKEY);
  if(reuso) kp = {public:MED_PUBKEY, private:"(a que você já tem no dono.js — não gero outra)"};
  else kp = await s.generateKeyPair();
  var up = null;
  try{ up = root.uploadPlugin; }catch(e){}
  if(!up || !up.editable) return {public:kp.public, private:kp.private,
    como:"upload-plugin indisponível aqui — só chaves geradas; arquivo depois"};
  var cr = null, pre = null, existe = false;
  try{ pre = await up.editable.get(MED_FILE); existe = (pre !== null && pre !== undefined && pre !== ""); }catch(e){}
  try{
    if(existe) cr = {mantido:true};
    else {
      try{ cr = await up.editable.set(MED_FILE, "[]"); }
      catch(e2){
        if(String(((e2 && e2.message) || e2)).includes("edit_key")) cr = {mantido:true};
        else throw e2;
      }
    }
  }
  catch(e){ return {public:kp.public, private:kp.private, err:"falha ao criar arquivo: " + String((e && e.message) || e)}; }
  if(!cr || cr.error) return {public:kp.public, private:kp.private, err:"arquivo: " + String((cr && cr.error) || "desconhecido")};
  var ek = (cr && cr.editKey) || "";
  try{ if(ek) localStorage.setItem("zunzumMedEditKey", ek); }catch(e){}
  var cofre = false;
  if(ek && reuso){ cofre = await medChaveGuardarRemota(ek); }
  if(cr.mantido){
    /* arquivo já existia: traz a editKey (cofre → este navegador); se o cofre
       ainda está vazio mas este navegador tem editKey VÁLIDA p/ o arquivo,
       empurra p/ o cofre (r38: completa a instalação sozinho). */
    var rem = await medChaveRemota();
    if(!rem){
      var loc = "";
      try{ loc = medEditKey(); }catch(e){}
      if(loc && await medChaveLocalVale(loc)){
        if(await medChaveGuardarRemota(loc)) rem = loc;
      }
    }
    if(rem) medGuardarEditKey(rem);
    return {public:kp.public, private:kp.private, file:MED_FILE,
      editKey:"",
      cofre:!!rem,
      como: rem ? "editKey no cofre (+ neste navegador). Guarde private no dono.js."
                : "arquivo mantido, mas sem editKey válida aqui e cofre vazio. Rode medicaoGuardarChave com a editKey do dono.js (ou SQL pendente)."};
  }
  return {public:kp.public, private:kp.private, file:MED_FILE,
    editKey:ek, cofre:cofre,
    como:"editKey JÁ GUARDADA aqui + no cofre Supabase (se SQL aplicado). Guarde private + editKey no dono.js. Salve de novo."};
}
function medicaoGuardarChave(k){
  try{
    if(!k) return "passe a editKey: medicaoGuardarChave(\"...\")";
    localStorage.setItem("zunzumMedEditKey", String(k));
    return "editKey guardada neste navegador";
  }catch(e){ return "falha ao guardar"; }
}
async function medicaoAgora(){
  if(!MED_PUBKEY) return {err:"sem chave pública (rode medicaoSetup 1x e configure)"};
  var online = false;
  try{ online = !!(window.sbConfigured && window.sbConfigured()); }catch(e){}
  if(!online) return {err:"offline — medição só vale online (modo local não conta)"};
  var s = sec();
  if(!s) return {err:"WebCrypto indisponível neste navegador"};
  var views = null, users = null, onlineNow = null, sc = null;
  try{
    var r = await fetch("https://perchance.org/api/getGeneratorStats?name=" + encodeURIComponent(window.generatorName || "zunzum"), {cache:"no-store"});
    var j = r.ok ? await r.json() : null;
    if(j && j.data && isFinite(j.data.views)) views = Number(j.data.views);
  }catch(e){}
  try{
    var p = JSON.parse(await zunRpc("presence", ""));
    if(p && p.ok){ users = p.total; onlineNow = p.online; }
  }catch(e){}
  try{
    var q = JSON.parse(await zunRpc("statsCounts", ""));
    if(q && (q.ok || q.feed != null)) sc = q;
  }catch(e){}
  var snap = {d:diaLocal(), ts:Date.now(), views:views, users:users, online:onlineNow,
    feed:sc?sc.feed:null, replies:sc?sc.replies:null, likes:sc?sc.likes:null,
    pub:sc?sc.pub:null, refs:sc?sc.refs:null};
  var enc = null;
  try{ enc = await s.encrypt(JSON.stringify(snap), MED_PUBKEY); }
  catch(e){ return {err:"falha ao cifrar (chave pública inválida?)"}; }
  try{ await kvMed().set(snap.d, {enc:enc}); }
  catch(e){ return {err:"falha ao salvar snapshot (kv indisponível)"}; }
  /* espelho no arquivo do site (dono só; falha silenciosa — kv já salvou) */
  try{
    var ek = medEditKey(), up2 = null;
    try{ up2 = root.uploadPlugin; }catch(e2){}
    if(ek && up2 && up2.editable && meuNick() === String(MED_OWNER).toLowerCase() && MED_OWNER){
      var cur = await up2.editable.get(MED_FILE);
      var arr = [];
      try{ arr = JSON.parse(String(cur || "[]")); if(!Array.isArray(arr)) arr = []; }catch(e3){ arr = []; }
      var achou = false;
      for(var i = 0; i < arr.length; i++){ if(arr[i] && arr[i].d === snap.d){ arr[i] = {d:snap.d, enc:enc}; achou = true; break; } }
      if(!achou) arr.push({d:snap.d, enc:enc});
      await up2.editable.set(MED_FILE, JSON.stringify(arr), {editKey:ek});
    }
  }catch(e){}
  return {d:snap.d, salvo:true, cifra:(String(enc).length) + " chars"};
}
async function medicaoLer(priv){
  if(!priv) return "passe a chave privada: await medicaoLer(\"...\")";
  if(!MED_OWNER) return "MED_OWNER não configurado (rode medicaoSetup 1x)";
  if(meuNick() !== String(MED_OWNER).toLowerCase()) return "só com o dono logado (@" + MED_OWNER + ")";
  var s = sec();
  if(!s) return "WebCrypto indisponível neste navegador";
  var store = null;
  try{ store = kvMed(); }catch(e){ return "kv indisponível"; }
  var ks = [];
  /* fonte principal: arquivo do site (lê de qualquer navegador); kv = fallback */
  var central = [];
  try{
    var up3 = null;
    try{ up3 = root.uploadPlugin; }catch(e4){}
    if(up3 && up3.editable){
      var txt = await up3.editable.get(MED_FILE);
      var arr3 = JSON.parse(String(txt || "[]"));
      if(Array.isArray(arr3)) central = arr3;
    }
  }catch(e5){}
  if(central.length){
    var seen = {}, rows = [];
    for(var c = 0; c < central.length; c++){ if(central[c] && central[c].d) seen[central[c].d] = central[c]; }
    var dias = Object.keys(seen).sort();
    var lines2 = ["| data | views | usuários | online | posts | respostas | likes | chat-pub | convites |",
      "|---|---|---|---|---|---|---|---|---|"];
    var n2 = 0, f2 = 0;
    for(var di = 0; di < dias.length; di++){
      var snap2 = null;
      try{ snap2 = JSON.parse(await s.decrypt(String(seen[dias[di]].enc || ""), priv)); n2++; }
      catch(e6){ f2++; continue; }
      var g = function(v){ return (v == null) ? "s/p" : v; };
      lines2.push("| " + snap2.d + " | " + g(snap2.views) + " | " + g(snap2.users) + " | " + g(snap2.online) +
        " | " + g(snap2.feed) + " | " + g(snap2.replies) + " | " + g(snap2.likes) +
        " | " + g(snap2.pub) + " | " + g(snap2.refs) + " |");
    }
    if(!n2) return "nada abre com essa chave (" + f2 + " falha(s) — chave errada ou arquivo vazio)";
    return lines2.join("\n") + "\n\n(" + n2 + " dia(s) do arquivo, " + f2 + " falha(s))";
  }
  try{ ks = await store.keys(); }catch(e){ return "falha ao listar snapshots"; }
  ks = ks.filter(function(k){ return /^\d{4}-\d{2}-\d{2}$/.test(k); });
  ks.sort();
  var lines = ["| data | views | usuários | online | posts | respostas | likes | chat-pub | convites |",
    "|---|---|---|---|---|---|---|---|---|"];
  var n = 0, falhas = 0;
  for(var i = 0; i < ks.length; i++){
    var row = null;
    try{ row = await store.get(ks[i]); }catch(e){ falhas++; continue; }
    var snap = null;
    try{ snap = JSON.parse(await s.decrypt(String((row && row.enc) || ""), priv)); n++; }
    catch(e){ falhas++; continue; }
    var f = function(v){ return (v == null) ? "s/p" : v; };
    lines.push("| " + snap.d + " | " + f(snap.views) + " | " + f(snap.users) + " | " + f(snap.online) +
      " | " + f(snap.feed) + " | " + f(snap.replies) + " | " + f(snap.likes) +
      " | " + f(snap.pub) + " | " + f(snap.refs) + " |");
  }
  if(!n) return "nada abre com essa chave (" + falhas + " falha(s) — chave errada ou sem snapshots)";
  return lines.join("\n") + "\n\n(" + n + " dia(s), " + falhas + " falha(s))";
}
/* AUTO (r35): coleta sozinha 1x ao dia, SÓ no navegador do dono logado.
   Sem UI, sem barulho: se não for o dono, sem chave ou offline, não faz
   nada. 1ª tentativa 60s após carregar + re-checa a cada 10min (pega login
   tardio). Erro nunca quebra o app (tudo em try/catch silencioso). */
async function medicaoAuto(){
  try{
    if(!MED_PUBKEY || !MED_OWNER) return {ran:false, why:"sem config"};
    if(meuNick() !== String(MED_OWNER).toLowerCase()) return {ran:false, why:"não é o dono"};
    var hoje = diaLocal();
    try{ if(await kvMed().get("auto-dia") === hoje) return {ran:false, why:"hoje já coletado"}; }catch(e){}
    /* aparelho novo? puxa a editKey do cofre sozinha (zero console) */
    try{
      if(!medEditKey()){
        var rem = await medChaveRemota();
        if(rem) medGuardarEditKey(rem);
      }
    }catch(e2){}
    var r = await medicaoAgora();
    if(r && r.salvo){ try{ await kvMed().set("auto-dia", hoje); }catch(e){} return {ran:true, d:r.d}; }
    return {ran:false, why:(r && r.err) || "falha"};
  }catch(e){ return {ran:false, why:"exceção"}; }
}
try{
  window.medicaoSetup = medicaoSetup; window.medicaoAgora = medicaoAgora;
  window.medicaoLer = medicaoLer; window.medicaoAuto = medicaoAuto;
  window.medicaoGuardarChave = medicaoGuardarChave;
  setTimeout(function(){ try{ medicaoAuto(); }catch(e){} }, 60000);
  setInterval(function(){ try{ medicaoAuto(); }catch(e){} }, 600000);
}catch(e){}
})();
