/* zunperfil — lista de bloqueados + busca por nick + estilo do nick (cor/fonte/30 efeitos) */
(function(){
  function $(id){ return document.getElementById(id); }
  function esc(s){ let d = document.createElement("div"); d.textContent = String(s||""); return d.innerHTML; }
  function accLower(){ try{ return me ? String(me.nick).toLowerCase() : ""; }catch(e){ return ""; } }
  function normN(n){ return String(n||"").replace(/^@/,"").toLowerCase(); }

  // ---------- CSS ----------
  if(!$("zunperfilCss")){
    let st = document.createElement("style");
    st.id = "zunperfilCss";
    st.textContent = "#userSearchModal{position:fixed;inset:0;background:rgba(20,40,70,.55);display:flex;align-items:flex-start;justify-content:center;padding:8vh 12px;z-index:80}#userSearchCard{background:#fff;border-radius:12px;padding:12px;max-width:480px;width:100%;max-height:76vh;overflow-y:auto;text-align:left;box-shadow:0 8px 30px #0006}#userSearchList .urow{display:flex;gap:8px;align-items:center;border-top:1px dotted #b6c9db;padding:6px 0;font-size:13px}#userSearchList .uav{width:28px;height:28px;border-radius:50%;background:#6aa5d7;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;overflow:hidden;flex:none}#userSearchList .uav img{width:100%;height:100%;object-fit:cover}#userSearchList .unick{font-weight:bold;cursor:pointer}#zBlockList .brow{display:flex;gap:6px;align-items:center;border-top:1px dotted #b6c9db;padding:5px 0;font-size:13px}#zNickPrev{font-size:22px;font-weight:bold;padding:8px;border:1px dashed #b6c9db;border-radius:8px;margin:6px 0;background:#f6faff;text-align:center;word-break:break-all}.zsw{width:22px;height:22px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px #b6c9db;cursor:pointer;padding:0}.zsw.on{box-shadow:0 0 0 2px #33507a}";
    try{ document.head.appendChild(st); }catch(e){}
  }

  // ---------- boot: busca estilo do próprio nick se sessão antiga não tem ----------
  setTimeout(async ()=>{
    try{
      if(!me || me.ns!==undefined) return;
      let r = JSON.parse(await crpc("profileGet", me.nick));
      if(r && r.ok){
        me.ns = r.ns||null;
        try{ if(typeof setSession==="function") setSession(me); else localStorage.setItem("orkutSession", JSON.stringify(me)); }catch(e){}
        try{ znickCache[me.nick.toLowerCase()] = me.ns||null; }catch(e){}
        try{ zNickRepaintAll(); }catch(e){}
        try{ if(typeof paintZNickModal==="function") paintZNickModal(); }catch(e){}
      }
    }catch(e){}
  }, 2500);

  // ---------- modal de busca por nick ----------
  let modal = null, inp = null, listEl = null, statusEl = null, timer = null;
  function buildModal(){
    if(modal && modal.isConnected) return modal;
    modal = document.createElement("div");
    modal.id = "userSearchModal";
    modal.hidden = true;
    modal.innerHTML = '<div id="userSearchCard"><div style="display:flex;gap:6px;align-items:center"><b>🔍 buscar gente por nick</b><button id="userSearchCloseBtn" style="margin-left:auto">x</button></div><div class="meta">digite parte do nick e clique num perfil p/ ver, bloquear ou desbloquear.</div><div style="display:flex;gap:6px;margin:8px 0"><input id="userSearchInput" placeholder="@nick..." maxlength="20" style="flex:1"><button id="userSearchGoBtn">buscar</button></div><div id="userSearchStatus" class="meta"></div><div id="userSearchList"></div></div>';
    document.body.appendChild(modal);
    inp = modal.querySelector("#userSearchInput");
    listEl = modal.querySelector("#userSearchList");
    statusEl = modal.querySelector("#userSearchStatus");
    modal.querySelector("#userSearchCloseBtn").onclick = ()=>{ modal.hidden = true; };
    modal.addEventListener("click", (e)=>{ if(e.target===modal) modal.hidden = true; });
    modal.querySelector("#userSearchGoBtn").onclick = ()=>doSearch();
    inp.addEventListener("input", ()=>{
      clearTimeout(timer);
      timer = setTimeout(doSearch, 350);
    });
    inp.addEventListener("keydown", (e)=>{ if(e.key==="Enter") doSearch(); if(e.key==="Escape") modal.hidden = true; });
    return modal;
  }
  function openUserSearch(prefill){
    buildModal();
    modal.hidden = false;
    try{ zNickNoteProfile && null; }catch(e){}
    if(typeof prefill==="string" && prefill) inp.value = prefill;
    setTimeout(()=>{ try{ inp.focus(); inp.select(); }catch(e){} }, 50);
    if(inp.value.trim()) doSearch();
    else { statusEl.textContent = "digite 2+ letras do nick."; listEl.innerHTML = ""; }
  }
  window.openUserSearch = openUserSearch;

  async function doSearch(){
    buildModal();
    let q = String(inp.value||"").replace(/^@/,"").trim().slice(0,20);
    listEl.innerHTML = "";
    if(q.length<2){ statusEl.textContent = "digite 2+ letras do nick."; return; }
    statusEl.innerHTML = '<span class="spin"></span> buscando...';
    try{
      let r = JSON.parse(await rpc("userSearch", JSON.stringify({q})));
      if(!r.ok){
        statusEl.textContent = r.err==="rate" ? "devagar, tente de novo em segundos." : "erro na busca.";
        return;
      }
      let arr = r.users||[];
      try{
        let mp = {};
        arr.forEach(u=>{ if(u && u.nick) mp[String(u.nick).toLowerCase()] = u.ns||null; });
        Object.keys(mp).forEach(k=>{ znickCache[k] = mp[k]; });
      }catch(e){}
      if(!arr.length){ statusEl.textContent = 'nenhum nick com "'+q+'". confira a grafia.'; return; }
      statusEl.textContent = arr.length+" encontrado(s):";
      arr.forEach(u=>renderUserRow(u));
      try{ zNickRepaintAll(); }catch(e){}
    }catch(e){ statusEl.textContent = "sem conexão."; }
  }
  function renderUserRow(u){
    let row = document.createElement("div");
    row.className = "urow";
    let av = document.createElement("span");
    av.className = "uav";
    if(u.avatar){
      let im = document.createElement("img");
      im.src = u.avatar; im.loading = "lazy"; im.referrerPolicy = "no-referrer";
      im.onerror = ()=>{ try{ im.remove(); }catch(e){} av.textContent = String(u.nick||"?").slice(0,1).toUpperCase(); };
      av.appendChild(im);
    } else av.textContent = String(u.nick||"?").slice(0,1).toUpperCase();
    row.appendChild(av);
    let nm = document.createElement("span");
    nm.className = "unick chatname";
    nm.textContent = "@"+u.nick;
    nm.title = "ver perfil @"+u.nick;
    try{ paintZNick(nm, u.nick, u.ns||null); }catch(e){}
    nm.onclick = ()=>{ try{ modal.hidden = true; }catch(e){} try{ openProfile(u.nick); }catch(e){} };
    row.appendChild(nm);
    let sp = document.createElement("span");
    sp.style.flex = "1";
    row.appendChild(sp);
    let ver = document.createElement("button");
    ver.textContent = "ver perfil";
    ver.onclick = ()=>{ try{ modal.hidden = true; }catch(e){} try{ openProfile(u.nick); }catch(e){} };
    row.appendChild(ver);
    if(me && String(u.nick).toLowerCase()!==String(me.nick).toLowerCase()){
      let bl = document.createElement("button");
      function paintBl(){
        let b = false;
        try{ b = zunBlocked(u.nick); }catch(e){}
        bl.textContent = b ? "desbloquear" : "bloquear";
      }
      paintBl();
      bl.onclick = ()=>{
        try{
          toggleZunList("zunzumBlockList", u.nick);
          paintBl();
          try{ paintProfMod(); }catch(e){}
          try{ refreshBlockedUI(); }catch(e){}
          try{ loadFeed(); loadPub(); loadPriv(); }catch(e){}
        }catch(e){}
      };
      row.appendChild(bl);
    }
    listEl.appendChild(row);
  }

  // ---------- lista de bloqueados ----------
  function getBlocked(){ try{ return zunGetList("zunzumBlockList"); }catch(e){ return []; } }
  window.zunRefreshBlocked = function(){ try{ refreshBlockedUI(); }catch(e){} };
  function refreshBlockedUI(){
    try{
      let box = $("zBlockList");
      if(box) paintBlockedBox(box);
      let cnt = $("zBlockCount");
      if(cnt) cnt.textContent = String(getBlocked().length);
      let side = $("zSideBlockCount");
      if(side) side.textContent = getBlocked().length ? " ("+getBlocked().length+")" : "";
    }catch(e){}
  }
  function paintBlockedBox(box){
    box.innerHTML = "";
    let arr = getBlocked();
    if(!arr.length){
      let e = document.createElement("div");
      e.className = "meta";
      e.textContent = "ninguém bloqueado. bloqueados somem do feed e dos chats p/ você.";
      box.appendChild(e);
      return;
    }
    arr.slice().sort().forEach(nick=>{
      let row = document.createElement("div");
      row.className = "brow";
      let nm = document.createElement("span");
      nm.className = "chatname";
      nm.textContent = "@"+nick;
      nm.title = "ver perfil @"+nick;
      try{ paintZNick(nm, nick); }catch(e){}
      nm.style.cursor = "pointer";
      nm.onclick = ()=>openProfile(nick);
      row.appendChild(nm);
      let sp = document.createElement("span");
      sp.style.flex = "1";
      row.appendChild(sp);
      let ver = document.createElement("button");
      ver.textContent = "ver";
      ver.title = "ver perfil";
      ver.onclick = ()=>openProfile(nick);
      row.appendChild(ver);
      let un = document.createElement("button");
      un.textContent = "desbloquear";
      un.onclick = ()=>{
        if(!confirm("Desbloquear @"+nick+"? posts e msgs dele(a) voltam a aparecer.")) return;
        toggleZunList("zunzumBlockList", nick);
        try{ paintProfMod(); }catch(e){}
        refreshBlockedUI();
        try{ loadFeed(); loadPub(); loadPriv(); }catch(e){}
      };
      row.appendChild(un);
      box.appendChild(row);
    });
    try{
      let ns = arr.filter(n=>znickCache[n]===undefined);
      if(ns.length) ensureZNickStyles(ns);
    }catch(e){}
  }

  // ---------- editor de nick (cor + fonte + 30 efeitos) ----------
  function curNickStyle(){
    try{
      if(me && me.ns && typeof me.ns==="object") return {c:me.ns.c||"", f:me.ns.f||"", fx:me.ns.fx||0};
    }catch(e){}
    return {c:"", f:"", fx:0};
  }
  function paintNickEditor(box, r){
    let wrap = document.createElement("div");
    wrap.id = "zNickBox";
    wrap.style.marginTop = "8px";
    let h = document.createElement("div");
    h.innerHTML = "<b>🎨 seu nick</b> — cor, fonte e efeito (todos veem)";
    wrap.appendChild(h);
    let prev = document.createElement("div");
    prev.id = "zNickPrev";
    let prevTx = document.createElement("span");
    prevTx.id = "zNickPrevText";
    prevTx.textContent = "@"+(me?me.nick:(r?r.nick:"voce"));
    prev.appendChild(prevTx);
    wrap.appendChild(prev);
    let init = curNickStyle();
    try{
      if(r && r.ns){ init = {c:r.ns.c||"", f:r.ns.f||"", fx:r.ns.fx||0}; }
    }catch(e){}
    // cor
    let rowC = document.createElement("div");
    rowC.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0";
    let lbC = document.createElement("span"); lbC.className = "meta"; lbC.textContent = "cor:"; rowC.appendChild(lbC);
    let col = document.createElement("input");
    col.type = "color";
    col.value = /^#[0-9a-fA-F]{6}$/.test(init.c) ? init.c : "#33507a";
    col.style.width = "34px";
    rowC.appendChild(col);
    (ZNICK_COLORS||[]).forEach(c=>{
      let b = document.createElement("button");
      b.className = "zsw"; b.title = c; b.style.background = c;
      if((init.c||"").toLowerCase()===c) b.classList.add("on");
      b.onclick = ()=>{ col.value = c; rowC.querySelectorAll(".zsw").forEach(x=>x.classList.remove("on")); b.classList.add("on"); preview(); };
      rowC.appendChild(b);
    });
    let noC = document.createElement("button");
    noC.textContent = "sem cor";
    noC.title = "volta p/ cor padrão do site";
    noC.onclick = ()=>{ col.value = "#33507a"; col.dataset.none = "1"; rowC.querySelectorAll(".zsw").forEach(x=>x.classList.remove("on")); preview(); };
    col.oninput = ()=>{ delete col.dataset.none; rowC.querySelectorAll(".zsw").forEach(x=>x.classList.toggle("on", x.title.toLowerCase()===(col.value||"").toLowerCase())); preview(); };
    rowC.appendChild(noC);
    wrap.appendChild(rowC);
    // fonte + efeito
    let rowF = document.createElement("div");
    rowF.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0";
    let lbF = document.createElement("span"); lbF.className = "meta"; lbF.textContent = "fonte:"; rowF.appendChild(lbF);
    let fsel = document.createElement("select");
    fsel.style.width = "auto";
    (ZNICK_FONTS||[""]).forEach(f=>{
      let o = document.createElement("option");
      o.value = f;
      o.textContent = (ZNICK_FONT_LABELS&&ZNICK_FONT_LABELS[f])||(f||"padrão");
      if((init.f||"")===f) o.selected = true;
      fsel.appendChild(o);
    });
    fsel.onchange = preview;
    rowF.appendChild(fsel);
    let lbE = document.createElement("span"); lbE.className = "meta"; lbE.textContent = "efeito:"; rowF.appendChild(lbE);
    let fxsl = document.createElement("select");
    fxsl.style.width = "auto";
    (ZNICK_FX||[{id:0,name:"0 · sem efeito"}]).forEach(o2=>{
      let o = document.createElement("option");
      o.value = o2.id;
      o.textContent = o2.name;
      if((init.fx||0)===o2.id) o.selected = true;
      fxsl.appendChild(o);
    });
    fxsl.onchange = preview;
    rowF.appendChild(fxsl);
    wrap.appendChild(rowF);
    // botoes
    let rowB = document.createElement("div");
    rowB.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0";
    let sv = document.createElement("button");
    sv.textContent = "salvar nick";
    let cl = document.createElement("button");
    cl.textContent = "limpar";
    let msg = document.createElement("span");
    msg.className = "meta";
    rowB.appendChild(sv); rowB.appendChild(cl); rowB.appendChild(msg);
    wrap.appendChild(rowB);
    function draft(){
      let useColor = !col.dataset.none;
      return {c: useColor ? String(col.value||"").toLowerCase() : "", f: String(fsel.value||""), fx: parseInt(fxsl.value||"0",10)||0};
    }
    function preview(){
      let d = draft();
      // "sem cor" ou cor padrão do tema = envia vazio
      let dd = {c:d.c, f:d.f, fx:d.fx};
      if(dd.c==="#33507a" && col.dataset.none!==undefined && false) dd.c = "";
      prevTx.textContent = "@"+(me?me.nick:(r?r.nick:"voce"));
      try{ paintZNick(prevTx, me?me.nick:"x", dd); prevTx.textContent = "@"+(me?me.nick:(r?r.nick:"voce")); }catch(e){}
    }
    // preview inicial: marca "sem cor" se vazio
    if(!init.c){ col.dataset.none = "1"; }
    preview();
    sv.onclick = async ()=>{
      if(!me){ msg.textContent = "entre com nick+senha."; return; }
      let d = draft();
      if(d.c==="#33507a" && col.dataset.none) d.c = "";
      if(d.c==="#33507a"){
        // se usuário não tocou, trata como vazio só se original era vazio
        try{ if(!curNickStyle().c) d.c = ""; }catch(e){}
      }
      msg.textContent = "salvando...";
      sv.disabled = true;
      try{
        let clean = {c:d.c||"", f:d.f||"", fx:d.fx||0};
        let rr = JSON.parse(await rpc("nickStyleSet", JSON.stringify({nick:me.nick, hash:me.hash, ns:(clean.c||clean.f||clean.fx)?clean:null})));
        if(!rr.ok){ msg.textContent = "erro: "+(rr.err||"?"); }
        else{
          me.ns = rr.ns||null;
          try{ if(typeof setSession==="function") setSession(me); else localStorage.setItem("orkutSession", JSON.stringify(me)); }catch(e){}
          try{ znickCache[me.nick.toLowerCase()] = me.ns||null; }catch(e){}
          try{ cInv("profileGet"); }catch(e){}
          try{ zNickRepaintAll(); }catch(e){}
          try{ paintZNick(prevTx, me.nick, me.ns||null); prevTx.textContent = "@"+me.nick; }catch(e){}
          try{ paintZNick(profNick, me.nick, me.ns||null); profNick.textContent = "@"+me.nick; }catch(e){}
          try{ loadFeed(true); loadPub(true); }catch(e){}
          msg.textContent = me.ns ? "nick salvo! ✨" : "nick limpo (padrão).";
        }
      }catch(e){ msg.textContent = "sem conexão."; }
      sv.disabled = false;
    };
    cl.onclick = async ()=>{
      if(!me) return;
      if(!confirm("Limpar cor, fonte e efeito do seu nick?")) return;
      msg.textContent = "limpando...";
      try{
        let rr = JSON.parse(await rpc("nickStyleSet", JSON.stringify({nick:me.nick, hash:me.hash, ns:null})));
        if(rr.ok){
          me.ns = null;
          try{ if(typeof setSession==="function") setSession(me); else localStorage.setItem("orkutSession", JSON.stringify(me)); }catch(e){}
          try{ znickCache[me.nick.toLowerCase()] = null; }catch(e){}
          try{ cInv("profileGet"); }catch(e){}
          col.value = "#33507a"; col.dataset.none = "1";
          fsel.value = ""; fxsl.value = "0";
          rowC.querySelectorAll(".zsw").forEach(x=>x.classList.remove("on"));
          preview();
          try{ zNickRepaintAll(); }catch(e){}
          try{ paintZNick(profNick, me.nick, null); profNick.textContent = "@"+me.nick; }catch(e){}
          msg.textContent = "limpo!";
        } else msg.textContent = "erro";
      }catch(e){ msg.textContent = "sem conexão."; }
    };
    box.appendChild(wrap);
  }

  // ---------- injeta seções no "seu perfil" ----------
  let origPaintProfOwner = null;
  function hookOwner(){
    try{
      if(typeof paintProfOwner!=="function" || origPaintProfOwner) return;
      origPaintProfOwner = paintProfOwner;
      paintProfOwner = function(r){
        origPaintProfOwner(r);
        try{
          let box = $("profOwnerBox");
          if(!box || box.hidden) return;
          // evita duplicar
          if(!$("zNickBox")) paintNickEditor(box, r);
          // bloco bloqueados
          if(!$("zBlockWrap")){
            let w = document.createElement("div");
            w.id = "zBlockWrap";
            w.style.marginTop = "8px";
            w.innerHTML = "<div><b>🚫 bloqueados (<span id=\"zBlockCount\">0</span>)</b> — some do feed e dos chats p/ você. <button id=\"zBlockSearchBtn\" title=\"buscar gente por nick\">🔍 buscar gente</button></div><div id=\"zBlockList\" style=\"margin-top:4px\"></div><div style=\"margin-top:4px\"><button id=\"zBlockClearBtn\">limpar todos</button> <span class=\"meta\">desbloquear faz voltar a aparecer</span></div>";
            box.appendChild(w);
            $("zBlockSearchBtn").onclick = ()=>openUserSearch("");
            $("zBlockClearBtn").onclick = ()=>{
              let a = getBlocked();
              if(!a.length) return;
              if(!confirm("Desbloquear todo mundo ("+a.length+")?")) return;
              try{ zunSetList("zunzumBlockList", []); }catch(e){}
              try{ paintProfMod(); }catch(e){}
              refreshBlockedUI();
              try{ loadFeed(); loadPub(); loadPriv(); }catch(e){}
            };
          }
          refreshBlockedUI();
        }catch(e){}
      };
    }catch(e){}
  }
  hookOwner();
  // tenta de novo caso app.js carregue depois
  let tries = 0;
  let iv = setInterval(()=>{
    tries++;
    hookOwner();
    try{
      // botão buscar no modal de perfil (p/ todos)
      if($("profCard") && !$("profSearchBtn")){
        let btn = document.createElement("button");
        btn.id = "profSearchBtn";
        btn.textContent = "🔍 buscar gente";
        btn.title = "achar usuário por nick";
        btn.onclick = ()=>openUserSearch("");
        try{ $("profCloseBtn").before(btn); }catch(e){ $("profCard").appendChild(btn); }
      }
    }catch(e){}
    try{
      // atalhos na lateral (logado)
      let ab = $("authBox");
      if(ab && me && !$("zSideBtns")){
        let d = document.createElement("div");
        d.id = "zSideBtns";
        d.style.marginTop = "6px";
        d.style.display = "flex";
        d.style.gap = "6px";
        d.style.flexWrap = "wrap";
        let b1 = document.createElement("button");
        b1.textContent = "🔍 buscar gente";
        b1.onclick = ()=>openUserSearch("");
        let b2 = document.createElement("button");
        b2.innerHTML = '🚫 bloqueados<span id="zSideBlockCount"></span>';
        b2.title = "ver lista no seu perfil";
        b2.onclick = ()=>{ try{ openProfile(me.nick); }catch(e){} };
        d.appendChild(b1); d.appendChild(b2);
        ab.appendChild(d);
        refreshBlockedUI();
      } else if(ab && !me && $("zSideBtns")){
        try{ $("zSideBtns").remove(); }catch(e){}
      }
    }catch(e){}
    if(tries>40) clearInterval(iv);
  }, 1000);

  // atualiza lista quando bloquear/desbloquear pelo modal de perfil
  try{
    let pb = $("profBlockBtn");
    if(pb && !pb.dataset.zHook){
      pb.dataset.zHook = "1";
      let old = pb.onclick;
      pb.onclick = function(ev){
        try{ if(typeof old==="function") old.call(pb, ev); }catch(e){}
        setTimeout(()=>{ try{ refreshBlockedUI(); }catch(e){} }, 200);
      };
    }
  }catch(e){}
  // esc global p/ fechar busca
  document.addEventListener("keydown", (e)=>{
    try{ if(e.key==="Escape" && modal && !modal.hidden) modal.hidden = true; }catch(e2){}
  });
})();
