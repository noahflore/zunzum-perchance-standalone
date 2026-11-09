/* Desafio semanal do zunzum — feito p/ pouca gente, sem bot, sem dono online.
   Como funciona (texto que o visitante lê, sem tecnicês): toda semana um tema
   novo; poste na sala #desafio; cada post = 1 ponto (até 3/dia); cada dia
   diferente que você volta = +2; quando gente nova chega, quem já estava
   ganha +1 por estreante; quem somar mais até domingo vence.
   Onde aparece: cartão fixo no TOPO DO FEED (onde o olho já está) + um aviso
   que abre 1x por semana com o tema e o placar (fecha em [entendi], não
   incomoda de novo até a próxima semana).
   Implementação: só LÊ (roomsList/roomView, endpoints já usados pelo app).
   Não cria nada sozinho, não escreve nada, sem sink novo: tudo via
   textContent + createElement. A sala #desafio é criada 1x por uma pessoa
   (botão só preenche o formulário existente e ela aperta criar). */
(function(){
var ROOM_NAME = "desafio";
var DESAFIO_PHOTO = "https://user.uploads.dev/file/c8408537dd35bb624eee9560b37e5fa8.jpg"; // TEMPORÁRIA (abelha do zunzum): trocar pela foto gerada do desafio quando o gerador de imagens voltar (falhou 3x AS-0012 em 2026-10-29)
var THEMES = [
  "Sua foto Orkut 2008 — poste uma foto (ou descreva) da época de Orkut",
  "Seu primeiro nick — qual foi e por quê?",
  "MSN em 3 palavras — do que você sente mais falta?",
  "Depoimento pra alguém — escreva um como antigamente",
  "Sua comunidade dos sonhos — qual você criaria?",
  "Scrap criativo — deixe um recado pra quem ler",
  "Música da época — qual não saía do repeat em 2008?",
  "Internet discada — sua lembrança mais engraçada",
  "Seu perfil em 1 frase — apresente-se como antigamente",
  "Fórum que você frequentava — qual e por quê?",
  "Tecnologia que sumiu — do que você sente falta?",
  "Carta pro futuro — o que diria pra você daqui a 10 anos?"
];
var THEMES_EN = [
  "Your 2008 Orkut photo — post a photo (or describe it) from your Orkut days",
  "Your first nick — what was it and why?",
  "MSN in 3 words — what do you miss most?",
  "Testimonial for someone — write one like the old days",
  "Your dream community — which would you create?",
  "Creative scrap — leave a message for whoever reads",
  "Music from back then — what was on repeat for you in 2008?",
  "Dial-up internet — your funniest memory",
  "Your profile in 1 sentence — introduce yourself like the old days",
  "Forum you used to visit — which one and why?",
  "Gone tech — what do you miss?",
  "Letter to the future — what would you tell yourself 10 years from now?"
];
var THEMES_ES = [
  "Tu foto Orkut 2008 — publica una foto (o describe) de tu época de Orkut",
  "Tu primer nick — ¿cuál fue y por qué?",
  "MSN en 3 palabras — ¿qué extrañas más?",
  "Testimonio para alguien — escribe uno como antes",
  "Tu comunidad soñada — ¿cuál crearías?",
  "Scrap creativo — deja un mensaje para quien lea",
  "Música de la época — ¿cuál sonaba en tu repeat en 2008?",
  "Internet por discado — tu recuerdo más divertido",
  "Tu perfil en 1 frase — preséntate como antes",
  "Foro que frecuentabas — ¿cuál y por qué?",
  "Tecnología que desapareció — ¿qué extrañas?",
  "Carta al futuro — ¿qué le dirías a tu yo de dentro de 10 años?"
];
function weekStart(){ try{ var d = new Date(); var d2 = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); var dow = (d2.getUTCDay()+6)%7; return d2.getTime() - dow*86400000; }catch(e){ return 0; } }
function dayKey(ms){ try{ return new Date(ms).toISOString().slice(0,10); }catch(e){ return ""; } }
/* Pura (testável): msgs [{f,at}] + weekStart -> [{nick,pts,posts,days,bonus}] ordenado. */
function scoreDesafio(msgs, ws){
  var per = {};
  for(var i=0;i<(msgs||[]).length;i++){
    var m = msgs[i]||{};
    var nick = String(m.f||"").replace(/^@/,"").toLowerCase().slice(0,20);
    if(!/^[a-z0-9-]{2,20}$/.test(nick)) continue;
    var at = +m.at||0;
    if(at < ws) continue;
    var dk = dayKey(at);
    if(!dk) continue;
    var p = per[nick] || (per[nick] = {nick:nick, days:{}, first:at});
    if(at < p.first) p.first = at;
    var arr = p.days[dk] || (p.days[dk] = 0);
    if(arr < 3) p.days[dk] = arr+1; // teto 3/dia: flood não vira ponto
  }
  var order = Object.keys(per).map(function(k){ return per[k]; });
  order.sort(function(a,b){ return a.first-b.first; });
  var out = order.map(function(p, ix){
    var posts = 0, days = 0;
    for(var k in p.days){ days++; posts += p.days[k]; }
    var bonus = order.length-1-ix; // cada estreante depois de você = +1
    return {nick:p.nick, pts:posts+2*days+bonus, posts:posts, days:days, bonus:bonus};
  });
  out.sort(function(a,b){ return (b.pts-a.pts) || (a.nick<b.nick?-1:1); });
  return out;
}
function goRoom(room){
  try{
    var id = String((room&&room.id)||"").slice(0,30);
    if(!/^[a-z0-9-]{2,30}$/.test(id)) return;
    if(typeof window.switchRoom === "function"){
      window.switchRoom(id); // troca sem recarregar
      try{ if(typeof window.zunMobileGo === "function") window.zunMobileGo("chats"); }catch(e){} // mostra a aba (senão troca "invisível")
      try{ var pb = document.getElementById("pubBox"); if(pb) pb.scrollIntoView({block:"start"}); }catch(e2){}
      return;
    }
  }catch(e){}
  try{ var _b=(window.zunBaseUrl?window.zunBaseUrl():(location.origin+String(location.pathname||"/").replace(/index\.html?$/i,"").replace(/\/$/,""))); location.href=_b+"?sala="+encodeURIComponent(String((room&&room.id)||"")); }catch(e2){}
}
function themeNow(){ var L=THEMES; try{ var l=String(window.zunzumLang||"pt").slice(0,2); if(l==="en")L=THEMES_EN; else if(l==="es")L=THEMES_ES; }catch(e){} return L[Math.floor(weekStart()/604800000)%L.length]; }
function myNick(){ try{ var raw = sessionStorage.getItem("orkutSession")||localStorage.getItem("orkutSession"); var m = JSON.parse(raw||"null"); if(m && m.nick && /^[a-z0-9-]{2,20}$/i.test(String(m.nick))) return String(m.nick).toLowerCase(); }catch(e){} return ""; }
function el(tag, cls, txt){ var d = document.createElement(tag); if(cls) d.className = cls; if(txt!=null) d.textContent = txt; return d; }
async function findRoom(){
  try{
    var t = await crpc("roomsList", "");
    var list = JSON.parse(t);
    if(!Array.isArray(list)) return null;
    for(var i=0;i<list.length;i++){
      var r = list[i]||{};
      if(String(r.name||"").toLowerCase() === ROOM_NAME && /^[a-z0-9-]{2,30}$/.test(String(r.id||""))) return {id:r.id, name:r.name};
    }
    return null;
  }catch(e){ return null; }
}
function rankRows(rank, max){
  var out = [];
  (rank||[]).slice(0, max||5).forEach(function(x, i){
    out.push((i+1)+"º @"+x.nick+" — "+x.pts+" pts ("+x.posts+" posts · "+x.days+" dias"+(x.bonus?(" · +"+x.bonus+" chegada"):"")+")");
  });
  return out;
}
function paintShell(){
  try{
    if(document.getElementById("zzDesafio")) return;
    var anchor = document.getElementById("feedCtn");
    var parent = (anchor && anchor.parentNode) || document.getElementById("seoBox");
    if(!parent) return;
    var d = el("div", "box"); d.id = "zzDesafio";
    d.style.cssText = "border:2px solid #ffb300";
    d.appendChild(el("h3", null, "🏅 desafio da semana"));
    var theme = el("div", null, "Tema: " + themeNow() + " (fecha domingo)");
    theme.style.cssText = "font-size:13px;margin-bottom:6px";
    d.appendChild(theme);
    var det = el("details", null); det.open = false;
    var sum = el("summary", null, "ver regras e placar");
    try{ sum.style.cssText = "cursor:pointer;font-size:13px;font-weight:bold"; }catch(e){}
    det.appendChild(sum);
    var rules = el("div", "meta");
    rules.appendChild(el("div", null, "• Poste na sala #desafio sobre o tema. Cada post = 1 ponto (até 3 por dia)."));
    rules.appendChild(el("div", null, "• Volte outro dia e poste de novo: cada dia diferente = +2 pontos."));
    rules.appendChild(el("div", null, "• Gente nova chegando dá +1 pra quem já estava. Quem somar mais até domingo vence."));
    det.appendChild(rules);
    var body = el("div", "meta"); body.id = "zzDesafioBody"; body.textContent = "carregando placar...";
    det.appendChild(body);
    d.appendChild(det);
    if(anchor && anchor.parentNode === parent) parent.insertBefore(d, anchor);
    else parent.appendChild(d);
  }catch(e){}
}
function paintBody(room, rank){
  try{
    var body = document.getElementById("zzDesafioBody");
    if(!body) return;
    body.innerHTML = "";
    if(!room){
      body.appendChild(el("div", null, "A sala #desafio ainda não existe — seja o primeiro a abrir!"));
      if(myNick()){
        var b = el("button", null, "abrir a sala #desafio");
        b.style.cssText = "margin-top:6px;min-height:40px";
        b.onclick = function(){
          try{
            var f = document.getElementById("pubCreateForm");
            var n = document.getElementById("pubNewName");
            var ds = document.getElementById("pubNewDesc");
            var ph = document.getElementById("pubNewPhoto");
            if(!f || !n){ body.textContent = "Abra a aba de chats e crie a sala chamada desafio."; return; }
            n.value = ROOM_NAME;
            if(ds) ds.value = "Desafio semanal do zunzum: um tema novo toda semana.";
            if(ph) ph.value = DESAFIO_PHOTO;
            f.hidden = false;
            try{ if(typeof window.zunMobileGo === "function") window.zunMobileGo("chats"); }catch(e){}
            try{ f.scrollIntoView({block:"center"}); }catch(e){}
            var msg = document.getElementById("pubCreateMsg");
            if(msg) msg.textContent = "é só apertar criar 👆";
          }catch(e){}
        };
        body.appendChild(b);
      } else {
        body.appendChild(el("div", null, "Entre com seu nick para abrir a sala e participar."));
      }
      return;
    }
    var line = el("div", null);
    line.appendChild(document.createTextNode("Participe na sala "));
    var a = el("button", null, "#desafio");
    a.type = "button"; a.title = "ir para a sala do desafio (sem recarregar)";
    a.style.cssText = "background:none;border:none;padding:0;color:#06c;text-decoration:underline;cursor:pointer;font-size:inherit";
    a.onclick = function(){ goRoom(room); };
    line.appendChild(a);
    body.appendChild(line);
    if(!rank || !rank.length){
      body.appendChild(el("div", null, "Ninguém pontuou ainda esta semana — seu post pode ser o primeiro."));
      return;
    }
    rankRows(rank, 5).forEach(function(row){ body.appendChild(el("div", null, row)); });
  }catch(e){}
}
/* Aviso 1x por semana: abre sozinho com o tema + placar, fecha e não volta
   até a próxima semana. Não usa confirm/alert (trava a página). */
var popupTimer = null;
function popupSeen(){ try{ return localStorage.getItem("zunDesafioSeenWeek") === String(weekStart()); }catch(e){ return true; } }
function markPopup(){ try{ localStorage.setItem("zunDesafioSeenWeek", String(weekStart())); }catch(e){} }
function closePopup(){
  try{
    var ov = document.getElementById("zzDesafioOv");
    if(ov) ov.remove();
    document.removeEventListener("keydown", escPopup, true);
  }catch(e){}
}
function escPopup(e){ try{ if(e.key === "Escape"){ e.stopPropagation(); closePopup(); } }catch(e2){} }
function showPopup(room, rank){
  try{
    if(document.getElementById("zzDesafioOv")) return;
    var ov = el("div", null); ov.id = "zzDesafioOv";
    ov.style.cssText = "position:fixed;inset:0;z-index:9400;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:center;padding:12vh 12px 12px;box-sizing:border-box";
    var box = el("div", null);
    box.style.cssText = "width:min(360px,calc(100vw - 24px));background:#fffbe6;border:2px solid #ffb300;border-radius:10px;padding:10px 12px;font-size:13px;color:#3d2e00;text-align:left;box-shadow:0 20px 55px rgba(0,0,0,.5)";
    box.appendChild(el("b", null, "🏅 desafio da semana"));
    var th = el("div", null, themeNow()); th.style.cssText = "margin:4px 0 6px";
    box.appendChild(th);
    if(room && rank && rank.length){
      rankRows(rank, 3).forEach(function(row){ box.appendChild(el("div", "meta", row)); });
    } else if(room){
      box.appendChild(el("div", "meta", "Ninguém pontuou ainda — seu post pode ser o primeiro."));
    } else {
      box.appendChild(el("div", "meta", "A sala #desafio ainda não existe — seja o primeiro a abrir!"));
    }
    var row = el("div", null); row.style.cssText = "display:flex;gap:6px;margin-top:8px;justify-content:flex-end";
    if(room){
      var go = el("button", null, "participar");
      go.type = "button"; go.title = "ir para a sala (sem recarregar)";
      go.style.cssText = "min-height:40px";
      go.onclick = function(){ try{ closePopup(); }catch(e){} goRoom(room); };
      row.appendChild(go);
    }
    var ok = el("button", null, "entendi"); ok.style.cssText = "min-height:40px";
    ok.onclick = function(){ closePopup(); };
    row.appendChild(ok);
    box.appendChild(row);
    ov.appendChild(box);
    ov.addEventListener("mousedown", function(e){ if(e.target === ov) closePopup(); });
    document.addEventListener("keydown", escPopup, true);
    document.body.appendChild(ov);
    markPopup();
  }catch(e){}
}
function maybePopup(room, rank){
  try{
    if(popupTimer || popupSeen() || document.getElementById("zzDesafioOv")) return;
    popupTimer = setTimeout(function(){
      popupTimer = null;
      try{ if(document.hidden || popupSeen()) return; }catch(e){ return; }
      showPopup(room, rank);
    }, 5000);
  }catch(e){}
}
async function refresh(){
  try{
    if(!document.getElementById("zzDesafio")) paintShell();
    var room = await findRoom();
    if(!room){ paintBody(null, null); maybePopup(null, null); return; }
    var v = null;
    try{ v = JSON.parse(await crpc("roomView", JSON.stringify({room:room.id}))); }catch(e){ v = null; }
    if(!v || !v.ok){ paintBody(room, null); maybePopup(room, null); return; }
    var rank = scoreDesafio(v.msgs||[], weekStart());
    paintBody(room, rank);
    maybePopup(room, rank);
  }catch(e){}
}
try{ window.zunDesafioScore = scoreDesafio; }catch(e){}
function desafioTick(){ try{ if(window.__ecoSkip&&window.__ecoSkip("desafio",2,4,8)) return; }catch(e){} refresh(); } // ECO: ranking mais espaçado
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", function(){ refresh(); setInterval(desafioTick, 180000); });
else { refresh(); setInterval(desafioTick, 180000); } // egress 2026-10-30: 60s→180s (ranking de fundo)
})();
