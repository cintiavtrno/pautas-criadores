// Página "quem faz": galeria de losangos sorteada a cada visita, filtro por função,
// ficha da pessoa escolhida e idealização fixa. Dados de /public/equipe.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DESC = {
    'Escrita e pesquisa': 'Monta o material com as pautas e as sugestões de roteiro.',
    'Audiovisual': 'Criam os templates de edição que qualquer pessoa pode usar para editar o seu vídeo.',
    'Design': 'Cria a identidade visual e o PDF com as pautas.',
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
    // losangos encaixados: quantos cabem por fileira depende da largura
    const larg = grade.parentElement.clientWidth || 860;
    const T = larg < 520 ? 120 : 168, meio = T / 2;
    const porLinha = Math.max(2, Math.floor((larg - meio) / T));
    const pos = new Map(vis.map((id, k) => [id, k]));
    const linhas = Math.max(1, Math.ceil(vis.length / porLinha));
    const altura = (linhas - 1) * meio + T;
    grade.style.height = altura + 'px';
    grade.style.width = (porLinha * T + meio) + 'px';
    grade.style.setProperty('--t', T + 'px');
    grade.querySelectorAll('.tile').forEach((el) => {
      const i = +el.dataset.i; const k = pos.get(i); const on = k !== undefined;
      el.style.left = (on ? (k % porLinha) * T + (Math.floor(k / porLinha) % 2 ? meio : 0) : (porLinha * T) / 2 - meio) + 'px';
      el.style.top = (on ? Math.floor(k / porLinha) * meio : altura / 2 - meio) + 'px';
      el.classList.toggle('fora', !on); el.tabIndex = on ? 0 : -1;
      const s = gente[i].id === sel; el.classList.toggle('sel', s); el.setAttribute('aria-pressed', s ? 'true' : 'false');
    });
    filtros.querySelectorAll('.chip').forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === filtro ? 'true' : 'false'));
    document.getElementById('msg-filtro').textContent = filtro && MSGF[filtro] ? MSGF[filtro] : filtro === 'Idealização' ? 'Quem teve a ideia e puxou o seu voto decide.' : 'Escolha um tipo de atividade para ver quem faz.';
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
    const nomes = ['', ...(ideia.length ? ['Idealização'] : []), ...TIPOS.filter((t) => gente.some((p) => (p.funcoes || []).includes(t)))];
    filtros.innerHTML = nomes.map((nm) => `<button type="button" class="chip" data-f="${esc(nm)}" aria-pressed="false">${nm ? esc(nm) : 'Todo mundo'} <i>${gente.filter((p) => temFun(p, nm)).length}</i></button>`).join('');
    filtros.addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; filtro = b.dataset.f; seed = Math.floor(Math.random() * 1e9); desenha(); });
    grade.innerHTML = gente.map((p, i) => {
      const curto = primeiro(p.nome).toLowerCase();
      return `<button type="button" class="tile fora" data-i="${i}" aria-pressed="false" aria-label="${esc(p.nome + ((p.funcoes || []).length ? ', ' + p.funcoes.join(', ') : ''))}" tabindex="-1"><span class="d">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy" />` : `<b>${esc(ini(p.nome))}</b>`}<small>${esc(curto)}</small></span></button>`;
    }).join('');
    grade.addEventListener('click', (e) => { const b = e.target.closest('.tile'); if (!b) return; sel = gente[+b.dataset.i].id; desenha(); if (matchMedia('(max-width: 900px)').matches) boxSel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    document.getElementById('embaralha').addEventListener('click', () => { seed = Math.floor(Math.random() * 1e9); desenha(); });
    let rt; window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(desenha, 150); });
    desenha();
    // idealização: fixa, em ordem alfabética
    if (ideia.length) {
      ideia.sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' }));
      document.getElementById('lista-ideia').innerHTML = ideia.map((p) => `<div class="qf-pessoa"><div class="diam grande">${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nome)}" loading="lazy" />` : esc(ini(p.nome))}</div><b>${esc(p.nome)}</b><span>${esc((p.funcoes || []).join(', ').toLowerCase())}</span></div>`).join('');
      document.getElementById('ideia').hidden = false;
    }
  }).catch(() => { grade.innerHTML = ''; });
})();
