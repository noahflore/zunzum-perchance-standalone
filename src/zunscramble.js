/* zunscramble.js — embaralha as letras 1x e resolve no texto original.
   Inspirado no wordScramble do sadgrl (dissecação 2026-11-04): sem
   dependência, respeita prefers-reduced-motion (sem animação = texto
   final na hora) e NUNCA muda o texto final (i18n-safe: o que estava
   escrito continua escrito, só anima a chegada). */
(function(){
"use strict";
if(window.__zunscrambleLoaded) return; window.__zunscrambleLoaded = true;
var GLYPHS = "¿?!¡{}░<>/\\*#@%&";
function rnd(){ return GLYPHS[Math.floor(Math.random()*GLYPHS.length)]; }
/* anima SÓ um nó de texto; no fim o conteúdo é byte-igual ao original */
function scrambleNode(node, dur){
  if(!node) return;
  var orig = String(node.nodeValue||"");
  if(!orig) return;
  var reduce = false;
  try{ reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }catch(e){}
  if(reduce){ return; } // texto final já está lá: não mexe em nada
  dur = dur||900;
  var t0 = 0;
  try{ t0 = performance.now(); }catch(e){ t0 = Date.now(); }
  function frame(t){
    try{
      if(!node.isConnected) return; // i18n repintou no meio: aborta sem erro
      var p = (t-t0)/dur;
      if(p>=1){ node.nodeValue = orig; return; }
      var n = orig.length, out = "";
      /* revela da esquerda p/ direita; resto embaralhado */
      var settled = Math.floor(p*n*1.2);
      for(var i=0;i<n;i++){
        var ch = orig[i];
        if(ch===" "||ch==="\n"||ch==="\t"){ out += ch; continue; }
        out += (i<settled) ? ch : rnd();
      }
      node.nodeValue = out;
      requestAnimationFrame(frame);
    }catch(e){ try{ node.nodeValue = orig; }catch(e2){} }
  }
  try{ requestAnimationFrame(frame); }catch(e){}
}
/* API: window.zunScramble(elOuSeletor, durMs) — 1 tiro no 1º nó de texto */
window.zunScramble = function(el, dur){
  try{
    if(typeof el==="string") el = document.querySelector(el);
    if(!el || !el.isConnected) return false;
    var node = null;
    /* acha o 1º nó de texto não-vazio (pula spans aninhados, ex: h1 + span) */
    var kids = el.childNodes;
    for(var i=0;i<kids.length;i++){
      if(kids[i].nodeType===3 && String(kids[i].nodeValue||"").trim()!==""){ node = kids[i]; break; }
    }
    if(!node) return false;
    scrambleNode(node, dur);
    return true;
  }catch(e){ return false; }
};
/* estreia: a marca "zunzum" do topo se embaralha 1x ao carregar */
function boot(){
  try{ window.zunScramble(".top-brand h1", 900); }catch(e){}
}
try{
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}catch(e){}
})();
