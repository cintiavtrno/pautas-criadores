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


  // a bandeira da capa: o centro do losango olha para onde está o ponteiro
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

  document.addEventListener('DOMContentLoaded', () => { poeIcones(); observaRevela(); bandeira(); });
})();
