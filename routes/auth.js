const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { verifyToken, verificarSuperadmin } = require('../middleware/auth');
const { configDeIglesia } = require('../config');
const router = express.Router();

// Compara contra el hash guardado. Versiones anteriores guardaban algunas
// contraseñas sin cifrar; se aceptan una vez y se cifran al primer login.
async function passwordCoincide(ingresada, guardada) {
  if (!guardada) return false;
  const esHash = /^\$2[aby]\$\d{2}\$/.test(guardada);
  if (esHash) return bcrypt.compare(ingresada, guardada);
  return ingresada === guardada;
}

// El token lleva la iglesia: todo lo que el usuario ve y guarda se filtra por ella
function firmarToken(user, iglesiaId) {
  return jwt.sign(
    { id: user.id, usuario: user.usuario, rol: user.rol, iglesia_id: iglesiaId },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Login - POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const usuario = String(req.body.usuario || '').trim();
    const { password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Buscar usuario en BD. Desde el teléfono suelen llegar mayúsculas o
    // espacios de más, así que se compara sin distinguirlos.
    const result = await db.query(
      `SELECT u.id, u.usuario, u.password, u.rol, u.nombre_completo, u.iglesia_id, i.activa AS iglesia_activa
       FROM usuarios u
       LEFT JOIN iglesias i ON i.id = u.iglesia_id
       WHERE LOWER(TRIM(u.usuario)) = LOWER($1) AND u.activo = true
       ORDER BY (u.usuario = $1) DESC
       LIMIT 1`,
      [usuario]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (!(await passwordCoincide(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.iglesia_id) {
      return res.status(403).json({ error: 'El usuario no tiene iglesia asignada' });
    }
    if (user.iglesia_activa === false && user.rol !== 'superadmin') {
      return res.status(403).json({ error: 'La iglesia está dada de baja' });
    }

    // Si estaba guardada sin cifrar, se cifra ahora
    if (!/^\$2[aby]\$/.test(user.password)) {
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hash, user.id]);
      console.log('🔐 Contraseña migrada a hash para:', user.usuario);
    }

    res.json({
      success: true,
      token: firmarToken(user, user.iglesia_id),
      rol: user.rol,
      nombre_completo: user.nombre_completo || user.usuario,
      user: {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol,
        nombre_completo: user.nombre_completo,
        iglesia_id: user.iglesia_id
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Verificar si el token es válido - GET /api/auth/verify
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// El super administrador puede trabajar sobre cualquier iglesia: recibe un
// token nuevo apuntando a ella - POST /api/auth/cambiar-iglesia/:id
router.post('/cambiar-iglesia/:id', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const iglesia = await db.query('SELECT * FROM iglesias WHERE id = $1', [req.params.id]);
    if (iglesia.rows.length === 0) {
      return res.status(404).json({ error: 'Iglesia no encontrada' });
    }
    const user = { id: req.user.id, usuario: req.user.usuario, rol: req.user.rol };
    res.json({ success: true, token: firmarToken(user, iglesia.rows[0].id), iglesia: configDeIglesia(iglesia.rows[0]) });
  } catch (error) {
    console.error('Error cambiando de iglesia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = { router, verifyToken, passwordCoincide };
