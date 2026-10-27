/* Danni's Tur · cartão de aniversário (imagem 1080×1350 pra mandar no WhatsApp) */
(function(){
  "use strict";
  const W = 1080, H = 1350;
  const COR = {roxo:"#712473", roxoEsc:"#3f1142", laranja:"#f4791f", amarelo:"#ffc61a", rosa:"#ff6fae", azul:"#3fb6f2", verde:"#3ccf7a", branco:"#ffffff", asfalto:"#2b2630"};

  const cache = {};
  function img(src){
    if (!cache[src]) cache[src] = new Promise((ok, err) => { const i = new Image(); i.onload = () => ok(i); i.onerror = err; i.src = src; });
    return cache[src];
  }
  async function fontes(){
    try { await Promise.all(["900 italic 100px Kanit", "800 italic 100px Kanit", "700 40px Figtree", "600 40px Figtree"].map(f => document.fonts.load(f))); } catch(e){}
  }
  function aleatorio(semente){            // mesmo nome = mesmo cartão
    let s = 0; for (const c of semente) s = (s * 31 + c.charCodeAt(0)) >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function texto(cx, t, x, y, fonte, tamMax, larguraMax, cor, sombra){
    let tam = tamMax;
    do { cx.font = fonte.replace("{t}", tam + "px"); tam -= 4; } while (cx.measureText(t).width > larguraMax && tam > 30);
    cx.save();
    if (sombra){ cx.shadowColor = "rgba(0,0,0,.35)"; cx.shadowBlur = 18; cx.shadowOffsetY = 8; }
    cx.fillStyle = cor; cx.textAlign = "center"; cx.textBaseline = "alphabetic"; cx.fillText(t, x, y);
    cx.restore();
    return tam + 4;
  }
  function balao(cx, x, y, r, cor, rnd){
    cx.save();
    cx.strokeStyle = "rgba(255,255,255,.55)"; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(x, y + r * 1.2);
    cx.bezierCurveTo(x - 30, y + r * 1.9, x + 30, y + r * 2.4, x - 10 + rnd() * 20, y + r * 3.2); cx.stroke();
    const g = cx.createRadialGradient(x - r * .35, y - r * .4, r * .1, x, y, r * 1.2);
    g.addColorStop(0, "rgba(255,255,255,.75)"); g.addColorStop(.25, cor); g.addColorStop(1, cor);
    cx.fillStyle = g; cx.beginPath(); cx.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.moveTo(x - 10, y + r * 1.2 + 14); cx.lineTo(x + 10, y + r * 1.2 + 14); cx.lineTo(x, y + r * 1.2 - 2); cx.closePath(); cx.fill();
    cx.restore();
  }

  /* desenha o cartão. a = {nome, anos, escola}; volta um <canvas> */
  async function cartao(a){
    await fontes();
    const [logo, van] = await Promise.all([img("img/logo-dannis-branco.png"), img("img/van-dannis.svg")]);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const cx = cv.getContext("2d");
    const rnd = aleatorio(a.nome + a.anos);

    // fundo
    const g = cx.createRadialGradient(W / 2, H * .38, 80, W / 2, H * .45, H * .85);
    g.addColorStop(0, "#8e2f91"); g.addColorStop(.55, COR.roxo); g.addColorStop(1, COR.roxoEsc);
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    // raios de luz
    cx.save(); cx.translate(W / 2, H * .42); cx.globalAlpha = .07; cx.fillStyle = "#fff";
    for (let i = 0; i < 16; i++){ cx.rotate(Math.PI / 8); cx.beginPath(); cx.moveTo(0, 0); cx.lineTo(-60, -1100); cx.lineTo(60, -1100); cx.closePath(); cx.fill(); }
    cx.restore();
    // confete
    const cores = [COR.amarelo, COR.laranja, COR.rosa, COR.azul, COR.verde, "#fff"];
    for (let i = 0; i < 140; i++){
      const x = rnd() * W, y = rnd() * H, w = 10 + rnd() * 16, h = 6 + rnd() * 10;
      if (y > 1000 && y < 1240) continue;
      if ((y > 230 && y < 545 && x > 190 && x < 890) || (y > 880 && y < 1000 && x > 60 && x < 1020) || (Math.hypot(x - W / 2, y - 720) < 190)) continue;   // não cobre os textos
      cx.save(); cx.translate(x, y); cx.rotate(rnd() * Math.PI); cx.globalAlpha = .85;
      cx.fillStyle = cores[i % cores.length];
      if (i % 3 === 0){ cx.beginPath(); cx.arc(0, 0, h * .7, 0, Math.PI * 2); cx.fill(); } else cx.fillRect(-w / 2, -h / 2, w, h);
      cx.restore();
    }
    // balões
    balao(cx, 95, 360, 64, COR.amarelo, rnd); balao(cx, 185, 190, 50, COR.rosa, rnd);
    balao(cx, 985, 350, 64, COR.azul, rnd);   balao(cx, 895, 180, 48, COR.laranja, rnd);

    // logo
    const lw = 400, lh = lw * logo.height / logo.width;
    cx.drawImage(logo, (W - lw) / 2, 50, lw, lh);

    // títulos
    texto(cx, "FELIZ ANIVERSÁRIO", W / 2, 330, "italic 900 {t} Kanit, 'Arial Black', sans-serif", 90, 600, COR.amarelo, true);
    const primeiro = String(a.nome || "").trim().split(/\s+/)[0] || "";
    const nome = primeiro.charAt(0).toUpperCase() + primeiro.slice(1).toLowerCase();
    texto(cx, nome + "!", W / 2, 520, "italic 900 {t} Kanit, 'Arial Black', sans-serif", 200, 760, "#fff", true);

    // selo da idade
    const sx = W / 2, sy = 720, sr = 150;
    cx.save(); cx.shadowColor = "rgba(0,0,0,.35)"; cx.shadowBlur = 30; cx.shadowOffsetY = 12;
    cx.fillStyle = COR.laranja; cx.beginPath();
    for (let i = 0; i < 32; i++){ const ang = i * Math.PI / 16, r = i % 2 ? sr : sr + 18; cx.lineTo(sx + Math.cos(ang) * r, sy + Math.sin(ang) * r); }
    cx.closePath(); cx.fill(); cx.restore();
    cx.strokeStyle = "rgba(255,255,255,.85)"; cx.lineWidth = 6; cx.setLineDash([4, 12]); cx.beginPath(); cx.arc(sx, sy, sr - 22, 0, Math.PI * 2); cx.stroke(); cx.setLineDash([]);
    const n = String(a.anos);
    texto(cx, n, sx, sy + (n.length > 1 ? 40 : 46), "italic 900 {t} Kanit, 'Arial Black', sans-serif", 190, 220, "#fff", false);
    texto(cx, a.anos === 1 ? "ANO" : "ANOS", sx, sy + 98, "italic 800 {t} Kanit, 'Arial Black', sans-serif", 44, 200, COR.amarelo, false);

    // recado
    texto(cx, "Um abraço de toda a turma da Danni's Tur!", W / 2, 930, "700 {t} Figtree, Arial, sans-serif", 46, 940, "#fff", true);
    if (a.escola) texto(cx, a.escola, W / 2, 978, "600 {t} Figtree, Arial, sans-serif", 34, 900, "rgba(255,255,255,.75)", false);

    // estrada + van
    cx.fillStyle = COR.asfalto; cx.fillRect(0, 1180, W, 90);
    cx.fillStyle = COR.amarelo; for (let x = 10; x < W; x += 110) cx.fillRect(x, 1222, 60, 8);
    const vw = 440, vh = vw * 172 / 410;
    cx.drawImage(van, (W - vw) / 2, 1196 - vh, vw, vh);

    // rodapé
    cx.fillStyle = COR.roxoEsc; cx.fillRect(0, 1270, W, 80);
    texto(cx, "VEM COM A GENTE!!!", W / 2, 1326, "italic 900 {t} Kanit, 'Arial Black', sans-serif", 46, 900, COR.amarelo, false);
    return cv;
  }

  const blob = cv => new Promise(ok => cv.toBlob(ok, "image/png"));
  const nomeArquivo = a => `aniversario-${String(a.nome || "aluno").trim().split(/\s+/)[0].normalize("NFD").replace(/[^\w]/g, "").toLowerCase()}.png`;
  const mensagem = a => `Parabéns, ${String(a.nome).trim().split(/\s+/)[0]}! 🎉🎂 Feliz ${a.anos} ${a.anos === 1 ? "ano" : "anos"}! Um abraço de toda a turma da Danni's Tur. 🚐💜`;

  /* manda pelo WhatsApp: no celular abre o compartilhar com a imagem; no computador baixa a imagem e abre a conversa */
  async function enviar(a, cv, telefone){
    const b = await blob(cv), arq = new File([b], nomeArquivo(a), {type: "image/png"});
    if (navigator.canShare && navigator.canShare({files: [arq]})){
      try { await navigator.share({files: [arq], text: mensagem(a)}); return "compartilhado"; }
      catch(e){ if (e && e.name === "AbortError") return "cancelado"; }
    }
    baixar(a, b);
    if (telefone) window.open(DT.zapLink(telefone, mensagem(a)), "_blank", "noopener");
    return "baixado";
  }
  function baixar(a, b){
    const u = URL.createObjectURL(b), l = document.createElement("a");
    l.href = u; l.download = nomeArquivo(a); document.body.appendChild(l); l.click(); l.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }

  window.Cartao = {cartao, enviar, baixar: async (a, cv) => baixar(a, await blob(cv)), mensagem};
})();
