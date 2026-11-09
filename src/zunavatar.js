/* zunavatar — conserto de avatar quebrado (página do Pinterest salva como foto).
 *
 * Caso real (@purepetal): o avatar salvo era a PÁGINA do pin
 * (https://br.pinterest.com/pin/<id>/) e não a imagem direta. <img> com URL
 * de página nunca carrega: no chat/miniAv caía p/ a letra, no perfil ficava
 * o quadrado vazio, na lista de amigos o ícone quebrado.
 *
 * O que este arquivo faz (só exibição, NÃO muda o dado salvo):
 *  - detecta URL de pin (qualquer pinterest.* /pin/<id>) via zunIsPinPage()
 *  - resolve 1x p/ a imagem direta (i.pinimg.com/originals|736x...), testa
 *    o load, guarda em localStorage e troca o src de todo <img> quebrado
 *    (MutationObserver + varredura inicial: feed, chat, perfil, amigos, DM).
 *  - expõe zunResolvePin(url) p/ o aviso na hora de salvar (app.js): quem
 *    colar link de pin recebe a dica de usar o endereço direto da imagem.
 */
(function () {
  "use strict";
  /* Candidatas aceitam query string (?_=...) e o strip final tira também
     chaves/colchetes colados de CSS/JSON (caso real: "...png}.button_D"). */
  var PIN_RE = /https:\/\/i\.pinimg\.com\/[^\s"'\\]+/g;
  var PIN_OK = /^https:\/\/i\.pinimg\.com\/[A-Za-z0-9\/_.?&=;%+#-]+$/;
  function cleanPin(u) {
    return String(u || "").replace(/\\u0026/g, "&").replace(/[.,;:!?)\]}>]+$/, "");
  }
  function pinId(u) {
    try {
      var s = String(u || "");
      var m = s.match(/pinterest\.[a-z.]+\/pin\/(\d+)/i);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }
  function isPinPage(u) { return !!pinId(u); }
  function ck(id) { return "zunAvPin:" + id; }
  function cachedDirect(url) {
    var id = pinId(url);
    if (!id) return "";
    return cacheGet(id) || "";
  }
  function cacheGet(id) {
    try { return localStorage.getItem(ck(id)) || ""; } catch (e) { return ""; }
  }
  function cacheSet(id, v) {
    try { localStorage.setItem(ck(id), String(v).slice(0, 300)); } catch (e) {}
  }
  function pickDirect(html) {
    try {
      var set = {}, out = [];
      PIN_RE.lastIndex = 0;
      var m;
      while ((m = PIN_RE.exec(String(html || "")))) {
        var u = cleanPin(m[0]);
        if (!PIN_OK.test(u)) continue;
        if (set[u]) continue; set[u] = 1; out.push(u);
      }
      function pref(p) {
        for (var i = 0; i < out.length; i++) if (out[i].indexOf("/" + p + "/") >= 0) return out[i];
        return null;
      }
      return pref("originals") || pref("736x") || pref("564x") || pref("474x") || pref("236x") || out[0] || null;
    } catch (e) { return null; }
  }
  /* Worker primeiro (ZunOwn.fetchRaw passa no Pinterest; superFetch/direto
     caem em bloqueio/CORS). HTML grande volta em b64 — decodifica aqui. */
  function rawPage(url) {
    try {
      if (window.ZunOwn && window.ZunOwn.fetchRaw) {
        return window.ZunOwn.fetchRaw(url).then(function (j) {
          if (!j || !j.ok) return null;
          try {
            if (j.b64) {
              var bin = atob(String(j.text || "")), arr = new Uint8Array(bin.length), i;
              for (i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
              return new TextDecoder().decode(arr);
            }
            return String(j.text || "");
          } catch (e) { return null; }
        });
      }
    } catch (e) {}
    return Promise.resolve(null);
  }
  function legacyPage(url) {
    try {
      if (typeof root !== "undefined" && root.superFetch) return root.superFetch(url).then(function (r) { return r.text(); });
      if (typeof window.zunFetch === "function") return window.zunFetch(url).then(function (r) { return r.text(); });
      return fetch(url, { referrerPolicy: "no-referrer" }).then(function (r) { return r.text(); });
    } catch (e) { return Promise.reject(e); }
  }
  function fetchPage(url) {
    return rawPage(url).then(function (html) {
      if (html && html.length > 500) return html;
      return legacyPage(url);
    });
  }
  function testLoad(u) {
    return new Promise(function (res) {
      try {
        var im = new Image();
        var done = false;
        function fin(v) { if (!done) { done = true; res(v); } }
        im.onload = function () { fin(im.naturalWidth > 0); };
        im.onerror = function () { fin(false); };
        try { im.referrerPolicy = "no-referrer"; } catch (e) {}
        im.src = u;
        setTimeout(function () { fin(false); }, 8000);
      } catch (e) { res(false); }
    });
  }
  var pending = {};
  async function resolvePin(url) {
    var id = pinId(url);
    if (!id) return null;
    var c = cacheGet(id);
    if (c) return c;
    if (pending[id]) return pending[id];
    pending[id] = (async function () {
      try {
        var html = await fetchPage(String(url));
        if (!html || html.length < 500) return null;
        var cand = [];
        PIN_RE.lastIndex = 0;
        var m, seen = {};
        while ((m = PIN_RE.exec(html))) {
          var u = cleanPin(m[0]);
          if (!PIN_OK.test(u) || seen[u]) continue;
          seen[u] = 1; cand.push(u);
        }
        function pref(p) { for (var i = 0; i < cand.length; i++) if (cand[i].indexOf("/" + p + "/") >= 0) return cand[i]; return null; }
        var ordered = [pref("originals"), pref("736x"), pref("564x"), pref("474x"), pref("236x")].filter(Boolean);
        for (var j = 0; j < cand.length && ordered.length < 3; j++) if (ordered.indexOf(cand[j]) < 0) ordered.push(cand[j]);
        for (var k = 0; k < ordered.length; k++) {
          try { if (await testLoad(ordered[k])) { cacheSet(id, ordered[k]); return ordered[k]; } } catch (e) {}
        }
        return null;
      } catch (e) { return null; }
      finally { try { delete pending[id]; } catch (e2) {} }
    })();
    return pending[id];
  }
  function fixImg(img) {
    try {
      if (!img || img.tagName !== "IMG") return;
      if (img.dataset && img.dataset.zunPinDone) return;
      var s = img.currentSrc || img.src || "";
      if (!isPinPage(s)) return;
      if (img.dataset) img.dataset.zunPinDone = "1";
      var id = pinId(s);
      var c = id && cacheGet(id);
      if (c) { try { img.src = c; } catch (e) {} return; }
      resolvePin(s).then(function (d) {
        if (d && img.isConnected) { try { img.src = d; } catch (e) {} }
      }).catch(function () {});
    } catch (e) {}
  }
  function sweep(root) {
    try {
      var imgs = (root && root.querySelectorAll) ? root.querySelectorAll('img[src*="pinterest."]') : [];
      for (var i = 0; i < imgs.length; i++) fixImg(imgs[i]);
    } catch (e) {}
  }
  try {
    sweep(document);
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var mu = muts[i];
        if (mu.type === "attributes" && mu.target && mu.target.tagName === "IMG") { fixImg(mu.target); continue; }
        var nodes = mu.addedNodes || [];
        for (var j = 0; j < nodes.length; j++) {
          var n = nodes[j];
          if (!n) continue;
          if (n.tagName === "IMG") fixImg(n);
          else if (n.querySelectorAll) sweep(n);
        }
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
  } catch (e) {}
  try {
    window.zunIsPinPage = isPinPage;
    window.zunPinDirectCached = cachedDirect;
    window.zunResolvePin = resolvePin;
  } catch (e) {}
})();
