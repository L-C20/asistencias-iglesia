const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { verifyToken, verificarSuperadmin, puedeVerTodas } = require('../middleware/auth');
const { configDeIglesia, normalizarGrupos, normalizarDiasCulto, DIAS_CULTO_POR_DEFECTO } = require('../config');
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
      esSuperadmin: req.user.rol === 'superadmin',
      // Permiso de solo lectura sobre la asistencia de las demás iglesias
      verTodas: await puedeVerTodas(req.user.id, req.user.rol)
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
  // Sin el dato (una pantalla vieja) se usan los días de siempre
  const diasCulto = req.body.dias_culto === undefined
    ? DIAS_CULTO_POR_DEFECTO
    : normalizarDiasCulto(req.body.dias_culto);
  const adminUsuario = String(req.body.admin_usuario || '').trim();
  const adminPassword = String(req.body.admin_password || '');

  if (!nombre) return res.status(400).json({ error: 'El nombre de la iglesia es requerido' });
  if (grupos.length === 0) return res.status(400).json({ error: 'Elegí al menos un grupo (orquesta o coro)' });
  if (diasCulto.length === 0) return res.status(400).json({ error: 'Elegí al menos un día de culto' });
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
      `INSERT INTO iglesias (nombre, departamento, anciano, grupos, dias_culto, bautismos)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre, departamento, anciano, grupos.join(','), diasCulto.join(','), req.body.bautismos === true]
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
    // Si no viene el dato (pantallas viejas), la iglesia conserva sus días
    const dias = req.body.dias_culto === undefined ? null : normalizarDiasCulto(req.body.dias_culto);
    if (!nombre) return res.status(400).json({ error: 'El nombre de la iglesia es requerido' });
    if (grupos.length === 0) return res.status(400).json({ error: 'Elegí al menos un grupo (orquesta o coro)' });
    if (dias && dias.length === 0) return res.status(400).json({ error: 'Elegí al menos un día de culto' });

    const result = await db.query(
      `UPDATE iglesias
       SET nombre = $1, departamento = $2, anciano = $3, grupos = $4, activa = $5,
           dias_culto = COALESCE($6, dias_culto),
           bautismos = COALESCE($7, bautismos)
       WHERE id = $8 RETURNING *`,
      [
        nombre,
        String(req.body.departamento || '').trim() || null,
        String(req.body.anciano || '').trim() || null,
        grupos.join(','),
        req.body.activa !== false,
        dias ? dias.join(',') : null,
        req.body.bautismos === undefined ? null : req.body.bautismos === true,
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

// Qué se perdería al eliminar una iglesia - GET /api/iglesias/:id/borrado
router.get('/:id/borrado', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const datos = await contarDatosDe(req.params.id);
    if (!datos) return res.status(404).json({ error: 'Iglesia no encontrada' });
    res.json({ ...datos, ...motivoParaNoBorrar(datos, req.user.iglesia_id) });
  } catch (error) {
    console.error('Error contando datos de la iglesia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar una iglesia con todo lo suyo - DELETE /api/iglesias/:id
// Body: { nombre } — el nombre escrito a mano, como confirmación
router.delete('/:id', verifyToken, verificarSuperadmin, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const datos = await contarDatosDe(req.params.id);
    if (!datos) return res.status(404).json({ error: 'Iglesia no encontrada' });

    const impedimento = motivoParaNoBorrar(datos, req.user.iglesia_id);
    if (impedimento.motivo) return res.status(409).json({ error: impedimento.motivo });

    // La confirmación se vuelve a comprobar acá: el botón del panel no alcanza
    const escrito = String(req.body.nombre || '').trim().toLowerCase();
    if (escrito !== datos.nombre.trim().toLowerCase()) {
      return res.status(400).json({ error: 'El nombre escrito no coincide con el de la iglesia' });
    }

    const id = Number(req.params.id);
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM registro_asistencia
       WHERE miembro_id IN (SELECT id FROM miembros WHERE iglesia_id = $1)`, [id]);
    await client.query('DELETE FROM eventos WHERE iglesia_id = $1', [id]);
    await client.query('DELETE FROM miembros WHERE iglesia_id = $1', [id]);
    await client.query('DELETE FROM usuarios WHERE iglesia_id = $1', [id]);
    // La solicitud que le dio origen queda como registro, sin apuntar a nada
    await client.query('UPDATE solicitudes SET iglesia_id = NULL WHERE iglesia_id = $1', [id]);
    await client.query('DELETE FROM iglesias WHERE id = $1', [id]);
    await client.query('COMMIT');

    console.log(`🗑️ Iglesia eliminada: ${datos.nombre} (${datos.integrantes} integrantes, ${datos.usuarios} usuarios, ${datos.registros} registros)`);
    res.json({ success: true, ...datos });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error eliminando iglesia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    client.release();
  }
});

// Cuánto hay cargado en una iglesia; null si no existe
async function contarDatosDe(id) {
  const r = await db.query(`
    SELECT i.nombre,
      (SELECT COUNT(*) FROM miembros m WHERE m.iglesia_id = i.id) AS integrantes,
      (SELECT COUNT(*) FROM usuarios u WHERE u.iglesia_id = i.id) AS usuarios,
      (SELECT COUNT(*) FROM usuarios u WHERE u.iglesia_id = i.id AND u.rol = 'superadmin') AS superadmins,
      (SELECT COUNT(*) FROM eventos e WHERE e.iglesia_id = i.id) AS eventos,
      (SELECT COUNT(*) FROM registro_asistencia ra
        WHERE ra.miembro_id IN (SELECT id FROM miembros WHERE iglesia_id = i.id)) AS registros
    FROM iglesias i WHERE i.id = $1
  `, [id]);
  if (r.rows.length === 0) return null;
  const f = r.rows[0];
  return {
    id: Number(id),
    nombre: f.nombre,
    integrantes: Number(f.integrantes),
    usuarios: Number(f.usuarios),
    superadmins: Number(f.superadmins),
    eventos: Number(f.eventos),
    registros: Number(f.registros)
  };
}

// Dos iglesias no se pueden borrar: sobre la que se está trabajando y la que
// tiene al super administrador, que si no se borraría a sí mismo
function motivoParaNoBorrar(datos, iglesiaDelUsuario) {
  if (datos.id === Number(iglesiaDelUsuario)) {
    return { motivo: 'No podés eliminar la iglesia sobre la que estás trabajando. Cambiá a otra y volvé a intentarlo.' };
  }
  if (datos.superadmins > 0) {
    return { motivo: 'Esta iglesia tiene al super administrador. Movelo a otra iglesia antes de eliminarla.' };
  }
  return { motivo: null };
}

module.exports = router;
