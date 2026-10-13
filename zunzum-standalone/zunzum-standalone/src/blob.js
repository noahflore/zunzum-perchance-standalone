(function(){
"use strict";
// CARREGADOR do modulo do dono (todo o angiru saiu do src/ publico).
// Nada aqui e sensivel: o modulo real vive num ARQUIVO criptografado que so
// o dono tem. Fluxo: dono abre a divulgacao, digita a CHAVE + escolhe o ARQUIVO,
// o navegador descriptografa (PBKDF2 + AES-GCM) e executa via Blob — tudo so
// nesta sessao, nada e gravado. Sem chave+arquivo, nada roda.
window.zunzumAngiruLoaded = false;
function cleanB64(s){
  return String(s||"").replace(/\s+/g, "");
}
function b64ToBytes(b64){
  b64 = cleanB64(b64);
  var bin = atob(b64);
  var o = new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++) o[i] = bin.charCodeAt(i);
  return o;
}
async function unlockWith(password, fileText){
  var pw = String(password||"").trim();
  if(!pw) throw new Error("digite a chave");
  var txt = String(fileText||"").replace(/^\uFEFF/, "").trim();
  if(!txt) throw new Error("arquivo vazio");
  var obj;
  try{ obj = JSON.parse(txt); }
  catch(e){ throw new Error("arquivo invalido: nao e o JSON do modulo"); }
  if(!obj || obj.v!==1 || !obj.salt || !obj.iv || !obj.data) throw new Error("arquivo invalido: nao e o modulo do dono");
  var iter = parseInt(obj.iter)||200000;
  if(!(iter>=10000 && iter<=2000000)) iter = 200000;
  var enc = new TextEncoder();
  var baseKey = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveKey"]);
  var aesKey = await crypto.subtle.deriveKey(
    {name:"PBKDF2", salt:b64ToBytes(obj.salt), iterations:iter, hash:"SHA-256"},
    baseKey, {name:"AES-GCM", length:256}, false, ["decrypt"]);
  var pt;
  try{
    pt = await crypto.subtle.decrypt({name:"AES-GCM", iv:b64ToBytes(obj.iv)}, aesKey, b64ToBytes(obj.data));
  }catch(e){
    throw new Error("chave incorreta para esse arquivo (ou arquivo corrompido)");
  }
  var code = new TextDecoder().decode(pt);
  if(code.indexOf("zunzumAngiru")<0) throw new Error("conteudo invalido: nao e o modulo do dono");
  var url = URL.createObjectURL(new Blob([code], {type:"text/javascript"}));
  await new Promise(function(res, rej){
    var s = document.createElement("script");
    s.src = url;
    s.onload = function(){ res(); };
    s.onerror = function(){ rej(new Error("falha ao executar o modulo")); };
    document.body.appendChild(s);
  });
  window.zunzumAngiruLoaded = !!window.zunzumAngiru;
  if(!window.zunzumAngiruLoaded) throw new Error("modulo executou mas nao ativou (zunzumAngiru ausente)");
  return true;
}
window.zunzumAngiruUnlock = unlockWith;
function makeInner(boxId, statusId, keyId, fileId, goId){
  var inner = document.createElement("div");
  inner.style.cssText = "font-size:12px;display:grid;gap:6px;margin-top:6px";
  inner.innerHTML =
    '<div class="meta">Passo 1: clique em "área do dono" e digite a <b>senha do dono</b> (é diferente da chave). Passo 2: aqui, cole a <b>chave do módulo</b> (ex: sau7…) sem espaços e escolha o arquivo .json do módulo.</div>' +
    '<input id="'+keyId+'" type="password" placeholder="chave do módulo (cole sem espaços)" autocomplete="off">' +
    '<input id="'+fileId+'" type="file" accept=".json,application/json">' +
    '<div style="display:flex;gap:6px"><button id="'+goId+'" type="button">destravar módulo</button></div>' +
    '<div id="'+statusId+'" class="meta">módulo inativo</div>';
  inner.querySelector("#"+goId).onclick = async function(){
    var st = inner.querySelector("#"+statusId);
    var kf = inner.querySelector("#"+keyId);
    var ff = inner.querySelector("#"+fileId);
    try{
      var f = ff && ff.files && ff.files[0];
      if(!f){ st.textContent = "escolha o arquivo .json primeiro"; return; }
      var key = String((kf && kf.value)||"").trim();
      if(!key){ st.textContent = "cole a chave do módulo"; return; }
      st.textContent = "destrancando... (aguarde uns segundos)";
      var txt = "";
      try{ txt = await f.text(); }
      catch(e){ txt = await new Promise(function(res, rej){ var r = new FileReader(); r.onload = function(){ res(r.result); }; r.onerror = rej; r.readAsText(f); }); }
      await unlockWith(key, txt);
      try{ kf.value = ""; ff.value = ""; }catch(e){}
      st.textContent = "módulo ativo ✅ (só nesta sessão)";
      try{ if(window.zunzumAngiru && window.zunzumAngiru.buildPanel) window.zunzumAngiru.buildPanel(); }catch(e){}
    }catch(e){ st.textContent = (e && e.message) ? e.message : "chave/arquivo inválidos"; }
  };
  return inner;
}
function installInto(container, boxId, ids){
  if(!container || document.getElementById(boxId)) return false;
  var box = document.createElement("details");
  box.id = boxId;
  if(boxId==="angLoadBoxOwner") box.open = true;
  var sum = document.createElement("summary");
  sum.textContent = "🤖 módulo do dono (arquivo + chave)";
  sum.style.cursor = "pointer";
  sum.style.fontSize = "13px";
  box.appendChild(sum);
  box.appendChild(makeInner(boxId, ids.st, ids.key, ids.file, ids.go));
  container.appendChild(box);
  return true;
}
function buildLoader(){
  try{
    if(typeof isOwner!=="function" || !isOwner()) return;
    var ob = document.getElementById("ownerBox");
    if(ob) installInto(ob, "angLoadBoxOwner", {st:"angLoadSt2", key:"angLoadKey2", file:"angLoadFile2", go:"angLoadGo2"});
    var card = document.getElementById("divulgarCard");
    if(card) installInto(card, "angLoadBox", {st:"angLoadSt", key:"angLoadKey", file:"angLoadFile", go:"angLoadGo"});
  }catch(e){}
}
window.zunzumAngiruBuildLoader = buildLoader;
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", function(){ setTimeout(buildLoader, 1500); });
else setTimeout(buildLoader, 1500);
try{ setInterval(buildLoader, 3000); }catch(e){}
try{ window.addEventListener("storage", function(){ setTimeout(buildLoader, 500); }); }catch(e){}
})();
