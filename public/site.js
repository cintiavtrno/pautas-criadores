// Comportamentos comuns das páginas públicas:
// ícones em [data-ico], entrada das seções com a rolagem e contagem animada em [data-conta].
(function () {
  const reduzir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.poeIcones = (raiz = document) => {
    raiz.querySelectorAll('[data-ico]').forEach((el) => {
      if (el.dataset.icoPosto) return;
      el.insertAdjacentHTML('afterbegin', (window.ICONE || {})[el.dataset.ico] || '');
      el.dataset.icoPosto = '1';
    });
  };

  window.conta = (el, alvo) => {
    if (reduzir || !alvo) { el.textContent = alvo; return; }
    const t0 = performance.now(); const dur = 900;
    const passo = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(alvo * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  };

  window.observaRevela = (raiz = document) => {
    const els = raiz.querySelectorAll('.revela:not(.na-tela)');
    if (reduzir || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('na-tela')); return; }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('na-tela'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((e) => io.observe(e));
  };



  // ---- marca 2026: as quatro formas (abstenção, branco, nulo, voto) a partir de um estado contínuo 0..3
  const cl = (v) => Math.max(0, Math.min(1, v));
  const P = (pts) => pts.map((p) => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  window.FORMA = {
    // polígono externo/interno que vai do quadrado (0) ao losango (1)
    poli(s, r = 40, rl = 47) { const k = cl(s); const L = (a, b) => a + (b - a) * k;
      return P([[L(-r, 0), L(-r, -rl)], [L(r, rl), L(-r, 0)], [L(r, 0), L(r, rl)], [L(-r, -rl), L(r, 0)]]); },
    // svg de um degrau da régua (estado s de 0 a 3)
    degrau(s) {
      return `<svg viewBox="-50 -50 100 100" aria-hidden="true"><polygon points="${this.poli(s)}" style="fill:#61bf99;fill-opacity:${cl(s - 2).toFixed(2)};stroke:#61bf99;stroke-width:11px;stroke-linejoin:round"/><path d="M-20 -20 L20 20 M20 -20 L-20 20" style="fill:none;stroke:#61bf99;stroke-width:10px;stroke-linecap:round;opacity:${(cl(s - 1) * (1 - cl(s - 2))).toFixed(2)}"/><circle r="14" style="fill:#f8faf6;opacity:${cl(s - 2).toFixed(2)}"/></svg>`;
    },
  };
  window.poeReguas = (raiz = document) => {
    raiz.querySelectorAll('.regua:not([data-pronta])').forEach((el) => {
      el.dataset.pronta = '1'; el.setAttribute('aria-hidden', 'true');
      const N = 18; let h = '';
      for (let i = 0; i < N; i++) h += FORMA.degrau((i / (N - 1)) * 3);
      el.innerHTML = h;
    });
  };

  // cabeçalho: menu no celular e o círculo do logo olhando para o ponteiro
  function cabecalho() {
    const cab = document.querySelector('.cab'); if (!cab) return;
    const bt = cab.querySelector('.cab-menu');
    if (bt) bt.addEventListener('click', () => { const ab = cab.classList.toggle('aberto'); bt.setAttribute('aria-expanded', ab ? 'true' : 'false'); bt.textContent = ab ? 'fechar' : 'menu'; });
    const olho = cab.querySelector('.olho'); if (!olho || reduzir) return;
    let x = 0, y = 0, ax = 0, ay = 0, rod = false;
    const passo = () => { x += (ax - x) * .15; y += (ay - y) * .15; olho.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`); if (Math.abs(ax - x) > .2 || Math.abs(ay - y) > .2) requestAnimationFrame(passo); else rod = false; };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = olho.ownerSVGElement.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, f = Math.min(1, d / 500);
      ax = (dx / d) * f * 22; ay = (dy / d) * f * 9;
      if (!rod) { rod = true; requestAnimationFrame(passo); }
    }, { passive: true });
  }

  // a bandeira da capa (versão antiga): o centro do losango olha para onde está o ponteiro
  function bandeira() {
    const el = document.getElementById('bandeira');
    if (!el || reduzir) return;
    // move o centro com o atributo transform do SVG (igual em todo navegador, inclusive Safari do iPhone)
    let c = null, x = 0, y = 0, ax = 0, ay = 0, rodando = false, ocioso;
    const passo = () => {
      x += (ax - x) * 0.12; y += (ay - y) * 0.12;
      if (Math.abs(ax - x) < 0.3 && Math.abs(ay - y) < 0.3) { x = ax; y = ay; rodando = false; }
      c.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      if (rodando) requestAnimationFrame(passo);
    };
    const olha = (nx, ny) => {
      c = c || el.querySelector('.l-c'); if (!c) return;
      c.style.transition = 'none';
      ax = nx * 72; ay = ny * 30;
      if (!rodando) { rodando = true; requestAnimationFrame(passo); }
    };
    const fino = matchMedia('(pointer: fine)').matches;
    // no celular: olha pros lados e volta pro centro, sem ficar parado de lado
    const PASSOS = [[0, 0], [-0.75, 0], [0, 0], [0.75, 0], [0, 0], [0, -0.5], [0, 0]];
    let k = 0;
    const passeia = () => {
      if (fino) { const a = Math.random() * Math.PI * 2; olha(Math.cos(a) * .8, Math.sin(a) * .8); }
      else { const [px, py] = PASSOS[k++ % PASSOS.length]; olha(px, py); }
      ocioso = setTimeout(passeia, fino ? 2200 + Math.random() * 1800 : (k % 2 ? 1400 : 2600));
    };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(ocioso);
      const r = (el.querySelector('.losango') || el).getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, f = Math.min(1, d / 420);
      olha((dx / d) * f, (dy / d) * f);
      ocioso = setTimeout(passeia, 4000);
    }, { passive: true });
    // toque na tela: o olho vira pro lado do toque e depois volta
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      clearTimeout(ocioso);
      const r = (el.querySelector('.losango') || el).getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      olha((dx / d) * .7, (dy / d) * .5);
      ocioso = setTimeout(passeia, 1800);
    }, { passive: true });
    ocioso = setTimeout(passeia, 1500);
  }

  document.addEventListener('DOMContentLoaded', () => { poeIcones(); observaRevela(); bandeira(); poeReguas(); cabecalho(); });
})();
