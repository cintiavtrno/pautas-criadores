// Equipe na página: idealizadoras em destaque + grade por função com filtro.
// Usado na página inicial e no guia. Os dados vêm de /public/equipe (o que muda no controle aparece aqui).
(function () {
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// equipe: retrato, nome, função, mini bio e rede social. Filtro por função.
const FUNCOES = [
  ['Escrita e pesquisa', 'Monta o material com as pautas e as sugestões de roteiro.'],
  ['Audiovisual', 'Criam os templates de edição que qualquer pessoa pode usar para editar o seu vídeo.'],
  ['Design', 'Cria a identidade visual e o PDF com as pautas.'],
  ['Marketing', 'Pensa as estratégias para o seu voto decide chegar mais longe.'],
  ['Site', 'Cuida deste site e da base de dados.'],
];
const ordemFuncao = (p) => { const i = FUNCOES.findIndex(([f]) => (p.funcoes || [])[0] === f); return i < 0 ? 99 : i; };
const iniciais = (n) => String(n).split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
function rotuloRede(u) {
  try {
    const url = new URL(u); const host = url.hostname.replace(/^www\./, ''); const caminho = url.pathname.split('/').filter(Boolean);
    const rede = { 'instagram.com': 'instagram', 'tiktok.com': 'tiktok', 'x.com': 'x', 'twitter.com': 'x', 'youtube.com': 'youtube', 'linkedin.com': 'linkedin', 'threads.net': 'threads', 'bsky.app': 'bluesky', 'behance.net': 'behance' }[host];
    if (rede && caminho[0] && !['in', 'channel', 'c', 'profile'].includes(caminho[0])) return `@${decodeURIComponent(caminho[0]).replace(/^@/, '')} · ${rede}`;
    return rede || host;
  } catch { return 'rede social'; }
}
function cartao(p, grande) {
  const fun = (p.funcoes || []).join(' · ');
  if (grande) return `<article class="pessoa-eq grande revela">
    <figure class="retrato">${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nome)}" loading="lazy" />` : `<span class="ini">${esc(iniciais(p.nome))}</span>`}</figure>
    <p class="func">idealizadora${fun ? ' · ' + esc(fun) : ''}</p>
    <h3>${esc(p.nome)}</h3>
    ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
    ${p.link ? `<a class="rede" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(rotuloRede(p.link))}</a>` : ''}
  </article>`;
  return `<article class="pessoa-eq revela" data-funcoes="${esc((p.funcoes || []).join('|'))}" data-ideia="${p.idealizadora ? 1 : 0}" tabindex="-1">
    <figure class="retrato">${p.foto ? `<img src="${esc(p.foto)}" alt="${esc(p.nome)}" loading="lazy" />` : `<span class="ini">${esc(iniciais(p.nome))}</span>`}</figure>
    <h3>${esc(p.nome)}</h3>
    ${fun || p.idealizadora ? `<p class="func">${p.idealizadora ? '<b>idealizadora</b>' + (fun ? ' · ' : '') : ''}${esc(fun)}</p>` : ''}
    ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
    ${p.link ? `<a class="rede" href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(rotuloRede(p.link))}</a>` : ''}
  </article>`;
}
fetch('/public/equipe').then((r) => r.json()).then((equipe) => {
  const box = document.getElementById('lista-equipe');
  if (!equipe.length) { box.innerHTML = '<p class="muted">Em breve.</p>'; return; }
  equipe.sort((a, b) => ordemFuncao(a) - ordemFuncao(b) || a.nome.localeCompare(b.nome, 'pt'));
  box.innerHTML = equipe.map((p) => cartao(p)).join('');
  observaRevela(box);

  // quem idealizou: em destaque, antes da equipe por função
  const ideia = equipe.filter((p) => p.idealizadora).sort((a, b) => a.nome.localeCompare(b.nome, 'pt', { sensitivity: 'base' }));
  if (ideia.length) {
    const lista = document.getElementById('lista-ideia');
    lista.innerHTML = ideia.map((p) => cartao(p, true)).join('');
    document.getElementById('ideia').hidden = false;
    observaRevela(document.getElementById('ideia'));
  }

  // filtro por função
  const presentes = FUNCOES.filter(([f]) => equipe.some((p) => (p.funcoes || []).includes(f)));
  const filtro = document.getElementById('filtro-eq');
  const desc = document.getElementById('desc-funcao');
  filtro.innerHTML = `<button type="button" class="on" data-f="">Todo mundo <i>${equipe.length}</i></button>` +
    (ideia.length ? `<button type="button" data-f="Idealização">${(window.ICONE || {}).losango || ''}Idealização <i>${ideia.length}</i></button>` : '') +
    presentes.map(([f]) => `<button type="button" data-f="${esc(f)}">${(window.ICONE || {})[(window.ICONE_FUNCAO || {})[f]] || ''}${esc(f)} <i>${equipe.filter((p) => (p.funcoes || []).includes(f)).length}</i></button>`).join('');
  filtro.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    const f = b.dataset.f;
    filtro.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
    desc.textContent = f === 'Idealização' ? 'Idealizaram o seu voto decide.' : f ? (FUNCOES.find(([n]) => n === f) || [])[1] || '' : '';
    box.classList.toggle('filtrando', !!f);
    box.querySelectorAll('.pessoa-eq').forEach((c) => c.classList.toggle('dentro', !!f && (f === 'Idealização' ? c.dataset.ideia === '1' : c.dataset.funcoes.split('|').includes(f))));
  });

  // no celular não existe "passar o mouse": a foto ganha cor quando chega no meio da tela
  if (window.matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((en) => en.target.classList.toggle('cor', en.isIntersecting)), { rootMargin: '-38% 0px -38% 0px' });
    document.querySelectorAll('.pessoa-eq').forEach((c) => io.observe(c));
  }
}).catch(() => { document.getElementById('lista-equipe').innerHTML = ''; });
})();
