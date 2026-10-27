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
     padrão e o tema custom do site por ESPECIFICIDADE (não só por ordem).
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
 badge:"🎭", logoFilter:"saturate(2) hue-rotate(-15deg)",
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
 +"body[data-zunfesta=\"carnaval\"] #zunLogoBadge::after{content:\"🎭\"!important}"
 +"body[data-zunfesta=\"carnaval\"] #zunFestaBar{background:linear-gradient(90deg,#ff0080,#ffea00,#00e676,#00b0ff,#ff0080)!important;color:#3d0b52!important;font-weight:bold!important}"},
{id:"pascoa", emoji:"🐰",
 peak:function(Y){ return pascoa(Y); },
 nome:{pt:"Páscoa", en:"Easter", es:"Pascua"},
 slogan:{pt:" — páscoa no zunzum: caça aos ovos!", en:" — easter at zunzum: egg hunt!", es:" — ¡pascua en zunzum: búsqueda de huevos!"},
 bar:{pt:"🐰 semana de páscoa no zunzum — caça aos ovos!", en:"🐰 easter week at zunzum!", es:"🐰 ¡semana de pascua en zunzum!"},
 badge:"🐰", logoFilter:"sepia(.5) saturate(1.8) hue-rotate(300deg)",
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
 +"body[data-zunfesta=\"pascoa\"] #zunLogoBadge::after{content:\"🐰\"!important}"
 +"body[data-zunfesta=\"pascoa\"] #zunFestaBar{background:#4e2a12!important;color:#ffcc80!important;font-weight:bold!important}"},
{id:"trabalho", emoji:"🏗️",
 peak:function(Y){ return {y:Y, m:5, d:1}; },
 nome:{pt:"Dia do Trabalho", en:"Labour Day", es:"Día del Trabajo"},
 slogan:{pt:" — semana do trabalhador no zunzum!", en:" — workers' week at zunzum!", es:" — ¡semana del trabajador en zunzum!"},
 bar:{pt:"🏗️ semana do trabalhador no zunzum — capacete obrigatório!", en:"🏗️ workers' week at zunzum!", es:"🏗️ ¡semana del trabajador en zunzum!"},
 badge:"⛑️", logoFilter:"grayscale(.6) contrast(1.3)",
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
 +"body[data-zunfesta=\"trabalho\"] #zunLogoBadge::after{content:\"⛑️\"!important}"
 +"body[data-zunfesta=\"trabalho\"] #zunFestaBar{background:repeating-linear-gradient(45deg,#f7c600 0 18px,#222 18px 36px)!important;color:#fff!important;font-weight:bold!important;text-shadow:1px 1px 0 #000!important}"},
{id:"namorados", emoji:"💘",
 peak:function(Y){ return {y:Y, m:6, d:12}; },
 nome:{pt:"Dia dos Namorados", en:"Lovers' Day", es:"Día de los Enamorados"},
 slogan:{pt:" — dia dos namorados no zunzum: declare-se!", en:" — lovers' day at zunzum!", es:" — ¡día de los enamorados en zunzum!"},
 bar:{pt:"💘 semana dos namorados no zunzum — declare-se no feed!", en:"💘 lovers' week at zunzum!", es:"💘 ¡semana de los enamorados en zunzum!"},
 badge:"💘", logoFilter:"saturate(1.8) hue-rotate(280deg)",
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
 +"body[data-zunfesta=\"namorados\"] #zunLogoBadge::after{content:\"💘\"!important}"
 +"body[data-zunfesta=\"namorados\"] #zunFestaBar{background:#880e4f!important;color:#ffc1d6!important;font-weight:bold!important}"},
{id:"junina", emoji:"🌽",
 peak:function(Y){ return {y:Y, m:6, d:24}; },
 nome:{pt:"Festa Junina", en:"June Festival", es:"Fiesta Junina"},
 slogan:{pt:" — arraiá no zunzum: puxe o fole!", en:" — june party at zunzum!", es:" — ¡fiesta junina en zunzum!"},
 bar:{pt:"🔥 arraiá no zunzum — quadrilha, quentão e correio elegante!", en:"🔥 june party week at zunzum!", es:"🔥 ¡semana de fiesta junina en zunzum!"},
 badge:"🔥", logoFilter:"saturate(1.7) hue-rotate(-40deg)",
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
 +"body[data-zunfesta=\"junina\"] #zunLogoBadge::after{content:\"🔥\"!important}"
 +"body[data-zunfesta=\"junina\"] #zunFestaBar{background:#c62828!important;color:#ffeb3b!important;font-weight:bold!important}"},
{id:"independencia", emoji:"🇧🇷",
 peak:function(Y){ return {y:Y, m:9, d:7}; },
 nome:{pt:"Independência", en:"Independence Day", es:"Independencia"},
 slogan:{pt:" — semana da pátria no zunzum!", en:" — independence week at zunzum!", es:" — ¡semana de la patria en zunzum!"},
 bar:{pt:"🇧🇷 semana da pátria no zunzum — verde e amarelo!", en:"🇧🇷 independence week at zunzum!", es:"🇧🇷 ¡semana de la patria en zunzum!"},
 badge:"🇧🇷", logoFilter:"saturate(1.6)",
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
 +"body[data-zunfesta=\"independencia\"] #zunLogoBadge::after{content:\"🇧🇷\"!important}"
 +"body[data-zunfesta=\"independencia\"] #zunFestaBar{background:#002776!important;color:#ffdf00!important;font-weight:bold!important}"},
{id:"halloween", emoji:"🎃",
 peak:function(Y){ return {y:Y, m:10, d:31}; },
 nome:{pt:"Halloween", en:"Halloween", es:"Halloween"},
 slogan:{pt:" — halloween no zunzum: doces ou travessuras?", en:" — halloween at zunzum: trick or treat?", es:" — ¡halloween en zunzum: truco o trato?"},
 bar:{pt:"🎃 semana do halloween no zunzum — doces ou travessuras?", en:"🎃 halloween week at zunzum!", es:"🎃 ¡semana de halloween en zunzum!"},
 badge:"🦇", logoFilter:"saturate(1.5) hue-rotate(230deg) brightness(.9)",
 css:"body{background:#0d0714!important;background-image:radial-gradient(circle,#ff6d00 1.6px,transparent 2.2px)!important;background-size:34px 34px!important;color:#e8d5ff!important}"
 +"body[data-zunfesta=\"halloween\"] #top{background:linear-gradient(180deg,#1a0b2e,#3b1f5e)!important;border-bottom:5px solid #ff6d00!important;color:#ffab40!important}"
 +"body[data-zunfesta=\"halloween\"] #top h1{font-family:Impact,Haettenschweiler,sans-serif!important;letter-spacing:5px!important;color:#ff6d00!important;text-shadow:0 0 14px #ff6d00,3px 3px 0 #000!important}"
 +"body[data-zunfesta=\"halloween\"] #top .top-sub,body[data-zunfesta=\"halloween\"] #top .top-desc,body[data-zunfesta=\"halloween\"] #top .meta{color:#ce93d8!important;opacity:1!important}"
 +"body[data-zunfesta=\"halloween\"] #topBtns button{background:#000!important;color:#ff6d00!important;border:2px solid #ff6d00!important;border-radius:50%!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .box,body[data-zunfesta=\"halloween\"] #zunMPages .box,body[data-zunfesta=\"halloween\"] #seoBox .box{background:#1a0f24!important;color:#e8d5ff!important;border:2px solid #ff6d00!important;border-radius:12px!important;box-shadow:0 0 18px rgba(255,109,0,.35)!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .box h3{background:#000!important;color:#ff6d00!important;border-radius:10px 10px 0 0!important;font-family:Impact,sans-serif!important;letter-spacing:3px!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .box button,body[data-zunfesta=\"halloween\"] #zunMPages .box button{background:#ff6d00!important;color:#000!important;border:2px solid #000!important;border-radius:10px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .chatlog{background:#120a1c!important;border:2px solid #6a1b9a!important}"
 +"body[data-zunfesta=\"halloween\"] #wrap .chatlog div{border-color:#3b1f5e!important}"
 +"body[data-zunfesta=\"halloween\"] #topLogoImg{filter:saturate(1.5) hue-rotate(230deg) brightness(.9)!important;border:3px solid #ff6d00!important;border-radius:50%!important}"
 +"body[data-zunfesta=\"halloween\"] #zunLogoBadge::after{content:\"🦇\"!important}"
 +"body[data-zunfesta=\"halloween\"] #zunFestaBar{background:#000!important;color:#ff6d00!important;font-weight:bold!important;border-top:2px solid #ff6d00!important;border-bottom:2px solid #ff6d00!important}"},
{id:"natal", emoji:"🎅",
 peak:function(Y){ return {y:Y, m:12, d:25}; },
 nome:{pt:"Natal", en:"Christmas", es:"Navidad"},
 slogan:{pt:" — feliz natal no zunzum!", en:" — merry christmas at zunzum!", es:" — ¡feliz navidad en zunzum!"},
 bar:{pt:"🎄 semana de natal no zunzum — boas festas!", en:"🎄 christmas week at zunzum!", es:"🎄 ¡semana de navidad en zunzum!"},
 badge:"🎅", logoFilter:"saturate(1.5) hue-rotate(-25deg)",
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
 +"body[data-zunfesta=\"natal\"] #zunLogoBadge::after{content:\"🎅\"!important}"
 +"body[data-zunfesta=\"natal\"] #zunFestaBar{background:linear-gradient(90deg,#7f0000,#b71c1c,#7f0000)!important;color:#ffe9b0!important;font-weight:bold!important;border-top:2px solid #d4af37!important;border-bottom:2px solid #d4af37!important}"},
{id:"anonovo", emoji:"🎆",
 peak:function(Y){ return {y:Y+1, m:1, d:1}; },
 nome:{pt:"Ano Novo", en:"New Year", es:"Año Nuevo"},
 slogan:{pt:" — feliz ano novo no zunzum!", en:" — happy new year at zunzum!", es:" — ¡feliz año nuevo en zunzum!"},
 bar:{pt:"🎆 semana de ano novo no zunzum — feliz ano novo!", en:"🎆 new year week at zunzum — happy new year!", es:"🎆 ¡semana de año nuevo en zunzum — feliz año nuevo!"},
 badge:"🥂", logoFilter:"sepia(.8) saturate(2) hue-rotate(-10deg)",
 css:"body{background:#050508!important;background-image:radial-gradient(circle,#ffd700 1.6px,transparent 2.2px),radial-gradient(circle,#fff 1.2px,transparent 1.8px),radial-gradient(circle,#ff4081 1.4px,transparent 2px)!important;background-size:40px 40px,26px 26px,32px 32px!important;background-position:0 0,13px 7px,5px 21px!important;color:#f5f0dc!important}"
 +"body[data-zunfesta=\"anonovo\"] #top{background:linear-gradient(180deg,#000,#3a2f00)!important;border-bottom:5px solid #ffd700!important;color:#ffd700!important}"
 +"body[data-zunfesta=\"anonovo\"] #top h1{font-family:Palatino,\"Palatino Linotype\",serif!important;color:#ffd700!important;text-shadow:0 0 16px #ffd700,2px 2px 0 #000!important;letter-spacing:2px!important}"
 +"body[data-zunfesta=\"anonovo\"] #top .top-sub,body[data-zunfesta=\"anonovo\"] #top .top-desc,body[data-zunfesta=\"anonovo\"] #top .meta{color:#fff3c4!important;opacity:1!important}"
 +"body[data-zunfesta=\"anonovo\"] #topBtns button{background:#000!important;color:#ffd700!important;border:2px solid #ffd700!important;border-radius:4px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .box,body[data-zunfesta=\"anonovo\"] #zunMPages .box,body[data-zunfesta=\"anonovo\"] #seoBox .box{background:#101014!important;color:#f5f0dc!important;border:2px solid #ffd700!important;border-radius:8px!important;box-shadow:0 0 16px rgba(255,215,0,.3)!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .box h3{background:#000!important;color:#ffd700!important;border-radius:6px 6px 0 0!important;font-family:Palatino,serif!important;letter-spacing:2px!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .box button,body[data-zunfesta=\"anonovo\"] #zunMPages .box button{background:#ffd700!important;color:#000!important;border:2px solid #fff3c4!important;border-radius:6px!important;font-weight:bold!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .chatlog{background:#0a0a10!important;border:2px solid #8a7500!important}"
 +"body[data-zunfesta=\"anonovo\"] #wrap .chatlog div{border-color:#3a2f00!important}"
 +"body[data-zunfesta=\"anonovo\"] #topLogoImg{filter:sepia(.8) saturate(2) hue-rotate(-10deg)!important;border:3px solid #ffd700!important;border-radius:50%!important}"
 +"body[data-zunfesta=\"anonovo\"] #zunLogoBadge::after{content:\"🥂\"!important}"
 +"body[data-zunfesta=\"anonovo\"] #zunFestaBar{background:#000!important;color:#ffd700!important;font-weight:bold!important;border-top:2px solid #ffd700!important;border-bottom:2px solid #ffd700!important}"}
];
function festaWindow(f, py){
  var c = f.peak(py);
  return {f:f, c:c, s:num(dAdd(c,-3)), e:num(dAdd(c,3))};
}
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
        b.setAttribute("style", "position:absolute;right:-10px;top:-12px;font-size:20px;line-height:1;pointer-events:none;filter:none;");
        wrap.appendChild(b);
      }
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
/* genérico: moldura do selo + barra (o resto é por-festa no css).
   Escopado em body[data-zunfesta] p/ vencer o CSS personalizado do site
   (que é confinado sob "body" pelo zunScopeCss) por ESPECIFICIDADE, não só
   por ordem no <head>: mesmo se um script recriar o <style> custom depois,
   a festa continua por cima. */
var FESTA_BASE_CSS = "body[data-zunfesta] #zunLogoWrap{position:relative;display:inline-flex;flex:none}"
 +"body[data-zunfesta] #zunLogoBadge{position:absolute;right:-10px;top:-12px;font-size:20px;line-height:1;pointer-events:none}"
 +"body[data-zunfesta] #zunFestaBar{text-align:center;font-size:13px;padding:6px 10px}"
 +"body[data-zunfesta] #topLogoImg{width:36px;height:36px}";
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
    /* a 1ª regra de cada festa é "body{...}" puro — mesma especificidade do
       "body{...}" do tema custom, aí decidiria a ORDEM. Escopa com o atributo
       p/ a festa vencer sempre, independente de quem pintou por último. */
    var cssText = FESTA_BASE_CSS + f.css;
    try{ cssText = cssText.replace(/^body\{/, 'body[data-zunfesta="'+f.id+'"]{'); }catch(e){}
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
