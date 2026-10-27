/* Tour de boas-vindas do zunzum — modal first-run com slides animados.
   Abre sozinho na 1ª visita (localStorage zunTourVisto), pode ser fechado,
   tem "não mostrar de novo" e reabre pelo botão ❓ ajuda no topo.
   Sem dependências, sem assets externos: as "gifs" são SVGs animados inline. */
(function(){
"use strict";
var FLAG = "zunTourVisto";
var cur = 0, built = false, modal = null, trackEl = null, dotsEl = null, countEl = null, noShowEl = null;

/* ---------- CSS ---------- */
function ensureCss(){
  if(document.getElementById("zunTourCss")) return;
  var st = document.createElement("style");
  st.id = "zunTourCss";
  st.textContent =
  "#tourModal{position:fixed;inset:0;background:rgba(20,40,70,.55);display:flex;align-items:center;justify-content:center;padding:12px;z-index:95;box-sizing:border-box}"+
  "#tourCard{background:#fff;border-radius:14px;max-width:460px;width:100%;max-height:92vh;max-height:92dvh;overflow-y:auto;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.35);position:relative;padding:18px 16px 14px;box-sizing:border-box}"+
  "#tourCloseBtn{position:absolute;top:8px;right:8px;border:1px solid #b6c9db;background:#eef4fb;color:#33507a;border-radius:8px;width:32px;height:32px;font-size:16px;cursor:pointer;line-height:1}"+
  "#tourCloseBtn:hover{background:#dbe7f5}"+
  "#tourArt{min-height:150px;display:flex;align-items:center;justify-content:center;margin:4px 0 8px}"+
  "#tourArt svg{width:200px;height:130px}"+
  "#tourTitle{font-size:18px;font-weight:bold;color:#33507a;margin:2px 0 6px}"+
  "#tourDesc{font-size:13.5px;line-height:1.55;color:#33475e;min-height:66px}"+
  "#tourDesc b{color:#1a3a5c}"+
  "#tourNav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}"+
  ".tourArrow{border:1px solid #b6c9db;background:#eef4fb;color:#33507a;border-radius:10px;min-width:52px;height:44px;font-size:22px;cursor:pointer;line-height:1;flex:none}"+
  ".tourArrow:hover:not(:disabled){background:#dbe7f5}"+
  ".tourArrow:disabled{opacity:.35;cursor:default}"+
  "#tourDots{display:flex;gap:6px;justify-content:center;flex:1;flex-wrap:wrap}"+
  "#tourDots button{width:11px;height:11px;border-radius:50%;border:1px solid #7a9cc4;background:#fff;padding:0;cursor:pointer}"+
  "#tourDots button.on{background:#3d6ea5}"+
  "#tourFoot{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;flex-wrap:wrap}"+
  "#tourNoShowLbl{font-size:12px;color:#5a6b80;display:flex;gap:5px;align-items:center;cursor:pointer}"+
  "#tourCtaBtn{background:#3d6ea5;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:bold;cursor:pointer}"+
  "#tourCtaBtn:hover{background:#2f5a88}"+
  "#tourCount{font-size:12px;color:#5a6b80}"+
  /* animações dos slides (loop = efeito gif) */
  ".tFloat{animation:tFloat 2.2s ease-in-out infinite}"+
  "@keyframes tFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}"+
  ".tPop{transform-box:fill-box;transform-origin:center;animation:tPop 1.8s ease-in-out infinite}"+
  ".tPop2{transform-box:fill-box;transform-origin:center;animation:tPop 1.8s ease-in-out .9s infinite}"+
  "@keyframes tPop{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.12);opacity:.85}}"+
  ".tType{animation:tType 2.4s ease-in-out infinite}"+
  "@keyframes tType{0%{width:8px}60%{width:104px}100%{width:8px}}"+
  ".tTypeS{animation:tTypeS 2.4s ease-in-out infinite}"+
  "@keyframes tTypeS{0%{width:8px}60%{width:56px}100%{width:8px}}"+
  ".tBlink{animation:tBlink 1s steps(2) infinite}"+
  "@keyframes tBlink{50%{opacity:0}}"+
  ".tFly{animation:tFly 2.6s ease-in-out infinite}"+
  "@keyframes tFly{0%{transform:translate(0,0) rotate(-6deg)}50%{transform:translate(26px,-12px) rotate(6deg)}100%{transform:translate(0,0) rotate(-6deg)}}"+
  ".tPulse{transform-box:fill-box;transform-origin:center;animation:tPulse 2s ease-in-out infinite}"+
  "@keyframes tPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}"+
  ".tBounce{animation:tBounce 1.4s ease-in-out infinite}"+
  ".tBounce.d2{animation-delay:.2s}.tBounce.d3{animation-delay:.4s}"+
  "@keyframes tBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}"+
  /* noite */
  "body.zun-night #tourCard{background:#23233a!important;color:#e6e8ff!important}"+
  "body.zun-night #tourTitle{color:#ffd97a!important}"+
  "body.zun-night #tourDesc{color:#cfd2ff!important}"+
  "body.zun-night #tourDesc b{color:#ffe9b0!important}"+
  "body.zun-night #tourCloseBtn,body.zun-night .tourArrow{background:#2a2a45!important;color:#cfd2ff!important;border-color:#3a3a5c!important}"+
  "body.zun-night #tourDots button{background:#2a2a45!important;border-color:#7a7ab0!important}"+
  "body.zun-night #tourDots button.on{background:#ffd97a!important}"+
  "body.zun-night #tourCount,body.zun-night #tourNoShowLbl{color:#9a9ec7!important}"+
  ".tourSpot{border-radius:8px;animation:tourSpot 2.6s ease-out}"+
  "@keyframes tourSpot{0%,15%{box-shadow:0 0 0 4px rgba(211,51,51,.85)}70%{box-shadow:0 0 0 4px rgba(211,51,51,.85)}100%{box-shadow:0 0 0 0 rgba(211,51,51,0)}}";
  document.head.appendChild(st);
}

/* ---------- slides ---------- */
function svg1(){
  return '<svg viewBox="0 0 200 130" aria-hidden="true">'
  +'<rect x="35" y="18" width="130" height="84" rx="10" fill="#e8eef7" stroke="#33507a" stroke-width="3"/>'
  +'<rect x="35" y="18" width="130" height="24" rx="10" fill="#33507a"/><rect x="35" y="32" width="130" height="10" fill="#33507a"/>'
  +'<circle cx="46" cy="30" r="3.5" fill="#ff6b6b"/><circle cx="58" cy="30" r="3.5" fill="#ffd93b"/><circle cx="70" cy="30" r="3.5" fill="#6bff8f"/>'
  +'<text x="100" y="66" text-anchor="middle" font-size="19" font-weight="bold" fill="#3d6ea5" font-family="Verdana,sans-serif">zunzum</text>'
  +'<text x="100" y="86" text-anchor="middle" font-size="10" fill="#5a6b80" font-family="Verdana,sans-serif">orkut anos 2000 de volta</text>'
  +'<text x="30" y="40" font-size="15" class="tFloat">💬</text><text x="168" y="60" font-size="15" class="tFloat">💛</text>'
  +'<rect x="88" y="102" width="24" height="8" rx="2" fill="#7a9cc4"/></svg>';
}
function svg2(){
  return '<svg viewBox="0 0 200 130" aria-hidden="true">'
  +'<rect x="25" y="10" width="150" height="108" rx="10" fill="#fff" stroke="#b6c9db" stroke-width="2"/>'
  +'<circle cx="45" cy="30" r="10" fill="#7a9cc4"/><rect x="62" y="22" width="60" height="8" rx="4" fill="#dbe7f5"/><rect x="62" y="34" width="40" height="7" rx="3.5" fill="#eef4fb"/>'
  +'<rect x="35" y="50" width="130" height="1.5" fill="#dbe7f5"/>'
  +'<circle cx="45" cy="68" r="10" fill="#e8a0bf"/><rect x="62" y="60" width="60" height="8" rx="4" fill="#dbe7f5"/><rect x="62" y="72" width="48" height="7" rx="3.5" fill="#eef4fb"/>'
  +'<rect x="35" y="92" width="130" height="16" rx="8" fill="#e8f5e9" stroke="#6aa84f" stroke-width="1.5"/>'
  +'<rect x="43" y="97" height="6" rx="3" fill="#6aa84f" class="tType"/><rect x="150" y="97" width="6" height="6" fill="#6aa84f" class="tBlink"/></svg>';
}
function svg3(){
  return '<svg viewBox="0 0 200 130" aria-hidden="true">'
  +'<rect x="18" y="20" width="105" height="34" rx="12" fill="#e8eef7" stroke="#7a9cc4" stroke-width="2" class="tPop"/><text x="32" y="42" font-size="13" font-family="Verdana,sans-serif">oi gente! 👋</text>'
  +'<rect x="77" y="62" width="105" height="34" rx="12" fill="#d8ecff" stroke="#3d6ea5" stroke-width="2" class="tPop2"/><text x="91" y="84" font-size="13" font-family="Verdana,sans-serif">opa, cheguei!</text>'
  +'<text x="160" y="118" font-size="13" class="tFloat">💬</text><text x="24" y="116" font-size="13" class="tFloat">🎉</text></svg>';
}
function svg4(){
  return '<svg viewBox="0 0 200 130" aria-hidden="true">'
  +'<rect x="45" y="12" width="110" height="100" rx="12" fill="#fff8e1" stroke="#c78d00" stroke-width="2.5"/>'
  +'<circle cx="100" cy="42" r="16" fill="#ffd93b" stroke="#c78d00" stroke-width="2"/><circle cx="94" cy="39" r="2.4" fill="#3d2e00"/><circle cx="106" cy="39" r="2.4" fill="#3d2e00"/><path d="M92 49 Q100 55 108 49" stroke="#3d2e00" stroke-width="2" fill="none" stroke-linecap="round"/>'
  +'<rect x="62" y="66" width="76" height="16" rx="8" fill="#fff" stroke="#c78d00" stroke-width="1.5"/><rect x="68" y="71" height="6" rx="3" fill="#3d6ea5" class="tTypeS"/><rect x="130" y="71" width="6" height="6" fill="#3d6ea5" class="tBlink"/>'
  +'<rect x="72" y="88" width="56" height="14" rx="7" fill="#3d6ea5"/><text x="100" y="98.5" text-anchor="middle" font-size="9" fill="#fff" font-family="Verdana,sans-serif">nick + senha</text></svg>';
}
function svg5(){
  return '<svg viewBox="0 0 200 130" aria-hidden="true">'
  +'<g class="tFly"><rect x="30" y="45" width="52" height="36" rx="6" fill="#fff" stroke="#3d6ea5" stroke-width="2.5"/><path d="M30 50 L56 68 L82 50" stroke="#3d6ea5" stroke-width="2.5" fill="none"/></g>'
  +'<text x="120" y="70" font-size="30" class="tPulse">💌</text>'
  +'<text x="105" y="40" font-size="16" class="tBounce">⭐</text><text x="140" y="100" font-size="16" class="tBounce d2">💛</text><text x="160" y="40" font-size="16" class="tBounce d3">✨</text></svg>';
}
function svg6(){
  return '<svg viewBox="0 0 200 130" aria-hidden="true">'
  +'<circle cx="70" cy="62" r="30" fill="#e8eef7" stroke="#3d6ea5" stroke-width="2.5"/><circle cx="70" cy="52" r="10" fill="#7a9cc4"/><path d="M48 82 Q70 60 92 82" fill="#7a9cc4"/>'
  +'<rect x="108" y="30" width="60" height="14" rx="7" fill="#ffd93b" class="tPop"/><rect x="108" y="50" width="60" height="14" rx="7" fill="#ffb3c7" class="tPop2"/><rect x="108" y="70" width="60" height="14" rx="7" fill="#a8e6a3" class="tPop"/>'
  +'<text x="150" y="102" font-size="18" class="tFloat">🎨</text><text x="30" y="105" font-size="16" class="tFloat">📸</text></svg>';
}
function svg7(){
  return '<svg viewBox="0 0 200 130" aria-hidden="true">'
  +'<rect x="30" y="10" width="140" height="26" rx="9" fill="#6aa5d7"/>'
  +'<circle cx="152" cy="18" r="2.8" fill="#fff"/><circle cx="152" cy="23" r="2.8" fill="#fff"/><circle cx="152" cy="28" r="2.8" fill="#fff" class="tBlink"/>'
  +'<text x="45" y="28" font-size="12" font-weight="bold" fill="#fff" font-family="Verdana,sans-serif">zunzum</text>'
  +'<rect x="72" y="42" width="98" height="72" rx="9" fill="#fff" stroke="#6aa5d7" stroke-width="2"/>'
  +'<rect x="80" y="50" width="82" height="14" rx="7" fill="#e8eef7" class="tPop"/><rect x="80" y="68" width="82" height="14" rx="7" fill="#e8eef7"/><rect x="80" y="86" width="82" height="14" rx="7" fill="#e8eef7" class="tPop2"/>'
  +'<text x="70" y="118" font-size="13" class="tFloat">👆</text></svg>';
}
function slides(){
  return [
    {t:"👋 bem-vindo ao zunzum!", art:svg1(),
     d:"A rede com clima de <b>Orkut anos 2000</b>: feed, comunidades, depoimentos e bate-papo. <b>Sem email, grátis</b> e com carinha retrô. Passe as setas 👉 e veja como funciona."},
    {t:"📰 feed livre, sem conta", cta:{label:"ver o feed", go:["feed","feedCtn"]}, art:svg2(),
     d:"Dá pra <b>postar e ler o feed sem criar conta</b> — rapidinho, anônimo. Escreva, mande foto ou link e pronto. É o mural da galera."},
    {t:"💬 chat público #geral", cta:{label:"abrir o chat", go:["chats","pubBox"]}, art:svg3(),
     d:"O <b>bate-papo público</b> é a sala da galera: chegue, diga oi e converse ao vivo. Dá pra criar <b>salas públicas</b> e <b>privadas por código</b> também."},
    {t:"⋮ menu do topo (no celular)", cta:{label:"ver o menu ⋮", go:["topmenu","topMenuBtn"]}, art:svg7(),
     d:"No <b>computador</b> os botões do topo ficam à mostra; no <b>celular</b> eles moram no <b>⋮</b> — toque nele pra abrir bichinho, buscar, divulgar e ajuda. <b>Botão novo? Cai no ⋮ sozinho</b>, sem apertar nada. 👌"},
    {t:"👤 crie sua conta: só nick + senha", cta:{label:"criar meu nick", go:["conta","authBox",1]}, art:svg4(),
     d:"Conta aqui é moleza: <b>nick + senha, sem email</b>. Com ela você conversa no chat, ganha perfil próprio e desbloqueia o resto 👇"},
    {t:"🔓 com conta: DM, depoimento e mural", art:svg5(),
     d:"Logado você pode mandar <b>DM privada</b> p/ os amigos, <b>escrever e receber depoimentos</b> e deixar <b>scraps no mural</b> dos perfis — igualzinho ao Orkut."},
    {t:"🎨 personalize seu perfil", art:svg6(),
     d:"Foto, descrição, cores: seu <b>@nick vira sua casinha</b> no zunzum. Dá pra divulgar seu link e chamar os amigos. Bora? 💛"}
  ];
}

/* ---------- monta modal ---------- */
function build(){
  if(built) return;
  built = true;
  ensureCss();
  modal = document.createElement("div");
  modal.id = "tourModal";
  modal.hidden = true;
  modal.setAttribute("role","dialog");
  modal.setAttribute("aria-label","como funciona o zunzum");
  var card = document.createElement("div");
  card.id = "tourCard";
  var x = document.createElement("button");
  x.id = "tourCloseBtn"; x.textContent = "✕"; x.title = "fechar";
  x.onclick = close;
  card.appendChild(x);
  var art = document.createElement("div"); art.id = "tourArt"; card.appendChild(art);
  var title = document.createElement("div"); title.id = "tourTitle"; card.appendChild(title);
  var desc = document.createElement("div"); desc.id = "tourDesc"; card.appendChild(desc);
  var nav = document.createElement("div"); nav.id = "tourNav";
  var prev = document.createElement("button"); prev.className = "tourArrow"; prev.id = "tourPrevBtn";
  prev.textContent = "‹"; prev.title = "slide anterior"; prev.setAttribute("aria-label","slide anterior");
  prev.onclick = function(){ show(cur-1); };
  var dots = document.createElement("div"); dots.id = "tourDots"; dotsEl = dots;
  var next = document.createElement("button"); next.className = "tourArrow"; next.id = "tourNextBtn";
  next.textContent = "›"; next.title = "próximo slide"; next.setAttribute("aria-label","próximo slide");
  next.onclick = function(){ show(cur+1); };
  nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next);
  card.appendChild(nav);
  var foot = document.createElement("div"); foot.id = "tourFoot";
  var lbl = document.createElement("label"); lbl.id = "tourNoShowLbl";
  var cb = document.createElement("input"); cb.type = "checkbox"; noShowEl = cb;
  lbl.appendChild(cb); lbl.appendChild(document.createTextNode(" não mostrar de novo"));
  var count = document.createElement("span"); count.id = "tourCount"; countEl = count;
  var cta = document.createElement("button"); cta.id = "tourCtaBtn"; cta.hidden = true;
  foot.appendChild(lbl); foot.appendChild(count); foot.appendChild(cta);
  card.appendChild(foot);
  modal.appendChild(card);
  document.body.appendChild(modal);
  modal.addEventListener("click", function(ev){ if(ev.target===modal) close(); });
  document.addEventListener("keydown", function(ev){
    if(!modal || modal.hidden) return;
    if(ev.key==="Escape") close();
    else if(ev.key==="ArrowRight") show(cur+1);
    else if(ev.key==="ArrowLeft") show(cur-1);
  });
  var n = slides().length, i;
  for(i=0;i<n;i++){
    (function(idx){
      var d = document.createElement("button");
      d.title = "ir para o slide "+(idx+1);
      d.setAttribute("aria-label","ir para o slide "+(idx+1));
      d.onclick = function(){ show(idx); };
      dotsEl.appendChild(d);
    })(i);
  }
}
function show(i){
  var s = slides();
  if(i<0) i = 0;
  if(i>=s.length) i = s.length-1;
  cur = i;
  build();
  var sl = s[i];
  document.getElementById("tourArt").innerHTML = sl.art;
  document.getElementById("tourTitle").textContent = sl.t;
  document.getElementById("tourDesc").innerHTML = sl.d;
  var dots = dotsEl.children, k;
  for(k=0;k<dots.length;k++){ if(k===i) dots[k].classList.add("on"); else dots[k].classList.remove("on"); }
  countEl.textContent = (i+1)+"/"+s.length;
  document.getElementById("tourPrevBtn").disabled = (i===0);
  document.getElementById("tourNextBtn").disabled = (i===s.length-1);
  var cta = document.getElementById("tourCtaBtn");
  if(sl.cta){
    // CTA do ⋮ só existe no celular (no desktop o botão fica escondido).
    var isMenuCta = sl.cta.go && sl.cta.go[0]==="topmenu";
    var isMob = false;
    try{ isMob = document.body.classList.contains("zun-mobile"); }catch(e){}
    if(isMenuCta && !isMob){ cta.hidden = true; cta.onclick = null; }
    else {
      cta.hidden = false; cta.textContent = sl.cta.label+" →";
      (function(go){
        cta.onclick = function(){ goThere(go); };
      })(sl.cta.go);
    }
  } else if(i===s.length-1){
    cta.hidden = false; cta.textContent = "começar 🎉";
    cta.onclick = function(){ dismiss(true); };
  } else {
    cta.hidden = true; cta.onclick = null;
  }
  modal.hidden = false;
}
function goThere(go){
  var tab = go[0], elId = go[1];
  if(tab==="topmenu"){
    // ⋮ do topo: sem trocar de aba (não é aba do mobile) — abre o menu e destaca.
    dismiss(false);
    setTimeout(function(){
      try{ if(window.zunTopMenuOpen) window.zunTopMenuOpen(); }catch(e){}
      try{
        var el = document.getElementById(elId);
        if(!el) return;
        try{ el.scrollIntoView({behavior:"smooth", block:"nearest"}); }catch(e2){}
        el.classList.remove("tourSpot");
        void el.offsetWidth;
        el.classList.add("tourSpot");
        setTimeout(function(){ try{ el.classList.remove("tourSpot"); }catch(e3){} }, 2700);
      }catch(e2){}
    }, 120);
    return;
  }
  dismiss(false);
  try{ if(document.activeElement && document.activeElement.blur) document.activeElement.blur(); }catch(e){}
  try{
    if(document.body.classList.contains("zun-mobile") && window.zunMobileGo) window.zunMobileGo(tab);
  }catch(e){}
  setTimeout(function(){
    try{
      var el = document.getElementById(elId);
      if(!el) return;
      el.scrollIntoView({behavior:"smooth", block:"center"});
      var box = (el.closest && el.closest(".box")) || el;
      box.classList.remove("tourSpot");
      void box.offsetWidth;
      box.classList.add("tourSpot");
      setTimeout(function(){ try{ box.classList.remove("tourSpot"); }catch(e2){} }, 2700);
    }catch(e2){}
  }, 120);
}
function seen(){ try{ return localStorage.getItem(FLAG)==="1"; }catch(e){ return true; } }
function mark(){ try{ localStorage.setItem(FLAG,"1"); }catch(e){} }
function dismiss(fromCta){
  if(noShowEl && noShowEl.checked) mark();
  else if(fromCta) mark();
  close();
}
function close(){
  if(noShowEl && noShowEl.checked) mark();
  if(modal) modal.hidden = true;
}
function open(force){
  build();
  try{ if(noShowEl) noShowEl.checked = seen(); }catch(e){}
  show(0);
  if(force) mark();
}

/* ---------- botão ❓ no topo + auto-abrir ---------- */
function addBtn(){
  try{
    var bar = document.getElementById("topBtns");
    if(!bar || document.getElementById("tourBtn")) return;
    var b = document.createElement("button");
    b.id = "tourBtn"; b.title = "como funciona o site";
    b.innerHTML = "❓<span class='btn-txt'> ajuda</span>";
    b.onclick = function(){ open(false); };
    bar.appendChild(b);
  }catch(e){}
}
function termosPendente(){
  /* o Termo de Uso abre sozinho ~1,2s (z-index 120, acima do tour): se o
     tour abrisse junto, os dois modais competiam empilhados. Espera o termo
     sair de cena (aceito ou "agora não") antes de abrir. */
  try{
    if(document.getElementById("termosModal")) return true;
    try{ if(localStorage.getItem("zunzumTermosV1")==="1") return false; }catch(e){ return false; }
    return true;
  }catch(e){ return false; }
}
function tryOpen(){
  try{
    if(seen()) return;
    if(document.getElementById("migModal") && !document.getElementById("migModal").hidden) return;
    if(termosPendente()){
      var tries = 0;
      var iv = setInterval(function(){
        try{
          if(seen()){ clearInterval(iv); return; }
          if(!document.getElementById("termosModal")){ clearInterval(iv); if(!seen()) show(0); }
          else if(++tries > 90){ clearInterval(iv); }
        }catch(e){ try{ clearInterval(iv); }catch(e2){} }
      }, 1000);
      return;
    }
    show(0);
  }catch(e){}
}
function boot(){
  addBtn();
  if(seen()) return;
  setTimeout(tryOpen, 2000);
}
try{
  window.zunTourOpen = function(){ open(false); };
  if(document.readyState!=="loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
  setTimeout(addBtn, 3000);
  setTimeout(addBtn, 8000);
}catch(e){}
})();
