/* ZunFmtBar — barra "big bbcode + moderno" COMPARTILHADA.
   Uma única barra de formatação usada em todos os lugares que enviam texto
   (feed, respostas, chats pub/priv, DM, depoimentos, nodal, sugestões),
   EXCETO o mural. Render das tags = fmtChat (app.js): [b][i][u][s][c][size][f].
   A barra tem class "fbar" de propósito: reusa o CSS .fbar da base + neo +
   noturno + mobile sem precisar tocar nos seletores longos do index.html.
   CSS próprio mínimo vai em #zunFmtCss abaixo (sem !important: perde com
   dignidade p/ noturno/festa/healer/tema do usuário). */
(function(){
"use strict";
/* ícones em SVG (emoji 🧹👁🎨 vira ☐ em aparelho sem fonte emoji) */
var SVG_EYE = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8" cy="8" r="2.2" fill="currentColor"/></svg>';
var SVG_CLR = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M9.7 2.1l4.2 4.2L7 13.2l-4.9.7.7-4.9z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M2 15.2h11.5" stroke="currentColor" stroke-width="1.6"/></svg>';
var SVG_PAINT = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M8 1.5S3.5 7 3.5 10a4.5 4.5 0 009 0c0-3-4.5-8.5-4.5-8.5z" fill="currentColor"/></svg>';
function lang(){ try{ var l = String(window.zunzumLang||"pt").slice(0,2).toLowerCase(); return (l==="en"||l==="es") ? l : "pt"; }catch(e){ return "pt"; } }
var T = {
  b:  {pt:"negrito",               en:"bold",                   es:"negrita"},
  i:  {pt:"itálico",              en:"italic",                 es:"cursiva"},
  u:  {pt:"sublinhado",           en:"underline",              es:"subrayado"},
  s:  {pt:"riscado",              en:"strikethrough",          es:"tachado"},
  c:  {pt:"pintar seleção com esta cor", en:"paint selection with this color", es:"pintar selección con este color"},
  cb: {pt:"cor",                  en:"color",                  es:"color"},
  sz: {pt:"tamanho da letra",     en:"font size",              es:"tamaño de letra"},
  fn: {pt:"fonte",                en:"font",                   es:"fuente"},
  cl: {pt:"limpar formatação",    en:"clear formatting",       es:"quitar formato"},
  pv: {pt:"prévia do formatado",  en:"formatted preview",      es:"vista previa"},
  ph: {pt:"formatação",           en:"formatting",             es:"formato"}
};
function t(k){ var l = lang(); try{ return T[k][l] || T[k].pt; }catch(e){ return k; } }
/* fontes = exatamente a allowlist do fmtChat (só essas viram <span>) */
var FONTS = ["Arial","Georgia","Verdana","Trebuchet MS","Courier New","Comic Sans MS","Impact","Palatino","Tahoma","Times New Roman","monospace","cursive","fantasy","system-ui"];
var SIZES = ["12","14","16","20","24","28"];
function doWrap(input, open, close){
  try{
    if(typeof wrapIn === "function") wrapIn(input, open, close);
    else {
      var s = input.selectionStart||0, e = input.selectionEnd||0, v = input.value;
      var sel = v.slice(s, e) || "texto";
      input.value = v.slice(0, s) + open + sel + close + v.slice(e);
      try{ input.focus(); }catch(e2){}
    }
    try{ input.dispatchEvent(new Event("input", {bubbles:true})); }catch(e3){}
    try{ paintPrev(input); }catch(e4){}
  }catch(e){}
}
function stripTags(s){
  return String(s||"")
    .replace(/\[\/(b|i|u|s|c|size|f)\]/gi, "")
    .replace(/\[(b|i|u|s)\]/gi, "")
    .replace(/\[c=[^\]]*\]/gi, "")
    .replace(/\[size=[^\]]*\]/gi, "")
    .replace(/\[f=[^\]]*\]/gi, "");
}
function mkBtn(labelHtml, title, fn){
  var b = document.createElement("button");
  b.type = "button"; b.innerHTML = labelHtml; b.title = title;
  b.setAttribute("aria-label", title);
  b.onclick = function(ev){ try{ ev.stopPropagation(); }catch(e){} fn(); };
  return b;
}
function mkSep(){
  var s = document.createElement("span");
  s.className = "zsep"; s.textContent = "|"; s.setAttribute("aria-hidden", "true");
  return s;
}
function sizeSel(input){
  var s = document.createElement("select"); s.title = t("sz");
  var ph = document.createElement("option"); ph.value = ""; ph.textContent = "A±"; s.appendChild(ph);
  SIZES.forEach(function(v){ var o = document.createElement("option"); o.value = v; o.textContent = v; s.appendChild(o); });
  s.onchange = function(){ if(s.value) doWrap(input, "[size="+s.value+"]", "[/size]"); s.value = ""; try{ input.focus(); }catch(e){} };
  return s;
}
function fontSel(input){
  var s = document.createElement("select"); s.title = t("fn");
  var ph = document.createElement("option"); ph.value = ""; ph.textContent = "Aa"; s.appendChild(ph);
  FONTS.forEach(function(v){ var o = document.createElement("option"); o.value = v; o.textContent = v; s.appendChild(o); });
  s.onchange = function(){ if(s.value) doWrap(input, "[f="+s.value+"]", "[/f]"); s.value = ""; try{ input.focus(); }catch(e){} };
  return s;
}
function paintPrev(input){
  try{
    var p = input._zunfmtPrev;
    if(!p || p.hidden) return;
    var v = input.value || "";
    if(typeof fmtChat === "function") p.innerHTML = v ? fmtChat(v) : "<span class='meta'>"+escPrev(t("pv"))+"</span>";
    else p.textContent = v;
  }catch(e){}
}
function escPrev(s){ try{ var d = document.createElement("div"); d.textContent = String(s); return d.innerHTML; }catch(e){ return ""; } }
function ensureCss(){
  if(document.getElementById("zunFmtCss")) return;
  var st = document.createElement("style"); st.id = "zunFmtCss";
  st.textContent =
    ".zunfmtbar .zsep{opacity:.45;font-size:12px;user-select:none}" +
    ".zunfmtbar button svg{display:block;pointer-events:none}" +
    ".zunfmtbar.mini button{font-size:11px;padding:1px 5px}" +
    ".zunfmtbar.mini select{font-size:11px;max-width:76px}" +
    ".zunfmtbar select{border:1px solid #b6c9db;background:#eef4fb;border-radius:5px;padding:1px 3px;cursor:pointer;color:#111}" +
    ".zunfmt-prev{border:1px dashed #6aa5d7;border-radius:8px;padding:6px;margin-top:4px;font-size:13px;word-break:break-word;background:#fbfdff;color:#111}" +
    "body.zun-night .zunfmt-prev{background:#16161e;color:#eee;border-color:#4a4a6c}" +
    "body.zun-night .zunfmtbar select{background:#2a2a45;color:#cfd2ff;border-color:#4a4a6c}";
  document.head.appendChild(st);
}
/* full = barra completa (B I U S cor tam fonte limpar prévia).
   attach(input, {mode:"extend"}) = SÓ tam/fonte/limpar/prévia (p/ pub/priv,
   que já têm B I U S cor com fiação antiga funcionando). */
function buildFull(input, compact){
  var bar = document.createElement("div");
  bar.className = "fbar zunfmtbar" + (compact ? " mini" : "");
  bar.setAttribute("role", "toolbar"); bar.setAttribute("aria-label", t("ph"));
  bar.appendChild(mkBtn("<b>B</b>", t("b"), function(){ doWrap(input, "[b]", "[/b]"); }));
  bar.appendChild(mkBtn("<i>I</i>", t("i"), function(){ doWrap(input, "[i]", "[/i]"); }));
  bar.appendChild(mkBtn("<u>U</u>", t("u"), function(){ doWrap(input, "[u]", "[/u]"); }));
  bar.appendChild(mkBtn("<s>S</s>", t("s"), function(){ doWrap(input, "[s]", "[/s]"); }));
  var col = document.createElement("input"); col.type = "color"; col.value = "#ff0000"; col.title = t("c");
  bar.appendChild(col);
  bar.appendChild(mkBtn(SVG_PAINT, t("c"), function(){ doWrap(input, "[c="+col.value+"]", "[/c]"); }));
  bar.appendChild(mkSep());
  bar.appendChild(sizeSel(input));
  bar.appendChild(fontSel(input));
  bar.appendChild(mkSep());
  bar.appendChild(mkBtn(SVG_CLR, t("cl"), function(){
    try{ input.value = stripTags(input.value); input.focus(); input.dispatchEvent(new Event("input", {bubbles:true})); paintPrev(input); }catch(e){}
  }));
  bar.appendChild(mkBtn(SVG_EYE, t("pv"), function(){ togglePrev(input); }));
  return bar;
}
function buildExtend(input){
  var frag = document.createDocumentFragment();
  frag.appendChild(mkSep());
  frag.appendChild(sizeSel(input));
  frag.appendChild(fontSel(input));
  frag.appendChild(mkBtn(SVG_CLR, t("cl"), function(){
    try{ input.value = stripTags(input.value); input.focus(); input.dispatchEvent(new Event("input", {bubbles:true})); paintPrev(input); }catch(e){}
  }));
  frag.appendChild(mkBtn(SVG_EYE, t("pv"), function(){ togglePrev(input); }));
  return frag;
}
function togglePrev(input){
  try{
    var p = input._zunfmtPrev;
    if(!p){
      p = document.createElement("div");
      p.className = "zunfmt-prev"; p.hidden = true;
      input._zunfmtPrev = p;
      var row = null;
      try{ row = input.closest(".composerRow,.zun-row,#nodalComp"); }catch(e){}
      if(row && row.parentNode) row.parentNode.insertBefore(p, row.nextSibling);
      else if(input.parentNode) input.parentNode.insertBefore(p, input.nextSibling);
      try{ input.addEventListener("input", function(){ paintPrev(input); }); }catch(e){}
    }
    p.hidden = !p.hidden;
    paintPrev(input);
    try{ if(!p.hidden) input.focus(); }catch(e){}
  }catch(e){}
}
function attach(input, opts){
  try{
    if(!input || !input.parentNode) return null;
    if(input._zunfmt) return input._zunfmt;
    ensureCss();
    opts = opts || {};
    var bar;
    if(opts.bar){ bar = opts.bar; bar.appendChild(buildExtend(input)); }
    else {
      bar = buildFull(input, !!opts.compact);
      var at = opts.before || input;
      try{ if(!at.parentNode && at!==input && input.parentNode) at = input; }catch(e){}
      if(at.parentNode) at.parentNode.insertBefore(bar, at);
    }
    input._zunfmt = bar;
    return bar;
  }catch(e){ return null; }
}
function boot(){
  try{
    ensureCss();
    var ti = document.getElementById("textInput");
    if(ti && !ti._zunfmt){
      var row = null;
      try{ row = ti.parentNode.querySelector(".composerRow") || ti.nextElementSibling; }catch(e){}
      attach(ti, row ? {before: row} : {});
    }
    var sg = document.getElementById("sugText");
    if(sg && !sg._zunfmt) attach(sg, {});
    try{
      var pb = document.getElementById("pubBar"), pi = document.getElementById("pubInput");
      if(pb && pi && !pi._zunfmt){ pb.appendChild(buildExtend(pi)); pi._zunfmt = pb; }
    }catch(e){}
    try{
      var vb = document.getElementById("privBar"), vi = document.getElementById("privMsgInput");
      if(vb && vi && !vi._zunfmt){ vb.appendChild(buildExtend(vi)); vi._zunfmt = vb; }
    }catch(e){}
  }catch(e){}
}
window.ZunFmtBar = {attach: attach, strip: stripTags, boot: boot, togglePrev: togglePrev};
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();
})();
