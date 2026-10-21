// Página inicial (marca 2026): o "o" de votar percorre as quatro formas, a bandeira de losangos
// converte por onde o círculo passa, a faixa "quem faz" sorteia rostos da equipe.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cl = (v) => Math.max(0, Math.min(1, v));
  const f1 = (n) => n.toFixed(1);
  const P = (pts) => pts.map((p) => f1(p[0]) + ',' + f1(p[1])).join(' ');
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- estado: t (0 abstenção, 1 branco, 2 nulo, 3 voto) e posição do círculo ----------
  let t = 0, tt = 0, px = 0, py = 0, tpx = 0, tpy = 0, raf = 0, timers = [];
  let pessoas = 0, porLosango = 1;
  const NOMES = ['abstenção', 'branco', 'nulo', 'voto'];
  const FRASES = ['Não foi votar. É com essa pessoa que a gente quer conversar.', 'Foi até a urna e não marcou ninguém.', 'Foi e anulou o voto.', 'Decidiu. O círculo branco é o voto.'];

  // ---------- o "o" de votar ----------
  const oExt = document.getElementById('o-ext'), oI1 = document.getElementById('o-int1'), oI2 = document.getElementById('o-int2');
  const oX = document.getElementById('o-x'), oC = document.getElementById('o-c'), nao = document.getElementById('h-nao');
  function desenhaO() {
    if (!oExt) return;
    const k = cl(t); const L = (a, b) => a + (b - a) * k;
    oExt.setAttribute('points', P([[L(-40, 0), L(-40, -47)], [L(40, 47), L(-40, 0)], [L(40, 0), L(40, 47)], [L(-40, -47), L(40, 0)]]));
    const inn = P([[L(-20, 0), L(-20, -24)], [L(20, 24), L(-20, 0)], [L(20, 0), L(20, 24)], [L(-20, -24), L(20, 0)]]);
    oI1.setAttribute('points', inn); oI2.setAttribute('points', inn);
    const fo = cl(t - 2), xo = cl(t - 1) * (1 - fo);
    oExt.style.fillOpacity = fo.toFixed(3);
    oI1.style.strokeDasharray = (6 + 200 * k).toFixed(1) + ' ' + (7 * (1 - k) + 0.001).toFixed(2);
    oI1.style.opacity = (1 - cl(t - 1)).toFixed(3);
    oI2.style.opacity = (cl(t - 2) * 0.5).toFixed(3);
    oX.style.opacity = xo.toFixed(3); oX.setAttribute('transform', `scale(${(1 - fo * 0.5).toFixed(3)})`);
    oC.setAttribute('transform', `translate(${f1(px * 9)} ${f1(py * 6)}) scale(${Math.max(0.001, fo).toFixed(3)})`);
    if (nao) nao.style.opacity = (1 - fo * 0.8).toFixed(3);
  }

  // ---------- a bandeira de losangos ----------
  // Cada losango cheio é gente que entrou. A bandeira começa com 9 por 9 (81) e vai ficando mais
  // densa conforme a gente chega, até 16 por 16 (256). Passou disso, cada losango vale mais de uma pessoa.
  const g = document.getElementById('celulas'), circ = document.getElementById('circulo');
  const W = 520, H = 340, q = 0.8;
  let n = 9, a = 0, b = 0, u = 0, total = 81, esca = 1, ordem = [], cel = [];
  function monta(lado) {
    n = lado; total = n * n; a = W / (2 * n); b = H / (2 * n); u = b * 0.72; esca = 9 / n;
    ordem = [...Array(total).keys()]; let s = 7;
    for (let i = total - 1; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1); [ordem[i], ordem[j]] = [ordem[j], ordem[i]]; }
    cel = []; if (!g) return; g.innerHTML = '';
    g.style.setProperty('--traco', (2.6 * esca).toFixed(2) + 'px');
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i - j) * a, y = (i + j - (n - 1)) * b;
      const gr = document.createElementNS(NS, 'g'); gr.setAttribute('transform', `translate(${f1(x)} ${f1(y)})`);
      const pol = document.createElementNS(NS, 'polygon'); pol.setAttribute('class', 'c-pol');
      const xp = document.createElementNS(NS, 'path'); xp.setAttribute('class', 'c-x'); xp.setAttribute('d', `M${-7 * esca} ${-4.4 * esca} L${7 * esca} ${4.4 * esca} M${7 * esca} ${-4.4 * esca} L${-7 * esca} ${4.4 * esca}`);
      const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('class', 'c-dot'); dot.setAttribute('r', (4 * esca).toFixed(2));
      gr.append(pol, xp, dot); g.appendChild(gr);
      cel.push({ x, y, pol, xp, dot, id: i * n + j, k: '' });
    }
  }
  monta(9);
  const pessoa = new Set();
  function marcaPessoas() { pessoa.clear(); const cheios = Math.min(total, Math.ceil(pessoas / porLosango)); for (let i = 0; i < cheios; i++) pessoa.add(ordem[i]); }
  function desenhaBandeira() {
    if (!g) return;
    const Cx = px * 150, Cy = py * 95;
    const tb = Math.max(0, Math.min(3, t)); const base = tb <= 2 ? tb : 4 - tb;
    for (const c of cel) {
      const d = Math.hypot(c.x - Cx, (c.y - Cy) * 1.55);
      const sc = d <= 66 ? 3 : Math.max(0, 3 - ((d - 66) / 120) * 3);
      const isP = pessoa.has(c.id);
      const s = Math.max(isP ? 3 : base, sc);
      const key = s.toFixed(2) + (isP ? 'p' : '');
      if (key === c.k) continue; c.k = key;
      const kk = cl(s); const LL = (aa, bb) => aa + (bb - aa) * kk;
      c.pol.setAttribute('points', P([[LL(-u, 0), LL(-u, -b * q)], [LL(u, a * q), LL(-u, 0)], [LL(u, 0), LL(u, b * q)], [LL(-u, -a * q), LL(u, 0)]]));
      const fo = cl(s - 2);
      c.pol.style.fillOpacity = fo.toFixed(2);
      c.pol.style.strokeOpacity = (0.45 + 0.55 * cl(s - 1)).toFixed(2);
      c.xp.style.opacity = (cl(s - 1) * (1 - fo)).toFixed(2);
      c.dot.style.opacity = fo > 0.6 && isP ? 1 : 0;
    }
    circ.setAttribute('transform', `translate(${f1(Cx)} ${f1(Cy)})`);
  }

  // ---------- legenda ----------
  const rot = document.getElementById('rotulo'), fra = document.getElementById('frase');
  const legs = [...document.querySelectorAll('.h-leg .leg')];
  let ultimo = -1;
  function legenda() {
    const r = Math.round(Math.max(0, Math.min(3, t)));
    if (r === ultimo) return; ultimo = r;
    if (rot) rot.textContent = NOMES[r];
    if (fra) fra.textContent = FRASES[r];
    legs.forEach((bt, i) => { bt.setAttribute('aria-pressed', i === r ? 'true' : 'false'); });
  }

  // ---------- movimento ----------
  function quadro() {
    const kt = reduzir ? 1 : 0.075, kp = reduzir ? 1 : 0.1;
    t += (tt - t) * kt; px += (tpx - px) * kp; py += (tpy - py) * kp;
    if (Math.abs(tt - t) < 0.002) t = tt;
    if (Math.abs(tpx - px) < 0.002) px = tpx;
    if (Math.abs(tpy - py) < 0.002) py = tpy;
    desenhaO(); desenhaBandeira(); legenda();
    raf = 0;
    if (t !== tt || px !== tpx || py !== tpy) chuta();
  }
  const chuta = () => { if (!raf) raf = requestAnimationFrame(quadro); };
  const limpa = () => { timers.forEach(clearTimeout); timers = []; };
  legs.forEach((bt) => bt.addEventListener('click', () => { limpa(); tt = +bt.dataset.e; chuta(); }));
  const capa = document.getElementById('capa'), band = document.getElementById('bandeira26');
  const mexe = (e) => {
    limpa();
    const r = band.getBoundingClientRect();
    tpx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    tpy = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    chuta();
  };
  if (capa && band) {
    capa.addEventListener('pointermove', mexe);
    capa.addEventListener('pointerdown', mexe);
    capa.addEventListener('pointerleave', () => { tpx = 0; tpy = 0; chuta(); });
  }
  // um único momento orquestrado na abertura
  if (reduzir) { t = tt = 3; }
  else {
    const vai = (ms, fn) => timers.push(setTimeout(() => { fn(); chuta(); }, ms));
    vai(900, () => { tt = 1; }); vai(1800, () => { tt = 2; }); vai(2700, () => { tt = 3; });
    vai(3300, () => { tpx = -0.8; tpy = -0.1; }); vai(4300, () => { tpx = 0.8; tpy = 0.15; }); vai(5300, () => { tpx = 0; tpy = 0; });
  }
  marcaPessoas(); quadro();

  // ---------- números: pessoas participando e vídeos no ar; pessoas viram losangos cheios ----------
  const txtP = document.getElementById('pessoas-txt');
  fetch('/public/numeros').then((r) => r.json()).then((nn) => {
    const anima = (el, v) => (window.conta ? conta(el, v) : (el.textContent = v));
    document.querySelectorAll('[data-conta-videos]').forEach((el) => anima(el, nn.videos || 0));
    document.querySelectorAll('[data-conta="participantes"]').forEach((el) => anima(el, nn.participantes || 0));
    pessoas = nn.participantes || 0;
    const lado = Math.max(9, Math.min(16, Math.ceil(Math.sqrt(pessoas))));
    if (lado !== n) monta(lado);
    porLosango = pessoas > total ? Math.ceil(pessoas / total) : 1;
    marcaPessoas(); cel.forEach((c) => { c.k = ''; }); chuta(); quadro();
    if (txtP && pessoas) txtP.textContent = porLosango > 1
      ? `${pessoas} pessoas já entraram. A bandeira tem ${total} losangos, e cada losango cheio vale ${porLosango} pessoas.`
      : `${pessoas} ${pessoas === 1 ? 'pessoa já entrou' : 'pessoas já entraram'}, e cada losango cheio é uma.`;
  }).catch(() => {});

  // ---------- equipe: rostos sorteados na faixa menta e a equipe por função logo abaixo ----------
  const FUNCOES = [
    ['Escrita e pesquisa', 'Monta o material com as pautas, as sugestões de roteiro e a checagem dos fatos.'],
    ['Audiovisual', 'Faz a produção audiovisual do seu voto decide: os vídeos e os templates da própria campanha.'],
    ['Design', 'Cria a identidade visual, os cards, os templates e o PDF com as pautas.'],
    ['Marketing', 'Pensa as estratégias para o seu voto decide chegar mais longe.'],
    ['Site', 'Cuida deste site e da base de dados.'],
  ];
  const iniciais = (nm) => String(nm).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const primeiro = (nm) => String(nm).split(/\s+/)[0];
  const rotuloRede = (uu) => { try { const url = new URL(uu); const h = url.hostname.replace(/^www\./, ''); const c = url.pathname.split('/').filter(Boolean)[0]; const r = { 'instagram.com': 'instagram', 'tiktok.com': 'tiktok', 'x.com': 'x', 'twitter.com': 'x', 'youtube.com': 'youtube', 'linkedin.com': 'linkedin', 'threads.net': 'threads', 'bsky.app': 'bluesky', 'behance.net': 'behance' }[h]; return r && c ? `@${decodeURIComponent(c).replace(/^@/, '')} · ${r}` : (r || h); } catch { return 'rede social'; } };
  const ordemFuncao = (p) => { const i = FUNCOES.findIndex(([f]) => (p.funcoes || [])[0] === f); return i < 0 ? 99 : i; };
  fetch('/public/equipe').then((r) => r.json()).then((gente) => {
    gente = gente || [];
    // faixa menta: quatro pessoas sorteadas (de preferência com foto) e o convite para ver todo mundo
    const box = document.getElementById('rostos');
    if (box && gente.length) {
      const emb = [...gente].sort(() => Math.random() - 0.5).sort((x, y) => (!!y.foto) - (!!x.foto));
      const qu = emb.slice(0, 4);
      const rosto = (p, k) => `<a class="rosto" href="/quem-faz?p=${encodeURIComponent(p.id)}" aria-label="${esc(p.nome)}"><div class="foto${k % 2 ? ' alt' : ''}">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy" />` : esc(iniciais(p.nome))}</div><span class="rosto-nome">${esc(primeiro(p.nome))}</span><span class="rosto-fun">${esc(((p.funcoes || [])[0] || (p.idealizadora ? 'Idealização' : '')).toLowerCase())}</span></a>`;
      box.innerHTML = `<div class="r-l">${qu.slice(0, 3).map(rosto).join('')}</div><div class="r-l">${qu.slice(3).map((p) => rosto(p, 1)).join('')}<a class="rosto" href="/quem-faz" aria-label="Ver toda a equipe"><div class="foto mais">e mais<br>gente</div><span class="rosto-nome">${gente.length} pessoas</span><span class="rosto-fun">ver todo mundo</span></a></div>`;
    }
    // a equipe, por função
    const grade = document.getElementById('eq-grade'), filtro = document.getElementById('eq-filtros'), desc = document.getElementById('eq-desc');
    if (!grade) return;
    if (!gente.length) { grade.innerHTML = '<p class="muted">Em breve.</p>'; return; }
    gente.sort((x, y) => (y.idealizadora - x.idealizadora) || ordemFuncao(x) - ordemFuncao(y) || x.nome.localeCompare(y.nome, 'pt'));
    grade.innerHTML = gente.map((p) => {
      const fun = [...(p.idealizadora ? ['Idealização'] : []), ...(p.funcoes || [])];
      return `<article class="eq-card" data-f="${esc(fun.join('|'))}">
        <a class="eq-foto" href="/quem-faz?p=${encodeURIComponent(p.id)}" aria-label="${esc(p.nome)}">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy" />` : `<span>${esc(iniciais(p.nome))}</span>`}<i aria-hidden="true"></i></a>
        <h3>${esc(p.nome)}</h3>
        <p class="eq-fun">${esc(fun.join(' · '))}</p>
        ${p.bio ? `<p class="eq-bio">${esc(p.bio)}</p><button type="button" class="eq-mais" aria-expanded="false" hidden>ver mais</button>` : ''}
        ${p.link ? `<a class="eq-rede" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(rotuloRede(p.link))}</a>` : ''}
      </article>`;
    }).join('');
    // "ver mais" só aparece quando o texto realmente foi cortado
    const marcaCortes = () => grade.querySelectorAll('.eq-card').forEach((c) => {
      const b = c.querySelector('.eq-bio'), bt = c.querySelector('.eq-mais'); if (!b || !bt) return;
      if (c.classList.contains('aberto')) { bt.hidden = false; return; }
      bt.hidden = b.scrollHeight <= b.clientHeight + 2;
    });
    grade.addEventListener('click', (e) => {
      const bt = e.target.closest('.eq-mais'); if (!bt) return;
      const c = bt.closest('.eq-card'); const ab = c.classList.toggle('aberto');
      bt.textContent = ab ? 'ver menos' : 'ver mais'; bt.setAttribute('aria-expanded', ab ? 'true' : 'false');
    });
    requestAnimationFrame(marcaCortes); addEventListener('resize', marcaCortes);
    grade.querySelectorAll('img').forEach((im) => im.addEventListener('load', marcaCortes));
    const ideia = gente.filter((p) => p.idealizadora).length;
    const presentes = FUNCOES.filter(([f]) => gente.some((p) => (p.funcoes || []).includes(f)));
    filtro.innerHTML = `<button type="button" class="chip" data-f="" aria-pressed="true">Todo mundo <i>${gente.length}</i></button>` +
      (ideia ? `<button type="button" class="chip" data-f="Idealização" aria-pressed="false">Idealização <i>${ideia}</i></button>` : '') +
      presentes.map(([f]) => `<button type="button" class="chip" data-f="${esc(f)}" aria-pressed="false">${esc(f)} <i>${gente.filter((p) => (p.funcoes || []).includes(f)).length}</i></button>`).join('');
    filtro.addEventListener('click', (e) => {
      const bt = e.target.closest('.chip'); if (!bt) return; const f = bt.dataset.f;
      filtro.querySelectorAll('.chip').forEach((x) => x.setAttribute('aria-pressed', x === bt ? 'true' : 'false'));
      desc.textContent = f === 'Idealização' ? 'Idealizaram o seu voto decide.' : (FUNCOES.find(([nn]) => nn === f) || [])[1] || '';
      grade.querySelectorAll('.eq-card').forEach((c) => { c.hidden = !!f && !c.dataset.f.split('|').includes(f); });
      marcaCortes();
    });
  }).catch(() => {});

  // ---------- apoiadores (editados em Ajustes, no controle) ----------
  fetch('/public/config').then((r) => r.json()).then((c) => {
    const lista = c.apoiadores || []; if (!lista.length) return;
    const handle = (uu) => { try { const p = new URL(uu).pathname.split('/').filter(Boolean)[0]; return /instagram\.com/.test(uu) && p ? '@' + p : uu.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''); } catch { return ''; } };
    document.getElementById('lista-apoio').innerHTML = lista.map((ap) => ap.logo ? `<li class="com-logo"><a href="${esc(ap.link || '#')}" target="_blank" rel="noopener noreferrer"><img src="${esc(ap.logo)}" alt="${esc(ap.nome)}" loading="lazy" /></a></li>` : `<li><div><strong>${esc(ap.nome)}</strong>${ap.link ? `<a href="${esc(ap.link)}" target="_blank" rel="noopener noreferrer">${esc(handle(ap.link))}</a>` : ''}</div></li>`).join('');
    document.getElementById('apoiadores').hidden = false;
  }).catch(() => {});

  // ---------- monte a sua conversa ----------
  const escolha = { quem: null, onde: null };
  document.querySelectorAll('#conversa [data-grupo]').forEach((gr) => {
    gr.addEventListener('click', (e) => {
      const bt = e.target.closest('button'); if (!bt) return;
      gr.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === bt));
      escolha[gr.dataset.grupo] = { v: bt.dataset.v, p: bt.dataset.p };
      const el = document.getElementById('fala');
      if (!escolha.quem || !escolha.onde) { el.className = 'fala vazia'; el.textContent = escolha.quem ? 'Agora escolha onde.' : 'Escolha a pessoa e o lugar.'; return; }
      el.className = 'fala';
      el.innerHTML = `<small>sua conversa</small>Puxe o assunto com ${esc(escolha.quem.v)} ${esc(escolha.onde.v)}. Pergunte se ${escolha.quem.p} vai votar e por quê. Escute antes de responder. Depois conte o que te faz ir, com as suas palavras.`;
      document.getElementById('fala-cta').hidden = false;
    });
  });
})();
