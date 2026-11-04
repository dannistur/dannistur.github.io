/* Danni's Tur · contrato personalizado (só na Área Danni's).
   Você preenche tudo (família, alunos, valor, parcelas e condições especiais), o contrato entra na lista
   e segue o caminho normal: liberar pra assinatura → a família abre "Meu contrato" com CPF + nascimento e aceita.
   O mesmo formulário edita qualquer contrato que já existe. */
(function(){
  "use strict";
  const $ = s => document.querySelector(s);
  const {esc, brl, num, maskCpf, maskTel, cpfValido, api, ESCOLAS, INI, FIM, nomeMes, vigencia, hojeISO, contratoHTML} = DT;
  let editando = null;   // família sendo editada (null = contrato novo)

  /* ---------- botão no painel + botão no detalhe ---------- */
  const abre = document.createElement("button");
  abre.type = "button"; abre.className = "card vans-abre"; abre.id = "abreNovoContrato";
  abre.innerHTML = `<span style="font-size:26px" aria-hidden="true">📝</span><span><b>Fazer contrato personalizado</b><small style="display:block;color:var(--tinta-2)">Você coloca os dados, o valor e as condições e manda pra família aceitar</small></span>`;
  ($("#abreLocacao") || $("#abreVans")).after(abre);

  const edita = document.createElement("button");
  edita.type = "button"; edita.className = "btn btn-sec"; edita.id = "editaContrato"; edita.textContent = "✏️ Editar dados do contrato";
  edita.style.justifySelf = "start";
  $("#dInfo").after(edita);

  /* ---------- tela do formulário ---------- */
  const sec = document.createElement("section");
  sec.id = "novoContrato"; sec.hidden = true; sec.style.cssText = "display:grid;gap:14px";
  let ops = ""; for (let k = INI; k <= FIM; k++) ops += `<option value="${k}">${nomeMes(k)}</option>`;
  sec.innerHTML = `
    <button class="btn btn-link" type="button" id="ncVoltar" style="justify-self:start">← Voltar</button>
    <div class="card" style="gap:16px">
      <h2 id="ncTit" style="font-size:22px">📝 Contrato personalizado</h2>
      <p class="dica" id="ncDica" style="margin:0">Preencha e toque em <b>Criar contrato</b>. Depois é só <b>liberar pra assinatura</b> e mandar pra família no WhatsApp. Ela abre o <b>Meu contrato</b> com o CPF e a data de nascimento do aluno e aceita.</p>
      <p class="aviso-tab" id="ncAviso" hidden style="margin:0;padding:10px;border-radius:10px"></p>
      <div class="campo"><span style="font-weight:600;font-size:14px">Tipo</span>
        <div class="chips"><label class="chip"><input type="radio" name="ncTipo" value="renovacao" checked><span>Renovação</span></label><label class="chip"><input type="radio" name="ncTipo" value="novo"><span>Contrato novo</span></label></div></div>
      <fieldset class="nc-fs"><legend>Responsável (quem assina)</legend>
        <div class="grade2">
          <div class="campo nc-int"><label for="ncNome">Nome completo</label><input type="text" id="ncNome" autocomplete="off"></div>
          <div class="campo"><label for="ncCpf">CPF</label><input type="text" id="ncCpf" inputmode="numeric" placeholder="000.000.000-00"></div>
          <div class="campo"><label for="ncRg">RG</label><input type="text" id="ncRg"></div>
          <div class="campo"><label for="ncTel">Celular / WhatsApp</label><input type="text" id="ncTel" inputmode="tel" placeholder="(19) 90000-0000"></div>
          <div class="campo"><label for="ncEmail">E-mail <span class="opc">(opcional)</span></label><input id="ncEmail" type="email"></div>
          <div class="campo"><label for="ncCasa">Telefone de casa <span class="opc">(opcional)</span></label><input type="text" id="ncCasa" inputmode="tel"></div>
          <div class="campo"><label for="ncOutro">Outro telefone <span class="opc">(opcional)</span></label><input type="text" id="ncOutro" inputmode="tel"></div>
          <div class="campo nc-int"><label for="ncRua">Rua e número</label><input type="text" id="ncRua"></div>
          <div class="campo"><label for="ncBairro">Bairro</label><input type="text" id="ncBairro"></div>
          <div class="campo"><label for="ncCep">CEP</label><input type="text" id="ncCep" inputmode="numeric" placeholder="13170-000"></div>
          <div class="campo"><label for="ncCidade">Cidade</label><input type="text" id="ncCidade" value="Sumaré"></div>
        </div>
      </fieldset>
      <fieldset class="nc-fs"><legend>Aluno(s)</legend>
        <datalist id="ncEscolas">${ESCOLAS.map(e => `<option value="${esc(e.nome)}">`).join("")}</datalist>
        <div id="ncAlunos" style="display:grid;gap:12px"></div>
        <button class="btn btn-sec" type="button" id="ncAddAluno" style="justify-self:start">+ Adicionar irmão(ã)</button>
      </fieldset>
      <fieldset class="nc-fs"><legend>Valor e vigência</legend>
        <div class="grade2">
          <div class="campo"><label for="ncPv">Mensalidade (R$)</label><input type="text" id="ncPv" inputmode="decimal" placeholder="0,00"></div>
          <div class="campo"><label for="ncIni">Início</label><select id="ncIni">${ops}</select></div>
          <div class="campo"><label for="ncParc">Parcelas</label><input id="ncParc" type="number" min="1" max="24"></div>
          <div class="campo"><label for="ncTot">Valor total (R$)</label><input type="text" id="ncTot" inputmode="decimal"></div>
          <div class="campo"><label for="ncData">Data do contrato</label><input id="ncData" type="date"></div>
        </div>
      </fieldset>
      <div class="campo"><label for="ncObs">Condições especiais <span class="opc">(opcional · vai escrito no contrato)</span></label>
        <textarea id="ncObs" rows="3" placeholder="Ex.: desconto de irmão já incluso; horário de saída 12h20; embarque na casa da avó…"></textarea></div>
      <p class="msg-err" id="ncErr" role="alert"></p>
      <p class="ok-msg" id="ncOk" role="status"></p>
      <div class="btns" style="grid-template-columns:auto;justify-content:start"><button class="btn btn-pri" type="button" id="ncCriar">Criar contrato</button></div>
    </div>
    <div class="card" style="gap:10px">
      <h3 style="font-size:18px">Prévia do contrato</h3>
      <div class="folha" id="ncFolha" style="max-height:70vh;overflow:auto"></div>
    </div>`;
  ($("#detalhe") || $("#painel")).after(sec);

  const css = document.createElement("style");
  css.textContent = `
    #abreNovoContrato{display:flex;gap:12px;align-items:center;text-align:left}
    .nc-fs{border:1px solid var(--linha);border-radius:14px;padding:12px;display:grid;gap:12px;min-width:0}
    .nc-fs legend{font-weight:800;padding:0 6px}
    #novoContrato .grade2{grid-template-columns:repeat(2,minmax(0,1fr))}
    #novoContrato .nc-int{grid-column:1 / -1}
    #novoContrato input,#novoContrato select{min-width:0;max-width:100%}
    .nc-aluno{border:1px dashed var(--linha);border-radius:12px;padding:10px;display:grid;gap:10px}
    .nc-aluno-top{display:flex;justify-content:space-between;align-items:center}
    .nc-aluno-top b{font-size:15px}
    .nc-rem{border:0;background:#ffe3e1;color:#b3261e;border-radius:10px;padding:6px 10px;cursor:pointer;font-weight:700}
    #novoContrato .campo.err input,#novoContrato .campo.err select{border-color:var(--erro)}`;
  document.head.appendChild(css);

  /* ---------- alunos ---------- */
  const PER = ["Manhã","Tarde","Integral","Noite"], TRAJ = ["Ida e volta","Só ida","Só volta"];
  function addAluno(a){
    a = a || {};
    const d = document.createElement("div"); d.className = "nc-aluno";
    d.innerHTML = `
      <div class="nc-aluno-top"><b>Aluno</b><button type="button" class="nc-rem">Remover</button></div>
      <div class="grade2">
        <div class="campo nc-int"><label>Nome completo do aluno</label><input type="text" class="nca-nome" value="${esc(a.nome||"")}"></div>
        <div class="campo"><label>Data de nascimento</label><input type="date" class="nca-nasc" value="${esc(a.nasc||"")}"></div>
        <div class="campo"><label>Escola</label><input type="text" class="nca-escola" list="ncEscolas" value="${esc(a.escola||"")}" placeholder="Toque e escolha ou digite"></div>
        <div class="campo"><label>Período</label><select class="nca-per">${PER.map(p => `<option${p===a.periodo?" selected":""}>${p}</option>`).join("")}</select></div>
        <div class="campo"><label>Trajeto</label><select class="nca-traj">${TRAJ.map(p => `<option${p===(a.trajeto||"Ida e volta")?" selected":""}>${p}</option>`).join("")}</select></div>
      </div>`;
    d.querySelector(".nc-rem").onclick = () => { if ($("#ncAlunos").children.length > 1){ d.remove(); renumera(); previa(); } };
    $("#ncAlunos").appendChild(d); renumera(); return d;
  }
  function renumera(){ const cs = [...$("#ncAlunos").children]; cs.forEach((c, i) => { c.querySelector("b").textContent = cs.length > 1 ? `Aluno ${i+1}` : "Aluno"; c.querySelector(".nc-rem").hidden = cs.length < 2; }); }
  $("#ncAddAluno").onclick = () => { addAluno().querySelector(".nca-nome").focus(); previa(); };

  /* ---------- máscaras e contas ---------- */
  $("#ncCpf").addEventListener("input", e => e.target.value = maskCpf(e.target.value));
  ["#ncTel","#ncCasa","#ncOutro"].forEach(q => $(q).addEventListener("input", e => { if (/^[\d()\s-]*$/.test(e.target.value)) e.target.value = maskTel(e.target.value); }));
  $("#ncCep").addEventListener("input", e => { const v = e.target.value.replace(/\D/g,"").slice(0,8); e.target.value = v.length > 5 ? v.slice(0,5) + "-" + v.slice(5) : v; });
  const dinheiro = el => { const d = el.value.replace(/\D/g,"").slice(0,8); el.value = d ? (Number(d)/100).toLocaleString("pt-BR",{minimumFractionDigits:2}) : ""; };
  const recalc = () => { const pv = num($("#ncPv").value), n = +$("#ncParc").value; if (pv && n && !$("#ncTot").dataset.manual) $("#ncTot").value = brl(pv*n); };
  $("#ncPv").addEventListener("input", e => { dinheiro(e.target); recalc(); });
  $("#ncParc").addEventListener("input", recalc);
  $("#ncTot").addEventListener("input", e => { dinheiro(e.target); e.target.dataset.manual = e.target.value ? "1" : ""; });
  $("#ncIni").addEventListener("change", () => { $("#ncParc").value = vigencia(null, +$("#ncIni").value).meses; recalc(); });
  sec.addEventListener("input", e => { $("#ncOk").textContent = ""; const c = e.target.closest(".campo"); if (c) c.classList.remove("err"); previa(); });
  sec.addEventListener("change", previa);

  /* ---------- ler / preencher ---------- */
  function lerAlunos(){ return [...$("#ncAlunos").children].map(c => ({nome: c.querySelector(".nca-nome").value.trim(), nasc: c.querySelector(".nca-nasc").value, escola: c.querySelector(".nca-escola").value.trim(), periodo: c.querySelector(".nca-per").value, trajeto: c.querySelector(".nca-traj").value})); }
  function ler(){
    const pv = num($("#ncPv").value), n = +$("#ncParc").value || 0;
    return {
      tipo: (document.querySelector('input[name="ncTipo"]:checked') || {}).value || "renovacao",
      responsavel: $("#ncNome").value.trim(), cpf: $("#ncCpf").value, rg: $("#ncRg").value.trim(), celular: $("#ncTel").value.trim(),
      email: $("#ncEmail").value.trim(), foneCasa: $("#ncCasa").value.trim(), outroFone: $("#ncOutro").value.trim(),
      rua: $("#ncRua").value.trim(), bairro: $("#ncBairro").value.trim(), cidade: $("#ncCidade").value.trim(), cep: $("#ncCep").value,
      alunos: lerAlunos(), obs: $("#ncObs").value.trim(),
      valores: {ini: +$("#ncIni").value, mensalidade: pv, parcelas: n, total: num($("#ncTot").value) || pv*n, dataContrato: $("#ncData").value}
    };
  }
  function preencher(f){
    f = f || {}; const v = f.valores || {}, vg = vigencia(f.dataCadastro, v.ini);
    sec.querySelectorAll("input:not([type=radio]),textarea").forEach(i => { if (!i.closest(".nc-aluno")) i.value = ""; });
    document.querySelector(`input[name="ncTipo"][value="${f.tipo === "novo" ? "novo" : "renovacao"}"]`).checked = true;
    $("#ncNome").value = f.responsavel || ""; $("#ncCpf").value = f.cpf || ""; $("#ncRg").value = f.rg || ""; $("#ncTel").value = f.celular || "";
    $("#ncEmail").value = f.email || ""; $("#ncCasa").value = f.foneCasa || ""; $("#ncOutro").value = f.outroFone || "";
    $("#ncRua").value = f.rua || ""; $("#ncBairro").value = f.bairro || ""; $("#ncCidade").value = f.cidade || "Sumaré"; $("#ncCep").value = f.cep || "";
    $("#ncObs").value = f.obs || "";
    $("#ncAlunos").innerHTML = ""; (f.alunos && f.alunos.length ? f.alunos : [{}]).forEach(addAluno);
    $("#ncIni").value = vg.ini; $("#ncParc").value = v.parcelas || vg.meses;
    $("#ncPv").value = num(v.mensalidade) ? brl(num(v.mensalidade)) : "";
    $("#ncTot").value = num(v.total) ? brl(num(v.total)) : ""; $("#ncTot").dataset.manual = num(v.total) && Math.abs(num(v.total) - num(v.mensalidade)*(+v.parcelas||0)) > .005 ? "1" : "";
    $("#ncData").value = v.dataContrato || hojeISO();
    $("#ncErr").textContent = ""; $("#ncOk").textContent = "";
    sec.querySelectorAll(".campo.err").forEach(c => c.classList.remove("err"));
    previa();
  }
  function previa(){
    const d = ler();
    const f = {...d, origem: "adm", dataCadastro: hojeISO(), id: editando ? editando.id : ""};
    try { $("#ncFolha").innerHTML = contratoHTML(f, d.valores); } catch(e){ $("#ncFolha").textContent = ""; }
  }

  /* ---------- abrir / fechar ---------- */
  function mostrar(fam){
    editando = fam || null;
    $("#painel").hidden = true; $("#detalhe").hidden = true; sec.hidden = false; window.scrollTo(0, 0);
    $("#ncTit").textContent = editando ? `✏️ Editar contrato nº ${editando.id}` : "📝 Contrato personalizado";
    $("#ncCriar").textContent = editando ? "Salvar alterações" : "Criar contrato";
    $("#ncDica").hidden = !!editando;
    const av = $("#ncAviso");
    av.hidden = !(editando && editando.aceiteEm);
    av.textContent = "⚠️ Essa família já aceitou o contrato. Se você mudar alguma coisa, o aceite cai e ela vai precisar aceitar de novo no Meu contrato.";
    preencher(editando ? editando : null);
  }
  function voltar(){ sec.hidden = true; if (editando){ $("#detalhe").hidden = false; } else { $("#painel").hidden = false; } window.scrollTo(0, 0); }
  abre.onclick = () => mostrar(null);
  edita.onclick = () => { if (window.__dtAtual) mostrar(window.__dtAtual); };
  $("#ncVoltar").onclick = voltar;

  /* ---------- salvar ---------- */
  const marca = (el, ok) => { el.closest(".campo").classList.toggle("err", !ok); return ok; };
  $("#ncCriar").onclick = async () => {
    $("#ncErr").textContent = ""; $("#ncOk").textContent = "";
    const d = ler(); let ok = true, primeiro = null;
    const req = (el, c) => { if (!marca(el, c)){ ok = false; primeiro = primeiro || el; } };
    req($("#ncNome"), d.responsavel.split(/\s+/).length >= 2);
    req($("#ncCpf"), cpfValido(d.cpf));
    req($("#ncTel"), d.celular.replace(/\D/g,"").length >= 10);
    [...$("#ncAlunos").children].forEach(c => { req(c.querySelector(".nca-nome"), c.querySelector(".nca-nome").value.trim().length >= 3); req(c.querySelector(".nca-nasc"), !!c.querySelector(".nca-nasc").value); });
    req($("#ncPv"), d.valores.mensalidade > 0);
    req($("#ncParc"), d.valores.parcelas >= 1 && d.valores.parcelas <= 24);
    if (!ok){ $("#ncErr").textContent = "Confira os campos em vermelho (nome completo, CPF, celular, nome e nascimento de cada aluno, mensalidade e parcelas)."; primeiro.scrollIntoView({behavior:"smooth", block:"center"}); primeiro.focus(); return; }
    const b = $("#ncCriar"), txt = b.textContent; b.disabled = true; b.textContent = "Salvando…";
    try {
      const r = editando
        ? await api("admin_editar", {senha: window.__dtSenha, id: editando.id, dados: d})
        : await api("admin_criar", {senha: window.__dtSenha, dados: d});
      const id = editando ? editando.id : r.id;
      sec.hidden = true;
      location.hash = "#f=" + id; $("#atualizar").click();   // recarrega a lista e abre o contrato
      const aviso = editando
        ? (r.aceiteCaiu ? "Salvo. Como mudou, a família precisa aceitar de novo: mande o link pra ela." : "Salvo.")
        : "Contrato criado! Confira e toque em 'Salvar e liberar pra assinatura', depois mande pra família no WhatsApp.";
      const t0 = Date.now(), espera = setInterval(() => { if (!$("#detalhe").hidden){ clearInterval(espera); $("#dOk").textContent = aviso; } else if (Date.now() - t0 > 15000){ clearInterval(espera); $("#painel").hidden = false; } }, 300);
    } catch(e){ $("#ncErr").textContent = e.message || "Não consegui salvar. Tente de novo."; }
    b.disabled = false; b.textContent = txt;
  };
})();
