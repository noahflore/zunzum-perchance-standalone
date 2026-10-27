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

  async function call(path, body, access) {
    const b = base();
    if (!b) throw new Error("backend-off");
    const headers = { "Content-Type": "application/json" };
    if (access) headers.Authorization = "Bearer " + access;
    // wake-up: o free tier do Bonto dorme após 30min parado — 1ª chamada acorda
    let r = null, lastErr = null;
    for (let i = 0; i < 3; i++) {
      try {
        r = await fetch(b + path, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
        break;
      } catch (e) { lastErr = e; await new Promise(ok => setTimeout(ok, 1500 * (i + 1))); }
    }
    if (!r) throw lastErr || new Error("rede");
    let j = null;
    try { j = await r.json(); } catch (e) { throw new Error("resposta"); }
    if (!r.ok) { const e = new Error((j && j.err) || ("http" + r.status)); e.code = (j && j.err) || ""; throw e; }
    return j;
  }

  // tenta refresh uma vez e repete a chamada
  async function authed(path, body) {
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

  // GET autenticado que devolve o Response cru (p/ download binário — o
  // call() acima só entende JSON). 401 com refresh válido gira o par 1x.
  async function authedRaw(path) {
    const b = base();
    if (!b) throw new Error("backend-off");
    let s = lsLoad();
    if (!s) throw new Error("sem-login");
    async function once(access) {
      const r = await fetch(b + path, { headers: { Authorization: "Bearer " + access } });
      if (r.status === 401) { const e = new Error("auth"); e.code = "auth"; throw e; }
      if (!r.ok) { const e = new Error("http" + r.status); e.code = "http" + r.status; throw e; }
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
    return authed("/api/ownzip", { b64 });
  }
  async function ownzipMeta() {
    return authed("/api/ownzip-meta");
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

  window.ZunBackend = {
    configured: () => !!base(),
    login: loginBackend,
    loginOnly: loginOnly,
    link: linkAccount,
    logout: logoutBackend,
    me: () => authed("/api/me"),
    changePassword: (cur, nxt) => authed("/api/change-password", { currentPassword: cur, newPassword: nxt }),
    fetch: authed,
    ownzipUpload,
    ownzipMeta,
    ownzipDownload
  };
})();
