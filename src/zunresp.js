/* zunresp.js — "responderam você" persistente (gancho de retorno).
   Problema: o sino de não-lidas (notify.js) é só em memória — zera ao trocar
   de aba ou recarregar, e menção (@nick) só funciona p/ nick cadastrado. Quem
   posta e sai nunca fica sabendo que responderam, então não volta.
   O que este módulo faz:
   - varre o feed (DOM) procurando (a) respostas em posts MEUS e (b) menções
     @meuNick em posts/respostas de outros (só logado);
   - guarda as novidades em localStorage por conta (nick ou anonId) — máx 20;
   - na volta (mesmo dias depois, mesmo navegador) mostra a caixa
     #zunRespBox acima do feed: "fulano e +2 responderam seus posts",
     com [ver] (abre o fio e rola até ele) e [marcar lidas].
   - primeira varredura após instalar só marca vistos (prime), sem pendência
     de coisa antiga.
   Segurança: só textContent (nicks/textos nunca vão p/ innerHTML); sem rede,
   sem eval; chaves prefixadas; limite de itens; respeita silenciados e
   bloqueados (window.ZunBlock.quiet) como o notify.js. */
(function(){
"use strict";
var LS_P = "zunRespV1:", LS_S = "zunRespSeen:";
var CAP_P = 20, CAP_S = 500;

function sessNick(){
  try{
    var raw = null;
    try{ raw = sessionStorage.getItem("orkutSession") || localStorage.getItem("orkutSession"); }catch(e){ raw = null; }
    var s = JSON.parse(raw || "null");
    return (s && s.nick) ? String(s.nick) : "";
  }catch(e){ return ""; }
}
function anonId(){ try{ return localStorage.getItem("orkutAnon") || ""; }catch(e){ return ""; } }
function accKey(){
  var n = sessNick();
  if(n) return "nick:" + n.toLowerCase();
  var a = anonId();
  return "anon:" + a;
}
function meKey(){
  var n = sessNick();
  if(n) return "@" + n;
  return anonId();
}
function loadArr(k, cap){
  try{
    var a = JSON.parse(localStorage.getItem(k) || "null");
    if(Array.isArray(a)) return a.filter(function(x){ return x && typeof x === "object"; }).slice(-cap);
  }catch(e){}
  return [];
}
function saveArr(k, a){
  try{ localStorage.setItem(k, JSON.stringify(a.slice(-CAP_P))); }catch(e){}
}
function pending(){ return loadArr(LS_P + accKey(), CAP_P); }
function seenMap(){
  var m = {};
  try{
    var a = JSON.parse(localStorage.getItem(LS_S + accKey()) || "null");
    if(Array.isArray(a)) a.forEach(function(k){ if(typeof k === "string") m[k] = 1; });
  }catch(e){}
  return m;
}
function saveSeen(m){
  try{
    var ks = Object.keys(m);
    localStorage.setItem(LS_S + accKey(), JSON.stringify(ks.slice(-CAP_S)));
  }catch(e){}
}
function norm(s){ return String(s == null ? "" : s).trim(); }
function low(s){ return norm(s).toLowerCase(); }
function hash(s){
  s = String(s || "");
  var h = 5381;
  for(var i = 0; i < s.length; i++){ h = (((h << 5) + h) + s.charCodeAt(i)) | 0; }
  return (h >>> 0).toString(36);
}
function quiet(from){
  try{
    var zb = window.ZunBlock;
    if(zb && zb.quiet) return zb.quiet(String(from || "").replace(/^@/, ""));
  }catch(e){}
  return false;
}
function mentions(txt, nickLow){
  if(!nickLow) return false;
  try{ return new RegExp("(^|\\s)@" + nickLow.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i").test(String(txt || "")); }
  catch(e){ return false; }
}
function record(k, pid, from, seen, pend){
  if(seen[k]) return false;
  seen[k] = 1;
  var dup = false;
  pend.forEach(function(e){ if(e && e.k === k) dup = true; });
  if(!dup){
    pend.push({k:k, pid:String(pid || ""), from:norm(from).slice(0, 24), at:Date.now()});
    while(pend.length > CAP_P) pend.shift();
  }
  return !dup;
}

/* ---------- caixa ---------- */
function feedBox(){
  try{
    var fc = document.getElementById("feedCtn");
    return fc ? fc.closest(".box") : null;
  }catch(e){ return null; }
}
function box(){
  var b = document.getElementById("zunRespBox");
  if(b) return b;
  b = document.createElement("div");
  b.id = "zunRespBox";
  b.className = "box";
  b.hidden = true;
  var h = document.createElement("h3");
  h.textContent = "💬 responderam você";
  b.appendChild(h);
  var t = document.createElement("div");
  t.id = "zunRespTxt";
  t.className = "meta";
  t.style.margin = "4px 0 8px";
  b.appendChild(t);
  var row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "6px";
  row.style.flexWrap = "wrap";
  var ver = document.createElement("button");
  ver.id = "zunRespGo";
  ver.textContent = "ver";
  row.appendChild(ver);
  var clr = document.createElement("button");
  clr.id = "zunRespClear";
  clr.textContent = "marcar lidas";
  row.appendChild(clr);
  b.appendChild(row);
  ver.onclick = function(){ goFirst(); };
  clr.onclick = function(){ clear(); };
  var fb = feedBox();
  try{
    if(fb && fb.parentNode) fb.parentNode.insertBefore(b, fb);
    else document.body.appendChild(b);
  }catch(e){ try{ document.body.appendChild(b); }catch(e2){} }
  return b;
}
function paint(){
  var b = box();
  var p = pending();
  var t = document.getElementById("zunRespTxt");
  if(!p.length){ b.hidden = true; return; }
  var names = [], seenN = {};
  p.forEach(function(e){
    var f = norm(e && e.from);
    if(f && !seenN[low(f)] && names.length < 2){ seenN[low(f)] = 1; names.push(f); }
  });
  var rest = p.length - names.length;
  var msg = names.join(" e ");
  if(rest > 0) msg += " e +" + rest;
  var tail = (p.length === 1) ? "respondeu seu post" : "responderam seus posts";
  try{ if(window.zunzumTr) tail = window.zunzumTr(tail); }catch(e){}
  msg += " " + tail;
  try{ if(t) t.textContent = "💬 " + msg; }catch(e){}
  b.hidden = false;
}
function openReplies(pid){
  try{
    var post = document.querySelector('.post[data-pid="' + String(pid).replace(/"/g, "") + '"]');
    if(!post) return false;
    var rbox = post.querySelector("[data-pid]:not(.post)");
    if(rbox && rbox.hidden){
      var btn = post.querySelector('button[data-rct="' + String(pid).replace(/"/g, "") + '"]');
      if(btn) btn.click();
      else rbox.hidden = false;
    }
    try{ post.scrollIntoView({block:"center"}); }catch(e){}
    try{
      post.style.outline = "2px solid #6aa5d7";
      setTimeout(function(){ try{ post.style.outline = ""; }catch(e){} }, 1800);
    }catch(e){}
    return true;
  }catch(e){ return false; }
}
function goFirst(){
  var p = pending();
  for(var i = 0; i < p.length; i++){
    if(openReplies(p[i].pid)){
      var pid = p[i].pid;
      var rest = p.filter(function(e){ return String(e.pid) !== String(pid); });
      saveArr(LS_P + accKey(), rest);
      paint();
      return;
    }
  }
  clear();
}
function clear(){
  try{ localStorage.removeItem(LS_P + accKey()); }catch(e){}
  paint();
}

/* ---------- varredura ---------- */
function scan(){
  try{
    var mk = meKey();
    if(!mk) return;
    var myLow = low(mk);
    var nl = sessNick().toLowerCase();
    var isAnon = mk.charAt(0) !== "@";
    var posts = document.querySelectorAll("#feedCtn .post[data-pid]");
    if(!posts.length) return;
    var seen = seenMap();
    var primed = false;
    try{ primed = localStorage.getItem(LS_S + accKey()) !== null; }catch(e){ primed = true; }
    var pend = pending();
    var touched = false;
    Array.prototype.forEach.call(posts, function(p){
      var pid = p.getAttribute("data-pid");
      if(!pid) return;
      var au = null;
      try{ au = p.querySelector(".phead .chatname"); }catch(e){ au = null; }
      var author = au ? norm(au.textContent) : "";
      var mine = low(author) === myLow;
      var reps = [];
      try{ reps = p.querySelectorAll(".freply"); }catch(e){ reps = []; }
      Array.prototype.forEach.call(reps, function(r){
        var fa = null;
        try{ fa = r.querySelector(".frhead .chatname"); }catch(e){ fa = null; }
        var from = fa ? norm(fa.textContent) : "";
        if(!from || low(from) === myLow) return;
        if(quiet(from)) return;
        var bd = null;
        try{ bd = r.querySelector(".frbody"); }catch(e){ bd = null; }
        var txt = bd ? String(bd.textContent || "").slice(0, 200) : "";
        var k = "r|" + pid + "|" + low(from) + "|" + hash(txt);
        if(mine){
          if(!primed){ seen[k] = 1; touched = true; return; }
          if(record(k, pid, from, seen, pend)) touched = true;
        }else if(!isAnon && mentions(txt, nl)){
          if(!primed){ seen[k] = 1; touched = true; return; }
          if(record(k, pid, from, seen, pend)) touched = true;
        }
      });
      if(!mine && !isAnon){
        var pt = null;
        try{ pt = p.querySelector(".pbody .ptext"); }catch(e){ pt = null; }
        var ptxt = pt ? String(pt.textContent || "").slice(0, 200) : "";
        if(mentions(ptxt, nl)){
          var k2 = "p|" + pid + "|" + low(author) + "|" + hash(ptxt);
          if(!primed){ seen[k2] = 1; touched = true; }
          else if(record(k2, pid, author, seen, pend)) touched = true;
        }
      }
    });
    if(touched){
      saveSeen(seen);
      saveArr(LS_P + accKey(), pend);
      paint();
    }else if(primed){
      paint();
    }else{
      saveSeen(seen);
    }
  }catch(e){}
}

/* ---------- boot ---------- */
function schedule(){ try{ setTimeout(scan, 1500); }catch(e){} }
try{
  if(typeof window.loadFeed === "function" && !window.loadFeed._zunRespHooked){
    var _lf = window.loadFeed;
    var wrapped = function(f){
      var r;
      try{ r = _lf.call(this, f); }catch(e){ try{ schedule(); }catch(x){} throw e; }
      try{
        if(r && typeof r.then === "function") return r.then(function(v){ schedule(); return v; }, function(e){ schedule(); throw e; });
      }catch(e){}
      schedule();
      return r;
    };
    wrapped._zunRespHooked = true;
    window.loadFeed = wrapped;
  }
}catch(e){}
try{ setTimeout(scan, 4000); }catch(e){}
try{ setInterval(scan, 30000); }catch(e){}
try{ document.addEventListener("visibilitychange", function(){ if(!document.hidden) schedule(); }); }catch(e){}
try{ window.ZunResp = {scan:scan, paint:paint, clear:clear, pending:pending}; }catch(e){}
})();
