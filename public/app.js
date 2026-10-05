/* Espelho de pautas — frontend
   Tudo salva sozinho: cada mudança vai direto para a API. */

const STATUS = ['Mapeado', 'Contatado', 'Topou', 'Em roteiro', 'Em edição', 'Publicado', 'Recusou'];
const PAUTA_STATUS = ['Sugerida', 'Livre', 'Reservada', 'Em produção', 'Publicada', 'Descartada'];
const RESP = ['Camilla', 'Yara'];
const FUNCOES = ['Escrita e pesquisa', 'Edição dos vídeos', 'Design', 'Marketing', 'Apresentação', 'Site'];
const funcoesDe = (t) => (t.funcoes && t.funcoes.length ? t.funcoes : t.funcao ? [t.funcao] : []);
// lista da equipe para os seletores, com quem tem a função certa primeiro
const equipePor = (fn) => () => {
  const com = S.team.filter((t) => funcoesDe(t).includes(fn));
  const sem = S.team.filter((t) => !funcoesDe(t).includes(fn));
  return [...com, ...sem].map((t) => [t.id, `${t.nome}${funcoesDe(t).length ? ' · ' + funcoesDe(t).join(', ') : ''}`]);
};
const ANDAMENTO = ['Topou', 'Em roteiro', 'Em edição', 'Publicado'];

const S = {
  creators: [], pautas: [], team: [], nichos: [],
  view: 'criadores',
  sel: {},
  f: { q: '', nicho: '', status: '', linha: '', resp: '', origem: '' },
  fp: { q: '', nicho: '', status: '' },
};

/* ---------- utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const find = (col, id) => S[col].find((x) => x.id === id);
const corNicho = (n) => (S.nichos.find((x) => x.nome === n) || {}).cor || '#8d8b83';
const statusTag = (s) => `<span class="tag st-${slug(s)}">${esc(s)}</span>`;
const fmtData = (d) => (d ? new Date(d.length === 10 ? d + 'T12:00' : d).toLocaleDateString('pt-BR') : '');
const iniciais = (r) => (r ? r.slice(0, 2).toUpperCase() : '—');

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1500);
}
function flashSaved() {
  const s = $('.saved'); if (!s) return;
  s.classList.add('show'); clearTimeout(s._t); s._t = setTimeout(() => s.classList.remove('show'), 1200);
}

const api = {
  async list(c) { const r = await fetch(`/api/${c}`); if (!r.ok) throw new Error('Falha ao carregar'); return r.json(); },
  async save(c, data) {
    const r = await fetch(data.id ? `/api/${c}/${data.id}` : `/api/${c}`, {
      method: data.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error('Não salvou. Tente de novo.');
    return r.json();
  },
  async del(c, id) { await fetch(`/api/${c}/${id}`, { method: 'DELETE' }); },
};

async function loadAll() {
  [S.creators, S.pautas, S.team, S.nichos] = await Promise.all(['creators', 'pautas', 'team', 'nichos'].map(api.list));
}
async function save(col, rec, patch) {
  try {
    const out = await api.save(col, { id: rec.id, ...patch });
    Object.assign(rec, out);
    flashSaved(); renderStats(); renderRows();
    return out;
  } catch (e) { toast(e.message); }
}

/* ---------- campos ---------- */
function opt(list, v, empty) {
  return (empty !== undefined ? `<option value="">${esc(empty)}</option>` : '') +
    list.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${val === v ? 'selected' : ''}>${esc(lab)}</option>`; }).join('');
}
function field(f, rec) {
  const v = rec[f.k] ?? '';
  const cls = `f ${f.full ? 'full' : ''}`;
  const lab = f.label ? `<span>${esc(f.label)}</span>` : '';
  switch (f.type) {
    case 'textarea':
      return `<label class="${cls}">${lab}<textarea data-k="${f.k}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea></label>`;
    case 'select':
      return `<label class="${cls}">${lab}<select data-k="${f.k}">${opt(f.opts(), v, f.empty)}</select></label>`;
    case 'seg':
      return `<div class="${cls}">${lab}<div class="seg" data-k="${f.k}" data-seg="${f.clear ? 'clear' : ''}">${f.opts().map((o) => { const [val, l] = Array.isArray(o) ? o : [o, o]; return `<button type="button" data-v="${esc(val)}" class="${val === v ? 'on' : ''}">${esc(l)}</button>`; }).join('')}</div></div>`;
    case 'chips': {
      const arr = Array.isArray(v) ? v : [];
      const items = f.opts();
      return `<div class="${cls}">${lab}<div class="chips" data-k="${f.k}" data-chips>${items.map((o) => `<button type="button" data-v="${esc(o.v)}" class="${arr.includes(o.v) ? 'on' : ''}">${o.c ? `<i style="background:${esc(o.c)}"></i>` : ''}${esc(o.l)}</button>`).join('') || `<em style="color:var(--ink-3);font-size:13px">${esc(f.none || 'Nada cadastrado ainda.')}</em>`}</div></div>`;
    }
    case 'bool':
      return `<div class="${cls}">${lab}<label class="check"><input type="checkbox" data-k="${f.k}" ${v ? 'checked' : ''}/> ${esc(f.text)}</label></div>`;
    case 'marker':
      return `<label class="marker"><span>${esc(f.label)}<em style="font-style:normal">${esc(f.who || '')}</em></span><textarea data-k="${f.k}" placeholder="${esc(f.ph || '')}">${esc(v)}</textarea></label>`;
    default:
      return `<label class="${cls}">${lab}<input type="${f.type || 'text'}" data-k="${f.k}" value="${esc(v)}" placeholder="${esc(f.ph || '')}" ${f.lazy ? 'data-lazy' : ''}/></label>`;
  }
}

// liga os campos do painel à API. onSaved(k, rec) roda depois de salvar.
function bindFields(root, col, rec, onSaved = () => {}) {
  const commit = async (k, value) => { await save(col, rec, { [k]: value }); onSaved(k, rec); };
  $$('input[data-k], textarea[data-k], select[data-k]', root).forEach((el) => {
    const k = el.dataset.k;
    if (el.type === 'checkbox') el.onchange = () => commit(k, el.checked);
    else if (el.tagName === 'SELECT' || ['date', 'color'].includes(el.type) || 'lazy' in el.dataset) el.onchange = () => commit(k, el.value.trim());
    else { let t; el.oninput = () => { clearTimeout(t); t = setTimeout(() => commit(k, el.value), 600); }; }
  });
  $$('[data-seg]', root).forEach((box) => {
    box.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const clear = box.dataset.seg === 'clear' && b.classList.contains('on');
      $$('button', box).forEach((x) => x.classList.toggle('on', !clear && x === b));
      commit(box.dataset.k, clear ? '' : b.dataset.v);
    };
  });
  $$('[data-chips]', root).forEach((box) => {
    box.onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      b.classList.toggle('on');
      commit(box.dataset.k, $$('button.on', box).map((x) => x.dataset.v));
    };
  });
}

/* link que o criador abre para escolher a pauta (sem senha) */
function linkEscolha(c) {
  const url = c.token ? `${location.origin}/escolha/${c.token}` : '';
  return `<div class="f full linkbox"><span>Link para ${esc(c.nome.split(' ')[0])} escolher</span>
    ${url ? `<div class="copy"><input type="text" readonly value="${esc(url)}" /><button type="button" class="btn" data-copy="${esc(url)}">Copiar</button></div>
    <small>Mande pelo WhatsApp. Abre sem senha e mostra só as opções marcadas acima. Quando ele escolher, a pauta aparece aqui e o status vira "Topou".</small>` : '<small>O link aparece depois que o servidor reiniciar.</small>'}
    ${c.escolhidaEm ? `<div class="resposta"><b>Escolheu em ${fmtData(c.escolhidaEm)}</b>${esc(find('pautas', c.pautaId)?.titulo || '')}${c.comentarioCriador ? `<p>"${esc(c.comentarioCriador)}"</p>` : ''}</div>` : ''}
  </div>`;
}

/* ---------- visões ---------- */
const VIEWS = {};

/* Criadores */
VIEWS.criadores = {
  col: 'creators',
  bar() {
    const f = S.f;
    return `<input type="search" data-f="q" placeholder="Buscar nome, @, texto" value="${esc(f.q)}" />
      <select data-f="nicho">${opt([...S.nichos.map((n) => n.nome), ['__sem', 'Sem nicho']], f.nicho, 'Todos os nichos')}</select>
      <select data-f="status">${opt(STATUS, f.status, 'Todos os status')}</select>
      <select data-f="linha">${opt([['vazia', 'Linha em branco'], ['ok', 'Linha preenchida']], f.linha, 'Linha: todas')}</select>
      <select data-f="resp">${opt([...RESP, ['__ninguem', 'Sem responsável']], f.resp, 'Responsável: todas')}</select>
      <select data-f="origem">${opt([['inscricao', 'Se inscreveram'], ['equipe', 'Mapeados pela equipe']], f.origem, 'Origem: todas')}</select>
      <span class="sp"></span>
      <button class="btn ghost" data-copy="${esc(location.origin + '/participar')}" title="Formulário aberto para criadores se inscreverem">Copiar link do formulário</button>
      <a class="btn ghost" href="/export/creators.csv">Exportar CSV</a>
      <button class="btn solid" data-new>Novo criador</button>`;
  },
  filtered() {
    const f = S.f; const q = f.q.toLowerCase();
    return S.creators.filter((c) =>
      (!q || [c.nome, c.handle, c.resumo, c.sugestaoLinha, c.observacoes].join(' ').toLowerCase().includes(q)) &&
      (!f.nicho || (f.nicho === '__sem' ? !(c.nichos || []).length : (c.nichos || []).includes(f.nicho))) &&
      (!f.status || (c.status || 'Mapeado') === f.status) &&
      (!f.linha || (f.linha === 'vazia' ? !c.sugestaoLinha?.trim() : !!c.sugestaoLinha?.trim())) &&
      (!f.resp || (f.resp === '__ninguem' ? !c.responsavel : c.responsavel === f.resp)) &&
      (!f.origem || (f.origem === 'inscricao' ? !!c.inscreveuSe : !c.inscreveuSe)));
  },
  groups(list) {
    const out = S.nichos.map((n) => ({ title: n.nome, color: n.cor, items: list.filter((c) => (c.nichos || [])[0] === n.nome) }));
    out.push({ title: 'Sem nicho definido', items: list.filter((c) => !(c.nichos || []).length || !S.nichos.some((n) => n.nome === c.nichos[0])) });
    return out;
  },
  groupNote: 'Cada criador aparece no grupo do seu primeiro nicho.',
  row(c) {
    const linha = c.sugestaoLinha?.trim();
    return `<span class="who"><span class="name">${esc(c.nome)}${c.inscreveuSe ? '<span class="flag" style="color:var(--green)">inscrição</span>' : ''}${c.nichoConfirmado ? '' : '<span class="flag" style="color:var(--amber)">conferir nicho</span>'}</span>
      <span class="muted">@${esc(c.handle)}${(c.nichos || []).length ? ' · ' + esc(c.nichos.join(', ')) : ''}</span></span>
      ${statusTag(c.status || 'Mapeado')}
      <span class="line ${linha ? 'ok' : 'empty'}">${linha ? 'linha ok' : 'sem linha'}</span>
      <span class="resp" title="${esc(c.responsavel || 'Sem responsável')}">${iniciais(c.responsavel)}</span>`;
  },
  async create() {
    return api.save('creators', {
      nome: 'Novo criador', handle: '', url: '', nichos: [], nichoConfirmado: false, resumo: '', sugestaoLinha: '',
      observacoes: '', responsavel: '', status: 'Mapeado', modoPauta: 'atribuida', pautaId: '', pautasOpcoes: [], roteiristaId: '', editorId: '',
    });
  },
  detail(c) {
    const pautas = () => S.pautas.map((p) => [p.id, p.titulo + (p.nicho ? ` (${p.nicho})` : '')]);
    const escolha = c.modoPauta === 'escolha';
    return `
      <div class="dhead">
        <button class="btn ghost back" data-back>← Voltar à lista</button>
        <div class="kicker">${statusTag(c.status || 'Mapeado')}<span>${c.nichoConfirmado ? 'nicho confirmado' : 'nicho a conferir'}</span>${c.inscritoEm ? `<span style="color:var(--green)">inscrito pelo formulário em ${fmtData(c.inscritoEm)}</span>` : ''}<span class="sp"></span><span class="saved">salvo</span></div>
        <h2 data-h="nome">${esc(c.nome)}</h2>
        ${c.handle ? `<a class="handle" href="${esc(c.url || `https://www.instagram.com/${c.handle}/`)}" target="_blank" rel="noopener">instagram.com/${esc(c.handle)} ↗</a>` : '<span class="handle" style="color:var(--ink-3)">sem @ cadastrado</span>'}
      </div>
      <div class="dbody">
        <p class="about" data-h="resumo">${esc(c.resumo) || '<span style="color:var(--ink-3)">Sem descrição do perfil.</span>'}</p>

        ${field({ k: 'sugestaoLinha', type: 'marker', label: 'Sugestão de linha', who: 'Camilla / Yara', ph: 'Em branco. Escreva aqui a direção que sugerimos para esse criador. Ele continua livre para seguir o próprio jeito.' }, c)}

        <section class="fs"><h3>Andamento</h3><div class="grid2">
          ${field({ k: 'status', type: 'select', label: 'Status', opts: () => STATUS }, { ...c, status: c.status || 'Mapeado' })}
          ${field({ k: 'responsavel', type: 'seg', label: 'Quem faz o contato', opts: () => RESP, clear: true }, c)}
          ${field({ k: 'roteiristaId', type: 'select', label: 'Escrita e pesquisa', opts: equipePor('Escrita e pesquisa'), empty: S.team.length ? 'Ninguém ainda' : 'Cadastre a equipe na aba Equipe' }, c)}
          ${field({ k: 'editorId', type: 'select', label: 'Edição do vídeo', opts: equipePor('Edição dos vídeos'), empty: S.team.length ? 'Ninguém ainda' : 'Cadastre a equipe na aba Equipe' }, c)}
        </div></section>

        <section class="fs"><h3>Pauta</h3><div class="grid2">
          ${field({ k: 'modoPauta', type: 'seg', label: 'Como a pauta chega', full: true, opts: () => [['atribuida', 'Nós definimos'], ['escolha', 'Criador escolhe']] }, { ...c, modoPauta: c.modoPauta || 'atribuida' })}
          ${escolha ? field({ k: 'pautasOpcoes', type: 'chips', label: 'Opções oferecidas', full: true, none: 'Nenhuma pauta cadastrada. Crie na aba Pautas.', opts: () => S.pautas.map((p) => ({ v: p.id, l: p.titulo, c: p.nicho ? corNicho(p.nicho) : '' })) }, c) : ''}
          ${field({ k: 'pautaId', type: 'select', label: escolha ? 'Pauta escolhida' : 'Pauta definida', full: true, opts: pautas, empty: S.pautas.length ? 'Nenhuma ainda' : 'Nenhuma pauta cadastrada' }, c)}
          ${escolha ? linkEscolha(c) : ''}
        </div></section>

        <section class="fs"><h3>Contato</h3><div class="grid2">
          ${field({ k: 'contatoWhats', label: 'WhatsApp' }, c)}
          ${field({ k: 'contatoEmail', label: 'E-mail' }, c)}
          ${field({ k: 'cidade', label: 'Cidade' }, c)}
          ${field({ k: 'seguidores', label: 'Seguidores' }, c)}
          ${field({ k: 'outrasRedes', label: 'Outras redes', full: true }, c)}
          ${c.nichoOutro ? `<div class="f full"><span>Outro tema que a pessoa marcou</span><div>${esc(c.nichoOutro)}</div></div>` : ''}
          ${c.mensagemInscricao ? `<div class="f full"><span>O que escreveu na inscrição</span><div style="font-size:15px;color:var(--ink-2)">${esc(c.mensagemInscricao)}</div></div>` : ''}
        </div></section>

        <section class="fs"><h3>Perfil</h3><div class="grid2">
          ${field({ k: 'nome', label: 'Nome' }, c)}
          ${field({ k: 'handle', label: '@ no Instagram', ph: 'sem o @', lazy: true }, c)}
          ${field({ k: 'nichos', type: 'chips', label: 'Nichos (o primeiro define o grupo)', full: true, opts: () => {
            const sel = c.nichos || [];
            const order = [...sel, ...S.nichos.map((n) => n.nome).filter((n) => !sel.includes(n))];
            return order.filter((n) => S.nichos.some((x) => x.nome === n)).map((n) => ({ v: n, l: n, c: corNicho(n) }));
          } }, c)}
          ${field({ k: 'nichoConfirmado', type: 'bool', text: 'Nicho conferido no perfil', full: true }, c)}
          ${field({ k: 'resumo', type: 'textarea', label: 'Sobre o perfil', full: true }, c)}
          ${field({ k: 'observacoes', type: 'textarea', label: 'Observações', full: true }, c)}
        </div></section>

        <div class="dfoot"><span>atualizado ${fmtData(c.updatedAt)}</span><button class="btn danger" data-del>Excluir criador</button></div>
      </div>`;
  },
  async onSaved(k, c) {
    if (k === 'nome') $('[data-h=nome]').textContent = c.nome;
    if (k === 'resumo') $('[data-h=resumo]').textContent = c.resumo;
    if (k === 'handle') {
      const h = c.handle.replace(/^@/, '').trim();
      await save('creators', c, { handle: h, url: h ? `https://www.instagram.com/${h}/` : '' });
      renderDetail();
    }
    if (k === 'pautaId' && c.pautaId) {
      const p = find('pautas', c.pautaId);
      if (p && p.creatorId !== c.id) Object.assign(p, await api.save('pautas', { id: p.id, creatorId: c.id, status: !p.status || p.status === 'Livre' ? 'Reservada' : p.status }));
    }
    if (['status', 'modoPauta', 'nichos', 'nichoConfirmado'].includes(k)) renderDetail();
  },
};

/* Pautas */
VIEWS.pautas = {
  col: 'pautas',
  bar() {
    const f = S.fp;
    return `<input type="search" data-fp="q" placeholder="Buscar pauta" value="${esc(f.q)}" />
      <select data-fp="nicho">${opt([...S.nichos.map((n) => n.nome), ['__qualquer', 'Qualquer nicho']], f.nicho, 'Todos os nichos')}</select>
      <select data-fp="status">${opt(PAUTA_STATUS, f.status, 'Todos os status')}</select>
      <span class="sp"></span>
      <a class="btn ghost" href="/export/pautas.csv">Exportar CSV</a>
      <button class="btn solid" data-new>Nova pauta</button>`;
  },
  filtered() {
    const f = S.fp; const q = f.q.toLowerCase();
    return S.pautas.filter((p) =>
      (!q || [p.titulo, p.tema, p.descricao, p.linhaSugerida].join(' ').toLowerCase().includes(q)) &&
      (!f.nicho || (f.nicho === '__qualquer' ? !p.nicho : p.nicho === f.nicho)) &&
      (!f.status || (p.status || 'Livre') === f.status));
  },
  groups(list) {
    return [{ title: 'Serve para qualquer nicho', items: list.filter((p) => !p.nicho) },
      ...S.nichos.map((n) => ({ title: n.nome, color: n.cor, items: list.filter((p) => p.nicho === n.nome) }))];
  },
  empty: 'Nenhuma pauta ainda. Cadastre os temas aqui; depois é só definir para um criador ou oferecer como opção.',
  row(p) {
    const c = find('creators', p.creatorId);
    const ofertas = S.creators.filter((x) => (x.pautasOpcoes || []).includes(p.id)).length;
    return `<span class="who"><span class="name">${esc(p.titulo)}${p.sugeridaPor ? '<span class="flag" style="color:var(--green)">do formulário</span>' : ''}</span><span class="muted">${p.sugeridaPor ? 'sugerida por ' + esc(p.sugeridaPor) + ' · ' : ''}${esc(p.tema || 'sem tema')}${p.prazo ? ' · até ' + fmtData(p.prazo) : ''}</span></span>
      ${statusTag(p.status || 'Livre')}
      <span class="line ok">${c ? esc(c.nome.split(' ')[0]) : ofertas ? `${ofertas} oferta${ofertas > 1 ? 's' : ''}` : 'sem criador'}</span><span></span>`;
  },
  async create() { return api.save('pautas', { titulo: 'Nova pauta', tema: '', nicho: '', descricao: '', linhaSugerida: '', status: 'Livre', creatorId: '', prazo: '' }); },
  detail(p) {
    const ofertas = S.creators.filter((x) => (x.pautasOpcoes || []).includes(p.id));
    return `
      <div class="dhead">
        <button class="btn ghost back" data-back>← Voltar à lista</button>
        <div class="kicker">${statusTag(p.status || 'Livre')}<span>${esc(p.nicho || 'qualquer nicho')}</span>${p.sugeridaPor ? `<span style="color:var(--green)">sugerida por ${esc(p.sugeridaPor)} no formulário</span>` : ''}<span class="sp"></span><span class="saved">salvo</span></div>
        <h2 data-h="titulo">${esc(p.titulo)}</h2>
      </div>
      <div class="dbody">
        ${field({ k: 'linhaSugerida', type: 'marker', label: 'Linha sugerida', who: 'o criador tem liberdade', ph: 'Por onde sugerimos que o criador vá com essa pauta.' }, p)}
        <section class="fs"><h3>Pauta</h3><div class="grid2">
          ${field({ k: 'titulo', label: 'Título', full: true }, p)}
          ${field({ k: 'tema', label: 'Tema' }, p)}
          ${field({ k: 'nicho', type: 'select', label: 'Nicho', opts: () => S.nichos.map((n) => n.nome), empty: 'Qualquer nicho' }, p)}
          ${field({ k: 'descricao', type: 'textarea', label: 'Abordagem', full: true }, p)}
          ${field({ k: 'prazo', type: 'date', label: 'Prazo' }, p)}
        </div></section>
        <section class="fs"><h3>Distribuição</h3><div class="grid2">
          ${field({ k: 'status', type: 'seg', label: 'Status', full: true, opts: () => PAUTA_STATUS }, { ...p, status: p.status || 'Livre' })}
          ${field({ k: 'creatorId', type: 'select', label: 'Com quem está', full: true, opts: () => S.creators.map((c) => [c.id, c.nome]), empty: 'Ninguém ainda' }, p)}
          <div class="f full"><span>Oferecida como opção a</span><div style="font-size:14.5px">${ofertas.map((c) => esc(c.nome)).join(', ') || '<span style="color:var(--ink-3)">ninguém</span>'}</div></div>
        </div></section>
        <div class="dfoot"><span>atualizado ${fmtData(p.updatedAt)}</span><button class="btn danger" data-del>Excluir pauta</button></div>
      </div>`;
  },
  async onSaved(k, p) {
    if (k === 'titulo') $('[data-h=titulo]').textContent = p.titulo;
    if (k === 'creatorId' && p.creatorId) {
      if (!p.status || p.status === 'Livre') await save('pautas', p, { status: 'Reservada' });
      const c = find('creators', p.creatorId);
      if (c && c.pautaId !== p.id) Object.assign(c, await api.save('creators', { id: c.id, pautaId: p.id }));
    }
    if (['status', 'nicho', 'creatorId'].includes(k)) renderDetail();
  },
};

/* Equipe */
VIEWS.equipe = {
  col: 'team',
  bar: () => `<span style="color:var(--ink-2);font-size:14px">Quem faz o trabalho, separado por função.</span><span class="sp"></span><button class="btn solid" data-new>Nova pessoa</button>`,
  filtered: () => S.team,
  groups(list) {
    const out = FUNCOES.map((fn) => ({ title: fn, items: list.filter((t) => funcoesDe(t)[0] === fn) }));
    out.push({ title: 'Outras funções', items: list.filter((t) => !FUNCOES.includes(funcoesDe(t)[0])) });
    return out;
  },
  groupNote: 'Cada pessoa aparece no grupo da sua primeira função.',
  empty: 'Ninguém cadastrado ainda. Cadastre aqui quem faz roteiro e edição; depois é só escolher no painel de cada criador.',
  row(t) {
    const n = S.creators.filter((c) => c.roteiristaId === t.id || c.editorId === t.id).length;
    return `<span class="who"><span class="name">${esc(t.nome)}</span><span class="muted">${esc(t.contato || 'sem contato')}</span></span>
      <span class="tag">${esc(funcoesDe(t).join(', ') || 'sem função')}</span><span class="line ok">${n} criador${n === 1 ? '' : 'es'}</span><span></span>`;
  },
  async create() { return api.save('team', { nome: 'Nova pessoa', funcoes: [], contato: '', obs: '' }); },
  detail(t) {
    const com = S.creators.filter((c) => c.roteiristaId === t.id || c.editorId === t.id);
    return `
      <div class="dhead"><button class="btn ghost back" data-back>← Voltar à lista</button>
        <div class="kicker"><span>equipe</span><span class="sp"></span><span class="saved">salvo</span></div>
        <h2 data-h="nome">${esc(t.nome)}</h2></div>
      <div class="dbody">
        <section class="fs"><h3>Dados</h3><div class="grid2">
          ${field({ k: 'nome', label: 'Nome' }, t)}
          ${field({ k: 'contato', label: 'Contato', ph: 'WhatsApp, @ ou e-mail' }, t)}
          ${field({ k: 'funcoes', type: 'chips', label: 'Funções (a primeira define o grupo)', full: true, opts: () => {
            const sel = funcoesDe(t);
            return [...sel, ...FUNCOES.filter((f) => !sel.includes(f))].map((f) => ({ v: f, l: f }));
          } }, { ...t, funcoes: funcoesDe(t) })}
          ${field({ k: 'obs', type: 'textarea', label: 'Observações', full: true }, t)}
        </div></section>
        <section class="fs"><h3>Com quem está trabalhando</h3>
          <div style="font-size:15px">${com.map((c) => `${esc(c.nome)} <span style="font:400 12px var(--mono);color:var(--ink-3)">${c.roteiristaId === t.id && c.editorId === t.id ? 'escrita e edição' : c.roteiristaId === t.id ? 'escrita e pesquisa' : 'edição do vídeo'}</span>`).join('<br>') || '<span style="color:var(--ink-3)">ninguém ainda</span>'}</div>
        </section>
        <div class="dfoot"><span>atualizado ${fmtData(t.updatedAt)}</span><button class="btn danger" data-del>Excluir pessoa</button></div>
      </div>`;
  },
  onSaved(k, t) { if (k === 'nome') $('[data-h=nome]').textContent = t.nome; if (k === 'funcoes') renderDetail(); },
};

/* Nichos */
VIEWS.nichos = {
  col: 'nichos',
  bar: () => `<span style="color:var(--ink-2);font-size:14px">Categorias que separam criadores e pautas.</span><span class="sp"></span><button class="btn solid" data-new>Novo nicho</button>`,
  filtered: () => S.nichos,
  row(n) {
    const c = S.creators.filter((x) => (x.nichos || []).includes(n.nome)).length;
    const p = S.pautas.filter((x) => x.nicho === n.nome).length;
    return `<span class="who"><span class="name"><i style="display:inline-block;width:10px;height:10px;margin-right:8px;background:${esc(n.cor)}"></i>${esc(n.nome)}</span></span>
      <span class="line ok">${c} criador${c === 1 ? '' : 'es'}</span><span class="line ok">${p} pauta${p === 1 ? '' : 's'}</span><span></span>`;
  },
  async create() { return api.save('nichos', { nome: 'Novo nicho', cor: '#5b5a54' }); },
  detail(n) {
    return `
      <div class="dhead"><button class="btn ghost back" data-back>← Voltar à lista</button>
        <div class="kicker"><span>nicho</span><span class="sp"></span><span class="saved">salvo</span></div>
        <h2 data-h="nome">${esc(n.nome)}</h2></div>
      <div class="dbody"><section class="fs"><h3>Dados</h3><div class="grid2">
        ${field({ k: 'nome', label: 'Nome (renomeia em criadores e pautas)', lazy: true }, n)}
        ${field({ k: 'cor', type: 'color', label: 'Cor' }, n)}
      </div></section>
      <div class="dfoot"><span></span><button class="btn danger" data-del>Excluir nicho</button></div></div>`;
  },
  async onSaved(k, n) {
    if (k !== 'nome') { renderRows(); return; }
    const old = this._old; $('[data-h=nome]').textContent = n.nome;
    if (old && old !== n.nome) {
      for (const c of S.creators) if ((c.nichos || []).includes(old)) Object.assign(c, await api.save('creators', { id: c.id, nichos: c.nichos.map((x) => (x === old ? n.nome : x)) }));
      for (const p of S.pautas) if (p.nicho === old) Object.assign(p, await api.save('pautas', { id: p.id, nicho: n.nome }));
      toast('Nicho renomeado em tudo');
    }
    this._old = n.nome; renderRows();
  },
};

/* ---------- render da tela dividida ---------- */
function renderSplit() {
  const V = VIEWS[S.view];
  $('#view').innerHTML = `<div class="split ${S.open ? 'open' : ''}"><section class="list"><div class="bar">${V.bar()}</div><div id="rows"></div></section><aside class="detail" id="detail"></aside></div>`;
  const bar = $('.bar');
  $$('[data-f]', bar).forEach((el) => (el[el.tagName === 'INPUT' ? 'oninput' : 'onchange'] = () => { S.f[el.dataset.f] = el.value; renderRows(); }));
  $$('[data-fp]', bar).forEach((el) => (el[el.tagName === 'INPUT' ? 'oninput' : 'onchange'] = () => { S.fp[el.dataset.fp] = el.value; renderRows(); }));
  $$('[data-copy]', bar).forEach((b) => (b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Link do formulário copiado'); }
    catch { prompt('Copie o link:', b.dataset.copy); }
  }));
  const nb = $('[data-new]', bar);
  if (nb) nb.onclick = async () => {
    const rec = await V.create(); S[V.col].push(rec); select(rec.id);
    renderStats(); renderRows();
    const first = $('#detail input[data-k]'); if (first) { first.focus(); first.select(); }
  };
  renderRows(); renderDetail();
}

function renderRows() {
  const V = VIEWS[S.view]; const box = $('#rows'); if (!V || !box) return;
  const list = V.filtered();
  const sel = S.sel[S.view];
  const rowHtml = (r) => `<button class="row ${r.id === sel ? 'on' : ''}" data-id="${r.id}">${V.row(r)}</button>`;
  if (!list.length) box.innerHTML = `<p class="nothing">${esc((S[V.col].length ? 'Nada com esses filtros.' : V.empty) || 'Nada aqui ainda.')}</p>`;
  else if (V.groups) {
    box.innerHTML = V.groups(list).filter((g) => g.items.length).map((g) =>
      `<div class="grp">${g.color ? `<i class="sw" style="background:${esc(g.color)}"></i>` : ''}<h2>${esc(g.title)}</h2><span class="n">${g.items.length}</span></div>${g.items.map(rowHtml).join('')}`).join('') +
      (V.groupNote ? `<p class="nothing" style="padding:18px 28px">${esc(V.groupNote)}</p>` : '');
  } else box.innerHTML = list.map(rowHtml).join('');
  $$('.row', box).forEach((b) => (b.onclick = () => select(b.dataset.id)));
}

function select(id) {
  S.sel[S.view] = id; S.open = true;
  $('.split')?.classList.add('open');
  $$('#rows .row').forEach((r) => r.classList.toggle('on', r.dataset.id === id));
  if (S.view === 'nichos') VIEWS.nichos._old = find('nichos', id)?.nome;
  renderDetail();
  if (window.innerWidth <= 860) window.scrollTo(0, 0);
}

function renderDetail() {
  const V = VIEWS[S.view]; const box = $('#detail'); if (!box) return;
  const rec = find(V.col, S.sel[S.view]);
  if (!rec) {
    const tips = {
      criadores: ['Escolha um criador', 'Clique em um nome da lista para ver o perfil, escrever a sugestão de linha e acompanhar o andamento. As linhas marcadas em amarelo ainda estão sem sugestão.'],
      pautas: ['Escolha uma pauta', 'Ou crie uma nova. Uma pauta pode ir direto para um criador ou ser oferecida como opção para ele escolher.'],
      equipe: ['Escolha alguém', 'Cadastre quem faz roteiro e edição para poder ligar essas pessoas aos criadores.'],
      nichos: ['Escolha um nicho', 'Renomear um nicho atualiza todos os criadores e pautas que usam ele.'],
    }[S.view];
    box.innerHTML = `<div class="empty-detail"><h2>${tips[0]}</h2><p>${tips[1]}</p></div>`;
    return;
  }
  const y = box.scrollTop;
  box.innerHTML = V.detail(rec);
  box.scrollTop = y;
  bindFields(box, V.col, rec, (k, r) => V.onSaved && V.onSaved(k, r));
  $$('[data-copy]', box).forEach((b) => (b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Link copiado'); }
    catch { b.previousElementSibling.select(); toast('Selecione e copie'); }
  }));
  const back = $('[data-back]', box);
  if (back) back.onclick = () => { S.open = false; $('.split').classList.remove('open'); };
  const del = $('[data-del]', box);
  if (del) del.onclick = async () => {
    if (!confirm(`Excluir "${rec.nome || rec.titulo}"? Não dá para desfazer.`)) return;
    await api.del(V.col, rec.id); await loadAll();
    S.sel[S.view] = null; S.open = false; render(); toast('Excluído');
  };
}

/* ---------- quadro ---------- */
function renderQuadro() {
  $('#view').innerHTML = `<div class="board">${STATUS.map((s) => {
    const items = S.creators.filter((c) => (c.status || 'Mapeado') === s);
    return `<section class="col" data-s="${esc(s)}"><header><h3>${esc(s)}</h3><span>${items.length}</span></header><div class="cards">${items.map((c) => {
      const p = find('pautas', c.pautaId); const r = find('team', c.roteiristaId); const e = find('team', c.editorId);
      return `<article class="card" draggable="true" data-id="${c.id}" style="border-left-color:${esc(corNicho((c.nichos || [])[0]))}">
        <strong>${esc(c.nome)}</strong><small>${esc((c.nichos || []).join(', ') || 'sem nicho')}${c.responsavel ? ' · ' + esc(c.responsavel) : ''}</small>
        ${p ? `<div class="pt">${esc(p.titulo)}</div>` : ''}
        ${r || e ? `<small>${r ? 'escrita ' + esc(r.nome) : ''}${r && e ? ' · ' : ''}${e ? 'edição ' + esc(e.nome) : ''}</small>` : ''}
      </article>`;
    }).join('')}</div></section>`;
  }).join('')}</div>`;
  $$('.card').forEach((el) => {
    el.ondragstart = (e) => e.dataTransfer.setData('text/plain', el.dataset.id);
    el.onclick = () => { S.view = 'criadores'; S.sel.criadores = el.dataset.id; S.open = true; go(); };
  });
  $$('.col').forEach((col) => {
    col.ondragover = (e) => { e.preventDefault(); col.classList.add('over'); };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = async (e) => {
      e.preventDefault(); col.classList.remove('over');
      const c = find('creators', e.dataTransfer.getData('text/plain'));
      if (c && c.status !== col.dataset.s) { await save('creators', c, { status: col.dataset.s }); toast(`${c.nome}: ${col.dataset.s}`); renderQuadro(); }
    };
  });
}

/* ---------- cabeçalho ---------- */
function renderStats() {
  const c = S.creators;
  const semLinha = c.filter((x) => !x.sugestaoLinha?.trim()).length;
  const conferir = c.filter((x) => !x.nichoConfirmado).length;
  const andando = c.filter((x) => ANDAMENTO.includes(x.status)).length;
  $('#stats').innerHTML = [
    ['criadores', c.length], ['sem linha', semLinha, semLinha > 0], ['conferir nicho', conferir], ['inscrições', c.filter((x) => x.inscreveuSe).length], ['em andamento', andando], ['pautas', S.pautas.length], ['sugeridas', S.pautas.filter((p) => p.status === 'Sugerida').length, S.pautas.some((p) => p.status === 'Sugerida')],
  ].map(([l, n, w]) => `<div class="${w ? 'warn' : ''}"><dt>${l}</dt><dd>${n}</dd></div>`).join('');
}

function render() {
  renderStats();
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
  if (S.view === 'quadro') renderQuadro(); else renderSplit();
}
function go() { history.replaceState(null, '', '#' + S.view); render(); }

$$('#tabs button').forEach((b) => (b.onclick = () => { S.view = b.dataset.view; S.open = false; go(); }));
const h = location.hash.slice(1);
if (h === 'quadro' || VIEWS[h]) S.view = h;

loadAll().then(render).catch((e) => { $('#view').innerHTML = `<p class="nothing">${esc(e.message)}. Recarregue a página.</p>`; });
