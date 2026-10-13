(function(){
"use strict";
// Nodal temporário por #tag no feed compartilhado.
// Regra: post com UMA #tag abre nodal (modal interno); 2+ tags = tags normais.
// Quem abre primeiro define o tempo de vida; ao expirar tudo é deletado e a tag libera.
// Reload esconde o nodal: só reabre usando a tag. Estado no servidor (sobrevive sem cache).
var NOD = {tag:"", exp:0, owner:"", opener:null, pollT:null, countT:null, expired:false};
function nodalNorm(t){ return String(t||"").trim().replace(/^#+/,"").toLowerCase().replace(/[^a-z0-9-_]/g,"").slice(0,24); }
function nodalOk(t){ return /^[a-z0-9-_]{2,24}$/.test(t||""); }
function nodalTagsOf(text){
  var re = /#([A-Za-z0-9-_]{2,24})/g, m, seen = {}, out = [];
  var s = String(text||"");
  while((m = re.exec(s))){ var t = String(m[1]).toLowerCase(); if(!seen[t]){ seen[t] = 1; out.push(t); } }
  return out;
}
function nodalMe(){
  try{ if(typeof me !== "undefined" && me && me.nick) return {nick:me.nick, hash:me.hash}; }catch(e){}
  var a = "";
  try{ a = anonId; }catch(e){}
  if(!/^anon-[0-9]{4}$/.test(a||"")) a = "anon-"+Math.floor(Math.random()*9000+1000);
  return {anon:a};
}
function fmtLeft(ms){
  if(ms<=0) return "0s";
  var s = Math.floor(ms/1000), d = Math.floor(s/86400), h = Math.floor(s%86400/3600), m = Math.floor(s%3600/60);
  if(d>0) return d+"d"+(h?h+"h":"");
  if(h>0) return h+"h"+(m?m+"min":"");
  if(m>0) return m+"min";
  return s+"s";
}
/* ---------- pintura das tags no feed ---------- */
function nodalPaintTx(el){
  try{
    if(!el || el.dataset.nt) return;
    var txt = el.textContent || "";
    var tags = nodalTagsOf(txt);
    if(!tags.length) return;
    el.dataset.nt = "1";
    var single = tags.length === 1;
    var re = /#([A-Za-z0-9-_]{2,24})/g, m, last = 0;
    el.innerHTML = "";
    while((m = re.exec(txt))){
      if(m.index > last) el.appendChild(document.createTextNode(txt.slice(last, m.index)));
      (function(tag){
        if(single){
          var b = document.createElement("button");
          b.type = "button"; b.className = "ntag"; b.textContent = "#"+tag;
          b.title = "abrir nodal temporário #"+tag;
          b.onclick = function(ev){ ev.stopPropagation(); openNodal(tag, b); };
          el.appendChild(b);
        } else {
          var sp = document.createElement("span");
          sp.className = "ntagoff"; sp.textContent = "#"+tag;
          sp.title = "só 1 #tag por post abre nodal";
          el.appendChild(sp);
        }
      })(String(m[1]).toLowerCase());
      last = m.index + m[0].length;
    }
    if(last < txt.length) el.appendChild(document.createTextNode(txt.slice(last)));
  }catch(e){}
}
window.nodalPaintFeed = function(scope){
  try{ (scope||document).querySelectorAll(".post .ptext").forEach(nodalPaintTx); }catch(e){}
};
/* ---------- modal ---------- */
var modalBuilt = false, nodalModal, nodalTitle, nodalMeta, nodalExp, nodalLog,
    nodalCreate, nodalTtlSel, nodalCreateBtn, nodalCreateMsg,
    nodalComp, nodalInput, nodalFile, nodalLink, nodalSend, nodalMsg, nodalExpired, nodalReBtn;
function ensureModal(){
  if(modalBuilt && document.getElementById("nodalModal")) return;
  modalBuilt = true;
  var old = document.getElementById("nodalModal");
  try{ if(old) old.remove(); }catch(e){}
  var st = document.createElement("style");
  st.textContent = "#nodalCard #nodalMeta,#nodalCard #nodalExp{display:block;margin:3px 0;line-height:1.5}.ntag{background:#e3f0ff;border:1px solid #6aa5d7;color:#0b5fa5;border-radius:20px;padding:1px 10px;margin:0 2px;cursor:pointer;font-size:12px;font-weight:bold}.ntag:hover{background:#6aa5d7;color:#fff}.ntagoff{background:#f0f0f0;border:1px dashed #aaa;color:#666;border-radius:20px;padding:1px 10px;margin:0 2px;font-size:12px}#nodalModal{position:fixed;inset:0;background:rgba(20,40,70,.55);display:flex;align-items:flex-start;justify-content:center;padding:6vh 12px;z-index:60}#nodalCard{background:#fff;border-radius:12px;padding:12px;max-width:560px;width:100%;max-height:82vh;overflow-y:auto;text-align:left}#nodalLog{max-height:46vh;overflow-y:auto;border:1px solid #d9e6f2;border-radius:8px;padding:8px;margin:8px 0;background:#fbfdff}#nodalLog .nmsg{font-size:13px;margin:4px 0;line-height:1.45}#nodalLog img{max-width:100%;border-radius:6px}#nodalExp.urgent{color:#c00;font-weight:bold}";
  document.head.appendChild(st);
  nodalModal = document.createElement("div");
  nodalModal.id = "nodalModal"; nodalModal.hidden = true;
  var card = document.createElement("div"); card.id = "nodalCard";
  var head = document.createElement("div");
  head.style.cssText = "display:flex;gap:8px;align-items:center";
  nodalTitle = document.createElement("b"); nodalTitle.id = "nodalTitle";
  nodalTitle.style.cssText = "font-size:17px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap";
  head.appendChild(nodalTitle);
  var cx = document.createElement("button"); cx.textContent = "x"; cx.style.marginLeft = "auto"; cx.style.flex = "none";
  cx.title = "fechar (o nodal continua existindo até expirar)";
  cx.onclick = closeNodal;
  head.appendChild(cx);
  card.appendChild(head);
  nodalMeta = document.createElement("div"); nodalMeta.id = "nodalMeta"; nodalMeta.className = "meta";
  card.appendChild(nodalMeta);
  nodalExp = document.createElement("div"); nodalExp.id = "nodalExp"; nodalExp.className = "meta";
  card.appendChild(nodalExp);
  nodalCreate = document.createElement("div"); nodalCreate.id = "nodalCreate"; nodalCreate.hidden = true;
  nodalCreate.style.cssText = "margin:8px 0;padding:8px;border:1px dashed #6aa5d7;border-radius:8px";
  var cl = document.createElement("div"); cl.textContent = "nodal novo — você define quanto tempo ele existe:";
  cl.style.cssText = "font-size:13px;margin-bottom:6px"; nodalCreate.appendChild(cl);
  nodalTtlSel = document.createElement("select"); nodalTtlSel.id = "nodalTtlSel";
  [["30","30 min"],["120","2 horas"],["720","12 horas"],["1440","24 horas"],["4320","3 dias"]].forEach(function(o){
    var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1];
    if(o[0]==="1440") op.selected = true;
    nodalTtlSel.appendChild(op);
  });
  nodalCreate.appendChild(nodalTtlSel);
  nodalCreateBtn = document.createElement("button"); nodalCreateBtn.id = "nodalCreateBtn"; nodalCreateBtn.textContent = "criar nodal";
  nodalCreateBtn.style.marginLeft = "6px";
  nodalCreateBtn.onclick = createNodal;
  nodalCreate.appendChild(nodalCreateBtn);
  nodalCreateMsg = document.createElement("span"); nodalCreateMsg.id = "nodalCreateMsg"; nodalCreateMsg.className = "meta";
  nodalCreateMsg.style.marginLeft = "6px";
  nodalCreate.appendChild(nodalCreateMsg);
  card.appendChild(nodalCreate);
  nodalLog = document.createElement("div"); nodalLog.id = "nodalLog";
  card.appendChild(nodalLog);
  nodalExpired = document.createElement("div"); nodalExpired.id = "nodalExpired"; nodalExpired.hidden = true;
  nodalExpired.style.cssText = "margin:8px 0;padding:8px;border:1px solid #c00;border-radius:8px;font-size:13px";
  var et = document.createElement("div"); et.textContent = "⏳ tempo esgotado — tudo foi deletado e a tag foi liberada.";
  nodalExpired.appendChild(et);
  nodalReBtn = document.createElement("button"); nodalReBtn.id = "nodalReBtn"; nodalReBtn.textContent = "criar de novo";
  nodalReBtn.style.marginTop = "6px";
  nodalReBtn.onclick = function(){ showCreate(); try{ nodalTtlSel.focus(); }catch(e){} };
  nodalExpired.appendChild(nodalReBtn);
  card.appendChild(nodalExpired);
  nodalComp = document.createElement("div"); nodalComp.id = "nodalComp";
  nodalInput = document.createElement("input"); nodalInput.id = "nodalInput"; nodalInput.placeholder = "mensagem no nodal...";
  nodalInput.style.cssText = "flex:1;min-width:0";
  nodalComp.appendChild(nodalInput);
  nodalSend = document.createElement("button"); nodalSend.id = "nodalSend"; nodalSend.textContent = "enviar";
  nodalSend.onclick = sendNodal;
  nodalComp.appendChild(nodalSend);
  nodalComp.style.cssText = "display:flex;gap:6px;margin-top:6px";
  card.appendChild(nodalComp);
  var frow = document.createElement("div");
  frow.id = "nodalFrow";
  frow.style.cssText = "display:flex;gap:6px;margin-top:6px";
  nodalFile = document.createElement("input"); nodalFile.id = "nodalFile"; nodalFile.type = "file";
  nodalFile.accept = "image/*,video/*,audio/*";
  nodalFile.style.cssText = "flex:1;min-width:0";
  frow.appendChild(nodalFile);
  nodalLink = document.createElement("input"); nodalLink.id = "nodalLink"; nodalLink.placeholder = "ou link https://...";
  nodalLink.className = "linkIn"; nodalLink.style.cssText = "flex:1;min-width:0";
  frow.appendChild(nodalLink);
  card.appendChild(frow);
  nodalMsg = document.createElement("div"); nodalMsg.id = "nodalMsg"; nodalMsg.className = "meta";
  nodalMsg.style.marginTop = "4px";
  card.appendChild(nodalMsg);
  nodalInput.addEventListener("keydown", function(ev){ if(ev.key === "Enter") sendNodal(); });
  nodalModal.addEventListener("keydown", function(ev){ if(ev.key === "Escape") closeNodal(); });
  nodalModal.appendChild(card);
  document.body.appendChild(nodalModal);
}
function focusInput(){
  try{
    nodalModal.scrollIntoView({block:"nearest"});
    nodalLog.scrollTop = nodalLog.scrollHeight;
    setTimeout(function(){ try{ nodalInput.focus({preventScroll:true}); }catch(e){ try{ nodalInput.focus(); }catch(e2){} } }, 60);
  }catch(e){}
}
function showOnly(which){
  nodalCreate.hidden = which !== "create";
  nodalLog.hidden = which === "create" || which === "loading";
  nodalComp.hidden = which !== "chat";
  nodalExpired.hidden = which !== "expired";
  var fr = document.getElementById("nodalFrow");
  if(fr) fr.hidden = which !== "chat";
}
function renderMsgs(msgs){
  nodalLog.innerHTML = "";
  (msgs||[]).forEach(function(m){
    var d = document.createElement("div"); d.className = "nmsg";
    var nm = document.createElement("b");
    nm.textContent = (m.f||"?")+": ";
    d.appendChild(nm);
    if(m.t){ var tx = document.createElement("span"); tx.textContent = m.t; d.appendChild(tx); }
    if(m.u){
      var y = String(m.y||"");
      if(y.indexOf("image/") === 0){ var im = document.createElement("img"); im.src = m.u; im.loading = "lazy"; d.appendChild(document.createElement("br")); d.appendChild(im); }
      else if(y.indexOf("video/") === 0){ var v = document.createElement("video"); v.src = m.u; v.controls = true; v.style.maxWidth = "100%"; d.appendChild(document.createElement("br")); d.appendChild(v); }
      else { var a = document.createElement("a"); a.href = m.u; a.target = "_blank"; a.rel = "noopener"; a.textContent = " [arquivo]"; d.appendChild(a); }
    }
    var tm = document.createElement("div"); tm.className = "meta";
    try{ tm.textContent = new Date(m.at).toLocaleString(); }catch(e){}
    d.appendChild(tm);
    nodalLog.appendChild(d);
  });
  nodalLog.scrollTop = nodalLog.scrollHeight;
  try{ if(window.eroScanMedia) window.eroScanMedia(nodalLog); }catch(e){}
}
function tickCount(){
  try{
    if(!NOD.tag || NOD.expired) return;
    var left = NOD.exp - Date.now();
    if(left <= 0){ expiredView(); return; }
    nodalExp.textContent = "⏳ expira em "+fmtLeft(left)+" · dono: "+(NOD.owner||"?");
    nodalExp.classList.toggle("urgent", left < 10*60000);
  }catch(e){}
}
function joinNodal(g){
  NOD.exp = g.nodal.exp; NOD.owner = g.nodal.owner; NOD.expired = false;
  nodalMeta.textContent = "dono: "+(g.nodal.owner||"?")+" · "+(g.nodal.n||0)+" msgs";
  showOnly("chat");
  renderMsgs(g.msgs);
  nodalMsg.textContent = "";
  try{ rpc("subNodal", NOD.tag).catch(function(){}); }catch(e){}
  try{ clearInterval(NOD.pollT); clearInterval(NOD.countT); }catch(e){}
  NOD.pollT = setInterval(function(){ refreshNodal(true); }, 10000);
  NOD.countT = setInterval(tickCount, 5000);
  tickCount();
  focusInput();
}
function showCreate(){
  showOnly("create");
  nodalCreateMsg.textContent = "";
  nodalExp.textContent = "tag livre — quem cria define o tempo de vida";
  try{ nodalTtlSel.focus(); }catch(e){}
}
function expiredView(){
  if(NOD.expired) return;
  NOD.expired = true;
  try{ clearInterval(NOD.pollT); clearInterval(NOD.countT); }catch(e){}
  showOnly("expired");
}
async function refreshNodal(quiet){
  if(!NOD.tag || nodalModal.hidden || NOD.expired) return;
  try{
    var nearBottom = (nodalLog.scrollHeight - nodalLog.scrollTop - nodalLog.clientHeight) < 120;
    var g = JSON.parse(await rpc("nodalGet", JSON.stringify(Object.assign({tag:NOD.tag}, nodalMe()))));
    if(!g.ok){ if(g.err === "expired") expiredView(); return; }
    NOD.exp = g.nodal.exp;
    nodalMeta.textContent = "dono: "+(g.nodal.owner||"?")+" · "+(g.nodal.n||0)+" msgs";
    var st = nodalLog.scrollTop;
    renderMsgs(g.msgs);
    if(!nearBottom) nodalLog.scrollTop = st;
    tickCount();
  }catch(e){ if(!quiet){ try{ nodalMsg.textContent = "sem servidor"; }catch(e2){} } }
}
window.nodalOnMsg = function(tag){
  try{ if(tag === NOD.tag && !nodalModal.hidden && !NOD.expired) refreshNodal(true); }catch(e){}
};
async function openNodal(tag, opener){
  tag = nodalNorm(tag);
  if(!nodalOk(tag)) return;
  ensureModal();
  NOD.tag = tag; NOD.opener = opener || null; NOD.expired = false;
  try{ clearInterval(NOD.pollT); clearInterval(NOD.countT); }catch(e){}
  nodalModal.hidden = false;
  nodalTitle.textContent = "#"+tag;
  nodalMeta.textContent = "";
  nodalMsg.textContent = "abrindo...";
  showOnly("loading");
  try{
    var g = JSON.parse(await rpc("nodalGet", JSON.stringify(Object.assign({tag:tag}, nodalMe()))));
    if(g.ok){ joinNodal(g); return; }
    if(g.err === "expired"){ showCreate(); return; }
    nodalMsg.textContent = "erro: "+(g.err||"?");
  }catch(e){ nodalMsg.textContent = "sem servidor (salve o generator p/ usar nodais)"; }
  try{ nodalModal.scrollIntoView({block:"nearest"}); }catch(e){}
}
async function createNodal(){
  var tag = NOD.tag;
  if(!nodalOk(tag)) return;
  var ttl = 1440;
  try{ ttl = parseInt(nodalTtlSel.value)||1440; }catch(e){}
  nodalCreateMsg.textContent = "criando...";
  try{
    var g = JSON.parse(await rpc("nodalOpen", JSON.stringify(Object.assign({tag:tag, ttlMin:ttl}, nodalMe()))));
    if(g.ok){ joinNodal(g); return; }
    nodalCreateMsg.textContent = "erro: "+(g.err||"?");
  }catch(e){ nodalCreateMsg.textContent = "sem servidor"; }
}
async function sendNodal(){
  if(!NOD.tag || NOD.expired) return;
  var text = "", f = null, linkUrl = "";
  try{ text = nodalInput.value.trim(); }catch(e){}
  try{ f = nodalFile.files[0]; }catch(e){}
  try{ linkUrl = nodalLink.value.trim(); }catch(e){}
  if(!text && !f && !linkUrl) return;
  try{
    var gap = null;
    if(typeof sendGapOk === "function") gap = sendGapOk("nodal", 8000);
    if(gap){ nodalMsg.textContent = "⏳ devagar! aguarde "+gap+"s"; return; }
  }catch(e){}
  nodalMsg.textContent = (f||linkUrl) ? "enviando..." : "";
  var url = "", mtype = "";
  try{
    if(f){
      if(typeof prepUpload === "function") f = await prepUpload(f, 1024, 0.82);
      if(f.size > 52428800){ nodalMsg.textContent = "arquivo muito grande (máx 50MB)"; return; }
      var r = await root.uploadPlugin(f, {expires:Date.now()+1000*60*60*24*30});
      if(r.error){ nodalMsg.textContent = "erro upload"; return; }
      url = r.url; mtype = f.type;
    } else if(linkUrl){
      if(linkUrl.indexOf("https://") !== 0){ nodalMsg.textContent = "link precisa ser https://"; return; }
      url = linkUrl.slice(0, 500);
      try{ if(typeof guessMime === "function") mtype = guessMime(url); }catch(e){}
    }
    var p = Object.assign({tag:NOD.tag, text:text, url:url, mtype:mtype}, nodalMe());
    var rr = JSON.parse(await rpc("nodalPush", JSON.stringify(p)));
    if(rr.ok){
      nodalInput.value = "";
      try{ nodalFile.value = ""; nodalLink.value = ""; }catch(e){}
      nodalMsg.textContent = "";
      refreshNodal(true);
    } else if(rr.err === "expired"){ expiredView(); }
    else {
      var em = "";
      try{ if(typeof spamErrText === "function") em = spamErrText(rr); }catch(e){}
      nodalMsg.textContent = em || ("erro: "+(rr.err||"?"));
    }
  }catch(e){ nodalMsg.textContent = "sem servidor"; }
}
function closeNodal(){
  try{ clearInterval(NOD.pollT); clearInterval(NOD.countT); }catch(e){}
  var op = NOD.opener;
  NOD.tag = ""; NOD.opener = null; NOD.expired = false;
  try{ nodalModal.hidden = true; }catch(e){}
  try{ if(op && op.focus) op.focus(); }catch(e){}
}
/* ---------- entrada por digitação + link ?tag= ---------- */
function injectEntry(){
  try{
    var box = document.getElementById("feedCtn");
    if(!box || document.getElementById("nodalEntry")) return;
    var row = document.createElement("div");
    row.id = "nodalEntry";
    row.style.cssText = "display:flex;gap:6px;margin-bottom:6px;align-items:center";
    var h = document.createElement("span"); h.className = "meta"; h.textContent = "nodal:";
    row.appendChild(h);
    var inp = document.createElement("input");
    inp.id = "nodalTagInput"; inp.placeholder = "#tag p/ abrir o nodal...";
    inp.style.cssText = "flex:1;min-width:0";
    row.appendChild(inp);
    var b = document.createElement("button"); b.textContent = "abrir";
    b.onclick = function(){ openNodal(inp.value, b); };
    row.appendChild(b);
    inp.addEventListener("keydown", function(ev){ if(ev.key === "Enter") openNodal(inp.value, b); });
    box.parentNode.insertBefore(row, box);
  }catch(e){}
}
window.nodalOpenUI = openNodal;
function initNodal(){
  injectEntry();
  try{
    var t = new URLSearchParams(location.search).get("tag") || "";
    t = nodalNorm(t);
    if(nodalOk(t)) setTimeout(function(){ openNodal(t, null); }, 1500);
  }catch(e){}
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNodal);
else initNodal();
})();
