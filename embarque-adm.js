/* Danni's Tur · embarque por van (só na Área Danni's).
   Uma foto por motorista: tocou, abre a lista de embarque daquela van (verde = falta pegar, vermelho = pegou).
   Duas listas por motorista: 🎬 Cinema e 📅 Rota da semana (seg a sex, troca o dia com as setas ou deslizando).
   As listas ficam guardadas no servidor (protegidas pela senha), na ordem da rota. */
(function(){
  "use strict";
  const $ = s => document.querySelector(s);
  const {api, esc, zapLink} = DT;
  const VANS = [
    {nome: "Tio Daniel", foto: "img/tio-daniel.jpg", fone: "19997781210"},
    {nome: "Tia Joyce",  foto: "img/tia-joyce.jpg",  fone: "19988761202"},
    {nome: "Tio Luiz",   foto: "img/tio-luiz.jpg",   fone: "19997499380"},
    {nome: "Tia Cintia", foto: "img/tia-cintia.jpg", fone: "19981163312"}
  ];
  const DIAS = [["seg","Segunda"],["ter","Terça"],["qua","Quarta"],["qui","Quinta"],["sex","Sexta"]];
  const EVENTO_CINE = "Passeio do Cinema · 28/11";
  let cine = {}, semana = {}, modo = "semana", editando = null, edDia = "seg", rascunho = {}, familias = [];
  try { modo = localStorage.getItem("dt-emb-modo") || "semana"; } catch(e){}

  /* ---------- cartão ---------- */
  const card = document.createElement("details");
  card.className = "card emb-adm"; card.id = "embarque"; card.open = true;
  card.innerHTML = `
    <summary><h3>🚐 Lista de embarque</h3><span id="embResumo">carregando…</span></summary>
    <div class="emb-abas" role="tablist">
      <button type="button" role="tab" data-m="semana">📅 Rota da semana</button>
      <button type="button" role="tab" data-m="cinema">🎬 Cinema</button>
    </div>
    <p class="dica" id="embDica" style="margin:0"></p>
    <div class="emb-fotos" id="embFotos"></div>
    <div class="emb-ed" id="embEd" hidden>
      <h4 id="embEdTit">Lista</h4>
      <div class="emb-dias" id="embDias"></div>
      <label for="embTxt" class="emb-ajuda">Uma criança por linha, <b>na ordem da rota</b>. Depois do traço vai a referência (escola, endereço, irmãos…). Telefone no fim é opcional.<br><i>Ex.: Adriel - na vó, perto da Silvana</i></label>
      <textarea id="embTxt" rows="12" spellcheck="false"></textarea>
      <div class="emb-ed-bts">
        <button class="btn btn-pri" type="button" id="embSalvar">Salvar lista</button>
        <button class="btn btn-sec" type="button" id="embCopia">📋 Copiar este dia pra semana toda</button>
        <button class="btn btn-sec" type="button" id="embPuxar">Puxar do app</button>
        <button class="btn btn-link" type="button" id="embFechar">Fechar</button>
      </div>
      <p class="msg-err" id="embErr" role="alert"></p>
    </div>
    <p class="ok-msg" id="embOk" role="status"></p>
    <div class="emb-mot">
      <b>🔑 Área dos motoristas</b>
      <p class="emb-ajuda" style="margin:0">Daniel, Joyce, Luiz e Cíntia entram em <a href="motorista.html" target="_blank" rel="noopener">⋮ › Área dos motoristas</a> com uma senha só deles e veem <b>só as listas</b>, nada do resto da Área Danni's. Entram uma vez e ficam conectados. Trocar a senha desconecta todo mundo.</p>
      <p class="emb-ajuda" id="motStatus" style="margin:0;font-weight:700"></p>
      <div class="emb-mot-linha"><input type="text" id="motSenha" placeholder="Nova senha dos motoristas" autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn btn-sec" type="button" id="motSalvar">Salvar senha</button></div>
      <p class="msg-err" id="motErr" role="alert"></p>
    </div>`;
  ($("#aniv") || $("#placar")).after(card);

  const css = document.createElement("style");
  css.textContent = `
    .emb-adm{display:grid;gap:12px;border:2px solid #9fd6b4}
    .emb-adm summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none}
    .emb-adm summary::-webkit-details-marker{display:none}
    .emb-adm summary h3{font-size:19px;margin:0}
    .emb-adm summary span{font-size:13.5px;color:var(--tinta-2);font-weight:700;text-align:right}
    .emb-abas{display:grid;grid-template-columns:1fr 1fr;gap:6px;background:#f3e8f3;border-radius:14px;padding:4px}
    .emb-abas button{font:800 14.5px var(--f-corpo);border:0;border-radius:11px;padding:10px 6px;background:transparent;color:var(--roxo);cursor:pointer}
    .emb-abas button[aria-selected="true"]{background:#fff;box-shadow:0 2px 0 rgba(0,0,0,.08)}
    .emb-fotos{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
    @media (max-width:420px){.emb-fotos{grid-template-columns:repeat(2,minmax(0,1fr))}}
    .emb-tio{display:grid;justify-items:center;gap:6px;text-align:center;min-width:0}
    .emb-foto{position:relative;display:block;width:min(100%,104px);aspect-ratio:1;border-radius:50%;padding:4px;background:#1fa855;box-shadow:0 5px 0 #137a3c;text-decoration:none}
    .emb-foto.vazio{background:#c9bcc9;box-shadow:0 5px 0 #a597a5}
    .emb-foto img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;background:#fff}
    .emb-foto:active{transform:translateY(3px);box-shadow:0 2px 0 #137a3c}
    .emb-n{position:absolute;right:-4px;bottom:-2px;min-width:30px;height:30px;padding:0 7px;border-radius:999px;background:#fff;color:#137a3c;border:2px solid #1fa855;font:800 14px/26px var(--f-display);text-align:center}
    .emb-foto.vazio .emb-n{color:#7a6a7a;border-color:#c9bcc9}
    .emb-tio b{font-size:14px;line-height:1.15}
    .emb-mini{display:flex;gap:4px;flex-wrap:wrap;justify-content:center}
    .emb-mini a,.emb-mini button{font:700 12px var(--f-corpo);border-radius:999px;padding:5px 9px;border:1.5px solid var(--linha);background:#fff;color:var(--tinta);text-decoration:none;cursor:pointer;white-space:nowrap}
    .emb-mini a{background:#1fa855;border-color:#1fa855;color:#fff}
    .emb-ed{display:grid;gap:8px;border-top:1px dashed var(--linha);padding-top:12px}
    .emb-ed h4{margin:0;font-size:16px}
    .emb-dias{display:flex;gap:6px;flex-wrap:wrap}
    .emb-dias button{font:800 13px var(--f-corpo);border-radius:999px;padding:7px 12px;border:1.5px solid var(--roxo);background:#fff;color:var(--roxo);cursor:pointer}
    .emb-dias button[aria-pressed="true"]{background:var(--roxo);color:#fff}
    .emb-dias small{font-weight:700;opacity:.75}
    .emb-ajuda{font-size:13px;color:var(--tinta-2);line-height:1.4}
    .emb-ed textarea{width:100%;font:16px/1.5 var(--f-corpo);padding:10px 12px;border:1.5px solid var(--linha);border-radius:12px;resize:vertical}
    .emb-ed-bts{display:flex;gap:8px;flex-wrap:wrap}
    .emb-mot{display:grid;gap:8px;border-top:1px dashed var(--linha);padding-top:12px}
    .emb-mot-linha{display:flex;gap:8px;flex-wrap:wrap}
    .emb-mot-linha input{flex:1;min-width:160px;font:16px var(--f-corpo);padding:10px 12px;border:1.5px solid var(--linha);border-radius:12px}`;
  document.head.appendChild(css);

  /* ---------- link da tela de embarque (a lista vai dentro do link, depois do #) ---------- */
  const b64 = obj => { const bytes = new TextEncoder().encode(JSON.stringify(obj)); let bin = ""; bytes.forEach(b => bin += String.fromCharCode(b)); return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
  const base = () => new URL("embarque.html", location.href).href;
  const qtd = van => modo === "cinema"
    ? ((cine[van.nome] && cine[van.nome].l.length) || 0)
    : new Set(Object.values((semana[van.nome] && semana[van.nome].dias) || {}).flat().map(a => a[0] + "|" + a[1])).size;
  function linkDe(van){
    if (modo === "cinema"){
      const v = cine[van.nome]; if (!v || !v.l || !v.l.length) return "";
      return base() + "#d=" + b64({t: van.nome, e: EVENTO_CINE, l: v.l.map(a => [a[0], a[1] || "", "", a[2] || ""])});
    }
    const v = semana[van.nome]; if (!v || !v.dias) return "";
    const k = [], idx = new Map(), d = {};      // cada criança uma vez só; cada dia guarda só a posição dela (link mais curto)
    DIAS.forEach(([dia]) => { const l = v.dias[dia]; if (!l || !l.length) return;
      d[dia] = l.map(a => { const ch = a[0] + "|" + (a[1] || "") + "|" + (a[2] || ""); if (!idx.has(ch)){ idx.set(ch, k.length); k.push([a[0], a[1] || "", a[2] || ""]); } return idx.get(ch); }); });
    if (!k.length) return "";
    return base() + "#d=" + b64({t: van.nome, e: "Rota da semana", k, d});
  }

  function desenha(){
    card.querySelectorAll(".emb-abas button").forEach(b => b.setAttribute("aria-selected", b.dataset.m === modo));
    $("#embDica").innerHTML = modo === "cinema"
      ? `Toque na <b>foto do motorista</b> pra abrir a lista do cinema. Verde = falta pegar; pegou, toca e fica <b style="color:#d93025">vermelho</b>.`
      : `Rota de todo dia, de <b>segunda a sexta</b>. Na tela do motorista, as setas ‹ › (ou deslizar o dedo) trocam o dia. Cada dia começa todo verde.`;
    const tot = VANS.reduce((t, v) => t + qtd(v), 0), com = VANS.filter(v => qtd(v)).length;
    $("#embResumo").textContent = tot ? `${tot} crianças · ${com} de ${VANS.length} vans` : "nenhuma lista ainda";
    $("#embFotos").innerHTML = VANS.map((v, i) => {
      const n = qtd(v), link = linkDe(v);
      const msg = modo === "cinema"
        ? `🚐 Lista de embarque do cinema (${v.nome}).\nAbra e, quando pegar cada criança, toque no nome: fica vermelho. Tocou errado? Toque de novo.\n\n${link}`
        : `🚐 Rota da semana (${v.nome}).\nAbra todo dia: as setas ‹ › trocam o dia. Pegou a criança, toque no nome: fica vermelho. Tocou errado? Toque de novo.\n\n${link}`;
      return `<div class="emb-tio">
        <a class="emb-foto${n ? "" : " vazio"}" data-i="${i}" href="${link || "#"}" aria-label="${n ? `Abrir a lista da van ${esc(v.nome)} (${n} crianças)` : `Montar a lista da van ${esc(v.nome)}`}">
          <img src="${v.foto}" alt="" loading="lazy"><span class="emb-n">${n || "+"}</span></a>
        <b>${esc(v.nome)}</b>
        <span class="emb-mini">${link ? `<a href="${zapLink(v.fone, msg)}" target="_blank" rel="noopener">📲 Mandar</a>` : ""}<button type="button" data-ed="${i}">✏️ Lista</button></span>
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
      if (p.length > 1 && /^\(?\d[\d()\s.-]{8,}$/.test(p[p.length - 1])) tel = p.pop().replace(/\D/g, "");
      return [p.shift() || "", p.join(" · "), tel];
    }).filter(a => a[0]);
  }
  function desenhaDias(){
    $("#embDias").hidden = modo !== "semana"; $("#embCopia").hidden = modo !== "semana";
    if (modo !== "semana") return;
    $("#embDias").innerHTML = DIAS.map(([d, nome]) => { const n = deTexto(rascunho[d]).length;
      return `<button type="button" data-d="${d}" aria-pressed="${d === edDia}">${nome.slice(0, 3).toUpperCase()} <small>${n || "–"}</small></button>`; }).join("");
  }
  function abreEditor(i){
    editando = VANS[i]; rascunho = {}; edDia = "seg";
    if (modo === "semana"){ const dias = (semana[editando.nome] && semana[editando.nome].dias) || {}; DIAS.forEach(([d]) => rascunho[d] = paraTexto(dias[d])); }
    $("#embEd").hidden = false; $("#embErr").textContent = ""; $("#embOk").textContent = "";
    $("#embEdTit").textContent = modo === "cinema" ? `🎬 Cinema – van ${editando.nome}` : `📅 Rota da semana – van ${editando.nome}`;
    $("#embTxt").value = modo === "cinema" ? paraTexto(cine[editando.nome] && cine[editando.nome].l) : rascunho.seg;
    desenhaDias();
    $("#embEd").scrollIntoView({behavior: "smooth", block: "start"}); $("#embTxt").focus({preventScroll: true});
  }
  $("#embTxt").addEventListener("input", () => { if (modo === "semana"){ rascunho[edDia] = $("#embTxt").value; const b = $(`#embDias [data-d="${edDia}"] small`); if (b) b.textContent = deTexto(rascunho[edDia]).length || "–"; } });
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
  $("#embPuxar").onclick = async () => {
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
      else if (!$("#embTxt").value.trim() || confirm(`Trocar o que está escrito pelos ${l.length} alunos do app?`)){
        $("#embTxt").value = paraTexto(l); if (modo === "semana"){ rascunho[edDia] = $("#embTxt").value; desenhaDias(); }
      }
    } catch(e){ $("#embErr").textContent = e.message || "Não consegui puxar agora."; }
    b.disabled = false; b.textContent = txt;
  };
  $("#embSalvar").onclick = async () => {
    if (!editando) return;
    const b = $("#embSalvar"), txt = b.textContent;
    let req, n;
    if (modo === "cinema"){ const l = deTexto($("#embTxt").value); n = l.length; req = {modo, tio: editando.nome, lista: l}; }
    else { rascunho[edDia] = $("#embTxt").value; const dias = {}; DIAS.forEach(([d]) => dias[d] = deTexto(rascunho[d])); n = Object.values(dias).reduce((t, l) => t + l.length, 0); req = {modo, tio: editando.nome, dias}; }
    if (!n && !confirm(`Apagar a lista da van ${editando.nome}?`)) return;
    b.disabled = true; b.textContent = "Salvando…"; $("#embErr").textContent = "";
    try {
      const r = await api("admin_embarque_salvar", {senha: window.__dtSenha, ...req});
      cine = r.vans || {}; semana = r.semana || {}; desenha();
      $("#embEd").hidden = true;
      $("#embOk").textContent = n ? `✅ Lista da van ${editando.nome} salva. Toque na foto pra abrir ou em 📲 Mandar.` : `Lista da van ${editando.nome} apagada.`;
      editando = null;
    } catch(e){ $("#embErr").textContent = e.message || "Não consegui salvar. Tente de novo."; }
    b.disabled = false; b.textContent = txt;
  };

  /* ---------- senha da Área dos motoristas ---------- */
  const motStatus = tem => $("#motStatus").textContent = tem ? "✅ Senha criada. Pra trocar, digite outra e salve." : "⚠️ Ainda sem senha: os motoristas não conseguem entrar. Crie uma abaixo.";
  $("#motSalvar").onclick = async () => {
    const nova = $("#motSenha").value.trim(); $("#motErr").textContent = "";
    if (nova.length < 4){ $("#motErr").textContent = "Use pelo menos 4 letras ou números."; return; }
    if (!confirm("Salvar essa senha? Quem estiver conectado na Área dos motoristas vai precisar entrar de novo com ela.")) return;
    const b = $("#motSalvar"); b.disabled = true; b.textContent = "Salvando…";
    try { await api("admin_mot_senha", {senha: window.__dtSenha, nova}); $("#motSenha").value = ""; motStatus(true); $("#embOk").textContent = "✅ Senha dos motoristas salva. Passe pra eles junto com o caminho: ⋮ › Área dos motoristas."; }
    catch(e){ $("#motErr").textContent = e.message || "Não consegui salvar."; }
    b.disabled = false; b.textContent = "Salvar senha";
  };

  /* ---------- carrega quando a Área Danni's entra ---------- */
  async function carrega(){
    try { const r = await api("admin_embarque", {senha: window.__dtSenha}); cine = r.vans || {}; semana = r.semana || {}; motStatus(!!r.temSenhaMot); }
    catch(e){ $("#embResumo").textContent = "não consegui carregar"; }
    desenha();
    if (/^#embarque\b/.test(location.hash)){ card.open = true; setTimeout(() => card.scrollIntoView({behavior: "smooth", block: "start"}), 150); }
  }
  let jaCarregou = false;
  window.addEventListener("dt-lista", e => { familias = (e.detail && e.detail.familias) || []; if (!jaCarregou){ jaCarregou = true; carrega(); } });
  desenha();
})();
