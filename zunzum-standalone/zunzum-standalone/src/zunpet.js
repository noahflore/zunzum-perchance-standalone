/* zunpet.js — bichinho virtual estilo Pou, camada superior.
   Ovo (24h) -> rostinho redondo animado. Arrastar, comidinha, banho, bola,
   casinha, expressões (fome/sujo/tédio), segue o mouse, botão dispensar.
   Estado em localStorage POR CONTA (zunpet_v1:<nick>) + nuvem (pet_state
   chaveado por user_id). Sem debug de tempo em produção: relógio adiantado
   só afeta o próprio bicho, nunca o dos outros (RLS prende cada linha ao
   dono via auth.uid()). */
(function(){
"use strict";
if(window.__zunpetLoaded) return; window.__zunpetLoaded = true;
var LS = "zunpet_v1";
var EGG_MS = 24*3600*1000;
var FOOD_MS = 5*3600*1000;
/* Comidinhas 100% SVG (emoji quebra conforme o navegador). viewBox 40. */
var FOODS = [
'<svg viewBox="0 0 40 40"><path d="M20 9c0-3 2-5 5-5" stroke="#5a3a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M21 10c3-4 8-5 11-3-1 3-5 5-8 5z" fill="#4caf50" stroke="#2e7d32" stroke-width="1.5"/><path d="M20 13c-6-5-16-2-14 8-4 1-5 6-3 10 3 7 10 9 17 6 7 3 14 1 17-6 2-4 1-9-3-10 2-10-8-13-14-8z" fill="#e63946" stroke="#8f1d27" stroke-width="2"/><ellipse cx="14" cy="23" rx="3" ry="4.5" fill="#fff" opacity=".35"/></svg>',
'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#d9a05b" stroke="#8a5a2b" stroke-width="2"/><circle cx="14" cy="16" r="2.2" fill="#5a3a1a"/><circle cx="24" cy="14" r="2.2" fill="#5a3a1a"/><circle cx="20" cy="23" r="2.2" fill="#5a3a1a"/><circle cx="27" cy="22" r="2.2" fill="#5a3a1a"/><circle cx="13" cy="25" r="2.2" fill="#5a3a1a"/></svg>',
'<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" fill="#e8b06e" stroke="#8a5a2b" stroke-width="2"/><circle cx="20" cy="20" r="10.5" fill="#ff8fb2"/><circle cx="20" cy="20" r="5" fill="#fff8ee" stroke="#8a5a2b" stroke-width="2"/><rect x="12" y="12" width="4" height="1.8" rx=".9" fill="#fff" transform="rotate(-30 14 13)"/><rect x="24" y="11" width="4" height="1.8" rx=".9" fill="#4cc9f0" transform="rotate(20 26 12)"/><rect x="27" y="22" width="4" height="1.8" rx=".9" fill="#ffe66d" transform="rotate(-15 29 23)"/><rect x="11" y="23" width="4" height="1.8" rx=".9" fill="#7bf1a8" transform="rotate(35 13 24)"/></svg>',
'<svg viewBox="0 0 40 40"><path d="M20 8c0-2.5 1.5-4 4-4" stroke="#5a3a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M21 9c2.5-3 6.5-4 9-2.5-.8 2.4-4 4-6.5 4z" fill="#4caf50" stroke="#2e7d32" stroke-width="1.5"/><circle cx="14" cy="17" r="5" fill="#9b5de5" stroke="#5a2a9b" stroke-width="1.8"/><circle cx="26" cy="17" r="5" fill="#9b5de5" stroke="#5a2a9b" stroke-width="1.8"/><circle cx="20" cy="24" r="5" fill="#8338c9" stroke="#5a2a9b" stroke-width="1.8"/><circle cx="14" cy="30" r="5" fill="#9b5de5" stroke="#5a2a9b" stroke-width="1.8"/><circle cx="26" cy="30" r="5" fill="#9b5de5" stroke="#5a2a9b" stroke-width="1.8"/></svg>',
'<svg viewBox="0 0 40 40"><path d="M7 12 L20 35 L33 12 Q20 8 7 12z" fill="#ffca3a" stroke="#b07a1e" stroke-width="2" stroke-linejoin="round"/><rect x="5" y="7" width="30" height="7" rx="3.5" fill="#d98a3d" stroke="#8a5a2b" stroke-width="2"/><circle cx="16" cy="19" r="3" fill="#e63946" stroke="#8f1d27" stroke-width="1.5"/><circle cx="24" cy="24" r="3" fill="#e63946" stroke="#8f1d27" stroke-width="1.5"/><circle cx="20" cy="15" r="2.4" fill="#e63946" stroke="#8f1d27" stroke-width="1.5"/></svg>',
'<svg viewBox="0 0 40 40"><path d="M11 20 L14 34 L26 34 L29 20z" fill="#7fb3e0" stroke="#3d6e9e" stroke-width="2" stroke-linejoin="round"/><path d="M11 20c-1-5 4-6 5-3 .5-4 6-5 7-2 2-3 7-1 6 3 3 0 2 5-2 5z" fill="#ff8fb2" stroke="#c24a7c" stroke-width="2" transform="translate(0,-2)"/><circle cx="20" cy="9" r="3" fill="#e63946" stroke="#8f1d27" stroke-width="1.5"/><path d="M20 6c0-1.5 1-2.5 2-3" stroke="#2e7d32" stroke-width="1.5" fill="none"/></svg>',
'<svg viewBox="0 0 40 40"><path d="M5 20 A15 13 0 0 0 35 20z" fill="#2e9e5b" stroke="#1d6b3a" stroke-width="2"/><path d="M9 20 A11 10 0 0 0 31 20z" fill="#ff5d73"/><circle cx="15" cy="24" r="1.3" fill="#333"/><circle cx="21" cy="26" r="1.3" fill="#333"/><circle cx="26" cy="23" r="1.3" fill="#333"/></svg>',
'<svg viewBox="0 0 40 40"><path d="M8 28 L8 15 Q8 11 12 11 L28 11 Q32 11 32 15 L32 19 Q24 15 20 19 Q16 23 8 20z" fill="#e8b06e" stroke="#8a5a2b" stroke-width="2" stroke-linejoin="round"/><path d="M8 22 Q12 19 16 22 Q20 25 24 22 Q28 19 32 22 L32 25 Q20 21 8 25z" fill="#7bf1a8" stroke="#2e9e5b" stroke-width="1.5"/><path d="M8 26 L32 26 L32 29 Q32 31 30 31 L10 31 Q8 31 8 29z" fill="#e8b06e" stroke="#8a5a2b" stroke-width="2"/></svg>'
];
/* Bola, ovo e mosca 100% SVG. */
var BALL_SVG = '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="#fff" stroke="#222" stroke-width="2"/><polygon points="20,13 26,17.5 23.7,24.5 16.3,24.5 14,17.5" fill="#222"/><path d="M20 13v-6M26 17.5l5.5-2M23.7 24.5l3.4 4.8M16.3 24.5l-3.4 4.8M14 17.5L8.5 15.5" stroke="#222" stroke-width="2"/><circle cx="31" cy="28" r="3" fill="#222"/><circle cx="9" cy="28" r="3" fill="#222"/></svg>';
var EGG_WHOLE = '<svg viewBox="0 0 40 48"><ellipse cx="20" cy="26" rx="14" ry="17" fill="#fff8ee" stroke="#b08968" stroke-width="2"/><ellipse cx="14" cy="20" rx="4" ry="6" fill="#fff" opacity=".7" transform="rotate(-15 14 20)"/><circle cx="26" cy="32" r="2.5" fill="#ffd6e0"/><circle cx="15" cy="34" r="2" fill="#cdeffd"/></svg>';
var EGG_CRACK = '<svg viewBox="0 0 40 48"><ellipse cx="20" cy="26" rx="14" ry="17" fill="#fff8ee" stroke="#b08968" stroke-width="2"/><ellipse cx="14" cy="20" rx="4" ry="6" fill="#fff" opacity=".7" transform="rotate(-15 14 20)"/><path d="M8 20 L14 23 L12 27 L19 28 L23 24 L31 26" stroke="#8a5a2b" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 27 L23 27 L20 31z" fill="#ff9f1c" stroke="#b36a00" stroke-width="1.2"/></svg>';
var FLY_SVG = '<svg viewBox="0 0 12 12"><ellipse cx="3.6" cy="5.5" rx="3.2" ry="2.4" fill="#fff" opacity=".75"/><ellipse cx="8.4" cy="5.5" rx="3.2" ry="2.4" fill="#fff" opacity=".75"/><ellipse cx="6" cy="7" rx="2.5" ry="3" fill="#333"/></svg>';
/* Roupinhas 100% SVG (emoji quebra conforme o navegador). Cada item tem
   classe própria p/ posicionar certo: chapéu em cima, óculos NOS olhos, etc. */
var OUTFITS = [null,
 {cls:"of1", name:"cartola", svg:'<svg viewBox="0 0 60 46"><ellipse cx="30" cy="40" rx="25" ry="5.5" fill="#22222e" stroke="#000" stroke-width="2"/><rect x="17" y="10" width="26" height="30" rx="3" fill="#2b2b3a" stroke="#000" stroke-width="2"/><rect x="17" y="29" width="26" height="6" fill="#ffb300"/><ellipse cx="30" cy="10" rx="13" ry="3" fill="#45455e"/></svg>'},
 {cls:"of2", name:"boné", svg:'<svg viewBox="0 0 64 44"><ellipse cx="16" cy="37" rx="15" ry="4.5" fill="#a11d2a"/><path d="M12 36 Q13 13 32 13 Q51 13 52 36 Z" fill="#e63946" stroke="#8f1d27" stroke-width="2" stroke-linejoin="round"/><circle cx="32" cy="13" r="3.2" fill="#a11d2a"/><circle cx="32" cy="24" r="2.4" fill="#fff" opacity=".85"/></svg>'},
 {cls:"of3", name:"lacinho", svg:'<svg viewBox="0 0 56 40"><path d="M28 20 L6 7 L11 20 L6 33 Z" fill="#ff7bac" stroke="#c24a7c" stroke-width="2" stroke-linejoin="round"/><path d="M28 20 L50 7 L45 20 L50 33 Z" fill="#ff7bac" stroke="#c24a7c" stroke-width="2" stroke-linejoin="round"/><circle cx="28" cy="20" r="7" fill="#ff4d88" stroke="#c24a7c" stroke-width="2"/><circle cx="26" cy="18" r="2" fill="#fff" opacity=".8"/></svg>'},
 {cls:"of4", name:"óculos escuros", svg:'<svg viewBox="0 0 100 30"><rect x="20" y="5" width="27" height="20" rx="9" fill="#20222b" stroke="#000" stroke-width="2"/><rect x="53" y="5" width="27" height="20" rx="9" fill="#20222b" stroke="#000" stroke-width="2"/><rect x="45" y="10" width="10" height="5" fill="#20222b"/><path d="M26 9 L34 21 M60 9 L68 21" stroke="#8e9aaf" stroke-width="3" stroke-linecap="round"/></svg>'},
 {cls:"of5", name:"coroa", svg:'<svg viewBox="0 0 60 46"><path d="M9 40 L6 13 L18 25 L30 6 L42 25 L54 13 L51 40 Z" fill="#ffd23f" stroke="#9c6b0e" stroke-width="2" stroke-linejoin="round"/><rect x="9" y="37" width="42" height="5.5" rx="2.5" fill="#9c6b0e"/><circle cx="30" cy="29" r="4" fill="#e63946" stroke="#9c1d30" stroke-width="1.5"/><circle cx="18" cy="31" r="2.6" fill="#4cc9f0"/><circle cx="42" cy="31" r="2.6" fill="#4cc9f0"/></svg>'},
 {cls:"of6", name:"fone", svg:'<svg viewBox="0 0 116 76"><path d="M10 64 Q10 8 58 8 Q106 8 106 64" stroke="#4cc9f0" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M10 64 Q10 8 58 8 Q106 8 106 64" stroke="#90e0ff" stroke-width="2.5" fill="none" stroke-linecap="round"/><rect x="0" y="50" width="18" height="24" rx="9" fill="#4361ee" stroke="#23337c" stroke-width="2"/><rect x="98" y="50" width="18" height="24" rx="9" fill="#4361ee" stroke="#23337c" stroke-width="2"/></svg>'},
 {cls:"of7", name:"chapéu de festa", svg:'<svg viewBox="0 0 60 48"><path d="M30 6 L49 42 L11 42 Z" fill="#8ecae6" stroke="#2a6f9e" stroke-width="2" stroke-linejoin="round"/><path d="M24 24 L36 24 M27 32 L33 32" stroke="#ffbe0b" stroke-width="5" stroke-linecap="round"/><circle cx="30" cy="7" r="6.5" fill="#ff70a6" stroke="#c24a7c" stroke-width="2"/><circle cx="28" cy="5" r="1.8" fill="#fff" opacity=".85"/></svg>'},
 {cls:"of8", name:"pochete", svg:'<svg viewBox="0 0 100 48"><rect x="-8" y="15" width="116" height="10" rx="5" fill="#4361ee" stroke="#23337c" stroke-width="2" transform="rotate(4 50 20)"/><rect x="28" y="20" width="44" height="26" rx="11" fill="#ffb300" stroke="#8a5a00" stroke-width="2.5"/><path d="M28 32 h44" stroke="#8a5a00" stroke-width="2"/><rect x="44" y="30" width="12" height="6" rx="3" fill="#8a5a00"/><circle cx="50" cy="40" r="3" fill="#e63946" stroke="#8f1d27" stroke-width="1.5"/><g class="pocheteGordo" opacity="0"><path d="M-8 12 Q10 9 28 12 Q40 15 50 13 Q60 11 72 13 Q90 16 108 12 L108 19 Q90 24 72 20 Q60 18 50 20 Q40 22 28 18 Q10 15 -8 19 Z" fill="#d8a05e"/><path d="M-8 19 Q10 15 28 18 Q40 22 50 20 Q60 18 72 20 Q90 24 108 17" stroke="#5d3a1a" stroke-width="2" fill="none" stroke-linecap="round"/></g></svg>'}
];
function setOutfit(node){
  var o=OUTFITS[S.outfit||0];
  node.className="zunpet-outfit"+(o?" "+o.cls:"");
  node.innerHTML=o?o.svg:"";
}
var PHRASES_IDLE = ["oi! olha eu aqui! 👀","hihi! 😊","brinca comigo? 🥺","olha pra mim! ✨","que tédio... me faz carinho? 💕","psst! estou aqui! 👋"];
var PHRASES_HUNGRY = ["estou com fominha... 🥺","minha barriguinha ronca! 🍎","nham nham? 🍪","me dá comidinha? 🙏"];
var PHRASES_DIRTY = ["estou sujinho... 🚿","eca! preciso de banho! 🧼","não estou cheiroso... 🪰"];
var PHRASES_BORED = ["brinca comigo? ⚽","faz carinho em mim! 💕","conta uma história? 🥺"];
var PHRASES_HAPPY = ["hihi! 😊","oba! 🎉","te amo! 💖","que dia bom! ☀️"];
var PHRASES_EAT = ["nham nham! 😋","delícia! 🤤","obrigado! 💕","hummm! ✨"];
function now(){ return Date.now(); }
function petOwner(){ try{ var m=(typeof me!=="undefined")?me:null; if(m&&m.nick) return String(m.nick).toLowerCase(); }catch(e){} return ""; }
function lsKeyFor(o){ return o ? LS+":"+o : LS; }
function freshState(o){
  return {mode:"none",eggAt:0,x:0,y:0,hunger:20,dirt:10,bored:30,outfit:0,quiet:false,lastTick:now(),lastFood:now(),throws:0,dismissed:false,peso:50,owner:o||""};
}
function readLS(k){ try{ var s=JSON.parse(localStorage.getItem(k)||"null"); if(s&&typeof s==="object") return s; }catch(e){} return null; }
function normState(s,o){
  if(!s||typeof s!=="object") s = freshState(o);
  if(!s.lastTick) s.lastTick = now();
  if(!s.lastFood) s.lastFood = now();
  if(typeof s.x!=="number") s.x = 0;
  if(typeof s.y!=="number") s.y = 0;
  if(typeof s.peso!=="number"||!isFinite(s.peso)) s.peso = 50; // corpinho: 0=magrinho 100=gordinho
  s.peso=Math.max(0,Math.min(100,s.peso));
  s.owner = o||"";
  return s;
}
function loadFor(o){
  if(!o) return normState(readLS(LS), "");
  var mine = readLS(lsKeyFor(o));
  if(mine) return normState(mine, o);
  var leg = readLS(LS);
  if(leg && String(leg.owner||"").toLowerCase()===o){ try{localStorage.removeItem(LS);}catch(e){} return normState(leg, o); }
  if(leg && (leg.mode==="egg"||leg.mode==="pet")){
    /* legado ambíguo (versão antiga, sem dono carimbado): arquiva p/
       resgate manual e começa do zero — nunca herda o pet de outra conta. */
    try{ if(!localStorage.getItem(LS+":legacy-backup")) localStorage.setItem(LS+":legacy-backup", JSON.stringify(leg)); }catch(e){}
    try{ localStorage.removeItem(LS); }catch(e){}
  }
  return freshState(o);
}
function save(){ try{ S.owner = petCurOwner; localStorage.setItem(lsKeyFor(petCurOwner), JSON.stringify(S)); }catch(e){} }
/* troca de conta: guarda a atual, carrega a da nova (ou zero) e repinta */
function petSwitch(force){
  var o = petOwner();
  if(!o || (!force && o===petCurOwner)) return false;
  try{ save(); }catch(e){}
  petCurOwner = o;
  S = loadFor(o);
  try{ save(); }catch(e){}
  try{
    if(petEl){petEl.remove();petEl=null;} if(eggEl){eggEl.remove();eggEl=null;}
    if(S.dismissed) return true;
    if(!isLogged()){ hiddenByAuth=true; return true; }
    hiddenByAuth=false;
    if(S.mode==="egg"){ if(now()-S.eggAt>=EGG_MS){ S.mode="pet"; S.lastTick=now(); save(); renderPet(); } else renderEgg(); }
    else if(S.mode==="pet") renderPet();
  }catch(e){}
  return true;
}
var petCurOwner = "";
var S = normState(freshState(""), "");
var layer=null, eggEl=null, petEl=null, houseEl=null, bubbleTimer=0, pupilTX=0, pupilTY=0, lookTimer=0, statTimer=0, eggClicks=[], foodEls=[];
/* ---------- 1 aba = 1 palco (só renderiza na aba visível) ----------
   Cada aba pode ser uma conta (sessionStorage isolado). Aba oculta NÃO
   renderiza: esconde a camada, pausa rAF e pula todo DOM — só o status
   (fome/sujeira/tédio/peso/ovo) avança por delta de tempo. Isso evita N
   bichinhos animando + N loops de física em N abas (economiza CPU e não
   duplica o pet na tela de outra aba). */
var tabVisible = !(typeof document!=="undefined" && document.hidden);
function isTabActive(){ return tabVisible; }
/* avança só os números, sem tocar no DOM nem falar (aba oculta) */
function petCatchUp(){
  if(S.mode==="none"||S.dismissed) return;
  var t=now(), dt=(t-(S.lastTick||t))/60000;
  if(!(dt>0)) return;
  if(dt<0.02) dt=0.02;
  S.lastTick=t;
  if(S.mode==="pet"){
    S.hunger=Math.min(100,S.hunger+dt*1.1);
    S.dirt=Math.min(100,S.dirt+dt*0.7);
    S.bored=Math.min(100,S.bored+dt*0.9);
    S.peso=Math.max(0,S.peso-dt*(S.hunger>=85?1.2:0.35));
    if(t-(S.lastFood||0)>=FOOD_MS){ S.lastFood=t; /* sem spawn oculto: evita burst ao voltar */ }
  }
}
function suspendPetRender(){
  try{
    if(typeof ballRAF!=="undefined" && ballRAF){ try{cancelAnimationFrame(ballRAF);}catch(_eB){} ballRAF=0; }
    if(bubTO){ clearTimeout(bubTO); bubTO=null; }
    if(typeof bubEl!=="undefined" && bubEl){ try{ bubEl.hidden=true; }catch(_eH){} }
    if(typeof layer!=="undefined" && layer){ layer.style.display="none"; }
  }catch(_eS){}
}
function resumePetRender(){
  try{
    if(typeof layer!=="undefined" && layer){ layer.style.display=""; }
    petCatchUp(); save();
    if(S.dismissed||hiddenByAuth||!isLogged()) return;
    if(S.mode==="egg"){
      if(now()-S.eggAt>=EGG_MS){ hatch(false); }
      else { if(eggEl){eggEl.remove();eggEl=null;} renderEgg(); }
    } else if(S.mode==="pet"){
      if(petEl){petEl.remove();petEl=null;} renderPet();
      if(typeof ball!=="undefined" && ball && typeof ballEl!=="undefined" && ballEl && ballEl.isConnected && !ballRAF) ballLoop();
    }
  }catch(_eR){}
}
try{
  document.addEventListener("visibilitychange", function(){
    var v = !document.hidden;
    if(v===tabVisible) return;
    tabVisible=v;
    if(v) resumePetRender(); else { petCatchUp(); try{save();}catch(_eSV){} suspendPetRender(); }
  });
  window.addEventListener("pagehide", function(){ tabVisible=false; try{petCatchUp();save();}catch(_ePH){} suspendPetRender(); });
  window.addEventListener("pageshow", function(){ var v=!document.hidden; tabVisible=v; if(v) resumePetRender(); });
  /* blur NÃO pausa: janelas lado a lado, ambas visíveis, mostram o pet.
     Só aba oculta (visibility) suspende o palco. */
}catch(_eV){}
/* ---------- sync com o banco (por conta) ---------- */
var petPushAt=0, petPushTimer=null, petDirty=false, petCloud="off";
function petCloudPaint(){ var n=document.getElementById("zphCloud"); if(n) n.textContent = petCloud==="ok" ? "☁️ salvo na nuvem (vale em todo aparelho)" : "📴 só neste aparelho"; }
function petCred(){ try{ if(typeof me!=="undefined"&&me&&me.nick) return {nick:me.nick, hash:me.hash}; }catch(e){} return null; }
async function petPull(){
  var c=petCred(); if(!c) return false;
  var co=String(c.nick||"").toLowerCase();
  if(!co || co!==petCurOwner || S.owner!==co) return false; // conta trocou no meio: não puxa nada
  try{
    if(typeof rpc!=="function") return false;
    var r = await rpc("petGet", JSON.stringify({nick:c.nick, hash:c.hash}));
    var rec = (typeof r==="string") ? JSON.parse(r) : r;
    if(!rec || (rec.m!==1&&rec.m!==2)) return false;
    if(S.mode!=="none" && (Number(rec.lt)||0) < (S.lastTick||0)) return false; // local mais novo
    S.mode = rec.m===1?"egg":"pet";
    S.eggAt = Math.max(0, Math.min(Date.now()+60000, Number(rec.e)||0));
    S.hunger = Math.max(0,Math.min(100,Number(rec.h)||0));
    S.dirt = Math.max(0,Math.min(100,Number(rec.d)||0));
    S.bored = Math.max(0,Math.min(100,Number(rec.b)||0));
    S.outfit = Math.max(0,Math.min(8,parseInt(rec.o,10)||0));
    S.x = Math.max(0,Math.min(4000,Number(rec.x)||0));
    S.y = Math.max(0,Math.min(4000,Number(rec.y)||0));
    S.lastTick = Number(rec.lt)||0; S.lastFood = Number(rec.lf)||S.lastTick;
    S.peso = (rec.w==null||!isFinite(Number(rec.w))) ? 50 : Math.max(0,Math.min(100,Number(rec.w)));
    S.quiet = !!rec.q; S.dismissed = !!rec.ds;
    save(); petCloud="ok"; petCloudPaint();
    return true;
  }catch(e){ return false; }
}
function petPush(force){
  if(S.mode==="none") return;
  var c=petCred(); if(!c) return;
  var co=String(c.nick||"").toLowerCase();
  if(!co || co!==petCurOwner || S.owner!==co) return; // NUNCA sobe o pet de outra conta
  try{
    if(typeof rpc!=="function") return;
  }catch(e){ return; }
  if(!force && !petDirty) return;
  var t=now();
  if(!force && t-petPushAt<20000){
    if(!petPushTimer) petPushTimer=setTimeout(function(){ petPushTimer=null; petPush(true); }, 20000-(t-petPushAt)+200);
    return;
  }
  petPushAt=t; petDirty=false;
  try{
    rpc("petSet", JSON.stringify({nick:c.nick, hash:c.hash, pet:{
      m:(S.mode==="egg"?1:2), e:Math.round(S.eggAt||0),
      h:Math.round(S.hunger), d:Math.round(S.dirt), b:Math.round(S.bored),
      o:S.outfit||0, x:Math.round(S.x), y:Math.round(S.y),
      lt:S.lastTick||0, lf:S.lastFood||0, q:!!S.quiet, ds:!!S.dismissed,
      w:Math.round(S.peso)
    }})).then(function(r){
      petCloud = (String(r||"").indexOf('"ok":1')>=0) ? "ok" : "off";
      petCloudPaint();
    }).catch(function(){ petDirty=true; petCloud="off"; petCloudPaint(); });
  }catch(e){ petDirty=true; }
}
function petMark(){ petDirty=true; petPush(); }
function el(tag, cls, html){ var d=document.createElement(tag||"div"); if(cls) d.className=cls; if(html!==undefined) d.innerHTML=html; return d; }
function vw(){ return Math.max(document.documentElement.clientWidth, window.innerWidth||0); }
function vh(){ return Math.max(document.documentElement.clientHeight, window.innerHeight||0); }
function ensureLayer(){
  if(layer) return;
  layer = el("div"); layer.id="zunPetLayer"; document.body.appendChild(layer);
}
function fmtLeft(ms){
  if(ms<=0) return "eclodindo...";
  var s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60);
  if(h>=1) return "eclode em "+h+"h"+String(m).padStart(2,"0")+"m";
  if(m>=1) return "eclode em "+m+"m "+(s%60)+"s";
  return "eclode em "+s+"s";
}
function defaultPos(){
  return {x: Math.max(10, vw()-150), y: Math.max(70, 120)};
}
/* ---------- partículas ---------- */
function party(x,y,chars,n){
  if(!isTabActive()) return; // aba oculta: sem DOM
  ensureLayer();
  n=n||6;
  for(var i=0;i<n;i++){
    (function(i){
      var p=el("div","zunpet-particle",chars[i%chars.length]);
      p.style.left=(x+(Math.random()*60-30))+"px"; p.style.top=(y-Math.random()*20)+"px";
      layer.appendChild(p);
      setTimeout(function(){ p.remove(); },1000);
    })(i);
  }
}
/* ---------- fala ---------- */
var bubEl=null, bubTO=null;
function speak(txt, ms){
  if(!isTabActive()) return; // aba oculta: sem DOM
  if(S.quiet || S.dismissed) return;
  if(!petEl) return;
  if(!bubEl){ bubEl = petEl.querySelector(".zunpet-bubble"); }
  if(!bubEl) return;
  bubEl.hidden=false; bubEl.textContent=txt;
  clearTimeout(bubTO);
  // boquinha mexe enquanto fala 😋
  if(petEl){ petEl.classList.remove("talking"); void petEl.offsetWidth; petEl.classList.add("talking"); }
  bubTO=setTimeout(function(){ if(bubEl) bubEl.hidden=true; if(petEl) petEl.classList.remove("talking"); }, ms||2600);
}
/* ---------- humor ---------- */
function mood(){
  if(S.hunger>=70) return "hungry";
  if(S.dirt>=60) return "dirty";
  if(S.bored>=65) return "bored";
  return "happy";
}
function moodLabel(m){
  return m==="hungry"?"com fome 🍎":m==="dirty"?"sujinho 🚿":m==="bored"?"entediado ⚽":"feliz ✨";
}
/* ---------- ovo ---------- */
function spawnEgg(x,y){
  ensureLayer(); clearPet();
  S.mode="egg"; S.eggAt=now(); S.dismissed=false; S.lastFood=now(); S.lastTick=now();
  if(typeof x==="number"){ S.x=x; S.y=y; } else { var p=defaultPos(); S.x=p.x; S.y=p.y; }
  save(); renderEgg();
  speakEgg();
}
function speakEgg(){ /* ovo não fala, só timer */ }
function renderEgg(){
  if(!isTabActive()) return; // aba oculta: só status (sem DOM)
  ensureLayer();
  if(eggEl) eggEl.remove(); eggEl=null;
  if(S.mode!=="egg") return;
  eggEl=el("div","zunpet-eggWrap");
  eggEl.style.left=S.x+"px"; eggEl.style.top=S.y+"px";
  var left = EGG_MS-(now()-S.eggAt);
  var e=el("div","zunpet-egg"+(left<3600*1000?" crack":""), left<3600*1000?EGG_CRACK:EGG_WHOLE);
  var t=el("div","zunpet-eggTimer",fmtLeft(left));
  var h=el("div","zunpet-eggHint","ovo mágico • me arraste • 7 cliques = magia ✨");
  var x=el("button","zunpet-close","×"); x.title="dispensar o bichinho";
  x.onclick=function(ev){ ev.stopPropagation(); dismissAll("ovo guardado. Toque em 🥚 bichinho no topo para trazer de volta!"); };
  eggEl.appendChild(e); eggEl.appendChild(document.createElement("br"));
  eggEl.appendChild(t); eggEl.appendChild(document.createElement("br")); eggEl.appendChild(h);
  eggEl.appendChild(x);
  layer.appendChild(eggEl);
  makeDraggable(eggEl, function(nx,ny){ S.x=nx; S.y=ny; save(); petMark(); });
  eggEl.addEventListener("click", function(){
    var t2=now(); eggClicks.push(t2); eggClicks=eggClicks.filter(function(a){return t2-a<2500;});
    party(S.x+55,S.y+20,["💕","✨"],3);
    if(eggClicks.length>=7){ hatch(true); return; }
    var left2 = EGG_MS-(now()-S.eggAt);
    var tel = eggEl.querySelector(".zunpet-eggTimer");
    if(tel) tel.textContent = fmtLeft(left2)+" 💕";
  });
  var iv=setInterval(function(){
    if(!isTabActive()) return; // aba oculta: ovo avança por delta ao voltar (sem timer de DOM)
    if(!eggEl || S.mode!=="egg"){ clearInterval(iv); return; }
    var l = EGG_MS-(now()-S.eggAt);
    var tel2 = eggEl.querySelector(".zunpet-eggTimer");
    if(tel2) tel2.textContent=fmtLeft(l);
    var ee = eggEl.querySelector(".zunpet-egg");
    if(ee && l<3600*1000 && !/crack/.test(ee.className)){ ee.className+=" crack"; ee.innerHTML=EGG_CRACK; }
    if(l<=0){ clearInterval(iv); hatch(false); }
  },1000);
}
function hatch(fast){
  if(S.mode!=="egg") return;
  S.mode="pet"; S.hunger=35; S.dirt=5; S.bored=40; S.lastTick=now(); save(); petPush(true);
  if(eggEl){ party(S.x+55,S.y+30,["🎉","✨","💕","🐣"],10); eggEl.remove(); eggEl=null; }
  if(hiddenByAuth || !isLogged()){ hiddenByAuth=true; return; } // eclodiu escondido: mostra ao logar
  if(!isTabActive()) return; // eclodiu em aba oculta: resume renderiza ao voltar
  renderPet();
  speak(fast?"magia! nasci rapidinho! hihi! 🎉":"nasci! oi! eu sou seu rostinho! 💕",3200);
  party(S.x+60,S.y+60,["💖","✨","🎉"],8);
}
/* ---------- rostinho ---------- */
function renderPet(){
  if(!isTabActive()) return; // aba oculta: só status (sem DOM)
  ensureLayer();
  if(petEl) petEl.remove(); petEl=null;
  if(S.mode!=="pet"||S.dismissed) return;
  petEl=el("div","zunpet-petWrap");
  petEl.style.left=S.x+"px"; petEl.style.top=S.y+"px";
  var bub=el("div","zunpet-bubble"); bub.hidden=true;
  var body=el("div","zunpet-body");
  body.innerHTML =
    '<svg viewBox="0 0 100 100" width="96" height="96" aria-label="rostinho fofo">'+
    '<defs><radialGradient id="zunG" cx="38%" cy="28%" r="80%">'+
    '<stop offset="0%" stop-color="#f4c795"/><stop offset="55%" stop-color="#cf9154"/><stop offset="100%" stop-color="#96622f"/></radialGradient></defs>'+
    '<ellipse cx="31" cy="90" rx="12" ry="6.5" fill="#8a5627" stroke="#5d3a1a" stroke-width="2.5"/>'+
    '<ellipse cx="69" cy="90" rx="12" ry="6.5" fill="#8a5627" stroke="#5d3a1a" stroke-width="2.5"/>'+
    '<circle cx="50" cy="50" r="43" fill="url(#zunG)" stroke="#5d3a1a" stroke-width="3"/>'+
    '<ellipse cx="32" cy="25" rx="15" ry="8.5" fill="#fff" opacity=".38" transform="rotate(-18 32 25)"/>'+
    '<ellipse cx="25" cy="62" rx="8" ry="5.2" fill="#ff9dab" opacity=".8"/>'+
    '<ellipse cx="75" cy="62" rx="8" ry="5.2" fill="#ff9dab" opacity=".8"/>'+
    '<g class="chub" opacity="0">'+
    '<path class="chubChin" d="M35 78 Q50 88 65 78" stroke="#5d3a1a" stroke-width="2.5" fill="none" stroke-linecap="round"/></g>'+
    '<g class="lean" opacity="0" stroke="#8a5a33" stroke-width="1.8" fill="none" stroke-linecap="round">'+
    '<path d="M27 58 q-5 7 0 14"/><path d="M73 58 q5 7 0 14"/></g>'+
    '<g class="e-open">'+
    '<g class="eyeL"><ellipse cx="36" cy="47" rx="11.5" ry="13" fill="#fff" stroke="#4a2f1a" stroke-width="2.5"/>'+
    '<g class="pupilMove"><circle cx="36" cy="49" r="6.4" fill="#2b1a10"/><circle cx="33.8" cy="46.6" r="2.4" fill="#fff"/><circle cx="38.4" cy="51" r="1.2" fill="#fff" opacity=".95"/></g></g>'+
    '<g class="eyeR"><ellipse cx="64" cy="47" rx="11.5" ry="13" fill="#fff" stroke="#4a2f1a" stroke-width="2.5"/>'+
    '<g class="pupilMove"><circle cx="64" cy="49" r="6.4" fill="#2b1a10"/><circle cx="61.8" cy="46.6" r="2.4" fill="#fff"/><circle cx="66.4" cy="51" r="1.2" fill="#fff" opacity=".95"/></g></g>'+
    '</g>'+
    '<g class="e-happy" style="display:none" stroke="#4a2f1a" stroke-width="3.2" fill="none" stroke-linecap="round">'+
    '<path d="M25 48 Q36 58 47 48"/><path d="M53 48 Q64 58 75 48"/></g>'+
    '<g class="m m-happy"><path d="M38 61 Q50 79 62 61 Q50 67 38 61 Z" fill="#7a2f2f" stroke="#4a2f1a" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="50" cy="70" rx="5.2" ry="3.6" fill="#ff8f8f"/></g>'+
    '<g class="m m-hungry" style="display:none"><ellipse cx="50" cy="67" rx="6.2" ry="7.6" fill="#5c1f1f" stroke="#4a2f1a" stroke-width="2.5"/><circle class="drool" cx="57.5" cy="73" r="2.2" fill="#7ec8ff"><animate attributeName="cy" values="73;76;73" dur="1s" repeatCount="indefinite"/></circle></g>'+
    '<g class="m m-bored" style="display:none"><path d="M42 67 Q50 64.5 58 67" stroke="#4a2f1a" stroke-width="2.8" fill="none" stroke-linecap="round"/></g>'+
    '<g class="m m-dirty" style="display:none"><path d="M41 66 Q45 63 49 66 Q53 69 59 64" stroke="#4a2f1a" stroke-width="2.8" fill="none" stroke-linecap="round"/></g>'+
    '</svg>';
  var dirt=el("div","zunpet-dirt");
  var flies=el("div","zunpet-flies"); flies.hidden=true; flies.innerHTML="<span style='left:10%;top:0'>"+FLY_SVG+"</span><span style='right:8%;bottom:0'>"+FLY_SVG+"</span>";
  var out=el("div","zunpet-outfit"); setOutfit(out);
  body.appendChild(dirt); body.appendChild(out);
  var shadow=el("div","zunpet-shadow");
  var bars=el("div","zunpet-miniBars","<i data-k='hunger'><b></b></i><i data-k='dirt'><b></b></i><i data-k='bored'><b></b></i>");
  bars.title="fome • sujeira • tédio";
  var x=el("button","zunpet-close","×"); x.title="dispensar (esconder o bichinho)";
  var hb=el("button","zunpet-houseBtn","🏠"); hb.title="casinha (bola, banho, roupinha...)";
  petEl.appendChild(bub); petEl.appendChild(body); petEl.appendChild(flies); petEl.appendChild(shadow); petEl.appendChild(bars);
  petEl.appendChild(x); petEl.appendChild(hb);
  layer.appendChild(petEl);
  bubEl=bub;
  x.onclick=function(ev){ ev.stopPropagation(); dismissAll(); };
  hb.onclick=function(ev){ ev.stopPropagation(); toggleHouse(); };
  // carinho: clique no rostinho
  body.addEventListener("click", function(ev){
    ev.stopPropagation();
    S.bored=Math.max(0,S.bored-12); S.hunger=Math.min(100,S.hunger+1); save(); petMark();
    // cafuné: fecha os olhinhos de felicidade por um instante 🥰
    petEl.classList.add("bliss"); refreshMood();
    setTimeout(function(){ if(petEl){ petEl.classList.remove("bliss"); refreshMood(); } },1500);
    petEl.classList.remove("happy"); void petEl.offsetWidth; petEl.classList.add("happy");
    setTimeout(function(){ if(petEl) petEl.classList.remove("happy"); },900);
    party(S.x+60,S.y+30,["💕","💖","✨"],5);
    speak(["hihi! cosquinha! 😊","que carinho bom! 💕","mais! mais! ✨","amo você! 💖"][Math.floor(Math.random()*4)]);
    maybeAutoFood();
    syncHouse();
  });
  makeDraggable(petEl, function(nx,ny){ S.x=nx; S.y=ny; save(); petMark(); });
  refreshMood(); updateBars();
}
function clearPet(){ if(petEl){petEl.remove();petEl=null;} if(eggEl){eggEl.remove();eggEl=null;} }
function refreshMood(){
  if(!petEl) return;
  var m=mood();
  petEl.classList.remove("mood-happy","mood-hungry","mood-dirty","mood-bored");
  petEl.classList.add("mood-"+m);
  var dirt=petEl.querySelector(".zunpet-dirt");
  var flies=petEl.querySelector(".zunpet-flies");
  dirt.innerHTML="";
  if(m==="dirty"||S.dirt>35){
    var n = S.dirt>70?5:3;
    for(var i=0;i<n;i++){
      var s=el("i"); var sz=8+Math.random()*14;
      s.style.cssText="width:"+sz+"px;height:"+sz+"px;left:"+(10+Math.random()*65)+"%;top:"+(10+Math.random()*60)+"%;";
      dirt.appendChild(s);
    }
  }
  flies.hidden = !(S.dirt>=60);
  // mostra a boquinha e os olhinhos certos no SVG fofo:
  // feliz = olhão ABERTO + sorriso; olhinho fechado só no cafuné (bliss)
  try{
    var bliss = petEl.classList.contains("bliss");
    var show=function(sel,vis){ var g=petEl.querySelector(sel); if(g) g.style.display=vis?"":"none"; };
    show(".e-open", !bliss); show(".e-happy", bliss);
    show(".m-happy", m==="happy"); show(".m-hungry", m==="hungry");
    show(".m-bored", m==="bored"); show(".m-dirty", m==="dirty");
  }catch(e){}
  /* corpinho gordo/magro: escala o rostinho conforme S.peso (0-100) */
  try{
    var _pw=petPeso();
    var _svg=petEl.querySelector(".zunpet-body svg");
    if(_svg) _svg.style.transform="scale("+ (0.9+(_pw/100)*0.3).toFixed(3) +", "+ (0.94+(_pw/100)*0.16).toFixed(3) +")";
    var _ch=petEl.querySelector(".chub"); if(_ch) _ch.setAttribute("opacity", _pw>=55?Math.min(1,(_pw-55)/30).toFixed(2):0);
    var _cc=petEl.querySelector(".chubChin"); if(_cc) _cc.setAttribute("opacity", (m==="happy")?1:0.35);
    var _pg=petEl.querySelector(".pocheteGordo"); if(_pg) _pg.setAttribute("opacity", _pw>=55?Math.min(1,(_pw-50)/30).toFixed(2):0);
    var _ln=petEl.querySelector(".lean"); if(_ln) _ln.setAttribute("opacity", _pw<=30?Math.min(1,(30-_pw)/20).toFixed(2):0);
  }catch(_eW){}
  updateBars();
}
function updateBars(){
  if(!petEl) return;
  var map={hunger:S.hunger,dirt:S.dirt,bored:S.bored};
  var cols={hunger:"#e67e22",dirt:"#8d6e63",bored:"#7b7bd4"};
  petEl.querySelectorAll(".zunpet-miniBars i").forEach(function(n){
    var k=n.getAttribute("data-k"); var v=Math.max(0,Math.min(100,map[k]||0));
    var b=n.querySelector("b"); b.style.width=v+"%"; b.style.background=cols[k];
    n.style.opacity = v>60?"1":".55";
  });
}
/* ---------- arrastar ---------- */
var activeDrags=0, lastTouch=0;
function pokeUser(){ lastTouch=now(); }
function makeDraggable(node, onMove){
  var sx=0,sy=0,ox=0,oy=0,drag=false;
  node.addEventListener("pointerdown", function(e){
    if(e.target.closest("button")) return;
    if(e.target.closest("#zunPetHouse")) return;
    drag=true; activeDrags++; pokeUser(); try{ node.setPointerCapture && node.setPointerCapture(e.pointerId); }catch(_e){}
    sx=e.clientX; sy=e.clientY; ox=parseFloat(node.style.left)||0; oy=parseFloat(node.style.top)||0;
    node.style.cursor="grabbing";
    e.preventDefault();
  });
  node.addEventListener("pointermove", function(e){
    if(!drag) return;
    var nx=Math.max(0,Math.min(vw()-120, ox+e.clientX-sx));
    var ny=Math.max(0,Math.min(vh()-120, oy+e.clientY-sy));
    node.style.left=nx+"px"; node.style.top=ny+"px";
  });
  node.addEventListener("pointerup", function(){ _up(false); });
  node.addEventListener("pointercancel", function(){ _up(true); }); // gesto abortado: solta sem arremessar
  function _up(cancelled){
    if(!drag) return; drag=false; activeDrags=Math.max(0,activeDrags-1); pokeUser(); node.style.cursor="grab";
    if(!cancelled) onMove(parseFloat(node.style.left)||0, parseFloat(node.style.top)||0);
  }
}
if(!window.__zunDragGuard){ window.__zunDragGuard=true;
  window.addEventListener("blur", function(){ activeDrags=0; }); // foco perdido no meio do arrasto
}
/* ---------- comidinhas ---------- */
function spawnFood(auto){
  if(!isTabActive()) return; // aba oculta: sem spawn (status continua no tick)
  if(S.mode!=="pet"||S.dismissed) return;
  if(hiddenByAuth || !isLogged()) return;
  if(S.quiet && auto) return;
  ensureLayer();
  if(document.querySelectorAll(".zunpet-food").length>=3) return;
  var f=el("div","zunpet-food",FOODS[Math.floor(Math.random()*FOODS.length)]);
  var fx=Math.max(10,Math.min(vw()-60, S.x+(Math.random()*220-110)));
  var fy=Math.max(60,Math.min(vh()-80, S.y+(Math.random()*160-80)));
  // não nasce em cima do rostinho
  if(Math.hypot(fx-S.x,fy-S.y)<90){ fx=Math.min(vw()-60,fx+120); }
  f.style.left=fx+"px"; f.style.top=fy+"px";
  f.title="arraste até a boquinha ou clique para dar";
  layer.appendChild(f); foodEls.push(f);
  makeDraggable(f, function(nx,ny){
    var cx=nx+17, cy=ny+17, px=S.x+60, py=S.y+50;
    if(Math.hypot(cx-px,cy-py)<75){ feedFood(f); }
  });
  f.addEventListener("click", function(ev){ ev.stopPropagation(); feedFood(f); });
  // some sozinha após 90s se ignorada
  setTimeout(function(){ if(f.isConnected && !f.dataset.eaten){ f.style.transition="opacity .6s"; f.style.opacity="0"; setTimeout(function(){f.remove();},650);} },90000);
  if(auto) speak("olha! apareceu uma comidinha! 😋");
}
function feedFood(f){
  if(!f.isConnected) return;
  f.dataset.eaten="1";
  var r=f.getBoundingClientRect();
  party(r.left, r.top, ["😋","✨","💕"],6);
  f.remove();
  S.hunger=Math.max(0,S.hunger-32); S.bored=Math.max(0,S.bored-8); S.dirt=Math.min(100,S.dirt+4);
  S.peso=Math.min(100,petPeso()+6); // comeu = engorda um tiquinho 🍎
  save(); refreshMood(); syncHouse();
  if(petEl){ petEl.classList.remove("jumping"); void petEl.offsetWidth; petEl.classList.add("jumping"); setTimeout(function(){petEl&&petEl.classList.remove("jumping");},600); }
  speak(PHRASES_EAT[Math.floor(Math.random()*PHRASES_EAT.length)]);
}
function maybeAutoFood(){
  // comidinha aparece entre interações (chance) — além das de 5h
  if(Math.random()<0.45) setTimeout(function(){ spawnFood(false); },1200);
}
/* ---------- banho ---------- */
function bath(){
  if(S.mode!=="pet") return;
  ensureLayer();
  for(var i=0;i<5;i++){
    (function(i){
      var d=el("div","zunpet-shower","💧");
      d.style.left=(S.x+10+i*18)+"px"; d.style.top=(S.y-10)+"px";
      layer.appendChild(d); setTimeout(function(){d.remove();},1700);
    })(i);
  }
  S.dirt=0; save(); refreshMood(); syncHouse(); petMark();
  if(petEl){ petEl.classList.remove("jumping"); void petEl.offsetWidth; petEl.classList.add("jumping"); setTimeout(function(){petEl&&petEl.classList.remove("jumping");},600); }
  party(S.x+60,S.y+20,["🧼","✨","💧"],7);
  speak("que fresquinho! estou limpinho! 🧼✨");
  maybeAutoFood();
}
/* ---------- bola: joguinho de pegar ⚽ ---------- */
var ballEl=null, ballThrows=0, ball=null, ballRAF=0;
/* corpinho: peso 0-100 (50=em forma). Comer engorda, brincar emagrece. */
function petPeso(){ var w=(typeof S.peso==="number"&&isFinite(S.peso))?S.peso:50; return Math.max(0,Math.min(100,w)); }
function petSpeedF(){ return 1.12-(petPeso()/100)*0.35; } // magrinho corre, gordinho passeia
function shapeLabel(){ var w=petPeso(); return w>=75?"gordinho 🍔":w<=25?"magrinho 🥗":"em forma ✨"; }
function playBall(){
  if(S.mode!=="pet") return;
  ensureLayer();
  stopBall();
  ballThrows=0;
  ballEl=el("div","zunpet-ball",BALL_SVG);
  // nasce LONGE do rostinho (230-340px, direção aleatória, preso na tela)
  var _ang=Math.random()*Math.PI*2, _dist=230+Math.random()*110;
  var _sx=Math.max(10,Math.min(vw()-46, S.x+52+Math.cos(_ang)*_dist-18));
  var _sy=Math.max(56,Math.min(vh()-46, S.y+50+Math.sin(_ang)*_dist-18));
  ballEl.style.left=_sx+"px"; ballEl.style.top=_sy+"px";
  ballEl.title="arraste e SOLTE pra arremessar em qualquer direção!";
  layer.appendChild(ballEl);
  ball={x:parseFloat(ballEl.style.left)||0, y:parseFloat(ballEl.style.top)||0, vx:0, vy:0,
    held:false, trail:[], last:now(), spawn:now(), stopAt:0, missCd:0, inMouth:false, tired:false, holdT:0, noCatchUntil:0};
  // rastros do dedo pra calcular o arremesso (flick)
  ballEl.addEventListener("pointermove", function(e){
    if(!ball||!ball.held) return;
    ball.trail.push({x:e.clientX, y:e.clientY, t:now()});
    if(ball.trail.length>8) ball.trail.shift();
  }, {passive:true});
  ballEl.addEventListener("pointerdown", function(){ if(ball){ ball.held=true; ball.vx=0; ball.vy=0; ball.trail=[]; } });
  ballEl.addEventListener("pointercancel", function(){ if(ball) ball.held=false; });
  makeDraggable(ballEl, function(nx,ny){
    if(!ball) return;
    ball.held=false; ball.inMouth=false; // soltou: cancela a segurada dele, o arremesso vale
    if(ball.holdT){ try{clearTimeout(ball.holdT);}catch(_eHT){} ball.holdT=0; }
    ball.noCatchUntil=0; // arremesso do usuário pode ser pego na hora
    ball.x=nx; ball.y=ny;
    // velocidade do flick a partir do rastro
    var t1=now(), t0=null, p0=null;
    for(var i=ball.trail.length-1;i>=0;i--){ if(t1-ball.trail[i].t>70){ t0=ball.trail[i].t; p0=ball.trail[i]; break; } }
    var cx=nx+17, cy=ny+17; // centro da bola
    if(p0 && t1-t0>10){
      var dt=Math.max(16,(t1-t0))/1000;
      ball.vx=(e2cx(cx)-p0.x)/dt; ball.vy=(e2cy(cy)-p0.y)/dt;
      var sp=Math.hypot(ball.vx,ball.vy);
      if(sp>1500){ ball.vx*=1500/sp; ball.vy*=1500/sp; }
      if(sp<80){ ballRandomToss(280); } // toquinho = toss gentil
    } else {
      ballRandomToss(300); // clique/toque parado também joga
    }
    ball.stopAt=0; pokeUser();
  });
  // sem lance forçado: ele CORRE até a bolinha, pega, segura à mostra e joga sozinho ✨
  speak("oba! joga a bolinha pra mim! arrasta e solta! ⚽");
  ballLoop();
}
function e2cx(cx){ return cx; } function e2cy(cy){ return cy; }
function ballCenter(){ return {x:ball.x+18, y:ball.y+18}; }
function ballRandomToss(sp){
  var a=Math.random()*Math.PI*2;
  ball.vx=Math.cos(a)*sp; ball.vy=Math.sin(a)*sp-120;
}
function petThrow(sp){
  if(!ball||!ballEl) return;
  var pc={x:S.x+52, y:S.y+50};
  ball.x=pc.x-18; ball.y=pc.y-18;
  ballRandomToss(sp||(450+Math.random()*300));
  ball.stopAt=0; ball.noCatchUntil=now()+1200; // graça: deixa a bola sair antes de poder pegar
  petHop();
  party(pc.x,pc.y,["⚽","💨"],3);
  speak(["toma! sua vez! ⚽","pega se for capaz! 😝","vai! corre! 🏃💨"][Math.floor(Math.random()*3)]);
}
function petHop(){
  if(!petEl) return;
  petEl.classList.remove("jumping"); void petEl.offsetWidth; petEl.classList.add("jumping");
  setTimeout(function(){ petEl&&petEl.classList.remove("jumping"); },600);
}
function stopBall(){
  if(ballRAF) cancelAnimationFrame(ballRAF); ballRAF=0;
  if(ball&&ball.holdT){ try{clearTimeout(ball.holdT);}catch(_eHT2){} }
  if(ballEl){ ballEl.remove(); ballEl=null; } ball=null;
}
function ballLoop(){
  if(ballRAF) cancelAnimationFrame(ballRAF);
  var prev=now();
  function frame(){
    ballRAF=0;
    if(!isTabActive()) return; // aba oculta: pausa a física (resume religa ao voltar)
    if(!ball||!ballEl||!ballEl.isConnected){ stopBall(); return; }
    if(S.mode!=="pet"||S.dismissed||hiddenByAuth){ stopBall(); return; }
    var t=now(), dt=Math.min(0.05,(t-prev)/1000); prev=t;
    if(ball.inMouth){
      // segurando na boca, à mostra: gruda na boquinha (se o dedo pegou, o dedo manda)
      if(!ball.held && petEl){
        ball.x=S.x+52-18; ball.y=S.y+64-18; ball.vx=0; ball.vy=0;
        ballEl.style.left=ball.x+"px"; ballEl.style.top=ball.y+"px";
      }
    } else if(!ball.held){
      // física
      ball.x+=ball.vx*dt; ball.y+=ball.vy*dt;
      var fr=Math.exp(-1.1*dt); ball.vx*=fr; ball.vy*=fr;
      var maxX=vw()-40, maxY=vh()-40;
      if(ball.x<0){ ball.x=0; ball.vx=Math.abs(ball.vx)*0.72; }
      if(ball.x>maxX){ ball.x=maxX; ball.vx=-Math.abs(ball.vx)*0.72; }
      if(ball.y<50){ ball.y=50; ball.vy=Math.abs(ball.vy)*0.72; }
      if(ball.y>maxY){ ball.y=maxY; ball.vy=-Math.abs(ball.vy)*0.72; }
      var sp=Math.hypot(ball.vx,ball.vy);
      if(sp<25){ ball.vx=0; ball.vy=0; if(!ball.stopAt) ball.stopAt=t; }
      else ball.stopAt=0;
      ballEl.style.left=ball.x+"px"; ballEl.style.top=ball.y+"px";
      // bichinho corre atrás! 🏃
      if(petEl && activeDrags===0 && !petEl.classList.contains("walking") && t-ball.missCd>900){
        var bc=ballCenter(), px=S.x+52, py=S.y+50;
        var dx=bc.x-px, dy=bc.y-py, d=Math.hypot(dx,dy);
        if(d<62 && t>(ball.noCatchUntil||0)){
          if(sp>750 && Math.random()<0.5){
            // passou voando: ele erra! 😅
            ball.missCd=t;
            petEl.classList.remove("tilt","tiltL"); void petEl.offsetWidth; petEl.classList.add("tilt");
            setTimeout(function(){ petEl&&petEl.classList.remove("tilt","tiltL"); },700);
            speak(["quase! 😅","ih! passou voando! 💨","nossa, foi rápido! 😲"][Math.floor(Math.random()*3)]);
          } else ballCatch(sp<200);
        } else {
          // corre! (sem zona-morta: se não alcançou, continua indo)
          var cs=195*petSpeedF()*dt;
          var mx=dx/d*Math.min(cs,d), my=dy/d*Math.min(cs,d);
          var nx=Math.max(0,Math.min(vw()-130,S.x+mx)), ny=Math.max(56,Math.min(vh()-150,S.y+my));
          S.x=nx; S.y=ny; petEl.style.left=nx+"px"; petEl.style.top=ny+"px";
          if(!petEl.classList.contains("chasing")) petEl.classList.add("chasing");
        }
      }
      // fim de jogo: sem pegada em 90s
      if(t-ball.spawn>90000 && ballThrows===0){
        ballEl.style.transition="opacity .5s"; ballEl.style.opacity="0";
        setTimeout(function(){ stopBall(); },550); speak("depois brincamos mais! 😊"); return;
      }
    }
    ballRAF=requestAnimationFrame(frame);
  }
  ballRAF=requestAnimationFrame(frame);
}
function armHold(ms){ // depois de pegar: espera o usuário jogar; se não, ele joga sozinho
  if(!ball) return;
  if(ball.holdT){ try{clearTimeout(ball.holdT);}catch(e){} ball.holdT=0; }
  ball.holdT=setTimeout(function(){
    if(!ball||!ballEl) return;
    if(ball.held){ armHold(1500); return; } // dedo em cima: espera soltar
    ball.inMouth=false; ball.holdT=0; petThrow();
  }, ms);
}
function ballCatch(slow){
  if(!ball||!ballEl||ball.inMouth) return;
  ball.inMouth=true; ball.vx=0; ball.vy=0; ball.stopAt=0;
  if(petEl){ petEl.classList.remove("chasing"); petEl.classList.remove("walking"); }
  petHop();
  var bc=ballCenter();
  party(bc.x,bc.y,["⚽","✨","🎉"],6);
  S.bored=Math.max(0,S.bored-22); S.hunger=Math.min(100,S.hunger+6);
  S.peso=Math.max(0,petPeso()-3); // exercício emagrece! 🏃
  save(); refreshMood(); syncHouse(); petMark();
  ballThrows++;
  ballEl.style.visibility=""; // segura à mostra, na boca — nunca invisível
  S.x=Math.max(0,Math.min(vw()-130,S.x)); S.y=Math.max(56,Math.min(vh()-150,S.y)); save();
  var maxThrows = petPeso()>=75 ? 5 : 8; // gordinho cansa antes 😅
  if(ballThrows>=maxThrows && !ball.tired){
    ball.tired=true;
    speak(petPeso()>=75?"cansei... tô pesadinho! 😅":"cansei! foi divertido! 😊");
    setTimeout(function(){ stopBall(); },1200);
    return;
  }
  var iw=["peguei! ⚽","sou craque! 😎⚽","achei! ⚽"][Math.floor(Math.random()*3)];
  speak(iw+(ballThrows===1?" arrasta a bolinha pra jogar, ou espera que eu jogo! 🤾":" sua vez! 🤾"));
  armHold(3000);
}
/* ---------- roupinha ---------- */
function nextOutfit(){
  S.outfit=((S.outfit||0)+1)%OUTFITS.length; save(); petMark();
  if(petEl){ var o=petEl.querySelector(".zunpet-outfit"); if(o) setOutfit(o); }
  var on=OUTFITS[S.outfit];
  speak(!on?"sem roupinha, ao natural! 😊":"olha "+(on.name||"minha roupinha")+" nova! ✨");
  party(S.x+60,S.y+10,["✨","💖"],5);
  syncHouse();
}
/* ---------- casinha ---------- */
function toggleHouse(force){
  ensureLayer();
  if(houseEl && !force){ houseEl.remove(); houseEl=null; return; }
  if(houseEl){ houseEl.remove(); houseEl=null; }
  if(S.mode==="none"||S.dismissed) return;
  houseEl=el("div"); houseEl.id="zunPetHouse";
  var m=mood();
  houseEl.innerHTML =
    '<div class="zphHead">casinha do rostinho <button id="zphX" title="fechar">x</button></div>'+
    '<div class="zphBody">'+
    '<div class="zphStats">'+
      '<div style="font-weight:bold">como estou: <span id="zphMood">'+moodLabel(m)+'</span></div>'+
      '<div class="zphRow"><span>🍎 fome</span><div class="zphBar"><b id="zphH"></b></div></div>'+
      '<div class="zphRow"><span>🚿 limpeza</span><div class="zphBar"><b id="zphD"></b></div></div>'+
      '<div class="zphRow"><span>⚽ diversão</span><div class="zphBar"><b id="zphB"></b></div></div>'+
      '<div class="zphRow"><span>⚖️ corpo</span><div class="zphBar"><b id="zphW"></b></div></div>'+
      '<div class="meta" id="zphShape" style="font-size:11px;opacity:.7"></div>'+
      '<div class="meta" id="zphEggInfo" style="font-size:11px;opacity:.7"></div>'+
      '<div class="meta" id="zphCloud" title="onde o progresso do bichinho fica salvo" style="font-size:11px;opacity:.7"></div>'+
    '</div>'+
    '<div class="zphGrid">'+
      '<button id="zphFeed">🍎 lanchinho</button>'+
      '<button id="zphBath">🚿 banho</button>'+
      '<button id="zphBall">⚽ bola</button>'+
      '<button id="zphPet">💕 cafuné</button>'+
      '<button id="zphOut">👕 roupinha</button>'+
      '<button id="zphCall">📣 chamar</button>'+
    '</div>'+
    '<div class="zphFoot">'+
      '<label><input type="checkbox" id="zphQuiet" style="width:auto"> modo silencioso (sem falas nem comidinhas auto)</label>'+
      '<button class="zphDanger" id="zphBye">💤 dispensar o bichinho</button>'+
    '</div></div>';
  layer.appendChild(houseEl);
  houseEl.querySelector("#zphX").onclick=function(){ houseEl.remove(); houseEl=null; };
  houseEl.querySelector("#zphFeed").onclick=function(){ spawnFood(false); speak("escolhe uma comidinha pra mim! 😋"); };
  houseEl.querySelector("#zphBath").onclick=bath;
  houseEl.querySelector("#zphBall").onclick=playBall;
  houseEl.querySelector("#zphPet").onclick=function(){ if(petEl){ petEl.querySelector(".zunpet-body").click(); } };
  houseEl.querySelector("#zphOut").onclick=nextOutfit;
  houseEl.querySelector("#zphCall").onclick=function(){ if(petEl){ petEl.classList.remove("jumping"); void petEl.offsetWidth; petEl.classList.add("jumping"); setTimeout(function(){petEl&&petEl.classList.remove("jumping");},600); speak("estou aqui! 👋😊"); } };
  var q=houseEl.querySelector("#zphQuiet"); q.checked=!!S.quiet;
  q.onchange=function(){ S.quiet=q.checked; save(); petMark(); if(S.quiet&&bubEl) bubEl.hidden=true; };
  houseEl.querySelector("#zphBye").onclick=function(){ dismissAll(); };
  syncHouse();
}
function syncHouse(){
  if(!isTabActive()) return; // aba oculta: sem DOM
  if(!houseEl) return;
  var h=houseEl.querySelector("#zphH"), d=houseEl.querySelector("#zphD"), b=houseEl.querySelector("#zphB");
  if(h){ h.style.width=S.hunger+"%"; h.style.background=S.hunger>70?"#e74c3c":S.hunger>40?"#e67e22":"#2ecc71"; }
  if(d){ var clean=100-S.dirt; d.style.width=clean+"%"; d.style.background=S.dirt>60?"#e74c3c":S.dirt>30?"#e67e22":"#2ecc71"; }
  if(b){ var fun=100-S.bored; b.style.width=fun+"%"; b.style.background=S.bored>65?"#e74c3c":S.bored>35?"#e67e22":"#2ecc71"; }
  var pw=petPeso();
  var w2=houseEl.querySelector("#zphW");
  if(w2){ w2.style.width=pw+"%"; w2.style.background=(pw>=75||pw<=20)?"#e67e22":"#2ecc71"; }
  var sh=houseEl.querySelector("#zphShape");
  if(sh){ sh.textContent="corpinho: "+shapeLabel()+(pw>=75?" — cuidado com os doces! 🍩":pw<=25?" — dá mais comidinha! 🍎":""); }
  var mm=houseEl.querySelector("#zphMood"); if(mm) mm.textContent=moodLabel(mood());
  petCloudPaint();
  var ei=houseEl.querySelector("#zphEggInfo");
  if(ei){
    if(S.mode==="egg"){ var l=EGG_MS-(now()-S.eggAt); ei.textContent="🥚 "+fmtLeft(l)+" • arraste o ovinho!"; }
    else ei.textContent="💡 arraste o rostinho pra passear • ele segue seu mouse com os olhinhos!";
  }
}
/* ---------- dispensar ---------- */
function dismissAll(msg){
  S.dismissed=true; save(); petPush(true);
  if(petEl){petEl.remove();petEl=null;}
  if(eggEl){eggEl.remove();eggEl=null;}
  if(houseEl){houseEl.remove();houseEl=null;}
  document.querySelectorAll(".zunpet-food,.zunpet-ball").forEach(function(n){n.remove();});
  if(msg){ try{ alert(msg); }catch(e){} }
}
/* ---------- tick de status ---------- */
function tick(){
  if(S.mode==="none"||S.dismissed) return;
  if(!isTabActive()){
    /* aba oculta: só os números avançam (sem DOM, sem falas, sem push de
       render). O resume faz catchUp+save de novo, então aqui é só manter o
       lastTick andando p/ não dar salto gigante. */
    petCatchUp(); save();
    return;
  }
  var t=now(), dt=(t-(S.lastTick||t))/60000; // minutos
  S.lastTick=t;
  if(dt<=0) dt=0.02;
  if(S.mode==="pet"){
    S.hunger=Math.min(100,S.hunger+dt*1.1);   // ~ enche em ~1h30
    S.dirt=Math.min(100,S.dirt+dt*0.7);
    S.bored=Math.min(100,S.bored+dt*0.9);
    S.peso=Math.max(0,S.peso-dt*(S.hunger>=85?1.2:0.35)); // metabolismo: com fome queima reserva
    // comidinha automática a cada 5h
    if(t-(S.lastFood||0)>=FOOD_MS){ S.lastFood=t; spawnFood(true); }
    save(); refreshMood(); syncHouse(); petPush(); // só envia se algo mudou (petDirty)
    // falas de necessidade (se não silencioso)
    if(!S.quiet && Math.random()<0.25){
      var m=mood();
      if(m==="hungry"&&S.hunger>75) speak(PHRASES_HUNGRY[Math.floor(Math.random()*PHRASES_HUNGRY.length)]);
      else if(m==="dirty"&&S.dirt>70) speak(PHRASES_DIRTY[Math.floor(Math.random()*PHRASES_DIRTY.length)]);
      else if(m==="bored"&&S.bored>75) speak(PHRASES_BORED[Math.floor(Math.random()*PHRASES_BORED.length)]);
    }
  } else if(S.mode==="egg"){
    if(t-S.eggAt>=EGG_MS) hatch(false);
  }
}
/* ---------- olhinhos seguem o mouse ---------- */
document.addEventListener("mousemove", function(e){
  if(!isTabActive()) return;
  if(!petEl||S.mode!=="pet"||S.dismissed) return;
  var r=petEl.querySelector(".zunpet-body");
  if(!r) return;
  var b=r.getBoundingClientRect();
  var cx=b.left+b.width/2, cy=b.top+b.height/2;
  var dx=e.clientX-cx, dy=e.clientY-cy;
  var d=Math.max(1,Math.hypot(dx,dy));
  var ox=Math.max(-3.5,Math.min(3.5,dx/d*3.5)), oy=Math.max(-3,Math.min(3,dy/d*3));
  petEl.querySelectorAll(".pupilMove").forEach(function(p){ p.setAttribute("transform","translate("+ox.toFixed(1)+" "+oy.toFixed(1)+")"); });
  clearTimeout(lookTimer);
  lookTimer=setTimeout(function(){
    // volta ao centro devagar
    if(petEl) petEl.querySelectorAll(".pupilMove").forEach(function(p){ p.setAttribute("transform","translate(0 0)"); });
  },2500);
}, {passive:true});
/* atenção carismática: olha ao redor + cabecinha inclina + fala sozinho */
setInterval(function(){
  if(!isTabActive()) return; // aba oculta: sem animação/fala (só status no tick)
  if(!petEl||S.mode!=="pet"||S.dismissed||S.quiet||document.hidden) return;
  if(activeDrags>0) return;
  if(Math.random()<0.6){
    var ox=(Math.random()*7-3.5), oy=(Math.random()*6-3);
    petEl.querySelectorAll(".pupilMove").forEach(function(p){ p.setAttribute("transform","translate("+ox.toFixed(1)+" "+oy.toFixed(1)+")"); });
    // cabecinha curiosa inclina de vez em quando 🥰
    if(Math.random()<0.4){
      var tc = Math.random()<0.5?"tilt":"tiltL";
      petEl.classList.remove("tilt","tiltL"); void petEl.offsetWidth; petEl.classList.add(tc);
      setTimeout(function(){ petEl&&petEl.classList.remove("tilt","tiltL"); },1400);
    }
    if(Math.random()<0.5){
      var m=mood();
      var pool = m==="hungry"?PHRASES_HUNGRY:m==="dirty"?PHRASES_DIRTY:m==="bored"?PHRASES_BORED:(Math.random()<0.5?PHRASES_IDLE:PHRASES_HAPPY);
      speak(pool[Math.floor(Math.random()*pool.length)]);
    }
  }
},6000);
/* ---------- passeio: ele anda sozinho pela tela 🚶 ---------- */
function walkTo(nx, ny, cb){
  if(!petEl||S.mode!=="pet"||S.dismissed) return;
  nx=Math.max(8,Math.min(vw()-130,nx)); ny=Math.max(56,Math.min(vh()-150,ny));
  var dx=nx-S.x, dy=ny-S.y, dist=Math.hypot(dx,dy);
  if(dist<60) return;
  var secs=Math.max(0.8,Math.min(2.2,dist/160));
  petEl.style.transition="left "+secs+"s linear, top "+secs+"s linear";
  petEl.style.left=nx+"px"; petEl.style.top=ny+"px";
  petEl.classList.add("walking");
  var puffs=Math.floor(secs*4);
  for(var i=0;i<puffs;i++){
    (function(i){
      setTimeout(function(){
        if(!petEl||!petEl.isConnected) return;
        var r=petEl.getBoundingClientRect();
        party(r.left+r.width/2+(Math.random()*30-15), r.top+r.height-6, ["💨"], 1);
      }, 250*(i+1));
    })(i);
  }
  setTimeout(function(){
    if(!petEl) return;
    petEl.classList.remove("walking");
    petEl.style.transition="";
    S.x=nx; S.y=ny; save(); petMark();
    // pulinho de chegada + às vezes comemora
    petEl.classList.remove("jumping"); void petEl.offsetWidth; petEl.classList.add("jumping");
    setTimeout(function(){ petEl&&petEl.classList.remove("jumping"); },600);
    if(Math.random()<0.25) speak(["cheguei! 😊","passeio bom! ✨","olha onde eu tô! 👀","hihi! 🚶"][Math.floor(Math.random()*4)]);
    if(cb){ try{cb();}catch(_eCB){} }
  }, secs*1000+60);
}
setInterval(function(){
  if(!isTabActive()) return; // aba oculta: sem passeio (só status no tick)
  if(!petEl||S.mode!=="pet"||S.dismissed||document.hidden) return;
  if(activeDrags>0) return;
  if(ballEl&&ballEl.isConnected) return; // joguinho de bola rolando: a perseguição assume
  if(now()-lastTouch<7000) return; // não briga com o usuário: espera 7s quieto
  if(petEl.classList.contains("walking")) return;
  // com fome (ou guloso), ele vai ATRÁS da comidinha sozinho! 🍎
  if(!S.quiet){
    var _foods=document.querySelectorAll(".zunpet-food");
    if(_foods.length && (S.hunger>35||Math.random()<0.5)){
      var _bf=null, _bd=1e9, _fi;
      for(_fi=0;_fi<_foods.length;_fi++){
        var _fr=_foods[_fi].getBoundingClientRect();
        var _dd=Math.hypot((_fr.left+_fr.width/2)-(S.x+52), (_fr.top+_fr.height/2)-(S.y+50));
        if(_dd<_bd){ _bd=_dd; _bf={el:_foods[_fi], x:_fr.left, y:_fr.top}; }
      }
      if(_bf && _bd<600){
        if(_bd<95){ feedFood(_bf.el); petHop(); } // já alcançou: nham!
        else{
          (function(_t){
            walkTo(_t.x+18-52, _t.y+18-50, function(){
              if(!_t.el.isConnected) return;
              var _rr=_t.el.getBoundingClientRect();
              var _d=Math.hypot((_rr.left+_rr.width/2)-(S.x+52), (_rr.top+_rr.height/2)-(S.y+50));
              if(_d<95){ feedFood(_t.el); petHop(); }
            });
          })(_bf);
        }
        return;
      }
    }
  }
  if(Math.random()<0.75){
    var nx=S.x+(Math.random()*340-170), ny=S.y+(Math.random()*220-110);
    walkTo(nx,ny);
  }
},9000);
/* comidinha aparece sozinha de vez em quando, pra ele caçar 🍎 */
setInterval(function(){
  if(!isTabActive()) return; // aba oculta: sem spawn (evita burst ao voltar)
  if(S.mode!=="pet"||S.dismissed||document.hidden) return;
  if(hiddenByAuth||!isLogged()) return;
  if(S.quiet) return;
  if(document.querySelectorAll(".zunpet-food").length>=2) return;
  if(Math.random()<0.4) spawnFood(false);
},30000);
/* ---------- só pra quem tem conta 🔒 ---------- */
function isLogged(){ try{ return (typeof me!=="undefined") && !!(me&&me.nick); }catch(e){ return false; } }
var hiddenByAuth=false;
function goAuth(){
  var a=document.getElementById("authBox");
  if(a){
    try{ a.scrollIntoView({behavior:"smooth",block:"center"}); }catch(e){}
    a.style.outline="3px solid #ffb300"; a.style.borderRadius="10px";
    setTimeout(function(){ a.style.outline=""; },3500);
    var inp=a.querySelector("input"); if(inp){ try{ inp.focus({preventScroll:true}); }catch(e){} }
  }
}
function lockTip(){
  ensureLayer();
  var old=document.getElementById("zunPetLock"); if(old) old.remove();
  var d=el("div"); d.id="zunPetLock";
  d.style.cssText="position:fixed;top:64px;left:50%;transform:translateX(-50%);background:#fff8e1;border:2px solid #ffb300;color:#5a4308;border-radius:12px;padding:10px 14px;font-size:13px;z-index:200005;pointer-events:auto;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:88vw;text-align:center;cursor:pointer;";
  d.innerHTML="🔒 <b>o bichinho é só pra quem tem conta!</b><br>Crie seu nick + senha grátis e volte aqui 💕<br><span style='font-size:11px'>(toque aqui pra ir pro login)</span>";
  layer.appendChild(d);
  setTimeout(function(){ if(d.isConnected) d.remove(); },6000);
  d.onclick=function(){ d.remove(); goAuth(); };
  goAuth();
}
/* esconde/mostra conforme login/logoff, sem apagar o progresso salvo */
setInterval(function(){
  try{ petSwitch(false); }catch(e){} // troca de conta? carrega o pet DA NOVA conta (anti-herança)
  var logged=isLogged();
  if(!logged && !hiddenByAuth && (S.mode==="egg"||S.mode==="pet") && !S.dismissed){
    hiddenByAuth=true;
    if(petEl){petEl.remove();petEl=null;}
    if(eggEl){eggEl.remove();eggEl=null;}
    if(houseEl){houseEl.remove();houseEl=null;}
    document.querySelectorAll(".zunpet-food,.zunpet-ball,.zunpet-particle").forEach(function(n){n.remove();});
  } else if(logged && hiddenByAuth){
    hiddenByAuth=false;
    var lt=document.getElementById("zunPetLock"); if(lt) lt.remove();
    if(!isTabActive()) return; // aba oculta: resume renderiza ao voltar
    if(S.mode==="egg") renderEgg();
    else if(S.mode==="pet"&&!S.dismissed) renderPet();
  }
},3000);
/* ---------- botão do topo ---------- */
function wireTopBtn(){
  var b=document.getElementById("zunPetTopBtn");
  if(!b) return;
  // mostra estado no botão
  function paint(){
    if(!isLogged()) b.innerHTML="🔒<span class='btn-txt'> bichinho</span>";
    else if(S.mode==="egg") b.innerHTML="🐣<span class='btn-txt'> ovinho</span>";
    else if(S.mode==="pet"&&!S.dismissed) b.innerHTML="😊<span class='btn-txt'> rostinho</span>";
    else b.innerHTML="🥚<span class='btn-txt'> bichinho</span>";
  }
  paint(); setInterval(paint,5000);
  b.onclick=function(){
    ensureLayer();
    if(!isLogged()){ lockTip(); paint(); return; }
    if(S.mode==="none"||S.dismissed){
      // traz de volta: se já foi pet antes, volta direto pro pet; senão ovo novo
      if(S.mode==="pet"){ S.dismissed=false; save(); renderPet(); toggleHouse(true); speak("voltei! senti sua falta! 💕"); }
      else spawnEgg();
      if(!houseEl) toggleHouse(true);
    } else if(S.mode==="egg"){
      if(eggEl){ eggEl.style.transition="left .5s,top .5s"; var p=defaultPos(); /*centraliza na tela*/ }
      speakEgg(); toggleHouse(true);
    } else {
      toggleHouse();
      if(petEl){ petEl.classList.remove("jumping"); void petEl.offsetWidth; petEl.classList.add("jumping"); setTimeout(function(){petEl&&petEl.classList.remove("jumping");},600); }
    }
    paint();
  };
}
function boot(){
  ensureLayer();
  wireTopBtn();
  var render=function(){
    if(S.dismissed) return;
    if(!isTabActive()) return; // aba aberta em 2º plano: só status (resume pinta ao focar)
    if(!isLogged() && (S.mode==="egg"||S.mode==="pet")){ hiddenByAuth=true; return; }
    hiddenByAuth=false;
    if(eggEl){ eggEl.remove(); eggEl=null; }
    if(petEl){ petEl.remove(); petEl=null; }
    if(S.mode==="egg"){
      if(now()-S.eggAt>=EGG_MS) { S.mode="pet"; S.lastTick=now(); save(); renderPet(); }
      else renderEgg();
    } else if(S.mode==="pet"){
      renderPet();
    }
  };
  statTimer=setInterval(tick,30000);
  setInterval(syncHouse,5000);
  // checagem do ovo 1x/segundo (leve)
  setInterval(function(){ if(!isTabActive()) return; if(S.mode==="egg"&&!S.dismissed&&now()-S.eggAt>=EGG_MS) hatch(false); },1000);
  // comidinha de boas-vindas se estiver com fome ao abrir
  setTimeout(function(){ if(isTabActive()&&S.mode==="pet"&&!S.dismissed&&S.hunger>55) spawnFood(true); },4000);
  render();
  // carrega o estado DA CONTA logada (ou zero p/ conta nova) e só então conversa com a nuvem
  petSwitch(true);
  render();
  // puxa o banco: se o servidor tem estado mais novo, ele vence; se não tem, sobe o local
  if(isLogged()){
    petPull().then(function(ok){
      if(ok){ render(); }
      else if(S.mode==="egg"||S.mode==="pet"){ petPush(true); }
    });
  }
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot);
else boot();
/* API pública mínima: só sincronização + diagnóstico. Sem cheats de
   console (chocar/comer/acelerar pela console era possível antes). */
window.ZunPet={pull:function(){return petPull();},push:function(f){petPush(!!f);},account:function(){return petCurOwner||"";},sw:function(){return petSwitch(true);},active:function(){return isTabActive();}};
})();
