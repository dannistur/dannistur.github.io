/* Danni's Tur · preços combinados (só na Área Danni's).
   Você coloca o nome (do aluno ou do responsável), o CPF do responsável se tiver e a mensalidade combinada.
   Quando essa família preencher a renovação/matrícula, o app reconhece e o contrato já sai com esse valor. */
(function(){
  "use strict";
  const $ = s => document.querySelector(s);
  const {esc, brl, num, maskCpf, api} = DT;
  let lista = [];

  const card = document.createElement("details");
  card.className = "card pc-card"; card.id = "precosComb";
  card.innerHTML = `
    <summary><h3>💲 Preços combinados</h3><span id="pcResumo">nenhum ainda</span></summary>
    <p class="dica" style="margin:0">Combinou um valor diferente da tabela? Coloque aqui o <b>nome do aluno ou do responsável</b> (nome e sobrenome) e a mensalidade. Com o <b>CPF do responsável</b> fica certeiro. Quando a família preencher, o contrato já sai com esse valor.</p>
    <div id="pcLista" class="pc-lista"></div>
    <div class="pc-bts">
      <button class="btn btn-sec" type="button" id="pcAdd">+ Adicionar</button>
      <button class="btn btn-pri" type="button" id="pcSalvar">Salvar</button>
    </div>
    <p class="msg-err" id="pcErr" role="alert"></p>
    <p class="ok-msg" id="pcOk" role="status"></p>`;
  const ancora = $("#abreLocacao") || $("#abreVans");
  ancora.after(card);

  const css = document.createElement("style");
  css.textContent = `
    .pc-card summary{display:flex;justify-content:space-between;align-items:center;gap:10px;cursor:pointer;list-style:none}
    .pc-card summary::-webkit-details-marker{display:none}
    .pc-card summary h3{font-size:18px;margin:0}
    .pc-card summary span{font-size:13.5px;color:var(--tinta-2)}
    .pc-card[open]{display:grid;gap:12px}
    .pc-lista{display:grid;gap:8px}
    .pc-linha{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,1.2fr) minmax(0,.9fr) auto;gap:8px;align-items:end;border:1px solid var(--linha);border-radius:12px;padding:10px}
    .pc-linha .campo{margin:0}
    .pc-linha label{font-size:12.5px}
    .pc-linha .pc-obs{grid-column:1 / -2}
    .pc-del{border:0;background:#ffe3e1;color:#b3261e;border-radius:10px;width:40px;height:40px;font-size:18px;cursor:pointer;align-self:end}
    @media (max-width:560px){.pc-linha{grid-template-columns:1fr 1fr}.pc-linha .pc-nome,.pc-linha .pc-obs{grid-column:1 / -1}}
    .pc-bts{display:flex;gap:10px;flex-wrap:wrap}`;
  document.head.appendChild(css);

  function desenha(){
    $("#pcResumo").textContent = lista.length ? `${lista.length} ${lista.length === 1 ? "família" : "famílias"}` : "nenhum ainda";
    $("#pcLista").innerHTML = lista.length ? lista.map((p, i) => `
      <div class="pc-linha" data-i="${i}">
        <div class="campo pc-nome"><label>Nome do aluno ou do responsável</label><input data-k="nome" value="${esc(p.nome)}" placeholder="Ex.: Joãozinho Pereira"></div>
        <div class="campo"><label>CPF do responsável <span class="opc">(opcional)</span></label><input data-k="cpf" inputmode="numeric" value="${esc(p.cpf ? maskCpf(p.cpf) : "")}"></div>
        <div class="campo"><label>Mensalidade (R$)</label><input data-k="valor" inputmode="decimal" value="${p.valor ? brl(p.valor) : ""}" placeholder="0,00"></div>
        <button type="button" class="pc-del" title="Tirar da lista" aria-label="Tirar ${esc(p.nome || "esta linha")} da lista">✕</button>
        <div class="campo pc-obs"><label>Anotação <span class="opc">(só você vê)</span></label><input data-k="obs" value="${esc(p.obs || "")}" placeholder="Ex.: irmão desconto, combinado em out/26"></div>
      </div>`).join("") : `<p class="dica" style="margin:0">Nenhum preço combinado. Toque em <b>+ Adicionar</b>.</p>`;
  }
  $("#pcLista").addEventListener("input", e => {
    const el = e.target, li = el.closest(".pc-linha"); if (!li) return;
    const p = lista[+li.dataset.i], k = el.dataset.k;
    if (k === "cpf") el.value = maskCpf(el.value);
    if (k === "valor"){ const d = el.value.replace(/\D/g, "").slice(0, 7); el.value = d ? (Number(d) / 100).toLocaleString("pt-BR", {minimumFractionDigits: 2}) : ""; }
    p[k] = k === "valor" ? num(el.value) : k === "cpf" ? el.value.replace(/\D/g, "") : el.value;
    $("#pcOk").textContent = "";
  });
  $("#pcLista").addEventListener("click", e => {
    const b = e.target.closest(".pc-del"); if (!b) return;
    lista.splice(+b.closest(".pc-linha").dataset.i, 1); desenha(); $("#pcOk").textContent = "Tirado da lista. Toque em Salvar.";
  });
  $("#pcAdd").onclick = () => { lista.push({nome: "", cpf: "", valor: 0, obs: ""}); desenha(); const ins = $("#pcLista").querySelectorAll('input[data-k="nome"]'); ins[ins.length - 1].focus(); };
  $("#pcSalvar").onclick = async () => {
    $("#pcErr").textContent = ""; $("#pcOk").textContent = "";
    const ruim = lista.find(p => p.nome.trim().split(/\s+/).length < 2 || !(p.valor >= 50) || (p.cpf && p.cpf.length !== 11));
    if (ruim){ $("#pcErr").textContent = `Confira "${ruim.nome || "linha sem nome"}": precisa de nome e sobrenome, mensalidade de pelo menos R$ 50 e, se tiver CPF, os 11 números.`; return; }
    const b = $("#pcSalvar"); b.disabled = true; b.textContent = "Salvando…";
    try { const r = await api("admin_precos", {senha: window.__dtSenha, precos: lista}); lista = r.precos || []; desenha(); $("#pcOk").textContent = "Salvo! Quando essas famílias preencherem, o contrato já sai com o valor combinado."; }
    catch(e){ $("#pcErr").textContent = e.message || "Não consegui salvar. Tente de novo."; }
    b.disabled = false; b.textContent = "Salvar";
  };

  // a Área Danni's avisa quando carrega a lista do servidor
  window.addEventListener("dt-lista", e => { lista = ((e.detail && e.detail.precosCombinados) || []).map(p => ({...p})); desenha(); });
  desenha();
})();
