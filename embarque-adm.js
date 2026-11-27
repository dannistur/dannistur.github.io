/* Danni's Tur · listas de embarque por van.
   Usado em dois lugares:
   - Área Danni's (admin.html): tudo, inclusive a senha da Área dos motoristas e "Puxar do app".
   - Área dos motoristas (motorista.html, com window.DT_EMB_MOTORISTA): só as listas; o motorista pode abrir e editar (pôr/tirar gente).
   Uma foto por motorista: tocou, abre a tela de embarque (verde = falta pegar, vermelho = pegou).
   Listas: 📅 Rota da semana e 🎓 FAM (seg a sex, troca o dia com as setas ou deslizando) e 🎬 Cinema.
   Tudo fica guardado no servidor, na ordem da rota. */
(function(){
  "use strict";
  const $ = s => document.querySelector(s);
  const {api, esc, zapLink} = DT;
  const MOT = window.DT_EMB_MOTORISTA || null;      // na Área dos motoristas: {ancora, carregar(), salvar(req)}
  const VANS = [
    {nome: "Tio Daniel", foto: "img/tio-daniel.jpg", fone: "19997781210"},
    {nome: "Tia Joyce",  foto: "img/tia-joyce.jpg",  fone: "19988761202"},
    {nome: "Tio Luiz",   foto: "img/tio-luiz.jpg",   fone: "19997499380"},
    {nome: "Tia Cintia", foto: "img/tia-cintia.jpg", fone: "19981163312"}
  ];
  const DIAS = [["seg","Segunda"],["ter","Terça"],["qua","Quarta"],["qui","Quinta"],["sex","Sexta"]];
  const MODOS = {
    semana: {aba: "📅 Rota da semana", titulo: "Rota da semana", semanal: true,
             dica: "Rota de todo dia, de <b>segunda a sexta</b>. Na tela da lista, as setas ‹ › (ou deslizar o dedo) trocam o dia. Cada dia começa todo verde."},
    fam:    {aba: "🎓 FAM", titulo: "FAM", semanal: true,
             dica: "Turma da <b>FAM</b>, de segunda a sexta. As setas ‹ › trocam o dia; o 🚫 marca quem avisou que não vai."},
    cinema: {aba: "🎬 Cinema", titulo: "Passeio do Cinema · 28/11", semanal: false,
             dica: "Toque na <b>foto do motorista</b> pra abrir a lista do cinema. Verde = falta pegar; pegou, toca e fica <b style=\"color:#d93025\">vermelho</b>."}
  };
  let listas = {semana: {}, fam: {}, cinema: {}}, modo = "semana", editando = null, edDia = "seg", rascunho = {}, familias = [];
  try { const m = localStorage.getItem("dt-emb-modo"); if (MODOS[m]) modo = m; } catch(e){}
  const deServidor = r => ({semana: (r && r.semana) || {}, fam: (r && r.fam) || {}, cinema: (r && r.vans) || {}});

  /* ---------- cartão ---------- */
  const card = document.createElement(MOT ? "section" : "details");
  card.className = "card emb-adm" + (MOT ? " emb-mot-pg" : ""); card.id = "embarque"; if (!MOT) card.open = true;
  card.innerHTML = `
    ${MOT ? "" : `<summary><h3>🚐 Lista de embarque</h3><span id="embResumo">carregando…</span></summary>`}
    <div class="emb-abas" role="tablist">${Object.entries(MODOS).map(([k, m]) => `<button type="button" role="tab" data-m="${k}">${m.aba}</button>`).join("")}</div>
    <p class="dica" id="embDica" style="margin:0"></p>
    <div class="emb-fotos" id="embFotos"></div>
    <div class="emb-ed" id="embEd" hidden>
      <h4 id="embEdTit">Lista</h4>
      <div class="emb-dias" id="embDias"></div>
      <label for="embTxt" class="emb-ajuda">Um nome por linha, <b>na ordem da rota</b>. Depois do traço vai a referência (escola, endereço, irmãos…). Telefone no fim é opcional.<br><i>Ex.: Adriel - na vó, perto da Silvana</i><br>Pra <b>tirar</b> alguém, apague a linha. Pra <b>pôr</b>, escreva numa linha nova.</label>
      <textarea id="embTxt" rows="12" spellcheck="false"></textarea>
      <div class="emb-ed-bts">
        <button class="btn btn-pri" type="button" id="embSalvar">Salvar lista</button>
        <button class="btn btn-sec" type="button" id="embCopia">📋 Copiar este dia pra semana toda</button>
        ${MOT ? "" : `<button class="btn btn-sec" type="button" id="embPuxar">Puxar do app</button>`}
        <button class="btn btn-link" type="button" id="embFechar">Fechar</button>
      </div>
      <p class="msg-err" id="embErr" role="alert"></p>
    </div>
    <p class="ok-msg" id="embOk" role="status"></p>
    ${MOT ? "" : `<div class="emb-mot">
      <b>🔑 Área dos motoristas</b>
      <p class="emb-ajuda" style="margin:0">Daniel, Joyce, Luiz e Cíntia entram em <a href="motorista.html" target="_blank" rel="noopener">⋮ › Área dos motoristas</a> com uma senha só deles. Lá eles veem e editam <b>só as listas</b>, nada do resto da Área Danni's. Entram uma vez e ficam conectados. Trocar a senha desconecta todo mundo.</p>
      <p class="emb-ajuda" id="motStatus" style="margin:0;font-weight:700"></p>
      <div class="emb-mot-linha"><input type="text" id="motSenha" placeholder="Nova senha dos motoristas" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn btn-sec" type="button" id="motSalvar">Salvar senha</button></div>
      <p class="msg-err" id="motErr" role="alert"></p>
    </div>`}`;
  if (MOT) MOT.ancora.appendChild(card); else ($("#aniv") || $("#placar")).after(card);

  const css = document.createElement("style");
  css.textContent = `
    .emb-adm{display:grid;gap:12px;border:2px solid #9fd6b4}
    .emb-mot-pg{border:0;box-shadow:none;background:transparent;padding:0}
    .emb-adm summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none}
    .emb-adm summary::-webkit-details-marker{display:none}
    .emb-adm summary h3{font-size:19px;margin:0}
    .emb-adm summary span{font-size:13.5px;color:var(--tinta-2);font-weight:700;text-align:right}
    .emb-abas{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;background:#f3e8f3;border-radius:14px;padding:4px}
    .emb-abas button{font:800 14px/1.15 var(--f-corpo);border:0;border-radius:11px;padding:10px 4px;background:transparent;color:var(--roxo);cursor:pointer}
    .emb-abas button[aria-selected="true"]{background:#fff;color:var(--roxo);box-shadow:0 2px 0 rgba(0,0,0,.08)}
    .emb-fotos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    @media (max-width:420px){.emb-fotos{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .emb-mot-pg .emb-fotos{gap:18px 12px}
    .emb-tio{display:grid;justify-items:center;gap:6px;text-align:center;min-width:0}
    .emb-foto{position:relative;display:block;width:min(100%,104px);aspect-ratio:1;border-radius:50%;padding:4px;background:#1fa855;box-shadow:0 5px 0 #137a3c;text-decoration:none}
    .emb-mot-pg .emb-foto{width:min(100%,140px)}
    .emb-foto.vazio{background:#c9bcc9;box-shadow:0 5px 0 #a597a5}
    .emb-foto img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;background:#fff}
    .emb-foto:active{transform:translateY(3px);box-shadow:0 2px 0 #137a3c}
    .emb-n{position:absolute;right:-4px;bottom:-2px;min-width:30px;height:30px;padding:0 7px;border-radius:999px;background:#fff;color:#137a3c;border:2px solid #1fa855;font:800 14px/26px var(--f-display);text-align:center}
    .emb-foto.vazio .emb-n{color:#7a6a7a;border-color:#c9bcc9}
    .emb-tio b{font-size:14px;line-height:1.15}
    .emb-mot-pg .emb-tio b{font:800 18px/1.1 var(--f-display)}
    .emb-mini{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
    .emb-mini a,.emb-mini button{font:700 12px var(--f-corpo);border-radius:999px;padding:5px 9px;border:1.5px solid var(--linha);background:#fff;color:var(--tinta);text-decoration:none;cursor:pointer;white-space:nowrap}
    .emb-mot-pg .emb-mini button{font-size:14px;padding:7px 12px}
    .emb-mini a{background:#1fa855;border-color:#1fa855;color:#fff}
    .emb-ed{display:grid;gap:8px;border-top:1px dashed var(--linha);padding-top:12px}
    .emb-mot-pg .emb-ed{background:#fff;border:1px solid var(--linha);border-radius:18px;padding:14px}
    .emb-ed h4{margin:0;font-size:16px}
    .emb-dias{display:flex;gap:6px;flex-wrap:wrap}
    .emb-dias[hidden]{display:none}
    .emb-dias button{font:800 13px var(--f-corpo);border-radius:999px;padding:7px 12px;border:1.5px solid var(--roxo);background:#fff;color:var(--roxo);cursor:pointer}
    .emb-dias button[aria-pressed="true"]{background:var(--roxo);color:#fff}
    .emb-dias small{font-weight:700;opacity:.75}
    .emb-ajuda{font-size:13px;color:var(--tinta-2);line-height:1.4}
    .emb-ed textarea{width:100%;font:16px/1.5 var(--f-corpo);padding:10px 12px;border:1.5px solid var(--linha);border-radius:12px;resize:vertical}
    .emb-ed-bts{display:flex;gap:8px;flex-wrap:wrap}
    .emb-ed-bts [hidden]{display:none}
    .emb-mot{display:grid;gap:8px;border-top:1px dashed var(--linha);padding-top:12px}
    .emb-mot-linha{display:flex;gap:8px;flex-wrap:wrap}
    .emb-mot-linha input{flex:1;min-width:160px;font:16px var(--f-corpo);padding:10px 12px;border:1.5px solid var(--linha);border-radius:12px}`;
  document.head.appendChild(css);

  /* ---------- link da tela de embarque (a lista vai dentro do link, depois do #) ---------- */
  const b64 = obj => { const bytes = new TextEncoder().encode(JSON.stringify(obj)); let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const base = () => new URL("embarque.html", location.href).href;
  const doModo = () => listas[modo] || {};
  const qtd = van => {
    const v = doModo()[van.nome]; if (!v) return 0;
    if (!MODOS[modo].semanal) return (v.l || []).length;
    return new Set(Object.values(v.dias || {}).flat().map(a => a[0] + "|" + a[1])).size;
  };
  function linkDe(van){
    const v = doModo()[van.nome], m = MODOS[modo], suf = MOT ? "&m=1" : "";
    if (!v) return "";
    if (!m.semanal){
      if (!v.l || !v.l.length) return "";
      return base() + "#d=" + b64({t: van.nome, e: m.titulo, l: v.l.map(a => [a[0], a[1] || "", "", a[2] || ""])}) + suf;
    }
    if (!v.dias) return "";
    const k = [], idx = new Map(), d = {};      // cada pessoa uma vez só; cada dia guarda só a posição dela (link mais curto)
    DIAS.forEach(([dia]) => { const l = v.dias[dia]; if (!l || !l.length) return;
      d[dia] = l.map(a => { const ch = a[0] + "|" + (a[1] || "") + "|" + (a[2] || ""); if (!idx.has(ch)){ idx.set(ch, k.length); k.push([a[0], a[1] || "", a[2] || ""]); } return idx.get(ch); }); });
    if (!k.length) return "";
    return base() + "#d=" + b64({t: van.nome, e: m.titulo, k, d}) + suf;
  }

  function desenha(){
    card.querySelectorAll(".emb-abas button").forEach(b => b.setAttribute("aria-selected", b.dataset.m === modo));
    $("#embDica").innerHTML = MODOS[modo].dica + (MOT ? " Pra pôr ou tirar alguém, toque em <b>✏️ Editar</b>." : "");
    if (!MOT){
      const tot = VANS.reduce((t, v) => t + qtd(v), 0), com = VANS.filter(v => qtd(v)).length;
      $("#embResumo").textContent = tot ? `${tot} ${modo === "fam" ? "pessoas" : "crianças"} · ${com} de ${VANS.length} vans` : "nenhuma lista ainda";
    }
    $("#embFotos").innerHTML = VANS.map((v, i) => {
      const n = qtd(v), link = linkDe(v), m = MODOS[modo];
      const msg = `🚐 ${m.titulo} (${v.nome}).\nAbra${m.semanal ? " todo dia: as setas ‹ › trocam o dia" : ""}. Pegou, toque no nome: fica vermelho. Tocou errado? Toque de novo.\n\n${link}`;
      return `<div class="emb-tio">
        <a class="emb-foto${n ? "" : " vazio"}" data-i="${i}" href="${link || "#"}" aria-label="${n ? `Abrir a lista da van ${esc(v.nome)} (${n})` : `Montar a lista da van ${esc(v.nome)}`}">
          <img src="${v.foto}" alt="" loading="lazy"><span class="emb-n">${n || "+"}</span></a>
        <b>${esc(v.nome)}</b>
        <span class="emb-mini">${link && !MOT ? `<a href="${zapLink(v.fone, msg)}" target="_blank" rel="noopener">📲 Mandar</a>` : ""}<button type="button" data-ed="${i}">✏️ ${MOT ? "Editar" : "Lista"}</button></span>
      </div>`;
    }).join("");
  }
  card.querySelectorAll(".emb-abas button").forEach(b => b.onclick = () => {
    modo = b.dataset.m; try { localStorage.setItem("dt-emb-modo", modo); } catch(e){}
    $("#embEd").hidden = true; editando = null; $("#embOk").textContent = ""; desenha();
  });

  /* ---------- editar ---------- */
  const paraTexto = l => (l || []).map(a => [a[0], a[1]].filter(Boolean).join(" - ") + (a[2] ? " - " + a[2] : "")).join("\n");
  function deTexto(t){
    return String(t || "").split(/\r?\n/).map(s => s.replace(/^\s*\d+\s*[-–.)]\s*/, "").trim()).filter(Boolean).map(s => {
      const p = s.split(/\s+[-–—|]\s+|\s*[|]\s*/).map(x => x.trim()).filter(Boolean);
      let tel = "";
      if (p.length > 1 && /^\+?\(?\d[\d()\s.-]{8,}$/.test(p[p.length - 1])) tel = p.pop().replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
      return [p.shift() || "", p.join(" · "), tel];
    }).filter(a => a[0]);
  }
  const semanal = () => MODOS[modo].semanal;
  function desenhaDias(){
    $("#embDias").hidden = !semanal(); $("#embCopia").hidden = !semanal();
    if (!semanal()) return;
    $("#embDias").innerHTML = DIAS.map(([d, nome]) => { const n = deTexto(rascunho[d]).length;
      return `<button type="button" data-d="${d}" aria-pressed="${d === edDia}">${nome.slice(0, 3).toUpperCase()} <small>${n || "–"}</small></button>`; }).join("");
  }
  function abreEditor(i){
    editando = VANS[i]; rascunho = {}; edDia = "seg";
    const v = doModo()[editando.nome] || {};
    if (semanal()) DIAS.forEach(([d]) => rascunho[d] = paraTexto((v.dias || {})[d]));
    $("#embEd").hidden = false; $("#embErr").textContent = ""; $("#embOk").textContent = "";
    $("#embEdTit").textContent = `${MODOS[modo].aba} – van ${editando.nome}`;
    $("#embTxt").value = semanal() ? rascunho.seg : paraTexto(v.l);
    desenhaDias();
    $("#embEd").scrollIntoView({behavior: "smooth", block: "start"}); $("#embTxt").focus({preventScroll: true});
  }
  $("#embTxt").addEventListener("input", () => { if (semanal()){ rascunho[edDia] = $("#embTxt").value; const b = $(`#embDias [data-d="${edDia}"] small`); if (b) b.textContent = deTexto(rascunho[edDia]).length || "–"; } });
  $("#embDias").addEventListener("click", e => { const b = e.target.closest("[data-d]"); if (!b) return; rascunho[edDia] = $("#embTxt").value; edDia = b.dataset.d; $("#embTxt").value = rascunho[edDia] || ""; desenhaDias(); });
  $("#embCopia").onclick = () => {
    rascunho[edDia] = $("#embTxt").value; const nome = DIAS.find(d => d[0] === edDia)[1];
    if (!rascunho[edDia].trim()){ $("#embErr").textContent = `A lista de ${nome} está vazia.`; return; }
    if (!confirm(`Copiar a lista de ${nome} pra todos os dias (segunda a sexta)? O que estiver nos outros dias será trocado.`)) return;
    DIAS.forEach(([d]) => rascunho[d] = rascunho[edDia]); desenhaDias(); $("#embErr").textContent = ""; $("#embOk").textContent = "Copiado pra semana toda. Ajuste os dias que forem diferentes e toque em Salvar.";
  };
  $("#embFotos").addEventListener("click", e => {
    const ed = e.target.closest("[data-ed]"); if (ed){ abreEditor(+ed.dataset.ed); return; }
    const f = e.target.closest(".emb-foto");
    if (f && f.getAttribute("href") === "#"){ e.preventDefault(); abreEditor(+f.dataset.i); }
  });
  $("#embFechar").onclick = () => { $("#embEd").hidden = true; editando = null; };
  if (!MOT) $("#embPuxar").onclick = async () => {
    if (!editando) return;
    const b = $("#embPuxar"), txt = b.textContent; b.disabled = true; b.textContent = "Puxando…"; $("#embErr").textContent = "";
    try {
      let l = [];
      if (modo === "cinema"){
        const r = await api("admin_cinema", {senha: window.__dtSenha});
        l = (r.lista || []).filter(c => c.tio === editando.nome && c.status !== "cancelado")
          .map(c => [c.crianca, [c.escola, c.periodo].filter(Boolean).join(" "), String(c.celular || "").replace(/\D/g, "")]);
      } else {
        familias.filter(f => f.status !== "cancelado").forEach(f => (f.alunos || []).forEach((a, i) => {
          if ((f.vans || [])[i] === editando.nome) l.push([a.nome, [a.escola, a.periodo].filter(Boolean).join(" "), String(f.celular || "").replace(/\D/g, "")]);
        }));
      }
      if (!l.length){ $("#embErr").textContent = modo === "cinema" ? `Não tem inscrito no cinema marcado com a van ${editando.nome}.` : `Nenhum aluno do app está separado pra van ${editando.nome} (em "Vans e resultados").`; }
      else if (!$("#embTxt").value.trim() || confirm(`Trocar o que está escrito pelos ${l.length} do app?`)){
        $("#embTxt").value = paraTexto(l); if (semanal()){ rascunho[edDia] = $("#embTxt").value; desenhaDias(); }
      }
    } catch(e){ $("#embErr").textContent = e.message || "Não consegui puxar agora."; }
    b.disabled = false; b.textContent = txt;
  };
  $("#embSalvar").onclick = async () => {
    if (!editando) return;
    const b = $("#embSalvar"), txt = b.textContent;
    let req, n;
    if (!semanal()){ const l = deTexto($("#embTxt").value); n = l.length; req = {modo, tio: editando.nome, lista: l}; }
    else { rascunho[edDia] = $("#embTxt").value; const dias = {}; DIAS.forEach(([d]) => dias[d] = deTexto(rascunho[d])); n = Object.values(dias).reduce((t, l) => t + l.length, 0); req = {modo, tio: editando.nome, dias}; }
    if (!n && !confirm(`Apagar a lista da van ${editando.nome}?`)) return;
    b.disabled = true; b.textContent = "Salvando…"; $("#embErr").textContent = "";
    try {
      const r = MOT ? await MOT.salvar(req) : await api("admin_embarque_salvar", {senha: window.__dtSenha, ...req});
      listas = deServidor(r); desenha();
      $("#embEd").hidden = true;
      $("#embOk").textContent = n ? `✅ Lista da van ${editando.nome} salva. Toque na foto pra abrir.` : `Lista da van ${editando.nome} apagada.`;
      editando = null;
    } catch(e){ $("#embErr").textContent = e.message || "Não consegui salvar. Confira a internet e tente de novo."; }
    b.disabled = false; b.textContent = txt;
  };

  /* ---------- senha da Área dos motoristas (só na Área Danni's) ---------- */
  const motStatus = tem => { if (!MOT) $("#motStatus").textContent = tem ? "✅ Senha criada. Pra trocar, digite outra e salve." : "⚠️ Ainda sem senha: os motoristas não conseguem entrar. Crie uma abaixo."; };
  if (!MOT) $("#motSalvar").onclick = async () => {
    const nova = $("#motSenha").value.trim(); $("#motErr").textContent = "";
    if (nova.length < 4){ $("#motErr").textContent = "Use pelo menos 4 letras ou números."; return; }
    if (!confirm("Salvar essa senha? Quem estiver conectado na Área dos motoristas vai precisar entrar de novo com ela.")) return;
    const b = $("#motSalvar"); b.disabled = true; b.textContent = "Salvando…";
    try { await api("admin_mot_senha", {senha: window.__dtSenha, nova}); $("#motSenha").value = ""; motStatus(true); $("#embOk").textContent = "✅ Senha dos motoristas salva. Passe pra eles junto com o caminho: ⋮ › Área dos motoristas."; }
    catch(e){ $("#motErr").textContent = e.message || "Não consegui salvar."; }
    b.disabled = false; b.textContent = "Salvar senha";
  };

  /* ---------- carregar ---------- */
  async function carrega(){
    try {
      const r = MOT ? await MOT.carregar() : await api("admin_embarque", {senha: window.__dtSenha});
      listas = deServidor(r); motStatus(!!(r && r.temSenhaMot));
    } catch(e){ if (!MOT) $("#embResumo").textContent = "não consegui carregar"; }
    desenha();
    if (!MOT && /^#embarque\b/.test(location.hash)){ card.open = true; setTimeout(() => card.scrollIntoView({behavior: "smooth", block: "start"}), 150); }
  }
  if (MOT){ MOT.mostrar = dados => { listas = deServidor(dados); desenha(); }; MOT.recarregar = carrega; }
  else {
    let jaCarregou = false;
    window.addEventListener("dt-lista", e => { familias = (e.detail && e.detail.familias) || []; if (!jaCarregou){ jaCarregou = true; carrega(); } });
  }
  desenha();
})();
