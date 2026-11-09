/* rls-check.js — health-check de RLS/visibilidade (achado A4, auditoria 2026-10-28).
 *
 * SÓ LEITURA no modo automático: dois GETs anônimos no REST, nenhum write,
 * nenhum JWT, nenhum dado do usuário sai do navegador. Roda 1x sozinho (~8s
 * após o load, p/ não disputar o boot) e fica em silêncio a menos que algo
 * esteja errado E quem olha seja o dono (banner) — console.warn sempre, mas
 * console só quem abre devtools vê, e o conteúdo não tem PII (é estado
 * público do banco).
 *
 * O que checa:
 *  1. profiles_public (view da FASE 16): 200 = FASE aplicada; 404 = ainda não.
 *  2. profiles (tabela) via anon: linhas legíveis = pré-FASE 16 (esperado) ou
 *     REVOKE falhou (pós-FASE 16 = problema). 401/403/vazio = fail-closed OK.
 *
 * Probe de ESCRITA roda 1x no auto-check com filtro impossível + nome aleatório
 * (nunca altera nada) e sob demanda via `window.zunRlsWriteProbe()`.
 * tenta UPDATE/DELETE com filtro impossível em anon_claims (nunca altera nada;
 * usa anon aleatório por chamada). 2xx = permissão de escrita existe (ruim);
 * 4xx = negado (bom); 404/PGRST205 = tabela nem existe (neutro).
 */
(function () {
  "use strict";
  function base() {
    try {
      var u = String(window.ZUN_SUPABASE_URL || localStorage.getItem("ZUN_SUPABASE_URL") || "").trim().replace(/\/+$/, "");
      return /^https:\/\//.test(u) ? u : "https://rjvbfhkgbmzkilrysqrf.supabase.co";
    } catch (e) { return "https://rjvbfhkgbmzkilrysqrf.supabase.co"; }
  }
  function anonKey() {
    try {
      var k = String(window.ZUN_SUPABASE_KEY || localStorage.getItem("ZUN_SUPABASE_KEY") || "").trim();
      return k || "sb_publishable_Kd6t9TzD8uq4OFeyudbADw_Mf-JYmq8";
    } catch (e) { return "sb_publishable_Kd6t9TzD8uq4OFeyudbADw_Mf-JYmq8"; }
  }
  async function restGet(path) {
    var k = anonKey();
    var r = await fetch(base() + path, {
      headers: { apikey: k, Authorization: "Bearer " + k }
    });
    var j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    return { status: r.status, json: j };
  }
  function rowsOf(rr) {
    try { return Array.isArray(rr.json) ? rr.json.length : -1; } catch (e) { return -1; }
  }
  /* dono? compara o nick da sessão local com site_config.owner_nick (best-effort;
     nick do dono é público por desenho — ver server.js OWNER_NICK). */
  async function amOwner() {
    try {
      var cfg = await restGet("/rest/v1/site_config?select=value&key=eq.owner_nick&limit=1");
      var rows = (cfg.json && cfg.json) || [];
      var on = rows[0] && rows[0].value && rows[0].value.nick;
      if (!on) return false;
      var ln = "";
      try {
        var s = window.__zunGetSession ? window.__zunGetSession() : null;
        if (s && s.nick) ln = s.nick;
      } catch (e) {}
      if (!ln && window.sbClient) {
        try {
          var c = await window.sbClient();
          var gs = await c.auth.getSession();
          var u = gs && gs.data && gs.data.session && gs.data.session.user;
          if (u) {
            var pr = await c.from("profiles").select("nick").eq("user_id", u.id).limit(1).maybeSingle();
            if (pr && pr.data && pr.data.nick) ln = pr.data.nick;
          }
        } catch (e) {}
      }
      return !!ln && String(ln).toLowerCase() === String(on).toLowerCase();
    } catch (e) { return false; }
  }
  function ownerBanner(msg) {
    try {
      if (document.getElementById("zunRlsWarn")) return;
      var d = document.createElement("div");
      d.id = "zunRlsWarn";
      d.setAttribute("role", "alert");
      d.style.cssText = "position:fixed;left:10px;right:10px;bottom:10px;z-index:99999;background:#3a1503;color:#ffd9a0;border:1px solid #a33;font-size:13px;padding:10px 12px;border-radius:8px;box-shadow:0 4px 18px rgba(0,0,0,.5)";
      var t = document.createElement("span");
      t.textContent = "🛡️ RLs (só o dono vê este aviso): " + msg + " — rode o SQL da FASE 16 (src/supabase-fase16.sql). ";
      var x = document.createElement("button");
      x.textContent = "ocultar";
      x.style.marginLeft = "8px";
      x.onclick = function () { try { d.remove(); } catch (e) {} };
      d.appendChild(t); d.appendChild(x);
      document.body.appendChild(d);
    } catch (e) {}
  }
  async function autoCheck() {
    var rep = { ok: 1, view: -1, table: -1, note: "" };
    try {
      var v = await restGet("/rest/v1/profiles_public?select=nick&limit=1");
      rep.view = v.status;
      var t = await restGet("/rest/v1/profiles?select=nick&limit=1");
      rep.table = t.status;
      var viewOk = (v.status === 200);
      var tableRows = (t.status === 200) ? rowsOf(t) : 0;
      /* FASE 17: probe de escrita com filtro impossível + nome aleatório (nunca
         altera nada; detecta RLS desligado na anon_claims). */
      var w = null;
      try { w = await writeProbe(true); } catch (eW) { w = null; }
      rep.anonWrite = w;
      var anonOpen = !!(w && [w.update, w.delete].some(function (s) { return s >= 200 && s < 300; }));
      if (viewOk && tableRows <= 0 && !anonOpen) { rep.note = "fase16-ok"; return rep; } // tudo certo: silêncio
      rep.ok = 0;
      if (anonOpen) rep.note = "fase17-pendente: anon escreve em anon_claims (UPDATE/DELETE " + w.update + "/" + w.delete + ") — rode src/supabase-fase17.sql";
      else if (!viewOk && tableRows > 0) rep.note = "pre-fase16: tabela anon legível, view ainda não existe";
      else if (viewOk && tableRows > 0) rep.note = "fase16-parcial: view existe MAS a tabela segue legível p/ anon (REVOKE falhou?)";
      else rep.note = "leitura anon bloqueada mas sem view (RLS restritivo ou FASE 16 parcial)";
      try { console.warn("[zunzum] rls-check:", rep.note, rep); } catch (e) {}
      try { if (await amOwner()) ownerBanner(rep.note); } catch (e) {}
      return rep;
    } catch (e) { rep.ok = 0; rep.note = "erro-rede"; return rep; }
  }
  /* probe de escrita (filtro impossível + nome aleatório: nada é alterado mesmo
     se a permissão existir). Roda 1x no auto-check e sob demanda. */
  async function writeProbe(quiet) {
    var k = anonKey();
    var out = {};
    var probe = "zz-probe-" + Math.random().toString(36).slice(2, 10);
    var hdrs = { apikey: k, Authorization: "Bearer " + k, "Content-Type": "application/json", Prefer: "return=minimal" };
    try {
      var u = await fetch(base() + "/rest/v1/anon_claims?anon=eq." + encodeURIComponent(probe), {
        method: "PATCH", headers: hdrs, body: JSON.stringify({ tok_hash: "probe" })
      });
      out.update = u.status;
    } catch (e) { out.update = "erro-rede"; }
    try {
      var d = await fetch(base() + "/rest/v1/anon_claims?anon=eq." + encodeURIComponent(probe), {
        method: "DELETE", headers: hdrs
      });
      out.delete = d.status;
    } catch (e) { out.delete = "erro-rede"; }
    out.veredito = ([out.update, out.delete].some(function (s) { return s >= 200 && s < 300; }))
      ? "ESCRITA ANON PERMITIDA (ruim — rode a FASE 17: src/supabase-fase17.sql)"
      : "escrita anon negada (bom) ou tabela ausente (neutro)";
    if (!quiet) { try { console.warn("[zunzum] rls-write-probe:", out); } catch (e) {} }
    return out;
  }
  try {
    window.zunRlsWriteProbe = writeProbe;
    window.zunRlsCheck = autoCheck;
    setTimeout(function () { try { autoCheck(); } catch (e) {} }, 8000);
  } catch (e) {}
})();
