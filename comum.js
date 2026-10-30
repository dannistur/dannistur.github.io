/* Danni's Tur · funções comuns (renovação, contrato do cliente e área Danni's) */
(function(){
  "use strict";

  /* Endereço do servidor (Apps Script). Fica vazio até a planilha ser configurada. */
  const API = "https://script.google.com/macros/s/AKfycbyHx9esXdbXC2xlKoavjhv3neJMw7M59cO9pm-rglWzvLLa5tPJrIEy3n4SOAsYFNuvIw/exec";
  const ZAP_DANNIS = "5519997781210";

  const CONTRATADO = {
    razao:"DANIEL ALVES GESUALDO – ME", fantasia:"DANNI'S TUR", cnpj:"18.366.932/0001-18",
    sede:"Rua Virginia Viel Campos Dall Horto, 39 – Vila Yolanda – Sumaré/SP"
  };

  /* escolas: nome + cor do cartão (clara = texto escuro) */
  const ESCOLAS = [
    {id:"educativa",    nome:"Educativa",              cor:"#2f5bd3"},
    {id:"alkimim",      nome:"Alkimim",                cor:"#e0690f"},
    {id:"candido",      nome:"Cândido",                cor:"#ffc61a", clara:true},
    {id:"borboletinha", nome:"Borboletinha Azul",      cor:"#1aa0e6"},
    {id:"crescendo",    nome:"Crescendo e Aprendendo", cor:"#24884a"},
    {id:"network",      nome:"Network",                cor:"#5b3fc4"},
    {id:"franceschini", nome:"João Franceschini",      cor:"#712473"},
    {id:"sonho",        nome:"Sonho Dourado",          cor:"#d9a400", clara:true},
    {id:"algodao",      nome:"Algodão Doce",           cor:"#e84c8b"},
    {id:"proeducare",   nome:"Pró Educare",            cor:"#c2332b"},
    {id:"sabidinho",    nome:"Sabidinho",              cor:"#f4791f"},
    {id:"pio12",        nome:"Pio XII",                cor:"#1d6fb8"},
    {id:"vito",         nome:"Vito",                   cor:"#1d8a4e"},
    {id:"fam",          nome:"Faculdade FAM",          cor:"#2b2630"}
  ];

  /* tabela de preços 2027 (mensalidade): ida e volta, só ida, só volta e 2 irmãos no mesmo horário (ida e volta).
     Escola sem preço aqui (FAM, outra escola) → a família digita o valor combinado. */
  const P = (iv, uma, irmaos) => ({iv, ida: uma, volta: uma, irmaos});
  const PRECOS = {
    educativa: P(250, 200, 460), network: P(250, 200, 460), proeducare: P(250, 200, 460),
    alkimim: P(250, 200, 440), franceschini: P(250, 200, 440),
    candido: P(225, 185, 400),
    sabidinho: P(220, 185, 400), borboletinha: P(220, 185, 400), vito: P(220, 185, 400),
    crescendo: P(250, 200, 430), algodao: P(250, 200, 430), pio12: P(250, 200, 430),
    sonho: P(230, 190, null)
  };
  /* Faculdade FAM: o preço depende do bairro de embarque (ida e volta) */
  const BAIRROS_FAM = [
    {preco: 370, bairros: ["Centro", "Jardim Makarenko", "Vila Miranda", "Jardim Marquisolo", "Casarão", "Parque Franceschini", "Planalto do Sol", "Ravanhani", "Parque da Floresta"]},
    {preco: 360, bairros: ["João Paulo II", "Consteca", "Voughan", "Jardim das Palmeiras", "Santa Madalena", "João de Vasconcellos", "Vila Yolanda", "Zilda Natel", "Portal do Lago"]}
  ];
  const chaveBairro = b => String(b || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(jardim|jd|vila|vl|parque|pq|residencial|res|conjunto|bairro)\b\.?/g, " ").replace(/\bii\b/g, "2").replace(/vaughan/g, "voughan").replace(/vasconcelos/g, "vasconcellos").replace(/[^a-z0-9]/g, "");
  const precoFam = bairro => { const k = chaveBairro(bairro); if (!k) return null; const g = BAIRROS_FAM.find(g => g.bairros.some(b => chaveBairro(b) === k)); return g ? g.preco : null; };
  const idEscola = nome => (ESCOLAS.find(e => e.nome === nome) || {}).id;
  const precoAluno = (pr, trajeto) => trajeto === "Só ida" ? pr.ida : trajeto === "Só volta" ? pr.volta : pr.iv;
  /* valor da mensalidade pela tabela: {valor, conta} ou null se algum aluno não tem preço na tabela */
  function precoTabela(alunos, bairro){
    if (!alunos || !alunos.length) return null;
    const pf = precoFam(bairro);
    const itens = alunos.map(a => ({a, pr: idEscola(a.escola) === "fam" ? (pf && a.trajeto === "Ida e volta" ? P(pf, null, null) : null) : PRECOS[idEscola(a.escola)]}));
    if (itens.some(i => !i.pr)) return null;
    const usados = new Set(), partes = [];
    let valor = 0;
    // 2 irmãos na mesma escola, mesmo período, ida e volta → preço de irmãos
    for (let i = 0; i < itens.length; i++){
      if (usados.has(i) || itens[i].a.trajeto !== "Ida e volta") continue;
      const j = itens.findIndex((x, k) => k > i && !usados.has(k) && x.a.trajeto === "Ida e volta" && x.a.escola === itens[i].a.escola && x.a.periodo === itens[i].a.periodo);
      if (j < 0) continue;
      if (itens[i].pr.irmaos == null) return null;   // escola sem preço de irmãos: valor combinado
      usados.add(i); usados.add(j); valor += itens[i].pr.irmaos; partes.push(`2 irmãos ${itens[i].a.escola} R$ ${brl(itens[i].pr.irmaos)}`);
    }
    itens.forEach((it, i) => { if (usados.has(i)) return; const v = precoAluno(it.pr, it.a.trajeto); valor += v; partes.push(`${it.a.escola} ${it.a.trajeto.toLowerCase()} R$ ${brl(v)}`); });
    return {valor, conta: partes.join(" + ")};
  }

  const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const INI = 2027*12+1, FIM = 2028*12+0;            // fevereiro/2027 → janeiro/2028
  const nomeMes = idx => `${MESES[idx%12]} de ${Math.floor(idx/12)}`;

  const esc = s => String(s==null?"":s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const fmtData = d => d ? String(d).slice(0,10).split("-").reverse().join("/") : "";
  const brl = n => (isFinite(n) && n>0) ? Number(n).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) : "";
  const num = v => typeof v==="number" ? v : (parseFloat(String(v||"").replace(/\./g,"").replace(",",".")) || 0);
  function hojeISO(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  function vigencia(isoCadastro, inicioIdx){
    let st = (inicioIdx!=null && inicioIdx!=="") ? +inicioIdx : null;
    if (st == null || isNaN(st)){
      const [y,m] = (isoCadastro||hojeISO()).split("-").map(Number);
      st = Math.max(INI, y*12+(m-1));
    }
    st = Math.min(Math.max(st, INI), FIM);
    return {ini:st, meses:FIM-st+1, de:nomeMes(st), ate:nomeMes(FIM)};
  }
  function dataExtenso(iso){
    if (!iso) return `Sumaré, <span class="branco" style="min-width:40px">&nbsp;</span> de <span class="branco" style="min-width:110px">&nbsp;</span> de <span class="branco" style="min-width:50px">&nbsp;</span>.`;
    const [y,m,d] = String(iso).slice(0,10).split("-");
    return `Sumaré, ${+d} de ${MESES[+m-1]} de ${y}.`;
  }
  function idade(nasc, ref){
    if (!nasc) return "";
    const [y,m,d] = nasc.split("-").map(Number); const r = ref || new Date();
    let a = r.getFullYear()-y; if (r.getMonth()+1 < m || (r.getMonth()+1===m && r.getDate()<d)) a--; return a;
  }
  function maskCpf(v){ v=v.replace(/\D/g,"").slice(0,11); return v.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2"); }
  function maskTel(v){ v=v.replace(/\D/g,"").slice(0,11); if(v.length<=2) return v.length?"("+v:v; if(v.length<=6) return `(${v.slice(0,2)}) ${v.slice(2)}`; if(v.length<=10) return `(${v.slice(0,2)}) ${v.slice(2,6)}-${v.slice(6)}`; return `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`; }
  function cpfValido(c){
    c = String(c).replace(/\D/g,"");
    if (c.length!==11 || /^(\d)\1+$/.test(c)) return false;
    let s=0; for(let i=0;i<9;i++) s+= +c[i]*(10-i);
    let d1=(s*10)%11; if(d1===10) d1=0; if(d1!==+c[9]) return false;
    s=0; for(let i=0;i<10;i++) s+= +c[i]*(11-i);
    let d2=(s*10)%11; if(d2===10) d2=0; return d2===+c[10];
  }
  const soDigitos = t => String(t||"").replace(/\D/g,"");
  const zapLink = (tel, texto) => { let n = soDigitos(tel); if (n.length<=11) n = "55"+n; return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`; };

  /* "Ajustado pela Danni's Tur em 2026-10-29T08:40:12 · ..." → "Ajustado pela Danni's Tur em 29/10/2026 às 08:40 · ..." */
  const fmtAjuste = t => String(t || "").replace(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?/, (_, d, h) => `${fmtData(d)} às ${h}`);
  const valorAceito = f => f.aceiteValores && Number(f.aceiteValores.mensalidade) ? `R$ ${brl(Number(f.aceiteValores.mensalidade))} por mês` : "";

  /* ---------- contrato (um por família, todos os irmãos) ---------- */
  function contratoHTML(f, x){
    x = x || {};
    const alunos = f.alunos || [];
    const v = vigencia(f.dataCadastro, x.ini);
    const varios = alunos.length > 1;
    const B = (val, w) => val ? `<span class="preenchido">${esc(val)}</span>` : `<span class="branco" style="min-width:${w||90}px">&nbsp;</span>`;
    const mk = (t,val) => `(<span class="ct-marca">${t===val?"X":"&nbsp;"}</span>) ${val.toUpperCase()}`;
    const escolas = [...new Set(alunos.map(a=>a.escola))];
    const bloco = (a,i) => `
        <div class="c4"><small>${varios?`Aluno(a) ${i+1}`:"Aluno(a)"}</small>${esc(a.nome)}</div>
        <div class="c2"><small>Data de nasc.</small>${fmtData(a.nasc)}</div>
        <div class="c4"><small>Faculdade / colégio</small>${esc(a.escola)}</div>
        <div class="c2"><small>Período</small>${esc(a.periodo)}</div>
        <div class="c6">${mk(a.trajeto||"Ida e volta","Ida e volta")} &nbsp; ${mk(a.trajeto||"Ida e volta","Só volta")} &nbsp; ${mk(a.trajeto||"Ida e volta","Só ida")}</div>`;
    const cl01 = varios
      ? `O transportador se compromete a transportar os alunos indicados na ficha acima (${alunos.map(a=>`<span class="preenchido">${esc(a.nome)}</span>`).join(", ")}) de sua residência ao${escolas.length>1?"s respectivos colégios/faculdades":" colégio/faculdade"} <span class="preenchido">${escolas.map(esc).join(" e ")}</span>, dentro do horário pré-estabelecido e no ano letivo de 2027.`
      : `O transportador se compromete a transportar o aluno de sua residência ao colégio/faculdade <span class="preenchido">${esc((alunos[0]||{}).escola)}</span>, dentro do horário pré-estabelecido e no ano letivo de 2027.`;
    return `<article class="contrato">
      <div class="ct-topo"><img src="logo.png" alt="Danni's Tur"><div>${CONTRATADO.razao}<br>CNPJ ${CONTRATADO.cnpj}<br>${CONTRATADO.sede}</div></div>
      <div class="ct-ficha">
        ${alunos.map(bloco).join("")}
        <div class="c6"><small>Endereço</small>${esc(f.rua)}</div>
        <div class="c2"><small>Bairro</small>${esc(f.bairro)}</div>
        <div class="c2"><small>Cidade</small>${esc(f.cidade)}</div>
        <div class="c2"><small>CEP</small>${esc(f.cep)}</div>
        <div class="c2"><small>Fone celular</small>${esc(f.celular)}</div>
        <div class="c2"><small>Fone casa</small>${esc(f.foneCasa)}</div>
        <div class="c2"><small>Outros</small>${esc(f.outroFone)}</div>
        <div class="c6"><small>Ano letivo</small>2027</div>
      </div>
      <h4>CONTRATO DE PRESTAÇÃO DE SERVIÇO</h4>
      <p>Pelo presente instrumento particular de contrato de prestação de serviços, de um lado, como <b>CONTRATANTE</b>, <span class="preenchido">${esc(f.responsavel)}</span>, CPF <span class="preenchido">${esc(f.cpf)}</span>, RG <span class="preenchido">${esc(f.rg)}</span>, neste ato representado pelo responsável legal, e, como <b>CONTRATADO</b>, ${CONTRATADO.razao} (nome fantasia ${CONTRATADO.fantasia}), CNPJ ${CONTRATADO.cnpj}, com sede à ${CONTRATADO.sede}.</p>
      <h4>CLÁUSULAS CONSTANTES NO CONTRATO</h4>
      <p class="ct-cl"><b>Cláusula 01.</b> ${cl01}</p>
      <p class="ct-cl"><b>Cláusula 02.</b> O presente contrato terá vigência durante <span class="preenchido">${v.meses}</span> meses, de <span class="preenchido">${v.de}</span> a <span class="preenchido">${v.ate}</span>.</p>
      <p class="ct-cl"><b>Cláusula 03.</b> O valor do transporte será de R$ ${B(brl(num(x.total)),90)} à vista ou dividido em ${B(x.parcelas,40)} parcelas de R$ ${B(brl(num(x.mensalidade)),90)}, que poderá ser efetuado do dia 1 ao dia 10 de cada mês. Caso haja atraso, será cobrada multa de 5% sobre o valor da mensalidade, e a possível suspensão da prestação dos serviços após 15 dias de atraso, ou emissão de boleto.</p>
      <p class="ct-cl"><b>Cláusula 04.</b> O contratado efetuará o transporte do aluno(a) de segunda à sexta-feira, nos horários normais de aula, não buscando mais cedo em nenhuma hipótese, não se responsabilizando por eventuais paralisações de funcionários e professores da escola/faculdade.</p>
      <p class="ct-cl"><b>Cláusula 05.</b> O contratante fica obrigado a fazer o uso do cinto de segurança, como exige a legislação de trânsito em vigor, ficando sob total responsabilidade o pagamento da multa que possa ocorrer pela sua desobediência dessa obrigatoriedade.</p>
      <p class="ct-cl"><b>Cláusula 06.</b> O contratado se responsabiliza pela manutenção do veículo, fazendo tudo para mantê-lo nas normas de segurança. Caso haja algum tipo de problema com o veículo, o contratado se responsabiliza em colocar outro no lugar, em perfeitas condições de uso; entretanto, não se obriga a transitar por ruas ou avenidas que não ofereçam condições normais de tráfego, ou itinerários que possam causar danos ao veículo.</p>
      <p class="ct-cl"><b>Cláusula 07.</b> É obrigação dos pais avisar quando o filho não for para a escola, ou quando os pais retirarem os filhos mais cedo na escola. É dever do contratante manter a harmonia dentro do veículo, evitando assim o desrespeito para os demais passageiros. O não cumprimento desta cláusula fica a critério do contratado rescindir o contrato de imediato, cobrando a multa por rescisão do mesmo.</p>
      <p class="ct-cl"><b>Cláusula 08.</b> O valor da mensalidade somente será alterado quando houver aumento dos combustíveis e derivados, aumento de salário ou adoção de nova política econômica.</p>
      <p class="ct-cl"><b>Cláusula 09.</b> O aluno deverá estar pronto no local combinado para que não haja atraso no horário estabelecido pelo contratado, evitando assim prejudicar os demais passageiros, com tolerância de 1 minuto na casa e 5 minutos na saída da escola.</p>
      <p class="ct-cl"><b>Cláusula 10.</b> O cancelamento do transporte implicará em multa de 2 (duas) mensalidades vigentes por parte do contratante; indicando outro aluno, e esse aluno fechar, ficará isento da multa. No caso de a quebra ser por parte do contratado, este irá pagar o valor de uma mensalidade ou terá que disponibilizar outro transporte para o contratante.</p>
      <p class="ct-cl"><b>Cláusula 11.</b> Os meses de férias serão cobrados integralmente conforme as parcelas, independentemente do mês contratado (não trabalhamos em clube de férias).</p>
      <p class="ct-cl"><b>Cláusula 12.</b> Falta do aluno por doenças, viagens, passeios ou motivos particulares não gera desconto na mensalidade, pois a vaga permanecerá reservada e o transporte rodando normalmente.</p>
      <p class="ct-cl"><b>Cláusula 13.</b> As partes admitem como válida, nos termos do <span style="white-space:nowrap">art. 10, §2º,</span> da <span style="white-space:nowrap">Medida Provisória nº 2.200-2/2001</span>, a contratação por aceite eletrônico no aplicativo da Danni's Tur, com identificação do CONTRATANTE por CPF e data de nascimento do aluno e registro de data, hora e aparelho utilizado.</p>
      ${String(f.obs||"").trim() ? `<div class="ct-obs"><b>OBSERVAÇÕES INFORMADAS PELO CONTRATANTE NO CADASTRO</b><p>${esc(String(f.obs).trim()).replace(/\n/g,"<br>")}</p></div>` : ""}
      <p class="ct-cl"><b>Cláusula 14.</b> Fica eleito o foro da Comarca de Sumaré, com prevalência sobre qualquer outro, por mais privilegiado que seja, para dirimir todas as dúvidas que possam advir de qualquer cláusula deste contrato. E, por estarem assim justos e contratados e de pleno acordo com todas as cláusulas estipuladas, assinam o presente instrumento particular em duas vias de igual teor e forma e sem rasura.</p>
      <p>${dataExtenso(x.dataContrato)}</p>
      <p><b>Ciente e de acordo,</b></p>
      <div class="ct-ass${f.assinatura || f.assinaturaDannis ? " assinado" : ""}">
        <div>${f.assinatura && /^data:image\/(png|jpeg);base64,/.test(f.assinatura) ? `<img class="ct-assinatura" src="${f.assinatura}" alt="Assinatura de ${esc(f.responsavel)}">` : ""}CONTRATANTE<br><b>${esc(f.responsavel)}</b><br>CPF ${esc(f.cpf)}<br>Reconheço e pagarei a dívida representada.${f.aceiteValido && f.aceiteEm ? `<br><small class="ct-ass-info">Aceito eletronicamente no app em ${fmtData(String(f.aceiteEm).slice(0,10))} às ${String(f.aceiteEm).slice(11,16)}</small>` : ""}${f.assinatura ? `<br><small class="ct-ass-info">Assinado eletronicamente na tela${f.assinadoEm ? ` em ${fmtData(String(f.assinadoEm).slice(0,10))} às ${String(f.assinadoEm).slice(11,16)}` : ""}</small>` : ""}</div>
        <div>${f.assinaturaDannis && /^data:image\/(png|jpeg);base64,/.test(f.assinaturaDannis) ? `<img class="ct-assinatura" src="${f.assinaturaDannis}" alt="Assinatura da Danni's Tur">` : ""}CONTRATADO<br><b>${CONTRATADO.razao}</b><br>${CONTRATADO.fantasia} · CNPJ ${CONTRATADO.cnpj}${f.assinaturaDannis && f.assinadoDannisEm ? `<br><small class="ct-ass-info">Assinado eletronicamente em ${fmtData(String(f.assinadoDannisEm).slice(0,10))} às ${String(f.assinadoDannisEm).slice(11,16)}</small>` : ""}</div>
      </div>
      <p class="ct-frase">“A boa reputação vale mais que grandes riquezas.”</p>
      ${f.aceiteValido && f.aceiteEm ? `<div class="ct-registro">
        <b>REGISTRO DO ACEITE ELETRÔNICO (Cláusula 13)</b>
        <span>Aceito por <b>${esc(f.responsavel)}</b>, CPF ${esc(f.cpf)}, em ${fmtData(String(f.aceiteEm).slice(0,10))} às ${String(f.aceiteEm).slice(11,19)} (horário de Brasília), no aplicativo da Danni's Tur, após identificação por CPF e data de nascimento do aluno.</span>
        ${f.aceiteInfo ? `<span>Aparelho: ${esc(String(f.aceiteInfo).split(" · ").slice(2).join(" · ") || "-")}</span>` : ""}
        <span>Código de integridade do aceite: <b class="ct-codigo">${esc(f.aceiteCodigo || "")}</b>${valorAceito(f) ? ` (versão aceita: ${valorAceito(f)})` : ""}.</span>
        ${f.ajusteInfo ? `<span><b>${esc(fmtAjuste(f.ajusteInfo))}.</b> Versão final enviada ao CONTRATANTE pelo WhatsApp. Código desta versão: <b class="ct-codigo">${esc(f.versaoCodigo || "")}</b>.</span>` : ""}
      </div>` : ""}
    </article>`;
  }

  /* PDF do contrato (Blob), usado no "Meu contrato" e no botão verde da Área Danni's */
  function carregaPdfLib(){
    if (window.html2pdf) return Promise.resolve();
    return new Promise((ok, erro) => { const sc = document.createElement("script"); sc.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"; sc.onload = ok; sc.onerror = erro; document.head.appendChild(sc); });
  }
  async function contratoPDF(f, x){
    await carregaPdfLib();
    const caixa = document.createElement("div");
    // fica no canto da tela, atrás do conteúdo (z-index negativo): longe da tela o gerador "fotografa" cortado
    caixa.style.cssText = "position:fixed;left:0;top:0;width:720px;background:#fff;z-index:-1;pointer-events:none";
    caixa.className = "pdf-gerar";
    caixa.innerHTML = contratoHTML(f, x);
    caixa.firstElementChild.classList.add("pdf");
    const reg = caixa.querySelector(".ct-registro"); if (reg) reg.remove();   // o registro do aceite vai numa página própria, desenhada abaixo
    document.body.appendChild(caixa);
    try{
      const imgs = [...caixa.querySelectorAll("img")].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })).filter(Boolean);
      await Promise.all(imgs);
      const pdf = await html2pdf().set({margin:[10,12,10,12], image:{type:"jpeg", quality:0.92}, html2canvas:{scale:2, useCORS:true, backgroundColor:"#ffffff", scrollX:0, scrollY:0, x:0, y:0, windowWidth:760, width:720},
        jsPDF:{unit:"mm", format:"a4", orientation:"portrait"}, pagebreak:{mode:["css"], avoid:[".ct-cl",".ct-ass","h4"]}}).from(caixa.firstElementChild).toPdf().get("pdf");
      if (f.aceiteValido && f.aceiteEm) paginaRegistro(pdf, f);
      return pdf.output("blob");
    } finally { caixa.remove(); }
  }
  /* página final do PDF: registro do aceite eletrônico (texto de verdade, dá pra copiar e pesquisar) */
  function paginaRegistro(pdf, f){
    const d = String(f.aceiteEm), data = fmtData(d.slice(0,10)), hora = d.slice(11,19);
    const aparelho = String(f.aceiteInfo || "").split(" · ").slice(2).join(" · ") || "-";
    pdf.addPage();
    const L = 16, W = 210 - 2 * L; let y = 22;
    pdf.setDrawColor(29, 138, 78); pdf.setFillColor(241, 250, 244);
    const linhas = [
      ["t", "REGISTRO DO ACEITE ELETRÔNICO (Cláusula 13)"],
      ["p", `Contrato de prestação de serviço de transporte escolar – ano letivo 2027 – ${CONTRATADO.razao} (${CONTRATADO.fantasia}), CNPJ ${CONTRATADO.cnpj}.`],
      ["p", `Aceito por ${f.responsavel}, CPF ${f.cpf}, em ${data} às ${hora} (horário de Brasília), no aplicativo da Danni's Tur, após identificação por CPF e data de nascimento do aluno.`],
      ["p", `Alunos: ${(f.alunos || []).map(a => a.nome).join(", ")}.`],
      ["p", `Aparelho utilizado: ${aparelho}`],
      ["c", `Código de integridade do aceite: ${f.aceiteCodigo || ""}${valorAceito(f) ? `  (versão aceita: ${valorAceito(f)})` : ""}`]
    ];
    if (f.ajusteInfo){
      linhas.push(["c", "AJUSTE DEPOIS DO ACEITE"]);
      linhas.push(["p", `${fmtAjuste(f.ajusteInfo)}. Esta versão final, com o ajuste, foi enviada ao CONTRATANTE pelo WhatsApp para conferência.`]);
      linhas.push(["c", `Código de integridade desta versão: ${f.versaoCodigo || ""}`]);
    }
    linhas.push(["p", "O código de integridade é calculado a partir das partes, dos alunos, do endereço, da vigência, dos valores e da versão das cláusulas. Ele muda se qualquer um desses dados for alterado."]);
    const blocos = linhas.map(([tipo, txt]) => {
      pdf.setFont("helvetica", tipo === "p" ? "normal" : "bold"); pdf.setFontSize(tipo === "t" ? 12 : 10);
      return {tipo, partes: pdf.splitTextToSize(txt, W - 12)};
    });
    const alt = blocos.reduce((h, b) => h + b.partes.length * (b.tipo === "t" ? 6 : 5) + 3, 8);
    pdf.roundedRect(L, y - 8, W, alt, 3, 3, "FD");
    blocos.forEach(b => {
      pdf.setFont("helvetica", b.tipo === "p" ? "normal" : "bold"); pdf.setFontSize(b.tipo === "t" ? 12 : 10);
      pdf.setTextColor(b.tipo === "p" ? 30 : 20, b.tipo === "p" ? 60 : 99, b.tipo === "p" ? 40 : 58);
      b.partes.forEach(t => { pdf.text(t, L + 6, y); y += b.tipo === "t" ? 6 : 5; });
      y += 3;
    });
  }
  const nomePDF = f => `Contrato Danni's Tur 2027 - ${f.responsavel}.pdf`.replace(/[\\/:*?"<>|]/g, "");

  /* link do contrato: curto pros códigos novos (…/contrato?K7M2PX9Q) */
  function linkContrato(token, base){
    const t = String(token||"");
    const rel = t.length <= 12 ? "contrato?" + t : "contrato.html?c=" + encodeURIComponent(t);
    return new URL(rel, base || location.href).href;
  }

  /* música de fundo: começa no primeiro toque na tela (menos no botão); se a pessoa desligar,
     fica desligada em todas as páginas e nas próximas visitas */
  /* música de fundo baixinha em todas as páginas (caixinha de música original, repete sem emenda).
     Começa no primeiro toque na tela (regra dos celulares); o botão "Som" liga/desliga e fica lembrado */
  function musicaFundo(){
    if (window.__dtMusica) return; window.__dtMusica = true;
    const VOL = .13;
    const ligado = () => { try { return localStorage.getItem("dt-som") !== "off"; } catch(e){ return true; } };
    const grava = v => { try { localStorage.setItem("dt-som", v); } catch(e){} };
    let bt = document.getElementById("som");
    if (!bt){
      bt = document.createElement("button"); bt.type = "button"; bt.className = "som"; bt.id = "som"; bt.setAttribute("aria-label", "Ligar ou desligar a música");
      bt.innerHTML = '<svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><svg class="on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span>Som</span>';
      document.body.appendChild(bt);
    }
    bt.setAttribute("aria-pressed", ligado());
    let ac = null, ganho = null, buf = null, fonte = null, baixando = false;
    async function baixa(){
      if (buf || baixando) return; baixando = true;
      try { const a = await (await fetch("musica-fofa.mp3?v=1")).arrayBuffer(); buf = await new Promise((ok, erro) => ac.decodeAudioData(a, ok, erro)); toca(); }
      catch(e){ baixando = false; }
    }
    function toca(){
      if (fonte || !buf || !ac || ac.state !== "running" || document.hidden) return;
      const f = ac.createBufferSource(); f.buffer = buf; f.loop = true; f.loopStart = 0; f.loopEnd = Math.min(buf.duration, 64 * 60 / 112);
      f.connect(ganho); f.start(); fonte = f;
    }
    function para(){ if (fonte){ try { fonte.stop(); } catch(e){} fonte = null; } }
    function acorda(){
      try {
        if (navigator.audioSession) navigator.audioSession.type = "playback";   // iPhone: toca mesmo no silencioso
        ac = ac || new (window.AudioContext || window.webkitAudioContext)();
        if (!ganho){ ganho = ac.createGain(); ganho.gain.value = ligado() ? VOL : 0; ganho.connect(ac.destination); }
        const pronto = () => { baixa(); toca(); };
        if (ac.state !== "running") ac.resume().then(pronto, () => {}); else pronto();
      } catch(e){}
    }
    ["pointerdown", "touchend", "click", "keydown"].forEach(ev => document.addEventListener(ev, acorda, {passive:true}));
    document.addEventListener("visibilitychange", () => { if (document.hidden) para(); else if (ac) acorda(); });
    bt.addEventListener("click", e => {
      e.stopPropagation(); acorda();
      const on = !ligado(); grava(on ? "on" : "off"); bt.setAttribute("aria-pressed", on);
      if (ganho) ganho.gain.setTargetAtTime(on ? VOL : 0, ac.currentTime, .1);
    });
  }

  /* ---------- servidor ---------- */
  async function api(acao, dados){
    if (!API) throw Object.assign(new Error("Servidor ainda não configurado."), {codigo:"sem_api"});
    const r = await fetch(API, {method:"POST", body: JSON.stringify(Object.assign({acao}, dados||{}))});
    const j = await r.json();
    if (!j.ok) throw Object.assign(new Error(j.erro || "Erro no servidor"), {codigo:j.codigo});
    return j;
  }

  /* impressão: só o que estiver em #printArea sai no papel */
  function preparaImpressao(html){
    let pa = document.getElementById("printArea");
    if (!pa){ pa = document.createElement("div"); pa.id = "printArea"; document.body.appendChild(pa); }
    pa.innerHTML = html;
  }

  /* quadro de assinatura com o dedo: pad = caixa, cv = canvas; onMuda() é chamado a cada traço */
  function padAssinatura(pad, cv, onMuda){
    const ctx = cv.getContext("2d"); let tracos = [], atual = null;
    const cor = "#1b2a6b";
    function ajusta(){ const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3); if (!r.width) return; cv.width = Math.round(r.width*dpr); cv.height = Math.round(r.height*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); desenha(); }
    function desenha(){ const r = cv.getBoundingClientRect(); ctx.clearRect(0,0,r.width,r.height); ctx.lineCap = ctx.lineJoin = "round"; ctx.strokeStyle = cor; ctx.lineWidth = 1.5;
      tracos.forEach(t => { ctx.beginPath(); t.forEach((p,i) => i ? ctx.lineTo(p[0],p[1]) : ctx.moveTo(p[0],p[1])); if (t.length === 1) ctx.lineTo(t[0][0]+.1, t[0][1]); ctx.stroke(); }); }
    const ponto = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const avisa = () => { pad.classList.toggle("ok", feita()); onMuda && onMuda(); };
    cv.addEventListener("pointerdown", e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); atual = [ponto(e)]; tracos.push(atual); desenha(); });
    cv.addEventListener("pointermove", e => { if (!atual) return; e.preventDefault(); atual.push(ponto(e)); desenha(); });
    const fim = () => { if (!atual) return; atual = null; avisa(); };
    cv.addEventListener("pointerup", fim); cv.addEventListener("pointercancel", fim);
    window.addEventListener("resize", () => { if (cv.offsetParent) ajusta(); });
    const feita = () => tracos.reduce((n,t) => n + t.length, 0) >= 12;
    function limpa(){ tracos = []; desenha(); avisa(); }
    function desfaz(){ tracos.pop(); desenha(); avisa(); }
    function imagem(){
      const xs = tracos.flat().map(p => p[0]), ys = tracos.flat().map(p => p[1]);
      const m = 6, x0 = Math.min(...xs)-m, y0 = Math.min(...ys)-m, w = Math.max(...xs)-x0+m, h = Math.max(...ys)-y0+m;
      for (const alt of [120, 90, 70]){
        const k = alt/Math.max(h,1), W = Math.max(40, Math.round(Math.min(w*k, 520))), K = Math.min(k, W/w);
        const c = document.createElement("canvas"); c.width = W; c.height = Math.round(h*K)+2; const g = c.getContext("2d");
        g.lineCap = g.lineJoin = "round"; g.strokeStyle = cor; g.lineWidth = Math.max(1.1, 1.5*K);
        tracos.forEach(t => { g.beginPath(); t.forEach((p,i) => { const X = (p[0]-x0)*K, Y = (p[1]-y0)*K; i ? g.lineTo(X,Y) : g.moveTo(X,Y); }); if (t.length === 1) g.lineTo((t[0][0]-x0)*K+.1, (t[0][1]-y0)*K); g.stroke(); });
        const url = c.toDataURL("image/png"); if (url.length < 45000) return url;
      }
      return "";
    }
    return {ajusta, feita, imagem, limpa, desfaz, vazio: () => !tracos.length};
  }

  window.DT = {padAssinatura, API, ZAP_DANNIS, CONTRATADO, ESCOLAS, PRECOS, BAIRROS_FAM, precoFam, precoTabela, MESES, INI, FIM, nomeMes, esc, fmtData, brl, num, hojeISO, vigencia, idade,
               maskCpf, maskTel, cpfValido, soDigitos, zapLink, contratoHTML, contratoPDF, nomePDF, carregaPdfLib, fmtAjuste, api, preparaImpressao, linkContrato, musicaFundo};
  /* botão flutuante de dúvidas no WhatsApp da Danni's Tur (todas as telas da família) */
  function zapDuvidas(){
    if (document.getElementById("zapDuvidas")) return;
    const a = document.createElement("a");
    a.id = "zapDuvidas"; a.className = "zap-duvidas"; a.target = "_blank"; a.rel = "noopener";
    a.href = zapLink(ZAP_DANNIS, "Olá! Vim pelo app da Danni's Tur e tenho uma dúvida: ");
    a.setAttribute("aria-label", "Dúvidas? Fale com a Danni's Tur no WhatsApp");
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2a8.6 8.6 0 0 0-7.4 13l-1.1 4 4.1-1.1A8.6 8.6 0 1 0 12 3.2z" fill="none" stroke="#fff" stroke-width="1.9" stroke-linejoin="round"/><path d="M9.2 8.2c.3-.3.7-.3.9 0l.8 1.5c.1.3 0 .5-.2.7l-.5.5c.5 1.1 1.4 2 2.5 2.5l.5-.5c.2-.2.5-.3.7-.2l1.5.8c.3.2.3.6 0 .9l-.6.7c-.5.5-1.3.6-2 .3a8 8 0 0 1-4.2-4.2c-.3-.7-.2-1.5.3-2z" fill="#fff"/></svg><span>Dúvidas?</span>';
    document.body.appendChild(a);
  }
  if (!/admin\.html/.test(location.pathname)){
    const inicia = () => { musicaFundo(); zapDuvidas(); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", inicia); else inicia();
  }
})();
