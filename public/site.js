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

  document.addEventListener('DOMContentLoaded', () => { poeIcones(); observaRevela(); });
})();
