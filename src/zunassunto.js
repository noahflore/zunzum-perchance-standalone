/* Assunto do dia — 1 pergunta/dia como POST FIXO no feed (sem pontos).
   Sorteio determinístico por data (FNV do dia → 1 dos 50, igual p/ todo
   mundo, imprevisível). O 1º cliente do dia semeia via feedPush com _cid
   'za-AAAA-MM-DD': a PK do feed_posts dedupa a corrida (2º recebe dup:1).
   Rastreador assunto_dia (SQL próprio) diz ao janitor (zz_assunto_tick) o
   que apagar do dia anterior (CASCADE leva respostas + likes).
   Fixação + destaque no paintFeed via marcador no texto (sem leitura
   extra); botões de resposta/curtir do próprio post valem (post real).
   Sem o SQL rodado, nasce e fixa igual — só não limpa o dia anterior. */
(function(){
var ASSUNTOS_PT = [
  "Qual foi o teu primeiro nick na internet? E por quê?",
  "Que música não saía do teu repeat em 2008?",
  "MSN, Orkut ou bate-papo UOL — qual era o teu? Por quê?",
  "Qual comunidade do Orkut tu entraria de novo hoje?",
  "Internet discada: qual tua lembrança mais engraçada?",
  "Que tecnologia que sumiu tu sente mais falta?",
  "Qual foi teu primeiro celular? O que ele tinha de bom?",
  "Que fórum ou site tu frequentava todo dia antigamente?",
  "Qual depoimento tu nunca esqueceu — de receber ou de escrever?",
  "Se tu pudesse trazer UMA coisa de 2008 pra hoje, o que era?",
  "Qual teu emoji mais usado? E o que ele diz sobre tu?",
  "Que som te lembra a infância na hora?",
  "Qual foi o primeiro vídeo que tu viu na internet?",
  "Tu era do time invisível no MSN ou sempre online?",
  "Qual jogo marcou a tua época? (qualquer época vale)",
  "Que comida tem gosto de nostalgia pra tu?",
  "Qual era teu programa favorito de sábado à tarde?",
  "Tu guardava scrap de alguém especial? Conta (sem nomes!)",
  "Qual foi tua primeira foto publicada na internet?",
  "Que filme tu já viu tantas vezes que sabe as falas?",
  "Qual cheiro te leva direto pro passado?",
  "Tu fazia parte de alguma panelinha online? Como era?",
  "Qual foi o melhor presente que tu já ganhou?",
  "Que música tu cantava errado achando que tava certo?",
  "Qual era teu horário nobre na internet? Madrugada conta!",
  "Se teu nick atual fosse banda, que estilo ela tocava?",
  "Qual foi a última coisa que te fez rir alto?",
  "Tu prefere festão, rolê pequeno ou ficar em casa? Por quê?",
  "Que conselho tu daria pro tu de 15 anos?",
  "O que tu tá com vontade de fazer esse fim de semana?",
  "Qual foi teu desenho animado favorito?",
  "Tu colecionava alguma coisa? O quê?",
  "Qual era a tua matéria favorita na escola? E a pior?",
  "Tu já escreveu carta à mão pra alguém? Pra quem?",
  "Qual foi o primeiro show (ou festa) que tu foi?",
  "Que cheiro tem a casa da tua avó (ou de alguém especial)?",
  "Tu lembra do teu número ICQ ou do UOL? Kkk",
  "Qual era teu toque de celular favorito?",
  "Tu tinha diário (ou blog)? Escrevia o quê?",
  "Qual foi a maior vergonha que tu já passou online?",
  "Que série tu maratonaria de novo do zero?",
  "Qual foi teu primeiro emprego (ou bico)? Como foi?",
  "Tu acredita em horóscopo? Qual teu signo?",
  "Qual foi a viagem mais legal que tu já fez?",
  "Tu fala sozinho? Todo mundo fala, confessa.",
  "Qual app tu mais usa hoje? E qual tu mais usava antes?",
  "Se tu ganhasse na loteria amanhã, qual a primeira coisa?",
  "Qual foi o último filme que tu viu no cinema?",
  "Tu prefere praia, serra ou cidade?",
  "Completa: saudade mesmo eu tenho de ___."
];
var ASSUNTOS_EN = [
  "What was your first username on the internet? And why?",
  "What song was stuck on repeat for you in 2008?",
  "MSN, Orkut or web chat — which was yours? Why?",
  "Which Orkut community would you join again today?",
  "Dial-up internet: what's your funniest memory?",
  "What gone tech do you miss the most?",
  "What was your first phone? What was great about it?",
  "What forum or site did you visit every day back then?",
  "What testimonial did you never forget — received or written?",
  "If you could bring ONE thing from 2008 to today, what would it be?",
  "What's your most used emoji? And what does it say about you?",
  "What sound takes you straight back to childhood?",
  "What was the first video you ever watched online?",
  "Were you team invisible on MSN or always online?",
  "What game defined your era? (any era counts)",
  "What food tastes like nostalgia to you?",
  "What was your favorite Saturday afternoon show?",
  "Did you keep a scrap from someone special? Tell us (no names!)",
  "What was the first photo you ever posted online?",
  "What movie have you watched so many times you know the lines?",
  "What smell takes you straight to the past?",
  "Were you part of an online clique? What was it like?",
  "What's the best gift you ever got?",
  "What song did you sing wrong thinking you were right?",
  "What was your prime time online? Late night counts!",
  "If your current nick were a band, what style would it play?",
  "What's the last thing that made you laugh out loud?",
  "Big party, small hangout or staying home? Why?",
  "What advice would you give your 15-year-old self?",
  "What do you feel like doing this weekend?",
  "What was your favorite cartoon?",
  "Did you collect anything? What?",
  "What was your favorite school subject? And the worst?",
  "Did you ever handwrite a letter to someone? To whom?",
  "What was the first concert (or party) you went to?",
  "What does your grandma's house (or someone special's) smell like?",
  "Do you remember your ICQ or UOL number? Lol",
  "What was your favorite ringtone?",
  "Did you keep a diary (or blog)? What did you write?",
  "What's the most embarrassing thing that happened to you online?",
  "What series would you binge again from scratch?",
  "What was your first job (or gig)? How was it?",
  "Do you believe in horoscopes? What's your sign?",
  "What's the coolest trip you ever took?",
  "Do you talk to yourself? Everyone does, confess.",
  "What app do you use most today? And which did you use most before?",
  "If you won the lottery tomorrow, what's the first thing?",
  "What's the last movie you watched in theaters?",
  "Beach, mountains or city?",
  "Complete: what I really miss is ___."
];
var ASSUNTOS_ES = [
  "¿Cuál fue tu primer nick en internet? ¿Y por qué?",
  "¿Qué canción sonaba en tu repeat en 2008?",
  "MSN, Orkut o chat — ¿cuál era el tuyo? ¿Por qué?",
  "¿A qué comunidad de Orkut volverías hoy?",
  "Internet por discado: ¿tu recuerdo más divertido?",
  "¿Qué tecnología que desapareció extrañas más?",
  "¿Cuál fue tu primer celular? ¿Qué tenía de bueno?",
  "¿Qué foro o sitio visitabas todos los días antes?",
  "¿Qué testimonio nunca olvidaste — recibido o escrito?",
  "Si pudieras traer UNA cosa de 2008 a hoy, ¿qué sería?",
  "¿Cuál es tu emoji más usado? ¿Y qué dice de ti?",
  "¿Qué sonido te lleva directo a la infancia?",
  "¿Cuál fue el primer video que viste en internet?",
  "¿Eras del equipo invisible en MSN o siempre en línea?",
  "¿Qué juego marcó tu época? (vale cualquiera)",
  "¿Qué comida te sabe a nostalgia?",
  "¿Cuál era tu programa favorito del sábado a la tarde?",
  "¿Guardabas un scrap de alguien especial? Cuenta (¡sin nombres!)",
  "¿Cuál fue tu primera foto publicada en internet?",
  "¿Qué película viste tantas veces que te sabes los diálogos?",
  "¿Qué olor te lleva directo al pasado?",
  "¿Eras parte de algún grupito online? ¿Cómo era?",
  "¿Cuál es el mejor regalo que recibiste?",
  "¿Qué canción cantabas mal creyendo que estaba bien?",
  "¿Cuál era tu horario estelar en internet? ¡La madrugada vale!",
  "Si tu nick actual fuera banda, ¿qué estilo tocaría?",
  "¿Qué fue lo último que te hizo reír fuerte?",
  "¿Fiestón, plan tranqui o quedarte en casa? ¿Por qué?",
  "¿Qué consejo le darías a tu yo de 15 años?",
  "¿Qué te apetece hacer este fin de semana?",
  "¿Cuál era tu dibujo animado favorito?",
  "¿Coleccionabas algo? ¿Qué?",
  "¿Cuál era tu materia favorita en la escuela? ¿Y la peor?",
  "¿Escribiste alguna vez una carta a mano? ¿A quién?",
  "¿Cuál fue el primer show (o fiesta) al que fuiste?",
  "¿A qué huele la casa de tu abuela (o de alguien especial)?",
  "¿Recuerdas tu número de ICQ o de UOL? Jaja",
  "¿Cuál era tu tono de llamada favorito?",
  "¿Tenías diario (o blog)? ¿Qué escribías?",
  "¿Cuál fue tu mayor vergüenza online?",
  "¿Qué serie maratonearías de nuevo desde cero?",
  "¿Cuál fue tu primer trabajo (o changa)? ¿Cómo fue?",
  "¿Crees en el horóscopo? ¿Cuál es tu signo?",
  "¿Cuál fue el viaje más lindo que hiciste?",
  "¿Hablas solo? Todos lo hacen, confiesa.",
  "¿Qué app usas más hoy? ¿Y cuál usabas más antes?",
  "Si ganaras la lotería mañana, ¿qué es lo primero?",
  "¿Cuál fue la última peli que viste en el cine?",
  "¿Playa, sierra o ciudad?",
  "Completa: lo que más extraño es ___."
];
function lang(){ try{ var l = String(window.zunzumLang||"pt").slice(0,2); if(l==="en"||l==="es") return l; }catch(e){} return "pt"; }
function utcDay(){ try{ var d = new Date(); return {y:d.getUTCFullYear(), m:d.getUTCMonth()+1, dd:d.getUTCDate(), key:d.getUTCFullYear()+"-"+String(d.getUTCMonth()+1).padStart(2,"0")+"-"+String(d.getUTCDate()).padStart(2,"0")}; }catch(e){ return {y:2026,m:11,dd:4,key:"2026-11-04"}; } }
/* sorteio por data (FNV-1a do dia → índice): igual p/ todo mundo, imprevisível. */
function pickIdx(n){ try{ var s = "za"+utcDay().key, x = 2166136261; for(var i=0;i<s.length;i++){ x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x>>>0)%n; }catch(e){ return 0; } }
function pergunta(){ var L = ASSUNTOS_PT; try{ var l = lang(); if(l==="en") L = ASSUNTOS_EN; else if(l==="es") L = ASSUNTOS_ES; }catch(e){} return L[pickIdx(L.length)%L.length]; }
function marker(){ try{ var d = utcDay(); return "💬 assunto do dia · "+String(d.dd).padStart(2,"0")+"/"+String(d.m).padStart(2,"0"); }catch(e){ return "💬 assunto do dia"; } }
function cid(){ return "za-"+utcDay().key; }
/* paintFeed chama no início: move o tópico de hoje p/ o FIM do array
   (o feed vem em ordem crescente e o paint usa reverse(): fim = topo). */
function zunAssuntoPin(posts){
  try{
    if(!Array.isArray(posts)||!posts.length) return posts;
    var mk = marker(), ti = -1;
    for(var i=0;i<posts.length;i++){ if(String((posts[i]&&posts[i].t)||"").indexOf(mk)===0){ ti = i; break; } }
    if(ti<0) return posts;
    posts[ti]._topic = 1;
    if(ti!==posts.length-1){ posts.push(posts.splice(ti,1)[0]); }
    return posts;
  }catch(e){ return posts; }
}
var _trying = false;
/* fim do paintFeed: se o tópico de hoje não está no feed, semeia 1x/dia. */
function zunAssuntoEnsure(posts){
  try{
    if(_trying) return;
    var mk = marker(), has = false;
    try{ (posts||[]).forEach(function(p){ if(String((p&&p.t)||"").indexOf(mk)===0) has = true; }); }catch(e){}
    if(has) return;
    var dk = utcDay().key, flag = "";
    try{ flag = localStorage.getItem("zunAssuntoSeed")||""; }catch(e){}
    if(flag===dk) return;
    _trying = true;
    try{ localStorage.setItem("zunAssuntoSeed", dk); }catch(e){}
    setTimeout(function(){ try{ zunAssuntoSeed(); }catch(e){ _trying = false; } }, 2000+Math.floor(Math.random()*5000));
  }catch(e){}
}
async function sbClient(){
  try{ if(window.__sb&&window.__sb.client) return await window.__sb.client(); }catch(e){}
  return null;
}
function myPayload(text, extra){
  try{
    var base = (typeof me!=="undefined"&&me) ? {nick:me.nick, hash:me.hash} : {anon:(typeof anonId!=="undefined"?anonId:""), anonTok:(typeof anonTokGet==="function"?anonTokGet(typeof anonId!=="undefined"?anonId:""):"")};
    base.text = text;
    if(extra) for(var k in extra) base[k] = extra[k];
    return base;
  }catch(e){ return {text:text}; }
}
async function zunAssuntoSeed(){
  try{
    var q = pergunta(), mk = marker(), id = cid();
    var text = mk+"\n"+q;
    /* 1) janitor do dia anterior (best-effort, precisa do SQL rodado) */
    try{ var c0 = await sbClient(); if(c0) await c0.rpc("zz_assunto_tick"); }catch(e){}
    /* 2) publica o de hoje (_cid determinístico: corrida vira dup:1) */
    var r = null;
    try{
      r = JSON.parse(await rpc("feedPush", JSON.stringify(myPayload(text, {_cid:id}))));
      if(r&&r.err==="anon-taken"&&(typeof me==="undefined"||!me)){
        try{ if(typeof renewAnonForce==="function") renewAnonForce(); }catch(e){}
        r = JSON.parse(await rpc("feedPush", JSON.stringify(myPayload(text, {_cid:id}))));
      }
    }catch(e){ r = null; }
    if(!r||(!r.ok&&!r.dup)) { _trying = false; return; }
    /* 3) rastreador p/ o janitor (precisa do SQL; sem ele, segue sem limpar) */
    try{
      var c = await sbClient();
      if(c) await c.from("assunto_dia").insert({dia:utcDay().key, post_id:id, pergunta:q});
    }catch(e){}
    try{ if(typeof cInv==="function") cInv("feedGet"); if(typeof loadFeed==="function") loadFeed(true); }catch(e){}
  }catch(e){}
  _trying = false;
}
function zunIsTopicPost(p){
  /* post fixo do dia = id za-* E marcador no texto (AND p/ nunca travar
     post normal de usuário que cite o marcador). */
  try{
    if(p==null) return false;
    if(typeof p==="string") return p.indexOf("💬 assunto do dia")===0;
    var _id = String(p.id||"");
    var _t = String((p.t!=null?p.t:(p.body!=null?p.body:p.text))||"");
    return _id.indexOf("za-")===0 && _t.indexOf("💬 assunto do dia")===0;
  }catch(e){ return false; }
}
/* texto do post fixo no idioma de QUEM VÊ (2026-11-07): o post é semeado
   1x/dia pelo 1º cliente no idioma DELE — sem isso, todo mundo lia a
   pergunta em PT mesmo com a interface em EN/ES. O índice sorteado é
   determinístico por data, então basta reemitir pergunta() local. */
function zunAssuntoText(p){
  try{
    if(!zunIsTopicPost(p)) return null;
    var mk = marker();
    var loc = "";
    try{ loc = (typeof ztr==="function") ? ztr("💬 assunto do dia") : "💬 assunto do dia"; }catch(e){ loc = "💬 assunto do dia"; }
    if(!loc) loc = "💬 assunto do dia";
    var dm = mk.match(/ · \d{2}\/\d{2}$/);
    return loc + (dm ? dm[0] : "") + "\n" + pergunta();
  }catch(e){ return null; }
}
try{
  window.zunIsTopicPost = zunIsTopicPost;
  window.zunAssuntoHoje = pergunta;
  window.zunAssuntoText = zunAssuntoText;
  window.zunAssuntoPin = zunAssuntoPin;
  window.zunAssuntoEnsure = zunAssuntoEnsure;
  window.zunAssuntoSeed = zunAssuntoSeed;
  var st = document.createElement("style");
  st.id = "zunAssuntoCss";
  st.textContent = ".post[data-topic-post]{border:2px solid #ffb300;box-shadow:0 2px 8px rgba(255,179,0,.35)}body.zun-night .post[data-topic-post]{background:#3a2c07;border-color:#ffb300;color:#ffe9b0}.post[data-topic-post] .pbody{font-size:15px}";
  if(!document.getElementById("zunAssuntoCss")) document.head.appendChild(st);
}catch(e){}
})();
