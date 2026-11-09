/* seo-head.js — cabeçalho de descoberta SÓ p/ o espelho (Neocities/GitHub).
   Espelho-antes-de-tudo: o index.html só injeta este arquivo fora do
   perchance.org (loader condicional). No Perchance o $meta.dynamic cuida de
   title/desc/social-card por URL — aqui NUNCA roda lá (tag duplicada
   quebraria os cards dinâmicos).
   Faz, sem rede e sem depender de app.js/i18n/seo.js:
   - document.title + <html lang> (pt/en/es via ?lang=, perfil/sala p/ a aba)
   - meta description/keywords/robots + canonical + hreflang (auto-canônico)
   - Open Graph + Twitter card (imagem da abelha, URL do próprio espelho)
   - JSON-LD WebSite (ids ldMPT/ldMEN/ldMES; pula EN/ES se o seo.js já pôs)
   Limite honesto: scraper de rede social NÃO roda JS — o card do link no
   espelho é sempre genérico (ver NEOCITIES.md §6). O title por perfil/sala
   vale p/ aba/favorito, não p/ preview de link. */
(function(){
"use strict";
try{
  var IMG = "https://zunzum.neocities.org/src/img/abelhinha-capa.png";
  var T = {
    pt: { lang:"pt-BR", title:"zunzum \uD83D\uDC1D — a rede da abelhinha: orkut nostálgico, rede anônima anos 2000",
      desc:"Zunzum, a rede da abelhinha \uD83D\uDC1D: desabafe e fale da sua vida sem mostrar o rosto \u2014 feed livre, depoimentos e chat an\u00F4nimo estilo Orkut 2000.",
      kw:"abelhinha, abelha, site da abelhinha, orkut, nostalgia, anos 2000, rede social anonima, desabafo anonimo, falar da vida, comunidades, depoimentos, scraps, bate-papo, forum retro, msn, bate-papo uol, chat anonimo brasil",
      loc:"pt_BR" },
    en: { lang:"en", title:"zunzum \uD83D\uDC1D — the little-bee network: nostalgic orkut-style anonymous chat, 2000s vibe",
      desc:"Zunzum, the little-bee \uD83D\uDC1D network: vent and talk about your life faceless \u2014 free feed, testimonials and anonymous Orkut-style 2000s chat.",
      kw:"little-bee, bee social network, orkut, nostalgia, 2000s, anonymous social network, anonymous venting, communities, testimonials, scraps, chat, retro forum",
      loc:"en_US" },
    es: { lang:"es", title:"zunzum \uD83D\uDC1D — la red de la abejita: an\u00F3nima nost\u00E1lgica estilo orkut, a\u00F1os 2000",
      desc:"Zunzum, la red de la abejita \uD83D\uDC1D: desah\u00F3gate y habla de tu vida sin mostrar la cara \u2014 feed libre, testimonios y chat an\u00F3nimo estilo Orkut 2000.",
      kw:"abejita, red de la abejita, orkut, nostalgia, a\u00F1os 2000, red social an\u00F3nima, comunidades, testimonios, scraps, chat, foro retro",
      loc:"es_ES" }
  };
  function q(n){ try{ return new URLSearchParams(location.search).get(n) || ""; }catch(e){ return ""; } }
  var lg = String(q("lang") || "").toLowerCase().slice(0,2);
  if(lg !== "en" && lg !== "es"){
    try{ lg = String(localStorage.getItem("zunzumLang") || "").toLowerCase().slice(0,2); }catch(e){}
  }
  var L = (lg === "en") ? T.en : (lg === "es" ? T.es : T.pt);
  var langKey = (lg === "en") ? "en" : (lg === "es" ? "es" : "pt");

  /* URL canônica do espelho: origem+caminho (sem index.html no fim). */
  var origin = "";
  try{ origin = location.origin || (location.protocol + "//" + location.host); }catch(e){}
  var httpOrigin = /^https?:\/\//.test(origin);
  var path = "/";
  try{ path = String(location.pathname || "/").replace(/index\.html?$/i, "") || "/"; }catch(e){}
  var self = origin + path;
  function langUrl(k){ return self + (k === "pt" ? "" : "?lang=" + k); }

  /* Título da aba: perfil/sala/convite quando a URL traz (igual ao dynamic). */
  var tabTitle = L.title, tabDesc = L.desc;
  try{
    var okN = function(s){ return /^[a-z0-9-]{2,20}$/.test(s); };
    var nick = String(q("perfil") || "").replace(/^@/, "").toLowerCase().slice(0,20);
    var invite = false;
    if(!okN(nick)){
      nick = String(q("convite") || q("ref") || q("c") || "").replace(/^@/, "").toLowerCase().slice(0,20);
      if(okN(nick)) invite = true;
    }
    if(okN(nick)){
      if(langKey === "en"){ tabTitle = invite ? "@" + nick + " invited you to zunzum" : "@" + nick + " on zunzum"; }
      else if(langKey === "es"){ tabTitle = invite ? "@" + nick + " te invit\u00F3 a zunzum" : "@" + nick + " en zunzum"; }
      else { tabTitle = invite ? "@" + nick + " te chamou pro zunzum" : "@" + nick + " no zunzum"; }
    } else {
      var sala = String(q("sala") || "").toLowerCase().slice(0,20);
      if(okN(sala)){
        tabTitle = (langKey === "en") ? "#" + sala + " on zunzum"
          : (langKey === "es") ? "#" + sala + " en zunzum" : "#" + sala + " no zunzum";
      }
    }
  }catch(e){}
  try{ document.title = tabTitle; }catch(e){}
  try{ document.documentElement.lang = L.lang; }catch(e){}

  function setMeta(sel, val){
    try{
      var m = document.querySelector(sel);
      if(!m){
        m = document.createElement("meta");
        var bn = sel.match(/name="([^"]+)"/), bp = sel.match(/property="([^"]+)"/);
        if(bn) m.name = bn[1]; else if(bp) m.setAttribute("property", bp[1]); else return;
        document.head.appendChild(m);
      }
      m.setAttribute("content", val);
    }catch(e){}
  }
  /* Só preenche o que está ausente: se o seo.js (ou outro) já pôs, não briga. */
  function setMetaNew(sel, val){ try{ if(!document.querySelector(sel)) setMeta(sel, val); }catch(e){} }
  setMetaNew('meta[name="description"]', tabDesc);
  setMetaNew('meta[name="keywords"]', L.kw);
  setMetaNew('meta[name="robots"]', "index,follow");
  setMetaNew('meta[property="og:type"]', "website");
  setMetaNew('meta[property="og:site_name"]', "zunzum");
  setMetaNew('meta[property="og:title"]', tabTitle);
  setMetaNew('meta[property="og:description"]', tabDesc);
  if(httpOrigin) setMetaNew('meta[property="og:url"]', self + location.search);
  setMetaNew('meta[property="og:image"]', IMG);
  setMetaNew('meta[property="og:locale"]', L.loc);
  setMetaNew('meta[name="twitter:card"]', "summary_large_image");
  setMetaNew('meta[name="twitter:title"]', tabTitle);
  setMetaNew('meta[name="twitter:description"]', tabDesc);
  setMetaNew('meta[name="twitter:image"]', IMG);

  function setLink(rel, href, hl){
    try{
      var sel = 'link[rel="' + rel + '"]' + (hl ? '[hreflang="' + hl + '"]' : "");
      var l = document.querySelector(sel);
      if(!l){ l = document.createElement("link"); l.rel = rel; if(hl) l.hreflang = hl; document.head.appendChild(l); }
      if(!l.href) l.href = href;
    }catch(e){}
  }
  /* Canônico/hreflang auto-referentes (só com origem http real); o seo.js,
     quando presente, re-aponta p/ o perchance.org (comportamento documentado
     — Perchance = casa canônica). */
  if(httpOrigin){
    setLink("canonical", langUrl(langKey));
    [["x-default", langUrl("pt")], ["pt", langUrl("pt")], ["en", langUrl("en")], ["es", langUrl("es")]].forEach(function(p){
      setLink("alternate", p[1], p[0]);
    });
  }

  function ld(id, obj){
    try{
      if(document.getElementById(id)) return;
      var j = document.createElement("script");
      j.id = id; j.type = "application/ld+json";
      j.textContent = JSON.stringify(obj);
      document.head.appendChild(j);
    }catch(e){}
  }
  ld("ldMPT", {"@context":"https://schema.org", "@type":"WebSite", "name":"zunzum",
    "alternateName":T.pt.title, "url":langUrl("pt"), "description":T.pt.desc, "inLanguage":"pt-BR"});
  if(langKey === "en" && !document.getElementById("ldEN"))
    ld("ldMEN", {"@context":"https://schema.org", "@type":"WebSite", "name":"zunzum",
      "alternateName":T.en.title, "url":langUrl("en"), "description":T.en.desc, "inLanguage":"en"});
  if(langKey === "es" && !document.getElementById("ldES"))
    ld("ldMES", {"@context":"https://schema.org", "@type":"WebSite", "name":"zunzum",
      "alternateName":T.es.title, "url":langUrl("es"), "description":T.es.desc, "inLanguage":"es"});
  try{ window.zunSeoHead = { lang: langKey, url: self }; }catch(e){}
}catch(e){}
})();
