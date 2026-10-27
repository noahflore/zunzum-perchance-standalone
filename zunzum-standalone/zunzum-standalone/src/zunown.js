/* ============================================================================
 * zunown.js — wrappers que preferem os endpoints próprios (Bonto) e caem
 * para os plugins perchance quando o backend não está configurado.
 * Ordem fácil -> difícil (#1 kv mora em src/zunkv.js):
 *   ZunOwn.fetchUrl(url)      #2 super-fetch-plugin -> POST /api/fetch
 *   ZunOwn.upload(blob)       #3 upload-plugin      -> POST /api/upload
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
  /* #2 — fetch via proxy próprio; resposta imita superFetch ({text,blob,json}) */
  async function fetchUrl(url) {
    var b = base();
    if (b) {
      try {
        var j = await authed("/api/fetch", { url: String(url || "").slice(0, 2000) });
        if (j && j.ok) {
          if (j.b64) {
            var bin = atob(j.text), arr = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            var blob = new Blob([arr], { type: j.ctype || "application/octet-stream" });
            return wrapResp(j, blob, "");
          }
          return wrapResp(j, new Blob([j.text || ""], { type: j.ctype || "text/plain" }));
        }
        throw new Error((j && j.err) || "fetch");
      } catch (e) { /* cai p/ o plugin abaixo */ }
    }
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
  /* #3 — upload próprio; retorno {url, size} igual ao do upload-plugin */
  async function upload(blobOrFile, opts) {
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
      fetchUrl: fetchUrl,
      upload: upload,
      generateText: generateText
    };
  } catch (e) {}
})();
