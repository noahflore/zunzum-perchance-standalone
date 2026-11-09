/* zunwin.js — chrome de janela estilo lazer-bunny nos modais (barra de
   título com −/□/× SÓ DE EFEITO, paleta bunny em #zunWinCss).
   − minimiza de verdade (recolhe o corpo, clica de novo p/ voltar);
   □ dá um "pop" (efeito, não maximiza nada); × balança e avisa que é
   enfeite (feche pelo botão do app). Sem innerHTML (só createElement +
   textContent), sem rede, sem estado global além do DOM. */
(function(){
"use strict";
var IDS = ["searchCard", "profCard", "divulgarCard", "nodalCard", "tourCard"];
var TITLES = {
  searchCard:   {pt:"\uD83D\uDC1D busca",   en:"\uD83D\uDC1D search",   es:"\uD83D\uDC1D b\u00FAsqueda"},
  profCard:     {pt:"\uD83D\uDC1D perfil",  en:"\uD83D\uDC1D profile",  es:"\uD83D\uDC1D perfil"},
  divulgarCard: {pt:"\uD83D\uDCE2 divulgar",en:"\uD83D\uDCE2 share",    es:"\uD83D\uDCE2 difundir"},
  nodalCard:    {pt:"\uD83C\uDFF7\uFE0F nodal", en:"\uD83C\uDFF7\uFE0F nodal", es:"\uD83C\uDFF7\uFE0F nodal"},
  tourCard:     {pt:"\uD83D\uDC1D boas-vindas", en:"\uD83D\uDC1D welcome", es:"\uD83D\uDC1D bienvenida"},
  nf:           {pt:"\uD83E\uDDED ops",     en:"\uD83E\uDDED oops",     es:"\uD83E\uDDED ups"}
};
var TIPS = {
  min: {pt:"minimizar", en:"minimize", es:"minimizar"},
  max: {pt:"efeito (n\u00E3o maximiza)", en:"just an effect", es:"solo efecto"},
  x:   {pt:"s\u00F3 de enfeite \u2014 feche pelo bot\u00E3o do app", en:"just decoration \u2014 use the app close button", es:"solo decoraci\u00F3n \u2014 usa el bot\u00F3n de la app"}
};
function lang(){
  try{
    var l = String(window.zunzumLang || "pt").slice(0, 2).toLowerCase();
    return (l === "en" || l === "es") ? l : "pt";
  }catch(e){ return "pt"; }
}
function cleanTitle(t){
  /* o corretor (zunfix) pode ter carimbado inline branco numa fase em que o
     título estava ilegível (preto no preto, antes do inherit da festa).
     Como o elemento é nosso e a cor agora vem do CSS certo, limpa o carimbo
     UMA vez — na rechecagem o contraste passa e ele fica quieto. */
  try{ if(t && t.style) t.style.removeProperty("color"); }catch(e){}
  try{ if(t && t.removeAttribute){ t.removeAttribute("data-zun-broken"); t.removeAttribute("data-zun-why"); } }catch(e){}
}
function keyOf(card){
  try{
    if(card.classList && card.classList.contains("nfCard")) return "nf";
    if(card.id && TITLES[card.id]) return card.id;
  }catch(e){}
  return null;
}
function paint(card){
  try{
    var k = keyOf(card), l = lang();
    if(!k || !card._zunwin) return;
    cleanTitle(card._zunwin.title);
    /* botões −/□/×: limpa carimbo antigo do corretor (inline !important que
       grudava por cima do branco do noturno/festa) — igual ao cleanTitle.
       A isenção no zunfix impede carimbo novo. */
    try{
      [card._zunwin.bMin, card._zunwin.bMax, card._zunwin.bX].forEach(function(b){
        try{ if(b && b.style) b.style.removeProperty("color"); }catch(e){}
        try{ if(b && b.removeAttribute){ b.removeAttribute("data-zun-broken"); b.removeAttribute("data-zun-why"); } }catch(e){}
      });
    }catch(eBc){}
    card._zunwin.title.textContent = (TITLES[k] && TITLES[k][l]) || TITLES[k].pt;
    card._zunwin.bMin.title = TIPS.min[l];
    card._zunwin.bMin.setAttribute("aria-label", TIPS.min[l]);
    card._zunwin.bMax.title = TIPS.max[l];
    card._zunwin.bMax.setAttribute("aria-label", TIPS.max[l]);
    card._zunwin.bX.title = TIPS.x[l];
    card._zunwin.bX.setAttribute("aria-label", TIPS.x[l]);
  }catch(e){}
}
function bounce(card, cls){
  try{
    card.classList.remove(cls);
    void card.offsetWidth;
    card.classList.add(cls);
    setTimeout(function(){ try{ card.classList.remove(cls); }catch(e){} }, 500);
  }catch(e){}
}
function mkBtn(txt){
  var s = document.createElement("span");
  s.className = "zunwin-btn";
  s.setAttribute("role", "button");
  s.setAttribute("tabindex", "0");
  s.textContent = txt;
  return s;
}
function decorate(card){
  try{
    if(!card || card.nodeType !== 1) return;
    if(card.dataset && card.dataset.zunwin) return;
    if(card.tagName === "H3"){ decorateH3(card); return; }
    var k = keyOf(card);
    if(!k) return;
    var bar = document.createElement("div");
    bar.className = "zunwin-bar";
    bar.setAttribute("aria-hidden", "false");
    var title = document.createElement("span");
    title.className = "zunwin-title";
    var sp = document.createElement("span");
    sp.className = "zunwin-sp";
    var btns = document.createElement("span");
    btns.className = "zunwin-btns";
    var bMin = mkBtn("\u2212"), bMax = mkBtn("\u25A1"), bX = mkBtn("\u00D7");
    bMin.onclick = function(ev){ try{ ev.stopPropagation(); card.classList.toggle("zunwin-min"); }catch(e){} };
    bMax.onclick = function(ev){ try{ ev.stopPropagation(); bounce(card, "zunwin-pop"); }catch(e){} };
    bX.onclick = function(ev){ try{ ev.stopPropagation(); bounce(card, "zunwin-shake"); }catch(e){} };
    [bMin, bMax, bX].forEach(function(b, i){
      var fn = [function(){ try{ card.classList.toggle("zunwin-min"); }catch(e){} },
                function(){ bounce(card, "zunwin-pop"); },
                function(){ bounce(card, "zunwin-shake"); }][i];
      b.onkeydown = function(ev){ try{ if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); fn(); } }catch(e){} };
    });
    btns.appendChild(bMin); btns.appendChild(bMax); btns.appendChild(bX);
    bar.appendChild(title); bar.appendChild(sp); bar.appendChild(btns);
    card.insertBefore(bar, card.firstChild);
    try{ card.dataset.zunwin = "1"; }catch(e){}
    card._zunwin = {title: title, bMin: bMin, bMax: bMax, bX: bX};
    cleanTitle(title);
    paint(card);
  }catch(e){}
}
/* H3 de caixa vira a própria barra (título original continua vivo p/ i18n) */
function decorateH3(h3){
  try{
    if(h3.dataset && h3.dataset.zunwin) return;
    var box = null;
    try{ box = h3.closest ? h3.closest(".box") : h3.parentNode; }catch(e){ box = h3.parentNode; }
    if(!box) return;
    h3.classList.add("zunwin-bar");
    var t = document.createElement("span");
    t.className = "zunwin-title";
    while(h3.firstChild) t.appendChild(h3.firstChild);
    h3.appendChild(t);
    cleanTitle(t);
    var btns = document.createElement("span");
    btns.className = "zunwin-btns";
    var bMin = mkBtn("\u2212"), bMax = mkBtn("\u25A1"), bX = mkBtn("\u00D7");
    var l = lang();
    bMin.title = TIPS.min[l]; bMin.setAttribute("aria-label", TIPS.min[l]);
    bMax.title = TIPS.max[l]; bMax.setAttribute("aria-label", TIPS.max[l]);
    bX.title = TIPS.x[l]; bX.setAttribute("aria-label", TIPS.x[l]);
    bMin.onclick = function(ev){ try{ ev.stopPropagation(); box.classList.toggle("zunwin-min"); }catch(e){} };
    bMax.onclick = function(ev){ try{ ev.stopPropagation(); bounce(box, "zunwin-pop"); }catch(e){} };
    bX.onclick = function(ev){ try{ ev.stopPropagation(); bounce(box, "zunwin-shake"); }catch(e){} };
    bMin.onkeydown = function(ev){ try{ if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); box.classList.toggle("zunwin-min"); } }catch(e){} };
    bMax.onkeydown = function(ev){ try{ if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); bounce(box, "zunwin-pop"); } }catch(e){} };
    bX.onkeydown = function(ev){ try{ if(ev.key === "Enter" || ev.key === " "){ ev.preventDefault(); bounce(box, "zunwin-shake"); } }catch(e){} };
    btns.appendChild(bMin); btns.appendChild(bMax); btns.appendChild(bX);
    h3.appendChild(btns);
    try{ h3.dataset.zunwin = "h3"; }catch(e){}
  }catch(e){}
}
function sweep(root){
  try{
    var i, el;
    for(i = 0; i < IDS.length; i++){
      try{ el = document.getElementById(IDS[i]); if(el) decorate(el); }catch(e){}
    }
    var scope = root || document;
    if(scope.querySelectorAll){
      var list = scope.querySelectorAll(".nfCard");
      for(i = 0; i < list.length; i++) decorate(list[i]);
      var h3s = scope.querySelectorAll("#wrap .box > h3,#zunMPages .box > h3");
      for(i = 0; i < h3s.length; i++) decorate(h3s[i]);
    }
    if(root && root.classList && root.classList.contains("nfCard")) decorate(root);
    for(i = 0; i < IDS.length; i++){
      try{ if(root && root.id === IDS[i]) decorate(root); }catch(e){}
    }
  }catch(e){}
}
function repaintAll(){
  try{
    var list = document.querySelectorAll("[data-zunwin]");
    for(var i = 0; i < list.length; i++) paint(list[i]);
  }catch(e){}
}
try{
  sweep(document);
  if(typeof MutationObserver === "function"){
    new MutationObserver(function(muts){
      try{
        for(var i = 0; i < muts.length; i++){
          var m = muts[i];
          for(var j = 0; j < m.addedNodes.length; j++){
            var n = m.addedNodes[j];
            if(n && n.nodeType === 1) sweep(n);
          }
        }
      }catch(e){}
    }).observe(document.body, {childList: true, subtree: true});
    try{
      new MutationObserver(function(){ repaintAll(); })
        .observe(document.documentElement, {attributes: true, attributeFilter: ["lang"]});
    }catch(e){}
  }
  setTimeout(repaintAll, 9000);
  /* o corretor passa cedo (800ms/3000ms): repinta logo depois p/ limpar
     carimbo velho antes que ele grude; depois o contraste passa e ele quieta. */
  try{ setTimeout(repaintAll, 1200); }catch(e){}
  try{ setTimeout(repaintAll, 4200); }catch(e){}
  try{ window.zunWinRepaint = repaintAll; }catch(e){}
}catch(e){}
})();
