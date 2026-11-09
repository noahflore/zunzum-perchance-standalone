/* zunstore.js — upload p/ Supabase Storage (bucket `midia`).
 * Fotos/gifs/arquivos do app (feed, chats, perfil, DM, nodal, gifmoji, busca).
 * O COFRE DO DONO (own.zip) NAO passa por aqui — continua no Bonto ownzip.
 *
 * Ordem de upload (ZunOwn.upload): Storage -> Bonto -> upload-plugin.
 * Sem bucket no ar (SQL ainda nao rodado): cai sozinho p/ o proximo.
 */
(function () {
  "use strict";
  var BUCKET = "midia";
  var EXT = {
    "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif",
    "image/webp": "webp", "video/mp4": "mp4", "video/webm": "webm",
    "audio/mpeg": "mp3", "audio/ogg": "ogg", "audio/mp4": "m4a"
  };
  var MAX_IMG = 31457280, MAX_OTHER = 10485760;
  function randHex(n) {
    try {
      var b = new Uint8Array(n), s = "", abc = "0123456789abcdef", i;
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
      else for (i = 0; i < n; i++) b[i] = Math.floor(Math.random() * 256);
      for (i = 0; i < n; i++) s += abc[b[i] % 16];
      return s;
    } catch (e) {
      var s2 = "", j;
      for (j = 0; j < n; j++) s2 += "0123456789abcdef"[Math.floor(Math.random() * 16)];
      return s2;
    }
  }
  function sbClientP() {
    try {
      if (window.__sb && window.__sb.client) return window.__sb.client();
    } catch (e) {}
    return Promise.reject(new Error("sem-sb"));
  }
  function check(blob) {
    try {
      if (!blob) return "vazio";
      var t = String(blob.type || "").toLowerCase();
      var ext = EXT[t];
      if (!ext) return "tipo";
      var max = (t.indexOf("image/") === 0) ? MAX_IMG : MAX_OTHER;
      if (blob.size > max) return "grande";
      if (/svg/i.test(t)) return "tipo";
      return "";
    } catch (e) { return "bad"; }
  }
  async function upload(blobOrFile) {
    var err = check(blobOrFile);
    if (err) return { error: err };
    var mime = String(blobOrFile.type || "").toLowerCase();
    var ext = EXT[mime];
    var path = "u/" + randHex(12) + "." + ext;
    var sb;
    try { sb = await sbClientP(); }
    catch (e) { return { error: "sem-banco" }; }
    try {
      var up = await sb.storage.from(BUCKET).upload(path, blobOrFile, {
        contentType: mime, upsert: false, cacheControl: "2592000"
      });
      if (up && up.error) {
        var m = String((up.error && (up.error.message || up.error.error)) || "");
        if (/bucket|not found|row-level|policy|permission|401|403/i.test(m))
          return { error: "sem-banco" };
        return { error: "erro" };
      }
      var pub = null;
      try { pub = sb.storage.from(BUCKET).getPublicUrl(path); } catch (e) { pub = null; }
      var url = pub && pub.data && pub.data.publicUrl;
      if (!url) return { error: "erro" };
      return { url: url, size: blobOrFile.size || 0, store: 1 };
    } catch (e) {
      var m2 = String((e && (e.message || e.code)) || "");
      if (/bucket|policy|permission|jwt|auth/i.test(m2)) return { error: "sem-banco" };
      return { error: "erro" };
    }
  }
  function configured() {
    try {
      if (window.sbConfigured) return !!window.sbConfigured();
      return !!(window.__sb && window.__sb.client);
    } catch (e) { return false; }
  }
  try {
    window.ZunStore = { bucket: BUCKET, upload: upload, configured: configured };
  } catch (e) {}
})();
