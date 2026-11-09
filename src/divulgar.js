(function(){
function tr(s){ try{ if(window.zunzumTr) return window.zunzumTr(s); }catch(e){ return s; } }
function LANGD(){ try{ var l=String(window.zunzumLang||"pt").slice(0,2); return l==="en"?"en":(l==="es"?"es":"pt"); }catch(e){ return "pt"; } }
function base(){ try{ if(window.zunBaseUrl) return window.zunBaseUrl(); }catch(e){} return "https://perchance.org/"+(window.generatorName||"zunzum"); }
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
    var raw = null; try{ raw = sessionStorage.getItem("orkutSession")||localStorage.getItem("orkutSession"); }catch(e){ raw = null; }
    var m = JSON.parse(raw||"null");
    return m && m.nick ? m.nick : "";
  }catch(e){ return ""; }
}
function myLink(){
  var n = myNick();
  return n ? base()+"?c="+encodeURIComponent(n) : base();
}
function msg(t){ try{ document.getElementById("divulgarAutoMsg").textContent = tr(t); }catch(e){} }
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
  if(!n){ if(mc) mc.textContent = tr("Faça login com nick+senha para ganhar seu link pessoal."); if(top) top.innerHTML = ""; return; }
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
  if(mc) mc.textContent = c > 0 ? tr("Você já trouxe ")+c+(c>1?tr(" pessoas"):tr(" pessoa"))+tr("! Continue compartilhando 🚀") : tr("Seu link ainda não trouxe ninguém — compartilhe e volte aqui pra ver o placar.");
  if(top){
    if(!arr.length){ top.innerHTML = ""; return; }
    var LD = LANGD();
    var h = tr("🏆 top divulgadores: ");
    h += arr.slice(0,5).map(function(x,i){ var ord = LD==="en" ? ((i+1)+". ") : ((i+1)+"º "); return ord+"@"+x.nick+" ("+x.n+")"; }).join(" · ");
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
    t.textContent = tr("Você foi convidado por @")+ref+tr(" 🎉 crie seu nick e entre pro zunzum! ");
    var go = document.createElement("button");
    go.textContent = tr("criar meu nick");
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
    try{ LK.value=myLink(); await navigator.clipboard.writeText(LK.value); msg(tr("link pessoal copiado! ✅")); }
    catch(e){ try{ LK.select(); document.execCommand("copy"); msg(tr("copiado!")); }catch(e2){ msg(LK.value); } }
  };
  // QR do link pessoal (100% local: lib vendorada em src/qrcode-vendor.js,
  // sem rede e sem plugin). O link vem de myLink() = base + ?c= + nick
  // allowlist (cleanRef) — nunca carrega token/sessão.
  function ensureQrLib(){
    return new Promise(function(res, rej){
      try{ if(typeof qrcode !== "undefined") return res(); }catch(e){}
      var s = document.createElement("script");
      s.src = "src/qrcode-vendor.js"; s.async = true;
      s.onload = function(){ res(); }; s.onerror = function(){ rej(new Error("qr-lib")); };
      document.head.appendChild(s);
    });
  }
  var QB=document.getElementById("divulgarQrBtn"), QR=document.getElementById("divulgarQr"),
      QROW=document.getElementById("divulgarQrRow"), QM=document.getElementById("divulgarQrMsg");
  function qrMsg(t){ try{ if(QM) QM.textContent = t; }catch(e){} }
  if(QB) QB.onclick=async function(){
    try{
      if(!myNick()){ qrMsg(tr("faça login p/ gerar seu QR")); return; }
      qrMsg(tr("gerando QR... ⏳"));
      await ensureQrLib();
      var url = myLink();
      var qr = qrcode(0, "M"); qr.addData(url); qr.make();
      var n = qr.getModuleCount(), cv = QR, ctx = cv.getContext("2d");
      var S = Math.max(1, Math.floor(Math.min(cv.width, cv.height) / (n + 8)));
      var off = Math.floor((cv.width - S * n) / 2);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = "#000";
      for(var r=0; r<n; r++) for(var c=0; c<n; c++){ if(qr.isDark(r, c)) ctx.fillRect(off + c*S, off + r*S, S, S); }
      if(QROW) QROW.hidden = false;
      qrMsg(tr("segure a imagem p/ salvar e cole no perfil/status 👍"));
    }catch(e){ qrMsg(tr("QR indisponível — copie o link")); }
  };
  if(SH) SH.onclick=async function(){
    var u = myLink(); var LSH = LANGD();
    var txt = LSH==="en" ? "Join zunzum 🐝, the anonymous BR network: free feed + chat, no email "+u : LSH==="es" ? "Entra a zunzum 🐝, la red anónima BR: feed libre + chat sin email "+u : "Entra no zunzum 🐝 rede anônima BR: feed livre + chat sem email "+u;
    if(navigator.share){
      try{ await navigator.share({title:"zunzum", text:txt, url:u}); msg(tr("valeu por compartilhar! 🚀")); }catch(e){}
    }else{
      try{ await navigator.clipboard.writeText(txt); msg(tr("texto copiado — cole no whatsapp/status 👍")); }
      catch(e){ msg(txt); }
    }
  };
  if(WA) WA.onclick=function(){ var u=myLink(); var LD=LANGD(); var t=LD==="en"?"Join zunzum 🐝, the anonymous BR network, no email, free: "+u:LD==="es"?"Entra a zunzum 🐝, la red anónima BR, sin email y gratis: "+u:"Entra no zunzum 🐝 rede anônima BR, sem email e grátis: "+u; window.open("https://wa.me/?text="+encodeURIComponent(t),"_blank"); msg(tr("abrindo whatsapp...")); };
  if(TG) TG.onclick=function(){ var u=myLink(); var LD=LANGD(); var t=LD==="en"?"zunzum 🐝 anonymous BR network":LD==="es"?"zunzum 🐝 red anónima BR":"zunzum 🐝 rede anônima BR"; window.open("https://t.me/share/url?url="+encodeURIComponent(u)+"&text="+encodeURIComponent(t),"_blank"); msg(tr("abrindo telegram...")); };
}
async function gen(){
  var estilo=S?S.value:"forum";
  MSG.textContent=""; G.disabled=true;
  T.value=tr("gerando... ⏳");
  var LD=LANGD();
  var estilos = LD==="en" ? {
    forum:"a forum post (title + text, ~120 words)",
    curto:"a short 2-3 line comment reply recommending the network to someone",
    topico:"a full intro topic with catchy title, what it is, how it works and an invite",
    convidativo:"a short friendly whatsapp/telegram-style invite message with moderate emoji",
    assinatura:"a short fixed 1-2 line forum-profile signature (zunzum name + what it is in 8 words + invite), not looking like a big ad"
  } : LD==="es" ? {
    forum:"una publicación de foro (título + texto, ~120 palabras)",
    curto:"un comentario corto de 2-3 líneas para responder a alguien recomendando la red",
    topico:"un tema completo de presentación con título llamativo, qué es, cómo funciona e invitación",
    convidativo:"un mensaje corto y amable estilo whatsapp/telegram con emoji moderado",
    assinatura:"una firma fija corta de 1-2 líneas para perfil de foro (nombre de zunzum + qué es en 8 palabras + invitación), sin parecer un gran anuncio"
  } : {
    forum:"um post de forum (titulo + texto, ~120 palavras)",
    curto:"um comentario curto de 2-3 linhas para responder alguem indicando a rede",
    topico:"um topico completo de apresentacao com titulo chamativo, o que e, como funciona e convite",
    convidativo:"uma mensagem curta e convidativa estilo whatsapp/telegram com emoji moderado",
    assinatura:"uma assinatura fixa curta de 1-2 linhas para perfil de forum (nome do zunzum + o que e em 8 palavras + convite), sem parecer anuncio grande"
  };
  var prompt = LD==="en" ? "You promote the Brazilian anonymous social network ZUNZUM: anonymous feed with no account, public and private chat with simple nick+password, no email, free. Write "+(estilos[estilo]||estilos.forum)+" in casual informal English, friendly tone, no spam, don't promise what doesn't exist. Include the link "+myLink()+" at the end. Reply ONLY with the ready-to-paste text."
    : LD==="es" ? "Divulgas la red social anónima brasileña ZUNZUM: feed anónimo sin cuenta, chat público y privado con nick+contraseña simple, sin email, gratis. Escribe "+(estilos[estilo]||estilos.forum)+" en español informal y cercano, tono amigable, sin spam, sin prometer lo que no existe. Incluye el enlace "+myLink()+" al final. Responde SOLO con el texto listo para pegar."
    : "Voce divulga a rede social anonima brasileira ZUNZUM: feed anonimo sem conta, chat publico e privado com nick+senha simples, sem email, gratis. Escreva "+(estilos[estilo]||estilos.forum)+" em portugues informal brasileiro, tom amigavel, sem spam, sem prometer o que nao existe. Inclua o link "+myLink()+" no final. Responda SO com o texto pronto para colar.";
  try{
    try{ if(window.ZunAiQuota && !window.ZunAiQuota.tryTake("text")){ T.value=tr("cota de IA de hoje esgotada — tente amanhã."); G.disabled=false; return; } }catch(_q){}
    var r=await zunText({instruction:prompt});
    T.value=String(r||"").trim()||tr("Tente de novo em segundos.");
  }catch(e){ T.value=(e && (e.code==="ai-quota" || /ai-quota/.test(String((e&&e.message)||""))))?tr("cota de IA de hoje esgotada — tente amanhã."):tr("Falhou — tente de novo em segundos."); }
  G.disabled=false;
}
async function copyTxt(){
  try{ await navigator.clipboard.writeText(T.value); MSG.textContent=tr("texto copiado! cole no forum 👍"); }
  catch(e){ T.select(); document.execCommand("copy"); MSG.textContent=tr("copiado!"); }
}
async function copyLink(){
  try{ await navigator.clipboard.writeText(myLink()); MSG.textContent=tr("link copiado!"); }
  catch(e){ MSG.textContent=myLink(); }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
