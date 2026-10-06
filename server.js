const express = require('express');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');
const seed = require('./seed');
const seg = require('./security');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');

// coleções que só as admins mexem pela API genérica
const PARA_CRIADOR = ['Criadores', 'Todos'];
const PARA_PESSOA = ['Pessoas comuns', 'Todos'];
const COLECOES = ['creators', 'pessoas', 'pautas', 'team', 'nichos', 'materiais', 'producao', 'videos', 'config'];

app.disable('x-powered-by');
app.set('trust proxy', 1); // o Render fica na frente: assim o IP real de quem acessa é o que conta
app.use(seg.headers);
app.use(seg.geral);
const jsonPadrao = express.json({ limit: '200kb' });
const jsonFoto = express.json({ limit: '4mb' });
const ROTA_FOTO = /^\/api\/team\/[^/]+\/foto$/;
app.use((req, res, next) => (ROTA_FOTO.test(req.path) ? jsonFoto : jsonPadrao)(req, res, next));
app.use(auth.sessao(db));

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch((e) => {
  console.error(e);
  res.status(500).json({ error: 'Erro no servidor. Tente de novo.' });
});
const txt = (v, max = 300) => String(v || '').trim().slice(0, max);
const newToken = () => crypto.randomBytes(12).toString('base64url');
const agora = () => new Date().toISOString();
const urlOk = (u) => /^https?:\/\/[^\s]{3,}$/i.test(String(u || '').trim());
// link de rede social: aceita URL, endereço sem https ou @perfil (vira Instagram)
const linkRede = (v) => {
  let u = String(v || '').trim();
  if (!u) return '';
  if (/^@[^\s/]{1,40}$/.test(u)) u = `https://instagram.com/${u.slice(1)}`;
  else if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return /^https?:\/\/[^\s<>"']{3,300}$/i.test(u) ? u : '';
};
const slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');

// ações que mudam dados precisam vir do próprio site (proteção contra CSRF)
function mesmoSite(req, res, next) {
  if (['GET', 'HEAD'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'espelho') return res.status(403).json({ error: 'Requisição recusada.' });
  next();
}
const logado = (req, res, next) => (req.usuario ? next() : res.status(401).json({ error: 'Faça login.' }));
const soAdmin = (req, res, next) => (req.usuario?.papel === 'admin' ? next() : res.status(403).json({ error: 'Só administradoras.' }));

app.get('/health', (_req, res) => res.json({ ok: true, storage: db.kind }));

/* =========================================================
   PÁGINAS
   ========================================================= */
app.get('/favicon.ico', (_req, res) => res.redirect(301, '/favicon-32.png'));
app.get('/admin', (_req, res) => res.sendFile(path.join(PUB, 'admin.html')));
app.get('/participar', (_req, res) => res.sendFile(path.join(PUB, 'participar.html')));
app.get('/p/:token', (_req, res) => res.sendFile(path.join(PUB, 'painel.html')));
app.get('/enviar-video', (_req, res) => res.sendFile(path.join(PUB, 'enviar-video.html')));
// foto da equipe (fica no banco, porque o disco do Render é apagado a cada deploy)
app.get('/foto/:id.jpg', wrap(async (req, res) => {
  const f = await db.get('fotos', `foto-${req.params.id}`);
  if (!f) return res.status(404).end();
  res.set('Content-Type', 'image/jpeg');
  res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
  res.send(Buffer.from(f.data, 'base64'));
}));
app.get('/escolha/:token', (req, res) => res.redirect(301, `/p/${encodeURIComponent(req.params.token)}`));

/* =========================================================
   LOGIN DO CONTROLE INTERNO
   ========================================================= */
app.use('/auth', mesmoSite);

app.get('/auth/me', (req, res) => (req.usuario ? res.json(auth.publico(req.usuario)) : res.status(401).json({ error: 'Faça login.' })));

app.post('/auth/login', wrap(async (req, res) => {
  const ip = seg.ipOf(req);
  const login = txt(req.body?.login, 80).toLowerCase();
  const L = seg.limits.senhaErrada;
  if (L.count(ip) >= L.max || L.count('u:' + login) >= L.max) {
    return res.status(429).json({ error: 'Muitas tentativas. Espere 15 minutos.' });
  }
  const u = (await db.list('usuarios')).find((x) => x.login === login && !x.desativado);
  if (!u || !auth.confereSenha(req.body?.senha || '', u.senhaHash)) {
    L.hit(ip); L.hit('u:' + login);
    return res.status(401).json({ error: 'Login ou senha incorretos.' });
  }
  L.reset(ip); L.reset('u:' + login);
  await db.update('usuarios', u.id, { ultimoAcesso: agora() });
  auth.abreSessao(req, res, u);
  res.json(auth.publico(u));
}));

app.post('/auth/logout', (req, res) => { auth.fechaSessao(req, res); res.json({ ok: true }); });

app.post('/auth/senha', logado, wrap(async (req, res) => {
  const { atual, nova } = req.body || {};
  if (!auth.confereSenha(atual || '', req.usuario.senhaHash)) return res.status(400).json({ error: 'A senha atual não confere.' });
  if (String(nova || '').length < 8) return res.status(400).json({ error: 'A nova senha precisa ter pelo menos 8 caracteres.' });
  const u = await db.update('usuarios', req.usuario.id, {
    senhaHash: auth.hashSenha(nova), trocarSenha: false, sessaoVersao: (req.usuario.sessaoVersao || 0) + 1,
  });
  auth.abreSessao(req, res, u);
  res.json(auth.publico(u));
}));

/* =========================================================
   API INTERNA
   ========================================================= */
app.use('/api', mesmoSite, logado);

/* ---- equipe: só as próprias tarefas de produção ---- */
async function minhasTarefas(u) {
  const equipe = await db.list('team');
  const nome = (id) => equipe.find((t) => t.id === id)?.nome || '';
  return (await db.list('producao'))
    .filter((t) => u.teamId && (t.responsaveis || []).includes(u.teamId))
    .map((t) => ({ ...t, responsaveisNomes: (t.responsaveis || []).map(nome).filter(Boolean) }));
}
app.get('/api/minhas-tarefas', wrap(async (req, res) => res.json(await minhasTarefas(req.usuario))));
app.put('/api/minhas-tarefas/:id', wrap(async (req, res) => {
  const t = (await minhasTarefas(req.usuario)).find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Tarefa não encontrada.' });
  const b = req.body || {};
  const patch = {};
  if ('etapa' in b && seed.ETAPAS.includes(b.etapa)) patch.etapa = b.etapa;
  if ('entregaLink' in b) patch.entregaLink = txt(b.entregaLink, 500);
  if ('notasEquipe' in b) patch.notasEquipe = txt(b.notasEquipe, 3000);
  res.json(await db.update('producao', t.id, patch));
}));

/* ---- daqui pra baixo, só administradoras ---- */
app.use('/api', soAdmin);

/* foto da equipe: chega já reduzida pelo navegador, em JPEG */
app.post('/api/team/:id/foto', wrap(async (req, res) => {
  const t = await db.get('team', req.params.id);
  if (!t) return res.status(404).json({ error: 'Pessoa não encontrada.' });
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body?.foto || ''));
  if (!m) return res.status(400).json({ error: 'Foto inválida.' });
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length < 500 || buf.length > 2.5 * 1024 * 1024 || buf[0] !== 0xff || buf[1] !== 0xd8) return res.status(400).json({ error: 'Foto inválida ou grande demais.' });
  const fid = `foto-${t.id}`;
  if (await db.get('fotos', fid)) await db.update('fotos', fid, { data: m[1] }); else await db.insert('fotos', { id: fid, teamId: t.id, data: m[1] });
  res.json(await db.update('team', t.id, { fotoV: Date.now().toString(36) }));
}));
app.delete('/api/team/:id/foto', wrap(async (req, res) => {
  const t = await db.get('team', req.params.id);
  if (!t) return res.status(404).json({ error: 'Pessoa não encontrada.' });
  await db.remove('fotos', `foto-${t.id}`);
  res.json(await db.update('team', t.id, { fotoV: '' }));
}));

/* acessos (usuários do controle interno) */
const usuarioSemSenha = ({ senhaHash, ...u }) => u;
app.get('/api/usuarios', wrap(async (_req, res) => res.json((await db.list('usuarios')).map(usuarioSemSenha))));

app.post('/api/usuarios', wrap(async (req, res) => {
  const b = req.body || {};
  const nome = txt(b.nome, 120);
  if (!nome) return res.status(400).json({ error: 'Falta o nome.' });
  const todos = await db.list('usuarios');
  let login = slug(b.login || nome.split(' ')[0]);
  if (!login) return res.status(400).json({ error: 'Login inválido.' });
  let n = 2; const base = login;
  while (todos.some((u) => u.login === login)) login = `${base}${n++}`;
  if (b.teamId && todos.some((u) => u.teamId === b.teamId)) return res.status(400).json({ error: 'Essa pessoa já tem acesso.' });
  const comum = !!process.env.APP_PASSWORD;
  const senha = process.env.APP_PASSWORD || auth.senhaProvisoria();
  const u = await db.insert('usuarios', {
    nome, login, papel: b.papel === 'admin' ? 'admin' : 'equipe', teamId: txt(b.teamId, 80),
    senhaHash: auth.hashSenha(senha), trocarSenha: true, sessaoVersao: 0,
  });
  res.status(201).json({ usuario: usuarioSemSenha(u), senhaComum: comum, senhaProvisoria: comum ? '' : senha });
}));

app.post('/api/usuarios/:id/redefinir', wrap(async (req, res) => {
  const u = await db.get('usuarios', req.params.id);
  if (!u) return res.status(404).json({ error: 'Não encontrado.' });
  const comum = !!process.env.APP_PASSWORD;
  const senha = process.env.APP_PASSWORD || auth.senhaProvisoria();
  await db.update('usuarios', u.id, { senhaHash: auth.hashSenha(senha), trocarSenha: true, sessaoVersao: (u.sessaoVersao || 0) + 1 });
  res.json({ senhaComum: comum, senhaProvisoria: comum ? '' : senha });
}));

app.put('/api/usuarios/:id', wrap(async (req, res) => {
  const u = await db.get('usuarios', req.params.id);
  if (!u) return res.status(404).json({ error: 'Não encontrado.' });
  const patch = {};
  if (req.body?.papel && ['admin', 'equipe'].includes(req.body.papel)) {
    if (u.id === req.usuario.id && req.body.papel !== 'admin') return res.status(400).json({ error: 'Você não pode tirar o seu próprio acesso de administradora.' });
    patch.papel = req.body.papel;
    patch.sessaoVersao = (u.sessaoVersao || 0) + 1;
  }
  res.json(usuarioSemSenha(await db.update('usuarios', u.id, patch)));
}));

app.delete('/api/usuarios/:id', wrap(async (req, res) => {
  if (req.params.id === req.usuario.id) return res.status(400).json({ error: 'Você não pode remover o seu próprio acesso.' });
  const ok = await db.remove('usuarios', req.params.id);
  ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Não encontrado.' });
}));

/* API genérica das coleções */
const colecaoOk = (req, res, next) => (COLECOES.includes(req.params.col) ? next() : res.status(404).json({ error: 'Coleção inválida.' }));

app.get('/api/:col', colecaoOk, wrap(async (req, res) => res.json(await db.list(req.params.col))));

app.post('/api/:col', colecaoOk, wrap(async (req, res) => {
  const data = { ...(req.body || {}) };
  if (['creators', 'pessoas'].includes(req.params.col) && !data.token) data.token = newToken();
  res.status(201).json(await db.insert(req.params.col, data));
}));

app.put('/api/:col/:id', colecaoOk, wrap(async (req, res) => {
  const { token, ...data } = req.body || {}; // o link pessoal não muda pela tela
  const r = await db.update(req.params.col, req.params.id, data);
  r ? res.json(r) : res.status(404).json({ error: 'Não encontrado.' });
}));

app.delete('/api/:col/:id', colecaoOk, wrap(async (req, res) => {
  const { col, id } = req.params;
  if (!(await db.remove(col, id))) return res.status(404).json({ error: 'Não encontrado.' });
  // limpa referências soltas
  const limpa = async (colecao, fn) => { for (const r of await db.list(colecao)) { const p = fn(r); if (p) await db.update(colecao, r.id, p); } };
  if (col === 'pautas') {
    await limpa('creators', (c) => {
      const p = {};
      if (c.pautaId === id) p.pautaId = '';
      if ((c.pautasOpcoes || []).includes(id)) p.pautasOpcoes = c.pautasOpcoes.filter((x) => x !== id);
      return Object.keys(p).length ? p : null;
    });
    await limpa('pessoas', (c) => (c.pautaId === id ? { pautaId: '' } : null));
  }
  if (col === 'creators') await limpa('pautas', (p) => (p.creatorId === id ? { creatorId: '' } : null));
  if (col === 'pessoas') await limpa('pautas', (p) => (p.pessoaId === id ? { pessoaId: '' } : null));
  if (col === 'team') {
    await limpa('creators', (c) => {
      const p = {};
      if (c.roteiristaId === id) p.roteiristaId = '';
      if (c.editorId === id) p.editorId = '';
      return Object.keys(p).length ? p : null;
    });
    await limpa('producao', (t) => ((t.responsaveis || []).includes(id) ? { responsaveis: t.responsaveis.filter((x) => x !== id) } : null));
    await limpa('usuarios', (u) => (u.teamId === id ? { teamId: '', desativado: true } : null));
    await db.remove('fotos', `foto-${id}`);
  }
  res.json({ ok: true });
}));

/* exportação CSV (abre no Excel / Google Sheets) */
app.get('/export/:col.csv', mesmoSite, logado, soAdmin, colecaoOk, wrap(async (req, res) => {
  const rows = (await db.list(req.params.col)).map(({ token, ...r }) => r);
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    let s = Array.isArray(v) ? v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : x)).join('; ') : v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // impede fórmula maliciosa ao abrir no Excel
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${req.params.col}.csv"`);
  res.send('﻿' + csv);
}));

/* =========================================================
   PÚBLICO: CADASTRO E PAINEL PESSOAL
   ========================================================= */
app.use('/public', mesmoSite);
app.get('/public/nichos', wrap(async (_req, res) => res.json((await db.list('nichos')).map((n) => n.nome))));
const config = async () => (await db.list('config'))[0] || {};
app.get('/public/config', wrap(async (_req, res) => {
  const c = await config();
  res.json({
    turnstile: seg.turnstileAtivo() ? process.env.TURNSTILE_SITE_KEY : '',
    grupoWhatsapp: urlOk(c.grupoWhatsapp) ? c.grupoWhatsapp : '',
    materialPautas: urlOk(c.materialPautas) ? c.materialPautas : '',
  });
}));
// equipe que aparece na página inicial (só nome e função)
app.get('/public/equipe', wrap(async (_req, res) => {
  res.json((await db.list('team')).filter((t) => t.mostrarNoSite !== false).map((t) => ({
    id: t.id, nome: t.nome, funcoes: t.funcoes || (t.funcao ? [t.funcao] : []),
    bio: txt(t.bio, 1500), link: linkRede(t.link), idealizadora: !!t.idealizadora, foto: t.fotoV ? `/foto/${t.id}.jpg?v=${t.fotoV}` : '',
  })));
}));
// pautas que dá para escolher já no cadastro
app.get('/public/pautas', wrap(async (req, res) => {
  const criador = req.query.tipo === 'criador';
  const ativa = (p) => !['Sugerida', 'Descartada'].includes(p.status);
  const lista = (await db.list('pautas')).filter((p) => (criador
    ? PARA_CRIADOR.includes(p.paraQuem) && ((p.status || 'Livre') === 'Livre' || (p.paraQuem === 'Todos' && ativa(p)))
    : PARA_PESSOA.includes(p.paraQuem) && ativa(p)));
  res.json(lista.map((p) => ({ id: p.id, titulo: p.titulo, descricao: p.descricao || '' })));
}));

const limpaHandle = (h) => String(h || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#\s]/)[0].toLowerCase();

app.post('/public/inscricao', wrap(async (req, res) => {
  const ip = seg.ipOf(req);
  if (!seg.limits.inscricao.hit(ip)) return seg.demais(res, 'Muitos envios seguidos deste aparelho. Tente de novo daqui a pouco.');
  if (seg.limits.inscricaoTotal.count('site') >= seg.limits.inscricaoTotal.max) {
    return res.status(503).json({ error: 'Muitas inscrições chegando agora. Tente de novo em alguns minutos.' });
  }
  const b = req.body || {};
  // armadilhas para robô: campo invisível preenchido ou formulário enviado rápido demais.
  // Respondemos "ok" para o robô não perceber que foi barrado.
  if (b.site || Number(b.t) < 2500) return res.json({ ok: true });
  if (!(await seg.turnstileOk(b.turnstile, ip))) return res.status(400).json({ error: 'Não conseguimos confirmar que você não é um robô. Recarregue a página e tente de novo.' });

  const tipo = b.tipo === 'pessoa' ? 'pessoa' : 'criador';
  const nome = txt(b.nome, 120);
  const whats = txt(b.whats, 40);
  const email = txt(b.email, 160);
  const handle = limpaHandle(b.handle);
  if (!nome) return res.status(400).json({ error: 'Preencha seu nome.' });
  if (tipo === 'criador' && !handle) return res.status(400).json({ error: 'Preencha seu @ do Instagram.' });
  if (!whats && !email) return res.status(400).json({ error: 'Deixe um WhatsApp ou um e-mail para a gente falar com você.' });
  if (!b.consentimento) return res.status(400).json({ error: 'Marque a autorização de contato para enviar.' });
  seg.limits.inscricaoTotal.hit('site');

  // pautas escolhidas já no cadastro (pode ser mais de uma)
  const pautasPublicas = (await db.list('pautas')).filter((p) => (tipo === 'criador' ? PARA_CRIADOR : PARA_PESSOA).includes(p.paraQuem) && !['Sugerida', 'Descartada'].includes(p.status));
  const pautaIds = (Array.isArray(b.pautaIds) ? b.pautaIds : []).filter((id) => pautasPublicas.some((p) => p.id === id)).slice(0, 10);
  const escolha = pautaIds.length ? { pautaIds, pautaId: pautaIds[0], escolhidaEm: agora() } : { pautaIds: [] };
  const base = { contatoWhats: whats, contatoEmail: email, cidade: txt(b.cidade, 120), inscritoEm: agora(), mostrarNaComunidade: !!b.mostrar };
  const pautaTitulo = txt(b.pautaTitulo, 140);
  const ideia = (extra) => pautaTitulo && db.insert('pautas', {
    titulo: pautaTitulo, descricao: txt(b.pautaDescricao, 1500), tema: '', linhaSugerida: '', roteiro: '', prazo: '',
    status: 'Sugerida', paraQuem: '', origem: 'inscricao', sugeridaPor: nome, ...extra,
  });

  if (tipo === 'pessoa') {
    const comQuem = (Array.isArray(b.comQuem) ? b.comQuem : []).filter((x) => seed.COM_QUEM.includes(x));
    const p = await db.insert('pessoas', {
      nome, ...base, comQuem, sobre: txt(b.sobre, 1500), status: pautaIds.length ? 'Escolheu pauta' : 'Inscrita', pautaId: '', comentario: '', ...escolha,
      publicacoes: [], observacoes: '', responsavel: '', token: newToken(),
    });
    await ideia({ pessoaId: p.id, nicho: '' });
    return res.json({ ok: true, token: p.token });
  }

  const validos = new Set((await db.list('nichos')).map((n) => n.nome));
  const nichos = (Array.isArray(b.nichos) ? b.nichos : []).filter((n) => validos.has(n)).slice(0, 5);
  const dados = {
    ...base, outrasRedes: txt(b.outrasRedes, 300), seguidores: txt(b.seguidores, 40),
    nichoOutro: txt(b.nichoOutro, 80), mensagemInscricao: txt(b.sobre, 1500),
  };
  let criador = (await db.list('creators')).find((c) => (c.handle || '').toLowerCase() === handle);
  if (criador) {
    // Já estava na lista. Só preenche o que estiver vazio (ninguém troca o contato de outra pessoa)
    // e NÃO devolve o link do painel: a equipe confere e manda pelo contato cadastrado.
    const patch = { inscreveuSe: true, inscritoEm: dados.inscritoEm };
    for (const [k, v] of Object.entries(dados)) if (v && !criador[k]) patch[k] = v;
    if (!(criador.nichos || []).length && nichos.length) patch.nichos = nichos;
    if (pautaIds.length && !(criador.pautaIds || []).length && !criador.pautaId) Object.assign(patch, escolha);
    await db.update('creators', criador.id, patch);
    await ideia({ creatorId: criador.id, nicho: nichos[0] || '' });
    return res.json({ ok: true, existente: true });
  }
  criador = await db.insert('creators', {
    nome, handle, url: `https://www.instagram.com/${handle}/`, nichos, nichoConfirmado: false,
    resumo: dados.mensagemInscricao, sugestaoLinha: '', observacoes: '', responsavel: '', status: 'Mapeado',
    modoPauta: 'atribuida', pautaId: '', pautasOpcoes: [], roteiristaId: '', editorId: '', publicacoes: [],
    origem: 'inscricao', inscreveuSe: true, token: newToken(), ...dados, ...escolha,
  });
  for (const p of pautasPublicas.filter((x) => pautaIds.includes(x.id) && x.paraQuem !== 'Todos' && !x.creatorId)) {
    await db.update('pautas', p.id, { creatorId: criador.id, status: (p.status || 'Livre') === 'Livre' ? 'Reservada' : p.status });
  }
  await ideia({ creatorId: criador.id, nicho: nichos[0] || '' });
  res.json({ ok: true, token: criador.token });
}));

/* ---- painel pessoal (/p/:token) ---- */
async function porToken(token) {
  if (!token || token.length < 10) return null;
  for (const col of ['creators', 'pessoas']) {
    const r = (await db.list(col)).find((x) => x.token === token);
    if (r) return { col, tipo: col === 'creators' ? 'criador' : 'pessoa', r };
  }
  return null;
}

async function pautasVisiveis({ tipo, r }) {
  const pautas = await db.list('pautas');
  let lista;
  if (tipo === 'criador') {
    const ops = r.pautasOpcoes || [];
    lista = ops.length
      ? pautas.filter((p) => ops.includes(p.id))
      : pautas.filter((p) => PARA_CRIADOR.includes(p.paraQuem) && (p.status === 'Livre' || (p.paraQuem === 'Todos' && !['Sugerida', 'Descartada'].includes(p.status))));
  } else {
    lista = pautas.filter((p) => PARA_PESSOA.includes(p.paraQuem) && !['Sugerida', 'Descartada'].includes(p.status));
  }
  const minhas = [...new Set([...(r.pautaIds || []), r.pautaId].filter(Boolean))];
  for (const id of minhas) {
    if (lista.some((p) => p.id === id)) continue;
    const atual = pautas.find((p) => p.id === id);
    if (atual) lista.unshift(atual);
  }
  return lista;
}
const pautaPublica = (p) => ({ id: p.id, titulo: p.titulo, tema: p.tema || '', descricao: p.descricao || '', linhaSugerida: p.linhaSugerida || '', roteiro: p.roteiro || '', prazo: p.prazo || '' });

app.get('/public/painel/:token', wrap(async (req, res) => {
  const q = await porToken(req.params.token);
  if (!q) return res.status(404).json({ error: 'Link inválido.' });
  const { tipo, r } = q;
  const materiais = (await db.list('materiais'))
    .filter((m) => m.paraQuem === 'Todos' || (tipo === 'criador' ? m.paraQuem === 'Criadores' : m.paraQuem === 'Pessoas comuns'))
    .filter((m) => urlOk(m.link))
    .map((m) => ({ titulo: m.titulo, tipo: m.tipo || '', descricao: m.descricao || '', link: m.link }));
  const ideias = (await db.list('pautas'))
    .filter((p) => (tipo === 'criador' ? p.creatorId === r.id : p.pessoaId === r.id) && ['inscricao', 'painel'].includes(p.origem))
    .map((p) => ({ titulo: p.titulo, status: p.status === 'Sugerida' ? 'em análise' : p.status === 'Descartada' ? 'não seguiu' : 'aprovada' }));
  const c = await config();
  res.json({
    grupoWhatsapp: urlOk(c.grupoWhatsapp) ? c.grupoWhatsapp : '', materialPautas: urlOk(c.materialPautas) ? c.materialPautas : '',
    tipo, nome: r.nome, mostrar: !!r.mostrarNaComunidade, sugestaoLinha: tipo === 'criador' ? r.sugestaoLinha || '' : '',
    pautas: (await pautasVisiveis(q)).map(pautaPublica),
    escolhidas: (r.pautaIds && r.pautaIds.length ? r.pautaIds : r.pautaId ? [r.pautaId] : []), comentario: (tipo === 'criador' ? r.comentarioCriador : r.comentario) || '', escolhidaEm: r.escolhidaEm || '',
    publicacoes: (r.publicacoes || []).map(({ em, link, comentario }) => ({ em, link, comentario })),
    materiais, ideias,
  });
}));

const painelLimite = (req, res, next) => (seg.limits.painel.hit(seg.ipOf(req)) ? next() : seg.demais(res));

app.post('/public/painel/:token/escolha', painelLimite, wrap(async (req, res) => {
  const q = await porToken(req.params.token);
  if (!q) return res.status(404).json({ error: 'Link inválido.' });
  const b = req.body || {};
  const pedidas = Array.isArray(b.pautaIds) ? b.pautaIds : b.pautaId ? [b.pautaId] : [];
  const visiveis = await pautasVisiveis(q);
  const escolhidas = visiveis.filter((p) => pedidas.includes(p.id)).slice(0, 10);
  if (!escolhidas.length) return res.status(400).json({ error: 'Marque pelo menos uma pauta da lista.' });
  const { col, tipo, r } = q;
  const patch = { pautaIds: escolhidas.map((p) => p.id), pautaId: escolhidas[0].id, escolhidaEm: agora() };
  if (tipo === 'criador') {
    patch.comentarioCriador = txt(b.comentario, 2000);
    if (!r.status || ['Mapeado', 'Contatado'].includes(r.status)) patch.status = 'Topou';
    // pauta de criador fica reservada para quem escolheu (as abertas para "Todos" não)
    for (const p of escolhidas) if (p.paraQuem !== 'Todos' && p.creatorId !== r.id) await db.update('pautas', p.id, { creatorId: r.id, status: !p.status || p.status === 'Livre' ? 'Reservada' : p.status });
  } else {
    patch.comentario = txt(b.comentario, 2000);
    if (!r.status || r.status === 'Inscrita') patch.status = 'Escolheu pauta';
  }
  await db.update(col, r.id, patch);
  res.json({ ok: true });
}));

app.post('/public/painel/:token/postei', painelLimite, wrap(async (req, res) => {
  const q = await porToken(req.params.token);
  if (!q) return res.status(404).json({ error: 'Link inválido.' });
  const link = txt(req.body?.link, 500);
  if (link && !urlOk(link)) return res.status(400).json({ error: 'O link precisa começar com http:// ou https://' });
  const { col, tipo, r } = q;
  const pubs = (r.publicacoes || []).slice(-19);
  pubs.push({ em: agora(), link, comentario: txt(req.body?.comentario, 1000), pautaId: r.pautaId || '' });
  await db.update(col, r.id, { publicacoes: pubs, status: tipo === 'criador' ? 'Publicado' : 'Postou' });
  if (link) await db.insert('videos', { nome: r.nome, contato: r.contatoWhats || r.contatoEmail || (r.handle ? '@' + r.handle : ''), link, comentario: txt(req.body?.comentario, 1000), pautaIds: r.pautaIds || (r.pautaId ? [r.pautaId] : []), origem: 'painel', tipo, [tipo === 'criador' ? 'creatorId' : 'pessoaId']: r.id, em: agora(), conferido: false, mostrarNome: !!r.mostrarNaComunidade });
  res.json({ ok: true });
}));

app.post('/public/painel/:token/ideia', painelLimite, wrap(async (req, res) => {
  const q = await porToken(req.params.token);
  if (!q) return res.status(404).json({ error: 'Link inválido.' });
  const titulo = txt(req.body?.titulo, 140);
  if (!titulo) return res.status(400).json({ error: 'Dê um título para a sua ideia.' });
  const { tipo, r } = q;
  const ja = (await db.list('pautas')).filter((p) => (tipo === 'criador' ? p.creatorId === r.id : p.pessoaId === r.id) && p.origem === 'painel');
  if (ja.length >= 10) return res.status(400).json({ error: 'Você já mandou 10 ideias. Espere a equipe responder.' });
  await db.insert('pautas', {
    titulo, descricao: txt(req.body?.descricao, 1500), tema: '', nicho: tipo === 'criador' ? (r.nichos || [])[0] || '' : '',
    linhaSugerida: '', roteiro: '', prazo: '', status: 'Sugerida', paraQuem: '', origem: 'painel', sugeridaPor: r.nome,
    ...(tipo === 'criador' ? { creatorId: r.id } : { pessoaId: r.id }),
  });
  res.json({ ok: true });
}));

/* ---- comunidade: quem participa e os vídeos conferidos ---- */
// Só aparece quem autorizou. Vídeo só entra no mural depois que a equipe marca como conferido.
async function comunidade() {
  const [criadores, pessoas, videos, pautas, equipe] = await Promise.all(['creators', 'pessoas', 'videos', 'pautas', 'team'].map((c) => db.list(c)));
  const cfg = await config();
  const conferidos = videos.filter((v) => v.conferido && urlOk(v.link));
  const qtd = (campo, id) => conferidos.filter((v) => v[campo] === id).length;
  const participantes = [
    ...equipe.filter((t) => t.mostrarNoSite !== false).map((t) => ({ nome: t.nome, tipo: 'equipe', handle: '', cidade: (t.funcoes || [])[0] || '', videos: 0, desde: '0' })),
    ...criadores.filter((c) => c.mostrarNaComunidade).map((c) => ({ nome: c.nome, tipo: 'criador', handle: c.handle || '', cidade: c.cidade || '', videos: qtd('creatorId', c.id), desde: c.inscritoEm || c.createdAt })),
    ...pessoas.filter((p) => p.mostrarNaComunidade).map((p) => ({ nome: p.nome, tipo: 'pessoa', handle: '', cidade: p.cidade || '', videos: qtd('pessoaId', p.id), desde: p.inscritoEm || p.createdAt })),
  ].sort((a, b) => (a.tipo === 'equipe') - (b.tipo === 'equipe') || String(b.desde).localeCompare(String(a.desde)));
  const titulo = (id) => pautas.find((p) => p.id === id)?.titulo;
  const mural = conferidos.sort((a, b) => String(b.em).localeCompare(String(a.em))).slice(0, 200).map((v) => ({
    nome: v.mostrarNome ? v.nome : 'Participante', link: v.link, em: v.em, pautas: (v.pautaIds || []).map(titulo).filter(Boolean),
  }));
  // conta: equipe (participa mesmo sem gravar) + quem se cadastrou + quem participa fora do site (número posto em Ajustes)
  const extra = Math.max(0, parseInt(cfg.participantesExtra, 10) || 0);
  const total = equipe.length + criadores.filter((c) => c.inscreveuSe || ANDAMENTO_CRIADOR.includes(c.status)).length + pessoas.length + extra;
  return { participantes, mural, totais: { participantes: total, videos: conferidos.length } };
}
const ANDAMENTO_CRIADOR = ['Topou', 'Em roteiro', 'Em edição', 'Publicado'];

app.get('/public/painel/:token/comunidade', wrap(async (req, res) => {
  if (!(await porToken(req.params.token))) return res.status(404).json({ error: 'Link inválido.' });
  res.json(await comunidade());
}));
app.post('/public/painel/:token/preferencias', painelLimite, wrap(async (req, res) => {
  const q = await porToken(req.params.token);
  if (!q) return res.status(404).json({ error: 'Link inválido.' });
  await db.update(q.col, q.r.id, { mostrarNaComunidade: !!req.body?.mostrar });
  res.json({ ok: true });
}));
// números para a página inicial (só contagem, sem nomes)
app.get('/public/numeros', wrap(async (_req, res) => res.json((await comunidade()).totais)));

/* ---- formulário aberto para mandar o link do vídeo ---- */
app.post('/public/video', painelLimite, wrap(async (req, res) => {
  const b = req.body || {};
  if (b.site || Number(b.t) < 2500) return res.json({ ok: true }); // robô
  if (!(await seg.turnstileOk(b.turnstile, seg.ipOf(req)))) return res.status(400).json({ error: 'Não conseguimos confirmar que você não é um robô. Recarregue a página e tente de novo.' });
  const nome = txt(b.nome, 120);
  const link = txt(b.link, 500);
  if (!nome) return res.status(400).json({ error: 'Preencha seu nome.' });
  if (!urlOk(link)) return res.status(400).json({ error: 'Cole o link do vídeo (começando com http:// ou https://).' });
  const publicas = (await db.list('pautas')).filter((p) => [...PARA_PESSOA, ...PARA_CRIADOR].includes(p.paraQuem));
  const pautaIds = (Array.isArray(b.pautaIds) ? b.pautaIds : []).filter((id) => publicas.some((p) => p.id === id)).slice(0, 10);
  await db.insert('videos', { nome, contato: txt(b.contato, 160), link, comentario: txt(b.comentario, 1000), pautaIds, origem: 'formulario', tipo: '', em: agora(), conferido: false, mostrarNome: !!b.mostrar });
  res.json({ ok: true });
}));

/* =========================================================
   ARQUIVOS E INÍCIO
   ========================================================= */
app.use(express.static(PUB, { index: 'index.html' }));
app.use((_req, res) => res.status(404).sendFile(path.join(PUB, 'index.html')));

(async () => {
  await db.init();
  const meta = (await db.list('meta'))[0] || (await db.insert('meta', {}));

  // chave das sessões: fica guardada no banco para o login não cair a cada deploy
  let segredo = process.env.SESSION_SECRET || meta.sessionSecret;
  if (!segredo) { segredo = crypto.randomBytes(32).toString('hex'); await db.update('meta', meta.id, { sessionSecret: segredo }); }
  auth.setSecret(segredo);

  // Dados iniciais: entra só o que ainda não foi semeado (o que vocês apagarem não volta).
  const semeia = async (colecao, itens, chave, marca, montar = (x) => x) => {
    const existentes = new Set((await db.list(colecao)).map((x) => String(x[chave] || '').toLowerCase()));
    const feitos = new Set(meta[marca] || []);
    for (const it of itens) {
      if (feitos.has(it[chave])) continue;
      if (!existentes.has(String(it[chave]).toLowerCase())) await db.insert(colecao, montar(it));
      feitos.add(it[chave]);
    }
    await db.update('meta', meta.id, { [marca]: [...feitos] });
  };
  await semeia('nichos', seed.nichos, 'nome', 'seededNichos');

  // correções na equipe, antes de semear (para não duplicar quem mudou de nome)
  const feitasEq = new Set(meta.correcoesEquipe || []);
  for (const fix of seed.correcoesEquipe || []) {
    if (feitasEq.has(fix.id)) continue;
    const t = (await db.list('team')).find((x) => x.nome === fix.nome);
    if (t) {
      await db.update('team', t.id, fix.set);
      if (fix.set.nome) for (const u of await db.list('usuarios')) if (u.teamId === t.id) await db.update('usuarios', u.id, { nome: fix.set.nome });
    }
    feitasEq.add(fix.id);
  }
  await db.update('meta', meta.id, { correcoesEquipe: [...feitasEq] });
  await semeia('team', seed.equipe, 'nome', 'seededEquipe', (t) => ({ contato: '', obs: '', ...t }));
  await semeia('creators', seed.criadores, 'handle', 'seeded', (c) => ({ publicacoes: [], ...c }));

  // correções pontuais, uma vez só
  const feitas = new Set(meta.correcoes || []);
  const todos = await db.list('creators');
  for (const fix of seed.correcoes || []) {
    if (feitas.has(fix.id)) continue;
    const c = todos.find((x) => x.handle === fix.handle);
    if (c) await db.update('creators', c.id, fix.set);
    feitas.add(fix.id);
  }
  await db.update('meta', meta.id, { correcoes: [...feitas] });

  // todo criador e toda pessoa têm um link pessoal
  for (const col of ['creators', 'pessoas']) for (const c of await db.list(col)) if (!c.token) await db.update(col, c.id, { token: newToken() });

  // primeiros acessos: as três administradoras
  if ((await db.list('usuarios')).length === 0) {
    const senha = process.env.APP_PASSWORD || auth.senhaProvisoria();
    const equipe = await db.list('team');
    for (const a of seed.admins) {
      const t = equipe.find((x) => x.nome.toLowerCase() === a.nomeEquipe.toLowerCase());
      await db.insert('usuarios', { nome: a.nome, login: a.login, papel: 'admin', teamId: t?.id || '', senhaHash: auth.hashSenha(senha), trocarSenha: true, sessaoVersao: 0 });
    }
    console.log(`Acessos criados: ${seed.admins.map((a) => a.login).join(', ')}. Senha inicial: ${process.env.APP_PASSWORD ? 'a mesma do APP_PASSWORD' : senha}. Cada uma troca no primeiro login.`);
  }

  // acessos de equipe pré-cadastrados (uma vez por login; quem for apagado não volta)
  {
    const meta2 = (await db.list('meta'))[0];
    const feitos = new Set(meta2?.acessosCriados || []);
    const usuarios = await db.list('usuarios');
    const equipe = await db.list('team');
    const senha = process.env.APP_PASSWORD;
    const novos = [];
    if (senha) for (const a of seed.acessosEquipe || []) {
      if (feitos.has(a.login)) continue;
      feitos.add(a.login);
      const t = equipe.find((x) => x.nome.toLowerCase() === a.nomeEquipe.toLowerCase());
      const ja = usuarios.find((u) => u.login === a.login || (t && u.teamId === t.id));
      if (ja) {
        // já tinha acesso criado no painel e a pessoa nunca entrou: passa a valer a senha inicial comum
        if (ja.trocarSenha && !ja.desativado) {
          await db.update('usuarios', ja.id, { senhaHash: auth.hashSenha(senha), sessaoVersao: (ja.sessaoVersao || 0) + 1 });
          novos.push(`${ja.login} (senha inicial redefinida)`);
        }
        continue;
      }
      await db.insert('usuarios', { nome: t?.nome || a.nomeEquipe, login: a.login, papel: 'equipe', teamId: t?.id || '', senhaHash: auth.hashSenha(senha), trocarSenha: true, sessaoVersao: 0 });
      novos.push(a.login);
    }
    // qualquer acesso que ainda não criou a própria senha passa a usar a senha comum (uma vez por acesso)
    const comuns = new Set(meta2?.senhaComumFeita || []);
    if (senha) for (const u of await db.list('usuarios')) {
      if (comuns.has(u.id)) continue;
      comuns.add(u.id);
      if (!u.trocarSenha || u.desativado || novos.some((n) => n.startsWith(u.login))) continue;
      if (auth.confereSenha(senha, u.senhaHash)) continue;
      await db.update('usuarios', u.id, { senhaHash: auth.hashSenha(senha), sessaoVersao: (u.sessaoVersao || 0) + 1 });
      novos.push(`${u.login} (senha inicial redefinida)`);
    }
    if (meta2) await db.update('meta', meta2.id, { acessosCriados: [...feitos], senhaComumFeita: [...comuns] });
    if (novos.length) console.log(`Acessos de equipe criados: ${novos.join(', ')}. Senha inicial: a mesma do APP_PASSWORD.`);
  }

  app.listen(PORT, () => console.log(`Rodando na porta ${PORT} · armazenamento: ${db.kind}`));
})();
