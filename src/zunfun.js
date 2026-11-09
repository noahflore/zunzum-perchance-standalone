/* zunfun — comandos divertidos do chat público (/poll, /joke, /fact, /comida, /help)
   r68: /poll com votação persistente (FASE 18 poll_votes) + pergunta legível.
   - expandPub/parsePoll: iguais (texto parseável, zero rede).
   - pollId: hash determinístico do conteúdo ("poll:"+8 hex) — vale no #geral,
     nas salas e no local; enquetes de texto igual compartilham o placar.
   - paintPoll: cartão legível por tema (dia/noite/festa via CSS .zun-poll) +
     placar ao vivo; clique VOTA (não só preenche). Sem hooks (sem banco) cai
     no modo antigo: botão preenche o input.
   Segurança: nunca innerHTML com dado do usuário (só createElement/textContent);
   pollId/opt validados antes de qualquer RPC; sem link, sem HTML.
   r71: /joke /fact /comida via IA (app.js gera antes de enviar) com fallback
   estático; /help EFÊMERO (só quem chamou vê, nunca envia). */
(function(){
"use strict";
function lang(){ try{ var l = String(window.zunzumLang||"pt").slice(0,2).toLowerCase(); if(l==="en"||l==="es") return l; }catch(e){} return "pt"; }
function clean(s, n){ s = String(s==null?"":s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").trim(); if(s.length>n) s = s.slice(0,n); return s; }
function pick(a){ try{ var i = Math.floor(Math.random()*a.length); return a[i]||a[0]; }catch(e){ return a[0]; } }
/* Listas estáticas (fallback quando sem IA ou a IA falha). PT 12 + EN/ES 6.
   Curtas, leves, sem ofensa — clima social do site. */
var JOKES_PT = ["Por que a abelha foi ao médico? Porque estava se sentindo zonza!","O que o zero disse pro oito? Que cinto maneiro!","Por que o livro de matemática se matou? Tinha muitos problemas.","Qual o peixe que cai do céu? O atum!","Por que o esqueleto não brigou? Não tinha estômago pra isso!","O que a zebra disse pro mosquito? Para de me picar que eu conto pro cavalo!","Por que a vaca foi pra lua? Pra ver o queijo minas de perto.","Qual a fruta mais gente boa? A uva... passa!","Por que o computador foi ao médico? Porque pegou um vírus!","O que o pato disse pra pata? Vem quá!","Por que o relógio foi preso? Porque matou o tempo!","Qual o animal mais antigo? A zebra, porque é em preto e branco."];
var FACTS_PT = ["Abelhas se comunicam dançando: a famosa dança do requebrado indica onde tem flor.","O Orkut foi criado em 2004 e o Brasil foi o país com mais usuários.","Polvos têm três corações e o sangue azul.","A Grande Muralha da China tem mais de 21 mil km.","Bananas são radioativas (potássio-40), mas numa dose inofensiva.","O coração do camarão fica na cabeça.","Tubarões existem há mais tempo que Saturno tem anéis.","O mel nunca estraga: acharam mel comestível em tumba egípcia.","Golfinhos têm nomes próprios: cada um responde a um assobio único.","A palavra abelha vem do latim apicula, abelhinha.","Café é fruta: a semente do café vem de uma cerejinha vermelha.","No Japão tem sorvete de wasabi, de carvão e até de cacto."];
var FOODS_PT = ["Coxinha quentinha com catupiry escorrendo","Pão de queijo mineiro saindo do forno","Feijoada completa com couve, farofa e laranja","Açaí gelado com granola e banana","Pastel de feira com caldo de cana","Brigadeiro de panela comido de colher","Moqueca de camarão com pirão","Tapioca de queijo coalho com goiabada","Escondidinho de carne seca com mandioca","Churrasco com pão de alho e vinagrete","Bolo de cenoura com cobertura de chocolate","Strogonoff de frango com batata palha"];
var JOKES_EN = ["Why did the bee go to the doctor? It was feeling buzzy!","What do you call fake spaghetti? An impasta!","Why don't scientists trust atoms? Because they make up everything!","What did the ocean say to the beach? Nothing, it just waved!","Why did the scarecrow win an award? He was outstanding in his field!","How does a penguin build its house? Igloos it together!"];
var FACTS_EN = ["Bees talk by dancing: the waggle dance points to flowers.","Honey never spoils: edible honey was found in Egyptian tombs.","Octopuses have three hearts and blue blood.","Bananas are slightly radioactive (potassium-40), totally harmless.","A shrimp's heart is in its head.","Dolphins have names: each answers to a unique whistle."];
var FOODS_EN = ["Hot crispy coxinha with creamy cheese","Fluffy pão de queijo fresh from the oven","Full feijoada with kale, farofa and orange","Icy açaí bowl with granola and banana","Fair pastel with sugarcane juice","Warm chocolate brigadeiro eaten with a spoon"];
var JOKES_ES = ["¿Por qué la abeja fue al médico? ¡Porque se sentía zumbada!","¿Qué le dice un cero a un ocho? ¡Qué cinturón tan bonito!","¿Por qué el libro de matemáticas se mató? ¡Tenía muchos problemas!","¿Qué pez cae del cielo? ¡El atún!","¿Por qué la computadora fue al médico? ¡Porque tenía un virus!","¿Qué le dijo el pato a la pata? ¡Ven quá!"];
var FACTS_ES = ["Las abejas se comunican bailando: la danza del meneo indica flores.","La miel nunca se echa a perder: hallaron miel comestible en tumbas egipcias.","Los pulpos tienen tres corazones y sangre azul.","Las bananas son un poco radiactivas (potasio-40), inofensivas.","El corazón del camarón está en la cabeza.","Los delfines tienen nombres: cada uno responde a un silbido único."];
var FOODS_ES = ["Coxinha caliente con queso cremoso","Pan de queso minero recién horneado","Feijoada completa con col, farofa y naranja","Açaí helado con granola y plátano","Pastel de feria con jugo de caña","Brigadeiro tibio comido a cucharadas"];
var T = {
pt: { vote:"vote", answerHint:"responda com o número", needQ:"escreva a pergunta: /poll pergunta;op1;op2[;op3;op4;op5]", need2:"enquete precisa de 2 a 5 opções", qLong:"pergunta muito longa (máx 140)", optLong:"opção muito longa (máx 40)", pollEmpty:"/poll pergunta;op1;op2", help:"comandos: /poll pergunta;op1;op2[;op3;op4;op5] · /joke · /fact · /comida · /help", voted:"voto", pollOf:"enquete", votes:"votos", voting:"votando…", voteErr:"não votou", needLogin:"entre com seu nick para votar", noBank:"placar indisponível (sem banco)" },
en: { vote:"vote", answerHint:"reply with the number", needQ:"write the question: /poll question;opt1;opt2[;opt3;opt4;opt5]", need2:"poll needs 2 to 5 options", qLong:"question too long (max 140)", optLong:"option too long (max 40)", pollEmpty:"/poll question;opt1;opt2", help:"commands: /poll question;opt1;opt2[;opt3;opt4;opt5] · /joke · /fact · /food · /help", voted:"vote", pollOf:"poll", votes:"votes", voting:"voting…", voteErr:"didn't vote", needLogin:"log in to vote", noBank:"tally unavailable (no bank)" },
es: { vote:"vota", answerHint:"responde con el número", needQ:"escribe la pregunta: /poll pregunta;op1;op2[;op3;op4;op5]", need2:"la encuesta necesita 2 a 5 opciones", qLong:"pregunta muy larga (máx 140)", optLong:"opción muy larga (máx 40)", pollEmpty:"/poll pregunta;op1;op2", help:"comandos: /poll pregunta;op1;op2[;op3;op4;op5] · /joke · /fact · /comida · /help", voted:"voto", pollOf:"encuesta", votes:"votos", voting:"votando…", voteErr:"no votó", needLogin:"entra con tu nick para votar", noBank:"conteo no disponible (sin banco)" }
};
function expandPub(t){
  t = String(t==null?"":t);
  if(!/^\/(poll|joke|fact|comida|food|help|ajuda|comandos)\b/i.test(t.trim())) return null;
  var L = lang(), tx = T[L]||T.pt;
  var m = t.trim().match(/^\/(\S+)\s*([\s\S]*)$/);
  var cmd = String(m&&m[1]||"").toLowerCase(), rest = clean(m&&m[2]||"", 480);
  if(cmd==="joke"){ var a = L==="en"?JOKES_EN:(L==="es"?JOKES_ES:JOKES_PT); return {text:"😂 "+pick(a)}; }
  if(cmd==="fact"){ var b = L==="en"?FACTS_EN:(L==="es"?FACTS_ES:FACTS_PT); return {text:"💡 "+pick(b)}; }
  if(cmd==="comida"||cmd==="food"){ var c = L==="en"?FOODS_EN:(L==="es"?FOODS_ES:FOODS_PT); return {text:"🍲 "+pick(c)}; }
  if(cmd==="help"||cmd==="ajuda"||cmd==="comandos") return {ephemeral:true};
  if(cmd==="poll"){
    if(!rest) return {error:tx.pollEmpty};
    var parts = rest.split(/;|\|/).map(function(s){ return clean(s, 140); }).filter(function(s){ return s; });
    if(parts.length<3) return {error:parts.length<2?tx.needQ:tx.need2};
    var q = parts[0], opts = parts.slice(1,6);
    if(q.length<4) return {error:tx.needQ};
    if(q.length>140) return {error:tx.qLong};
    if(opts.length<2||opts.length>5) return {error:tx.need2};
    for(var i=0;i<opts.length;i++){ if(!opts[i]||opts[i].length>40) return {error:tx.optLong}; }
    var lines = ["📊 "+q];
    for(var j=0;j<opts.length;j++) lines.push((j+1)+") "+opts[j]);
    lines.push("— "+tx.vote+": "+tx.answerHint+"!");
    var out = lines.join("\n");
    if(out.length>500) return {error:tx.qLong};
    return {text:out};
  }
  return null;
}
/* ---- r71: IA (/joke /fact /comida) + /help efêmero ----
   aiCommand(t): "joke"|"fact"|"comida"|null (só o comando puro, sem resto).
   app.js: se houver root.generateText, gera ANTES de enviar; sem IA ou em
   falha, cai no expandPub estático. Prompt curto, no idioma da UI (PT/EN/ES),
   1-2 frases, sem ofensa — o site é social, a IA segue o clima.
   aiWrap(cmd, gen): emoji + texto limpo (cleanAi: sem controles, máx 280).
   isHelp(t)/helpLines(): /help nunca envia — showHelpEphemeral() monta um
   cartão local descartável (só quem chamou vê, estilo Discord). */
function aiCommand(t){
  try{
    var m = String(t==null?"":t).trim().match(/^\/(\S+)\s*([\s\S]*)$/);
    if(!m) return null;
    var c = String(m[1]||"").toLowerCase();
    if(c==="joke") return "joke";
    if(c==="fact") return "fact";
    if(c==="comida"||c==="food") return "comida";
  }catch(e){}
  return null;
}
var AI_EMOJI = {joke:"😂 ", fact:"💡 ", comida:"🍲 "};
function aiPrompt(cmd){
  var L = lang();
  if(cmd==="joke") return L==="en" ? "Tell a short funny joke in English (1-2 sentences, light and friendly, offends nobody)."
    : L==="es" ? "Cuenta un chiste corto y divertido en español (1-2 frases, ligero y amistoso, sin ofender a nadie)."
    : "Conte uma piada curta e engraçada em português (1-2 frases, leve e amigável, sem ofender ninguém).";
  if(cmd==="fact") return L==="en" ? "Share a short curious fact in English (1-2 sentences, fun for chat)."
    : L==="es" ? "Comparte un dato curioso corto en español (1-2 frases, divertido para el chat)."
    : "Diga um fato curioso curto em português (1-2 frases, legal para o chat).";
  return L==="en" ? "Suggest a tasty food/meal idea in English (1 short line, makes people hungry)."
    : L==="es" ? "Sugiere una comida rica en español (1 línea corta, que dé hambre)."
    : "Sugira uma comida gostosa em português (1 linha curta, que dê água na boca).";
}
function cleanAi(s){
  try{
    s = String(s==null?"":s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,"").trim();
    s = s.replace(/^\s*["'“”‘’]+|["'“”‘’]+\s*$/g, "").trim();
    s = s.replace(/\n{3,}/g, "\n\n");
    if(s.length>280) s = s.slice(0,280).trim();
    return s;
  }catch(e){ return ""; }
}
function aiWrap(cmd, gen){
  var t = cleanAi(gen);
  if(!t) return null;
  return (AI_EMOJI[cmd]||"") + t;
}
function isHelp(t){
  try{ return /^\/(help|ajuda|comandos)\b/i.test(String(t==null?"":t).trim()); }catch(e){ return false; }
}
function helpLines(){
  var L = lang();
  if(L==="en") return ["🐝 commands (only you see this — /help sends nothing):", "/poll question;opt1;opt2[;opt3;opt4;opt5] — live poll", "/joke — AI joke", "/fact — AI curious fact", "/food — AI food idea"];
  if(L==="es") return ["🐝 comandos (solo tú ves esto — /help no envía nada):", "/poll pregunta;op1;op2[;op3;op4;op5] — encuesta en vivo", "/joke — chiste con IA", "/fact — dato curioso con IA", "/comida — idea de comida con IA"];
  return ["🐝 comandos (só você vê isto — /help não envia nada):", "/poll pergunta;op1;op2[;op3;op4;op5] — enquete ao vivo", "/joke — piada com IA", "/fact — fato curioso com IA", "/comida — ideia de comida com IA"];
}
/* Cartão efêmero: vive só no DOM local, com ✕ e auto-some 30s. Nunca toca
   na rede. textContent em tudo (linhas vêm do helpLines, estático). */
function showHelpEphemeral(){
  try{
    document.querySelectorAll(".zun-help-eph").forEach(function(e){ try{ e.remove(); }catch(_){} });
    var card = document.createElement("div");
    card.className = "zun-help-eph";
    card.setAttribute("role", "note");
    var x = document.createElement("button");
    x.type = "button"; x.className = "zun-help-x"; x.textContent = "✕";
    x.title = "fechar";
    x.onclick = function(){ try{ card.remove(); }catch(_){} };
    card.appendChild(x);
    helpLines().forEach(function(ln, i){
      var d = document.createElement("div");
      d.className = i===0 ? "zun-help-t" : "zun-help-ln";
      d.textContent = ln;
      card.appendChild(d);
    });
    var host = null;
    try{ host = document.getElementById("pubBox")||document.getElementById("postBox"); }catch(_){}
    if(host && host.parentNode) host.parentNode.insertBefore(card, host);
    else document.body.appendChild(card);
    setTimeout(function(){ try{ card.remove(); }catch(_){} }, 30000);
    try{ card.scrollIntoView({block:"nearest"}); }catch(_){}
    return true;
  }catch(e){ return false; }
}
/* Detecta mensagem de enquete no formato acima. Parseia o texto cru
   (dataset.plain), nunca o HTML — sem regex com dado em atributo. */
function parsePoll(t){
  try{
    t = String(t||"");
    if(t.slice(0,2)!=="📊") return null;
    var lines = t.split("\n").map(function(s){ return String(s).trim(); }).filter(Boolean);
    if(lines.length<4) return null;
    var q = clean(lines[0].replace(/^📊\s*/,""), 140);
    var opts = [];
    for(var i=1;i<lines.length-1;i++){
      var mm = lines[i].match(/^([1-5])\)\s*(.+)$/);
      if(!mm) return null;
      if(parseInt(mm[1],10)!==opts.length+1) return null;
      var o = clean(mm[2], 40);
      if(!o) return null;
      opts.push(o);
    }
    if(opts.length<2||opts.length>5||q.length<4) return null;
    return {q:q, opts:opts};
  }catch(e){ return null; }
}
/* id determinístico do placar: "poll:"+8 hex (cyrb53 do canônico).
   Minúsculo+trim para "Pizza" e "pizza " caírem no mesmo placar. */
function pollHash(s){
  try{
    s = String(s||"");
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for(var i=0;i<s.length;i++){ var ch = s.charCodeAt(i); h1 = Math.imul(h1^ch, 2654435761); h2 = Math.imul(h2^ch, 1597334677); }
    h1 = Math.imul(h1^(h1>>>16), 2246822507)^Math.imul(h2^(h2>>>13), 3266489909);
    h2 = Math.imul(h2^(h2>>>16), 2246822507)^Math.imul(h1^(h1>>>13), 3266489909);
    var n = (h2>>>0)*4294967296+(h1>>>0);
    return ("00000000"+(n%4294967296).toString(16)).slice(-8);
  }catch(e){ return "00000000"; }
}
function pollIdOf(parsed){
  try{
    if(!parsed||!parsed.q||!parsed.opts) return null;
    var canon = String(parsed.q).toLowerCase().trim()+"\x1f"+parsed.opts.map(function(o){ return String(o).toLowerCase().trim(); }).join("\x1f");
    return "poll:"+pollHash(canon);
  }catch(e){ return null; }
}
function okPollId(p){ return /^poll:[a-f0-9]{8}$/.test(String(p||"")); }
/* cache de placar 15s (igual ao crpc: evita martelar a cada repaint) */
var _tallyCache = {};
function tallyCached(id){ try{ var c = _tallyCache[String(id||"")]; if(c && (Date.now()-c.at)<15000) return c.val; }catch(e){} return null; }
function tallyStore(id, val){ try{ _tallyCache[String(id||"")] = {at:Date.now(), val:val}; var ks = Object.keys(_tallyCache); if(ks.length>200) delete _tallyCache[ks[0]]; }catch(e){} }
/* pinta um número inteiro >=0 sem exceção (dado do banco é hostil por desenho) */
function num(n){ n = parseInt(n,10); return (Number.isFinite(n)&&n>=0&&n<=1000000)?n:0; }
/* Cartão da enquete: pergunta legível por tema + placar + botões que VOTAM.
   hooks = {pollId, tally(id)->Promise{counts,total,mine}, vote(id,opt)->Promise}
   sem hooks (sem banco/local) = modo antigo: botão só preenche o input. */
function paintPoll(container, parsed, inputEl, hooks){
  try{
    if(!container||!parsed||!parsed.opts) return;
    var L = lang(), tx = T[L]||T.pt;
    var pid = (hooks&&hooks.pollId)||pollIdOf(parsed);
    if(!okPollId(pid)) pid = pollIdOf(parsed);
    /* esconde o texto cru (vira linha única colada sem <br>): o cartão abaixo
       é a leitura canônica; o .ttext segue no DOM p/ citar/editar. */
    try{ var _tt = container.querySelector?container.querySelector(":scope > .ttext, .ttext"):null; if(_tt) _tt.style.display = "none"; }catch(e){}
    try{ if(container.classList) container.classList.add("has-poll"); }catch(e){}
    /* evita duplicar no repaint incremental (patchChatLog reaproveita a linha) */
    try{ var _old = container.querySelector?container.querySelector(':scope > .zun-poll[data-pollid="'+String(pid)+'"]'):null; if(_old) return; }catch(e){}
    var card = document.createElement("div");
    card.className = "zun-poll";
    try{ card.setAttribute("data-pollid", String(pid)); }catch(e){}
    var q = document.createElement("div");
    q.className = "zun-poll-q";
    q.textContent = "📊 "+parsed.q;
    card.appendChild(q);
    var list = document.createElement("div");
    list.className = "zun-poll-opts";
    card.appendChild(list);
    var rows = [];
    parsed.opts.forEach(function(op, i){
      var row = document.createElement("div");
      row.className = "zun-poll-row";
      var b = document.createElement("button");
      b.type = "button";
      b.className = "zun-poll-btn";
      b.textContent = (i+1)+") "+op;
      b.title = tx.voted+" "+(i+1);
      var meta = document.createElement("div");
      meta.className = "zun-poll-meta";
      var track = document.createElement("div");
      track.className = "zun-poll-track";
      var fill = document.createElement("div");
      fill.className = "zun-poll-fill";
      try{ fill.style.width = "0%"; }catch(e){}
      track.appendChild(fill);
      var cnt = document.createElement("span");
      cnt.className = "zun-poll-num";
      cnt.textContent = hooks?"…":"";
      meta.appendChild(track);
      meta.appendChild(cnt);
      row.appendChild(b);
      row.appendChild(meta);
      list.appendChild(row);
      rows.push({btn:b, fill:fill, cnt:cnt, idx:i+1});
    });
    var foot = document.createElement("div");
    foot.className = "zun-poll-foot";
    foot.textContent = "";
    card.appendChild(foot);
    function renderTally(t){
      try{
        var counts = [], total = 0, mine = 0;
        if(t && Array.isArray(t.counts)){ counts = t.counts.map(num); }
        else { for(var k=0;k<parsed.opts.length;k++) counts.push(0); }
        total = counts.reduce(function(a,b){ return a+b; }, 0);
        mine = parseInt(t&&t.mine,10); if(!(mine>=1&&mine<=parsed.opts.length)) mine = 0;
        rows.forEach(function(r, k){
          var c = num(counts[k]), pct = total>0?Math.round(100*c/total):0;
          try{ r.fill.style.width = pct+"%"; }catch(e){}
          r.cnt.textContent = String(c)+" ("+pct+"%)";
          try{
            if(mine===r.idx) r.btn.classList.add("on");
            else r.btn.classList.remove("on");
          }catch(e){}
        });
        foot.textContent = total===0 ? ("0 "+tx.votes) : (String(total)+" "+tx.votes+(mine?(" · "+tx.voted+" "+mine):""));
      }catch(e){}
    }
    async function load(){
      if(!hooks||typeof hooks.tally!=="function") return;
      var c0 = tallyCached(pid);
      if(c0){ renderTally(c0); }
      try{
        var t = await hooks.tally(pid);
        if(t) tallyStore(pid, t);
        renderTally(t||c0||{counts:[], total:0, mine:0});
      }catch(e){ renderTally(c0||{counts:[], total:0, mine:0}); }
    }
    rows.forEach(function(r){
      r.btn.onclick = function(ev){
        try{ if(ev) ev.stopPropagation(); }catch(e){}
        if(!hooks||typeof hooks.vote!=="function"){
          /* modo antigo (sem banco): preenche o input, usuário confirma */
          try{
            if(!inputEl) return;
            var cur = String(inputEl.value||""), ins = String(r.idx);
            inputEl.value = cur+(cur&&!/\s$/.test(cur)?" ":"")+ins+" ";
            inputEl.focus();
          }catch(e){}
          return;
        }
        var now = Date.now();
        try{ if(card._vAt && now-card._vAt<2000) return; card._vAt = now; }catch(e){}
        try{ r.btn.disabled = true; foot.textContent = tx.voting; }catch(e){}
        hooks.vote(pid, r.idx).then(function(t){
          try{ r.btn.disabled = false; }catch(e){}
          if(t && (t.counts||t.ok)){ if(t.counts) tallyStore(pid, t); renderTally(t.counts?t:{counts:[],total:0,mine:0}); load(); }
          else { try{ foot.textContent = tx.voteErr; }catch(e){} load(); }
        }).catch(function(err){
          try{ r.btn.disabled = false; }catch(e){}
          try{
            var m = String((err&&err.message)||"");
            if(/auth|login/i.test(m)) foot.textContent = tx.needLogin;
            else if(/sem-banco|no bank|404|relation/i.test(m)) foot.textContent = tx.noBank;
            else foot.textContent = tx.voteErr;
          }catch(e){}
        });
      };
    });
    container.appendChild(card);
    load();
  }catch(e){}
}
/* atualiza os cartões visíveis sem rebuild (poller 60s reaproveita a linha,
   então o placar ficaria parado sem isto). hooks com tally. */
async function refreshVisible(hooks){
  try{
    if(!hooks||typeof hooks.tally!=="function") return 0;
    var nodes = [];
    try{ nodes = Array.prototype.slice.call(document.querySelectorAll(".zun-poll[data-pollid]")); }catch(e){ return 0; }
    if(!nodes.length) return 0;
    var seen = {}, n = 0;
    for(var i=0;i<nodes.length;i++){
      var id = null;
      try{ id = nodes[i].getAttribute("data-pollid"); }catch(e){}
      if(!okPollId(id)||seen[id]) continue;
      seen[id] = 1;
      var c0 = tallyCached(id);
      var t = null;
      try{ t = c0||await hooks.tally(id); }catch(e){ t = c0; }
      if(t) tallyStore(id, t);
      /* repinta todos os cartões com esse id (mesma enquete, várias linhas) */
      var cards = [];
      try{ cards = document.querySelectorAll('.zun-poll[data-pollid="'+id+'"]'); }catch(e){}
      for(var k=0;k<cards.length;k++){
        try{
          var counts = (t&&Array.isArray(t.counts))?t.counts.map(num):[];
          var total = counts.reduce(function(a,b){ return a+b; }, 0);
          var mine = parseInt(t&&t.mine,10); if(!(mine>=1&&mine<=5)) mine = 0;
          var nums = cards[k].querySelectorAll(".zun-poll-num");
          var fills = cards[k].querySelectorAll(".zun-poll-fill");
          var btns = cards[k].querySelectorAll(".zun-poll-btn");
          var L2 = lang(), tx2 = T[L2]||T.pt;
          for(var r2=0;r2<btns.length;r2++){
            var c = num(counts[r2]), pct = total>0?Math.round(100*c/total):0;
            try{ if(fills[r2]) fills[r2].style.width = pct+"%"; }catch(e){}
            try{ if(nums[r2]) nums[r2].textContent = String(c)+" ("+pct+"%)"; }catch(e){}
            try{ if(mine===(r2+1)) btns[r2].classList.add("on"); else btns[r2].classList.remove("on"); }catch(e){}
          }
          var f2 = cards[k].querySelector(".zun-poll-foot");
          if(f2) f2.textContent = total===0?("0 "+tx2.votes):(String(total)+" "+tx2.votes+(mine?(" · "+tx2.voted+" "+mine):""));
        }catch(e){}
      }
      n++;
    }
    return n;
  }catch(e){ return 0; }
}
try{ window.ZunFun = { expandPub:expandPub, parsePoll:parsePoll, paintPoll:paintPoll, pollIdOf:pollIdOf, okPollId:okPollId, refreshVisible:refreshVisible, aiCommand:aiCommand, aiPrompt:aiPrompt, aiWrap:aiWrap, isHelp:isHelp, showHelpEphemeral:showHelpEphemeral }; }catch(e){}
})();
