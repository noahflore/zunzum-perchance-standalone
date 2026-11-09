(function(){
"use strict";
/* T16 webring/sites amigos (PASSIVA, sem plugin, sem rede nova).
   Lista 100% estática e curada (só https://perchance.org, sem dado de
   usuário no HTML). Render via createElement/textContent (nunca innerHTML).
   Links com rel=noopener noreferrer nofollow. Sugestão reaproveita a caixa
   de sugestões existente (sugKind/sugText/sugBtn) — nenhum RPC/endpoint novo.
   Sem segredo, sem token, sem fetch. */
var AMIGOS = [
  {n:"zunzum — rede da abelhinha", u:"https://perchance.org/zunzum"},
  {n:"hubx — geradores atualizados", u:"https://perchance.org/hubx"},
  {n:"examples — exemplos Perchance", u:"https://perchance.org/examples"}
];
function tr(s){ try{ return window.zunzumTr ? window.zunzumTr(s) : s; }catch(e){ return s; } }
function baseUrl(){
  try{ if(window.zunBaseUrl) return window.zunBaseUrl(); }catch(e){}
  try{ return "https://perchance.org/"+(window.generatorName||"zunzum"); }
  catch(e){ return "https://perchance.org/zunzum"; }
}
function hostOk(u){
  try{
    if(window.zunOkUrl) return !!window.zunOkUrl(u);
    var x = new URL(String(u||""));
    if(x.protocol!=="https:" || x.username || x.password) return false;
    if(/[\s<>"'`\\]/.test(String(u))) return false;
    var hn = String(x.hostname||"").toLowerCase();
    if(!hn || hn.length>253 || hn.indexOf("..")>=0 || /[^a-z0-9.-]/.test(hn)) return false;
    if(hn==="localhost" || hn.slice(-6)===".onion" || hn==="local" ||
       hn.slice(-6)===".local" || hn.slice(-10)===".localhost") return false;
    return true;
  }catch(e){ return false; }
}
function openUrl(u){
  try{
    var a = document.createElement("a");
    a.href = u; a.target = "_blank"; a.rel = "noopener noreferrer nofollow";
    a.referrerPolicy = "no-referrer";
    document.body.appendChild(a); a.click(); try{ a.remove(); }catch(e){}
  }catch(e){ try{ window.open(u, "_blank", "noopener,noreferrer"); }catch(e2){} }
}
var idx = 0;
function paintCur(){
  try{
    var el = document.getElementById("amigosCur");
    if(!el) return;
    var m = AMIGOS[idx % AMIGOS.length];
    el.textContent = ((idx % AMIGOS.length)+1)+"/"+AMIGOS.length+" · "+m.n;
  }catch(e){}
}
function renderList(){
  try{
    var box = document.getElementById("amigosList");
    if(!box) return;
    box.textContent = "";
    AMIGOS.forEach(function(m, i){
      if(i>0) box.appendChild(document.createTextNode(" · "));
      var a = document.createElement("a");
      a.href = (i===0?baseUrl():m.u); a.target = "_blank";
      a.rel = "noopener noreferrer nofollow";
      try{ a.referrerPolicy = "no-referrer"; }catch(e){}
      a.textContent = m.n;
      box.appendChild(a);
    });
  }catch(e){}
}
function seloSnippet(){
  return '<a href="'+baseUrl()+'" rel="noopener">'
    + '<img src="https://user.uploads.dev/file/bfd49a053c47f44f2ca09310c1cc9ac7.png"'
    + ' alt="zunzum — rede da abelhinha" width="31" height="31"></a>';
}
function init(){
  renderList(); paintCur();
  try{
    var code = document.getElementById("amigosCode");
    if(code) code.value = seloSnippet();
  }catch(e){}
  function msg(id, t){
    try{ var el = document.getElementById(id); if(el) el.textContent = tr(t||""); }catch(e){}
  }
  try{
    var pv = document.getElementById("amigosPrev");
    if(pv && !pv._w) { pv._w = true; pv.onclick = function(){
      idx = (idx + AMIGOS.length - 1) % AMIGOS.length; paintCur();
      openUrl(idx===0?baseUrl():AMIGOS[idx].u);
    }; }
  }catch(e){}
  try{
    var nx = document.getElementById("amigosNext");
    if(nx && !nx._w) { nx._w = true; nx.onclick = function(){
      idx = (idx + 1) % AMIGOS.length; paintCur();
      openUrl(idx===0?baseUrl():AMIGOS[idx].u);
    }; }
  }catch(e){}
  try{
    var rd = document.getElementById("amigosRand");
    if(rd && !rd._w) { rd._w = true; rd.onclick = function(){
      idx = Math.floor(Math.random()*AMIGOS.length); paintCur();
      openUrl(idx===0?baseUrl():AMIGOS[idx].u);
    }; }
  }catch(e){}
  try{
    var cp = document.getElementById("amigosCopy");
    if(cp && !cp._w) { cp._w = true; cp.onclick = async function(){
      var t = seloSnippet();
      try{ await navigator.clipboard.writeText(t); msg("amigosCopyMsg","selo copiado!"); }
      catch(e){
        try{
          var c = document.getElementById("amigosCode");
          if(c){ c.value = t; c.focus(); c.select(); document.execCommand("copy"); msg("amigosCopyMsg","selo copiado!"); }
          else msg("amigosCopyMsg","");
        }catch(e2){ msg("amigosCopyMsg",""); }
      }
      setTimeout(function(){ msg("amigosCopyMsg",""); }, 4000);
    }; }
  }catch(e){}
  try{
    var sg = document.getElementById("amigosSug");
    if(sg && !sg._w) { sg._w = true; sg.onclick = function(){
      var inp = document.getElementById("amigosUrl");
      var u = String((inp && inp.value) || "").trim().slice(0,200);
      if(!u || !hostOk(u)){ msg("amigosMsg","link precisa começar com https://"); return; }
      try{
        var k = document.getElementById("sugKind"), tx = document.getElementById("sugText");
        if(k) k.value = "ideia";
        if(tx){ tx.value = "site amigo: "+u; try{ tx.focus(); }catch(e){} }
        try{ if(window.zunMobileGo) window.zunMobileGo("mais"); }catch(e){}
        try{
          var sb = document.getElementById("sobreBox");
          if(sb && sb.scrollIntoView) sb.scrollIntoView();
        }catch(e){}
        msg("amigosMsg","site enviado p/ sugestões, valeu!");
        try{ if(inp) inp.value = ""; }catch(e){}
      }catch(e){ msg("amigosMsg",""); }
      setTimeout(function(){ msg("amigosMsg",""); }, 5000);
    }; }
  }catch(e){}
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", init);
else init();
try{ setTimeout(init, 2500); }catch(e){}
})();
