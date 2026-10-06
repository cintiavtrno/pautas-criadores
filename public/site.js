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
    let alvo = null, ocioso;
    const olha = (x, y) => { const c = el.querySelector('.l-c'); if (c) c.style.transform = `translate(${(x * 72).toFixed(1)}px, ${(y * 30).toFixed(1)}px)`; };
    const passeia = () => { const a = Math.random() * Math.PI * 2; olha(Math.cos(a) * .8, Math.sin(a) * .8); ocioso = setTimeout(passeia, 2200 + Math.random() * 1800); };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      clearTimeout(ocioso);
      if (!alvo) alvo = el.querySelector('.losango');
      const r = alvo.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, f = Math.min(1, d / 420);
      olha((dx / d) * f, (dy / d) * f);
      ocioso = setTimeout(passeia, 4000);
    }, { passive: true });
    ocioso = setTimeout(passeia, 1500);
  }

  document.addEventListener('DOMContentLoaded', () => { poeIcones(); observaRevela(); bandeira(); });
})();
