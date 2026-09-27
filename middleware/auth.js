const jwt = require('jsonwebtoken');

// Valida el token y deja en req.user: { id, usuario, rol, iglesia_id }.
// Un token sin iglesia (de antes de que existieran) se rechaza para que el
// usuario vuelva a entrar y reciba uno completo.
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.iglesia_id) {
      return res.status(401).json({ error: 'Sesión vencida' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

const ROLES_ADMIN = ['admin', 'superadmin'];

function verificarAdmin(req, res, next) {
  if (!ROLES_ADMIN.includes(req.user.rol)) {
    return res.status(403).json({ error: 'Acceso denegado: Solo administradores' });
  }
  next();
}

function verificarSuperadmin(req, res, next) {
  if (req.user.rol !== 'superadmin') {
    return res.status(403).json({ error: 'Acceso denegado: Solo el super administrador' });
  }
  next();
}

// ¿Puede consultar la asistencia de cualquier iglesia? El super administrador
// siempre; el resto, si tiene el permiso activado. Se consulta en la base y no
// en el token para que quitar el permiso tenga efecto en el momento.
async function puedeVerTodas(usuarioId, rol) {
  if (rol === 'superadmin') return true;
  const db = require('../database');
  const r = await db.query('SELECT ver_todas_iglesias FROM usuarios WHERE id = $1 AND activo = true', [usuarioId]);
  return r.rows.length > 0 && r.rows[0].ver_todas_iglesias === true;
}

async function verificarVerTodas(req, res, next) {
  try {
    if (!(await puedeVerTodas(req.user.id, req.user.rol))) {
      return res.status(403).json({ error: 'Acceso denegado: no tenés permiso para ver otras iglesias' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
}

// Iglesia sobre la que se consulta: la propia, salvo que pida otra y tenga
// permiso. Solo para lecturas; las escrituras siguen atadas a req.user.iglesia_id.
async function iglesiaConsultada(req) {
  const pedida = Number(req.query.iglesia_id);
  if (!pedida || pedida === req.user.iglesia_id) return req.user.iglesia_id;
  if (await puedeVerTodas(req.user.id, req.user.rol)) return pedida;
  const error = new Error('No tenés permiso para ver esa iglesia');
  error.status = 403;
  throw error;
}

module.exports = { verifyToken, verificarAdmin, verificarSuperadmin, verificarVerTodas, puedeVerTodas, iglesiaConsultada, ROLES_ADMIN };
