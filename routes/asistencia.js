const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');
const { grupoValidoEn, columnaSeccion, normalizarDni, normalizarFechaNacimiento } = require('../config');
const router = express.Router();

// Todo lo que se lee o escribe acá pertenece a la iglesia del usuario logueado
// (req.user.iglesia_id). Ninguna consulta debe salir de ese alcance.

// La "sección" de un integrante es su instrumento (orquesta) o su cuerda (coro)
const SECCION_SQL = "CASE WHEN m.grupo = 'coro' THEN m.voz ELSE m.instrumento END AS seccion";

// Datos personales de un integrante; la fecha sale como texto YYYY-MM-DD
const PERSONALES_SQL = "m.dni, TO_CHAR(m.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento";

// DNI y fecha de nacimiento son opcionales, pero si vienen tienen que ser válidos.
// Devuelve { dni, fecha } o { error }.
function datosPersonales(body) {
  const dniCrudo = String(body.dni ?? '').trim();
  const fechaCruda = String(body.fecha_nacimiento ?? '').trim();
  const dni = dniCrudo ? normalizarDni(dniCrudo) : null;
  const fecha = fechaCruda ? normalizarFechaNacimiento(fechaCruda) : null;
  if (dniCrudo && !dni) return { error: 'El DNI debe tener entre 6 y 9 dígitos' };
  if (fechaCruda && !fecha) return { error: 'La fecha de nacimiento no es válida' };
  return { dni, fecha };
}

async function grupoHabilitado(iglesiaId, grupo) {
  const r = await db.query('SELECT * FROM iglesias WHERE id = $1', [iglesiaId]);
  return r.rows.length > 0 && grupoValidoEn(r.rows[0], grupo);
}

// Las iglesias que no registran bautismos tampoco los pueden cargar
async function eventoHabilitado(iglesiaId, tipoEvento) {
  if (tipoEvento !== 'bautismo') return true;
  const r = await db.query('SELECT bautismos FROM iglesias WHERE id = $1', [iglesiaId]);
  return r.rows.length > 0 && r.rows[0].bautismos === true;
}

// Obtener miembros por grupo - GET /api/asistencia/miembros/:grupo
router.get('/miembros/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params;

    if (!(await grupoHabilitado(req.user.iglesia_id, grupo))) {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    const result = await db.query(
      `SELECT m.id, m.nombre, m.grupo, ${SECCION_SQL}, ${PERSONALES_SQL}
       FROM miembros m
       WHERE m.iglesia_id = $1 AND m.grupo = $2 AND m.activo = true
       ORDER BY m.nombre`,
      [req.user.iglesia_id, grupo]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo miembros:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Registrar toda la asistencia de un evento de una vez - POST /api/asistencia/registrar-lote
// Body: { grupo, tipo_evento, fecha, descripcion, registros: [{ miembro_id, presente, justificado, nota }] }
router.post('/registrar-lote', verifyToken, async (req, res) => {
  const { grupo, tipo_evento, fecha, registros } = req.body;
  const descripcion = String(req.body.descripcion || '').trim().slice(0, 200);

  if (!tipo_evento || !fecha || !Array.isArray(registros) || registros.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  if (!(await eventoHabilitado(req.user.iglesia_id, tipo_evento))) {
    return res.status(400).json({ error: 'Esta iglesia no registra bautismos' });
  }

  const ids = registros.map(r => Number(r.miembro_id));

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Todos los integrantes tienen que ser de esta iglesia
    const propios = await client.query(
      'SELECT COUNT(*) FROM miembros WHERE id = ANY($1::int[]) AND iglesia_id = $2',
      [ids, req.user.iglesia_id]
    );
    if (Number(propios.rows[0].count) !== new Set(ids).size) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Hay integrantes que no pertenecen a esta iglesia' });
    }

    // Se reemplazan los registros de esos integrantes para esa fecha y evento
    await client.query(
      'DELETE FROM registro_asistencia WHERE tipo_evento = $1 AND fecha = $2 AND miembro_id = ANY($3::int[])',
      [tipo_evento, fecha, ids]
    );

    const valores = [];
    const params = [];
    registros.forEach((r, i) => {
      const b = i * 6;
      valores.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6})`);
      params.push(Number(r.miembro_id), tipo_evento, fecha, r.presente === true, r.justificado === true, r.nota || null);
    });
    await client.query(
      `INSERT INTO registro_asistencia (miembro_id, tipo_evento, fecha, presente, justificado, nota) VALUES ${valores.join(', ')}`,
      params
    );

    // Nota del evento: se guarda si hay texto; si quedó vacía, se borra
    if (grupo) {
      if (descripcion) {
        await client.query(
          `INSERT INTO eventos (iglesia_id, grupo, tipo_evento, fecha, descripcion)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (iglesia_id, grupo, tipo_evento, fecha) DO UPDATE SET descripcion = EXCLUDED.descripcion`,
          [req.user.iglesia_id, grupo, tipo_evento, fecha, descripcion]
        );
      } else {
        await client.query(
          'DELETE FROM eventos WHERE iglesia_id = $1 AND grupo = $2 AND tipo_evento = $3 AND fecha = $4',
          [req.user.iglesia_id, grupo, tipo_evento, fecha]
        );
      }
    }

    await client.query('COMMIT');
    console.log(`💾 Lote guardado: ${tipo_evento} ${fecha} (${registros.length} registros)`);
    res.json({ success: true, guardados: registros.length });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error guardando lote de asistencia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  } finally {
    client.release();
  }
});

// Eliminar un evento completo - DELETE /api/asistencia/evento/:grupo/:fecha/:tipoEvento
router.delete('/evento/:grupo/:fecha/:tipoEvento', verifyToken, async (req, res) => {
  try {
    const { grupo, fecha, tipoEvento } = req.params;

    const result = await db.query(`
      DELETE FROM registro_asistencia ra
      USING miembros m
      WHERE ra.miembro_id = m.id
        AND m.iglesia_id = $1
        AND m.grupo = $2
        AND ra.fecha = $3
        AND ra.tipo_evento = $4
    `, [req.user.iglesia_id, grupo, fecha, tipoEvento]);

    await db.query(
      'DELETE FROM eventos WHERE iglesia_id = $1 AND grupo = $2 AND tipo_evento = $3 AND fecha = $4',
      [req.user.iglesia_id, grupo, tipoEvento, fecha]
    );

    console.log(`🗑️ Evento eliminado: ${tipoEvento} ${fecha} (${result.rowCount} registros)`);
    res.json({ success: true, eliminados: result.rowCount });
  } catch (error) {
    console.error('Error eliminando evento:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener asistencia de una fecha - GET /api/asistencia/:grupo/:fecha/:tipoEvento
router.get('/:grupo/:fecha/:tipoEvento', verifyToken, async (req, res) => {
  try {
    const { grupo, fecha, tipoEvento } = req.params;

    const result = await db.query(`
      SELECT
        ra.id,
        ra.miembro_id,
        ra.presente,
        ra.justificado,
        ra.nota,
        m.nombre,
        m.grupo,
        ${SECCION_SQL}
      FROM registro_asistencia ra
      JOIN miembros m ON ra.miembro_id = m.id
      WHERE m.iglesia_id = $1
        AND m.grupo = $2
        AND ra.fecha = $3
        AND ra.tipo_evento = $4
      ORDER BY m.nombre
    `, [req.user.iglesia_id, grupo, fecha, tipoEvento]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo asistencia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Agregar nuevo miembro - POST /api/asistencia/miembro/nuevo
router.post('/miembro/nuevo', verifyToken, async (req, res) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const { grupo } = req.body;
    // `seccion` es el nombre nuevo; `instrumento` se acepta por compatibilidad
    const seccion = req.body.seccion || req.body.instrumento || null;

    if (!nombre || !grupo) {
      return res.status(400).json({ error: 'Nombre y grupo requeridos' });
    }

    if (!(await grupoHabilitado(req.user.iglesia_id, grupo))) {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    const personales = datosPersonales(req.body);
    if (personales.error) return res.status(400).json({ error: personales.error });

    const result = await db.query(
      `INSERT INTO miembros (nombre, grupo, ${columnaSeccion(grupo)}, iglesia_id, dni, fecha_nacimiento)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, nombre, grupo, $3::text AS seccion`,
      [nombre, grupo, seccion, req.user.iglesia_id, personales.dni, personales.fecha]
    );

    res.json({
      success: true,
      miembro: result.rows[0]
    });
  } catch (error) {
    console.error('Error agregando miembro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener un miembro específico - GET /api/asistencia/miembro/:id
router.get('/miembro/:id', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.nombre, m.grupo, ${SECCION_SQL}, ${PERSONALES_SQL} FROM miembros m WHERE m.id = $1 AND m.iglesia_id = $2`,
      [req.params.id, req.user.iglesia_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo miembro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Actualizar miembro - PUT /api/asistencia/miembro/:id
router.put('/miembro/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const nombre = String(req.body.nombre || '').trim();
    const seccion = req.body.seccion || req.body.instrumento || null;

    if (!nombre) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }

    const personales = datosPersonales(req.body);
    if (personales.error) return res.status(400).json({ error: personales.error });

    // La columna depende del grupo al que pertenece el integrante
    const actual = await db.query('SELECT grupo FROM miembros WHERE id = $1 AND iglesia_id = $2', [id, req.user.iglesia_id]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }

    const result = await db.query(
      `UPDATE miembros SET nombre = $1, ${columnaSeccion(actual.rows[0].grupo)} = $2,
         dni = $5, fecha_nacimiento = $6
       WHERE id = $3 AND iglesia_id = $4
       RETURNING id, nombre, grupo, $2::text AS seccion`,
      [nombre, seccion, id, req.user.iglesia_id, personales.dni, personales.fecha]
    );

    res.json({
      success: true,
      miembro: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando miembro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar miembro (y su asistencia) - DELETE /api/asistencia/miembro/:id
router.delete('/miembro/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const propio = await db.query('SELECT id FROM miembros WHERE id = $1 AND iglesia_id = $2', [id, req.user.iglesia_id]);
    if (propio.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }

    await db.query('DELETE FROM registro_asistencia WHERE miembro_id = $1', [id]);
    const result = await db.query('DELETE FROM miembros WHERE id = $1 RETURNING id, nombre', [id]);

    console.log('✅ Miembro eliminado:', result.rows[0].nombre);

    res.json({
      success: true,
      message: 'Miembro eliminado correctamente',
      miembro: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error eliminando miembro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
