const express = require('express');
const crypto = require('crypto');
const path = require('path');
const db = require('./db');
const seed = require('./seed');

const app = express();
const PORT = process.env.PORT || 3000;
const COLLECTIONS = ['creators', 'pautas', 'team', 'nichos'];

app.use(express.json({ limit: '1mb' }));

// Senha opcional: defina APP_PASSWORD no Render para proteger o sistema.
// Usuário pode ser qualquer um; só a senha é conferida.
if (process.env.APP_PASSWORD) {
  app.use((req, res, next) => {
    // a página onde o criador escolhe a pauta é aberta sem senha (o link já é secreto)
    if (req.path === '/health' || req.path.startsWith('/escolha/') || req.path.startsWith('/public/') || req.path === '/escolha.css') return next();
    const h = req.headers.authorization || '';
    const [, b64] = h.split(' ');
    const pass = b64 ? Buffer.from(b64, 'base64').toString().split(':').slice(1).join(':') : '';
    if (pass === process.env.APP_PASSWORD) return next();
    res.set('WWW-Authenticate', 'Basic realm="Pautas"').status(401).send('Acesso restrito');
  });
}

app.get('/health', (_req, res) => res.json({ ok: true, storage: db.kind }));

const checkCol = (req, res, next) =>
  COLLECTIONS.includes(req.params.col) ? next() : res.status(404).json({ error: 'coleção inválida' });

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => {
  console.error(e);
  res.status(500).json({ error: e.message });
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
    const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
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
