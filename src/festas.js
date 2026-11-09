/* zunzum festas — temas comemorativos AUTOMÁTICOS (não são presets normais).
   Em datas comemorativas o site inteiro muda radicalmente por 1 semana:
   logo variante + paleta + fundo + Cabeçalho + caixas + botões.
   - NÃO aparece em nenhum seletor de tema (themeSet/roomTheme/THEME_PRESETS):
     só entra sozinho pela data. Hook de teste: ?festa=<id> ou
     window.zunFestaPreview("<id>") — fora da UI, só p/ teste.
   - Não toca em tema de perfil (profCard) nem de sala: é o "tema padrão" do
     site que muda. Modo noturno é suspenso na semana da festa (a festa já
     traz a própria paleta, inclusive as escuras).
    - Tudo com body[data-zunfesta="<id>"] + !important, então vence o CSS
      padrão e o tema custom do site por ESPECIFICIDADE (não só por ordem):
      seletor html body[data-zunfesta="<id>"][data-zunfesta] ganha até do
      btnFix do tema do site (html body #wrap .box button) e do CSS cru
      personalizado. Variáveis --zf-* vestem modais/perfil/navegação e
      injetam o selo SVG nos botões primários (::before com a arte da festa).
   Um vigia mantém #zunFestaCss como último <style> do <head> e o noturno
   fora enquanto a festa está ativa: nenhum script personalizado que
   injetar CSS depois passa por cima. Nada salvo é alterado. */
(function(){
"use strict";
function pascoa(Y){
  var a=Y%19,b=Math.floor(Y/100),c=Y%100,d=Math.floor(b/4),e=b%4,
      f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),
      h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,
      l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),
      x=h+l-7*m+114;
  return {y:Y, m:Math.floor(x/31), d:(x%31)+1};
}
function dAdd(t, n){ var dt=new Date(t.y, t.m-1, t.d+n); return {y:dt.getFullYear(), m:dt.getMonth()+1, d:dt.getDate()}; }
function num(t){ return t.y*10000 + t.m*100 + t.d; }
/* peak(Y) -> {y,m,d} centro da festa naquele ano */
var FESTAS = [
{id:"carnaval", emoji:"🎭",
 peak:function(Y){ return dAdd(pascoa(Y), -47); },
 nome:{pt:"Carnaval", en:"Carnival", es:"Carnaval"},
 slogan:{pt:" — carnaval no zunzum: confete e serpentina!", en:" — carnival at zunzum: confetti everywhere!", es:" — carnaval en zunzum: ¡confeti por todos lados!"},
 bar:{pt:"🎭 semana de carnaval no zunzum — confete, serpentina e marchinhas!", en:"🎭 carnival week at zunzum!", es:"🎭 ¡semana de carnaval en zunzum!"},
 badge:"🎭", badgeSvg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5C5.8 2.5 2.5 5.8 2.5 9.5c0 4.2 3.2 7.3 6.6 8.4L10.5 22l1.5-2.6L13.5 22l1.4-4.1c3.4-1.1 6.6-4.2 6.6-8.4 0-3.7-3.3-7-9.5-7z" fill="#7b1fa2"/><ellipse cx="8.8" cy="10" rx="1.7" ry="2.3" fill="#fff"/><ellipse cx="15.2" cy="10" rx="1.7" ry="2.3" fill="#fff"/><path d="M8 14.5c2.5 1.8 5.5 1.8 8 0" stroke="#ffd700" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>', logoFilter:"saturate(2) hue-rotate(-15deg)",
 css:"body{background:#3d0b52!important;background-image:radial-gradient(circle,#ffea00 2.4px,transparent 3px),radial-gradient(circle,#00e5ff 2px,transparent 2.6px),radial-gradient(circle,#ff4081 2.2px,transparent 2.8px),radial-gradient(circle,#76ff03 2px,transparent 2.6px)!important;background-size:34px 34px,26px 26px,30px 30px,22px 22px!important;background-position:0 0,9px 12px,17px 4px,5px 20px!important;color:#fff!important}"
 +"body[data-zunfesta=\"carnaval\"] #top{background:linear-gradient(100deg,#ff0080,#ff9100 30%,#ffea00 50%,#00e676 70%,#00b0ff 90%)!important;border-bottom:5px dotted #fff!important;color:#3d0b52!important}"
 +"body[data-zunfesta=\"carnaval\"] #top h1{font-family:\"Comic Sans MS\",\"Chalkboard SE\",cursive!important;color:#3d0b52!important;text-shadow:2px 2px 0 #ffea00!important;letter-spacing:1px!important}"
 +"body[data-zunfesta=\"carnaval\"] #top .top-sub,body[data-zunfesta=\"carnaval\"] #top .top-desc,body[data-zunfesta=\"carnaval\"] #top .meta{color:#3d0b52!important;opacity:1!important}"
 +"body[data-zunfesta=\"carnaval\"] #topBtns button{background:#3d0b52!important;color:#ffea00!important;border:2px solid #ffea00!important;border-radius:14px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"carnaval\"] #wrap .box,body[data-zunfesta=\"carnaval\"] #zunMPages .box,body[data-zunfesta=\"carnaval\"] #seoBox .box{background:#fff9c4!important;color:#3d0b52!important;border:3px dashed #ff0080!important;border-radius:16px!important}"
 +"body[data-zunfesta=\"carnaval\"] #wrap .box h3{background:linear-gradient(90deg,#ff0080,#ff9100)!important;color:#fff!important;border-radius:12px 12px 0 0!important;font-family:\"Comic Sans MS\",cursive!important}"
 +"body[data-zunfesta=\"carnaval\"] #wrap .box button,body[data-zunfesta=\"carnaval\"] #zunMPages .box button{background:#00b0ff!important;color:#fff!important;border:2px solid #3d0b52!important;border-radius:12px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"carnaval\"] #wrap .chatlog{background:#fff!important;border:2px dotted #ff0080!important}"
 +"body[data-zunfesta=\"carnaval\"] #topLogoImg{filter:saturate(2) hue-rotate(-15deg)!important;border:3px solid #ffea00!important;border-radius:50%!important}"
 
 +"body[data-zunfesta=\"carnaval\"] #zunFestaBar{background:linear-gradient(90deg,#ff0080,#ffea00,#00e676,#00b0ff,#ff0080)!important;color:#3d0b52!important;font-weight:bold!important}"},
{id:"pascoa", emoji:"🐰",
 peak:function(Y){ return pascoa(Y); },
 nome:{pt:"Páscoa", en:"Easter", es:"Pascua"},
 slogan:{pt:" — páscoa no zunzum: caça aos ovos!", en:" — easter at zunzum: egg hunt!", es:" — ¡pascua en zunzum: búsqueda de huevos!"},
 bar:{pt:"🐰 semana de páscoa no zunzum — caça aos ovos!", en:"🐰 easter week at zunzum!", es:"🐰 ¡semana de pascua en zunzum!"},
 badge:"🐰", badgeSvg:'<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="8" cy="7" rx="2.7" ry="5.2" fill="#fafafa" transform="rotate(-10 8 7)"/><ellipse cx="16" cy="7" rx="2.7" ry="5.2" fill="#fafafa" transform="rotate(10 16 7)"/><ellipse cx="8" cy="7.6" rx="1.2" ry="3.2" fill="#f8bbd0" transform="rotate(-10 8 7.6)"/><ellipse cx="16" cy="7.6" rx="1.2" ry="3.2" fill="#f8bbd0" transform="rotate(10 16 7.6)"/><circle cx="12" cy="15.5" r="6" fill="#fafafa"/><circle cx="10" cy="14.5" r="1.1" fill="#333"/><circle cx="14" cy="14.5" r="1.1" fill="#333"/><path d="M11 17h2l-1 1.4z" fill="#f48fb1"/></svg>', logoFilter:"sepia(.5) saturate(1.8) hue-rotate(300deg)",
 css:"body{background:#f3e2c7!important;background-image:radial-gradient(circle,#fff 3px,transparent 3.6px),radial-gradient(circle,#e6a756 2px,transparent 2.6px)!important;background-size:30px 30px,22px 22px!important;background-position:0 0,11px 9px!important;color:#4e2a12!important}"
 +"body[data-zunfesta=\"pascoa\"] #top{background:linear-gradient(180deg,#7b4b26,#a9743c)!important;border-bottom:5px solid #ff8f00!important;color:#fff3e0!important}"
 +"body[data-zunfesta=\"pascoa\"] #top h1{font-family:Georgia,\"Times New Roman\",serif!important;font-style:italic!important;color:#fff3e0!important;text-shadow:2px 2px 0 #4e2a12!important}"
 +"body[data-zunfesta=\"pascoa\"] #top .top-sub,body[data-zunfesta=\"pascoa\"] #top .top-desc,body[data-zunfesta=\"pascoa\"] #top .meta{color:#ffe0b2!important;opacity:1!important}"
 +"body[data-zunfesta=\"pascoa\"] #topBtns button{background:#ff8f00!important;color:#4e2a12!important;border:2px solid #fff3e0!important;border-radius:16px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"pascoa\"] #wrap .box,body[data-zunfesta=\"pascoa\"] #zunMPages .box,body[data-zunfesta=\"pascoa\"] #seoBox .box{background:#fffdf5!important;color:#4e2a12!important;border:3px dotted #a9743c!important;border-radius:18px!important}"
 +"body[data-zunfesta=\"pascoa\"] #wrap .box h3{background:#ff8f00!important;color:#4e2a12!important;border-radius:14px 14px 0 0!important;font-family:Georgia,serif!important;font-style:italic!important}"
 +"body[data-zunfesta=\"pascoa\"] #wrap .box button,body[data-zunfesta=\"pascoa\"] #zunMPages .box button{background:#7b4b26!important;color:#fff3e0!important;border:2px solid #ff8f00!important;border-radius:14px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"pascoa\"] #wrap .chatlog{background:#fffdf5!important;border:2px dotted #a9743c!important}"
 +"body[data-zunfesta=\"pascoa\"] #topLogoImg{filter:sepia(.5) saturate(1.8) hue-rotate(300deg)!important;border:3px solid #ff8f00!important;border-radius:50%!important}"
 
 +"body[data-zunfesta=\"pascoa\"] #zunFestaBar{background:#4e2a12!important;color:#ffcc80!important;font-weight:bold!important}"},
{id:"trabalho", emoji:"🏗️",
 peak:function(Y){ return {y:Y, m:5, d:1}; },
 nome:{pt:"Dia do Trabalho", en:"Labour Day", es:"Día del Trabajo"},
 slogan:{pt:" — semana do trabalhador no zunzum!", en:" — workers' week at zunzum!", es:" — ¡semana del trabajador en zunzum!"},
 bar:{pt:"🏗️ semana do trabalhador no zunzum — capacete obrigatório!", en:"🏗️ workers' week at zunzum!", es:"🏗️ ¡semana del trabajador en zunzum!"},
 badge:"⛑️", badgeSvg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13.5C5 8.6 7.8 4.5 12 4.5s7 4.1 7 9v.5H5v-.5z" fill="#f7c600"/><rect x="10.9" y="4.5" width="2.2" height="9.5" fill="#37474f"/><rect x="3" y="14" width="18" height="3.2" rx="1.6" fill="#f7c600"/><rect x="3" y="14" width="18" height="1.3" rx=".65" fill="#ffecb3"/></svg>', logoFilter:"grayscale(.6) contrast(1.3)",
 css:"body{background:#3a3f44!important;background-image:repeating-linear-gradient(0deg,transparent 0 26px,rgba(255,255,255,.05) 26px 28px)!important;color:#f5f5f5!important}"
 +"body[data-zunfesta=\"trabalho\"] #top{background:#22262a!important;border-bottom:8px solid transparent!important;border-image:repeating-linear-gradient(45deg,#f7c600 0 16px,#222 16px 32px) 8!important;color:#f7c600!important}"
 +"body[data-zunfesta=\"trabalho\"] #top h1{font-family:Impact,Haettenschweiler,\"Arial Narrow Bold\",sans-serif!important;letter-spacing:3px!important;text-transform:uppercase!important;color:#f7c600!important}"
 +"body[data-zunfesta=\"trabalho\"] #top .top-sub,body[data-zunfesta=\"trabalho\"] #top .top-desc,body[data-zunfesta=\"trabalho\"] #top .meta{color:#cfd2d6!important;opacity:1!important}"
 +"body[data-zunfesta=\"trabalho\"] #topBtns button{background:#f7c600!important;color:#222!important;border:2px solid #000!important;border-radius:0!important;font-weight:bold!important;text-transform:uppercase!important}"
 +"body[data-zunfesta=\"trabalho\"] #wrap .box,body[data-zunfesta=\"trabalho\"] #zunMPages .box,body[data-zunfesta=\"trabalho\"] #seoBox .box{background:#e8eaed!important;color:#222!important;border:2px solid #222!important;border-left:10px solid #f7c600!important;border-radius:0!important}"
 +"body[data-zunfesta=\"trabalho\"] #wrap .box h3{background:#222!important;color:#f7c600!important;border-radius:0!important;font-family:Impact,sans-serif!important;letter-spacing:2px!important;text-transform:uppercase!important}"
 +"body[data-zunfesta=\"trabalho\"] #wrap .box button,body[data-zunfesta=\"trabalho\"] #zunMPages .box button{background:#222!important;color:#f7c600!important;border:2px solid #f7c600!important;border-radius:0!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"trabalho\"] #wrap .chatlog{background:#f5f5f5!important;border:2px solid #222!important}"
 +"body[data-zunfesta=\"trabalho\"] #topLogoImg{filter:grayscale(.6) contrast(1.3)!important;border:3px solid #f7c600!important;border-radius:0!important}"
 
 +"body[data-zunfesta=\"trabalho\"] #zunFestaBar{background:repeating-linear-gradient(45deg,#f7c600 0 18px,#222 18px 36px)!important;color:#fff!important;font-weight:bold!important;text-shadow:1px 1px 0 #000!important}"},
{id:"namorados", emoji:"💘",
 peak:function(Y){ return {y:Y, m:6, d:12}; },
 nome:{pt:"Dia dos Namorados", en:"Lovers' Day", es:"Día de los Enamorados"},
 slogan:{pt:" — dia dos namorados no zunzum: declare-se!", en:" — lovers' day at zunzum!", es:" — ¡día de los enamorados en zunzum!"},
 bar:{pt:"💘 semana dos namorados no zunzum — declare-se no feed!", en:"💘 lovers' week at zunzum!", es:"💘 ¡semana de los enamorados en zunzum!"},
 badge:"💘", badgeSvg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21C6.2 15.9 2.5 12.4 2.5 8.6 2.5 5.7 4.8 3.6 7.1 3.6c2 0 3.9 1.3 4.9 3.1.9-1.8 2.9-3.1 4.9-3.1 2.3 0 4.6 2.1 4.6 5 0 3.8-3.7 7.3-9.5 12.4z" fill="#ec407a"/><path d="M7 8.5c-.8.8-1.3 1.9-1.3 3" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>', logoFilter:"saturate(1.8) hue-rotate(280deg)",
 css:"body{background:#4a0e1c!important;background-image:radial-gradient(circle,#ff5c8a 2.6px,transparent 3.2px),radial-gradient(circle,#c2185b 1.8px,transparent 2.4px)!important;background-size:30px 30px,20px 20px!important;background-position:0 0,10px 14px!important;color:#ffe4ec!important}"
 +"body[data-zunfesta=\"namorados\"] #top{background:linear-gradient(180deg,#880e4f,#d81b60)!important;border-bottom:5px double #ff9ebb!important;color:#fff!important}"
 +"body[data-zunfesta=\"namorados\"] #top h1{font-family:\"Comic Sans MS\",\"Chalkboard SE\",cursive!important;color:#fff!important;text-shadow:0 0 12px #ff5c8a,2px 2px 0 #880e4f!important}"
 +"body[data-zunfesta=\"namorados\"] #top .top-sub,body[data-zunfesta=\"namorados\"] #top .top-desc,body[data-zunfesta=\"namorados\"] #top .meta{color:#ffc1d6!important;opacity:1!important}"
 +"body[data-zunfesta=\"namorados\"] #topBtns button{background:#fff!important;color:#c2185b!important;border:2px solid #ff5c8a!important;border-radius:20px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"namorados\"] #wrap .box,body[data-zunfesta=\"namorados\"] #zunMPages .box,body[data-zunfesta=\"namorados\"] #seoBox .box{background:#fff0f5!important;color:#880e4f!important;border:3px double #d81b60!important;border-radius:20px!important}"
 +"body[data-zunfesta=\"namorados\"] #wrap .box h3{background:#d81b60!important;color:#fff!important;border-radius:16px 16px 0 0!important;font-family:\"Comic Sans MS\",cursive!important}"
 +"body[data-zunfesta=\"namorados\"] #wrap .box button,body[data-zunfesta=\"namorados\"] #zunMPages .box button{background:#d81b60!important;color:#fff!important;border:2px solid #880e4f!important;border-radius:18px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"namorados\"] #wrap .chatlog{background:#fff!important;border:2px solid #ff9ebb!important}"
 +"body[data-zunfesta=\"namorados\"] #topLogoImg{filter:saturate(1.8) hue-rotate(280deg)!important;border:3px solid #ff5c8a!important;border-radius:50%!important}"
 
 +"body[data-zunfesta=\"namorados\"] #zunFestaBar{background:#880e4f!important;color:#ffc1d6!important;font-weight:bold!important}"},
{id:"junina", emoji:"🌽",
 peak:function(Y){ return {y:Y, m:6, d:24}; },
 nome:{pt:"Festa Junina", en:"June Festival", es:"Fiesta Junina"},
 slogan:{pt:" — arraiá no zunzum: puxe o fole!", en:" — june party at zunzum!", es:" — ¡fiesta junina en zunzum!"},
 bar:{pt:"🔥 arraiá no zunzum — quadrilha, quentão e correio elegante!", en:"🔥 june party week at zunzum!", es:"🔥 ¡semana de fiesta junina en zunzum!"},
 badge:"🔥", badgeSvg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5s6.2 6.2 6.2 11.3a6.2 6.2 0 0 1-12.4 0c0-2.1 1-4 2.1-5.5.4 1.3 1.1 2.4 2.1 3.2-.4-3.2.4-6.7 2-9z" fill="#ff6d00"/><path d="M12 9.2s2.9 2.9 2.9 5.4a2.9 2.9 0 0 1-5.8 0c0-1.7 1.2-3.3 2.9-5.4z" fill="#ffeb3b"/></svg>', logoFilter:"saturate(1.7) hue-rotate(-40deg)",
 css:"body{background:#1d4d2b!important;background-image:repeating-linear-gradient(0deg,rgba(255,255,255,.09) 0 14px,transparent 14px 28px),repeating-linear-gradient(90deg,rgba(255,255,255,.09) 0 14px,transparent 14px 28px)!important;color:#fff8e1!important}"
 +"body[data-zunfesta=\"junina\"] #top{background:linear-gradient(180deg,#0d3b1e 0 34px,#e53935 34px 40px,#ffeb3b 40px 46px,#1e88e5 46px 52px,#43a047 52px 58px,#0d3b1e 58px)!important;color:#ffeb3b!important;border-bottom:4px solid #e53935!important}"
 +"body[data-zunfesta=\"junina\"] #top h1{font-family:\"Courier New\",monospace!important;font-weight:bold!important;color:#ffeb3b!important;text-shadow:2px 2px 0 #7b1fa2!important;letter-spacing:1px!important}"
 +"body[data-zunfesta=\"junina\"] #top .top-sub,body[data-zunfesta=\"junina\"] #top .top-desc,body[data-zunfesta=\"junina\"] #top .meta{color:#ffe082!important;opacity:1!important}"
 +"body[data-zunfesta=\"junina\"] #topBtns button{background:#e53935!important;color:#ffeb3b!important;border:2px dashed #ffeb3b!important;border-radius:6px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"junina\"] #wrap .box,body[data-zunfesta=\"junina\"] #zunMPages .box,body[data-zunfesta=\"junina\"] #seoBox .box{background:#f9f0d4!important;color:#4e342e!important;border:3px dashed #c62828!important;border-radius:6px!important}"
 +"body[data-zunfesta=\"junina\"] #wrap .box h3{background:#2e7d32!important;color:#ffeb3b!important;border-radius:0!important;font-family:\"Courier New\",monospace!important}"
 +"body[data-zunfesta=\"junina\"] #wrap .box button,body[data-zunfesta=\"junina\"] #zunMPages .box button{background:#c62828!important;color:#ffeb3b!important;border:2px solid #4e342e!important;border-radius:6px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"junina\"] #wrap .chatlog{background:#fffdf0!important;border:2px dashed #2e7d32!important}"
 +"body[data-zunfesta=\"junina\"] #topLogoImg{filter:saturate(1.7) hue-rotate(-40deg)!important;border:3px dashed #e53935!important;border-radius:6px!important}"
 
 +"body[data-zunfesta=\"junina\"] #zunFestaBar{background:#c62828!important;color:#ffeb3b!important;font-weight:bold!important}"},
{id:"independencia", emoji:"🇧🇷",
 peak:function(Y){ return {y:Y, m:9, d:7}; },
 nome:{pt:"Independência", en:"Independence Day", es:"Independencia"},
 slogan:{pt:" — semana da pátria no zunzum!", en:" — independence week at zunzum!", es:" — ¡semana de la patria en zunzum!"},
 bar:{pt:"🇧🇷 semana da pátria no zunzum — verde e amarelo!", en:"🇧🇷 independence week at zunzum!", es:"🇧🇷 ¡semana de la patria en zunzum!"},
 badge:"🇧🇷", badgeSvg:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="1.5" y="5" width="21" height="14" rx="2" fill="#009c3b"/><path d="M12 6.8 19.5 12 12 17.2 4.5 12z" fill="#ffdf00"/><circle cx="12" cy="12" r="2.7" fill="#002776"/></svg>', logoFilter:"saturate(1.6)",
 css:"body{background:#e8f0e4!important;background-image:linear-gradient(135deg,transparent 46%,rgba(0,156,59,.18) 46% 54%,transparent 54%),linear-gradient(45deg,transparent 46%,rgba(0,156,59,.18) 46% 54%,transparent 54%)!important;background-size:44px 44px!important;color:#0d3b1e!important}"
 +"body[data-zunfesta=\"independencia\"] #top{background:linear-gradient(135deg,#009c3b 62%,#ffdf00 62% 78%,#002776 78%)!important;color:#fff!important;border-bottom:5px solid #002776!important}"
 +"body[data-zunfesta=\"independencia\"] #top h1{font-family:Verdana,Arial,sans-serif!important;font-weight:bold!important;color:#fff!important;text-shadow:2px 2px 0 #002776!important;letter-spacing:2px!important;text-transform:uppercase!important}"
 +"body[data-zunfesta=\"independencia\"] #top .top-sub,body[data-zunfesta=\"independencia\"] #top .top-desc,body[data-zunfesta=\"independencia\"] #top .meta{color:#ffdf00!important;opacity:1!important}"
 +"body[data-zunfesta=\"independencia\"] #topBtns button{background:#002776!important;color:#ffdf00!important;border:2px solid #ffdf00!important;border-radius:4px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"independencia\"] #wrap .box,body[data-zunfesta=\"independencia\"] #zunMPages .box,body[data-zunfesta=\"independencia\"] #seoBox .box{background:#fff!important;color:#0d3b1e!important;border:3px solid #009c3b!important;border-top:10px solid #ffdf00!important;border-radius:4px!important}"
 +"body[data-zunfesta=\"independencia\"] #wrap .box h3{background:#009c3b!important;color:#ffdf00!important;border-radius:0!important}"
 +"body[data-zunfesta=\"independencia\"] #wrap .box button,body[data-zunfesta=\"independencia\"] #zunMPages .box button{background:#002776!important;color:#fff!important;border:2px solid #009c3b!important;border-radius:4px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"independencia\"] #wrap .chatlog{background:#f4faf2!important;border:2px solid #009c3b!important}"
 +"body[data-zunfesta=\"independencia\"] #topLogoImg{filter:saturate(1.6)!important;border:3px solid #ffdf00!important;border-radius:4px!important}"
 
 +"body[data-zunfesta=\"independencia\"] #zunFestaBar{background:#002776!important;color:#ffdf00!important;font-weight:bold!important}"},
{id:"halloween", emoji:"🎃",
 peak:function(Y){ return {y:Y, m:10, d:31}; },
 nome:{pt:"Halloween", en:"Halloween", es:"Halloween"},
 slogan:{pt:" — halloween no zunzum: doces ou travessuras?", en:" — halloween at zunzum: trick or treat?", es:" — ¡halloween en zunzum: truco o trato?"},
 bar:{pt:"🎃 semana do halloween no zunzum — doces ou travessuras?", en:"🎃 halloween week at zunzum!", es:"🎃 ¡semana de halloween en zunzum!"},
 badge:"🦇", badgeSvg:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="11" y="3.5" width="2.2" height="4" rx="1" fill="#33691e"/><ellipse cx="12" cy="14.5" rx="8.2" ry="6.3" fill="#ff6d00"/><ellipse cx="12" cy="14.5" rx="4.6" ry="6.3" fill="#ef6c00"/><circle cx="9" cy="13.4" r="1.2" fill="#212121"/><circle cx="15" cy="13.4" r="1.2" fill="#212121"/><path d="M9.3 16.8 12 18.6l2.7-1.8-1 2.1-1.7.9-1.7-.9z" fill="#212121"/></svg>', logoFilter:"saturate(1.5) hue-rotate(230deg) brightness(.9)",
 css:"body{background:#0d0714!important;background-image:radial-gradient(circle,#ff6d00 1.6px,transparent 2.2px)!important;background-size:34px 34px!important;color:#e8d5ff!important}"
 +"body[data-zunfesta=\"halloween\"] #top{background:linear-gradient(180deg,#1a0b2e,#3b1f5e)!important;border-bottom:5px solid #ff6d00!important;color:#ffab40!important}"
 +"body[data-zunfesta=\"halloween\"] #top h1{font-family:Impact,Haettenschweiler,sans-serif!important;letter-spacing:5px!important;color:#ff6d00!important;text-shadow:0 0 14px #ff6d00,3px 3px 0 #000!important}"
 +"body[data-zunfesta=\"halloween\"] #top .top-sub,body[data-zunfesta=\"halloween\"] #top .top-desc,body[data-zunfesta=\"halloween\"] #top .meta{color:#ce93d8!important;opacity:1!important}"
 +"body[data-zunfesta=\"halloween\"] #topBtns button{background:#000!important;color:#ff6d00!important;border:2px solid #ff6d00!important;border-radius:50%!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .box,body[data-zunfesta=\"halloween\"] #zunMPages .box,body[data-zunfesta=\"halloween\"] #seoBox .box{background:#1a0f24!important;color:#e8d5ff!important;border:2px solid #ff6d00!important;border-radius:12px!important;box-shadow:0 0 18px rgba(255,109,0,.35)!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .box h3{background:#000!important;color:#ff6d00!important;border-radius:10px 10px 0 0!important;font-family:Impact,sans-serif!important;letter-spacing:3px!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .box button,body[data-zunfesta=\"halloween\"] #zunMPages .box button{background:#ff6d00!important;color:#000!important;border:2px solid #000!important;border-radius:10px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .chatlog{background:#120a1c!important;border:2px solid #6a1b9a!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .chatlog div:not(.avfx){border-color:#3b1f5e!important}"
 +"body[data-zunfesta=\"halloween\"] #topLogoImg{filter:saturate(1.5) hue-rotate(230deg) brightness(.9)!important;border:3px solid #ff6d00!important;border-radius:50%!important}"
 
 +"body[data-zunfesta=\"halloween\"] #zunFestaBar{background:#000!important;color:#ff6d00!important;font-weight:bold!important;border-top:2px solid #ff6d00!important;border-bottom:2px solid #ff6d00!important}"},
{id:"natal", emoji:"🎅",
 peak:function(Y){ return {y:Y, m:12, d:25}; },
 nome:{pt:"Natal", en:"Christmas", es:"Navidad"},
 slogan:{pt:" — feliz natal no zunzum!", en:" — merry christmas at zunzum!", es:" — ¡feliz navidad en zunzum!"},
 bar:{pt:"🎄 semana de natal no zunzum — boas festas!", en:"🎄 christmas week at zunzum!", es:"🎄 ¡semana de navidad en zunzum!"},
 badge:"🎅", badgeSvg:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 15.5C8.5 10.5 13.5 6.5 19.5 4.5l-1.2 4.2c-4.5.8-8.6 3.3-11.3 6.8z" fill="#d32f2f"/><circle cx="20.2" cy="5.6" r="2.3" fill="#fff"/><rect x="2.5" y="14.5" width="19" height="4.4" rx="2.2" fill="#fff"/></svg>', logoFilter:"saturate(1.5) hue-rotate(-25deg)",
 css:"body{background:#0b3d2e!important;background-image:radial-gradient(circle,#fff 2.2px,transparent 2.8px),radial-gradient(circle,rgba(255,255,255,.7) 1.4px,transparent 2px)!important;background-size:36px 36px,24px 24px!important;background-position:0 0,12px 18px!important;color:#fdf6e3!important}"
 +"body[data-zunfesta=\"natal\"] #top{background:linear-gradient(180deg,#b71c1c,#7f0000)!important;border-bottom:5px solid #d4af37!important;color:#ffe9b0!important}"
 +"body[data-zunfesta=\"natal\"] #top h1{font-family:Georgia,\"Times New Roman\",serif!important;font-style:italic!important;color:#ffe9b0!important;text-shadow:0 0 12px #d4af37,2px 2px 0 #4a0000!important}"
 +"body[data-zunfesta=\"natal\"] #top .top-sub,body[data-zunfesta=\"natal\"] #top .top-desc,body[data-zunfesta=\"natal\"] #top .meta{color:#ffd97a!important;opacity:1!important}"
 +"body[data-zunfesta=\"natal\"] #topBtns button{background:#0b3d2e!important;color:#ffd97a!important;border:2px solid #d4af37!important;border-radius:16px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"natal\"] #wrap .box,body[data-zunfesta=\"natal\"] #zunMPages .box,body[data-zunfesta=\"natal\"] #seoBox .box{background:#fdf6e3!important;color:#4a2c14!important;border:3px solid #b71c1c!important;border-radius:10px!important;box-shadow:0 0 0 3px #d4af37!important}"
 +"body[data-zunfesta=\"natal\"] #wrap .box h3{background:#b71c1c!important;color:#ffe9b0!important;border-radius:7px 7px 0 0!important;font-family:Georgia,serif!important;font-style:italic!important}"
 +"body[data-zunfesta=\"natal\"] #wrap .box button,body[data-zunfesta=\"natal\"] #zunMPages .box button{background:#0b3d2e!important;color:#ffe9b0!important;border:2px solid #d4af37!important;border-radius:12px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"natal\"] #wrap .chatlog{background:#fffdf5!important;border:2px solid #b71c1c!important}"
 +"body[data-zunfesta=\"natal\"] #topLogoImg{filter:saturate(1.5) hue-rotate(-25deg)!important;border:3px solid #d4af37!important;border-radius:50%!important}"
 
 +"body[data-zunfesta=\"natal\"] #zunFestaBar{background:linear-gradient(90deg,#7f0000,#b71c1c,#7f0000)!important;color:#ffe9b0!important;font-weight:bold!important;border-top:2px solid #d4af37!important;border-bottom:2px solid #d4af37!important}"},
{id:"anonovo", emoji:"🎆",
 peak:function(Y){ return {y:Y+1, m:1, d:1}; },
 nome:{pt:"Ano Novo", en:"New Year", es:"Año Nuevo"},
 slogan:{pt:" — feliz ano novo no zunzum!", en:" — happy new year at zunzum!", es:" — ¡feliz año nuevo en zunzum!"},
 bar:{pt:"🎆 semana de ano novo no zunzum — feliz ano novo!", en:"🎆 new year week at zunzum — happy new year!", es:"🎆 ¡semana de año nuevo en zunzum — feliz año nuevo!"},
 badge:"🥂", badgeSvg:'<svg viewBox="0 0 24 24" aria-hidden="true"><g stroke="#ffd700" stroke-width="1.7" stroke-linecap="round"><path d="M12 1.5v4.5M12 18v4.5M1.5 12H6M18 12h4.5M4.6 4.6l3.2 3.2M16.2 16.2l3.2 3.2M19.4 4.6l-3.2 3.2M7.8 16.2l-3.2 3.2"/></g><circle cx="12" cy="12" r="2.1" fill="#ff4081"/></svg>', logoFilter:"sepia(.8) saturate(2) hue-rotate(-10deg)",
 css:"body{background:#050508!important;background-image:radial-gradient(circle,#ffd700 1.6px,transparent 2.2px),radial-gradient(circle,#fff 1.2px,transparent 1.8px),radial-gradient(circle,#ff4081 1.4px,transparent 2px)!important;background-size:40px 40px,26px 26px,32px 32px!important;background-position:0 0,13px 7px,5px 21px!important;color:#f5f0dc!important}"
 +"body[data-zunfesta=\"anonovo\"] #top{background:linear-gradient(180deg,#000,#3a2f00)!important;border-bottom:5px solid #ffd700!important;color:#ffd700!important}"
 +"body[data-zunfesta=\"anonovo\"] #top h1{font-family:Palatino,\"Palatino Linotype\",serif!important;color:#ffd700!important;text-shadow:0 0 16px #ffd700,2px 2px 0 #000!important;letter-spacing:2px!important}"
 +"body[data-zunfesta=\"anonovo\"] #top .top-sub,body[data-zunfesta=\"anonovo\"] #top .top-desc,body[data-zunfesta=\"anonovo\"] #top .meta{color:#fff3c4!important;opacity:1!important}"
 +"body[data-zunfesta=\"anonovo\"] #topBtns button{background:#000!important;color:#ffd700!important;border:2px solid #ffd700!important;border-radius:4px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .box,body[data-zunfesta=\"anonovo\"] #zunMPages .box,body[data-zunfesta=\"anonovo\"] #seoBox .box{background:#101014!important;color:#f5f0dc!important;border:2px solid #ffd700!important;border-radius:8px!important;box-shadow:0 0 16px rgba(255,215,0,.3)!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .box h3{background:#000!important;color:#ffd700!important;border-radius:6px 6px 0 0!important;font-family:Palatino,serif!important;letter-spacing:2px!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .box button,body[data-zunfesta=\"anonovo\"] #zunMPages .box button{background:#ffd700!important;color:#000!important;border:2px solid #fff3c4!important;border-radius:6px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .chatlog{background:#0a0a10!important;border:2px solid #8a7500!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .chatlog div:not(.avfx){border-color:#3a2f00!important}"
 +"body[data-zunfesta=\"anonovo\"] #topLogoImg{filter:sepia(.8) saturate(2) hue-rotate(-10deg)!important;border:3px solid #ffd700!important;border-radius:50%!important}"
 
 +"body[data-zunfesta=\"anonovo\"] #zunFestaBar{background:#000!important;color:#ffd700!important;font-weight:bold!important;border-top:2px solid #ffd700!important;border-bottom:2px solid #ffd700!important}"}
];
function festaWindow(f, py){
  var c = f.peak(py);
  return {f:f, c:c, s:num(dAdd(c,-3)), e:num(dAdd(c,3))};
}
/* paleta resumida p/ as regras genéricas (modais, pílulas, campos, selo).
   ac = destaque, on = texto sobre o destaque, card/ink = fundo/texto,
   line = borda. O ícone do selo vem do badge da festa. */
var ZVARS = {
 carnaval:{ac:"#ff0080",on:"#ffffff",card:"#fff9c4",ink:"#3d0b52",line:"#ff0080"},
 pascoa:{ac:"#7b4b26",on:"#fff3e0",card:"#fffdf5",ink:"#4e2a12",line:"#a9743c"},
 trabalho:{ac:"#f7c600",on:"#222222",card:"#e8eaed",ink:"#222222",line:"#222222"},
 namorados:{ac:"#d81b60",on:"#ffffff",card:"#fff0f5",ink:"#880e4f",line:"#d81b60"},
 junina:{ac:"#c62828",on:"#ffeb3b",card:"#f9f0d4",ink:"#4e342e",line:"#c62828"},
 independencia:{ac:"#002776",on:"#ffffff",card:"#ffffff",ink:"#0d3b1e",line:"#009c3b"},
 halloween:{ac:"#ff6d00",on:"#000000",card:"#1a0f24",ink:"#e8d5ff",line:"#ff6d00"},
 natal:{ac:"#0b3d2e",on:"#ffe9b0",card:"#fdf6e3",ink:"#4a2c14",line:"#b71c1c"},
 anonovo:{ac:"#ffd700",on:"#000000",card:"#101014",ink:"#f5f0dc",line:"#ffd700"}
};
/* prefixo forte: html + atributo duplicado. Ganha do btnFix do tema do
   site e de CSS custom com 1 id, por ESPECIFICIDADE (não só por ordem). */
var FESTA_B = "html body[data-zunfesta][data-zunfesta]";
function zunFestaSel(list){ return String(list).split(",").map(function(s){ return FESTA_B+" "+s; }).join(","); }
function zunFestaAt(dt){
  dt = dt || new Date();
  var today = {y:dt.getFullYear(), m:dt.getMonth()+1, d:dt.getDate()};
  var tn = num(today), best = null, bestDist = 1e9, i, py, w, cn;
  for(i=0;i<FESTAS.length;i++){
    for(py=today.y-1; py<=today.y+1; py++){
      w = festaWindow(FESTAS[i], py);
      if(tn >= w.s && tn <= w.e){
        cn = num(w.c);
        var dist = Math.abs(tn-cn);
        if(dist < bestDist){ bestDist = dist; best = FESTAS[i]; }
      }
    }
  }
  return best;
}
function zunFestaLang(){
  try{
    var l = String(window.zunzumLang||"pt").slice(0,2).toLowerCase();
    return (l==="en"||l==="es") ? l : "pt";
  }catch(e){ return "pt"; }
}
function zunSemCssOn(){
  try{ return (typeof zunSemCss==="function") ? !!zunSemCss() : !!window.ZUN_SEMCSS; }
  catch(e){ return !!window.ZUN_SEMCSS; }
}
function zunFestaStripNight(){
  try{ var el = document.getElementById("zunNightCss"); if(el) el.remove(); }catch(e){}
  try{ document.body.classList.remove("zun-night"); }catch(e){}
}
function zunFestaLogo(on, f){
  try{
    var img = document.getElementById("topLogoImg");
    if(!img) return;
    var wrap = document.getElementById("zunLogoWrap");
    if(on){
      if(!wrap){
        wrap = document.createElement("span");
        wrap.id = "zunLogoWrap";
        wrap.setAttribute("style", "position:relative;display:inline-flex;flex:none;");
        img.parentNode.insertBefore(wrap, img);
        wrap.appendChild(img);
        var b = document.createElement("span");
        b.id = "zunLogoBadge";
        b.setAttribute("style", "position:absolute;right:-10px;top:-12px;line-height:1;pointer-events:none;");
        wrap.appendChild(b);
      }
      var _zb = document.getElementById("zunLogoBadge");
      if(_zb){ try{ _zb.innerHTML = f.badgeSvg || ""; }catch(e){} }
      img.style.width = "36px"; img.style.height = "36px";
    } else if(wrap){
      var b2 = document.getElementById("zunLogoBadge");
      if(b2 && b2.parentNode) b2.parentNode.removeChild(b2);
      var par = wrap.parentNode;
      if(par){ par.insertBefore(img, wrap); par.removeChild(wrap); }
      img.style.width = ""; img.style.height = "";
      try{ img.style.filter = ""; img.style.border = ""; img.style.borderRadius = ""; }catch(e){}
    }
  }catch(e){}
}
function zunFestaSlogan(on, f){
  try{
    var sub = document.querySelector("#top .top-sub");
    if(!sub) return;
    if(on){
      if(!sub.dataset.orig) sub.dataset.orig = sub.textContent;
      sub.textContent = f.slogan[zunFestaLang()] || f.slogan.pt;
    } else if(sub.dataset.orig){ sub.textContent = sub.dataset.orig; delete sub.dataset.orig; }
  }catch(e){}
}
function zunFestaBar(on, f){
  try{
    var bar = document.getElementById("zunFestaBar");
    if(on){
      if(!bar){
        bar = document.createElement("div");
        bar.id = "zunFestaBar";
        bar.setAttribute("style", "text-align:center;font-size:13px;padding:6px 10px;");
        var top = document.getElementById("top");
        if(top && top.parentNode) top.parentNode.insertBefore(bar, top.nextSibling);
        else document.body.insertBefore(bar, document.body.firstChild);
      }
      bar.textContent = f.bar[zunFestaLang()] || f.bar.pt;
    } else if(bar && bar.parentNode){ bar.parentNode.removeChild(bar); }
  }catch(e){}
}
/* genérico (vale p/ as 9 festas, via variáveis --zf-* da festa ativa):
   moldura do selo + física dos botões (sombra/hover/clique/foco) + selo nos
   botões primários + pílulas de ação + ferramenta/navegação + modais e
   perfil + campos + links + seleção. */
/* botões primários que ganham o selo SVG da festa (::before). */
var FESTA_ICON_BTNS = "#wrap .box .pfoot button,#wrap .box .fract button,#zunMPages .post .pfoot button,#zunMPages .post .fract button,#wrap .box .composerRow .sendBtn,#wrap .box #postBtn,#wrap .box #sugBtn,#wrap .box #privBtn,#wrap .box #privAskBtn,#wrap .box #privInviteBtn,#wrap .box #privCopyLinkBtn,#wrap .box #pubCreateBtn,#wrap .box #mirBtn,#wrap .box #atalhosGoPost,#wrap .box #atalhosGoChats,#wrap .box #atalhosGoSearch,#wrap .box #atalhosGoDiv,#searchCard #goSearchBtn,#searchCard #sendAnswerBtn,#divulgarCard #divulgarGenBtn,#divulgarCard #divulgarCopyBtn,#divulgarCard #divulgarCopyLinkBtn,#divulgarCard #divulgarCopyAutoBtn,#divulgarCard #divulgarShareBtn,#divulgarCard #divulgarWaBtn,#divulgarCard #divulgarTgBtn,#profCard #profMentionBtn,#profCard #profInviteBtn,#profCard #profShareBtn,#notfoundModal .nfCard button";
function zunFestaIconRule(id, url){ return String(FESTA_ICON_BTNS).split(",").map(function(s){ return 'html body[data-zunfesta="'+id+'"][data-zunfesta] '+s+'::before'; }).join(",")+'{content:url("'+url+'")!important;margin-right:.35em!important;vertical-align:-2px!important}'; }
var FESTA_BASE_CSS =
 zunFestaSel("#zunLogoWrap")+"{position:relative;display:inline-flex;flex:none}"
+zunFestaSel("#zunLogoBadge")+"{position:absolute;right:-10px;top:-12px;line-height:1;pointer-events:none}"
+zunFestaSel("#zunLogoBadge svg")+"{width:22px;height:22px;display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,.55))}"
+zunFestaSel("#zunFestaBar")+"{text-align:center;font-size:13px;padding:6px 10px}"
+zunFestaSel("#topLogoImg")+"{width:36px;height:36px}"
+zunFestaSel("#topBtns button:not(.miniAv),#wrap .box button:not(.miniAv),#zunMPages .box button:not(.miniAv),#zunMBar button,#searchCard button,#profCard button,#divulgarCard button,#nodalCard button,#zunTokPanel button,#notfoundModal .nfCard button")+"{box-shadow:2px 2px 0 rgba(0,0,0,.35)!important;cursor:pointer!important;transition:filter .12s ease,transform .08s ease!important}"
+zunFestaSel("#topBtns button:not(.miniAv):hover,#wrap .box button:not(.miniAv):hover,#zunMPages .box button:not(.miniAv):hover,#zunMBar button:hover,#searchCard button:hover,#profCard button:hover,#divulgarCard button:hover,#nodalCard button:hover,#zunTokPanel button:hover,#notfoundModal .nfCard button:hover")+"{filter:brightness(1.1)!important}"
+zunFestaSel("#topBtns button:not(.miniAv):active,#wrap .box button:not(.miniAv):active,#zunMPages .box button:not(.miniAv):active,#zunMBar button:active,#searchCard button:active,#profCard button:active,#divulgarCard button:active,#nodalCard button:active,#zunTokPanel button:active,#notfoundModal .nfCard button:active")+"{transform:translateY(1px)!important;box-shadow:none!important}"
+zunFestaSel("#topBtns button:not(.miniAv):focus-visible,#wrap .box button:not(.miniAv):focus-visible,#zunMPages .box button:not(.miniAv):focus-visible,#zunMBar button:focus-visible,#searchCard button:focus-visible,#profCard button:focus-visible,#divulgarCard button:focus-visible,#nodalCard button:focus-visible,#zunTokPanel button:focus-visible,#notfoundModal .nfCard button:focus-visible")+"{outline:3px solid var(--zf-line)!important;outline-offset:1px!important}"
+"" /* selo dos botões primários: regra por festa via zunFestaIconRule (SVG em data URI) */
+zunFestaSel("#wrap .post .pfoot button,#wrap .post .freply button,#zunMPages .post .pfoot button,#zunMPages .post .freply button")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border:2px solid var(--zf-line)!important;border-radius:999px!important;font-weight:bold!important}"
+zunFestaSel("#wrap .post,#zunMPages .post")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border-color:var(--zf-line)!important}"
+zunFestaSel("#wrap .post .pbody,#zunMPages .post .pbody,#wrap .post .phead,#zunMPages .post .phead")+ "{color:var(--zf-ink)!important}"
+zunFestaSel("#wrap .post .chatname,#zunMPages .post .chatname")+ "{color:var(--zf-ink)!important}"
+zunFestaSel("#wrap .post .ptime,#zunMPages .post .ptime,#wrap .post .meta,#zunMPages .post .meta")+ "{color:var(--zf-ink)!important;opacity:.75!important}"
+zunFestaSel("#wrap .freply,#zunMPages .freply")+ "{background:var(--zf-card)!important;color:var(--zf-ink)!important;border-color:var(--zf-line)!important}"
+zunFestaSel("#wrap .freply .frbody,#zunMPages .freply .frbody,#wrap .freply .frhead,#zunMPages .freply .frhead")+ "{color:var(--zf-ink)!important}"
+zunFestaSel("#wrap .chatlog,#zunMPages .chatlog")+ "{background:var(--zf-card)!important;color:var(--zf-ink)!important;border-color:var(--zf-line)!important}"
+zunFestaSel("#wrap .chatlog div:not(.avfx),#zunMPages .chatlog div:not(.avfx)")+ "{background:var(--zf-card)!important;color:var(--zf-ink)!important;border-color:var(--zf-line)!important}"
+zunFestaSel("#wrap .chatlog div.mine,#zunMPages .chatlog div.mine")+ "{background:var(--zf-card)!important;color:var(--zf-ink)!important;border-color:var(--zf-line)!important;box-shadow:inset 0 0 0 2px var(--zf-line)!important}"
+zunFestaSel("#wrap .chatlog .ttext,#zunMPages .chatlog .ttext,#wrap .chatlog .chatname,#zunMPages .chatlog .chatname,#wrap .chatlog .meta,#zunMPages .chatlog .meta,#wrap .chatlog a,#zunMPages .chatlog a,#wrap .chatlog .zquote,#zunMPages .chatlog .zquote,#wrap .chatlog .zq-nick,#zunMPages .chatlog .zq-nick")+ "{color:var(--zf-ink)!important}"
+zunFestaSel("#wrap .chatlog .zquote,#zunMPages .chatlog .zquote")+ "{background:var(--zf-card)!important;border-left:3px solid var(--zf-ac)!important}"
+zunFestaSel("#wrap .reactPick,#zunMPages .reactPick")+ "{background:var(--zf-card)!important;color:var(--zf-ink)!important;border-color:var(--zf-line)!important}"
+zunFestaSel("#wrap .mention,#zunMPages .mention,#wrap .mention-me,#zunMPages .mention-me")+ "{background:var(--zf-ac)!important;color:var(--zf-on)!important;border:1px solid var(--zf-line)!important}"
+zunFestaSel("#wrap .box .fbar button")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border:1px solid var(--zf-line)!important;border-radius:6px!important;box-shadow:none!important}"
+zunFestaSel("#wrap #pubTopicsBar button,#zunMSub button,#zunMBar button")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border:2px solid var(--zf-line)!important}"
+zunFestaSel("#wrap #pubTopicsBar button.on,#zunMSub button.on,#zunMBar button.on")+"{background:var(--zf-ac)!important;color:var(--zf-on)!important;border-color:var(--zf-line)!important}"
+zunFestaSel("#profCard,#searchCard,#divulgarCard,#nodalCard,#zunTokPanel,#notfoundModal .nfCard")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border:3px solid var(--zf-line)!important}"
/* DM acompanha a festa (janela, cabeçalho, conversa, balões, composer) */
+zunFestaSel("#zunDMRoot .zun-dm-win")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border:3px solid var(--zf-line)!important}"
+zunFestaSel("#zunDMRoot .zun-dm-h")+"{background:var(--zf-ac)!important;color:var(--zf-on)!important;border-color:var(--zf-line)!important}"
+zunFestaSel("#zunDMRoot .zun-dm-h *")+"{color:var(--zf-on)!important}"
+zunFestaSel("#zunDMRoot .zun-dm-log")+"{background:var(--zf-card)!important}"
+zunFestaSel("#zunDMRoot .zun-bub.mine")+"{background:var(--zf-ac)!important;color:var(--zf-on)!important}"
+zunFestaSel("#zunDMRoot .zun-bub.theirs")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border:2px solid var(--zf-line)!important}"
+zunFestaSel("#zunDMRoot .zun-comp,#zunDMRoot .zun-typing")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border-color:var(--zf-line)!important}"
+zunFestaSel("#zunDMRoot textarea,#zunDMRoot input")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border:2px solid var(--zf-line)!important}"
+zunFestaSel("#zunDMRoot .zun-row button")+"{background:var(--zf-ac)!important;color:var(--zf-on)!important;border:2px solid var(--zf-line)!important}"
+zunFestaSel("#zunDMRoot .zun-dm-priv")+"{color:var(--zf-ink)!important;opacity:.75}"
+zunFestaSel("#profCard .meta,#searchCard .meta,#divulgarCard .meta,#nodalCard .meta,#zunTokPanel .meta,#notfoundModal .nfMsg")+"{color:var(--zf-ink)!important;opacity:.75}"
+zunFestaSel("#profCard button,#searchCard button,#divulgarCard button,#nodalCard button,#zunTokPanel button,#notfoundModal .nfCard button")+"{background:var(--zf-ac)!important;color:var(--zf-on)!important;border:2px solid var(--zf-line)!important;border-radius:10px!important;font-weight:bold!important}"
+zunFestaSel("#wrap input:not([type=color]):not([type=checkbox]):not([type=radio]),#wrap select,#wrap textarea,#zunMPages input:not([type=color]):not([type=checkbox]):not([type=radio]),#zunMPages select,#zunMPages textarea,#searchCard input:not([type=color]):not([type=checkbox]):not([type=radio]),#searchCard select,#searchCard textarea,#profCard input:not([type=color]):not([type=checkbox]):not([type=radio]),#profCard select,#profCard textarea,#divulgarCard input:not([type=color]):not([type=checkbox]):not([type=radio]),#divulgarCard select,#divulgarCard textarea,#nodalCard input:not([type=color]):not([type=checkbox]):not([type=radio]),#nodalCard select,#nodalCard textarea,#zunTokPanel input:not([type=color]):not([type=checkbox]):not([type=radio]),#zunTokPanel select,#zunTokPanel textarea")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border:2px solid var(--zf-line)!important}"
+zunFestaSel("#wrap .post a,#wrap .box a")+"{color:var(--zf-ink)!important}"
/* nodal acompanha a festa (cartão já entra na regra dos modais acima) */
+zunFestaSel("#nodalLog")+"{background:var(--zf-card)!important;border-color:var(--zf-line)!important}"
+zunFestaSel("#nodalLog .nmsg")+"{color:var(--zf-ink)!important}"
+zunFestaSel("#nodalCard .fbar button")+"{background:var(--zf-card)!important;color:var(--zf-ink)!important;border:1px solid var(--zf-line)!important;box-shadow:none!important}"
/* tokens do anon: cabeçalho do painel veste o destaque da festa */
+zunFestaSel("#zunTokPanel h3,#zunTokPanel .zun-mhead")+"{background:var(--zf-ac)!important;color:var(--zf-on)!important;border-color:var(--zf-line)!important}";
/* mantém #zunFestaCss como ÚLTIMO <style> do <head> enquanto a festa está
   ativa: qualquer script personalizado que injetar CSS depois (tema do site,
   tema de sala/perfil, noturno) cai para baixo da festa na cascata. */
function zunFestaLast(){
  try{
    if(!window.ZUN_FESTA) return;
    var el = document.getElementById("zunFestaCss");
    if(!el || !el.parentNode) return;
    var head = document.head;
    if(el.parentNode !== head){ head.appendChild(el); return; }
    var last = null, i, ch = head.childNodes;
    for(i=ch.length-1;i>=0;i--){
      var n = ch[i];
      if(n.nodeType===1 && n.tagName==="STYLE"){ last = n; break; }
    }
    if(last && last !== el) head.appendChild(el);
  }catch(e){}
}
try{
  if(!window._zunFestaWatch && typeof MutationObserver === "function"){
    window._zunFestaWatch = 1;
    new MutationObserver(function(){
      try{
        if(!window.ZUN_FESTA) return;
        zunFestaStripNight();
        zunFestaLast();
      }catch(e){}
    }).observe(document.head, {childList:true});
  }
}catch(e){}
function zunFestaApply(force){
  try{
    if(zunSemCssOn()){ zunFestaClear(); return null; }
    var f = null;
    try{
      var q = new URLSearchParams(location.search).get("festa");
      if(q){ for(var i=0;i<FESTAS.length;i++){ if(FESTAS[i].id===q){ f = FESTAS[i]; break; } } }
    }catch(e){}
    if(!f && typeof force === "string"){
      for(var j=0;j<FESTAS.length;j++){ if(FESTAS[j].id===force){ f = FESTAS[j]; break; } }
    }
    if(!f && (force === undefined || force === null)) f = zunFestaAt(new Date());
    if(!f){ zunFestaClear(); try{ window.ZUN_FESTA = null; }catch(e){} return null; }
    zunFestaStripNight();
    try{ document.body.dataset.zunfesta = f.id; }catch(e){}
    var el = document.getElementById("zunFestaCss");
    if(!el){ el = document.createElement("style"); el.id = "zunFestaCss"; document.head.appendChild(el); }
    /* vars da festa + base genérica + css próprio. Depois o UPGRADE de
       especificidade: html + atributo duplicado ganha do btnFix do tema do
       site (html body #wrap .box button) e de CSS custom com 1 id. */
    var zv = (typeof ZVARS !== "undefined" && ZVARS[f.id]) || {ac:"#ffffff",on:"#111111",card:"#ffffff",ink:"#111111",line:"#111111"};
    var varsRule = 'html body[data-zunfesta="'+f.id+'"][data-zunfesta]{--zf-ac:'+zv.ac+';--zf-on:'+zv.on+';--zf-card:'+zv.card+';--zf-ink:'+zv.ink+';--zf-line:'+zv.line+';}';
    /* o UPGRADE vai só no css próprio: varsRule e base já nascem fortes
       (se o regex pegasse a varsRule, viraria "html html body..." inválido
       e as variáveis --zf-* morreriam). */
    var festCss = f.css;
    try{ festCss = festCss.replace(/^body\{/, 'body[data-zunfesta="'+f.id+'"]{'); }catch(e){}
    try{ festCss = festCss.replace(/body\[data-zunfesta="([a-z]+)"\]/g, 'html body[data-zunfesta="$1"][data-zunfesta]'); }catch(e){}
    var cssText = varsRule + FESTA_BASE_CSS + festCss;
    /* selo SVG da festa nos botões primários (data URI: funciona em qualquer
       fonte do sistema, sem depender de emoji instalado). */
    try{
      var iconSvg = String(f.badgeSvg || "").replace(/<svg\s/, '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" ');
      cssText += zunFestaIconRule(f.id, "data:image/svg+xml," + encodeURIComponent(iconSvg));
    }catch(e){}
    /* avatar nunca veste botão de festa: as regras por festa pintam
       `#wrap .box button` (halloween: laranja+borda preta+radius 10px) e o
       .miniAv É um button — sem isso ele vira um quadrado laranja escuro.
       Mesma especificidade das regras da festa, mas DEPOIS (ordem vence). */
    try{
      cssText += 'html body[data-zunfesta="'+f.id+'"][data-zunfesta] #wrap .box button.miniAv,html body[data-zunfesta="'+f.id+'"][data-zunfesta] #zunMPages .box button.miniAv,html body[data-zunfesta="'+f.id+'"][data-zunfesta] #topBtns button.miniAv{width:20px!important;height:20px!important;border-radius:50%!important;background:#6aa5d7!important;border:none!important;padding:0!important;margin-right:4px!important;box-shadow:none!important;filter:none!important;transform:none!important}';
    }catch(eAv){}
    el.textContent = cssText;
    zunFestaLogo(true, f);
    zunFestaSlogan(true, f);
    zunFestaBar(true, f);
    try{ window.ZUN_FESTA = f.id; }catch(e){}
    zunFestaLast();
    return f.id;
  }catch(e){ return null; }
}
function zunFestaClear(){
  try{
    try{ window.ZUN_FESTA = null; }catch(e){}
    try{ delete document.body.dataset.zunfesta; }catch(e){ document.body.removeAttribute("data-zunfesta"); }
    var el = document.getElementById("zunFestaCss");
    if(el && el.parentNode) el.parentNode.removeChild(el);
    zunFestaLogo(false);
    zunFestaSlogan(false);
    zunFestaBar(false);
  }catch(e){}
}
/* prévia p/ teste (fora da UI): window.zunFestaPreview("natal"|null) */
window.zunFestaPreview = function(id){
  if(!id){ zunFestaClear(); try{ window.ZUN_FESTA = null; }catch(e){} return null; }
  return zunFestaApply(id);
};
window.zunFestaAt = zunFestaAt;
window.ZUN_FESTAS = FESTAS;
/* noturno não briga com a festa: enrola o paintNight p/ re-limpar */
try{
  if(typeof paintNight === "function" && !paintNight._festaWrapped){
    var _zunPaintNight = paintNight;
    paintNight = function(){ _zunPaintNight(); try{ if(window.ZUN_FESTA) zunFestaStripNight(); }catch(e){} };
    paintNight._festaWrapped = 1;
  }
}catch(e){}
zunFestaApply();
try{ setInterval(function(){ zunFestaApply(); }, 15*60*1000); }catch(e){}
})();
