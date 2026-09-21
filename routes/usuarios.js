const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { verifyToken, verificarAdmin } = require('../middleware/auth');
const crypto = require('crypto');
const router = express.Router();

const LARGO_MINIMO_PASSWORD = 6;
const ROLES_ASIGNABLES = ['admin', 'operario'];

// Un admin solo maneja usuarios de su iglesia y nunca al super administrador.
// Devuelve el usuario objetivo o responde el error correspondiente.
async function usuarioAlcanzable(req, res, id) {
  const r = await db.query('SELECT id, usuario, rol, iglesia_id FROM usuarios WHERE id = $1', [id]);
  if (r.rows.length === 0) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return null;
  }
  const objetivo = r.rows[0];
  const esYo = objetivo.id === req.user.id;
  if (objetivo.iglesia_id !== req.user.iglesia_id && !esYo) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return null;
  }
  if (objetivo.rol === 'superadmin' && !esYo) {
    res.status(403).json({ error: 'No se puede modificar al super administrador' });
    return null;
  }
  return objetivo;
}

// GET /api/usuarios - Usuarios de la iglesia actual (solo admin)
router.get('/', verifyToken, verificarAdmin, async (req, res) => {
  try {
    // El super administrador aparece en la lista solo para sí mismo
    const result = await db.query(
      `SELECT id, usuario, rol, activo, fecha_creacion
       FROM usuarios
       WHERE iglesia_id = $1 AND (rol <> 'superadmin' OR id = $2)
       ORDER BY fecha_creacion DESC`,
      [req.user.iglesia_id, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error en GET /usuarios:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/usuarios/perfil/actual - Perfil del usuario logueado
router.get('/perfil/actual', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, usuario, rol, activo, fecha_creacion, iglesia_id FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios/crear - Crear usuario en la iglesia actual (solo admin)
router.post('/crear', verifyToken, verificarAdmin, async (req, res) => {
  try {
    const usuario = String(req.body.usuario || '').trim();
    const { password, rol } = req.body;

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    if (password.length < LARGO_MINIMO_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres` });
    }

    if (!ROLES_ASIGNABLES.includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Los usuarios son únicos en todo el sistema (con el usuario entra directo a su iglesia)
    const existente = await db.query('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER($1)', [usuario]);
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO usuarios (usuario, password, rol, activo, iglesia_id)
       VALUES ($1, $2, $3, true, $4)
       RETURNING id, usuario, rol, activo, fecha_creacion`,
      [usuario, hash, rol, req.user.iglesia_id]
    );

    console.log('✅ Usuario creado:', usuario);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error en POST /crear:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/usuarios/:id - Actualizar usuario (solo admin)
router.put('/:id', verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario, rol, activo } = req.body;

    const objetivo = await usuarioAlcanzable(req, res, id);
    if (!objetivo) return;

    // Nadie se cambia el rol a sí mismo (ni se baja el super administrador)
    if (objetivo.id === req.user.id && rol !== undefined && rol !== objetivo.rol) {
      return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });
    }

    const cambios = [];
    const values = [];

    if (usuario !== undefined) {
      const nombre = String(usuario).trim();
      if (!nombre) return res.status(400).json({ error: 'El nombre de usuario no puede quedar vacío' });
      const repetido = await db.query('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER($1) AND id <> $2', [nombre, id]);
      if (repetido.rows.length > 0) return res.status(400).json({ error: 'Ese nombre de usuario ya está en uso' });
      values.push(nombre);
      cambios.push(`usuario = $${values.length}`);
    }

    if (rol !== undefined && objetivo.id !== req.user.id) {
      if (!ROLES_ASIGNABLES.includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      values.push(rol);
      cambios.push(`rol = $${values.length}`);
    }

    if (activo !== undefined) {
      if (objetivo.id === req.user.id && activo === false) {
        return res.status(403).json({ error: 'No puedes desactivar tu propia cuenta' });
      }
      values.push(activo);
      cambios.push(`activo = $${values.length}`);
    }

    if (cambios.length === 0) {
      return res.json({ id: objetivo.id, usuario: objetivo.usuario, rol: objetivo.rol });
    }

    values.push(id);
    const result = await db.query(
      `UPDATE usuarios SET ${cambios.join(', ')} WHERE id = $${values.length} RETURNING id, usuario, rol, activo`,
      values
    );

    console.log('✅ Usuario actualizado');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error en PUT /:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/usuarios/:id - Eliminar usuario (solo admin)
router.delete('/:id', verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.id == id) {
      return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const objetivo = await usuarioAlcanzable(req, res, id);
    if (!objetivo) return;

    const result = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING id, usuario', [id]);

    console.log('✅ Usuario eliminado');
    res.json({ mensaje: 'Usuario eliminado', usuario: result.rows[0].usuario });
  } catch (error) {
    console.error('❌ Error en DELETE /:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios/:id/resetear-password - Contraseña aleatoria nueva (solo admin)
router.post('/:id/resetear-password', verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const objetivo = await usuarioAlcanzable(req, res, id);
    if (!objetivo) return;

    const nuevaPassword = crypto.randomBytes(6).toString('hex');
    const hash = await bcrypt.hash(nuevaPassword, 10);

    await db.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hash, id]);

    console.log('✅ Contraseña reseteada');
    res.json({
      mensaje: 'Contraseña reseteada',
      usuario: objetivo.usuario,
      nueva_password: nuevaPassword,
      aviso: '⚠️ Comparte esta contraseña de forma segura con el usuario'
    });
  } catch (error) {
    console.error('❌ Error en POST /resetear-password:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/usuarios/:id/password - El admin define una contraseña nueva para un usuario
router.put('/:id/password', verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < LARGO_MINIMO_PASSWORD) {
      return res.status(400).json({ error: `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres` });
    }

    const objetivo = await usuarioAlcanzable(req, res, id);
    if (!objetivo) return;

    const hash = await bcrypt.hash(password, 10);
    await db.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hash, id]);

    console.log('🔑 Contraseña definida por admin para:', objetivo.usuario);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error en PUT /:id/password:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
