// ===== MINISTERIOS (solo super administrador) =====
// Además de orquesta y coro, cada iglesia puede tener los ministerios que haga
// falta. Cada uno funciona como un grupo más (id "m<número>"): tiene sus
// integrantes y toma asistencia en reuniones de cualquier fecha.

const express = require('express');
const db = require('../database');
const mov = require('../movimientos');
const { verifyToken, verificarSuperadmin } = require('../middleware/auth');
const router = express.Router();

const MAXIMO_SUBGRUPOS = 30;

function limpiar(valor, largo) {
  return String(valor ?? '').replace(/\s+/g, ' ').trim().slice(0, largo);
}

// Subgrupos sin vacíos ni repetidos, en el orden en que se escribieron
function limpiarSubgrupos(valor) {
  const lista = Array.isArray(valor) ? valor : [];
  const vistos = new Set();
  return lista
    .map(s => limpiar(s, 60))
    .filter(s => s && !vistos.has(s.toLowerCase()) && vistos.add(s.toLowerCase()))
    .slice(0, MAXIMO_SUBGRUPOS);
}

const RESERVADOS = ['orquesta', 'coro'];

// Todos los ministerios con su iglesia - GET /api/ministerios
router.get('/', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT mi.id, mi.nombre, mi.secciones, mi.iglesia_id, i.nombre AS iglesia,
        (SELECT COUNT(*) FROM miembros m
          WHERE m.iglesia_id = mi.iglesia_id AND m.grupo = 'm' || mi.id AND m.activo = true) AS integrantes
      FROM ministerios mi
      JOIN iglesias i ON i.id = mi.iglesia_id
      ORDER BY mi.nombre, i.nombre
    `);
    res.json(r.rows.map(f => ({ ...f, integrantes: Number(f.integrantes) })));
  } catch (error) {
    console.error('Error listando ministerios:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Crea un ministerio en una o varias iglesias - POST /api/ministerios
// Body: { nombre, secciones: [], iglesias: [id] }
router.post('/', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const nombre = limpiar(req.body.nombre, 60);
    const secciones = limpiarSubgrupos(req.body.secciones);
    const ids = (Array.isArray(req.body.iglesias) ? req.body.iglesias : []).map(Number).filter(Boolean);

    if (!nombre) return res.status(400).json({ error: 'Indique el nombre del ministerio' });
    if (RESERVADOS.includes(nombre.toLowerCase())) {
      return res.status(400).json({ error: 'Orquesta y Coro se habilitan desde el formulario de la iglesia' });
    }
    if (ids.length === 0) return res.status(400).json({ error: 'Seleccione al menos una iglesia' });

    // Las iglesias que ya tienen un ministerio con ese nombre se saltean
    const r = await db.query(
      `INSERT INTO ministerios (iglesia_id, nombre, secciones)
       SELECT i.id, $1::varchar, $2::jsonb FROM iglesias i
       WHERE i.id = ANY($3::int[])
         AND NOT EXISTS (SELECT 1 FROM ministerios mi WHERE mi.iglesia_id = i.id AND LOWER(mi.nombre) = LOWER($1::varchar))
       RETURNING iglesia_id`,
      [nombre, JSON.stringify(secciones), ids]
    );

    if (r.rows.length === 0) {
      return res.status(409).json({ error: 'Las iglesias elegidas ya tienen un ministerio con ese nombre' });
    }
    for (const fila of r.rows) {
      await mov.registrar({ quien: req.user, iglesiaId: fila.iglesia_id, categoria: 'iglesias', accion: 'Creó un ministerio', detalle: nombre });
    }
    res.status(201).json({ success: true, creados: r.rows.length, omitidos: ids.length - r.rows.length });
  } catch (error) {
    console.error('Error creando ministerio:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Cambia el nombre o los subgrupos - PUT /api/ministerios/:id
router.put('/:id', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const nombre = limpiar(req.body.nombre, 60);
    const secciones = limpiarSubgrupos(req.body.secciones);
    if (!nombre) return res.status(400).json({ error: 'Indique el nombre del ministerio' });
    if (RESERVADOS.includes(nombre.toLowerCase())) {
      return res.status(400).json({ error: 'Ese nombre está reservado' });
    }

    const id = Number(req.params.id) || 0;
    const repetido = await db.query(
      `SELECT 1 FROM ministerios a JOIN ministerios b ON b.iglesia_id = a.iglesia_id AND b.id <> a.id
       WHERE a.id = $1 AND LOWER(b.nombre) = LOWER($2)`,
      [id, nombre]
    );
    if (repetido.rows.length > 0) return res.status(409).json({ error: 'Esa iglesia ya tiene un ministerio con ese nombre' });

    const r = await db.query(
      'UPDATE ministerios SET nombre = $1, secciones = $2::jsonb WHERE id = $3 RETURNING iglesia_id',
      [nombre, JSON.stringify(secciones), id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Ministerio no encontrado' });

    await mov.registrar({ quien: req.user, iglesiaId: r.rows[0].iglesia_id, categoria: 'iglesias', accion: 'Modificó un ministerio', detalle: nombre });
    res.json({ success: true });
  } catch (error) {
    console.error('Error modificando ministerio:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Elimina el ministerio con sus integrantes y su asistencia - DELETE /api/ministerios/:id
// Si tiene datos cargados hay que mandar { confirmar: true }
router.delete('/:id', verifyToken, verificarSuperadmin, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const id = Number(req.params.id) || 0;
    await client.query('BEGIN');

    const r = await client.query('SELECT iglesia_id, nombre FROM ministerios WHERE id = $1 FOR UPDATE', [id]);
    if (r.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ministerio no encontrado' });
    }
    const { iglesia_id, nombre } = r.rows[0];
    const grupo = `m${id}`;
    const alcance = [iglesia_id, grupo];

    const cuenta = await client.query('SELECT COUNT(*) AS n FROM miembros WHERE iglesia_id = $1 AND grupo = $2', alcance);
    const integrantes = Number(cuenta.rows[0].n);
    if (integrantes > 0 && req.body.confirmar !== true) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'El ministerio tiene datos cargados', integrantes });
    }

    await client.query(
      `DELETE FROM registro_asistencia
       WHERE miembro_id IN (SELECT id FROM miembros WHERE iglesia_id = $1 AND grupo = $2)`, alcance);
    await client.query('DELETE FROM miembros WHERE iglesia_id = $1 AND grupo = $2', alcance);
    await client.query('DELETE FROM eventos WHERE iglesia_id = $1 AND grupo = $2', alcance);
    await client.query('DELETE FROM inscripciones WHERE iglesia_id = $1 AND grupo = $2', alcance);
    await client.query('DELETE FROM ministerios WHERE id = $1', [id]);
    await client.query('COMMIT');

    await mov.registrar({ quien: req.user, iglesiaId: iglesia_id, categoria: 'iglesias', accion: 'Eliminó un ministerio', detalle: `${nombre} · ${integrantes} integrantes` });
    res.json({ success: true });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error eliminando ministerio:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    client.release();
  }
});

module.exports = router;
