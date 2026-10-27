/* zunzum ai-quota — cota cliente p/ generateText (queima de quota = DoS econômico)
   Protege os caminhos que chamam IA (visão erótica, busca IA, divulgar, DJ,
   espelho nostr, mascote do feed, zunzunzinha): sem cota, um script martelando
   gera centenas de chamadas e queima a quota diária, degradando p/ todo mundo.

   Uso: try{ if(window.ZunAiQuota && !window.ZunAiQuota.tryTake("vision")) return null; }catch(_q){}
   kind "vision" (imagem+texto) ou "text". Esgotada = caller cai no fallback que
   já existe (foto não verificada, "tente de novo", fallback sem IA, etc).

   Limites (conservadores p/ uso normal, duros p/ script):
     vision: 150/dia + 8/min | text: 300/dia + 20/min | global: 400/dia
   É contenção best-effort no cliente (console bypassa) — a barreira real
   contra abuso pesado continua sendo throttle de rede/servidor + RLS.

   NOTA: sem wrapper automático em root.generateText de propósito — o objeto da
   função do plugin é selado (atribuição de prop some, e o engine devolve sempre
   o original), então monkey-patch não pega. Guards explícitos nos call sites. */
(function(){
  "use strict";
  var DAY = 86400000, MIN = 60000;
  var CAPS = {
    vision: {day: 150, min: 8},
    text:   {day: 300, min: 20},
    all:    {day: 400, min: 30}
  };
  var mem = {};
  function dayKey(kind){
    var d = new Date();
    return "zunAiQ:"+kind+":"+d.getFullYear()+"-"+(d.getMonth()+1)+"-"+d.getDate();
  }
  function dayGet(kind){
    try{ return parseInt(localStorage.getItem(dayKey(kind))||"0", 10)||0; }catch(e){ return 0; }
  }
  function dayInc(kind){
    try{ localStorage.setItem(dayKey(kind), String(dayGet(kind)+1)); }catch(e){}
  }
  function minPrune(kind, now){
    var a = mem[kind]||(mem[kind]=[]);
    while(a.length && now-a[0] > MIN) a.shift();
    return a;
  }
  function tryTake(kind){
    try{
      kind = (kind==="vision") ? "vision" : "text";
      var now = Date.now();
      var c = CAPS[kind], g = CAPS.all;
      if(dayGet(kind) >= c.day || dayGet("all") >= g.day) return false;
      if(minPrune(kind, now).length >= c.min || minPrune("all", now).length >= g.min) return false;
      minPrune(kind, now).push(now); minPrune("all", now).push(now);
      dayInc(kind); dayInc("all");
      return true;
    }catch(e){ return true; }
  }
  var api = {tryTake: tryTake, caps: CAPS};
  try{ window.ZunAiQuota = api; }catch(e){}
})();
