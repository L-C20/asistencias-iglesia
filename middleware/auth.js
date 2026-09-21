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

module.exports = { verifyToken, verificarAdmin, verificarSuperadmin, ROLES_ADMIN };
