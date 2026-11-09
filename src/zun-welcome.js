/* zun-welcome.js — modal de boas-vindas CHAMATIVO, SÓ pro espelho (Neocities/GitHub).
   Paleta bunny 2026-11-04 (rosa dia #FFF7FB/#F896C8/#E664AE, roxo noite #17143B/#E7C8E7/#6A3E9A).
   NÃO vai no Perchance: o deploy é manual, só na cópia do Neocities.
   Mesmo se alguém colar a tag no Perchance por engano, o guarda abaixo
   impede execução lá (__onPerchance → return, zero mudança de comportamento).

   Deploy (só Neocities, ver LEIA.txt):
   1. subir este arquivo como src/zun-welcome.js no Neocities
   2. na CÓPIA do index.html que está no Neocities (NUNCA no workspace),
      colar antes de </body>:
        <script src="src/zun-welcome.js"></script>

   Regras p/ não prejudicar indexação (bots leem o HTML estático):
   - este modal nasce via JS DEPOIS do load: crawler sem JS nunca o vê;
     title/description/noscript/#seoBox do HTML estático ficam intactos;
   - não mostra em deep link (?perfil= ?sala= ?convite= ?ref= ?c=): quem veio
     de convite cai direto no conteúdo (menos bounce);
   - 1x a cada 7 dias por navegador (localStorage zunWelcomeAt), fecha fácil
     ([x], clique fora, Esc).
   - Ordem de entrada: aparece BEM DEPOIS do termo e das boas-vindas (tour) -
     espera os dois sairem de cena (aceito ou fechado) e conta +9s antes de
     mostrar. Se em 2min nao liberou, desiste (tenta na proxima visita). — nunca prende o visitante nem o bot com JS.
   - Idioma PT/EN/ES igual ao site (?lang= → localStorage zunzumLang →
     window.zunzumLang); tema de festa via vars --zf-* do body[data-zunfesta]. */
(function(){
"use strict";
try{
  if(window.__zunWelcomeLoaded) return; window.__zunWelcomeLoaded = true;
  /* Guarda-espelho: no Perchance, sai sem fazer nada. */
  var onPerchance = false;
  try{
    onPerchance = !!window.generatorPublicId ||
      /(^|\.)perchance\.org$/.test(String(location.hostname || ""));
  }catch(_h){}
  if(onPerchance) return;
  /* Robô de print (webdriver, ex. Neocities): sem modal — o print pegaria
     o popup em vez do site. Visita automatizada nunca é visitante real. */
  try{ if(navigator.webdriver === true) return; }catch(_w){}
  /* Só http(s) — preview file:// e teste não ganham modal. */
  try{ if(!/^https?:$/.test(location.protocol)) return; }catch(_p){ return; }
  /* Deep link (convite/perfil/sala): não interrompe. */
  try{
    var q = new URLSearchParams(location.search);
    if(q.get("perfil")||q.get("sala")||q.get("convite")||q.get("ref")||q.get("c")) return;
  }catch(_q){}
  /* 1x / 7 dias. */
  try{
    var last = parseInt(localStorage.getItem("zunWelcomeAt")||"0",10)||0;
    if(Date.now()-last < 7*86400*1000) return;
  }catch(_s){}

  /* Idioma: mesma ordem do i18n/seo-head (?lang= → zunzumLang → guardado). */
  var LANG = "pt";
  try{
    if(window.zunzumLang === "en" || window.zunzumLang === "es") LANG = window.zunzumLang;
    else{
      var ql = ""; try{ ql = String(new URLSearchParams(location.search).get("lang")||"").toLowerCase().slice(0,2); }catch(_e){}
      if(ql === "en" || ql === "es") LANG = ql;
      else{ try{ var st = String(localStorage.getItem("zunzumLang")||"").toLowerCase().slice(0,2); if(st === "en" || st === "es") LANG = st; }catch(_e2){} }
    }
  }catch(_l){}
  var T = {
    pt: { close:"fechar", aria:"Bem-vindo ao zunzum", stripe:"🐝 Bem-vindo ao zunzum!",
      sub:"<b>A rede da abelhinha</b> — nostalgia de Orkut anos 2000, anônima e sem email.",
      b1:"📰 <b>Feed livre</b> — poste sem criar conta",
      b2:"💬 <b>Bate-papo público</b> + salas privadas por código",
      b3:"👥 <b>Comunidades</b>, depoimentos e scraps",
      go:"📰 ver o feed", nick:"✨ criar meu nick", foot:"anônimo • sem email • grátis" },
    en: { close:"close", aria:"Welcome to zunzum", stripe:"🐝 Welcome to zunzum!",
      sub:"<b>The little-bee network</b> — nostalgic Orkut 2000s vibe, anonymous, no email.",
      b1:"📰 <b>Free feed</b> — post with no account",
      b2:"💬 <b>Public chat</b> + private rooms by code",
      b3:"👥 <b>Communities</b>, testimonials and scraps",
      go:"📰 see the feed", nick:"✨ create my nick", foot:"anonymous • no email • free" },
    es: { close:"cerrar", aria:"Bienvenido a zunzum", stripe:"🐝 ¡Bienvenido a zunzum!",
      sub:"<b>La red de la abejita</b> — nostalgia del Orkut años 2000, anónima y sin email.",
      b1:"📰 <b>Feed libre</b> — publica sin crear cuenta",
      b2:"💬 <b>Chat público</b> + salas privadas por código",
      b3:"👥 <b>Comunidades</b>, testimonios y scraps",
      go:"📰 ver el feed", nick:"✨ crear mi nick", foot:"anónimo • sin email • gratis" }
  }[LANG] || null;
  if(!T) T = {
      close:"fechar", aria:"Bem-vindo ao zunzum", stripe:"🐝 Bem-vindo ao zunzum!",
      sub:"<b>A rede da abelhinha</b> — nostalgia de Orkut anos 2000, anônima e sem email.",
      b1:"📰 <b>Feed livre</b> — poste sem criar conta",
      b2:"💬 <b>Bate-papo público</b> + salas privadas por código",
      b3:"👥 <b>Comunidades</b>, depoimentos e scraps",
      go:"📰 ver o feed", nick:"✨ criar meu nick", foot:"anônimo • sem email • grátis" };

  var CSS = ""
+"#zunWelcome{position:fixed;inset:0;background:rgba(20,40,70,.55);display:flex;align-items:center;justify-content:center;padding:16px;z-index:70;box-sizing:border-box}"
+"#zunWelcomeCard{background:#FFF7FB;border:3px solid #F896C8;border-radius:14px;box-shadow:8px 8px 0 #E664AE;max-width:440px;width:100%;max-height:88vh;overflow-y:auto;text-align:center;color:#111;animation:zunPop .35s cubic-bezier(.2,1.4,.4,1)}"
+"@keyframes zunPop{from{transform:scale(.8) translateY(20px);opacity:0}}"
+"#zunWelcomeStripe{background:linear-gradient(180deg,#FFF7FB 0%,#FFDAED 100%);border-bottom:2px solid #F896C8;border-radius:11px 11px 0 0;padding:10px 40px 10px 10px;font-weight:bold;font-size:17px;color:#7A1F4D;position:relative}"
+"#zunWelcomeX{position:absolute;top:6px;right:6px;width:28px;height:28px;border:2px solid #E664AE;border-radius:8px;background:#FFDAED;color:#7A1F4D;font-weight:bold;cursor:pointer;font-size:15px;line-height:1}"
+"#zunWelcomeX:hover{background:#F896C8;color:#fff}"
+"#zunWelcomeBee{font-size:52px;line-height:1;animation:zunBee 2s ease-in-out infinite}"
+"@keyframes zunBee{50%{transform:translateY(-8px) rotate(-8deg)}}"
+"#zunWelcomeBody{padding:12px 16px 16px;font-size:14px;line-height:1.55}"
+"#zunWelcomeBody ul{text-align:left;font-size:13px;line-height:1.8;margin:10px 0;padding-left:22px}"
+"#zunWelcomeBody b{color:#7A1F4D}"
+"#zunWelcomeCtas{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;justify-content:center}"
+"#zunWelcomeCtas button{border:2px solid #E664AE;border-radius:8px;box-shadow:2px 2px 0 #E664AE;font-weight:bold;cursor:pointer;padding:8px 14px;font-size:14px}"
+"#zunWelcomeGo{background:#E664AE;color:#fff}"
+"#zunWelcomeGo:hover{background:#F896C8}"
+"#zunWelcomeNick{background:#FFDAED;color:#7A1F4D}"
+"#zunWelcomeNick:hover{background:#F896C8;color:#fff}"
+"#zunWelcomeFoot{font-size:11px;opacity:.7;margin-top:10px}"
+"body.zun-night #zunWelcomeCard{background:#17143B!important;color:#E7C8E7!important;border-color:#6A3E9A!important;box-shadow:8px 8px 0 #6A3E9A!important}"
+"body.zun-night #zunWelcomeStripe{background:linear-gradient(180deg,#17143B 0%,#4A227B 100%)!important;color:#E7C8E7!important;border-bottom-color:#6A3E9A!important}"
+"body.zun-night #zunWelcomeBody b{color:#FFDD00!important}"
+"body.zun-night #zunWelcomeX{background:#4A227B!important;color:#E7C8E7!important;border-color:#9663C9!important}"
+"body.zun-night #zunWelcomeCtas button{background:#4A227B!important;color:#E7C8E7!important;border-color:#9663C9!important;box-shadow:2px 2px 0 #6A3E9A!important}"
+"body.zun-night #zunWelcomeGo{background:#C266A7!important;color:#fff!important;border-color:#9663C9!important}"
+"html body[data-zunfesta] #zunWelcomeCard{background:var(--zf-card,#4A227B)!important;color:var(--zf-ink,#E7C8E7)!important;border-color:var(--zf-line,#6A3E9A)!important;box-shadow:8px 8px 0 var(--zf-line,#6A3E9A)!important}"
+"html body[data-zunfesta] #zunWelcomeStripe{background:linear-gradient(180deg,var(--zf-ac,#C266A7) 0%,var(--zf-card,#4A227B) 100%)!important;color:var(--zf-on,#E7C8E7)!important;border-bottom-color:var(--zf-line,#6A3E9A)!important}"
+"html body[data-zunfesta] #zunWelcomeBody b{color:var(--zf-on,#E7C8E7)!important}"
+"html body[data-zunfesta] #zunWelcomeX{background:var(--zf-card,#4A227B)!important;color:var(--zf-ink,#E7C8E7)!important;border-color:var(--zf-line,#6A3E9A)!important}"
+"html body[data-zunfesta] #zunWelcomeCtas button{background:var(--zf-card,#4A227B)!important;color:var(--zf-ink,#E7C8E7)!important;border-color:var(--zf-line,#6A3E9A)!important;box-shadow:2px 2px 0 var(--zf-line,#6A3E9A)!important}"
+"html body[data-zunfesta] #zunWelcomeGo{background:var(--zf-ac,#C266A7)!important;color:var(--zf-on,#E7C8E7)!important;border-color:var(--zf-line,#6A3E9A)!important}"
+"@media(max-width:480px){#zunWelcomeCard{max-width:94vw}}";

  function close(save){
    try{
      var w = document.getElementById("zunWelcome");
      if(w && w.parentNode) w.parentNode.removeChild(w);
      if(save !== false){ try{ localStorage.setItem("zunWelcomeAt", String(Date.now())); }catch(_e){} }
    }catch(_c){}
  }

  function show(){
    try{
      if(document.getElementById("zunWelcome")) return;
      var st = document.createElement("style"); st.textContent = CSS;
      document.head.appendChild(st);
      var w = document.createElement("div"); w.id = "zunWelcome";
      w.setAttribute("role","dialog"); w.setAttribute("aria-label", T.aria);
      w.innerHTML = ""
      +'<div id="zunWelcomeCard">'
      +'<div id="zunWelcomeStripe">'+T.stripe+'<button id="zunWelcomeX" aria-label="'+T.close+'">✕</button></div>'
      +'<div id="zunWelcomeBody">'
      +'<div id="zunWelcomeBee">🐝</div>'
      + T.sub
      +'<ul><li>'+T.b1+'</li>'
      +'<li>'+T.b2+'</li>'
      +'<li>'+T.b3+'</li></ul>'
      +'<div id="zunWelcomeCtas"><button id="zunWelcomeGo">'+T.go+'</button>'
      +'<button id="zunWelcomeNick">'+T.nick+'</button></div>'
      +'<div id="zunWelcomeFoot">'+T.foot+'</div>'
      +'</div></div>';
      document.body.appendChild(w);
      document.getElementById("zunWelcomeX").onclick = function(){ close(true); };
      w.addEventListener("click", function(ev){ if(ev.target === w) close(true); });
      document.addEventListener("keydown", function esc(ev){
        if(ev.key === "Escape"){ close(true); document.removeEventListener("keydown", esc); }
      });
      document.getElementById("zunWelcomeGo").onclick = function(){
        close(true);
        try{
          var f = document.getElementById("feedCtn") || document.getElementById("postBox");
          if(f) f.scrollIntoView({behavior:"smooth", block:"start"});
        }catch(_e){}
      };
      document.getElementById("zunWelcomeNick").onclick = function(){
        close(true);
        try{
          var a = document.getElementById("authBox");
          if(a) a.scrollIntoView({behavior:"smooth", block:"start"});
        }catch(_e){}
      };
    }catch(_s){}
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ agendarBoasVindas(); });
  else agendarBoasVindas();
  var T0 = Date.now();
  function elAberto(id){ try{ var m = document.getElementById(id); if(!m) return false; if(m.hidden) return false; return true; }catch(_e){ return false; } }
  function ls1(k){ try{ return localStorage.getItem(k)==="1"; }catch(_e){ return false; } }
  function termosQuiet(){ try{ if(elAberto("termosModal")) return false; if(ls1("zunzumTermosV2")) return true; if(Date.now()-T0 < 8000) return false; return true; }catch(_e){ return true; } }
  function tourQuiet(){ try{ if(elAberto("tourModal")) return false; if(ls1("zunTourVisto")) return true; if(Date.now()-T0 < 8000) return false; return true; }catch(_e){ return true; } }
  function agendarBoasVindas(){ try{ var iv = setInterval(function(){ try{ if(Date.now()-T0 > 120000){ clearInterval(iv); return; } if(!termosQuiet()) return; if(!tourQuiet()) return; clearInterval(iv); setTimeout(show, 9000); }catch(_e){ try{ clearInterval(iv); }catch(_e2){} } }, 1000); }catch(_e){} }
}catch(e){}
})();
