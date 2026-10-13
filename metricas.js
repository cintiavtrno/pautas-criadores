// Métricas de uso do site, feitas aqui mesmo: sem cookie, sem Google Analytics, sem serviço de fora.
// Só contamos ações (quantas vezes algo aconteceu por dia). Nenhum dado pessoal, IP ou identificador é guardado.
// As contagens ficam na memória e vão para o banco a cada minuto (coleção "metricas", um registro por dia).

// eventos aceitos: o resto é ignorado
const EVENTOS = new Set([
  'pv', 'u', 'origem',
  'jogo_abriu', 'jogo_terminou', 'jogo_card', 'jogo_zap',
  'video_assistiu', 'video_baixou', 'video_mandou', 'video_zap', 'video_insta', 'video_face', 'video_link', 'video_plataforma',
  'guia_tema', 'guia_roteiro', 'guia_link', 'guia_gancho',
]);
const PAGINAS = ['/', '/guia', '/jogos', '/videos', '/participar', '/juridico', '/enviar-video'];

// dia no horário de Brasília (UTC-3)
const diaDe = (t = Date.now()) => new Date(t - 3 * 3600 * 1000).toISOString().slice(0, 10);
const limpa = (k) => String(k ?? '').normalize('NFC').replace(/[^\p{L}\p{N} .,?!()\-_/#·:]/gu, '').trim().slice(0, 70);

module.exports = function metricas(db) {
  let fila = {}; // { dia: { "evento|chave": n } }

  function soma(e, k) {
    if (!EVENTOS.has(e)) return;
    let chave = limpa(k);
    if (e === 'pv') { chave = chave.startsWith('/p/') ? '/p' : chave.replace(/\/+$/, '') || '/'; if (!PAGINAS.includes(chave) && chave !== '/p') chave = 'outra'; }
    if (e === 'u') chave = '';
    const d = diaDe();
    const dia = (fila[d] = fila[d] || {});
    const id = `${e}|${chave}`;
    dia[id] = (dia[id] || 0) + 1;
  }

  async function grava() {
    const pendente = fila; fila = {};
    for (const [d, contas] of Object.entries(pendente)) {
      try {
        const id = `metricas-${d}`;
        const atual = await db.get('metricas', id);
        const c = { ...((atual && atual.c) || {}) };
        for (const [k, n] of Object.entries(contas)) c[k] = (c[k] || 0) + n;
        if (atual) await db.update('metricas', id, { c }); else await db.insert('metricas', { id, dia: d, c });
      } catch (err) {
        console.error('métricas:', err.message);
        // devolve pra fila e tenta no próximo minuto
        const dia = (fila[d] = fila[d] || {});
        for (const [k, n] of Object.entries(contas)) dia[k] = (dia[k] || 0) + n;
      }
    }
  }
  setInterval(grava, 60 * 1000).unref();
  const fecha = () => grava().finally(() => process.exit(0));
  process.once('SIGTERM', fecha);
  process.once('SIGINT', fecha);

  // recebe até 10 eventos por chamada: { ev: [["pv", "/jogos"], ["u"], ...] }
  function receber(body) {
    const ev = Array.isArray(body && body.ev) ? body.ev.slice(0, 10) : [];
    ev.forEach((x) => Array.isArray(x) && soma(String(x[0] || ''), x[1]));
  }

  // últimos N dias, já somando o que ainda está na memória
  async function ler(dias = 14) {
    const hoje = Date.now();
    const lista = [];
    const salvos = Object.fromEntries((await db.list('metricas')).map((r) => [r.dia, r.c || {}]));
    for (let i = dias - 1; i >= 0; i--) {
      const d = diaDe(hoje - i * 86400000);
      const c = { ...(salvos[d] || {}) };
      for (const [k, n] of Object.entries(fila[d] || {})) c[k] = (c[k] || 0) + n;
      lista.push({ dia: d, c });
    }
    return lista;
  }

  return { receber, ler };
};
