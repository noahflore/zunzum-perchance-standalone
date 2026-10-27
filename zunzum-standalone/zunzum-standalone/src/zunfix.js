/* zunfix — escopo do CSS personalizado + autocorreção de contraste
   1) zunScopeCss: confina o CSS extra do usuário dentro de um contêiner
      (#profCard, #wrap #pubBox, body p/ tema do site), p/ regra global tipo
      "button{...}" ou "*{...}" não vazar e apagar o resto do site.
   2) zunHealRoot / zunHealAll: passa nos CONTROLES (botões, campos, links)
      e nos TEXTOS (posts do feed, mensagens dos chats, depoimentos, perfil)
      dentro de #top, #wrap (feed + pub + priv), #profCard, #searchCard,
      #divulgarCard e #seoBox. Se o texto ficou ilegível (contraste quebrado),
      marca o elemento com data-zun-broken="1" (+ data-zun-why com o motivo)
      e corrige sozinho a cor/fundo/borda. MutationObserver reaplica a cura,
      inclusive em elementos que estavam escondidos na hora da pintura. */
(function(){
  "use strict";
  function $(id){ return document.getElementById(id); }

  /* ---------- 1) sanitiza + escopa CSS ---------- */
  /* normaliza antes de testar: comentario CSS e escape com barra escondem
     url(, expression(, position:fixed etc. do regex (bypass 2026-10-24:
     url com comentario no meio passava o tracker, position com comentario
     passava o overlay). Sem comentario/barra o CSS legitimo continua igual
     (content: e bloqueado de qualquer jeito, sem string legitima a perder). */
  function zunCssNorm(css){
    css = String(css == null ? "" : css).slice(0, 2000);
    css = css.replace(/\/\*[\s\S]*?\*\//g, "");
    try{
      css = css.replace(/\\([0-9a-fA-F]{1,6})\s?/g, function(m, h){
        try{ var c = parseInt(h, 16); if(!c || c > 0x10FFFF) return ""; return String.fromCharCode(c); }catch(e){ return ""; }
      });
      css = css.replace(/\\/g, "");
    }catch(e){}
    return css;
  }
  function zunSanitizeCss(css){
    css = zunCssNorm(css);
    /* repete ate estabilizar: rede de seguranca contra truque duplo. */
    for(var k = 0; k < 3; k++){
      var prev = css;
      css = css.replace(/<\/style/gi, "").replace(/<script/gi, "").replace(/<\/script/gi, "");
      css = css.replace(/@import[^;]+;/gi, "");
      /* anti-tracking: url(...) em CSS custom vira pixel de rastreio (vaza o IP
         de quem abre o perfil/sala). Remove o url inteiro, antes do escopo. */
      css = css.replace(/url\s*\((?:[^()\\]|\\.)*\)/gi, "/*url removido*/");
      /* vetores antigos de CSS ativo: expression(), -moz-binding/behaviour e
         esquema javascript: dentro de declaração. */
      css = css.replace(/expression\s*\(/gi, "/*expressao removida*/(");
      css = css.replace(/-moz-binding/gi, "/*removido*/");
      css = css.replace(/\bbehaviour\s*:/gi, "/*removido*/:");
      css = css.replace(/javascript\s*:/gi, "/*removido*/:");
      /* anti-defacement: position:fixed/sticky/absolute + z-index + content:
         permitem cobrir a tela/cartão com phishing. Bloqueia a declaracao
         inteira (paridade com cleanRoomTheme do servidor, que já barra as 3). */
      css = css.replace(/position\s*:\s*fixed/gi, "/*posicao removida*/");
      css = css.replace(/position\s*:\s*sticky/gi, "/*posicao removida*/");
      css = css.replace(/position\s*:\s*absolute/gi, "/*posicao removida*/");
      css = css.replace(/z-index\s*:[^;}]+/gi, "/*z-index removido*/");
      css = css.replace(/content\s*:[^;}]+/gi, "/*content removido*/");
      css = css.replace(/\/\*[\s\S]*?\*\//g, "");
      if(css === prev) break;
    }
    return css;
  }
  function zunScopeSel(sel, scope){
    var parts = String(sel).split(","), out = [], k, s, low;
    for(k = 0; k < parts.length; k++){
      s = parts[k].replace(/^\s+|\s+$/g, "");
      if(!s) continue;
      if(/^(from|to|\d+(\.\d+)?%)$/i.test(s)){ out.push(s); continue; }
      low = s.toLowerCase();
      if(low.indexOf(":root") === 0){ out.push(scope + s.slice(5)); continue; }
      if(/^(html|body)(\b|$)/.test(low)){ out.push(scope); continue; }
      if(s === "*"){ out.push(scope + " *"); continue; }
      if(s.indexOf(scope) === 0){ out.push(s); continue; }
      out.push(scope + " " + s);
    }
    return out.join(", ");
  }
  function zunScopeCss(css, scope){
    css = zunSanitizeCss(css).replace(/\/\*[\s\S]*?\*\//g, "");
    var out = "", i = 0, n = css.length;
    function skipWs(){ while(i < n && /\s/.test(css.charAt(i))) i++; }
    function readUntil(ch){
      var s = i, depth = 0;
      while(i < n){
        var c = css.charAt(i);
        if(c === '"' || c === "'"){
          var q = c; i++;
          while(i < n && css.charAt(i) !== q){ if(css.charAt(i) === "\\") i++; i++; }
          i++; continue;
        }
        if(c === "(") depth++;
        else if(c === ")") depth--;
        else if(c === ch && depth === 0) break;
        i++;
      }
      return css.slice(s, i);
    }
    function parseBlock(){
      var start = i, depth = 1;
      while(i < n && depth > 0){
        var c = css.charAt(i);
        if(c === '"' || c === "'"){
          var q = c; i++;
          while(i < n && css.charAt(i) !== q){ if(css.charAt(i) === "\\") i++; i++; }
          i++; continue;
        }
        if(c === "{") depth++;
        else if(c === "}") depth--;
        i++;
      }
      return css.slice(start, Math.max(start, i - 1));
    }
    while(i < n){
      skipWs();
      if(i >= n) break;
      if(css.charAt(i) === "@"){
        var head = readUntil("{");
        var h = head.replace(/^\s+|\s+$/g, "");
        var low = h.toLowerCase();
        if(low.indexOf("@media") === 0 || low.indexOf("@supports") === 0){
          if(css.charAt(i) === "{"){ i++; out += h + "{" + zunScopeCss(parseBlock(), scope) + "}"; }
          else out += h + ";";
        } else if(low.indexOf("@keyframes") === 0 || low.indexOf("@font-face") === 0 || low.indexOf("@page") === 0){
          if(css.charAt(i) === "{"){ i++; out += h + "{" + parseBlock() + "}"; }
          else out += h + ";";
        } else {
          var semi = css.indexOf(";", i), br = css.indexOf("{", i);
          if(br >= 0 && (semi < 0 || br < semi)){ i = br + 1; parseBlock(); }
          else if(semi >= 0){ i = semi + 1; }
          else break;
        }
        continue;
      }
      if(css.charAt(i) === "}"){ i++; continue; }
      var sel = readUntil("{");
      if(i >= n || css.charAt(i) !== "{") break;
      i++;
      var body = parseBlock();
      var sc = zunScopeSel(sel, scope);
      if(sc) out += sc + "{" + body + "}";
    }
    return out;
  }
  window.zunScopeCss = zunScopeCss;
  window.zunSanitizeCss = zunSanitizeCss;
  window.zunCssNorm = zunCssNorm;

  /* ---------- 2) contraste: detecta + autocorrige ---------- */
  /* cores de sistema: botão nativo em alguns Chrome/desktop devolve a
     palavra-chave ("buttonface") em vez de rgb() no getComputedStyle. Sem
     esse mapa o fundo próprio vira null → o bloco perde a elegibilidade do
     degradê e cai no branco chapado. Valores do esquema claro; se a página
     está em esquema escuro usa o mapa escuro. Tudo opaco (a=1). */
  var ZUN_SYS_LIGHT = {buttonface:[240,240,240,1], buttontext:[0,0,0,1], buttonborder:[160,160,160,1], canvas:[255,255,255,1], canvastext:[0,0,0,1], field:[255,255,255,1], fieldtext:[0,0,0,1], highlight:[0,120,215,1], highlighttext:[255,255,255,1], graytext:[109,109,109,1], mark:[255,255,0,1], marktext:[0,0,0,1], linktext:[0,0,238,1], activetext:[255,0,0,1], visitedtext:[85,26,139,1], selecteditem:[0,120,215,1], selecteditemtext:[255,255,255,1], window:[255,255,255,1], windowtext:[0,0,0,1], infobackground:[251,252,205,1], infotext:[0,0,0,1]};
  var ZUN_SYS_DARK = {buttonface:[59,59,59,1], buttontext:[255,255,255,1], buttonborder:[90,90,90,1], canvas:[30,30,30,1], canvastext:[255,255,255,1], field:[30,30,30,1], fieldtext:[255,255,255,1], highlight:[0,120,215,1], highlighttext:[255,255,255,1], graytext:[150,150,150,1], mark:[255,255,0,1], marktext:[0,0,0,1], linktext:[150,170,255,1], activetext:[255,110,110,1], visitedtext:[200,150,255,1], selecteditem:[0,120,215,1], selecteditemtext:[255,255,255,1], window:[30,30,30,1], windowtext:[255,255,255,1], infobackground:[60,60,20,1], infotext:[255,255,255,1]};
  var zunSysDark = null;
  function zunSysColor(nm){
    try{
      if(zunSysDark === null){
        zunSysDark = false;
        try{ zunSysDark = !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches); }catch(e){}
      }
      var m = zunSysDark ? ZUN_SYS_DARK : ZUN_SYS_LIGHT;
      if(m[nm]) return m[nm].slice();
    }catch(e){}
    return null;
  }
  function zunParseColor(s){
    s = String(s || "").trim().toLowerCase();
    if(!s || s === "transparent") return [0, 0, 0, 0];
    var m;
    if((m = s.match(/^#([0-9a-f]{3})$/))) return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16), 1];
    if((m = s.match(/^#([0-9a-f]{6})$/))) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16), 1];
    if((m = s.match(/^rgba?\(([^)]+)\)$/))){
      var p = m[1].split(",");
      if(p.length >= 3){
        var r = parseFloat(p[0]), g = parseFloat(p[1]), b = parseFloat(p[2]), a = p.length >= 4 ? parseFloat(p[3]) : 1;
        if(isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) return null;
        return [r, g, b, a];
      }
      return null;
    }
    /* palavra-chave de cor de sistema (buttonface, canvas, field, ...) */
    if(/^[a-z-]+$/.test(s)){
      var sc = zunSysColor(s);
      if(sc) return sc;
    }
    return null;
  }
  function zunLum(c){
    function f(v){ v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  }
  function zunRatio(a, b){
    var l1 = zunLum(a), l2 = zunLum(b);
    if(l1 < l2){ var t = l1; l1 = l2; l2 = t; }
    return (l1 + 0.05) / (l2 + 0.05);
  }
  function zunIsDark(c){ return zunLum(c) < 0.35; }
  function zunEffBg(el){
    return zunEffBgMemo(el, null);
  }
  /* memo por passada: o parse do getComputedStyle de cada ancestral é
     reaproveitado entre os elementos (antes: O(profundidade) chamadas por
     elemento curado; agora: 1 por nó distinto). Resultado idêntico. */
  function zunBgOwn(el, memo){
    try{
      if(memo){
        let hit = memo.get(el);
        if(hit) return hit;
      }
      let c = null;
      try{ c = zunParseColor(getComputedStyle(el).backgroundColor); }catch(err2){}
      if(memo && c) memo.set(el, c);
      return c;
    }catch(e){ return null; }
  }
  function zunEffBgMemo(el, memo){
    var chain = [], e = el;
    while(e && e.nodeType === 1){ chain.unshift(e); if(e === document.body) break; e = e.parentNode; }
    var cur = [255, 255, 255];
    try{
      var bb = zunParseColor(getComputedStyle(document.body).backgroundColor);
      if(bb && bb[3] >= 1) cur = [bb[0], bb[1], bb[2]];
    }catch(err){}
    for(var i = 0; i < chain.length; i++){
      var c = zunBgOwn(chain[i], memo);
      if(!c) continue;
      var a = Math.max(0, Math.min(1, c[3]));
      cur = [cur[0] * (1 - a) + c[0] * a, cur[1] * (1 - a) + c[1] * a, cur[2] * (1 - a) + c[2] * a];
    }
    return cur;
  }
  function zunBestFg(bg){
    var rb = zunRatio([0, 0, 0], bg), rw = zunRatio([255, 255, 255], bg);
    return rb >= rw ? "#111111" : "#ffffff";
  }
  /* ---------- 2b) degradê suave p/ contraste fora do tema ----------
     Quando o fundo efetivo está longe do fundo do cartão do tema (CSS
     personalizado quebrou a paleta) e o texto ficou ilegível, além de fixar
     a cor do texto aplica um linear-gradient suave derivado do próprio tema
     (cartão + destaque). Só em bloco com fundo próprio opaco — span/parágrafo
     transparente ganha só a cor, sem pintar faixa à toa. */
  function zunRgbHex(c){
    function h(v){ v = Math.max(0, Math.min(255, Math.round(v))); var s = v.toString(16); return s.length < 2 ? "0" + s : s; }
    return "#" + h(c[0]) + h(c[1]) + h(c[2]);
  }
  function zunMix(a, b, k){
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  function zunDist(a, b){
    var dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }
  var zunThemeCache = null;
  try{ zunThemeCache = new WeakMap(); }catch(e){ zunThemeCache = null; }
  /* tema do contêiner do elemento (perfil/sala/box têm tema próprio — um
     cartão amarelo escolhido pelo dono NÃO é "fora do tema" p/ os filhos).
     Palpite: fundo do cartão + fundo de um botão dentro dele (destaque). */
  function zunThemeFor(el){
    var root = null, key = null;
    try{ root = el.closest ? (el.closest("#profCard,#wrap #pubBox,#wrap .box,#nodalCard,#userSearchCard,#divulgarCard,#top") || document.body) : document.body; }
    catch(e){ root = document.body; }
    if(!root) root = document.body;
    key = root;
    try{
      if(zunThemeCache && zunThemeCache.has(key)){
        var hit = zunThemeCache.get(key);
        if(Date.now() - hit.at < 2000) return hit.th;
      }
    }catch(e){}
    var cd = [255, 255, 255], ac = [106, 165, 215];
    try{
      var bgC = zunParseColor(getComputedStyle(root).backgroundColor);
      if(bgC && bgC[3] >= 0.5) cd = [bgC[0], bgC[1], bgC[2]];
      else if(root !== document.body){
        var bb = zunParseColor(getComputedStyle(document.body).backgroundColor);
        if(bb && bb[3] >= 0.5) cd = [bb[0], bb[1], bb[2]];
      }
    }catch(e){}
    try{
      var btn = null;
      try{ btn = root.querySelector ? root.querySelector("button") : null; }catch(e2){ btn = null; }
      if(btn){
        var bc = zunParseColor(getComputedStyle(btn).backgroundColor);
        if(bc && bc[3] >= 0.5) ac = [bc[0], bc[1], bc[2]];
      }
    }catch(e){}
    /* localStorage tem o tema do site (fundo/cartão/destaque crus, sem CSS
       em cima) — vale como fallback p/ raiz body/topo. */
    try{
      if(root === document.body){
        var raw = localStorage.getItem("orkutSiteTheme");
        if(raw){
          var th = JSON.parse(raw), ok = 0;
          var pcd = th && (th.cd || th.card) ? zunParseColor(th.cd || th.card) : null;
          var pac = th && (th.ac || th.acc) ? zunParseColor(th.ac || th.acc) : null;
          if(pcd){ cd = [pcd[0], pcd[1], pcd[2]]; ok++; }
          if(pac){ ac = [pac[0], pac[1], pac[2]]; ok++; }
        }
      }
    }catch(e){}
    var th = {cd:cd, ac:ac};
    try{ if(zunThemeCache) zunThemeCache.set(key, {at:Date.now(), th:th}); }catch(e){}
    return th;
  }
  function zunGradPair(th, wantHex){
    var want = zunParseColor(wantHex) || [17, 17, 17];
    var mixes = [[0.22, 0.06], [0.14, 0.04], [0.07, 0.02]];
    for(var i = 0; i < mixes.length; i++){
      var c1 = zunMix(th.cd, th.ac, mixes[i][0]), c2 = zunMix(th.cd, th.ac, mixes[i][1]);
      if(zunRatio([want[0], want[1], want[2]], c1) >= 3 && zunRatio([want[0], want[1], want[2]], c2) >= 3)
        return [zunRgbHex(c1), zunRgbHex(c2)];
    }
    return null;
  }
  var ZUN_GRAD_TAGS = {DIV:1, SECTION:1, ARTICLE:1, HEADER:1, FOOTER:1, H1:1, H2:1, H3:1, H4:1, BUTTON:1, LI:1, TD:1, TH:1};
  function zunGradEligible(el, tag, isField, own){
    if(isField) return false;
    if(!ZUN_GRAD_TAGS[tag]) return false;
    if(!own || own[3] < 0.9) return false;
    return true;
  }
  function zunApplyGrad(el, hex1, hex2, want, why){
    try{
      var wantImg = "linear-gradient(135deg, " + hex1 + ", " + hex2 + ")";
      if(el.dataset.zunGrad === "1" && el.style.getPropertyValue("background-image") === wantImg &&
         el.style.getPropertyValue("color") === want) return;
      /* guarda o inline original uma vez p/ restaurar quando o tema voltar */
      if(!el.dataset.zunGrad){
        try{
          el.dataset.zunOrigBgImg = el.style.getPropertyValue("background-image") || "";
          el.dataset.zunOrigBgCol = el.style.getPropertyValue("background-color") || "";
        }catch(e){}
      }
      el.style.setProperty("background-image", wantImg, "important");
      if(el.style.getPropertyValue("color") !== want)
        el.style.setProperty("color", want, "important");
      el.dataset.zunGrad = "1";
      el.dataset.zunGradMid = hex1;
      el.dataset.zunBroken = "1";
      el.dataset.zunWhy = why;
    }catch(e){}
  }
  function zunClearGrad(el){
    try{
      if(!el.dataset.zunGrad) return;
      try{
        var oi = el.dataset.zunOrigBgImg, oc = el.dataset.zunOrigBgCol;
        if(oi) el.style.setProperty("background-image", oi, "important");
        else el.style.removeProperty("background-image");
        if(oc) el.style.setProperty("background-color", oc, "important");
      }catch(e){}
      delete el.dataset.zunGrad; delete el.dataset.zunGradMid;
      delete el.dataset.zunOrigBgImg; delete el.dataset.zunOrigBgCol;
    }catch(e){}
  }
  window.zunThemeFor = zunThemeFor;
  /* Cura controles (botão/campo/link) + textos (posts, chats, perfil).
     NÃO pula elemento escondido: o estilo computado vale do mesmo jeito e a
     correção já fica pronta p/ quando ele aparecer. Só pula o que não tem
     texto visível (invólucro vazio) p/ não sujar o DOM à toa.
     Inclui b/strong (cabeçalhos dos modais usam <b>) — antes ficavam sem cura. */
  var ZUN_TEXT_SEL = "button,input,select,textarea,a,div,span,p,h1,h2,h3,h4,b,strong,small,i,em,li,td,th,label";
  function zunHealEl(el, fieldBg, fieldBgC, memo){
    try{
      if(el.closest && el.closest(".znick-grad")) return 0;
      /* nick com estilo próprio (cor/fonte/efeito escolhidos pelo dono):
         a escolha do usuário vence a cura de contraste — sem isso a cura
         apagava a cor do nick no feed/chats com !important. */
      try{ if(el.closest && el.closest("[data-znick]")) return 0; }catch(eZ){}
      if(el.id === "zNickPrevText") return 0;
      var tag = el.tagName;
      if(tag === "OPTION" || tag === "SCRIPT" || tag === "STYLE") return 0;
      if(tag === "INPUT" && el.type === "color") return 0;
      var cs = getComputedStyle(el);
      var isField = tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA";
      var isControl = isField || tag === "BUTTON" || tag === "A";
      if(!isControl){
        var tx = el.textContent;
        if(!tx || !tx.replace(/\s+/g, "")) return 0;
      }
      var behind, own = null;
      if(isField){
        own = zunParseColor(cs.backgroundColor);
        if(!own || own[3] < 0.5){
          /* idempotente: se já deixamos esse fundo, não reescreve (reescrita
             dispara o MutationObserver → nova passada → "pintando tudo") */
          let curBg = "";
          try{ curBg = el.style.getPropertyValue("background-color"); }catch(eBg){}
          if(curBg !== fieldBg){
            try{ el.style.setProperty("background-color", fieldBg, "important"); }
            catch(e4b){ el.style.backgroundColor = fieldBg; }
          }
          behind = fieldBgC;
        } else behind = [own[0], own[1], own[2]];
      } else {
        behind = zunEffBgMemo(el, memo);
      }
      var fg = zunParseColor(cs.color);
      var ratio = (!fg || fg[3] < 0.5) ? 0 : zunRatio([fg[0], fg[1], fg[2]], behind);
      if(ratio >= 3){
        /* legível sem ajuda: degradê próprio não precisa mais (tema voltou
           ou CSS saiu) — remove p/ não carregar tinta à toa. MAS se o degradê
           é nosso e o fundo continua fora do tema, manter é o correto: sem
           esse guarda, toda passada limpava o grad e a seguinte reaplicava
           (= pisca-pisca em rajada). */
        try{
          if(el.dataset.zunGrad){
            var thC = null, outC = false;
            try{ thC = zunThemeFor(el); outC = zunDist(behind, thC.cd) > 70; }catch(eTC){}
            if(outC) return 0;
            zunClearGrad(el);
          }
        }catch(eG){}
        if(el.dataset.zunBroken){ delete el.dataset.zunBroken; delete el.dataset.zunWhy; }
        return 0;
      }
      /* fora do tema? fundo efetivo longe do cartão do contêiner = paleta
         quebrada pelo CSS personalizado. Bloco com fundo próprio opaco ganha
         degradê suave do tema em vez de só trocar a letra. */
      var th = null, outTheme = false;
      try{
        th = zunThemeFor(el);
        outTheme = zunDist(behind, th.cd) > 70;
      }catch(eT){ th = null; outTheme = false; }
      var want = zunBestFg(behind);
      /* own só era calculado p/ campo; p/ degradê precisa do fundo próprio
         de qualquer bloco (opaco = tem tinta própria p/ misturar). */
      var ownBg = own;
      try{ if(!ownBg) ownBg = zunParseColor(cs.backgroundColor); }catch(eOB){}
      if(th && outTheme && zunGradEligible(el, tag, isField, ownBg)){
        var mid = zunMix(th.cd, th.ac, 0.14);
        var wantG = zunBestFg(mid);
        var pair = zunGradPair(th, wantG);
        if(pair){
          el.dataset.zunBroken = "1";
          el.dataset.zunWhy = "contraste " + ratio.toFixed(1) + " fora do tema → degradê";
          zunApplyGrad(el, pair[0], pair[1], wantG, el.dataset.zunWhy);
          return 1;
        }
      }
      try{ if(el.dataset.zunGrad) zunClearGrad(el); }catch(eG2){}
      el.dataset.zunBroken = "1";
      el.dataset.zunWhy = "contraste " + ratio.toFixed(1);
      try{
        if(el.style.getPropertyValue("color") !== want)
          el.style.setProperty("color", want, "important");
      }
      catch(e4){ try{ el.style.color = want; }catch(e4b){} }
      if(isField){
        try{
          var bc = zunParseColor(cs.borderTopColor);
          var bBehind = (own && own[3] >= 0.5) ? [own[0], own[1], own[2]] : behind;
          if(!bc || zunRatio([bc[0], bc[1], bc[2]], bBehind) < 1.4){
            var wantB = zunBestFg(bBehind);
            let curB = "";
            try{ curB = el.style.getPropertyValue("border-color"); }catch(eBb){}
            if(curB !== wantB){
              try{ el.style.setProperty("border-color", wantB, "important"); }
              catch(e5){ el.style.borderColor = wantB; }
            }
          }
        }catch(e2){}
      }
      return 1;
    }catch(e3){ return 0; }
  }
  /* freio: passada completa no máximo 1x a cada intervalo por chave; em aba
     oculta não há o que exibir — pula tudo (era puro gasto + "pintura" invisível) */
  var zunPassAt = {};
  function zunPassOk(key, gapMs){
    try{
      if(document.hidden) return false;
      let now = Date.now(), last = zunPassAt[key] || 0;
      if(now - last < gapMs) return false;
      zunPassAt[key] = now;
      return true;
    }catch(e){ return true; }
  }
  /* passada fresca: raiz recém-curada de forma síncrona (hook de pintura).
     O vigia ignora sujeira sob ela por ~1s — era esse retrabalho (pintou,
     curou tudo, 350ms depois curou tudo DE NOVO) que mantinha a cura
     "pintando tudo" a cada repintura do feed/chat/DM. */
  var zunFreshMap = null;
  try{ zunFreshMap = new WeakMap(); }catch(e){}
  function zunMarkFresh(root){ try{ if(root && root.nodeType === 1 && zunFreshMap) zunFreshMap.set(root, Date.now()); }catch(e){} }
  function zunIsFresh(el){
    try{
      if(!zunFreshMap || !el || !el.closest) return false;
      let r = el.closest(ZUN_ROOT_SEL);
      if(r && zunFreshMap.has(r) && (Date.now() - zunFreshMap.get(r) < 1000)) return true;
    }catch(e){}
    return false;
  }
  function zunHealRoot(root){
    if(!root || !root.querySelectorAll || !root.isConnected) return 0;
    try{ if(document.hidden) return 0; }catch(e){}
    var memo = null;
    try{ memo = new WeakMap(); }catch(e){ memo = null; }
    var rootBg = zunEffBgMemo(root, memo);
    var fieldBg = zunIsDark(rootBg) ? "#222222" : "#ffffff";
    var fieldBgC = zunParseColor(fieldBg);
    var els;
    try{ els = root.querySelectorAll(ZUN_TEXT_SEL); }catch(e){ return 0; }
    var fixed = zunHealEl(root, fieldBg, fieldBgC, memo);
    var budget = Math.min(els.length, 2500), i;
    for(i = 0; i < budget; i++) fixed += zunHealEl(els[i], fieldBg, fieldBgC, memo);
    zunMarkFresh(root);
    try{
      root.dataset.zunHealAt = String(Date.now());
      root.dataset.zunHealEp = String(zunStyleEpoch);
    }catch(eM){}
    return fixed;
  }
  window.zunHealRoot = zunHealRoot;
  /* Cura direcionada: só os nós que mudaram (sem revarrer a raiz inteira).
     É o que o vigia usa — evita o pisca-pisca de reaplicar cor em tudo a
     cada pintura do feed/chat/DM. */
  var ZUN_ROOT_SEL = "#top,#wrap,#profCard,#searchCard,#divulgarCard,#seoBox,#nodalCard,#userSearchCard,#notfoundModal,#zunDMRoot,#zunFriendPanel,#zEmojiPanel,#zGmModal,#zCombo";
  function zunFieldBgFor(el){
    try{
      var r = el.closest ? el.closest(ZUN_ROOT_SEL) : null;
      var bg = zunEffBg(r||document.body);
      return zunIsDark(bg) ? "#222222" : "#ffffff";
    }catch(e){ return "#ffffff"; }
  }
  function zunHealList(list){
    try{ if(document.hidden) return 0; }catch(e){}
    var budget = 1500, fixed = 0, i, j;
    var memo = null;
    try{ memo = new WeakMap(); }catch(e){ memo = null; }
    for(i = 0; i < list.length && budget > 0; i++){
      var el = list[i];
      if(!el || el.nodeType !== 1) continue;
      try{ if(!el.isConnected) continue; }catch(e){ continue; }
      try{ zunMarkFresh(el.closest ? (el.closest(ZUN_ROOT_SEL) || el) : el); }catch(eM){}
      var fb = zunFieldBgFor(el), fbc = zunParseColor(fb);
      try{ fixed += zunHealEl(el, fb, fbc, memo); budget--; }catch(e){}
      var desc = null;
      try{ desc = el.querySelectorAll(ZUN_TEXT_SEL); }catch(e){}
      if(desc){
        for(j = 0; j < desc.length && budget > 0; j++){ try{ fixed += zunHealEl(desc[j], fb, fbc, memo); budget--; }catch(e2){} }
      }
    }
    return fixed;
  }
  window.zunHealList = zunHealList;
  /* carimbo "raiz curada nesta época": a cura direcionada (só linhas novas)
     marca a raiz — o zunHealSoon agendado logo depois pula a passada completa
     redundante. Não marca com aba oculta (a cura vira no-op e o carimbo seria
     mentira). Era da época está em zunStyleEpoch (bump em <style>/<link>). */
  window.zunMarkHeal = function(root){
    try{
      if(!root || root.nodeType !== 1) return;
      if(document.hidden) return;
      root.dataset.zunHealAt = String(Date.now());
      root.dataset.zunHealEp = String(zunStyleEpoch);
    }catch(e){}
  };
  var zunDirtyPend = [];
  function zunHealDirtySoon(list){
    try{ zunDirtyPend = zunDirtyPend.concat(list).slice(-300); }
    catch(e){ try{ zunDirtyPend = list.slice(0, 300); }catch(e2){ return; } }
    try{ clearTimeout(zunT.dirty); }catch(e){}
    zunT.dirty = setTimeout(function(){
      var l = zunDirtyPend; zunDirtyPend = [];
      try{ zunHealList(l); }catch(e2){}
    }, 350);
  }
  /* Todas as áreas com CSS de usuário: topo, feed+chats, perfil, busca, divulgar, seo + TODOS os modais. */
  function zunHealAll(){
    if(!zunPassOk("all", 4000)) return 0;
    var total = 0;
    try{ var t = $("top"); if(t) total += zunHealRoot(t); }catch(e){}
    try{ var w = $("wrap"); if(w) total += zunHealRoot(w); }catch(e){}
    try{ var c = $("profCard"); if(c) total += zunHealRoot(c); }catch(e){}
    try{ var s = $("searchCard"); if(s) total += zunHealRoot(s); }catch(e){}
    try{ var d = $("divulgarCard"); if(d) total += zunHealRoot(d); }catch(e){}
    try{ var sb = $("seoBox"); if(sb) total += zunHealRoot(sb); }catch(e){}
    try{ var nc = $("nodalCard"); if(nc) total += zunHealRoot(nc); }catch(e){}
    try{ var uc = $("userSearchCard"); if(uc) total += zunHealRoot(uc); }catch(e){}
    try{ var nf = $("notfoundModal"); if(nf) total += zunHealRoot(nf); }catch(e){}
    try{ var dm = $("zunDMRoot"); if(dm) total += zunHealRoot(dm); }catch(e){}
    try{ var fr = $("zunFriendPanel"); if(fr) total += zunHealRoot(fr); }catch(e){}
    try{ total += zunHealModalHeaders(); }catch(e2){}
    return total;
  }
  window.zunHealAll = zunHealAll;
  /* Cabeçalhos de cada modal: exigência maior (4.5:1). O heal geral usa 3:1,
     mas cabeçalho precisa ficar legível mesmo com CSS personalizado agressivo. */
  var ZUN_MHEAD_SEL = ".box h3,#profNick,#nodalTitle,#userSearchCard b,#divulgarCard b,#nodalCard b,#notfoundModal .nfTitle,#searchCard b,.zun-mhead,#zunDMRoot .zun-dm-h,#zunDMRoot .zun-dm-h b,#zunDMRoot .zun-dm-peer";
  function zunHealModalHeaders(){
    try{ if(document.hidden) return 0; }catch(e){}
    var sels = [];
    try{ sels = document.querySelectorAll(ZUN_MHEAD_SEL); }catch(e){ return 0; }
    var fixed = 0, i;
    for(i = 0; i < sels.length; i++){
      try{
        var el = sels[i];
        if(!el.isConnected) continue;
        /* #profNick e .zun-dm-peer com estilo de nick: não curar. */
        try{ if(el.hasAttribute && el.hasAttribute("data-znick")) continue; }catch(eZ){}
        var cs = getComputedStyle(el);
        var fg = zunParseColor(cs.color);
        var behind = zunEffBg(el);
        var ratio = (!fg || fg[3] < 0.5) ? 0 : zunRatio([fg[0], fg[1], fg[2]], behind);
        if(ratio >= 4.5){
          /* mesmo guarda anti-pisca do zunHealEl: degradê nosso + fundo ainda
             fora do tema = mantém, sem limpar/reaplicar a cada passada. */
          try{
            if(el.dataset.zunGrad){
              var thH2 = null, outH2 = false;
              try{ thH2 = zunThemeFor(el); outH2 = zunDist(behind, thH2.cd) > 70; }catch(eTH){}
              if(outH2) continue;
              zunClearGrad(el);
            }
          }catch(eG){}
          if(el.dataset.zunBroken === "head"){ delete el.dataset.zunBroken; delete el.dataset.zunWhy; }
          continue;
        }
        /* cabeçalho fora do tema também ganha degradê suave do tema */
        var wantH = zunBestFg(behind), didGrad = false;
        try{
          var thH = zunThemeFor(el);
          if(zunDist(behind, thH.cd) > 70){
            var midH = zunMix(thH.cd, thH.ac, 0.14);
            var wantHG = zunBestFg(midH);
            var pairH = zunGradPair(thH, wantHG);
            if(pairH){
              el.dataset.zunBroken = "1";
              el.dataset.zunWhy = "cabecalho " + ratio.toFixed(1) + " fora do tema → degradê";
              zunApplyGrad(el, pairH[0], pairH[1], wantHG, el.dataset.zunWhy);
              wantH = wantHG; didGrad = true;
            }
          }
        }catch(eGH){}
        if(!didGrad) try{ if(el.dataset.zunGrad) zunClearGrad(el); }catch(eG2){}
        el.dataset.zunBroken = "1";
        if(!didGrad) el.dataset.zunWhy = "cabecalho " + ratio.toFixed(1);
        try{
          if(el.style.getPropertyValue("color") !== wantH)
            el.style.setProperty("color", wantH, "important");
        }
        catch(e4){ try{ el.style.color = wantH; }catch(e4b){} }
        fixed++;
      }catch(e2){}
    }
    return fixed;
  }
  window.zunHealModalHeaders = zunHealModalHeaders;
  var zunT = {};
  /* época de CSS global: bump quando <style>/<link> muda (único caso em que
     uma raiz já curada precisa de passada completa de novo). Mudança local
     (nova linha de chat etc.) é coberta pela cura direcionada + vigia. */
  var zunStyleEpoch = 0;
  function zunHealSoon(key, idOrEl){
    try{ clearTimeout(zunT[key]); }catch(e){}
    zunT[key] = setTimeout(function(){
      try{
        var r = (typeof idOrEl === "string") ? $(idOrEl) : idOrEl;
        if(r){
          /* redundante? raiz curada há <1.5s e sem mudança de CSS global —
             p/ ex. o gancho pós-paint do chat logo após o healFreshRows das
             linhas novas. Pula sem piscar. Primeira cura sempre roda. */
          try{
            var at = parseInt((r.dataset && r.dataset.zunHealAt) || "0", 10) || 0;
            var ep = parseInt((r.dataset && r.dataset.zunHealEp) || "0", 10) || 0;
            if(at && (Date.now() - at) < 1500 && ep === zunStyleEpoch) return;
          }catch(eS){}
          zunHealRoot(r);
        }
        else zunHealAll();
      }catch(e2){}
    }, 350);
  }
  window.zunHealSoon = zunHealSoon;
  function zunHealAllSoon(){ zunHealSoon("all", null); }

  /* ---------- 3) vigia tudo e reaplica a cura ---------- */
  function zunWatch(){
    try{
      var mo = new MutationObserver(function(muts){
        var healAll = false, i, j, dirty = [], seen = [];
        function pushDirty(n){
          if(!n || n.nodeType !== 1) return;
          try{ if(seen.indexOf(n) >= 0) return; seen.push(n); }catch(e){ return; }
          try{ if(zunIsFresh(n)) return; }catch(eF){}
          if(dirty.length < 300) dirty.push(n);
        }
        for(i = 0; i < muts.length; i++){
          var m = muts[i], t = m.target;
          if(t && t.nodeName === "STYLE"){ healAll = true; break; }
          if(m.addedNodes){
            for(j = 0; j < m.addedNodes.length; j++){
              var an = m.addedNodes[j];
              if(an && (an.nodeName === "STYLE" || an.nodeName === "LINK")){ healAll = true; break; }
              try{
                if(an && an.nodeType === 1){
                  if(an.id === "zunDMRoot" || (an.querySelector && an.querySelector("#zunDMRoot"))){ pushDirty(an); }
                  if(an.id === "nodalModal" || an.id === "userSearchModal" || an.id === "notfoundModal"){ healAll = true; break; }
                  pushDirty(an);
                }
              }catch(eN){}
            }
            if(healAll) break;
          }
          /* mutação de atributo (style/class): cura só o alvo, não a raiz toda.
             childList: os nós novos já entraram via addedNodes; o pai não precisa. */
          try{
            if(m.type === "attributes" && m.target && m.target.nodeType === 1) pushDirty(m.target);
          }catch(eA){}
          try{
            if(m.type !== "childList") pushDirty(t.nodeType === 1 ? t : (t.parentNode || null));
            else if(t && t.closest && !t.closest("#top,#wrap,#profCard,#searchCard,#divulgarCard,#seoBox,#nodalCard,#userSearchCard,#notfoundModal,#zunDMRoot,#zunFriendPanel,#zEmojiPanel,#zGmModal,#zCombo")) healAll = true;
          }catch(e){}
        }
        if(healAll){ try{ zunStyleEpoch++; }catch(eE){} zunHealAllSoon(); return; }
        if(dirty.length) zunHealDirtySoon(dirty);
      });
      mo.observe(document.documentElement, {childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"]});
    }catch(e){}
    /* modais abrem via [hidden]: cura SÓ o cartão do modal na hora de aparecer
       (antes curava o site inteiro a cada abertura) */
    var ZUN_MODAL_CARD = {profModal:"profCard", searchModal:"searchCard", divulgarModal:"divulgarCard", nodalModal:"nodalCard", userSearchModal:"userSearchCard", notfoundModal:"notfoundModal"};
    ["profModal", "searchModal", "divulgarModal", "nodalModal", "userSearchModal", "notfoundModal"].forEach(function(mid){
      try{
        var pm = $(mid);
        if(pm){
          new MutationObserver(function(){
            try{ if(!pm.hidden) zunHealSoon(mid, ZUN_MODAL_CARD[mid] || null); }catch(e2){}
          }).observe(pm, {attributes: true, attributeFilter: ["hidden"]});
        }
      }catch(e2){}
    });
    /* DM: cura só quando a raiz do DM realmente entra no body (antes: QUALQUER
       filho direto do body — toast, input, picker — curava tudo de novo) */
    try{
      new MutationObserver(function(muts){
        try{
          var hit = false;
          for(var i = 0; i < muts.length && !hit; i++){
            var an = muts[i].addedNodes || [];
            for(var j = 0; j < an.length; j++){
              var n = an[j];
              if(n && n.nodeType === 1 && (n.id === "zunDMRoot" || (n.querySelector && n.querySelector("#zunDMRoot")))){ hit = true; break; }
            }
          }
          if(hit) zunHealSoon("dm", "zunDMRoot");
        }catch(e2){}
      }).observe(document.body, {childList: true});
    }catch(e3){}
  }
  function zunTagMHeads(){
    try{
      var sels = document.querySelectorAll("#divulgarCard > div:first-child, #userSearchCard > div:first-child, #nodalCard > div:first-child, #searchCard > div:first-child");
      for(var i=0;i<sels.length;i++){ try{ sels[i].classList.add("zun-mhead"); }catch(e){} }
      var bsel = document.querySelectorAll("#divulgarCard b, #userSearchCard b, #nodalCard b, #searchCard b");
      for(var j=0;j<bsel.length;j++){ try{ bsel[j].closest("div").classList.add("zun-mhead"); }catch(e2){} }
    }catch(e3){}
  }
  window.zunTagMHeads = zunTagMHeads;
  setTimeout(function(){ try{ zunTagMHeads(); }catch(e){} }, 1200);
  setTimeout(function(){ try{ zunTagMHeads(); }catch(e){} }, 4000);
  function zunHookFn(name, key, id, sync){
    try{
      var fn = window[name];
      if(typeof fn !== "function" || fn._zun) return;
      window[name] = function(){
        var r;
        try{ r = fn.apply(this, arguments); }
        catch(e){ try{ zunHealSoon(key, id); }catch(e2){} throw e; }
        try{
          /* pintura: cura NA HORA (síncrona) p/ não piscar 350ms depois;
             o resto continua agendado */
          if(sync){
            if(id){ var rr = $(id); if(rr) zunHealRoot(rr); }
            else zunHealAll();
          }
          else if(id) zunHealSoon(key, id);
          else zunHealAllSoon();
        }catch(e3){}
        return r;
      };
      window[name]._zun = 1;
    }catch(e){}
  }
  function zunHook(){
    zunHookFn("applyProfTheme", "prof", "profCard");
    zunHookFn("applyRoomTheme", "pub", "pubBox");
    zunHookFn("previewRoomTheme", "pub", "pubBox");
    zunHookFn("paintSiteTheme", "site", null);
    zunHookFn("paintFeed", "feed", "feedCtn", true);
    /* pub/priv: o caminho quente agora é incremental (patchChatLog) e cura só
       as linhas novas na hora (healFreshRows) — o full sync a cada mensagem
       era o que travava/piscava em rajada. Mantém o gancho assíncrono como
       rede de segurança (o zunHealSoon abaixo pula se nada mudou). */
    zunHookFn("paintPub", "publog", "pubLog", false);
    zunHookFn("paintPriv", "privlog", "privLog", false);
    zunHookFn("openProfile", "prof", "profCard");
    zunHookFn("loadDepo", "depo", "profDepo");
    zunHookFn("openUserSearch", "usearch", "userSearchCard");
    zunHookFn("showNotFound", "nf", "notfoundModal");
    zunHookFn("nodalOpenUI", "nodal", "nodalCard", true);
    zunHookFn("zunDMOpen", "dm", "zunDMRoot");
    zunHookFn("zunDMRenderAll", "dm", "zunDMRoot");
  }
  zunHook();
  zunWatch();
  var zunTries = 0;
  var zunIv = setInterval(function(){
    zunTries++;
    zunHook();
    if(zunTries > 20) clearInterval(zunIv);
  }, 1000);
  setTimeout(function(){ try{ zunHealAll(); }catch(e){} }, 800);
  setTimeout(function(){ try{ zunHealAll(); }catch(e){} }, 3000);
})();
