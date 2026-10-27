/* zunzum — Termo de Uso (consentimento + botão discreto).
   Modal abre 1x: ao concordar grava localStorage e não abre mais.
   Depois vira só um botão discreto 📜 na barra do topo p/ reler. */
(function(){
"use strict";

var LS_KEY = "zunzumTermosV1";

function lang(){
  try{
    var l = String(window.zunzumLang || "pt").slice(0, 2).toLowerCase();
    return (l === "en" || l === "es") ? l : "pt";
  }catch(e){ return "pt"; }
}

/* PT completo; EN/ES resumidos (mesmas regras, texto curto). */
var TERMS = {
pt: {
  title: "📜 Termo de Uso do zunzum",
  agree: "concordo",
  later: "agora não",
  foot: "Ao clicar em CONCORDO você confirma que leu e aceita estas regras.",
  body: [
    ["1. Crimes não são aceitos", "Crimes hediondos, exploração sexual (principalmente envolvendo menores), apologia ao crime, ameaças, golpes e qualquer promoção de atividade criminosa são PROIBIDOS e podem levar a banimento e denúncia às autoridades."],
    ["2. Debate livre e polido", "Debates éticos, morais, políticos e filosóficos são livres e NÃO são censurados — mesmo polêmicos — desde que polidos. O limite é só quando o debate vira promoção de crime (item 1), ataque pessoal ou assédio."],
    ["3. Privacidade e anonimato", "O zunzum NÃO coleta seus dados: conta é só nick + senha (sem e-mail, sem nome, sem telefone). Nada é pedido além do necessário para a conta funcionar, e nada é compartilhado sem motivo explícito."],
    ["4. Sem guarda permanente (corta rasto)", "A ideia do anonimato aqui é CORTAR RASTO: NÃO garantimos que posts, mensagens ou mídias fiquem salvos para sempre. Conteúdo antigo pode ser apagado automaticamente por limite de espaço. Se é importante, salve você mesmo."],
    ["5. Responsabilidade", "Cada pessoa responde pelo que publica. O zunzum é um espaço anônimo sem revisão prévia e não se responsabiliza por conteúdo de terceiros. Use silenciar/bloquear e fale com o dono da sala em caso de abuso."],
    ["6. Segurança em atualização", "O código e a segurança do zunzum passam por atualizações frequentes (quase diárias). Mesmo assim, anonimato depende também de você: não compartilhe dados pessoais, senhas ou fotos que te identifiquem."],
    ["7. Convivência", "Sem flood/spam, sem se passar por outra pessoa, sem vazar conversa privada (DM/sala trancada) sem consentimento. Conteúdo erótico: só entre adultos e com as travas de exibição respeitadas — qualquer coisa com menor é crime (item 1). Recomendado para maiores de 13 anos."]
  ]
},
en: {
  title: "📜 zunzum Terms of Use",
  agree: "i agree",
  later: "not now",
  foot: "By clicking I AGREE you confirm you read and accept these rules.",
  body: [
    ["1. No crimes", "Heinous crimes, sexual exploitation (especially involving minors), apology for crime, threats, scams and any promotion of criminal activity are FORBIDDEN and may lead to bans and reports to authorities."],
    ["2. Free polite debate", "Ethical, moral, political and philosophical debates are free and NOT censored — even controversial ones — as long as they stay polite. The limit is only when debate becomes promotion of crime, personal attacks or harassment."],
    ["3. Privacy & anonymity", "zunzum does NOT collect your data: account is just nick + password (no email, no name, no phone). Nothing beyond what the account needs, nothing shared without explicit reason."],
    ["4. No permanent storage (cut the trail)", "Anonymity here means CUTTING THE TRAIL: we do NOT guarantee posts, messages or media stay saved forever. Old content may be auto-deleted for space. Save what matters yourself."],
    ["5. Responsibility", "Each person answers for what they publish. zunzum is an anonymous space with no prior review and is not liable for third-party content. Use mute/block and talk to the room owner about abuse."],
    ["6. Rolling security", "zunzum code and security get frequent (near-daily) updates. Still, anonymity also depends on you: don't share personal data, passwords or identifying photos."],
    ["7. Coexistence", "No flood/spam, no impersonation, no leaking private chats without consent. Erotic content: adults only, respect the display locks — anything with minors is a crime (item 1). Recommended for ages 13+."]
  ]
},
es: {
  title: "📜 Términos de Uso de zunzum",
  agree: "acepto",
  later: "ahora no",
  foot: "Al hacer clic en ACEPTO confirmas que leíste y aceptas estas reglas.",
  body: [
    ["1. Sin crímenes", "Crímenes atroces, explotación sexual (sobre todo de menores), apología del delito, amenazas, estafas y cualquier promoción de actividad criminal están PROHIBIDOS y pueden llevar a baneo y denuncia a las autoridades."],
    ["2. Debate libre y educado", "Los debates éticos, morales, políticos y filosóficos son libres y NO se censuran — aunque sean polémicos — siempre que sean educados. El límite es solo cuando el debate se vuelve promoción del crimen, ataque personal o acoso."],
    ["3. Privacidad y anonimato", "zunzum NO recolecta tus datos: la cuenta es solo nick + contraseña (sin email, sin nombre, sin teléfono). Nada más allá de lo necesario, nada compartido sin motivo explícito."],
    ["4. Sin guardado permanente (cortar rastro)", "El anonimato aquí es CORTAR RASTRO: NO garantizamos que publicaciones, mensajes o archivos queden guardados para siempre. El contenido viejo puede borrarse solo por espacio. Guarda tú lo importante."],
    ["5. Responsabilidad", "Cada persona responde por lo que publica. zunzum es un espacio anónimo sin revisión previa y no se responsabiliza por contenido de terceros. Usa silenciar/bloquear y habla con el dueño de la sala ante abusos."],
    ["6. Seguridad continua", "El código y la seguridad de zunzum reciben actualizaciones frecuentes (casi diarias). Aun así, el anonimato también depende de ti: no compartas datos personales, contraseñas ni fotos que te identifiquen."],
    ["7. Convivencia", "Sin flood/spam, sin suplantar a otros, sin filtrar chats privados sin consentimiento. Contenido erótico: solo adultos y respetando los bloqueos de vista — cualquier cosa con menores es crimen (punto 1). Recomendado para mayores de 13 años."]
  ]
}
};

function agreed(){
  try{ return localStorage.getItem(LS_KEY) === "1"; }catch(e){ return false; }
}
function setAgreed(){
  try{ localStorage.setItem(LS_KEY, "1"); }catch(e){}
}

function buildModal(){
  if(document.getElementById("termosModal")) return;
  var t = TERMS[lang()] || TERMS.pt;
  var ov = document.createElement("div");
  ov.id = "termosModal";
  ov.style.cssText = "position:fixed;inset:0;background:rgba(20,40,70,.55);display:flex;align-items:flex-start;justify-content:center;padding:8vh 12px;z-index:120;overflow-y:auto";
  var card = document.createElement("div");
  card.style.cssText = "background:#fff;border-radius:12px;padding:16px;max-width:560px;width:100%;max-height:80vh;overflow-y:auto;text-align:left;color:#22344d";
  var h = document.createElement("div");
  h.style.cssText = "font-weight:bold;font-size:16px;color:#33507a;margin-bottom:8px";
  h.textContent = t.title;
  card.appendChild(h);
  t.body.forEach(function(sec){
    var b = document.createElement("div");
    b.style.cssText = "font-weight:bold;font-size:13px;margin:10px 0 2px";
    b.textContent = sec[0];
    var p = document.createElement("div");
    p.style.cssText = "font-size:13px;line-height:1.55";
    p.textContent = sec[1];
    card.appendChild(b); card.appendChild(p);
  });
  var f = document.createElement("div");
  f.className = "meta";
  f.style.cssText = "font-size:12px;opacity:.7;margin-top:12px";
  f.textContent = t.foot;
  card.appendChild(f);
  var row = document.createElement("div");
  row.style.cssText = "display:flex;gap:8px;margin-top:10px;flex-wrap:wrap";
  var ok = document.createElement("button");
  ok.textContent = "✅ " + t.agree;
  ok.style.cssText = "flex:1;min-height:44px;font-weight:bold;background:#2f7a3d;color:#fff;border:1px solid #256232;border-radius:8px;cursor:pointer";
  ok.onclick = function(){ setAgreed(); closeModal(); };
  var no = document.createElement("button");
  no.textContent = t.later;
  no.style.cssText = "min-height:44px;border:1px solid #b6c9db;background:#eef4fb;border-radius:8px;cursor:pointer;padding:6px 14px";
  no.onclick = function(){ closeModal(); };
  row.appendChild(ok); row.appendChild(no);
  card.appendChild(row);
  ov.appendChild(card);
  /* clicar fora = agora não (não força, só lembra na próxima visita) */
  ov.addEventListener("click", function(ev){ if(ev.target === ov) closeModal(); });
  document.body.appendChild(ov);
}
function closeModal(){
  try{ var ov = document.getElementById("termosModal"); if(ov) ov.remove(); }catch(e){}
}

/* botão discreto 📜 na barra do topo — sempre visível p/ reler */
function ensureButton(){
  try{
    if(document.getElementById("termosBtn")) return;
    var bar = document.getElementById("topBtns");
    if(!bar) return;
    var b = document.createElement("button");
    b.id = "termosBtn";
    b.title = "termo de uso";
    b.textContent = "📜";
    b.style.cssText = "opacity:.75;font-size:14px";
    b.onclick = function(){ buildModal(); };
    bar.appendChild(b);
  }catch(e){}
}

function boot(){
  ensureButton();
  if(!agreed()){
    /* abre sozinho 1x, com pequena espera p/ não travar a primeira pintura */
    setTimeout(function(){
      try{ if(!agreed()) buildModal(); }catch(e){}
    }, 1200);
  }
  /* i18n tardio: recria o botão se a barra for re-renderizada */
  setTimeout(ensureButton, 4000);
}

if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
})();
