/* Página Vídeos: o que a equipe conferiu, separado por tema, pra assistir, baixar e compartilhar. */
(function () {
  const el = document.getElementById('vd');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const I = window.ICONE || {};
  const SVG = {
    play: '<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    zap: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>',
    insta: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17.5" cy="6.5" r="1.3" fill="currentColor"/></svg>',
    face: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg>',
    baixar: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 20h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fechar: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
  };
  let V = [], tema = 'Todos';
  const url = (v) => `${location.origin}/videos#v-${v.id}`;
  const toast = (t) => { let d = document.getElementById('vd-toast'); if (!d) { d = document.createElement('div'); d.id = 'vd-toast'; d.className = 'vd-toast'; document.body.appendChild(d); } d.textContent = t; d.classList.add('on'); clearTimeout(d._t); d._t = setTimeout(() => d.classList.remove('on'), 2600); };
  const copia = async (t, msg) => { try { await navigator.clipboard.writeText(t); toast(msg); } catch { prompt('Copie o link:', t); } };

  function cartao(v) {
    const capa = v.thumb
      ? `<img src="${esc(v.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`
      : '';
    return `<article class="vd-card" id="v-${esc(v.id)}">
      <button type="button" class="vd-capa ${v.vertical ? 'vert' : ''}" data-ver="${esc(v.id)}" aria-label="Assistir: ${esc(v.titulo)}">
        <span class="vd-fundo" data-marca="losango"></span>${capa}
        <span class="vd-plat">${esc(v.plataforma)}</span><span class="vd-play">${SVG.play}</span>
      </button>
      <div class="vd-info">
        <span class="kicker">${esc(v.tema)}</span>
        <strong>${esc(v.titulo)}</strong>
        ${v.autor ? `<span class="vd-autor">por ${esc(v.autor)}</span>` : ''}
      </div>
      <div class="vd-acoes">
        ${v.download ? `<a class="vd-b forte" href="${esc(v.download)}" target="_blank" rel="noopener noreferrer">${SVG.baixar}Baixar</a>` : `<a class="vd-b forte" href="${esc(v.link)}" target="_blank" rel="noopener noreferrer">${I.externo || ''}Abrir no ${esc(v.plataforma)}</a>`}
        <a class="vd-b" href="https://wa.me/?text=${encodeURIComponent(`${v.titulo} · assiste e repassa: ${url(v)}`)}" target="_blank" rel="noopener">${SVG.zap}WhatsApp</a>
        <button type="button" class="vd-b" data-insta="${esc(v.id)}">${SVG.insta}Instagram</button>
        <a class="vd-b" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url(v))}" target="_blank" rel="noopener">${SVG.face}Facebook</a>
        <button type="button" class="vd-b" data-copiar="${esc(v.id)}">${I.link || ''}Copiar link</button>
      </div>
    </article>`;
  }

  function desenha() {
    const temas = ['Todos', ...[...new Set(V.map((v) => v.tema))].sort((a, b) => (a === 'No meu tempo' ? -1 : b === 'No meu tempo' ? 1 : a.localeCompare(b, 'pt')))];
    const lista = tema === 'Todos' ? V : V.filter((v) => v.tema === tema);
    const grupos = tema === 'Todos' ? temas.slice(1).map((t) => [t, V.filter((v) => v.tema === t)]) : [[tema, lista]];
    el.innerHTML = `
      <section class="capa vd-capa-pg"><div class="miolo">
        <p class="kicker">nossas produções</p>
        <h1>Vídeos <em>no ar</em></h1>
        <div class="vd-conta"><b>${V.length}</b><span>${V.length === 1 ? 'vídeo no ar' : 'vídeos no ar'}</span></div>
        <p class="lead">Assista, baixe e mande pra quem ainda não decidiu. Gravou o seu? <a href="/enviar-video">Mande o link</a> que a equipe confere e coloca aqui.</p>
      </div></section>
      <section class="miolo vd-sec">
        ${V.length ? `<div class="vd-temas" role="tablist">${temas.map((t) => `<button type="button" class="${t === tema ? 'on' : ''}" data-tema="${esc(t)}">${esc(t)} <small>${t === 'Todos' ? V.length : V.filter((v) => v.tema === t).length}</small></button>`).join('')}</div>` : ''}
        ${grupos.map(([t, vs]) => `<h2 class="vd-h">${esc(t)}</h2><div class="vd-grade">${vs.map(cartao).join('')}</div>`).join('') || '<p class="vd-vazio">Os primeiros vídeos estão sendo conferidos. Volte daqui a pouco.</p>'}
      </section>`;
    if (window.MARCA && MARCA.aplica) MARCA.aplica(el);
  }

  function assistir(v) {
    if (!v.embed) { window.open(v.link, '_blank', 'noopener'); return; }
    const m = document.createElement('div');
    m.className = 'vd-modal';
    m.innerHTML = `<div class="vd-caixa ${v.vertical ? 'vert' : ''}" role="dialog" aria-modal="true" aria-label="${esc(v.titulo)}">
      <button type="button" class="vd-fecha" aria-label="Fechar">${SVG.fechar}</button>
      <div class="vd-player"><iframe src="${esc(v.embed)}" title="${esc(v.titulo)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>
      <p class="vd-mt"><strong>${esc(v.titulo)}</strong><a href="${esc(v.link)}" target="_blank" rel="noopener noreferrer">abrir no ${esc(v.plataforma)}</a></p></div>`;
    const fecha = () => { m.remove(); document.body.style.overflow = ''; if (location.hash.startsWith('#v-')) history.replaceState(null, '', location.pathname); };
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('.vd-fecha')) fecha(); });
    document.addEventListener('keydown', function esc_(e) { if (e.key === 'Escape') { fecha(); document.removeEventListener('keydown', esc_); } });
    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';
    history.replaceState(null, '', `#v-${v.id}`);
  }

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-tema]');
    if (t) { tema = t.dataset.tema; desenha(); return; }
    const ver = e.target.closest('[data-ver]');
    if (ver) { assistir(V.find((v) => v.id === ver.dataset.ver)); return; }
    const c = e.target.closest('[data-copiar]');
    if (c) { const v = V.find((x) => x.id === c.dataset.copiar); copia(url(v), 'Link copiado'); return; }
    const ig = e.target.closest('[data-insta]');
    if (ig) {
      const v = V.find((x) => x.id === ig.dataset.insta);
      // o Instagram não tem botão de compartilhar pela web: no celular abre o menu do sistema (onde ele aparece), no computador copia o link
      if (navigator.share) { try { await navigator.share({ title: v.titulo, text: `${v.titulo} · seu voto decide`, url: url(v) }); return; } catch (err) { if (err.name === 'AbortError') return; } }
      copia(url(v), 'Link copiado: cole no story, na bio ou na DM do Instagram');
    }
  });

  fetch('/public/videos').then((r) => r.json()).then((d) => {
    V = d.videos || [];
    desenha();
    const h = /^#v-(.+)$/.exec(location.hash);
    if (h) { const v = V.find((x) => x.id === h[1]); if (v) { document.getElementById(`v-${v.id}`)?.scrollIntoView({ block: 'center' }); assistir(v); } }
  }).catch(() => { el.innerHTML = '<section class="miolo vd-sec"><p class="vd-vazio">Não conseguimos carregar os vídeos agora. Tente de novo em instantes.</p></section>'; });
})();
