/* ============================================================================
 * zunzum backend-auth — adaptador opcional p/ o backend Node (Bonto).
 * DESLIGADO por padrão: só ativa se window.ZUN_BACKEND_URL estiver setado
 * (ex.: "https://meu-zunzum.bonto.run"). Sem isso, o app usa o server-plugin
 * como antes — nada muda.
 *
 * Guardar como src/backend-auth.js e incluir no index.html DEPOIS do app.js:
 *   <script src="src/backend-auth.js"></script>
 * E definir a URL antes (ou no console p/ testar):
 *   window.ZUN_BACKEND_URL = "https://seu-app.bonto.run";
 *
 * Fluxo: login/register via backend -> guarda {access, refresh} em
 * sessionStorage (aba atual) + backup do refresh em kv. backendFetch() manda
 * o access no Authorization e gira o par sozinho quando dá 401.
 * ========================================================================== */
(function () {
  "use strict";
  function base() {
    try {
      const u = String(window.ZUN_BACKEND_URL || "").trim().replace(/\/+$/, "");
      return /^https:\/\//.test(u) ? u : "";
    } catch (e) { return ""; }
  }
  function lsSave(sess) {
    try { sessionStorage.setItem("zunBackend", JSON.stringify(sess)); } catch (e) {}
  }
  function lsLoad() {
    try {
      const s = sessionStorage.getItem("zunBackend");
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  function lsClear() { try { sessionStorage.removeItem("zunBackend"); } catch (e) {} }

  /* Disjuntor (2026-10-30, quota do Bonto estourada): com o backend fora por
     dias/semanas, cada ação pagava 3 retries lentos antes de falhar. Após 3
     ações seguidas sem alcançar o servidor, falha RÁPIDO ("bonto-fora") por
     60s; o ping do keepalive funciona como sonda: voltou a responder, o
     disjuntor fecha sozinho. Conta 1 por ação (não por retry). */
  var cbFails = 0, cbOpenUntil = 0;
  var CB_MAX = 3, CB_COOL = 60000, CB_TRY = 25000;
  function cbCheck() {
    if (cbOpenUntil && Date.now() < cbOpenUntil) {
      var e = new Error("bonto-fora"); e.code = "bonto-fora"; throw e;
    }
  }
  function cbNote(ok) {
    if (ok) { cbFails = 0; cbOpenUntil = 0; }
    else { cbFails++; if (cbFails >= CB_MAX) cbOpenUntil = Date.now() + CB_COOL; }
  }

  async function call(path, body, access) {
    const b = base();
    if (!b) throw new Error("backend-off");
    cbCheck();
    const headers = { "Content-Type": "application/json" };
    if (access) headers.Authorization = "Bearer " + access;
    // wake-up: o free tier do Bonto dorme após 30min parado — 1ª chamada acorda
    let r = null, lastErr = null;
    for (let i = 0; i < 3; i++) {
      const ctl = new AbortController();
      const to = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, CB_TRY);
      try {
        r = await fetch(b + path, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
        clearTimeout(to);
        break;
      } catch (e) { clearTimeout(to); lastErr = e; await new Promise(ok => setTimeout(ok, 1500 * (i + 1))); }
    }
    if (!r) {
      cbNote(false);
      const e = new Error("bonto-fora"); e.code = "bonto-fora";
      try { if (lastErr) e.cause = lastErr; } catch (e2) {}
      throw e;
    }
    cbNote(true); // servidor respondeu (mesmo que 4xx de app) = alcançável
    let j = null;
    try { j = await r.json(); } catch (e) { throw new Error("resposta"); }
    if (!r.ok) { const e = new Error((j && j.err) || ("http" + r.status)); e.code = (j && j.err) || ""; throw e; }
    return j;
  }

  // tenta refresh uma vez e repete a chamada
  async function authed(path, body) {
    // modo local (2026-10-30): cofre e rotas do Bonto pausados sem supabase
    // (o vínculo/prova precisa dele; servidor negaria de todo jeito).
    try { if(typeof localMode !== "undefined" && localMode){ var eL = new Error("modo local: cofre pausado sem supabase"); eL.code = "modo-local"; throw eL; } } catch(e){ if(e && e.code==="modo-local") throw e; }
    const s = lsLoad();
    if (!s) throw new Error("sem-login");
    try {
      return await call(path, body, s.access);
    } catch (e) {
      if (String((e && e.code) || "") !== "auth" || !s.refresh) throw e;
      const r = await call("/api/refresh", { refresh: s.refresh });
      if (!r || !r.ok || !r.pair) throw e;
      lsSave({ access: r.pair.access, refresh: r.pair.refresh });
      return await call(path, body, r.pair.access);
    }
  }

  async function loginBackend(nick, password, zcap) {
    // espelha o botão único "criar / entrar": registra (com prova Supabase),
    // se já existe loga e tenta vincular (/api/link, best-effort).
    let j = null;
    const sbToken = await sbTokenNow();
    try {
      const body = { nick, password, sbToken };
      if (zcap) body.zcap = String(zcap).slice(0, 120);
      j = await call("/api/register", body);
    } catch (e) {
      if (String((e && e.code) || "") !== "existe") throw e;
      j = await call("/api/login", { nick, password });
      // conta pré-vínculo: vincula agora (falha = nick de outro dono).
      // Salva a sessão ANTES (o /api/link é autenticado no Bonto).
      if (j && j.ok && j.pair) lsSave({ access: j.pair.access, refresh: j.pair.refresh });
      try {
        const lr = await call("/api/link", { sbToken: await sbTokenNow() });
        if (j) j.linked = !!(lr && lr.ok);
        if (j && !(lr && lr.ok)) j.linkErr = "sem-vinculo";
      } catch (le) { if (j) j.linkErr = String((le && le.code) || "sem-vinculo"); }
    }
    if (j && j.ok && j.pair) lsSave({ access: j.pair.access, refresh: j.pair.refresh });
    return j;
  }

  async function sbTokenNow() {
    try {
      if (typeof window.sbGetToken === "function") {
        const t = await window.sbGetToken();
        if (t) return String(t).slice(0, 8000);
      }
    } catch (e) {}
    return "";
  }

  async function linkAccount() {
    const t = await sbTokenNow();
    if (!t) throw new Error("sem-login-site");
    return authed("/api/link", { sbToken: t });
  }

  async function logoutBackend(all) {
    const s = lsLoad();
    try { if (s && s.refresh) await call("/api/logout", { refresh: s.refresh, all: all ? 1 : 0 }); } catch (e) {}
    lsClear();
  }

  async function loginOnly(nick, password) {
    // só /api/login (sem register, sem captcha): p/ assumir conta que já
    // existe no servidor novo durante a migração (retry ou conta antiga).
    const j = await call("/api/login", { nick, password });
    if (j && j.ok && j.pair) lsSave({ access: j.pair.access, refresh: j.pair.refresh });
    return j;
  }

  /* Cofre (ownzip) exige prova de senha <10min (needFresh no servidor; refresh
     NÃO renova). Fluxo quando ownzip* devolve "sem-recent-auth":
       if (ZunBackend.needsFresh(err)) await ZunBackend.confirmPassword(senha);
     confirmPassword refaz /api/login com o nick da sessão atual (renova u.pw
     no servidor) sem trocar de conta. */
  function needsFresh(err) {
    return String((err && err.code) || err || "") === "sem-recent-auth";
  }
  async function confirmPassword(password) {
    const m = await authed("/api/me").catch(function () { return null; });
    const nick = (m && (m.nick || (m.user && m.user.n))) || "";
    if (!nick) throw new Error("sem-login");
    return loginOnly(nick, password);
  }

  // GET autenticado que devolve o Response cru (p/ download binário — o
  // call() acima só entende JSON). 401 com refresh válido gira o par 1x.
  async function authedRaw(path) {
    const b = base();
    if (!b) throw new Error("backend-off");
    cbCheck();
    try { if(typeof localMode !== "undefined" && localMode){ var eR = new Error("modo local: cofre pausado sem supabase"); eR.code = "modo-local"; throw eR; } } catch(e){ if(e && e.code==="modo-local") throw e; }
    let s = lsLoad();
    if (!s) throw new Error("sem-login");
    async function once(access) {
      let r;
      try {
        r = await fetch(b + path, { headers: { Authorization: "Bearer " + access } });
      } catch (e) {
        cbNote(false);
        const ne = new Error("bonto-fora"); ne.code = "bonto-fora"; throw ne;
      }
      if (r.status === 401) { const e = new Error("auth"); e.code = "auth"; throw e; }
      if (!r.ok) { const e = new Error("http" + r.status); e.code = "http" + r.status; throw e; }
      cbNote(true);
      return r;
    }
    try {
      return await once(s.access);
    } catch (e) {
      if (String((e && e.code) || "") !== "auth" || !s.refresh) throw e;
      const r = await call("/api/refresh", { refresh: s.refresh });
      if (!r || !r.ok || !r.pair) throw e;
      lsSave({ access: r.pair.access, refresh: r.pair.refresh });
      return await once(r.pair.access);
    }
  }

  /* Cofre do dono (server #5): ZIP via API, só a conta dona (OWNER_NICK no
     servidor). Sem UI no repo de propósito (painel do dono mora no dono.js
     local): use no console logado como dono, ou chame do dono.js. */
  function fileToB64(file) {
    return new Promise(function (ok, no) {
      try {
        const fr = new FileReader();
        fr.onload = function () {
          try {
            const s = String(fr.result || "");
            const i = s.indexOf("base64,");
            ok(i >= 0 ? s.slice(i + 7) : s);
          } catch (e) { no(e); }
        };
        fr.onerror = function () { no(new Error("leitura")); };
        fr.readAsDataURL(file);
      } catch (e) { no(e); }
    });
  }
  async function ownzipUpload(file) {
    const f = file;
    if (!f) throw new Error("arquivo");
    if (!/\.zip$/i.test(String(f.name || ""))) throw new Error("tipo");
    if (f.size > 8 * 1048576) throw new Error("grande");
    const b64 = await fileToB64(f);
    // Resposta inclui `keys:[{id,key}]` (plaintext 1x) + `keyNote`: guarde na hora.
    // Cada upload gera set novo e invalida o anterior (rotação); cada teste queima 1.
    return authed("/api/ownzip", { b64 });
  }
  async function ownzipMeta() {
    return authed("/api/ownzip-meta");
  }
  // Lista chaves SEM plaintext: [{id,used,at,usedAt}] + seq (dono, fresh).
  async function ownzipKeys() {
    return authed("/api/ownzip-keys");
  }
  // Queima 1 chave no teste: {id,key} -> {ok:1,id,usedAt}. Reuso dá 403 "chave".
  async function ownzipTest(id, key) {
    return authed("/api/ownzip-test", { id: String(id || "").slice(0, 16), key: String(key || "").slice(0, 80) });
  }
  async function ownzipDownload() {
    const r = await authedRaw("/api/ownzip");
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = "own.zip";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { try { URL.revokeObjectURL(url); a.remove(); } catch (e) {} }, 4000);
    } catch (e) {
      try { URL.revokeObjectURL(url); } catch (e2) {}
      throw e;
    }
    return { ok: 1, size: blob.size };
  }

  /* Keepalive (2026-10-30, pedido do dono): o free tier do Bonto dorme
     após 30min parado — sem isso ele apaga no meio do uso. Enquanto alguém
     está com o app aberto, pingamos GET /health (público, sem auth, sem
     dado, sem cookie) a cada ~18min (+jitter) p/ ele não dormir. Sem
     visitante o Bonto dorme DE PROPÓSITO (75h/mês no grátis) e a 1ª
     chamada acorda (retry 3x no call() acima) — NÃO usar pinger externo
     24/7 no plano grátis (estoura a quota em ~3 dias). Sem UI, sem som;
     falha silenciosa (só console.debug). */
  var KA_INTERVAL = 18 * 60 * 1000, KA_JITTER = 2 * 60 * 1000,
      KA_FIRST = 10000, KA_TIMEOUT = 20000;
  var kaTimer = null, kaLast = 0, kaLastOk = 0, kaLastErr = "", kaFails = 0, kaBusy = false, kaLastHttp = 0;

  // Ping leve: GET /health público. Devolve true (acordado) / false
  // (dormindo/errou) — nunca joga, exceto backend-off (sem URL setada).
  // Exige corpo com "ok" (quota estourada costuma devolver 200 com página
  // de suspensão em HTML — sem isso o keepalive "acordaria" à toa).
  async function ping() {
    var b = base();
    if (!b) throw new Error("backend-off");
    var ctl = new AbortController();
    var to = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, KA_TIMEOUT);
    var ok = false;
    try {
      var r = await fetch(b + "/health", { method: "GET", signal: ctl.signal, cache: "no-store", credentials: "omit" });
      kaLastHttp = r.status | 0;
      var t = "";
      try { t = await r.text(); } catch (e) {}
      ok = !!r.ok && t.indexOf('"ok"') >= 0;
    } catch (e) {
      ok = false; // dormindo, fora do ar ou sem rede — keepalive registra e tenta depois
    } finally { clearTimeout(to); }
    cbNote(ok); // sonda do disjuntor: voltou a responder, ações voltam na hora
    return ok;
  }

  function kaSchedule(wait) {
    try { if (kaTimer) clearTimeout(kaTimer); } catch (e) {}
    kaTimer = null;
    if (!base()) return;
    if (wait === undefined) {
      wait = KA_INTERVAL + (Math.random() * 2 - 1) * KA_JITTER;
      if (kaFails > 0) wait = Math.min(wait, 60000 * Math.min(kaFails, 5));
    }
    kaTimer = setTimeout(kaOnce, Math.max(5000, wait));
  }

  async function kaOnce(force) {
    try { if (kaTimer) clearTimeout(kaTimer); } catch (e) {}
    kaTimer = null;
    if (kaBusy && !force) return null; // ciclo já em voo (aba voltou + timer) — não duplica
    if (!base()) return false;
    kaBusy = true;
    try { if (typeof navigator !== "undefined" && navigator.onLine === false) { kaBusy = false; kaSchedule(); return null; } } catch (e) {}
    kaLast = Date.now();
    var ok = false;
    try {
      ok = await ping();
      if (ok) { kaLastOk = kaLast; kaFails = 0; kaLastErr = ""; }
      else { kaFails++; kaLastErr = "http-ou-rede"; }
    } catch (e) {
      kaFails++;
      kaLastErr = String((e && e.message) || e).slice(0, 60);
      try { console.debug("[zunzum] Bonto keepalive: " + kaLastErr); } catch (e2) {}
    }
    kaBusy = false;
    kaSchedule();
    return ok;
  }

  function kaStart() {
    if (!base() || kaTimer) return !!base();
    kaSchedule(KA_FIRST);
    return true;
  }
  function kaStop() {
    try { if (kaTimer) clearTimeout(kaTimer); } catch (e) {}
    kaTimer = null;
  }
  function kaStatus() {
    return { running: !!kaTimer, configured: !!base(), lastPing: kaLast, lastOk: kaLastOk, fails: kaFails, lastErr: kaLastErr, lastHttp: kaLastHttp, breaker: (cbOpenUntil && Date.now() < cbOpenUntil) ? "open" : "closed" };
  }

  try {
    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", function () {
        try {
          if (!document.hidden && base() && Date.now() - kaLast > 10 * 60 * 1000) kaOnce();
        } catch (e) {}
      });
      window.addEventListener("online", function () {
        try { if (base() && Date.now() - kaLast > 60 * 1000) kaOnce(); } catch (e) {}
      });
    }
  } catch (e) {}
  try { setTimeout(function () { try { kaStart(); } catch (e) {} }, KA_FIRST); } catch (e) {}

  window.ZunBackend = {
    configured: () => !!base(),
    ping: ping,
    login: loginBackend,
    loginOnly: loginOnly,
    confirmPassword,
    needsFresh,
    link: linkAccount,
    logout: logoutBackend,
    me: () => authed("/api/me"),
    changePassword: (cur, nxt) => authed("/api/change-password", { currentPassword: cur, newPassword: nxt }),
    fetch: authed,
    ownzipUpload,
    ownzipMeta,
    ownzipKeys,
    ownzipTest,
    ownzipDownload,
    keepalive: function (action) {
      try {
        if (action === "stop") { kaStop(); return kaStatus(); }
        if (action === "now") { try { kaOnce(true); } catch (e) {} return kaStatus(); }
        if (action === "start") kaStart();
        return kaStatus();
      } catch (e) { return kaStatus(); }
    }
  };
})();
