/* zunzum SW: código (JS/CSS) = pote-primeiro + revalida em fundo (visita
   repetida abre na hora, sem baixar tudo de novo; o fundo atualiza o pote
   p/ o próximo load — nunca prende versão velha p/ sempre como a v1 fazia).
   Imagens = pote + revalida (offline continua vendo mídia). Resto (HTML
   etc) = rede-primeiro, pote só se offline. Hard reload (request.cache
   no-store) sempre vai à rede: editor/preview nunca mostra JS velho. */
var VER = "zunzum-v35";
/* v35 (2026-11-09): CORREÇÃO — faltava 1 `</style>` no index do espelho e o
   overlay #zunBoot era engolido como texto de CSS (loading sumia só no
   espelho; no preview estava certo). + app BUILD 42/cliVer 42. Só index +
   app + sb mudaram; bump limpa o pote de 1ª.
/* v34 (2026-11-09): loading segura 3s nos 100% + tema final (fake pedido do
   dono: dá p/ ver que combinou) + app BUILD 41/cliVer 41. Só index + app +
   sb mudaram; bump limpa o pote de 1ª.
/* v33 (2026-11-09): pastéis do véu escurecidos (pedido do dono: claros demais)
   + app BUILD 40/cliVer 40. Só index + app + sb mudaram; bump limpa o pote.
/* v32 (2026-11-09): véu do loading suavizado (pastéis + ciclo 7s, barra 6s —
   pedido do dono: estava psicodélico). + app BUILD 39/cliVer 39. Só index +
   app + sb mudaram; bump limpa o pote de 1ª.
/* v31 (2026-11-09): loading com véu que MUDA DE COR até assentar no tema
   (.zunboot-wash + barra hue-rotate; .zunboot-settled revela o final) + app
   BUILD 38/cliVer 38. Só index + app + sb mudaram; bump limpa o pote de 1ª.
/* v30 (2026-11-09): festas.js saiu do lazy p/ logo após notify.js (data-zunfesta
   + vars antes do boot: o loading e o 1º paint já nascem de festa) + app BUILD
   37/cliVer 37. Só index + app + sb mudaram; bump limpa o pote de 1ª.
/* v29 (2026-11-09): tela de carregamento (overlay #zunBoot inline no index:
   abelhinha SVG + nome + barra REAL — 5 marcos até o 1º feed, failsafe 20s;
   dia/noite/festa). Só index + app + sb mudaram; bump limpa o pote de 1ª.
/* v28 (2026-11-09): modo economia 🌱 (zunsaver.js NOVO no CORE: segura fotos/
    vídeos/YT p/ tocar, Twemoji vira glifo, pollers 1/3, auto-liga em dados
    móveis) + símbolos −/□/× brancos no noturno/festa (healer não carimba mais
    o chrome de janela) + app BUILD 35/cliVer 35. Só index + 10 JS mudaram;
    bump limpa o pote p/ valer de 1ª.
/* v27 (2026-11-08): tradução amigos (zundm.js usa _zdmt + i18n DEN/DES/DPAT p/ "nenhum amigo ainda" com/sem pedido + "pedidos (N):"; fix parêntese; aceitar/conversar/ver-amigos/remover-amizade via _zdmt). Só i18n/zundm mudaram; bump limpa o pote p/ valer de 1ª.
    v26 (2026-11-08): captcha com visual próprio (trilho custom amarelo + CSS
     src/zuncaptcha.css, sem o slider cinza padrão do navegador). Só
     zuncaptcha.js/css mudaram; bump limpa o pote p/ valer de 1ª.
    v25 (2026-11-08): cartão "o que mudou" do pet (CLI_BUILD 34 + cliVer 34
    em app.js/sb.js) + zunpet.js atual (petMark salva junto). Só esses 3
    mudaram; bump limpa o pote p/ valer de 1ª.
    v24 (2026-11-07): mural próprio avisa recado novo mesmo com o perfil
    fechado (ZunMural.checkOwn no poller 60s + volta de aba + login +
    reconexão; vistos em localStorage, 1ª vez semeia em silêncio; ping
    pelo zunMuralPing da casa). Só app/zunmural mudaram; bump limpa o
    pote p/ valer de 1ª.
    v23 (2026-11-07): captcha avisa "arraste a barra até ficar cinza" + a
    barrinha fica cinza de verdade (grayscale no disabled) + nick inválido
    é rejeitado antes de criar (formato 2-20/sem espaço, reservado) com
    aviso + tradução EN/ES. Só app/i18n/zuncaptcha mudaram; bump limpa o
    pote p/ valer de 1ª.
    v22 (2026-11-07): captcha claro + criar/entrar (zuncaptcha.js: topo "só
    esperar o número terminar de contar" sem falar em minerar + número em
    negrito separado + ok "pode criar ou entrar na conta"; app.js status
    "criando ou entrando na conta..."; i18n.js EN/ES dos dois). Só esses 3
    mudaram; bump limpa o pote p/ valer de 1ª.
    v21 (2026-11-07): cartão "o que mudou" do webring (CLI_BUILD 33 + cliVer 33
    em app.js/sb.js). Só esses 2 mudaram; bump limpa o pote p/ valer de 1ª.
    v20 (2026-11-07): assunto do dia traduzido p/ o idioma de QUEM VÊ (antes a
    pergunta ficava no idioma de quem semeou; zunAssuntoText em zunassunto.js
    + uso no paint e no patch realtime em app.js; rótulo em i18n.js).
    zunassunto.js entra no CORE p/ precache. Limpa o pote p/ valer de 1ª.
    v19 (2026-11-06): bot do feed desligado (pedido do dono: só gente no feed,
    mesmo que fique parado — 🤖Zunzim·IA some do render + aiTick não posta
    mais). Só app.js mudou; bump limpa o pote p/ valer tudo de 1ª.
    v18 (2026-11-06): fix reload do vídeo no feed (YouTube/<video> não recarrega
    mais a cada repaint: reconciliação por pid + guard estaciona/reencaixa o
    player ao vivo + patch pin-aware absorve likes/replies sem tocar no DOM).
    Só app.js mudou; bump limpa o pote p/ valer tudo de 1ª.
    v17 (2026-11-06): botões de arquivo personalizados + tradução do criar/entrar
    (zunfilebtn.js NOVO no CORE; i18n.js com bloco 2026-11-06c). Limpa o pote
    p/ valer tudo de 1ª.
    v16 (2026-11-06): tradução sem IA (MyMemory) mostrava o aviso de cota como se
    fosse tradução + texto "pela metade" (app.js: detecta aviso, trava cota 20h,
    até 3 pedaços, nunca parcial; i18n.js: msg de aviso). Limpa o pote p/ valer.
    v15 (2026-11-06): tour de boas-vindas traduzido EN/ES (i18n.js no CORE, por
    isso o bump — limpa o pote p/ valer de 1ª).
    v14 (2026-11-06): reload com a aba chats ativa voltava presa no topo — o
    activate() do mobile move a pubBox p/ a section e o move zera o scrollTop
    depois do paint já ter ido p/ o fundo (flag limpa, nada re-rolava).
    Flush agora re-fixa quando lembrava estar no fundo (app.js) + retry tardio
    no showChat (mobile.js). Limpa o pote p/ valer tudo de 1ª.
    v13 (2026-11-06): scroll de 1a visita — feed abre no topo, chat pub/priv abre
    no fundo (novo); repint com aba oculta não mexe no scroll (p/ não puxar
    quem lia história). Limpa o pote p/ valer tudo de 1ª.
    v12 (2026-11-04): assunto do dia: post fixo NÃO edita/apaga (botões somem;
    sb.js/espelho local/RPCs feed_post_del/edit recusam `fixo`; só o janitor
    remove na virada). Requer RE-RODAR src/supabase-fase19.sql 1x no Dashboard.
    Limpa o pote p/ valer tudo de 1ª.
    v11 (2026-11-04): assunto do dia como POST FIXO (post real no feed, com
    destaque e botões nativos de resposta/curtir; semeado 1x/dia com _cid
    determinístico; janitor novo zz_assunto_tick limpa o dia anterior).
    Limpa o pote p/ valer tudo de 1ª.
    v10 (2026-11-04): micro-status inline (mesmo lugar: status + editar;
    edição ali mesmo; lateral "usuario" mostra o próprio) — app+zunperfil.
    Limpa o pote p/ valer tudo de 1ª.
    v9 (2026-11-04): dissecação tops — zunfreeze+zunscramble (novos), zunpet
   (moedas/slots/festa/conversa), sb/app/zunperfil (micro-status), zunhuman+
   zuncount (opt-in). Limpa o pote p/ valer tudo de 1ª.
   v8 (2026-11-04): +logo nova (abelha PNG transparente) — descarta o pote
   velho (favicon injector + selo + picture ainda apontando p/ a jpg antiga).
   v7 (2026-11-04): +zunbase.js no CORE (base auto-referente p/ share links).
   Trocar o VER apaga o pote velho na ativação — basta 1 visita p/ o SW novo
   assumir + 1 reload p/ página fresh (sem hard-reload). */
var CORE = ["./", "src/zunbase.js", "src/app.js", "src/notify.js", "src/i18n.js", "src/seo.js", "src/vision-frames.js",
  "src/sb.js", "src/sb2.js", "src/sb3.js", "src/backend-auth.js", "src/janitor.js", "src/zunkv.js",
  "src/zuncaptcha.js", "src/zuncaptcha.css", "src/site-guard.js", "src/media-proxy.js", "src/rls-check.js", "src/zunown.js",
  "src/zunfix.js", "src/chatux.js", "src/chatux.css", "src/zunskinscan.js", "src/zunfilebtn.js", "src/zunassunto.js", "src/zunsaver.js"];
self.addEventListener("install", function(e){
  try{ self.skipWaiting(); }catch(err){}
  e.waitUntil(caches.open(VER).then(function(c){ return c.addAll(CORE).catch(function(){}); }));
});
self.addEventListener("activate", function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){ return k === VER ? null : caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }).catch(function(){}));
});
function swPut(req, res){
  try{
    if(!res || !res.ok) return;
    var cp = res.clone();
    caches.open(VER).then(function(c){ c.put(req, cp); }).catch(function(){});
  }catch(err){}
}
function swIsCode(u){
  try{ return /\.(js|css)(\?|#|$)/i.test(u.pathname); }catch(err){ return false; }
}
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  var u;
  try{ u = new URL(e.request.url); }catch(err){ return; }
  if(u.origin !== location.origin) return;
  var isImg = false;
  try{ isImg = (e.request.destination === "image") || /\.(png|jpe?g|gif|webp|svg|ico|mp3|mp4|webm|ogg|wav)(\?|#|$)/i.test(u.pathname); }catch(err){}
  /* mídia: serve o pote na hora e atualiza em 2º plano */
  if(isImg){
    e.respondWith(
      caches.match(e.request).then(function(hit){
        var net = fetch(e.request).then(function(res){ swPut(e.request, res); return res; }).catch(function(){ return hit; });
        return hit || net;
      })
    );
    return;
  }
  /* código: pote-primeiro + revalida em fundo; hard reload vai à rede */
  if(swIsCode(u)){
    e.respondWith(
      caches.match(e.request).then(function(hit){
        var bypass = false;
        try{ bypass = (e.request.cache === "no-store"); }catch(err){}
        if(bypass){
          return fetch(e.request).then(function(res){ swPut(e.request, res); return res; }).catch(function(){ return hit || Response.error(); });
        }
        var net = fetch(e.request).then(function(res){ swPut(e.request, res); return res; }).catch(function(){});
        if(hit) return hit;
        return net.then(function(res){ return res || Response.error(); });
      })
    );
    return;
  }
  /* resto (HTML etc): rede primeiro; pote só se offline */
  e.respondWith(
    fetch(e.request).then(function(res){ swPut(e.request, res); return res; }).catch(function(){
      return caches.match(e.request).then(function(hit){ return hit || Response.error(); });
    })
  );
});
