/* Espelho de pautas — frontend
   Tudo salva sozinho: cada mudança vai direto para a API. */

const STATUS = ['Mapeado', 'Contatado', 'Topou', 'Em roteiro', 'Em edição', 'Publicado', 'Recusou'];
const PAUTA_STATUS = ['Sugerida', 'Livre', 'Reservada', 'Em produção', 'Publicada', 'Descartada'];
const RESP = ['Camilla', 'Yara'];
const FUNCOES = ['Escrita e pesquisa', 'Edição dos vídeos', 'Design', 'Marketing', 'Site'];
const funcoesDe = (t) => (t.funcoes && t.funcoes.length ? t.funcoes : t.funcao ? [t.funcao] : []);
// lista da equipe para os seletores, com quem tem a função certa primeiro
const equipePor = (fn) => () => {
  const com = S.team.filter((t) => funcoesDe(t).includes(fn));
  const sem = S.team.filter((t) => !funcoesDe(t).includes(fn));
  return [...com, ...sem].map((t) => [t.id, `${t.nome}${funcoesDe(t).length ? ' · ' + funcoesDe(t).join(', ') : ''}`]);
};
const ANDAMENTO = ['Topou', 'Em roteiro', 'Em edição', 'Publicado'];
const PESSOA_STATUS = ['Inscrita', 'Em contato', 'Escolheu pauta', 'Postou', 'Desistiu'];
const PARA_QUEM = [['', 'Só uso interno'], ['Criadores', 'Criadores'], ['Pessoas comuns', 'Pessoas comuns'], ['Todos', 'Todos']];
const PARA_QUEM_MAT = ['Todos', 'Criadores', 'Pessoas comuns'];
const ETAPAS = ['A fazer', 'Em andamento', 'Em revisão', 'Pronto', 'Publicado'];
const TIPOS_TAREFA = ['Vídeo de divulgação', 'Arte', 'Texto', 'Outro'];
const TIPOS_MATERIAL = ['Arte', 'Vídeo', 'Texto', 'Roteiro', 'Outro'];

const S = {
  me: null,
  creators: [], pessoas: [], pautas: [], team: [], nichos: [], materiais: [], producao: [], usuarios: [], videos: [], config: [], juridico: [], 'minhas-tarefas': [],
  view: 'criadores',
  sel: {},
  f: { q: '', nicho: '', status: '', linha: '', resp: '', origem: '' },
  fp: { q: '', nicho: '', status: '', para: '' },
  fpe: { q: '', status: '' },
};
const ehAdmin = () => S.me?.papel === 'admin';

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

const HDR = { 'Content-Type': 'application/json', 'X-Requested-With': 'espelho' };
async function req(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...HDR, ...(opts.headers || {}) } });
  if (r.status === 401 && !url.startsWith('/auth/')) { S.me = null; telaLogin(); throw new Error('Sessão encerrada. Entre de novo.'); }
  const out = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(out.error || 'Não salvou. Tente de novo.');
  return out;
}
const api = {
  list: (c) => req(`/api/${c}`),
  save: (c, data) => req(data.id ? `/api/${c}/${data.id}` : `/api/${c}`, { method: data.id ? 'PUT' : 'POST', body: JSON.stringify(data) }),
  del: (c, id) => req(`/api/${c}/${id}`, { method: 'DELETE' }),
  post: (url, data = {}) => req(url, { method: 'POST', body: JSON.stringify(data) }),
};

async function loadAll() {
  if (!ehAdmin()) { S['minhas-tarefas'] = await api.list('minhas-tarefas'); return; }
  const cols = ['creators', 'pessoas', 'pautas', 'team', 'nichos', 'materiais', 'producao', 'usuarios', 'videos', 'config', 'juridico'];
  (await Promise.all(cols.map(api.list))).forEach((lista, i) => { S[cols[i]] = lista; });
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

/* link pessoal do painel (/p/...), sem senha */
function linkPainel(r, nomeCampoComentario = 'comentarioCriador') {
  const url = r.token ? `${location.origin}/p/${r.token}` : '';
  const pubs = (r.publicacoes || []).slice().reverse();
  return `<div class="f full linkbox"><span>Link pessoal de ${esc((r.nome || '').split(' ')[0])}</span>
    ${url ? `<div class="copy"><input type="text" readonly value="${esc(url)}" /><button type="button" class="btn" data-copy="${esc(url)}">Copiar</button></div>` : '<small>O link aparece depois que o servidor reiniciar.</small>'}
    ${r.escolhidaEm ? `<div class="resposta"><b>Escolheu em ${fmtData(r.escolhidaEm)}</b>${((r.pautaIds && r.pautaIds.length) ? r.pautaIds : [r.pautaId]).map((id) => esc(find('pautas', id)?.titulo || '')).filter(Boolean).join(' · ')}${r[nomeCampoComentario] ? `<p>"${esc(r[nomeCampoComentario])}"</p>` : ''}</div>` : ''}
    ${pubs.map((p) => `<div class="resposta"><b>Contou que gravou em ${fmtData(p.em)}</b>${/^https?:\/\//i.test(p.link || '') ? `<a href="${esc(p.link)}" target="_blank" rel="noopener noreferrer">${esc(p.link)}</a>` : 'sem link'}${p.comentario ? `<p>"${esc(p.comentario)}"</p>` : ''}</div>`).join('')}
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
      <button class="btn ghost" data-copy="${esc(location.origin + '/participar?tipo=criador')}" title="Cadastro aberto para criadores">Copiar link do cadastro</button>
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
        <button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
        <div class="kicker">${statusTag(c.status || 'Mapeado')}<span>${c.nichoConfirmado ? 'nicho confirmado' : 'nicho a conferir'}</span>${c.inscritoEm ? `<span style="color:var(--green)">inscrito pelo formulário em ${fmtData(c.inscritoEm)}</span>` : ''}<span class="sp"></span><span class="saved">salvo</span></div>
        <h2 data-h="nome">${esc(c.nome)}</h2>
        ${c.handle ? `<a class="handle" href="${esc(c.url || `https://www.instagram.com/${c.handle}/`)}" target="_blank" rel="noopener">instagram.com/${esc(c.handle)} ${ICONE.externo}</a>` : '<span class="handle" style="color:var(--ink-3)">sem @ cadastrado</span>'}
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
          ${linkPainel(c)}
        </div></section>

        <section class="fs"><h3>Contato</h3><div class="grid2">
          ${field({ k: 'contatoWhats', label: 'WhatsApp' }, c)}
          ${field({ k: 'contatoEmail', label: 'E-mail' }, c)}
          ${field({ k: 'cidade', label: 'Cidade' }, c)}
          ${field({ k: 'seguidores', label: 'Seguidores' }, c)}
          ${field({ k: 'outrasRedes', label: 'Outras redes', full: true }, c)}
          ${field({ k: 'mostrarNaComunidade', type: 'bool', text: 'Aparece em "Quem participa" no painel', full: true }, c)}
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
      <select data-fp="para">${opt([['__interna', 'Só uso interno'], ['Criadores', 'Criadores'], ['Pessoas comuns', 'Pessoas comuns'], ['Todos', 'Todos']], f.para, 'Para quem: todas')}</select>
      <span class="sp"></span>
      <a class="btn ghost" href="/export/pautas.csv">Exportar CSV</a>
      <button class="btn solid" data-new>Nova pauta</button>`;
  },
  filtered() {
    const f = S.fp; const q = f.q.toLowerCase();
    return S.pautas.filter((p) =>
      (!q || [p.titulo, p.tema, p.descricao, p.linhaSugerida].join(' ').toLowerCase().includes(q)) &&
      (!f.nicho || (f.nicho === '__qualquer' ? !p.nicho : p.nicho === f.nicho)) &&
      (!f.status || (p.status || 'Livre') === f.status) &&
      (!f.para || (f.para === '__interna' ? !p.paraQuem : p.paraQuem === f.para)));
  },
  groups(list) {
    return [{ title: 'Serve para qualquer nicho', items: list.filter((p) => !p.nicho) },
      ...S.nichos.map((n) => ({ title: n.nome, color: n.cor, items: list.filter((p) => p.nicho === n.nome) }))];
  },
  empty: 'Nenhuma pauta ainda.',
  row(p) {
    const c = find('creators', p.creatorId);
    const ofertas = S.creators.filter((x) => (x.pautasOpcoes || []).includes(p.id)).length;
    const pessoasN = S.pessoas.filter((x) => (x.pautaIds || [x.pautaId]).includes(p.id)).length;
    return `<span class="who"><span class="name">${esc(p.titulo)}${p.sugeridaPor ? '<span class="flag" style="color:var(--green)">sugestão</span>' : ''}${p.paraQuem ? `<span class="flag" style="color:var(--blue)">no painel: ${esc(p.paraQuem.toLowerCase())}</span>` : ''}${pessoasN ? `<span class="flag" style="color:var(--ink-2)">${pessoasN} pessoa${pessoasN > 1 ? 's' : ''}</span>` : ''}</span><span class="muted">${p.sugeridaPor ? 'sugerida por ' + esc(p.sugeridaPor) + ' · ' : ''}${esc(p.tema || 'sem tema')}${p.prazo ? ' · até ' + fmtData(p.prazo) : ''}</span></span>
      ${statusTag(p.status || 'Livre')}
      <span class="line ok">${c ? esc(c.nome.split(' ')[0]) : p.pessoaId && find('pessoas', p.pessoaId) ? esc(find('pessoas', p.pessoaId).nome.split(' ')[0]) : ofertas ? `${ofertas} oferta${ofertas > 1 ? 's' : ''}` : 'sem criador'}</span><span></span>`;
  },
  async create() { return api.save('pautas', { titulo: 'Nova pauta', tema: '', nicho: '', descricao: '', linhaSugerida: '', roteiro: '', paraQuem: '', status: 'Livre', creatorId: '', prazo: '' }); },
  detail(p) {
    const ofertas = S.creators.filter((x) => (x.pautasOpcoes || []).includes(p.id));
    const pessoasQ = S.pessoas.filter((x) => (x.pautaIds || [x.pautaId]).includes(p.id));
    const quem = p.pessoaId ? find('pessoas', p.pessoaId) : null;
    return `
      <div class="dhead">
        <button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
        <div class="kicker">${statusTag(p.status || 'Livre')}<span>${esc(p.nicho || 'qualquer nicho')}</span>${p.sugeridaPor ? `<span style="color:var(--green)">sugerida por ${esc(p.sugeridaPor)}${quem ? ' (pessoa comum)' : ''}</span>` : ''}<span class="sp"></span><span class="saved">salvo</span></div>
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
          ${field({ k: 'roteiro', type: 'textarea', label: 'Sugestão do que falar (aparece no painel de quem escolher)', full: true, ph: 'Um roteiro curto, em tom de conversa. Ex.: comece contando quem você conhece que…' }, p)}
        </div></section>
        <section class="fs"><h3>Distribuição</h3><div class="grid2">
          ${field({ k: 'paraQuem', type: 'seg', label: 'Aparece no painel de quem', full: true, opts: () => PARA_QUEM }, { ...p, paraQuem: p.paraQuem || '' })}
          ${field({ k: 'status', type: 'seg', label: 'Status', full: true, opts: () => PAUTA_STATUS }, { ...p, status: p.status || 'Livre' })}
          ${field({ k: 'creatorId', type: 'select', label: 'Com quem está', full: true, opts: () => S.creators.map((c) => [c.id, c.nome]), empty: 'Ninguém ainda' }, p)}
          <div class="f full"><span>Oferecida como opção a</span><div style="font-size:14.5px">${ofertas.map((c) => esc(c.nome)).join(', ') || '<span style="color:var(--ink-3)">ninguém</span>'}</div></div>
          <div class="f full"><span>Pessoas comuns que escolheram</span><div style="font-size:14.5px">${pessoasQ.map((x) => esc(x.nome)).join(', ') || '<span style="color:var(--ink-3)">ninguém ainda</span>'}</div></div>
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
    if (['status', 'nicho', 'creatorId', 'paraQuem'].includes(k)) renderDetail();
  },
};

/* Equipe */
VIEWS.equipe = {
  col: 'team',
  bar: () => `<span class="sp"></span><label class="btn ghost" title="Escolha várias fotos de uma vez. O nome do arquivo precisa ter o nome da pessoa (ex.: maria.jpg, gabriel-caldas.png).">Enviar várias fotos<input type="file" accept="image/*" multiple hidden data-fotos-lote /></label><button class="btn ghost" type="button" data-fotos-baixar>Baixar fotos</button><button class="btn solid" data-new>Nova pessoa</button>`,
  bindBar(bar) {
    const inp = $('[data-fotos-lote]', bar); if (inp) inp.onchange = () => { fotosEmLote([...inp.files]); inp.value = ''; };
    const bx = $('[data-fotos-baixar]', bar); if (bx) bx.onclick = baixaFotos;
  },
  filtered: () => S.team,
  groups(list) {
    const out = FUNCOES.map((fn) => ({ title: fn, items: list.filter((t) => funcoesDe(t)[0] === fn) }));
    out.push({ title: 'Outras funções', items: list.filter((t) => !FUNCOES.includes(funcoesDe(t)[0])) });
    return out;
  },
  empty: 'Ninguém cadastrado ainda.',
  row(t) {
    const n = S.creators.filter((c) => c.roteiristaId === t.id || c.editorId === t.id).length;
    const u = S.usuarios.find((x) => x.teamId === t.id && !x.desativado);
    return `<span class="who" ${t.idealizadora ? 'title="idealizadora"' : ''}>${t.fotoV ? `<img class="mini-foto" src="/foto/${esc(t.id)}.jpg?v=${esc(t.fotoV)}" alt="" loading="lazy" />` : ''}<span class="name">${esc(t.nome)}${u ? `<span class="flag" style="color:var(--ink-2)">${u.papel === 'admin' ? 'admin' : 'tem acesso'}</span>` : ''}</span><span class="muted">${esc(t.contato || 'sem contato')}</span></span>
      <span class="tag">${esc(funcoesDe(t).join(', ') || 'sem função')}</span><span class="line ok">${n} criador${n === 1 ? '' : 'es'}</span><span></span>`;
  },
  async create() { return api.save('team', { nome: 'Nova pessoa', funcoes: [], contato: '', obs: '' }); },
  detail(t) {
    const com = S.creators.filter((c) => c.roteiristaId === t.id || c.editorId === t.id);
    return `
      <div class="dhead"><button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
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
          ${field({ k: 'obs', type: 'textarea', label: 'Observações (interno)', full: true }, t)}
        </div></section>
        <section class="fs"><h3>Na página inicial</h3>
          <div class="foto-eq" data-foto-alvo>
            <div class="foto-prev">${t.fotoV ? `<img src="/foto/${esc(t.id)}.jpg?v=${esc(t.fotoV)}" alt="Foto de ${esc(t.nome)}" />` : `<span>${esc(iniciaisNome(t.nome))}</span>`}</div>
            <div class="foto-acoes">
              <label class="btn ghost">${t.fotoV ? 'Trocar foto' : 'Escolher foto'}<input type="file" accept="image/*" hidden data-foto-arq /></label>
              ${t.fotoV ? '<button class="btn ghost" type="button" data-foto-del>Remover</button>' : ''}
              <p class="foto-dica">Ou arraste a foto para cá. Pode mandar no tamanho original: o site reduz sem perder a nitidez.</p>
            </div>
          </div>
          <div class="grid2" style="margin-top:18px">
            ${field({ k: 'bio', type: 'textarea', label: 'Mini bio (quem é e o que faz)', full: true, ph: 'Ex.: Designer e ilustradora de Salvador. Fez a identidade visual do seu voto decide.' }, t)}
            ${field({ k: 'link', label: 'Rede social', full: true, ph: 'https://instagram.com/perfil ou @perfil', lazy: true }, t)}
            ${field({ k: 'mostrarNoSite', type: 'bool', text: 'Aparece na página inicial, em "Quem está fazendo"', full: true }, { ...t, mostrarNoSite: t.mostrarNoSite !== false })}
            ${field({ k: 'idealizadora', type: 'bool', text: 'Idealizou o seu voto decide (aparece também em destaque, em "Quem idealizou")', full: true }, t)}
          </div>
        </section>
        <section class="fs"><h3>Acesso ao controle</h3>${acessoHtml(t)}</section>
        <section class="fs"><h3>Com quem está trabalhando</h3>
          <div style="font-size:15px">${com.map((c) => `${esc(c.nome)} <span style="font:400 12px var(--mono);color:var(--ink-3)">${c.roteiristaId === t.id && c.editorId === t.id ? 'escrita e edição' : c.roteiristaId === t.id ? 'escrita e pesquisa' : 'edição do vídeo'}</span>`).join('<br>') || '<span style="color:var(--ink-3)">ninguém ainda</span>'}</div>
        </section>
        <div class="dfoot"><span>atualizado ${fmtData(t.updatedAt)}</span><button class="btn danger" data-del>Excluir pessoa</button></div>
      </div>`;
  },
  onSaved(k, t) { if (k === 'nome') $('[data-h=nome]').textContent = t.nome; if (k === 'funcoes') renderDetail(); },
  bind(box, t) {
    bindAcesso(box, t);
    const alvo = $('[data-foto-alvo]', box);
    const arq = $('[data-foto-arq]', box);
    if (arq) arq.onchange = () => { if (arq.files[0]) enviaFoto(t, arq.files[0]); };
    const del = $('[data-foto-del]', box);
    if (del) del.onclick = async () => {
      if (!confirm(`Remover a foto de ${t.nome}?`)) return;
      try { Object.assign(t, await req(`/api/team/${t.id}/foto`, { method: 'DELETE' })); renderDetail(); renderRows(); toast('Foto removida'); } catch (e) { toast(e.message); }
    };
    if (alvo) {
      alvo.ondragover = (e) => { e.preventDefault(); alvo.classList.add('arrastando'); };
      alvo.ondragleave = () => alvo.classList.remove('arrastando');
      alvo.ondrop = (e) => { e.preventDefault(); alvo.classList.remove('arrastando'); const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/')); if (f) enviaFoto(t, f); };
    }
  },
};

/* baixa todas as fotos da equipe, uma por pessoa, com o nome no arquivo */
async function baixaFotos() {
  const com = S.team.filter((t) => t.fotoV);
  if (!com.length) return toast('Ninguém tem foto ainda.');
  for (const [i, t] of com.entries()) {
    toast(`Baixando ${i + 1} de ${com.length}…`);
    const b = await fetch(`/foto/${t.id}.jpg?v=${t.fotoV}`).then((r) => r.blob());
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = `svd-equipe-${normaliza(t.nome).trim().replace(/[^a-z0-9]+/g, '-')}.jpg`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    await new Promise((r) => setTimeout(r, 500));
  }
  toast(`${com.length} fotos baixadas`);
}

/* fotos da equipe: o navegador reduz para no máximo 1200 px e manda em JPEG */
const iniciaisNome = (n) => String(n || '').split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
async function reduzFoto(file) {
  let img;
  try { img = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
  catch {
    img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = URL.createObjectURL(file); })
      .catch(() => { throw new Error(/heic|heif/i.test(file.name + file.type) ? `${file.name}: foto de iPhone (HEIC) não abre no navegador. Salve como JPG e mande de novo.` : `${file.name}: não consegui abrir essa imagem.`); });
  }
  const w = img.width, h = img.height, k = Math.min(1, 1200 / Math.max(w, h));
  const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
  const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.86);
}
async function enviaFoto(t, file, silencioso) {
  try {
    if (!silencioso) toast('Enviando foto…');
    const foto = await reduzFoto(file);
    Object.assign(t, await req(`/api/team/${t.id}/foto`, { method: 'POST', body: JSON.stringify({ foto }) }));
    if (!silencioso) { renderDetail(); renderRows(); toast('Foto salva'); }
    return true;
  } catch (e) { toast(e.message); return false; }
}
const normaliza = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
async function fotosEmLote(files) {
  if (!files.length) return;
  const ligados = [], sobraram = [];
  for (const f of files) {
    const partes = normaliza(f.name.replace(/\.[^.]+$/, '')).split(/[^a-z0-9]+/).filter((x) => x.length > 1);
    let melhor = null, pontos = 0, empate = false;
    for (const t of S.team) {
      const login = S.usuarios.find((u) => u.teamId === t.id)?.login;
      const nomes = [...normaliza(t.nome).split(/\s+/), login].filter(Boolean);
      const p = nomes.filter((n) => partes.includes(n)).length;
      if (p > pontos) { melhor = t; pontos = p; empate = false; } else if (p && p === pontos) empate = true;
    }
    if (melhor && !empate) ligados.push([melhor, f]); else sobraram.push(f.name);
  }
  let ok = 0;
  for (const [i, [t, f]] of ligados.entries()) { toast(`Enviando ${i + 1} de ${ligados.length}…`); if (await enviaFoto(t, f, true)) ok++; }
  renderRows(); renderDetail();
  const msg = `${ok} foto${ok === 1 ? '' : 's'} salva${ok === 1 ? '' : 's'}.` + (sobraram.length ? `\n\nNão reconheci de quem são: ${sobraram.join(', ')}.\nRenomeie com o nome da pessoa ou envie pela ficha dela.` : '');
  alert(msg);
}

/* Pessoas comuns */
VIEWS.pessoas = {
  col: 'pessoas',
  bar() {
    const f = S.fpe;
    return `<input type="search" data-fpe="q" placeholder="Buscar nome, cidade, texto" value="${esc(f.q)}" />
      <select data-fpe="status">${opt(PESSOA_STATUS, f.status, 'Todos os status')}</select>
      <span class="sp"></span>
      <button class="btn ghost" data-copy="${esc(location.origin + '/participar?tipo=pessoa')}">Copiar link do cadastro</button>
      <a class="btn ghost" href="/export/pessoas.csv">Exportar CSV</a>
      <button class="btn solid" data-new>Nova pessoa</button>`;
  },
  filtered() {
    const f = S.fpe; const q = f.q.toLowerCase();
    return S.pessoas.filter((x) =>
      (!q || [x.nome, x.cidade, x.sobre, x.observacoes, x.contatoWhats, x.contatoEmail].join(' ').toLowerCase().includes(q)) &&
      (!f.status || (x.status || 'Inscrita') === f.status));
  },
  groups(list) {
    return PESSOA_STATUS.map((st) => ({ title: st, items: list.filter((x) => (x.status || 'Inscrita') === st) }));
  },
  empty: 'Ninguém se cadastrou ainda.',
  row(x) {
    const ids = x.pautaIds && x.pautaIds.length ? x.pautaIds : x.pautaId ? [x.pautaId] : [];
    const p = find('pautas', ids[0]);
    const n = (x.publicacoes || []).length;
    return `<span class="who"><span class="name">${esc(x.nome)}</span><span class="muted">${esc(x.cidade || 'sem cidade')}${(x.comQuem || []).length ? ' · ' + esc(x.comQuem.join(', ')) : ''}</span></span>
      ${statusTag(x.status || 'Inscrita')}
      <span class="line ok">${p ? esc(p.titulo.slice(0, 18)) + (ids.length > 1 ? ' +' + (ids.length - 1) : '') : 'sem pauta'}</span>
      <span class="resp">${n ? n + '×' : ''}</span>`;
  },
  async create() { return api.save('pessoas', { nome: 'Nova pessoa', cidade: '', contatoWhats: '', contatoEmail: '', comQuem: [], sobre: '', status: 'Inscrita', pautaId: '', publicacoes: [], observacoes: '', responsavel: '' }); },
  detail(x) {
    const pautasPessoa = () => S.pautas.filter((p) => ['Pessoas comuns', 'Todos'].includes(p.paraQuem) || (x.pautaIds || []).includes(p.id) || p.id === x.pautaId).map((p) => [p.id, p.titulo]);
    return `
      <div class="dhead"><button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
        <div class="kicker">${statusTag(x.status || 'Inscrita')}<span>pessoa comum</span>${x.inscritoEm ? `<span>cadastro em ${fmtData(x.inscritoEm)}</span>` : ''}<span class="sp"></span><span class="saved">salvo</span></div>
        <h2 data-h="nome">${esc(x.nome)}</h2>
        <span class="handle">${esc(x.cidade || '')}</span>
      </div>
      <div class="dbody">
        ${x.sobre ? `<p class="about">${esc(x.sobre)}</p>` : ''}
        <section class="fs"><h3>Acompanhamento</h3><div class="grid2">
          ${field({ k: 'status', type: 'select', label: 'Status', opts: () => PESSOA_STATUS }, { ...x, status: x.status || 'Inscrita' })}
          ${field({ k: 'responsavel', type: 'seg', label: 'Quem acompanha', opts: () => RESP, clear: true }, x)}
          ${field({ k: 'pautaIds', type: 'chips', label: 'Pautas escolhidas', full: true, none: 'Nenhuma pauta aberta para pessoas comuns.', opts: () => pautasPessoa().map(([v, l]) => ({ v, l })) }, { ...x, pautaIds: x.pautaIds && x.pautaIds.length ? x.pautaIds : x.pautaId ? [x.pautaId] : [] })}
          ${linkPainel(x, 'comentario')}
        </div></section>
        <section class="fs"><h3>Contato</h3><div class="grid2">
          ${field({ k: 'nome', label: 'Nome' }, x)}
          ${field({ k: 'cidade', label: 'Cidade' }, x)}
          ${field({ k: 'contatoWhats', label: 'WhatsApp' }, x)}
          ${field({ k: 'contatoEmail', label: 'E-mail' }, x)}
          ${field({ k: 'comQuem', type: 'chips', label: 'Com quem quer falar', full: true, opts: () => ['Família', 'Amigos', 'Colegas de trabalho ou escola', 'Stories / status', 'Grupos de WhatsApp', 'Vizinhança / bairro'].map((v) => ({ v, l: v })) }, x)}
          ${field({ k: 'mostrarNaComunidade', type: 'bool', text: 'Aparece em "Quem participa" no painel', full: true }, x)}
          ${field({ k: 'observacoes', type: 'textarea', label: 'Observações', full: true }, x)}
        </div></section>
        <div class="dfoot"><span>atualizado ${fmtData(x.updatedAt)}</span><button class="btn danger" data-del>Excluir pessoa</button></div>
      </div>`;
  },
  onSaved(k, x) {
    if (k === 'nome') $('[data-h=nome]').textContent = x.nome;
    if (k === 'pautaIds') save('pessoas', x, { pautaId: x.pautaIds[0] || '' });
    if (['status', 'comQuem'].includes(k)) renderDetail();
  },
};

/* Produção interna: vídeos e peças de divulgação da articulação */
const nomesEquipe = (ids) => (ids || []).map((id) => find('team', id)?.nome).filter(Boolean);
const atrasada = (t) => t.prazo && t.etapa !== 'Publicado' && t.etapa !== 'Pronto' && new Date(t.prazo + 'T23:59') < new Date();
VIEWS.producao = {
  col: 'producao',
  bar: () => `<span class="sp"></span><a class="btn ghost" href="/export/producao.csv">Exportar CSV</a><button class="btn solid" data-new>Nova tarefa</button>`,
  filtered: () => S.producao,
  groups(list) { return ETAPAS.map((e) => ({ title: e, items: list.filter((t) => (t.etapa || 'A fazer') === e) })); },
  empty: 'Nenhuma tarefa ainda.',
  row(t) {
    return `<span class="who"><span class="name">${esc(t.titulo)}${atrasada(t) ? '<span class="flag">atrasada</span>' : ''}</span><span class="muted">${esc(t.tipo || 'sem tipo')} · ${esc(nomesEquipe(t.responsaveis).join(', ') || 'sem responsável')}</span></span>
      ${statusTag(t.etapa || 'A fazer')}<span class="line ok">${t.prazo ? 'até ' + fmtData(t.prazo) : 'sem prazo'}</span><span class="resp">${t.entregaLink ? 'link' : ''}</span>`;
  },
  async create() { return api.save('producao', { titulo: 'Nova tarefa', tipo: 'Vídeo de divulgação', briefing: '', responsaveis: [], etapa: 'A fazer', prazo: '', entregaLink: '', notasEquipe: '' }); },
  detail(t) {
    return `
      <div class="dhead"><button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
        <div class="kicker">${statusTag(t.etapa || 'A fazer')}<span>${esc(t.tipo || '')}</span>${atrasada(t) ? '<span style="color:var(--red)">atrasada</span>' : ''}<span class="sp"></span><span class="saved">salvo</span></div>
        <h2 data-h="titulo">${esc(t.titulo)}</h2></div>
      <div class="dbody">
        ${field({ k: 'briefing', type: 'marker', label: 'Briefing', who: 'o que precisa ser feito', ph: 'Objetivo, formato, duração, referências, onde vai ser publicado…' }, t)}
        <section class="fs"><h3>Tarefa</h3><div class="grid2">
          ${field({ k: 'titulo', label: 'Título', full: true }, t)}
          ${field({ k: 'tipo', type: 'seg', label: 'Tipo', full: true, opts: () => TIPOS_TAREFA }, t)}
          ${field({ k: 'etapa', type: 'seg', label: 'Etapa', full: true, opts: () => ETAPAS }, { ...t, etapa: t.etapa || 'A fazer' })}
          ${field({ k: 'prazo', type: 'date', label: 'Prazo' }, t)}
          ${field({ k: 'entregaLink', type: 'url', label: 'Link da entrega (Drive, etc.)', ph: 'https://…' }, t)}
          ${field({ k: 'responsaveis', type: 'chips', label: 'Quem faz', full: true, none: 'Cadastre a equipe na aba Equipe.', opts: () => S.team.map((m) => ({ v: m.id, l: `${m.nome}${funcoesDe(m).length ? ' · ' + funcoesDe(m)[0] : ''}` })) }, t)}
          ${field({ k: 'notasEquipe', type: 'textarea', label: 'Notas da equipe', full: true }, t)}
        </div></section>
        <div class="dfoot"><span>atualizado ${fmtData(t.updatedAt)}</span><button class="btn danger" data-del>Excluir tarefa</button></div>
      </div>`;
  },
  onSaved(k, t) { if (k === 'titulo') $('[data-h=titulo]').textContent = t.titulo; if (['etapa', 'tipo', 'prazo', 'responsaveis'].includes(k)) renderDetail(); },
};

/* Visão da equipe: só as próprias tarefas */
VIEWS.tarefas = {
  col: 'minhas-tarefas',
  bar: () => `<span class="sp"></span>`,
  filtered: () => S['minhas-tarefas'],
  groups(list) { return ETAPAS.map((e) => ({ title: e, items: list.filter((t) => (t.etapa || 'A fazer') === e) })); },
  empty: 'Nenhuma tarefa com você por enquanto.',
  row: (t) => VIEWS.producao.row({ ...t, responsaveis: [] }).replace('sem responsável', esc((t.responsaveisNomes || []).join(', '))),
  detail(t) {
    return `
      <div class="dhead"><button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
        <div class="kicker">${statusTag(t.etapa || 'A fazer')}<span>${esc(t.tipo || '')}</span>${t.prazo ? `<span>até ${fmtData(t.prazo)}</span>` : ''}<span class="sp"></span><span class="saved">salvo</span></div>
        <h2>${esc(t.titulo)}</h2></div>
      <div class="dbody">
        <div class="marker" style="cursor:default"><span>Briefing</span><p style="margin:8px 0 0;font-size:16px;white-space:pre-line">${esc(t.briefing) || 'Sem briefing ainda.'}</p></div>
        <section class="fs"><h3>Sua parte</h3><div class="grid2">
          ${field({ k: 'etapa', type: 'seg', label: 'Etapa', full: true, opts: () => ETAPAS }, { ...t, etapa: t.etapa || 'A fazer' })}
          ${field({ k: 'entregaLink', type: 'url', label: 'Link da entrega (Drive, etc.)', full: true, ph: 'https://…' }, t)}
          ${field({ k: 'notasEquipe', type: 'textarea', label: 'Notas', full: true }, t)}
          <div class="f full"><span>Com quem</span><div>${esc((t.responsaveisNomes || []).join(', '))}</div></div>
        </div></section>
      </div>`;
  },
  onSaved(k) { if (k === 'etapa') renderDetail(); },
};

/* Materiais da campanha (aparecem no painel pessoal) */
VIEWS.materiais = {
  col: 'materiais',
  bar: () => `<span class="sp"></span><button class="btn solid" data-new>Novo material</button>`,
  filtered: () => S.materiais,
  groups(list) { return PARA_QUEM_MAT.map((q) => ({ title: q === 'Todos' ? 'Para todo mundo' : 'Só para ' + q.toLowerCase(), items: list.filter((m) => (m.paraQuem || 'Todos') === q) })); },
  empty: 'Nenhum material ainda. O link precisa abrir para qualquer pessoa (no Drive: "qualquer pessoa com o link").',
  row(m) {
    const ok = /^https?:\/\//i.test(m.link || '');
    return `<span class="who"><span class="name">${esc(m.titulo)}${ok ? '' : '<span class="flag">sem link: não aparece</span>'}</span><span class="muted">${esc(m.link || '')}</span></span>
      <span class="tag">${esc(m.tipo || 'material')}</span><span class="line ok">${esc(m.paraQuem || 'Todos')}</span><span></span>`;
  },
  async create() { return api.save('materiais', { titulo: 'Novo material', tipo: 'Arte', descricao: '', link: '', paraQuem: 'Todos' }); },
  detail(m) {
    return `
      <div class="dhead"><button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
        <div class="kicker"><span>material</span><span class="sp"></span><span class="saved">salvo</span></div>
        <h2 data-h="titulo">${esc(m.titulo)}</h2></div>
      <div class="dbody"><section class="fs"><h3>Dados</h3><div class="grid2">
        ${field({ k: 'titulo', label: 'Título', full: true }, m)}
        ${field({ k: 'link', type: 'url', label: 'Link (Drive, Canva, YouTube…)', full: true, ph: 'https://…' }, m)}
        ${field({ k: 'tipo', type: 'seg', label: 'Tipo', full: true, opts: () => TIPOS_MATERIAL }, m)}
        ${field({ k: 'paraQuem', type: 'seg', label: 'Aparece para', full: true, opts: () => PARA_QUEM_MAT }, { ...m, paraQuem: m.paraQuem || 'Todos' })}
        ${field({ k: 'descricao', type: 'textarea', label: 'Descrição / como usar', full: true }, m)}
      </div></section>
      <div class="dfoot"><span>atualizado ${fmtData(m.updatedAt)}</span><button class="btn danger" data-del>Excluir material</button></div></div>`;
  },
  onSaved(k, m) { if (k === 'titulo') $('[data-h=titulo]').textContent = m.titulo; if (['tipo', 'paraQuem', 'link'].includes(k)) renderRows(); },
};

/* Vídeos que chegaram (pelo painel pessoal ou pelo formulário aberto) */
const titulosPautas = (ids) => (ids || []).map((id) => find('pautas', id)?.titulo).filter(Boolean);
VIEWS.videos = {
  col: 'videos',
  bar: () => `<span class="sp"></span><button class="btn ghost" data-copy="${esc(location.origin + '/enviar-video')}">Copiar link do formulário de vídeo</button><a class="btn ghost" href="/export/videos.csv">Exportar CSV</a>`,
  filtered: () => S.videos.slice().sort((a, b) => String(b.em).localeCompare(String(a.em))),
  groups(list) { return [{ title: 'A conferir', items: list.filter((v) => !v.conferido) }, { title: 'Conferidos', items: list.filter((v) => v.conferido) }]; },
  empty: 'Nenhum vídeo ainda.',
  row(v) {
    const pts = titulosPautas(v.pautaIds);
    return `<span class="who"><span class="name">${esc(v.nome)}${v.tipo === 'criador' ? '<span class="flag" style="color:var(--blue)">criador</span>' : ''}${v.campanha ? `<span class="flag">${esc(v.campanha)}</span>` : ''}</span><span class="muted">${esc(v.link)}</span></span>
      <span class="line ok">${esc(pts[0] ? pts[0].slice(0, 16) : 'sem pauta')}</span><span class="line ok">${fmtData(v.em)}</span><span class="resp">${v.origem === 'formulario' ? 'form' : 'painel'}</span>`;
  },
  detail(v) {
    const ok = /^https?:\/\//i.test(v.link || '');
    return `
      <div class="dhead"><button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
        <div class="kicker"><span>${v.origem === 'formulario' ? 'formulário aberto' : 'painel pessoal'}</span><span>${fmtData(v.em)}</span><span class="sp"></span><span class="saved">salvo</span></div>
        <h2>${esc(v.nome)}</h2>
        ${ok ? `<a class="handle" href="${esc(v.link)}" target="_blank" rel="noopener noreferrer">${esc(v.link)} ${ICONE.externo}</a>` : ''}
      </div>
      <div class="dbody">
        ${v.comentario ? `<p class="about">${esc(v.comentario)}</p>` : ''}
        <section class="fs"><h3>Dados</h3><div class="grid2">
          <div class="f"><span>Contato</span><div>${esc(v.contato || '—')}</div></div>
          ${v.campanha ? `<div class="f"><span>Campanha</span><div>${esc(v.campanha)}</div></div>` : ''}
          <div class="f"><span>Pautas</span><div>${esc(titulosPautas(v.pautaIds).join(' · ') || '—')}</div></div>
          <div class="f"><span>Nome no mural</span><div>${v.mostrarNome ? 'pode mostrar' : 'aparece como "Participante"'}</div></div>
          ${field({ k: 'conferido', type: 'bool', text: 'Conferido: entra no mural de quem participa', full: true }, v)}
          ${field({ k: 'notas', type: 'textarea', label: 'Notas', full: true }, v)}
        </div></section>
        <div class="dfoot"><span></span><button class="btn danger" data-del>Excluir</button></div>
      </div>`;
  },
  onSaved(k) { if (k === 'conferido') renderRows(); },
};

/* Jurídico: pedidos de orientação e gente da área oferecendo ajuda */
const SITUACAO_JUR = ['Novo', 'Em atendimento', 'Resolvido', 'Arquivado'];
VIEWS.juridico = {
  col: 'juridico',
  bar: () => `<span class="sp"></span><button class="btn ghost" data-copy="${esc(location.origin + '/juridico')}">Copiar link da página jurídica</button><a class="btn ghost" href="/export/juridico.csv">Exportar CSV</a>`,
  filtered: () => S.juridico.slice().sort((a, b) => String(b.em).localeCompare(String(a.em))),
  groups(list) {
    const pedidos = list.filter((j) => j.tipo !== 'ajudar');
    return [
      { title: 'Pedidos novos', items: pedidos.filter((j) => (j.situacao || 'Novo') === 'Novo') },
      { title: 'Em atendimento', items: pedidos.filter((j) => j.situacao === 'Em atendimento') },
      { title: 'Querem ajudar (área do direito)', items: list.filter((j) => j.tipo === 'ajudar' && !['Resolvido', 'Arquivado'].includes(j.situacao)) },
      { title: 'Resolvidos e arquivados', items: list.filter((j) => ['Resolvido', 'Arquivado'].includes(j.situacao)) },
    ];
  },
  empty: 'Nenhum pedido ainda.',
  row(j) {
    return `<span class="who"><span class="name">${esc(j.nome)}${j.tipo === 'ajudar' ? '<span class="flag" style="color:var(--blue)">quer ajudar</span>' : ''}</span><span class="muted">${esc(j.assunto || j.oab || j.perfil || j.contato)}</span></span>
      <span class="line ok">${esc(j.situacao || 'Novo')}</span><span class="line ok">${fmtData(j.em)}</span><span class="resp">${esc(j.responsavel || '')}</span>`;
  },
  detail(j) {
    const ajuda = j.tipo === 'ajudar';
    return `
      <div class="dhead"><button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
        <div class="kicker"><span>${ajuda ? 'quer ajudar' : 'pedido de orientação'}</span><span>${fmtData(j.em)}</span><span class="sp"></span><span class="saved">salvo</span></div>
        <h2>${esc(j.nome)}</h2>
      </div>
      <div class="dbody">
        <p class="about" style="white-space:pre-line">${esc(j.mensagem)}</p>
        <section class="fs"><h3>Dados</h3><div class="grid2">
          <div class="f"><span>Contato</span><div>${esc(j.contato || '—')}</div></div>
          <div class="f"><span>@ / perfil</span><div>${esc(j.perfil || '—')}</div></div>
          ${ajuda ? `<div class="f"><span>OAB</span><div>${esc(j.oab || '—')}</div></div>` : `<div class="f"><span>Assunto</span><div>${esc(j.assunto || '—')}</div></div>`}
        </div></section>
        <section class="fs"><h3>Acompanhamento</h3><div class="grid2">
          ${field({ k: 'situacao', type: 'select', label: 'Situação', opts: () => SITUACAO_JUR }, j)}
          ${field({ k: 'responsavel', label: ajuda ? 'Quem fez o contato' : 'Advogada responsável', ph: 'nome' }, j)}
          ${field({ k: 'notas', type: 'textarea', label: 'Notas internas (não cole aqui o contrato)', full: true }, j)}
        </div></section>
        <div class="dfoot"><span></span><button class="btn danger" data-del>Excluir</button></div>
      </div>`;
  },
  onSaved(k) { if (['situacao', 'responsavel'].includes(k)) renderRows(); },
};

/* Ajustes: link do grupo e do material */
async function renderAjustes() {
  let c = S.config[0];
  if (!c) { c = await api.save('config', { grupoWhatsapp: '', materialPautas: '' }); S.config = [c]; }
  $('#view').innerHTML = `<div class="ajustes"><div class="dhead"><div class="kicker"><span>ajustes</span><span class="sp"></span><span class="saved">salvo</span></div><h2>Links do site</h2></div>
    <div class="dbody"><section class="fs"><h3>Aparecem para quem se cadastra</h3><div class="grid2">
      ${field({ k: 'grupoWhatsapp', type: 'url', label: 'Grupo do WhatsApp da sociedade civil (pessoas comuns recebem logo depois do cadastro)', full: true, ph: 'https://chat.whatsapp.com/…' }, c)}
      ${field({ k: 'grupoWhatsappCriadores', type: 'url', label: 'Grupo do WhatsApp dos criadores (aparece para quem se cadastra como criador; deixe a aprovação de entrada ligada no WhatsApp)', full: true, ph: 'https://chat.whatsapp.com/…' }, c)}
      ${field({ k: 'materialPautas', type: 'url', label: 'Link do material com as pautas e roteiros (PDF no Drive, por exemplo)', full: true, ph: 'https://' }, c)}
    </div></section>
    <section class="fs"><h3>Apoiadores (aparecem no fim da página inicial)</h3><div class="grid2">
      ${field({ k: 'apoiadores', type: 'textarea', label: 'Um por linha, no formato: Nome | link (o link é opcional)', full: true, ph: 'Iara Lee | https://www.instagram.com/iaralee.explores.brazil/' }, c)}
    </div></section>
    <section class="fs"><h3>Rede jurídica (aparece na página /juridico)</h3><div class="grid2">
      ${field({ k: 'advogadas', type: 'textarea', label: 'Uma por linha, no formato: Nome | OAB nº/UF | link do perfil (OAB e link são opcionais)', full: true, ph: 'Nome Sobrenome | OAB 12345/BA | https://www.instagram.com/perfil/' }, c)}
    </div></section>
    <section class="fs"><h3>Contagem de participantes</h3><div class="grid2">
      ${field({ k: 'participantesExtra', label: 'Pessoas participando fora do site', ph: 'ex.: 15' }, c)}
      <div class="f"><span>Como o site conta</span><div style="font-size:14.5px;color:var(--ink-2)">equipe (${S.team.length}) + cadastros (${S.pessoas.length + S.creators.filter((x) => x.inscreveuSe || ANDAMENTO.includes(x.status)).length}) + este número</div></div>
    </div></section>
    <section class="fs"><h3>Endereços para divulgar</h3><div class="grid2">
      ${[['Página inicial', '/'], ['Cadastro de pessoas comuns', '/participar?tipo=pessoa'], ['Cadastro de criadores', '/participar?tipo=criador'], ['Mandar link do vídeo', '/enviar-video']].map(([l, u]) => `<div class="f full"><span>${l}</span><div class="copy"><input type="text" readonly value="${esc(location.origin + u)}" /><button type="button" class="btn" data-copy="${esc(location.origin + u)}">${ICONE.copiar}</button></div></div>`).join('')}
    </div></section></div></div>`;
  bindFields($('#view'), 'config', c);
  $$('[data-copy]').forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); toast('Copiado'); } catch { b.previousElementSibling.select(); } }));
}

/* Nichos */
VIEWS.nichos = {
  col: 'nichos',
  bar: () => `<span class="sp"></span><button class="btn solid" data-new>Novo nicho</button>`,
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
      <div class="dhead"><button class="btn ghost back" data-back>${ICONE.voltar} Voltar</button>
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

/* ---------- acessos da equipe ---------- */
function acessoHtml(t) {
  const u = S.usuarios.find((x) => x.teamId === t.id && !x.desativado);
  if (!u) return `<p style="margin:0 0 10px;color:var(--ink-2);font-size:14px">Sem acesso.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-acesso="criar-equipe">Criar acesso de equipe</button><button class="btn ghost" data-acesso="criar-admin">Criar acesso de administradora</button></div>`;
  return `<div class="grid2">
      <div class="f"><span>Login</span><div style="font:500 15px var(--mono)">${esc(u.login)}</div></div>
      <div class="f"><span>Tipo</span><div>${u.papel === 'admin' ? 'Administradora (vê tudo)' : 'Equipe (só as próprias tarefas)'}</div></div>
      <div class="f full"><span>Último acesso</span><div>${u.ultimoAcesso ? fmtData(u.ultimoAcesso) : 'ainda não entrou'}${u.trocarSenha ? ' · ainda com a senha provisória' : ''}</div></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn" data-acesso="redefinir">Gerar nova senha</button>
      ${u.id !== S.me.id ? `<button class="btn ghost" data-acesso="papel">${u.papel === 'admin' ? 'Tornar equipe' : 'Tornar administradora'}</button><button class="btn danger" data-acesso="remover">Remover acesso</button>` : ''}
    </div>
    <div id="senha-nova"></div>`;
}
function mostraSenha(login, senha, comum) {
  $('#senha-nova').innerHTML = `<div style="margin-top:14px;padding-top:12px;border-top:2px solid var(--green)"><b style="color:var(--green)">${comum ? 'Acesso pronto' : 'Senha provisória (aparece só agora)'}</b><br>
    Login <strong style="font-family:var(--mono)">${esc(login)}</strong> · senha ${comum ? '<strong>a senha comum da equipe</strong>' : `<strong style="font-family:var(--mono)">${esc(senha)}</strong>`}. A pessoa cria a dela no primeiro acesso.<br>
    <span style="font-size:13px;color:var(--ink-2)">Endereço: ${esc(location.origin)}/admin</span></div>`;
}
function bindAcesso(box, t) {
  $$('[data-acesso]', box).forEach((b) => (b.onclick = async () => {
    const acao = b.dataset.acesso;
    const u = S.usuarios.find((x) => x.teamId === t.id && !x.desativado);
    try {
      if (acao.startsWith('criar')) {
        const out = await api.post('/api/usuarios', { nome: t.nome, teamId: t.id, papel: acao === 'criar-admin' ? 'admin' : 'equipe' });
        S.usuarios.push(out.usuario); renderDetail(); renderRows(); mostraSenha(out.usuario.login, out.senhaProvisoria, out.senhaComum);
      } else if (acao === 'redefinir') {
        if (!confirm('Gerar uma senha nova? A atual deixa de funcionar.')) return;
        const out = await api.post(`/api/usuarios/${u.id}/redefinir`);
        u.trocarSenha = true; renderDetail(); mostraSenha(u.login, out.senhaProvisoria, out.senhaComum);
      } else if (acao === 'papel') {
        Object.assign(u, await api.save('usuarios', { id: u.id, papel: u.papel === 'admin' ? 'equipe' : 'admin' })); renderDetail(); renderRows();
      } else if (acao === 'remover') {
        if (!confirm(`Remover o acesso de ${t.nome}?`)) return;
        await api.del('usuarios', u.id); S.usuarios = S.usuarios.filter((x) => x.id !== u.id); renderDetail(); renderRows(); toast('Acesso removido');
      }
    } catch (e) { toast(e.message); }
  }));
}

/* ---------- render da tela dividida ---------- */
function renderSplit() {
  const V = VIEWS[S.view];
  $('#view').innerHTML = `<div class="split ${S.open ? 'open' : ''}"><section class="list"><div class="bar">${V.bar()}</div><div id="rows"></div></section><aside class="detail" id="detail"></aside></div>`;
  const bar = $('.bar');
  $$('[data-f]', bar).forEach((el) => (el[el.tagName === 'INPUT' ? 'oninput' : 'onchange'] = () => { S.f[el.dataset.f] = el.value; renderRows(); }));
  $$('[data-fp]', bar).forEach((el) => (el[el.tagName === 'INPUT' ? 'oninput' : 'onchange'] = () => { S.fp[el.dataset.fp] = el.value; renderRows(); }));
  $$('[data-fpe]', bar).forEach((el) => (el[el.tagName === 'INPUT' ? 'oninput' : 'onchange'] = () => { S.fpe[el.dataset.fpe] = el.value; renderRows(); }));
  $$('[data-copy]', bar).forEach((b) => (b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Link do cadastro copiado'); }
    catch { prompt('Copie o link:', b.dataset.copy); }
  }));
  const nb = $('[data-new]', bar);
  if (nb) nb.onclick = async () => {
    const rec = await V.create(); S[V.col].push(rec); select(rec.id);
    renderStats(); renderRows();
    const first = $('#detail input[data-k]'); if (first) { first.focus(); first.select(); }
  };
  if (V.bindBar) V.bindBar(bar);
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
      criadores: 'Escolha um criador na lista.', pautas: 'Escolha uma pauta na lista.', equipe: 'Escolha alguém na lista.',
      nichos: 'Escolha um nicho na lista.', pessoas: 'Escolha alguém na lista.', producao: 'Escolha uma tarefa na lista.',
      tarefas: 'Escolha uma tarefa na lista.', materiais: 'Escolha um material na lista.', videos: 'Escolha um vídeo na lista.', juridico: 'Escolha um pedido na lista.',
    }[S.view];
    box.innerHTML = `<div class="empty-detail"><p>${tips}</p></div>`;
    return;
  }
  const y = box.scrollTop;
  box.innerHTML = V.detail(rec);
  box.scrollTop = y;
  bindFields(box, V.col, rec, (k, r) => V.onSaved && V.onSaved(k, r));
  if (V.bind) V.bind(box, rec);
  $$('[data-copy]', box).forEach((b) => (b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); toast('Link copiado'); }
    catch { b.previousElementSibling.select(); toast('Selecione e copie'); }
  }));
  const back = $('[data-back]', box);
  if (back) back.onclick = () => { S.open = false; $('.split').classList.remove('open'); };
  const del = $('[data-del]', box);
  if (del) del.onclick = async () => {
    if (!confirm(`Excluir "${rec.nome || rec.titulo}"? Não dá para desfazer.`)) return;
    try { await api.del(V.col, rec.id); } catch (e) { toast(e.message); return; }
    await loadAll();
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
  if (!ehAdmin()) {
    const t = S['minhas-tarefas'];
    $('#stats').innerHTML = [['tarefas', t.length], ['em andamento', t.filter((x) => x.etapa === 'Em andamento').length], ['atrasadas', t.filter(atrasada).length, t.some(atrasada)]]
      .map(([l, n, w]) => `<div class="${w ? 'warn' : ''}"><dt>${l}</dt><dd>${n}</dd></div>`).join('');
    return;
  }
  const c = S.creators;
  const semLinha = c.filter((x) => !x.sugestaoLinha?.trim()).length;
  const sugeridas = S.pautas.filter((p) => p.status === 'Sugerida').length;
  const postaram = S.videos.length;
  $('#stats').innerHTML = [
    ['criadores', c.length], ['pessoas', S.pessoas.length], ['sem linha', semLinha, semLinha > 0], ['sugeridas', sugeridas, sugeridas > 0], ['vídeos', postaram],
  ].map(([l, n, w]) => `<div class="${w ? 'warn' : ''}"><dt>${l}</dt><dd>${n}</dd></div>`).join('');
}

const ABAS_ADMIN = [['criadores', 'Criadores'], ['pessoas', 'Pessoas'], ['pautas', 'Pautas'], ['videos', 'Vídeos'], ['juridico', 'Jurídico'], ['producao', 'Produção'], ['materiais', 'Materiais'], ['quadro', 'Quadro'], ['equipe', 'Equipe'], ['nichos', 'Nichos'], ['ajustes', 'Ajustes']];
const ABAS_EQUIPE = [['tarefas', 'Minhas tarefas']];
const abas = () => (ehAdmin() ? ABAS_ADMIN : ABAS_EQUIPE);

function renderMast() {
  $('#mast').hidden = false;
  $('#tabs').innerHTML = abas().map(([v, l]) => `<button data-view="${v}">${l}</button>`).join('');
  $$('#tabs button').forEach((b) => (b.onclick = () => { S.view = b.dataset.view; S.open = false; go(); }));
  $('#conta').innerHTML = `<span>${esc(S.me.nome)} · ${S.me.papel === 'admin' ? 'admin' : 'equipe'}</span><button data-conta="senha">trocar senha</button><button data-conta="sair">sair</button>`;
  $('[data-conta=senha]').onclick = () => telaSenha(false);
  $('[data-conta=sair]').onclick = async () => { await api.post('/auth/logout').catch(() => {}); S.me = null; telaLogin(); };
}

function render() {
  renderStats();
  $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.view === S.view));
  if (S.view === 'quadro') renderQuadro(); else if (S.view === 'ajustes') renderAjustes(); else renderSplit();
}
function go() { history.replaceState(null, '', '/admin#' + S.view); render(); }

/* ---------- login e senha ---------- */
function telaLogin(msg = '') {
  $('#mast').hidden = true;
  $('#view').innerHTML = `<form class="login" id="fl">
    <p class="kicker-l">controle interno</p>
    <div class="login-marca"><div class="login-los" data-marca="losango"></div><h1 class="logo-login" data-marca="logo"></h1></div>
    <label class="f"><span>Login</span><input name="login" autocomplete="username" autocapitalize="off" required /></label>
    <label class="f"><span>Senha</span><input name="senha" type="password" autocomplete="current-password" required /></label>
    <button class="btn solid" type="submit">Entrar</button>
    <p class="msg" id="lmsg">${esc(msg)}</p>
    <p class="hint">Esqueceu a senha? Peça para uma administradora gerar uma nova na aba Equipe.</p>
  </form>`;
  $('#fl [name=login]').focus();
  $('#fl').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target; $('#lmsg').textContent = 'Entrando…';
    try {
      S.me = await api.post('/auth/login', { login: f.login.value.trim(), senha: f.senha.value });
      entrar();
    } catch (err) { $('#lmsg').textContent = err.message; }
  };
}
function telaSenha(obrigatoria) {
  $('#mast').hidden = obrigatoria;
  $('#view').innerHTML = `<form class="login" id="fs">
    <p class="kicker-l">${obrigatoria ? 'primeiro acesso' : 'minha conta'}</p>
    <h1>${obrigatoria ? 'Crie sua senha' : 'Trocar senha'}</h1>
    ${obrigatoria ? '<p class="hint" style="margin-top:0">Você entrou com uma senha provisória. Escolha uma só sua, com pelo menos 8 caracteres.</p>' : ''}
    <label class="f"><span>Senha atual</span><input name="atual" type="password" autocomplete="current-password" required /></label>
    <label class="f"><span>Nova senha</span><input name="nova" type="password" autocomplete="new-password" minlength="8" required /></label>
    <label class="f"><span>Repita a nova senha</span><input name="nova2" type="password" autocomplete="new-password" minlength="8" required /></label>
    <div style="display:flex;gap:8px"><button class="btn solid" type="submit">Salvar senha</button>${obrigatoria ? '<button class="btn ghost" type="button" id="outra">Sair e entrar com outra conta</button>' : '<button class="btn ghost" type="button" id="vt">Voltar</button>'}</div>
    <p class="msg" id="smsg"></p>
  </form>`;
  if (!obrigatoria) $('#vt').onclick = () => render();
  else $('#outra').onclick = async () => { await api.post('/auth/logout').catch(() => {}); S.me = null; telaLogin(); };
  $('#fs').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.nova.value !== f.nova2.value) { $('#smsg').textContent = 'As duas senhas novas não são iguais.'; return; }
    try { S.me = await api.post('/auth/senha', { atual: f.atual.value, nova: f.nova.value }); toast('Senha trocada'); entrar(); }
    catch (err) { $('#smsg').textContent = err.message; }
  };
}

async function entrar() {
  if (S.me.trocarSenha) return telaSenha(true);
  const validas = abas().map(([v]) => v);
  const h = location.hash.slice(1);
  S.view = validas.includes(h) ? h : validas[0];
  renderMast();
  $('#view').innerHTML = '<p class="nothing">carregando…</p>';
  try { await loadAll(); render(); }
  catch (e) { if (S.me) $('#view').innerHTML = `<p class="nothing">${esc(e.message)}. Recarregue a página.</p>`; }
}

fetch('/auth/me', { headers: HDR }).then(async (r) => {
  if (!r.ok) return telaLogin();
  S.me = await r.json(); entrar();
}).catch(() => telaLogin('Sem conexão. Recarregue a página.'));
