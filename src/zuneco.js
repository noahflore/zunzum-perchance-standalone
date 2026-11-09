(function(){
"use strict";
/* ZUN ECO — medidor de egress Supabase + modo econômico (r1 2026-11-06).
   Motivo: o projeto estourou 2.72 GB de egress no Supabase (cota do Free =
   5 GB/mês). Sem chave secreta o site NÃO lê o medidor oficial — então mede
   o próprio tráfego de saída (respostas REST via content-length) e, perto do
   teto, desacelera os pollers sozinho.

   Como funciona:
   - `src/sb.js` (sbFetch) chama `window.__ecoAdd(url, bytes)` com o
     content-length de cada resposta. Só conta host `.supabase.co`.
   - Realtime (WebSocket) NÃO é contado — é pequeno perto do polling
     (feedGet com 2000 likes + replies a cada 60s por usuário) e some no eco.
   - Estado em `localStorage zunzumEco`: {m:"AAAA-MM", base, used, forced}.
     Ciclo (dia 24) virou → zera (base volta p/ 0; ajuste com `__eco.setBaseGB(x)`).
   - FONTE DA VERDADE É O DB (tabela `eco_usage`, ver `src/supabase-eco.sql`):
     na abertura lê base/used do mês; a contagem local acumula em `pending` e
     descarrega via RPC `eco_bump` a cada 60s + ao ocultar a aba. Soma no
     servidor (funciona com N aparelhos juntos); sem banco (modo local/offline)
     cai p/ o acumulado local. Flush é 1 POST minúsculo (~200 bytes).
   - Base inicial 2.72 GB em 2026-11 (gasto já acumulado informado pelo dono).
   - Eco em 4 níveis (r3): L0 normal; L1 leve (≥3.5 GB, pollers 2x); L2
     moderado (≥4.2 GB, pollers ~5x + sem publicar "ouvindo agora"); L3 máximo
     (≥4.7 GB, pollers ~10x + realtime DESLIGADO + sem share). Auto pelo total;
     console: __eco.setLevel(0|1|2|3|null=auto), __eco.level().
   - `window.__ecoSkip(key, k)`: no eco, deixa passar 1 tick a cada k
     (poller de 60s com k=5 vira 300s). Fora do eco, nunca pula.
   - Sem nada visível (pedido do dono r2): sem pílula, sem toast.
   - Espelho: este arquivo tem que ir no pacote (lote 2) + tag no index.
*/
var LV = [3.5e9, 4.2e9, 4.7e9]; // L1, L2, L3
var CYCLE_DAY = 24; // ciclo da cota = dia 24→24 (Billing da org, não mês civil)
var CYCLE_SEED = "2026-10-24", CYCLE_SEED_GB = 3.14; // linha semente atual; ao virar o ciclo, o dbGet puxa a nova sozinho (online) — zera local e segue
function curMonth(){ try{ var d=new Date(), y=d.getFullYear(), mo=d.getMonth()+1, dd=d.getDate(); if(dd<CYCLE_DAY){ mo--; if(mo<1){ mo=12; y--; } } return y+"-"+("0"+mo).slice(-2)+"-"+("0"+CYCLE_DAY).slice(-2); }catch(e){ return "?"; } }
var S = null;
try{ S = JSON.parse(localStorage.getItem("zunzumEco")||"null"); }catch(e){ S = null; }
var M = curMonth();
if(!S || S.m !== M){
  S = {m:M, base:0, used:0, forced:null};
  if(M === CYCLE_SEED) S.base = Math.round(CYCLE_SEED_GB*1e9);
  save();
}
if(typeof S.base!=="number") S.base = 0;
if(typeof S.used!=="number") S.used = 0;
if(typeof S.pending!=="number") S.pending = 0;
function save(){
  try{ localStorage.setItem("zunzumEco", JSON.stringify({m:S.m, base:Math.round(S.base)||0, used:Math.round(S.used)||0, forced:(typeof S.forced==="number"?Math.max(0,Math.min(3,S.forced|0)):(S.forced===true?true:(S.forced===false?false:null)))})); }catch(e){}
}
var _cnt = {};
var _dbOn = true; // desliga após falha (modo local/offline: conta só local)
function supa(){
  try{
    var u = window.ZUN_SUPABASE_URL, k = window.ZUN_SUPABASE_KEY;
    if(!u || !k) return null;
    return {u:String(u).replace(/\/+$/,""), k:String(k)};
  }catch(e){ return null; }
}
async function dbGet(){
  var c = supa();
  if(!c) { _dbOn = false; return; }
  try{
    var r = await fetch(c.u+"/rest/v1/eco_usage?month=eq."+encodeURIComponent(S.m)+"&select=base,used", {headers:{apikey:c.k, Authorization:"Bearer "+c.k}});
    if(!r.ok) return;
    var j = await r.json();
    var row = Array.isArray(j) ? j[0] : null;
    if(row){ S.base = +row.base||0; S.used = (+row.used||0) + (S.pending||0); save(); }
  }catch(e){}
}
async function dbFlush(){
  var c = supa();
  if(!c || !_dbOn) return;
  var p = Math.round(S.pending||0);
  if(p<=0) return;
  try{
    var r = await fetch(c.u+"/rest/v1/rpc/eco_bump", {method:"POST", headers:{apikey:c.k, Authorization:"Bearer "+c.k, "Content-Type":"application/json"}, body:JSON.stringify({p_month:S.m, p_delta:p})});
    if(!r.ok) return;
    var j = await r.json();
    if(j && typeof j.base!=="undefined"){ S.base = +j.base||0; S.used = +j.used||0; S.pending = 0; save(); }
  }catch(e){}
}
function total(){ return (S.base||0)+(S.used||0); }
function level(){
  if(S.forced===true) return 3;
  if(S.forced===false) return 0;
  if(typeof S.forced==="number") return Math.max(0, Math.min(3, S.forced|0));
  var t = total();
  return t>=LV[2]?3:(t>=LV[1]?2:(t>=LV[0]?1:0));
}
function ecoOn(){ return level()>=2; }
function skip(key, d1, d2, d3){
  try{
    var lv = level();
    if(!lv){ _cnt[key]=0; return false; }
    var k = lv>=3 ? (+d3||10) : (lv===2 ? (+d2||5) : (+d1||2));
    _cnt[key]=((_cnt[key]||0)+1);
    return (_cnt[key]%k)!==0;
  }catch(e){ return false; }
}
// L3 desliga o realtime 1x ao entrar (sb.js + sb3 expõem os kills); ao sair
// do L3, as vias preguiçosas (ensureSubs/busSend) reassinem sozinhas.
var _lvSeen = -1, _rtKilled = false;
function watch(){
  try{
    var lv = level();
    if(lv!==_lvSeen){ _lvSeen = lv; try{ document.dispatchEvent(new CustomEvent("zun-eco", {detail:{level:lv}})); }catch(e){} }
    if(lv>=3 && !_rtKilled){
      _rtKilled = true;
      try{ if(typeof window.__ecoRtKillSb==="function") window.__ecoRtKillSb(); }catch(e){}
      try{ if(typeof window.__ecoRtKillSb3==="function") window.__ecoRtKillSb3(); }catch(e){}
    } else if(lv<3){ _rtKilled = false; }
  }catch(e){}
}
function add(url, bytes){
  try{
    var u = String(url||"");
    if(u.indexOf(".supabase.co")===-1) return;
    var b = Math.round(+bytes||0);
    if(b<=0) return;
    S.used = (S.used||0)+b;
    S.pending = (S.pending||0)+b;
    save();
  }catch(e){}
}
try{
  window.__ecoAdd = add;
  window.__ecoOn = ecoOn;
  window.__ecoSkip = skip;
  window.__ecoLevel = level;
  window.__eco = {
    total:function(){ return total(); },
    used:function(){ return S.used||0; },
    pending:function(){ return S.pending||0; },
    base:function(){ return S.base||0; },
    month:function(){ return S.m; },
    on:function(){ return ecoOn(); },
    level:function(){ return level(); },
    setBaseGB:function(g){ try{ S.base = Math.max(0, Math.round(+g*1e9)); save(); return true; }catch(e){ return false; } },
    setLevel:function(v){ try{ S.forced = (v===null||v===undefined||v==="auto")?null:Math.max(0,Math.min(3,+v|0)); save(); watch(); return level(); }catch(e){ return level(); } },
    setOn:function(v){ try{ S.forced = (v===true)?3:((v===false)?0:null); save(); watch(); return ecoOn(); }catch(e){ return ecoOn(); } }
  };
}catch(e){}
setTimeout(dbGet, 2000);
setInterval(function(){ try{ dbFlush(); }catch(e){} try{ watch(); }catch(e){} }, 10000);
document.addEventListener("visibilitychange", function(){ try{ if(document.hidden) dbFlush(); }catch(e){} });
})();
