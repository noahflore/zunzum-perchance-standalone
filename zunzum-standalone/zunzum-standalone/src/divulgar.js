(function(){
function base(){ return (window.ZUNZUM_BASE||"https://perchance.org/zunzum"); }
function cleanRef(s){ s = String(s||"").replace(/^@/,"").trim().slice(0,20); return /^[A-Za-z0-9-_]{2,20}$/.test(s) ? s : ""; }
function getRef(){
  var r = "";
  try{
    var q = new URLSearchParams(location.search);
    r = q.get("convite")||q.get("ref")||q.get("c")||"";
  }catch(e){}
  r = cleanRef(r);
  if(r){
    try{ localStorage.setItem("zunzumRef", r); }catch(e){}
    window.zunzumInviteRef = r;
  }else{
    try{ r = cleanRef(localStorage.getItem("zunzumRef")||""); window.zunzumInviteRef = r; }catch(e){}
  }
  return r;
}
function myNick(){
  try{
    if(window.me && window.me.nick) return window.me.nick;
    var m = JSON.parse(localStorage.getItem("orkutSession")||"null");
    return m && m.nick ? m.nick : "";
  }catch(e){ return ""; }
}
function myLink(){
  var n = myNick();
  return n ? base()+"?convite="+encodeURIComponent(n) : base();
}
function msg(t){ try{ document.getElementById("divulgarAutoMsg").textContent = t; }catch(e){} }
async function callRpc(name, data){
  try{
    if(typeof crpc === "function" && (name==="refTop")) return await crpc(name, data||"", 30000);
    if(typeof rpc === "function") return await rpc(name, data);
  }catch(e){}
  throw new Error("norpc");
}
async function refreshStats(){
  var mc = document.getElementById("divulgarMyCount");
  var top = document.getElementById("divulgarTop");
  var n = myNick();
  if(!n){ if(mc) mc.textContent = "Faça login com nick+senha para ganhar seu link pessoal."; if(top) top.innerHTML = ""; return; }
  var c = 0, arr = [];
  try{
    var r = JSON.parse(await callRpc("refMe", n));
    c = r.n||0;
  }catch(e){
    try{ c = parseInt(localStorage.getItem("zunzumRefCount:"+n.toLowerCase())||"0",10)||0; }catch(e2){}
  }
  try{
    arr = JSON.parse(await callRpc("refTop", ""));
    if(!Array.isArray(arr)) arr = [];
  }catch(e){ arr = []; }
  if(mc) mc.textContent = c > 0 ? "Você já trouxe "+c+" pessoa"+(c>1?"s":"")+"! Continue compartilhando 🚀" : "Seu link ainda não trouxe ninguém — compartilhe e volte aqui pra ver o placar.";
  if(top){
    if(!arr.length){ top.innerHTML = ""; return; }
    var h = "🏆 top divulgadores: ";
    h += arr.slice(0,5).map(function(x,i){ return (i+1)+"º @"+x.nick+" ("+x.n+")"; }).join(" · ");
    top.textContent = h;
  }
}
function banner(ref){
  try{
    if(!ref) return;
    var n = myNick();
    if(n && n.toLowerCase()===String(ref).toLowerCase()) return;
    if(document.getElementById("zzRefBanner")) return;
    var d = document.createElement("div");
    d.id = "zzRefBanner";
    d.style.cssText = "position:fixed;bottom:10px;left:10px;right:10px;z-index:60;background:#fffbe6;border:2px solid #ffb300;border-radius:10px;padding:8px 10px;font-size:14px;text-align:left;box-shadow:0 2px 10px rgba(0,0,0,.2)";
    var b = document.createElement("button");
    b.textContent = "x";
    b.style.cssText = "float:right";
    b.onclick = function(){ d.remove(); };
    var t = document.createElement("span");
    t.textContent = "Você foi convidado por @"+ref+" 🎉 crie seu nick e entre pro zunzum! ";
    var go = document.createElement("button");
    go.textContent = "criar meu nick";
    go.onclick = function(){
      d.remove();
      try{
        var ab = document.getElementById("authBox");
        if(ab) ab.scrollIntoView({behavior:"smooth", block:"center"});
      }catch(e){}
    };
    d.appendChild(b); d.appendChild(t); d.appendChild(go);
    document.body.appendChild(d);
    setTimeout(function(){ try{ d.remove(); }catch(e){} }, 25000);
  }catch(e){}
}
function autoNudge(){
  try{
    var n = myNick();
    if(!n) return;
    var k = "zunzumDivAuto:"+n.toLowerCase();
    if(localStorage.getItem(k)==="1") return;
    setTimeout(function(){
      try{
        if(localStorage.getItem(k)==="1") return;
        var m = document.getElementById("divulgarModal");
        if(!m || !m.hidden) return;
        m.hidden = false;
        refreshStats();
        localStorage.setItem(k, "1");
      }catch(e){}
    }, 45000);
  }catch(e){}
}
var M,T,S,G,C,L,X,MSG,LK,SH,WA,TG,CP;
function init(){
  var ref = getRef();
  banner(ref);
  autoNudge();
  setInterval(function(){ try{ var r2 = getRef(); if(r2) window.zunzumInviteRef = r2; }catch(e){} }, 5000);
  M=document.getElementById("divulgarModal");T=document.getElementById("divulgarText");
  S=document.getElementById("divulgarStyle");G=document.getElementById("divulgarGenBtn");
  C=document.getElementById("divulgarCopyBtn");L=document.getElementById("divulgarCopyLinkBtn");
  X=document.getElementById("divulgarCloseBtn");MSG=document.getElementById("divulgarMsg");
  LK=document.getElementById("divulgarLink");SH=document.getElementById("divulgarShareBtn");
  WA=document.getElementById("divulgarWaBtn");TG=document.getElementById("divulgarTgBtn");
  CP=document.getElementById("divulgarCopyAutoBtn");
  if(!M||!T) return;
  var b=document.getElementById("divulgarBtn");
  if(b) b.onclick=function(){ M.hidden=false; try{ LK.value=myLink(); }catch(e){} refreshStats(); };
  X.onclick=function(){ M.hidden=true; };
  M.addEventListener("click",function(e){ if(e.target===M) M.hidden=true; });
  G.onclick=gen; C.onclick=copyTxt; L.onclick=copyLink;
  if(CP) CP.onclick=async function(){
    try{ LK.value=myLink(); await navigator.clipboard.writeText(LK.value); msg("link pessoal copiado! ✅"); }
    catch(e){ try{ LK.select(); document.execCommand("copy"); msg("copiado!"); }catch(e2){ msg(LK.value); } }
  };
  if(SH) SH.onclick=async function(){
    var u = myLink();
    var txt = "Entra no zunzum 🐝 rede anônima BR: feed livre + chat sem email "+u;
    if(navigator.share){
      try{ await navigator.share({title:"zunzum", text:txt, url:u}); msg("valeu por compartilhar! 🚀"); }catch(e){}
    }else{
      try{ await navigator.clipboard.writeText(txt); msg("texto copiado — cole no whatsapp/status 👍"); }
      catch(e){ msg(txt); }
    }
  };
  if(WA) WA.onclick=function(){ var u=myLink(); window.open("https://wa.me/?text="+encodeURIComponent("Entra no zunzum 🐝 rede anônima BR, sem email e grátis: "+u),"_blank"); msg("abrindo whatsapp..."); };
  if(TG) TG.onclick=function(){ var u=myLink(); window.open("https://t.me/share/url?url="+encodeURIComponent(u)+"&text="+encodeURIComponent("zunzum 🐝 rede anônima BR"),"_blank"); msg("abrindo telegram..."); };
}
async function gen(){
  var estilo=S?S.value:"forum";
  MSG.textContent=""; G.disabled=true;
  T.value="gerando... ⏳";
  var estilos={
    forum:"um post de forum (titulo + texto, ~120 palavras)",
    curto:"um comentario curto de 2-3 linhas para responder alguem indicando a rede",
    topico:"um topico completo de apresentacao com titulo chamativo, o que e, como funciona e convite",
    convidativo:"uma mensagem curta e convidativa estilo whatsapp/telegram com emoji moderado"
  };
  var prompt="Voce divulga a rede social anonima brasileira ZUNZUM: feed anonimo sem conta, chat publico e privado com nick+senha simples, sem email, gratis. Escreva "+(estilos[estilo]||estilos[forum])+" em portugues informal brasileiro, tom amigavel, sem spam, sem prometer o que nao existe. Inclua o link "+myLink()+" no final. Responda SO com o texto pronto para colar.";
  try{
    var r=await root.generateText({instruction:prompt});
    T.value=String(r||"").trim()||"Tente de novo em segundos.";
  }catch(e){ T.value="Falhou — tente de novo em segundos."; }
  G.disabled=false;
}
async function copyTxt(){
  try{ await navigator.clipboard.writeText(T.value); MSG.textContent="texto copiado! cole no forum 👍"; }
  catch(e){ T.select(); document.execCommand("copy"); MSG.textContent="copiado!"; }
}
async function copyLink(){
  try{ await navigator.clipboard.writeText(myLink()); MSG.textContent="link copiado!"; }
  catch(e){ MSG.textContent=myLink(); }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
