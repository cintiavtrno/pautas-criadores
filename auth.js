// Login do controle interno: senhas com scrypt e sessão em cookie assinado.
const crypto = require('crypto');

let SECRET = null;
const setSecret = (s) => { SECRET = s; };
const SESSAO_DIAS = 7;

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(senha), salt, 64).toString('hex');
  return `scrypt$${salt}$${h}`;
}
function confereSenha(senha, guardada) {
  const [tipo, salt, h] = String(guardada || '').split('$');
  if (tipo !== 'scrypt' || !salt || !h) return false;
  const calc = crypto.scryptSync(String(senha), salt, 64);
  const ref = Buffer.from(h, 'hex');
  return ref.length === calc.length && crypto.timingSafeEqual(ref, calc);
}
// senha provisória fácil de ditar: sem letras que se confundem (0/O, 1/l)
function senhaProvisoria() {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const b = crypto.randomBytes(10);
  return Array.from(b, (x) => abc[x % abc.length]).join('');
}

function assina(payload) {
  const corpo = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SECRET).update(corpo).digest('base64url');
  return `${corpo}.${mac}`;
}
function confere(token) {
  if (!token || !SECRET) return null;
  const [corpo, mac] = String(token).split('.');
  if (!corpo || !mac) return null;
  const esperado = crypto.createHmac('sha256', SECRET).update(corpo).digest();
  const veio = Buffer.from(mac, 'base64url');
  if (veio.length !== esperado.length || !crypto.timingSafeEqual(veio, esperado)) return null;
  try {
    const p = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

function lerCookie(req, nome) {
  const c = req.headers.cookie || '';
  for (const parte of c.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(v.join('='));
  }
  return null;
}
function abreSessao(req, res, usuario) {
  const exp = Date.now() + SESSAO_DIAS * 864e5;
  const tok = assina({ u: usuario.id, v: usuario.sessaoVersao || 0, exp });
  res.setHeader('Set-Cookie', `sid=${tok}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${SESSAO_DIAS * 86400}${req.secure ? '; Secure' : ''}`);
}
function fechaSessao(req, res) {
  res.setHeader('Set-Cookie', `sid=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0${req.secure ? '; Secure' : ''}`);
}

// carrega o usuário logado em req.usuario (ou deixa vazio)
function sessao(db) {
  return async (req, _res, next) => {
    try {
      const p = confere(lerCookie(req, 'sid'));
      if (p) {
        const u = await db.get('usuarios', p.u);
        if (u && (u.sessaoVersao || 0) === p.v && !u.desativado) req.usuario = u;
      }
    } catch (e) { console.error(e); }
    next();
  };
}

const publico = (u) => u && ({ id: u.id, nome: u.nome, login: u.login, papel: u.papel, teamId: u.teamId || '', trocarSenha: !!u.trocarSenha });

module.exports = { setSecret, hashSenha, confereSenha, senhaProvisoria, abreSessao, fechaSessao, sessao, publico };
