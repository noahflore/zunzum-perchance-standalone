(function(){
var S={privHex:"",relays:["wss://nos.lol","wss://relay.primal.net","wss://relay.snort.social","wss://nostr-pub.wellorder.net","wss://purplepag.es","wss://offchain.pub"],on:false,lastId:"",profSet:false,lastSpot:0,spotIds:[],spotCaps:[],aiOn:true,lastInt:0,lastNotif:0,lastFb:0,aiDay:"",aiReps:0,aiLikes:0,aiFbs:0,likeIds:[],repIds:[],lastDisc:0};
try{ var l=JSON.parse(localStorage.getItem("zunzumMirror")||"null"); if(l){ if(typeof l.privHex==="string") S.privHex=l.privHex; if(Array.isArray(l.relays)&&l.relays.length) S.relays=l.relays.slice(0,8); if(typeof l.lastId==="string") S.lastId=l.lastId; if(l.on===true) S.on=true; if(l.profSet===true) S.profSet=true; if(l.lastSpot>0) S.lastSpot=l.lastSpot; if(Array.isArray(l.spotIds)) S.spotIds=l.spotIds.slice(-20); if(Array.isArray(l.spotCaps)) S.spotCaps=l.spotCaps.slice(-5); if(l.aiOn===false) S.aiOn=false; if(l.lastInt>0) S.lastInt=l.lastInt; if(l.lastNotif>0) S.lastNotif=l.lastNotif; if(l.lastFb>0) S.lastFb=l.lastFb; if(typeof l.aiDay==="string") S.aiDay=l.aiDay; if(l.aiReps>0) S.aiReps=l.aiReps; if(l.aiLikes>0) S.aiLikes=l.aiLikes; if(l.aiFbs>0) S.aiFbs=l.aiFbs; if(Array.isArray(l.likeIds)) S.likeIds=l.likeIds.slice(-50); if(Array.isArray(l.repIds)) S.repIds=l.repIds.slice(-50); if(l.lastDisc>0) S.lastDisc=l.lastDisc; } S.fresh=!l; }catch(e){}
S.auto=true; try{ if(localStorage.getItem("zunzumMirrorAuto")==="0") S.auto=false; }catch(e){}
S.sharedPriv=null; S.autoBusy=false; S.autoLast="";
try{ S.autoLast=localStorage.getItem("zunzumMirrorAutoLast")||""; }catch(e){}
try{
  var deadMap={"wss://relay.damus.io":"wss://relay.primal.net","wss://relay.nostr.band":"wss://nostr-pub.wellorder.net","wss://relay.mostr.pub":"wss://offchain.pub"};
  var mig=false;
  S.relays=S.relays.map(function(u){ if(deadMap[u]){ mig=true; return deadMap[u]; } return u; });
  S.relays=S.relays.filter(function(u,i){ return S.relays.indexOf(u)===i; });
  if(mig) save();
}catch(e){}
function save(){ try{ localStorage.setItem("zunzumMirror", JSON.stringify({privHex:S.privHex,relays:S.relays,lastId:S.lastId,on:S.on,profSet:S.profSet,lastSpot:S.lastSpot||0,spotIds:(S.spotIds||[]).slice(-20),spotCaps:(S.spotCaps||[]).slice(-5),aiOn:S.aiOn!==false,lastInt:S.lastInt||0,lastNotif:S.lastNotif||0,lastFb:S.lastFb||0,aiDay:S.aiDay||"",aiReps:S.aiReps||0,aiLikes:S.aiLikes||0,aiFbs:S.aiFbs||0,likeIds:(S.likeIds||[]).slice(-50),repIds:(S.repIds||[]).slice(-50),lastDisc:S.lastDisc||0})); }catch(e){} }
var _noble=null, timer=null, busy=false;
async function noble(){ if(!_noble) _noble=await import("https://esm.sh/@noble/secp256k1@1.7.1"); return _noble; }
function hex(b){ return Array.from(b).map(function(x){ return x.toString(16).padStart(2,"0"); }).join(""); }
function unhex(s){ s=String(s||"").trim(); if(!/^[0-9a-fA-F]{64}$/.test(s)) return null; var b=new Uint8Array(32); for(var i=0;i<32;i++) b[i]=parseInt(s.substr(i*2,2),16); return b; }
function link(){ return (window.ZUNZUM_BASE||"https://perchance.org/zunzum"); }
async function signEvRaw(priv, kind, tags, content){
var nb=await noble();
var pub=hex(nb.schnorr.getPublicKey(priv));
var ev={kind:kind,created_at:Math.floor(Date.now()/1000),tags:tags,content:content,pubkey:pub};
var ser=JSON.stringify([0,ev.pubkey,ev.created_at,ev.kind,ev.tags,ev.content]);
var h=new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ser)));
ev.id=hex(h);
ev.sig=hex(await nb.schnorr.sign(h, priv));
return ev;
}
async function signEv(priv, content){
return signEvRaw(priv, 1, [["r",link()]], content);
}
async function publishProfile(){
var priv=unhex(S.privHex);
if(!priv) return false;
try{
  var meta={name:"zunzum 🐝", display_name:"zunzum", about:"Rede social anônima brasileira: feed livre sem conta, chat público e salas privadas. Espelho automático do feed — venha conversar: "+link(), picture:"https://user.uploads.dev/file/c8408537dd35bb624eee9560b37e5fa8.jpg", website:link()};
var ev=await signEvRaw(priv, 0, [], JSON.stringify(meta));
var ok=await pubAll(ev);
if(ok>0){ S.profSet=true; save(); }
return ok>0;
}catch(e){ return false; }
}
function autoTags(t){
var tags=["#zunzum"];
try{
var low=String(t||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
var map=[["enquete","#enquete"],["desafio","#desafio"],["boa noite","#boanoite"],["bom dia","#bomdia"],["boas-vindas","#boasvindas"],["boas vindas","#boasvindas"],["musica","#musica"],["filme","#cinema"],["serie","#series"],["futebol","#futebol"],["jogo","#games"],["comida","#comida"],["receita","#receita"],["curiosidade","#curiosidade"],["pergunta","#pergunta"],["amor","#amor"],["saudade","#saudade"],["amizade","#amigos"],["amigo","#amigos"],["trabalho","#trabalho"],["faculdade","#faculdade"],["escola","#escola"],["treino","#treino"],["academia","#academia"],["ansiedade","#ansiedade"],["feliz","#feliz"],["triste","#triste"],["ajuda","#ajuda"],["opinião","#opiniao"],["dica","#dica"],["livro","#livros"],["sonho","#sonhos"],["medo","#medo"],["dinheiro","#grana"],["cansado","#cansado"],["familia","#familia"]];
for(var i=0;i<map.length&&tags.length<5;i++){ if(low.indexOf(map[i][0])>=0 && tags.indexOf(map[i][1])<0) tags.push(map[i][1]); }
}catch(e){}
return tags.join(" ");
}
function pubOne(url, ev){
return new Promise(function(res){
var done=false, to=null, ws=null;
function fin(ok){ if(done) return; done=true; try{ clearTimeout(to); }catch(e){} try{ if(ws) ws.close(); }catch(e){} res(ok); }
try{
ws=new WebSocket(url);
to=setTimeout(function(){ fin(false); },8000);
ws.onopen=function(){ try{ ws.send(JSON.stringify(["EVENT",ev])); }catch(e){ fin(false); } };
ws.onmessage=function(m){ if(String(m.data||"").indexOf('"OK"')>=0||String(m.data||"").indexOf(ev.id.slice(0,8))>=0) fin(true); };
ws.onerror=function(){ fin(false); };
setTimeout(function(){ fin(true); },5000);
}catch(e){ fin(false); }
});
}
async function pubAll(ev){
var ok=0;
for(var i=0;i<S.relays.length;i++){ try{ if(await pubOne(S.relays[i], ev)) ok++; }catch(e){} }
return ok;
}
var profCache={};
async function authorInfo(nick){
var ce=profCache[nick];
if(ce && Date.now()-ce.at < 600000) return ce.v;
var r=null;
try{ var j=JSON.parse(await crpc("profileGet", nick)); if(j&&j.ok) r={nick:j.nick, avatar:j.avatar||""}; }catch(e){}
profCache[nick]={at:Date.now(), v:r};
return r;
}
function imetaFor(url){
url=String(url||"");
if(!/^https:\/\//.test(url)) return null;
var m=url.toLowerCase().match(/\.(jpe?g|png|gif|webp)(\?|$)/);
var mt=m ? ("image/"+(m[1]==="jpg"?"jpeg":m[1])) : "image/*";
return ["imeta","url "+url,"m "+mt];
}
async function compose(p){
var t=String((p&&p.t)||"").trim().slice(0,180);
if(eroText(t)) return null;
var author=String((p&&p.n)||"");
var tags=[["r",link()]];
var byline="";
var avatarUrl=null;
if(author.charAt(0)==="@"){
  var nick=author.slice(1);
  var info=null;
  try{ info=await authorInfo(nick); }catch(e){}
  byline="— por @"+((info&&info.nick)||nick);
  if(info&&info.avatar&&imetaFor(info.avatar)) avatarUrl=info.avatar;
}
var postUrl=(p&&p.u&&imetaFor(p.u))?p.u:null;
var urls=[];
if(avatarUrl) urls.push(avatarUrl);
if(postUrl) urls.push(postUrl);
var okPhotos={};
for(var i=0;i<urls.length;i++){
  var v=null;
  try{ v=await visionIsErotic(urls[i]); }catch(e){}
  if(v===true) return null;
  if(v===false) okPhotos[urls[i]]=1;
}
if(avatarUrl&&okPhotos[avatarUrl]){ var at=imetaFor(avatarUrl); if(at) tags.push(at); }
if(p&&p.u){
  var mt=imetaFor(p.u);
  if(!mt) t=(t?t+" ":"")+"[mídia]";
  else if(okPhotos[p.u]) tags.push(mt);
}
if(!t) return null;
return {c:t+"\n\n"+autoTags(t)+"\n"+(byline?byline+"\n":"")+"— via zunzum 🐝\n"+link(), tags:tags};
}
var spotBusy=false;
function isPhotoPost(p){ try{ return !!(p&&p.u&&imetaFor(p.u)); }catch(e){ return false; } }
function markSpot(id){ try{ if(id&&S.spotIds.indexOf(id)<0){ S.spotIds.push(id); S.spotIds=S.spotIds.slice(-20); save(); } }catch(e){} }
async function aiJSON(instr){
try{
var t=String(await root.generateText({instruction:instr})||"");
var a=t.indexOf("{"), b=t.lastIndexOf("}");
if(a<0||b<=a) return null;
return JSON.parse(t.slice(a,b+1));
}catch(e){ return null; }
}
async function fetchPhotoBlob(url){
try{
var r=await fetch(String(url||""));
if(!r.ok) return null;
var b=await r.blob();
if(!b||!b.size||b.size>6000000) return null;
if(b.type&&b.type.indexOf("image/")!==0) return null;
return b;
}catch(e){ return null; }
}
function eroHash(s){ var h=5381; s=String(s); for(var i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))|0; } return (h>>>0).toString(36); }
function eroCacheGet(u){ try{ var m=JSON.parse(localStorage.getItem("zunzumEroImg")||"{}"); var v=m[eroHash(String(u||""))]; return v===1?1:(v===0?0:null); }catch(e){ return null; } }
function eroCacheSet(u,v){ try{ var m=JSON.parse(localStorage.getItem("zunzumEroImg")||"{}"); m[eroHash(String(u||""))]=v?1:0; var ks=Object.keys(m); if(ks.length>300){ ks.slice(0,ks.length-300).forEach(function(k){ delete m[k]; }); } localStorage.setItem("zunzumEroImg", JSON.stringify(m)); }catch(e){} }
var ERO_RE=/(tesa[oi]|gozar|gozo|punheta|siririca|boquete|chupar |chupei|transar|foder|trepar|orgasmo|clitoris|buceta|xota|grelo|\bpica\b|\bpau\b|caralho|\brola\b|cacete|peit[ao]|seios|bunda|\bcu\b|cuzinho|anal|safad[ao]|gostos[ao]|pelad[ao]|putaria|puta\b|corno|chifr|swing|menage|suruba|orgia|masturba|gemid[ao]|gemer|fetiche|bdsm|foda\b|tesao|tesão|onlyfans|privacy\b|acompanhante|garota de programa|motel|nude\b|nudes|naked|nsfw|novinha|novinho|\bsexo\b|erotico|erótico|porn|xvideos|redtube|hentai|camgirl|webcam.*sex|sex.*webcam|kama sutra|kamasutra|69\b|pau duro|pinto\b|vagina|penis|pussy|dick\b|cock\b|boobs|tits\b)/;
function eroText(t){ if(!t) return false; try{ return ERO_RE.test(" "+String(t).toLowerCase()+" "); }catch(e){ return false; } }
async function fetchBlobAny(url){
try{
var r=await root.superFetch(String(url||""));
if(r){
try{ var b=await r.blob(); if(b&&b.size>500&&b.size<=6000000&&(!b.type||b.type.indexOf("image/")===0)) return b; }catch(e){}
try{ var ab=await r.arrayBuffer(); if(ab&&ab.byteLength>500&&ab.byteLength<=6000000) return new Blob([ab],{type:"image/jpeg"}); }catch(e2){}
}
}catch(e){}
return await fetchPhotoBlob(url);
}
async function visionIsErotic(url){
var c=eroCacheGet(url);
if(c===1) return true;
if(c===0) return false;
try{
var blob=await fetchBlobAny(url);
if(!blob) return null;
var out=String(await root.generateText({instruction:["Analise esta foto. Responda SO com JSON, sem mais nada: {\"erotic\":true} se ha nudez, genital, seios a mostra, ato sexual ou insinuacao sexual forte, ou se a pessoa parecer menor de 18 anos em contexto sensual; senao {\"erotic\":false}.", blob]})||"");
var p1=out.indexOf("{"), p2=out.lastIndexOf("}");
var v=null;
if(p1>=0&&p2>p1){ try{ var pj=JSON.parse(out.slice(p1,p2+1)); if(pj.erotic===true||pj.erotic===false) v=pj.erotic; }catch(e){} }
if(v===null){ if(/"erotic"\s*:\s*true/.test(out)) v=true; else if(/"erotic"\s*:\s*false/.test(out)) v=false; }
if(v===true||v===false) eroCacheSet(url, v?1:0);
return v;
}catch(e){ return null; }
}
function planPrompt(hasPhoto, txt){
return "Você é o redator hype do perfil zunzum no Nostr (rede social anônima brasileira, público jovem)."+(hasPhoto?" Olhe a FOTO com atenção.":"")+" TAREFA (planejador): criar a legenda de um DESTAQUE celebrando a foto"+(txt?". Texto original do post: \""+String(txt).slice(0,180)+"\"":"")+"\nREGRAS:\n- português informal, paquerador leve, tipo \"só gente bonita nesse zunzum 😍🔥\" — varie a frase, nunca repita igual\n- legenda curta, até 200 caracteres, 1-2 emojis\n- 3 a 5 hashtags, a primeira SEMPRE #zunzum, resto variado (#gata #linda #beleza #musa #charme #estilo #fotododia...)\n- SEGURANÇA: se a pessoa parecer menor de 18 anos, ou a foto for sexualmente explícita/nudez, responda {\"skip\":true}\nResponda SÓ JSON: {\"caption\":\"...\", \"hashtags\":[\"#zunzum\",\"...\"]}";
}
function criticPrompt(draft, tags, recent){
return "Você é o autocrítico do perfil zunzum no Nostr. RASCUNHO do planejador:\nLegenda: \""+draft+"\"\nHashtags: "+tags.join(" ")+"\nDESTAQUES RECENTES (não repita frases nem o mesmo jogo de hashtags):\n"+(recent.length?recent.join("\n"):"(nenhum)")+"\nTAREFA: revise e MELHORE com outras palavras e hashtags (mesma vibe hype \"só gente bonita nesse zunzum\", português informal, até 200 caracteres). Se o rascunho for repetido, sem graça ou arriscado, reescreva. Se parecer menor de 18 ou explícito, responda {\"skip\":true}.\nResponda SÓ JSON: {\"caption\":\"...\", \"hashtags\":[\"#zunzum\",\"...\"]}";
}
function cleanTags(h){
var out=[];
try{
for(var i=0;i<(h||[]).length&&out.length<5;i++){ var t=String(h[i]||"").trim().slice(0,30); if(/^#[A-Za-zÀ-ú0-9_]+$/.test(t)&&out.indexOf(t)<0) out.push(t); }
}catch(e){}
if(out.indexOf("#zunzum")<0) out.unshift("#zunzum");
return out.slice(0,5);
}
async function aiSpot(p, ov){
var priv=ov?unhex(ov):unhex(S.privHex);
if(!priv) return false;
if(eroText(p&&p.t)) return false;
var vEro=null;
try{ vEro=await visionIsErotic(p.u); }catch(e){}
if(vEro!==false) return false;
var blob=null;
try{ blob=await fetchBlobAny(p.u); }catch(e){}
var instr=planPrompt(!!blob, p.t);
var plan=null;
try{ plan=await aiJSON(blob?[instr,blob]:instr); }catch(e){}
if(!plan||plan.skip||!plan.caption) return false;
var recent=(S.spotCaps||[]).slice(-5);
var rev=null;
try{ rev=await aiJSON(criticPrompt(plan.caption, plan.hashtags||[], recent)); }catch(e){}
var cap=String((rev&&!rev.skip&&rev.caption)||plan.caption||"").trim().slice(0,280);
if(!cap) return false;
var tags=cleanTags((rev&&!rev.skip&&rev.hashtags)||plan.hashtags);
var im=imetaFor(p.u);
var evTags=[["r",link()]];
if(im) evTags.push(im);
var content=cap+"\n\n"+tags.join(" ")+"\n— via zunzum 🐝\n"+link();
try{
var ev=await signEvRaw(priv, 1, evTags, content);
var ok=await pubAll(ev);
if(ok>0){
S.lastSpot=Date.now();
S.spotCaps=(S.spotCaps||[]).concat([cap]).slice(-5);
markSpot(p.id);
save();
return true;
}
}catch(e){}
return false;
}
function maybeSpotlight(posts){
if(!S.on||spotBusy) return;
try{
if(Date.now()-(S.lastSpot||0)<21600000) return;
if(!Array.isArray(posts)||!posts.length) return;
var cand=null;
for(var i=posts.length-1;i>=0;i--){ var p=posts[i]; if(!isPhotoPost(p)||S.spotIds.indexOf(p.id)>=0) continue; if(eroText(p.t)) continue; cand=p; break; }
if(!cand) return;
spotBusy=true;
markSpot(cand.id);
aiSpot(cand).catch(function(){}).then(function(){ spotBusy=false; });
}catch(e){ spotBusy=false; }
}
var intBusy=false, _mypub=null;
async function myPub(){
try{
if(_mypub) return _mypub;
var nb=await noble();
var priv=unhex(S.privHex);
if(!priv) return null;
_mypub=hex(nb.schnorr.getPublicKey(priv));
return _mypub;
}catch(e){ return null; }
}
function wsReq(url, filters, ms){
return new Promise(function(res){
var evs=[], ws=null, to=null;
function fin(){ try{ clearTimeout(to); }catch(e){} try{ if(ws) ws.close(); }catch(e){} res(evs); }
try{
ws=new WebSocket(url);
to=setTimeout(fin, ms||9000);
ws.onopen=function(){ filters.forEach(function(f,i){ try{ ws.send(JSON.stringify(["REQ","mi"+i,f])); }catch(e){} }); };
ws.onmessage=function(m){ try{ var d=JSON.parse(m.data); if(d[0]==="EVENT"&&d[2]&&d[2].id) evs.push(d[2]); }catch(e){} };
ws.onerror=fin;
}catch(e){ fin(); }
});
}
async function relayScan(filters, ms){
var all=[];
for(var i=0;i<S.relays.length;i++){ try{ var evs=await wsReq(S.relays[i], filters, ms||9000); for(var j=0;j<evs.length;j++) all.push(evs[j]); }catch(e){} }
var seen={}, out=[];
for(var k=0;k<all.length;k++){ if(!seen[all[k].id]){ seen[all[k].id]=1; out.push(all[k]); } }
return out;
}
function aiDay(){
try{
var d=new Date().toISOString().slice(0,10);
if(S.aiDay!==d){ S.aiDay=d; S.aiReps=0; S.aiLikes=0; S.aiFbs=0; save(); }
}catch(e){}
}
function looksSpam(t){
t=String(t||"");
if(t.trim().length<3) return true;
if(/viagra|casino|airdrop|giveaway|double your|send \d|dm me for|buy followers/i.test(t)) return true;
var links=(t.match(/https?:\/\//g)||[]).length;
if(links>=2) return true;
return false;
}
async function sendReaction(toId, toAuthor){
try{
var priv=unhex(S.privHex);
if(!priv) return false;
var ev=await signEvRaw(priv, 7, [["e",toId],["p",toAuthor]], "+");
return (await pubAll(ev))>0;
}catch(e){ return false; }
}
function replyDraftPrompt(msg){
return "Você é o Zunzim, mascote hype da rede social anônima zunzum respondendo no Nostr. MENSAGEM RECEBIDA: \""+String(msg).slice(0,300)+"\"\nTAREFA (planejador): escreva uma resposta curta (até 220 caracteres, 0-1 emoji) no MESMO idioma da mensagem (pt/en/es), informal e amigável. Pode incluir #zunzum 1 vez no máximo. NUNCA peça dados pessoais, nunca brigue, nunca fale de política/partido/religião. Se for spam, golpe, ódio, conteúdo sexual/explícito, ou parecer menor de idade, responda {\"skip\":true}.\nResponda SÓ JSON: {\"text\":\"...\"}";
}
function replyCriticPrompt(draft, msg){
return "Você é o autocrítico do mascote Zunzim no Nostr. RASCUNHO: \""+draft+"\"\nMENSAGEM ORIGINAL: \""+String(msg).slice(0,300)+"\"\nTAREFA: revise — está natural? responde de verdade (não genérico)? sem repetir bordões? Se estiver bom, devolva igual; se não, reescreva melhor (até 220 caracteres, mesmo idioma). Se for arriscado (spam, golpe, ódio, sexual, menor de idade, briga), responda {\"skip\":true}.\nResponda SÓ JSON: {\"text\":\"...\"}";
}
async function aiReply(ev, mp){
var txt=String(ev.content||"").trim().slice(0,300);
if(!txt||looksSpam(txt)) return false;
var d=null;
try{ d=await aiJSON(replyDraftPrompt(txt)); }catch(e){}
if(!d||d.skip||!d.text) return false;
var c=null;
try{ c=await aiJSON(replyCriticPrompt(d.text, txt)); }catch(e){}
var fin=String((c&&!c.skip&&c.text)||d.text||"").trim().slice(0,280);
if(!fin||looksSpam(fin)) return false;
try{
var priv=unhex(S.privHex);
if(!priv) return false;
var content=fin+"\n— via zunzum 🐝\n"+link();
var nev=await signEvRaw(priv, 1, [["e",ev.id],["p",ev.pubkey],["r",link()]], content);
var ok=(await pubAll(nev))>0;
if(ok){ S.aiReps=(S.aiReps||0)+1; S.repIds=(S.repIds||[]).concat([ev.id]).slice(-50); save(); }
return ok;
}catch(e){ return false; }
}
async function getOwnFollows(mp){
try{
var own=await relayScan([{kinds:[3],authors:[mp],limit:5}], 9000);
var mine={};
own.forEach(function(e){ (e.tags||[]).forEach(function(t){ if(t[0]==="p"&&t[1]) mine[t[1]]=1; }); });
return mine;
}catch(e){ return {}; }
}
async function addFollows(mp, keys){
try{
if(!keys.length) return false;
var mine=await getOwnFollows(mp);
var fresh=keys.filter(function(k){ return k!==mp&&!mine[k]; });
if(!fresh.length) return false;
var tags=Object.keys(mine).map(function(k){ return ["p",k]; });
fresh.forEach(function(k){ tags.push(["p",k]); });
var priv=unhex(S.privHex);
if(!priv) return false;
var ev=await signEvRaw(priv, 3, tags, "");
var ok=(await pubAll(ev))>0;
if(ok){ S.aiFbs=(S.aiFbs||0)+fresh.length; S.lastFb=Date.now(); save(); }
return ok;
}catch(e){ return false; }
}
async function followBack(mp){
try{
var cands=await relayScan([{kinds:[3],"#p":[mp],limit:50}], 9000);
if(!cands.length) return false;
var fresh=[];
cands.forEach(function(e){ if(e.pubkey!==mp&&fresh.indexOf(e.pubkey)<0) fresh.push(e.pubkey); });
fresh=fresh.slice(0,Math.max(0,20-(S.aiFbs||0)));
if(!fresh.length) return false;
return await addFollows(mp, fresh);
}catch(e){ return false; }
}
function looksBR(t){
t=String(t||"");
if(/[ãõç]/i.test(t)) return true;
return /\b(voce|você|obrigad[oa]|bom dia|boa noite|boa tarde|gente|coisa|muito|hoje|aqui|brasil|brasileir|portugal|portugu[eê]s|valeu|rol[eê]|saudade|galera|mano|trampo|daora|beleza|parab[eé]ns|anivers[aá]rio|fam[ií]lia|Deus|kkk|rsrs|tamo|bora|fala s[eé]rio|e a[ií])\b/i.test(t);
}
async function discovery(mp){
try{
if(Date.now()-(S.lastDisc||0)<21600000) return false;
S.lastDisc=Date.now(); save();
var feed=await relayScan([{kinds:[1],"#t":["brasil","brazil","br","portugal","portugues","nostrbr","nostrbrasil","zap","bomdia","boatarde","boanoite","cafe","futebol","musica","praia","zunzum"],limit:40}], 12000);
try{
var fresh=await relayScan([{kinds:[1],limit:100}], 12000);
for(var fi=0;fi<fresh.length;fi++) feed.push(fresh[fi]);
}catch(e){}
try{ var _seen={}, _feed=[]; for(var di=0;di<feed.length;di++){ if(feed[di]&&feed[di].id&&!_seen[feed[di].id]){ _seen[feed[di].id]=1; _feed.push(feed[di]); } } feed=_feed; }catch(e){}
var mine=await getOwnFollows(mp);
var cands=[];
for(var i=0;i<feed.length;i++){
var e=feed[i];
if(!e||e.pubkey===mp||mine[e.pubkey]) continue;
if(S.likeIds.indexOf(e.id)>=0||S.repIds.indexOf(e.id)>=0) continue;
var txt=String(e.content||"");
if(!looksBR(txt)||looksSpam(txt)) continue;
if(Date.now()-e.created_at*1000>172800000) continue;
cands.push(e);
if(cands.length>=8) break;
}
if(!cands.length) return false;
var liked=0;
for(var j=0;j<cands.length&&liked<5&&(S.aiLikes||0)<30;j++){
try{
if(await sendReaction(cands[j].id, cands[j].pubkey)){ S.aiLikes=(S.aiLikes||0)+1; S.likeIds=(S.likeIds||[]).concat([cands[j].id]).slice(-50); liked++; }
}catch(err){}
}
save();
var fkeys=[];
for(var k=0;k<cands.length&&fkeys.length<5;k++){ if(fkeys.indexOf(cands[k].pubkey)<0) fkeys.push(cands[k].pubkey); }
fkeys=fkeys.slice(0,Math.max(0,20-(S.aiFbs||0)));
if(fkeys.length){ try{ await addFollows(mp, fkeys); }catch(e){} }
var best=null;
for(var w=0;w<cands.length;w++){ if(String(cands[w].content||"").trim().length>20){ best=cands[w]; break; } }
if(best&&S.aiOn!==false&&(S.aiReps||0)<8){
try{ await aiReply(best, mp); }catch(e){}
}
return true;
}catch(e){ return false; }
}
async function doInteract(){
try{
aiDay();
var mp=await myPub();
if(!mp) return;
var since=Math.floor((S.lastNotif||(S.fresh===false?Date.now()-86400000:Date.now()))/1000);
var evs=await relayScan([{kinds:[1],"#p":[mp],since:since,limit:30}], 9000);
evs.sort(function(a,b){ return a.created_at-b.created_at; });
for(var i=0;i<evs.length;i++){
var e=evs[i];
if(!e||e.pubkey===mp) continue;
if(S.likeIds.indexOf(e.id)>=0&&S.repIds.indexOf(e.id)>=0) continue;
var eAge=Date.now()-e.created_at*1000;
try{
if(S.likeIds.indexOf(e.id)<0&&(S.aiLikes||0)<30){
if(await sendReaction(e.id, e.pubkey)){ S.aiLikes=(S.aiLikes||0)+1; S.likeIds=(S.likeIds||[]).concat([e.id]).slice(-50); save(); }
}
if(S.aiOn!==false&&S.repIds.indexOf(e.id)<0&&(S.aiReps||0)<8&&(S.fresh===false||eAge<7200000)){
await aiReply(e, mp);
}
}catch(err){}
}
S.lastNotif=Date.now(); save();
if(S.aiOn!==false&&Date.now()-(S.lastFb||0)>21600000&&(S.aiFbs||0)<20){
try{ await followBack(mp); }catch(e){}
}
if(S.aiOn!==false){
try{ await discovery(mp); }catch(e){}
}
}catch(e){}
}
function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
async function ensureShared(){
if(S.sharedPriv) return S.sharedPriv;
var g=null;
try{ g=JSON.parse(await rpc("mirGet","")); }catch(e){ return null; }
if(!g||!g.ok) return null;
if(g.priv&&/^[0-9a-fA-F]{64}$/.test(g.priv)){ S.sharedPriv=String(g.priv).toLowerCase(); return S.sharedPriv; }
try{
var nb=await noble();
var priv=crypto.getRandomValues(new Uint8Array(32));
var hx=hex(priv);
var r=JSON.parse(await rpc("mirSet", hx));
if(r&&r.ok){ S.sharedPriv=hx; return hx; }
var g2=JSON.parse(await rpc("mirGet",""));
if(g2&&g2.ok&&g2.priv){ S.sharedPriv=String(g2.priv).toLowerCase(); return S.sharedPriv; }
}catch(e){}
return null;
}
async function autoSpot(posts, priv){
var cand=null;
for(var i=posts.length-1;i>=0;i--){ var p=posts[i]; if(!isPhotoPost(p)) continue; if(eroText(p.t)) continue; cand=p; break; }
if(!cand) return;
var s=null;
try{ s=JSON.parse(await rpc("mirSpot", cand.id)); }catch(e){ return; }
if(!s||!s.ok||!s.go) return;
try{ await aiSpot(cand, priv); }catch(e){}
}
async function autoInteract(priv){
var bakL=S.aiLikes, bakR=S.aiReps, bakF=S.aiFbs, bakP=S.privHex;
S.privHex=priv; _mypub=null;
try{
var mp=await myPub();
if(!mp) return;
var since=Math.floor((S.lastNotif||(Date.now()-86400000))/1000);
var evs=await relayScan([{kinds:[1],"#p":[mp],since:since,limit:30}], 9000);
evs.sort(function(a,b){ return a.created_at-b.created_at; });
for(var i=0;i<evs.length;i++){
var e=evs[i];
if(!e||e.pubkey===mp) continue;
var doneL=S.likeIds.indexOf(e.id)>=0, doneR=S.repIds.indexOf(e.id)>=0;
if(doneL&&doneR) continue;
var cl=null;
try{ cl=JSON.parse(await rpc("mirClaim", JSON.stringify([e.id]))); }catch(err){ continue; }
if(!cl||!cl.ok||cl.ids.indexOf(e.id)<0){ S.likeIds=(S.likeIds||[]).concat([e.id]).slice(-50); S.repIds=(S.repIds||[]).concat([e.id]).slice(-50); continue; }
try{
if(!doneL){
var gl=null;
try{ gl=JSON.parse(await rpc("mirAi","like")); }catch(err){}
if(gl&&gl.ok&&gl.go){ if(await sendReaction(e.id, e.pubkey)){ S.aiLikes=(S.aiLikes||0)+1; S.likeIds=(S.likeIds||[]).concat([e.id]).slice(-50); } }
await sleep(1500);
}
if(!doneR&&(S.fresh===false||(Date.now()-e.created_at*1000)<7200000)){
var gr=null;
try{ gr=JSON.parse(await rpc("mirAi","rep")); }catch(err){}
if(gr&&gr.ok&&gr.go){ await aiReply(e, mp); if(S.repIds.indexOf(e.id)<0) S.repIds=(S.repIds||[]).concat([e.id]).slice(-50); }
await sleep(1500);
}
}catch(err){}
}
S.lastNotif=Date.now();
try{
var cands=await relayScan([{kinds:[3],"#p":[mp],limit:50}], 9000);
var fresh=[];
cands.forEach(function(x){ if(x&&x.pubkey!==mp&&fresh.indexOf(x.pubkey)<0) fresh.push(x.pubkey); });
var mine=await getOwnFollows(mp);
var todo=fresh.filter(function(k){ return !mine[k]; }).slice(0,5);
for(var q=0;q<todo.length;q++){
var gf=null;
try{ gf=JSON.parse(await rpc("mirAi","fb")); }catch(err){}
if(!(gf&&gf.ok&&gf.go)) break;
try{ await addFollows(mp, [todo[q]]); }catch(err){}
await sleep(1500);
}
}catch(e){}
save();
}catch(e){}
S.privHex=bakP; S.aiLikes=bakL; S.aiReps=bakR; S.aiFbs=bakF; _mypub=null;
try{ save(); }catch(e){}
}
async function autoTick(){
if(!S.auto||S.on||S.autoBusy) return;
S.autoBusy=true;
try{
var priv=await ensureShared();
if(!priv) return;
var posts=JSON.parse(await crpc("feedGet",""));
if(!Array.isArray(posts)||!posts.length) return;
if(!S.autoLast){ S.autoLast=posts[posts.length-1].id||""; try{ localStorage.setItem("zunzumMirrorAutoLast", S.autoLast); }catch(e){} return; }
var ix=-1;
for(var i=0;i<posts.length;i++){ if(posts[i].id===S.autoLast){ ix=i; break; } }
var news=(ix>=0)?posts.slice(ix+1):posts.slice(-3);
if(news.length){
var ids=news.map(function(p){ return p.id; });
var cl=null;
try{ cl=JSON.parse(await rpc("mirClaim", JSON.stringify(ids))); }catch(e){}
var fresh=(cl&&cl.ok&&Array.isArray(cl.ids))?cl.ids:[];
var byId={};
news.forEach(function(p){ byId[p.id]=p; });
for(var j=0;j<fresh.length;j++){
var p=byId[fresh[j]];
if(!p) continue;
try{
var r=await compose(p);
if(!r) continue;
var ev=await signEvRaw(unhex(priv), 1, r.tags, r.c);
await pubAll(ev);
await sleep(1200);
}catch(e){}
}
}
S.autoLast=posts[posts.length-1].id||S.autoLast;
try{ localStorage.setItem("zunzumMirrorAutoLast", S.autoLast); }catch(e){}
try{ await autoSpot(posts, priv); }catch(e){}
if(S.aiOn!==false){ try{ await autoInteract(priv); }catch(e){} }
paint();
}catch(e){}
S.autoBusy=false;
}
function maybeInteract(){
if(!S.on||intBusy) return;
try{
if(Date.now()-(S.lastInt||0)<600000) return;
intBusy=true;
S.lastInt=Date.now(); save();
doInteract().catch(function(){}).then(function(){ intBusy=false; });
}catch(e){ intBusy=false; }
}
async function poll(){
if(!S.on||busy) return;
var priv=unhex(S.privHex);
if(!priv) return;
busy=true;
try{
if(!S.profSet){ try{ await publishProfile(); }catch(e){} }
var posts=JSON.parse(await crpc("feedGet",""));
if(!Array.isArray(posts)||!posts.length) return;
var news=[];
if(!S.lastId){ news=[]; }
else{
var ix=-1;
for(var i=0;i<posts.length;i++){ if(posts[i].id===S.lastId){ ix=i; break; } }
if(ix>=0) news=posts.slice(ix+1);
else news=posts.slice(-5);
}
S.lastId=posts[posts.length-1].id||S.lastId; save();
for(var j=0;j<news.slice(-5).length;j++){
var r=await compose(news.slice(-5)[j]);
if(!r) continue;
try{ var ev=await signEvRaw(priv, 1, r.tags, r.c); await pubAll(ev); }catch(e){}
}
try{ maybeSpotlight(posts); }catch(e){}
try{ maybeInteract(); }catch(e){}
paint();
}catch(e){}
busy=false;
}
function paint(){
var st=document.getElementById("mirStatus"), b=document.getElementById("mirBtn"), m=document.getElementById("mirMsg");
if(st) st.textContent=S.on?"ligado ✅ espelhando desta aba":(S.auto?"auto 🐝 fundo ligado":"desligado");
if(b) b.textContent=S.on?"desligar":"ligar";
var ab=document.getElementById("mirAIBtn");
if(ab) ab.textContent=S.aiOn!==false?"IA ✅":"IA ❌";
}
async function toggle(){
var k=document.getElementById("mirKey"), m=document.getElementById("mirMsg");
if(S.on){ S.on=false; try{ clearInterval(timer); }catch(e){} timer=null; save(); S.auto=true; try{ localStorage.setItem("zunzumMirrorAuto","1"); }catch(e){} paint(); autoTick(); return; }
var hexv=k&&k.value?k.value.trim():S.privHex;
if(!unhex(hexv)){ if(m) m.textContent="cole uma chave hex de 64 letras ou gere uma nova"; return; }
try{ await noble(); }catch(e){ if(m) m.textContent="falhou baixar lib de assinatura, tente de novo"; return; }
S.privHex=hexv; S.on=true; S.auto=false; try{ localStorage.setItem("zunzumMirrorAuto","0"); }catch(e){} save(); paint();
if(m) m.textContent="espelho ligado nesta aba 👍";
poll();
timer=setInterval(poll,60000);
}
async function newKey(){
var m=document.getElementById("mirMsg"), k=document.getElementById("mirKey");
try{
var nb=await noble();
var priv=crypto.getRandomValues(new Uint8Array(32));
var hx=hex(priv);
try{ var pub=hex(nb.schnorr.getPublicKey(priv)); if(m) m.textContent="nova chave! pub: "+pub.slice(0,16)+"… guarde o hex em local seguro"; }catch(e){ if(m) m.textContent="nova chave criada, guarde em local seguro"; }
if(k) k.value=hx;
S.privHex=hx; save();
try{ await navigator.clipboard.writeText(hx); }catch(e){}
}catch(e){ if(m) m.textContent="falhou gerar, tente de novo"; }
}
function init(){
var k=document.getElementById("mirKey");
if(k&&S.privHex) k.value=S.privHex;
var b=document.getElementById("mirBtn"), n=document.getElementById("mirNewBtn");
if(b) b.onclick=function(){ toggle(); };
if(n) n.onclick=function(){ newKey(); };
var sh=document.getElementById("mirShowBtn");
if(sh) sh.onclick=function(){ var k2=document.getElementById("mirKey"); if(k2) k2.type=(k2.type==="password"?"text":"password"); };
var cp=document.getElementById("mirCopyBtn");
if(cp) cp.onclick=function(){ copyKey(); };
var ab=document.getElementById("mirAIBtn");
if(ab) ab.onclick=function(){ S.aiOn=S.aiOn===false?true:false; save(); paint(); var m2=document.getElementById("mirMsg"); if(m2) m2.textContent=S.aiOn?"IA interagindo: curte, responde e segue de volta 👍":"IA pausada — só espelhando"; };
try{ document.addEventListener("visibilitychange", function(){ if(!document.hidden) poll(); }); }catch(e){}
paint();
try{ setTimeout(function(){ if(S.auto&&!S.on) autoTick(); }, 15000); }catch(e){}
try{ setInterval(function(){ if(S.auto&&!S.on) autoTick(); }, 90000); }catch(e){}
if(S.on && unhex(S.privHex)){
try{ if(timer) clearInterval(timer); }catch(e){}
timer=setInterval(poll,60000);
setTimeout(poll,5000);
}
}
async function copyKey(){
var m=document.getElementById("mirMsg"), k=document.getElementById("mirKey");
var v=(k&&k.value?k.value.trim():S.privHex)||"";
if(!unhex(v)){ if(m) m.textContent="nada pra copiar — gere uma chave antes"; return; }
try{ await navigator.clipboard.writeText(v); if(m) m.textContent="chave copiada! guarde em local seguro 👍"; }
catch(e){
try{ if(k){ k.type="text"; k.focus(); k.select(); document.execCommand("copy"); k.type="password"; if(m) m.textContent="chave copiada! guarde em local seguro 👍"; } }catch(e2){ if(m) m.textContent="copie manual: aperte 👁 e selecione o texto"; }
}
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
