const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { Readable } = require('stream');
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
const COLECOES = ['creators', 'pessoas', 'pautas', 'team', 'nichos', 'materiais', 'producao', 'videos', 'config', 'juridico', 'depoimentos'];

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
// como as funções aparecem no site público (no controle continuam com o nome interno)
const ROTULO_PUBLICO = { 'Edição dos vídeos': 'Audiovisual' };
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
app.get('/guia', (_req, res) => res.sendFile(path.join(PUB, 'guia.html')));
app.get('/juridico', (_req, res) => res.sendFile(path.join(PUB, 'juridico.html')));
app.get('/jogos', (_req, res) => res.sendFile(path.join(PUB, 'jogos.html')));
app.get('/videos', (_req, res) => res.sendFile(path.join(PUB, 'videos.html')));
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
    materialPautas: urlOk(c.materialPautas) ? c.materialPautas : '',
    apoiadores: apoiadoresDe(c),
    advogadas: advogadasDe(c),
  });
}));
// apoiadores: em Ajustes, um por linha, "Nome | link | logo (opcional)"
const apoiadoresDe = (c) => String(c.apoiadores || '').split('\n').map((l) => {
  const [nome, link, logo] = l.split('|').map((x) => (x || '').trim());
  const logoOk = /^\/apoio\/[\w.-]+\.(png|jpe?g|svg|webp)$/i.test(logo || '') || urlOk(logo) ? logo : '';
  return nome ? { nome: txt(nome, 120), link: linkRede(link), logo: logoOk } : null;
}).filter(Boolean).slice(0, 60);
// rede jurídica: em Ajustes, uma por linha, "Nome | OAB | link"
const advogadasDe = (c) => String(c.advogadas || '').split('\n').map((l) => {
  const [nome, oab, link] = l.split('|').map((x) => (x || '').trim());
  return nome ? { nome: txt(nome, 120), oab: txt(oab, 40), link: linkRede(link) } : null;
}).filter(Boolean).slice(0, 30);
// grupo do WhatsApp: pessoa comum recebe o da sociedade civil; criador recebe o dos criadores,
// que é fechado (a equipe aprova cada entrada no próprio WhatsApp)
const grupoPara = (c, tipo) => {
  const u = tipo === 'pessoa' ? c.grupoWhatsapp : c.grupoWhatsappCriadores;
  return urlOk(u) ? u : '';
};
// equipe que aparece na página inicial (só nome e função)
app.get('/public/equipe', wrap(async (_req, res) => {
  res.json((await db.list('team')).filter((t) => t.mostrarNoSite !== false).map((t) => ({
    id: t.id, nome: t.nome, funcoes: (t.funcoes || (t.funcao ? [t.funcao] : [])).map((f) => ROTULO_PUBLICO[f] || f),
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
  // conta só cadastro concluído: quem errou um campo e tentou de novo não gasta a vez
  if (seg.limits.inscricao.count(ip) >= seg.limits.inscricao.max) return seg.demais(res, 'Muitos cadastros seguidos desta mesma conexão. Espere alguns minutos e tente de novo.');
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
  seg.limits.inscricao.hit(ip);

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
    return res.json({ ok: true, token: p.token, grupo: grupoPara(await config(), 'pessoa') });
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
    return res.json({ ok: true, existente: true, grupo: grupoPara(await config(), 'criador') });
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
  res.json({ ok: true, token: criador.token, grupo: grupoPara(await config(), 'criador') });
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
    grupoWhatsapp: grupoPara(c, tipo), materialPautas: urlOk(c.materialPautas) ? c.materialPautas : '',
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
  const [criadores, pessoas, videos, pautas, equipe, depoimentos] = await Promise.all(['creators', 'pessoas', 'videos', 'pautas', 'team', 'depoimentos'].map((c) => db.list(c)));
  const cfg = await config();
  const conferidos = videos.filter((v) => v.conferido && urlOk(v.link));
  const campanhaNoAr = depoimentos.filter((d) => d.publicar && urlOk(d.linkPublicado || d.link)).length;
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
  return { participantes, mural, totais: { participantes: total, videos: conferidos.length + campanhaNoAr } };
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

/* ---- vídeo do Drive entregue pelo nosso endereço ----
   No celular, o player e o download do Drive pedem login e aceite de cookies. Aqui o servidor busca o arquivo
   aberto ("qualquer pessoa com o link") e repassa: toca no player do próprio navegador e baixa direto. */
app.get('/video/drive/:id.mp4', async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^[\w-]{10,80}$/.test(id)) return res.status(404).end();
  const ctrl = new AbortController();
  res.on('close', () => ctrl.abort());
  try {
    const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; seuvotodecide)' };
    if (req.headers.range) headers.Range = req.headers.range;
    const r = await fetch(`https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`, { headers, redirect: 'follow', signal: ctrl.signal });
    const tipo = r.headers.get('content-type') || '';
    if (!r.ok || tipo.startsWith('text/html')) {
      r.body?.cancel?.();
      return res.status(404).type('html').send('<meta charset="utf-8"><p style="font:18px sans-serif;padding:24px">Esse vídeo ainda não está aberto. No Drive, em Compartilhar, marque "Qualquer pessoa com o link". <a href="/videos">Voltar</a></p>');
    }
    res.status(r.status);
    res.set('Content-Type', /^video\//.test(tipo) ? tipo : 'video/mp4');
    for (const h of ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag']) { const v = r.headers.get(h); if (v) res.set(h, v); }
    if (!r.headers.get('accept-ranges')) res.set('Accept-Ranges', 'bytes');
    res.set('Cache-Control', 'public, max-age=86400');
    if (req.query.baixar) {
      const nome = String(req.query.nome || 'seu-voto-decide').normalize('NFD').replace(/[^\w-]+/g, '-').replace(/-+/g, '-').slice(0, 60) || 'seu-voto-decide';
      res.set('Content-Disposition', `attachment; filename="${nome}.mp4"`);
    }
    Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res);
  } catch (e) {
    if (!res.headersSent) res.status(502).end(); else res.destroy();
  }
});

/* ---- capa de arquivo do Drive ----
   O navegador às vezes não consegue a miniatura direto do Google (bloqueio de cookie de terceiros),
   então o servidor busca a imagem e entrega como se fosse nossa. Guarda na memória por algumas horas. */
const capasDrive = new Map();
app.get('/capa/drive/:id.jpg', wrap(async (req, res) => {
  const id = String(req.params.id || '');
  if (!/^[\w-]{10,80}$/.test(id)) return res.status(404).end();
  const guardada = capasDrive.get(id);
  if (guardada && Date.now() - guardada.em < 6 * 3600e3) { res.set({ 'Content-Type': guardada.tipo, 'Cache-Control': 'public, max-age=21600' }); return res.send(guardada.buf); }
  for (const u of [`https://drive.google.com/thumbnail?id=${id}&sz=w800`, `https://lh3.googleusercontent.com/d/${id}=w800`]) {
    try {
      const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (compatible; seuvotodecide)' } });
      const tipo = r.headers.get('content-type') || '';
      if (!r.ok || !tipo.startsWith('image/')) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 500) continue;
      if (capasDrive.size > 300) capasDrive.delete(capasDrive.keys().next().value);
      capasDrive.set(id, { buf, tipo, em: Date.now() });
      res.set({ 'Content-Type': tipo, 'Cache-Control': 'public, max-age=21600' });
      return res.send(buf);
    } catch { /* tenta o próximo endereço */ }
  }
  // ainda sem miniatura (arquivo não está aberto pra qualquer pessoa, ou o Drive ainda está processando o vídeo)
  res.set('Cache-Control', 'no-store').status(404).end();
}));

/* ---- galeria pública de vídeos (só o que a equipe conferiu) ---- */
// Descobre de onde é o link e monta o player, a miniatura e o download quando a plataforma deixa.
function midia(link) {
  const u = String(link || '').trim();
  let m;
  if ((m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([\w-]{6,15})/i.exec(u))) {
    return { plataforma: 'YouTube', embed: `https://www.youtube-nocookie.com/embed/${m[1]}`, thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`, vertical: /shorts\//i.test(u), arquivo: '', download: '' };
  }
  if ((m = /drive\.google\.com\/(?:file\/d\/|open\?(?:.*&)?id=|uc\?(?:.*&)?id=)([\w-]{10,})/i.exec(u))) {
    return { plataforma: 'Drive', embed: `https://drive.google.com/file/d/${m[1]}/preview`, thumb: `/capa/drive/${m[1]}.jpg`, vertical: true, arquivo: `/video/drive/${m[1]}.mp4`, download: `/video/drive/${m[1]}.mp4?baixar=1` };
  }
  if ((m = /instagram\.com\/(?:[\w.]+\/)?(p|reel|reels|tv)\/([\w-]{5,})/i.exec(u))) {
    const tipo = m[1].toLowerCase() === 'reels' ? 'reel' : m[1].toLowerCase();
    return { plataforma: 'Instagram', embed: `https://www.instagram.com/${tipo}/${m[2]}/embed`, thumb: '', vertical: true, arquivo: '', download: '' };
  }
  if ((m = /tiktok\.com\/.*\/video\/(\d{8,})/i.exec(u))) {
    return { plataforma: 'TikTok', embed: `https://www.tiktok.com/embed/v2/${m[1]}`, thumb: '', vertical: true, arquivo: '', download: '' };
  }
  let h = 'link';
  try { h = new URL(u).hostname.replace(/^www\./, ''); } catch { /* fica "link" */ }
  if (/tiktok/.test(h)) h = 'TikTok'; else if (/instagram/.test(h)) h = 'Instagram'; else if (/facebook|fb\.watch/.test(h)) h = 'Facebook'; else if (/kwai/.test(h)) h = 'Kwai'; else if (/^x\.com$|twitter/.test(h)) h = 'X';
  return { plataforma: h, embed: '', thumb: '', vertical: true, arquivo: '', download: '' };
}
const baixavel = (u) => { const d = midia(u); return d.download || (urlOk(u) ? u : ''); };
const arquivoDe = (u) => midia(u).arquivo || '';
// capa posta à mão: link de imagem ou de arquivo do Drive
const capaDe = (u) => { const d = midia(u); return d.plataforma === 'Drive' ? d.thumb : (urlOk(u) ? u : ''); };
// TikTok entrega a capa do vídeo pelo oEmbed público; guardamos no registro pra não buscar de novo
const buscandoCapa = new Set();
function capaTikTok(col, r, link) {
  if (r.capaAuto || buscandoCapa.has(r.id) || !/tiktok\.com/i.test(link)) return;
  buscandoCapa.add(r.id);
  fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(link), { signal: AbortSignal.timeout(5000) })
    .then((x) => (x.ok ? x.json() : null))
    .then((j) => { if (j && /^https:\/\//.test(j.thumbnail_url || '')) return db.update(col, r.id, { capaAuto: j.thumbnail_url, autorAuto: txt(j.author_name, 80) }); })
    .catch(() => {})
    .finally(() => buscandoCapa.delete(r.id));
}
app.get('/public/videos', wrap(async (_req, res) => {
  const [videos, pautas, depoimentos] = await Promise.all(['videos', 'pautas', 'depoimentos'].map((c) => db.list(c)));
  const pauta = (id) => pautas.find((p) => p.id === id);
  const lista = videos.filter((v) => v.conferido && urlOk(v.link)).map((v) => {
    const p = pauta((v.pautaIds || [])[0]);
    const d = midia(v.link);
    capaTikTok('videos', v, v.link);
    const equipe = !!v.equipe;
    return {
      id: v.id, titulo: txt(v.titulo, 140) || p?.titulo || (equipe ? 'Produção seu voto decide' : v.mostrarNome ? `Vídeo de ${v.nome}` : 'Vídeo da comunidade'),
      tema: txt(v.tema, 60) || p?.tema || p?.titulo || 'Outros temas',
      autor: equipe ? 'seu voto decide' : v.mostrarNome ? v.nome : '', link: v.link, ...d,
      thumb: (v.capa && capaDe(v.capa)) || d.thumb || v.capaAuto || '',
      arquivo: d.arquivo || (v.download ? arquivoDe(v.download) : ''),
      download: v.download ? baixavel(v.download) : d.download, em: v.em || v.createdAt, campanha: '', equipe,
    };
  });
  const campanha = depoimentos.filter((x) => x.publicar && urlOk(x.linkPublicado || x.link)).map((x) => {
    const link = x.linkPublicado || x.link;
    const d = midia(link);
    capaTikTok('depoimentos', x, link);
    return { id: x.id, titulo: txt(x.titulo, 140) || 'No meu tempo…', tema: 'No meu tempo', autor: '', link, ...d, thumb: (x.capa && capaDe(x.capa)) || d.thumb || x.capaAuto || '', arquivo: d.arquivo || (x.download ? arquivoDe(x.download) : ''), download: x.download ? baixavel(x.download) : d.download, em: x.em || x.createdAt, campanha: 'no-meu-tempo', equipe: false };
  });
  const todos = [...campanha, ...lista].sort((a, b) => String(b.em).localeCompare(String(a.em)));
  res.set('Cache-Control', 'public, max-age=60');
  res.json({ total: todos.length, videos: todos });
}));

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
  // campanha "No meu tempo": depoimento bruto (link do Drive) vai pra coleção própria, longe dos vídeos publicados e do mural
  if (b.campanha === 'no-meu-tempo') {
    await db.insert('depoimentos', { nome, contato: txt(b.contato, 160), link, comentario: txt(b.comentario, 1000), em: agora(), situacao: 'Novo', notas: '' });
    return res.json({ ok: true });
  }
  const arquivo = txt(b.arquivo, 500);
  await db.insert('videos', { nome, contato: txt(b.contato, 160), link, comentario: txt(b.comentario, 1000), pautaIds, download: urlOk(arquivo) ? arquivo : '', origem: 'formulario', tipo: '', em: agora(), conferido: false, mostrarNome: !!b.mostrar });
  res.json({ ok: true });
}));

/* ---- rede jurídica: pedido de orientação ou oferta de ajuda ---- */
app.post('/public/juridico', painelLimite, wrap(async (req, res) => {
  const b = req.body || {};
  if (b.site || Number(b.t) < 2500) return res.json({ ok: true }); // robô
  if (!(await seg.turnstileOk(b.turnstile, seg.ipOf(req)))) return res.status(400).json({ error: 'Não conseguimos confirmar que você não é um robô. Recarregue a página e tente de novo.' });
  const tipo = b.tipo === 'ajudar' ? 'ajudar' : 'orientacao';
  const nome = txt(b.nome, 120);
  const contato = txt(b.contato, 160);
  const mensagem = txt(b.mensagem, 3000);
  if (!nome) return res.status(400).json({ error: 'Preencha seu nome.' });
  if (!contato) return res.status(400).json({ error: 'Deixe um WhatsApp ou e-mail para a gente responder.' });
  if (!mensagem) return res.status(400).json({ error: tipo === 'ajudar' ? 'Conte um pouco de como você pode ajudar.' : 'Conte em poucas linhas o que está acontecendo.' });
  if (!b.consentimento) return res.status(400).json({ error: 'Marque a autorização de contato para enviar.' });
  await db.insert('juridico', {
    tipo, nome, contato, perfil: txt(b.perfil, 160), oab: tipo === 'ajudar' ? txt(b.oab, 60) : '',
    assunto: tipo === 'orientacao' ? txt(b.assunto, 80) : '', mensagem, em: agora(), situacao: 'Novo', responsavel: '', notas: '',
  });
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

  // links dos grupos de WhatsApp (uma vez; depois disso valem os que estiverem em Ajustes)
  {
    const m = (await db.list('meta'))[0];
    if (m && !m.gruposDefinidos) {
      const cfg = (await db.list('config'))[0] || (await db.insert('config', {}));
      await db.update('config', cfg.id, {
        grupoWhatsapp: 'https://chat.whatsapp.com/HrwbrJ3rB7e6d9LtYQiwni',
        grupoWhatsappCriadores: 'https://chat.whatsapp.com/EdAastgNhQi3h9kLWKF5mm',
      });
      await db.update('meta', m.id, { gruposDefinidos: true });
    }
    const m2 = (await db.list('meta'))[0];
    // depoimentos do "No meu tempo" que entraram como vídeo antes da separação
    for (const v of await db.list('videos')) {
      if (!v.campanha) continue;
      await db.insert('depoimentos', { nome: v.nome, contato: v.contato || '', link: v.link, comentario: v.comentario || '', em: v.em || v.createdAt, situacao: 'Novo', notas: v.notas || '' });
      await db.remove('videos', v.id);
    }
    // apoiadores: troca Iara Lee por Cultures of Resistance (uma vez só; depois edita em Ajustes)
    const m3 = (await db.list('meta'))[0];
    if (m3 && !m3.apoiadoresV2) {
      const cfg = (await db.list('config'))[0] || (await db.insert('config', {}));
      const novo = 'Cultures of Resistance Network Foundation | https://culturesofresistance.org/ | /apoio/cultures-of-resistance.png';
      const linhas = String(cfg.apoiadores || '').split('\n').filter((l) => l.trim() && !/iara\s*lee/i.test(l));
      await db.update('config', cfg.id, { apoiadores: [novo, ...linhas].join('\n') });
      await db.update('meta', m3.id, { apoiadoresV2: true, apoiadoresDefinidos: true });
    }
    // corrige o link de Cultures of Resistance (o @ do Instagram não existe): usa o site
    const m4 = (await db.list('meta'))[0];
    if (m4 && !m4.apoiadoresV3) {
      const cfg = (await db.list('config'))[0];
      if (cfg && /cultures\s*of\s*resist/i.test(cfg.apoiadores || '')) {
        const linhas = String(cfg.apoiadores).split('\n').map((l) => (/cultures\s*of\s*resist/i.test(l) ? 'Cultures of Resistance Network Foundation | https://culturesofresistance.org/' : l));
        await db.update('config', cfg.id, { apoiadores: linhas.join('\n') });
      }
      await db.update('meta', m4.id, { apoiadoresV3: true });
    }
    // logo de Cultures of Resistance
    const m5 = (await db.list('meta'))[0];
    if (m5 && !m5.apoiadoresV4) {
      const cfg = (await db.list('config'))[0];
      if (cfg && cfg.apoiadores) {
        const linhas = String(cfg.apoiadores).split('\n').map((l) => (/cultures\s*of\s*resist/i.test(l) && l.split('|').length < 3 ? l.trim() + ' | /apoio/cultures-of-resistance.png' : l));
        await db.update('config', cfg.id, { apoiadores: linhas.join('\n') });
      }
      await db.update('meta', m5.id, { apoiadoresV4: true });
    }
    if (m2 && !m2.apoiadoresDefinidos) {
      const cfg = (await db.list('config'))[0] || (await db.insert('config', {}));
      if (!cfg.apoiadores) await db.update('config', cfg.id, { apoiadores: 'Iara Lee | https://www.instagram.com/iaralee.explores.brazil/' });
      await db.update('meta', m2.id, { apoiadoresDefinidos: true });
    }
  }

  app.listen(PORT, () => console.log(`Rodando na porta ${PORT} · armazenamento: ${db.kind}`));
})();
