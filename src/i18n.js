(function(){
var qlang = "";
try{ qlang = String(new URLSearchParams(location.search).get("lang")||"").toLowerCase().slice(0,2); }catch(e){}
var nav = "";
try{ nav = String((navigator&&(navigator.language||navigator.userLanguage))||"").toLowerCase(); }catch(e){}
// Persistência (2026-11-01): ?lang= explícito vence e é salvo; senão vale a
// escolha salva; só sem nenhum dos dois cai p/ o idioma do navegador. Antes,
// abrir ?perfil=/ ?sala= (links sem lang) ou recarregar sem o param voltava ao
// PT e o usuário achava que "não salvou".
var stored = "";
try{ stored = String(localStorage.getItem("zunzumLang")||"").toLowerCase().slice(0,2); }catch(e){}
if(qlang !== "en" && qlang !== "es" && qlang !== "pt") qlang = "";
if(stored !== "en" && stored !== "es" && stored !== "pt") stored = "";
try{ if(qlang) localStorage.setItem("zunzumLang", qlang); }catch(e){}
var LANG = qlang || stored || ((/^es\b/.test(nav)) ? "es" : ((/^en\b/i.test(nav)) ? "en" : "pt"));
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
"Publique no feed sem conta — desabafa sem mostrar o rosto.":"Post to the feed with no account — vent without showing your face.","Publique no feed sem conta.":"Post to the feed with no account.",
"Crie um nick com senha para conversar no bate-papo publico e em salas privadas — e ache sua turma.":"Create a nick with password to chat in the public room and private rooms — and find your gang.","Crie um nick com senha para conversar no chat publico e em salas privadas.":"Create a nick with password to chat in the public room and private rooms.",
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
"sugestões e bugs":"suggestions & bugs","atalhos":"shortcuts","como funciona":"how it works","🐝 chama os amigos":"🐝 invite friends","📣 chamar a turma":"📣 invite the gang","Leia o feed sem conta e poste anonimamente.":"Read the feed with no account and post anonymously.","Crie seu nick pra conversar no chat e nas salas.":"Create your nick to chat in the public room and private rooms.","Traga a turma pelo botão 📢 divulgar no topo.":"Bring your friends with the 📢 promote button on top.","Sala privada: combinem um código e digitem igual.":"Private room: agree on a code and type the same.","Curtiu o zunzum? Cada amigo que entra pelo teu link conta no teu placar.":"Like zunzum? Every friend who joins through your link counts on your scoreboard.",
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
"poste anonimamente... sem mostrar o rosto":"post anonymously... no face shown","poste anonimamente...":"post anonymously...",
"postar":"post",
"feed compartilhado":"shared feed",

"filtro:":"filter:",
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

"Outros buscadores (sem filtro personalizado): abra no seu navegador já com a pesquisa pronta:":"Other search engines (no custom filter): open in your browser with the search ready:",

"fotos:":"photos:",
"bing fotos":"bing photos",


"fóruns e discussões:":"forums and discussions:",
"fora dos buscadores (Wayback Machine):":"outside search engines (Wayback Machine):",


"fotos (Sogou):":"photos (Sogou):",
"fotos (Sogou) — títulos traduzidos:":"photos (Sogou) — translated titles:",


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
"nenhuma mensagem ainda — diga oi sem mostrar o rosto! 👋":"no messages yet — say hi without showing your face! 👋","nenhuma mensagem ainda — diga oi! 👋":"no messages yet — say hi! 👋",
"🔗 sites amigos":"🔗 friend sites","webring da abelhinha: blogroll anos 2000, sem algoritmo. Entrar e sair por link, como antigamente.":"little-bee webring: 2000s blogroll, no algorithm. Join and leave by link, like the old days.","← anterior":"← previous","🎲 aleatório":"🎲 random","próximo →":"next →","selo 88x31 p/ colar no teu site:":"88x31 badge to paste on your site:","copiar selo":"copy badge","selo copiado!":"badge copied!","tem site anos 2000? sugere:":"got a 2000s site? suggest it:","https://teusite.com":"https://yoursite.com","sugerir":"suggest","site enviado p/ sugestões, valeu!":"site sent to suggestions, thanks!","link precisa começar com https://":"link must start with https://"
}
var DES = {"— rede anonima de conversa":"— red anónima de conversación","feed livre sem conta | chat publico e privado com conta simples":"feed libre sin cuenta | chat público y privado con cuenta simple","buscar":"buscar","📢 divulgar":"📢 promocionar","usuario":"usuario","sobre":"acerca de","Publique no feed sem conta — desabafa sem mostrar o rosto.":"Publica en el feed sin cuenta — desahógate sin mostrar la cara.","Publique no feed sem conta.":"Publica en el feed sin cuenta.","Crie um nick com senha para conversar no bate-papo publico e em salas privadas — e ache sua turma.":"Crea un nick con contraseña para conversar en el chat público y en salas privadas — y encuentra a tu gente.","Crie um nick com senha para conversar no chat publico e em salas privadas.":"Crea un nick con contraseña para conversar en el chat público y en salas privadas.","espelho nostr 🤖":"espejo nostr 🤖","Replica posts do feed pra rede Nostr com link de volta. Roda neste navegador enquanto ligado.":"Replica las publicaciones del feed en la red Nostr con enlace de vuelta. Funciona en este navegador mientras esté activado.","desligado":"apagado","ligado ✅ espelhando desta aba":"activado ✅ replicando desde esta pestaña",
"auto 🐝 fundo ligado":"auto 🐝 fondo activado","ligar":"activar","desligar":"apagar","nova chave":"nueva clave","copiar":"copiar","sugestões e bugs":"sugerencias y errores","atalhos":"accesos directos","como funciona":"cómo funciona","🐝 chama os amigos":"🐝 invita a tus amigos","📣 chamar a turma":"📣 invita a tu gente","Leia o feed sem conta e poste anonimamente.":"Lee el feed sin cuenta y publica anónimamente.","Crie seu nick pra conversar no chat e nas salas.":"Crea tu nick para conversar en el chat público y en las salas.","Traga a turma pelo botão 📢 divulgar no topo.":"Trae a tu gente con el botón 📢 promocionar de arriba.","Sala privada: combinem um código e digitem igual.":"Sala privada: acuerden un código y escríbanlo igual.","Curtiu o zunzum? Cada amigo que entra pelo teu link conta no teu placar.":"¿Te gusta zunzum? Cada amigo que entra por tu enlace cuenta en tu marcador.","ideia de melhoria":"idea de mejora","bug":"error","enviar":"enviar","postar sem conta":"publicar sin cuenta",
"link inválido":"enlace inválido",
"perfil não encontrado":"perfil no encontrado",
"chat não encontrado":"chat no encontrado",
"ir p/ #geral":"ir a #geral",
"visitas":"visitas",
"visita":"visita",
"você posta como":"publicas como",
"🔄 trocar p/ cortar rasto":"🔄 cambiar para cortar el rastro","poste anonimamente... sem mostrar o rosto":"publica anónimamente... sin mostrar la cara","poste anonimamente...":"publica anónimamente...","postar":"publicar","feed compartilhado":"feed compartido","filtro:":"filtro:","embaçar":"difuminar","ocultar":"ocultar","ver":"ver","chat publico":"chat público","@ marcar...":"@ mencionar...","cor":"color","mensagem...":"mensaje...","chat privado":"chat privado","combinem um codigo e digitem igual:":"acuerden un código y escríbanlo igual:","codigo ex: eu-voce-123":"código p. ej.: yo-tu-123","entrar":"entrar","convidar":"invitar","convidar @nick...":"invitar a @nick...","copiar link":"copiar enlace","mensagem privada...":"mensaje privado...","sobre o zunzum":"acerca de zunzum","chave privada hex (64 letras)":"clave privada hex (64 caracteres)","conte sua ideia ou bug...":"cuenta tu idea o error...","ou link https://...":"o enlace https://...","ou link ou base64":"o enlace o base64","comprimindo imagem...":"comprimiendo imagen...","nome, nick ou o que procura?":"¿nombre, nick o qué buscas?","ou link https://... ou cole base64":"o enlace https://... o pega base64","responda aqui...":"responde aquí...","clique em gerar com IA...":"haz clic en generar con IA...","ir":"ir","responder":"responder","mencionar":"mencionar","convidar p/ privado":"invitar al privado","🔕 silenciar":"🔕 silenciar","🔔 ativar":"🔔 activar","bloquear":"bloquear","desbloquear":"desbloquear","compartilhar":"compartir","fechar":"cerrar","📢 divulgar o zunzum":"📢 promocionar zunzum","A IA cria o texto, você posta nos fóruns.":"La IA crea el texto, tú lo publicas en los foros.","post de fórum":"publicación de foro","curto p/ comentário":"corto para comentario","tópico completo":"tema completo","convite whatsapp/telegram":"invitación whatsapp/telegram","✨ gerar com IA":"✨ generar con IA","copiar texto":"copiar texto","agora não":"ahora no","link copiado!":"¡enlace copiado!","anonimo sem conta":"anónimo sin cuenta","carregando...":"cargando...","perfil nao encontrado":"perfil no encontrado","membro desde ":"miembro desde ","sem conexao":"sin conexión","aceitar":"aceptar","recusar":"rechazar","apagar":"borrar","depoimentos":"testimonios","escreva algo ou coloque foto":"escribe algo o pon una foto","link precisa começar com https://":"el enlace debe empezar con https://","enviando...":"enviando...","erro: ":"error: ","entre com nick+senha para deixar depoimento.":"entra con nick+contraseña para dejar un testimonio.","sair":"salir","foto de perfil:":"foto de perfil:","só imagem":"solo imagen","otimizando...":"optimizando...","erro upload":"error al subir","foto atualizada!":"¡foto actualizada!","ou link externo da foto:":"o enlace externo de la foto:","usar link":"usar enlace","cole o link":"pega el enlace","enviando foto...":"enviando foto...","base64 inválido":"base64 inválido","salvando...":"guardando...","remover foto":"quitar foto","criar / entrar":"crear / entrar","nick 2+ e senha 3+":"nick 2+ y contraseña 3+","sem servidor ainda":"sin servidor aún","arquivo":"archivo","sem servidor":"sin servidor","entre num código primeiro.":"entra en un código primero.","entre com nick+senha para convidar.":"entra con nick+contraseña para invitar.","erro ao apagar":"error al borrar","recebido, valeu!":"¡recibido, gracias!","área do dono ":"área del dueño ","senha errada":"contraseña incorrecta","digite algo ou anexe foto":"escribe algo o adjunta una foto","buscando...":"buscando...","pensando...":"pensando...","buscando links...":"buscando enlaces...","nada na web":"nada en la web","resultados da web:":"resultados de la web:","você posta nos fóruns.":"tú lo publicas en los foros.","entre com nick+senha primeiro.":"entra con nick+contraseña primero.","entre num código primeiro, depois convide.":"entra en un código primero, luego invita.","digite o @nick da pessoa.":"escribe el @nick de la persona.","você já está na sala.":"ya estás en la sala.","nick @":"nick @"," não existe. confira e tente de novo.":" no existe. revisa e inténtalo de nuevo.","modo local (preview) — salve o generator p/ servidor global":"modo local (vista previa) — guarda el generador para el servidor global","online":"en línea","reconectando...":"reconectando...","convite enviado p/ @":"invitación enviada a @","se ela estiver online, entra na hora. ou mande o link: ":"si está en línea, entrará al momento. o manda el enlace: ","não deu p/ avisar online (":"no se pudo avisar en línea (","). mande o link: ":"). manda el enlace: ","sem conexão. mande o link: ":"sin conexión. manda el enlace: ","entre num código do privado primeiro, depois convide @":"entra en un código del privado primero, luego invita a @","link copiado! ":"¡enlace copiado! ","novo depoimento de @":"nuevo testimonio de @"," — clique para aprovar":" — clic para aprobar","enviado! aparece após aprovação.":"¡enviado! aparece tras la aprobación.","corrigir":"corregir","atualizar":"actualizar","essa resposta ajudou? ":"¿te ayudó esta respuesta? ","resposta salva · essa resposta ajudou? ":"respuesta guardada · ¿te ayudó? ","valeu! salva como certa.":"¡gracias! guardada como correcta.","marcada como errada. Corrija abaixo ou busque de novo.":"marcada como incorrecta. Corrige abajo o busca de nuevo.","correção salva! buscando atualizado...":"¡corrección guardada! buscando actualizado...","erro ao salvar":"error al guardar","resposta certa...":"respuesta correcta...","salvar":"guardar","nome certo / resposta certa...":"nombre correcto / respuesta correcta...","não é nenhuma dessas? ":"¿no es ninguna de estas? ","Quem é ela?":"¿Quién es ella?","Achei gente parecida em nichos diferentes. Quem é ela?":"Encontré gente parecida en nichos distintos. ¿Quién es ella?","fotos:":"fotos:","fotos (Sogou):":"fotos (Sogou):","fotos (Sogou) — títulos traduzidos:":"fotos (Sogou) — títulos traducidos:","Outros buscadores (sem filtro personalizado): abra no seu navegador já com a pesquisa pronta:":"Otros buscadores (sin filtro personalizado): abre en tu navegador con la búsqueda lista:","bing fotos":"fotos bing","fóruns e discussões:":"foros y debates:","fora dos buscadores (Wayback Machine):":"fuera de los buscadores (Wayback Machine):","procurando em fóruns...":"buscando en foros...","buscando na China...":"buscando en China...","vasculhando arquivo...":"revisando el archivo...","pensando no que perguntar...":"pensando qué preguntar...","só imagem (jpg/png/...)":"solo imagen (jpg/png/...)","foto pronta ✓":"foto lista ✓","baixando foto...":"descargando foto...","link não é imagem":"el enlace no es una imagen","analisando foto...":"analizando foto...","procurando foto igual na web...":"buscando la misma foto en la web...","vendo os nichos...":"viendo los nichos...","usuários":"usuarios","· recorde ":"· récord ","RECORDE! ":"¡RÉCORD! "," pessoas online ao mesmo tempo!":" ¡personas en línea al mismo tiempo!","DEMOROU MAS CHEGAMOS! ":"¡LO LOGRAMOS! "," usuários cadastrados!":" ¡usuarios registrados!","te convidou p/ o privado ":"te invitó al privado ","enviando convite p/ @":"enviando invitación a @","IA interage: curte, responde e segue de volta":"La IA interactúa: da likes, responde y sigue de vuelta","IA interagindo: curte, responde e segue de volta 👍":"IA interactuando: dando likes, respondiendo y siguiendo de vuelta 👍","IA pausada — só espelhando":"IA en pausa — solo replicando","trocar de chat":"cambiar de chat","novo chat público":"nuevo chat público","copiar link da sala":"copiar enlace de la sala","moderação":"moderación","procurar chats...":"buscar chats...","voltar":"volver","nome (2-40)":"nombre (2-40)","descrição curta (opcional)":"descripción corta (opcional)","ou foto https://...":"o foto https://...","criar":"crear","cancelar":"cancelar","Enter envia":"Enter envía","Enter envia · Shift+Enter quebra linha":"Enter envía · Shift+Enter para salto de línea","Enter quebra linha":"Enter para salto de línea","escolha um emoji":"elige un emoji","anexar foto/vídeo/link":"adjuntar foto/video/enlace","animados · combinou, vira combo":"animados · combínalo y sale combo","emojis":"emojis","nenhuma mensagem ainda — diga oi! 👋":"aún no hay mensajes — ¡saluda! 👋","🔗 sites amigos":"🔗 sitios amigos","webring da abelhinha: blogroll anos 2000, sem algoritmo. Entrar e sair por link, como antigamente.":"webring de la abejita: blogroll años 2000, sin algoritmo. Entra y sal por enlace, como antes.","← anterior":"← anterior","🎲 aleatório":"🎲 aleatorio","próximo →":"siguiente →","selo 88x31 p/ colar no teu site:":"sello 88x31 para pegar en tu sitio:","copiar selo":"copiar sello","selo copiado!":"¡sello copiado!","tem site anos 2000? sugere:":"¿tienes sitio años 2000? sugiérelo:","https://teusite.com":"https://tusitio.com","sugerir":"sugerir","site enviado p/ sugestões, valeu!":"¡sitio enviado a sugerencias, gracias!","link precisa começar com https://":"el enlace debe empezar con https://"};
DES["🔗 sites amigos"]="🔗 sitios amigos";DES["webring da abelhinha: blogroll anos 2000, sem algoritmo. Entrar e sair por link, como antigamente."]="webring de la abejita: blogroll de los años 2000, sin algoritmo. Entra y sal por enlace, como antes.";DES["← anterior"]="← anterior";DES["🎲 aleatório"]="🎲 aleatorio";DES["próximo →"]="siguiente →";DES["site anterior do anel"]="sitio anterior del anillo";DES["site aleatório do anel"]="sitio aleatorio del anillo";DES["próximo site do anel"]="sitio siguiente del anillo";DES["selo do zunzum"]="sello de zunzum";
DES["como começar"]="cómo empezar";DES["Leia o feed e poste sem conta."]="Lee el feed y publica sin cuenta.";DES["Crie seu nick pra conversar no chat e nas salas."]="Crea tu nick para conversar en el chat y las salas.";DES["Traga a turma pelo 📢 divulgar."]="Trae a tu gente con 📢 promocionar.";DES["ver como funciona"]="ver cómo funciona";DES["dispensar"]="descartar";DES["como começar 👆 toque p/ ver onde clicar"]="cómo empezar 👆 toca para ver dónde hacer clic";DES["👆 mostrar onde clicar"]="👆 mostrar dónde hacer clic";DES["postar aqui"]="publicar aquí";DES["crie seu nick aqui"]="crea tu nick aquí";DES["divulgar aqui"]="promocionar aquí";DES["como funciona aqui"]="cómo funciona aquí";DES["entendi ✓"]="entendido ✓";DES["onde clicar: aba 📰 Feed → botão Postar"]="dónde hacer clic: pestaña 📰 Feed → botón Publicar";DES["onde clicar: aba 👤 Conta → criar nick"]="dónde hacer clic: pestaña 👤 Cuenta → crear nick";DES["onde clicar: topo → botão 📢 divulgar"]="dónde hacer clic: arriba → botón 📢 promocionar";DES["onde clicar: aba ☰ Mais → como funciona"]="dónde hacer clic: pestaña ☰ Más → cómo funciona";DES["onde clicar: aba 📰 Feed → caixa postar"]="dónde hacer clic: pestaña 📰 Feed → caja publicar";DES["onde clicar: aba 💬 Chats → sala #geral"]="dónde hacer clic: pestaña 💬 Chats → sala #geral";DES["onde clicar: topo → botão ⋮"]="dónde hacer clic: arriba → botón ⋮";DES["formatar"]="formato";DES["ocultar"]="ocultar";DES["formatação e anexos"]="formato y archivos";DES["avançado"]="avanzado";DES["ver regras e placar"]="ver reglas y marcador";DES["📢 divulgar"]="📢 promocionar";DES["🔍 buscar"]="🔍 buscar";DES["💬 chats"]="💬 chats";DES["➕ postar"]="➕ publicar";DES["⚡ atalhos"]="⚡ accesos";DES["Salas privadas por código."]="Salas privadas por código.";DES["Nick + senha, sem email."]="Nick + contraseña, sin email.";DES["Feed livre sem conta."]="Feed libre sin cuenta.";DES["🐝 por que zunzum?"]="🐝 ¿por qué zunzum?";DES["selo 88x31 p/ colar no teu site:"]="sello 88x31 para pegar en tu sitio:";DES["copiar selo"]="copiar sello";DES["selo copiado!"]="¡sello copiado!";DES["tem site anos 2000? sugere:"]="¿tienes un sitio de los 2000? sugiérelo:";DES["https://teusite.com"]="https://tusitio.com";DES["sugerir"]="sugerir";DES["site enviado p/ sugestões, valeu!"]="¡sitio enviado a sugerencias, gracias!";DES["link precisa começar com https://"]="el enlace debe empezar con https://";DES["💬 responderam você"]="💬 te respondieron";DES["respondeu seu post"]="respondió tu publicación";DES["responderam seus posts"]="respondieron tus publicaciones";DES["marcar lidas"]="marcar leídas";DES["postado! deixe a aba aberta com o som ligado — te aviso aqui quando responderem."]="¡publicado! deja la pestaña abierta con el sonido activado — te aviso aquí cuando respondan.";
DEN["site anterior do anel"]="previous ring site";DEN["site aleatório do anel"]="random ring site";DEN["próximo site do anel"]="next ring site";DEN["selo do zunzum"]="zunzum badge";
DEN["como começar"]="quick start";DEN["Leia o feed e poste sem conta."]="Read the feed and post with no account.";DEN["Crie seu nick pra conversar no chat e nas salas."]="Create your nick to chat and join rooms.";DEN["Traga a turma pelo 📢 divulgar."]="Bring friends with 📢 promote.";DEN["ver como funciona"]="see how it works";DEN["dispensar"]="dismiss";DEN["como começar 👆 toque p/ ver onde clicar"]="quick start 👆 tap to see where to click";DEN["👆 mostrar onde clicar"]="👆 show where to click";DEN["postar aqui"]="post here";DEN["crie seu nick aqui"]="create your nick here";DEN["divulgar aqui"]="promote here";DEN["como funciona aqui"]="how it works here";DEN["entendi ✓"]="got it ✓";DEN["onde clicar: aba 📰 Feed → botão Postar"]="where to click: 📰 Feed tab → Post button";DEN["onde clicar: aba 👤 Conta → criar nick"]="where to click: 👤 Account tab → create nick";DEN["onde clicar: topo → botão 📢 divulgar"]="where to click: top → 📢 promote button";DEN["onde clicar: aba ☰ Mais → como funciona"]="where to click: ☰ More tab → how it works";DEN["onde clicar: aba 📰 Feed → caixa postar"]="where to click: 📰 Feed tab → post box";DEN["onde clicar: aba 💬 Chats → sala #geral"]="where to click: 💬 Chats tab → #general room";DEN["onde clicar: topo → botão ⋮"]="where to click: top → ⋮ button";DEN["formatar"]="format";DEN["ocultar"]="hide";DEN["formatação e anexos"]="formatting & attachments";DEN["avançado"]="advanced";DEN["ver regras e placar"]="see rules & leaderboard";DEN["📢 divulgar"]="📢 promote";DEN["🔍 buscar"]="🔍 search";DEN["💬 chats"]="💬 chats";DEN["➕ postar"]="➕ post";DEN["⚡ atalhos"]="⚡ shortcuts";DEN["Salas privadas por código."]="Private rooms by code.";DEN["Nick + senha, sem email."]="Nick + password, no email.";DEN["Feed livre sem conta."]="Free feed, no account.";DEN["🐝 por que zunzum?"]="🐝 why zunzum?";DEN["💬 responderam você"]="💬 replied to you";DEN["respondeu seu post"]="replied to your post";DEN["responderam seus posts"]="replied to your posts";DEN["marcar lidas"]="mark as read";DEN["postado! deixe a aba aberta com o som ligado — te aviso aqui quando responderem."]="posted! keep the tab open with sound on — I'll let you know here when someone replies.";
DEN["caixa de entrada (só dono)"]="inbox (owner only)";DEN["todas"]="all";DEN["ideias"]="ideas";DEN["bugs"]="bugs";DEN["↻ atualizar"]="↻ refresh";DEN["limpar tudo"]="clear all";DEN["confirma? clique de novo"]="confirm? click again";DEN["vazio — nada por aqui 🐝"]="empty — nothing here 🐝";DEN["apagando..."]="deleting...";DEN["falha ao apagar"]="delete failed";DEN["💡 ideia"]="💡 idea";DEN["🐞 bug"]="🐞 bug";
DEN["editar"]="edit";DEN["apagar esta mensagem?"]="delete this message?";DEN["nodal novo — você define quanto tempo ele existe:"]="new nodal — you set how long it lives:";DEN["criar nodal"]="create nodal";DEN["criar de novo"]="create again";DEN["mensagem no nodal..."]="message in the nodal...";DEN["tag livre — quem cria define o tempo de vida"]="free tag — creator sets the lifespan";DEN["tempo esgotado — tudo foi deletado e a tag foi liberada."]="time's up — everything was deleted and the tag is free.";DEN["só 1 #tag por post abre nodal"]="only 1 #tag per post opens a nodal";DEN["30 min"]="30 min";DEN["2 horas"]="2 hours";DEN["12 horas"]="12 hours";DEN["24 horas"]="24 hours";DEN["3 dias"]="3 days";DEN["abrindo..."]="opening...";DEN["criando..."]="creating...";DEN["GIFs da galera"]="community GIFs";
DEN["🔑 tokens do anon"]="🔑 anon tokens";DEN["você posta como"]="you post as";DEN["identidade guardada ✅ (só este navegador edita/apaga)"]="identity saved ✅ (only this browser can edit/delete)";DEN["identidade ainda não (nasce no 1º post/like)"]="no identity yet (created on 1st post/like)";DEN["anons"]="anons";DEN["itens"]="items";DEN["token do anon atual (cole no outro aparelho via importar):"]="current anon token (paste on the other device via import):";DEN["sem token ainda — poste algo primeiro."]="no token yet — post something first.";DEN["exportar tudo (backup p/ trocar de aparelho):"]="export all (backup for switching devices):";DEN["importar (cole o backup do outro aparelho):"]="import (paste the backup from the other device):";DEN["cole aqui o backup exportado"]="paste the exported backup here";DEN["importar"]="import";DEN["tokens importados! ✅"]="tokens imported! ✅";DEN["backup inválido"]="invalid backup";DEN["copiado ✅"]="copied ✅";DEN["não copiou sozinho — selecione o campo e use Ctrl+C"]="auto-copy failed — select the field and use Ctrl+C";
DES["caixa de entrada (só dono)"]="bandeja de entrada (solo dueño)";DES["todas"]="todas";DES["ideias"]="ideas";DES["bugs"]="errores";DES["↻ atualizar"]="↻ actualizar";DES["limpar tudo"]="borrar todo";DES["confirma? clique de novo"]="¿seguro? pulsa de nuevo";DES["vazio — nada por aqui 🐝"]="vacío — nada por aquí 🐝";DES["apagando..."]="borrando...";DES["falha ao apagar"]="error al borrar";DES["💡 ideia"]="💡 idea";DES["🐞 bug"]="🐞 error";DES["apagar"]="borrar";DES["sem conexao"]="sin conexión";
DES["editar"]="editar";DES["apagar esta mensagem?"]="¿borrar este mensaje?";DES["nodal novo — você define quanto tempo ele existe:"]="nodal nuevo — tú defines cuánto tiempo vive:";DES["criar nodal"]="crear nodal";DES["criar de novo"]="crear de nuevo";DES["mensagem no nodal..."]="mensaje en el nodal...";DES["tag livre — quem cria define o tempo de vida"]="etiqueta libre — quien crea define la duración";DES["tempo esgotado — tudo foi deletado e a tag foi liberada."]="tiempo agotado — todo fue borrado y la etiqueta quedó libre.";DES["só 1 #tag por post abre nodal"]="solo 1 #tag por publicación abre un nodal";DES["30 min"]="30 min";DES["2 horas"]="2 horas";DES["12 horas"]="12 horas";DES["24 horas"]="24 horas";DES["3 dias"]="3 días";DES["abrindo..."]="abriendo...";DES["criando..."]="creando...";DES["GIFs da galera"]="GIFs de la gente";DES["escolha um emoji"]="elige un emoji";DES["sem servidor"]="sin servidor";
DES["🔑 tokens do anon"]="🔑 tokens del anon";DES["você posta como"]="publicas como";DES["identidade guardada ✅ (só este navegador edita/apaga)"]="identidad guardada ✅ (solo este navegador puede editar/borrar)";DES["identidade ainda não (nasce no 1º post/like)"]="aún sin identidad (se crea en la 1ª publicación)";DES["anons"]="anons";DES["itens"]="ítems";DES["token do anon atual (cole no outro aparelho via importar):"]="token del anon actual (pégalo en el otro aparato vía importar):";DES["sem token ainda — poste algo primeiro."]="aún sin token — publica algo primero.";DES["exportar tudo (backup p/ trocar de aparelho):"]="exportar todo (respaldo para cambiar de aparato):";DES["importar (cole o backup do outro aparelho):"]="importar (pega el respaldo del otro aparato):";DES["cole aqui o backup exportado"]="pega aquí el respaldo exportado";DES["importar"]="importar";DES["tokens importados! ✅"]="¡tokens importados! ✅";DES["backup inválido"]="respaldo inválido";DES["copiado ✅"]="copiado ✅";DES["não copiou sozinho — selecione o campo e use Ctrl+C"]="no se copió solo — selecciona el campo y usa Ctrl+C";
// Bloco 2026-11-01 (feedback item 1: EN ainda mostrava PT) — chrome dinâmico comum.
Object.assign(DEN,{"ver perfil":"view profile","desbloquear":"unblock","mural de recados":"message board","deixe um recado...":"leave a message...","nenhum recado ainda. seja o primeiro!":"no messages yet. be the first!","recado postado!":"message posted!","apagar recado":"delete message","escreva algo":"write something","recado anônimo assinado (token)":"signed anonymous message (token)","entre com nick+senha p/ recadar":"log in with nick+password to leave a message","conversar":"chat","💬 conversar":"💬 chat","adicionar aos amigos":"add as friend","➕ adicionar aos amigos":"➕ add as friend","remover amigo":"remove friend","remover amizade":"remove friendship","mensagem...":"message...","minimizar":"minimize","ausente/suspenso":"away","entre com nick+senha p/ ver amigos.":"log in with nick+password to see friends.","entre com nick+senha p/ adicionar aos amigos.":"log in with nick+password to add friends.","citar":"quote","denunciar":"report","editar mensagem":"edit message","apagar mensagem":"delete message","editar resposta":"edit reply","apagar resposta":"delete reply","responder":"reply","responder...":"reply...","sem conexão.":"offline.","entre com nick+senha.":"log in with nick+password.","salvando...":"saving...","ver lista no seu perfil":"see the list on your profile","achar usuário por nick":"find user by nick","digite 2+ letras do nick.":"type 2+ letters of the nick.","abrir conversa":"open chat","editar post":"edit post","apagar post":"delete post","🔍 buscar gente":"🔍 find people","carregando mural...":"loading board...","entre com nick+senha p/ deixar depoimento.":"log in with nick+password to leave a testimonial.","apagar este recado?":"delete this message?","abrir mensagem instantânea":"open instant message"});
Object.assign(DES,{"ver perfil":"ver perfil","desbloquear":"desbloquear","mural de recados":"muro de mensajes","deixe um recado...":"deja un mensaje...","nenhum recado ainda. seja o primeiro!":"¡sin mensajes aún. sé el primero!","recado postado!":"¡mensaje publicado!","apagar recado":"borrar mensaje","escreva algo":"escribe algo","recado anônimo assinado (token)":"mensaje anónimo firmado (token)","entre com nick+senha p/ recadar":"entra con nick+contraseña para dejar un mensaje","conversar":"conversar","💬 conversar":"💬 conversar","adicionar aos amigos":"agregar como amigo","➕ adicionar aos amigos":"➕ agregar como amigo","remover amigo":"eliminar amigo","remover amizade":"eliminar amistad","mensagem...":"mensaje...","minimizar":"minimizar","ausente/suspenso":"ausente/suspendido","entre com nick+senha p/ ver amigos.":"entra con nick+contraseña para ver amigos.","entre com nick+senha p/ adicionar aos amigos.":"entra con nick+contraseña para agregar amigos.","citar":"citar","denunciar":"denunciar","editar mensagem":"editar mensaje","apagar mensagem":"borrar mensaje","editar resposta":"editar respuesta","apagar resposta":"borrar respuesta","responder":"responder","responder...":"responder...","sem conexão.":"sin conexión.","entre com nick+senha.":"entra con nick+contraseña.","salvando...":"guardando...","ver lista no seu perfil":"ver la lista en tu perfil","achar usuário por nick":"buscar usuario por nick","digite 2+ letras do nick.":"escribe 2+ letras del nick.","abrir conversa":"abrir conversación","editar post":"editar publicación","apagar post":"borrar publicación","🔍 buscar gente":"🔍 buscar gente","carregando mural...":"cargando muro...","entre com nick+senha p/ deixar depoimento.":"entra con nick+contraseña para dejar un testimonio.","apagar este recado?":"¿borrar este mensaje?","abrir mensagem instantânea":"abrir mensaje instantáneo"});
// Bloco 2026-11-01b (varredura EN: resíduos do chrome da conta + caixa SEO).
Object.assign(DEN,{"👤 meu perfil":"👤 my profile","abrir meu perfil":"open my profile","abrir meu perfil (depoimentos + mural)":"open my profile (testimonials + board)","mural":"board","📌 mural":"📌 board","ver meu mural de recados":"see my message board","excluir conta...":"delete account...","efeito do avatar:":"avatar effect:","🔑 trocar senha":"🔑 change password","lembrar chave neste navegador (senão some ao fechar a aba)":"remember key in this browser (lost when the tab closes)","área do dono":"owner area","conta dona confirmada ✅":"owner account confirmed ✅",", a rede social da":", the social network of the","abelhinha":"little bee","🐝, é uma rede anônima brasileira com nostalgia do":"🐝, is an anonymous Brazilian network with nostalgia for the","Orkut anos 2000":"2000s Orkut",": feed livre sem conta,":": free feed with no account,","comunidades":"communities","depoimentos e scraps":"testimonials and scraps","como no Orkut antigo, bate-papo público e salas privadas por código com conta simples de nick e senha, sem email e grátis. Tem busca com IA, perfis com @nick, sugestões de melhoria e DJ IA. Para quem sente falta do Orkut, do bate-papo UOL, do MSN e dos fóruns retrô: crie um nick, chame amigos pelo link do seu perfil e converse sem expor sua identidade.":" like on old Orkut, public chat and private rooms by code with a simple nick account, no email, free. With AI search, @nick profiles, suggestions and AI DJ. If you miss Orkut, MSN and old-school forums: create a nick, invite friends through your profile link and chat without exposing your identity.","feito no zunzum 🐝 —":"made on zunzum 🐝 —","crie seu nick grátis sem email":"create your free nick with no email","e traga sua turma: feed livre + chat + DJ IA.":" and bring your friends: free feed + chat + AI DJ."});
Object.assign(DES,{"👤 meu perfil":"👤 mi perfil","abrir meu perfil":"abrir mi perfil","abrir meu perfil (depoimentos + mural)":"abrir mi perfil (testimonios + muro)","mural":"muro","depoimentos":"testimonios","📌 mural":"📌 muro","ver meu mural de recados":"ver mi muro de mensajes","excluir conta...":"eliminar cuenta...","efeito do avatar:":"efecto del avatar:","🔑 trocar senha":"🔑 cambiar contraseña","lembrar chave neste navegador (senão some ao fechar a aba)":"recordar clave en este navegador (se pierde al cerrar la pestaña)","área do dono":"área del dueño","conta dona confirmada ✅":"cuenta dueña confirmada ✅",", a rede social da":", la red social de la","abelhinha":"abejita","🐝, é uma rede anônima brasileira com nostalgia do":"🐝, es una red anónima brasileña con nostalgia del","Orkut anos 2000":"Orkut años 2000",": feed livre sem conta,":": feed libre sin cuenta,","comunidades":"comunidades","depoimentos e scraps":"testimonios y scraps","como no Orkut antigo, bate-papo público e salas privadas por código com conta simples de nick e senha, sem email e grátis. Tem busca com IA, perfis com @nick, sugestões de melhoria e DJ IA. Para quem sente falta do Orkut, do bate-papo UOL, do MSN e dos fóruns retrô: crie um nick, chame amigos pelo link do seu perfil e converse sem expor sua identidade.":"como en el Orkut clásico, chat público y salas privadas por código con cuenta simple de nick, sin email y gratis. Con búsqueda por IA, perfiles @nick, sugerencias y DJ IA. Si extrañas Orkut, MSN y los foros clásicos: crea un nick, invita a tus amigos con el enlace de tu perfil y conversa sin exponer tu identidad.","feito no zunzum 🐝 —":"hecho en zunzum 🐝 —","crie seu nick grátis sem email":"crea tu nick gratis sin email","e traga sua turma: feed livre + chat + DJ IA.":"y trae a tu gente: feed libre + chat + DJ IA."});
var D = LANG === "es" ? DES : DEN;
// Templates dinâmicos com números/datas (pico, presença, respostas, views...)
// via regex quando não há match exato. Só PT->EN/ES; o resultado já sai sem
// as palavras PT, então não há re-tradução em loop. Seguro p/ conteúdo do
// chrome (feed/chat são zona excluída e nem chegam aqui).
var DPAT_EN=[[/(\d[\d.]*) usuários/g,"$1 users"],[/· recorde (\d+)/g,"· record $1"],[/🐝 recorde (\d+) online/g,"🐝 record $1 online"],[/pico em ([\d\/ :]+)/g,"peak at $1"],[/última vez com 2\+ online em /g,"last time with 2+ online at "],[/\((\d+) juntos\)/g,"($1 together)"],[/maior número de gente online ao mesmo tempo/g,"most people online at the same time"],[/online agora \((\d+) sem conta\)/g,"online now ($1 guests)"],[/online agora/g,"online now"],[/respostas \((\d+)\)/g,"replies ($1)"],[/ver mais \((\d+) restantes\)/g,"see more ($1 remaining)"],[/logado como (@[A-Za-z0-9-_]+) em (.+)/g,"logged in as $1 in $2"],[/logado como /g,"logged in as "],[/posts seus: (\d+)/g,"your posts: $1"],[/(\d[\d.]*) visitas/g,"$1 views"],[/(\d+)\s*tópicos/g,"$1 topics"],[/tá começando a aparecer 🌱/g,"starting to show up 🌱"],[/chamando atenção 👀/g,"getting attention 👀"],[/🔥 perfil bombando!/g,"🔥 trending profile!"],[/⭐ celebridade do zunzum!/g,"⭐ zunzum celebrity!"],[/🚀 lenda do zunzum!/g,"🚀 zunzum legend!"],[/primeira visita! ✨/g,"first visit! ✨"],[/na fila: (\d+)/g,"in queue: $1"],[/pular direto p\/ /g,"skip straight to "],[/tocar (Funk|Sertanejo|Pop|Rock|MPB|Rap|Eletrônica|Lo-fi|Anos 2000|K-pop)/g,"play $1"],[/\((\d+) sem conta\)/g,"($1 guests)"],[/^([A-Za-z0-9-]+) anonimo$/g,"$1 anonymous"]];
var DPAT_ES=[[/(\d[\d.]*) usuários/g,"$1 usuarios"],[/· recorde (\d+)/g,"· récord $1"],[/🐝 recorde (\d+) online/g,"🐝 récord $1 en línea"],[/pico em ([\d\/ :]+)/g,"pico el $1"],[/última vez com 2\+ online em /g,"última vez con 2+ en línea "],[/maior número de gente online ao mesmo tempo/g,"más gente en línea a la vez"],[/online agora \((\d+) sem conta\)/g,"en línea ahora ($1 invitados)"],[/online agora/g,"en línea ahora"],[/respostas \((\d+)\)/g,"respuestas ($1)"],[/ver mais \((\d+) restantes\)/g,"ver más ($1 restantes)"],[/logado como (@[A-Za-z0-9-_]+) em (.+)/g,"conectado como $1 en $2"],[/logado como /g,"conectado como "],[/posts seus: (\d+)/g,"tus publicaciones: $1"],[/(\d+)\s*tópicos/g,"$1 temas"],[/tá começando a aparecer 🌱/g,"empezando a aparecer 🌱"],[/chamando atenção 👀/g,"llamando la atención 👀"],[/🔥 perfil bombando!/g,"🔥 ¡perfil en llamas!"],[/⭐ celebridade do zunzum!/g,"⭐ ¡celebridad de zunzum!"],[/🚀 lenda do zunzum!/g,"🚀 ¡leyenda de zunzum!"],[/primeira visita! ✨/g,"¡primera visita! ✨"],[/na fila: (\d+)/g,"en cola: $1"],[/pular direto p\/ /g,"saltar directo a "],[/tocar (Funk|Sertanejo|Pop|Rock|MPB|Rap|Eletrônica|Lo-fi|Anos 2000|K-pop)/g,"reproducir $1"],[/\((\d+) sem conta\)/g,"($1 invitados)"],[/^([A-Za-z0-9-]+) anonimo$/g,"$1 anónimo"]];
// Bloco 2026-11-01f: cadeados da sala e moderação (texto quente: pinta a cada
// mensagem; tradução na criação zera o flicker de 120ms do observer).
Object.assign(DEN,{"você modera":"you moderate","tópicos":"topics","precisa logar.":"you need to log in.","🚫 você foi banido desta sala.":"🚫 you were banned from this room.","🔒 sala trancada (só aprovados leem)":"🔒 locked room (approved readers only)","· 🏠 você assumiu esta sala órfã — tranque e guarde o código.":"· 🏠 you claimed this orphan room — lock it and save the code.","· 🏠 sem dono — peça p/ assumir.":"· 🏠 no owner — ask to claim it.","· ⚠️ código fraco (anti-clone: gere um forte).":"· ⚠️ weak code (anti-clone: generate a strong one)."});
Object.assign(DES,{"você modera":"tú moderas","tópicos":"temas","precisa logar.":"necesitas iniciar sesión.","🚫 você foi banido desta sala.":"🚫 fuiste expulsado de esta sala.","🔒 sala trancada (só aprovados leem)":"🔒 sala cerrada (solo aprobados leen)","· 🏠 você assumiu esta sala órfã — tranque e guarde o código.":"· 🏠 asumiste esta sala huérfana — ciérrala y guarda el código.","· 🏠 sem dono — peça p/ assumir.":"· 🏠 sin dueño — pide asumirla.","· ⚠️ código fraco (anti-clone: gere um forte).":"· ⚠️ código débil (anti-clonación: genera uno fuerte)."});
DPAT_EN.push([/^🔒 sala trancada por (@[A-Za-z0-9-_]+) — só entra quem ele aprovar\.$/,"🔒 room locked by $1 — only people they approve can join."],[/^🔓 sala: (.+) \(aberta p\/ quem tem o código\)$/,"🔓 room: $1 (open to anyone with the code)"]);
DPAT_ES.push([/^🔒 sala trancada por (@[A-Za-z0-9-_]+) — só entra quem ele aprovar\.$/,"🔒 sala cerrada por $1 — solo entra quien él apruebe."],[/^🔓 sala: (.+) \(aberta p\/ quem tem o código\)$/,"🔓 sala: $1 (abierta para quien tenga el código)"]);
var DPAT = LANG === "es" ? DPAT_ES : DPAT_EN;
// Bloco 2026-11-01e: diálogos nativos + resíduos (placeholder do nodal,
// contadores, IA do espelho). Diálogos usam trDlg (exato + regex acima).
Object.assign(DEN,{"Apagar este depoimento?":"Delete this testimonial?","apagar esta resposta?":"delete this reply?","apagar este post?":"delete this post?","excluir este tópico e as msgs dele?":"delete this topic and its messages?","excluir esta sala e tudo dela?":"delete this room and everything in it?","apagar esta mensagem?":"delete this message?","apagar esta sala nodal e todas as mensagens?":"delete this nodal room and all its messages?","apagar este recado?":"delete this message?","Limpar cor, fonte e efeito do seu nick?":"Clear your nick's color, font and effect?","Apagar a chave Nostr deste navegador?":"Delete this browser's Nostr key?","apagar esta mensagem da fila?":"delete this queued message?","entre com nick+senha primeiro.":"log in with nick+password first.","entre com nick+senha p/ conversar.":"log in with nick+password to chat.","esse é você 🙂":"that's you 🙂","sem conexão, tente de novo":"offline, try again","sem servidor ainda":"no server yet","só GIF vira emoji 🎞️":"only GIFs become emoji 🎞️","copie o link do convite:":"copy the invite link:","copie o link do perfil:":"copy the profile link:","Excluir sua conta? Ela fica 30 dias inativa (ninguém vê) e depois apaga de vez. Se entrar de novo antes, a exclusão é cancelada.":"Delete your account? It stays inactive for 30 days (nobody sees it) and then is deleted for good. Logging in again before that cancels the deletion.","Confirma mesmo? Última chance — depois só entrando de novo em 30 dias p/ cancelar.":"Really sure? Last chance — afterwards you can only cancel by logging in again within 30 days.","chave apagada neste navegador.":"key deleted in this browser.","pedido enviado!":"request sent!","removendo...":"removing...","#tag p/ abrir o nodal...":"#tag to open the nodal...","tópicos":"topics","IA ✅":"AI ✅","IA ❌":"AI ❌"});
Object.assign(DES,{"Apagar este depoimento?":"¿Borrar este testimonio?","apagar esta resposta?":"¿borrar esta respuesta?","apagar este post?":"¿borrar esta publicación?","excluir este tópico e as msgs dele?":"¿borrar este tema y sus mensajes?","excluir esta sala e tudo dela?":"¿borrar esta sala y todo su contenido?","apagar esta mensagem?":"¿borrar este mensaje?","apagar esta sala nodal e todas as mensagens?":"¿borrar esta sala nodal y todos sus mensajes?","apagar este recado?":"¿borrar este mensaje?","Limpar cor, fonte e efeito do seu nick?":"¿Limpiar color, fuente y efecto de tu nick?","Apagar a chave Nostr deste navegador?":"¿Borrar la clave Nostr de este navegador?","apagar esta mensagem da fila?":"¿borrar este mensaje de la cola?","entre com nick+senha primeiro.":"entra con nick+contraseña primero.","entre com nick+senha p/ conversar.":"entra con nick+contraseña para conversar.","esse é você 🙂":"ese eres tú 🙂","sem conexão, tente de novo":"sin conexión, intenta de nuevo","sem servidor ainda":"sin servidor aún","só GIF vira emoji 🎞️":"solo los GIF se vuelven emoji 🎞️","copie o link do convite:":"copia el enlace de invitación:","copie o link do perfil:":"copia el enlace del perfil:","Excluir sua conta? Ela fica 30 dias inativa (ninguém vê) e depois apaga de vez. Se entrar de novo antes, a exclusão é cancelada.":"¿Borrar tu cuenta? Queda inactiva 30 días (nadie la ve) y luego se borra del todo. Si entras de nuevo antes, la eliminación se cancela.","Confirma mesmo? Última chance — depois só entrando de novo em 30 dias p/ cancelar.":"¿Seguro? Última oportunidad — después solo entrando de nuevo en 30 días para cancelar.","chave apagada neste navegador.":"clave borrada en este navegador.","pedido enviado!":"¡solicitud enviada!","removendo...":"eliminando...","#tag p/ abrir o nodal...":"#tag para abrir el nodal...","tópicos":"temas"});
DPAT_EN.push([/^Desbloquear (@[A-Za-z0-9-_]+)\? posts e msgs dele\(a\) voltam a aparecer\.$/,"Unblock $1? their posts and messages will show again."],[/^Remover (@[A-Za-z0-9-_]+) dos amigos\? DMs antigas somem p\/ vocês dois conversarem de novo só com novo pedido\.$/,"Remove $1 from friends? Old DMs disappear; you'll need a new request to talk again."],[/^Remover (@[A-Za-z0-9-_]+) dos amigos\?$/,"Remove $1 from friends?"],[/^(@[A-Za-z0-9-_]+) ainda não é seu amigo — clique em adicionar aos amigos primeiro\.$/,"$1 is not your friend yet — click add as friend first."]);
DPAT_ES.push([/^Desbloquear (@[A-Za-z0-9-_]+)\? posts e msgs dele\(a\) voltam a aparecer\.$/,"¿Desbloquear a $1? sus publicaciones y mensajes volverán a aparecer."],[/^Remover (@[A-Za-z0-9-_]+) dos amigos\? DMs antigas somem p\/ vocês dois conversarem de novo só com novo pedido\.$/,"¿Eliminar a $1 de amigos? Los DM antiguos desaparecen; necesitarán una nueva solicitud para hablar."],[/^Remover (@[A-Za-z0-9-_]+) dos amigos\?$/,"¿Eliminar a $1 de amigos?"],[/^(@[A-Za-z0-9-_]+) ainda não é seu amigo — clique em adicionar aos amigos primeiro\.$/,"$1 aún no es tu amigo — pulsa agregar como amigo primero."]);
function trPat(t){
  if(LANG === "pt" || typeof t !== "string") return null;
  try{
    var out = t;
    for(var i=0;i<DPAT.length;i++){ out = out.replace(DPAT[i][0], DPAT[i][1]); }
    if(out !== t) return out;
  }catch(e){}
  return null;
}
// Diálogos nativos (confirm/alert/prompt) não passam pelo DOM walker —
// traduz aqui: lookup exato + os mesmos templates dinâmicos. Em PT vira no-op.
function trDlg(s){
  if(LANG === "pt" || typeof s !== "string") return s;
  try{
    var t = s.trim();
    if(D[t] !== undefined) return s.replace(t, D[t]);
    if(D[t.trim()] !== undefined) return s;
    var p = trPat(t);
    if(p !== null) return s.replace(t, p);
  }catch(e){}
  return s;
}
try{
  if(!window.__zunDlgW){
    window.__zunDlgW = 1;
    (function(){
      var _c = window.confirm.bind(window);
      window.confirm = function(m){ try{ return _c(trDlg(String(m))); }catch(e){ return _c(m); } };
      var _a = window.alert.bind(window);
      window.alert = function(m){ try{ return _a(trDlg(String(m))); }catch(e){ return _a(m); } };
      try{
        var _p = window.prompt.bind(window);
        window.prompt = function(m, d){ try{ return _p(trDlg(String(m)), d); }catch(e){ return _p(m, d); } };
      }catch(e){}
    })();
  }
}catch(e){}
function tr(s){
  if(LANG === "pt" || typeof s !== "string") return s;
  var t = D[s];
  if(t !== undefined) return t;
  var t2 = D[s.trim()];
  if(t2 !== undefined) return s.replace(s.trim(), t2);
  try{ var p = trPat(s.trim()); if(p !== null) return s.replace(s.trim(), p); }catch(e){}
  return s;
}
window.zunzumTr = tr;
window.zunzumLangSet = function(l){ try{ localStorage.setItem("zunzumLang", String(l).slice(0,2)); }catch(e0){} try{ var q = new URLSearchParams(location.search); q.set("lang", l); location.search = q.toString(); }catch(e){} };
var SKIP = "SCRIPT,STYLE,NOSCRIPT,IFRAME,TEXTAREA";
var SKIP_ZONE = "#feedCtn,.chatlog,#searchOut,#searchLinks,#profDepo,#profMural,#seoFeed,#sugList,#seoBox,#nodalLog";
function inZone(n){
  try{ return !!(n.closest && n.closest(SKIP_ZONE)); }catch(e){ return false; }
}
function trTextNode(nd){
  var v = nd.nodeValue;
  if(!v || !/[A-Za-zÀ-ú]/.test(v)) return;
  var t = v.trim();
  if(t.length < 2) return;
  var r = D[t];
  // FIX trava EN (2026-11-01): sem fallback de rede. Texto fora do dicionário
  // fica em PT — antes cada string desconhecida disparava fetch MyMemory
  // (3 concorrentes, 12s timeout) + setAttribute/nodeValue que realimentava o
  // MutationObserver em loop (atributo EN virava novo job PT->EN). Com feed +
  // chrome isso virava centenas de fetches e travava a aba em ?lang=en.
  // Bloco 2026-11-01d: tenta os templates dinâmicos (regex) antes de desistir.
  if(r === undefined){ try{ var _p = trPat(t); if(_p !== null) nd.nodeValue = v.replace(t, _p); }catch(e){} return; }
  nd.nodeValue = v.replace(t, r);
}
function trAttrs(el){
  ["title","placeholder","aria-label","alt"].forEach(function(a){
    try{
      var v = el.getAttribute && el.getAttribute(a);
      // ditto: só dicionário, sem rede. Guarda p/ não retranslated em loop:
      // depois de traduzido o valor EN não é chave, então 2ª passada é no-op.
      if(v && D[v.trim()] !== undefined){
        try{ if(el.__zunTrA===v) return; }catch(e){}
        el.setAttribute(a, v.replace(v.trim(), D[v.trim()]));
        try{ el.__zunTrA = String(el.getAttribute(a)); }catch(e){}
      } else if(v){
        try{
          var _pt = trPat(v.trim());
          if(_pt !== null){ el.setAttribute(a, v.replace(v.trim(), _pt)); try{ el.__zunTrA = String(el.getAttribute(a)); }catch(e0){} }
        }catch(e1){}
      }
    }catch(e){}
  });
}
function trTree(root){
  if(LANG === "pt" || !root) return;
  // guarda de reentrância: o próprio trTree escreve no DOM; sem isso o
  // observer re-entra no meio da varredura e o custo vira O(n²).
  if(trTree._busy) return;
  trTree._busy = true;
  try{
    if(root.nodeType === 3){ if(!inZone(root.parentNode)) trTextNode(root); return; }
    if(root.nodeType !== 1) return;
    if(SKIP.indexOf(root.tagName) >= 0) return;
    if(inZone(root)) { trAttrs(root); return; }
    trAttrs(root);
    try{
      var els = root.querySelectorAll ? root.querySelectorAll("[placeholder],[title],[aria-label],[alt]") : [];
      // capa: modal gigante com milhares de attrs não pode travar o boot
      var _n = Math.min(els.length, 400);
      for(var i=0;i<_n;i++){ if(!inZone(els[i])) trAttrs(els[i]); }
    }catch(e){}
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var _c = 0;
    while(_c < 3000 && w.nextNode()){ nodes.push(w.currentNode); _c++; }
    for(var k=0;k<nodes.length;k++){
      var nd = nodes[k];
      if(nd.parentNode && SKIP.indexOf(nd.parentNode.tagName) < 0 && !inZone(nd.parentNode)) trTextNode(nd);
    }
  }catch(e){}
  finally{ trTree._busy = false; }
}
var obs = null;
var _pend = [], _sched = 0;
function _flush(){
  _sched = 0;
  var batch = _pend; _pend = [];
  if(!batch.length) return;
  // desconecta durante o processamento: nossos setAttribute/nodeValue não
  // podem gerar novos callbacks no meio do batch (era parte do loop EN).
  try{ if(obs) obs.disconnect(); }catch(e){}
  try{
    var seen = 0;
    for(var i=0;i<batch.length && seen<80;i++){
      var n = batch[i];
      try{ if(n && n.isConnected !== false) { trTree(n); seen++; } }catch(e){}
    }
    // sem isso, nós além do 80º eram descartados e ficavam em PT p/ sempre
    if(batch.length > seen){ _pend = batch.slice(seen).concat(_pend); }
  }catch(e){}
  try{ if(obs && document.body) obs.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["placeholder","title","aria-label","alt"]}); }catch(e){}
  if(_pend.length && !_sched) _sched = setTimeout(_flush, 120);
}
function init(){
  if(LANG === "pt") return;
  try{ document.title = ES ? "zunzum 🐝 — la red de la abejita: anónima nostálgica estilo orkut, años 2000" : "zunzum 🐝 — the little-bee network: nostalgic orkut-style anonymous chat, 2000s vibe"; }catch(e){}
  trTree(document.body);
  try{
    obs = new MutationObserver(function(muts){
      // FIX trava EN: antes cada mutação varria na hora (querySelectorAll +
      // TreeWalker por nó) e observava attributes (nosso setAttribute
      // realimentava). Agora só childList, com batch debounced de 120ms.
      // Attributes (placeholder/title/aria-label) voltam observados COM filtro:
      // seguro porque a tradução é síncrona e só-dicionário — o valor EN não
      // casa com nenhum padrão PT, então cada update gera no máx. 1 passada
      // extra que vira no-op. Sem isso, títulos atualizados in-place
      // (presença, contadores) ficavam em PT até a próxima mutação de lista.
      for(var i=0;i<muts.length;i++){
        var mu = muts[i];
        if(mu.type === "attributes"){
          try{ if(mu.target) trAttrs(mu.target); }catch(e){}
          continue;
        }
        if(mu.type !== "childList" || !mu.addedNodes) continue;
        for(var j=0;j<mu.addedNodes.length;j++){
          var n = mu.addedNodes[j];
          if(n && (n.nodeType === 1 || n.nodeType === 3)) _pend.push(n);
        }
        if(_pend.length > 400) break;
      }
      if(_pend.length && !_sched) _sched = setTimeout(_flush, 120);
    });
    obs.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["placeholder","title","aria-label","alt"]});
    // Re-passe tardio (2026-11-02): nós estáticos que o passe inicial e o
    // observer perderam (ex.: flood do feed estoura o teto de 400 do batch e
    // o resto da fila é descartado — chrome de outras abas nunca mais é
    // visitado). Só dicionário, idempotente (texto EN não é chave PT), com
    // a mesma trava de reentrância do trTree. Sem rede, sem loop.
    try{ setTimeout(function(){ try{ trTree(document.body); }catch(e){} }, 2500); }catch(e){}
    try{ setTimeout(function(){ try{ trTree(document.body); }catch(e){} }, 8000); }catch(e){}
    // Re-passe total de attrs (2026-11-02): o trTree capa attrs nos primeiros
    // 400 em ordem de documento — elementos além do teto (modais/painéis no
    // fim do body) ficavam em PT p/ sempre, pois attr estático não gera
    // mutação p/ o observer. Varredura completa sem teto, em fatias de 300
    // p/ não travar; idempotente (valor EN não é chave PT, 2ª passada no-op).
    try{ setTimeout(function(){
      var all = [];
      try{ all = Array.prototype.slice.call(document.querySelectorAll("[placeholder],[title],[aria-label],[alt]")); }catch(e){ return; }
      var i = 0;
      (function step(){
        try{
          var end = Math.min(all.length, i + 300);
          for(; i < end; i++){ try{ if(!inZone(all[i])) trAttrs(all[i]); }catch(e){} }
          if(i < all.length){ setTimeout(step, 60); return; }
        }catch(e){}
      })();
    }, 3000); }catch(e){}
  }catch(e){}
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
// Bloco 2026-11-01c (varredura EN/ES no aparelho: resto do chrome estático).
Object.assign(DEN,{"— rede anonima estilo orkut":"— anonymous orkut-style chat network","nostalgia anos 2000 | feed livre sem conta | chat publico e privado":"2000s nostalgia | free feed with no account | public and private chat","ligar/desligar som de notificação":"toggle notification sound","modo noturno: auto / ligado / desligado":"night mode: auto / on / off","termo de uso":"terms of use","ajuda":"help","bichinho":"pet","menu":"menu","1. Leia o feed e poste sem conta":"1. Read the feed and post with no account","2. Crie seu nick pra conversar no chat e nas salas":"2. Create your nick to chat and join rooms","3. Traga a turma pelo 📢 divulgar":"3. Bring friends with 📢 promote","⛔ mídia externa mostra seu IP ao host. proxy: ON ✅":"⛔ external media shows your IP to the host. proxy: ON ✅","desligar proxy":"disable proxy","abrir":"open","🏅 desafio da semana":"🏅 challenge of the week","Tema: Sua foto Orkut 2008 — poste uma foto (ou descreva) da sua época de Orkut (fecha domingo)":"Theme: Your 2008 Orkut photo — post a photo (or describe it) from your Orkut days (closes Sunday)","• Poste na sala #desafio sobre o tema. Cada post = 1 ponto (até 3 por dia).":"• Post in the #desafio room about the theme. Each post = 1 point (up to 3 per day).","• Volte outro dia e poste de novo: cada dia diferente = +2 pontos.":"• Come back another day and post again: each different day = +2 points.","• Gente nova chegando dá +1 pra quem já estava. Quem somar mais até domingo vence.":"• New people joining give +1 to those already here. Highest score by Sunday wins.","carregando placar...":"loading leaderboard...","carregando presença…":"loading presence…","chat público original do zunzum":"zunzum's original public chat","desafio":"challenge","Desafio semanal do zunzum: um tema novo toda semana.":"Zunzum's weekly challenge: a new theme every week.","suspenso":"suspended","logado":"logged in","💬 depoimentos":"💬 testimonials","foto de perfil (gif até 2MB):":"profile photo (gif up to 2MB):","sem efeito":"no effect","círculo neon":"neon circle","neon rosa":"pink neon","ouro":"gold","arco-íris":"rainbow","fogo":"fire","gelo":"ice","sombra":"shadow","salvar efeito":"save effect","confirmar troca":"confirm change","🚫 bloqueados":"🚫 blocked","amigos":"friends","Clima de Orkut anos 2000: comunidades, depoimentos e scraps.":"Orkut 2000s vibe: communities, testimonials and scraps.","Crie um nick com senha para conversar no bate-papo publico e em salas privadas.":"Create a nick with password to chat in the public room and private rooms.","apagar chave":"delete key","carregar dono.js do PC:":"load dono.js from this PC:","denúncia 🚨":"report 🚨","denúncias":"reports","crie seu nick grátis sem email":"create your free nick with no email","conteúdo abusivo não é listado — use termos simples":"abusive content isn't listed — use simple terms","📢 divulgação automática":"📢 automatic promotion","Seu link pessoal conta convites sozinho — quem criar conta por ele entra pro seu ranking.":"Your personal link counts invites on its own — anyone who creates an account through it joins your ranking.","📤 compartilhar":"📤 share","assinatura fixa p/ perfil":"fixed signature for profile","Precisa de texto? A IA cria, você cola nos fóruns.":"Need text? The AI writes it, you paste it on forums.","feito no zunzum 🐝 — todo texto gerado aqui já vem com seu link; cole com 1 frase de contexto, sem spam.":"made on zunzum 🐝 — all text generated here already includes your link; paste it with 1 sentence of context, no spam.","⛔ Esta página está embutida em outro site — NÃO digite sua senha aqui. Abra o oficial: https://perchance.org/zunzum":"⛔ This page is embedded in another site — do NOT type your password here. Open the official one: https://perchance.org/zunzum","1. Leia o feed sem conta e poste anonimamente.":"1. Read the feed with no account and post anonymously.","2. Crie seu nick pra conversar no chat e nas salas.":"2. Create your nick to chat in the public room and private rooms.","3. Traga a turma pelo botão 📢 divulgar no topo.":"3. Bring your friends with the 📢 promote button at the top.","4. Sala privada: combinem um código e digitem igual.":"4. Private room: agree on a code and type the same.","5. 📻 O Orkut 2.0 vem aí — enquanto não sai, o zunzum já existe: anônimo, sem email.":"5. 📻 Orkut 2.0 is coming — until then, zunzum already exists: anonymous, no email.","🎲 gerar código forte":"🎲 generate strong code","🏠 virar dono da órfã":"🏠 claim the orphan room","entre numa sala.":"join a room.","🔓 aberta":"🔓 open","pedir pra entrar":"ask to join","você está:":"you are:","entre com nick+senha a esquerda.":"log in with nick+password on the left.","🐝 ainda sem pico: quando 2+ ficarem online juntos, o horário aparece aqui":"🐝 no peak yet: when 2+ are online together, the time will show here","quando 2 ou mais pessoas estiveram online juntas pela última vez":"when 2 or more people were last online together","recorde neste navegador":"record on this browser","proibido dado pessoal real em áreas públicas (feed, chat público, depoimentos) e conteúdo abusivo em qualquer área (feed, chat, depoimentos, DM, salas). Uso conforme o Termo (faixa etária). Viu abuso? use 🚨 denunciar — cai na caixa do dono como denúncia.":"no real personal data in public areas (feed, public chat, testimonials) and no abusive content anywhere (feed, chat, testimonials, DMs, rooms). Use follows the Terms (age range). See abuse? use 🚨 report — it lands in the owner's inbox as a report.","gerar texto para divulgar em foruns":"generate text to promote on forums","notificações não lidas":"unread notifications","bichinho virtual: ovo que vira rostinho fofo":"virtual pet: an egg that hatches into a cute little face","como funciona o site":"how the site works","marcar @":"mention @","negrito":"bold","italico":"italic","sublinhado":"underline","riscado":"strikethrough","colorir":"paint","ver meus depoimentos":"see my testimonials","ver meu perfil":"view my profile","cria chave nova":"create new key","mostrar/esconder chave":"show/hide key","copiar chave":"copy key","apaga a chave deste navegador (sessão + armazenamento)":"delete this browser's key (session + storage)","convidar para o chat privado atual":"invite to the current private chat","parar de receber notificações desta pessoa":"stop receiving notifications from this person","esconder posts e mensagens desta pessoa":"hide posts and messages from this person","faça login p/ gerar seu link...":"log in to generate your link...","gera o QR do seu link pessoal (100% local, sem rede)":"generate your personal link's QR (100% local, no network)","segure p/ salvar a imagem":"long-press to save the image","abrir dj ia":"open AI DJ","tocar/pausar":"play/pause","tocar":"play","próxima (pular)":"next (skip)","repetir: desligado — clique p/ repetir a fila":"repeat: off — click to repeat the queue","tocando":"now playing","gostei — toca mais desse artista":"liked — play more by this artist","não gostei — pula e evita":"disliked — skip and avoid","pedido e fila":"requests and queue","minimizar / expandir dj ia":"minimize / expand AI DJ","mostrar no feed/chat o que tô ouvindo no dj ia":"show in feed/chat what I'm listening to on the AI DJ","clima: funk animado, lofi foco...":"vibe: upbeat funk, lofi focus...","total de visitas":"total visits","como tratar mídia: embaçar, ocultar ou ver":"how to handle media: blur, hide or show","gera código com sufixo aleatório de 16 letras/números (~82 bits) — anti-clone e anti-roubo":"generates a code with a random 16-letter/number suffix (~82 bits) — anti-clone and anti-theft","salas antigas sem dono válido: clique para assumir a titularidade":"old rooms without a valid owner: click to claim ownership","quando trancada, só entra quem você aprovar":"when locked, only people you approve can join","envia convite com o código da sala atual":"send an invite with the current room's code","copia o link que entra direto na sala":"copy the link that joins the room directly","clique para trocar seu status":"click to change your status","buscar gente por nick":"find people by nick","senha atual":"current password","nova senha (8+ letras, frase longa)":"new password (8+ letters, long phrase)","repita a nova senha":"repeat the new password","silenciar todas as notificações":"mute all notifications","conte sua ideia, bug ou denúncia...":"tell us your idea, bug or report...","por que zunzum":"why zunzum","atalhos rápidos":"quick shortcuts","procurar chats...":"search chats...","status: sem conta":"status: no account","chat: bloqueado":"chat: locked","chat com cor própria":"chat with a custom color"});
Object.assign(DES,{"— rede anonima estilo orkut":"— red anónima estilo orkut","nostalgia anos 2000 | feed livre sem conta | chat publico e privado":"nostalgia años 2000 | feed libre sin cuenta | chat público y privado","ligar/desligar som de notificação":"activar/desactivar sonido de notificaciones","modo noturno: auto / ligado / desligado":"modo nocturno: auto / activado / desactivado","termo de uso":"términos de uso","ajuda":"ayuda","bichinho":"mascota","menu":"menú","1. Leia o feed e poste sem conta":"1. Lee el feed y publica sin cuenta","2. Crie seu nick pra conversar no chat e nas salas":"2. Crea tu nick para conversar en el chat y las salas","3. Traga a turma pelo 📢 divulgar":"3. Trae a tu gente con 📢 promocionar","⛔ mídia externa mostra seu IP ao host. proxy: ON ✅":"⛔ los medios externos muestran tu IP al host. proxy: ON ✅","desligar proxy":"desactivar proxy","abrir":"abrir","🏅 desafio da semana":"🏅 desafío de la semana","Tema: Sua foto Orkut 2008 — poste uma foto (ou descreva) da sua época de Orkut (fecha domingo)":"Tema: Tu foto Orkut 2008 — publica una foto (o describe) de tu época de Orkut (cierra el domingo)","• Poste na sala #desafio sobre o tema. Cada post = 1 ponto (até 3 por dia).":"• Publica en la sala #desafio sobre el tema. Cada publicación = 1 punto (hasta 3 por día).","• Volte outro dia e poste de novo: cada dia diferente = +2 pontos.":"• Vuelve otro día y publica de nuevo: cada día distinto = +2 puntos.","• Gente nova chegando dá +1 pra quem já estava. Quem somar mais até domingo vence.":"• La gente nueva que llega da +1 a quienes ya estaban. Quien sume más hasta el domingo gana.","carregando placar...":"cargando marcador...","carregando presença…":"cargando presencia…","chat público original do zunzum":"chat público original de zunzum","desafio":"desafío","Desafio semanal do zunzum: um tema novo toda semana.":"Desafío semanal de zunzum: un tema nuevo cada semana.","suspenso":"suspendido","logado":"conectado","💬 depoimentos":"💬 testimonios","foto de perfil (gif até 2MB):":"foto de perfil (gif hasta 2MB):","sem efeito":"sin efecto","círculo neon":"círculo neón","neon rosa":"neón rosa","ouro":"oro","arco-íris":"arcoíris","fogo":"fuego","gelo":"hielo","sombra":"sombra","salvar efeito":"guardar efecto","confirmar troca":"confirmar cambio","🚫 bloqueados":"🚫 bloqueados","amigos":"amigos","Clima de Orkut anos 2000: comunidades, depoimentos e scraps.":"Clima de Orkut años 2000: comunidades, testimonios y scraps.","Crie um nick com senha para conversar no bate-papo publico e em salas privadas.":"Crea un nick con contraseña para conversar en el chat público y en las salas privadas.","apagar chave":"borrar clave","carregar dono.js do PC:":"cargar dono.js de este PC:","denúncia 🚨":"denuncia 🚨","denúncias":"denuncias","crie seu nick grátis sem email":"crea tu nick gratis sin email","conteúdo abusivo não é listado — use termos simples":"el contenido abusivo no se lista — usa términos simples","📢 divulgação automática":"📢 promoción automática","Seu link pessoal conta convites sozinho — quem criar conta por ele entra pro seu ranking.":"Tu enlace personal cuenta invitaciones solo — quien cree una cuenta por él entra en tu ranking.","📤 compartilhar":"📤 compartir","assinatura fixa p/ perfil":"firma fija para el perfil","Precisa de texto? A IA cria, você cola nos fóruns.":"¿Necesitas texto? La IA lo crea, tú lo pegas en los foros.","feito no zunzum 🐝 — todo texto gerado aqui já vem com seu link; cole com 1 frase de contexto, sem spam.":"hecho en zunzum 🐝 — todo texto generado aquí ya incluye tu enlace; pégalo con 1 frase de contexto, sin spam.","⛔ Esta página está embutida em outro site — NÃO digite sua senha aqui. Abra o oficial: https://perchance.org/zunzum":"⛔ Esta página está incrustada en otro sitio — NO escribas tu contraseña aquí. Abre la oficial: https://perchance.org/zunzum","1. Leia o feed sem conta e poste anonimamente.":"1. Lee el feed sin cuenta y publica anónimamente.","2. Crie seu nick pra conversar no chat e nas salas.":"2. Crea tu nick para conversar en el chat público y en las salas.","3. Traga a turma pelo botão 📢 divulgar no topo.":"3. Trae a tu gente con el botón 📢 promocionar de arriba.","4. Sala privada: combinem um código e digitem igual.":"4. Sala privada: acuerden un código y escríbanlo igual.","5. 📻 O Orkut 2.0 vem aí — enquanto não sai, o zunzum já existe: anônimo, sem email.":"5. 📻 Orkut 2.0 viene en camino — mientras tanto, zunzum ya existe: anónimo, sin email.","🎲 gerar código forte":"🎲 generar código fuerte","🏠 virar dono da órfã":"🏠 adueñarse de la huérfana","entre numa sala.":"entra en una sala.","🔓 aberta":"🔓 abierta","pedir pra entrar":"pedir entrar","você está:":"estás:","entre com nick+senha a esquerda.":"entra con nick+contraseña a la izquierda.","🐝 ainda sem pico: quando 2+ ficarem online juntos, o horário aparece aqui":"🐝 aún sin pico: cuando 2+ estén en línea juntos, el horario aparece aquí","quando 2 ou mais pessoas estiveram online juntas pela última vez":"cuándo 2 o más personas estuvieron en línea juntas por última vez","recorde neste navegador":"récord en este navegador","proibido dado pessoal real em áreas públicas (feed, chat público, depoimentos) e conteúdo abusivo em qualquer área (feed, chat, depoimentos, DM, salas). Uso conforme o Termo (faixa etária). Viu abuso? use 🚨 denunciar — cai na caixa do dono como denúncia.":"prohibidos datos personales reales en áreas públicas (feed, chat público, testimonios) y contenido abusivo en cualquier área (feed, chat, testimonios, DM, salas). Uso según los Términos (rango de edad). ¿Ves abuso? usa 🚨 denunciar — cae en la bandeja del dueño como denuncia.","gerar texto para divulgar em foruns":"generar texto para promocionar en foros","notificações não lidas":"notificaciones no leídas","bichinho virtual: ovo que vira rostinho fofo":"mascota virtual: huevo que se convierte en una carita linda","como funciona o site":"cómo funciona el sitio","marcar @":"mencionar @","negrito":"negrita","italico":"cursiva","sublinhado":"subrayado","riscado":"tachado","colorir":"colorear","ver meus depoimentos":"ver mis testimonios","ver meu perfil":"ver mi perfil","cria chave nova":"crear clave nueva","mostrar/esconder chave":"mostrar/ocultar clave","copiar chave":"copiar clave","apaga a chave deste navegador (sessão + armazenamento)":"borra la clave de este navegador (sesión + almacenamiento)","convidar para o chat privado atual":"invitar al chat privado actual","parar de receber notificações desta pessoa":"dejar de recibir notificaciones de esta persona","esconder posts e mensagens desta pessoa":"ocultar publicaciones y mensajes de esta persona","faça login p/ gerar seu link...":"inicia sesión para generar tu enlace...","gera o QR do seu link pessoal (100% local, sem rede)":"genera el QR de tu enlace personal (100% local, sin red)","segure p/ salvar a imagem":"mantén para guardar la imagen","abrir dj ia":"abrir DJ IA","tocar/pausar":"reproducir/pausar","tocar":"reproducir","próxima (pular)":"siguiente (saltar)","repetir: desligado — clique p/ repetir a fila":"repetir: desactivado — pulsa para repetir la cola","tocando":"sonando","gostei — toca mais desse artista":"me gusta — toca más de este artista","não gostei — pula e evita":"no me gusta — salta y evita","pedido e fila":"pedidos y cola","minimizar / expandir dj ia":"minimizar / expandir DJ IA","mostrar no feed/chat o que tô ouvindo no dj ia":"mostrar en feed/chat lo que estoy escuchando en DJ IA","clima: funk animado, lofi foco...":"ambiente: funk animado, lofi focus...","total de visitas":"visitas totales","como tratar mídia: embaçar, ocultar ou ver":"cómo tratar medios: difuminar, ocultar o ver","gera código com sufixo aleatório de 16 letras/números (~82 bits) — anti-clone e anti-roubo":"genera un código con sufijo aleatorio de 16 letras/números (~82 bits) — anti-clonación y anti-robo","salas antigas sem dono válido: clique para assumir a titularidade":"salas antiguas sin dueño válido: pulsa para asumir la titularidad","quando trancada, só entra quem você aprovar":"cuando está cerrada, solo entra quien apruebes","envia convite com o código da sala atual":"envía una invitación con el código de la sala actual","copia o link que entra direto na sala":"copia el enlace que entra directo en la sala","clique para trocar seu status":"pulsa para cambiar tu estado","buscar gente por nick":"buscar gente por nick","senha atual":"contraseña actual","nova senha (8+ letras, frase longa)":"nueva contraseña (8+ letras, frase larga)","repita a nova senha":"repite la nueva contraseña","silenciar todas as notificações":"silenciar todas las notificaciones","conte sua ideia, bug ou denúncia...":"cuenta tu idea, error o denuncia...","por que zunzum":"por qué zunzum","atalhos rápidos":"accesos rápidos","procurar chats...":"buscar chats...","status: sem conta":"estado: sin cuenta","chat: bloqueado":"chat: bloqueado","chat com cor própria":"chat con color propio"});
// Bloco 2026-11-01g (perfil: chrome que mora em SKIP_ZONE #profDepo/#profMural
// + stats/pg/owner/del — traduzido na criação via ztr, observer não entra lá).
Object.assign(DEN,{"mencionar":"mention","convidar p/ privado":"invite to private","convidar para o chat privado atual":"invite to the current private chat","parar de receber notificações desta pessoa":"stop receiving notifications from this person","esconder posts e mensagens desta pessoa":"hide posts and messages from this person","ver perfil @":"view profile @","verificando...":"checking...","carregando depoimentos...":"loading testimonials...","nenhum depoimento ainda — escreva o primeiro sem mostrar o rosto.":"no testimonials yet — write the first one without showing your face.","nenhum depoimento ainda.":"no testimonials yet.","escreva um depoimento...":"write a testimonial...","link de foto https:// (opcional)":"photo link https:// (optional)","enviar depoimento":"send testimonial","link inválido (use https:// válido)":"invalid link (use a valid https://)","aguardando sua aprovação (":"awaiting your approval (","esse é você! divulgue p/ subir 📈":"that's you! share to climb 📈","entre com nick+senha para convidar.":"log in with nick+password to invite.","entre com nick+senha para deixar depoimento.":"log in with nick+password to leave a testimonial.","membro desde":"member since","· posts:":"· posts:","· curtidas:":"· likes:","· chat:":"· chat:","· depoimentos:":"· testimonials:","· convites:":"· invites:","conteúdo de OUTRO USUÁRIO":"content from ANOTHER USER","carregar página do usuário":"load user page","conteúdo bloqueado":"content blocked","erro":"error"," — isolado, sem acesso à sua conta. golpe comum finge tela de login aqui dentro: não digite senha.":" — isolated, no access to your account. common scam fakes a login screen in here: don't type your password."," carregado (isolado, sem acesso à sua conta).":" loaded (isolated, no access to your account).","seu perfil":"your profile"," — personalize (todos veem)":" — customize (everyone sees)","preset...":"preset...","fundo":"bg","cartao":"card","texto":"text","destaque":"accent","estilo do modal:":"modal style:","estilo do modal do perfil (20 opções)":"profile modal style (20 options)","CSS extra (opcional, sem <script>)":"extra CSS (optional, no <script>)","salvar tema":"save theme","aplicar no site todo":"apply to whole site","limpar tema":"clear theme","tema salvo!":"theme saved!","aplicado no site!":"applied to site!","limpo":"cleared","perfil no Google: automático ✅":"profile on Google: automatic ✅","sua pagina":"your page"," — HTML+JS (max 8000) roda isolado p/ visitantes":" — HTML+JS (max 8000) runs isolated for visitors","salvar pagina":"save page","pagina salva!":"page saved!","⚠️ exclusão pedida — sua conta apaga em ":"⚠️ deletion requested — your account deletes on "," (30 dias). Entre de novo p/ cancelar, ou cancele aqui:":" (30 days). Log in again to cancel, or cancel here:","cancelar exclusão":"cancel deletion","padrão":"default","redondo":"round","quadrado":"square","retrô":"retro","minimal":"minimal","bolha":"bubble","moldura dupla":"double frame","cartão elevado":"elevated card","polaroid":"polaroid","jornal":"newspaper","pixel 8-bit":"8-bit pixel","fita destaque":"feature ribbon","pílula":"pill","sombra suave":"soft shadow","borda grossa":"thick border","pontilhado":"dotted","faixa no topo":"top banner","cantos cortados":"cut corners","máquina escrever":"typewriter","vitrine":"showcase","mural de recados":"message board","recados assinados: conta, anon com token ou a zunzunzinha. sem nome digitado — o que está aqui foi postado de verdade por quem mostra.":"signed messages: account, anon with token or zunzunzinha. no typed names — what's here was really posted by who it shows.","nenhum recado ainda. seja o primeiro!":"no messages yet. be the first!","recado anônimo assinado (token)":"signed anonymous message (token)","apagar recado":"delete message","⏳ apagando...":"⏳ deleting...","só o autor ou o dono do mural":"only the author or the board owner","entre com nick+senha p/ recadar":"log in with nick+password to leave a message","perfil não encontrado":"profile not found","devagar, aguarde...":"slow down, wait...","esse anon tem dono — girando...":"this anon is taken — rotating...","sem claim válido":"no valid claim","sem permissão":"no permission","conta em exclusão":"account being deleted","alvo inválido":"invalid target","escreva algo":"write something","enviando...":"sending...","recado postado!":"message posted!","o nome no mural é digitado livremente e pode ser fake — só depoimentos e DMs são assinados. confira o perfil antes de confiar.":"the name on the board is typed freely and can be fake — only testimonials and DMs are signed. check the profile before trusting.","🔍 buscar gente por nick":"🔍 find people by nick","digite parte do nick e clique num perfil p/ ver, bloquear ou desbloquear.":"type part of the nick and click a profile to view, block or unblock.","@nick...":"@nick...","buscar":"search","digite 2+ letras do nick.":"type 2+ letters of the nick.","buscando...":"searching...","erro na busca.":"search error.","devagar, tente de novo em segundos.":"slow down, try again in seconds."," encontrado(s):":" found:","sem conexão.":"offline.","ver perfil":"view profile","ver":"view","🚫 bloqueados (":"🚫 blocked (","limpar todos":"clear all","desbloquear faz voltar a aparecer":"unblocking brings them back","ninguém bloqueado. bloqueados somem do feed e dos chats p/ você.":"nobody blocked. blocked users vanish from your feed and chats.","🎨 seu nick":"🎨 your nick"," — cor, fonte e efeito (todos veem)":" — color, font & effect (everyone sees)","cor:":"color:","fonte:":"font:","efeito:":"effect:","sem cor":"no color","volta p/ cor padrão do site":"back to site default color","salvar nick":"save nick","limpar":"clear","entre com nick+senha.":"log in with nick+password.","limpando...":"clearing...","nick salvo! ✨":"nick saved! ✨","nick limpo (padrão).":"nick cleared (default).","Limpar cor, fonte e efeito do seu nick?":"Clear your nick's color, font and effect?","limpo!":"cleared!","achar usuário por nick":"find user by nick","ver lista no seu perfil":"see the list on your profile","🎧 ouvindo agora: ":"🎧 listening now: ","⏸🎧 pausou em: ":"⏸🎧 paused at: ","tocar junto":"play along","Desbloquear todo mundo (":"Unblock everyone (","convidar p/ privado atual":"invite to current private"});
Object.assign(DES,{"mencionar":"mencionar","convidar p/ privado":"invitar al privado","convidar para o chat privado atual":"invitar al chat privado actual","parar de receber notificações desta pessoa":"dejar de recibir notificaciones de esta persona","esconder posts e mensagens desta pessoa":"ocultar publicaciones y mensajes de esta persona","ver perfil @":"ver perfil @","verificando...":"verificando...","carregando depoimentos...":"cargando testimonios...","nenhum depoimento ainda — escreva o primeiro sem mostrar o rosto.":"sin testimonios aún — escribe el primero sin mostrar la cara.","nenhum depoimento ainda.":"sin testimonios aún.","escreva um depoimento...":"escribe un testimonio...","link de foto https:// (opcional)":"enlace de foto https:// (opcional)","enviar depoimento":"enviar testimonio","link inválido (use https:// válido)":"enlace inválido (usa un https:// válido)","aguardando sua aprovação (":"esperando tu aprobación (","esse é você! divulgue p/ subir 📈":"¡ese eres tú! comparte para subir 📈","entre com nick+senha para convidar.":"entra con nick+contraseña para invitar.","entre com nick+senha para deixar depoimento.":"entra con nick+contraseña para dejar un testimonio.","membro desde":"miembro desde","· posts:":"· publicaciones:","· curtidas:":"· me gusta:","· chat:":"· chat:","· depoimentos:":"· testimonios:","· convites:":"· invitaciones:","conteúdo de OUTRO USUÁRIO":"contenido de OTRO USUARIO","carregar página do usuário":"cargar página del usuario","conteúdo bloqueado":"contenido bloqueado","erro":"error"," — isolado, sem acesso à sua conta. golpe comum finge tela de login aqui dentro: não digite senha.":" — aislado, sin acceso a tu cuenta. truco común finge una pantalla de login aquí: no escribas tu contraseña."," carregado (isolado, sem acesso à sua conta).":" cargado (aislado, sin acceso a tu cuenta).","seu perfil":"tu perfil"," — personalize (todos veem)":" — personaliza (todos lo ven)","preset...":"preset...","fundo":"fondo","cartao":"tarjeta","texto":"texto","destaque":"destaque","estilo do modal:":"estilo del modal:","estilo do modal do perfil (20 opções)":"estilo del modal del perfil (20 opciones)","CSS extra (opcional, sem <script>)":"CSS extra (opcional, sin <script>)","salvar tema":"guardar tema","aplicar no site todo":"aplicar en todo el sitio","limpar tema":"borrar tema","tema salvo!":"¡tema guardado!","aplicado no site!":"¡aplicado en el sitio!","limpo":"limpio","perfil no Google: automático ✅":"perfil en Google: automático ✅","sua pagina":"tu página"," — HTML+JS (max 8000) roda isolado p/ visitantes":" — HTML+JS (máx 8000) se ejecuta aislado para visitantes","salvar pagina":"guardar página","pagina salva!":"¡página guardada!","⚠️ exclusão pedida — sua conta apaga em ":"⚠️ eliminación pedida — tu cuenta se borra el "," (30 dias). Entre de novo p/ cancelar, ou cancele aqui:":" (30 días). Entra de nuevo para cancelar, o cancela aquí:","cancelar exclusão":"cancelar eliminación","padrão":"predeterminado","redondo":"redondo","quadrado":"cuadrado","retrô":"retro","minimal":"minimal","bolha":"burbuja","moldura dupla":"marco doble","cartão elevado":"tarjeta elevada","polaroid":"polaroid","jornal":"periódico","pixel 8-bit":"píxel 8-bit","fita destaque":"cinta destacada","pílula":"píldora","sombra suave":"sombra suave","borda grossa":"borde grueso","pontilhado":"punteado","faixa no topo":"franja superior","cantos cortados":"esquinas cortadas","máquina escrever":"máquina de escribir","vitrine":"vitrina","mural de recados":"muro de mensajes","recados assinados: conta, anon com token ou a zunzunzinha. sem nome digitado — o que está aqui foi postado de verdade por quem mostra.":"mensajes firmados: cuenta, anon con token o zunzunzinha. sin nombres escritos — lo que está aquí fue publicado de verdad por quien muestra.","nenhum recado ainda. seja o primeiro!":"¡sin mensajes aún. sé el primero!","recado anônimo assinado (token)":"mensaje anónimo firmado (token)","apagar recado":"borrar mensaje","⏳ apagando...":"⏳ borrando...","só o autor ou o dono do mural":"solo el autor o el dueño del muro","entre com nick+senha p/ recadar":"entra con nick+contraseña para dejar un mensaje","perfil não encontrado":"perfil no encontrado","devagar, aguarde...":"despacito, espera...","esse anon tem dono — girando...":"este anon tiene dueño — rotando...","sem claim válido":"sin claim válido","sem permissão":"sin permiso","conta em exclusão":"cuenta en eliminación","alvo inválido":"objetivo inválido","escreva algo":"escribe algo","enviando...":"enviando...","recado postado!":"¡mensaje publicado!","o nome no mural é digitado livremente e pode ser fake — só depoimentos e DMs são assinados. confira o perfil antes de confiar.":"el nombre en el muro se escribe libremente y puede ser falso — solo testimonios y DM son firmados. revisa el perfil antes de confiar.","🔍 buscar gente por nick":"🔍 buscar gente por nick","digite parte do nick e clique num perfil p/ ver, bloquear ou desbloquear.":"escribe parte del nick y pulsa un perfil para ver, bloquear o desbloquear.","@nick...":"@nick...","buscar":"buscar","digite 2+ letras do nick.":"escribe 2+ letras del nick.","buscando...":"buscando...","erro na busca.":"error en la búsqueda.","devagar, tente de novo em segundos.":"despacito, intenta de nuevo en segundos."," encontrado(s):":" encontrados:","sem conexão.":"sin conexión.","ver perfil":"ver perfil","ver":"ver","🚫 bloqueados (":"🚫 bloqueados (","limpar todos":"borrar todos","desbloquear faz voltar a aparecer":"desbloquear los trae de vuelta","ninguém bloqueado. bloqueados somem do feed e dos chats p/ você.":"nadie bloqueado. los bloqueados desaparecen de tu feed y chats.","🎨 seu nick":"🎨 tu nick"," — cor, fonte e efeito (todos veem)":" — color, fuente y efecto (todos lo ven)","cor:":"color:","fonte:":"fuente:","efeito:":"efecto:","sem cor":"sin color","volta p/ cor padrão do site":"volver al color predeterminado del sitio","salvar nick":"guardar nick","limpar":"limpiar","entre com nick+senha.":"entra con nick+contraseña.","limpando...":"limpiando...","nick salvo! ✨":"¡nick guardado! ✨","nick limpo (padrão).":"nick limpio (predeterminado).","Limpar cor, fonte e efeito do seu nick?":"¿Limpiar color, fuente y efecto de tu nick?","limpo!":"¡limpio!","achar usuário por nick":"buscar usuario por nick","ver lista no seu perfil":"ver la lista en tu perfil","🎧 ouvindo agora: ":"🎧 escuchando ahora: ","⏸🎧 pausou em: ":"⏸🎧 pausado en: ","tocar junto":"escuchar juntos","Desbloquear todo mundo (":"Desbloquear a todos ("});
DPAT_EN.push([/aguardando sua aprovação \((\d+)\):/g,"awaiting your approval ($1):"],[/membro desde (.+) · posts: (\d+) · curtidas: (\d+) · chat: (\d+) · depoimentos: (\d+) · convites: (\d+)/g,"member since $1 · posts: $2 · likes: $3 · chat: $4 · testimonials: $5 · invites: $6"],[/^(@[A-Za-z0-9-_]+) não existe no zunzum\. Confira o link ou o nick\./,"$1 doesn't exist on zunzum. Check the link or nick."],[/conteúdo de (@[A-Za-z0-9-_]+) \(OUTRO USUÁRIO\)/g,"content from $1 (OTHER USER)"],[/entre num código do privado primeiro, depois convide (@[A-Za-z0-9-_]+)\./,"join a private code first, then invite $1."],[/(\d+) encontrado\(s\):/g,"$1 found:"],[/nenhum nick com "(.+)"\. confira a grafia\./,"no nick with \"$1\". check the spelling."],[/(.+) — HTML\/JS isolado, pode ter conteúdo estranho\. NUNCA digite sua senha do zunzum aqui dentro: o zunzum nunca pede senha dentro dessa página\. só carrega se você confiar\./,"$1 — isolated HTML/JS, may contain weird content. NEVER type your zunzum password in here: zunzum never asks for passwords inside this page. only load if you trust it."],[/(.+) — HTML\+JS \(max 8000\) roda isolado p\/ visitantes/,"$1 — HTML+JS (max 8000) runs isolated for visitors"],[/⚠️ exclusão pedida — sua conta apaga em (.+) \(30 dias\)\. Entre de novo p\/ cancelar, ou cancele aqui:/,"⚠️ deletion requested — your account deletes on $1 (30 days). Log in again to cancel, or cancel here:"]);
DPAT_ES.push([/aguardando sua aprovação \((\d+)\):/g,"esperando tu aprobación ($1):"],[/membro desde (.+) · posts: (\d+) · curtidas: (\d+) · chat: (\d+) · depoimentos: (\d+) · convites: (\d+)/g,"miembro desde $1 · publicaciones: $2 · me gusta: $3 · chat: $4 · testimonios: $5 · invitaciones: $6"],[/^(@[A-Za-z0-9-_]+) não existe no zunzum\. Confira o link ou o nick\./,"$1 no existe en zunzum. Revisa el enlace o el nick."],[/conteúdo de (@[A-Za-z0-9-_]+) \(OUTRO USUÁRIO\)/g,"contenido de $1 (OTRO USUARIO)"],[/entre num código do privado primeiro, depois convide (@[A-Za-z0-9-_]+)\./,"entra en un código privado primero, luego invita a $1."],[/(\d+) encontrado\(s\):/g,"$1 encontrados:"],[/nenhum nick com "(.+)"\. confira a grafia\./,'ningún nick con "$1". revisa la grafía.'],[/(.+) — HTML\/JS isolado, pode ter conteúdo estranho\. NUNCA digite sua senha do zunzum aqui dentro: o zunzum nunca pede senha dentro dessa página\. só carrega se você confiar\./,"$1 — HTML/JS aislado, puede tener contenido extraño. NUNCA escribas tu contraseña de zunzum aquí: zunzum nunca pide contraseña en esta página. solo carga si confías."],[/(.+) — HTML\+JS \(max 8000\) roda isolado p\/ visitantes/,"$1 — HTML+JS (máx 8000) se ejecuta aislado para visitantes"],[/⚠️ exclusão pedida — sua conta apaga em (.+) \(30 dias\)\. Entre de novo p\/ cancelar, ou cancele aqui:/,"⚠️ eliminación pedida — tu cuenta se borra el $1 (30 días). Entra de nuevo para cancelar, o cancela aquí:"]);
Object.assign(DEN,{"🚫 bloqueados":"🚫 blocked"," — some do feed e dos chats p/ você. ":" — gone from your feed and chats. ","buscar gente por nick":"find people by nick","página do usuário (isolada)":"user page (isolated)","convidar p/ privado atual":"invite to current private"});
Object.assign(DES,{"🚫 bloqueados":"🚫 bloqueados"," — some do feed e dos chats p/ você. ":" — fuera de tu feed y tus chats. ","buscar gente por nick":"buscar gente por nick","página do usuário (isolada)":"página del usuario (aislada)"});
DPAT_EN.push([/^Desbloquear todo mundo \((\d+)\)\?$/,"Unblock everyone ($1)?"]);
DPAT_ES.push([/^Desbloquear todo mundo \((\d+)\)\?$/,"¿Desbloquear a todos ($1)?"]);
Object.assign(DEN,{"esse é você! divulgue seu perfil p/ fazer amigos 📈":"that's you! share your profile to make friends 📈","abrir mensagem instantânea (em cima)":"open instant message (on top)","✅ aceitar amizade":"✅ accept friendship","aceitando...":"accepting...","⏳ pedido enviado — aguarde aceitar":"⏳ request sent — wait for acceptance","não deu: ":"failed: "});
Object.assign(DES,{"esse é você! divulgue seu perfil p/ fazer amigos 📈":"¡ese eres tú! comparte tu perfil para hacer amigos 📈","abrir mensagem instantânea (em cima)":"abrir mensaje instantáneo (arriba)","✅ aceitar amizade":"✅ aceptar amistad","aceitando...":"aceptando...","⏳ pedido enviado — aguarde aceitar":"⏳ solicitud enviada — espera la aceptación","não deu: ":"falló: "});
Object.assign(DEN,{"nenhum amigo ainda — abra um perfil e clique em adicionar aos amigos!":"no friends yet — open a profile and click add as friend!"});
Object.assign(DES,{"nenhum amigo ainda — abra um perfil e clique em adicionar aos amigos!":"sin amigos aún — abre un perfil y pulsa agregar como amigo!"});
DPAT_EN.push([/^nenhum amigo ainda — (\d+) pedido\(s\) enviado\(s\)\. abra um perfil e adicione!$/,"no friends yet — $1 request(s) sent. open a profile and add!"],[/^pedidos \((\d+)\):$/,"requests ($1):"]);
DPAT_ES.push([/^nenhum amigo ainda — (\d+) pedido\(s\) enviado\(s\)\. abra um perfil e adicione!$/,"sin amigos aún — $1 solicitud(es) enviada(s). ¡abre un perfil y agrega!"],[/^pedidos \((\d+)\):$/,"solicitudes ($1):"]);
Object.assign(DEN,{"Máquina":"Typewriter","Quadrinhos":"Comics","Cursiva":"Cursive","Fantasia":"Fantasy","Sistema":"System","0 · sem efeito":"0 · no effect","1 · neon azul":"1 · blue neon","2 · neon rosa":"2 · pink neon","3 · neon verde":"3 · green neon","4 · sombra suave":"4 · soft shadow","5 · sombra dura retrô":"5 · hard retro shadow","6 · contorno escuro":"6 · dark outline","7 · contorno claro":"7 · light outline","8 · pôr-do-sol":"8 · sunset","9 · oceano":"9 · ocean","10 · roxo-rosa":"10 · purple-pink","11 · fogo":"11 · fire","12 · gelo":"12 · ice","13 · arco-íris animado":"13 · animated rainbow","14 · arco-íris fixo":"14 · static rainbow","15 · ouro":"15 · gold","16 · prata":"16 · silver","18 · gótico":"18 · gothic","20 · pixel retrô":"20 · retro pixel","21 · máquina de escrever":"21 · typewriter","22 · chique itálico":"22 · chic italic","23 · gigante":"23 · giant","24 · espaçado":"24 · spaced","25 · sublinhado duplo":"25 · double underline","26 · brilho pulsante":"26 · pulsing glow","29 · fantasma":"29 · ghost","noite":"night","mato":"wild","roxo":"purple"});
Object.assign(DES,{"Máquina":"Máquina","Quadrinhos":"Cómics","Cursiva":"Cursiva","Fantasia":"Fantasía","Sistema":"Sistema","0 · sem efeito":"0 · sin efecto","1 · neon azul":"1 · neón azul","2 · neon rosa":"2 · neón rosa","3 · neon verde":"3 · neón verde","4 · sombra suave":"4 · sombra suave","5 · sombra dura retrô":"5 · sombra dura retro","6 · contorno escuro":"6 · contorno oscuro","7 · contorno claro":"7 · contorno claro","8 · pôr-do-sol":"8 · atardecer","9 · oceano":"9 · océano","10 · roxo-rosa":"10 · morado-rosa","11 · fogo":"11 · fuego","12 · gelo":"12 · hielo","13 · arco-íris animado":"13 · arcoíris animado","14 · arco-íris fixo":"14 · arcoíris fijo","15 · ouro":"15 · oro","16 · prata":"16 · plata","18 · gótico":"18 · gótico","20 · pixel retrô":"20 · píxel retro","21 · máquina de escrever":"21 · máquina de escribir","22 · chique itálico":"22 · chic itálica","23 · gigante":"23 · gigante","24 · espaçado":"24 · espaciado","25 · sublinhado duplo":"25 · subrayado doble","26 · brilho pulsante":"26 · brillo pulsante","29 · fantasma":"29 · fantasma","noite":"noche","mato":"campo","roxo":"morado"});
/* Bloco 2026-11-02 (dono: sino/edita ofuscado + áreas sem traduzir). Chrome de
   notificação/nodal/busca/DJ que ficava em PT no ?lang=en/es. Textos dinâmicos
   com número vão via DPAT; exatos via DEN/DES (o walker traduz title/placeholder
   e texto fora de SKIP_ZONE; dentro do .chatlog só attrs — por isso os titles
   dos botões de editar/apagar/sino precisam da chave exata aqui). */
Object.assign(DEN,{"nenhuma notificação":"no notifications","avisos (padrão: ligados):":"alerts (default: on):","limpar tudo":"clear all","notificações não lidas":"unread notifications","notificações não lidas — clique p/ ver":"unread notifications — click to see","silenciar todas as notificações":"mute all notifications","avisos de feed LIGADOS — clique p/ desligar":"feed alerts ON — click to turn off","avisos de feed DESLIGADOS — clique p/ ligar":"feed alerts OFF — click to turn on","avisos de chat público LIGADOS — clique p/ desligar":"public-chat alerts ON — click to turn off","avisos de chat público DESLIGADOS — clique p/ ligar":"public-chat alerts OFF — click to turn on","avisos de privado LIGADOS — clique p/ desligar":"private alerts ON — click to turn off","avisos de privado DESLIGADOS — clique p/ ligar":"private alerts OFF — click to turn on","novo post no feed":"new post in the feed","nova mensagem no chat":"new message in the chat","nova mensagem privada":"new private message","convite p/ privado":"private invite","novo depoimento":"new testimonial","novo recado no mural":"new board message","alguém te convidou p/ o privado — toque p/ abrir":"someone invited you to private — tap to open","alguém deixou depoimento p/ você — toque p/ ver":"someone left you a testimonial — tap to see","toque p/ abrir o zunzum":"tap to open zunzum","silenciar":"mute","ativar":"unmute","avisos":"alerts","silenciado":"muted","editar":"edit","apagar":"delete","fechar (o nodal continua existindo até expirar)":"close (the nodal keeps existing until it expires)","não apagou (sem permissão ainda)":"didn't delete (no permission yet)","sem permissão ainda — aguarde expirar ou rode o SQL do dono":"no permission yet — wait for expiry or run the owner's SQL","sem servidor (salve o generator p/ usar nodais)":"no server (save the generator to use nodals)","renovando sessão...":"renewing session...","apagando...":"deleting...","baixando foto...":"downloading photo...","não baixou":"didn't download","imagem muito grande (máx 15MB)":"image too big (max 15MB)","Não consegui analisar a foto. Tente nome ou nick.":"Couldn't analyze the photo. Try a name or nick.","procurando foto igual na web...":"looking for the same photo on the web...","analisando foto...":"analyzing photo...","vendo onde a foto aparece...":"checking where the photo appears...","verificando páginas...":"checking pages...","buscando fóruns...":"searching forums...","buscando fotos e vídeos...":"searching photos & videos...","carregando youtube...":"loading youtube...","achando som...":"finding sound...","não achei nada — toque de novo pra tentar":"found nothing — tap again to retry","falhou — toque de novo pra tentar":"failed — tap again to retry","Fechar":"Close","fechar dj ia":"close ai dj","abrir dj ia":"open ai dj"});
Object.assign(DES,{"nenhuma notificação":"ninguna notificación","avisos (padrão: ligados):":"avisos (por defecto: activados):","limpar tudo":"borrar todo","notificações não lidas":"notificaciones no leídas","notificações não lidas — clique p/ ver":"notificaciones no leídas — pulsa para ver","silenciar todas as notificações":"silenciar todas las notificaciones","avisos de feed LIGADOS — clique p/ desligar":"avisos del feed ACTIVADOS — pulsa para desactivar","avisos de feed DESLIGADOS — clique p/ ligar":"avisos del feed DESACTIVADOS — pulsa para activar","avisos de chat público LIGADOS — clique p/ desligar":"avisos del chat público ACTIVADOS — pulsa para desactivar","avisos de chat público DESLIGADOS — clique p/ ligar":"avisos del chat público DESACTIVADOS — pulsa para activar","avisos de privado LIGADOS — clique p/ desligar":"avisos del privado ACTIVADOS — pulsa para desactivar","avisos de privado DESLIGADOS — clique p/ ligar":"avisos del privado DESACTIVADOS — pulsa para activar","novo post no feed":"nueva publicación en el feed","nova mensagem no chat":"nuevo mensaje en el chat","nova mensagem privada":"nuevo mensaje privado","convite p/ privado":"invitación al privado","novo depoimento":"nuevo testimonio","novo recado no mural":"nuevo mensaje en el muro","alguém te convidou p/ o privado — toque p/ abrir":"alguien te invitó al privado — toca para abrir","alguém deixou depoimento p/ você — toque p/ ver":"alguien te dejó un testimonio — toca para ver","toque p/ abrir o zunzum":"toca para abrir zunzum","silenciar":"silenciar","ativar":"activar","avisos":"avisos","silenciado":"silenciado","editar":"editar","apagar":"borrar","fechar (o nodal continua existindo até expirar)":"cerrar (el nodal sigue existiendo hasta expirar)","não apagou (sem permissão ainda)":"no se borró (aún sin permiso)","sem permissão ainda — aguarde expirar ou rode o SQL do dono":"aún sin permiso — espera a que expire o ejecuta el SQL del dueño","sem servidor (salve o generator p/ usar nodais)":"sin servidor (guarda el generador para usar nodales)","renovando sessão...":"renovando sesión...","apagando...":"borrando...","baixando foto...":"descargando foto...","não baixou":"no se descargó","imagem muito grande (máx 15MB)":"imagen muy grande (máx 15 MB)","Não consegui analisar a foto. Tente nome ou nick.":"No pude analizar la foto. Prueba con un nombre o nick.","procurando foto igual na web...":"buscando la misma foto en la web...","analisando foto...":"analizando foto...","vendo onde a foto aparece...":"viendo dónde aparece la foto...","verificando páginas...":"verificando páginas...","buscando fóruns...":"buscando foros...","buscando fotos e vídeos...":"buscando fotos y vídeos...","carregando youtube...":"cargando youtube...","achando som...":"buscando sonido...","não achei nada — toque de novo pra tentar":"no encontré nada — toca de nuevo para intentar","falhou — toque de novo pra tentar":"falló — toca de nuevo para intentar","Fechar":"Cerrar","fechar dj ia":"cerrar dj ia","abrir dj ia":"abrir dj ia"});
DPAT_EN.push([/^não lidas \((\d+)\):$/,"unread ($1):"],[/^ver (feed|chat público|privado|convites|depoimentos|mural) \((\d+)\)$/,"see $1 ($2)"],[/^abrir nodal temporário #(.+)$/,"open temporary nodal #$1"],[/^(\d+) (feed|chat público|privado|convites|depoimentos|mural)$/,"$1 $2"]);
DPAT_ES.push([/^não lidas \((\d+)\):$/,"no leídas ($1):"],[/^ver (feed|chat público|privado|convites|depoimentos|mural) \((\d+)\)$/,"ver $1 ($2)"],[/^abrir nodal temporário #(.+)$/,"abrir nodal temporal #$1"],[/^(\d+) (feed|chat público|privado|convites|depoimentos|mural)$/,"$1 $2"]);
// Bloco 2026-11-02b (dono: tradução funciona, mas muito chrome ficou em PT —
// varredura EN do DOM achou resíduos em desafio/gifmoji/divulgar/djsync/
// music/zunden, labels dos 8 gif-emoji e botões dentro de zona excluída.
// Estáticos via dicionário (observer cobre criação); textContent reescrito
// em cima de nó existente NÃO passa pelo observer (só childList) — esses
// vão com tr() no call site; dinâmicos com número/track via DPAT).
// Bloco 2026-11-02c (display de gênero do DJ: o dado segue em PT em S.req e
// dataset.g; só o rótulo visível traduz — "Eletrônica" era o único gênero com
// nome diferente em EN/ES; os demais são iguais nos 3 idiomas).
Object.assign(DEN,{
"Eletrônica":"Electronic",
"Seu link ainda não trouxe ninguém — compartilhe e volte aqui pra ver o placar.":"Your link hasn't brought anyone yet — share it and come back here to see the leaderboard."
});
Object.assign(DES,{
"Eletrônica":"Electrónica",
"Seu link ainda não trouxe ninguém — compartilhe e volte aqui pra ver o placar.":"Tu enlace aún no trajo a nadie — comparte y vuelve aquí para ver el marcador."
});
Object.assign(DEN,{
"divulgar":"promote",
"🚨 denunciar":"🚨 report",
"denunciar — vai para a caixa do dono como denúncia":"report — goes to the owner's inbox as a report",
"Participe na sala":"Join the room ",
"Ninguém pontuou ainda esta semana — seu post pode ser o primeiro.":"Nobody scored yet this week — your post could be the first.",
"Ninguém pontuou ainda — seu post pode ser o primeiro.":"Nobody scored yet — your post could be the first.",
"A sala #desafio ainda não existe — seja o primeiro a abrir!":"The #desafio room doesn't exist yet — be the first to open it!",
"Entre com seu nick para abrir a sala e participar.":"Log in with your nick to open the room and join.",
"participar":"join",
"entendi":"got it",
"é só apertar criar 👆":"just hit create 👆",
"ir para a sala do desafio (sem recarregar)":"go to the challenge room (no reload)",
"ir para a sala (sem recarregar)":"go to the room (no reload)",
"abrir a sala #desafio":"open the #desafio room",
"Abra a aba de chats e crie a sala chamada desafio.":"Open the chats tab and create the room called desafio.",
"GIF · galera":"GIF · community",
"GIF da galera":"community GIF",
"GIF da galera ·":"community GIF ·",
"✨ animados":"✨ animated",
"dançando":"dancing",
"festa":"party",
"coração":"heart",
"fogo":"fire",
"estrela":"star",
"fantasma":"ghost",
"gatinho":"kitten",
"joinha":"thumbs up",
"nenhuma mensagem ainda — diga oi sem mostrar o rosto! 👋":"no messages yet — say hi without showing your face! 👋","nenhuma mensagem ainda — diga oi! 👋":"no messages yet — say hi! 👋",
"descreva o motivo e envie - cai como denuncia p/ o dono.":"describe the reason and send — it lands as a report for the owner.",
"onde postar: grupos do Facebook de divulgação, Lemmy BR, servidores Discord com canal #divulgação, grupos Telegram/WhatsApp de amizade. Dica: não faça spam — adapte o texto e participe da conversa.":"where to post: Facebook promo groups, Lemmy BR, Discord servers with a #divulgação channel, Telegram/WhatsApp friendship groups. Tip: don't spam — adapt the text and join the conversation.",
"feito no zunzum 🐝 — todo texto gerado aqui já vem com seu link; cole com 1 frase de contexto, sem spam.":"made on zunzum 🐝 — all text generated here already includes your link; paste with 1 line of context, no spam.",
"valeu por compartilhar! 🚀":"thanks for sharing! 🚀",
"texto copiado — cole no whatsapp/status 👍":"text copied — paste on whatsapp/status 👍",
"abrindo whatsapp...":"opening whatsapp...",
"abrindo telegram...":"opening telegram...",
"faça login p/ gerar seu QR":"log in to generate your QR",
"gerando QR... ⏳":"generating QR... ⏳",
"segure a imagem p/ salvar e cole no perfil/status 👍":"long-press the image to save and paste on your profile/status 👍",
"QR indisponível — copie o link":"QR unavailable — copy the link",
"cota de IA de hoje esgotada — tente amanhã.":"today's AI quota is out — try tomorrow.",
"Tente de novo em segundos.":"Try again in a few seconds.",
"Falhou — tente de novo em segundos.":"Failed — try again in a few seconds.",
"texto copiado! cole no forum 👍":"text copied! paste on the forum 👍",
"gerando... ⏳":"generating... ⏳",
"copiado!":"copied!",
"link pessoal copiado! ✅":"personal link copied! ✅",
"Faça login com nick+senha para ganhar seu link pessoal.":"Log in with nick+password to get your personal link.",
"Você já trouxe ":"You already brought ",
" pessoa":" person",
" pessoas":" people",
"! Continue compartilhando 🚀":"! Keep sharing 🚀",
"🏆 top divulgadores: ":"🏆 top promoters: ",
"Você foi convidado por @":"You were invited by @",
" 🎉 crie seu nick e entre pro zunzum! ":" 🎉 create your nick and join zunzum! ",
"criar meu nick":"create my nick",
"entre com nick+senha p/ mostrar o que você tá ouvindo":"log in with nick+password to show what you're listening to",
"salve o generator p/ mostrar o que tá ouvindo":"save the generator to show what you're hearing",
"mostrar no feed/chat o que tô ouvindo no dj ia":"show on feed/chat what I'm hearing on the AI DJ",
"mostrar o que tô ouvindo":"show what I'm hearing",
"entre com nick+senha p/ mostrar o que você tá ouvindo 📡":"log in with nick+password to show what you're listening to 📡",
"salve o generator p/ mostrar o que tá ouvindo":"save the generator to show what you're hearing",
"📡 agora o feed e o chat veem o que você tá ouvindo 🎧":"📡 now the feed and chat see what you're listening to 🎧",
"📡 desligado — ninguém mais vê sua música":"📡 off — nobody sees your music anymore",
"abelhinha zunzum — logo da rede social anonima estilo orkut nostálgico anos 2000":"zunzum bee — nostalgic orkut-style anonymous social network logo",
"repetindo SÓ esta faixa — clique p/ desligar":"repeating ONLY this track — click to turn off",
"repetindo a fila toda — clique p/ repetir só a faixa":"repeating the whole queue — click to repeat just the track",
"repetir: desligado — clique p/ repetir a fila":"repeat: off — click to repeat the queue",
"Anos 2000":"2000s",
"🔍 pesquisar gif...":"🔍 search gif...",
"pesquisar gif da galera":"search community gifs",
"pequenos e comprimidos":"small and compressed",
"📁 criar de arquivo":"📁 create from file",
"🔗 criar de link":"🔗 create from link",
"nenhum ainda — envie um gif e toque em ✨ emoji!":"none yet — send a gif and tap ✨ emoji!",
"toca a mesma música no mesmo ponto":"plays the same song at the same point",
"segue cada troca de música e corrige o tempo sozinho":"follows every song change and fixes the timing on its own",
"✓ seguindo":"✓ following",
"seguir":"follow",
"parar":"stop",
"dj ia ainda carregando... tente de novo em segundos":"AI DJ still loading... try again in a few seconds",
"não consegui tocar essa faixa":"couldn't play that track",
"não consegui sincronizar":"couldn't sync",
"nada tocando":"nothing playing",
"clique p/ tocar junto":"click to play along",
"cole o link https:// do GIF:":"paste the GIF's https:// link:"
});
Object.assign(DES,{
"divulgar":"promocionar",
"🚨 denunciar":"🚨 denunciar",
"denunciar — vai para a caixa do dono como denúncia":"denunciar — va a la bandeja del dueño como denuncia",
"Participe na sala":"Entra a la sala ",
"Ninguém pontuou ainda esta semana — seu post pode ser o primeiro.":"Nadie puntuó aún esta semana — tu publicación podría ser la primera.",
"Ninguém pontuou ainda — seu post pode ser o primeiro.":"Nadie puntuó aún — tu publicación podría ser la primera.",
"A sala #desafio ainda não existe — seja o primeiro a abrir!":"¡La sala #desafio aún no existe — sé el primero en abrirla!",
"Entre com seu nick para abrir a sala e participar.":"Entra con tu nick para abrir la sala y participar.",
"participar":"participar",
"entendi":"entendido",
"é só apertar criar 👆":"solo pulsa crear 👆",
"ir para a sala do desafio (sem recarregar)":"ir a la sala del desafío (sin recargar)",
"ir para a sala (sem recarregar)":"ir a la sala (sin recargar)",
"abrir a sala #desafio":"abrir la sala #desafio",
"Abra a aba de chats e crie a sala chamada desafio.":"Abre la pestaña de chats y crea la sala llamada desafio.",
"GIF · galera":"GIF · gente",
"GIF da galera":"GIF de la gente",
"GIF da galera ·":"GIF de la gente ·",
"✨ animados":"✨ animados",
"dançando":"bailando",
"festa":"fiesta",
"coração":"corazón",
"fogo":"fuego",
"estrela":"estrella",
"fantasma":"fantasma",
"gatinho":"gatito",
"joinha":"pulgar arriba",
"nenhuma mensagem ainda — diga oi sem mostrar o rosto! 👋":"sin mensajes aún — ¡saluda sin mostrar la cara! 👋","nenhuma mensagem ainda — diga oi! 👋":"sin mensajes aún — ¡di hola! 👋",
"descreva o motivo e envie - cai como denuncia p/ o dono.":"describe el motivo y envía — llega como denuncia para el dueño.",
"onde postar: grupos do Facebook de divulgação, Lemmy BR, servidores Discord com canal #divulgação, grupos Telegram/WhatsApp de amizade. Dica: não faça spam — adapte o texto e participe da conversa.":"dónde publicar: grupos de Facebook de divulgación, Lemmy BR, servidores Discord con canal #divulgação, grupos Telegram/WhatsApp de amistad. Consejo: no hagas spam — adapta el texto y participa en la conversación.",
"feito no zunzum 🐝 — todo texto gerado aqui já vem com seu link; cole com 1 frase de contexto, sem spam.":"hecho en zunzum 🐝 — todo el texto generado aquí ya incluye tu enlace; pégalo con 1 línea de contexto, sin spam.",
"valeu por compartilhar! 🚀":"¡gracias por compartir! 🚀",
"texto copiado — cole no whatsapp/status 👍":"texto copiado — pégalo en whatsapp/estado 👍",
"abrindo whatsapp...":"abriendo whatsapp...",
"abrindo telegram...":"abriendo telegram...",
"faça login p/ gerar seu QR":"entra para generar tu QR",
"gerando QR... ⏳":"generando QR... ⏳",
"segure a imagem p/ salvar e cole no perfil/status 👍":"mantén la imagen para guardar y pégala en tu perfil/estado 👍",
"QR indisponível — copie o link":"QR no disponible — copia el enlace",
"cota de IA de hoje esgotada — tente amanhã.":"cuota de IA de hoy agotada — intenta mañana.",
"Tente de novo em segundos.":"Intenta de nuevo en unos segundos.",
"Falhou — tente de novo em segundos.":"Falló — intenta de nuevo en unos segundos.",
"texto copiado! cole no forum 👍":"¡texto copiado! pégalo en el foro 👍",
"gerando... ⏳":"generando... ⏳",
"copiado!":"¡copiado!",
"link pessoal copiado! ✅":"¡enlace personal copiado! ✅",
"Faça login com nick+senha para ganhar seu link pessoal.":"Entra con nick+contraseña para ganar tu enlace personal.",
"Você já trouxe ":"Ya trajiste ",
" pessoa":" persona",
" pessoas":" personas",
"! Continue compartilhando 🚀":" — ¡sigue compartiendo! 🚀",
"🏆 top divulgadores: ":"🏆 top divulgadores: ",
"Você foi convidado por @":"Te invitó @",
" 🎉 crie seu nick e entre pro zunzum! ":" 🎉 ¡crea tu nick y entra a zunzum! ",
"criar meu nick":"crear mi nick",
"entre com nick+senha p/ mostrar o que você tá ouvindo":"entra con nick+contraseña para mostrar lo que estás oyendo",
"salve o generator p/ mostrar o que tá ouvindo":"guarda el generator para mostrar lo que oyes",
"mostrar no feed/chat o que tô ouvindo no dj ia":"mostrar en feed/chat lo que oigo en el DJ IA",
"mostrar o que tô ouvindo":"mostrar lo que oigo",
"entre com nick+senha p/ mostrar o que você tá ouvindo 📡":"entra con nick+contraseña para mostrar lo que estás oyendo 📡",
"salve o generator p/ mostrar o que tá ouvindo":"guarda el generator para mostrar lo que oyes",
"📡 agora o feed e o chat veem o que você tá ouvindo 🎧":"📡 ahora el feed y el chat ven lo que estás oyendo 🎧",
"📡 desligado — ninguém mais vê sua música":"📡 apagado — nadie más ve tu música",
"abelhinha zunzum — logo da rede social anonima estilo orkut nostálgico anos 2000":"abejita zunzum — logo de la red social anónima estilo orkut nostálgico años 2000",
"repetindo SÓ esta faixa — clique p/ desligar":"repitiendo SOLO esta pista — pulsa para apagar",
"repetindo a fila toda — clique p/ repetir só a faixa":"repitiendo toda la cola — pulsa para repetir solo la pista",
"repetir: desligado — clique p/ repetir a fila":"repetir: apagado — pulsa para repetir la cola",
"Anos 2000":"Años 2000",
"🔍 pesquisar gif...":"🔍 buscar gif...",
"pesquisar gif da galera":"buscar gifs de la gente",
"pequenos e comprimidos":"pequeños y comprimidos",
"📁 criar de arquivo":"📁 crear de archivo",
"🔗 criar de link":"🔗 crear de enlace",
"nenhum ainda — envie um gif e toque em ✨ emoji!":"nada aún — ¡envía un gif y toca ✨ emoji!",
"toca a mesma música no mesmo ponto":"reproduce la misma canción en el mismo punto",
"segue cada troca de música e corrige o tempo sozinho":"sigue cada cambio de canción y corrige el tiempo solo",
"✓ seguindo":"✓ siguiendo",
"seguir":"seguir",
"parar":"detener",
"dj ia ainda carregando... tente de novo em segundos":"DJ IA aún cargando... intenta de nuevo en unos segundos",
"não consegui tocar essa faixa":"no pude reproducir esa pista",
"não consegui sincronizar":"no pude sincronizar",
"nada tocando":"nada sonando",
"clique p/ tocar junto":"pulsa para tocar juntos",
"cole o link https:// do GIF:":"pega el enlace https:// del GIF:"
});
DPAT_EN.push([/^Tema: (.+) \(fecha domingo\)$/,"Theme: $1 (closes Sunday)"],[/^(\d+)º (@[A-Za-z0-9-_]+) — (\d+) pts \((\d+) posts · (\d+) dias\)$/,"$1. $2 — $3 pts ($4 posts · $5 days)"],[/^(\d+)º (@[A-Za-z0-9-_]+) — (\d+) pts \((\d+) posts · (\d+) dias · \+(\d+) chegada\)$/,"$1. $2 — $3 pts ($4 posts · $5 days · +$6 newcomer bonus)"],[/^(\d+)º (@[A-Za-z0-9-_]+) \((\d+)\)$/,"$1. $2 ($3)"],[/^(\d+) de (\d+)$/,"$1 of $2"],[/^mostrando no feed\/chat: (.+) — clique p\/ desligar$/,"showing on feed/chat: $1 — click to turn off"],[/^play Anos 2000$/,"play 2000s"],[/^@([A-Za-z0-9-_]+) não tá compartilhando agora$/,"@$1 is not sharing right now"],[/^🎧 tocando junto com @([^:]+): (.*) \(seguindo ✓\)$/,"🎧 playing along with @$1: $2 (following ✓)"],[/^🎧 tocando junto com @([^:]+): (.*)$/,"🎧 playing along with @$1: $2"],[/^@([A-Za-z0-9-_]+) ouvindo: (.+) — clique p\/ tocar junto$/,"@$1 listening: $2 — click to play along"],[/^🎧 ouvindo agora \((\d+)\):$/,"🎧 listening now ($1):"],[/^🎧 seguindo @([^:]+): (.*)$/,"🎧 following @$1: $2"]);
DPAT_ES.push([/^Tema: (.+) \(fecha domingo\)$/,"Tema: $1 (cierra el domingo)"],[/^(\d+)º (@[A-Za-z0-9-_]+) — (\d+) pts \((\d+) posts · (\d+) dias\)$/,"$1.º $2 — $3 pts ($4 publicaciones · $5 días)"],[/^(\d+)º (@[A-Za-z0-9-_]+) — (\d+) pts \((\d+) posts · (\d+) dias · \+(\d+) chegada\)$/,"$1.º $2 — $3 pts ($4 publicaciones · $5 días · +$6 bonus por llegada)"],[/^(\d+)º (@[A-Za-z0-9-_]+) \((\d+)\)$/,"$1.º $2 ($3)"],[/^mostrando no feed\/chat: (.+) — clique p\/ desligar$/,"mostrando en feed/chat: $1 — pulsa para desactivar"],[/^reproducir Anos 2000$/,"reproducir Años 2000"],[/^@([A-Za-z0-9-_]+) não tá compartilhando agora$/,"@$1 no está compartiendo ahora"],[/^🎧 tocando junto com @([^:]+): (.*) \(seguindo ✓\)$/,"🎧 tocando junto con @$1: $2 (siguiendo ✓)"],[/^🎧 tocando junto com @([^:]+): (.*)$/,"🎧 tocando junto con @$1: $2"],[/^@([A-Za-z0-9-_]+) ouvindo: (.+) — clique p\/ tocar junto$/,"@$1 escuchando: $2 — pulsa para tocar juntos"],[/^🎧 ouvindo agora \((\d+)\):$/,"🎧 escuchando ahora ($1):"],[/^🎧 seguindo @([^:]+): (.*)$/,"🎧 siguiendo a @$1: $2"]);
// Bloco 2026-11-06 (tour de boas-vindas: slides, CTAs, spot e SVG — traduzido
// na criação via tr() no tour.js; o observer não cobre innerHTML recomposto
// nem textContent reescrito em nó existente).
Object.assign(DEN,{
"👋 bem-vindo ao zunzum!":"👋 welcome to zunzum!",
"A rede com clima de <b>Orkut anos 2000</b>: feed, comunidades, depoimentos e bate-papo. <b>Sem email, grátis</b> e com carinha retrô. Passe as setas 👉 e veja como funciona.":"The network with a <b>2000s Orkut</b> vibe: feed, communities, testimonials and chat. <b>No email, free</b> and with a retro look. Tap the arrows 👉 to see how it works.",
"📰 feed livre, sem conta":"📰 free feed, no account",
"Dá pra <b>postar e ler o feed sem criar conta</b> — rapidinho, anônimo, sem mostrar o rosto. Escreva, mande foto ou link e pronto. É o mural da galera.":"You can <b>post and read the feed with no account</b> — quick, anonymous, no face shown. Write, send a photo or link and done. It's everyone's wall.","Dá pra <b>postar e ler o feed sem criar conta</b> — rapidinho, anônimo. Escreva, mande foto ou link e pronto. É o mural da galera.":"You can <b>post and read the feed with no account</b> — quick and anonymous. Write, send a photo or link and done. It's everyone's wall.",
"ver o feed":"see the feed",
"💬 chat público #geral":"💬 public chat #geral",
"O <b>bate-papo público</b> é a sala da galera: chegue, diga oi e converse ao vivo sem mostrar o rosto. Dá pra criar <b>salas públicas</b> e <b>privadas por código</b> também.":"The <b>public chat</b> is everyone's room: come in, say hi and chat live without showing your face. You can also create <b>public rooms</b> and <b>private ones with a code</b>.","O <b>bate-papo público</b> é a sala da galera: chegue, diga oi e converse ao vivo. Dá pra criar <b>salas públicas</b> e <b>privadas por código</b> também.":"The <b>public chat</b> is everyone's room: come in, say hi and chat live. You can also create <b>public rooms</b> and <b>private ones with a code</b>.",
"abrir o chat":"open the chat",
"⋮ menu do topo (no celular)":"⋮ top menu (on mobile)",
"No <b>computador</b> os botões do topo ficam à mostra; no <b>celular</b> eles moram no <b>⋮</b> — toque nele pra abrir bichinho, buscar, divulgar e ajuda. <b>Botão novo? Cai no ⋮ sozinho</b>, sem apertar nada. 👌":"On <b>desktop</b> the top buttons are out in the open; on <b>mobile</b> they live under <b>⋮</b> — tap it to open pet, search, promote and help. <b>New button? It lands in ⋮ by itself</b>, nothing to set up. 👌",
"ver o menu ⋮":"see the ⋮ menu",
"👤 crie sua conta: só nick + senha":"👤 create your account: just nick + password",
"Conta aqui é moleza: <b>nick + senha, sem email</b>. Com ela você conversa no chat, ganha perfil próprio e desbloqueia o resto 👇":"An account here is easy: <b>nick + password, no email</b>. With it you can chat, get your own profile and unlock the rest 👇",
"🔓 com conta: DM, depoimento e mural":"🔓 with an account: DM, testimonials and scrapbook",
"Logado você pode mandar <b>DM privada</b> p/ os amigos, <b>escrever e receber depoimentos</b> e deixar <b>scraps no mural</b> dos perfis — igualzinho ao Orkut, ache sua turma.":"Logged in you can send <b>private DMs</b> to friends, <b>write and receive testimonials</b> and leave <b>scraps on profiles' boards</b> — just like Orkut, find your gang.","Logado você pode mandar <b>DM privada</b> p/ os amigos, <b>escrever e receber depoimentos</b> e deixar <b>scraps no mural</b> dos perfis — igualzinho ao Orkut.":"Logged in you can send <b>private DMs</b> to friends, <b>write and receive testimonials</b> and leave <b>scraps on profiles' boards</b> — just like Orkut.",
"🎨 personalize seu perfil":"🎨 customize your profile",
"Foto, descrição, cores: seu <b>@nick vira sua casinha</b> no zunzum. Dá pra divulgar seu link e chamar os amigos. Bora? 💛":"Photo, bio, colors: your <b>@nick becomes your little home</b> on zunzum. Promote your link and invite friends. Let's go? 💛",
"começar 🎉":"let's go 🎉",
"slide anterior":"previous slide",
"próximo slide":"next slide",
"ir para o slide":"go to slide",
"não mostrar de novo":"don't show again",
"como funciona o zunzum":"how zunzum works",
"como funciona o site":"how the site works",
"aqui":"here",
"postar e ler aqui":"post and read here",
"chat público aqui":"public chat here",
"menu ⋮ aqui":"⋮ menu here",
"aba 📰 Feed → caixa postar":"📰 Feed tab → post box",
"aba 💬 Chats → sala #geral":"💬 Chats tab → #geral room",
"aba 👤 Conta → criar nick":"👤 Account tab → create nick",
"topo → botão ⋮":"top → ⋮ button",
"oi gente! 👋":"hi everyone! 👋",
"opa, cheguei!":"hey, I'm here!",
"nick + senha":"nick + password"
});
Object.assign(DES,{
"👋 bem-vindo ao zunzum!":"👋 ¡bienvenido a zunzum!",
"A rede com clima de <b>Orkut anos 2000</b>: feed, comunidades, depoimentos e bate-papo. <b>Sem email, grátis</b> e com carinha retrô. Passe as setas 👉 e veja como funciona.":"La red con ambiente de <b>Orkut años 2000</b>: feed, comunidades, testimonios y chat. <b>Sin correo, gratis</b> y con carita retro. Pasa las flechas 👉 y mira cómo funciona.",
"📰 feed livre, sem conta":"📰 feed libre, sin cuenta",
"Dá pra <b>postar e ler o feed sem criar conta</b> — rapidinho, anônimo, sem mostrar o rosto. Escreva, mande foto ou link e pronto. É o mural da galera.":"Puedes <b>publicar y leer el feed sin crear cuenta</b> — rapidito, anónimo, sin mostrar la cara. Escribe, manda foto o enlace y listo. Es el mural de la gente.","Dá pra <b>postar e ler o feed sem criar conta</b> — rapidinho, anônimo. Escreva, mande foto ou link e pronto. É o mural da galera.":"Puedes <b>publicar y leer el feed sin crear cuenta</b> — rapidito, anónimo. Escribe, manda foto o enlace y listo. Es el mural de la gente.",
"ver o feed":"ver el feed",
"💬 chat público #geral":"💬 chat público #geral",
"O <b>bate-papo público</b> é a sala da galera: chegue, diga oi e converse ao vivo sem mostrar o rosto. Dá pra criar <b>salas públicas</b> e <b>privadas por código</b> também.":"El <b>chat público</b> es la sala de la gente: llega, saluda y conversa en vivo sin mostrar la cara. También puedes crear <b>salas públicas</b> y <b>privadas con código</b>.","O <b>bate-papo público</b> é a sala da galera: chegue, diga oi e converse ao vivo. Dá pra criar <b>salas públicas</b> e <b>privadas por código</b> também.":"El <b>chat público</b> es la sala de la gente: llega, saluda y conversa en vivo. También puedes crear <b>salas públicas</b> y <b>privadas con código</b>.",
"abrir o chat":"abrir el chat",
"⋮ menu do topo (no celular)":"⋮ menú superior (en el móvil)",
"No <b>computador</b> os botões do topo ficam à mostra; no <b>celular</b> eles moram no <b>⋮</b> — toque nele pra abrir bichinho, buscar, divulgar e ajuda. <b>Botão novo? Cai no ⋮ sozinho</b>, sem apertar nada. 👌":"En la <b>computadora</b> los botones superiores están a la vista; en el <b>móvil</b> viven en el <b>⋮</b> — tócalo para abrir mascota, buscar, promocionar y ayuda. <b>¿Botón nuevo? Cae en ⋮ solo</b>, sin tocar nada. 👌",
"ver o menu ⋮":"ver el menú ⋮",
"👤 crie sua conta: só nick + senha":"👤 crea tu cuenta: solo nick + contraseña",
"Conta aqui é moleza: <b>nick + senha, sem email</b>. Com ela você conversa no chat, ganha perfil próprio e desbloqueia o resto 👇":"La cuenta aquí es fácil: <b>nick + contraseña, sin correo</b>. Con ella conversas en el chat, tienes perfil propio y desbloqueas el resto 👇",
"🔓 com conta: DM, depoimento e mural":"🔓 con cuenta: DM, testimonios y tablón",
"Logado você pode mandar <b>DM privada</b> p/ os amigos, <b>escrever e receber depoimentos</b> e deixar <b>scraps no mural</b> dos perfis — igualzinho ao Orkut, ache sua turma.":"Conectado puedes mandar <b>DM privados</b> a los amigos, <b>escribir y recibir testimonios</b> y dejar <b>mensajes en el tablón</b> de los perfiles — igualito que Orkut, encuentra a tu gente.","Logado você pode mandar <b>DM privada</b> p/ os amigos, <b>escrever e receber depoimentos</b> e deixar <b>scraps no mural</b> dos perfis — igualzinho ao Orkut.":"Conectado puedes mandar <b>DM privados</b> a los amigos, <b>escribir y recibir testimonios</b> y dejar <b>mensajes en el tablón</b> de los perfiles — igualito que Orkut.",
"🎨 personalize seu perfil":"🎨 personaliza tu perfil",
"Foto, descrição, cores: seu <b>@nick vira sua casinha</b> no zunzum. Dá pra divulgar seu link e chamar os amigos. Bora? 💛":"Foto, descripción, colores: tu <b>@nick se vuelve tu casita</b> en zunzum. Promociona tu enlace e invita a tus amigos. ¿Vamos? 💛",
"começar 🎉":"empezar 🎉",
"slide anterior":"diapositiva anterior",
"próximo slide":"diapositiva siguiente",
"ir para o slide":"ir a la diapositiva",
"não mostrar de novo":"no mostrar de nuevo",
"como funciona o zunzum":"cómo funciona zunzum",
"como funciona o site":"cómo funciona el sitio",
"aqui":"aquí",
"postar e ler aqui":"publicar y leer aquí",
"chat público aqui":"chat público aquí",
"menu ⋮ aqui":"menú ⋮ aquí",
"aba 📰 Feed → caixa postar":"pestaña 📰 Feed → caja de publicar",
"aba 💬 Chats → sala #geral":"pestaña 💬 Chats → sala #geral",
"aba 👤 Conta → criar nick":"pestaña 👤 Cuenta → crear nick",
"topo → botão ⋮":"arriba → botón ⋮",
"oi gente! 👋":"¡hola a todos! 👋",
"opa, cheguei!":"¡ey, llegué!",
"nick + senha":"nick + contraseña"
});
Object.assign(DEN,{"tradução indisponível — tente amanhã.":"translation unavailable — try tomorrow."});
Object.assign(DES,{"tradução indisponível — tente amanhã.":"traducción no disponible — intenta mañana."});
// Bloco 2026-11-06b (dono: linha da regra sem tradução) — cobre a variante nova
// (com "Sem conta e sem rosto") e a antiga do espelho ainda no ar (sem ela).
Object.assign(DEN,{
"proibido dado pessoal real em áreas públicas (feed, chat público, depoimentos) e conteúdo abusivo em qualquer área (feed, chat, depoimentos, DM, salas). Uso conforme o Termo (faixa etária). Sem conta e sem rosto: desabafa à vontade. Viu abuso? use 🚨 denunciar — cai na caixa do dono como denúncia.":"no real personal data in public areas (feed, public chat, testimonials) and no abusive content anywhere (feed, chat, testimonials, DMs, rooms). Use per the Terms (age range). No account, no face: vent freely. See abuse? use 🚨 report — it lands in the owner's inbox as a report.",
"proibido dado pessoal real em áreas públicas (feed, chat público, depoimentos) e conteúdo abusivo em qualquer área (feed, chat, depoimentos, DM, salas). Uso conforme o Termo (faixa etária). Viu abuso? use 🚨 denunciar — cai na caixa do dono como denúncia.":"no real personal data in public areas (feed, public chat, testimonials) and no abusive content anywhere (feed, chat, testimonials, DMs, rooms). Use per the Terms (age range). See abuse? use 🚨 report — it lands in the owner's inbox as a report."
});
Object.assign(DES,{
"proibido dado pessoal real em áreas públicas (feed, chat público, depoimentos) e conteúdo abusivo em qualquer área (feed, chat, depoimentos, DM, salas). Uso conforme o Termo (faixa etária). Sem conta e sem rosto: desabafa à vontade. Viu abuso? use 🚨 denunciar — cai na caixa do dono como denúncia.":"prohibido datos personales reales en áreas públicas (feed, chat público, testimonios) y contenido abusivo en cualquier área (feed, chat, testimonios, DM, salas). Uso según los Términos (rango de edad). Sin cuenta y sin rostro: desahógate libremente. ¿Ves abuso? usa 🚨 denunciar — llega a la bandeja del dueño como denuncia.",
"proibido dado pessoal real em áreas públicas (feed, chat público, depoimentos) e conteúdo abusivo em qualquer área (feed, chat, depoimentos, DM, salas). Uso conforme o Termo (faixa etária). Viu abuso? use 🚨 denunciar — cai na caixa do dono como denúncia.":"prohibido datos personales reales en áreas públicas (feed, chat público, testimonios) y contenido abusivo en cualquier área (feed, chat, testimonios, DM, salas). Uso según los Términos (rango de edad). ¿Ves abuso? usa 🚨 denunciar — llega a la bandeja del dueño como denuncia."
});
// Bloco 2026-11-06c (dono: criar/logar sem traducao no "aguarde" + areas de
// arquivo sem traducao e botao sem personalizar). Cobre o fluxo deslogado
// (placeholders, validacoes, etapas "verificando/criando/entrando", erros e
// avisos de vinculo), a migracao forcada, a troca de senha logada, o efeito
// do avatar e os botoes de arquivo personalizados (src/zunfilebtn.js esconde
// o input nativo - que segue o idioma do navegador e nao traduz - e mostra
// botao traduzivel no tema do site).
Object.assign(DEN,{
"senha":"password",
"nick 2+ e senha 8+ (frase longa)":"nick 2+ chars and password 8+ (long phrase)",
"aguarde... \u23F3":"please wait... \u23F3",
"verificando captcha...":"checking captcha...",
"criando ou entrando na conta...":"creating or signing in...",
"entrando...":"signing in...",
"bem-vindo! \uD83C\uDF89":"welcome! \uD83C\uDF89",
"exclus\u00E3o cancelada \u2014 bem-vindo de volta! \uD83C\uDF89":"deletion cancelled \u2014 welcome back! \uD83C\uDF89",
"complete o captcha (arraste a barra at\u00E9 ficar verde)":"complete the captcha (drag the bar until it turns green)",
"nick s\u00F3 pode letras, n\u00FAmeros, - e _ (2 a 20, sem espa\u00E7o)":"nick can only use letters, numbers, - and _ (2-20, no spaces)",
"esse nick \u00E9 reservado":"that nick is reserved",
"esse nick j\u00E1 est\u00E1 em uso":"that nick is already taken",
"senha errada":"wrong password",
"senha precisa de 8+ letras":"password needs 8+ letters",
"conta de teste: s\u00F3 o dono pode criar":"test account: only the owner can create",
"captcha inv\u00E1lido, arraste de novo e tente":"invalid captcha, slide again and try",
"sem servidor ainda \u2014 tente de novo":"no server yet \u2014 try again",
"conta pronta! \u2705 (recurso extra em modo compat\u00EDvel)":"account ready! \u2705 (extra feature in compatibility mode)",
"conta criada! \u2705 (v\u00EDnculo pendente \u2014 avise o dono)":"account created! \u2705 (link pending \u2014 tell the owner)",
"conta criada! \u2705 (modo compat\u00EDvel)":"account created! \u2705 (compatibility mode)",
"devagar \u2014 conta criada, aguarde uns segundos e entre de novo":"slow down \u2014 account created, wait a few seconds and log in again",
"\uD83D\uDD12 Atualiza\u00E7\u00E3o de seguran\u00E7a":"\uD83D\uDD12 Security update",
"senha atual":"current password",
"nova senha (8+ letras, frase longa)":"new password (8+ letters, long phrase)",
"repita a nova senha":"repeat the new password",
"criar nova senha e entrar":"create new password and sign in",
"preencha os 4 campos":"fill in all 4 fields",
"as novas senhas n\u00E3o conferem":"the new passwords don't match",
"nova senha precisa de 8+ letras (use frase longa)":"new password needs 8+ letters (use a long phrase)",
"a nova senha precisa ser diferente da atual":"the new password must be different from the current one",
"verificando...":"checking...",
"registrando no servidor novo...":"registering on the new server...",
"trocando a senha...":"changing the password...",
"senha atualizada! \u2705 entrando...":"password updated! \u2705 signing in...",
"essa conta j\u00E1 tem outra senha no servidor novo \u2014 entre normal com a senha nova; se n\u00E3o lembrar dela, zere o banco do backend e migre de novo":"this account already has another password on the new server \u2014 sign in normally with the new password; if you don't remember it, reset the backend database and migrate again",
"sem conex\u00E3o com o servidor novo, tente de novo":"no connection to the new server, try again",
"voltar":"back",
"senha atual errada":"wrong current password",
"confirmar troca":"confirm change",
"preencha os 3 campos":"fill in all 3 fields",
"a nova \u00E9 igual \u00E0 atual":"the new one matches the current one",
"trocando no servidor novo...":"syncing with the new server...",
"trocando...":"changing...",
"senha trocada! \u2705 entre de novo com a nova senha":"password changed! \u2705 sign in again with the new password",
"senha trocada! \u2705 outros aparelhos v\u00E3o precisar entrar de novo":"password changed! \u2705 other devices will need to sign in again",
"salvar efeito":"save effect",
"sem efeito":"no effect",
"c\u00EDrculo neon":"neon circle",
"neon rosa":"pink neon",
"ouro":"gold",
"arco-\u00EDris":"rainbow",
"fogo":"fire",
"gelo":"ice",
"sombra":"shadow",
"efeito atualizado!":"effect updated!",
"\uD83D\uDCCE escolher foto":"\uD83D\uDCCE choose photo",
"\uD83D\uDCCE escolher arquivo":"\uD83D\uDCCE choose file",
"nenhum arquivo escolhido":"no file chosen",
"remover":"remove",
"foto/v\u00EDdeo/gif/arquivo":"photo/video/gif/file",
"ou foto https://...":"or photo https://...",
"carregar dono.js do PC:":"load dono.js from your PC:"
});
Object.assign(DES,{
"senha":"contrase\u00F1a",
"nick 2+ e senha 8+ (frase longa)":"nick 2+ y contrase\u00F1a 8+ (frase larga)",
"aguarde... \u23F3":"espera... \u23F3",
"verificando captcha...":"verificando captcha...",
"criando ou entrando na conta...":"creando o entrando a la cuenta...",
"entrando...":"entrando...",
"bem-vindo! \uD83C\uDF89":"\u00A1bienvenido! \uD83C\uDF89",
"exclus\u00E3o cancelada \u2014 bem-vindo de volta! \uD83C\uDF89":"eliminaci\u00F3n cancelada \u2014 \u00A1bienvenido de vuelta! \uD83C\uDF89",
"complete o captcha (arraste a barra at\u00E9 ficar verde)":"completa el captcha (arrastra la barra hasta que se ponga verde)",
"nick s\u00F3 pode letras, n\u00FAmeros, - e _ (2 a 20, sem espa\u00E7o)":"el nick solo puede tener letras, n\u00FAmeros, - y _ (2 a 20, sin espacios)",
"esse nick \u00E9 reservado":"ese nick est\u00E1 reservado",
"esse nick j\u00E1 est\u00E1 em uso":"ese nick ya est\u00E1 en uso",
"senha errada":"contrase\u00F1a incorrecta",
"senha precisa de 8+ letras":"la contrase\u00F1a necesita 8+ letras",
"conta de teste: s\u00F3 o dono pode criar":"cuenta de prueba: solo el due\u00F1o puede crear",
"captcha inv\u00E1lido, arraste de novo e tente":"captcha inv\u00E1lido, desliza de nuevo e intenta",
"sem servidor ainda \u2014 tente de novo":"sin servidor a\u00FAn \u2014 intenta de nuevo",
"conta pronta! \u2705 (recurso extra em modo compat\u00EDvel)":"\u00A1cuenta lista! \u2705 (funci\u00F3n extra en modo compatible)",
"conta criada! \u2705 (v\u00EDnculo pendente \u2014 avise o dono)":"\u00A1cuenta creada! \u2705 (v\u00EDnculo pendiente \u2014 avisa al due\u00F1o)",
"conta criada! \u2705 (modo compat\u00EDvel)":"\u00A1cuenta creada! \u2705 (modo compatible)",
"devagar \u2014 conta criada, aguarde uns segundos e entre de novo":"despacio \u2014 cuenta creada, espera unos segundos y entra de nuevo",
"\uD83D\uDD12 Atualiza\u00E7\u00E3o de seguran\u00E7a":"\uD83D\uDD12 Actualizaci\u00F3n de seguridad",
"senha atual":"contrase\u00F1a actual",
"nova senha (8+ letras, frase longa)":"nueva contrase\u00F1a (8+ letras, frase larga)",
"repita a nova senha":"repite la nueva contrase\u00F1a",
"criar nova senha e entrar":"crear nueva contrase\u00F1a y entrar",
"preencha os 4 campos":"rellena los 4 campos",
"as novas senhas n\u00E3o conferem":"las nuevas contrase\u00F1as no coinciden",
"nova senha precisa de 8+ letras (use frase longa)":"la nueva contrase\u00F1a necesita 8+ letras (usa una frase larga)",
"a nova senha precisa ser diferente da atual":"la nueva contrase\u00F1a debe ser distinta de la actual",
"verificando...":"verificando...",
"registrando no servidor novo...":"registrando en el servidor nuevo...",
"trocando a senha...":"cambiando la contrase\u00F1a...",
"senha atualizada! \u2705 entrando...":"\u00A1contrase\u00F1a actualizada! \u2705 entrando...",
"essa conta j\u00E1 tem outra senha no servidor novo \u2014 entre normal com a senha nova; se n\u00E3o lembrar dela, zere o banco do backend e migre de novo":"esta cuenta ya tiene otra contrase\u00F1a en el servidor nuevo \u2014 entra normal con la nueva contrase\u00F1a; si no la recuerdas, reinicia la base del backend y migra de nuevo",
"sem conex\u00E3o com o servidor novo, tente de novo":"sin conexi\u00F3n con el servidor nuevo, intenta de nuevo",
"voltar":"volver",
"senha atual errada":"contrase\u00F1a actual incorrecta",
"confirmar troca":"confirmar cambio",
"preencha os 3 campos":"rellena los 3 campos",
"a nova \u00E9 igual \u00E0 atual":"la nueva es igual a la actual",
"trocando no servidor novo...":"sincronizando con el servidor nuevo...",
"trocando...":"cambiando...",
"senha trocada! \u2705 entre de novo com a nova senha":"\u00A1contrase\u00F1a cambiada! \u2705 entra de nuevo con la nueva contrase\u00F1a",
"senha trocada! \u2705 outros aparelhos v\u00E3o precisar entrar de novo":"\u00A1contrase\u00F1a cambiada! \u2705 otros aparatos tendr\u00E1n que entrar de nuevo",
"salvar efeito":"guardar efecto",
"sem efeito":"sin efecto",
"c\u00EDrculo neon":"c\u00EDrculo ne\u00F3n",
"neon rosa":"ne\u00F3n rosa",
"ouro":"oro",
"arco-\u00EDris":"arco\u00EDris",
"fogo":"fuego",
"gelo":"hielo",
"sombra":"sombra",
"efeito atualizado!":"\u00A1efecto actualizado!",
"\uD83D\uDCCE escolher foto":"\uD83D\uDCCE elegir foto",
"\uD83D\uDCCE escolher arquivo":"\uD83D\uDCCE elegir archivo",
"nenhum arquivo escolhido":"ning\u00FAn archivo elegido",
"remover":"eliminar",
"foto/v\u00EDdeo/gif/arquivo":"foto/v\u00EDdeo/gif/archivo",
"ou foto https://...":"o foto https://...",
"carregar dono.js do PC:":"cargar dono.js desde tu PC:"
});
// Bloco 2026-11-07 (assunto do dia: rótulo exibido no feed + title).
// O marcador gravado no post ("💬 assunto do dia · DD/MM") segue em PT de
// propósito: é a âncora de detecção (zunIsTopicPost/pin/janitor) — traduzir
// o rótulo exibido, nunca o gravado. As perguntas já são EN/ES por idioma.
Object.assign(DEN,{
"💬 assunto do dia":"💬 topic of the day",
"pergunta do dia — responda abaixo":"question of the day — reply below"
});
Object.assign(DES,{
"💬 assunto do dia":"💬 tema del día",
"pergunta do dia — responda abaixo":"pregunta del día — responde abajo"
});

})();
