/* root-equiv.js — equivalente do main.pjs p/ o espelho (Neocities/GitHub).
   ATENÇÃO: NUNCA executar dentro do Perchance (o index.html só injeta este
   arquivo fora do perchance.org, via loader condicional). O `root` do engine
   é um proxy sensível: só de rodar este equiv nele, os imports
   generateText/commentsPlugin somem e o engine cospe `reading 'obj'` x4
   (quebra real verificada em 2026-11-02). Fora do Perchance, preenche SÓ o
   que falta, com o que dá p/ replicar sem backend do Perchance:
   - root.superFetch .... fetch direto (endpoints com CORS aberto funcionam)
   - root.kv ............ IndexedDB próprio, mesma API do kv-plugin
   - uploadPlugin.editable.get .. leitura pública via editable.uploads.dev
   - uploadPlugin.editable.set / uploadPlugin() .. erro resolvido (o contrato
     do plugin é nunca dar throw: quem chama checa `res.error` e segue)
   NÃO replica: generateText (IA), commentsPlugin (zunmural já cobre),
   $meta.dynamic (social-card é só Perchance). */
(function(){
"use strict";
try{
  var R = window.root;
  if(!R || typeof R !== "object"){ R = window.root = {}; }
  function fill(k, v){
    try{ if(R[k] === undefined || R[k] === null) R[k] = v; }catch(e){}
  }

  /* --- superFetch: mesma assinatura (url, opts) -> Response --- */
  fill("superFetch", function(u, o){ return fetch(u, o); });

  /* --- kv: IndexedDB próprio (structured clone: objetos/TypedArrays ok) --- */
  if(R.kv === undefined || R.kv === null){
    try{
      var DB = "zunzum-rootkv", STORE = "kv", _db = null;
      function db(){
        if(_db) return Promise.resolve(_db);
        return new Promise(function(res, rej){
          try{
            var q = indexedDB.open(DB, 1);
            q.onupgradeneeded = function(){ try{ q.result.createObjectStore(STORE); }catch(e){} };
            q.onsuccess = function(){ _db = q.result; res(_db); };
            q.onerror = function(){ rej(q.error); };
          }catch(e){ rej(e); }
        });
      }
      function tx(mode, fn){
        return db().then(function(d){
          return new Promise(function(res, rej){
            try{
              var t = d.transaction(STORE, mode), s = t.objectStore(STORE);
              fn(s);
              t.oncomplete = function(){ res(); };
              t.onerror = function(){ rej(t.error); };
              t.onabort = function(){ rej(t.error); };
            }catch(e){ rej(e); }
          });
        });
      }
      function folder(name){
        name = String(name || "x");
        function K(k){ return name + "/" + String(k); }
        function get1(k){
          return db().then(function(d){
            return new Promise(function(res, rej){
              try{
                var t = d.transaction(STORE, "readonly"), s = t.objectStore(STORE);
                var q = s.get(k);
                q.onsuccess = function(){ res(q.result === undefined ? undefined : q.result); };
                q.onerror = function(){ rej(q.error); };
              }catch(e){ rej(e); }
            });
          });
        }
        function all(){
          return db().then(function(d){
            return new Promise(function(res, rej){
              try{
                var t = d.transaction(STORE, "readonly"), s = t.objectStore(STORE);
                var out = [], cur = s.openCursor(), pre = name + "/";
                cur.onsuccess = function(){
                  var c = cur.result;
                  if(!c){ res(out); return; }
                  try{ if(String(c.key).indexOf(pre) === 0) out.push([String(c.key).slice(pre.length), c.value]); }catch(e){}
                  try{ c.continue(); }catch(e){ res(out); }
                };
                cur.onerror = function(){ rej(cur.error); };
              }catch(e){ rej(e); }
            });
          });
        }
        return {
          get: function(k){ return get1(K(k)); },
          set: function(k, v){ var kk = K(k); return tx("readwrite", function(s){ try{ s.put(v, kk); }catch(e){} }); },
          delete: function(k){ var kk = K(k); return tx("readwrite", function(s){ try{ s.delete(kk); }catch(e){} }); },
          setMany: function(pairs){
            var arr = pairs || [];
            return tx("readwrite", function(s){
              for(var i = 0; i < arr.length; i++){
                try{ s.put(arr[i][1], name + "/" + String(arr[i][0])); }catch(e){}
              }
            });
          },
          getMany: function(ks){
            var jobs = (ks || []).map(function(k){ return get1(K(k)); });
            return Promise.all(jobs);
          },
          deleteMany: function(ks){
            var arr = ks || [];
            return tx("readwrite", function(s){
              for(var i = 0; i < arr.length; i++){ try{ s.delete(name + "/" + String(arr[i])); }catch(e){} }
            });
          },
          entries: all,
          keys: function(){ return all().then(function(p){ return p.map(function(x){ return x[0]; }); }); },
          values: function(){ return all().then(function(p){ return p.map(function(x){ return x[1]; }); }); },
          update: function(k, fn){
            var kk = K(k);
            return get1(kk).then(function(cur){
              var nv = fn(cur);
              return tx("readwrite", function(s){ try{ s.put(nv, kk); }catch(e){} }).then(function(){ return nv; });
            });
          }
        };
      }
      var cache = {};
      R.kv = new Proxy({}, {
        get: function(t, f){
          if(typeof f !== "string") return undefined;
          if(f === "then") return undefined; /* não virar thenable */
          if(!cache[f]) cache[f] = folder(f);
          return cache[f];
        }
      });
    }catch(e){}
  }

  /* --- uploadPlugin: leitura pública real; escrita = erro resolvido --- */
  if(R.uploadPlugin === undefined || R.uploadPlugin === null){
    try{
      var NOPE = "espelho sem upload-plugin (só no Perchance)";
      R.uploadPlugin = function(){ return Promise.resolve({url:null, size:0, error:NOPE, deletionUrl:null}); };
      R.uploadPlugin.editable = {
        get: function(name){
          var gen = "";
          try{ gen = window.generatorName || "zunzum"; }catch(e){ gen = "zunzum"; }
          return fetch("https://editable.uploads.dev/file/" + encodeURIComponent(gen) + "/" + encodeURIComponent(String(name || "")), {cache:"no-store"}).then(function(r){
            if(r.status === 404) return null;
            if(!r.ok) throw new Error("http " + r.status);
            return r.text();
          });
        },
        set: function(){ return Promise.resolve({error:NOPE}); }
      };
    }catch(e){}
  }
}catch(e){}
})();
