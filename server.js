const express = require('express');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');
const seed = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;
const COLLECTIONS = ['creators', 'pautas', 'team', 'nichos'];

const seg = require('./security');

app.disable('x-powered-by');
app.set('trust proxy', 1); // o Render fica na frente: assim o IP real de quem acessa é o que conta
app.use(seg.headers);
app.use(seg.geral);
app.use(express.json({ limit: '200kb' }));

// Senha do painel: defina APP_PASSWORD no Render. Usuário pode ser qualquer um; só a senha é conferida.
// Formulário (/participar) e links de escolha (/escolha/...) ficam abertos.
if (process.env.APP_PASSWORD) app.use(seg.senha(process.env.APP_PASSWORD));
else console.warn('ATENÇÃO: APP_PASSWORD não definida. O painel está aberto para qualquer pessoa.');

app.get('/health', (_req, res) => res.json({ ok: true, storage: db.kind }));

const checkCol = (req, res, next) =>
  COLLECTIONS.includes(req.params.col) ? next() : res.status(404).json({ error: 'coleção inválida' });

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: 'Erro no servidor. Tente de novo.' });
});

app.get('/api/:col', checkCol, wrap(async (req, res) => res.json(await db.list(req.params.col))));

const newToken = () => crypto.randomBytes(9).toString('base64url');

app.post('/api/:col', checkCol, wrap(async (req, res) => {
  const data = { ...(req.body || {}) };
  if (req.params.col === 'creators' && !data.token) data.token = newToken();
  res.status(201).json(await db.insert(req.params.col, data));
}));

// ---------- página pública: o criador escolhe a pauta ----------
async function creatorByToken(token) {
  if (!token || token.length < 8) return null;
  return (await db.list('creators')).find((c) => c.token === token) || null;
}
const publicPauta = (p) => ({ id: p.id, titulo: p.titulo, tema: p.tema || '', descricao: p.descricao || '', linhaSugerida: p.linhaSugerida || '', prazo: p.prazo || '' });

app.get('/public/escolha/:token', wrap(async (req, res) => {
  const c = await creatorByToken(req.params.token);
  if (!c) return res.status(404).json({ error: 'Link inválido.' });
  const pautas = await db.list('pautas');
  const ids = c.pautasOpcoes || [];
  const opcoes = pautas.filter((p) => ids.includes(p.id)).map(publicPauta);
  res.json({
    nome: c.nome, sugestaoLinha: c.sugestaoLinha || '', opcoes,
    escolhida: c.pautaId || '', comentario: c.comentarioCriador || '', escolhidaEm: c.escolhidaEm || '',
  });
}));

app.post('/public/escolha/:token', wrap(async (req, res) => {
  if (!seg.limits.escolha.hit(seg.ipOf(req))) return seg.demais(res);
  const c = await creatorByToken(req.params.token);
  if (!c) return res.status(404).json({ error: 'Link inválido.' });
  const { pautaId, comentario } = req.body || {};
  if (!(c.pautasOpcoes || []).includes(pautaId)) return res.status(400).json({ error: 'Escolha uma das pautas da lista.' });
  const patch = { pautaId, comentarioCriador: String(comentario || '').slice(0, 2000), escolhidaEm: new Date().toISOString() };
  if (!c.status || c.status === 'Mapeado' || c.status === 'Contatado') patch.status = 'Topou';
  await db.update('creators', c.id, patch);
  const p = await db.get('pautas', pautaId);
  if (p) await db.update('pautas', p.id, { creatorId: c.id, status: !p.status || p.status === 'Livre' ? 'Reservada' : p.status });
  res.json({ ok: true });
}));

app.get('/escolha/:token', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'escolha.html')));

// ---------- formulário público de inscrição ----------
// O criador se inscreve sozinho e entra direto na lista, marcado como "inscrição".
app.get('/participar', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'participar.html')));
app.get('/public/nichos', wrap(async (_req, res) => res.json((await db.list('nichos')).map((n) => n.nome))));
app.get('/public/config', (_req, res) => res.json({ turnstile: seg.turnstileAtivo() ? process.env.TURNSTILE_SITE_KEY : '' }));

const limpaHandle = (h) => String(h || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#\s]/)[0].toLowerCase();
const txt = (v, max = 300) => String(v || '').trim().slice(0, max);

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
  seg.limits.inscricaoTotal.hit('site');
  const nome = txt(b.nome, 120);
  const handle = limpaHandle(b.handle);
  const whats = txt(b.whats, 40);
  const email = txt(b.email, 160);
  if (!nome || !handle) return res.status(400).json({ error: 'Preencha seu nome e seu @ do Instagram.' });
  if (!whats && !email) return res.status(400).json({ error: 'Deixe um WhatsApp ou um e-mail para a gente falar com você.' });
  if (!b.consentimento) return res.status(400).json({ error: 'Marque a autorização de contato para enviar.' });

  const validos = new Set((await db.list('nichos')).map((n) => n.nome));
  const nichos = (Array.isArray(b.nichos) ? b.nichos : []).filter((n) => validos.has(n)).slice(0, 5);
  const dados = {
    contatoWhats: whats, contatoEmail: email, cidade: txt(b.cidade, 120), outrasRedes: txt(b.outrasRedes, 300),
    seguidores: txt(b.seguidores, 40), nichoOutro: txt(b.nichoOutro, 80), mensagemInscricao: txt(b.sobre, 1500),
    inscritoEm: new Date().toISOString(),
  };

  let criador = (await db.list('creators')).find((c) => (c.handle || '').toLowerCase() === handle);
  if (criador) {
    // já estava na lista: só completa o contato, sem apagar o que a equipe escreveu
    // só preenche o que estiver vazio: ninguém consegue trocar o contato de quem já está na lista
    const patch = { inscreveuSe: true, inscritoEm: dados.inscritoEm };
    for (const [k, v] of Object.entries(dados)) if (v && !criador[k]) patch[k] = v;
    if (!(criador.nichos || []).length && nichos.length) patch.nichos = nichos;
    await db.update('creators', criador.id, patch);
  } else {
    criador = await db.insert('creators', {
      nome, handle, url: `https://www.instagram.com/${handle}/`, nichos, nichoConfirmado: false,
      resumo: dados.mensagemInscricao, sugestaoLinha: '', observacoes: '', responsavel: '', status: 'Mapeado',
      modoPauta: 'atribuida', pautaId: '', pautasOpcoes: [], roteiristaId: '', editorId: '',
      origem: 'inscricao', inscreveuSe: true, token: newToken(), ...dados,
    });
  }

  // a pessoa pode já mandar a própria ideia de pauta: entra na aba Pautas como "Sugerida"
  const pautaTitulo = txt(b.pautaTitulo, 140);
  if (pautaTitulo) {
    await db.insert('pautas', {
      titulo: pautaTitulo, tema: '', nicho: nichos[0] || '', descricao: txt(b.pautaDescricao, 1500), linhaSugerida: '',
      status: 'Sugerida', creatorId: criador.id, prazo: '', origem: 'inscricao', sugeridaPor: nome,
    });
  }
  res.json({ ok: true });
}));

app.put('/api/:col/:id', checkCol, wrap(async (req, res) => {
  const r = await db.update(req.params.col, req.params.id, req.body || {});
  r ? res.json(r) : res.status(404).json({ error: 'não encontrado' });
}));

app.delete('/api/:col/:id', checkCol, wrap(async (req, res) => {
  const { col, id } = req.params;
  const ok = await db.remove(col, id);
  if (!ok) return res.status(404).json({ error: 'não encontrado' });
  // limpa referências soltas
  if (col === 'pautas') {
    for (const c of await db.list('creators')) {
      const patch = {};
      if (c.pautaId === id) patch.pautaId = '';
      if ((c.pautasOpcoes || []).includes(id)) patch.pautasOpcoes = c.pautasOpcoes.filter((x) => x !== id);
      if (Object.keys(patch).length) await db.update('creators', c.id, patch);
    }
  }
  if (col === 'creators') {
    for (const p of await db.list('pautas')) if (p.creatorId === id) await db.update('pautas', p.id, { creatorId: '' });
  }
  if (col === 'team') {
    for (const c of await db.list('creators')) {
      const patch = {};
      if (c.roteiristaId === id) patch.roteiristaId = '';
      if (c.editorId === id) patch.editorId = '';
      if (Object.keys(patch).length) await db.update('creators', c.id, patch);
    }
  }
  res.json({ ok: true });
}));

// Exportação CSV (abre no Excel / Google Sheets)
app.get('/export/:col.csv', checkCol, wrap(async (req, res) => {
  const rows = await db.list(req.params.col);
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    let s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // impede fórmula maliciosa ao abrir no Excel
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="${req.params.col}.csv"`);
  res.send('﻿' + csv);
}));

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

(async () => {
  await db.init();
  // Dados iniciais: entra só o que ainda não foi semeado (o que vocês apagarem não volta).
  const metaList = await db.list('meta');
  const meta = metaList[0] || (await db.insert('meta', { seeded: [], seededNichos: [] }));
  const nichosExist = new Set((await db.list('nichos')).map((n) => n.nome));
  const nichosSeeded = new Set(meta.seededNichos || []);
  for (const n of seed.nichos) {
    if (nichosSeeded.has(n.nome)) continue;
    if (!nichosExist.has(n.nome)) await db.insert('nichos', n);
    nichosSeeded.add(n.nome);
  }
  await db.update('meta', meta.id, { seededNichos: [...nichosSeeded] });

  // equipe inicial (por nome; quem vocês apagarem não volta)
  const equipeExist = new Set((await db.list('team')).map((t) => t.nome.toLowerCase()));
  const equipeSeeded = new Set(meta.seededEquipe || []);
  for (const t of seed.equipe || []) {
    if (equipeSeeded.has(t.nome)) continue;
    if (!equipeExist.has(t.nome.toLowerCase())) await db.insert('team', { contato: '', obs: '', ...t });
    equipeSeeded.add(t.nome);
  }
  await db.update('meta', meta.id, { seededEquipe: [...equipeSeeded] });
  const existing = new Set((await db.list('creators')).map((c) => c.handle));
  const seeded = new Set(meta.seeded || []);
  for (const c of seed.criadores) {
    if (seeded.has(c.handle)) continue;
    if (!existing.has(c.handle)) await db.insert('creators', c);
    seeded.add(c.handle);
  }
  await db.update('meta', meta.id, { seeded: [...seeded] });

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

  // todo criador ganha um link secreto de escolha
  for (const c of await db.list('creators')) if (!c.token) await db.update('creators', c.id, { token: newToken() });
  app.listen(PORT, () => console.log(`Rodando na porta ${PORT} · armazenamento: ${db.kind}`));
})();
