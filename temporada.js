/* Danni's Tur · temas de fim de ano na tela inicial (trocam sozinhos pela data, horário de Brasília)
   Natal: 12/12 a 28/12  ·  Ano Novo: 29/12 a 05/01
   Pra testar: index.html?data=2026-12-15T10:00  (ou ?data=2026-12-31T23:59:50) */
(function(){
  const qs = new URLSearchParams(location.search);
  const desloc = (() => { const d = qs.get("data"); if (!d) return 0; const t = new Date(d + (d.length <= 10 ? "T12:00" : "") + "-03:00").getTime(); return isNaN(t) ? 0 : t - Date.now(); })();
  const agora = () => new Date(Date.now() + desloc);
  // data "AAAA-MM-DD" e hora no fuso de São Paulo
  const sp = d => new Intl.DateTimeFormat("sv-SE", {timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"}).format(d);
  const hoje = sp(agora());
  const tema = hoje >= "2026-12-12" && hoje <= "2026-12-28" ? "natal" : hoje >= "2026-12-29" && hoje <= "2027-01-05" ? "anonovo" : "";
  const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = s => document.querySelector(s);

  // o passeio do cinema já passou: a capa sai da tela inicial
  if (hoje > "2026-11-28"){ const c = $(".cine-capa"); if (c) c.remove(); }
  if (!tema) return;
  document.documentElement.classList.add("tema-" + tema);

  const css = document.createElement("style");
  css.textContent = `
  #festa{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
  .tema-natal .hero,.tema-natal main,.tema-natal .estrada,.tema-anonovo .hero,.tema-anonovo main,.tema-anonovo .estrada{position:relative;z-index:1}
  .varal{position:absolute;left:0;right:0;top:0;height:46px;pointer-events:none;z-index:2}
  .tema-natal .hero{padding-top:52px}
  #van .gorro{position:absolute;left:24%;top:-15%;width:25%;transform:rotate(-12deg);transform-origin:50% 100%;pointer-events:none}
  #van .gorro svg{width:100%;height:auto;display:block;overflow:visible}
  .festa-card{grid-column:1/-1;border-radius:20px;padding:22px 20px;color:#fff;display:grid;gap:12px;text-align:center;position:relative;overflow:hidden;
    background:radial-gradient(120% 90% at 50% 0%,#24468f 0%,#11285e 55%,#0a1838 100%);box-shadow:0 14px 30px rgba(10,24,56,.28)}
  .festa-card h2{font:italic 800 clamp(30px,8vw,40px)/1 var(--f-display);color:#f3d48a;text-shadow:0 3px 0 rgba(0,0,0,.35)}
  .festa-card p{margin:0;color:#dfe7ff;font-size:16px;line-height:1.45}
  .festa-card .bts{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}
  .festa-card .bts a{flex:1 1 200px;display:block;text-decoration:none;font-weight:800;border-radius:14px;padding:13px 14px;background:#fff;color:#11285e}
  .festa-card .bts a.ouro{background:#f3d48a;color:#3a2a05}
  .festa-card .bts a.zap{background:#1fa855;color:#fff}
  .relogio{display:flex;justify-content:center;gap:10px}
  .relogio div{min-width:64px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:8px 6px}
  .relogio b{display:block;font:italic 800 34px/1 var(--f-display);color:#f3d48a;font-variant-numeric:tabular-nums}
  .relogio small{font-size:12px;color:#c9d3ee;text-transform:uppercase;letter-spacing:.08em}`;
  document.head.appendChild(css);

  const cv = document.createElement("canvas"); cv.id = "festa"; document.body.prepend(cv);
  const cx = cv.getContext("2d");
  function tamanho(){ const r = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * r; cv.height = innerHeight * r; cx.setTransform(r, 0, 0, r, 0, 0); }
  tamanho(); addEventListener("resize", tamanho);

  const acoes = $(".inicio-acoes");
  const card = document.createElement("section"); card.className = "festa-card";

  if (tema === "natal"){
    /* varal de luzinhas no topo */
    const varal = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    varal.setAttribute("class", "varal"); varal.setAttribute("aria-hidden", "true");
    const W = 1200, cores = ["#ff3b3b","#ffd23f","#2fd36b","#3fa0ff","#ff8a1f"];
    varal.setAttribute("viewBox", `0 0 ${W} 46`); varal.setAttribute("preserveAspectRatio", "none");
    let fio = "M0 6", lamps = "";
    for (let x = 0; x <= W; x += 10){ const u = (x % 200) / 200; fio += ` L${x} ${6 + 22 * 4 * u * (1 - u)}`; }
    for (let x = 25, i = 0; x < W; x += 50, i++){ const u = (x % 200) / 200, y = 6 + 22 * 4 * u * (1 - u);
      lamps += `<ellipse class="lp" data-i="${i}" cx="${x}" cy="${y + 9}" rx="5" ry="8" fill="${cores[i % 5]}"/>`; }
    varal.innerHTML = `<path d="${fio}" fill="none" stroke="#2c3a2a" stroke-width="2"/>${lamps}`;
    document.body.prepend(varal);
    const lps = [...varal.querySelectorAll(".lp")];
    const pisca = () => { const f = Math.floor(Date.now() / 450); lps.forEach((l, i) => { const on = (i + f) % 2 === 0; l.style.opacity = on ? 1 : .25; l.style.filter = on ? `drop-shadow(0 0 5px ${cores[i % 5]})` : "none"; }); };
    pisca(); if (!reduz) setInterval(pisca, 450);

    /* gorro de Papai Noel na van */
    const van = $("#van");
    if (van){ const g = document.createElement("span"); g.className = "gorro"; g.setAttribute("aria-hidden", "true");
      g.innerHTML = `<svg viewBox="0 0 120 100"><path d="M10 82 C 22 40 52 10 92 18 C 104 21 112 34 106 46 C 96 38 84 38 78 48 C 70 60 72 74 74 84 Z" fill="#d81f26"/>
        <path d="M30 60 C 40 36 62 22 86 24" fill="none" stroke="#ff5a5f" stroke-width="5" stroke-linecap="round" opacity=".6"/>
        <rect x="2" y="74" width="84" height="20" rx="10" fill="#fff"/><circle cx="108" cy="50" r="11" fill="#fff"/></svg>`;
      van.appendChild(g); }

    card.innerHTML = `<h2>🎄 Feliz Natal!</h2>
      <p>A Família Danni's Tur deseja a você e à sua família um Natal abençoado, cheio de paz, amor e alegria.</p>
      <div class="bts"><a class="ouro" href="natal-2026.html">▶️ Ver o vídeo de Natal</a></div>`;
    acoes && acoes.prepend(card);

    /* neve caindo (azulzinha, pra aparecer no fundo claro) */
    let s = 7; const rnd = () => (s = (s * 16807) % 2147483647, (s - 1) / 2147483646);
    const flocos = [...Array(46)].map(() => ({x: rnd(), y: rnd(), v: 18 + rnd() * 38, r: 9 + rnd() * 13, a: 12 + rnd() * 26, w: .4 + rnd(), f: rnd() * 6, o: .35 + rnd() * .4}));
    const neve = t => {
      cx.clearRect(0, 0, innerWidth, innerHeight);
      cx.textAlign = "center"; cx.textBaseline = "middle";
      for (const k of flocos){
        const y = ((k.y * (innerHeight + 40) + k.v * t) % (innerHeight + 40)) - 20, x = k.x * innerWidth + Math.sin(t * k.w + k.f) * k.a;
        cx.globalAlpha = k.o; cx.fillStyle = "#7fb0e6"; cx.font = `${k.r}px sans-serif`; cx.fillText("❄", x, y);
      }
      cx.globalAlpha = 1;
    };
    if (reduz) neve(0); else { const t0 = performance.now(); const loop = n => { neve((n - t0) / 1000); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }

  if (tema === "anonovo"){
    const virada = new Date("2027-01-01T00:00:00-03:00").getTime();
    const msg = encodeURIComponent("Olá! Quero garantir a vaga na van da Danni's Tur pra 2027 🚐");
    function desenhaCard(){
      const falta = virada - agora().getTime();
      if (falta > 0){
        const d = Math.floor(falta / 864e5), h = Math.floor(falta / 36e5) % 24, m = Math.floor(falta / 6e4) % 60, sg = Math.floor(falta / 1e3) % 60;
        if (!card.dataset.m){ card.dataset.m = "conta";
          card.innerHTML = `<h2>🎆 Contagem para 2027</h2><div class="relogio">${["dias","horas","min","seg"].map(u => `<div><b data-u="${u}">0</b><small>${u}</small></div>`).join("")}</div>
            <p>Obrigado por mais um ano com a gente! Que 2027 venha cheio de bênçãos.</p>
            <div class="bts"><a class="zap" href="https://wa.me/5519997781210?text=${msg}" target="_blank" rel="noopener">💬 Garanta a vaga 2027</a></div>`; }
        const v = {dias: d, horas: h, min: m, seg: sg};
        card.querySelectorAll("[data-u]").forEach(b => b.textContent = String(v[b.dataset.u]).padStart(b.dataset.u === "dias" ? 1 : 2, "0"));
      } else if (card.dataset.m !== "feliz"){ card.dataset.m = "feliz";
        card.innerHTML = `<h2>🥂 Feliz 2027!</h2><p>Que este ano seja de muitas viagens juntos, com Deus guiando os nossos caminhos. <b style="color:#f3d48a">Vem com a gente!!!</b></p>
          <div class="bts"><a class="zap" href="https://wa.me/5519997781210?text=${msg}" target="_blank" rel="noopener">💬 Garanta a vaga 2027</a></div>`; }
    }
    desenhaCard(); setInterval(desenhaCard, 1000);
    acoes && acoes.prepend(card);

    /* fogos de artifício na parte de cima da tela */
    const cores = ["#ff3b3b","#ffc61a","#2fd36b","#3fa0ff","#f4791f","#b45cff","#ff4fa3"];
    let fagulhas = [], prox = 0;
    const estoura = t => {
      const x = innerWidth * (.15 + Math.random() * .7), y = innerHeight * (.08 + Math.random() * .3), c = cores[Math.floor(Math.random() * cores.length)], n = 46;
      for (let i = 0; i < n; i++){ const a = i / n * Math.PI * 2, v = 70 + Math.random() * 110; fagulhas.push({x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: t, c}); }
    };
    const fogos = t => {
      cx.clearRect(0, 0, innerWidth, innerHeight);
      if (t > prox){ estoura(t); prox = t + .9 + Math.random() * 1.2; }
      fagulhas = fagulhas.filter(p => t - p.t0 < 1.6);
      for (const p of fagulhas){
        const e = t - p.t0, x = p.x + p.vx * e, y = p.y + p.vy * e + 60 * e * e;
        cx.globalAlpha = Math.max(0, 1 - e / 1.6); cx.fillStyle = p.c; cx.beginPath(); cx.arc(x, y, 2.4, 0, 6.283); cx.fill();
      }
      cx.globalAlpha = 1;
    };
    if (!reduz){ const t0 = performance.now(); const loop = n => { fogos((n - t0) / 1000); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }
})();
