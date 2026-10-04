// ===== INSCRIPCIÓN DE INTEGRANTES POR ENLACE =====
// Cada iglesia tiene un enlace (lo genera el super administrador). Quien lo abre
// deja su nombre, grupo y sección sin necesidad de cuenta; queda pendiente hasta
// que el encargado de la iglesia lo aprueba y recién ahí entra a la planilla.

const express = require('express');
const db = require('../database');
const { verifyToken, verificarAdmin } = require('../middleware/auth');
const { configDeIglesia, columnaSeccion } = require('../config');
const router = express.Router();

// Tope de pendientes por iglesia, para que un enlace filtrado no llene la tabla
const MAXIMO_PENDIENTES = 300;

function limpiarNombre(valor) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

async function iglesiaDelEnlace(token) {
  const r = await db.query(
    'SELECT * FROM iglesias WHERE token_inscripcion IS NOT NULL AND UPPER(token_inscripcion) = UPPER($1)',
    [token]
  );
  const fila = r.rows[0];
  return fila && fila.activa !== false ? fila : null;
}

// ---------- Parte pública ----------

// Qué pide el formulario - GET /api/inscripciones/formulario/:token
router.get('/formulario/:token', async (req, res) => {
  try {
    const fila = await iglesiaDelEnlace(req.params.token);
    if (!fila) return res.status(404).json({ error: 'Este enlace no es válido o fue dado de baja' });
    const config = configDeIglesia(fila);
    res.json({
      iglesia: config.nombre,
      grupos: config.grupos.map(g => ({ id: g.id, nombre: g.nombre, categoria: g.categoria, secciones: g.secciones }))
    });
  } catch (error) {
    console.error('Error abriendo formulario de inscripción:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// El integrante envía sus datos - POST /api/inscripciones/formulario/:token
router.post('/formulario/:token', async (req, res) => {
  try {
    const fila = await iglesiaDelEnlace(req.params.token);
    if (!fila) return res.status(404).json({ error: 'Este enlace no es válido o fue dado de baja' });

    const config = configDeIglesia(fila);
    const nombre = limpiarNombre(req.body.nombre);
    const grupo = config.grupos.find(g => g.id === req.body.grupo);
    const seccion = grupo && grupo.secciones.find(s => s === req.body.seccion);

    if (nombre.split(' ').length < 2) return res.status(400).json({ error: 'Indique su nombre y apellido' });
    if (!grupo) return res.status(400).json({ error: 'Seleccione el grupo en el que participa' });
    if (!seccion) return res.status(400).json({ error: `Seleccione su ${grupo.categoria.toLowerCase()}` });

    const repetido = await db.query(
      `SELECT 1 FROM miembros WHERE iglesia_id = $1 AND grupo = $2 AND activo = true AND LOWER(nombre) = LOWER($3)
       UNION ALL
       SELECT 1 FROM inscripciones WHERE iglesia_id = $1 AND grupo = $2 AND LOWER(nombre) = LOWER($3)`,
      [fila.id, grupo.id, nombre]
    );
    if (repetido.rows.length > 0) {
      return res.status(409).json({ error: 'Ya figura una inscripción con ese nombre. No es necesario volver a enviarla.' });
    }

    const pendientes = await db.query('SELECT COUNT(*) AS n FROM inscripciones WHERE iglesia_id = $1', [fila.id]);
    if (Number(pendientes.rows[0].n) >= MAXIMO_PENDIENTES) {
      return res.status(429).json({ error: 'Hay demasiadas inscripciones pendientes. Comuníquese con el encargado de su iglesia.' });
    }

    await db.query(
      'INSERT INTO inscripciones (iglesia_id, nombre, grupo, seccion) VALUES ($1, $2, $3, $4)',
      [fila.id, nombre, grupo.id, seccion]
    );
    console.log(`🙋 Inscripción: ${nombre} (${grupo.nombre} · ${seccion}) en ${fila.nombre}`);
    res.json({ success: true, iglesia: fila.nombre });
  } catch (error) {
    console.error('Error guardando inscripción:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ---------- Panel del encargado ----------

// Pendientes de la iglesia y su enlace - GET /api/inscripciones
router.get('/', verifyToken, verificarAdmin, async (req, res) => {
  try {
    const [pendientes, iglesia] = await Promise.all([
      db.query(
        `SELECT id, nombre, grupo, seccion, fecha_creacion FROM inscripciones
         WHERE iglesia_id = $1 ORDER BY fecha_creacion`,
        [req.user.iglesia_id]
      ),
      db.query('SELECT token_inscripcion FROM iglesias WHERE id = $1', [req.user.iglesia_id])
    ]);
    res.json({
      token: iglesia.rows[0]?.token_inscripcion || null,
      pendientes: pendientes.rows
    });
  } catch (error) {
    console.error('Error listando inscripciones:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Pasa la inscripción a la planilla - POST /api/inscripciones/:id/aprobar
router.post('/:id/aprobar', verifyToken, verificarAdmin, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      'DELETE FROM inscripciones WHERE id = $1 AND iglesia_id = $2 RETURNING nombre, grupo, seccion',
      [req.params.id, req.user.iglesia_id]
    );
    if (r.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'La inscripción ya no existe' });
    }
    const { nombre, grupo, seccion } = r.rows[0];
    const miembro = await client.query(
      `INSERT INTO miembros (nombre, grupo, ${columnaSeccion(grupo)}, iglesia_id)
       VALUES ($1, $2, $3, $4) RETURNING id, nombre, grupo`,
      [nombre, grupo, seccion, req.user.iglesia_id]
    );
    await client.query('COMMIT');
    res.json({ success: true, miembro: miembro.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error aprobando inscripción:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    client.release();
  }
});

// Rechaza una inscripción - DELETE /api/inscripciones/:id
router.delete('/:id', verifyToken, verificarAdmin, async (req, res) => {
  try {
    const r = await db.query(
      'DELETE FROM inscripciones WHERE id = $1 AND iglesia_id = $2 RETURNING id',
      [req.params.id, req.user.iglesia_id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'La inscripción ya no existe' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error rechazando inscripción:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
