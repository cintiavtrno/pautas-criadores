// Camada de dados.
// - Se existir a variável DATABASE_URL (Postgres do Render), usa Postgres.
//   Tudo fica numa tabela própria (pautas_records), então dá para usar um Postgres que já existe.
// - Senão, salva num arquivo JSON em ./data/db.json (bom para testar local).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const newId = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function jsonStore() {
  const dir = process.env.DATA_DIR || path.join(__dirname, 'data');
  const file = path.join(dir, 'db.json');
  fs.mkdirSync(dir, { recursive: true });
  let db = {};
  if (fs.existsSync(file)) db = JSON.parse(fs.readFileSync(file, 'utf8'));
  const save = () => {
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, file);
  };
  const col = (c) => (db[c] = db[c] || []);

  return {
    kind: 'arquivo JSON',
    async init() {},
    async list(c) { return [...col(c)]; },
    async get(c, id) { return col(c).find((r) => r.id === id) || null; },
    async insert(c, data) {
      const rec = { ...data, id: data.id || newId(), createdAt: now(), updatedAt: now() };
      col(c).push(rec); save(); return rec;
    },
    async update(c, id, data) {
      const list = col(c); const i = list.findIndex((r) => r.id === id);
      if (i < 0) return null;
      list[i] = { ...list[i], ...data, id, updatedAt: now() }; save(); return list[i];
    },
    async remove(c, id) {
      const list = col(c); const i = list.findIndex((r) => r.id === id);
      if (i < 0) return false;
      list.splice(i, 1); save(); return true;
    },
  };
}

function pgStore(url) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: url,
    ssl: url.includes('localhost') ? false : { rejectUnauthorized: false },
  });
  const row = (r) => r && { ...r.data, id: r.id, createdAt: r.created_at, updatedAt: r.updated_at };

  return {
    kind: 'Postgres',
    async init() {
      await pool.query(`CREATE TABLE IF NOT EXISTS pautas_records (
        id TEXT PRIMARY KEY,
        collection TEXT NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS pautas_records_collection ON pautas_records(collection);`);
    },
    async list(c) {
      const { rows } = await pool.query('SELECT * FROM pautas_records WHERE collection=$1 ORDER BY created_at', [c]);
      return rows.map(row);
    },
    async get(c, id) {
      const { rows } = await pool.query('SELECT * FROM pautas_records WHERE collection=$1 AND id=$2', [c, id]);
      return row(rows[0]);
    },
    async insert(c, data) {
      const { id, createdAt, updatedAt, ...rest } = data;
      const { rows } = await pool.query(
        'INSERT INTO pautas_records(id, collection, data) VALUES($1,$2,$3) RETURNING *',
        [id || newId(), c, rest]
      );
      return row(rows[0]);
    },
    async update(c, id, data) {
      const { id: _i, createdAt, updatedAt, ...rest } = data;
      const { rows } = await pool.query(
        'UPDATE pautas_records SET data = data || $3::jsonb, updated_at = now() WHERE collection=$1 AND id=$2 RETURNING *',
        [c, id, rest]
      );
      return row(rows[0]);
    },
    async remove(c, id) {
      const r = await pool.query('DELETE FROM pautas_records WHERE collection=$1 AND id=$2', [c, id]);
      return r.rowCount > 0;
    },
  };
}

module.exports = process.env.DATABASE_URL ? pgStore(process.env.DATABASE_URL) : jsonStore();
