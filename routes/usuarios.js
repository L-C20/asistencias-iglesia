const express = require('express');
const db = require('../database');
const { verifyToken } = require('./auth');
const router = express.Router();

// Obtener todos los usuarios - GET /api/usuarios
router.get('/', verifyToken, async (req, res) => {
  try {
    console.log('📋 Obteniendo lista de usuarios');
    
    const result = await db.query(
      'SELECT id, usuario, rol, activo, fecha_creacion FROM usuarios ORDER BY usuario'
    );

    console.log('✅ Usuarios obtenidos:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear nuevo usuario - POST /api/usuarios/crear
router.post('/crear', verifyToken, async (req, res) => {
  try {
    const { usuario, password, rol } = req.body;

    console.log('➕ Creando nuevo usuario:', usuario);

    if (!usuario || !password || !rol) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    if (!['admin', 'user'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    // Verificar que el usuario no exista
    const existente = await db.query(
      'SELECT id FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    if (existente.rows.length > 0) {
      return res.status(400).json({ error: 'El usuario ya existe' });
    }

    // Crear usuario
    const result = await db.query(
      'INSERT INTO usuarios (usuario, password, rol, activo) VALUES ($1, $2, $3, true) RETURNING id, usuario, rol, activo',
      [usuario, password, rol]
    );

    console.log('✅ Usuario creado:', usuario);

    res.json({
      success: true,
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creando usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener usuario por ID - GET /api/usuarios/:id
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT id, usuario, rol, activo FROM usuarios WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Editar usuario - PUT /api/usuarios/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario, rol, activo } = req.body;

    console.log('✏️ Editando usuario:', id);

    if (!usuario || !rol) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const result = await db.query(
      'UPDATE usuarios SET usuario = $1, rol = $2, activo = $3 WHERE id = $4 RETURNING id, usuario, rol, activo',
      [usuario, rol, activo !== undefined ? activo : true, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario actualizado:', usuario);

    res.json({
      success: true,
      usuario: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error editando usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar usuario - DELETE /api/usuarios/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando usuario:', id);

    // No permitir eliminar el último admin
    const admins = await db.query(
      'SELECT COUNT(*) as count FROM usuarios WHERE rol = $1 AND activo = true AND id != $2',
      ['admin', id]
    );

    if (parseInt(admins.rows[0].count) === 0) {
      const user = await db.query(
        'SELECT rol FROM usuarios WHERE id = $1',
        [id]
      );
      if (user.rows[0]?.rol === 'admin') {
        return res.status(400).json({ error: 'No puedes eliminar el único administrador' });
      }
    }

    const result = await db.query(
      'DELETE FROM usuarios WHERE id = $1 RETURNING usuario',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Usuario eliminado:', result.rows[0].usuario);

    res.json({
      success: true,
      message: 'Usuario eliminado correctamente'
    });
  } catch (error) {
    console.error('❌ Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Resetear contraseña de usuario - POST /api/usuarios/:id/resetear-password
router.post('/:id/resetear-password', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🔑 Reseteando contraseña de usuario:', id);

    // Generar contraseña temporal
    const nuevaPassword = Math.random().toString(36).substring(2, 10);

    const result = await db.query(
      'UPDATE usuarios SET password = $1 WHERE id = $2 RETURNING usuario',
      [nuevaPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    console.log('✅ Contraseña reseteada para:', result.rows[0].usuario);

    res.json({
      success: true,
      usuario: result.rows[0].usuario,
      nuevaPassword: nuevaPassword
    });
  } catch (error) {
    console.error('❌ Error reseteando contraseña:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;