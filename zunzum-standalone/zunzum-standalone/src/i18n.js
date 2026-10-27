(function(){
var qlang = "";
try{ qlang = String(new URLSearchParams(location.search).get("lang")||"").toLowerCase().slice(0,2); }catch(e){}
var nav = "";
try{ nav = String((navigator&&(navigator.language||navigator.userLanguage))||"").toLowerCase(); }catch(e){}
var LANG = qlang === "en" || qlang === "es" || qlang === "pt" ? qlang : (/^es\b/.test(nav) ? "es" : (/^en\b/i.test(nav) ? "en" : "pt"));
var EN = LANG === "en";
var ES = LANG === "es";
window.zunzumEN = EN;
window.zunzumES = ES;
window.zunzumLang = LANG;
var DEN = {
"— rede anonima de conversa":"— anonymous chat network",
"feed livre sem conta | chat publico e privado com conta simples":"free feed with no account | public and private chat with a simple account",
"buscar":"search",
"📢 divulgar":"📢 promote",
"usuario":"user",
"sobre":"about",
"Publique no feed sem conta.":"Post to the feed with no account.",
"Crie um nick com senha para conversar no chat publico e em salas privadas.":"Create a nick with password to chat in the public room and private rooms.",
"espelho nostr 🤖":"nostr mirror 🤖",
"Replica posts do feed pra rede Nostr com link de volta. Roda neste navegador enquanto ligado.":"Reposts feed posts to the Nostr network with a link back. Runs in this browser while on.",
"desligado":"off",
"ligado ✅ espelhando desta aba":"on ✅ mirroring from this tab",
"auto 🐝 fundo ligado":"auto 🐝 background on",
"ligar":"turn on",
"desligar":"turn off",
"nova chave":"new key",
"👁":"👁",
"copiar":"copy",
"sugestões e bugs":"suggestions & bugs","atalhos":"shortcuts",
"ideia de melhoria":"improvement idea",
"enviar":"send",
"postar sem conta":"post with no account",
"link inválido":"invalid link",
"perfil não encontrado":"profile not found",
"chat não encontrado":"chat not found",
"ir p/ #geral":"go to #geral",
"visitas":"visits",
"visita":"visit",
"você posta como":"you post as",
"🔄 trocar p/ cortar rasto":"🔄 renew to cut the trail",
"poste anonimamente...":"post anonymously...",
"postar":"post",
"feed compartilhado":"shared feed",
"🔞 ver erótico":"🔞 show erotic",
"🔞 erótico:":"🔞 erotic:",
"embaçar":"blur",
"ocultar":"hide",
"ver":"show",
"chat publico":"public chat",
"@ marcar...":"@ mention...",
"cor":"color",
"mensagem...":"message...",
"chat privado":"private chat",
"combinem um codigo e digitem igual:":"agree on a code and type the same:",
"codigo ex: eu-voce-123":"code e.g. me-you-123",
"entrar":"join",
"convidar":"invite",
"convidar @nick...":"invite @nick...",
"copiar link":"copy link",
"mensagem privada...":"private message...",
"sobre o zunzum":"about zunzum",
"chave privada hex (64 letras)":"hex private key (64 chars)",
"conte sua ideia ou bug...":"tell us your idea or bug...",
"ou link https://...":"or link https://...",
"ou link ou base64":"or link or base64",
"nome, nick ou o que procura?":"name, nick, or what are you looking for?",
"ou link https://... ou cole base64":"or link https://... or paste base64",
"responda aqui...":"answer here...",
"clique em gerar com IA...":"click generate with AI...",
"ir":"go",
"responder":"reply",
"mencionar":"mention",
"convidar p/ privado":"invite to private",
"🔕 silenciar":"🔕 mute",
"🔔 ativar":"🔔 unmute",
"bloquear":"block",
"desbloquear":"unblock",
"🔔 avisos":"🔔 alerts",
"🔕 silenciado":"🔕 muted",
"compartilhar":"share",
"fechar":"close",
"📢 divulgar o zunzum":"📢 promote zunzum",
"A IA cria o texto, você posta nos fóruns.":"The AI writes the text, you post it on forums.",
"post de fórum":"forum post",
"curto p/ comentário":"short one for comments",
"tópico completo":"full topic",
"convite whatsapp/telegram":"whatsapp/telegram invite",
"✨ gerar com IA":"✨ generate with AI",
"copiar texto":"copy text",
"agora não":"not now",
"link copiado!":"link copied!",
"anonimo sem conta":"anonymous, no account",
"carregando...":"loading...",
"perfil nao encontrado":"profile not found",
"membro desde ":"member since ",
"sem conexao":"offline",
"aceitar":"accept",
"recusar":"decline",
"apagar":"delete",
"depoimentos":"testimonials",
"escreva algo ou coloque foto":"write something or add a photo",
"link precisa começar com https://":"link must start with https://",
"enviando...":"sending...",
"erro: ":"error: ",
"entre com nick+senha para deixar depoimento.":"log in with nick+password to leave a testimonial.",
"sair":"log out",
"foto de perfil:":"profile photo:",
"só imagem":"images only",
"otimizando...":"optimizing...",
"erro upload":"upload error",
"foto atualizada!":"photo updated!",
"ou link externo da foto:":"or external photo link:",
"usar link":"use link",
"cole o link":"paste the link",
"enviando foto...":"uploading photo...",
"base64 inválido":"invalid base64",
"comprimindo imagem...":"compressing image...",
"salvando...":"saving...",
"remover foto":"remove photo",
"criar / entrar":"create / join",
"nick 2+ e senha 3+":"nick 2+ chars and password 3+",
"sem servidor ainda":"no server yet",
"arquivo":"file",
"sem servidor":"no server",
"entre num código primeiro.":"join a code first.",
"entre com nick+senha para convidar.":"log in with nick+password to invite.",
"erro ao apagar":"delete error",
"recebido, valeu!":"received, thanks!",
"área do dono ":"owner area ",
"senha errada":"wrong password",
"digite algo ou anexe foto":"type something or attach a photo",
"buscando...":"searching...",
"pensando...":"thinking...",
"buscando links...":"fetching links...",
"nada na web":"nothing on the web",
"resultados da web:":"web results:",
"fotos e vídeos em sites adultos:":"photos and videos on adult sites:",
"sem censura — buscadores que não barram: abra no seu navegador já com a pesquisa pronta:":"uncensored — search engines that don't block: open in your browser with the search ready:",
"você posta nos fóruns.":"you post on forums.",
"entre com nick+senha primeiro.":"log in with nick+password first.",
"entre num código primeiro, depois convide.":"join a code first, then invite.",
"digite o @nick da pessoa.":"type the person's @nick.",
"você já está na sala.":"you're already in the room.",
"nick @":"nick @",
" não existe. confira e tente de novo.":" doesn't exist. check and try again.",
"modo local (sem conexão) — dados só neste navegador":"local mode (offline) — data stays in this browser",
"online":"online",
"reconectando...":"reconnecting...",
"convite enviado p/ @":"invite sent to @",
"se ela estiver online, entra na hora. ou mande o link: ":"if they're online, they'll join right away. or send the link: ",
"não deu p/ avisar online (":"couldn't notify online (",
"). mande o link: ":"). send the link: ",
"sem conexão. mande o link: ":"offline. send the link: ",
"entre num código do privado primeiro, depois convide @":"join a private code first, then invite @",
"link copiado! ":"link copied! ",
"novo depoimento de @":"new testimonial from @",
" — clique para aprovar":" — click to approve",
"enviado! aparece após aprovação.":"sent! shows after approval.",
"corrigir":"fix",
"atualizar":"refresh",
"essa resposta ajudou? ":"did this answer help? ",
"resposta salva · essa resposta ajudou? ":"saved answer · did it help? ",
"valeu! salva como certa.":"thanks! saved as correct.",
"marcada como errada. Corrija abaixo ou busque de novo.":"marked as wrong. Fix below or search again.",
"correção salva! buscando atualizado...":"fix saved! searching fresh...",
"erro ao salvar":"save error",
"resposta certa...":"correct answer...",
"salvar":"save",
"nome certo / resposta certa...":"right name / right answer...",
"correção salva! buscando atualizado...":"fix saved! searching fresh...",
"não é nenhuma dessas? ":"none of these? ",
"Quem é ela?":"Who is she?",
"Achei gente parecida em nichos diferentes. Quem é ela?":"Found similar people in different niches. Which one is she?",
"Sem censura — buscadores que não barram: abra no seu navegador já com a pesquisa pronta:":"Uncensored — search engines that don't block: open in your browser with the search ready:",
"fotos:":"photos:",
"bing fotos":"bing photos",
"sem resultados adultos exatos para ":"no exact adult results for ",
"sites adultos (sem perfil exato — confira se é a mesma pessoa):":"adult sites (no exact profile — check it's the same person):",
"fóruns e discussões:":"forums and discussions:",
"fora dos buscadores (Wayback Machine):":"outside search engines (Wayback Machine):",
"sem censura (Sogou, China) — títulos traduzidos:":"uncensored (Sogou, China) — translated titles:",
"sem censura (Sogou, China) — fotos:":"uncensored (Sogou, China) — photos:",
"buscando fotos adultas...":"searching adult photos...",
"buscando em sites adultos...":"searching adult sites...",
"procurando em fóruns...":"searching forums...",
"buscando na China...":"searching in China...",
"vasculhando arquivo...":"digging the archive...",
"pensando no que perguntar...":"thinking about what to ask...",
"otimizando...":"optimizing...",
"só imagem (jpg/png/...)":"images only (jpg/png/...)",
"foto pronta ✓":"photo ready ✓",
"baixando foto...":"downloading photo...",
"link não é imagem":"link is not an image",
"analisando foto...":"analyzing photo...",
"procurando foto igual na web...":"looking for the same photo on the web...",
"vendo os nichos...":"checking niches...",
"usuários":"users",
"· recorde ":"· record ",
"RECORDE! ":"RECORD! ",
" pessoas online ao mesmo tempo!":" people online at the same time!",
"DEMOROU MAS CHEGAMOS! ":"WE MADE IT! ",
" usuários cadastrados!":" registered users!",
"te convidou p/ o privado ":"invited you to private ",
"enviando convite p/ @":"sending invite to @",
"IA interage: curte, responde e segue de volta":"AI interacts: likes, replies and follows back",
"IA interagindo: curte, responde e segue de volta 👍":"AI interacting: liking, replying and following back 👍",
"IA pausada — só espelhando":"AI paused — mirroring only",
"convite whatsapp/telegram":"whatsapp/telegram invite",
"trocar de chat":"switch chat",
"novo chat público":"new public chat",
"copiar link da sala":"copy room link",
"moderação":"moderation",
"procurar chats...":"search chats...",
"voltar":"back",
"nome (2-40)":"name (2-40)",
"descrição curta (opcional)":"short description (optional)",
"ou foto https://...":"or photo https://...",
"criar":"create",
"cancelar":"cancel",
"Enter envia":"Enter sends",
"Enter envia · Shift+Enter quebra linha":"Enter sends · Shift+Enter for new line",
"Enter quebra linha":"Enter for new line",
"escolha um emoji":"pick an emoji",
"anexar foto/vídeo/link":"attach photo/video/link",
"animados · combinou, vira combo":"animated · match it for a combo",
"emojis":"emojis",
"nenhuma mensagem ainda — diga oi! 👋":"no messages yet — say hi! 👋"
}
var DES = {"— rede anonima de conversa":"— red anónima de conversación","feed livre sem conta | chat publico e privado com conta simples":"feed libre sin cuenta | chat público y privado con cuenta simple","buscar":"buscar","📢 divulgar":"📢 promocionar","usuario":"usuario","sobre":"acerca de","Publique no feed sem conta.":"Publica en el feed sin cuenta.","Crie um nick com senha para conversar no chat publico e em salas privadas.":"Crea un nick con contraseña para conversar en el chat público y en salas privadas.","espelho nostr 🤖":"espejo nostr 🤖","Replica posts do feed pra rede Nostr com link de volta. Roda neste navegador enquanto ligado.":"Replica las publicaciones del feed en la red Nostr con enlace de vuelta. Funciona en este navegador mientras esté activado.","desligado":"apagado","ligado ✅ espelhando desta aba":"activado ✅ replicando desde esta pestaña",
"auto 🐝 fundo ligado":"auto 🐝 fondo activado","ligar":"activar","desligar":"apagar","nova chave":"nueva clave","copiar":"copiar","sugestões e bugs":"sugerencias y errores","atalhos":"accesos directos","ideia de melhoria":"idea de mejora","bug":"error","enviar":"enviar","postar sem conta":"publicar sin cuenta",
"link inválido":"enlace inválido",
"perfil não encontrado":"perfil no encontrado",
"chat não encontrado":"chat no encontrado",
"ir p/ #geral":"ir a #geral",
"visitas":"visitas",
"visita":"visita",
"você posta como":"publicas como",
"🔄 trocar p/ cortar rasto":"🔄 cambiar para cortar el rastro","poste anonimamente...":"publica anónimamente...","postar":"publicar","feed compartilhado":"feed compartido","🔞 ver erótico":"🔞 ver erótico","🔞 erótico:":"🔞 erótico:","embaçar":"difuminar","ocultar":"ocultar","ver":"ver","chat publico":"chat público","@ marcar...":"@ mencionar...","cor":"color","mensagem...":"mensaje...","chat privado":"chat privado","combinem um codigo e digitem igual:":"acuerden un código y escríbanlo igual:","codigo ex: eu-voce-123":"código p. ej.: yo-tu-123","entrar":"entrar","convidar":"invitar","convidar @nick...":"invitar a @nick...","copiar link":"copiar enlace","mensagem privada...":"mensaje privado...","sobre o zunzum":"acerca de zunzum","chave privada hex (64 letras)":"clave privada hex (64 caracteres)","conte sua ideia ou bug...":"cuenta tu idea o error...","ou link https://...":"o enlace https://...","ou link ou base64":"o enlace o base64","comprimindo imagem...":"comprimiendo imagen...","nome, nick ou o que procura?":"¿nombre, nick o qué buscas?","ou link https://... ou cole base64":"o enlace https://... o pega base64","responda aqui...":"responde aquí...","clique em gerar com IA...":"haz clic en generar con IA...","ir":"ir","responder":"responder","mencionar":"mencionar","convidar p/ privado":"invitar al privado","🔕 silenciar":"🔕 silenciar","🔔 ativar":"🔔 activar","bloquear":"bloquear","desbloquear":"desbloquear","compartilhar":"compartir","fechar":"cerrar","📢 divulgar o zunzum":"📢 promocionar zunzum","A IA cria o texto, você posta nos fóruns.":"La IA crea el texto, tú lo publicas en los foros.","post de fórum":"publicación de foro","curto p/ comentário":"corto para comentario","tópico completo":"tema completo","convite whatsapp/telegram":"invitación whatsapp/telegram","✨ gerar com IA":"✨ generar con IA","copiar texto":"copiar texto","agora não":"ahora no","link copiado!":"¡enlace copiado!","anonimo sem conta":"anónimo sin cuenta","carregando...":"cargando...","perfil nao encontrado":"perfil no encontrado","membro desde ":"miembro desde ","sem conexao":"sin conexión","aceitar":"aceptar","recusar":"rechazar","apagar":"borrar","depoimentos":"testimonios","escreva algo ou coloque foto":"escribe algo o pon una foto","link precisa começar com https://":"el enlace debe empezar con https://","enviando...":"enviando...","erro: ":"error: ","entre com nick+senha para deixar depoimento.":"entra con nick+contraseña para dejar un testimonio.","sair":"salir","foto de perfil:":"foto de perfil:","só imagem":"solo imagen","otimizando...":"optimizando...","erro upload":"error al subir","foto atualizada!":"¡foto actualizada!","ou link externo da foto:":"o enlace externo de la foto:","usar link":"usar enlace","cole o link":"pega el enlace","enviando foto...":"enviando foto...","base64 inválido":"base64 inválido","salvando...":"guardando...","remover foto":"quitar foto","criar / entrar":"crear / entrar","nick 2+ e senha 3+":"nick 2+ y contraseña 3+","sem servidor ainda":"sin servidor aún","arquivo":"archivo","sem servidor":"sin servidor","entre num código primeiro.":"entra en un código primero.","entre com nick+senha para convidar.":"entra con nick+contraseña para invitar.","erro ao apagar":"error al borrar","recebido, valeu!":"¡recibido, gracias!","área do dono ":"área del dueño ","senha errada":"contraseña incorrecta","digite algo ou anexe foto":"escribe algo o adjunta una foto","buscando...":"buscando...","pensando...":"pensando...","buscando links...":"buscando enlaces...","nada na web":"nada en la web","resultados da web:":"resultados de la web:","fotos e vídeos em sites adultos:":"fotos y vídeos en sitios adultos:","sem censura — buscadores que não barram: abra no seu navegador já com a pesquisa pronta:":"sin censura — buscadores que no bloquean: abre en tu navegador con la búsqueda lista:","você posta nos fóruns.":"tú lo publicas en los foros.","entre com nick+senha primeiro.":"entra con nick+contraseña primero.","entre num código primeiro, depois convide.":"entra en un código primero, luego invita.","digite o @nick da pessoa.":"escribe el @nick de la persona.","você já está na sala.":"ya estás en la sala.","nick @":"nick @"," não existe. confira e tente de novo.":" no existe. revisa e inténtalo de nuevo.","modo local (preview) — salve o generator p/ servidor global":"modo local (vista previa) — guarda el generador para el servidor global","online":"en línea","reconectando...":"reconectando...","convite enviado p/ @":"invitación enviada a @","se ela estiver online, entra na hora. ou mande o link: ":"si está en línea, entrará al momento. o manda el enlace: ","não deu p/ avisar online (":"no se pudo avisar en línea (","). mande o link: ":"). manda el enlace: ","sem conexão. mande o link: ":"sin conexión. manda el enlace: ","entre num código do privado primeiro, depois convide @":"entra en un código del privado primero, luego invita a @","link copiado! ":"¡enlace copiado! ","novo depoimento de @":"nuevo testimonio de @"," — clique para aprovar":" — clic para aprobar","enviado! aparece após aprovação.":"¡enviado! aparece tras la aprobación.","corrigir":"corregir","atualizar":"actualizar","essa resposta ajudou? ":"¿te ayudó esta respuesta? ","resposta salva · essa resposta ajudou? ":"respuesta guardada · ¿te ayudó? ","valeu! salva como certa.":"¡gracias! guardada como correcta.","marcada como errada. Corrija abaixo ou busque de novo.":"marcada como incorrecta. Corrige abajo o busca de nuevo.","correção salva! buscando atualizado...":"¡corrección guardada! buscando actualizado...","erro ao salvar":"error al guardar","resposta certa...":"respuesta correcta...","salvar":"guardar","nome certo / resposta certa...":"nombre correcto / respuesta correcta...","não é nenhuma dessas? ":"¿no es ninguna de estas? ","Quem é ela?":"¿Quién es ella?","Achei gente parecida em nichos diferentes. Quem é ela?":"Encontré gente parecida en nichos distintos. ¿Quién es ella?","Sem censura — buscadores que não barram: abra no seu navegador já com a pesquisa pronta:":"Sin censura — buscadores que no bloquean: abre en tu navegador con la búsqueda lista:","fotos:":"fotos:","bing fotos":"fotos bing","sem resultados adultos exatos para ":"sin resultados adultos exactos para ","sites adultos (sem perfil exato — confira se é a mesma pessoa):":"sitios adultos (sin perfil exacto — comprueba si es la misma persona):","fóruns e discussões:":"foros y debates:","fora dos buscadores (Wayback Machine):":"fuera de los buscadores (Wayback Machine):","sem censura (Sogou, China) — títulos traduzidos:":"sin censura (Sogou, China) — títulos traducidos:","sem censura (Sogou, China) — fotos:":"sin censura (Sogou, China) — fotos:","buscando fotos adultas...":"buscando fotos adultas...","buscando em sites adultos...":"buscando en sitios adultos...","procurando em fóruns...":"buscando en foros...","buscando na China...":"buscando en China...","vasculhando arquivo...":"revisando el archivo...","pensando no que perguntar...":"pensando qué preguntar...","só imagem (jpg/png/...)":"solo imagen (jpg/png/...)","foto pronta ✓":"foto lista ✓","baixando foto...":"descargando foto...","link não é imagem":"el enlace no es una imagen","analisando foto...":"analizando foto...","procurando foto igual na web...":"buscando la misma foto en la web...","vendo os nichos...":"viendo los nichos...","usuários":"usuarios","· recorde ":"· récord ","RECORDE! ":"¡RÉCORD! "," pessoas online ao mesmo tempo!":" ¡personas en línea al mismo tiempo!","DEMOROU MAS CHEGAMOS! ":"¡LO LOGRAMOS! "," usuários cadastrados!":" ¡usuarios registrados!","te convidou p/ o privado ":"te invitó al privado ","enviando convite p/ @":"enviando invitación a @","IA interage: curte, responde e segue de volta":"La IA interactúa: da likes, responde y sigue de vuelta","IA interagindo: curte, responde e segue de volta 👍":"IA interactuando: dando likes, respondiendo y siguiendo de vuelta 👍","IA pausada — só espelhando":"IA en pausa — solo replicando","trocar de chat":"cambiar de chat","novo chat público":"nuevo chat público","copiar link da sala":"copiar enlace de la sala","moderação":"moderación","procurar chats...":"buscar chats...","voltar":"volver","nome (2-40)":"nombre (2-40)","descrição curta (opcional)":"descripción corta (opcional)","ou foto https://...":"o foto https://...","criar":"crear","cancelar":"cancelar","Enter envia":"Enter envía","Enter envia · Shift+Enter quebra linha":"Enter envía · Shift+Enter para salto de línea","Enter quebra linha":"Enter para salto de línea","escolha um emoji":"elige un emoji","anexar foto/vídeo/link":"adjuntar foto/video/enlace","animados · combinou, vira combo":"animados · combínalo y sale combo","emojis":"emojis","nenhuma mensagem ainda — diga oi! 👋":"aún no hay mensajes — ¡saluda! 👋"};
var D = LANG === "es" ? DES : DEN;
function tr(s){
  if(LANG === "pt" || typeof s !== "string") return s;
  var t = D[s];
  if(t !== undefined) return t;
  var t2 = D[s.trim()];
  if(t2 !== undefined) return s.replace(s.trim(), t2);
  return s;
}
window.zunzumTr = tr;
window.zunzumLangSet = function(l){ try{ var q = new URLSearchParams(location.search); q.set("lang", l); location.search = q.toString(); }catch(e){} };
var SKIP = "SCRIPT,STYLE,NOSCRIPT,IFRAME,TEXTAREA";
var SKIP_ZONE = "#feedCtn,.chatlog,#searchOut,#searchLinks,#profDepo,#profMural,#seoFeed,#sugList,#seoBox";
function inZone(n){
  try{ return !!(n.closest && n.closest(SKIP_ZONE)); }catch(e){ return false; }
}
function trTextNode(nd){
  var v = nd.nodeValue;
  if(!v || !/[A-Za-zÀ-ú]/.test(v)) return;
  var t = v.trim();
  if(t.length < 2) return;
  var r = D[t];
  if(r === undefined) return;
  nd.nodeValue = v.replace(t, r);
}
function trAttrs(el){
  ["placeholder","title","aria-label"].forEach(function(a){
    try{
      var v = el.getAttribute && el.getAttribute(a);
      if(v && D[v.trim()] !== undefined) el.setAttribute(a, v.replace(v.trim(), D[v.trim()]));
    }catch(e){}
  });
}
function trTree(root){
  if(LANG === "pt" || !root) return;
  try{
    if(root.nodeType === 3){ if(!inZone(root.parentNode)) trTextNode(root); return; }
    if(root.nodeType !== 1) return;
    if(SKIP.indexOf(root.tagName) >= 0) return;
    if(inZone(root)) { trAttrs(root); return; }
    trAttrs(root);
    try{
      var els = root.querySelectorAll ? root.querySelectorAll("[placeholder],[title],[aria-label]") : [];
      for(var i=0;i<els.length;i++){ if(!inZone(els[i])) trAttrs(els[i]); }
    }catch(e){}
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while(w.nextNode()) nodes.push(w.currentNode);
    nodes.forEach(function(nd){
      if(nd.parentNode && SKIP.indexOf(nd.parentNode.tagName) < 0 && !inZone(nd.parentNode)) trTextNode(nd);
    });
  }catch(e){}
}
var obs = null;
function init(){
  if(LANG === "pt") return;
  try{ document.title = ES ? "zunzum — red anónima nostálgica estilo orkut, años 2000" : "zunzum — nostalgic orkut-style anonymous chat, 2000s vibe"; }catch(e){}
  trTree(document.body);
  try{
    obs = new MutationObserver(function(muts){
      muts.forEach(function(mu){
        mu.addedNodes.forEach(function(n){ trTree(n); });
        if(mu.type === "attributes" && mu.target) trAttrs(mu.target);
      });
    });
    obs.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["placeholder","title"]});
  }catch(e){}
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
})();
