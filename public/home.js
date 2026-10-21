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

  // ---------- a bandeira: 81 losangos, nove por nove ----------
  const g = document.getElementById('celulas'), circ = document.getElementById('circulo');
  const n = 9, W = 520, H = 340, a = W / (2 * n), b = H / (2 * n), q = 0.8, u = b * 0.72, total = n * n;
  const ordem = (() => { const arr = [...Array(total).keys()]; let s = 7; for (let i = total - 1; i > 0; i--) { s = (s * 1103515245 + 12345) & 0x7fffffff; const j = s % (i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; })();
  const cel = [];
  if (g) {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = (i - j) * a, y = (i + j - (n - 1)) * b;
      const gr = document.createElementNS(NS, 'g'); gr.setAttribute('transform', `translate(${f1(x)} ${f1(y)})`);
      const pol = document.createElementNS(NS, 'polygon'); pol.setAttribute('class', 'c-pol');
      const xp = document.createElementNS(NS, 'path'); xp.setAttribute('class', 'c-x'); xp.setAttribute('d', 'M-7 -4.4 L7 4.4 M7 -4.4 L-7 4.4');
      const dot = document.createElementNS(NS, 'circle'); dot.setAttribute('class', 'c-dot'); dot.setAttribute('r', '4');
      gr.append(pol, xp, dot); g.appendChild(gr);
      cel.push({ x, y, pol, xp, dot, id: i * n + j, k: '' });
    }
  }
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

  // ---------- números: pessoas viram losangos cheios ----------
  const txtP = document.getElementById('pessoas-txt');
  fetch('/public/numeros').then((r) => r.json()).then((nn) => {
    document.querySelectorAll('[data-conta-videos]').forEach((el) => window.conta ? conta(el, nn.videos || 0) : (el.textContent = nn.videos || 0));
    pessoas = nn.participantes || 0;
    porLosango = pessoas > total ? Math.ceil(pessoas / total) : 1;
    marcaPessoas(); cel.forEach((c) => { c.k = ''; }); chuta(); quadro();
    if (txtP && pessoas) txtP.textContent = porLosango > 1
      ? `${pessoas} pessoas já entraram. Cada losango cheio vale ${porLosango} pessoas.`
      : `${pessoas} ${pessoas === 1 ? 'pessoa já entrou' : 'pessoas já entraram'}, e cada losango cheio é uma.`;
  }).catch(() => {});

  // ---------- faixa "quem faz": tipos de serviço e rostos sorteados ----------
  const TIPOS = ['Escrita e pesquisa', 'Audiovisual', 'Design', 'Marketing', 'Site'];
  const MSG = {
    'Escrita e pesquisa': 'Tem um negócio e precisa de texto, roteiro ou pesquisa? Talvez alguém aqui faça um freela com você.',
    'Audiovisual': 'Tem um negócio e precisa de vídeo ou edição? Talvez alguém aqui faça um freela com você.',
    'Design': 'Tem um negócio e precisa de identidade visual, post ou material gráfico? Talvez alguém aqui faça um freela com você.',
    'Marketing': 'Tem um negócio e quer divulgar, mas não sabe por onde começar? Talvez alguém aqui faça um freela com você.',
    'Site': 'Tem um negócio e precisa de um site ou de uma base de dados? Talvez alguém aqui faça um freela com você.',
  };
  const MSG0 = document.getElementById('msg-tipo')?.textContent || '';
  const chipsBox = document.querySelector('.h-chips'), rostosBox = document.getElementById('rostos'), ver = document.getElementById('ver-quem'), msg = document.getElementById('msg-tipo');
  let gente = [], tipo = '', seed = Math.floor(Math.random() * 1e9);
  const iniciais = (nm) => String(nm).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  function sorteia() {
    const o = gente.map((_, i) => i); let r = seed || 1;
    for (let i = o.length - 1; i > 0; i--) { r = (r * 1103515245 + 12345) & 0x7fffffff; const j = r % (i + 1); [o[i], o[j]] = [o[j], o[i]]; }
    return o;
  }
  function rostos() {
    if (!rostosBox) return;
    const vis = sorteia().filter((i) => !tipo || (gente[i].funcoes || []).includes(tipo)).slice(0, 5);
    const pk = new Map(vis.map((id, k) => [id, k]));
    rostosBox.querySelectorAll('.rosto').forEach((el) => {
      const i = +el.dataset.i; const k = pk.get(i); const on = k !== undefined;
      const left = on ? (k < 3 ? k * 150 : 75 + (k - 3) * 150) : 150, top = on ? (k < 3 ? 0 : 75) : 40;
      el.style.left = left + 'px'; el.style.top = top + 'px';
      el.classList.toggle('fora', !on); el.tabIndex = on ? 0 : -1;
      el.querySelector('.foto').classList.toggle('alt', on && k % 2 === 1);
    });
    if (msg) msg.textContent = tipo ? MSG[tipo] : MSG0;
    if (ver) { ver.textContent = tipo ? 'Ver quem faz ' + tipo.toLowerCase() : 'Conheça quem faz'; ver.href = '/quem-faz' + (tipo ? '?f=' + encodeURIComponent(tipo) : ''); }
    chipsBox?.querySelectorAll('button').forEach((bt) => bt.setAttribute('aria-pressed', bt.dataset.t === tipo ? 'true' : 'false'));
  }
  fetch('/public/equipe').then((r) => r.json()).then((eq) => {
    gente = eq || [];
    const presentes = TIPOS.filter((tp) => gente.some((p) => (p.funcoes || []).includes(tp)));
    if (chipsBox) chipsBox.insertAdjacentHTML('beforeend', presentes.map((tp) => `<button type="button" class="chipm" data-t="${esc(tp)}" aria-pressed="false">${esc(tp.toLowerCase())}</button>`).join(''));
    chipsBox?.addEventListener('click', (e) => { const bt = e.target.closest('button'); if (!bt) return; tipo = tipo === bt.dataset.t ? '' : bt.dataset.t; seed = Math.floor(Math.random() * 1e9); rostos(); });
    if (rostosBox) rostosBox.innerHTML = gente.map((p, i) => `<a class="rosto fora" data-i="${i}" href="/quem-faz?p=${encodeURIComponent(p.id)}" aria-label="${esc(p.nome + (p.funcoes?.length ? ', ' + p.funcoes.join(', ') : ''))}" tabindex="-1"><div class="foto">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy" />` : esc(iniciais(p.nome))}</div></a>`).join('');
    rostos();
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
