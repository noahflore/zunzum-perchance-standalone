/* site-guard.js — trava de origem (camada cliente: dissuasão + fail-closed).
   O que faz: só deixa o app conectar no Supabase quando rodando no domínio
   oficial (perchance.org / subdomínios *.perchance.org, ex. o iframe
   <id>.perchance.org) ou em localhost (dev). Fora disso, window.__zunOriginOk
   fica false, o sb.js anula a config (sem client = sem conexão) e aparece
   um aviso. Se a página estiver ENFIADA num iframe de site estranho, tenta
   sair dele (frame-bust).
   Limite honesto: a anon key é pública por construção (vai no JS), então
   NENHUM site clonado é bloqueado no nível do banco por origem — o PostgREST
   não tem allowlist de referrer. A proteção real dos dados é o RLS (cada
   tabela só libera o dono) + throttles + captcha; este arquivo só impede
   que o app oficial opere fora do endereço oficial e dificulta framing
   malicioso (phishing). Ver src/SUPABASE_HARDENING.md p/ o resto (checklist
   do dashboard: Site URL, captcha no Auth, confirmação de email, etc.). */
(function(){
"use strict";
var ALLOW = [/(^|\.)perchance\.org$/i, /\.github\.io$/i, /\.pages\.dev$/i, /^localhost$/i, /^127\.0\.0\.1$/i, /^\[::1\]$/];
function hostOk(h){
  h = String(h||"").toLowerCase().split(":")[0].replace(/\.$/,"");
  for(var i=0;i<ALLOW.length;i++){ if(ALLOW[i].test(h)) return true; }
  return false;
}
function officialLink(){
  try{ var g = window.generatorName || "zunzum"; return "https://perchance.org/"+g; }catch(e){ return "https://perchance.org/"; }
}
var ok = false, reason = "";
try{
  var h = location.hostname || "";
  if(hostOk(h)){ ok = true; }
  else reason = "host fora do oficial ("+h+")";
  if(ok && window.self !== window.top){
    var ref = ""; try{ ref = document.referrer || ""; }catch(e){}
    var m = /^https?:\/\/([^\/:?#]+)/i.exec(ref||"");
    if(m && m[1] && !hostOk(m[1])){
      ok = false; reason = "página embutida em site estranho ("+m[1]+")";
      try{ window.top.location.href = window.location.href; }catch(e){}
    }
  }
}catch(e){ ok = false; reason = "origem ilegível"; }
try{ window.__zunOriginOk = ok; }catch(e){}
if(!ok){
  var show = function(){
    try{
      if(document.getElementById("zunOriginBlock")) return;
      var d = document.createElement("div"); d.id = "zunOriginBlock";
      d.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:999999;background:#3b0a0a;color:#fff;padding:10px 14px;font:600 14px/1.4 system-ui,sans-serif;text-align:center;border-bottom:3px solid #ff5252;";
      var a = officialLink();
      d.innerHTML = "⛔ Conexão com o banco bloqueada: este não é o endereço oficial ("+String(reason||"origem desconhecida").replace(/</g,"&lt;")+"). Abra pelo oficial: <a style='color:#ffd54f' href='"+a+"'>"+a+"</a>";
      (document.body||document.documentElement).appendChild(d);
    }catch(e){}
  };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", show);
  else show();
}
})();
