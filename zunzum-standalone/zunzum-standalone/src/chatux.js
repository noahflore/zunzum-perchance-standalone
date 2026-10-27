/* zunzum chat-ux — Enter envia + autogrow + ergonomia mobile.
   Não mexe na lógica de envio do app.js: só dispara o botão existente. */
(function(){
"use strict";

function lsGet(k, d){ try{ var v = localStorage.getItem(k); return v == null ? d : v; }catch(e){ return d; } }
function lsSet(k, v){ try{ localStorage.setItem(k, v); }catch(e){} }

function enterOn(id){ return lsGet("zunEnter:" + id, "1") !== "0"; }
function paintTgl(input, box){
  try{
    var on = enterOn(input.id || input);
    box.checked = on;
    var hint = box.closest(".composerOpts");
    function tr2(s){ try{ if(window.zunzumTr) return window.zunzumTr(s); }catch(e){} return s; }
    if(hint){ var h = hint.querySelector("[data-enter-hint]"); if(h) h.textContent = on ? tr2("Enter envia · Shift+Enter quebra linha") : tr2("Enter quebra linha"); }
  }catch(e){}
}

function autogrow(ta){
  try{
    ta.style.height = "auto";
    var max = 120;
    try{ max = matchMedia("(max-width:900px)").matches ? 140 : 120; }catch(e){}
    ta.style.height = Math.min(ta.scrollHeight, max) + "px";
    ta.style.overflowY = ta.scrollHeight > max ? "auto" : "hidden";
  }catch(e){}
}

function keepFocus(el){
  try{
    if(matchMedia("(max-width:900px)").matches){
      /* no celular mantém o teclado aberto p/ mandar várias em sequência */
      setTimeout(function(){ try{ el.focus({preventScroll:true}); }catch(e){ try{ el.focus(); }catch(e2){} } }, 60);
    } else {
      try{ el.focus({preventScroll:true}); }catch(e){ try{ el.focus(); }catch(e2){} }
    }
  }catch(e){}
}

function wireChat(inputId, btnId, tglId){
  var input = document.getElementById(inputId);
  var btn = document.getElementById(btnId);
  var tgl = tglId ? document.getElementById(tglId) : null;
  if(!input || input._zxWired) return;
  input._zxWired = true;
  try{ input.setAttribute("enterkeyhint", "send"); }catch(e){}
  if(tgl) paintTgl(input, tgl);
  if(tgl) tgl.addEventListener("change", function(){
    lsSet("zunEnter:" + (input.id || input), tgl.checked ? "1" : "0");
    paintTgl(input, tgl);
    try{ input.focus(); }catch(e){}
  });

  if(/TEXTAREA/.test(input.tagName)){
    autogrow(input);
    input.addEventListener("input", function(){ autogrow(input); }, {passive:true});
  }

  input.addEventListener("keydown", function(ev){
    try{
      if(ev.key !== "Enter") return;
      if(ev.isComposing) return;
      var on = tgl ? tgl.checked : enterOn(input.id || input);
      if(ev.shiftKey){
        if(!on) return; /* shift+enter = newline quando enter-envia ligado */
        return; /* deixa quebrar linha */
      }
      if(!on) return; /* enter-envia desligado: enter quebra linha */
      ev.preventDefault();
      if(btn && !btn.disabled){
        try{ if(navigator.vibrate) navigator.vibrate(8); }catch(e){}
        btn.click();
        setTimeout(function(){ autogrow(input); }, 50);
      }
    }catch(e){}
  });

  /* depois de enviar, volta o foco p/ continuar digitando (gostoso no celular) */
  if(btn && !btn._zxFocus){
    btn._zxFocus = true;
    btn.addEventListener("click", function(){
      setTimeout(function(){
        try{ autogrow(input); }catch(e){}
        keepFocus(input);
      }, 120);
    });
  }

  /* emoji picker + botão GIF da galera */
  try{
    var eb = document.getElementById(inputId === "pubInput" ? "pubEmojiBtn" : inputId === "privMsgInput" ? "privEmojiBtn" : "");
    if(eb && !eb._zxWired){
      eb._zxWired = true;
      eb.addEventListener("click", function(ev){
        ev.stopPropagation();
        var wasOpen = false;
        try{ var p = document.getElementById("zEmojiPanel"); wasOpen = !!(p && !p.hidden); }catch(e){}
        try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(input); }catch(e){}
        try{
          var mob = matchMedia("(max-width:900px)").matches;
          if(!mob){ try{ input.focus(); }catch(e2){} }
          else{
            /* mobile: abrir esconde o teclado p/ o painel aparecer; fechar devolve o foco */
            var nowOpen = false;
            try{ var p2 = document.getElementById("zEmojiPanel"); nowOpen = !!(p2 && !p2.hidden); }catch(e3){}
            if(!nowOpen){ try{ input.focus(); }catch(e4){} }
            else if(document.activeElement === input){ try{ input.blur(); }catch(e5){} }
          }
        }catch(e6){}
      });
    }
    var gb = document.getElementById(inputId === "pubInput" ? "pubGifBtn" : inputId === "privMsgInput" ? "privGifBtn" : "");
    if(gb && !gb._zxWired){
      gb._zxWired = true;
      gb.addEventListener("click", function(ev){
        ev.stopPropagation();
        try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(input, "gm"); }catch(e){}
        try{
          var mob2 = false;
          try{ mob2 = matchMedia("(max-width:900px)").matches; }catch(e2){}
          if(mob2 && document.activeElement === input){ try{ input.blur(); }catch(e3){} }
          else if(!mob2){ try{ input.focus(); }catch(e4){} }
        }catch(e5){}
      });
    }
  }catch(e){}
}

/* Enter nos replies do feed (input solto não envia sozinho) */
function wireReplies(){
  /* autogrow delegado p/ textareas de resposta do feed (criadas depois do boot) */
  try{
    document.addEventListener("input", function(ev){
      try{
        var t = ev.target;
        if(!t || t.tagName !== "TEXTAREA") return;
        if((t.placeholder||"").indexOf("responder") < 0) return;
        t.style.height = "auto";
        var mx = 120;
        t.style.height = Math.min(t.scrollHeight, mx) + "px";
        t.style.overflowY = t.scrollHeight > mx ? "auto" : "hidden";
      }catch(e){}
    }, {passive:true});
  }catch(e){}
  try{
    document.addEventListener("keydown", function(ev){
      try{
        if(ev.key !== "Enter" || ev.shiftKey || ev.isComposing) return;
        var t = ev.target;
        if(!t || t.tagName !== "INPUT") return;
        if(t.tagName === "TEXTAREA") return; /* reply dinâmico já trata Enter no app.js */
        if(t.id === "pubInput" || t.id === "privMsgInput" || t.id === "privInput" || t.id === "pubSearchInput") return;
        /* reply do feed: o botão enviar é o próximo irmão */
        var box = t.parentNode;
        if(!box) return;
        var btns = box.querySelectorAll("button");
        for(var i = 0; i < btns.length; i++){
          if(/enviar|responder/i.test(btns[i].textContent)){
            /* garante que é reply (tem data-pid por perto) */
            if(box.querySelector("[data-pid]") || (box.dataset && box.dataset.pid) || t.placeholder.indexOf("responder") >= 0){
              ev.preventDefault();
              btns[i].click();
              break;
            }
          }
        }
      }catch(e){}
    });
  }catch(e){}
}

/* attach toggle (📎 mostra/esconde arquivo+link p/ composer enxuto) */
function wireAttach(tglBtnId, rowId){
  try{
    var b = document.getElementById(tglBtnId), r = document.getElementById(rowId);
    if(!b || !r || b._zxWired) return;
    b._zxWired = true;
    function isMobile(){ try{ return matchMedia("(max-width:900px)").matches; }catch(e){ return false; } }
    function def(){ return isMobile(); } /* mobile começa recolhido; desktop aberto */
    if(!r._zxManual) r.hidden = def();
    b.addEventListener("click", function(){
      r.hidden = !r.hidden;
      r._zxManual = true;
      b.setAttribute("aria-expanded", String(!r.hidden));
    });
    try{
      var mq = matchMedia("(max-width:900px)");
      function onCh(){ if(!r._zxManual) r.hidden = def(); }
      if(mq.addEventListener) mq.addEventListener("change", onCh);
      else if(mq.addListener) mq.addListener(onCh);
    }catch(e){}
  }catch(e){}
}

/* picker (emoji/GIF da galera) p/ campos fora dos chats — feed, nodal, depoimento.
   Usa o mesmo painel global (ZunEmoji.toggleFor): a busca da seção "GIF da
   galera" filtra pelo nome e vale p/ todos os lugares. */
function wireGifFor(inputId, emojiBtnId, gifBtnId){
  try{
    var input = document.getElementById(inputId);
    if(!input) return;
    var eb = document.getElementById(emojiBtnId);
    if(eb && !eb._zxWired){
      eb._zxWired = true;
      eb.addEventListener("click", function(ev){
        ev.stopPropagation();
        try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(input); }catch(e){}
        try{
          var mob = false;
          try{ mob = matchMedia("(max-width:900px)").matches; }catch(e2){}
          if(!mob){ try{ input.focus(); }catch(e3){} }
          else if(document.activeElement === input){ try{ input.blur(); }catch(e4){} }
        }catch(e5){}
      });
    }
    var gb = document.getElementById(gifBtnId);
    if(gb && !gb._zxWired){
      gb._zxWired = true;
      gb.addEventListener("click", function(ev){
        ev.stopPropagation();
        try{ if(window.ZunEmoji) window.ZunEmoji.toggleFor(input, "gm"); }catch(e){}
        try{
          var mob2 = false;
          try{ mob2 = matchMedia("(max-width:900px)").matches; }catch(e2){}
          if(mob2 && document.activeElement === input){ try{ input.blur(); }catch(e3){} }
          else if(!mob2){ try{ input.focus(); }catch(e4){} }
        }catch(e5){}
      });
    }
  }catch(e){}
}

function boot(){
  wireChat("pubInput", "pubBtn", "pubEnterSend");
  wireChat("privMsgInput", "privSendBtn", "privEnterSend");
  wireAttach("pubAttachBtn", "pubAttachRow");
  wireAttach("privAttachBtn", "privAttachRow");
  wireReplies();
  wireGifFor("textInput", "feedEmojiBtn", "feedGifBtn");
  /* expõe p/ auditoria mobile */
  try{
    window.ZunMobile = window.ZunMobile || {};
    window.ZunMobile.keep = function(){
      try{
        var a = document.activeElement;
        if(a && /INPUT|TEXTAREA/.test(a.tagName)) autogrow(a);
      }catch(e){}
    };
  }catch(e){}
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
setTimeout(boot, 1500);
setTimeout(boot, 4000);
})();
