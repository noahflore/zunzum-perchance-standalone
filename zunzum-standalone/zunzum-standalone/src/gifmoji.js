/* ZunGifmoji — todo gif enviado pode virar emoji público pequeno e comprimido.
   Shortcode :g_nome: (nome 2-14 [a-z0-9]). Registro público no servidor
   (DB.gifmoji via RPCs gifmojiList/gifmojiAdd, com fallback localRpc).
   REGRA: gif erótico só vira emoji se quem cria desabilitou a censura
   (🔞 modo "ver"). Detecção reaproveita eroVisionOne/eroImgCache (IA com
   grade de 9 quadros p/ GIF). Compressão real com animação via
   gifuct-js (decode) + gifenc (encode 96px). */
(function(){
"use strict";
var GM_SIDE = 96;            // lado maior do emoji (pequeno)
var GM_MAX_BYTES = 409600;   // teto do emoji comprimido (400KB)
var GM_REUSE_BYTES = 307200; // abaixo disso e já-pequeno: usa URL original
var GM_MAX_FRAMES = 48;
var ENC_URL = "https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js";
var DEC_URL = "https://esm.sh/gifuct-js@2.1.2";

function low(n){ return String(n||"").replace(/^@/,"").toLowerCase(); }
function okName(n){ return /^[a-z0-9]{2,14}$/.test(n||""); }
function isGifUrl(u){ return /\.gif([?#]|$)/i.test(String(u||"")); }
function showOff(){
  try{ if(typeof showErotic==="function") return showErotic(); }catch(e){}
  try{ if(typeof eroMode==="function") return eroMode()==="show"; }catch(e){}
  try{ return localStorage.getItem("zunzumEroMode")==="show"||localStorage.getItem("zunzumShowErotic")==="1"; }catch(e2){}
  return false;
}
async function gr(name,data){
  try{ if(typeof rpc==="function") return await rpc(name,data); }catch(e){ /* cai p/ crpc */ }
  if(typeof crpc==="function") return await crpc(name,data);
  throw new Error("sem rpc");
}
function zme(){ try{ return (typeof me!=="undefined"&&me&&me.nick)?me:null; }catch(e){ return null; } }
function zauth(){ let m=zme(); return m?{nick:m.nick,hash:m.hash}:null; }

/* ---------- registro público ---------- */
var map = {};   // nome -> {name,url,w,h,ero,furry,by,at}
var mapAt = 0;
async function reload(force){
  if(!force && Date.now()-mapAt<60000) return map;
  try{
    let r = JSON.parse(await gr("gifmojiList",""));
    if(r&&r.ok&&Array.isArray(r.items)){
      let m = {};
      r.items.forEach(it=>{ if(it&&okName(it.name)&&String(it.url||"").indexOf("https://")===0) m[it.name]=it; });
      map = m; mapAt = Date.now();
    }
  }catch(e){}
  return map;
}
function urlOf(name){ let it=map[name]; return it?it.url:""; }

/* ---------- render :g_nome: ---------- */
var gmRe = /:g_([a-z0-9]{2,14}):/g;
function rowOuter(nd){
  try{
    let p = nd.parentNode;
    if(p&&p.closest) return p.closest(".post,.nmsg,.zun-bub,.chatlog > div,.box");
  }catch(e){}
  return null;
}
function enhance(scope){
  if(!scope||!scope.querySelectorAll) return;
  if(!Object.keys(map).length) return;
  try{
    let walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    let nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(nd=>{
      try{
        let p0 = nd.parentNode;
        if(p0&&p0.closest&&p0.closest("button,select,option,textarea,input,a,.ytFac")) return;
        let v = nd.nodeValue;
        if(!v||v.indexOf(":g_")<0) return;
        gmRe.lastIndex = 0;
        let m, last = 0, has = false;
        let frag = document.createDocumentFragment();
        while((m = gmRe.exec(v))){
          let it = map[m[1]];
          if(!it) continue;
          if(m.index>last) frag.appendChild(document.createTextNode(v.slice(last,m.index)));
          let im = document.createElement("img");
          im.className = "zem-gifmoji"; im.loading = "lazy";
          im.referrerPolicy = "no-referrer"; im.src = it.url; im.alt = m[0]; im.title = m[0]+(it.by?" · @"+it.by:"");
          im.onerror = (function(t){ return function(){ try{ this.replaceWith(document.createTextNode(t)); }catch(e){} }; })(m[0]);
          frag.appendChild(im); has = true;
          /* erótico p/ quem tem censura: embaça na hora (e marca p/ o scanner não duplicar) */
          if(it.ero&&!showOff()){
            try{ im.dataset.eroScan = "1"; }catch(e){}
            try{
              let outer = rowOuter(nd);
              if(outer&&typeof paintErotic==="function") paintErotic(outer,[im]);
              else im.classList.add("zz-blur");
            }catch(e2){ try{ im.classList.add("zz-blur"); }catch(e3){} }
          }
          last = m.index+m[0].length;
        }
        if(!has) return;
        if(last<v.length) frag.appendChild(document.createTextNode(v.slice(last)));
        nd.replaceWith(frag);
      }catch(e){}
    });
  }catch(e){}
}

/* ---------- inserir shortcode no campo ---------- */
function isMobNoKb(){
  try{ if(matchMedia("(max-width:900px)").matches) return true; }catch(e){}
  return false;
}
function insertCode(code){
  try{
    let el = document.activeElement;
    /* foco dentro do picker (busca) não é destino: usa o campo de antes */
    try{ if(el&&el.closest&&el.closest("#zEmojiPanel")) el = null; }catch(e){}
    if(!el||!/INPUT|TEXTAREA/.test(el.tagName||"")) el = lastInput&&lastInput.isConnected?lastInput:(document.getElementById("pubInput")||document.getElementById("privMsgInput"));
    if(!el) return false;
    let s = el.selectionStart, e = el.selectionEnd, v = el.value||"";
    if(typeof s!=="number"){ el.value = (v?v+" ":"")+code+" "; }
    else{
      let before = v.slice(0,s), after = v.slice(e);
      let sp = before&&!/\s$/.test(before)?" ":"";
      el.value = before+sp+code+" "+after;
      let pos = (before+sp+code+" ").length;
      try{ el.setSelectionRange(pos,pos); }catch(err){}
    }
    try{ el.dispatchEvent(new Event("input",{bubbles:true})); }catch(err){}
    /* celular: não força teclado (top-sheet); desktop mantém foco */
    if(!isMobNoKb()){
      try{ el.focus({preventScroll:true}); }catch(err){ try{ el.focus(); }catch(e2){} }
    } else {
      try{ lastInput = el; }catch(e){}
    }
    return true;
  }catch(e){ return false; }
}
var lastInput = null;

/* ---------- compressão animada (gifuct-js + gifenc) ---------- */
async function compressGif(blob){
  let buf = await blob.arrayBuffer();
  if(!buf||!buf.byteLength) throw new Error("vazio");
  if(buf.byteLength>12582912) throw new Error("gif grande demais (>12MB)");
  let dec, enc;
  try{
    dec = await import(DEC_URL);
    enc = await import(ENC_URL);
  }catch(e){ throw new Error("sem rede p/ compressor"); }
  let parsed = dec.parseGIF(buf);
  let W = (parsed&&parsed.lsd&&parsed.lsd.width)||0, H = (parsed&&parsed.lsd&&parsed.lsd.height)||0;
  if(!W||!H||W>2000||H>2000) throw new Error("gif inválido");
  let frames = dec.decompressFrames(parsed, true);
  if(!frames||!frames.length) throw new Error("gif inválido");
  let sc = Math.min(1, GM_SIDE/Math.max(W,H));
  let w = Math.max(1,Math.round(W*sc)), h = Math.max(1,Math.round(H*sc));
  /* amostra quadros p/ caber no teto */
  let stride = Math.max(1, Math.ceil(frames.length/GM_MAX_FRAMES));
  let keep = [];
  for(let i=0;i<frames.length;i+=stride) keep.push(frames[i]);
  if(keep.length>GM_MAX_FRAMES) keep = keep.slice(0,GM_MAX_FRAMES);
  /* compõe cada quadro (disposal) num canvas cheio e reduz */
  let full = document.createElement("canvas"); full.width = W; full.height = H;
  let fx = full.getContext("2d",{willReadFrequently:true});
  let small = document.createElement("canvas"); small.width = w; small.height = h;
  let sx = small.getContext("2d",{willReadFrequently:true});
  let saved = null, out = [];
  for(let k=0;k<keep.length;k++){
    let f = keep[k];
    try{
      if(f.disposalType===3&&saved){ try{ fx.putImageData(saved,0,0); }catch(e){} }
      let dw = (f.dims&&f.dims.width)||W, dh = (f.dims&&f.dims.height)||H;
      let dx = (f.dims&&f.dims.left)||0, dy = (f.dims&&f.dims.top)||0;
      if(f.disposalType===3){ try{ saved = fx.getImageData(0,0,W,H); }catch(e){ saved = null; } }
      let tmp = document.createElement("canvas"); tmp.width = dw; tmp.height = dh;
      let tx = tmp.getContext("2d");
      try{
        let id = new ImageData(new Uint8ClampedArray(f.patch),dw,dh);
        tx.putImageData(id,0,0);
        fx.drawImage(tmp,dx,dy,dw,dh);
      }catch(e){ continue; }
      if(f.disposalType===2){ /* limpa área DEPOIS de capturar: captura abaixo usa o composto */ }
      sx.clearRect(0,0,w,h);
      sx.drawImage(full,0,0,W,H,0,0,w,h);
      let rgba = sx.getImageData(0,0,w,h).data;
      let delay = Math.min(2000,Math.max(20,((f.delay||100)*stride)||100));
      out.push({rgba:rgba,delay:delay});
      if(f.disposalType===2){ try{ fx.clearRect(dx,dy,dw,dh); }catch(e){} }
    }catch(e){ continue; }
  }
  if(!out.length) throw new Error("gif inválido");
  /* transparência? */
  let hasAlpha = false;
  try{
    outer_sa:
    for(let k=0;k<out.length;k+=Math.max(1,Math.floor(out.length/4))){
      let d = out[k].rgba;
      for(let i=3;i<d.length;i+=16){ if(d[i]<128){ hasAlpha = true; break outer_sa; } }
    }
  }catch(e){}
  function tryEncode(rgbaFmt, oneBit){
    let pal = enc.quantize(out[0].rgba, 128, rgbaFmt?{format:"rgba4444",oneBitAlpha:oneBit||true}:undefined);
    let gif = enc.GIFEncoder();
    let tIndex = 0;
    if(rgbaFmt){
      try{
        let d0 = out[0].rgba;
        for(let i=0;i<d0.length;i+=4){
          if(d0[i+3]<128){
            let idx = enc.applyPalette(d0.slice(i,i+4), pal, "rgba4444");
            tIndex = idx[0]||0; break;
          }
        }
      }catch(e){}
    }
    for(let k=0;k<out.length;k++){
      let index = enc.applyPalette(out[k].rgba, pal, rgbaFmt?"rgba4444":undefined);
      let opts = {palette:pal, delay:out[k].delay};
      if(k===0) opts.repeat = 0;
      if(rgbaFmt){ opts.transparent = true; opts.transparentIndex = tIndex; }
      gif.writeFrame(index, w, h, opts);
    }
    gif.finish();
    return gif.bytes();
  }
  let bytes = null;
  if(hasAlpha){ try{ bytes = tryEncode(true); }catch(e){ bytes = null; } }
  if(!bytes){ try{ bytes = tryEncode(false); }catch(e){ bytes = null; } }
  if(!bytes||bytes.length<100) throw new Error("falha ao comprimir");
  /* valida: precisa reabrir como gif */
  try{
    let re = dec.parseGIF(bytes.buffer.slice?bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength):bytes);
    let rf = dec.decompressFrames(re,false);
    if(!rf||!rf.length) throw new Error("falha ao comprimir");
  }catch(e){ throw new Error("falha ao comprimir"); }
  if(bytes.length>GM_MAX_BYTES) throw new Error("nem comprimido coube (<400KB)");
  return {blob:new Blob([bytes],{type:"image/gif"}), w:w, h:h, frames:out.length};
}

/* ---------- veredito erótico do gif (cache + IA) ---------- */
async function eroVerdict(srcUrl, statusCb){
  try{
    if(typeof eroImgCacheGet==="function"){
      let hit = eroImgCacheGet(srcUrl);
      if(hit===1) return {e:true,f:false};
      if(hit===2) return {e:false,f:true};
      if(hit===0) return {e:false,f:false};
    }
  }catch(e){}
  if(typeof eroVisionOne!=="function") return {e:false,f:false,unknown:true};
  try{ if(statusCb) statusCb("verificando conteúdo..."); }catch(e){}
  try{
    let r = await eroVisionOne(srcUrl);
    if(r&&typeof r.e==="boolean") return {e:!!r.e, f:!!r.f};
  }catch(e){}
  return {e:false,f:false,unknown:true};
}

/* ---------- diálogo de promoção ---------- */
var dlg = null, dlgState = null;
function ensureDlg(){
  if(dlg&&dlg.isConnected) return dlg;
  dlg = document.createElement("div");
  dlg.id = "zGmModal"; dlg.hidden = true;
  dlg.innerHTML = '<div class="zGmCard"><h3 class="zun-mhead">✨ virar emoji público</h3>'
    +'<img class="zGmPrev" alt="gif">'
    +'<div class="meta">nome do emoji (só letras/números):</div>'
    +'<div class="zGmNameRow"><span>:g_</span><input class="zGmName" maxlength="14" placeholder="nome"><span>:</span></div>'
    +'<div class="zGmStatus meta"></div>'
    +'<div class="zGmBtns"><button class="zGmGo">criar emoji ✨</button><button class="zGmCancel">cancelar</button></div></div>';
  document.body.appendChild(dlg);
  dlg.addEventListener("pointerdown",ev=>{ if(ev.target===dlg) closeDlg(); });
  dlg.querySelector(".zGmCancel").onclick = closeDlg;
  dlg.querySelector(".zGmGo").onclick = doPromote;
  try{ if(window.zunHealRoot) window.zunHealRoot(dlg); }catch(e){}
  return dlg;
}
function setStatus(t){ try{ ensureDlg().querySelector(".zGmStatus").textContent = t||""; }catch(e){} }
function openDlg(st){
  dlgState = st;
  let d = ensureDlg();
  try{
    d.querySelector(".zGmPrev").src = st.previewUrl;
    let nm = d.querySelector(".zGmName"); nm.value = st.suggest||"";
    setStatus("");
    d.hidden = false;
    setTimeout(()=>{ try{ nm.focus(); }catch(e){} },50);
  }catch(e){ d.hidden = false; }
}
function closeDlg(){ try{ ensureDlg().hidden = true; }catch(e){} dlgState = null; }
function suggestFromUrl(u){
  try{
    let s = String(u||"").split("?")[0].split("/").pop().replace(/\.gif$/i,"").toLowerCase().replace(/[^a-z0-9]+/g,"").slice(0,14);
    return s.length>=2?s:"";
  }catch(e){ return ""; }
}
async function fetchBlob(u){
  /* Round 4 SSRF: valida antes de buscar (bloqueia localhost/IP privado e
     formas numéricas). URL colada pelo usuário ia direto p/ superFetch/fetch. */
  try{
    let _s = String(u||"");
    let _ok = null;
    try{ _ok = (window.zunOkUrl ? window.zunOkUrl(_s, 2000) : null); }catch(e){ _ok = null; }
    if(_ok == null){
      try{
        if(!/^https:\/\//.test(_s) || /[\s<>"'`\\]/.test(_s)) _ok = null;
        else {
          let _hostport = _s.slice(8).split("/")[0].split("?")[0].split("#")[0];
          let _hpp = _hostport.split(":");
          let _h = _hpp[0].toLowerCase();
          // Round 5: valida a porta no fallback também (:0/:99999).
          let _portOk = true;
          if(_hpp.length>2) _portOk = false;
          else if(_hpp.length===2){ if(!/^\d{1,5}$/.test(_hpp[1])) _portOk = false; else { let _pt=parseInt(_hpp[1],10); if(!(_pt>=1&&_pt<=65535)) _portOk=false; } }
          if(!_portOk) _ok = null;
          else if(!_h || _h.length>253 || _h.indexOf("..")>=0 || /[^a-z0-9.-]/.test(_h)) _ok = null;
          else if(_h==="localhost"||_h.slice(-6)===".onion"||_h==="onion"||_h==="local"||_h.slice(-6)===".local"||_h.slice(-10)===".localhost") _ok = null;
          else {
            // Round 5: fallback sem zunOkUrl usava regex fraca (passava
            // 0.0.0.0, octal e octetos mistos). Normaliza como o servidor.
            let _isN = /^[0-9.]+$/.test(_h)||/^0x[0-9a-f.]+$/i.test(_h)||/^[0-9a-f.]*0x[0-9a-f.]*$/i.test(_h);
            if(_isN){
              let _p1 = function(_p){ _p=String(_p||""); if(!_p) return -1; if(/^0x[0-9a-f]+$/i.test(_p)){ let _v=parseInt(_p,16); return (_v>=0&&_v<=255)?_v:-1; } if(/^0[0-7]+$/.test(_p)&&_p.length>1){ let _o=parseInt(_p,8); return (_o>=0&&_o<=255)?_o:-1; } if(!/^\d+$/.test(_p)) return -1; let _d=parseInt(_p,10); return (_d>=0&&_d<=255)?_d:-1; };
              let _q = null;
              try{
                if(/^\d+$/.test(_h)){ let _n=parseInt(_h,10); if(_n>=0&&_n<=4294967295) _q=[(_n>>>24)&255,(_n>>>16)&255,(_n>>>8)&255,_n&255]; }
                else if(/^0x[0-9a-f]+$/i.test(_h)){ let _hh=parseInt(_h,16); if(_hh>=0&&_hh<=4294967295) _q=[(_hh>>>24)&255,(_hh>>>16)&255,(_hh>>>8)&255,_hh&255]; }
                else if(/^0[0-7]+$/.test(_h)&&_h.length>1){ let _oo=parseInt(_h,8); if(_oo>=0&&_oo<=4294967295) _q=[(_oo>>>24)&255,(_oo>>>16)&255,(_oo>>>8)&255,_oo&255]; }
                else { let _pp=_h.split("."); if(_pp.length===4){ let _qq=[_p1(_pp[0]),_p1(_pp[1]),_p1(_pp[2]),_p1(_pp[3])]; if(_qq[0]>=0&&_qq[1]>=0&&_qq[2]>=0&&_qq[3]>=0) _q=_qq; } }
              }catch(_eFB){ _q = null; }
              if(!_q) _ok = null;
              else if(_q[0]===127||_q[0]===0||_q[0]===10) _ok = null;
              else if(_q[0]===172&&_q[1]>=16&&_q[1]<=31) _ok = null;
              else if(_q[0]===192&&_q[1]===168) _ok = null;
              else if(_q[0]===169&&_q[1]===254) _ok = null;
              else if(_q[0]===192&&_q[1]===0&&(_q[2]===0||_q[2]===2)) _ok = null;
              else if(_q[0]>=224) _ok = null;
              else _ok = _s;
            }
            else if(/^[0-9.]+$/.test(_h)){
              let _pp=_h.split(".");
              if(_pp.length===4){
                let _nn=[], _bad=false;
                for(let _i=0;_i<4;_i++){ if(!/^\d{1,3}$/.test(_pp[_i])){ _bad=true; break; } let _vv=parseInt(_pp[_i],10); if(_vv<0||_vv>255){ _bad=true; break; } _nn.push(_vv); }
                if(_bad) _ok = null;
                else if(_nn[0]===127||_nn[0]===0||_nn[0]===10) _ok = null;
                else if(_nn[0]===172&&_nn[1]>=16&&_nn[1]<=31) _ok = null;
                else if(_nn[0]===192&&_nn[1]===168) _ok = null;
                else if(_nn[0]===169&&_nn[1]===254) _ok = null;
                else if(_nn[0]===192&&_nn[1]===0&&(_nn[2]===0||_nn[2]===2)) _ok = null;
                else if(_nn[0]>=224) _ok = null;
                else _ok = _s;
              }
              else _ok = _s;
            }
            else _ok = _s;
          }
        }
      }catch(e){ _ok = null; }
    }
    if(!_ok) throw new Error("url");
  }catch(e){ throw e; }
  let errs = [];
  try{
    if(typeof root!=="undefined"&&root.superFetch){
      let r = await zunFetch(u);
      let b = await r.blob();
      if(b&&b.size>100) return b;
    }
  }catch(e){ errs.push(e); }
  let r2 = await fetch(u);
  let b2 = await r2.blob();
  if(!b2||!b2.size) throw errs[0]||new Error("baixar");
  return b2;
}
function promoteFromUrl(url, inputEl){ initPromote({srcUrl:url, inputEl:inputEl||null}); }
async function promoteFromFile(file, inputEl){
  if(!file) return;
  if(!/^image\/gif$/i.test(file.type||"")&&!/\.gif$/i.test(file.name||"")){ alert("só GIF vira emoji 🎞️"); return; }
  initPromote({file:file, inputEl:inputEl||null});
}
async function initPromote(st){
  try{ lastInput = st.inputEl||document.activeElement; }catch(e){}
  let d = ensureDlg(); d.hidden = false; setStatus("baixando gif...");
  try{ d.querySelector(".zGmPrev").removeAttribute("src"); d.querySelector(".zGmName").value = ""; }catch(e){}
  st.blob = st.file||null;
  try{
    if(!st.blob&&st.srcUrl){
      d.querySelector(".zGmPrev").src = st.srcUrl;
      st.blob = await fetchBlob(st.srcUrl);
    } else if(st.blob){
      st.previewUrl = URL.createObjectURL(st.blob);
      d.querySelector(".zGmPrev").src = st.previewUrl;
      st.suggest = suggestFromUrl(st.blob.name);
    }
    if(st.srcUrl&&!st.suggest) st.suggest = suggestFromUrl(st.srcUrl);
    if(st.blob&&!/^image\/gif$/i.test(st.blob.type||"")&&st.srcUrl&&isGifUrl(st.srcUrl)){
      try{ st.blob = new Blob([st.blob],{type:"image/gif"}); }catch(e){}
    }
    if(!st.blob||(!/^image\/gif$/i.test(st.blob.type||"")&&!(st.srcUrl&&isGifUrl(st.srcUrl)))){ setStatus("isso não parece um GIF."); return; }
    st.previewUrl = st.previewUrl||st.srcUrl;
    openDlg(st);
  }catch(e){ setStatus("não consegui baixar o gif 😕"); }
}
async function doPromote(){
  let st = dlgState; if(!st||!st.blob){ setStatus("sem gif."); return; }
  let d = ensureDlg();
  let name = "";
  try{ name = d.querySelector(".zGmName").value.trim().toLowerCase(); }catch(e){}
  if(!okName(name)){ setStatus("nome 2-14 letras/números, ex: dancinha1"); return; }
  let a = null;
  try{ a = zauth(); }catch(e){}
  if(!a){ setStatus("entre com nick+senha primeiro."); return; }
  let btn = d.querySelector(".zGmGo"); btn.disabled = true;
  try{
    await reload(true);
    if(map[name]){ setStatus("esse nome já existe: :g_"+name+":"); btn.disabled = false; return; }
    /* 1) erótico? (regra: só com censura desligada) */
    let ver = await eroVerdict(st.srcUrl||"", setStatus);
    if(ver.e&&!showOff()){
      setStatus("🔞 esse gif é erótico — p/ virar emoji público, mude 🔞 erótico p/ “ver” (desligar a censura).");
      btn.disabled = false; return;
    }
    /* 2) pequeno e comprimido */
    setStatus("comprimindo gif...");
    let finalBlob = st.blob, w = 0, h = 0, finalUrl = st.srcUrl||"";
    let smallEnough = false;
    try{
      if(st.blob.size<=GM_REUSE_BYTES){
        let u = st.srcUrl||"";
        if(u&&u.indexOf("https://")===0){ smallEnough = true; }
      }
    }catch(e){}
    /* confere dimensão mesmo quando pequeno */
    let useOrig = false;
    if(smallEnough){
      try{
        let bmp = await createImageBitmap(st.blob);
        w = bmp.width; h = bmp.height;
        try{ bmp.close(); }catch(e){}
        if(w>=1&&h>=1&&Math.max(w,h)<=GM_SIDE) useOrig = true;
      }catch(e){ useOrig = false; }
    }
    if(useOrig){ finalUrl = st.srcUrl; }
    else{
      let out = await compressGif(st.blob);
      setStatus("enviando emoji ("+Math.round(out.blob.size/1024)+"KB)...");
      let up = await zunUpload(out.blob,{expires:Date.now()+366*86400000});
      if(!up||up.error||!up.url){ setStatus("erro no upload 😕"); btn.disabled = false; return; }
      finalBlob = out.blob; finalUrl = up.url; w = out.w; h = out.h;
    }
    /* 3) registra público */
    setStatus("publicando...");
    let body = {nick:a.nick, hash:a.hash, name:name, url:finalUrl, w:w, h:h, ero:ver.e?1:0, furry:ver.f?1:0};
    let r = JSON.parse(await gr("gifmojiAdd", JSON.stringify(body)));
    if(!r||!r.ok){
      let why = (r&&r.err)||"?", w = parseInt((r&&r.wait)||0, 10)||0;
      setStatus(why==="existe"?"esse nome já existe: :g_"+name+":":
        why==="cheio"?"limite de emojis por pessoa (20)":
        why==="spam"?"🚫 spam! aguarde "+w+"s e tente de novo":
        why==="devagar"?"⏳ devagar! aguarde "+w+"s":
        why==="rate"?"⏳ aguarde "+w+"s e tente de novo":
        why==="nome"?"nome 2-14 letras/números, ex: dancinha1":
        "erro: "+why);
      btn.disabled = false; return;
    }
    await reload(true);
    try{ paintSection(true); }catch(e){}
    setStatus("pronto! use :g_"+name+": 🎉");
    try{ insertCode(":g_"+name+":"); }catch(e){}
    setTimeout(closeDlg, 900);
  }catch(e){
    setStatus(String((e&&e.message)||e||"erro"));
  }
  btn.disabled = false;
}

/* ---------- seção "da galera" no picker ---------- */
var gmQuery = "";
function gmNorm(s){ try{ return String(s||"").toLowerCase(); }catch(e){ return ""; } }
function paintSection(force){
  try{
    let p = document.getElementById("zEmojiPanel");
    if(!p) return reload(true).then(()=>paintSection());
    let sec = document.getElementById("zGmSec");
    if(!sec){
      sec = document.createElement("div"); sec.className = "zsec"; sec.id = "zGmSec";
      sec.innerHTML = '<div class="zsecT">GIF da galera · <span class="meta">pequenos e comprimidos</span></div>';
      let srow = document.createElement("div"); srow.className = "zGmSearchRow";
      let sin = document.createElement("input");
      sin.id = "zGmSearch"; sin.type = "text"; sin.autocomplete = "off";
      sin.placeholder = "🔍 pesquisar gif..."; sin.setAttribute("aria-label","pesquisar gif da galera");
      sin.value = gmQuery;
      /* digitar aqui não pode fechar o painel nem mandar o chat: */
      ["pointerdown","click"].forEach(ev=>sin.addEventListener(ev,e=>e.stopPropagation()));
      sin.addEventListener("keydown",e=>e.stopPropagation());
      sin.addEventListener("input",()=>{ gmQuery = sin.value||""; try{ fillGmGrid(); }catch(e){} });
      srow.appendChild(sin);
      let cnt = document.createElement("span"); cnt.id = "zGmCount"; cnt.className = "meta";
      srow.appendChild(cnt);
      sec.appendChild(srow);
      let g = document.createElement("div"); g.className = "zEmojiGrid"; g.id = "zGmGrid";
      sec.appendChild(g);
      let ft = document.createElement("div"); ft.style.cssText = "display:flex;gap:6px;margin-top:6px;flex-wrap:wrap";
      let b1 = document.createElement("button"); b1.type = "button"; b1.textContent = "📁 criar de arquivo"; b1.style.fontSize = "12px";
      b1.onclick = ev=>{ ev.stopPropagation(); gmFromFile(); };
      let b2 = document.createElement("button"); b2.type = "button"; b2.textContent = "🔗 criar de link"; b2.style.fontSize = "12px";
      b2.onclick = ev=>{ ev.stopPropagation(); let u = prompt("cole o link https:// do GIF:",""); if(u) promoteFromUrl(u.trim(), null); };
      ft.appendChild(b1); ft.appendChild(b2); sec.appendChild(ft);
      p.appendChild(sec);
    }
    let fill = ()=>{
      let g = document.getElementById("zGmGrid"); if(!g) return;
      /* mantém a busca visível ao repintar (reload async recria só a grade) */
      try{
        let sin = document.getElementById("zGmSearch");
        if(sin && document.activeElement!==sin && sin.value!==(gmQuery||"")) sin.value = gmQuery||"";
      }catch(e){}
      fillGmGrid();
    };
    if(force||Date.now()-mapAt>60000) reload(true).then(fill).catch(fill);
    else fill();
  }catch(e){}
}
/* grade filtrada pela busca (chamada no input sem recarregar do servidor) */
function fillGmGrid(){
  try{
    let g = document.getElementById("zGmGrid"); if(!g) return;
    g.innerHTML = "";
    let q = gmNorm(gmQuery).trim();
    let names = Object.keys(map).sort();
    let total = names.length;
    if(q) names = names.filter(n=>gmNorm(n).indexOf(q)>=0);
    try{
      let c = document.getElementById("zGmCount");
      if(c) c.textContent = total ? (q ? (names.length+" de "+total) : (total+"")) : "";
    }catch(e){}
    if(!total){
      let s = document.createElement("span"); s.className = "meta"; s.textContent = "nenhum ainda — envie um gif e toque em ✨ emoji!";
      g.appendChild(s); return;
    }
    if(!names.length){
      let s = document.createElement("span"); s.className = "meta"; s.textContent = "nenhum gif com esse nome 😕";
      g.appendChild(s); return;
    }
    let cens = !showOff();
    names.slice(0,200).forEach(n=>{
      let it = map[n];
      let b = document.createElement("button"); b.type = "button"; b.title = ":g_"+n+":"+(it.by?" @"+it.by:"")+(it.ero?" 🔞":"");
      let im = document.createElement("img"); im.className = "zem-gifmoji"; im.loading = "lazy"; im.referrerPolicy = "no-referrer"; im.src = it.url; im.alt = ":g_"+n+":";
      try{ im.dataset.eroScan = "1"; }catch(eDS){}
      im.onerror = ()=>{ try{ im.replaceWith(document.createTextNode(":g_"+n+":")); }catch(e){ try{ im.remove(); }catch(e2){} } };
      b.appendChild(im);
      if(it.ero){
        let tag = document.createElement("span"); tag.className = "meta"; tag.textContent = " 🔞"; b.appendChild(tag);
        if(cens){ try{ im.classList.add("zGmBlur"); }catch(e){} }
      }
      b.onclick = ev=>{ ev.stopPropagation(); insertCode(":g_"+n+":"); };
      g.appendChild(b);
    });
  }catch(e){}
}
var filePick = null;
function gmFromFile(){
  try{
    if(!filePick){
      filePick = document.createElement("input");
      filePick.type = "file"; filePick.accept = "image/gif"; filePick.hidden = true;
      document.body.appendChild(filePick);
      filePick.onchange = ()=>{ let f = filePick.files&&filePick.files[0]; try{ filePick.value = ""; }catch(e){} if(f) promoteFromFile(f, null); };
    }
    filePick.click();
  }catch(e){}
}

/* ---------- boot: ganchos ---------- */
function hookLogs(){
  try{
    ["pubLog","privLog","feedCtn"].forEach(id=>{
      let el = document.getElementById(id);
      if(!el||el._gmHook) return; el._gmHook = true;
      try{ enhance(el); }catch(e){}
      try{
        new MutationObserver(()=>{ try{ enhance(el); }catch(e){} }).observe(el,{childList:true,subtree:true});
      }catch(e){}
    });
  }catch(e){}
}
function hookPicker(){
  try{
    if(!window.ZunEmoji||typeof window.ZunEmoji.toggleFor!=="function") return false;
    if(!window.ZunEmoji.toggleFor._gm){
      let orig = window.ZunEmoji.toggleFor;
      let fn = function(inp){ try{ if(inp&&/INPUT|TEXTAREA/.test(inp.tagName||"")) lastInput = inp; }catch(eCap){} let r = orig.apply(this,arguments); try{ paintSection(false); }catch(e){} return r; };
      fn._gm = 1; window.ZunEmoji.toggleFor = fn;
    }
    return true;
  }catch(e){ return false; }
}
function boot(){
  try{ reload(false).then(()=>{ try{ enhance(document.body); }catch(e){} }); }catch(e){}
  hookLogs(); hookPicker();
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>setTimeout(boot,600));
else setTimeout(boot,600);
setTimeout(boot,1800); setTimeout(boot,4500);
setInterval(()=>{ try{ hookLogs(); hookPicker(); }catch(e){} },8000);
setInterval(()=>{ try{ reload(false); }catch(e){} },120000);

window.ZunGifmoji = {
  list:reload, map:function(){ return map; }, urlOf:urlOf, enhance:enhance,
  promoteFromUrl:promoteFromUrl, promoteFromFile:promoteFromFile,
  compress:compressGif, section:paintSection
};
})();
