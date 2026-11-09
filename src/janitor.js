/* zunzum janitor — cliente (v2, ver src/JANITOR.md + src/janitor-version.json).
   - Carona no heartbeat o Supabase já chama sozinho (sb.js → zz_janitor_tick,
     com fallback p/ zz_purge_tick se o SQL novo ainda não rodou).
   - Aqui: tick manual do dono, modo teste (*_teste some na hora) e checagem
     de versão (Supabase janitor_ver × Bonto /api/janitor-version × este VERSION).
   Uso (console, logado): await ZunJanitor.tick(true); await ZunJanitor.testMode(true); */
(function(){
"use strict";
var VERSION = 2;

/* __sb.client() é async (Promise) — quem chama precisa await. */
async function sb(){ try{ if(window.__sb && window.__sb.client) return await window.__sb.client(); }catch(e){} return null; }

function bontoBase(){
  try{
    var u = String(window.ZUN_BACKEND_URL || "").replace(/\/+$/, "");
    return u || null;
  }catch(e){ return null; }
}

async function sbToken(){
  try{
    if(window.sbGetToken) return await window.sbGetToken();
    var c = await sb(); if(!c) return null;
    var g = await c.auth.getSession();
    var s = g && g.data && g.data.session;
    return (s && s.access_token) || null;
  }catch(e){ return null; }
}

/* Roda o janitor nas 2 pontas. force=true fura o throttle (só dono no Bonto). */
async function tick(force){
  var out = { v: VERSION, supabase: null, bonto: null };
  try{
    var c = await sb();
    if(c){
      try{
        var r = await c.rpc("zz_janitor_tick");
        out.supabase = (r && !r.error) ? r.data : { ok: 0, err: String((r && r.error && r.error.message) || "rpc") };
      }catch(e){ out.supabase = { ok: 0, err: String((e && e.message) || e) }; }
    }
  }catch(e){}
  try{
    var base = bontoBase();
    var tok = await sbToken();
    if(base){
      var ctl = new AbortController();
      var to = setTimeout(function(){ try{ ctl.abort(); }catch(e2){} }, 15000);
      var h = { "Content-Type": "application/json" };
      if(tok) h.Authorization = "Bearer " + tok;
      var rr = await fetch(base + "/api/janitor-tick", {
        method: "POST", signal: ctl.signal, headers: h,
        body: JSON.stringify(force ? { force: true } : {})
      });
      clearTimeout(to);
      out.bonto = await rr.json();
    }
  }catch(e){ out.bonto = { ok: 0, err: "bonto-fora" }; }
  return out;
}

/* Modo teste do dono: on=true apaga *_teste na hora (Supabase + Bonto). Só dono. */
async function testMode(on){
  var out = { v: VERSION, supabase: null, bonto: null };
  try{
    var c = await sb();
    if(c){
      try{
        var r = await c.rpc("zz_janitor_testmode", { p_on: !!on });
        out.supabase = (r && !r.error) ? r.data : { ok: 0, err: String((r && r.error && r.error.message) || "rpc") };
      }catch(e){ out.supabase = { ok: 0, err: String((e && e.message) || e) }; }
    }
  }catch(e){}
  try{
    var base = bontoBase();
    var tok = await sbToken();
    if(base && tok){
      var ctl = new AbortController();
      var to = setTimeout(function(){ try{ ctl.abort(); }catch(e2){} }, 15000);
      var rr = await fetch(base + "/api/janitor-testmode", {
        method: "POST", signal: ctl.signal,
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
        body: JSON.stringify({ on: !!on })
      });
      clearTimeout(to);
      out.bonto = await rr.json();
    } else if(base){
      out.bonto = { ok: 0, err: "auth" };
    }
  }catch(e){ out.bonto = { ok: 0, err: "bonto-fora" }; }
  return out;
}

/* Confere se as 3 pontas estão no mesmo VERSION. Avisa no console se divergir. */
async function versionCheck(){
  var parts = { local: VERSION, supabase: null, bonto: null };
  try{
    var c = await sb();
    if(c){
      var r = await c.from("site_config").select("value").eq("key", "janitor_ver").limit(1).maybeSingle();
      var v = r && r.data && r.data.value && r.data.value.v;
      parts.supabase = (typeof v === "number") ? v : null;
    }
  }catch(e){}
  try{
    var base = bontoBase();
    if(base){
      var ctl = new AbortController();
      var to = setTimeout(function(){ try{ ctl.abort(); }catch(e2){} }, 8000);
      var rr = await fetch(base + "/api/janitor-version", { signal: ctl.signal });
      clearTimeout(to);
      var j = await rr.json();
      parts.bonto = (j && typeof j.version === "number") ? j.version : null;
    }
  }catch(e){}
  var ok = (parts.supabase === null || parts.supabase === VERSION) &&
           (parts.bonto === null || parts.bonto === VERSION);
  if(!ok){
    try{
      console.warn("[zunzum] ZunJanitor divergente (rode o deploy da JANITOR.md):", JSON.stringify(parts));
    }catch(e){}
  }
  return { ok: ok, parts: parts };
}

try{
  window.ZunJanitor = { VERSION: VERSION, tick: tick, testMode: testMode, versionCheck: versionCheck };
  setTimeout(function(){ try{ versionCheck(); }catch(e){} }, 8000);
}catch(e){}
})();
