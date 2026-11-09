/* zunzum — denuncia + anti-dado-pessoal (r58).
   Denuncias caem em sugestoes com kind "denuncia" (tag no painel do dono).
   Sem sink novo: so textContent/value, sem innerHTML. */
(function(){
"use strict";
function tr(s){ try{ if(window.zunzumTr) return window.zunzumTr(s); }catch(e){ return s; } }
function hasPriv(s){
  try{
    s = String(s || "");
    if(!s) return null;
    if(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(s)) return "e-mail detectado - apague o e-mail (privacidade).";
    if(/\(?\d{2}\)?[\s.\-]?\d{4,5}[\s.\-]?\d{4}/.test(s)) return "telefone detectado - apague o numero (privacidade).";
    if(/\b\d{3}\.\d{3}\.\d{3}\-\d{2}\b/.test(s)) return "CPF detectado - apague (privacidade).";
    if(/\b\d{5}\-\d{3}\b/.test(s)) return "CEP/endereco detectado - apague (privacidade).";
    var dg = (s.match(/\d/g) || []).length;
    if(dg >= 10 && /\b\d{10,13}\b/.test(s.replace(/[\s.\-()]/g, ""))) return "numero longo detectado - pode ser telefone/CPF (privacidade).";
    if(/(^|\s)(rua|av\.?|avenida|travessa|alameda|rodovia|estrada)\s+[^\n]{2,}\d+/i.test(s)) return "endereco detectado - apague (privacidade).";
    if(/(minha escola e|moro em|meu endereco|me chama no|meu zap|meu whats)/i.test(s)) return "parece dado pessoal - nao poste telefone/endereco/escola.";
    return null;
  }catch(e){ return null; }
}
function report(origem, ref){
  try{
    var k = document.getElementById("sugKind");
    var tx = document.getElementById("sugText");
    if(k) k.value = "denuncia";
    if(tx) tx.value = "denuncia [" + String(origem || "post") + "] " + String(ref || "").slice(0, 300);
    try{ if(window.zunMobileGo) window.zunMobileGo("mais"); }catch(e){}
    try{ tx.scrollIntoView({block: "center"}); }catch(e){}
    try{ tx.focus(); }catch(e){}
    var m = document.getElementById("sugMsg");
    if(m) m.textContent = tr("descreva o motivo e envie - cai como denuncia p/ o dono.");
  }catch(e){}
}
try{
  if(typeof window.zunHasPrivateData !== "function") window.zunHasPrivateData = hasPriv;
  if(typeof window.zunReport !== "function") window.zunReport = report;
}catch(e){}
})();
