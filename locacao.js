/* Danni's Tur · contrato de locação de van (só na Área Danni's).
   Preenche os dados do LOCATÁRIO (o condutor que aluga), confere o checklist, gera o PDF e manda no WhatsApp
   pra ele assinar pelo gov.br. Nada vai pro servidor: o rascunho fica só neste aparelho. */
(function(){
  "use strict";
  const $ = s => document.querySelector(s);
  const {esc, fmtData, brl, num, CONTRATADO, zapLink, maskCpf, maskTel} = DT;
  const RASCUNHO = "dt-locacao-rascunho";

  const VEICULO_PADRAO = {modelo: "Mercedes-Benz Sprinter", placa: "DBL-3219", cor: "Prata", ano: "", renavam: "", chassi: "", lugares: ""};
  const CHECKLIST = [
    "Documento do veículo (CRLV) dentro do prazo",
    "Pneus em bom estado (calibrados, sem cortes)",
    "Estepe em bom estado",
    "Macaco, chave de roda e triângulo",
    "Extintor (se houver) dentro da validade",
    "Faróis, lanternas, setas e luz de freio",
    "Freios e freio de mão",
    "Limpador e esguicho do para-brisa",
    "Para-brisa, vidros e retrovisores sem trincas",
    "Cintos de segurança de todos os bancos",
    "Bancos e estofamento",
    "Portas, travas e porta corrediça",
    "Ar-condicionado / ventilação",
    "Painel sem luz de alerta acesa",
    "Lataria e pintura (avarias anotadas abaixo)",
    "Limpeza interna e externa",
    "Chave e chave reserva entregues"
  ];
  const COMBUSTIVEL = ["Reserva", "1/4", "1/2", "3/4", "Cheio"];

  /* ---------- tela ---------- */
  const sec = document.createElement("section");
  sec.id = "locacao"; sec.hidden = true; sec.style.cssText = "display:grid;gap:14px";
  sec.innerHTML = `
    <button class="btn btn-link" type="button" id="lcVoltar" style="justify-self:start">← Voltar pra lista</button>
    <div class="card lc" style="gap:14px">
      <h2 style="font-size:24px">🔑 Contrato de locação de van</h2>
      <p class="dica" style="margin:0">A <b>Danni's Tur é a LOCADORA</b> (dona da van). Aqui você preenche os dados de quem vai alugar (o <b>LOCATÁRIO</b>), confere o checklist com ele, gera o PDF e manda no WhatsApp dele pra assinar pelo gov.br.</p>

      <fieldset><legend>Locatário (quem aluga a van)</legend>
        <div class="lc-grade">
          <div class="campo lc-2"><label for="lcNome">Nome completo</label><input id="lcNome" autocomplete="off"></div>
          <div class="campo"><label for="lcCpf">CPF</label><input id="lcCpf" inputmode="numeric" autocomplete="off"></div>
          <div class="campo"><label for="lcRg">RG</label><input id="lcRg" autocomplete="off"></div>
          <div class="campo"><label for="lcNac">Nacionalidade</label><input id="lcNac" value="brasileiro(a)"></div>
          <div class="campo"><label for="lcCivil">Estado civil</label><input id="lcCivil"></div>
          <div class="campo lc-2"><label for="lcProf">Profissão</label><input id="lcProf" value="condutor(a) de transporte escolar"></div>
          <div class="campo"><label for="lcCnh">CNH nº</label><input id="lcCnh" inputmode="numeric" autocomplete="off"></div>
          <div class="campo"><label for="lcCnhCat">Categoria da CNH</label><input id="lcCnhCat" placeholder="D"></div>
          <div class="campo"><label for="lcCnhVal">Validade da CNH</label><input id="lcCnhVal" type="date"></div>
          <div class="campo"><label for="lcTel">Celular / WhatsApp</label><input id="lcTel" type="tel" inputmode="tel" autocomplete="off"></div>
          <div class="campo lc-2"><label for="lcEnd">Endereço (rua, nº, bairro)</label><input id="lcEnd" autocomplete="off"></div>
          <div class="campo"><label for="lcCidade">Cidade</label><input id="lcCidade" value="Sumaré/SP"></div>
          <div class="campo"><label for="lcEmail">E-mail <span class="opc">(opcional)</span></label><input id="lcEmail" type="email" autocomplete="off"></div>
        </div>
      </fieldset>

      <fieldset><legend>Van</legend>
        <div class="lc-grade">
          <div class="campo lc-2"><label for="lcModelo">Marca / modelo</label><input id="lcModelo"></div>
          <div class="campo"><label for="lcPlaca">Placa</label><input id="lcPlaca"></div>
          <div class="campo"><label for="lcCor">Cor</label><input id="lcCor"></div>
          <div class="campo"><label for="lcAno">Ano / modelo <span class="opc">(opcional)</span></label><input id="lcAno"></div>
          <div class="campo"><label for="lcRenavam">RENAVAM <span class="opc">(opcional)</span></label><input id="lcRenavam" inputmode="numeric"></div>
          <div class="campo"><label for="lcChassi">Chassi <span class="opc">(opcional)</span></label><input id="lcChassi"></div>
          <div class="campo"><label for="lcLugares">Lugares <span class="opc">(opcional)</span></label><input id="lcLugares" inputmode="numeric"></div>
        </div>
      </fieldset>

      <fieldset><legend>Entrega, prazo e valor</legend>
        <div class="lc-grade">
          <div class="campo"><label for="lcRetira">Data da entrega</label><input id="lcRetira" type="date"></div>
          <div class="campo"><label for="lcKm">KM na entrega <span class="opc">(pode deixar em branco e preencher na hora)</span></label><input id="lcKm" inputmode="numeric"></div>
          <div class="campo"><label for="lcComb">Combustível na entrega</label><select id="lcComb"><option value="">— preencher na hora —</option>${COMBUSTIVEL.map(c => `<option>${c}</option>`).join("")}</select></div>
          <div class="campo"><label for="lcInicio">Início da locação</label><input id="lcInicio" type="date"></div>
          <div class="campo"><label for="lcFim">Fim da locação <span class="opc">(em branco = sem data)</span></label><input id="lcFim" type="date"></div>
          <div class="campo"><label for="lcPer">Como vai cobrar</label><select id="lcPer"><option value="mês">Por mês (valor fixo)</option><option value="semana">Por semana (valor fixo)</option><option value="dia">Por dia (diária)</option><option value="km">Por KM rodado</option></select></div>
          <div class="campo"><label for="lcValor" id="lcValorLbl">Valor do aluguel por mês (R$)</label><input id="lcValor" inputmode="decimal" placeholder="0,00"></div>
          <div class="campo"><label for="lcVenc" id="lcVencLbl">Vencimento</label><input id="lcVenc" placeholder="todo dia 10"></div>
          <div class="campo"><label for="lcCaucao">Caução (R$) <span class="opc">(opcional)</span></label><input id="lcCaucao" inputmode="decimal" placeholder="0,00"></div>
          <div class="campo lc-sokm"><label for="lcKmLim">Limite de KM por mês <span class="opc">(em branco = livre)</span></label><input id="lcKmLim" inputmode="numeric"></div>
          <div class="campo lc-sokm"><label for="lcKmExc">Valor do KM excedente (R$)</label><input id="lcKmExc" inputmode="decimal" placeholder="0,00"></div>
          <div class="campo"><label for="lcMulta">Multa por atraso no pagamento (%)</label><input id="lcMulta" inputmode="decimal" value="2"></div>
          <div class="campo"><label for="lcAviso">Aviso prévio pra sair (dias)</label><input id="lcAviso" inputmode="numeric" value="30"></div>
        </div>
      </fieldset>

      <fieldset><legend>Checklist da entrega (conferir junto com o locatário)</legend>
        <div class="lc-check" id="lcCheck">${CHECKLIST.map((t, i) => `<label class="check"><input type="checkbox" data-i="${i}"> ${esc(t)}</label>`).join("")}</div>
        <button type="button" class="btn btn-link" id="lcTudoOk" style="justify-self:start">Marcar tudo OK</button>
        <div class="campo"><label for="lcAvarias">Avarias, riscos e observações</label><textarea id="lcAvarias" rows="3" placeholder="Ex.: risco na porta traseira direita; para-choque dianteiro arranhado…"></textarea></div>
        <label class="check lc-confirma"><input type="checkbox" id="lcConfirma"> <span><b>O LOCATÁRIO conferiu a van junto com a Danni's Tur e confirma o checklist acima</b> (itens não marcados e avarias ficam registrados como estão).</span></label>
      </fieldset>

      <label class="check" id="lcAssWrap"><input type="checkbox" id="lcMinhaAss" checked> Colocar a minha assinatura salva (Danni's Tur) no contrato</label>

      <p class="msg-err" id="lcErr" role="alert"></p>
      <div class="btns">
        <button class="btn btn-sec" type="button" id="lcPrevia">Ver o contrato</button>
        <button class="btn btn-verde" type="button" id="lcEnviar"><span>📄 Gerar PDF e mandar no WhatsApp do locatário</span></button>
        <button class="btn btn-link" type="button" id="lcLimpar">Começar outro contrato (limpar)</button>
      </div>
      <p class="ok-msg" id="lcOk" role="status"></p>
    </div>
    <div class="folha" id="lcFolha" hidden></div>`;
  $("#detalhe").before(sec);

  // botão na lista
  const abre = document.createElement("button");
  abre.type = "button"; abre.className = "card vans-abre"; abre.id = "abreLocacao";
  abre.innerHTML = `<span class="vi" aria-hidden="true">🔑</span><span><b>Contrato de locação de van</b><small>Alugar a Sprinter pra outro condutor: dados, checklist e PDF pra assinar pelo gov.br</small></span><span aria-hidden="true">›</span>`;
  $("#abreVans").after(abre);

  const css = document.createElement("style");
  css.textContent = `
    .lc fieldset{border:1px solid var(--linha);border-radius:14px;padding:12px 14px 14px;display:grid;gap:10px;margin:0}
    .lc legend{font-family:var(--f-display);font-weight:800;font-size:17px;color:var(--roxo);padding:0 6px}
    .lc-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
    .lc-2{grid-column:span 2}
    @media (max-width:420px){.lc-2{grid-column:auto}}
    .lc-check{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:6px 14px}
    .lc-check .check{font-size:14.5px}
    .lc-confirma{background:#fff6e5;border:1.5px solid #f4b04a;border-radius:12px;padding:10px 12px}
    .ct-lic{border-left:5px solid #b3261e;padding:8px 12px;background:#fff4f3}
    .ct-lic b{color:#b3261e}
    .ct-checklist{display:grid;grid-template-columns:1fr 1fr;gap:2px 18px;font-size:12px;margin:4px 0}
    .ct-checklist span{white-space:normal}
    .ct-veic{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #bbb;border-radius:6px;overflow:hidden}
    .ct-veic div{padding:5px 8px;border:0 solid #ddd;border-right-width:1px;border-bottom-width:1px;font-size:12.5px}
    .ct-veic small{display:block;font-size:10px;color:#666;text-transform:uppercase;letter-spacing:.04em}`;
  document.head.appendChild(css);

  /* ---------- dados ---------- */
  const campos = ["lcNome","lcCpf","lcRg","lcNac","lcCivil","lcProf","lcCnh","lcCnhCat","lcCnhVal","lcTel","lcEnd","lcCidade","lcEmail",
                  "lcModelo","lcPlaca","lcCor","lcAno","lcRenavam","lcChassi","lcLugares",
                  "lcRetira","lcKm","lcComb","lcInicio","lcFim","lcValor","lcPer","lcVenc","lcCaucao","lcKmLim","lcKmExc","lcMulta","lcAviso","lcAvarias"];
  const ls = {get(){ try { return JSON.parse(localStorage.getItem(RASCUNHO) || "null"); } catch(e){ return null; } },
              set(v){ try { localStorage.setItem(RASCUNHO, JSON.stringify(v)); } catch(e){} },
              del(){ try { localStorage.removeItem(RASCUNHO); } catch(e){} }};
  function padrao(){
    const v = {lcModelo: VEICULO_PADRAO.modelo, lcPlaca: VEICULO_PADRAO.placa, lcCor: VEICULO_PADRAO.cor, lcNac: "brasileiro(a)",
               lcProf: "condutor(a) de transporte escolar", lcCidade: "Sumaré/SP", lcMulta: "2", lcAviso: "30", lcPer: "mês"};
    campos.forEach(id => { const el = $("#" + id); el.value = v[id] != null ? v[id] : ""; });
    document.querySelectorAll("#lcCheck input").forEach(c => c.checked = false);
    $("#lcConfirma").checked = false;
  }
  function le(){
    const d = {}; campos.forEach(id => d[id] = $("#" + id).value.trim());
    d.check = [...document.querySelectorAll("#lcCheck input")].map(c => c.checked);
    d.confirma = $("#lcConfirma").checked;
    return d;
  }
  function escreve(d){
    padrao(); if (!d) return;
    campos.forEach(id => { if (d[id] != null) $("#" + id).value = d[id]; });
    (d.check || []).forEach((v, i) => { const c = document.querySelector(`#lcCheck input[data-i="${i}"]`); if (c) c.checked = !!v; });
    $("#lcConfirma").checked = !!d.confirma;
  }
  function formaCobranca(){
    const p = $("#lcPer").value;
    $("#lcValorLbl").textContent = p === "km" ? "Valor por KM rodado (R$)" : p === "dia" ? "Valor da diária (R$)" : `Valor do aluguel por ${p} (R$)`;
    $("#lcVencLbl").textContent = p === "km" || p === "dia" ? "Quando paga (fechamento)" : "Vencimento";
    $("#lcVenc").placeholder = p === "km" || p === "dia" ? "toda sexta-feira / na devolução" : "todo dia 10";
    document.querySelectorAll(".lc-sokm").forEach(c => c.hidden = p === "km");   // por KM não tem limite nem excedente
  }
  $("#lcPer").addEventListener("change", formaCobranca);
  escreve(ls.get()); formaCobranca();
  sec.addEventListener("input", () => ls.set(le()));
  sec.addEventListener("change", () => ls.set(le()));
  $("#lcCpf").addEventListener("input", e => e.target.value = maskCpf(e.target.value));
  $("#lcTel").addEventListener("input", e => e.target.value = maskTel(e.target.value));
  $("#lcTudoOk").onclick = () => { document.querySelectorAll("#lcCheck input").forEach(c => c.checked = true); ls.set(le()); };
  $("#lcLimpar").onclick = () => { if (!confirm("Limpar os dados deste contrato e começar outro?")) return; ls.del(); padrao(); $("#lcFolha").hidden = true; $("#lcOk").textContent = ""; };

  /* ---------- contrato ---------- */
  const linha = (v, w) => v ? `<span class="preenchido">${esc(v)}</span>` : `<span class="branco" style="min-width:${w || 90}px">&nbsp;</span>`;
  const din = v => num(v) > 0 ? `R$ ${brl(num(v))}` : "";
  const dataExt = iso => { if (!iso) return ""; const [y, m, dd] = iso.split("-"); return `${+dd} de ${DT.MESES[+m - 1]} de ${y}`; };

  function contratoLocacaoHTML(d, assinaturaDannis){
    const L = CONTRATADO, ok = d.check || [];
    const n = (() => { let k = 0; return () => String(++k).padStart(2, "0"); })();
    const cl = (t) => `<p class="ct-cl"><b>Cláusula ${n()}.</b> ${t}</p>`;
    const prazo = d.lcFim
      ? `de ${linha(fmtData(d.lcInicio), 80)} a ${linha(fmtData(d.lcFim), 80)}`
      : `a partir de ${linha(fmtData(d.lcInicio), 80)}, por prazo indeterminado`;
    const ass = assinaturaDannis && /^data:image\/(png|jpeg);base64,/.test(assinaturaDannis);
    return `<article class="contrato">
      <div class="ct-topo"><img src="logo.png" alt="Danni's Tur"><div>${L.razao}<br>CNPJ ${L.cnpj}<br>${L.sede}</div></div>
      <h4>CONTRATO DE LOCAÇÃO DE VEÍCULO</h4>
      <p>Pelo presente instrumento particular, de um lado, como <b>LOCADORA</b>, ${L.razao} (nome fantasia ${L.fantasia}), inscrita no CNPJ sob o nº ${L.cnpj}, com sede à ${L.sede}, proprietária do veículo abaixo descrito; e, de outro lado, como <b>LOCATÁRIO</b>, ${linha(d.lcNome, 220)}, ${linha(d.lcNac, 80)}, ${linha(d.lcCivil, 80)}, ${linha(d.lcProf, 140)}, inscrito(a) no RG nº ${linha(d.lcRg, 90)} e no CPF nº ${linha(d.lcCpf, 110)}, portador(a) da CNH nº ${linha(d.lcCnh, 100)}, categoria ${linha(d.lcCnhCat, 30)}, válida até ${linha(fmtData(d.lcCnhVal), 70)}, residente e domiciliado(a) em ${linha(d.lcEnd, 200)}, ${linha(d.lcCidade, 90)}, celular ${linha(d.lcTel, 100)}${d.lcEmail ? `, e-mail ${linha(d.lcEmail)}` : ""}; têm entre si justo e contratado o seguinte:</p>

      <h4>DO VEÍCULO</h4>
      <div class="ct-veic">
        <div><small>Marca / modelo</small>${esc(d.lcModelo)}</div><div><small>Placa</small>${esc(d.lcPlaca)}</div><div><small>Cor</small>${esc(d.lcCor)}</div>
        <div><small>Ano / modelo</small>${esc(d.lcAno) || "&nbsp;"}</div><div><small>RENAVAM</small>${esc(d.lcRenavam) || "&nbsp;"}</div><div><small>Chassi</small>${esc(d.lcChassi) || "&nbsp;"}</div>
        <div><small>KM na entrega</small>${esc(d.lcKm) || "&nbsp;"}</div><div><small>Combustível na entrega</small>${esc(d.lcComb) || "&nbsp;"}</div><div><small>Data da entrega</small>${fmtData(d.lcRetira) || "&nbsp;"}</div>
      </div>

      <h4>CLÁUSULAS</h4>
      ${cl(`<b>Objeto.</b> A LOCADORA dá em locação ao LOCATÁRIO o veículo descrito acima${d.lcLugares ? `, com ${esc(d.lcLugares)} lugares` : ""}, em boas condições de uso, conservação e funcionamento, conforme o checklist de entrega que faz parte deste contrato.`)}
      ${cl(`<b>Prazo.</b> A locação vale ${prazo}. Qualquer das partes pode encerrá-la avisando a outra por escrito (WhatsApp vale) com ${linha(d.lcAviso || "30", 30)} dias de antecedência, sem multa, ressalvadas as hipóteses de rescisão imediata deste contrato.`)}
      ${cl(`<b>Valor e pagamento.</b> ${
        d.lcPer === "km" ? `O LOCATÁRIO pagará à LOCADORA ${linha(din(d.lcValor), 90)} por quilômetro rodado. Os quilômetros são apurados pelo odômetro do veículo: a diferença entre o KM na entrega (ou no último fechamento) e o KM no fechamento seguinte ou na devolução. O pagamento será feito ${linha(d.lcVenc, 110)}, por Pix ou outra forma combinada por escrito. O LOCATÁRIO não pode mexer no odômetro; se ele parar ou for alterado, a LOCADORA cobra pela média diária de KM do período anterior, sem prejuízo das demais penalidades.`
        : d.lcPer === "dia" ? `O LOCATÁRIO pagará à LOCADORA a diária de ${linha(din(d.lcValor), 90)}, contada por dia (ou fração de dia) em que o veículo ficar com o LOCATÁRIO, da retirada até a devolução. O pagamento será feito ${linha(d.lcVenc, 110)}, por Pix ou outra forma combinada por escrito.`
        : `O LOCATÁRIO pagará à LOCADORA o aluguel de ${linha(din(d.lcValor), 90)} por ${esc(d.lcPer || "mês")}, com vencimento ${linha(d.lcVenc, 110)}, por Pix ou outra forma combinada por escrito.`
      } O atraso gera multa de ${linha(d.lcMulta || "2", 25)}% sobre o valor em atraso, juros de 1% ao mês e correção monetária, e, passados 10 (dez) dias de atraso, a LOCADORA pode encerrar a locação e retomar o veículo.`)}
      ${num(d.lcCaucao) > 0 ? cl(`<b>Caução.</b> Na assinatura, o LOCATÁRIO entrega à LOCADORA a caução de ${linha(din(d.lcCaucao))}, que será devolvida em até 10 (dez) dias após a devolução do veículo, descontados aluguéis em aberto, multas, danos, combustível faltante e quaisquer despesas de responsabilidade do LOCATÁRIO.`) : ""}
      ${d.lcPer !== "km" && num(d.lcKmLim) > 0 ? cl(`<b>Quilometragem.</b> A locação inclui até ${linha(d.lcKmLim, 50)} km por mês. O que passar disso será cobrado a ${linha(din(d.lcKmExc), 70)} por km excedente, junto com o aluguel seguinte.`) : ""}
      ${cl(`<b>Uso do veículo.</b> O veículo só pode ser dirigido pelo LOCATÁRIO, devidamente habilitado na categoria exigida para o veículo e para a atividade que exercer. É proibido: sublocar, emprestar ou ceder o veículo a terceiros; usá-lo em atividades ilícitas, competições ou para rebocar; transportar passageiros acima da lotação ou sem cinto; dirigir sob efeito de álcool ou drogas; e alterar as características do veículo (adesivos, equipamentos, bancos) sem autorização por escrito da LOCADORA.`)}
      <div class="ct-lic">${cl(`<b>VEÍCULO SEM LICENÇA – RESPONSABILIDADE TOTAL DO LOCATÁRIO.</b> O LOCATÁRIO declara estar ciente de que o veículo é entregue <b>SEM QUALQUER LICENÇA, AUTORIZAÇÃO, ALVARÁ, VISTORIA OU CADASTRO</b> para transporte escolar, fretamento ou qualquer transporte remunerado de passageiros, junto a qualquer órgão (prefeitura, DETRAN, ARTESP, DER ou outro). Caso queira usá-lo nessas atividades, cabe <b>exclusivamente ao LOCATÁRIO</b>, por sua conta e antes de qualquer uso, obter e manter todas as licenças e autorizações exigidas. <b>Se, por qualquer motivo, o veículo for parado, multado, retido, removido ou APREENDIDO por transporte irregular ou por qualquer outra infração cometida durante a locação, a responsabilidade será TOTAL e EXCLUSIVA do LOCATÁRIO</b>, que pagará, em até 5 (cinco) dias do aviso, todas as multas, taxas, guincho, diárias de pátio, despesas de liberação e honorários, além do aluguel de todo o período em que o veículo ficar parado, e responderá sozinho perante as autoridades, os passageiros, seus responsáveis e quaisquer terceiros, isentando a LOCADORA de qualquer responsabilidade.`)}</div>
      ${cl(`<b>Multas e pontos.</b> As infrações de trânsito cometidas durante a locação são de responsabilidade do LOCATÁRIO, que pagará as multas e aceitará ser indicado como condutor infrator, assinando o que for preciso para a transferência dos pontos. Multas pagas pela LOCADORA serão reembolsadas pelo LOCATÁRIO em até 5 (cinco) dias do aviso.`)}
      ${cl(`<b>Conservação e manutenção.</b> O LOCATÁRIO cuidará do veículo como se fosse seu, mantendo-o limpo, calibrado e abastecido, e avisará a LOCADORA de qualquer defeito ou luz de alerta no painel. A manutenção preventiva e o desgaste natural de peças ficam por conta da LOCADORA, em oficina indicada por ela; os consertos causados por mau uso, imprudência, falta de aviso ou acidente durante a locação ficam por conta do LOCATÁRIO. Nenhum conserto pode ser feito sem autorização da LOCADORA.`)}
      ${cl(`<b>Acidentes, roubo e danos.</b> O LOCATÁRIO responde por todos os danos causados ao veículo, a passageiros e a terceiros durante a locação, inclusive a franquia do seguro, se houver. Em caso de acidente, furto ou roubo, deve avisar a LOCADORA imediatamente e registrar boletim de ocorrência no mesmo dia.`)}
      ${cl(`<b>Devolução.</b> Ao fim da locação, o veículo será devolvido no endereço da LOCADORA, no mesmo estado do checklist de entrega (salvo o desgaste natural) e com o mesmo nível de combustível, registrando-se a quilometragem de devolução. O atraso na devolução gera a cobrança de diária proporcional ao aluguel, sem prejuízo de a LOCADORA retomar o veículo.`)}
      ${cl(`<b>Rescisão imediata.</b> O descumprimento de qualquer cláusula, em especial o uso proibido, a sublocação, a falta de pagamento ou o uso sem as licenças exigidas, permite à LOCADORA encerrar a locação na hora e retomar o veículo, devendo o LOCATÁRIO devolvê-lo em até 24 (vinte e quatro) horas, sem prejuízo do pagamento do que for devido.`)}
      ${cl(`<b>Checklist.</b> O LOCATÁRIO declara que conferiu o veículo junto com a LOCADORA no ato da entrega e que o recebe no estado descrito no checklist abaixo, que faz parte deste contrato.`)}
      ${cl(`<b>Assinatura eletrônica.</b> As partes concordam que este contrato pode ser assinado eletronicamente (inclusive pela assinatura gov.br) e reconhecem a validade dessa forma de assinatura.`)}
      ${cl(`<b>Foro.</b> Fica eleito o foro da Comarca de Sumaré/SP para resolver qualquer questão deste contrato.`)}

      <div class="html2pdf__page-break"></div>
      <h4>CHECKLIST DE ENTREGA</h4>
      <div class="ct-checklist">${CHECKLIST.map((t, i) => `<span>(${ok[i] ? "X" : "&nbsp;&nbsp;"}) ${esc(t)}</span>`).join("")}</div>
      <p><b>Avarias e observações:</b> ${d.lcAvarias ? esc(d.lcAvarias) : "nenhuma anotada."}</p>
      <p>${d.confirma ? "☑" : "☐"} <b>O LOCATÁRIO conferiu o veículo junto com a LOCADORA e confirma o checklist acima.</b> KM na entrega: ${linha(d.lcKm, 70)} · Combustível: ${linha(d.lcComb, 60)}</p>
      ${d.lcPer === "km" ? `<p>KM na devolução: ${linha("", 90)} · KM rodados: ${linha("", 80)} · Total a pagar: ${linha("", 90)}</p>` : ""}

      <p>Sumaré, ${d.lcRetira ? dataExt(d.lcRetira) : `<span class="branco" style="min-width:160px">&nbsp;</span>`}.</p>
      <div class="ct-ass${ass ? " assinado" : ""}">
        <div>${ass ? `<img class="ct-assinatura" src="${assinaturaDannis}" alt="Assinatura da Danni's Tur">` : ""}LOCADORA<br><b>${L.razao}</b><br>${L.fantasia} · CNPJ ${L.cnpj}</div>
        <div>LOCATÁRIO<br><b>${esc(d.lcNome) || "&nbsp;"}</b><br>CPF ${esc(d.lcCpf) || "&nbsp;"}</div>
      </div>
    </article>`;
  }

  function valida(d){
    const falta = [];
    if (d.lcNome.split(/\s+/).length < 2) falta.push("nome completo");
    if (d.lcCpf.replace(/\D/g, "").length !== 11) falta.push("CPF");
    if (d.lcTel.replace(/\D/g, "").length < 10) falta.push("celular");
    if (!d.lcInicio) falta.push("início da locação");
    if (!(num(d.lcValor) > 0)) falta.push(d.lcPer === "km" ? "valor do KM" : d.lcPer === "dia" ? "valor da diária" : "valor do aluguel");
    if (!d.confirma) falta.push("confirmação do checklist");
    return falta;
  }
  const minhaAss = () => (window.__dtMinhaAssinatura && $("#lcMinhaAss").checked) ? window.__dtMinhaAssinatura : "";
  const nomeArq = d => `Contrato de locação - ${d.lcModelo} ${d.lcPlaca} - ${d.lcNome}.pdf`.replace(/[\\/:*?"<>|]/g, "");
  const msgZap = d => `Olá, ${d.lcNome.split(" ")[0]}! 🚐 Segue o contrato de locação da van ${d.lcModelo} placa ${d.lcPlaca}.\n\nPor favor, assine pelo gov.br (é grátis): abra assinador.iti.br, entre com a sua conta gov.br (prata ou ouro), envie o PDF, assine, baixe o arquivo assinado e me mande aqui.\n\nQualquer dúvida é só chamar. Obrigado!`;

  $("#lcPrevia").onclick = () => {
    const d = le(); $("#lcFolha").hidden = false; $("#lcFolha").innerHTML = contratoLocacaoHTML(d, minhaAss());
    $("#lcFolha").scrollIntoView({behavior: "smooth", block: "start"});
  };

  async function gerarPdf(d){
    await DT.carregaPdfLib();
    const caixa = document.createElement("div");
    caixa.style.cssText = "position:absolute;left:0;top:0;width:703px;background:#fff;z-index:-1;pointer-events:none";   // 703px = largura útil da A4 com margem de 12 mm
    caixa.className = "pdf-gerar"; caixa.innerHTML = contratoLocacaoHTML(d, minhaAss());
    caixa.firstElementChild.classList.add("pdf");
    document.body.appendChild(caixa);
    try{
      await Promise.all([...caixa.querySelectorAll("img")].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })).filter(Boolean));
      const y0 = window.scrollY; window.scrollTo(0, 0);   // o gerador fotografa a partir do topo da página
      try {
      return await html2pdf().set({margin:[10,12,10,12], image:{type:"jpeg", quality:0.92}, html2canvas:{scale:2, useCORS:true, backgroundColor:"#ffffff", scrollX:0, scrollY:0},
        jsPDF:{unit:"mm", format:"a4", orientation:"portrait"}, pagebreak:{mode:["css","legacy"], avoid:[".ct-cl",".ct-ass","h4",".ct-veic",".ct-checklist",".ct-lic",".ct-checklist span"]}}).from(caixa.firstElementChild).outputPdf("blob");
      } finally { window.scrollTo(0, y0); }
    } finally { caixa.remove(); }
  }

  $("#lcEnviar").onclick = async () => {
    const d = le(), falta = valida(d); $("#lcErr").textContent = ""; $("#lcOk").textContent = "";
    if (falta.length){ $("#lcErr").textContent = "Falta: " + falta.join(", ") + "."; return; }
    const b = $("#lcEnviar"); b.disabled = true; b.querySelector("span").textContent = "Gerando o PDF…";
    try{
      const blob = await gerarPdf(d), arq = new File([blob], nomeArq(d), {type: "application/pdf"});
      if (navigator.canShare && navigator.canShare({files: [arq]})){
        try { await navigator.share({files: [arq], text: msgZap(d)}); $("#lcOk").textContent = "Contrato compartilhado. Escolha a conversa do locatário no WhatsApp."; return; }
        catch(e){ if (e && e.name === "AbortError") return; }
      }
      // computador: baixa o PDF e abre a conversa do locatário com a mensagem pronta (é só anexar)
      const w = window.open(zapLink(d.lcTel, msgZap(d)), "_blank", "noopener");
      const u = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = u; a.download = nomeArq(d); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000);
      $("#lcOk").textContent = "PDF baixado e conversa do locatário aberta" + (w ? "" : " (se não abriu, libere pop-ups)") + ": é só anexar o arquivo e enviar.";
    }catch(e){ $("#lcErr").textContent = "Não consegui gerar o PDF agora. Confira a internet e tente de novo."; }
    finally { b.disabled = false; b.querySelector("span").textContent = "📄 Gerar PDF e mandar no WhatsApp do locatário"; }
  };

  /* ---------- navegação ---------- */
  abre.onclick = () => {
    $("#painel").hidden = true; sec.hidden = false; window.scrollTo(0, 0);
    $("#lcAssWrap").hidden = !window.__dtMinhaAssinatura;
  };
  $("#lcVoltar").onclick = () => { sec.hidden = true; $("#painel").hidden = false; };

  window.DT.contratoLocacaoHTML = contratoLocacaoHTML;   // pra testes
})();
