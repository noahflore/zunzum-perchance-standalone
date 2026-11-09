/* ============================================================================
 * zundme2e.js — DM ponta a ponta PRÓPRIA (sem plugin, WebCrypto nativo).
 *
 * Por que: a DM era "ENC1:" com chave derivada dos nicks (públicos) — o
 * servidor derivava e lia tudo. Agora cada conta tem 1 par ECDH P-256:
 * a pública fica no banco (FASE 13: `dm_pubkeys`, leitura p/ logados),
 * a privada NUNCA sai do aparelho (só um backup cifrado com o hash do
 * app vai p/ `dm_privbak`, p/ aparelho novo). Cada envio usa par efêmero
 * novo (sem forward secrecy total — histórico local ainda abre).
 *
 * Envelope duplo (o par lê a metade dele, eu leio a minha depois):
 *   "ENC2:<eR>:<ivR>:<ctR>:<eS>:<ivS>:<ctS>"
 * Legado "ENC1:" e claro (bot) continuam abrindo. Sem FASE 13 no banco,
 * sem `crypto.subtle`, ou par sem pública → cai p/ ENC1 sozinho.
 *
 * Limitação assumida: o servidor DISTRIBUI as públicas (TOFU). Protege
 * contra leitura passiva/vazamento/backup — NÃO contra MITM ativo do
 * operador. O app mostra o fingerprint p/ conferir fora da banda.
 * ========================================================================== */
(function () {
  "use strict";
  var MEM = {};        // nickLower -> {jwkPub} (públicas de pares, sessão)
  var MINE = null;     // {priv:CryptoKey, pubJwk, fp} (sessão)
  var MINE_NICK = "";
  var ENSURE_P = null; // ensure em voo (anti-rajada)
  var LAST_SYNC = "";  // "v2:nick" quando a custódia já está lacrada c/ a senha
  var PW_HASH = "";    // hash da senha DIGITADA nesta sessão (só memória, nunca disco)
  var NEED_PW = false; // custódia existe mas não abre com nada que temos
  var _rstAtt = 0, _rstCool = 0; // anti-chute no restaurar-com-senha
  var _probe = null, _probeAt = 0;

  /* Guarda o hash da senha digitada (login/troca/restaurar). Só memória:
     some no reload — e é só p/ lacrar/ler a custódia, nunca p/ autenticar. */
  function setPwHash(h) {
    try { if (/^[0-9a-f]{64}$/.test(String(h || ""))) PW_HASH = String(h); } catch (e) {}
  }
  function isTokCred(x) { try { return /^zst_/.test(String(x || "")); } catch (e) { return false; } }

  function low(s) { try { return String(s || "").toLowerCase(); } catch (e) { return ""; } }
  function b64e(buf) {
    try {
      var u = buf instanceof Uint8Array ? buf : new Uint8Array(buf), s = "";
      for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
      return btoa(s);
    } catch (e) { return ""; }
  }
  function b64d(s) {
    try {
      var b = atob(String(s || "")), u = new Uint8Array(b.length);
      for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      return u;
    } catch (e) { return null; }
  }
  function te(s) { try { return new TextEncoder().encode(String(s == null ? "" : s)); } catch (e) { return new Uint8Array(0); } }
  function td(b) { try { return new TextDecoder().decode(b); } catch (e) { return ""; } }
  function subtle() { try { return (window.crypto && window.crypto.subtle) ? window.crypto.subtle : null; } catch (e) { return null; } }
  async function shahex(s) {
    var st = subtle(); if (!st) return "";
    try {
      var d = await st.digest("SHA-256", te(s));
      return Array.prototype.map.call(new Uint8Array(d), function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
    } catch (e) { return ""; }
  }
  function lsGet(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { window.localStorage.setItem(k, v); } catch (e) {} }
  /* sessão: `me` é global-lexical (app.js, sem wrapper) — visível aqui.
     fallback: __zunGetSession (storage). NUNCA zme() — é privado do IIFE.
     Sem sessão não há E2E (DM exige login mesmo). */
  function auth() {
    try { if (typeof me !== "undefined" && me && me.nick) return { nick: me.nick, hash: me.hash || "" }; } catch (e) {}
    try { if (window.__zunGetSession) { var s = window.__zunGetSession(); if (s && s.nick) return { nick: s.nick, hash: s.hash || "" }; } } catch (e) {}
    return null;
  }
  async function sb() { try { return await window.__sb.client(); } catch (e) { return null; } }
  function sbOk() { try { return !!(window.sbConfigured && window.sbConfigured()); } catch (e) { return false; } }

  /* FASE 13 aplicada? (probe 1x; negativo expira em 60s) */
  async function available() {
    try {
      if (!sbOk() || !subtle()) return false;
      var now = Date.now();
      if (_probe === true) return true;
      if (_probe === false && now - _probeAt < 60000) return false;
      var c = await sb(); if (!c) { _probe = false; _probeAt = now; return false; }
      var r = await c.from("dm_pubkeys").select("nick").limit(1);
      if (r && r.error && /relation|table|column|schema|does not exist|404/i
          .test(String((r.error.message || "") + (r.error.code || "")))) {
        _probe = false; _probeAt = now; return false;
      }
      if (r && r.error) { _probe = false; _probeAt = now; return false; }
      _probe = true; _probeAt = now; return true;
    } catch (e) { _probe = false; _probeAt = Date.now(); return false; }
  }

  /* ---------- chaves ---------- */
  async function genPair() {
    var st = subtle(); if (!st) return null;
    try {
      var kp = await st.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
      var pubJ = await st.exportKey("jwk", kp.publicKey);
      var privJ = await st.exportKey("jwk", kp.privateKey);
      var fp = (await shahex(JSON.stringify({ kty: pubJ.kty, crv: pubJ.crv, x: pubJ.x, y: pubJ.y }))).slice(0, 12);
      return { kp: kp, pubJ: pubJ, privJ: privJ, fp: fp };
    } catch (e) { return null; }
  }
  async function importPriv(privJ) {
    var st = subtle(); if (!st) return null;
    try {
      return await st.importKey("jwk", privJ, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
    } catch (e) { return null; }
  }
  async function importPub(pubJ) {
    var st = subtle(); if (!st) return null;
    try {
      return await st.importKey("jwk", pubJ, { name: "ECDH", namedCurve: "P-256" }, false, []);
    } catch (e) { return null; }
  }
  function privKeyName(nick) { return "zunDMPriv:" + low(nick); }
  function privHistName(nick) { return "zunDMPrivHist:" + low(nick); }
  function loadLocal(nick) {
    try {
      var s = lsGet(privKeyName(nick));
      if (!s) return null;
      var j = JSON.parse(s);
      if (!j || (j.kty !== "ECDH" && j.kty !== "EC") || !j.d) return null;
      return j;
    } catch (e) { return null; }
  }
  function loadHist(nick) {
    try {
      var a = JSON.parse(lsGet(privHistName(nick)) || "[]");
      return Array.isArray(a) ? a.filter(function (j) { return j && (j.kty === "ECDH" || j.kty === "EC") && j.d; }).slice(0, 10) : [];
    } catch (e) { return []; }
  }
  async function kekFor(hash) {
    var st = subtle(); if (!st) return null;
    try {
      var d = await st.digest("SHA-256", te("zunzum-dmkek-v1:" + String(hash || "")));
      return await st.importKey("raw", d, "AES-GCM", false, ["encrypt", "decrypt"]);
    } catch (e) { return null; }
  }
  /* KEK v2: SEMPRE o hash da senha digitada (memória). v1 (kekFor, abaixo)
     segue existindo só p/ LER o legado; escrita v1/token acabou (órfã o backup). */
  async function kek2(pwHash) {
    var st = subtle(); if (!st) return null;
    try {
      var d = await st.digest("SHA-256", te("zunzum-dmkek-v2:" + String(pwHash || "")));
      return await st.importKey("raw", d, "AES-GCM", false, ["encrypt", "decrypt"]);
    } catch (e) { return null; }
  }
  /* Pacote da custódia: até 2 chaves (atual + anterior — cobre 1 giro de atraso).
     ~250 chars/chave: cabe folgado no limite de 3000 do blob. */
  function bundlePack(keys) {
    try {
      var ks = (Array.isArray(keys) ? keys : [keys]).filter(function (j) { return j && (j.kty === "ECDH" || j.kty === "EC") && j.d; }).slice(0, 2);
      if (!ks.length) return null;
      return JSON.stringify({ v: 2, keys: ks });
    } catch (e) { return null; }
  }
  function bundleParse(s) {
    try {
      var o = JSON.parse(String(s || ""));
      var arr = (o && Array.isArray(o.keys)) ? o.keys : [o];
      return arr.filter(function (j) { return j && (j.kty === "ECDH" || j.kty === "EC") && j.d; }).slice(0, 2);
    } catch (e) { return []; }
  }
  /* Escreve a custódia. EXIGE o hash da senha (64 hex); com token ou sem nada,
     recusa (nunca re-lacra com credencial rotativa). Chamadores: estreia com
     senha digitada, giro com senha em memória, migração no login com senha. */
  async function backupPut(nick, keys, pwHash) {
    try {
      if (!await available()) return false;
      if (!/^[0-9a-f]{64}$/.test(String(pwHash || ""))) return false;
      var raw = bundlePack(keys); if (!raw) return false;
      var kek = await kek2(pwHash); if (!kek) return false;
      var iv = window.crypto.getRandomValues(new Uint8Array(12));
      var ct = await subtle().encrypt({ name: "AES-GCM", iv: iv }, kek, te(raw));
      var blob = "DMK2:" + b64e(iv) + ":" + b64e(ct);
      if (blob.length > 3000) return false;
      var c = await sb(); if (!c) return false;
      var r = await c.from("dm_privbak").upsert({ nick: nick, blob: blob }, { onConflict: "nick" });
      return !(r && r.error);
    } catch (e) { return false; }
  }
  /* Lê a custódia: v2 (senha) primeiro; v1 legado (DMK1:) depois.
     KEK do v1 = hash EXPLÍCITO quando há (senha digitada no login/restaurar —
     abre até backup antigo com a senha certa); sem ele, a credencial salva da
     sessão se for modo-hash (comportamento antigo). strict=true (restaurar):
     NUNCA usa a credencial da sessão — só a digitada (senão senha errada passa). */
  async function backupGet(nick, pwHash, strict) {
    try {
      if (!await available()) return null;
      var c = await sb(); if (!c) return null;
      var r = await c.from("dm_privbak").select("blob").eq("nick", nick).limit(1).maybeSingle();
      var blob = r && r.data && r.data.blob;
      if (!blob || typeof blob !== "string") return null;
      if (/^[0-9a-f]{64}$/.test(String(pwHash || "")) && blob.indexOf("DMK2:") === 0) {
        try {
          var p2 = blob.split(":"), iv2 = b64d(p2[1]), ct2 = b64d(p2.slice(2).join(":"));
          var k2 = await kek2(pwHash);
          if (iv2 && ct2 && k2) {
            var pt2 = await subtle().decrypt({ name: "AES-GCM", iv: iv2 }, k2, ct2);
            var ks2 = bundleParse(td(pt2));
            if (ks2.length) return { keys: ks2 };
          }
        } catch (e) {}
      }
      /* v1 legado: KEK = hash explícito (senha digitada) primeiro; sem ele e
         sem strict, a credencial da sessão em modo-hash (comportamento antigo).
         strict nunca encosta na sessão — só a digitada abre. */
      if (blob.indexOf("DMK1:") === 0 && (/^[0-9a-f]{64}$/.test(String(pwHash || "")) || !strict)) {
        try {
          var k1in = "";
          if (/^[0-9a-f]{64}$/.test(String(pwHash || ""))) k1in = String(pwHash);
          else { try { var a = auth(); if (a && a.hash && !isTokCred(a.hash)) k1in = a.hash; } catch (e) {} }
          if (k1in) {
            var p1 = blob.split(":");
            if (p1.length >= 3) {
              var iv1 = b64d(p1[1]), ct1 = b64d(p1.slice(2).join(":"));
              var k1 = await kekFor(k1in);
              if (iv1 && ct1 && k1) {
                var pt1 = await subtle().decrypt({ name: "AES-GCM", iv: iv1 }, k1, ct1);
                var j1 = JSON.parse(td(pt1));
                if (j1 && (j1.kty === "ECDH" || j1.kty === "EC") && j1.d) return { keys: [j1] };
              }
            }
          }
        } catch (e) {}
      }
      return null;
    } catch (e) { return null; }
  }
  async function backupHasRow(nick) {
    try {
      var c = await sb(); if (!c) return false;
      var r = await c.from("dm_privbak").select("nick").eq("nick", nick).limit(1).maybeSingle();
      return !!(r && r.data);
    } catch (e) { return false; }
  }
  async function publish(nick, pubJ, fp) {
    try {
      if (!await available()) return false;
      var c = await sb(); if (!c) return false;
      var pub = JSON.stringify({ kty: pubJ.kty, crv: pubJ.crv, x: pubJ.x, y: pubJ.y });
      if (pub.length > 600) return false;
      var r = await c.from("dm_pubkeys").upsert({ nick: nick, pub: pub, fp: fp || "" }, { onConflict: "nick" });
      return !(r && r.error);
    } catch (e) { return false; }
  }
  /* Garante meu par desta sessão: local → backup (aparelho novo) → gera+publica */
  /* outra aba girou a chave? o MINE da sessão fica velho e nada novo abre.
     Se o disco tem privada diferente, adota antes de tentar (cura o
     "falha em decifrar" intermitente de quem usa 2 abas). */
  async function recheckMine() {
    try {
      var a = auth();
      if (!a || !MINE || MINE_NICK !== low(a.nick)) return;
      var lj = loadLocal(a.nick);
      if (lj && lj.d && MINE.privJ && lj.d !== MINE.privJ.d) {
        var k = await importPriv(lj);
        if (k) MINE = { priv: k, privJ: lj, fp: (await shahex(JSON.stringify({ kty: lj.kty, crv: lj.crv, x: lj.x, y: lj.y }))).slice(0, 12) };
      }
    } catch (e) {}
  }
  /* Instala chaves vindas da custódia: atual vira MINE+disco, a anterior
     entra no histórico local (abre o que chegou antes do giro). */
  async function installRestored(nick, keys) {
    try {
      var k0 = await importPriv(keys[0]);
      if (!k0) return false;
      try {
        var h = loadHist(nick), seen = {};
        h.forEach(function (j) { try { seen[JSON.stringify([j.x, j.y, j.d])] = 1; } catch (e) {} });
        (keys.slice(1).concat(h)).forEach(function (j) {
          try { var s = JSON.stringify([j.x, j.y, j.d]); if (j && j.d && !seen[s]) { seen[s] = 1; h.push(j); } } catch (e) {}
        });
        lsSet(privHistName(nick), JSON.stringify(h.slice(0, 10)));
      } catch (e) {}
      lsSet(privKeyName(nick), JSON.stringify(keys[0]));
      var fp = (await shahex(JSON.stringify({ kty: keys[0].kty, crv: keys[0].crv, x: keys[0].x, y: keys[0].y }))).slice(0, 12);
      MINE = { priv: k0, privJ: keys[0], fp: fp }; MINE_NICK = low(nick); NEED_PW = false;
      try { await publish(nick, { kty: keys[0].kty, crv: keys[0].crv, x: keys[0].x, y: keys[0].y }, fp); } catch (e) {}
      return true;
    } catch (e) { return false; }
  }
  /* Garante meu par: local → custódia (senha da sessão, senão legado) → gera.
     Com custódia TRANCADA, NÃO gera por cima (destruiria o backup): devolve
     null e a UI oferece recuperar-com-senha / começar do zero. */
  async function ensureMine() {
    try {
      var a = auth();
      if (!a || !subtle() || !await available()) return null;
      if (MINE && MINE_NICK === low(a.nick)) { try { await recheckMine(); } catch (e) {} try { rotCheckIdle(); } catch (e2) {} return MINE; }
      if (ENSURE_P) { try { await ENSURE_P; } catch (e) {} if (MINE && MINE_NICK === low(a.nick)) return MINE; }
      var self = (async function () {
        var lj = loadLocal(a.nick);
        if (lj) {
          var k = await importPriv(lj);
          if (k) {
            var fp0 = (await shahex(JSON.stringify({ kty: lj.kty, crv: lj.crv, x: lj.x, y: lj.y }))).slice(0, 12);
            MINE = { priv: k, privJ: lj, fp: fp0 }; MINE_NICK = low(a.nick); NEED_PW = false;
            return MINE;
          }
        }
        var got = null;
        try { got = await backupGet(a.nick, PW_HASH); } catch (e) { got = null; }
        if (got && got.keys && got.keys.length) {
          try { if (await installRestored(a.nick, got.keys)) return MINE; } catch (e) {}
        }
        var hasRow = false;
        try { hasRow = await backupHasRow(a.nick); } catch (e) {}
        if (hasRow) { NEED_PW = true; return null; }
        NEED_PW = false;
        var g = await genPair();
        if (!g) return null;
        lsSet(privKeyName(a.nick), JSON.stringify(g.privJ));
        try { await publish(a.nick, g.pubJ, g.fp); } catch (e) {}
        if (PW_HASH) { try { if (await backupPut(a.nick, [g.privJ], PW_HASH)) LAST_SYNC = "v2:" + low(a.nick); } catch (e) {} }
        try { rotSave(a.nick, { at: Date.now(), sent: 0 }); } catch (e) {}
        MINE = { priv: g.kp.privateKey, privJ: g.privJ, fp: g.fp }; MINE_NICK = low(a.nick);
        return MINE;
      })();
      ENSURE_P = self;
      try { return await self; } finally { ENSURE_P = null; }
    } catch (e) { return null; }
  }
  async function pubFor(peerLower) {
    try {
      peerLower = low(peerLower);
      if (!peerLower || !await available()) return null;
      /* pública do par com validade (15min): sem isso, se o par girou a chave,
         eu seguia cifrando p/ a chave velha e a msg chegava sem abrir do lado
         de lá ("chega a cifra" / cadeado intermitente) */
      var _mem = MEM[peerLower];
      if (_mem && (Date.now()-(_mem.at||0) < 900000)) return _mem;
      var c = await sb(); if (!c) return null;
      var r = await c.from("dm_pubkeys").select("pub,fp").eq("nick", peerLower).limit(1).maybeSingle();
      /* nick com case diferente: tenta ilike 1x */
      if ((!r || !r.data) && c) {
        try {
          var r2 = await c.from("dm_pubkeys").select("pub,fp,nick").ilike("nick", peerLower).limit(1).maybeSingle();
          if (r2 && r2.data) r = r2;
        } catch (e) {}
      }
      var j = r && r.data && r.data.pub;
      try { j = typeof j === "string" ? JSON.parse(j) : j; } catch (e) { return null; }
      if (!j || (j.kty !== "ECDH" && j.kty !== "EC") || !j.x || !j.y) return null;
      var out = { jwk: { kty: j.kty, crv: j.crv || "P-256", x: j.x, y: j.y }, fp: String((r.data && r.data.fp) || ""), at: Date.now() };
      MEM[peerLower] = out;
      return out;
    } catch (e) { return null; }
  }

  /* ---------- envelope ---------- */
  async function secretTo(peerPubKey) {
    try {
      var st = subtle(); if (!st || !MINE) return null;
      var bits = await st.deriveBits({ name: "ECDH", public: peerPubKey }, MINE.priv, 256);
      var d = await st.digest("SHA-256", new Uint8Array([...new Uint8Array(bits), ...te("zunzum-dm-e2e-v1")]));
      return await st.importKey("raw", d, "AES-GCM", false, ["encrypt", "decrypt"]);
    } catch (e) { return null; }
  }
  async function encHalf(peerPubKey, ptBytes) {
    try {
      var st = subtle(); if (!st) return null;
      var eph = await st.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
      var ephJ = await st.exportKey("jwk", eph.publicKey);
      var bits = await st.deriveBits({ name: "ECDH", public: peerPubKey }, eph.privateKey, 256);
      var d = await st.digest("SHA-256", new Uint8Array([...new Uint8Array(bits), ...te("zunzum-dm-e2e-v1")]));
      var key = await st.importKey("raw", d, "AES-GCM", false, ["encrypt"]);
      var iv = window.crypto.getRandomValues(new Uint8Array(12));
      var ct = await st.encrypt({ name: "AES-GCM", iv: iv }, key, ptBytes);
      return { e: b64e(te(JSON.stringify({ kty: ephJ.kty, crv: ephJ.crv, x: ephJ.x, y: ephJ.y }))), iv: b64e(iv), ct: b64e(ct) };
    } catch (e) { return null; }
  }
  async function decHalf(myPrivKey, half) {
    try {
      var st = subtle(); if (!st) return null;
      var ej = JSON.parse(td(b64d(half.e) || new Uint8Array(0)));
      if (!ej || (ej.kty !== "ECDH" && ej.kty !== "EC") || !ej.x || !ej.y) return null;
      var ephPub = await st.importKey("jwk", ej, { name: "ECDH", namedCurve: "P-256" }, false, []);
      var bits = await st.deriveBits({ name: "ECDH", public: ephPub }, myPrivKey, 256);
      var d = await st.digest("SHA-256", new Uint8Array([...new Uint8Array(bits), ...te("zunzum-dm-e2e-v1")]));
      var key = await st.importKey("raw", d, "AES-GCM", false, ["decrypt"]);
      var iv = b64d(half.iv), ct = b64d(half.ct);
      if (!iv || !ct) return null;
      var pt = await st.decrypt({ name: "AES-GCM", iv: iv }, key, ct);
      return JSON.parse(td(pt));
    } catch (e) { return null; }
  }
  /* Teto p/ caber no body (5000) com folga: JSON {t,u} em bytes */
  var E2E_PT_CAP = 1400;
  async function encEnvelope(myPubJwk, peerPubJwk, text, url) {
    try {
      var pt = te(JSON.stringify({ t: String(text || ""), u: String(url || "") }));
      if (pt.length > E2E_PT_CAP) return { ok: 0, err: "size" };
      var peerPub = await importPub(peerPubJwk); if (!peerPub) return { ok: 0, err: "pub" };
      var myPub = await importPub(myPubJwk); if (!myPub) return { ok: 0, err: "pub" };
      var hR = await encHalf(peerPub, pt); if (!hR) return { ok: 0, err: "enc" };
      var hS = await encHalf(myPub, pt); if (!hS) return { ok: 0, err: "enc" };
      return { ok: 1, text: "ENC2:" + hR.e + ":" + hR.iv + ":" + hR.ct + ":" + hS.e + ":" + hS.iv + ":" + hS.ct };
    } catch (e) { return { ok: 0, err: "enc" }; }
  }
  function parseEnv(s) {
    try {
      if (typeof s !== "string" || s.indexOf("ENC2:") !== 0) return null;
      var p = s.split(":");
      if (p.length !== 7) return null;
      return { r: { e: p[1], iv: p[2], ct: p[3] }, s: { e: p[4], iv: p[5], ct: p[6] } };
    } catch (e) { return null; }
  }
  /* Tenta abrir com minha privada (+ histórico de rotação). Retorna {t,u} ou null. */
  async function decEnvelope(env) {
    try {
      var a = auth();
      var cands = [];
      if (MINE && MINE_NICK === low(a && a.nick)) cands.push(MINE.priv);
      if (a) {
        var lj = loadLocal(a.nick);
        if (lj) { var k = await importPriv(lj); if (k) cands.push(k); }
        var hs = loadHist(a.nick);
        for (var i = 0; i < hs.length; i++) {
          try { var kh = await importPriv(hs[i]); if (kh) cands.push(kh); } catch (e) {}
        }
      }
      if (!cands.length) return { ok: 0, err: "nokey" };
      var halves = [env.r, env.s];
      for (var c2 = 0; c2 < cands.length; c2++) {
        for (var h = 0; h < 2; h++) {
          try {
            var o = await decHalf(cands[c2], halves[h]);
            if (o && (typeof o.t === "string" || typeof o.u === "string")) return { ok: 1, t: String(o.t || ""), u: String(o.u || "") };
          } catch (e) {}
        }
      }
      return { ok: 0, err: "fail" };
    } catch (e) { return { ok: 0, err: "fail" }; }
  }

  /* ---------- outbox p/ si (FASE 15): a fila da 1ª msg mora no banco, --------
     mas o servidor NUNCA vê o claro. Cada parte vai cifrada p/ a PRÓPRIA
     pública (envelope "ENC2:" duplo c/ si nos dois lados — só a minha
     privada abre). Aparelho novo restaura a privada via dm_privbak e puxa
     a fila; giro de chave: quem gira re-cifra as linhas (hook __zunOutRekey
     no rotDo), então a fila acompanha a chave nova. */
  async function encSelfParts(parts) {
    try {
      var mine = await ensureMine();
      if (!mine) return { ok: 0, err: "auth" };
      var myPubJ = { kty: mine.privJ.kty, crv: mine.privJ.crv, x: mine.privJ.x, y: mine.privJ.y };
      var arr = [], ps = (parts && parts.length) ? parts : [{ t: "", u: "" }];
      if (ps.length > 20) return { ok: 0, err: "size" };
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i] || {};
        var r = await encEnvelope(myPubJ, myPubJ, p.t || "", p.u || "");
        if (!r || !r.ok) return { ok: 0, err: (r && r.err) || "enc" };
        arr.push(r.text);
      }
      var blob = JSON.stringify(arr);
      if (blob.length > 20000) return { ok: 0, err: "size" };
      return { ok: 1, blob: blob };
    } catch (e) { return { ok: 0, err: "enc" }; }
  }
  async function decSelfBlob(blob) {
    try {
      var mine = await ensureMine();
      if (!mine) return { ok: 0, err: "auth" };
      var arr = (typeof blob === "string") ? JSON.parse(blob) : blob;
      if (!Array.isArray(arr) || !arr.length || arr.length > 20) return { ok: 0, err: "fmt" };
      var parts = [];
      for (var i = 0; i < arr.length; i++) {
        if (typeof arr[i] !== "string" || arr[i].indexOf("ENC2:") !== 0) return { ok: 0, err: "fmt" };
        var env = parseEnv(arr[i]);
        if (!env) return { ok: 0, err: "fmt" };
        var r = await decEnvelope(env);
        if (!r || !r.ok) return { ok: 0, err: (r && r.err) || "fail" };
        parts.push({ t: r.t || "", u: r.u || "" });
      }
      return { ok: 1, parts: parts };
    } catch (e) { return { ok: 0, err: "fail" }; }
  }

  /* Aparelho novo: o dono digita a senha UMA vez (o hash vive só aqui, memória).
     Acerto = instala a chave; erro = senha (anti-chute: 5 tentativas → 60s). */
  async function restoreWithPassword(pw) {
    try {
      var a = auth();
      if (!a || !await available()) return { ok: 0, err: "auth" };
      var now = Date.now();
      if (now < _rstCool) return { ok: 0, err: "devagar" };
      var h = "";
      try { h = (typeof hashPw === "function") ? await hashPw(String(pw || "")) : ""; } catch (e) { h = ""; }
      if (!/^[0-9a-f]{64}$/.test(h || "")) return { ok: 0, err: "senha" };
      var got = await backupGet(a.nick, h, true);
      if (!got || !got.keys || !got.keys.length) {
        _rstAtt++;
        if (_rstAtt >= 5) { _rstCool = now + 60000; _rstAtt = 0; return { ok: 0, err: "devagar" }; }
        return { ok: 0, err: "senha" };
      }
      _rstAtt = 0;
      setPwHash(h);
      var ok = await installRestored(a.nick, got.keys);
      if (!ok) return { ok: 0, err: "fail" };
      try { LAST_SYNC = "v2:" + low(a.nick); } catch (e) {}
      return { ok: 1, fp: MINE.fp };
    } catch (e) { return { ok: 0, err: "fail" }; }
  }
  /* "começar do zero": gera chave nova (msgs antigas seguem trancadas; as novas
     voltam). Só via confirmação explícita da UI; a custódia órfã é substituída
     na próxima login com senha (ou agora, se a senha foi digitada). */
  async function startFresh() {
    try {
      var a = auth();
      if (!a || !await available()) return { ok: 0, err: "auth" };
      var g = await genPair();
      if (!g) return { ok: 0, err: "crypto" };
      lsSet(privKeyName(a.nick), JSON.stringify(g.privJ));
      MINE = { priv: g.kp.privateKey, privJ: g.privJ, fp: g.fp }; MINE_NICK = low(a.nick); NEED_PW = false;
      try { await publish(a.nick, g.pubJ, g.fp); } catch (e) {}
      if (PW_HASH) { try { if (await backupPut(a.nick, [g.privJ], PW_HASH)) LAST_SYNC = "v2:" + low(a.nick); } catch (e) {} }
      try { rotSave(a.nick, { at: Date.now(), sent: 0 }); } catch (e) {}
      return { ok: 1, fp: g.fp };
    } catch (e) { return { ok: 0, err: "fail" }; }
  }
  /* "ok" (tenho chave ou abro a custódia sozinho) | "locked" (custódia existe e
     não abre — pede a senha) | "none" (sem custódia — estreante) | "off" */
  async function backupStatus() {
    try {
      var a = auth();
      if (!a || !await available()) return "off";
      if (MINE && MINE_NICK === low(a.nick)) return "ok";
      try { if (loadLocal(a.nick)) return "ok"; } catch (e) {}
      var has = false;
      try { has = await backupHasRow(a.nick); } catch (e) {}
      if (!has) return "none";
      var got = null;
      try { got = await backupGet(a.nick, PW_HASH); } catch (e) {}
      return (got && got.keys && got.keys.length) ? "ok" : "locked";
    } catch (e) { return "off"; }
  }

  /* ---------- API p/ zundm ---------- */
  /* {text,url,e2e:true} ou {e2e:false} (= faz o legado). Bot nem chega aqui. */
  async function encMaybe(peer, text, url) {
    try {
      peer = low(String(peer || "").replace(/^@/, ""));
      if (!peer || !await available()) return { e2e: false };
      var mine = await ensureMine();
      if (!mine) return { e2e: false };
      var pub = await pubFor(peer);
      if (!pub) return { e2e: false };
      var myPubJ = { kty: mine.privJ.kty, crv: mine.privJ.crv, x: mine.privJ.x, y: mine.privJ.y };
      var r = await encEnvelope(myPubJ, pub.jwk, text, url);
      if (!r || !r.ok) return { e2e: false, err: r && r.err };
      /* envio E2E contou 1 p/ a rotação automática (100 envios OU 7 dias) */
      try { rotNoteSent(); } catch (e) {}
      return { e2e: true, text: r.text, url: "" };
    } catch (e) { return { e2e: false }; }
  }
  /* null = não é ENC2 (chamador segue o legado). Marca _lock/_lockMsg se é. */
  async function decMsg(myLower, peerLower, m) {
    try {
      if (!m || typeof m.t !== "string" || m.t.indexOf("ENC2:") !== 0) return null;
      var env = parseEnv(m.t);
      if (!env) { m._lock = 1; m._lockMsg = "🔒 mensagem ilegível (formato)"; return true; }
      try { await recheckMine(); } catch (e) {}
      if (MINE_NICK !== low(myLower)) { try { await ensureMine(); } catch (e) {} }
      var r = await decEnvelope(env);
      if (r && r.ok) { m.t = r.t; m.u = r.u; return true; }
      m._lock = 1;
      m._lockMsg = (r && r.err === "nokey")
        ? "🔒 ponta a ponta — este aparelho não tem a chave (entre de novo e digite sua senha p/ recuperar suas conversas)"
        : "🔒 ponta a ponta — não abriu (chave trocada? peça p/ reenviar)";
      return true;
    } catch (e) { try { m._lock = 1; } catch (e2) {} return true; }
  }
  /* Estado p/ o cadeado do header: clear (bot) o chamador decide; aqui e2e/legacy/unknown */
  async function state(peerLower) {
    try {
      peerLower = low(peerLower);
      if (!await available()) return { mode: "unknown" };
      var pub = await pubFor(peerLower);
      if (!pub) return { mode: "legacy" };
      var mine = await ensureMine();
      if (!mine) return { mode: "legacy" };
      return { mode: "e2e", fp: String(pub.fp || "").slice(0, 12) };
    } catch (e) { return { mode: "unknown" }; }
  }
  async function rotate() {
    try {
      var a = auth();
      if (!a || !await available()) return { ok: 0, err: "auth" };
      var cur = loadLocal(a.nick);
      var g = await genPair();
      if (!g) return { ok: 0, err: "crypto" };
      if (cur) {
        try {
          var h = loadHist(a.nick);
          h.unshift(cur);
          lsSet(privHistName(a.nick), JSON.stringify(h.slice(0, 10)));
        } catch (e) {}
      }
      lsSet(privKeyName(a.nick), JSON.stringify(g.privJ));
      MINE = { priv: g.kp.privateKey, privJ: g.privJ, fp: g.fp }; MINE_NICK = low(a.nick);
      try { await publish(a.nick, g.pubJ, g.fp); } catch (e) {}
      /* custódia acompanha o giro SOMENTE com o hash da senha em memória
         (pacote [nova, anterior] — cobre 1 giro de atraso no aparelho novo).
         Sem senha, pula: re-lacrar com token órfã o backup; a próxima login
         com senha migra, e o giro anterior fica no histórico local. */
      if (PW_HASH) { try { if (await backupPut(a.nick, [g.privJ, cur].filter(Boolean), PW_HASH)) LAST_SYNC = "v2:" + low(a.nick); } catch (e) {} }
      try { MEM = {}; } catch (e) {}
      /* giro (manual ou automático) zera o contador da automática */
      try { rotSave(a.nick, { at: Date.now(), sent: 0 }); } catch (e) {}
      return { ok: 1, fp: g.fp };
    } catch (e) { return { ok: 0, err: "fail" }; }
  }
  /* ---------- rotação AUTOMÁTICA (estilo WhatsApp/Discord: sem botão) --------
     Higiene silenciosa: cada envio E2E conta 1; cada sessão confere a idade.
     Bateu 100 envios OU 7 dias → gira sozinha em 2º plano (publica a nova,
     guarda a velha no histórico p/ abrir o que já chegou). A manual (🔑)
     continua valendo e zera o contador. Estreia só carimba (sem girar). */
  var ROT_MAX_SENT = 100, ROT_MAX_MS = 7 * 24 * 3600 * 1000;
  var ROT_FLYING = false;
  function rotName(nick) { return "zunDMRot:" + low(nick); }
  function rotLoad(nick) {
    try {
      var o = JSON.parse(lsGet(rotName(nick)) || "null");
      if (o && typeof o.at === "number" && typeof o.sent === "number") return o;
    } catch (e) {}
    return null;
  }
  function rotSave(nick, rec) { try { lsSet(rotName(nick), JSON.stringify({ at: rec.at || Date.now(), sent: rec.sent || 0 })); } catch (e) {} }
  function rotDue(rec) {
    try {
      if (!rec) return false;
      if ((rec.sent || 0) >= ROT_MAX_SENT) return "envios";
      if ((Date.now() - (rec.at || 0)) > ROT_MAX_MS) return "tempo";
    } catch (e) {}
    return false;
  }
  async function rotDo() {
    if (ROT_FLYING) return false;
    ROT_FLYING = true;
    try {
      var a = auth(); if (!a) return false;
      var r = await rotate();
      /* rotate() já carimba o sucesso; falha mantém o registro vencido p/
         tentar de novo no próximo envio/sessão (1 por vez via ROT_FLYING).
         Girou: a fila do banco acompanha a chave nova (re-cifra p/ si). */
      if (r && r.ok) { try { if (window.__zunOutRekey) window.__zunOutRekey(); } catch (e) {} }
      return !!(r && r.ok);
    } catch (e) { return false; }
    finally { ROT_FLYING = false; }
  }
  /* pós-envio E2E: conta e gira se bateu a cota (não espera: volta na hora) */
  function rotNoteSent() {
    try {
      var a = auth(); if (!a) return;
      var rec = rotLoad(a.nick);
      if (!rec) { rotSave(a.nick, { at: Date.now(), sent: 1 }); return; }
      rec.sent = (rec.sent || 0) + 1;
      if (rotDue(rec)) { try { rotDo(); } catch (e) {} return; }
      rotSave(a.nick, rec);
    } catch (e) {}
  }
  /* por sessão: gira se a chave envelheceu (cobre quem recebe mas não envia) */
  function rotCheckIdle() {
    try {
      var a = auth(); if (!a) return;
      var rec = rotLoad(a.nick);
      if (!rec) { rotSave(a.nick, { at: Date.now(), sent: 0 }); return; }
      if (rotDue(rec)) { try { rotDo(); } catch (e) {} }
    } catch (e) {}
  }
  /* leitura p/ teste/debug (console): {at, sent, due} */
  function rotInfo() {
    try {
      var a = auth();
      var rec = (a && rotLoad(a.nick)) || null;
      return { nick: (a && a.nick) || "", rec: rec, due: rotDue(rec), maxSent: ROT_MAX_SENT, maxDays: 7 };
    } catch (e) { return null; }
  }
  /* Repõe a custódia SOMENTE com o hash da senha em memória (login/troca).
     Sem senha, não toca: re-lacrar com token de sessão órfã o backup. */
  async function syncBackup(force) {
    try {
      var a = auth();
      if (!a || !PW_HASH || !await available()) return false;
      var tag = "v2:" + low(a.nick);
      if (!force && LAST_SYNC === tag) return true;
      var lj = (MINE && MINE_NICK === low(a.nick) && MINE.privJ) ? MINE.privJ : loadLocal(a.nick);
      if (!lj) return false;
      var ok = await backupPut(a.nick, [lj], PW_HASH);
      if (ok) LAST_SYNC = tag;
      return ok;
    } catch (e) { return false; }
  }
  function hasMine() { try { var a = auth(); return !!(MINE && a && MINE_NICK === low(a.nick)); } catch (e) { return false; } }

  /* Testes unitários (sem rede além do probe): roundtrip, chave errada, tamper, legado */
  async function selfTest() {
    var out = {};
    try {
      if (!subtle()) { out.crypto = "sem-subtle"; return out; }
      var A = await genPair(), B = await genPair();
      if (!A || !B) { out.gen = "fail"; return out; }
      out.gen = "ok";
      var realNick = low((auth() || {}).nick) || "__test__";
      var prevM = MINE, prevN = MINE_NICK;
      MINE = { priv: A.kp.privateKey, privJ: A.privJ, fp: A.fp }; MINE_NICK = realNick;
      var r = await encEnvelope({ kty: A.privJ.kty, crv: A.privJ.crv, x: A.privJ.x, y: A.privJ.y },
        { kty: B.pubJ.kty, crv: B.pubJ.crv, x: B.pubJ.x, y: B.pubJ.y }, "olá ✓", "https://x.test/a.png");
      out.enc = r && r.ok ? "ok" : "fail:" + (r && r.err);
      var env = parseEnv(r.text);
      out.parse = env ? "ok" : "fail";
      /* B abre a metade dele */
      MINE = { priv: B.kp.privateKey, privJ: B.privJ, fp: B.fp };
      var d1 = await decEnvelope(env);
      out.roundtripB = (d1 && d1.ok && d1.t === "olá ✓" && d1.u === "https://x.test/a.png") ? "ok" : "fail";
      /* A abre a metade dele */
      MINE = { priv: A.kp.privateKey, privJ: A.privJ, fp: A.fp };
      var d2 = await decEnvelope(env);
      out.roundtripA = (d2 && d2.ok && d2.t === "olá ✓") ? "ok" : "fail";
      /* C (terceiro) não abre */
      var C = await genPair();
      MINE = { priv: C.kp.privateKey, privJ: C.privJ, fp: C.fp };
      var d3 = await decEnvelope(env);
      out.wrongKey = (!d3 || !d3.ok) ? "ok" : "FAIL-abriu";
      /* tamper: 1 char do ct */
      var parts = r.text.split(":");
      parts[3] = (parts[3][0] === "A" ? "B" : "A") + parts[3].slice(1);
      MINE = { priv: B.kp.privateKey, privJ: B.privJ, fp: B.fp };
      var d4 = await decEnvelope(parseEnv(parts.join(":")));
      out.tamper = (!d4 || !d4.ok) ? "ok" : "FAIL-abriu";
      /* formato quebrado */
      var d5 = parseEnv("ENC2:curto");
      out.badfmt = !d5 ? "ok" : "fail";
      MINE = prevM; MINE_NICK = prevN;
      /* pacote da custódia: empacota 2 chaves e desembrulha íntegro */
      try {
        var A2 = await genPair(), B2 = await genPair();
        var raw2 = bundlePack([A2.privJ, B2.privJ]);
        var back2 = bundleParse(raw2);
        out.bundle = (back2.length === 2 && back2[0].d === A2.privJ.d && back2[1].d === B2.privJ.d) ? "ok" : "fail";
      } catch (e) { out.bundle = "fail"; }
      out.done = "ok";
    } catch (e) { out.ex = String(e && e.message || e); }
    return out;
  }

  /* esquece a pública do par em cache (o ↻ "tentar de novo" do cadeado usa:
     força buscar a chave nova que ele publicou ao girar) */
  function forget(peerLower) {
    try { peerLower = low(peerLower); if (peerLower && MEM[peerLower]) delete MEM[peerLower]; } catch (e) {}
  }
  try {
    window.ZunDME2E = {
      available: available, state: state, ensureMine: ensureMine, pubFor: pubFor,
      encMaybe: encMaybe, decMsg: decMsg, encSelfParts: encSelfParts, decSelfBlob: decSelfBlob,
      rotate: rotate, rotInfo: rotInfo, syncBackup: syncBackup, forget: forget,
      hasMine: hasMine, selfTest: selfTest,
      setPwHash: setPwHash, restoreWithPassword: restoreWithPassword,
      backupStatus: backupStatus, startFresh: startFresh
    };
  } catch (e) {}
})();
