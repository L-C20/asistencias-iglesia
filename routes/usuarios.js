const express = require('express');
const db = require('../database');
const { verifyToken } = require('./auth');
const crypto = require('crypto');
const router = express.Router();

// Middleware para verificar si es admin
const verificarAdmin = async (req, res, next) => {
  try {
    const usuarioId = req.user.id;
    
    const result = await db.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [usuarioId]
    );

    if (result.rows.length === 0 || result.rows[0].rol !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado: Solo administradores' });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/usuarios - Listar todos los usuarios (solo admin)
router.get('/', verifyToken, verificarAdmin, async (req, res) => {
  try {
    console.log('📋 Obteniendo usuarios...');
    
    const result = await db.query(
      'SELECT id, usuario, rol, activo, fecha_creacion FROM usuarios ORDER BY fecha_creacion DESC'
    );

    console.log(`✅ ${result.rows.length} usuarios encontrados`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error en GET /usuarios:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/usuarios/perfil - Obtener perfil del usuario actual
router.get('/perfil/actual', verifyToken, async (req, res) => {
  try {
    const usuarioId = req.user.id;
    
    const result = await db.query(
      'SELECT id, usuario, rol, activo, fecha_creacion FROM usuarios WHERE id = $1',
      [usuarioId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios/crear - Crear nuevo usuario (solo admin)
router.post('/crear', verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { usuario, password, rol } = req.body;

    console.log('➕ Creando usuario:', usuario, 'Rol:', rol);

    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
    }

    // Validar rol
    if (!['admin', 'operario'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Verificar si usuario existe
    const existente = await db.query(
      'SELECT id FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    if (existente.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario ya existe' });
    }

    // Crear usuario
    const result = await db.query(
      'INSERT INTO usuarios (usuario, password, rol, activo) VALUES ($1, $2, $3, true) RETURNING id, usuario, rol, activo, fecha_creacion',
      [usuario, password, rol]
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

    console.log('✏️ Actualizando usuario:', id);

    // No permitir editar al mismo admin
    if (req.user.id == id && rol !== 'admin') {
      return res.status(403).json({ error: 'No puedes cambiar tu propio rol' });
    }

    let query = 'UPDATE usuarios SET ';
    const values = [];
    let paramCount = 1;

    if (usuario !== undefined) {
      query += `usuario = $${paramCount}, `;
      values.push(usuario);
      paramCount++;
    }

    if (rol !== undefined) {
      if (!['admin', 'operario'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      query += `rol = $${paramCount}, `;
      values.push(rol);
      paramCount++;
    }

    if (activo !== undefined) {
      query += `activo = $${paramCount}, `;
      values.push(activo);
      paramCount++;
    }

    // Remover última coma
    query = query.slice(0, -2);
    query += ` WHERE id = $${paramCount} RETURNING id, usuario, rol, activo`;
    values.push(id);

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

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

    console.log('🗑️ Eliminando usuario:', id);

    // No permitir eliminar al mismo admin
    if (req.user.id == id) {
      return res.status(403).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    const result = await db.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING id, usuario',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario eliminado');
    res.json({ mensaje: 'Usuario eliminado', usuario: result.rows[0].usuario });
  } catch (error) {
    console.error('❌ Error en DELETE /:id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios/:id/resetear-password - Resetear contraseña (solo admin)
router.post('/:id/resetear-password', verifyToken, verificarAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔑 Reseteando contraseña para usuario:', id);

    // Generar contraseña aleatoria
    const nuevaPassword = crypto.randomBytes(6).toString('hex');

    const result = await db.query(
      'UPDATE usuarios SET password = $1 WHERE id = $2 RETURNING id, usuario',
      [nuevaPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Contraseña reseteada');
    res.json({ 
      mensaje: 'Contraseña reseteada',
      usuario: result.rows[0].usuario,
      nueva_password: nuevaPassword,
      aviso: '⚠️ Comparte esta contraseña de forma segura con el usuario'
    });
  } catch (error) {
    console.error('❌ Error en POST /resetear-password:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios/cambiar-password - Cambiar tu propia contraseña
router.post('/cambiar-password/actual', verifyToken, async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body;
    const usuarioId = req.user.id;

    console.log('🔐 Cambiando contraseña para usuario:', usuarioId);

    if (!passwordActual || !passwordNueva) {
      return res.status(400).json({ error: 'Contraseñas requeridas' });
    }

    // Verificar contraseña actual
    const usuario = await db.query(
      'SELECT password FROM usuarios WHERE id = $1',
      [usuarioId]
    );

    if (usuario.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (usuario.rows[0].password !== passwordActual) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    // Actualizar contraseña
    await db.query(
      'UPDATE usuarios SET password = $1 WHERE id = $2',
      [passwordNueva, usuarioId]
    );

    console.log('✅ Contraseña actualizada');
    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('❌ Error en cambiar-password:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios/setup - Setup inicial (sin auth, solo primer admin)
router.post('/setup', async (req, res) => {
  try {
    const { usuario, nombre_completo } = req.body;

    console.log('⚙️ Setup usuario1 a admin:', usuario);

    const result = await db.query(
      'UPDATE usuarios SET rol = $1, nombre_completo = $2 WHERE usuario = $3 RETURNING id, usuario, rol, nombre_completo',
      ['admin', nombre_completo, usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario actualizado a admin');
    res.json({ ok: true, usuario: result.rows[0] });
  } catch (error) {
    console.error('❌ Error en setup:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/usuarios/reset-admin - Resetear admin a marcelo/Marcelo26
router.post('/reset-admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    console.log('🔐 Reseteando admin...');

    const hashedPassword = await bcrypt.hash('Marcelo26', 10);

    await db.query(
      'UPDATE usuarios SET usuario = $1, password = $2, nombre_completo = $3, rol = $4 WHERE id = 1',
      ['marcelo', hashedPassword, 'Marcelo Borgia', 'admin']
    );

    console.log('✅ Admin reseteado');
    res.json({ ok: true, mensaje: 'Usuario: marcelo, Contraseña: Marcelo26' });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;