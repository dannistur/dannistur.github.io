/**
 * Danni's Tur · servidor da renovação 2027 (Google Apps Script)
 *
 * Guarda os cadastros numa planilha Google, mostra a cada família só o próprio contrato (CPF do responsável
 * + data de nascimento de um dos alunos),
 * deixa a Danni's Tur colocar valor e liberar o contrato, recebe o contrato assinado e avisa
 * aniversariantes e novidades no WhatsApp do dono (via CallMeBot, grátis, só pro próprio número).
 *
 * Como instalar: veja o arquivo LEIA-ME.md nesta mesma pasta.
 */

const ABA = "Renovações";
const COLS = ["id","token","criado_em","status","responsavel","cpf","rg","celular","fone_casa","outro_fone","email",
              "rua","bairro","cidade","cep","alunos_texto","alunos_json","obs","data_cadastro",
              "inicio_idx","mensalidade","parcelas","total","data_contrato","liberado_em","assinado_em","arquivo_url","observacao_interna","tipo","assinatura","assinatura_info","assinado_dannis_em","aceite_em","aceite_info","aceite_hash","aceite_valores","ajuste_info","vans_json"];
const STATUS = {AGUARDANDO:"aguardando_valor", LIBERADO:"liberado", ASSINADO:"assinado_online", IMPRESSO:"vai_entregar_impresso", RECEBIDO:"recebido", CANCELADO:"cancelado"};
const FUSO = "America/Sao_Paulo";
const SITE = "https://dannistur.github.io/";
const PLANILHA_ID = "1luSn0_AEFnz38Q2SQsFvO0ZpnZv75azj107FUIKeBlQ";   // planilha "Danni's Tur – Renovações 2027"
function planilha_(){ return SpreadsheetApp.openById(PLANILHA_ID); }

/* ===================== entrada ===================== */
function doGet(){ return json_({ok:true, servico:"Danni's Tur 2027"}); }

function doPost(e){
  let req;
  try { req = JSON.parse(e.postData.contents); } catch(err){ return json_({ok:false, erro:"Pedido inválido"}); }
  try {
    switch (req.acao){
      case "cadastrar":        return json_(cadastrar_(req.dados));
      case "buscar":           return json_(buscar_(req));
      case "ver":              return json_(ver_(req));
      case "aceitar":          return json_(aceitar_(req));
      case "enviar_assinado":  return json_(enviarAssinado_(req));
      case "vou_imprimir":     return json_(vouImprimir_(req));
      case "admin_login":      admin_(req); return json_({ok:true});
      case "admin_lista":      admin_(req); return json_(lista_());
      case "admin_salvar":     admin_(req); return json_(salvar_(req));
      case "admin_status":     admin_(req); return json_(mudaStatus_(req));
      case "admin_minha_assinatura": admin_(req); return json_(minhaAssinatura_(req));
      case "admin_assinar_dannis": admin_(req); return json_(assinarDannis_(req));
      case "cinema_inscrever": return json_(cineInscrever_(req.dados));
      case "admin_cinema":     admin_(req); return json_(cineLista_());
      case "admin_cinema_pago": admin_(req); return json_(cineMarca_(req, "pago"));
      case "admin_cinema_cancelar": admin_(req); return json_(cineMarca_(req, "cancelado"));
      case "admin_van":        admin_(req); return json_(defineVan_(req));
      case "admin_custos":     admin_(req); return json_(salvaCustos_(req));
      case "admin_teste_zap":  admin_(req); return json_({ok:true, enviado: avisaDono_("✅ Teste: os avisos da Danni's Tur estão chegando no seu WhatsApp.")});
      default:                 return json_({ok:false, erro:"Ação desconhecida"});
    }
  } catch(err){
    return json_({ok:false, erro: String(err && err.message || err), codigo: err && err.codigo});
  }
}

/* ===================== famílias ===================== */
function cadastrar_(d){
  if (!d || !d.responsavel || !d.cpf || !Array.isArray(d.alunos) || !d.alunos.length) throw erro_("Dados incompletos");
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = aba_();
    const id = proximoId_(sh);
    const token = novoCodigo_(sh);
    let ass = String(d.assinatura || "");   // antigo: assinatura com o dedo (hoje a família assina pelo gov.br)
    if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(ass) || ass.length > 49000) ass = "";
    const alunos = d.alunos.slice(0,8).map(a => ({nome:limpa_(a.nome,80), nasc:limpa_(a.nasc,10), escola:limpa_(a.escola,60), periodo:limpa_(a.periodo,20), trajeto:limpa_(a.trajeto,20)}));
    const linha = {
      id, token, criado_em:agora_(), status:STATUS.AGUARDANDO,
      responsavel:limpa_(d.responsavel,100), cpf:limpa_(d.cpf,14), rg:limpa_(d.rg,20), celular:limpa_(d.celular,20),
      fone_casa:limpa_(d.foneCasa,20), outro_fone:limpa_(d.outroFone,40), email:limpa_(d.email,80),
      rua:limpa_(d.rua,120), bairro:limpa_(d.bairro,60), cidade:limpa_(d.cidade,60), cep:limpa_(d.cep,9),
      alunos_texto: alunos.map(a => `${a.nome} (${fmt_(a.nasc)}) – ${a.escola} – ${a.periodo} – ${a.trajeto}`).join("\n"),
      alunos_json: JSON.stringify(alunos), obs:limpa_(d.obs,500), data_cadastro: hoje_(),
      tipo: d.tipo === "novo" ? "novo" : "renovacao",
      assinatura: ass, assinado_em: ass ? agora_() : "", assinatura_info: ass ? "Assinado na tela pelo responsável · " + limpa_(d.aparelho, 160) : ""
    };
    // valor combinado no WhatsApp, digitado pela família: contrato já nasce completo e assinado
    const v = d.valores || {}, mens = Number(v.mensalidade), parc = Math.round(Number(v.parcelas)), ini = Math.round(Number(v.ini));
    const temValor = mens >= 50 && mens <= 20000 && parc >= 1 && parc <= 12 && ini > 24000;
    if (temValor){
      Object.assign(linha, {inicio_idx: ini, mensalidade: mens, parcelas: parc, total: Math.round(mens * parc * 100) / 100, data_contrato: hoje_()});
      if (ass) Object.assign(linha, {liberado_em: agora_(), status: STATUS.ASSINADO});   // fluxo antigo
    }
    // aceite eletrônico (cláusula 13): a família leu o contrato completo e tocou em "Aceitar"
    if (temValor && d.aceite === true && !ass){
      Object.assign(linha, registroAceite_(linha, d.aparelho));
    }
    sh.appendRow(COLS.map(c => linha[c] == null ? "" : linha[c]));
    avisaDono_(`${linha.tipo === "novo" ? "🆕 *Contrato novo 2027*" : "🚐 *Nova renovação 2027*"} (nº ${id})\n${linha.responsavel} – ${linha.celular}\n${temValor ? `💰 R$ ${brl_(linha.mensalidade)}/mês × ${linha.parcelas} = R$ ${brl_(linha.total)}\n` : "💰 Sem valor – colocar no admin\n"}${alunos.map(a=>`• ${a.nome} – ${a.escola}`).join("\n")}\n${linha.obs ? `📝 *Observação:* ${linha.obs}\n` : ""}\n${linha.aceite_em ? "✅ A família já aceitou o contrato no app." : "⏳ A família ainda não aceitou o contrato."}\n👉 Conferir o valor e tocar no botão verde pra mandar a via final no WhatsApp:\n${SITE}admin.html#f=${id}`);
    return {ok:true, token, id, aceite: linha.aceite_em ? {em: linha.aceite_em, codigo: codigoIntegridade_(linha.aceite_hash)} : null};
  } finally { lock.releaseLock(); }
}

/* "Meu contrato": a família se identifica com o CPF do responsável + a data de nascimento de um dos alunos.
   Cada família só enxerga o próprio contrato; quem recebe um link encaminhado não abre sem esses dados. */
const MSG_NAO_ACHEI = "Não encontramos contrato com esse CPF e essa data de nascimento. Confira e tente de novo.";
function confere_(o, cpf, nasc){
  const c = String(cpf || "").replace(/\D/g, ""), n = String(nasc || "").slice(0, 10);
  if (c.length !== 11 || !/^\d{4}-\d{2}-\d{2}$/.test(n)) return false;
  if (String(o.cpf || "").replace(/\D/g, "") !== c) return false;
  let alunos = []; try { alunos = JSON.parse(o.alunos_json || "[]"); } catch(e){}
  return alunos.some(a => String(a.nasc || "").slice(0, 10) === n);
}
function tentativas_(chave){   // no máximo 6 erros a cada 15 minutos por CPF/link
  const c = CacheService.getScriptCache(), k = "tent_" + chave, n = Number(c.get(k) || 0);
  if (n >= 6) throw erro_("Muitas tentativas. Espere 15 minutos e tente de novo.", "limite");
  return () => c.put(k, String(n + 1), 900);
}
function buscar_(req){
  const cpf = String(req.cpf || "").replace(/\D/g, "");
  if (cpf.length !== 11) throw erro_("Digite o CPF completo do responsável.", "dados");
  const falhou = tentativas_(cpf);
  const vals = aba_().getDataRange().getValues();
  let achou = null;
  for (let i = 1; i < vals.length; i++){
    const o = obj_(vals[i]);
    if (o.status !== STATUS.CANCELADO && confere_(o, cpf, req.nasc)) achou = o;   // fica com o mais recente
  }
  if (!achou){ falhou(); Utilities.sleep(1000); throw erro_(MSG_NAO_ACHEI, "nao_achou"); }
  return {ok:true, token: achou.token};
}
function verificado_(req){
  const falhou = tentativas_(String(req.token || "").toUpperCase().slice(0, 40));
  const r = porToken_(req.token);
  if (!r || !confere_(r.obj, req.cpf, req.nasc)){ falhou(); throw erro_(MSG_NAO_ACHEI, "nao_achou"); }
  return r;
}

/* ===================== aceite eletrônico ===================== */
/* versão do texto das cláusulas: mude quando o contrato mudar, pra que o código de integridade acompanhe */
const CLAUSULAS_VERSAO = "2027-v2-aceite";
/* "impressão digital" do que a família aceitou: partes, alunos, endereço, vigência e valores. Se algo mudar depois, o código não bate. */
function hashContrato_(o){
  let alunos = []; try { alunos = JSON.parse(o.alunos_json || "[]"); } catch(e){}
  const n2 = v => (Math.round(Number(v || 0) * 100) / 100).toFixed(2), ni = v => String(Math.round(Number(v || 0)));
  const txt = JSON.stringify([CLAUSULAS_VERSAO,
    String(o.responsavel||"").trim(), String(o.cpf||"").replace(/\D/g,""), String(o.rg||"").trim(),
    String(o.rua||"").trim(), String(o.bairro||"").trim(), String(o.cidade||"").trim(), String(o.cep||"").replace(/\D/g,""),
    alunos.map(a => [String(a.nome||"").trim(), String(a.nasc||"").slice(0,10), String(a.escola||"").trim(), String(a.periodo||""), String(a.trajeto||"")]),
    ni(o.inicio_idx), n2(o.mensalidade), ni(o.parcelas), n2(o.total)].concat(comObs_(o) ? [String(o.obs||"").trim()] : []));
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, txt, Utilities.Charset.UTF_8).map(b => ((b + 256) % 256).toString(16).padStart(2, "0")).join("");
}
/* a observação do cadastro vai no contrato desde a versão 3 do aceite; aceites mais antigos continuam conferindo sem ela */
function comObs_(o){
  if (!String(o.obs||"").trim()) return false;
  if (!o.aceite_em) return true;
  try { return Number(JSON.parse(o.aceite_valores || "{}").v) >= 3; } catch(e){ return false; }
}
function codigoIntegridade_(h){ return String(h || "").slice(0, 16).toUpperCase().replace(/(.{4})(?=.)/g, "$1-"); }
function aceiteOriginal_(o){ return !!(o.aceite_em && o.aceite_hash && o.aceite_hash === hashContrato_(o)); }   // nada mudou desde o aceite
const valoresDe_ = o => ({ini: Math.round(Number(o.inicio_idx||0)), mensalidade: Number(o.mensalidade||0), parcelas: Math.round(Number(o.parcelas||0)), total: Number(o.total||0)});
function registroAceite_(o, aparelho){
  return {aceite_em: agora_(), aceite_hash: hashContrato_(o), aceite_valores: JSON.stringify(Object.assign(valoresDe_(o), {v: 3})), ajuste_info: "",
          aceite_info: "Aceite eletrônico no app · CPF " + String(o.cpf||"") + " · " + limpa_(aparelho, 160)};
}
/* "Meu contrato": a família aceita (ou aceita de novo, se o valor mudou) com um toque */
function aceitar_(req){
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const r = verificado_(req);
    if (r.obj.status === STATUS.CANCELADO) throw erro_("Este contrato está cancelado.");
    if (!(Number(r.obj.mensalidade) > 0)) throw erro_("O contrato ainda está sem valor. A Danni's Tur vai te avisar.");
    if (req.aceite !== true) throw erro_("Marque que leu e aceita o contrato.");
    if (!r.obj.aceite_em){
      const mud = registroAceite_(r.obj, req.aparelho);
      if (r.obj.assinado_dannis_em && r.obj.status === STATUS.LIBERADO) mud.status = STATUS.ASSINADO;   // a Danni's já tinha assinado: contrato completo
      atualiza_(r.linha, mud);
      avisaDono_(`✅ *Contrato aceito no app* (nº ${r.obj.id})\n${r.obj.responsavel}\nAbra a Área Danni's pra mandar a via final no WhatsApp:\n${SITE}admin.html#f=${r.obj.id}`);
    }
    return ver_(req);
  } finally { lock.releaseLock(); }
}

function ver_(req){
  const r = verificado_(req);
  const f = publico_(r.obj);
  const liberado = [STATUS.LIBERADO, STATUS.ASSINADO, STATUS.IMPRESSO, STATUS.RECEBIDO].indexOf(r.obj.status) >= 0;
  if (!liberado){ delete f.valores; }
  if (r.obj.assinado_dannis_em){ f.assinaturaDannis = cfg_("assinatura_dannis"); f.assinadoDannisEm = r.obj.assinado_dannis_em; }
  return {ok:true, familia:f, liberado};
}

function enviarAssinado_(req){
  const r = verificado_(req);
  if (r.obj.status === STATUS.AGUARDANDO) throw erro_("O contrato ainda não foi liberado.");
  if (!req.base64 || String(req.base64).length > 14e6) throw erro_("Arquivo muito grande (máximo 10 MB).");
  const tipo = /^(application\/pdf|image\/(jpeg|png|heic|webp))$/.test(req.tipo) ? req.tipo : "application/pdf";
  const blob = Utilities.newBlob(Utilities.base64Decode(req.base64), tipo, `Contrato 2027 - ${r.obj.id} - ${r.obj.responsavel}${tipo==="application/pdf"?".pdf":""}`);
  const arq = pasta_().createFile(blob);
  atualiza_(r.linha, {status:STATUS.ASSINADO, assinado_em:agora_(), arquivo_url:arq.getUrl()});
  avisaDono_(`✍️ *Contrato assinado pelo gov.br recebido* (nº ${r.obj.id})\n${r.obj.responsavel}\nO PDF assinado está na pasta "Danni's Tur – Contratos assinados" do seu Google Drive e no botão "Ver contrato assinado" da Área Danni's:\n${SITE}admin.html#f=${r.obj.id}`);
  return {ok:true};
}

function vouImprimir_(req){
  const r = verificado_(req);
  if (r.obj.status === STATUS.AGUARDANDO) throw erro_("O contrato ainda não foi liberado.");
  if (r.obj.status === STATUS.LIBERADO){
    atualiza_(r.linha, {status:STATUS.IMPRESSO});
    avisaDono_(`🖨️ ${r.obj.responsavel} (nº ${r.obj.id}) vai imprimir, assinar e entregar o contrato na van.`);
  }
  return {ok:true};
}

/* ===================== administração ===================== */
function admin_(req){
  const senha = PropertiesService.getScriptProperties().getProperty("SENHA_ADMIN");
  if (!senha) throw erro_("Senha do administrador não configurada. Rode a função configurar().");
  if (String(req.senha||"") !== senha){ Utilities.sleep(1200); throw erro_("Senha errada.", "senha"); }
}

function lista_(){
  const sh = aba_(), vals = sh.getDataRange().getValues(); vals.shift();
  const familias = vals.filter(l => l[0] !== "").map(l => completo_(obj_(l)));
  let custosVans = {}; try { custosVans = JSON.parse(cfg_("custos_vans") || "{}"); } catch(e){}
  return {ok:true, familias, hoje: hoje_(), assinaturaDannis: cfg_("assinatura_dannis"), custosVans};
}

/* vans: em qual van (tio/tia) cada aluno vai. Fica na coluna vans_json, um item por aluno, na mesma ordem dos alunos */
function defineVan_(req){
  const tio = String(req.tio || ""), idx = Math.round(Number(req.idx));
  if (tio && TIOS.indexOf(tio) < 0) throw erro_("Van inválida.");
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const r = porId_(req.id); if (!r) throw erro_("Família não encontrada.");
    let alunos = []; try { alunos = JSON.parse(r.obj.alunos_json || "[]"); } catch(e){}
    if (!(idx >= 0 && idx < alunos.length)) throw erro_("Aluno não encontrado.");
    let vans = []; try { vans = JSON.parse(r.obj.vans_json || "[]"); } catch(e){}
    while (vans.length < alunos.length) vans.push("");
    vans[idx] = tio;
    atualiza_(r.linha, {vans_json: JSON.stringify(vans)});
    return {ok: true, id: req.id, vans};
  } finally { lock.releaseLock(); }
}
/* custos mensais de cada van (motorista, monitora, combustível...), guardados na aba Config */
function salvaCustos_(req){
  const campos = ["motorista","monitora","combustivel","pneus","gerais"], c = req.custos || {}, limpo = {};
  TIOS.forEach(t => { const v = c[t] || {}; limpo[t] = {}; campos.forEach(k => { const n = Math.round(Number(v[k] || 0) * 100) / 100; limpo[t][k] = n >= 0 && n < 1e6 ? n : 0; }); });
  setCfg_("custos_vans", JSON.stringify(limpo));
  return {ok: true, custosVans: limpo};
}

/* assinatura da Danni's Tur: desenhada uma vez no admin e reaproveitada em todos os contratos */
function minhaAssinatura_(req){
  const a = String(req.assinatura || "");
  if (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(a) || a.length > 49000) throw erro_("Assinatura inválida. Assine de novo.");
  setCfg_("assinatura_dannis", a);
  return {ok:true};
}

/* botão verde: a Danni's assina o contrato e a família recebe a cópia (WhatsApp pelo celular de quem tocou; e-mail aqui, se tiver) */
function assinarDannis_(req){
  const r = porId_(req.id); if (!r) throw erro_("Cadastro não encontrado.");
  if (!cfg_("assinatura_dannis")) throw erro_("Crie a sua assinatura primeiro (quadro 'Minha assinatura').");
  if (!(Number(r.obj.mensalidade) > 0)) throw erro_("Coloque o valor e salve antes de enviar.");
  if (r.obj.status === STATUS.CANCELADO) throw erro_("Este contrato está cancelado.");
  const aceito = !!r.obj.aceite_em;
  const mud = {assinado_dannis_em: r.obj.assinado_dannis_em || agora_()};
  if (r.obj.status === STATUS.AGUARDANDO || (aceito && r.obj.status === STATUS.LIBERADO)) mud.status = (r.obj.assinatura || aceito) ? STATUS.ASSINADO : STATUS.LIBERADO;
  if (!r.obj.liberado_em) mud.liberado_em = agora_();
  atualiza_(r.linha, mud);
  let email = false;
  if (!aceito && r.obj.email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.obj.email)){   // com aceite, a via final vai em PDF pelo WhatsApp
    try {
      const link = `${SITE}contrato`, nome = String(r.obj.responsavel).split(" ")[0];
      MailApp.sendEmail({to: r.obj.email, name: "Danni's Tur", subject: "Seu contrato Danni's Tur 2027 – falta só a sua assinatura",
        body: `Olá, ${nome}!\n\nSeu contrato do transporte escolar 2027 já está assinado pela Danni's Tur. Falta só você assinar pelo gov.br (é grátis):\n${link}\n\nEntre com o seu CPF e a data de nascimento do seu filho(a). Depois: 1) baixe o PDF, 2) assine em assinador.iti.br com a sua conta gov.br, 3) envie o PDF assinado pelo mesmo link.\n\nSeja bem-vindo à família Danni's! 🚐💜`,
        htmlBody: `<p>Olá, ${nome}!</p><p>Seu contrato do transporte escolar 2027 já está assinado pela Danni's Tur. Falta só você assinar pelo <b>gov.br</b> (é grátis).</p><p><a href="${link}">Abrir meu contrato</a> (entre com o seu CPF e a data de nascimento do seu filho(a))</p><ol><li>Baixe o PDF</li><li>Assine em assinador.iti.br com a sua conta gov.br</li><li>Envie o PDF assinado pelo mesmo link</li></ol><p>Seja bem-vindo à família Danni's! 🚐💜</p>`});
      email = true;
    } catch(e){}
  }
  return {ok:true, email, familia: completo_(porId_(req.id).obj)};
}

function salvar_(req){
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const r = porId_(req.id); if (!r) throw erro_("Cadastro não encontrado.");
    const v = req.valores || {};
    const mud = {inicio_idx: v.ini, mensalidade: v.mensalidade, parcelas: v.parcelas, total: v.total, data_contrato: v.dataContrato || hoje_(),
                 observacao_interna: limpa_(v.obsInterna, 500)};
    if (req.liberar){
      if (!(Number(v.mensalidade) > 0) || !(Number(v.parcelas) > 0)) throw erro_("Coloque a mensalidade e o número de parcelas antes de liberar.");
      if (r.obj.status === STATUS.AGUARDANDO) mud.status = r.obj.assinatura ? STATUS.ASSINADO : STATUS.LIBERADO;   // já assinou na tela: libera assinado
      mud.liberado_em = agora_();
    }
    atualiza_(r.linha, mud);
    // ajuste depois do aceite (normalmente o valor): o contrato continua pronto e o ajuste fica registrado no PDF
    const depois = porId_(req.id).obj;
    if (depois.aceite_em){
      let antes = {}; try { antes = JSON.parse(depois.aceite_valores || "{}"); } catch(e){}
      const agoraV = valoresDe_(depois), partes = [];
      if (Number(antes.mensalidade) !== agoraV.mensalidade) partes.push(`mensalidade de R$ ${brl_(antes.mensalidade||0)} para R$ ${brl_(agoraV.mensalidade)}`);
      if (Number(antes.parcelas) !== agoraV.parcelas) partes.push(`parcelas de ${antes.parcelas||0} para ${agoraV.parcelas}`);
      if (Math.round(Number(antes.total||0)*100) !== Math.round(agoraV.total*100)) partes.push(`total de R$ ${brl_(antes.total||0)} para R$ ${brl_(agoraV.total)}`);
      if (Number(antes.ini) !== agoraV.ini) partes.push("início da vigência");
      const atual = String(depois.ajuste_info || ""), desc = partes.join(" · ") || "dados do contrato";
      // mantém a data do ajuste se nada mudou desde o último ajuste; volta a vazio se voltou ao que foi aceito
      const info = aceiteOriginal_(depois) ? "" : (atual.endsWith(desc) ? atual : `Ajustado pela Danni's Tur em ${agora_()} · ${desc}`);
      if (info !== atual) atualiza_(r.linha, {ajuste_info: info});
    }
    return {ok:true, familia: completo_(porId_(req.id).obj)};
  } finally { lock.releaseLock(); }
}

function mudaStatus_(req){
  const r = porId_(req.id); if (!r) throw erro_("Cadastro não encontrado.");
  const ok = Object.keys(STATUS).map(k => STATUS[k]); if (ok.indexOf(req.status) < 0) throw erro_("Status inválido.");
  atualiza_(r.linha, {status:req.status});
  return {ok:true, familia: completo_(porId_(req.id).obj)};
}

/* ===================== aniversários (gatilho diário) ===================== */
function avisarAniversariantes(){
  const agora = new Date();
  const hoje = Utilities.formatDate(agora, FUSO, "MM-dd");
  const ano = Number(Utilities.formatDate(agora, FUSO, "yyyy"));
  const vals = aba_().getDataRange().getValues(); vals.shift();
  const hojeL = [];
  vals.filter(l => l[0] !== "").map(obj_).forEach(f => {
    if (f.status === STATUS.CANCELADO) return;
    let alunos = []; try { alunos = JSON.parse(f.alunos_json || "[]"); } catch(e){}
    alunos.forEach(a => {
      if (!a.nasc || a.nasc.slice(5,10) !== hoje) return;
      const anos = ano - Number(a.nasc.slice(0,4));
      hojeL.push(`• *${a.nome}* faz ${anos} ${anos===1?"ano":"anos"} – ${a.escola}\n   Responsável: ${f.responsavel} ${f.celular}`);
    });
  });
  if (!hojeL.length) return;
  avisaDono_(`🎂 *Aniversariantes de hoje*\n${hojeL.join("\n")}\n\n🎉 Toque aqui pra mandar o cartão de parabéns pra família:\n${SITE}admin.html#aniversarios`);
}

/* ===================== avisos ===================== */
function avisaDono_(texto){
  const p = PropertiesService.getScriptProperties();
  const fone = p.getProperty("ZAP_DONO") || "+5519997781210", chave = p.getProperty("CALLMEBOT_CHAVE");
  let enviado = false;
  if (fone && chave){
    try {
      const url = "https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent(fone) + "&text=" + encodeURIComponent(texto) + "&apikey=" + encodeURIComponent(chave);
      const r = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
      const corpo = r.getContentText().replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,200);
      enviado = r.getResponseCode() === 200 && !/error|apikey|invalid|not.*active/i.test(corpo);
      Logger.log("WhatsApp " + r.getResponseCode() + ": " + corpo);
      try { setCfg_("ultimo_aviso", agora_() + " · " + r.getResponseCode() + " · " + corpo); } catch(e2){}
    } catch(e){ Logger.log("WhatsApp falhou: " + e); try { setCfg_("ultimo_aviso", agora_() + " · ERRO · " + e); } catch(e2){} }
  }
  const email = p.getProperty("EMAIL_AVISOS");
  if (email){ try { MailApp.sendEmail(email, "Danni's Tur – aviso", texto.replace(/\*/g,"")); } catch(e){} }
  return enviado;
}

/* ===================== instalação (rodar uma vez) ===================== */
function configurar(){
  const ss = planilha_();
  let sh = ss.getSheetByName(ABA);
  if (!sh){ sh = ss.insertSheet(ABA); }
  if (sh.getLastRow() === 0){
    sh.getRange(1,1,1000,COLS.length).setNumberFormat("@");   // tudo como texto: CPF, telefone, CEP e datas não viram número
    sh.getRange(1,1,1,COLS.length).setValues([COLS]); sh.setFrozenRows(1);
    sh.getRange(1,1,1,COLS.length).setFontWeight("bold").setBackground("#712473").setFontColor("#ffffff");
  }
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty("ZAP_DONO")) p.setProperty("ZAP_DONO", "+5519997781210");
  if (!p.getProperty("EMAIL_AVISOS")) p.setProperty("EMAIL_AVISOS", Session.getEffectiveUser().getEmail());
  if (!p.getProperty("SENHA_ADMIN")) p.setProperty("SENHA_ADMIN", "TROQUE-ESTA-SENHA");
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "avisarAniversariantes").forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("avisarAniversariantes").timeBased().atHour(6).everyDays(1).inTimezone(FUSO).create();
  pasta_();
  return "Pronto. Agora troque a senha em Configurações do projeto › Propriedades do script.";
}

/* manda uma mensagem de teste no WhatsApp do dono (rodar à mão no editor) */
function testeAviso(){
  const ok = avisaDono_("✅ Teste: os avisos da Danni's Tur (contratos e aniversariantes) estão chegando no seu WhatsApp.");
  return ok ? "Enviado." : "Não enviou: confira a chave do CallMeBot nas propriedades do script.";
}

/* apaga TODAS as famílias da planilha (fica só o cabeçalho). Rodar à mão no editor, só pra zerar testes. */
function zerarTestes(){
  const sh = aba_(), n = sh.getLastRow();
  if (n > 1) sh.deleteRows(2, n - 1);
  return "Planilha zerada: " + Math.max(0, n - 1) + " linha(s) de teste apagada(s).";
}

/* ===================== passeio do cinema (28/11) ===================== */
/* uma linha por criança; "grupo" junta as crianças inscritas juntas (mesmo Pix) */
const CINE_ABA = "Cinema 28-11";
const CINE_COLS = ["id","grupo","criado_em","responsavel","celular","crianca","escola","periodo","tio","valor","pago","pago_em","cancelado"];
const CINE_VALOR = 40;
const TIOS = ["Tio Daniel","Tia Joyce","Tio Luiz","Tia Cintia"];
function cineAba_(){
  const ss = planilha_(); let sh = ss.getSheetByName(CINE_ABA);
  if (!sh){ sh = ss.insertSheet(CINE_ABA); sh.getRange(1,1,1,CINE_COLS.length).setValues([CINE_COLS]).setFontWeight("bold").setBackground("#712473").setFontColor("#ffffff"); sh.setFrozenRows(1); }
  return sh;
}
const cineObj_ = r => Object.fromEntries(CINE_COLS.map((c, i) => [c, r[i] instanceof Date ? Utilities.formatDate(r[i], FUSO, "yyyy-MM-dd'T'HH:mm:ss") : r[i]]));
function cineInscrever_(d){
  d = d || {};
  const resp = limpa_(d.responsavel, 100), cel = limpa_(d.celular, 20);
  if (resp.length < 3) throw erro_("Digite o nome do responsável.");
  if (String(cel).replace(/\D/g, "").length < 10) throw erro_("Digite o celular com DDD.");
  const kids = (Array.isArray(d.criancas) ? d.criancas : []).slice(0, 6).map(c => ({nome: limpa_(c.nome, 80), escola: limpa_(c.escola, 60), periodo: limpa_(c.periodo, 20), tio: limpa_(c.tio, 20)}));
  if (!kids.length) throw erro_("Coloque pelo menos uma criança.");
  kids.forEach(c => {
    if (c.nome.split(/\s+/).length < 2) throw erro_("Coloque o nome completo de cada criança.");
    if (!c.escola) throw erro_("Escolha a escola de " + c.nome.split(" ")[0] + ".");
    if (TIOS.indexOf(c.tio) < 0) throw erro_("Escolha a van (tio ou tia) de " + c.nome.split(" ")[0] + ".");
  });
  const cache = CacheService.getScriptCache(), k = "cine_" + String(cel).replace(/\D/g, ""), n = Number(cache.get(k) || 0);
  if (n >= 5) throw erro_("Muitas inscrições seguidas desse celular. Fale com a Danni's Tur no WhatsApp.");
  cache.put(k, String(n + 1), 900);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = cineAba_(), vals = sh.getDataRange().getValues();
    let id = 0; for (let i = 1; i < vals.length; i++) id = Math.max(id, Number(vals[i][0]) || 0);
    const grupo = "C" + (id + 1), agora = agora_();
    kids.forEach((c, i) => sh.appendRow(CINE_COLS.map(col => ({id: id + 1 + i, grupo, criado_em: agora, responsavel: resp, celular: cel, crianca: c.nome, escola: c.escola, periodo: c.periodo, tio: c.tio, valor: CINE_VALOR, pago: "", pago_em: "", cancelado: ""})[col])));
    const total = CINE_VALOR * kids.length;
    avisaDono_(`🎬 *Cinema 28/11 – nova inscrição* (${grupo})\n${resp} – ${cel}\n${kids.map(c => `• ${c.nome} – ${c.escola} ${c.periodo} – ${c.tio}`).join("\n")}\n💰 R$ ${brl_(total)} (aguardando comprovante)\n👉 ${SITE}admin.html#cinema`);
    return {ok: true, grupo, total, criancas: kids.length};
  } finally { lock.releaseLock(); }
}
function cineLista_(){
  const sh = planilha_().getSheetByName(CINE_ABA);
  const lista = sh ? sh.getDataRange().getValues().slice(1).map(cineObj_).filter(o => o.id !== "" && !o.cancelado) : [];
  return {ok: true, lista, valor: CINE_VALOR, tios: TIOS};
}
/* marca (ou desmarca) pago / cancelado: por grupo inteiro ou por criança */
function cineMarca_(req, campo){
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = cineAba_(), vals = sh.getDataRange().getValues(), cg = CINE_COLS.indexOf("grupo"), cc = CINE_COLS.indexOf(campo), ce = CINE_COLS.indexOf("pago_em");
    let n = 0;
    for (let i = 1; i < vals.length; i++){
      if ((req.grupo && vals[i][cg] === req.grupo) || (req.id && String(vals[i][0]) === String(req.id))){
        sh.getRange(i + 1, cc + 1).setValue(req.valor ? "sim" : "");
        if (campo === "pago") sh.getRange(i + 1, ce + 1).setValue(req.valor ? agora_() : "");
        n++;
      }
    }
    if (!n) throw erro_("Inscrição não encontrada.");
    return cineLista_();
  } finally { lock.releaseLock(); }
}

/* ===================== utilidades ===================== */
function aba_(){
  const sh = planilha_().getSheetByName(ABA); if (!sh) throw erro_("Rode configurar() primeiro.");
  if (sh.getLastColumn() < COLS.length){   // coluna nova (ex.: "tipo") ganha título sozinha
    sh.getRange(1,1,1,COLS.length).setValues([COLS]).setFontWeight("bold").setBackground("#712473").setFontColor("#ffffff");
  }
  return sh;
}
/* configurações guardadas numa aba "Config" (a assinatura é grande demais pras propriedades do script) */
function cfgAba_(){
  const ss = planilha_(); let sh = ss.getSheetByName("Config");
  if (!sh){ sh = ss.insertSheet("Config"); sh.getRange(1,1,1,2).setValues([["chave","valor"]]).setFontWeight("bold"); sh.hideSheet(); }
  return sh;
}
function cfg_(k){
  const vals = cfgAba_().getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) if (vals[i][0] === k) return String(vals[i][1] || "");
  return "";
}
function setCfg_(k, v){
  const sh = cfgAba_(), vals = sh.getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) if (vals[i][0] === k){ sh.getRange(i+1, 2).setValue(v); return; }
  sh.appendRow([k, v]);
}
function pasta_(){
  const nome = "Danni's Tur – Contratos assinados";
  const it = DriveApp.getFoldersByName(nome);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nome);
}
function proximoId_(sh){ const n = sh.getLastRow(); if (n < 2) return 1; const ids = sh.getRange(2,1,n-1,1).getValues().map(r => Number(r[0])||0); return Math.max.apply(null, ids) + 1; }
function obj_(l){ const o = {}; COLS.forEach((c,i) => o[c] = (l[i] instanceof Date) ? Utilities.formatDate(l[i], FUSO, "yyyy-MM-dd'T'HH:mm:ss") : l[i]); return o; }
function porToken_(t){
  const q = String(t || "").trim();
  if (q.length < 8) { Utilities.sleep(1000); return null; }
  const curto = q.length <= 12, Q = q.toUpperCase();
  const vals = aba_().getDataRange().getValues();
  for (let i = 1; i < vals.length; i++){
    const v = String(vals[i][1]);
    if (v === q || (curto && v.toUpperCase() === Q)) return {linha:i+1, obj:obj_(vals[i])};
  }
  Utilities.sleep(1000);   // atrasa quem tenta adivinhar códigos
  return null;
}
/* código curto do link do contrato: 8 caracteres sem letras que confundem (0/O, 1/I/L) */
function novoCodigo_(sh){
  const ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const n = sh.getLastRow(), usados = n > 1 ? sh.getRange(2,2,n-1,1).getValues().map(r => String(r[0]).toUpperCase()) : [];
  for (let k = 0; k < 20; k++){
    const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid());
    let c = ""; for (let i = 0; i < 8; i++) c += ABC[(b[i] + 256) % ABC.length];
    if (usados.indexOf(c) < 0) return c;
  }
  throw erro_("Não consegui gerar o código do contrato. Tente de novo.");
}
function porId_(id){
  const vals = aba_().getDataRange().getValues();
  for (let i = 1; i < vals.length; i++) if (String(vals[i][0]) === String(id)) return {linha:i+1, obj:obj_(vals[i])};
  return null;
}
function atualiza_(linha, mud){
  const sh = aba_();
  Object.keys(mud).forEach(k => { const c = COLS.indexOf(k); if (c >= 0 && mud[k] !== undefined) sh.getRange(linha, c+1).setValue(mud[k] == null ? "" : mud[k]); });
}
function publico_(o){
  let alunos = []; try { alunos = JSON.parse(o.alunos_json || "[]"); } catch(e){}
  return {
    id:o.id, status:o.status, responsavel:o.responsavel, cpf:o.cpf, rg:o.rg, celular:o.celular, foneCasa:o.fone_casa, outroFone:o.outro_fone, email:o.email,
    rua:o.rua, bairro:o.bairro, cidade:o.cidade, cep:o.cep, alunos, obs:o.obs, dataCadastro:String(o.data_cadastro||"").slice(0,10), tipo:o.tipo || "renovacao",
    assinatura:o.assinatura || "", assinadoEm:o.assinado_em || "",
    aceiteEm:o.aceite_em || "", aceiteInfo:o.aceite_info || "", aceiteCodigo: codigoIntegridade_(o.aceite_hash), aceiteValido: !!o.aceite_em,
    aceiteOriginal: aceiteOriginal_(o), versaoCodigo: codigoIntegridade_(hashContrato_(o)), ajusteInfo: o.ajuste_info || "",
    aceiteValores: (() => { try { return JSON.parse(o.aceite_valores || "null"); } catch(e){ return null; } })(),
    valores:{ini:o.inicio_idx, mensalidade:o.mensalidade, parcelas:o.parcelas, total:o.total, dataContrato:String(o.data_contrato||"").slice(0,10)}
  };
}
function completo_(o){ const f = publico_(o); f.token = o.token; f.criadoEm = o.criado_em; f.liberadoEm = o.liberado_em; f.assinadoEm = o.assinado_em; f.arquivo = o.arquivo_url; f.obsInterna = o.observacao_interna; f.assinadoDannisEm = o.assinado_dannis_em || ""; try { f.vans = JSON.parse(o.vans_json || "[]"); } catch(e){ f.vans = []; } return f; }
function limpa_(v, max){ return String(v == null ? "" : v).replace(/[\u0000-\u001f]/g," ").trim().slice(0, max||200); }
function brl_(n){ return Number(n).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
function fmt_(iso){ return iso ? String(iso).split("-").reverse().join("/") : ""; }
function agora_(){ return Utilities.formatDate(new Date(), FUSO, "yyyy-MM-dd'T'HH:mm:ss"); }
function hoje_(){ return Utilities.formatDate(new Date(), FUSO, "yyyy-MM-dd"); }
function erro_(m, codigo){ const e = new Error(m); e.codigo = codigo; return e; }
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* diagnóstico do WhatsApp: mostra no registro o que o CallMeBot respondeu (sem mostrar a chave) */
function diagnosticoZap(){
  const p = PropertiesService.getScriptProperties();
  const fone = p.getProperty("ZAP_DONO") || "+5519997781210", chave = p.getProperty("CALLMEBOT_CHAVE");
  Logger.log("Numero usado: " + fone + " | chave salva: " + (chave ? "sim (" + String(chave).length + " digitos)" : "NAO"));
  if (!chave) return;
  const url = "https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent(fone) + "&text=" + encodeURIComponent("✅ Teste Danni's Tur") + "&apikey=" + encodeURIComponent(chave);
  const r = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
  Logger.log("Resposta " + r.getResponseCode() + ": " + r.getContentText().replace(/<[^>]+>/g," ").replace(/\s+/g," ").slice(0,400));
}
