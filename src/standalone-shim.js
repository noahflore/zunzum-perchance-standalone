/* zunzum standalone-shim.js — adaptador local (GitHub Pages).
 * Substitui os plugins do Perchance por implementacoes 100% no navegador:
 * - kv.* -> localStorage | upload -> dataURL local | editable -> localStorage
 * - superFetch -> fetch direto | generateText -> "" (IA indisponivel offline)
 * - commentsPlugin -> aviso offline | createServerSocket -> socket mudo
 * O app (src/app.js) ja tem localRpc/localDB/enterLocalMode; o shim so
 * garante window.root e entra em modo local assim que o app carrega. */
(function(){
  'use strict';
  try {
    window.ZUNZUM_STANDALONE = true;
    if(!window.generatorName) window.generatorName = 'zunzum';
    window.ZUNZUM_BASE = String(location.href).split(/[?#]/)[0];
    var PREFIX_KV = 'zunzumKv:', PREFIX_ED = 'zunzumEditable:';
    function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
    function lsSet(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
    function lsDel(k){ try{ localStorage.removeItem(k); }catch(e){} }
    function jget(k){ try{ var r = lsGet(k); return r == null ? null : JSON.parse(r); }catch(e){ return null; } }
    function makeFolder(prefix){
      return {
        get: function(k){ return Promise.resolve(jget(prefix + String(k))); },
        set: function(k,v){ lsSet(prefix + String(k), JSON.stringify(v)); return Promise.resolve(true); },
        delete: function(k){ lsDel(prefix + String(k)); return Promise.resolve(true); },
        getMany: function(ks){ var self = this; return Promise.all((ks||[]).map(function(k){ return self.get(k); })); },
        setMany: function(pairs){ var self = this; return Promise.all((pairs||[]).map(function(p){ return self.set(p[0], p[1]); })); },
        deleteMany: function(ks){ var self = this; return Promise.all((ks||[]).map(function(k){ return self.delete(k); })); },
        keys: function(){ var out = []; try{ for(var i=0;i<localStorage.length;i++){ var k = localStorage.key(i); if(k && k.indexOf(prefix) === 0) out.push(k.slice(prefix.length)); } }catch(e){} return Promise.resolve(out); },
        entries: function(){ var self = this; return self.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return self.get(k).then(function(v){ return [k, v]; }); })); }); },
        values: function(){ return this.entries().then(function(es){ return es.map(function(p){ return p[1]; }); }); },
        update: function(k, fn){ var self = this; return self.get(k).then(function(cur){ return fn(cur); }).then(function(nv){ return self.set(k, nv).then(function(){ return nv; }); }); }
      };
    }
    function dataUrlOf(blob){
      return new Promise(function(res, rej){
        try{
          var fr = new FileReader();
          fr.onload = function(){ res(String(fr.result || '')); };
          fr.onerror = function(){ rej(fr.error || new Error('read')); };
          fr.readAsDataURL(blob);
        }catch(e){ rej(e); }
      });
    }
    async function uploadShim(data){
      try{
        if(typeof data === 'string'){
          var b = new Blob([data], {type: 'text/plain;charset=utf-8'});
          return {url: await dataUrlOf(b), size: b.size};
        }
        if(data instanceof Blob){
          if(data.size > 25*1024*1024) return {error: 'file_too_big'};
          return {url: await dataUrlOf(data), size: data.size};
        }
        return {error: 'invalid_filetype'};
      }catch(e){ return {error: 'invalid_filetype'}; }
    }
    uploadShim.editable = {
      get: function(name){ return Promise.resolve(lsGet(PREFIX_ED + String(name))); },
      set: function(name, text){ lsSet(PREFIX_ED + String(name), String(text)); return Promise.resolve({ok: 1, editKey: 'local'}); }
    };
    function superFetchShim(url, opts){ return fetch(url, opts); }
    async function generateTextShim(){ return ''; }
    function commentsShim(){ return '<div class="meta">mural offline (versao standalone) — use os depoimentos do perfil acima.</div>'; }
    function createServerSocketShim(){
      return { opened: new Promise(function(){}), closed: Promise.resolve(), rpc: {},
        addEventListener: function(){}, removeEventListener: function(){},
        subscribe: function(){}, unsubscribe: function(){} };
    }
    window.root = {
      kv: new Proxy({}, {get: function(_, folder){ if(typeof folder !== 'string') return undefined; return makeFolder(PREFIX_KV + folder + ':'); }}),
      uploadPlugin: uploadShim, superFetch: superFetchShim, generateText: generateTextShim,
      commentsPlugin: commentsShim, createServerSocket: createServerSocketShim
    };
    var tries = 0;
    var iv = setInterval(function(){
      tries++;
      try{
        if(window.enterLocalMode){ try{ window.enterLocalMode(); }catch(e){} clearInterval(iv); }
        else if(tries > 200) clearInterval(iv);
      }catch(e){ clearInterval(iv); }
    }, 50);
  } catch(e){ try{ console.warn('standalone shim falhou', e); }catch(e2){} }
})();
