const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const router = express.Router();

// Compara contra el hash guardado. Versiones anteriores guardaban algunas
// contraseñas sin cifrar; se aceptan una vez y se cifran al primer login.
async function passwordCoincide(ingresada, guardada) {
  if (!guardada) return false;
  const esHash = /^\$2[aby]\$\d{2}\$/.test(guardada);
  if (esHash) return bcrypt.compare(ingresada, guardada);
  return ingresada === guardada;
}

// Login - POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Buscar usuario en BD
    const result = await db.query(
      'SELECT id, usuario, password, rol, nombre_completo FROM usuarios WHERE usuario = $1 AND activo = true',
      [usuario]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    if (!(await passwordCoincide(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Si estaba guardada sin cifrar, se cifra ahora
    if (!/^\$2[aby]\$/.test(user.password)) {
      const hash = await bcrypt.hash(password, 10);
      await db.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hash, user.id]);
      console.log('🔐 Contraseña migrada a hash para:', user.usuario);
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      rol: user.rol,
      nombre_completo: user.nombre_completo || user.usuario,
      user: {
        id: user.id,
        usuario: user.usuario,
        rol: user.rol,
        nombre_completo: user.nombre_completo
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Middleware para verificar token
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

// Verificar si el token es válido - GET /api/auth/verify
router.get('/verify', verifyToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

module.exports = { router, verifyToken, passwordCoincide };