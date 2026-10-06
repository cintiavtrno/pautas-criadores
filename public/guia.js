// Guia de comunicação popular: eixos com roteiros, ganchos por nicho, busca e links diretos.
(function () {
  const G = window.GUIA;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ROTULO = { comunicar: 'Como comunicar', conexao: 'Conexão possível', texto: '', gancho: 'Gancho possível' };
  const totalTemas = G.eixos.reduce((n, e) => n + e.temas.length, 0);
  const totalGanchos = G.nichos.reduce((n, x) => n + x.ideias.length, 0);
  let eixoAtual = 0; // 0 = todos
  let nichoAtual = '';
  let busca = '';

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1600);
  }
  async function copia(texto, aviso) {
    try { await navigator.clipboard.writeText(texto); toast(aviso); }
    catch { const a = document.createElement('textarea'); a.value = texto; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); toast(aviso); }
  }

  /* números da capa */
  $('#g-numeros').hidden = false;
  $('#g-numeros').innerHTML = [[6, 'eixos, um por público'], [totalTemas, 'sugestões de roteiro'], [totalGanchos, 'ganchos por nicho']]
    .map(([n, t]) => `<div><b data-conta-guia="${n}">0</b><span>${t}</span></div>`).join('');
  $$('[data-conta-guia]').forEach((el) => conta(el, +el.dataset.contaGuia));

  /* criador / não crio conteúdo */
  $$('[data-quem]').forEach((b) => (b.onclick = () => {
    $$('[data-quem]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
    $$('[data-painel]').forEach((p) => (p.hidden = p.dataset.painel !== b.dataset.quem));
  }));

  /* eixos */
  const nav = $('#g-eixos-nav');
  nav.innerHTML = `<button type="button" role="tab" data-eixo="0"><span class="g-en">todos</span><strong>Todos os eixos</strong><small>${totalTemas} roteiros</small></button>` +
    G.eixos.map((e) => `<button type="button" role="tab" data-eixo="${e.n}"><span class="g-en">eixo ${e.n}</span><strong>${esc(e.curto)}</strong><small><b>${esc(e.num)}</b> ${esc(e.numTxt)}</small></button>`).join('');
  nav.onclick = (ev) => {
    const b = ev.target.closest('[data-eixo]'); if (!b) return;
    escolheEixo(+b.dataset.eixo, true);
  };

  const FUNIL = ['posso votar?', 'como voto?', 'por que vale a pena votar?', 'o que está em disputa?', 'como decido?', 'vou votar dia 25'];
  function funil() {
    return `<figure class="g-funil" aria-label="Funil da conversa">
      <figcaption class="kicker">a conversa como um funil</figcaption>
      <ol>${FUNIL.map((f, i) => `<li style="--i:${i}"><span>${i + 1}</span>${esc(f)}</li>`).join('')}</ol>
    </figure>`;
  }

  function cabecalhoEixo(e) {
    return `<header class="g-ecab" id="eixo-${e.n}">
      <div class="g-ecab-l">
        <p class="kicker">eixo ${e.n}</p>
        <h2>${esc(e.titulo)}</h2>
        ${e.intro.map((p) => `<p class="g-intro">${esc(p)}</p>`).join('')}
      </div>
      <div class="g-num"><b>${esc(e.num)}</b><span>${esc(e.numTxt)}</span></div>
    </header>
    <div class="g-ecorpo">
      <section><h3>Quem são essas pessoas</h3>${e.quem.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
      <section><h3>Por que comunicar com esse público</h3>${e.porque.map((p) => `<p>${esc(p)}</p>`).join('')}${e.n === 1 ? funil() : ''}</section>
      ${e.cuidado ? `<section class="g-cuidado"><h3>${ICONE.conversa}Cuidado com a comunicação</h3><p>${esc(e.cuidado)}</p></section>` : ''}
    </div>`;
  }

  function textoTema(e, t) {
    return `${t.titulo}\n\n${t.roteiro.join('\n')}${t.autor ? `\n\nRoteiro: ${t.autor} · seu voto decide` : ''}`;
  }
  function tema(e, t, aberto) {
    const id = `tema-${e.n}-${t.n}`;
    return `<article class="g-tema ${aberto ? 'aberto' : ''}" id="${id}" data-busca="${esc(norm(t.titulo + ' ' + t.roteiro.join(' ') + ' ' + t.autor))}">
      <button type="button" class="g-tema-cab" aria-expanded="${aberto}" aria-controls="${id}-c">
        <span class="g-tn">${e.n}.${t.n}</span>
        <span class="g-tt">${esc(t.titulo)}</span>
        <span class="g-autor">${esc(t.autor || '')}</span>
        <i class="g-mais" aria-hidden="true"></i>
      </button>
      <div class="g-tema-c" id="${id}-c">
        <div class="g-roteiro">
          <p class="kicker">sugestão de roteiro</p>
          ${t.roteiro.map((p) => `<p>${esc(p)}</p>`).join('')}
          ${t.refs.length ? `<div class="g-refs"><p class="kicker">onde checar</p><ul>${t.refs.map((r) => `<li>${r.url && r.url !== r.t ? `${esc(r.t)} <a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">abrir fonte</a>` : r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.url.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60))}…</a>` : esc(r.t)}</li>`).join('')}</ul></div>` : ''}
        </div>
        <div class="g-acoes">
          <button type="button" class="btn" data-copiar="${e.n}-${t.n}">${ICONE.copiar} Copiar roteiro</button>
          <button type="button" class="btn ghost" data-link="${id}">${ICONE.link} Copiar link deste tema</button>
        </div>
      </div>
    </article>`;
  }

  function renderEixos(abrirId) {
    const box = $('#g-eixo');
    const lista = eixoAtual ? G.eixos.filter((e) => e.n === eixoAtual) : G.eixos;
    const q = norm(busca);
    let achados = 0;
    box.innerHTML = lista.map((e) => {
      const temas = e.temas.filter((t) => !q || norm(t.titulo + ' ' + t.roteiro.join(' ') + ' ' + t.autor).includes(q));
      achados += temas.length;
      if (q && !temas.length) return '';
      return `<div class="g-bloco">${cabecalhoEixo(e)}
        <div class="g-temas-cab"><p class="kicker">temas · ${temas.length}${q ? ` com "${esc(busca)}"` : ''}</p>${!q ? `<button type="button" class="g-abrir-todos" data-abrir-todos="${e.n}">abrir todos</button>` : ''}</div>
        <div class="g-temas">${temas.map((t) => tema(e, t, !!q || `tema-${e.n}-${t.n}` === abrirId)).join('')}</div></div>`;
    }).join('') || `<p class="g-vazio">Nenhum roteiro com "${esc(busca)}". Tente outra palavra ou veja os <a href="#ganchos">ganchos</a>.</p>`;
    $$('[data-eixo]', nav).forEach((b) => { const on = +b.dataset.eixo === eixoAtual; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    if (q) marca(box, busca);
    return achados;
  }

  function escolheEixo(n, rolar) {
    eixoAtual = n;
    renderEixos();
    history.replaceState(null, '', n ? `#eixo-${n}` : '#eixos');
    if (rolar) $('#g-eixo').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  $('#g-eixo').addEventListener('click', (ev) => {
    const cab = ev.target.closest('.g-tema-cab');
    if (cab) { const art = cab.closest('.g-tema'); const ab = art.classList.toggle('aberto'); cab.setAttribute('aria-expanded', ab); return; }
    const cp = ev.target.closest('[data-copiar]');
    if (cp) { const [en, tn] = cp.dataset.copiar.split('-').map(Number); const e = G.eixos[en - 1]; copia(textoTema(e, e.temas.find((t) => t.n === tn)), 'Roteiro copiado'); return; }
    const lk = ev.target.closest('[data-link]');
    if (lk) { copia(`${location.origin}/guia#${lk.dataset.link}`, 'Link do tema copiado'); return; }
    const at = ev.target.closest('[data-abrir-todos]');
    if (at) {
      const bloco = at.closest('.g-bloco'); const abrir = at.textContent === 'abrir todos';
      $$('.g-tema', bloco).forEach((a) => { a.classList.toggle('aberto', abrir); $('.g-tema-cab', a).setAttribute('aria-expanded', abrir); });
      at.textContent = abrir ? 'fechar todos' : 'abrir todos';
    }
  });

  /* ganchos por nicho */
  const nnav = $('#g-nichos-nav');
  nnav.innerHTML = `<button type="button" data-nicho="" class="on">Todos <i>${totalGanchos}</i></button>` +
    G.nichos.map((n) => `<button type="button" data-nicho="${esc(n.nome)}">${esc(n.nome)} <i>${n.ideias.length}</i></button>`).join('');
  nnav.onclick = (ev) => {
    const b = ev.target.closest('[data-nicho]'); if (!b) return;
    nichoAtual = b.dataset.nicho; renderGanchos();
  };
  function cardGancho(n, it, i) {
    const gancho = it.campos.filter((c) => c[0] === 'gancho').map((c) => c[1]);
    const resto = it.campos.filter((c) => c[0] !== 'gancho');
    return `<article class="g-gancho" data-busca="${esc(norm(n.nome + ' ' + it.titulo + ' ' + it.campos.map((c) => c[1]).join(' ')))}">
      <p class="g-gnicho">${esc(n.nome)}</p>
      <h3>${esc(it.titulo)}</h3>
      ${resto.map(([k, v]) => `<p>${ROTULO[k] ? `<b>${ROTULO[k]}:</b> ` : ''}${esc(v)}</p>`).join('')}
      ${gancho.map((g) => `<blockquote><span class="kicker">gancho possível</span>${esc(g)}<button type="button" class="g-copia-g" data-gancho="${esc(g)}" title="Copiar gancho">${ICONE.copiar}<span class="sr">Copiar gancho</span></button></blockquote>`).join('')}
    </article>`;
  }
  function renderGanchos() {
    const q = norm(busca);
    const lista = G.nichos.filter((n) => !nichoAtual || n.nome === nichoAtual);
    const nicho = G.nichos.find((n) => n.nome === nichoAtual);
    $('#g-dica').innerHTML = nicho && nicho.dica ? `<b>Dica geral pra esse nicho:</b> ${esc(nicho.dica)}` : '';
    const html = lista.flatMap((n) => n.ideias.map((it, i) => ({ n, it, i })))
      .filter(({ n, it }) => !q || norm(n.nome + ' ' + it.titulo + ' ' + it.campos.map((c) => c[1]).join(' ')).includes(q))
      .map(({ n, it, i }) => cardGancho(n, it, i)).join('');
    $('#g-ganchos').innerHTML = html || `<p class="g-vazio">Nenhum gancho com "${esc(busca)}".</p>`;
    $$('[data-nicho]', nnav).forEach((b) => b.classList.toggle('on', b.dataset.nicho === nichoAtual));
    if (q) marca($('#g-ganchos'), busca);
  }
  $('#g-ganchos').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-gancho]'); if (b) copia(b.dataset.gancho, 'Gancho copiado');
  });

  /* destaque dos termos buscados */
  function marca(raiz, termo) {
    const t = norm(termo).trim(); if (t.length < 2) return;
    const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentNode.closest('button, .kicker, mark') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    const nos = []; while (walker.nextNode()) nos.push(walker.currentNode);
    nos.forEach((no) => {
      const txt = no.nodeValue; const n = norm(txt); const i = n.indexOf(t);
      if (i < 0) return;
      const span = document.createElement('span');
      span.innerHTML = esc(txt.slice(0, i)) + '<mark>' + esc(txt.slice(i, i + t.length)) + '</mark>' + esc(txt.slice(i + t.length));
      no.replaceWith(span);
    });
  }

  /* busca */
  let tq;
  $('#g-q').addEventListener('input', (ev) => {
    clearTimeout(tq);
    tq = setTimeout(() => {
      busca = ev.target.value.trim();
      if (busca) { eixoAtual = 0; nichoAtual = ''; }
      const n = renderEixos(); renderGanchos();
      if (busca) toast(`${n} roteiro${n === 1 ? '' : 's'} e ${$$('.g-gancho').length} gancho${$$('.g-gancho').length === 1 ? '' : 's'}`);
    }, 250);
  });
  $('#g-q').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('#g-eixo').scrollIntoView({ behavior: 'smooth' }); });

  /* barra de seções: marca onde a pessoa está */
  const links = $$('#g-sub a');
  const secoes = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => {
      if (!en.isIntersecting) return;
      const id = '#' + en.target.id;
      links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === id || (id === '#eixos' && a.getAttribute('href') === '#eixos')));
    }), { rootMargin: '-45% 0px -50% 0px' });
    secoes.forEach((s) => io.observe(s));
    const area = $('.g-eixo-area'); if (area) { area.id = area.id || 'eixos-area'; new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) links.forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#eixos')); }), { rootMargin: '-45% 0px -50% 0px' }).observe(area); }
  }

  /* abre direto pelo link (#eixo-3 ou #tema-3-2) */
  function peloHash() {
    const h = location.hash;
    let m = /^#tema-(\d+)-(\d+)$/.exec(h);
    if (m) { eixoAtual = +m[1]; renderEixos(`tema-${m[1]}-${m[2]}`); setTimeout(() => document.getElementById(h.slice(1))?.scrollIntoView({ block: 'start' }), 60); return; }
    m = /^#eixo-(\d+)$/.exec(h);
    if (m) { eixoAtual = +m[1]; renderEixos(); setTimeout(() => $('#g-eixo').scrollIntoView({ block: 'start' }), 60); return; }
    renderEixos();
  }
  peloHash();
  renderGanchos();
  window.addEventListener('hashchange', () => { if (/^#(tema|eixo)-/.test(location.hash)) peloHash(); });
})();
