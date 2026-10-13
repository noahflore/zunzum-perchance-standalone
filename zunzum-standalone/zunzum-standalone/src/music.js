(function(){
let S = null;
try{ S = JSON.parse(localStorage.getItem("zunzumDJ")||"null") || {}; }catch(e){ S = {}; }
if(!Array.isArray(S.queue)) S.queue = [];
if(typeof S.idx !== "number") S.idx = 0;
if(!S.likes) S.likes = {};
if(!S.dislikes) S.dislikes = {};
if(!S.artists) S.artists = {};
if(!Array.isArray(S.played)) S.played = [];
if(!S.seen) S.seen = {};
if(!S.meta) S.meta = {};
if(!S.req) S.req = "";
if(S.idx >= S.queue.length){ if(S.queue.length > 5){ S.queue = []; } S.idx = 0; }
if(S.idx < 0) S.idx = 0;
function save(){ try{ let mk = Object.keys(S.meta).slice(-200); let nm = {}; mk.forEach(k=>nm[k]=S.meta[k]); S.meta = nm; let sk = Object.keys(S.seen).slice(-300); if(sk.length>300){ let ns = {}; sk.slice(-300).forEach(k=>ns[k]=1); S.seen = ns; } localStorage.setItem("zunzumDJ", JSON.stringify({req:S.req, queue:S.queue.slice(0,30), idx:S.idx, likes:S.likes, dislikes:S.dislikes, artists:S.artists, played:S.played.slice(-100), seen:S.seen, meta:S.meta})); }catch(e){} }
function norm(s){ return String(s||"").toLowerCase().trim(); }
function tkey(a,t){ return norm(a)+" — "+norm(t); }
function rememberTrack(t){ if(!t) return; S.meta[t.id] = {by:t.by, title:t.title}; S.seen[tkey(t.by,t.title)] = 1; }
let bar = document.createElement("div"); bar.id = "djBar";
bar.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:9000;background:#1c2733;color:#fff;border-radius:10px;padding:6px;display:flex;gap:6px;align-items:center;max-width:92vw;box-shadow:0 4px 14px #0006;font-size:12px;transition:box-shadow .3s";
let st = document.createElement("style"); st.textContent = "#djBar.playing{animation:djPulse 1.1s ease-in-out infinite;border:1px solid #2ecc40}#djBar.playing #djTitle{color:#7CFC98}@keyframes djPulse{0%{box-shadow:0 0 0 0 rgba(46,204,64,.55)}70%{box-shadow:0 0 0 12px rgba(46,204,64,0)}100%{box-shadow:0 0 0 0 rgba(46,204,64,0)}}.djEq{display:inline-flex;gap:2px;align-items:flex-end;height:14px;margin-left:4px}.djEq i{width:3px;background:#2ecc40;border-radius:2px;height:4px}#djBar.playing .djEq i{animation:djEq .7s ease-in-out infinite alternate}.djEq i:nth-child(2){animation-delay:.15s!important}.djEq i:nth-child(3){animation-delay:.3s!important}@keyframes djEq{from{height:3px}to{height:14px}}"
+"body.zun-mobile #djBar{left:8px!important;right:8px;bottom:calc(82px + env(safe-area-inset-bottom,0px))!important;max-width:none!important;padding:5px!important;}"
+"body.zun-mobile #djYT{width:84px!important;height:48px!important;}"
+"body.zun-mobile #djTitle{max-width:none!important;flex:1 1 auto!important;min-width:0;}"
+"body.zun-mobile #djQueue{max-width:none!important;}"
+"#djBar.djMin #djYT,#djBar.djMin #djPanel,#djBar.djMin #djQueue{display:none!important;}";
document.head.appendChild(st);
let vw = document.createElement("div"); vw.id = "djYT"; vw.style.cssText = "width:120px;height:68px;flex:none;background:#000;border-radius:6px;overflow:hidden"; bar.appendChild(vw);
let col = document.createElement("div"); col.style.cssText = "display:flex;flex-direction:column;gap:4px;min-width:0;flex:1 1 auto"; bar.appendChild(col);
let row = document.createElement("div"); row.style.cssText = "display:flex;gap:4px;align-items:center;min-width:0"; col.appendChild(row);
function mkBtn(t, title){ let b = document.createElement("button"); b.textContent = t; b.title = title||t; b.style.cssText = "background:#2c3e50;color:#fff;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px"; row.appendChild(b); return b; }
let playB = mkBtn("▶","tocar/pausar");
let titleEl = document.createElement("span"); titleEl.id = "djTitle"; titleEl.textContent = "dj ia · parado"; titleEl.style.cssText = "flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px"; row.appendChild(titleEl);
let nextB = mkBtn("⏭","próxima (pular)");
let eq = document.createElement("span"); eq.className = "djEq"; eq.innerHTML = "<i></i><i></i><i></i>"; eq.title = "tocando"; row.appendChild(eq);
let likeB = mkBtn("👍","gostei");
let disB = mkBtn("👎","não gostei");
let cfgB = mkBtn("⚙","pedido e fila");
let minB = mkBtn("–","minimizar / expandir dj ia");
minB.onclick = ()=>{ bar.classList.toggle("djMin"); minB.textContent = bar.classList.contains("djMin") ? "+" : "–"; };
let panel = document.createElement("div"); panel.id = "djPanel"; panel.hidden = true; panel.style.cssText = "display:flex;gap:4px;align-items:center"; col.appendChild(panel);
let reqI = document.createElement("input"); reqI.id = "djReq"; reqI.placeholder = "clima: funk animado, lofi foco..."; reqI.value = S.req||""; reqI.style.cssText = "width:170px;color:#000"; panel.appendChild(reqI);
let goB = document.createElement("button"); goB.textContent = "tocar"; goB.style.cssText = "background:#2ecc40;color:#fff;border:none;border-radius:6px;padding:3px 8px;cursor:pointer"; panel.appendChild(goB);
let qEl = document.createElement("div"); qEl.id = "djQueue"; qEl.className = "meta"; qEl.style.cssText = "color:#9fb3c8;max-width:280px"; col.appendChild(qEl);
document.body.appendChild(bar);
let player = null, apiReady = false, wantPlay = false, planning = false, playStart = 0;
window.onYouTubeIframeAPIReady = function(){ apiReady = true; makePlayer(); };
(function(){ let t = document.createElement("script"); t.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(t); })();
function makePlayer(){
  if(player || !apiReady) return;
  try{
    player = new YT.Player(vw, {width:120, height:68, playerVars:{rel:0}, events:{onReady:onPr, onStateChange:onPs, onError:onPe}});
  }catch(e){}
}
function onPr(){ if(wantPlay){ wantPlay = false; try{ player.playVideo(); }catch(e){} } }
function onPs(ev){
  if(ev.data === YT.PlayerState.PLAYING){ playB.textContent = "⏸"; playStart = Date.now(); try{bar.classList.add("playing");}catch(e){} }
  else if(ev.data === YT.PlayerState.PAUSED){ playB.textContent = "▶"; try{bar.classList.remove("playing");}catch(e){} }
  else if(ev.data === YT.PlayerState.ENDED){ try{bar.classList.remove("playing");}catch(e){} finishTrack(true); step(1); }
}
function onPe(){ step(1); }
function key(t){ return t.id; }
function paint(){
  let t = S.queue[S.idx];
  let label = t ? ((t.title.toLowerCase().indexOf(t.by.toLowerCase())===0 ? t.title : (t.by+" — "+t.title)).slice(0,60)) : "dj ia · parado";
  titleEl.textContent = label;
  titleEl.title = titleEl.textContent;
  let rest = S.queue.length - S.idx - 1;
  qEl.textContent = S.queue.length ? ("na fila: "+Math.max(0,rest)+(planning ? " · dj pensando..." : "")) : (planning ? "dj pensando..." : "");
}
function playCur(){
  let t = S.queue[S.idx];
  paint(); save();
  if(!t) return;
  if(!player){ makePlayer(); wantPlay = true; if(!apiReady){ qEl.textContent = "carregando youtube..."; } return; }
  try{ player.loadVideoById(t.id); }catch(e){ step(1); }
}
function step(d){
  S.idx += d;
  if(S.idx > 20){ S.queue.splice(0, S.idx); S.idx = 0; }
  if(S.idx >= S.queue.length){ qEl.textContent = "fila acabou — pedindo mais..."; paint(); save(); planMore(true); return; }
  playCur();
  if(S.queue.length - S.idx < 4) planMore();
}
function finishTrack(full){
  let t = S.queue[S.idx];
  if(!t) return;
  rememberTrack(t);
  S.played.push(key(t));
  if(full && S.artists[t.by]!==undefined) S.artists[t.by] = (S.artists[t.by]||0)+1;
}
function skipSig(){
  let t = S.queue[S.idx];
  if(!t) return;
  rememberTrack(t);
  let heard = (Date.now()-playStart)/1000;
  if(heard < 30){ S.artists[t.by] = (S.artists[t.by]||0)-1; }
  S.played.push(key(t));
}
playB.onclick = ()=>{
  if(S.idx >= S.queue.length){ if(S.queue.length) playCur(); else planMore(true); return; }
  if(!player){ if(S.queue.length){ playCur(); } else planMore(true); return; }
  try{
    let st = player.getPlayerState();
    if(st === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  }catch(e){}
};
nextB.onclick = ()=>{ skipSig(); step(1); };
likeB.onclick = ()=>{
  let t = S.queue[S.idx]; if(!t) return;
  rememberTrack(t);
  S.likes[key(t)] = 1; S.artists[t.by] = (S.artists[t.by]||0)+2;
  qEl.textContent = "anotado! mais de "+t.by+" vindo aí"; save();
  if(S.queue.length - S.idx < 4) planMore();
};
disB.onclick = ()=>{
  let t = S.queue[S.idx]; if(!t) return;
  S.dislikes[key(t)] = 1; S.artists[t.by] = (S.artists[t.by]||0)-3;
  save(); step(1);
};
cfgB.onclick = ()=>{ panel.hidden = !panel.hidden; if(!panel.hidden) reqI.focus(); };
reqI.addEventListener("keydown", (e)=>{ if(e.key==="Enter") goB.onclick(); });
goB.onclick = ()=>{
  S.req = reqI.value.trim().slice(0,120);
  S.queue = []; S.idx = 0;
  save(); paint();
  planMore(true);
};
let INV = ["https://invidious.f5.si", "https://inv.nadeko.net", "https://iv.duti.dev"];
async function resolveTrack(artist, title){
  let qs = [(artist+" "+title+" música").slice(0,100), (artist+" "+title).slice(0,100)];
  for(const base of INV){
    for(const q of qs){
      try{
        let r = await root.superFetch(base+"/api/v1/search?q="+encodeURIComponent(q)+"&type=video").then(x=>x.json());
        let arr = Array.isArray(r) ? r : [];
        for(const v of arr){
          if(!v || !v.videoId) continue;
          if(v.lengthSeconds && v.lengthSeconds > 720) continue;
          if(S.dislikes[v.videoId] || S.likes[v.videoId] || S.played.indexOf(v.videoId)>=0) continue;
          if(S.queue.some(x=>x.id===v.videoId)) continue;
          let by = String(v.author||artist).slice(0,60), ti = String(v.title||title).slice(0,80);
          if(S.seen[tkey(by,ti)] && S.meta[v.videoId]===undefined) continue;
          return {id:v.videoId, title:ti, by:by};
        }
      }catch(e){}
    }
  }
  return null;
}
async function fallbackFill(n){
  let queries = [];
  if(S.req) queries.push(S.req+" música");
  let ents = Object.entries(S.artists).sort((a,b)=>b[1]-a[1]);
  ents.filter(e=>e[1]>=0).slice(0,3).forEach(e=>queries.push(e[0]+" música nova"));
  queries.push("lançamentos música popular", "top hits música");
  for(const q of queries){
    if(n<=0) break;
    for(const base of INV){
      if(n<=0) break;
      try{
        let r = await root.superFetch(base+"/api/v1/search?q="+encodeURIComponent(q.slice(0,100))+"&type=video").then(x=>x.json());
        let arr = Array.isArray(r) ? r : [];
        for(const v of arr){
          if(!v || !v.videoId) continue;
          if(v.lengthSeconds && v.lengthSeconds > 720) continue;
          if(S.dislikes[v.videoId] || S.likes[v.videoId] || S.played.indexOf(v.videoId)>=0) continue;
          if(S.queue.some(x=>x.id===v.videoId)) continue;
          let by = String(v.author||"").slice(0,60), ti = String(v.title||"").slice(0,80);
          if(!by || !ti) continue;
          if(S.seen[tkey(by,ti)]) continue;
          S.queue.push({id:v.videoId, title:ti, by:by});
          rememberTrack(S.queue[S.queue.length-1]);
          n--; paint();
          if(n<=0) break;
        }
      }catch(e){}
    }
  }
  return n;
}
function taste(){
  let ents = Object.entries(S.artists).sort((a,b)=>b[1]-a[1]);
  let love = ents.filter(e=>e[1]>0).slice(0,8).map(e=>e[0]+" ("+e[1]+")");
  let hate = ents.filter(e=>e[1]<0).slice(0,8).map(e=>e[0]);
  let names = ids => ids.map(id=>S.meta[id]).filter(m=>m).map(m=>m.by+" — "+m.title);
  let likedTitles = names(Object.keys(S.likes)).slice(-15);
  let recentTitles = names(S.played.slice(-20));
  let queueTitles = S.queue.map(t=>t.by+" — "+t.title);
  return {love, hate, recent:S.played.slice(-15), ban:likedTitles.concat(recentTitles).concat(queueTitles).slice(-30)};
}
async function planMore(autoplay){
  if(planning) return;
  if(S.queue.length - S.idx >= 6 && !autoplay) return;
  let oldLen = S.queue.length;
  let needPlay = !!autoplay || S.idx >= oldLen;
  planning = true; paint();
  try{
    let ts = taste();
    let prompt = "Você é o DJ de uma rede social brasileira. Monte a playlist a seguir.\nPEDIDO DO USUÁRIO: "+(S.req||"variado animado")+"\nCURTE (artista: pontos): "+(ts.love.join(", ")||"nada ainda")+"\nODEIA/PULA: "+(ts.hate.join(", ")||"nada")+"\nPROIBIDO REPETIR (artista — título, já tocou/curtiu/na fila): "+(ts.ban.join(" | ").slice(0,900)||"nada")+"\nMISTURA OBRIGATÓRIA: no máximo 2 das 6 faixas podem ser dos artistas curtidos; as demais devem ser artistas/títulos NOVOS e diferentes de tudo do PROIBIDO; varie os artistas (máximo 2 faixas por artista).\nResponda SOMENTE com JSON, sem explicar: {\"tracks\": [{\"artist\": \"...\", \"title\": \"...\"}, ...]} com 6 faixas que combinem com o pedido. Títulos e artistas reais que existam no YouTube.";
    let raw = await root.generateText({instruction:prompt});
    let p1 = String(raw).indexOf("{"), p2 = String(raw).lastIndexOf("}");
    if(p1<0) throw new Error("nojson");
    let o = JSON.parse(String(raw).slice(p1,p2+1));
    let arr = Array.isArray(o.tracks) ? o.tracks : [];
    let perArtist = {};
    S.queue.forEach(x=>{ perArtist[norm(x.by)] = (perArtist[norm(x.by)]||0)+1; });
    for(const t of arr.slice(0,6)){
      let a = String((t&&t.artist)||"").trim().slice(0,60), ti = String((t&&t.title)||"").trim().slice(0,80);
      if(!a || !ti) continue;
      if(S.seen[tkey(a,ti)]) continue;
      if(S.queue.some(x=>x.by.toLowerCase()===a.toLowerCase() && x.title.toLowerCase()===ti.toLowerCase())) continue;
      if((perArtist[norm(a)]||0) >= 2) continue;
      qEl.textContent = "achando "+a+" — "+ti+"...";
      let r = await resolveTrack(a, ti);
      if(r){ S.queue.push(r); rememberTrack(r); perArtist[norm(a)] = (perArtist[norm(a)]||0)+1; paint(); }
      if(S.queue.length >= 30) break;
    }
    let have = S.queue.length - S.idx;
    if(have < 3){ await fallbackFill(3 - have); }
    if(S.idx >= oldLen && S.idx >= S.queue.length && S.queue.length) S.idx = Math.max(0, S.queue.length - 1);
    if(S.idx > 20){ S.queue.splice(0, S.idx); S.idx = 0; }
    if(needPlay && S.idx < S.queue.length) playCur();
    else if(!S.queue.length){ qEl.textContent = "não achei nada — toque de novo pra tentar"; }
  }catch(e){
    try{ await fallbackFill(3); }catch(e2){}
    if(S.idx >= oldLen && S.queue.length && S.idx >= S.queue.length) S.idx = oldLen < S.queue.length ? oldLen : 0;
    if(needPlay && S.idx < S.queue.length) playCur();
    else if(!S.queue.length){ qEl.textContent = "falhou — toque de novo pra tentar"; }
  }
  planning = false; paint(); save();
}
setInterval(()=>{ if(document.hidden || planning) return; if(S.idx >= S.queue.length) planMore(true); else if(S.queue.length - S.idx < 3) planMore(); }, 30000);
paint();
window.__dj = {resolve:resolveTrack, plan:planMore, state:function(){ return S; }};
})();
