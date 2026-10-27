/* ============================================================================
 * zunkv.js — substituto próprio do kv-plugin (plugin #1, o mais fácil).
 *
 * Por que trocar: o kv-plugin é só um IndexedDB local com outro nome. Este
 * arquivo faz o mesmo com localStorage + fallback em memória, API compatível
 * com o subconjunto que o zunzum usa:
 *   ZunKV.folder("cache").get/set/delete/setMany/getMany/deleteMany/
 *   entries/keys/values/update
 * Valores: qualquer coisa JSON (objeto/string/número). Binário (TypedArray)
 * NÃO é suportado — o zunzum não guarda binário no kv (só {at,val} e texto).
 *
 * Troca transparente: onde era `root.kv.cache`, use `zunKV("cache")`, que
 * prefere o próprio e cai p/ o plugin se ele existir (rollback sem mexer).
 * ========================================================================== */
(function () {
  "use strict";
  var MEM = {}; // fallback quando localStorage falta/bloqueia (aba privada etc.)
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return (k in MEM) ? MEM[k] : null; } }
  function lsSet(k, v) {
    try { localStorage.setItem(k, v); return; } catch (e) {}
    try { MEM[k] = String(v); } catch (_e) {}
  }
  function lsDel(k) { try { localStorage.removeItem(k); } catch (e) {} try { delete MEM[k]; } catch (_e) {} }
  function lsKeys() {
    var out = [], i, k;
    try {
      for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (k != null) out.push(k); }
    } catch (e) {}
    for (k in MEM) if (Object.prototype.hasOwnProperty.call(MEM, k) && out.indexOf(k) < 0) out.push(k);
    return out;
  }
  function pre(folder) { return "zunkv:" + String(folder || "") + ":"; }
  function enc(v) { return JSON.stringify({ v: (v === undefined ? null : v) }); }
  function dec(s, dflt) {
    if (s == null) return dflt;
    try { var o = JSON.parse(s); return (o && "v" in o) ? o.v : dflt; } catch (e) { return dflt; }
  }
  function folder(name) {
    var p = pre(name);
    function full(k) { return p + String(k); }
    var api = {
      name: String(name),
      backend: "zunkv",
      get: async function (k) { return dec(lsGet(full(k)), undefined); },
      set: async function (k, v) { lsSet(full(k), enc(v)); },
      delete: async function (k) { lsDel(full(k)); },
      setMany: async function (pairs) {
        pairs = pairs || [];
        for (var i = 0; i < pairs.length; i++) lsSet(full(pairs[i][0]), enc(pairs[i][1]));
      },
      getMany: async function (keys) {
        keys = keys || [];
        return keys.map(function (k) { return dec(lsGet(full(k)), undefined); });
      },
      deleteMany: async function (keys) {
        keys = keys || [];
        for (var i = 0; i < keys.length; i++) lsDel(full(keys[i]));
      },
      entries: async function () {
        var ks = await api.keys(), out = [];
        for (var i = 0; i < ks.length; i++) out.push([ks[i], dec(lsGet(full(ks[i])), undefined)]);
        return out;
      },
      keys: async function () {
        var all = lsKeys(), out = [], i;
        for (i = 0; i < all.length; i++) if (all[i].indexOf(p) === 0) out.push(all[i].slice(p.length));
        return out;
      },
      values: async function () {
        var ks = await api.keys(), out = [];
        for (var i = 0; i < ks.length; i++) out.push(dec(lsGet(full(ks[i])), undefined));
        return out;
      },
      update: async function (k, fn) {
        var cur = dec(lsGet(full(k)), undefined);
        var nv = await fn(cur);
        lsSet(full(k), enc(nv));
        return nv;
      }
    };
    return api;
  }
  /* Mesma chamada do plugin (`kv.cache`), mas própria primeiro. */
  function zunKV(folderName) {
    try {
      if (typeof root !== "undefined" && root.kv && root.kv[folderName]) {
        var plug = root.kv[folderName];
        var own = folder(folderName);
        /* espelha escrita nos dois (migração sem perda); lê do próprio. */
        return {
          name: folderName, backend: "zunkv+kv",
          get: own.get,
          set: async function (k, v) { await own.set(k, v); try { await plug.set(k, v); } catch (e) {} },
          delete: async function (k) { await own.delete(k); try { await plug.delete(k); } catch (e) {} },
          setMany: async function (pairs) { await own.setMany(pairs); try { await plug.setMany(pairs); } catch (e) {} },
          getMany: own.getMany,
          deleteMany: async function (ks) { await own.deleteMany(ks); try { await plug.deleteMany(ks); } catch (e) {} },
          entries: own.entries, keys: own.keys, values: own.values,
          update: async function (k, fn) {
            var nv = await own.update(k, fn);
            try { await plug.set(k, nv); } catch (e) {}
            return nv;
          }
        };
      }
    } catch (e) {}
    return folder(folderName);
  }
  try {
    window.ZunKV = { folder: folder };
    window.zunKV = zunKV;
    /* atalhos seguros p/ os substitutos (ZunOwn cai p/ o plugin sozinho).
       Definidos aqui (primeiro script) p/ valerem em qualquer ordem de carga;
       se o plugin não existir, o comportamento é o mesmo de hoje (throw). */
    window.zunFetch = function (u) {
      try { if (window.ZunOwn && ZunOwn.fetchUrl) return ZunOwn.fetchUrl(u); } catch (e) {}
      return root.superFetch(u);
    };
    window.zunUpload = function (b, o) {
      try { if (window.ZunOwn && ZunOwn.upload) return ZunOwn.upload(b, o); } catch (e) {}
      return root.uploadPlugin(b, o);
    };
    window.zunText = function (i) {
      try { if (window.ZunOwn && ZunOwn.generateText) return ZunOwn.generateText(i); } catch (e) {}
      return root.generateText(i);
    };
  } catch (e) {}
})();
