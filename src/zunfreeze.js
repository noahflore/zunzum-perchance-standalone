/* zunfreeze.js — congela GIFs do feed/chat até o clique (poster estático).
   Ideia do petrapixel (`new Freezeframe`, dissecação 2026-11-04), mas
   implementação própria, sem dependência e sem ler 1 pixel (sem CORS):
   desenha o frame atual num <canvas> (cópia estática, sempre permitido)
   e troca de volta pro <img> no clique. Reduz CPU/bateria em página de
   gif e é o comportamento ideal p/ prefers-reduced-motion (já nasce
   parado). Estado por imagem, reversível, sem tocar no layout. */
(function(){
"use strict";
if(window.__zunfreezeLoaded) return; window.__zunfreezeLoaded = true;
function tr(s){ try{ return (window.zunzumTr?window.zunzumTr(s):s); }catch(e){ return s; } }
function isGifSrc(src){
  if(!src) return false;
  try{
    var s = String(src);
    if(/^data:image\/gif/i.test(s)) return true; // gif colado (data URL)
    return /\.gif([?#]|$)/i.test(s);
  }catch(e){ return false; }
}
/* contextos que NUNCA congelam: avatar, pet, ícones, logo, picker */
function skipNode(im){
  try{
    if(im.closest(".miniAv,#avatarEl,#profAvatar,.uav,#pubPhotoEl,#topLogoImg,.zunpet-body,.zunpet-food,.zunpet-ball,#zunPetHouse,#zEmojiPanel,.zem-picker,#searchPreview,button,a.ytFac")) return true;
    if(im.id==="topLogoImg"||im.id==="searchPreview") return true;
  }catch(e){}
  return false;
}
function freezeOne(im){
  try{
    if(!im||!im.isConnected) return;
    if(im.dataset.zfState) return; // já tratado
    if(skipNode(im)) return;
    var src = im.currentSrc||im.src||"";
    if(!isGifSrc(src) && !im.classList.contains("zem-gifmoji")) return;
    im.dataset.zfState = "wait";
    var done = function(){
      try{
        if(!im.isConnected){ delete im.dataset.zfState; return; }
        if(im.dataset.zfState==="frozen"||im.dataset.zfState==="playing") return;
        if(skipNode(im)){ delete im.dataset.zfState; return; }
        var w = im.naturalWidth||im.clientWidth||0, h = im.naturalHeight||im.clientHeight||0;
        if(!w||!h||w<8||h<8){ delete im.dataset.zfState; return; } // miúdo/quebrado: deixa quieto
        var cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        /* preserva tamanho de layout (width/height attrs, max-width:100%) */
        try{
          var cs = window.getComputedStyle(im);
          cv.style.cssText = "max-width:100%;height:auto;cursor:pointer;display:"+(cs&&cs.display==="block"?"block":"inline-block");
          var dw = im.getAttribute("width"), dh = im.getAttribute("height");
          if(dw) cv.setAttribute("width", dw); // dica p/ layout igual ao img
          if(dh) cv.setAttribute("height", dh);
          cv.style.aspectRatio = w+" / "+h;
        }catch(e){}
        try{ cv.getContext("2d").drawImage(im, 0, 0); }
        catch(e){ delete im.dataset.zfState; return; }
        /* carrega classes visuais (ex: zz-blur do velado) e o alt */
        try{
          if(im.className) cv.className = im.className;
          cv.setAttribute("role","img");
          cv.setAttribute("aria-label", im.alt||"gif pausado");
          cv.title = (im.title||im.alt||"gif")+" — clique p/ animar";
        }catch(e){}
        var badge = document.createElement("span");
        badge.textContent = "▶ gif";
        badge.setAttribute("aria-hidden","true");
        try{ badge.style.cssText = "position:absolute;left:4px;bottom:4px;font-size:11px;line-height:1;background:rgba(0,0,0,.65);color:#fff;border-radius:6px;padding:2px 6px;pointer-events:none"; }catch(e){}
        var wrap = document.createElement("span");
        wrap.setAttribute("data-zfwrap","1");
        try{ wrap.style.cssText = "position:relative;display:inline-block;max-width:100%;line-height:0;cursor:pointer"; }catch(e){}
        wrap.appendChild(cv); wrap.appendChild(badge);
        wrap.title = cv.title;
        var playing = false;
        wrap.addEventListener("click", function(ev){
          try{
            ev.stopPropagation();
            if(!playing){
              /* toca: troca canvas -> img original */
              try{ wrap.replaceWith(im); }catch(e){ return; }
              delete im.dataset.zfState;
              im.dataset.zfState = "playing";
              im.title = tr("clique p/ pausar o gif");
              im.style.cursor = "pointer";
              var back = function(e2){
                try{
                  e2.stopPropagation();
                  im.removeEventListener("click", back);
                  delete im.dataset.zfState;
                  freezeOne(im);
                }catch(e){}
              };
              im.addEventListener("click", back);
              playing = true;
            }
          }catch(e){}
        });
        try{ im.replaceWith(wrap); }catch(e){ return; }
        im.dataset.zfState = "frozen";
      }catch(e){ try{ delete im.dataset.zfState; }catch(e2){} }
    };
    if(im.complete && im.naturalWidth) done();
    else{
      var to = setTimeout(function(){ try{ im.removeEventListener("load", done); }catch(e){} if(im.dataset.zfState==="wait"){ delete im.dataset.zfState; } }, 15000);
      im.addEventListener("load", function h(){ try{ clearTimeout(to); im.removeEventListener("load", h); }catch(e){} done(); });
      im.addEventListener("error", function(){ try{ clearTimeout(to); }catch(e){} try{ delete im.dataset.zfState; }catch(e){} }, {once:true});
    }
  }catch(e){}
}
function sweep(root){
  try{
    var list = (root&&root.querySelectorAll) ? root.querySelectorAll("img.zem-gifmoji, img[src]") : [];
    for(var i=0;i<list.length;i++) freezeOne(list[i]);
  }catch(e){}
}
/* API p/ renderizadores chamarem direto no item novo */
window.zunFreeze = function(scope){ try{ sweep(scope||document); }catch(e){} };
var scheduled = false;
function schedule(root){
  if(scheduled) return; scheduled = true;
  var run = function(){
    scheduled = false;
    try{ sweep(root&&root.nodeType===1?root:document); }catch(e){}
  };
  try{
    if(window.requestIdleCallback) requestIdleCallback(run, {timeout:800});
    else setTimeout(run, 120);
  }catch(e){ setTimeout(run, 120); }
}
try{
  sweep(document);
  var ob = new MutationObserver(function(muts){
    for(var i=0;i<muts.length;i++){
      var m = muts[i];
      for(var j=0;j<m.addedNodes.length;j++){
        var n = m.addedNodes[j];
        if(!n||n.nodeType!==1) continue;
        if(n.tagName==="IMG"){ freezeOne(n); continue; }
        if(n.querySelectorAll){ schedule(n); break; }
      }
    }
  });
  var startOb = function(){ try{ ob.observe(document.body||document.documentElement, {childList:true, subtree:true}); }catch(e){} };
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", startOb);
  else startOb();
}catch(e){}
})();
