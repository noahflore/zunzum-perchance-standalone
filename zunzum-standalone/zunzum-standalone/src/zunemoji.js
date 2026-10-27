/* zunzum emoji SVG — fallback consistente + gif-emoji animados + combo.
   - Shortcodes animados viajam como texto (:dancando:) e renderizam p/ todos.
   - Unicode vira <img> Twemoji (SVG) p/ navegadores sem suporte ao glifo novo.
   - Combo: 2 pessoas diferentes, mesmo animado em sequência => emoji grande. */
(function(){
"use strict";

/* 8 gif-emoji 100% SVG (SMIL: anima até dentro de <img>, sem CSS/JS). 64x64. */
var ANIM = {
dancando:{
  label:"dançando",
  svg:'<svg viewBox="0 0 64 64" role="img" aria-label="dançando"><g><animateTransform attributeName="transform" type="translate" values="-3 0;3 0;-3 0" dur="0.55s" repeatCount="indefinite"/><g><animateTransform attributeName="transform" type="rotate" values="-9 32 34;9 32 34;-9 32 34" dur="0.55s" repeatCount="indefinite"/><line x1="14" y1="38" x2="6" y2="28" stroke="#B8860B" stroke-width="4" stroke-linecap="round"><animate attributeName="y2" values="28;20;28" dur="0.55s" repeatCount="indefinite"/><animate attributeName="x2" values="6;4;6" dur="0.55s" repeatCount="indefinite"/></line><line x1="50" y1="38" x2="58" y2="28" stroke="#B8860B" stroke-width="4" stroke-linecap="round"><animate attributeName="y2" values="28;20;28" dur="0.55s" repeatCount="indefinite"/></line><circle cx="32" cy="32" r="18" fill="#FFD93B" stroke="#B8860B" stroke-width="2.5"/><circle cx="25.5" cy="28" r="2.6" fill="#333"/><circle cx="38.5" cy="28" r="2.6" fill="#333"/><path d="M24 38 Q32 46 40 38" fill="none" stroke="#333" stroke-width="2.6" stroke-linecap="round"/><path d="M20 20 l3 -4 M44 20 l-3 -4" fill="none" stroke="#B8860B" stroke-width="2.4" stroke-linecap="round"/></g></g><ellipse cx="32" cy="56" rx="14" ry="2.6" fill="#000" opacity="0.12"><animate attributeName="rx" values="14;10;14" dur="0.55s" repeatCount="indefinite"/></ellipse></svg>'
},
festa:{
  label:"festa",
  svg:'<svg viewBox="0 0 64 64" role="img" aria-label="festa"><polygon points="32,58 20,34 44,34" fill="#7A4FC9" stroke="#4a2f86" stroke-width="2"/><rect x="20" y="30" width="24" height="6" rx="2" fill="#FFB300"/><circle cx="32" cy="22" r="5" fill="#FF5A5A"><animate attributeName="r" values="5;6.4;5" dur="0.5s" repeatCount="indefinite"/></circle><g fill="#2EC4B6"><circle cx="14" cy="14" r="2.6"><animate attributeName="opacity" values="1;.2;1" dur="0.7s" repeatCount="indefinite"/></circle><circle cx="50" cy="12" r="2.6"><animate attributeName="opacity" values=".2;1;.2" dur="0.7s" repeatCount="indefinite"/></circle></g><g fill="#FFD93B"><circle cx="22" cy="8" r="2.2"><animate attributeName="cy" values="8;12;8" dur="0.8s" repeatCount="indefinite"/></circle><circle cx="42" cy="8" r="2.2"><animate attributeName="cy" values="12;8;12" dur="0.8s" repeatCount="indefinite"/></circle></g><circle cx="54" cy="22" r="2.2" fill="#FF5A8A"><animate attributeName="opacity" values="1;.1;1" dur="0.6s" repeatCount="indefinite"/></circle><circle cx="10" cy="24" r="2.2" fill="#3FA7FF"><animate attributeName="opacity" values=".1;1;.1" dur="0.6s" repeatCount="indefinite"/></circle></svg>'
},
coracao:{
  label:"coração",
  svg:'<svg viewBox="0 0 64 64" role="img" aria-label="coração"><g transform="translate(32 32)"><g><animateTransform attributeName="transform" type="scale" values="1;1.28;1;1.12;1" dur="1s" repeatCount="indefinite"/><path d="M0 14 C-16 2 -24 -6 -14 -14 C-7 -19 0 -12 0 -6 C0 -12 7 -19 14 -14 C24 -6 16 2 0 14 Z" fill="#E63946" stroke="#9d2330" stroke-width="2"/><ellipse cx="-7" cy="-10" rx="3.4" ry="2.2" fill="#fff" opacity=".65" transform="rotate(-24)"/></g></g></svg>'
},
fogo:{
  label:"fogo",
  svg:'<svg viewBox="0 0 64 64" role="img" aria-label="fogo"><g><animateTransform attributeName="transform" type="scale" values="1;1.07;1" dur="0.45s" repeatCount="indefinite"/><path d="M32 6 C38 16 48 22 48 38 A16 16 0 0 1 16 38 C16 28 22 24 24 16 C27 20 29 22 30 22 C29 16 30 10 32 6 Z" fill="#FF7A00" stroke="#B64A00" stroke-width="2"/><path d="M32 26 C35 31 40 34 40 42 A8 8 0 0 1 24 42 C24 37 27 35 28 31 C29 33 30 33 30 33 C30 30 31 28 32 26 Z" fill="#FFD93B"><animate attributeName="opacity" values="1;.75;1" dur="0.3s" repeatCount="indefinite"/></path></g></svg>'
},
estrela:{
  label:"estrela",
  svg:'<svg viewBox="0 0 64 64" role="img" aria-label="estrela"><g><animateTransform attributeName="transform" type="rotate" from="0 32 32" to="360 32 32" dur="3.2s" repeatCount="indefinite"/><polygon points="32,8 38,24 55,24 41,34 46,50 32,40 18,50 23,34 9,24 26,24" fill="#FFD93B" stroke="#B8860B" stroke-width="2" stroke-linejoin="round"/></g><circle cx="32" cy="32" r="3.4" fill="#fff" opacity=".9"><animate attributeName="opacity" values=".9;.3;.9" dur="1s" repeatCount="indefinite"/></circle></svg>'
},
fantasma:{
  label:"fantasma",
  svg:'<svg viewBox="0 0 64 64" role="img" aria-label="fantasma"><g><animateTransform attributeName="transform" type="translate" values="0 -2.5;0 2.5;0 -2.5" dur="1.6s" repeatCount="indefinite"/><path d="M18 54 L18 30 A14 14 0 0 1 46 30 L46 54 L40 50 L35 54 L30 50 L25 54 L18 54 Z" fill="#F2F4FF" stroke="#8A93B8" stroke-width="2" stroke-linejoin="round"/><circle cx="26" cy="30" r="2.8" fill="#333"><animate attributeName="cy" values="30;28.6;30" dur="1.6s" repeatCount="indefinite"/></circle><circle cx="38" cy="30" r="2.8" fill="#333"><animate attributeName="cy" values="30;28.6;30" dur="1.6s" repeatCount="indefinite"/></circle><ellipse cx="32" cy="38" rx="3" ry="4" fill="#333" opacity=".8"/></g></svg>'
},
gato:{
  label:"gatinho",
  svg:'<svg viewBox="0 0 64 64" role="img" aria-label="gatinho"><g><animateTransform attributeName="transform" type="rotate" values="-5 32 34;5 32 34;-5 32 34" dur="1.1s" repeatCount="indefinite"/><polygon points="16,26 12,10 26,18" fill="#FFB703" stroke="#9a6a00" stroke-width="2" stroke-linejoin="round"/><polygon points="48,26 52,10 38,18" fill="#FFB703" stroke="#9a6a00" stroke-width="2" stroke-linejoin="round"/><circle cx="32" cy="36" r="17" fill="#FFD08A" stroke="#9a6a00" stroke-width="2.5"/><circle cx="25" cy="34" r="2.4" fill="#333"/><circle cx="39" cy="34" r="2.4" fill="#333"/><path d="M30 41 h4 l-2 2.6 z" fill="#E63946"/><path d="M27 45 Q32 48 37 45" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round"/><g stroke="#9a6a00" stroke-width="1.4" opacity=".8"><line x1="10" y1="38" x2="20" y2="39"/><line x1="44" y1="39" x2="54" y2="38"/></g></g></svg>'
},
joinha:{
  label:"joinha",
  svg:'<svg viewBox="0 0 64 64" role="img" aria-label="joinha"><g><animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="0.7s" repeatCount="indefinite"/><rect x="12" y="28" width="22" height="22" rx="6" fill="#FFD93B" stroke="#B8860B" stroke-width="2.5"/><rect x="34" y="34" width="18" height="16" rx="5" fill="#FFC42E" stroke="#B8860B" stroke-width="2.5"/><path d="M20 28 C20 20 24 14 30 12 C33 11 35 13 34 16 L31 24 L38 24 C41 24 42 26 41 29 L39 36 L20 36 Z" fill="#FFD93B" stroke="#B8860B" stroke-width="2.5" stroke-linejoin="round"/></g></svg>'
}
};
var ORDER = ["dancando","festa","coracao","fogo","estrela","fantasma","gato","joinha"];
function tr(s){ try{ if(window.zunzumTr) return window.zunzumTr(s); }catch(e){} return s; }
function gmEnhance(el){ try{ if(window.ZunGifmoji&&window.ZunGifmoji.enhance) window.ZunGifmoji.enhance(el); }catch(e){} }

/* unicode p/ picker (inserem texto; a renderização usa Twemoji SVG) */
var UNI = ["😀","😂","🤣","😍","😘","😎","🤔","😴","🤯","😭","😡","🤬","👍","👎","👏","🙏","💪","👀","🙈","💯","🔥","❤️","💔","✨","🎉","🥳","😱","🤝","👋","✌️","🤞","🧠","👻","💀","🤖","🐱","🐶","🌹","🍀","⚽","🎮","🎧","📢","💬","❓","‼️","💤","🫶"];

var TW_BASE = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/";
function twemojiCps(e, stripFe0f){
  try{
    var cps = Array.from(String(e)).map(function(c){ return c.codePointAt(0).toString(16); });
    if(stripFe0f) cps = cps.filter(function(h){ return h !== "fe0f"; });
    if(!cps.length) return "";
    return cps.join("-");
  }catch(err){ return ""; }
}
function twemojiUrl(e){
  var c = twemojiCps(e, true);
  return c ? TW_BASE + c + ".svg" : "";
}
/* <img> unicode com fallback em cadeia: sem-FE0F (❤️, ✌️) -> com-FE0F
   (🏳️‍🌈 e outras que exigem) -> texto nativo. Evita 404 + glifo quebrado. */
function uniImg(e){
  var im = document.createElement("img");
  im.className = "zem-uni"; im.alt = e; im.loading = "lazy";
  im.referrerPolicy = "no-referrer";
  var full = twemojiCps(e, false), lite = twemojiCps(e, true), step = 0;
  im.onerror = function(){
    try{
      step++;
      if(step === 1 && full && lite && full !== lite){ im.src = TW_BASE + full + ".svg"; return; }
      im.replaceWith(document.createTextNode(e));
    }catch(err){}
  };
  var first = lite || full;
  if(!first){ return document.createTextNode(e); }
  im.src = TW_BASE + first + ".svg";
  return im;
}

var emojiRe = null;
try{
  /* sequência completa: bandeira (par RI) | keycap | tag-flag |
     pictográfico + (tom | VS16 | ZWJ+picto?+tom/VS16?)* */
  emojiRe = new RegExp(
    "(\\p{Regional_Indicator}\\p{Regional_Indicator}" +
    "|[#*0-9]\\uFE0F?\\u20E3" +
    "|\\u{1F3F4}[\\u{E0020}-\\u{E007E}]+\\u{E007F}" +
    "|\\p{Extended_Pictographic}" +
    "(?:[\\u{1F3FB}-\\u{1F3FF}]|\\uFE0F|\\u200D\\p{Extended_Pictographic}(?:[\\u{1F3FB}-\\u{1F3FF}]|\\uFE0F)?)*)",
  "gu");
}
catch(err){
  emojiRe = /([#*0-9]\uFE0F?\u20E3|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}](?:[\u{1F3FB}-\u{1F3FF}\uFE0F]|\u200D[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}](?:[\u{1F3FB}-\u{1F3FF}\uFE0F])?)*)/gu;
}
var codeRe = /:([a-z]{3,12}):/g;

function codesIn(text){
  var out = [], m;
  codeRe.lastIndex = 0;
  while((m = codeRe.exec(String(text||"")))){ if(ANIM[m[1]]) out.push(m[1]); }
  return out;
}

/* Troca shortcodes + unicode SÓ nos nós de texto (nunca dentro de tags). */
function enhance(scope){
  if(!scope || !scope.querySelectorAll) return;
  try{
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(nd){
      try{
        /* botões (curtir, reações...) mantêm o emoji nativo: num flex apertado
           a <img> seria esmagada p/ ~1px. UI chrome usa glifos universais.
           Links e fachadas de vídeo (.ytFac) também ficam de fora: um <img>
           Twemoji dentro de âncora posicionada quebra o layout (caso real:
           a seta do "YouTube ↗" virou img e esticou o link p/ 317x322). */
        var p0 = nd.parentNode;
        if(p0 && p0.closest && p0.closest("button,select,option,textarea,input,a,.ytFac")) return;
      }catch(e){}
      var v = nd.nodeValue;
      if(!v || (v.indexOf(":") < 0 && !emojiRe.test(v))) return;
      emojiRe.lastIndex = 0;
      var frag = document.createDocumentFragment();
      var last = 0, m, has = false;
      /* 1) shortcodes animados */
      var parts = [], re = /:([a-z]{3,12}):/g, mm, prev = 0;
      var segs = [];
      while((mm = re.exec(v))){ segs.push({i:mm.index, code:mm[1], len:mm[0].length}); }
      var cursor = 0, si = 0;
      function pushUniText(t){
        if(!t) return;
        emojiRe.lastIndex = 0;
        var l2 = 0, m2;
        while((m2 = emojiRe.exec(t))){
          if(m2.index > l2) frag.appendChild(document.createTextNode(t.slice(l2, m2.index)));
          frag.appendChild(uniImg(m2[0])); has = true;
          l2 = m2.index + m2[0].length;
        }
        if(l2 < t.length) frag.appendChild(document.createTextNode(t.slice(l2)));
        else if(!t) return;
        if(t && (l2 > 0)) has = has; /* marcado acima */
      }
      if(!segs.length){
        /* só unicode */
        emojiRe.lastIndex = 0;
        if(!emojiRe.test(v)) return;
        pushUniText(v);
        if(frag.childNodes.length) nd.replaceWith(frag);
        return;
      }
      segs.forEach(function(s){
        if(s.i > cursor) pushUniText(v.slice(cursor, s.i));
        if(ANIM[s.code]){
          var sp = document.createElement("span");
          sp.className = "zemo"; sp.title = ":"+s.code+": "+ANIM[s.code].label;
          sp.setAttribute("data-zcode", s.code);
          sp.innerHTML = ANIM[s.code].svg;
          frag.appendChild(sp); has = true;
        } else {
          frag.appendChild(document.createTextNode(v.slice(s.i, s.i + s.len)));
        }
        cursor = s.i + s.len;
      });
      if(cursor < v.length) pushUniText(v.slice(cursor));
      if(has) nd.replaceWith(frag);
    });
  }catch(e){}
  /* marca mensagens próprias p/ bolha diferente */
  try{
    var me = "";
    try{ var rawMe=null; try{ rawMe=sessionStorage.getItem("orkutSession")||localStorage.getItem("orkutSession"); }catch(e2){} me = JSON.parse(rawMe||"null"); me = (me && me.nick ? String(me.nick).toLowerCase() : ""); }catch(e2){}
    if(me) scope.querySelectorAll(".chatlog > div").forEach(function(row){
      try{
        var n = row.querySelector(".chatname");
        if(n && n.textContent.replace(/^@/,"").toLowerCase() === me) row.classList.add("mine");
      }catch(e3){}
    });
  }catch(e){}
}

/* ---------------- combo ---------------- */
var lastComboAt = {};
function scanLog(logEl, roomKey){
  if(!logEl || !logEl.children || !logEl.children.length) return;
  try{
    var kids = logEl.children, n = kids.length;
    if(n < 2) return;
    function info(row){
      var nm = "", codes = [], t = "";
      try{ var c = row.querySelector(".chatname"); nm = c ? c.textContent.replace(/^@/,"").toLowerCase() : ""; }catch(e){}
      try{ var tt = row.querySelector(".ttext"); t = tt ? (tt.dataset.plain || tt.textContent || "") : row.textContent; codes = codesIn(t); }catch(e){}
      return {nick:nm, codes:codes};
    }
    var a = info(kids[n-2]), b = info(kids[n-1]);
    if(!a.nick || !b.nick || a.nick === b.nick) return;
    var common = null;
    for(var i=0;i<b.codes.length;i++){ if(a.codes.indexOf(b.codes[i]) >= 0){ common = b.codes[i]; break; } }
    if(!common) return;
    var now = Date.now();
    if(now - (lastComboAt[roomKey]||0) < 12000) return;
    lastComboAt[roomKey] = now;
    combo(common, a.nick, b.nick);
  }catch(e){}
}
function combo(code, nickA, nickB){
  try{
    if(window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches){
      /* sem animação: ainda mostra o grande brevemente */
    }
    var ov = document.getElementById("zCombo");
    if(!ov) return;
    ov.innerHTML = "";
    var big = document.createElement("div");
    big.className = "zComboBig";
    big.innerHTML = ANIM[code].svg;
    var tx = document.createElement("div");
    tx.className = "zComboTxt";
    tx.textContent = "COMBO! @"+nickA+" + @"+nickB+" · "+ANIM[code].label;
    ov.appendChild(big); ov.appendChild(tx);
    ov.hidden = false;
    try{ if(window.ZNotify && window.ZNotify.play) window.ZNotify.play("mention"); }catch(e){}
    try{ if(navigator.vibrate) navigator.vibrate([60,40,60]); }catch(e){}
    clearTimeout(ov._tm);
    ov._tm = setTimeout(function(){ try{ ov.hidden = true; ov.innerHTML = ""; }catch(e){} }, 2900);
    ov.onclick = function(){ try{ ov.hidden = true; ov.innerHTML = ""; }catch(e){} };
  }catch(e){}
}

/* ---------------- picker ---------------- */
var panel = null, panelTarget = null;
function isMobilePicker(){
  try{ if(matchMedia("(max-width:900px)").matches) return true; }catch(e){}
  try{ if(matchMedia("(pointer:coarse)").matches && Math.min(screen.width||9999, innerWidth||9999) < 900) return true; }catch(e2){}
  return false;
}
function ensurePanel(){
  if(panel) return panel;
  panel = document.createElement("div");
  panel.id = "zEmojiPanel";
  panel.className = "zEmojiPanel";
  panel.hidden = true;
  var tabs = document.createElement("div"); tabs.className = "zTabs"; tabs.id = "zEmojiTabs";
  [["anim","✨ animados","zSecAnim"],["uni","😀 emojis","zSecUni"],["gm","GIF · galera","zGmSec"]].forEach(function(d){
    var b = document.createElement("button");
    b.type = "button"; b.dataset.sec = d[0]; b.textContent = d[1];
    b.onclick = function(ev){ ev.stopPropagation(); gotoSec(d[0]); };
    tabs.appendChild(b);
  });
  panel.appendChild(tabs);
  var s1 = document.createElement("div"); s1.className = "zsec"; s1.id = "zSecAnim";
  var t1 = document.createElement("div"); t1.className = "zsecT"; t1.textContent = tr("animados · combinou, vira combo");
  var g1 = document.createElement("div"); g1.className = "zEmojiGrid";
  ORDER.forEach(function(k){
    var b = document.createElement("button");
    b.type = "button"; b.title = ":"+k+": "+ANIM[k].label;
    b.innerHTML = '<span class="zemo">'+ANIM[k].svg+"</span>";
    b.onclick = function(ev){ ev.stopPropagation(); insert(":"+k+":"); };
    g1.appendChild(b);
  });
  s1.appendChild(t1); s1.appendChild(g1);
  var s2 = document.createElement("div"); s2.className = "zsec"; s2.id = "zSecUni";
  var t2 = document.createElement("div"); t2.className = "zsecT"; t2.textContent = tr("emojis");
  var g2 = document.createElement("div"); g2.className = "zEmojiGrid";
  UNI.forEach(function(e){
    var b = document.createElement("button");
    b.type = "button"; b.title = e;
    b.appendChild(uniImg(e));
    b.onclick = function(ev){ ev.stopPropagation(); insert(e); };
    g2.appendChild(b);
  });
  s2.appendChild(t2); s2.appendChild(g2);
  panel.appendChild(s1); panel.appendChild(s2);
  document.body.appendChild(panel);
  document.addEventListener("pointerdown", function(ev){
    try{ if(panel.hidden) return; if(panel.contains(ev.target)) return; if(ev.target.closest && (ev.target.closest(".emojiWrap") || ev.target.closest(".zun-emoji") || ev.target.closest(".zun-gif"))) return; panel.hidden = true; }catch(e){}
  }, {passive:true});
  document.addEventListener("keydown", function(ev){ try{ if(ev.key === "Escape" && panel && !panel.hidden) panel.hidden = true; }catch(e){} });
  return panel;
}
function insert(text){
  try{
    var el = panelTarget;
    if(!el || !el.isConnected) el = document.activeElement;
    if(!el || !/INPUT|TEXTAREA/.test(el.tagName)){
      el = document.getElementById("pubInput") || document.getElementById("privMsgInput");
    }
    var s = el.selectionStart, e = el.selectionEnd, v = el.value || "";
    if(typeof s !== "number"){ el.value = (v ? v + " " : "") + text + " "; }
    else{
      var before = v.slice(0, s), after = v.slice(e);
      var needSp = before && !/\s$/.test(before) ? " " : "";
      el.value = before + needSp + text + " " + after;
      var pos = (before + needSp + text + " ").length;
      try{ el.setSelectionRange(pos, pos); }catch(err){}
    }
    try{ el.dispatchEvent(new Event("input", {bubbles:true})); }catch(err){}
    /* no celular NÃO força o teclado: o painel é top-sheet e o teclado cobriria
       tudo. O usuário toca em vários emojis com o teclado fechado e depois toca
       no campo/enviar. No desktop mantém o foco p/ digitar em sequência. */
    if(!isMobilePicker()){
      try{ el.focus({preventScroll:true}); }catch(err){ try{ el.focus(); }catch(e2){} }
      try{ if(window.ZunMobile && window.ZunMobile.keep) window.ZunMobile.keep(); }catch(e){}
    } else {
      try{ panelTarget = el; }catch(e){}
    }
  }catch(e){}
}
function gotoSec(which){
  try{
    var p = ensurePanel();
    var id = which==="gm" ? "zGmSec" : which==="uni" ? "zSecUni" : "zSecAnim";
    try{
      var btns = p.querySelectorAll("#zEmojiTabs button");
      btns.forEach(function(b){ b.classList.toggle("on", b.dataset.sec===which); });
    }catch(e){}
    if(which==="gm"){
      try{ if(window.ZunGifmoji && window.ZunGifmoji.section) window.ZunGifmoji.section(false); }catch(e){}
    }
    var t = document.getElementById(id);
    if(!t){
      if(which==="gm"){ setTimeout(function(){ try{ gotoSec("gm"); }catch(e){} }, 600); }
      return;
    }
    try{ p.scrollTop = Math.max(0, t.offsetTop - 46); }catch(e){
      try{ t.scrollIntoView({block:"start"}); }catch(e2){}
    }
    /* galera carrega async (reload+fill expandem a altura): re-alinha 2x */
    if(which==="gm"){
      setTimeout(function(){ try{ var q=document.getElementById(id); if(q && !p.hidden) p.scrollTop = Math.max(0, q.offsetTop - 46); }catch(e){} }, 700);
      setTimeout(function(){ try{ var q2=document.getElementById(id); if(q2 && !p.hidden) p.scrollTop = Math.max(0, q2.offsetTop - 46); }catch(e){} }, 1600);
    }
  }catch(e){}
}
function toggleFor(input, section){
  var p = ensurePanel();
  try{
    if(!p.hidden && panelTarget === input && !section){ p.hidden = true; return; }
    panelTarget = input;
    var isMob = isMobilePicker();
    if(isMob){
      /* celular: painel ANCORADO no composer (absolute, acima do input) —
         nunca cobre o campo/enviar, anda junto com a conversa e o teclado
         fica fechado (chatux.js faz blur ao abrir). Fixed cobria o composer
         no meio da tela quando a página não rola. */
      try{
        var dock = (input && input.closest) ? (input.closest(".chatDock") || input.closest(".zun-dm-win .zun-comp") || input.closest(".zun-comp")) : null;
        if(dock){
          if(p.parentNode !== dock) dock.appendChild(p);
          if(getComputedStyle(dock).position === "static") dock.style.position = "relative";
          p.style.position = "absolute"; p.style.left = "0"; p.style.right = "0";
          p.style.top = "auto"; p.style.bottom = "calc(100% + 8px)"; p.style.width = "auto";
          /* cabe no espaço acima do composer (topo fixo + margem) */
          try{
            var avail = input.getBoundingClientRect().top - 84;
            var maxH = Math.min(Math.round(innerHeight*0.5), Math.floor(avail));
            if(!(maxH >= 200)) maxH = 200;
            p.style.maxHeight = maxH + "px";
          }catch(eMH){ p.style.maxHeight = "40dvh"; }
          p.hidden = false;
          try{ p.scrollTop = 0; }catch(e){}
          gotoSec(section || "anim");
          return;
        }
      }catch(eDock){}
      if(p.parentNode !== document.body) document.body.appendChild(p);
      p.style.position = ""; p.style.left = ""; p.style.right = "";
      p.style.bottom = ""; p.style.top = ""; p.style.width = "";
      p.hidden = false;
      try{ p.scrollTop = 0; }catch(e){}
      gotoSec(section || "anim");
      return;
    }
    /* DM: a janela não tem .chatDock/.box — ancora no composer da janela
       (antes o painel só reabria onde estava: no chat pub/priv) */
    try{
      var dmComp = (input && input.closest) ? input.closest(".zun-dm-win .zun-comp") : null;
      if(dmComp){
        if(p.parentNode !== dmComp) dmComp.appendChild(p);
        p.style.position = "absolute"; p.style.left = "0"; p.style.right = "0";
        p.style.width = "auto"; p.style.top = "auto";
        p.style.bottom = "calc(100% + 6px)";
        p.hidden = false;
        return;
      }
    }catch(eDM){}
    /* ancora no wrap do botão, se existir; senão fixa perto do input */
    var wrap = input && input.closest ? input.closest(".chatDock,.box") : null;
    var btn = wrap ? wrap.querySelector(".emojiWrap") : null;
    /* feed tem .box (acha acima); nodal/depoimento não: procura o wrap vizinho
       (mesmo pai do campo — ex. barra do depoimento, linha do nodal) */
    if(!btn){
      try{
        var par = input && input.parentNode ? input.parentNode : null;
        if(par && par.querySelector) btn = par.querySelector(".emojiWrap");
      }catch(eNW){}
    }
    if(btn && btn.appendChild){
      try{ if(getComputedStyle(btn).position === "static") btn.style.position = "relative"; }catch(eRP){}
      if(p.parentNode !== btn) btn.appendChild(p);
      p.style.position = "absolute"; p.style.left = "0"; p.style.right = "auto";
      p.style.width = ""; p.style.bottom = "calc(100% + 8px)"; p.style.top = "auto";
    }
    p.hidden = false;
  }catch(e){ try{ p.hidden = false; }catch(e2){} }
}

window.ZunEmoji = {
  anim: ANIM, order: ORDER, uni: UNI,
  enhance: enhance, scanLog: scanLog, combo: combo,
  toggleFor: toggleFor, gotoSec: gotoSec, codesIn: codesIn, twemojiUrl: twemojiUrl
};

/* observa logs e aplica emoji + combo sem mexer no app.js */
function hookLog(id, roomFn){
  var el = document.getElementById(id);
  if(!el || el._zemoHook) return;
  el._zemoHook = true;
  try{
    enhance(el);
    gmEnhance(el);
    emptyHint(el);
    scanLog(el, typeof roomFn === "function" ? roomFn() : roomFn);
  }catch(e){}
  try{
    new MutationObserver(function(){
      try{ enhance(el); }catch(e){}
      try{ gmEnhance(el); }catch(e){}
      try{ emptyHint(el); }catch(e){}
      try{ scanLog(el, typeof roomFn === "function" ? roomFn() : roomFn); }catch(e){}
    }).observe(el, {childList:true, subtree:false});
  }catch(e){}
}
function emptyHint(el){
  try{
    var rows = 0, hints = [];
    for(var i = 0; i < el.children.length; i++){
      var c = el.children[i];
      if(c.dataset && c.dataset.zempty) hints.push(c);
      else rows++;
    }
    if(!rows && !hints.length){
      var d = document.createElement("div");
      d.dataset.zempty = "1";
      d.className = "meta";
      d.style.cssText = "border:0 !important;background:none !important;box-shadow:none !important;text-align:center;padding:10px !important";
      d.textContent = tr("nenhuma mensagem ainda — diga oi! 👋");
      el.appendChild(d);
    } else if(rows) hints.forEach(function(h){ try{ h.remove(); }catch(e){} });
  }catch(e){}
}
function boot(){
  try{ hookLog("pubLog", function(){ try{ return "pub:"+(window.pubRoom||"geral"); }catch(e){ return "pub"; } }); }catch(e){}
  try{ hookLog("privLog", function(){ try{ return "priv:"+(window.privRoom||""); }catch(e){ return "priv"; } }); }catch(e){}
  try{
    var fc = document.getElementById("feedCtn");
    if(fc && !fc._zemoHook){
      fc._zemoHook = true;
      try{ enhance(fc); }catch(e){}
      try{ gmEnhance(fc); }catch(e){}
      try{ new MutationObserver(function(){ try{ enhance(fc); }catch(e){} try{ gmEnhance(fc); }catch(e){} }).observe(fc, {childList:true, subtree:true}); }catch(e){}
    }
  }catch(e){}
  try{
    var pd = document.getElementById("profDepo");
    if(pd && !pd._zemoHook){
      pd._zemoHook = true;
      try{ new MutationObserver(function(){ try{ enhance(pd); }catch(e){} try{ gmEnhance(pd); }catch(e){} }).observe(pd, {childList:true, subtree:true}); }catch(e){}
    }
  }catch(e){}
}
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
setTimeout(boot, 1500);
setTimeout(boot, 4000);
})();
