const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { verifyToken, verificarSuperadmin } = require('../middleware/auth');
const { configDeIglesia, normalizarGrupos } = require('../config');
const router = express.Router();

const LARGO_MINIMO_PASSWORD = 6;

// Iglesia del usuario logueado: nombre, grupos y, para el super administrador,
// la lista de todas para poder cambiar - GET /api/iglesias/actual
router.get('/actual', verifyToken, async (req, res) => {
  try {
    const actual = await db.query('SELECT * FROM iglesias WHERE id = $1', [req.user.iglesia_id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Iglesia no encontrada' });
    }

    const respuesta = {
      ...configDeIglesia(actual.rows[0]),
      rol: req.user.rol,
      esSuperadmin: req.user.rol === 'superadmin'
    };

    if (respuesta.esSuperadmin) {
      const todas = await db.query('SELECT id, nombre, activa FROM iglesias ORDER BY nombre');
      respuesta.iglesias = todas.rows;
    }

    res.json(respuesta);
  } catch (error) {
    console.error('Error obteniendo iglesia actual:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Todas las iglesias con cuántos usuarios e integrantes tienen - GET /api/iglesias
router.get('/', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT i.*,
        (SELECT COUNT(*) FROM usuarios u WHERE u.iglesia_id = i.id) AS usuarios,
        (SELECT COUNT(*) FROM miembros m WHERE m.iglesia_id = i.id AND m.activo = true) AS integrantes
      FROM iglesias i
      ORDER BY i.nombre
    `);
    res.json(result.rows.map(r => ({
      ...configDeIglesia(r),
      usuarios: Number(r.usuarios),
      integrantes: Number(r.integrantes),
      fecha_creacion: r.fecha_creacion
    })));
  } catch (error) {
    console.error('Error listando iglesias:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crear iglesia con su primer administrador - POST /api/iglesias
// Body: { nombre, departamento, anciano, grupos: ['orquesta','coro'], admin_usuario, admin_password }
router.post('/', verifyToken, verificarSuperadmin, async (req, res) => {
  const nombre = String(req.body.nombre || '').trim();
  const departamento = String(req.body.departamento || '').trim() || null;
  const anciano = String(req.body.anciano || '').trim() || null;
  const grupos = normalizarGrupos(req.body.grupos);
  const adminUsuario = String(req.body.admin_usuario || '').trim();
  const adminPassword = String(req.body.admin_password || '');

  if (!nombre) return res.status(400).json({ error: 'El nombre de la iglesia es requerido' });
  if (grupos.length === 0) return res.status(400).json({ error: 'Elegí al menos un grupo (orquesta o coro)' });
  if (!adminUsuario) return res.status(400).json({ error: 'Indicá el usuario administrador de la iglesia' });
  if (adminPassword.length < LARGO_MINIMO_PASSWORD) {
    return res.status(400).json({ error: `La contraseña debe tener al menos ${LARGO_MINIMO_PASSWORD} caracteres` });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const existente = await client.query('SELECT id FROM usuarios WHERE LOWER(usuario) = LOWER($1)', [adminUsuario]);
    if (existente.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ese usuario ya existe' });
    }

    const iglesia = await client.query(
      'INSERT INTO iglesias (nombre, departamento, anciano, grupos) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, departamento, anciano, grupos.join(',')]
    );
    const hash = await bcrypt.hash(adminPassword, 10);
    await client.query(
      'INSERT INTO usuarios (usuario, password, rol, nombre_completo, iglesia_id) VALUES ($1, $2, $3, $4, $5)',
      [adminUsuario, hash, 'admin', adminUsuario, iglesia.rows[0].id]
    );

    await client.query('COMMIT');
    console.log(`⛪ Iglesia creada: ${nombre} (${grupos.join(', ')}) · admin: ${adminUsuario}`);
    res.status(201).json({ success: true, iglesia: configDeIglesia(iglesia.rows[0]) });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creando iglesia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    client.release();
  }
});

// Editar datos de una iglesia - PUT /api/iglesias/:id
router.put('/:id', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const grupos = normalizarGrupos(req.body.grupos);
    if (!nombre) return res.status(400).json({ error: 'El nombre de la iglesia es requerido' });
    if (grupos.length === 0) return res.status(400).json({ error: 'Elegí al menos un grupo (orquesta o coro)' });

    const result = await db.query(
      `UPDATE iglesias
       SET nombre = $1, departamento = $2, anciano = $3, grupos = $4, activa = $5
       WHERE id = $6 RETURNING *`,
      [
        nombre,
        String(req.body.departamento || '').trim() || null,
        String(req.body.anciano || '').trim() || null,
        grupos.join(','),
        req.body.activa !== false,
        req.params.id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Iglesia no encontrada' });
    }
    res.json({ success: true, iglesia: configDeIglesia(result.rows[0]) });
  } catch (error) {
    console.error('Error actualizando iglesia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
