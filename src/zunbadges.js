/* ============================================================================
 * zunbadges.js — selos Dev (dono) + 7 dias (fidelidade).
 * PEDIDO DO DONO: símbolo visual "Dev" p/ o dono (SVG) + símbolo p/ quem
 * entrou no site em 7 dias (acumulados, sem precisar ser direto) + teto de
 * 200 usuários cadastrados (passou disso não tem símbolo) + anti-clone.
 *
 * REGRAS (paridade servidor <-> local):
 * - Só o SERVIDOR decide: badge_get({nicks}) -> {seals:{nick:{dev,loyal}}}.
 *   O cliente NUNCA pinta sem essa resposta (fail-closed: sem SQL = loyal 0).
 * - Dev = lower(nick) == lower(site_config.owner_nick) (canônico kkk).
 * - Loyal = 7 dias distintos (UTC) em badge_visits + conta ativa + rank de
 *   criação <= 200. Rank = posição por created entre não-deletados.
 * - Anti-clone: só este módulo cria .zun-seal[data-zun-seal="srv"]; o
 *   varredor remove qualquer .zun-seal sem o atributo (tentativa de CSS ou
 *   HTML injetado). SVG é fixo via createElementNS (sem innerHTML com dado
 *   do usuário; textContent p/ "Dev"/"7d").
 * ========================================================================== */
(function(){
"use strict";
var CACHE = {}; // lower -> {dev:0/1, loyal:0/1, days:n}
var PEND = null, LAST = 0, TICKED = 0;
// anti-loop espelho (2026-11-02): se o backend falhar, não tenta de novo
// a cada mutação — espera (cooldown crescente). Sem isso, qualquer erro de
// rede virava tempestade de refetch a cada mensagem do chat.
var COOLUNTIL = 0, FAILS = 0;
var SVG_NS = "http://www.w3.org/2000/svg";

function low(n){ try{ return String(n||"").replace(/^@/,"").trim().toLowerCase(); }catch(e){ return ""; } }
function okNick(n){ return /^[a-z0-9-_]{2,20}$/.test(n) && !/^anon-[a-z0-9]{6,12}$/.test(n); }

function rpc(name, data){
  try{
    if(typeof window.rpc === "function") return window.rpc(name, data);
    if(typeof rpc2 === "function") return rpc2(name, data);
  }catch(e){}
  try{
    if(window.sbRpc) return window.sbRpc(name, data);
  }catch(e){}
  return Promise.reject(new Error("sem-rpc"));
}
function crpc(name, data){
  try{ if(typeof window.crpc === "function") return window.crpc(name, data); }catch(e){}
  return rpc(name, data);
}

/* --- SVGs fixos (sem dado do usuário dentro) --- */
function svgDev(){
  var s = document.createElementNS(SVG_NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("width", "13"); s.setAttribute("height", "13");
  s.setAttribute("aria-hidden", "true");
  var p = document.createElementNS(SVG_NS, "path");
  p.setAttribute("d", "M12 1.8 14.6 8.2 21.5 8.6 16.2 12.7 17.8 19.4 12 15.7 6.2 19.4 7.8 12.7 2.5 8.6 9.4 8.2Z");
  p.setAttribute("fill", "#FFDD00"); p.setAttribute("stroke", "#111");
  p.setAttribute("stroke-width", "1.4"); p.setAttribute("stroke-linejoin", "round");
  s.appendChild(p);
  return s;
}
function svgLoyal(){
  var s = document.createElementNS(SVG_NS, "svg");
  s.setAttribute("viewBox", "0 0 24 24");
  s.setAttribute("width", "13"); s.setAttribute("height", "13");
  s.setAttribute("aria-hidden", "true");
  var c = document.createElementNS(SVG_NS, "circle");
  c.setAttribute("cx", "12"); c.setAttribute("cy", "12"); c.setAttribute("r", "10");
  c.setAttribute("fill", "#6aa5d7"); c.setAttribute("stroke", "#fff");
  c.setAttribute("stroke-width", "1.6");
  s.appendChild(c);
  var p = document.createElementNS(SVG_NS, "path");
  p.setAttribute("d", "M8.2 12.4 10.9 15.1 15.9 8.9");
  p.setAttribute("fill", "none"); p.setAttribute("stroke", "#fff");
  p.setAttribute("stroke-width", "2.2"); p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  s.appendChild(p);
  return s;
}

function makeSeal(kind, nick){
  var el = document.createElement("span");
  el.className = (kind === "dev") ? "zun-seal-dev" : "zun-seal-loyal";
  el.setAttribute("data-zun-seal", "srv");
  el.setAttribute("data-nick", low(nick));
  if(kind === "dev"){
    el.title = "Dev — dono do zunzum";
    el.appendChild(svgDev());
    var t = document.createElement("span");
    t.textContent = "Dev";
    el.appendChild(t);
  } else {
    var d = (CACHE[low(nick)] && CACHE[low(nick)].days) || 7;
    el.title = "aqui há " + d + " dias (7+ dias)";
    el.appendChild(svgLoyal());
    var t2 = document.createElement("span");
    t2.textContent = "7d";
    el.appendChild(t2);
  }
  return el;
}

function cleanFakeSeals(root){
  try{
    var q = (root||document).querySelectorAll
      ? (root||document).querySelectorAll('.zun-seal-dev,.zun-seal-loyal')
      : [];
    for(var i=0;i<q.length;i++){
      try{
        if(q[i].getAttribute && q[i].getAttribute("data-zun-seal") === "srv") continue;
        var p = q[i].parentNode; if(p) p.removeChild(q[i]);
      }catch(e){}
    }
  }catch(e){}
}

async function fetchSeals(nicks){
  var uniq = [], seen = {};
  (nicks||[]).forEach(function(n){
    var k = low(n);
    if(!k || !okNick(k) || seen[k]) return;
    seen[k] = 1;
    if(CACHE[k] === undefined) uniq.push(k);
  });
  if(!uniq.length) return CACHE;
  try{ if(Date.now() < COOLUNTIL) return CACHE; }catch(e){}
  if(PEND){ try{ await PEND; }catch(e){} }
  var batch = uniq.slice(0, 30);
  batch.forEach(function(k){ CACHE[k] = null; });
  var ok = false;
  try{
    PEND = crpc("badgeGet", JSON.stringify(batch));
    var t = await PEND;
    var r = JSON.parse(t);
    if(r && r.ok && r.seals){
      Object.keys(r.seals).forEach(function(k){
        var v = r.seals[k]||{};
        CACHE[String(k).toLowerCase()] = {
          dev: v.dev?1:0, loyal: v.loyal?1:0, days: (+v.days)||0
        };
      });
      batch.forEach(function(k){ if(CACHE[k] === null) CACHE[k] = {dev:0,loyal:0,days:0}; });
      ok = true;
    }
  }catch(e){}
  if(!ok) batch.forEach(function(k){ try{ if(CACHE[k]===null) delete CACHE[k]; }catch(e){} });
  try{
    if(ok){ FAILS = 0; COOLUNTIL = 0; }
    else { FAILS++; COOLUNTIL = Date.now() + Math.min(5*60*1000, 15000*FAILS); }
  }catch(e){}
  PEND = null;
  repaintAll();
  var rest = uniq.slice(30);
  if(rest.length) setTimeout(function(){ fetchSeals(rest); }, 400);
  return CACHE;
}

function paintOne(nmEl){
  try{
    if(!nmEl || !nmEl.parentNode) return;
    var nick = low(nmEl.getAttribute ? nmEl.getAttribute("data-znick") : "") ||
      low(nmEl.textContent||"");
    if(!nick || !okNick(nick)) return;
    // evita duplicar: o selo é irmão (nunca dentro do nick p/ não quebrar @menção)
    var par = nmEl.parentNode;
    try{
      var old = par.querySelectorAll(':scope > .zun-seal-dev, :scope > .zun-seal-loyal');
      for(var i=0;i<old.length;i++){
        try{
          if(old[i].getAttribute("data-zun-seal") !== "srv"){ old[i].parentNode.removeChild(old[i]); continue; }
          if((old[i].getAttribute("data-nick")||"") !== nick) old[i].parentNode.removeChild(old[i]);
        }catch(e){}
      }
    }catch(e){}
    var st = CACHE[nick];
    if(st === undefined){ fetchSeals([nick]); return; }
    if(!st) return;
    var hasDev = false, hasLoyal = false;
    try{
      var cur = par.querySelectorAll(':scope > .zun-seal-dev, :scope > .zun-seal-loyal');
      for(var j=0;j<cur.length;j++){
        if(cur[j].className.indexOf("dev")>=0) hasDev = true;
        else hasLoyal = true;
      }
    }catch(e){}
    if(st.dev && !hasDev){
      try{ par.insertBefore(makeSeal("dev", nick), nmEl.nextSibling); }catch(e){}
    }
    if(st.loyal && !hasLoyal){
      try{
        var ref = nmEl.nextSibling;
        // se já tem Dev, põe depois dele
        try{
          var devEl = par.querySelector(':scope > .zun-seal-dev[data-nick="'+nick+'"]');
          if(devEl && devEl.nextSibling) ref = devEl.nextSibling;
          else if(devEl) ref = null;
        }catch(e2){}
        par.insertBefore(makeSeal("loyal", nick), ref);
      }catch(e){}
    }
  }catch(e){}
}

function repaintAll(){
  try{
    cleanFakeSeals(document);
    var els = document.querySelectorAll("[data-znick]");
    var need = [];
    for(var i=0;i<els.length && i<200;i++){
      try{
        var k = low(els[i].getAttribute("data-znick"));
        if(k && okNick(k) && CACHE[k]===undefined) need.push(k);
        paintOne(els[i]);
      }catch(e){}
    }
    if(need.length) fetchSeals(need.slice(0,30));
  }catch(e){}
}

var obsOn = false, obs = null, tm = 0;
function ensureObs(){
  if(obsOn) return; obsOn = true;
  try{
    if(!obs){
      obs = new MutationObserver(function(muts){
        var hit = false;
        for(var i=0;i<muts.length;i++){
          var m = muts[i];
          // anti-loop com seo.js (2026-11-02): o sync do SEO reescreve #seoFeed
          // (dentro de #seoBox) e caía no observer do body, que repintava tudo
          // e reacordava o observer do SEO (ping-pong que travava o Neocities).
          try{ var _t = m.target; if(_t && _t.closest && _t.closest("#seoBox")) continue; }catch(_e){}
          // anti-loop próprio (2026-11-02): ignora os selos que NÓS inserimos.
          // Sem isso, cada repaint reagendava outro repaint (via body).
          if(m.addedNodes && m.addedNodes.length){
            var own = true;
            for(var a=0;a<m.addedNodes.length;a++){
              var nd = m.addedNodes[a];
              try{
                if(nd && nd.nodeType === 1 && nd.getAttribute &&
                   nd.getAttribute("data-zun-seal") === "srv") continue;
              }catch(_e2){}
              own = false; break;
            }
            if(own) continue;
            hit = true; break;
          }
          if(m.type === "attributes" && m.target && m.target.getAttribute &&
             m.target.getAttribute("data-znick")){ hit = true; break; }
        }
        if(!hit) return;
        if(tm) clearTimeout(tm);
        tm = setTimeout(function(){
          tm = 0;
          try{ if(document.hidden) return; }catch(e){}
          try{ repaintAll(); }catch(e){}
        }, 500);
      });
    }
    ["feedCtn","pubLog","privLog"].forEach(function(id){
      try{ var el = document.getElementById(id); if(el) obs.observe(el, {childList:true, subtree:true}); }catch(e){}
    });
    try{ obs.observe(document.body, {childList:true, subtree:true}); }catch(e){}
    // anti-clone contínuo (barato: a cada 3s limpa fakes)
    setInterval(function(){ try{ cleanFakeSeals(document); }catch(e){} }, 3000);
  }catch(e){}
}

async function tick(){
  if(TICKED) return; TICKED = 1;
  try{
    var meN = "";
    try{ meN = low((typeof me!=="undefined"&&me&&me.nick)||""); }catch(e){}
    if(!meN || !okNick(meN)) return;
    var t = await rpc("badgeTick", JSON.stringify({}));
    var r = JSON.parse(t);
    if(r && r.ok){
      CACHE[meN] = {dev:r.dev?1:0, loyal:r.loyal?1:0, days:(+r.days)||0};
      repaintAll();
    }
  }catch(e){}
}

try{
  window.ZunBadges = {tick:tick, fetch:fetchSeals, repaint:repaintAll, clean:cleanFakeSeals, cache:CACHE};
  if(document.readyState !== "loading") setTimeout(function(){ try{ ensureObs(); repaintAll(); tick(); }catch(e){} }, 800);
  else document.addEventListener("DOMContentLoaded", function(){ try{ ensureObs(); repaintAll(); tick(); }catch(e){} });
  setTimeout(function(){ try{ ensureObs(); repaintAll(); tick(); }catch(e){} }, 2500);
  // carimba 1x ao logar (evento de sessão) + 1x/dia
  try{
    window.addEventListener("storage", function(ev){
      try{ if(ev && ev.key && /zunzum.*sess|orkut.*sess/i.test(ev.key)) TICKED = 0, tick(); }catch(e){}
    });
  }catch(e){}
}catch(e){}
})();
