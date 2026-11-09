/* ============================================================================
 * zunown.js — wrappers que preferem os endpoints próprios (Bonto) e caem
 * para os plugins perchance quando o backend não está configurado.
 * Ordem fácil -> difícil (#1 kv mora em src/zunkv.js):
 *   ZunOwn.fetchUrl(url)      #2 super-fetch-plugin -> POST /api/fetch
 *   ZunOwn.upload(blob)       #3 Storage `midia` -> POST /api/upload -> plugin
 *   ZunOwn.generateText(...)  #4 ai-text-plugin      -> POST /api/ai
 * Sem ZUN_BACKEND_URL (ou backend fora/erro): comportamento de hoje, 1:1.
 * ========================================================================== */
(function () {
  "use strict";
  function base() {
    try {
      var b = String(window.ZUN_BACKEND_URL || "").trim().replace(/\/+$/, "");
      return /^https:\/\//.test(b) ? b : "";
    } catch (e) { return ""; }
  }
  async function authed(path, body) {
    try {
      if (window.ZunBackend && window.ZunBackend.fetch) return await window.ZunBackend.fetch(path, body);
    } catch (e) { throw e; }
    throw new Error("backend-off");
  }
  function blobToB64(blob) {
    return new Promise(function (ok, no) {
      try {
        var fr = new FileReader();
        fr.onload = function () {
          try {
            var s = String(fr.result || "");
            var i = s.indexOf("base64,");
            ok(i >= 0 ? s.slice(i + 7) : s);
          } catch (e) { no(e); }
        };
        fr.onerror = function () { no(new Error("leitura")); };
        fr.readAsDataURL(blob);
      } catch (e) { no(e); }
    });
  }
  function fetchBase() {
    try {
      var w = String(window.ZUN_FETCH_URL || "").trim().replace(/\/+$/, "");
      if (/^https:\/\//.test(w)) return w;
    } catch (e) {}
    return "";
  }
  /* raw do proxy (Worker novo ou Bonto): {ok,status,ctype,text[,b64]} ou erro. */
  async function fetchRaw(url) {
    var u = String(url || "").slice(0, 2000);
    var w = fetchBase();
    if (w) {
      try {
        var ctl = null;
        try { ctl = new AbortController(); } catch (e) {}
        var to = 0;
        try { to = setTimeout(function () { try { ctl.abort(); } catch (e) {} }, 20000); } catch (e) {}
        var r = await fetch(w, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: u }), signal: ctl ? ctl.signal : undefined
        });
        try { clearTimeout(to); } catch (e) {}
        var j = await r.json();
        if (j && j.ok) return j;
      } catch (e) {}
    }
    var b = base();
    if (b) {
      try {
        var j2 = await authed("/api/fetch", { url: u });
        if (j2 && j2.ok) return j2;
      } catch (e) {}
    }
    return null;
  }
  /* #2 — fetch via proxy proprio; resposta imita superFetch ({text,blob,json})
     Ordem: Worker novo (ZUN_FETCH_URL, sem login) -> Bonto -> superFetch. */
  async function fetchUrl(url) {
    try {
      var j = await fetchRaw(url);
      if (j) {
        if (j.b64) {
          var bin = atob(j.text), arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          var blob = new Blob([arr], { type: j.ctype || "application/octet-stream" });
          return wrapResp(j, blob, "");
        }
        return wrapResp(j, new Blob([j.text || ""], { type: j.ctype || "text/plain" }));
      }
    } catch (e) {}
    try {
      if (typeof root !== "undefined" && root.superFetch) return root.superFetch(url);
    } catch (e) {}
    return fetch(url); // fora do perchance: fetch direto (sem proxy)
  }
  function wrapResp(j, blob, textStr) {
    var txt = (textStr == null) ? (j.b64 ? "" : String(j.text || "")) : String(textStr);
    return {
      _own: 1, ok: true, status: j.status || 200, ctype: j.ctype || "",
      headers: { get: function (n) { try { return /^content-type$/i.test(String(n || "")) ? (j.ctype || "") : null; } catch (e) { return null; } } },
      text: function () { return Promise.resolve(txt); },
      json: function () { try { return Promise.resolve(JSON.parse(txt)); } catch (e) { return Promise.reject(e); } },
      blob: function () { return Promise.resolve(blob); },
      arrayBuffer: function () {
        try {
          if (blob && blob.arrayBuffer) return blob.arrayBuffer();
          var s = txt, a = new Uint8Array(s.length);
          for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255;
          return Promise.resolve(a.buffer);
        } catch (e) { return Promise.reject(e); }
      }
    };
  }
  /* #3 — upload: Storage (Supabase `midia`) -> Bonto -> plugin.
     COFRE (own.zip) NUNCA passa por aqui (só via ownzip* do backend).
     Trava local: imagem >30MB e resto >10MB rejeita sem nem tentar rede. */
  async function upload(blobOrFile, opts) {
    try {
      var _b = blobOrFile;
      if (_b && _b.size) {
        var _t = String(_b.type || "").toLowerCase();
        if (_b.size > (/^image\//.test(_t) ? 31457280 : 10485760)) return { error: "grande" };
      }
    } catch (_e) {}
    /* 1. Supabase Storage (proprio, sem quota do Bonto). */
    try {
      if (window.ZunStore && window.ZunStore.upload) {
        var r = await window.ZunStore.upload(blobOrFile);
        if (r && r.url) return r;
        /* sem-banco (bucket/SQL ainda nao rodado): cai p/ o proximo.
           tipo/grande/erro real: devolve direto sem tentar Bonto. */
        if (r && r.error && r.error !== "sem-banco") return r;
      }
    } catch (e) {}
    var b = base();
    var blob = blobOrFile;
    if (b && blob) {
      try {
        var mime = String(blob.type || "").toLowerCase();
        var b64 = await blobToB64(blob);
        var j = await authed("/api/upload", { mime: mime, b64: b64 });
        if (j && j.ok) return { url: j.url, size: j.size, own: 1 };
        throw new Error((j && j.err) || "upload");
      } catch (e) { /* cai p/ o plugin abaixo */ }
    }
    return root.uploadPlugin(blobOrFile, opts);
  }
  /* #4 — IA própria (HOJE o /api/ai responde sem-ia: cai p/ o plugin).
     Mesma assinatura do generateText (string ou {instruction,...}). */
  async function generateText(input) {
    var b = base();
    if (b) {
      try {
        var prompt = typeof input === "string" ? input
          : String(((input && input.instruction) || ""));
        if (typeof input !== "string" && input && input.instruction && typeof input.instruction !== "string") {
          prompt = "[multimodal: use o plugin]";
          throw new Error("multimodal");
        }
        var j = await authed("/api/ai", { prompt: prompt.slice(0, 4000) });
        if (j && j.ok) {
          var t = String(j.text || "");
          try { if (input && typeof input.onChunk === "function") input.onChunk({ textChunk: t }); } catch (e) {}
          return t;
        }
        throw new Error((j && j.err) || "sem-ia");
      } catch (e) { /* cai p/ o plugin abaixo */ }
    }
    return root.generateText(input);
  }
  try {
    window.ZunOwn = {
      backend: base,
      configured: function () { return !!base(); },
      fetchBase: fetchBase,
      fetchRaw: fetchRaw,
      fetchUrl: fetchUrl,
      upload: upload,
      generateText: generateText
    };
  } catch (e) {}
})();
