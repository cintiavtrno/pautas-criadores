// Travas de segurança do sistema.
// Não substituem uma proteção de rede contra ataque em massa (isso é com o Render/Cloudflare),
// mas seguram robô, excesso de requisição, tentativa de adivinhar senha e spam no formulário.
const crypto = require('crypto');

/* ---------- limitador por janela de tempo ---------- */
class Limiter {
  constructor(max, windowMs) { this.max = max; this.windowMs = windowMs; this.hits = new Map(); }
  hit(key) {
    const now = Date.now();
    const list = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    list.push(now); this.hits.set(key, list);
    return list.length <= this.max;
  }
  count(key) { const now = Date.now(); return (this.hits.get(key) || []).filter((t) => now - t < this.windowMs).length; }
  reset(key) { this.hits.delete(key); }
  sweep() { const now = Date.now(); for (const [k, v] of this.hits) if (!v.some((t) => now - t < this.windowMs)) this.hits.delete(k); }
}

const limits = {
  geral: new Limiter(600, 5 * 60 * 1000),        // 600 requisições a cada 5 min por IP
  publicoLeitura: new Limiter(60, 5 * 60 * 1000), // páginas públicas: 60 leituras a cada 5 min
  inscricao: new Limiter(5, 10 * 60 * 1000),      // 5 inscrições a cada 10 min por IP
  inscricaoTotal: new Limiter(300, 60 * 60 * 1000), // teto geral: 300 inscrições por hora no site todo
  escolha: new Limiter(20, 10 * 60 * 1000),       // 20 envios de escolha a cada 10 min por IP
  senhaErrada: new Limiter(10, 15 * 60 * 1000),   // 10 senhas erradas = bloqueio de 15 min (por IP e por login)
  painel: new Limiter(30, 10 * 60 * 1000),        // 30 ações no painel pessoal a cada 10 min
};
setInterval(() => Object.values(limits).forEach((l) => l.sweep()), 5 * 60 * 1000).unref();

const ipOf = (req) => req.ip || req.socket?.remoteAddress || 'desconhecido';

function demais(res, msg = 'Muitas requisições. Espere alguns minutos e tente de novo.') {
  res.set('Retry-After', '300');
  return res.status(429).json({ error: msg });
}

/* ---------- cabeçalhos de proteção ---------- */
function headers(_req, res, next) {
  res.set({
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      'frame-src https://challenges.cloudflare.com',
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
  });
  next();
}

/* ---------- limite geral ---------- */
function geral(req, res, next) {
  if (req.path === '/health') return next();
  if (!limits.geral.hit(ipOf(req))) return demais(res);
  if (req.method === 'GET' && (req.path.startsWith('/public/') || req.path.startsWith('/p/') || req.path.startsWith('/escolha/'))) {
    if (!limits.publicoLeitura.hit(ipOf(req))) return demais(res);
  }
  next();
}

/* ---------- verificação anti-robô opcional (Cloudflare Turnstile) ---------- */
// Só liga se as variáveis TURNSTILE_SITE_KEY e TURNSTILE_SECRET existirem no Render.
const turnstileAtivo = () => !!(process.env.TURNSTILE_SITE_KEY && process.env.TURNSTILE_SECRET);
async function turnstileOk(token, ip) {
  if (!turnstileAtivo()) return true;
  if (!token) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: process.env.TURNSTILE_SECRET, response: token, remoteip: ip }),
    });
    return !!(await r.json()).success;
  } catch { return false; }
}

module.exports = { limits, ipOf, demais, headers, geral, turnstileAtivo, turnstileOk };
