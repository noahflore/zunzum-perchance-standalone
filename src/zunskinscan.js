/* zunskinscan.js — triagem LOCAL de foto (sem IA, sem rede, sem plugin).
   Funciona no espelho (Neocities/GitHub) e no Perchance: zero dependências,
   só <canvas>. Não é veredito — é triagem p/ moderação (sugerir blur/ocultar).
   Técnica clássica: regra de pele em RGB + caixa YCbCr (Kovac/Jones-Rehg),
   em miniatura de até 64px + concentração por projeção de linhas/colunas.
   Limites honestos: retrato com rosto grande também pontua alto (sem IA não
   dá p/ distinguir rosto de corpo); lingerie sem pele e P&B passam batido.
   Uso típico: score >= 0.45 = "provável" (sugere blur), >= 0.22 = "suspeito"
   (só marca), abaixo = "ok". Ajuste os cortes no seu gancho, não aqui.

   API: await window.zunSkinScan(input) ->
     {ok:true, score:0..1, skinRatio, conc, verdict:"ok"|"suspeito"|"provavel",
      w,h,ms}  ou  {ok:false, error:"tainted"|"tipo"|"pequena"|"carga"}
   input: <img>/<canvas>/Blob/File/dataURL ou URL https (com CORS; sem CORS
   o canvas "suja" e volta {error:"tainted"} — regra de segurança do browser,
   não do zunzum: use o proxy de mídia do site nesses casos).

   Deploy espelho: subir como src/zunskinscan.js + 1 tag no index de lá.
   No Perchance é só leitura (não muda comportamento sozinho). */
(function(){
"use strict";
if(window.zunSkinScan) return;
function isSkin(r,g,b){
  if(!(r>95 && g>40 && b>20)) return false;
  var mx=Math.max(r,g,b), mn=Math.min(r,g,b);
  if(mx-mn<15) return false;
  if(Math.abs(r-g)<15) return false;
  if(!(r>g && r>b)) return false;
  /* YCbCr aprox. (ITU-R BT.601, inteiros): pele ~= Cb 77..127, Cr 133..173 */
  var y=((66*r+129*g+25*b+128)>>8)+16;
  var cb=((-38*r-74*g+112*b+128)>>8)+128;
  var cr=((112*r-94*g-18*b+128)>>8)+128;
  void y;
  return cb>=77 && cb<=127 && cr>=133 && cr<=173;
}
function loadImg(input){
  return new Promise(function(res, rej){
    if(input instanceof HTMLCanvasElement){
      var c=document.createElement("canvas");
      c.width=input.width; c.height=input.height;
      try{ c.getContext("2d").drawImage(input,0,0); }catch(e){ rej(new Error("tainted")); return; }
      res(c); return;
    }
    if(input instanceof HTMLImageElement){
      if(!input.complete || !input.naturalWidth){ rej(new Error("carga")); return; }
      var c2=document.createElement("canvas");
      c2.width=input.naturalWidth; c2.height=input.naturalHeight;
      try{ c2.getContext("2d").drawImage(input,0,0); }catch(e){ rej(new Error("tainted")); return; }
      res(c2); return;
    }
    var url=null, blobUrl=false;
    if(typeof input==="string"){ url=input; }
    else if(input instanceof Blob){ url=URL.createObjectURL(input); blobUrl=true; }
    else{ rej(new Error("tipo")); return; }
    var img=new Image();
    img.crossOrigin="anonymous";
    img.onload=function(){
      try{
        var c3=document.createElement("canvas");
        c3.width=img.naturalWidth; c3.height=img.naturalHeight;
        c3.getContext("2d").drawImage(img,0,0);
        /* prova de taint: getImageData joga se sujou */
        c3.getContext("2d").getImageData(0,0,1,1);
        if(blobUrl){ try{URL.revokeObjectURL(url);}catch(e){} }
        res(c3);
      }catch(e){ if(blobUrl){ try{URL.revokeObjectURL(url);}catch(_){} } rej(new Error("tainted")); }
    };
    img.onerror=function(){ if(blobUrl){ try{URL.revokeObjectURL(url);}catch(e){} } rej(new Error("carga")); };
    img.src=url;
  });
}
window.zunSkinScan=function(input){
  var t0=Date.now();
  return loadImg(input).then(function(src){
    var W=src.width, H=src.height;
    if(!W||!H||W<8||H<8) return {ok:false, error:"pequena"};
    var S=64, w, h;
    if(W>=H){ w=Math.min(S,W); h=Math.max(1,Math.round(H*w/W)); }
    else{ h=Math.min(S,H); w=Math.max(1,Math.round(W*h/H)); }
    var cv=document.createElement("canvas"); cv.width=w; cv.height=h;
    var cx=cv.getContext("2d",{willReadFrequently:true});
    cx.drawImage(src,0,0,w,h);
    var d=cx.getImageData(0,0,w,h).data;
    var skin=0, satSum=0, n=w*h;
    var cols=new Array(w).fill(0), rows=new Array(h).fill(0);
    for(var i=0;i<n;i++){
      var r=d[i*4], g=d[i*4+1], b=d[i*4+2];
      var mx=Math.max(r,g,b), mn=Math.min(r,g,b);
      satSum+= mx? (mx-mn)/mx : 0;
      if(isSkin(r,g,b)){ skin++; cols[i%w]++; rows[(i/w)|0]++; }
    }
    /* P&B/quase: sem cor não há o que medir — devolve ok com nota. */
    if(satSum/n<0.06) return {ok:true, score:0, skinRatio:0, conc:0, verdict:"ok", note:"pb", w:W, h:H, ms:Date.now()-t0};
    var ratio=skin/n;
    /* concentração: fração da pele nos 50% de colunas+linhas mais densas */
    var cs=cols.slice().sort(function(a,b){return b-a;});
    var rs=rows.slice().sort(function(a,b){return b-a;});
    var halfC=Math.max(1,(w/2)|0), halfR=Math.max(1,(h/2)|0), sc=0, sr=0;
    for(var k=0;k<halfC;k++) sc+=cs[k];
    for(var k2=0;k2<halfR;k2++) sr+=rs[k2];
    var conc=skin? (0.5*sc/skin+0.5*sr/skin) : 0;
    /* placar: pele espalhada (praia, multidão) pesa menos que pele concentrada */
    var score=Math.min(1, ratio*(0.45+0.55*Math.min(1,Math.max(0,(conc-0.5)/0.3))));
    var verdict= score>=0.45 ? "provavel" : (score>=0.22 ? "suspeito" : "ok");
    return {ok:true, score:+score.toFixed(3), skinRatio:+ratio.toFixed(3),
      conc:+conc.toFixed(3), verdict:verdict, w:W, h:H, ms:Date.now()-t0};
  }).catch(function(e){
    return {ok:false, error:String((e&&e.message)||"carga")};
  });
};
})();
