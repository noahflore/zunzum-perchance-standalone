/* zunfilebtn.js — botões de arquivo personalizados + traduzidos.
   Problema: <input type=file> mostra o botão nativo no idioma do navegador
   ("Escolher ficheiro", "Choose file"...) — sem tradução PT/EN/ES do site e
   sem o visual do tema. Este módulo esconde o input nativo e mostra no lugar
   um botão 📎 no padrão do site + nome do arquivo.
   - Mantém o MESMO <input> (mesmo id): o código que lê .files/.value segue igual.
   - Traduz via window.zunzumTr ("📎 escolher foto" / "📎 escolher arquivo" /
     "nenhum arquivo escolhido" / "remover" em src/i18n.js).
   - Funciona nos estáticos (feed, novo chat, privado, busca) e nos dinâmicos
     (foto de perfil, nodal, dono) via MutationObserver + sync por intervalo
     (limpezas por código com .value="" não disparam 'change').
   - Inputs hidden (DM .zun-file, GIF) já têm botão próprio 📎 — ignorados. */
(function(){
  "use strict";
  function T(s){
    try{ if(typeof window.zunzumTr === "function") return window.zunzumTr(s); }catch(e){}
    return s;
  }
  function labelFor(input){
    var acc = "";
    try{ acc = String(input.getAttribute("accept") || "").toLowerCase(); }catch(e){}
    if(!acc) return "📎 escolher arquivo";
    var isImg = acc.indexOf("image/") >= 0;
    var isMedia = acc.indexOf("video") >= 0 || acc.indexOf("audio") >= 0;
    if(isImg && !isMedia) return "📎 escolher foto";
    return "📎 escolher arquivo";
  }
  function fileName(input){
    try{
      var f = input.files && input.files[0];
      if(f && f.name) return f.name;
      var v = String(input.value || "");
      if(v){ var p = v.split(/[\/\\]/); return p[p.length-1] || ""; }
    }catch(e){}
    return "";
  }
  function syncOne(input){
    try{
      var w = input._zunfbWrap;
      if(!w || !w.isConnected) return;
      var btn = w.querySelector("[data-zunfb-btn]");
      if(btn){
        var lb = T(labelFor(input));
        if(btn.textContent !== lb) btn.textContent = lb;
        btn.title = T("anexar foto/vídeo/link");
        try{ btn.setAttribute("aria-label", lb); }catch(e){}
      }
      var nm = w.querySelector("[data-zunfb-name]");
      var cur = fileName(input);
      if(nm){
        var txt = cur || T("nenhum arquivo escolhido");
        if(nm.textContent !== txt) nm.textContent = txt;
        nm.title = cur || "";
      }
      var clr = w.querySelector("[data-zunfb-clear]");
      if(clr) clr.hidden = !cur;
    }catch(e){}
  }
  function syncAll(){
    try{
      var list = document.querySelectorAll("input[type=file]");
      for(var i=0;i<list.length;i++) syncOne(list[i]);
    }catch(e){}
  }
  function wrap(input){
    try{
      if(!input || input._zunfbWrap) return;
      if(input.tagName !== "INPUT" || input.type !== "file") return;
      // inputs hidden já têm gatilho próprio (DM .zun-attach, GIF) — não mexer
      if(input.hidden) return;
      try{
        var cs = getComputedStyle(input);
        if(cs && cs.display === "none") return;
      }catch(e){}
      if(!input.parentNode) return;
      // evita embrulhar 2x o mesmo (id repetido em clones)
      var wrapEl = document.createElement("span");
      wrapEl.className = "zun-filewrap";
      wrapEl.style.cssText = "display:inline-flex;gap:6px;align-items:center;max-width:100%;vertical-align:middle";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-zunfb-btn", "1");
      btn.textContent = T(labelFor(input));
      btn.title = T("anexar foto/vídeo/link");
      btn.onclick = function(){ try{ input.click(); }catch(e){} };
      var nm = document.createElement("span");
      nm.className = "meta";
      nm.setAttribute("data-zunfb-name", "1");
      nm.style.cssText = "font-size:11px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
      nm.textContent = T("nenhum arquivo escolhido");
      var clr = document.createElement("button");
      clr.type = "button";
      clr.setAttribute("data-zunfb-clear", "1");
      clr.textContent = "✕";
      clr.title = T("remover");
      clr.setAttribute("aria-label", T("remover"));
      clr.hidden = true;
      clr.onclick = function(){
        try{ input.value = ""; }catch(e){}
        syncOne(input);
        try{ input.dispatchEvent(new Event("change", {bubbles:true})); }catch(e2){}
      };
      input.parentNode.insertBefore(wrapEl, input);
      wrapEl.appendChild(btn);
      wrapEl.appendChild(nm);
      wrapEl.appendChild(clr);
      try{ input.hidden = true; }catch(e){}
      try{ input.style.margin = "0"; }catch(e){}
      input._zunfbWrap = wrapEl;
      wrapEl._zunfbInput = input;
      input.addEventListener("change", function(){ syncOne(input); });
      syncOne(input);
    }catch(e){}
  }
  function scan(root){
    try{
      var scope = root || document;
      if(scope.tagName === "INPUT" && scope.type === "file"){ wrap(scope); return; }
      var list = scope.querySelectorAll ? scope.querySelectorAll("input[type=file]") : [];
      for(var i=0;i<list.length;i++) wrap(list[i]);
    }catch(e){}
  }
  function init(){
    try{
      var st = document.createElement("style");
      st.textContent = ".zun-filewrap{max-width:100%}.zun-filewrap [data-zunfb-name]{flex:1 1 auto;min-width:0}";
      document.head.appendChild(st);
    }catch(e){}
    scan(document);
    try{
      var obs = new MutationObserver(function(muts){
        for(var i=0;i<muts.length;i++){
          var m = muts[i];
          if(m.type !== "childList") continue;
          for(var j=0;j<m.addedNodes.length;j++){
            var n = m.addedNodes[j];
            try{
              if(!n || n.nodeType !== 1) continue;
              scan(n);
            }catch(e){}
          }
        }
      });
      obs.observe(document.body, {childList:true, subtree:true});
    }catch(e){}
    try{ setInterval(syncAll, 1500); }catch(e){}
    try{ setTimeout(syncAll, 1000); setTimeout(syncAll, 3000); }catch(e){}
    try{ window.zunFileBtnRefresh = syncAll; }catch(e){}
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
