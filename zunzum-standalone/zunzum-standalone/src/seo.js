(function(){
function baseUrl(){
return "https://perchance.org/"+(window.generatorName||"zunzum");
}
function canon(){
try{
var l=document.querySelector('link[rel="canonical"]');
if(!l){ l=document.createElement("link"); l.rel="canonical"; document.head.appendChild(l); }
l.href=baseUrl();
}catch(e){}
}
function hreflang(){
try{
var b=baseUrl();
[["en",b+"?lang=en"],["es",b+"?lang=es"],["pt",b],["x-default",b]].forEach(function(p){
var s=document.querySelector('link[rel="alternate"][hreflang="'+p[0]+'"]');
if(!s){ s=document.createElement("link"); s.rel="alternate"; s.hreflang=p[0]; document.head.appendChild(s); }
s.href=p[1];
});
}catch(e){}
}
function metaHead(){
try{
function setMeta(sel, attr, val){
var m=document.querySelector(sel);
if(!m){ m=document.createElement("meta"); var br=sel.match(/name="([^"]+)"/); var pr=sel.match(/property="([^"]+)"/);
if(br) m.name=br[1]; else if(pr) m.setAttribute("property",pr[1]); else return;
document.head.appendChild(m); }
m.setAttribute(attr,val);
}
var kw="orkut, nostalgia, anos 2000, rede social anonima, comunidades, depoimentos, scraps, bate-papo, forum retro, msn, bate-papo uol, chat anonimo brasil";
if(window.zunzumES) kw="orkut, nostalgia, años 2000, red social anónima, comunidades, testimonios, scraps, chat, foro retro";
else if(window.zunzumEN) kw="orkut, nostalgia, 2000s, anonymous social network, communities, testimonials, scraps, chat, retro forum";
setMeta('meta[name="keywords"]',"content",kw);
setMeta('meta[property="og:type"]',"content","website");
setMeta('meta[property="og:site_name"]',"content","zunzum");
setMeta('meta[name="twitter:card"]',"content","summary_large_image");
try{
var b=baseUrl();
setMeta('meta[property="og:url"]',"content",b);
setMeta('meta[property="og:title"]',"content",document.title||"zunzum — orkut nostálgico, rede anônima anos 2000");
}catch(e2){}
}catch(e){}
}
function enSeo(){
try{
if(window.zunzumES){
document.documentElement.lang="es";
var box=document.getElementById("seoBox");
if(box && !document.getElementById("seoES")){
var d=document.createElement("div"); d.id="seoES"; d.className="box";
d.innerHTML="<h3>acerca de zunzum</h3><div style='font-size:13px;line-height:1.6'><b>zunzum</b> es una red social anónima con nostalgia del <b>Orkut años 2000</b>: feed libre sin cuenta, <b>comunidades</b>, <b>testimonios y scraps</b> como en el Orkut clásico, chat público y salas privadas por código con nick + contraseña, sin email. Tiene búsqueda con IA, perfiles @nick, sugerencias de mejora y DJ IA. Para quien extraña Orkut, MSN y los foros retro.</div>";
box.appendChild(d);
}
if(!document.getElementById("ldES")){
var j=document.createElement("script"); j.id="ldES"; j.type="application/ld+json";
j.textContent='{"@context":"https://schema.org","@type":"WebSite","name":"zunzum","alternateName":"zunzum — red anónima nostálgica estilo orkut, años 2000","url":"'+baseUrl()+'?lang=es","description":"Red social anónima nostálgica estilo Orkut años 2000: feed libre, comunidades, testimonios y scraps, chat público y privado.","inLanguage":"es"}';
document.head.appendChild(j);
}
return;
}
if(!window.zunzumEN) return;
document.documentElement.lang="en";
var box=document.getElementById("seoBox");
if(box && !document.getElementById("seoEN")){
var d=document.createElement("div"); d.id="seoEN"; d.className="box";
d.innerHTML="<h3>about zunzum</h3><div style='font-size:13px;line-height:1.6'><b>zunzum</b> is an anonymous social network with <b>Orkut 2000s nostalgia</b>: a free retro feed with no account, <b>communities</b>, <b>testimonials and scraps</b> like on old Orkut, public chat and private code rooms with nick + password, no email. It has AI search, @nick profiles, improvement suggestions and an AI DJ. For those who miss Orkut, MSN and old-school forums.</div>";
box.appendChild(d);
}
if(!document.getElementById("ldEN")){
var j=document.createElement("script"); j.id="ldEN"; j.type="application/ld+json";
j.textContent='{"@context":"https://schema.org","@type":"WebSite","name":"zunzum","alternateName":"zunzum — nostalgic orkut-style anonymous chat, 2000s vibe","url":"'+baseUrl()+'?lang=en","description":"Nostalgic Orkut-style anonymous network, 2000s vibe: free feed, communities, testimonials and scraps, public and private chat.","inLanguage":"en"}';
document.head.appendChild(j);
}
}catch(e){}
}
var _syncT=null;
function syncSoon(){ try{ clearTimeout(_syncT); }catch(e){} _syncT=setTimeout(function(){ try{ sync(); }catch(e){} }, 1500); }
function sync(){
var src=document.getElementById("feedCtn"), dst=document.getElementById("seoFeed");
if(!src||!dst) return;
var posts=src.querySelectorAll(".post"), out=[];
for(var i=0;i<posts.length&&out.length<6;i++){
try{
var tx=posts[i].querySelector(":scope > div .ptext");
if(!tx) continue;
if(tx.classList&&(tx.classList.contains("zz-blur")||tx.classList.contains("zz-hide"))) continue;
var t=((tx.textContent||"").trim().replace(/\s+/g," ").replace(/^:\s*/,"")).slice(0,160);
if(t.length>10) out.push(t);
}catch(e){}
}
dst.innerHTML="";
if(!out.length){ dst.textContent="Feed ao vivo estilo Orkut anos 2000: posts anônimos nostálgicos, comunidades, depoimentos e scraps, bate-papo público e salas privadas por código."; return; }
out.forEach(function(t){ var p=document.createElement("p"); p.textContent="• "+t; dst.appendChild(p); });
}
function langBtn(){
try{
var b=document.getElementById("langBtn");
if(!b||b._wired) return; b._wired=true;
var lang=window.zunzumLang||"pt";
var nxt=lang==="pt"?"en":(lang==="en"?"es":"pt");
b.textContent=nxt.toUpperCase();
b.title=lang==="pt"?"view in English":(lang==="en"?"ver en español":"ver em português");
b.onclick=function(){
try{
var q=new URLSearchParams(location.search);
q.set("lang",nxt);
location.search=q.toString();
}catch(e){}
};
}catch(e){}
}
function escXml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function sitemapMonth(){ try{ var d=new Date(); return d.getUTCFullYear()+"-"+("0"+(d.getUTCMonth()+1)).slice(-2); }catch(e){ return "2026-10"; } }
function sitemapName(){ return "zunzum-sitemap-"+sitemapMonth(); }
function sitemapUrl(){ return "https://editable.uploads.dev/file/"+(window.generatorName||"zunzum")+"/"+sitemapName(); }
function sitemapCount(xml){ try{ var m=String(xml||"").match(/<url>/g); return m?m.length:0; }catch(e){ return 0; } }
function sitemapMerge(cur, nicks){
var have={}, all=[];
try{ var re=/perfil=([a-z0-9-]{2,20})/g, mm; while((mm=re.exec(String(cur||"")))!==null){ if(!have[mm[1]]){ have[mm[1]]=1; all.push(mm[1]); } } }catch(e){}
for(var i=0;i<(nicks||[]).length && all.length<200;i++){ var n=String(nicks[i]||"").toLowerCase(); if(/^[a-z0-9-]{2,20}$/.test(n)&&!have[n]){ have[n]=1; all.push(n); } }
all.sort();
return all;
}
function sitemapLink(){
try{
var l=document.querySelector('link[rel="sitemap"]');
if(!l){ l=document.createElement("link"); l.rel="sitemap"; l.type="application/xml"; document.head.appendChild(l); }
l.href=sitemapUrl();
}catch(e){}
}
function collectNicks(){
var set={}, order=[];
function add(n){ n=String(n||"").replace(/^@/,"").toLowerCase().slice(0,20); if(!/^[a-z0-9-]{2,20}$/.test(n)) return; if(!set[n]){ set[n]=1; order.push(n); } }
try{ var rawM=null; try{ rawM=sessionStorage.getItem("orkutSession")||localStorage.getItem("orkutSession"); }catch(e){} var m=JSON.parse(rawM||"null"); if(m&&m.nick) add(m.nick); }catch(e){}
try{ if(typeof onlineNicks!=="undefined"&&onlineNicks&&onlineNicks.forEach) onlineNicks.forEach(add); }catch(e2){}
try{
var els=document.querySelectorAll("#feedCtn .chatname, #pubLog .chatname");
for(var i=0;i<els.length&&order.length<150;i++){ add(els[i].textContent); }
}catch(e3){}
return order.slice(0,150);
}
function sitemapDay(){ try{ return new Date().toISOString().slice(0,10); }catch(e){ return "2026-10-08"; } }
function sitemapXml(nicks){
var b=baseUrl(), day=sitemapDay();
var x='<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
x+='<url><loc>'+escXml(b)+'</loc><lastmod>'+day+'</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>';
x+='<url><loc>'+escXml(b+'?lang=en')+'</loc><lastmod>'+day+'</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>';
x+='<url><loc>'+escXml(b+'?lang=es')+'</loc><lastmod>'+day+'</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>';
for(var i=0;i<nicks.length;i++){ x+='<url><loc>'+escXml(b+'?perfil='+nicks[i])+'</loc><lastmod>'+day+'</lastmod><changefreq>weekly</changefreq><priority>0.6</priority></url>'; }
x+='</urlset>';
return x;
}
function sitemapLastmod(xml){
try{ var m=String(xml||"").match(/<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>/); return m?m[1]:null; }catch(e){ return null; }
}
function sitemapStale(xml, maxDays){
try{
var lm=sitemapLastmod(xml); if(!lm) return true;
var days=Math.floor((Date.now()-new Date(lm+"T00:00:00Z").getTime())/86400000);
return days>=(maxDays||7);
}catch(e){ return true; }
}
async function pushSitemap(){
try{
/* F4 owner-only: antes QUALQUER visitante publicava e o primeiro levava a
   chave do editable (first-writer-wins = squat: dono nunca mais atualizava).
   Agora só publica na sessão do dono (dono.js carregado → window._isOwner).
   Chave pré-criada: o dono pode colar o editKey em
   localStorage.ZUN_SITEMAP_EDITKEY (vale p/ todo mês); sem ela, a chave nasce
   no 1º push e vive no sessionStorage (aba). O nome gira por mês, então uma
   chave perdida só afeta o mês corrente. */
try{ if(!window._isOwner) return; }catch(e){ return; }
if(typeof root==="undefined"||!root.uploadPlugin||!root.uploadPlugin.editable||!root.uploadPlugin.editable.get) return;
var name=sitemapName();
var cur=""; try{ cur=await root.uploadPlugin.editable.get(name)||""; }catch(e){ cur=""; }
if(cur && !sitemapStale(cur,7)) return;
var nicks=collectNicks();
if(!cur && nicks.length<2) return;
var all=sitemapMerge(cur,nicks);
if(!all.length) return;
var res=null;
try{
var key=null, preset="";
try{ preset=String(localStorage.getItem("ZUN_SITEMAP_EDITKEY")||""); }catch(eP){}
try{ key=sessionStorage.getItem("zunzumSitemapKey:"+name)||""; }catch(eK){ key=""; }
if(!key && preset){ key=preset; }
if(!key){ try{ key=localStorage.getItem("zunzumSitemapKey:"+name)||""; if(key&&sessionStorage.getItem("zunzumSitemapKey:"+name)!==key){ try{ sessionStorage.setItem("zunzumSitemapKey:"+name,key); }catch(eM){} try{ localStorage.removeItem("zunzumSitemapKey:"+name); }catch(eM2){} } }catch(e2){} }
res=await root.uploadPlugin.editable.set(name, sitemapXml(all), key?{editKey:key}:undefined);
}catch(e3){ return; }
if(res&&res.error) return;
/* editKey = senha de escrita do sitemap: sessionStorage (aba), sem persistir
   em disco — roubo via XSS não sobrevive ao fechar a aba. */
if(res&&res.editKey){ try{ sessionStorage.setItem("zunzumSitemapKey:"+name,res.editKey); }catch(e4){} try{ localStorage.removeItem("zunzumSitemapKey:"+name); }catch(e44){} }
try{ localStorage.setItem("zunzumSitemapAt:"+name, String(Date.now())); }catch(e5){}
}catch(e9){}
}
function indexBox(){
try{
var box=document.getElementById("seoBox");
if(!box||document.getElementById("zzIndex")) return;
var d=document.createElement("div"); d.id="zzIndex"; d.className="box";
var h=document.createElement("h3"); h.textContent="perfis no zunzum"; d.appendChild(h);
var list=document.createElement("div"); list.id="zzIndexList"; list.className="meta"; list.style.lineHeight="2";
d.appendChild(list);
var sm=document.createElement("div"); sm.className="meta";
var a=document.createElement("a"); a.href=sitemapUrl(); a.textContent="sitemap.xml"; a.title="mapa do site (feed, idiomas e perfis)";
sm.appendChild(a); d.appendChild(sm);
box.appendChild(d);
refreshIndex();
}catch(e){}
}
function refreshIndex(){
try{
var list=document.getElementById("zzIndexList");
if(!list) return;
var nicks=collectNicks().slice(0,30);
list.innerHTML="";
if(!nicks.length){ list.textContent="..."; return; }
var b=baseUrl();
nicks.forEach(function(n,ix){
if(ix>0) list.appendChild(document.createTextNode(" · "));
var a=document.createElement("a"); a.href=b+"?perfil="+n; a.textContent="@"+n;
list.appendChild(a);
});
}catch(e){}
}
function init(){
canon(); hreflang(); sitemapLink(); metaHead(); sync(); enSeo(); langBtn(); indexBox();
var src=document.getElementById("feedCtn");
if(src&&window.MutationObserver){ try{ new MutationObserver(function(){ syncSoon(); }).observe(src,{childList:true,subtree:true}); }catch(e){} }
setInterval(sync,15000);
setInterval(refreshIndex,60000);
setTimeout(function(){ try{ pushSitemap(); }catch(e){} },20000);
setInterval(function(){ try{ pushSitemap(); }catch(e){} },6*3600*1000);
}
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init); else init();
})();
