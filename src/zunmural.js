/* ============================================================================
 * zunmural.js — mural próprio (substitui o comments-plugin, PROPRIO.md #5).
 *
 * Por que trocar: o mural do plugin é widget de terceiro com nome digitado
 * livremente (fakeável), sem assinatura, e com XSS histórico contido só por
 * guarda pós-render. O mural próprio grava em `mural_msgs` (FASE 12) com
 * autor SEMPRE verificado no servidor (conta | anon com token | bot com
 * claim), renderiza com o fmtChat da casa e atualiza por realtime.
 *
 * Uso (mesmo lugar do plugin, em openProfile):
 *   ZunMural.mount(box, {target, isOwner, onComment, onLoad})
 *     → handle {channel, submit, setNicknameForNextComment,
 *                setAvatarUrlForNextComment, refresh, destroy}
 * ZunMural.checkOwn() — vigia do próprio mural p/ o poller do app.
 * O handle é compatível com o que o bot zunzunzinha espera
 * (window.zzMuralCom): submit(texto, {claim}) p/ o bot, resto igual.
 * onComment/onLoad recebem objetos no MESMO formato do plugin
 * ({id,time,message,user:{nickname},byCurrentUser}) — o bot não mudou.
 *
 * Sem FASE 12 no banco (ou sem Supabase/modo local): cai p/ o plugin
 * sozinho (código antigo movido p/ mountPlugin, com a guarda de sempre).
 * ========================================================================== */
(function () {
  "use strict";
  function _t(x){ try{ return (window.zunzumTr?window.zunzumTr(x):x); }catch(e){ return x; } }
if(typeof window.zunBusy!=="function"){window.zunBusy=function(btn,on,label){try{if(!btn)return "";if(on){btn.disabled=true;try{btn.style.opacity=".45";btn.style.cursor="wait";}catch(e){}try{if(label&&btn.textContent!==undefined&&/^[\u270F\uD83D\uDDD1\u274C\u2716\u2715x]$/.test(btn.textContent.trim())===false&&btn.children.length===0){btn.dataset.zunBusyOld=btn.textContent;btn.textContent=label;}}catch(e){}}else{btn.disabled=false;try{btn.style.opacity="";btn.style.cursor="";}catch(e){}try{if(btn.dataset&&btn.dataset.zunBusyOld){btn.textContent=btn.dataset.zunBusyOld;delete btn.dataset.zunBusyOld;}}catch(e){}}}catch(e){}return "";};};
  var SEQ = 0;
  var REG = {};    // targetLower -> rec ativo
  var SUBBED = {}; // targetLower -> canal realtime ligado
  var _probe = null, _probeAt = 0;

  function sbOk() {
    try { return !!(window.sbConfigured && window.sbConfigured()); } catch (e) { return false; }
  }
  /* FASE 12 aplicada? (probe 1x; negativo expira em 60s p/ tentar de novo) */
  async function available() {
    try {
      if (!sbOk()) return false;
      var now = Date.now();
      if (_probe === true) return true;
      if (_probe === false && now - _probeAt < 60000) return false;
      var c = await window.__sb.client();
      var r = await c.from("mural_msgs").select("id").limit(1);
      if (r && r.error && /relation|table|column|schema|does not exist|404/i
          .test(String((r.error.message || "") + (r.error.code || "")))) {
        _probe = false; _probeAt = now; return false;
      }
      if (r && r.error) { _probe = false; _probeAt = now; return false; }
      _probe = true; _probeAt = now; return true;
    } catch (e) { _probe = false; _probeAt = Date.now(); return false; }
  }
  function slug(t) {
    try {
      return "mural-" + String(t || "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    } catch (e) { return "mural-x"; }
  }
  function myKey() {
    try { if (typeof me !== "undefined" && me && me.nick) return me.nick; } catch (e) {}
    try { if (typeof anonId !== "undefined" && anonId) return anonId; } catch (e) {}
    return "";
  }
  function myLower() { try { return String(myKey() || "").toLowerCase(); } catch (e) { return ""; } }
  function esc(s) {
    try {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    } catch (e) { return ""; }
  }
  function relTime(at) {
    try {
      if (typeof zunRelTime === "function") {
        var r = zunRelTime(at); if (r && r.t) return r;
      }
    } catch (e) {}
    return { t: "", a: "" };
  }
  function fmt(s) {
    try { if (typeof fmtChat === "function") return fmtChat(String(s || "")); } catch (e) {}
    return esc(s);
  }
  /* ---------- realtime: 1 canal por alvo, despacho pelo registro ativo ---------- */
  function ensureSub(t) {
    if (SUBBED[t]) return;
    SUBBED[t] = true;
    (async function () {
      try {
        await window.__sb.chan("mural_msgs", "target=eq." + t, function () {
          try {
            var rec = REG[t];
            if (rec && !rec.dead) rec.reload();
          } catch (e) {}
          return null;
        });
      } catch (e) { SUBBED[t] = false; }
    })();
  }
  function toComment(m, target) {
    var au = String((m && m.f) || "");
    var nick = au.charAt(0) === "@" ? au.slice(1) : au;
    var c = {};
    c.id = (m && m.id) || "";
    c.time = Number((m && m.at) || 0) || Date.now();
    c.message = String((m && m.t) || "");
    c.user = { nickname: nick, visualId: nick, id: nick };
    c.byCurrentUser = String(au || "").toLowerCase().replace(/^@/, "") === myLower();
    return c;
  }
  async function rpcJ(name, obj) {
    var raw = await rpc(name, JSON.stringify(obj || {}));
    return JSON.parse(raw);
  }
  /* ---------- montagem ---------- */
  function mount(box, opts) {
    opts = opts || {};
    var target = String(opts.target || "");
    var tkey = target.toLowerCase();
    var ch = slug(target);
    var rec = {
      seq: ++SEQ, dead: false, box: box, tkey: tkey, target: target,
      isOwner: !!opts.isOwner, onComment: opts.onComment, onLoad: opts.onLoad,
      known: {}, loaded: false, sending: false,
      pendingNick: null, pendingAvatar: null, avatarById: {}, avatarByAu: {},
      com: null // handle do plugin (fallback), quando assumido
    };
    REG[tkey] = rec;
    try {
      box.innerHTML = "";
      var hb = document.createElement("div");
      hb.className = "meta"; hb.textContent = _t("mural de recados");
      box.appendChild(hb);
      var warn = document.createElement("div");
      warn.className = "meta";
      warn.textContent = _t("recados assinados: conta, anon com token ou a zunzunzinha. sem nome digitado — o que está aqui foi postado de verdade por quem mostra.");
      box.appendChild(warn);
      var list = document.createElement("div");
      list.className = "zunm-list";
      list.style.cssText = "max-height:260px;overflow-y:auto;margin-top:4px";
      box.appendChild(list);
      rec.list = list;
      var ld = document.createElement("div");
      ld.className = "meta";
      var sp = document.createElement("span"); sp.className = "spin"; ld.appendChild(sp);
      ld.appendChild(document.createTextNode(" "+_t("carregando mural...")));
      list.appendChild(ld);
      var form = document.createElement("div");
      form.style.cssText = "display:flex;gap:6px;margin-top:6px";
      var ti = document.createElement("textarea");
      ti.rows = 2; ti.maxLength = 500; ti.style.flex = "1";
      ti.placeholder = _t("deixe um recado...");
      var sb2 = document.createElement("button"); sb2.textContent = _t("enviar");
      var sm = document.createElement("span"); sm.className = "meta";
      form.appendChild(ti); form.appendChild(sb2);
      box.appendChild(form); box.appendChild(sm);
      rec.ti = ti; rec.sm = sm; rec.sendBtn = sb2;
      sb2.onclick = function () { post(rec, ti.value, null); };
    } catch (e) {}
    rec.reload = function () { load(rec); };
    (async function () { await init(rec); })();
    var handle = {
      channel: ch, target: target,
      submit: function (text, o2) { return post(rec, text, o2); },
      setNicknameForNextComment: function (n) {
        try { rec.pendingNick = String(n || "").slice(0, 30); } catch (e) {}
        return Promise.resolve(true);
      },
      setAvatarUrlForNextComment: function (u) {
        try {
          rec.pendingAvatar = String(u || "").slice(0, 500);
          if (rec.pendingNick) rec.avatarByAu[rec.pendingNick.toLowerCase()] = rec.pendingAvatar;
        } catch (e) {}
        return Promise.resolve(true);
      },
      refresh: function () { try { rec.reload(); } catch (e) {} },
      destroy: function () {
        try { rec.dead = true; if (REG[tkey] === rec) delete REG[tkey]; } catch (e) {}
      }
    };
    rec.handle = handle;
    return handle;
  }
  async function init(rec) {
    try {
      if (rec.dead) return;
      if (await available()) {
        ensureSub(rec.tkey);
        await load(rec);
      } else {
        mountPlugin(rec);
      }
    } catch (e) {
      if (!rec.dead && rec.list && !rec.loaded) mountPlugin(rec);
    }
  }
  /* ---------- lista ---------- */
  async function load(rec) {
    if (rec.dead || rec.com) return;
    var first = !rec.loaded;
    try {
      var r = await rpcJ("mural_list", { to: rec.target });
      if (rec.dead || rec.com) return;
      if (!r || !r.ok) {
        if (first && rec.list) {
          rec.list.innerHTML = "";
          var e = document.createElement("div");
          e.className = "meta"; e.textContent = _t("sem conexao");
          rec.list.appendChild(e);
        }
        return;
      }
      paint(rec, r.msgs || []);
      rec.loaded = true;
      if (first && typeof rec.onLoad === "function") {
        try { rec.onLoad((r.msgs || []).map(function (m) { return toComment(m); })); } catch (e) {}
      }
      // novidades p/ ping do mural + fila do bot (só o que ainda não vimos)
      try {
        (r.msgs || []).forEach(function (m) {
          if (!m || !m.id || rec.known[m.id]) return;
          rec.known[m.id] = 1;
          if (!first && typeof rec.onComment === "function") {
            try { rec.onComment(toComment(m)); } catch (e) {}
          }
        });
      } catch (e) {}
    } catch (e) {
      if (first && rec.list && !rec.loaded && !rec.dead) {
        try {
          rec.list.innerHTML = "";
          var e2 = document.createElement("div");
          e2.className = "meta"; e2.textContent = _t("sem conexao");
          rec.list.appendChild(e2);
        } catch (e2) {}
      }
    }
  }
  function paint(rec, msgs) {
    try {
      var list = rec.list;
      if (!list) return;
      list.innerHTML = "";
      if (!msgs.length) {
        var e = document.createElement("div");
        e.className = "meta"; e.textContent = _t("nenhum recado ainda. seja o primeiro!");
        list.appendChild(e);
        return;
      }
      (msgs || []).slice(-50).forEach(function (m) {
        try { list.appendChild(row(rec, m)); } catch (e) {}
      });
      try { list.scrollTop = list.scrollHeight; } catch (e) {}
    } catch (e) {}
  }
  function avatarFor(rec, m) {
    try {
      var au = String((m && m.f) || "");
      if (m && m.id && rec.avatarById[m.id]) return rec.avatarById[m.id];
      var al = au.toLowerCase().replace(/^@/, "");
      if (rec.avatarByAu[al]) return rec.avatarByAu[al];
    } catch (e) {}
    return null;
  }
  function row(rec, m) {
    var w = document.createElement("div");
    w.style.cssText = "font-size:13px;padding:4px 0;border-top:1px dotted #b6c9db";
    var h = document.createElement("div");
    h.style.cssText = "display:flex;align-items:center;gap:6px;flex-wrap:wrap";
    var au = String((m && m.f) || "?");
    var isAt = au.charAt(0) === "@";
    var nick = isAt ? au.slice(1) : au;
    var ov = avatarFor(rec, m);
    if (ov) {
      /* embrulho posicionado: o overlay do efeito (FASE 14) precisa de inset:0 */
      var wp = document.createElement("span");
      wp.style.cssText = "width:20px;height:20px;border-radius:50%;flex:none;position:relative;overflow:hidden;background:#6aa5d7";
      var im = document.createElement("img");
      im.src = ov; im.loading = "lazy"; im.referrerPolicy = "no-referrer";
      im.style.cssText = "width:100%;height:100%;border-radius:50%;display:block";
      im.onerror = function () { try { wp.remove(); } catch (e) {} };
      wp.appendChild(im);
      h.appendChild(wp);
      try{ if(isAt && typeof zunAvFxApplyNick==="function") zunAvFxApplyNick(wp, nick); }catch(e){}
    } else if (isAt && typeof miniAv === "function") {
      try { h.appendChild(miniAv(nick)); } catch (e) {}
    } else {
      var av = document.createElement("span");
      av.className = "miniAv";
      av.textContent = String(nick || "?").slice(0, 1).toUpperCase();
      h.appendChild(av);
    }
    var nm = document.createElement("span");
    nm.className = "chatname"; nm.textContent = au;
    if (isAt) {
      nm.title = _t("ver perfil ") + au;
      nm.onclick = (function (n) { return function () { try { openProfile(n); } catch (e) {} }; })(nick);
      try { if (typeof paintZNick === "function") paintZNick(nm, nick); } catch (e) {}
    } else {
      nm.title = _t("recado anônimo assinado (token)");
    }
    h.appendChild(nm);
    try {
      var rt = relTime(Number((m && m.at) || 0));
      if (rt.t) {
        var tm = document.createElement("span");
        tm.className = "ptime"; tm.textContent = rt.t;
        if (rt.a) tm.title = rt.a;
        h.appendChild(tm);
      }
    } catch (e) {}
    // apagar: autor (conta ou anon com token) ou dono do mural
    var mine = String(au || "").toLowerCase().replace(/^@/, "") === myLower();
    if ((mine || rec.isOwner) && m && m.id) {
      var del = document.createElement("button");
      del.title = _t("apagar recado");
      try{ del.setAttribute("aria-label", _t("apagar recado")); }catch(e){}
      del.style.cssText = "font-size:11px;padding:0 5px;margin-left:auto;line-height:1";
      /* ícone SVG em vez de figurinha (emoji varia por aparelho) */
      try{
        var NS = "http://www.w3.org/2000/svg";
        var svg = document.createElementNS(NS, "svg");
        svg.setAttribute("viewBox", "0 0 16 16");
        svg.setAttribute("width", "12"); svg.setAttribute("height", "12");
        svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "1.5");
        svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
        ["M2.5 4h11", "M6.5 4V2.8c0-.4.3-.7.8-.7h1.4c.5 0 .8.3.8.7V4",
         "M4 4l.7 9.1c0 .5.4.9.9.9h4.8c.5 0 .9-.4.9-.9L12 4",
         "M6.8 7v4M9.2 7v4"].forEach(function (d) {
          var p = document.createElementNS(NS, "path");
          p.setAttribute("d", d); svg.appendChild(p);
        });
        del.appendChild(svg);
      }catch(e){ del.textContent = "🗑️"; }
      del.onclick = (function (id) {
        return async function () {
          if (!confirm(_t("apagar este recado?"))) return;
          window.zunBusy(del, true, _t("⏳ apagando..."));
          try {
            var p = { id: id };
            if (!me && typeof anonTokGet === "function") {
              try { p.tok = anonTokGet(myKey()) || ""; } catch (e) {}
            }
            var r = await rpcJ("mural_del", p);
            if (!r || !r.ok) {
              try {
                var msg = (r && r.err === "dono") ? _t("só o autor ou o dono do mural") : _t("erro");
                if (rec.sm) rec.sm.textContent = msg;
              } catch (e) {}
              window.zunBusy(del, false); return;
            }
            try { delete rec.known[id]; } catch (e) {}
            await load(rec);
          } catch (e) { window.zunBusy(del, false); }
        };
      })(m.id);
      h.appendChild(del);
    }
    w.appendChild(h);
    var b = document.createElement("div");
    b.style.cssText = "margin-top:2px;overflow-wrap:anywhere";
    b.innerHTML = fmt((m && m.t) || "");
    w.appendChild(b);
    return w;
  }
  /* ---------- envio ---------- */
  function errText(r) {
    var m = {
      auth: _t("entre com nick+senha p/ recadar"), vazio: _t("escreva algo"),
      noid: _t("perfil não encontrado"), quota: _t("devagar, aguarde..."),
      "anon-taken": _t("esse anon tem dono — girando..."), claim: _t("sem claim válido"),
      dono: _t("sem permissão"), inativa: _t("conta em exclusão"), nick: _t("alvo inválido")
    };
    try { if (r && m[r.err]) return m[r.err]; } catch (e) {}
    return _t("erro: ") + ((r && r.err) || "?");
  }
  async function post(rec, text, o2) {
    if (rec.dead) return { ok: 0 };
    if (rec.com) { try { return await rec.com.submit(text); } catch (e) { return { ok: 0 }; } }
    if (rec.sending) return { ok: 0, err: "env" };
    var t = String(text == null ? (rec.ti ? rec.ti.value : "") : text).trim().slice(0, 500);
    if (!t) { try { if (rec.sm) rec.sm.textContent = _t("escreva algo"); } catch (e) {} return { ok: 0 }; }
    rec.sending = true;
    try { if (rec.sm) rec.sm.textContent = _t("enviando..."); } catch (e) {}
    try {
      var p = { to: rec.target, text: t };
      var claim = o2 && o2.claim;
      if (claim) p.claim = String(claim).slice(0, 40);
      var meNow = null;
      try { meNow = (typeof me !== "undefined" && me) ? me : null; } catch (e) {}
      if (!meNow && !claim) {
        try {
          p.anon = (typeof anonId !== "undefined" && anonId) ? anonId : "";
          p.tok = (typeof anonTokGet === "function") ? (anonTokGet(p.anon) || "") : "";
        } catch (e) {}
      }
      var r = await rpcJ("mural_push", p);
      // anon tomado: gira identidade e tenta 1x (paridade com o feed)
      if (r && !r.ok && r.err === "anon-taken" && !meNow && !claim) {
        try {
          if (typeof renewAnonForce === "function") renewAnonForce();
          p.anon = (typeof anonId !== "undefined" && anonId) ? anonId : "";
          p.tok = "";
          r = await rpcJ("mural_push", p);
        } catch (e) {}
      }
      if (r && r.ok) {
        try {
          if (r.anonTok && p.anon && typeof anonTokSet === "function") anonTokSet(p.anon, r.anonTok);
          if (r.id && rec.pendingAvatar) {
            rec.avatarById[r.id] = rec.pendingAvatar;
            if (rec.pendingNick) rec.avatarByAu[String(rec.pendingNick).toLowerCase()] = rec.pendingAvatar;
          }
          rec.pendingAvatar = null;
          if (rec.ti && (text == null || text === rec.ti.value)) rec.ti.value = "";
          if (rec.sm) rec.sm.textContent = _t("recado postado!");
          try { delete rec.known[r.id]; } catch (e) {}
          await load(rec);
        } catch (e) {}
        return r;
      }
      try { if (rec.sm) rec.sm.textContent = errText(r); } catch (e) {}
      return r || { ok: 0 };
    } catch (e) {
      try { if (rec.sm) rec.sm.textContent = _t("sem conexao"); } catch (e2) {}
      return { ok: 0 };
    } finally {
      rec.sending = false;
      try {
        if (rec.sm && rec.sm.textContent === _t("enviando...")) rec.sm.textContent = "";
      } catch (e) {}
    }
  }
  /* ---------- vigia do próprio mural (notifica recado novo mesmo sem o
        perfil aberto; paridade com checkPendingDepo do app.js) ----------
     O mural montado já avisa via realtime+onComment; aqui vai o backstop:
     1 poller barato a cada 60s (mesmo loop do checkPendingDepo) + recarga
     dos murais abertos (realtime cobre o ao-vivo, isto cobre queda dele).
     Vistos em localStorage (sobrevive reload); 1ª vez semeia em silêncio.
     O ping passa pelo zunMuralPing da casa (mesmo dedup/som/badge). */
  function ownNick(){ try{ if(typeof me!=="undefined"&&me&&me.nick) return me.nick; }catch(e){} return ""; }
  function seenKey(n){ try{ return "zunzumSeenMural_"+String(n||"").toLowerCase(); }catch(e){ return "zunzumSeenMural_"; } }
  function seenGet(n){ try{ var v=JSON.parse(localStorage.getItem(seenKey(n))||"null"); return Array.isArray(v)?v:[]; }catch(e){ return []; } }
  function seenSet(n,a){ try{ localStorage.setItem(seenKey(n), JSON.stringify(a.slice(-200))); }catch(e){} }
  async function checkOwn(){
    try{
      try{ Object.keys(REG).forEach(function(k){ var r=REG[k]; if(r&&!r.dead&&!r.com&&r.reload) r.reload(); }); }catch(e){}
      var nick = ownNick();
      if(!nick) return;
      if(!(await available())) return;
      var seen = seenGet(nick), has = {};
      seen.forEach(function(id){ has[id]=1; });
      var first = false;
      try{ first = localStorage.getItem(seenKey(nick))==null; }catch(e){}
      var r = await rpcJ("mural_list", {to:nick});
      if(!r||!r.ok) return;
      var ch = slug(nick), fresh = [], ids = seen.slice();
      (r.msgs||[]).forEach(function(m){
        if(!m||!m.id) return;
        if(!has[m.id]){ has[m.id]=1; ids.push(m.id); fresh.push(m); }
      });
      seenSet(nick, ids);
      if(first||!fresh.length) return;
      fresh.forEach(function(m){
        try{
          var c = toComment(m);
          if(typeof zunMuralPing==="function") zunMuralPing(ch, nick, c);
          else if(window.ZNotify&&window.ZNotify.bump) window.ZNotify.bump("mural","depo",{title:"💬 recado no seu mural",body:String(c.message||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,80)});
        }catch(e){}
      });
    }catch(e){}
  }
  /* ---------- fallback: plugin antigo (sem FASE 12 / modo local) ---------- */
  function mountPlugin(rec) {
    try {
      var box = rec.box;
      var ch = slug(rec.target);
      box.innerHTML = "";
      var warn = document.createElement("div");
      warn.className = "meta";
      warn.textContent = _t("o nome no mural é digitado livremente e pode ser fake — só depoimentos e DMs são assinados. confira o perfil antes de confiar.");
      box.appendChild(warn);
      var inner = document.createElement("div");
      box.appendChild(inner);
      var mcom = null;
      try {
        mcom = root.commentsPlugin({
          channel: ch, width: "100%", height: "260px",
          /* A3: limpa o texto ANTES de enviar (o render de terceiros entra via
             innerHTML — o scrub pós-render já existe abaixo, isto fecha a
             outra ponta: o que EU mando também não carrega payload). Devolve
             o texto limpo; null SÓ se sobrar vazio de algo que era só ataque. */
          beforeSubmit: function (o) {
            try {
              /* o plugin chama com {inputText} (ver imports/comments-plugin);
                 aceita string crua também, por robustez. */
              var t = String((typeof o === "string") ? o : ((o && o.inputText) || ""));
              var cut = t.replace(/<\s*(script|iframe|object|embed|form|style|link|meta|base|svg|math|frame|frameset|dialog|details|textarea|input|button|select)\b/gi, "&lt;$1")
                .replace(/\son\w+\s*=/gi, " data-zun-")
                .replace(/(href|src|xlink:href|action|formaction|cite|data|background|poster)\s*=\s*(["']?)\s*(javascript|data:text\/html|vbscript|file):/gi, "$1=$2#bloqueado:")
                .replace(/srcdoc\s*=/gi, "data-zun-srcdoc=")
                .replace(/<\s*!--/g, "&lt;!--");
              if (!cut.trim() && t.trim()) return null;
              return cut.slice(0, 2000);
            } catch (e) { return null; }
          },
          onComment: function (c) {
            try { if (typeof rec.onComment === "function") rec.onComment(c); } catch (e) {}
          },
          onLoad: function (cs) {
            try { if (typeof rec.onLoad === "function") rec.onLoad(cs || []); } catch (e) {}
          }
        });
      } catch (e) {}
      try { if (mcom && typeof mcom.submit === "function") rec.com = mcom; } catch (e) {}
      try { inner.innerHTML = mcom || ""; } catch (e) {}
      /* guarda do mural (plugin terceiro entra via innerHTML): remove o que
         plugin nenhum precisa — sem isso comentário malicioso vira stored-XSS. */
      try {
        inner.querySelectorAll("script, iframe, object, embed, link, meta, base, form, style, svg, math, input, button, select, textarea, details, dialog, frame, frameset").forEach(function (el) { try { el.remove(); } catch (e) {} });
        inner.querySelectorAll("*").forEach(function (el) {
          try {
            for (var i = el.attributes.length - 1; i >= 0; i--) {
              var a = el.attributes[i], n = (a.name || "").toLowerCase(), v = String(a.value || "");
              if (n.indexOf("on") === 0) { el.removeAttribute(a.name); continue; }
              if (n === "srcdoc") { el.removeAttribute(a.name); continue; }
              if (n === "srcset" || n === "lowsrc" || n === "dynsrc" || n === "usemap") { el.removeAttribute(a.name); continue; }
              if ((n === "href" || n === "src" || n === "xlink:href" || n === "action" || n === "formaction" || n === "cite" || n === "data" || n === "background" || n === "poster") && /^\s*(javascript|data|vbscript|file):/i.test(v)) { el.removeAttribute(a.name); continue; }
              if (n === "style") {
                var st = v.toLowerCase();
                if (st.indexOf("expression(") >= 0 || st.indexOf("javascript:") >= 0 || st.indexOf("url(") >= 0) el.removeAttribute(a.name);
              }
            }
          } catch (e) {}
        });
        try {
          if (inner._muralObs) try { inner._muralObs.disconnect(); } catch (eMO1) {}
          var t = null;
          var scrub = function () {
            try {
              inner.querySelectorAll("style, svg, math, input, button, select, textarea").forEach(function (el) { try { el.remove(); } catch (eR) {} });
              inner.querySelectorAll("*").forEach(function (el) {
                try {
                  for (var ai = el.attributes.length - 1; ai >= 0; ai--) {
                    var aa = el.attributes[ai], nn = (aa.name || "").toLowerCase();
                    if (nn.indexOf("on") === 0) el.removeAttribute(aa.name);
                    else if (nn === "srcdoc" || nn === "srcset" || nn === "lowsrc" || nn === "dynsrc" || nn === "usemap") el.removeAttribute(aa.name);
                  }
                } catch (eA) {}
              });
            } catch (eS) {}
          };
          inner._muralObs = new MutationObserver(function () {
            try { if (t) return; t = setTimeout(function () { t = null; scrub(); }, 60); } catch (eM) {}
          });
          inner._muralObs.observe(inner, { childList: true, subtree: true });
        } catch (eMO) {}
      } catch (e) {}
      try { if (rec.sm) rec.sm.textContent = ""; } catch (e) {}
    } catch (e) {}
  }
  try {
    window.ZunMural = { mount: mount, available: available, checkOwn: checkOwn };
  } catch (e) {}
})();
