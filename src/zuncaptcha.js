/* ============================================================================
 * zuncaptcha — captcha próprio do zunzum (sem Cloudflare, sem sitekey).
 *
 * Método: gesto humano (slider "arraste até o fim") + prova de trabalho
 * hashcash (SHA-256 com 19 bits de zeros, fração de segundo no desktop).
 * O ticket é uma string curta vinculada ao nick, com validade de 10 min e
 * uso único:
 *   z1.<salt16hex>.<ts-base36>.<diff>.<nonce-base36>
 * A verificação é 1 hash SHA-256 (rápida) e roda em 4 lugares:
 *   - servidor server-plugin (index.html, QuickJS — usa a cópia local de
 *     sha256hex/zcapVerify embutida lá, espelho desta lógica);
 *   - espelho local localRpc (src/app.js, via window.ZunCap.verify);
 *   - caminho Supabase (src/sb3.js, gate antes do signUp);
 *   - backend Bonto (src/server/server.js, com Node crypto).
 * O Turnstile segue como camada EXTRA opcional (src/app.js): quando há
 * sitekey, o token dele continua indo em `captcha` (o Supabase com captcha ON
 * exige); o `zcap` vai sempre, em todos os caminhos.
 *
 * Sem segredo compartilhado: o código é público, então a segurança vem do
 * custo de CPU por conta + vínculo ao nick + expiração + uso único (o servidor
 * guarda tickets usados em memória). Bot direto no RPC precisa queimar CPU por
 * tentativa; replay em outro nick/outra hora não passa.
 * ========================================================================== */
(function(){
"use strict";

/* ---------- SHA-256 puro e síncrono (só entrada ASCII) ----------
   Mesma saída que crypto.subtle.digest("SHA-256"). Sem typed arrays de
   propósito: roda igual no navegador, no QuickJS do server-plugin e no Node.
   Entradas aqui são sempre ASCII (nick [a-z0-9-_], hex, dígitos, "|"). */
function sha256hex(s){
  var K = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  var i, j;
  var b = [];
  for(i=0;i<s.length;i++) b.push(s.charCodeAt(i)&255);
  var bitLen = b.length*8;
  b.push(0x80);
  while(b.length%64!==56) b.push(0);
  b.push(0);b.push(0);b.push(0);b.push(0);
  b.push((bitLen>>>24)&255);b.push((bitLen>>>16)&255);b.push((bitLen>>>8)&255);b.push(bitLen&255);
  var w = new Array(64);
  for(i=0;i<b.length;i+=64){
    for(j=0;j<16;j++) w[j] = ((b[i+j*4]<<24)|(b[i+j*4+1]<<16)|(b[i+j*4+2]<<8)|b[i+j*4+3]);
    for(j=16;j<64;j++){
      var x0 = w[j-15], x1 = w[j-2];
      var s0 = ((x0>>>7)|(x0<<25))^((x0>>>18)|(x0<<14))^(x0>>>3);
      var s2 = ((x1>>>17)|(x1<<15))^((x1>>>19)|(x1<<13))^(x1>>>10);
      w[j] = (w[j-16]+s0+w[j-7]+s2)|0;
    }
    var a=H[0],bb=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
    for(j=0;j<64;j++){
      var S1 = ((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));
      var ch = (e&f)^((~e)&g);
      var t1 = (h+S1+ch+K[j]+w[j])|0;
      var S0 = ((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));
      var mj = (a&bb)^(a&c)^(bb&c);
      var t2 = (S0+mj)|0;
      h=g;g=f;f=e;e=(d+t1)|0;d=c;c=bb;bb=a;a=(t1+t2)|0;
    }
    H[0]=(H[0]+a)|0;H[1]=(H[1]+bb)|0;H[2]=(H[2]+c)|0;H[3]=(H[3]+d)|0;
    H[4]=(H[4]+e)|0;H[5]=(H[5]+f)|0;H[6]=(H[6]+g)|0;H[7]=(H[7]+h)|0;
  }
  var hexd = "0123456789abcdef", out = "";
  for(i=0;i<8;i++){ var x=H[i]; for(j=28;j>=0;j-=4) out += hexd[(x>>>j)&15]; }
  return out;
}

var DOMAIN = "zunzum-zcap-v1";
var DIFF_DEFAULT = 19;      // ~500k hashes (fração de segundo no desktop, ~1-3 s no celular)
var DIFF_MIN = 19;          // verificação aceita >=19 (piso = padrão: sem ticket fraco)
var TTL_MS = 10*60*1000;    // ticket vale 10 min
var SKEW_MS = 2*60*1000;    // tolerância p/ relógio adiantado

function msgOf(nickLower, salt, ts, diff, nonce){
  return DOMAIN+"|"+nickLower+"|"+salt+"|"+ts+"|"+diff+"|"+nonce;
}
function zeroBits(hex){
  var n = 0;
  for(var i=0;i<hex.length;i++){
    var v = parseInt(hex[i], 16);
    if(v===0){ n+=4; continue; }
    if(v===1) n+=3; else if(v<=3) n+=2; else if(v<=7) n+=1;
    break;
  }
  return n;
}
function parseTicket(t){
  var m = /^z1\.([0-9a-f]{16})\.([0-9a-z]{1,12})\.(\d{1,2})\.([0-9a-z]{1,12})$/.exec(String(t||""));
  if(!m) return null;
  return {salt:m[1], ts:parseInt(m[2],36), diff:parseInt(m[3],10), nonce:m[4]};
}

/* verify(ticket, nick): true se o ticket vale p/ o nick agora.
   opts {minDiff, maxAgeMs, used} — `used` é um objeto usado como conjunto
   (servidor passa o dele p/ uso único com replay barrado). */
function verify(ticket, nick, opts){
  try{
    var o = opts||{};
    var minDiff = o.minDiff||DIFF_MIN;
    var p = parseTicket(ticket);
    if(!p) return false;
    if(!(p.diff>=minDiff && p.diff<=32)) return false;
    if(!(p.ts>0)) return false;
    var now = Date.now();
    if(p.ts > now+SKEW_MS) return false;
    if(now-p.ts > (o.maxAgeMs||TTL_MS)) return false;
    var nl = String(nick||"").toLowerCase();
    if(!/^[a-z0-9-_]{2,20}$/.test(nl)) return false;
    var h = sha256hex(msgOf(nl, p.salt, p.ts, p.diff, p.nonce));
    if(zeroBits(h) < p.diff) return false;
    if(o.used){
      if(o.used[ticket]) return false;
      o.used[ticket] = now;
      var ks = Object.keys(o.used);
      if(ks.length>3000){ var cut = now-TTL_MS-SKEW_MS, i; for(i=0;i<ks.length;i++){ if((o.used[ks[i]]||0)<cut) delete o.used[ks[i]]; } }
      ks = Object.keys(o.used);
      if(ks.length>3000) delete o.used[ks[0]];
    }
    return true;
  }catch(e){ return false; }
}

function randSalt(){
  var out = "";
  try{
    if(window.crypto && window.crypto.getRandomValues){
      var a = new Uint8Array(8);
      window.crypto.getRandomValues(a);
      for(var i=0;i<8;i++) out += ("0"+a[i].toString(16)).slice(-2);
      return out;
    }
  }catch(e){}
  var abc = "0123456789abcdef";
  for(var j=0;j<16;j++) out += abc[Math.floor(Math.random()*16)];
  return out;
}

/* mine(nick, opts): encontra nonce válido. opts {diff, onProgress(n),
   isCancelled()} — roda em fatias adaptativas (~120 ms) p/ não travar a UI
   nem em celular lento. */
function mine(nick, opts){
  var o = opts||{};
  var nl = String(nick||"").toLowerCase();
  var diff = o.diff||DIFF_DEFAULT;
  if(!(diff>=DIFF_MIN && diff<=26)) diff = DIFF_DEFAULT;
  var salt = randSalt();
  var ts = Date.now();
  var nonce = Math.floor(Math.random()*0xffffffff);
  var count = 0;
  var CHUNK = 4000, CHUNK_MAX = 100000;
  return new Promise(function(resolve, reject){
    function step(){
      try{
        if(o.isCancelled && o.isCancelled()){ reject(new Error("cancel")); return; }
        var cs = Date.now();
        for(var i=0;i<CHUNK;i++){
          nonce = (nonce+1)>>>0;
          count++;
          var ns = nonce.toString(36);
          var h = sha256hex(msgOf(nl, salt, ts, diff, ns));
          if(zeroBits(h)>=diff){ resolve("z1."+salt+"."+ts.toString(36)+"."+diff+"."+ns); return; }
        }
        var spent = Date.now()-cs;
        if(spent<60 && CHUNK<CHUNK_MAX) CHUNK = Math.min(CHUNK_MAX, CHUNK*2);
        else if(spent>250 && CHUNK>1000) CHUNK = Math.floor(CHUNK/2);
        if(o.onProgress){ try{ o.onProgress(count); }catch(e){} }
        setTimeout(step, 0);
      }catch(e){ reject(e); }
    }
    step();
  });
}

/* ---------- i18n do widget (acompanha ?lang= / escolha salva / navegador) ---------- */
function lang(){
  try{
    var q = String(new URLSearchParams(location.search).get("lang")||"").toLowerCase().slice(0,2);
    if(q==="en"||q==="es"||q==="pt") return q;
  }catch(e){}
  try{ if(window.zunzumLang==="en"||window.zunzumLang==="es"||window.zunzumLang==="pt") return window.zunzumLang; }catch(e){}
  try{ var s = String(localStorage.getItem("zunzumLang")||"").toLowerCase().slice(0,2); if(s==="en"||s==="es"||s==="pt") return s; }catch(e){}
  try{ if(/^es\b/i.test(navigator.language||"")) return "es"; }catch(e){}
  try{ if(/^en\b/i.test(navigator.language||"")) return "en"; }catch(e){}
  return "pt";
}
var STR = {
  pt:{slide:"arraste até o fim p/ provar que você é gente", mining:"só esperar o número terminar de contar… ", ok:"verificado! pode criar ou entrar na conta", need:"arraste a barra até o fim — ela fica verde", nick:"nick só pode letras, números, - e _ (2 a 20, sem espaço)", again:"↻ refazer"},
  en:{slide:"slide to the end to prove you're human", mining:"just wait for the number to finish counting… ", ok:"verified! you can create or sign in", need:"drag the bar to the end — it turns green", nick:"nick can only use letters, numbers, - and _ (2–20, no spaces)", again:"↻ redo"},
  es:{slide:"desliza hasta el final p/ probar que eres humano", mining:"solo espera a que el número termine de contar… ", ok:"¡verificado! ya puedes crear o entrar a la cuenta", need:"arrastra la barra hasta el final — se pone verde", nick:"el nick solo puede tener letras, números, - y _ (2 a 20, sin espacios)", again:"↻ rehacer"}
};

/* Ícones SVG inline (2026-11-06): os emojis 🧩⏳✔️ não renderizam em aparelho
   velho (viram tofu □) — SVG desenha em todo lugar. Strings 100% estáticas
   (mesmo padrão do tour.js); o texto continua nó de texto separado. */
var ICONS = {
  slide:'<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-2px"><rect x="1" y="4" width="22" height="16" rx="5" fill="#2a7ae2"/><path d="M7.5 8.5l4 3.5-4 3.5M12.5 8.5l4 3.5-4 3.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  mining:'<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-2px"><path d="M6 2h12v5l-4 5 4 5v5H6v-5l4-5-4-5z" fill="#e8a33d"/><path d="M6 2h12v5l-4 5 4 5v5H6v-5l4-5-4-5z" fill="none" stroke="#8a5a00" stroke-width="1.6" stroke-linejoin="round"/></svg>',
  ok:'<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style="vertical-align:-2px"><circle cx="12" cy="12" r="10" fill="#1c8a3c"/><path d="M7.5 12.5l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

/* ---------- widget ----------
   mount(box, opts {getNick}) → handle {take(nick), reset(), ok()}.
   take(nick) é async: se o slider foi completado mas o ticket expirou ou o
   nick mudou, minera de novo na hora (com progresso no status). Consome o
   ticket (uso único no cliente) e reseta o widget. */
function mount(box, opts){
  var o = opts||{};
  var L = STR[lang()]||STR.pt;
  var HINT = {pt:"arraste até o fim \u2192", en:"slide to the end \u2192", es:"desliza hasta el final \u2192"};
  var langK = "pt";
  try{
    var q = String(new URLSearchParams(location.search).get("lang")||"").toLowerCase().slice(0,2);
    if(q==="en"||q==="es"||q==="pt") langK = q;
    else if(window.zunzumLang==="en"||window.zunzumLang==="es") langK = window.zunzumLang;
    else { try{ var s = String(localStorage.getItem("zunzumLang")||"").toLowerCase().slice(0,2); if(s==="en"||s==="es") langK = s; }catch(e){} }
  }catch(e){}
  var THUMB = {
    arrow:'<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5l7 7-7 7M13 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    mining:'<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v5l-4 5 4 5v5H6v-5l4-5-4-5z" fill="currentColor" opacity=".9"/></svg>',
    ok:'<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l5 5 9-11" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };
  var st = {ticket:null, tnick:"", tts:0, mining:false, done:false, cancelled:false};
  var pos = 0; // 0-100, posição do polegar no trilho custom
  var wrap = document.createElement("div");
  wrap.className = "zuncap";
  wrap.setAttribute("data-state", "idle");
  var lab = document.createElement("div");
  lab.className = "zuncap-lab";
  lab.innerHTML = ICONS.slide;
  lab.appendChild(document.createTextNode(" "+L.slide));
  var track = document.createElement("div");
  track.className = "zuncap-track";
  track.setAttribute("role", "slider");
  track.setAttribute("tabindex", "0");
  track.setAttribute("aria-valuemin", "0");
  track.setAttribute("aria-valuemax", "100");
  track.setAttribute("aria-valuenow", "0");
  try{ track.setAttribute("aria-label", L.slide); }catch(e){}
  var fill = document.createElement("div");
  fill.className = "zuncap-fill";
  fill.setAttribute("aria-hidden", "true");
  var hint = document.createElement("div");
  hint.className = "zuncap-hint";
  hint.setAttribute("aria-hidden", "true");
  hint.appendChild(document.createTextNode(HINT[langK]||HINT.pt));
  var thumb = document.createElement("div");
  thumb.className = "zuncap-thumb";
  thumb.setAttribute("aria-hidden", "true");
  thumb.innerHTML = THUMB.arrow;
  track.appendChild(fill); track.appendChild(hint); track.appendChild(thumb);
  var msg = document.createElement("div");
  msg.className = "zuncap-msg meta";
  var redo = document.createElement("button");
  redo.type = "button";
  redo.className = "zuncap-redo";
  redo.textContent = L.again;
  redo.hidden = true;
  wrap.appendChild(lab); wrap.appendChild(track); wrap.appendChild(msg); wrap.appendChild(redo);
  try{ box.appendChild(wrap); }catch(e){ return {take:function(){return Promise.resolve(null);}, reset:function(){}, ok:function(){return false;}}; }

  function layout(){
    try{
      var tw = track.clientWidth || 0;
      if(tw<=0) return;
      var thw = thumb.offsetWidth || 38;
      var pad = 3;
      var span = tw - pad*2 - thw;
      if(span<0) span = 0;
      var x = pad + (pos/100)*span;
      thumb.style.left = x+"px";
      fill.style.width = Math.round(x + thw/2)+"px";
      track.setAttribute("aria-valuenow", String(Math.round(pos)));
    }catch(e){}
  }
  if(window.ResizeObserver){ try{ new ResizeObserver(function(){ layout(); }).observe(track); }catch(e){} }
  try{ window.addEventListener("resize", layout); }catch(e){}
  try{ requestAnimationFrame(function(){ layout(); }); }catch(e){}
  try{ setTimeout(layout, 300); }catch(e){}

  function setMsg(t, icon){ try{ msg.innerHTML = ""; if(icon){ var sp = document.createElement("span"); sp.innerHTML = icon; msg.appendChild(sp); msg.appendChild(document.createTextNode(" ")); } msg.appendChild(document.createTextNode(String(t==null?"":t))); }catch(e){} }
  function setLab(t, icon){ try{ lab.innerHTML = ""; if(icon){ var sp2 = document.createElement("span"); sp2.innerHTML = icon; lab.appendChild(sp2); lab.appendChild(document.createTextNode(" ")); } lab.appendChild(document.createTextNode(String(t==null?"":t))); }catch(e){} }
  function markWaiting(on){ try{ wrap.setAttribute("data-state", on?"mining":(st.done?"ok":"idle")); }catch(e){} }
  function setLocked(locked){
    try{ track.setAttribute("data-locked", locked?"1":"0"); }catch(e){}
    try{ track.setAttribute("aria-disabled", locked?"true":"false"); }catch(e){}
  }
  function setPos(p){
    pos = Math.max(0, Math.min(100, p));
    try{
      if(dragging) track.setAttribute("data-pos", "drag");
      else track.removeAttribute("data-pos");
    }catch(e){}
    layout();
  }
  function nickNow(){
    try{ if(o.getNick) return String(o.getNick()||""); }catch(e){}
    return "";
  }
  function freshFor(nick){
    return st.ticket && st.tnick===String(nick||"").toLowerCase() && (Date.now()-st.tts < TTL_MS-30000);
  }
  function startMine(nick){
    var nl = String(nick||"").toLowerCase();
    if(!/^[a-z0-9-_]{2,20}$/.test(nl)){ setPos(0); setMsg(L.nick); return; }
    st.mining = true; st.cancelled = false;
    setLocked(true); setPos(100);
    try{ thumb.innerHTML = THUMB.mining; }catch(e){}
    /* feedback imediato: o topo explica que é só esperar e o status já mostra
       o número contando (sem falar em minerar/hash/ticket p/ não confundir). */
    try{ setLab(L.mining, ICONS.mining); }catch(e){}
    try{ markWaiting(true); setMsg("0…", null); }catch(e){}
    var t0 = Date.now();
    mine(nl, {diff:DIFF_DEFAULT, isCancelled:function(){ return st.cancelled; }, onProgress:function(n){
      var s = Math.round((Date.now()-t0)/1000);
      setMsg(n+" ("+s+"s)…", null);
    }}).then(function(tk){
      st.mining = false;
      st.ticket = tk; st.tnick = nl; st.tts = Date.now(); st.done = true;
      setLocked(true); setPos(100);
      try{ thumb.innerHTML = THUMB.ok; }catch(e){}
      try{ markWaiting(false); wrap.setAttribute("data-state", "ok"); }catch(e){}
      try{ redo.hidden = false; }catch(e){}
      try{ setLab(L.ok, ICONS.ok); }catch(e){}
      setMsg(L.ok, ICONS.ok);
    }).catch(function(){
      st.mining = false;
      setLocked(false); setPos(0);
      try{ thumb.innerHTML = THUMB.arrow; }catch(e){}
      try{ markWaiting(false); }catch(e){}
      try{ setLab(L.slide, ICONS.slide); }catch(e){}
      setMsg(L.need);
    });
  }
  var dragging = false;
  var GOAL = 96; // encostou no fim → vale como gesto
  function posFromClientX(cx){
    try{
      var r = track.getBoundingClientRect();
      if(!r || !r.width) return pos;
      return ((cx - r.left)/r.width)*100;
    }catch(e){ return pos; }
  }
  function onDown(ev){
    if(st.mining || st.done) return;
    var locked = false;
    try{ locked = track.getAttribute("data-locked")==="1"; }catch(e){}
    if(locked) return;
    var cx = (ev.clientX!=null) ? ev.clientX : null;
    try{
      if(cx==null && ev.touches && ev.touches[0]) cx = ev.touches[0].clientX;
      if(cx==null && ev.changedTouches && ev.changedTouches[0]) cx = ev.changedTouches[0].clientX;
    }catch(e){}
    dragging = true;
    try{ track.setPointerCapture(ev.pointerId); }catch(e){}
    if(cx!=null) setPos(posFromClientX(cx));
    else setPos(pos);
    try{ ev.preventDefault(); }catch(e){}
  }
  function onMove(ev){
    if(!dragging || st.mining || st.done) return;
    var cx = (ev.clientX!=null) ? ev.clientX : null;
    try{
      if(cx==null && ev.touches && ev.touches[0]) cx = ev.touches[0].clientX;
      if(cx==null && ev.changedTouches && ev.changedTouches[0]) cx = ev.changedTouches[0].clientX;
    }catch(e){}
    if(cx==null) return;
    setPos(posFromClientX(cx));
    try{ ev.preventDefault(); }catch(e){}
  }
  function onUp(){
    if(!dragging) return;
    dragging = false;
    try{ track.removeAttribute("data-pos"); }catch(e){}
    if(st.mining || st.done){ layout(); return; }
    if(pos>=GOAL) startMine(nickNow());
    else setPos(0);
  }
  try{
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    thumb.addEventListener("dragstart", function(ev){ try{ ev.preventDefault(); }catch(e){} });
  }catch(e){}
  try{
    track.addEventListener("keydown", function(ev){
      if(st.mining || st.done) return;
      var k = ev.key;
      if(k==="ArrowRight"||k==="ArrowUp"){ setPos(pos+10); if(pos>=GOAL) startMine(nickNow()); try{ ev.preventDefault(); }catch(e){} }
      else if(k==="ArrowLeft"||k==="ArrowDown"){ setPos(pos-10); try{ ev.preventDefault(); }catch(e){} }
      else if(k==="Home"){ setPos(0); try{ ev.preventDefault(); }catch(e){} }
      else if(k==="End"||k==="Enter"||k===" "){ setPos(100); startMine(nickNow()); try{ ev.preventDefault(); }catch(e){} }
    });
  }catch(e){}
  try{ redo.addEventListener("click", function(){ reset(); try{ track.focus(); }catch(e){} }); }catch(e){}

  function reset(){
    st.ticket = null; st.tnick = ""; st.tts = 0; st.done = false;
    st.cancelled = true; st.mining = false;
    dragging = false;
    setLocked(false); setPos(0);
    try{ thumb.innerHTML = THUMB.arrow; }catch(e){}
    try{ redo.hidden = true; }catch(e){}
    try{ markWaiting(false); wrap.setAttribute("data-state", "idle"); }catch(e){}
    try{ setLab(L.slide, ICONS.slide); }catch(e){}
    setMsg("");
  }
  function take(nick){
    var nl = String(nick||"").toLowerCase();
    if(freshFor(nl)){
      var t = st.ticket;
      reset();
      return Promise.resolve(t);
    }
    if(st.mining){
      return new Promise(function(res){
        var iv = setInterval(function(){
          if(!st.mining){
            clearInterval(iv);
            if(freshFor(nl)){ var t2 = st.ticket; reset(); res(t2); }
            else res(null);
          }
        }, 200);
        setTimeout(function(){ try{ clearInterval(iv); }catch(e){} if(st.mining) res(null); }, 45000);
      });
    }
    if(!nl || !/^[a-z0-9-_]{2,20}$/.test(nl)){ setMsg(L.nick); return Promise.resolve(null); }
    /* gesto feito mas ticket inválido p/ o nick (trocou o nick depois) ou
       vazio: minera agora. Se nem o gesto foi completado, cobra o gesto. */
    if(!st.done && pos<GOAL){ setMsg(L.need); try{ track.focus(); }catch(e){} return Promise.resolve(null); }
    st.done = false;
    return new Promise(function(res){
      startMine(nl);
      var iv = setInterval(function(){
        if(!st.mining){
          clearInterval(iv);
          if(freshFor(nl)){ var t3 = st.ticket; reset(); res(t3); }
          else res(null);
        }
      }, 200);
      setTimeout(function(){ try{ clearInterval(iv); }catch(e){} res(null); }, 60000);
    });
  }
  try{ layout(); }catch(e){}
  return {take:take, reset:reset, ok:function(n){ return freshFor(n||nickNow()); }, _state:st};
}


try{
  window.ZunCap = {mine:mine, verify:verify, mount:mount, sha256hex:sha256hex,
    DIFF_DEFAULT:DIFF_DEFAULT, DIFF_MIN:DIFF_MIN, TTL_MS:TTL_MS};
}catch(e){}
})();
