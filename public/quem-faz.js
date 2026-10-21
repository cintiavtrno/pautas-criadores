// Página "quem faz": galeria de losangos sorteada a cada visita, filtro por função,
// ficha da pessoa escolhida e idealização fixa. Dados de /public/equipe.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DESC = {
    'Escrita e pesquisa': 'Monta o material com as pautas, as sugestões de roteiro e a checagem dos fatos.',
    'Audiovisual': 'Faz a produção audiovisual do seu voto decide: os vídeos e os templates da própria campanha.',
    'Design': 'Cria a identidade visual, os cards, os templates e o PDF com as pautas.',
    'Marketing': 'Pensa as estratégias para o seu voto decide chegar mais longe.',
    'Site': 'Cuida deste site e da base de dados.',
  };
  const MSGF = {
    'Escrita e pesquisa': 'Tem um negócio e precisa de texto, roteiro ou pesquisa? Talvez alguém aqui faça um freela com você.',
    'Audiovisual': 'Tem um negócio e precisa de vídeo ou edição? Talvez alguém aqui faça um freela com você.',
    'Design': 'Tem um negócio e precisa de identidade visual, post ou material gráfico? Talvez alguém aqui faça um freela com você.',
    'Marketing': 'Tem um negócio e quer divulgar, mas não sabe por onde começar? Talvez alguém aqui faça um freela com você.',
    'Site': 'Tem um negócio e precisa de um site ou de uma base de dados? Talvez alguém aqui faça um freela com você.',
  };
  const ini = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const primeiro = (n) => String(n).split(/\s+/)[0];
  const rede = (u) => {
    try { const url = new URL(u); const h = url.hostname.replace(/^www\./, ''); const c = url.pathname.split('/').filter(Boolean)[0];
      const r = { 'instagram.com': 'instagram', 'tiktok.com': 'tiktok', 'x.com': 'x', 'twitter.com': 'x', 'youtube.com': 'youtube', 'linkedin.com': 'linkedin', 'threads.net': 'threads', 'bsky.app': 'bluesky', 'behance.net': 'behance' }[h];
      return r && c ? `@${decodeURIComponent(c).replace(/^@/, '')} · ${r}` : (r || h);
    } catch { return 'rede social'; }
  };
  const q = new URLSearchParams(location.search);
  let gente = [], filtro = q.get('f') || '', sel = q.get('p') || '', seed = Math.floor(Math.random() * 1e9);
  const grade = document.getElementById('grade'), filtros = document.getElementById('filtros'), boxSel = document.getElementById('sel');

  function ordem() {
    const o = gente.map((_, i) => i); let x = seed || 1;
    for (let i = o.length - 1; i > 0; i--) { x = (x * 1103515245 + 12345) & 0x7fffffff; const j = x % (i + 1); [o[i], o[j]] = [o[j], o[i]]; }
    return o;
  }
  const temFun = (p, f) => !f || (f === 'Idealização' ? p.idealizadora : (p.funcoes || []).includes(f));

  function desenha() {
    const vis = ordem().filter((i) => temFun(gente[i], filtro));
    if (!vis.some((i) => gente[i].id === sel)) sel = vis.length ? gente[vis[0]].id : '';
    // a ordem sorteada vira a ordem dos itens na grade
    const pos = new Map(vis.map((id, k) => [id, k]));
    grade.querySelectorAll('.tile').forEach((el) => {
      const i = +el.dataset.i; const k = pos.get(i); const on = k !== undefined;
      el.hidden = !on; el.style.order = on ? k : 999;
      const s = gente[i].id === sel; el.classList.toggle('sel', s); el.setAttribute('aria-pressed', s ? 'true' : 'false');
    });
    filtros.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === filtro ? 'true' : 'false'));
    document.getElementById('msg-filtro').textContent = filtro && MSGF[filtro] ? MSGF[filtro] : filtro === 'Idealização' ? 'Idealizaram o seu voto decide.' : 'Escolha um tipo de atividade para ver quem faz.';
    document.getElementById('desc-filtro').textContent = DESC[filtro] || '';
    ficha();
  }

  function ficha() {
    const p = gente.find((x) => x.id === sel);
    if (!p) { boxSel.innerHTML = ''; return; }
    const fun = [...(p.idealizadora ? ['Idealização'] : []), ...(p.funcoes || [])].join(' · ');
    boxSel.innerHTML = `<div class="qf-sel-cab"><div class="diam">${p.foto ? `<img src="${esc(p.foto)}" alt="" />` : esc(ini(p.nome))}</div>
      <div><h2 class="tit">${esc(p.nome)}</h2><div class="qf-fun">${esc(fun)}</div></div></div>
      ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
      ${p.link ? `<div class="qf-rede-link">${esc(rede(p.link))}</div><div><a class="btn" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">Chamar ${esc(primeiro(p.nome))}</a></div>` : '<p class="qf-fun">Ainda sem contato público.</p>'}`;
  }

  fetch('/public/equipe').then((r) => r.json()).then((eq) => {
    gente = eq || [];
    if (!gente.length) { grade.innerHTML = '<p class="muted">Em breve.</p>'; return; }
    const TIPOS = ['Escrita e pesquisa', 'Audiovisual', 'Design', 'Marketing', 'Site'];
    const ideia = gente.filter((p) => p.idealizadora);
    const nomes = ['', ...TIPOS.filter((t) => gente.some((p) => (p.funcoes || []).includes(t)))];
    filtros.innerHTML = nomes.map((nm) => `<button type="button" class="chip" data-f="${esc(nm)}" aria-pressed="false">${nm ? esc(nm) : 'Todo mundo'} <i>${gente.filter((p) => temFun(p, nm)).length}</i></button>`).join('');
    filtros.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; filtro = b.dataset.f; seed = Math.floor(Math.random() * 1e9); desenha(); });
    grade.innerHTML = gente.map((p, i) => {
      const fun = [...(p.idealizadora ? ['Idealização'] : []), ...(p.funcoes || [])];
      return `<button type="button" class="tile" data-i="${i}" aria-pressed="false" aria-label="${esc(p.nome + (fun.length ? ', ' + fun.join(', ') : ''))}"><span class="d">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy" />` : `<b>${esc(ini(p.nome))}</b>`}</span><span class="t-nome">${esc(p.nome)}</span><span class="t-fun">${esc(fun.join(' · '))}</span></button>`;
    }).join('');
    grade.addEventListener('click', (e) => { const b = e.target.closest('.tile'); if (!b) return; sel = gente[+b.dataset.i].id; desenha(); if (matchMedia('(max-width: 900px)').matches) boxSel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    document.getElementById('embaralha').addEventListener('click', () => { seed = Math.floor(Math.random() * 1e9); desenha(); });
    desenha();
    if (ideia.length) {
      ideia.sort((x, y) => x.nome.localeCompare(y.nome, 'pt', { sensitivity: 'base' }));
      document.getElementById('lista-ideia').innerHTML = ideia.map((p) => `<article class="qf-pessoa">
        <a class="circ-g" href="?p=${encodeURIComponent(p.id)}#sel" aria-label="${esc(p.nome)}">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy" />` : esc(ini(p.nome))}</a>
        <b>${esc(p.nome)}</b><span>${esc((p.funcoes || []).join(' · '))}</span>
        ${p.bio ? `<p>${esc(p.bio)}</p>` : ''}
        ${p.link ? `<a class="qf-rede-link" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(rede(p.link))}</a>` : ''}
      </article>`).join('');
      document.getElementById('idealizacao').hidden = false;
      if (location.hash === '#idealizacao') document.getElementById('idealizacao').scrollIntoView();
    }
  }).catch(() => { grade.innerHTML = ''; });
})();
