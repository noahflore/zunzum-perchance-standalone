(function(){
"use strict";
/* DJ IA zunzum — v2 (rápido + escolhas melhores)
   Correções:
   - busca paralela com timeout (antes: até 36 fetches SERIAIS por playlist)
   - toca fallback instantâneo enquanto a IA planeja em background
   - corrige bug onReady (ficava "parado" p/ sempre quando o player ainda não existia)
   - anti-repetição forte (normaliza título: acento/feat/parênteses/case)
   - dislike vale p/ título também, não só videoId
   - gêneros em 1 clique + fila clicável + status claro + anti-spam nos botões
*/
let S = null;
try{ S = JSON.parse(localStorage.getItem("zunzumDJ")||"null") || {}; }catch(e){ S = {}; }
if(!Array.isArray(S.queue)) S.queue = [];
if(typeof S.idx !== "number") S.idx = 0;
if(!S.likes) S.likes = {};
if(!S.dislikes) S.dislikes = {};
if(!S.dTitle) S.dTitle = {};
if(!S.artists) S.artists = {};
if(!Array.isArray(S.played)) S.played = [];
if(!S.seen) S.seen = {};
if(!S.meta) S.meta = {};
if(!S.req) S.req = "";
if(S.idx >= S.queue.length){ if(S.queue.length > 5){ S.queue = []; } S.idx = 0; }
if(S.idx < 0) S.idx = 0;
if(S.loop!=="all"&&S.loop!=="one") S.loop = "off";
// limpa entradas inválidas que travavam o player
S.queue = S.queue.filter(t=>t && t.id && /^[A-Za-z0-9_-]{6,20}$/.test(t.id));
if(S.idx >= S.queue.length) S.idx = 0;
function save(){ try{
  let mk = Object.keys(S.meta).slice(-200); let nm = {}; mk.forEach(k=>nm[k]=S.meta[k]); S.meta = nm;
  let sk = Object.keys(S.seen); if(sk.length>400){ let ns = {}; sk.slice(-400).forEach(k=>ns[k]=1); S.seen = ns; }
  let dk = Object.keys(S.dTitle||{}); if(dk.length>200){ let nd = {}; dk.slice(-200).forEach(k=>nd[k]=S.dTitle[k]); S.dTitle = nd; }
  localStorage.setItem("zunzumDJ", JSON.stringify({req:S.req, queue:S.queue.slice(0,30), idx:S.idx, loop:S.loop||"off", likes:S.likes, dislikes:S.dislikes, dTitle:S.dTitle, artists:S.artists, played:S.played.slice(-100), seen:S.seen, meta:S.meta}));
}catch(e){} }

// ---------- normalização anti-repetição ----------
function norm(s){ return String(s||"").toLowerCase().trim(); }
function djEsc(s){ try{ var d = document.createElement("div"); d.textContent = String(s==null?"":s); return d.innerHTML; }catch(e){ return ""; } }
function normTitle(s){
  s = String(s||"").toLowerCase();
  try{ s = s.normalize("NFD").replace(/[\u0300-\u036f]/g,""); }catch(e){}
  s = s.replace(/[\(\[].*?[\)\]]/g," ");           // tira (ao vivo), [clipe], etc
  s = s.replace(/\b(feat|ft|part|vs|ao vivo|live|cover|remix|remaster|official|video|clipe|audio|lyric|visualizer)\b\.?/g," ");
  s = s.replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
  return s;
}
function tkey(a,t){ return normTitle(a)+" — "+normTitle(t); }
function seenBefore(a,t){ return !!S.seen[tkey(a,t)]; }
function rememberTrack(t){ if(!t||!t.id) return; S.meta[t.id] = {by:t.by, title:t.title}; S.seen[tkey(t.by,t.title)] = 1; }
function markDisTitle(a,t){ try{ S.dTitle[normTitle(a)+" — "+normTitle(t)] = 1; }catch(e){} }
function isDisTitle(a,t){ try{ return !!S.dTitle[normTitle(a)+" — "+normTitle(t)]; }catch(e){ return false; } }

// ---------- helpers async ----------
function withTimeout(p, ms, tag){
  return Promise.race([
    Promise.resolve(p),
    new Promise((_,rej)=>setTimeout(()=>rej(new Error("timeout"+(tag?":"+tag:""))), ms))
  ]);
}
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ let j=Math.floor(Math.random()*(i+1)); let x=a[i]; a[i]=a[j]; a[j]=x; } return a; }
const qCache = {}; // q -> {at, items}
function cacheGet(q){ let c=qCache[q]; if(c && Date.now()-c.at<600000) return c.items; return null; }
function cacheSet(q,items){ try{ qCache[q]={at:Date.now(),items:items}; let ks=Object.keys(qCache); if(ks.length>60) delete qCache[ks[0]]; }catch(e){} }

// ---------- fontes de busca ----------
let INV = ["https://invidious.f5.si","https://inv.nadeko.net","https://iv.duti.dev","https://invidious.nerdvpn.de","https://inv.tux.pizza","https://iv.melmac.space"];
let PIPED = ["https://pipedapi.kavin.rocks","https://pipedapi.adminforge.de","https://pipedapi.reallyaweso.me"];
async function invSearch(base, q){
  let r = await withTimeout(zunFetch(base+"/api/v1/search?q="+encodeURIComponent(q)+"&type=video").then(x=>x.json()), 8000, "inv");
  let arr = Array.isArray(r) ? r : [];
  return arr.map(v=>({id:String(v.videoId||""), title:String(v.title||"").slice(0,80), by:String(v.author||"").slice(0,60), secs:+v.lengthSeconds||0})).filter(v=>v.id);
}
async function pipedSearch(base, q){
  let r = await withTimeout(zunFetch(base+"/search?q="+encodeURIComponent(q)+"&filter=videos").then(x=>x.json()), 8000, "piped");
  let arr = (r && r.items) || (Array.isArray(r) ? r : []);
  let out = [];
  for(let v of arr){
    let url = String((v&&v.url)||"");
    let m = url.match(/[?&]v=([A-Za-z0-9_-]{6,20})/);
    if(!m) continue;
    out.push({id:m[1], title:String(v.title||"").slice(0,80), by:String(v.uploaderName||"").slice(0,60), secs:+(v.duration||0)||0});
  }
  return out;
}
// ---------- scrape direto do YouTube (fonte PRIMÁRIA) ----------
// Os mirrors Invidious/Piped abaixo estão quase todos fora do ar (401,
// "Endpoint disabled", bloqueio ou timeout) — o DJ ficava em "não achei
// nada". O HTML de busca do YouTube via superFetch funciona (~1.5s) e traz
// o ytInitialData com videoId + título + autor + duração reais.
function ytRuns(x){
  try{
    let r = x && x.runs;
    if(Array.isArray(r)) return r.map(o=>String((o&&o.text)||"")).join("");
  }catch(e){}
  return "";
}
function ytSecs(s){
  let m = String(s||"").trim().match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if(!m) return 0;
  if(m[3]!==undefined) return (+m[1])*3600+(+m[2])*60+(+m[3]);
  return (+m[1])*60+(+m[2]);
}
async function ytScrape(q){
  q = String(q||"").slice(0,100);
  if(!q) return [];
  let html = await withTimeout(zunFetch("https://www.youtube.com/results?search_query="+encodeURIComponent(q)).then(x=>x.text()), 12000, "yt");
  let i = html.indexOf("ytInitialData");
  if(i<0) throw new Error("noyt");
  let j = html.indexOf("{", i);
  if(j<0) throw new Error("noyt");
  let depth = 0, inStr = false, esc = false, qq = "", k = j;
  for(; k<html.length; k++){
    let c = html[k];
    if(inStr){ if(esc) esc = false; else if(c==="\\") esc = true; else if(c===qq) inStr = false; }
    else{
      if(c==='"'||c==="'"){ inStr = true; qq = c; }
      else if(c==="{") depth++;
      else if(c==="}"){ depth--; if(depth===0) break; }
    }
  }
  if(depth!==0) throw new Error("noyt2");
  let data = JSON.parse(html.slice(j, k+1));
  let sec = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
  let out = [], seen = {};
  for(let s of sec){
    let items = s && s.itemSectionRenderer && s.itemSectionRenderer.contents;
    if(!Array.isArray(items)) continue;
    for(let it of items){
      let v = it && it.videoRenderer;
      if(!v || !v.videoId) continue;
      let id = String(v.videoId||"");
      if(!id || seen[id]) continue;
      if(!/^[A-Za-z0-9_-]{6,20}$/.test(id)) continue;
      seen[id] = 1;
      let title = ytRuns(v.title).slice(0,80) || q.slice(0,80);
      let by = (ytRuns(v.ownerText)||ytRuns(v.longBylineText)||"").slice(0,60);
      out.push({id:id, title:title, by:by, secs:ytSecs(v.lengthText&&v.lengthText.simpleText)});
      if(out.length>=24) break;
    }
    if(out.length>=24) break;
  }
  if(!out.length) throw new Error("noyt3");
  return out;
}
// busca UMA query: YouTube direto primeiro (rápido); mirrors só se falhar.
// não espera os lentos — retorna assim que tem 6+ candidatos ou 6s passam.
async function searchAll(q){
  q = String(q||"").slice(0,100);
  if(!q) return [];
  let hit = cacheGet(q);
  if(hit) return hit;
  let merged = [], seenId = {};
  let done = 0, total = 0;
  function add(arr){
    if(!arr) return;
    for(let v of arr){
      if(!v.id || seenId[v.id]) continue;
      seenId[v.id] = 1;
      merged.push(v);
      if(merged.length>=24) break;
    }
  }
  // 1) YouTube direto: ~1.5s e já costuma trazer 20+. Se deu 6+, nem
  // acorda os mirrors (todos instáveis — evita N fetches pendurados).
  try{ add(await withTimeout(ytScrape(q), 9000, "yt1")); }
  catch(e){}
  if(merged.length >= 6){ cacheSet(q, merged); return merged; }
  let jobs = [];
  shuffle(INV).slice(0,2).forEach(b=>jobs.push(invSearch(b,q).catch(()=>null)));
  shuffle(PIPED).slice(0,1).forEach(b=>jobs.push(pipedSearch(b,q).catch(()=>null)));
  // se o scrape falhou de vez, tenta 1x de novo em paralelo com os mirrors
  jobs.push(ytScrape(q).catch(()=>null));
  total = jobs.length;
  jobs.forEach(p=>{ Promise.resolve(p).then(add).catch(()=>{}).finally(()=>{ done++; }); });
  let t0 = Date.now();
  while(Date.now()-t0 < 6000){
    if(merged.length >= 6) break;
    if(done >= total) break;
    await new Promise(r=>setTimeout(r, 250));
  }
  // dá +1.5s de chance pros que estão quase chegando, sem travar
  if(!merged.length && done < total){
    let t1 = Date.now();
    while(Date.now()-t1 < 1500){
      if(done >= total) break;
      await new Promise(r=>setTimeout(r, 250));
    }
  }
  // só guarda no cache se achou algo (vazio transitório não pode bloquear retry por 10min)
  if(merged.length) cacheSet(q, merged);
  return merged;
}
function validCandidate(v, artistHint, titleHint){
  if(!v || !v.id || !/^[A-Za-z0-9_-]{6,20}$/.test(v.id)) return false;
  if(badIds[v.id]) return false; // já falhou nesta sessão: nem candidata
  if(v.secs && v.secs > 720) return false; // >12min fora (show/podcast)
  if(S.dislikes[v.id] || S.likes[v.id] || S.played.indexOf(v.id)>=0) return false;
  if(S.queue.some(x=>x.id===v.id)) return false;
  if(!v.by || !v.title) return false;
  if(isDisTitle(v.by, v.title)) return false;
  if(seenBefore(v.by, v.title) && !S.meta[v.id]) return false;
  return true;
}
function scoreCandidate(v, artist, title){
  let s = 0;
  let nb = normTitle(v.by), nt = normTitle(v.title);
  let na = normTitle(artist), nl = normTitle(title);
  if(na && nb.indexOf(na)>=0) s += 3;
  else if(na){
    let words = na.split(" ").filter(w=>w.length>2);
    for(let w of words){ if(nb.indexOf(w)>=0){ s += 1; break; } }
  }
  if(nl){
    let words = nl.split(" ").filter(w=>w.length>2);
    let hit = 0;
    for(let w of words){ if(nt.indexOf(w)>=0) hit++; }
    s += Math.min(3, hit);
  }
  if(/live|podcast|entrevista|documentario/.test(nt)) s -= 2;
  if(v.secs && v.secs>=120 && v.secs<=420) s += 1; // duração típica de música
  return s;
}
async function resolveTrack(artist, title){
  artist = String(artist||"").trim().slice(0,60); title = String(title||"").trim().slice(0,80);
  if(!artist || !title) return null;
  if(seenBefore(artist,title)) return null;
  if(isDisTitle(artist,title)) return null;
  // as 2 variações de busca rodam EM PARALELO (antes: uma depois da outra)
  let queries = [(artist+" "+title+" musica").slice(0,100), (artist+" "+title).slice(0,100)];
  let lists = await Promise.all(queries.map(q=>searchAll(q).catch(()=>[])));
  let merged = [], seenId = {};
  lists.forEach(cands=>{ (cands||[]).forEach(v=>{ if(v.id && !seenId[v.id]){ seenId[v.id]=1; merged.push(v); } }); });
  let best = null, bestS = -99;
  for(let v of merged){
    if(!validCandidate(v, artist, title)) continue;
    let s = scoreCandidate(v, artist, title);
    if(s > bestS){ bestS = s; best = v; }
  }
  if(best) return {id:best.id, title:best.title, by:best.by};
  return null;
}
// pool com concorrência limitada (resolve N faixas sem serializar tudo)
async function resolvePool(items, conc){
  let out = new Array(items.length).fill(null);
  let i = 0;
  async function worker(){
    while(i < items.length){
      let k = i++;
      try{ out[k] = await resolveTrack(items[k].artist, items[k].title); }catch(e){ out[k] = null; }
    }
  }
  let ws = [];
  for(let w=0; w<Math.min(conc||3, items.length); w++) ws.push(worker());
  await Promise.all(ws);
  return out;
}
async function fallbackFill(n){
  if(n<=0) return 0;
  let queries = [];
  if(S.req) queries.push((S.req+" musica").slice(0,100));
  let ents = Object.entries(S.artists).sort((a,b)=>b[1]-a[1]);
  ents.filter(e=>e[1]>0).slice(0,2).forEach(e=>queries.push((e[0]+" musica").slice(0,100)));
  queries.push("top hits brasil musica", "lancamentos musica popular");
  let got = 0;
  for(let q of queries){
    if(got>=n) break;
    let cands = await searchAll(q);
    // ordena por duração musical típica primeiro
    cands.sort((a,b)=>scoreCandidate(b,"","")-scoreCandidate(a,"",""));
    for(let v of cands){
      if(got>=n) break;
      if(!validCandidate(v,"","")) continue;
      if(S.queue.some(x=>tkey(x.by,x.title)===tkey(v.by,v.title))) continue;
      S.queue.push({id:v.id, title:v.title, by:v.by});
      rememberTrack(S.queue[S.queue.length-1]);
      got++; paint();
      if(S.queue.length>=30) break;
    }
  }
  return got;
}

// ---------- UI ----------
let bar = document.createElement("div"); bar.id = "djBar";
bar.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:9000;background:#1c2733;color:#fff;border-radius:10px;padding:6px;display:flex;gap:6px;align-items:center;max-width:92vw;box-shadow:0 4px 14px #0006;font-size:12px;transition:box-shadow .3s";
let st = document.createElement("style"); st.textContent = "#djBar.playing{animation:djPulse var(--beat,1.1s) ease-in-out infinite;border:1px solid #2ecc40}#djBar.playing #djTitle{color:#7CFC98}@keyframes djPulse{0%{box-shadow:0 0 0 0 rgba(46,204,64,.55)}70%{box-shadow:0 0 0 12px rgba(46,204,64,0)}100%{box-shadow:0 0 0 0 rgba(46,204,64,0)}}.djEq{display:inline-flex;gap:2px;align-items:flex-end;height:14px;margin-left:4px}.djEq i{width:3px;background:#2ecc40;border-radius:2px;height:4px}#djBar.playing .djEq i{animation:djEq var(--eq,.7s) ease-in-out infinite alternate}.djEq i:nth-child(2){animation-delay:.15s!important}.djEq i:nth-child(3){animation-delay:.3s!important}@keyframes djEq{from{height:3px}to{height:14px}}"
+"body.zun-mobile #djBar{left:8px!important;right:8px;bottom:calc(82px + env(safe-area-inset-bottom,0px))!important;max-width:none!important;padding:5px!important;}"
+"body.zun-mobile #djYT{width:84px!important;height:48px!important;}"
+"body.zun-mobile #djTitle{max-width:none!important;flex:1 1 auto!important;min-width:0;}"
+"body.zun-mobile #djQueue{max-width:none!important;}"
+"#djBar.djMin #djYT,#djBar.djMin #djPanel,#djBar.djMin #djQueue,#djBar.djMin #djNext,#djBar.djMin #djGenres{display:none!important;}"
+".djChip{background:#2c3e50;color:#fff;border:none;border-radius:12px;padding:3px 9px;cursor:pointer;font-size:11px;white-space:nowrap}.djChip.on{background:#2ecc40}"
+".djNX{background:none;border:none;color:#9fb3c8;cursor:pointer;font-size:11px;text-align:left;padding:1px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:280px;display:block}.djNX:hover{color:#fff}.djNX.cur{color:#7CFC98}"
+".djSpin{display:inline-block;width:10px;height:10px;border:2px solid #2ecc40;border-top-color:transparent;border-radius:50%;animation:djSp .7s linear infinite;vertical-align:-1px;margin-right:4px}@keyframes djSp{to{transform:rotate(360deg)}}"
+"@media (prefers-reduced-motion:reduce){#djBar.playing{animation:none!important}#djBar.playing .djEq i{animation:none!important}.djSpin{animation-duration:2s!important}}";
document.head.appendChild(st);
let vw = document.createElement("div"); vw.id = "djYT"; vw.style.cssText = "width:120px;height:68px;flex:none;background:#000;border-radius:6px;overflow:hidden"; bar.appendChild(vw);
let col = document.createElement("div"); col.style.cssText = "display:flex;flex-direction:column;gap:4px;min-width:0;flex:1 1 auto"; bar.appendChild(col);
let row = document.createElement("div"); row.style.cssText = "display:flex;gap:4px;align-items:center;min-width:0"; col.appendChild(row);
function mkBtn(t, title){ let b = document.createElement("button"); b.textContent = t; b.title = title||t; b.style.cssText = "background:#2c3e50;color:#fff;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:13px"; row.appendChild(b); return b; }
let playB = mkBtn("▶","tocar/pausar");
let titleEl = document.createElement("span"); titleEl.id = "djTitle"; titleEl.textContent = "dj ia · parado"; titleEl.style.cssText = "flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px"; row.appendChild(titleEl);
let nextB = mkBtn("⏭","próxima (pular)");
let loopB = mkBtn("🔁","repetir: desligado — clique p/ repetir a fila");
loopB.onclick = ()=>{
  S.loop = S.loop==="off" ? "all" : S.loop==="all" ? "one" : "off";
  save(); paintLoop(); paint();
};
function paintLoop(){
  try{
    if(S.loop==="one"){ loopB.textContent = "🔂"; loopB.title = "repetindo SÓ esta faixa — clique p/ desligar"; loopB.style.opacity = ""; }
    else if(S.loop==="all"){ loopB.textContent = "🔁"; loopB.title = "repetindo a fila toda — clique p/ repetir só a faixa"; loopB.style.opacity = ""; }
    else { loopB.textContent = "🔁"; loopB.title = "repetir: desligado — clique p/ repetir a fila"; loopB.style.opacity = ".45"; }
  }catch(e){}
}
let eq = document.createElement("span"); eq.className = "djEq"; eq.innerHTML = "<i></i><i></i><i></i>"; eq.title = "tocando"; row.appendChild(eq);
let likeB = mkBtn("👍","gostei — toca mais desse artista");
let disB = mkBtn("👎","não gostei — pula e evita");
let cfgB = mkBtn("⚙","pedido e fila");
let minB = mkBtn("–","minimizar / expandir dj ia");
minB.onclick = ()=>{ bar.classList.toggle("djMin"); minB.textContent = bar.classList.contains("djMin") ? "+" : "–"; };
let panel = document.createElement("div"); panel.id = "djPanel"; panel.hidden = true; panel.style.cssText = "display:flex;gap:4px;align-items:center;flex-wrap:wrap"; col.appendChild(panel);
let reqI = document.createElement("input"); reqI.id = "djReq"; reqI.placeholder = "clima: funk animado, lofi foco..."; reqI.value = S.req||""; reqI.style.cssText = "width:170px;color:#000"; panel.appendChild(reqI);
let goB = document.createElement("button"); goB.textContent = "tocar"; goB.style.cssText = "background:#2ecc40;color:#fff;border:none;border-radius:6px;padding:3px 8px;cursor:pointer"; panel.appendChild(goB);
let GENRES = ["Funk","Sertanejo","Pop","Rock","MPB","Rap","Eletrônica","Lo-fi","Anos 2000","K-pop"];
let gWrap = document.createElement("div"); gWrap.id = "djGenres"; gWrap.style.cssText = "display:flex;gap:4px;overflow-x:auto;max-width:300px;padding:2px 0"; panel.appendChild(gWrap);
GENRES.forEach(g=>{
  let c = document.createElement("button"); c.className = "djChip"+(norm(S.req)===norm(g)?" on":""); c.textContent = g; c.title = "tocar "+g;
  c.onclick = ()=>{ setGenre(g); };
  gWrap.appendChild(c);
});
function setGenre(g){
  S.req = g; reqI.value = g;
  try{ gWrap.querySelectorAll(".djChip").forEach(x=>x.classList.toggle("on", x.textContent===g)); }catch(e){}
  S.queue = []; S.idx = 0;
  save(); paint();
  planMore(true);
  hideDjSoon(1500);
}
let qEl = document.createElement("div"); qEl.id = "djQueue"; qEl.className = "meta"; qEl.style.cssText = "color:#9fb3c8;max-width:280px"; col.appendChild(qEl);
let nxEl = document.createElement("div"); nxEl.id = "djNext"; nxEl.style.cssText = "display:flex;flex-direction:column;max-width:280px"; col.appendChild(nxEl);
document.body.appendChild(bar);

// ---------- pulso no tempo (BPM) ----------
// O iframe do YouTube é cross-origin: o site NÃO tem acesso ao áudio, então
// batida exata é impossível sem hospedar os arquivos (perderia o catálogo e
// gastaria CPU com FFT). Em vez disso o pulso usa o andamento típico do
// gênero da faixa — CSS puro, custo zero por quadro, ajustado 1x por faixa.
function beatBpm(t){
  let s = norm(S.req||"")+" "+norm((t&&t.by)||"")+" "+norm((t&&t.title)||"");
  let table = [
    [/funk|mandela|bruxaria|phonk|edm|eletr[oô]nic|house|techno|dance|eletro|rave/,132],
    [/rap|trap|hip[\s-]?hop|drill|boom bap|grime/,92],
    [/lo[\s-]?fi|chill|ambiente|ac[uú]stic|study/,82],
    [/sertanejo|sofr[eê]ncia|mod[aã]o|forr[oó]|piseiro/,98],
    [/rock|metal|punk|emo|hardcore/,122],
    [/pop\b|k[\s-]?pop|anos 2000|nostalg|ax[eé]|pagode/,114],
    [/mpb|bossa|samba|chorinho/,100],
    [/gospel|worship/,96],
    [/jazz|blues|soul|r&b|rnb/,90],
    [/reggae|dub|ska/,96],
    [/cl[aá]ssic|erudit|opera/,80]
  ];
  let bpm = 104;
  for(let r=0;r<table.length;r++){ if(table[r][0].test(s)){ bpm = table[r][1]; break; } }
  // jitter determinístico por faixa (±5): não parece metrônomo
  try{
    let h = 0, k = String((t&&t.id)||"");
    for(let i=0;i<k.length;i++) h = ((h*31)+k.charCodeAt(i))>>>0;
    bpm += (h % 11) - 5;
  }catch(e){}
  return bpm;
}
function beatSync(t){
  try{
    let bpm = beatBpm(t);
    bar.style.setProperty("--beat", (60/bpm).toFixed(3)+"s");
    bar.style.setProperty("--eq", (30/bpm).toFixed(3)+"s");
    // reinicia a fase no começo da faixa (pulso casa com o ataque inicial)
    bar.classList.remove("playing");
    void bar.offsetWidth;
  }catch(e){}
}

// ---------- player ----------
let player = null, apiReady = false, wantPlay = false, planning = false, planningAt = 0, playStart = 0, lastClick = 0;
let playerBorn = 0, playerReady = false;
let syncPending = null;
window.onYouTubeIframeAPIReady = function(){ apiReady = true; makePlayer(); };
(function(){
  try{ if(document.querySelector('script[src*="youtube.com/iframe_api"]')) return; }catch(e){}
  let t = document.createElement("script"); t.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(t);
})();
/* Se o callback do YouTube nunca chegar (youtube lento/bloqueado, callback
   perdido), o DJ ficava em "carregando youtube..." p/ sempre. Tenta criar
   quando YT.Player existir e desiste com mensagem clara após ~1min. */
let mkTries = 0;
let mkTimer = setInterval(()=>{
  try{
    if(player && playerReady){ clearInterval(mkTimer); mkTimer = null; return; }
    if(typeof YT !== "undefined" && YT && YT.Player){ apiReady = true; makePlayer(); }
    /* player construído mas nunca ficou pronto (>30s): objeto morto, recria */
    if(player && !playerReady && playerBorn && Date.now()-playerBorn > 30000){
      try{ if(player.destroy) player.destroy(); }catch(e){}
      player = null; playerBorn = 0;
    }
    if(++mkTries > 12){
      clearInterval(mkTimer); mkTimer = null;
      if(!player || !playerReady){ try{ qEl.textContent = "youtube indisponível — cheque a conexão e toque de novo"; }catch(e){} }
    }
  }catch(e){}
}, 5000);
function makePlayer(){
  if(player) return;
  /* sem gate estrito no callback: se YT.Player já existe, tenta direto */
  if(!apiReady){
    try{ if(typeof YT !== "undefined" && YT && YT.Player) apiReady = true; }catch(e){}
    if(!apiReady) return;
  }
  try{
    playerBorn = Date.now(); playerReady = false;
    player = new YT.Player(vw, {width:120, height:68, playerVars:{rel:0}, events:{onReady:onPr, onStateChange:onPs, onError:onPe}});
  }catch(e){ player = null; playerBorn = 0; }
}
function onPr(){
  playerReady = true;
  try{ if(mkTimer){ clearInterval(mkTimer); mkTimer = null; } }catch(e){}
  // CORREÇÃO do bug "parado p/ sempre": se pediram play antes do player existir,
  // agora carrega o vídeo atual de verdade em vez de só dar play no vazio.
  if(syncPending){
    let sp = syncPending; syncPending = null; wantPlay = false;
    djPlaySync(sp.vid, sp.by, sp.title, sp.pos);
    return;
  }
  if(wantPlay){ wantPlay = false; playCur(); }
}
function onPs(ev){
  try{
    if(ev.data === YT.PlayerState.PLAYING){ playB.textContent = "⏸"; playStart = Date.now(); errCount = 0; try{bar.classList.add("playing");}catch(e){} }
    else if(ev.data === YT.PlayerState.PAUSED){ playB.textContent = "▶"; try{bar.classList.remove("playing");}catch(e){} }
    else if(ev.data === YT.PlayerState.ENDED){
      try{bar.classList.remove("playing");}catch(e){}
      /* loop de UMA faixa: recomeça sem mexer na fila nem no aprendizado */
      if(S.loop==="one"){ try{ if(player){ player.seekTo(0, true); player.playVideo(); } else playCur(); }catch(e){ try{playCur();}catch(e2){} } paint(); return; }
      finishTrack(true); step(1);
    }
    else if(ev.data === YT.PlayerState.CUED){ try{ player.playVideo(); }catch(e){} }
  }catch(e){}
}
let errCount = 0;
const badIds = {}; // ids que deram erro nesta sessão: pula direto sem tentar de novo
function markBad(id){ try{ if(id) badIds[id] = 1; }catch(e){} }
function skipBad(){
  let n = 0;
  while(n < 40 && S.queue[S.idx] && badIds[S.queue[S.idx].id]){ S.idx++; n++; }
}
function onPe(){
  /* vídeo bloqueado/indisponível (erro 101/150 comum em música): antes o DJ
     desistia após 5 erros seguidos e PARAVA p/ sempre na faixa bloqueada.
     Agora marca o id e segue p/ a próxima (com teto de 12 seguidas). */
  try{ let t = S.queue[S.idx]; if(t && t.id) markBad(t.id); }catch(e){}
  errCount++;
  if(errCount > 12){
    errCount = 0;
    try{ qEl.textContent = "vários vídeos bloqueados — pule (⏭) ou troque o clima"; }catch(e){}
    return;
  }
  /* adiado: se loadVideoById joga erro síncrono, step/playCur direto
     empilhariam até estourar a pilha */
  setTimeout(()=>{ try{ step(1); }catch(e){} }, 350);
}
function key(t){ return t.id; }
function paint(){
  try{ paintLoop(); }catch(e){}
  let t = S.queue[S.idx];
  let label = t ? ((norm(t.title).indexOf(norm(t.by))===0 ? t.title : (t.by+" — "+t.title)).slice(0,60)) : "dj ia · parado";
  titleEl.textContent = label;
  titleEl.title = titleEl.textContent;
  let rest = S.queue.length - S.idx - 1;
  let spin = planning ? '<span class="djSpin"></span>' : '';
  qEl.innerHTML = "";
  if(S.queue.length){
    qEl.innerHTML = spin + "na fila: "+Math.max(0,rest)+(planning?" · dj pensando...":"")+(S.req?" · "+djEsc(String(S.req).slice(0,24)):"");
  } else {
    qEl.innerHTML = planning ? (spin+"dj pensando...") : "";
  }
  // próximas clicáveis
  nxEl.innerHTML = "";
  for(let k=S.idx+1; k<Math.min(S.queue.length, S.idx+6); k++){
    (function(k){
      let n = S.queue[k]; if(!n) return;
      let b = document.createElement("button"); b.className = "djNX";
      b.textContent = "▸ "+(n.by+" — "+n.title).slice(0,48);
      b.title = "pular direto p/ "+n.by+" — "+n.title;
      b.onclick = ()=>{ jumpTo(k); };
      nxEl.appendChild(b);
    })(k);
  }
}
function playCur(){
  skipBad();
  let t = S.queue[S.idx];
  paint(); save();
  if(!t) return;
  beatSync(t);
  errCount = 0;
  if(!player){ makePlayer(); wantPlay = true; if(!apiReady){ qEl.innerHTML = '<span class="djSpin"></span>carregando youtube...'; } else { wantPlay = true; } return; }
  try{ bar.classList.add("playing"); }catch(e){}
  try{ player.loadVideoById(t.id); }catch(e){ markBad(t.id); setTimeout(()=>{ try{ step(1); }catch(e2){} }, 300); }
}
function step(d){
  S.idx += d;
  if(S.idx > 20){ S.queue.splice(0, S.idx); S.idx = 0; }
  if(S.idx >= S.queue.length){
    /* loop da FILA: volta ao começo em vez de pedir mais música */
    if(S.loop==="all" && S.queue.length){ S.idx = 0; playCur(); if(S.queue.length - S.idx < 4) planMore(false); return; }
    paint(); save(); planMore(true); return;
  }
  playCur();
  if(S.queue.length - S.idx < 4) planMore(false);
}
function jumpTo(k){
  if(k<0 || k>=S.queue.length || k===S.idx) return;
  skipSig();
  S.idx = k;
  playCur();
  if(S.queue.length - S.idx < 4) planMore(false);
  hideDjSoon(1500);
}
function finishTrack(full){
  let t = S.queue[S.idx];
  if(!t) return;
  rememberTrack(t);
  if(S.played.indexOf(key(t))<0) S.played.push(key(t));
  if(full) S.artists[t.by] = (S.artists[t.by]||0)+1;
}
function skipSig(){
  let t = S.queue[S.idx];
  if(!t) return;
  rememberTrack(t);
  let heard = (Date.now()-playStart)/1000;
  if(heard < 30){ S.artists[t.by] = (S.artists[t.by]||0)-1; }
  if(S.played.indexOf(key(t))<0) S.played.push(key(t));
}
// ---------- sync: o que to ouvindo + tocar junto ----------
// Leitura do estado atual p/ compartilhar (usado pelo djsync).
function djCurrent(){
  try{
    let t = S.queue[S.idx];
    if(!t || !t.id) return null;
    let pos = 0, playing = 0;
    try{ if(player && player.getCurrentTime) pos = Math.max(0, Math.floor(player.getCurrentTime()||0)); }catch(e){}
    try{ if(player && player.getPlayerState && typeof YT !== "undefined") playing = (player.getPlayerState()===YT.PlayerState.PLAYING) ? 1 : 0; }catch(e){}
    return {vid:t.id, by:t.by||"", title:t.title||"", pos:pos, playing:playing};
  }catch(e){ return null; }
}
function djSeek(pos){
  pos = Math.max(0, Math.min(7200, +pos||0));
  try{ if(player && player.seekTo){ player.seekTo(pos, true); return true; } }catch(e){}
  return false;
}
// No celular o DJ fica oculto p/ economizar espaço: após ESCOLHER a música
// (gênero, pedido, fila, tocar-junto) ele se oculta sozinho. Quem chama de
// volta é o botão DJ da barra inferior (mobile.js -> window.zunDjShow/Hide).
function djMobAuto(){ try{ return document.body.classList.contains("zun-mobile"); }catch(e){ return false; } }
function hideDjSoon(ms){
  try{
    if(!djMobAuto()) return;
    setTimeout(()=>{
      try{ if(window.zunDjHide) window.zunDjHide(); else document.body.classList.add("zun-hide-dj"); }catch(e){}
    }, ms || 1500);
  }catch(e){}
}
// Toca uma faixa externa no mesmo ponto (sincronizar com outra pessoa).
function djPlaySync(vid, by, title, pos){
  vid = String(vid||"");
  if(!/^[A-Za-z0-9_-]{6,20}$/.test(vid)) return false;
  by = String(by||"DJ").slice(0,60) || "DJ";
  title = String(title||vid).slice(0,80) || vid;
  pos = Math.max(0, Math.min(7200, +pos||0));
  if(!player || !apiReady){
    syncPending = {vid:vid, by:by, title:title, pos:pos};
    makePlayer(); wantPlay = true;
    if(!apiReady){ try{ qEl.innerHTML = '<span class="djSpin"></span>carregando youtube...'; }catch(e){} }
    // garante a faixa na fila p/ quando o player ficar pronto
    let ix0 = S.queue.findIndex(x=>x && x.id===vid);
    if(ix0<0){ S.queue.splice(Math.min(S.idx+1, S.queue.length), 0, {id:vid, by:by, title:title, sync:1}); if(S.queue.length>30) S.queue.shift(); }
    paint(); save();
    hideDjSoon(1500);
    return true;
  }
  try{ if(window.__djSyncFollow) window.__djSyncFollow = null; }catch(e){}
  let ix = S.queue.findIndex(x=>x && x.id===vid);
  if(ix<0){
    S.queue.splice(S.idx+1, 0, {id:vid, by:by, title:title, sync:1});
    if(S.queue.length>30) S.queue.splice(0, S.queue.length-30);
    ix = S.queue.findIndex(x=>x && x.id===vid);
  }
  if(ix>=0) S.idx = ix;
  beatSync({id:vid, by:by, title:title});
  paint(); save();
  errCount = 0;
  try{
    let done = false;
    try{ player.loadVideoById({videoId:vid, startSeconds:pos}); done = true; }
    catch(e){
      try{ player.loadVideoById(vid, pos); done = true; }
      catch(e2){ player.loadVideoById(vid); setTimeout(()=>djSeek(pos), 1500); done = true; }
    }
    playStart = Date.now()-pos*1000;
    try{ playB.textContent = "⏸"; bar.classList.add("playing"); }catch(e){}
    // avisa o compartilhador que alguém sincronizou (o djsync mostra o toast)
    try{ document.dispatchEvent(new CustomEvent("zunzum-dj-synced", {detail:{vid:vid}})); }catch(e){}
    hideDjSoon(1500);
    return done;
  }catch(e){ playCur(); setTimeout(()=>djSeek(pos), 1500); hideDjSoon(1500); return true; }
}
function spamClick(){ let n=Date.now(); if(n-lastClick<600) return true; lastClick=n; return false; }
playB.onclick = ()=>{
  if(spamClick()) return;
  if(S.idx >= S.queue.length){ if(S.queue.length) playCur(); else planMore(true); return; }
  if(!player){ playCur(); return; }
  try{
    let stt = player.getPlayerState();
    if(stt === YT.PlayerState.PLAYING) player.pauseVideo();
    else player.playVideo();
  }catch(e){}
};
nextB.onclick = ()=>{ if(spamClick()) return; skipSig(); step(1); };
likeB.onclick = ()=>{
  let t = S.queue[S.idx]; if(!t) return;
  rememberTrack(t);
  S.likes[key(t)] = 1; S.artists[t.by] = (S.artists[t.by]||0)+2;
  qEl.textContent = "anotado! mais de "+t.by+" vindo aí"; save();
  if(S.queue.length - S.idx < 4) planMore(false);
};
disB.onclick = ()=>{
  let t = S.queue[S.idx]; if(!t) return;
  S.dislikes[key(t)] = 1; markDisTitle(t.by, t.title); S.artists[t.by] = (S.artists[t.by]||0)-3;
  try{ delete S.likes[key(t)]; }catch(e){}
  save(); step(1);
};
cfgB.onclick = ()=>{ panel.hidden = !panel.hidden; if(!panel.hidden) reqI.focus(); };
reqI.addEventListener("keydown", (e)=>{ if(e.key==="Enter") goB.onclick(); });
goB.onclick = ()=>{
  if(planning) return;
  S.req = reqI.value.trim().slice(0,120);
  try{ gWrap.querySelectorAll(".djChip").forEach(x=>x.classList.toggle("on", norm(x.textContent)===norm(S.req))); }catch(e){}
  S.queue = []; S.idx = 0;
  save(); paint();
  planMore(true);
  hideDjSoon(1500);
};

// ---------- gosto ----------
function taste(){
  let ents = Object.entries(S.artists).sort((a,b)=>b[1]-a[1]);
  let love = ents.filter(e=>e[1]>0).slice(0,8).map(e=>e[0]+" ("+e[1]+")");
  let hate = ents.filter(e=>e[1]<0).slice(0,8).map(e=>e[0]);
  let disTitles = Object.keys(S.dTitle||{}).slice(-15);
  let names = ids => ids.map(id=>S.meta[id]).filter(m=>m).map(m=>m.by+" — "+m.title);
  let likedTitles = names(Object.keys(S.likes)).slice(-15);
  let recentTitles = names(S.played.slice(-20));
  let queueTitles = S.queue.map(t=>t.by+" — "+t.title);
  return {love, hate, disTitles, ban:likedTitles.concat(recentTitles).concat(queueTitles).concat(disTitles).slice(-40)};
}
function parseTracks(raw){
  let s = String(raw||"");
  let p1 = s.indexOf("{"), p2 = s.lastIndexOf("}");
  if(p1<0) throw new Error("nojson");
  let o = JSON.parse(s.slice(p1,p2+1));
  let arr = Array.isArray(o.tracks) ? o.tracks : (Array.isArray(o.musicas) ? o.musicas : []);
  return arr.map(t=>({artist:String((t&&(t.artist||t.artista))||"").trim().slice(0,60), title:String((t&&(t.title||t.titulo||t.musica))||"").trim().slice(0,80)}))
    .filter(t=>t.artist && t.title);
}

// ---------- planejador principal ----------
async function planMore(autoplay){
  if(planning){
    // watchdog: se travou há +90s, destrava
    if(Date.now()-planningAt > 90000){ planning = false; }
    else return;
  }
  if(S.queue.length - S.idx >= 8 && !autoplay) return;
  if(S.queue.length - S.idx >= 4 && !autoplay && !S.req) return;
  let oldLen = S.queue.length;
  let needPlay = !!autoplay || S.idx >= oldLen;
  planning = true; planningAt = Date.now(); paint();
  goB.disabled = true; try{goB.style.opacity=".5";}catch(e){}
  try{
    // 1) se não tem nada p/ tocar, enche RÁPIDO (2 faixas direto do pedido) e já dá play
    if(needPlay && S.idx >= S.queue.length){
      qEl.innerHTML = '<span class="djSpin"></span>achando som...';
      try{ await withTimeout(fallbackFill(2), 15000, "fast"); }catch(e){}
      if(S.idx < S.queue.length){
        // normaliza idx caso o fallback tenha andado
        if(S.idx >= S.queue.length) S.idx = Math.max(0, S.queue.length-1);
        playCur();
        // se já temos 2+ na fila, o resto completa em background sem bloquear
        needPlay = false; oldLen = S.queue.length; paint();
      }
    }
    // 2) IA sugere 6 faixas (com timeout: se demorar, fica só no fallback)
    let ts = taste();
    let clima = (S.req||"variado animado").slice(0,120);
    let prompt = "Você é o DJ de uma rede social brasileira. Monte a sequência a seguir.\n"+
      "CLIMA/PEDIDO: "+clima+"\n"+
      "CURTE (artista: pontos): "+(ts.love.join(", ")||"nada ainda")+"\n"+
      "ODEIA (evite esses artistas): "+(ts.hate.join(", ")||"nada")+"\n"+
      "NÃO GOSTOU (títulos p/ nunca repetir): "+(ts.disTitles.join(" | ").slice(0,600)||"nada")+"\n"+
      "PROIBIDO REPETIR (já tocou/curtiu/na fila): "+(ts.ban.join(" | ").slice(0,900)||"nada")+"\n"+
      "REGRAS: no máximo 2 das 6 faixas podem ser de artistas curtidos; o resto tem que ser artista NOVO combinando com o CLIMA; varie os artistas (máx 2 faixas por artista); só música REAL que existe no YouTube (nada de inventar); priorize hits conhecidos do clima pedido; se o clima for um gênero (funk, sertanejo, lo-fi...), TODAS as 6 têm que ser desse gênero.\n"+
      "Responda SOMENTE JSON: {\"tracks\": [{\"artist\": \"...\", \"title\": \"...\"}, ...]} com 6 faixas.";
    let arr = [];
    try{
      if(window.ZunAiQuota && !window.ZunAiQuota.tryTake("text")){ arr = []; }
      else {
      let raw = await withTimeout(zunText({instruction:prompt}), 25000, "ia");
      arr = parseTracks(raw);
      }
    }catch(e){ arr = []; }
    // filtra duplicadas / odiadas antes de resolver
    let perArtist = {};
    S.queue.forEach(x=>{ perArtist[normTitle(x.by)] = (perArtist[normTitle(x.by)]||0)+1; });
    let todo = [], seenPair = {};
    for(let t of arr.slice(0,6)){
      if(!t.artist || !t.title) continue;
      if(seenBefore(t.artist,t.title)) continue;
      if(isDisTitle(t.artist,t.title)) continue;
      let pk = tkey(t.artist,t.title);
      if(seenPair[pk]) continue;
      seenPair[pk] = 1;
      if(S.queue.some(x=>tkey(x.by,x.title)===pk)) continue;
      if((perArtist[normTitle(t.artist)]||0) >= 2) continue;
      perArtist[normTitle(t.artist)] = (perArtist[normTitle(t.artist)]||0)+1;
      todo.push(t);
    }
    if(todo.length){
      qEl.innerHTML = '<span class="djSpin"></span>achando '+djEsc(String((todo[0]&&todo[0].artist)||"").slice(0,60))+'...';
      // resolve até 3 em paralelo (rápido)
      let found = await withTimeout(resolvePool(todo, 3), 40000, "pool");
      for(let r of found){
        if(r){ S.queue.push(r); rememberTrack(r); paint(); }
        if(S.queue.length >= 30) break;
      }
    }
    let have = S.queue.length - S.idx;
    if(have < 6){ try{ await withTimeout(fallbackFill(6-have), 25000, "fill"); }catch(e){} }
    if(S.idx >= oldLen && S.idx >= S.queue.length && S.queue.length) S.idx = Math.max(0, S.queue.length-1);
    if(S.idx > 20){ S.queue.splice(0, S.idx); S.idx = 0; }
    if(needPlay && S.idx < S.queue.length) playCur();
    else if(!S.queue.length){ qEl.textContent = "não achei nada — toque de novo pra tentar"; }
  }catch(e){
    try{ await fallbackFill(2); }catch(e2){}
    if(S.idx >= oldLen && S.queue.length && S.idx >= S.queue.length) S.idx = oldLen < S.queue.length ? oldLen : 0;
    if(needPlay && S.idx < S.queue.length) playCur();
    else if(!S.queue.length){ qEl.textContent = "falhou — toque de novo pra tentar"; }
  }
  planning = false; goB.disabled = false; try{goB.style.opacity="";}catch(e){}
  paint(); save();
}
setInterval(()=>{
  if(document.hidden) return;
  if(planning){ if(Date.now()-planningAt>90000){ planning=false; paint(); } return; }
  if(S.idx >= S.queue.length) planMore(true);
  else if(S.queue.length - S.idx < 3) planMore(false);
}, 20000);
paint();
window.__dj = {resolve:resolveTrack, plan:planMore, state:function(){ return S; }, genre:setGenre, current:djCurrent, playSync:djPlaySync, seek:djSeek,
  beat:beatBpm,
  get loop(){ try{ return S.loop||"off"; }catch(e){ return "off"; } },
  setLoop:function(m){ if(m!=="all"&&m!=="one") m = "off"; try{ S.loop = m; save(); paint(); }catch(e){} return S.loop; }};
})();
