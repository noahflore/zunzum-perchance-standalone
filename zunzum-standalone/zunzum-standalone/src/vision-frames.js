// zunzum vision-frames — GIF animado -> grade JPEG p/ visão.
//
// O ai-text-plugin (generateText com imagem) só aceita UM anexo png/jpeg/webp,
// então GIF enviado direto estourava ("GIFs are not supported") e a verificação
// (erótico, identidade) falhava. Aqui um GIF vira UMA imagem JPEG em grade:
// 9 quadros espaçados — 3 do início, 3 do meio, 3 do fim — e a IA vale QUALQUER
// quadro. Foto parada passa direto, sem custo extra.
//
// Uso: {blob, multi} = await window.zunVisionSheet(blob)
//   blob  = JPEG da grade (multi=true) ou o original / 1º quadro em JPEG
//   multi = true quando virou grade (o prompt deve dizer "vale qualquer quadro")
(function(){
"use strict";
var DEC_URL = "https://esm.sh/gifuct-js@2.1.2";
var CELL = 320, Q = 0.82, MAX_IN = 6000000;
// 9 índices espaçados: 3 do início, 3 do meio, 3 do fim.
function pick9(n){
  var i, out = [];
  if(n<=9){ for(i=0;i<n;i++) out.push(i); return out; }
  for(var g=0; g<3; g++){
    var s0 = g*n/3, s1 = (g+1)*n/3;
    [1/6, 3/6, 5/6].forEach(function(f){
      var ix = Math.floor(s0+(s1-s0)*f);
      if(ix<0) ix = 0; if(ix>n-1) ix = n-1;
      if(out.indexOf(ix)<0) out.push(ix);
    });
  }
  return out;
}
function isGifBytes(buf){
  try{
    var b = new Uint8Array(buf, 0, 6);
    return b[0]===0x47 && b[1]===0x49 && b[2]===0x46 && b[3]===0x38 && (b[4]===0x37||b[4]===0x39) && b[5]===0x61;
  }catch(e){ return false; }
}
function blobToJpeg(blob){
  // 1º quadro em JPEG (corta o throw do GIF e serve de fallback).
  return createImageBitmap(blob).then(function(bm){
    var cv = document.createElement("canvas");
    cv.width = Math.max(1, bm.width); cv.height = Math.max(1, bm.height);
    var cx = cv.getContext("2d");
    cx.fillStyle = "#fff"; cx.fillRect(0,0,cv.width,cv.height);
    cx.drawImage(bm,0,0);
    try{ bm.close(); }catch(e){}
    return new Promise(function(res){ cv.toBlob(res, "image/jpeg", Q); });
  });
}
async function gifSheet(blob){
  var buf = await blob.arrayBuffer();
  if(!buf || buf.byteLength<100) return null;
  var mod = await import(DEC_URL);
  var gif = mod.parseGIF(buf);
  var frames = mod.decompressFrames(gif, true);
  if(!frames || !frames.length) return null;
  if(frames.length>400) return null; // gigante: cai no fallback de 1 quadro
  var W = (gif.lsd && gif.lsd.width) || frames[0].dims.width;
  var H = (gif.lsd && gif.lsd.height) || frames[0].dims.height;
  if(!W || !H || W>2000 || H>2000) return null;
  var idx = pick9(frames.length);
  var work = document.createElement("canvas"); work.width = W; work.height = H;
  var wx = work.getContext("2d");
  wx.clearRect(0,0,W,H);
  var snaps = [], want = {}, i;
  idx.forEach(function(v){ want[v] = 1; });
  var prev = null, restoreBuf = null;
  var tmp = document.createElement("canvas"), tmpx = tmp.getContext("2d");
  function whiteSnap(){
    var sn = document.createElement("canvas"); sn.width = W; sn.height = H;
    var scx = sn.getContext("2d");
    scx.fillStyle = "#fff"; scx.fillRect(0,0,W,H);
    scx.drawImage(work,0,0);
    return sn;
  }
  for(i=0;i<frames.length;i++){
    var f = frames[i];
    try{
      if(prev){
        if(prev.disposalType===2) wx.clearRect(prev.dims.left, prev.dims.top, prev.dims.width, prev.dims.height);
        else if(prev.disposalType===3 && restoreBuf) wx.putImageData(restoreBuf, 0, 0);
      }
      if(f.disposalType===3){
        try{ restoreBuf = wx.getImageData(0,0,W,H); }
        catch(e){ restoreBuf = null; }
      }
      var id = wx.createImageData(f.dims.width, f.dims.height);
      id.data.set(f.patch);
      // compõe por cima (source-over): pixel transparente do patch mantém o
      // quadro anterior; putImageData direto apagaria e virava listra.
      tmp.width = f.dims.width; tmp.height = f.dims.height;
      tmpx.putImageData(id, 0, 0);
      wx.drawImage(tmp, f.dims.left, f.dims.top);
    }catch(e){ continue; }
    prev = f;
    if(want[i]) snaps.push(whiteSnap());
    if(snaps.length>=idx.length) break;
  }
  if(!snaps.length) return null;
  if(snaps.length===1){
    return new Promise(function(res){
      snaps[0].toBlob(function(b){ res(b ? {blob:b, multi:false} : null); }, "image/jpeg", Q);
    });
  }
  var cols = Math.ceil(Math.sqrt(snaps.length)), rows = Math.ceil(snaps.length/cols);
  var sc = Math.min(1, CELL/Math.max(W,H));
  var cw = Math.max(1, Math.round(W*sc)), ch = Math.max(1, Math.round(H*sc));
  var sheet = document.createElement("canvas");
  sheet.width = cols*cw; sheet.height = rows*ch;
  var sx = sheet.getContext("2d");
  sx.fillStyle = "#fff"; sx.fillRect(0,0,sheet.width,sheet.height);
  snaps.forEach(function(sn, k){
    sx.drawImage(sn, (k%cols)*cw, Math.floor(k/cols)*ch, cw, ch);
  });
  return new Promise(function(res){
    sheet.toBlob(function(b){ res(b ? {blob:b, multi:true} : null); }, "image/jpeg", Q);
  });
}
window.zunVisionSheet = async function(src){
  try{
    if(!src || typeof src.size !== "number" || !(src.size>100)) return {blob:src, multi:false};
    var gif = false;
    try{
      if((src.type||"").toLowerCase().indexOf("image/gif")===0) gif = true;
      else if(src.size<=MAX_IN){
        var head = await src.slice(0,6).arrayBuffer();
        gif = isGifBytes(head);
      }
    }catch(e){ gif = false; }
    if(!gif) return {blob:src, multi:false};
    if(src.size>MAX_IN){
      try{ var fb = await blobToJpeg(src); if(fb) return {blob:fb, multi:false}; }catch(e){}
      return {blob:src, multi:false};
    }
    try{
      var sh = await gifSheet(src);
      if(sh && sh.blob && sh.blob.size>500) return sh;
    }catch(e){}
    try{ var fb2 = await blobToJpeg(src); if(fb2) return {blob:fb2, multi:false}; }catch(e){}
    return {blob:src, multi:false};
  }catch(e){ return {blob:src, multi:false}; }
};
// Guarda central anti-"This page has errors": o ai-text-plugin só aceita
// UM anexo png/jpeg/webp e JOGA ERRO de template (perchanceErrors) se o Blob
// for text/html, image/gif, tipo vazio, etc. Todo caller de visão deve passar
// por aqui e DESISTIR (null) se não der p/ limpar — nunca chamar generateText.
window.zunVisionOk = function(b){
  try{ return !!(b && b.size>500 && /^image\/(png|jpeg|webp)$/i.test(b.type||"")); }catch(e){ return false; }
};
// URLs: mesma política do servidor (okUrlStrict), mas usando `new URL()`.
// Retorna a string se ok, null se inválida, "" se vazia.
window.zunOkUrl = function(u, maxLen){
  try{
    u = String(u == null ? "" : u);
    maxLen = maxLen || 500;
    if(!u) return "";
    if(u.length > Math.min(maxLen, 2000)) return null;
    var x;
    try{ x = new URL(u); }catch(e){ return null; }
    if(x.protocol !== "https:") return null;
    if(x.username || x.password) return null; // userinfo = phishing
    if(/[\s<>"'`\\]/.test(u)) return null;
    /* anti-SSRF/tracker local (espelho do okUrlStrict do servidor): o cliente
       renderiza <img>/<video> com a URL, então localhost/IP privado/.onion
       vira sonda de rede local + tracker. */
    try{
      var hn = String(x.hostname||"").toLowerCase();
      if(!hn || hn.length>253 || hn.indexOf("..")>=0) return null;
      if(/[^a-z0-9.-]/.test(hn)) return null;
      try{ var _ptv = parseInt(x.port||"", 10); if(x.port && !(_ptv>=1 && _ptv<=65535)) return null; }catch(_eP){}
      if(hn==="localhost"||hn==="localhost.localdomain") return null;
      if(hn==="onion"||hn.slice(-6)===".onion"||hn==="local"||hn.slice(-6)===".local"||hn.slice(-10)===".localhost") return null;
      var _isNumV = /^[0-9.]+$/.test(hn) || /0x/i.test(hn);
      if(_isNumV){
        var _qv = null;
        var _p1v = function(p){ p=String(p||""); if(!p) return -1;
          if(/^0x[0-9a-f]+$/i.test(p)){ var _v=parseInt(p,16); return (_v>=0&&_v<=255)?_v:-1; }
          if(/^0[0-7]+$/.test(p)&&p.length>1){ var _o=parseInt(p,8); return (_o>=0&&_o<=255)?_o:-1; }
          if(!/^\d+$/.test(p)) return -1; var _d=parseInt(p,10); return (_d>=0&&_d<=255)?_d:-1; };
        try{
          if(/^\d+$/.test(hn)){ var _n32v=parseInt(hn,10); if(_n32v<0||_n32v>4294967295) return null; _qv=[(_n32v>>>24)&255,(_n32v>>>16)&255,(_n32v>>>8)&255,_n32v&255]; }
          else if(/^0x[0-9a-f]+$/i.test(hn)){ var _h32v=parseInt(hn,16); if(_h32v<0||_h32v>4294967295) return null; _qv=[(_h32v>>>24)&255,(_h32v>>>16)&255,(_h32v>>>8)&255,_h32v&255]; }
          else if(/^0[0-7]+$/.test(hn)&&hn.length>1){ var _o32v=parseInt(hn,8); if(_o32v<0||_o32v>4294967295) return null; _qv=[(_o32v>>>24)&255,(_o32v>>>16)&255,(_o32v>>>8)&255,_o32v&255]; }
          else { var _ppv=hn.split("."); if(_ppv.length===4){ var _okv=true,_qqv=[]; for(var _iv=0;_iv<4;_iv++){ var _v2v=_p1v(_ppv[_iv]); if(_v2v<0){_okv=false;break;} _qqv.push(_v2v); } _qv=_okv?_qqv:null; } }
        }catch(_ePN){ _qv = null; }
        if(!_qv) return null;
        if(_qv[0]===127||_qv[0]===0||_qv[0]===10) return null;
        if(_qv[0]===172&&_qv[1]>=16&&_qv[1]<=31) return null;
        if(_qv[0]===192&&_qv[1]===168) return null;
        if(_qv[0]===169&&_qv[1]===254) return null;
        if(_qv[0]===192&&_qv[1]===0&&(_qv[2]===0||_qv[2]===2)) return null;
        if(_qv[0]>=224) return null;
        return u;
      }
      if(/^[0-9.]+$/.test(hn)){
        var pp = hn.split(".");
        if(pp.length===4){
          var nn = [], ok = true;
          for(var i=0;i<4;i++){ if(!/^\d{1,3}$/.test(pp[i])){ ok=false; break; } var vv=parseInt(pp[i],10); if(vv<0||vv>255){ ok=false; break; } nn.push(vv); }
          if(ok){
            if(nn[0]===127||nn[0]===0||nn[0]===10) return null;
            if(nn[0]===172&&nn[1]>=16&&nn[1]<=31) return null;
            if(nn[0]===192&&nn[1]===168) return null;
            if(nn[0]===169&&nn[1]===254) return null;
            if(nn[0]===192&&nn[1]===0&&(nn[2]===0||nn[2]===2)) return null;
            if(nn[0]>=224) return null;
          }
        }
      }
    }catch(_eIP){ return null; }
    return u;
  }catch(e){ return null; }
};
window.zunSniffVisionType = async function(blob){
  try{
    if(!blob || !(blob.size>0)) return "";
    var t = String(blob.type||"").toLowerCase();
    if(/^image\/(png|jpeg|webp|gif)$/.test(t)) return t;
    var head = new Uint8Array(await blob.slice(0,12).arrayBuffer());
    if(head[0]===0xFF && head[1]===0xD8) return "image/jpeg";
    if(head[0]===0x89 && head[1]===0x50) return "image/png";
    if(head[0]===0x47 && head[1]===0x49 && head[2]===0x46) return "image/gif";
    if(head[0]===0x52 && head[1]===0x49 && head[2]===0x46 && head[3]===0x46) return "image/webp";
    return t || "";
  }catch(e){ try{ return String((blob&&blob.type)||"").toLowerCase(); }catch(e2){ return ""; } }
};
// Retorna Blob png/jpeg/webp pronto p/ generateText, ou null (desiste sem erro).
// Se keepSheet===true, retorna {blob, multi} p/ manter o aviso de "grade GIF".
window.zunVisionClean = async function(blob, keepSheet){
  try{
    if(!blob || !(blob.size>500) || blob.size>6000000) return null;
    var t = String(blob.type||"").toLowerCase();
    if(!t){
      // superFetch às vezes vem sem MIME: fareja bytes e re-rotula.
      t = await window.zunSniffVisionType(blob);
      if(/^image\/(png|jpeg|webp|gif)$/.test(t)){ try{ blob = new Blob([blob], {type:t}); }catch(e){} }
      else return null;
    }
    if(/^image\/(png|jpeg|webp)$/i.test(blob.type||"")) return keepSheet ? {blob:blob, multi:false} : blob;
    if(!/^image\/gif$/i.test(blob.type||"")) return null; // text/html e resto: desiste
    // GIF: converte p/ JPEG (grade de 9 quadros) — nunca manda GIF puro.
    try{
      var sh = window.zunVisionSheet ? await window.zunVisionSheet(blob) : null;
      if(sh && sh.blob && sh.blob.size>500 && window.zunVisionOk(sh.blob)) return keepSheet ? sh : sh.blob;
      if(sh && sh.blob && sh.blob.size>500 && /^image\/jpeg$/i.test(sh.blob.type||"")) return keepSheet ? sh : sh.blob;
    }catch(e){}
    try{
      var fb = await blobToJpeg(blob);
      if(fb && fb.size>500) return keepSheet ? {blob:fb, multi:false} : fb;
    }catch(e){}
    return null;
  }catch(e){ return null; }
};
})();
