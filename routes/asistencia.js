const express = require('express');
const db = require('../database');
const { verifyToken } = require('./auth');
const router = express.Router();

// Obtener miembros por grupo - GET /api/asistencia/miembros/:grupo
router.get('/miembros/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params;

    if (grupo !== 'orquesta') {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    const result = await db.query(
      'SELECT id, nombre, grupo, instrumento FROM miembros WHERE grupo = $1 AND activo = true ORDER BY nombre',
      [grupo]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo miembros:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Registrar asistencia - POST /api/asistencia/registrar
router.post('/registrar', verifyToken, async (req, res) => {
  try {
    const { miembro_id, tipo_evento, fecha, presente, justificado, nota } = req.body;

    if (!miembro_id || !tipo_evento || !fecha) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    // Verificar si ya existe registro para esa fecha
    const existing = await db.query(
      'SELECT id FROM registro_asistencia WHERE miembro_id = $1 AND fecha = $2 AND tipo_evento = $3',
      [miembro_id, fecha, tipo_evento]
    );

    if (existing.rows.length > 0) {
      // Actualizar registro existente
      await db.query(
        'UPDATE registro_asistencia SET presente = $1, justificado = $2, nota = $3 WHERE id = $4',
        [presente === true, justificado === true, nota || null, existing.rows[0].id]
      );
      return res.json({ success: true, message: 'Asistencia actualizada' });
    }

    // Crear nuevo registro
    await db.query(
      'INSERT INTO registro_asistencia (miembro_id, tipo_evento, fecha, presente, justificado, nota) VALUES ($1, $2, $3, $4, $5, $6)',
      [miembro_id, tipo_evento, fecha, presente === true, justificado === true, nota || null]
    );

    res.json({ success: true, message: 'Asistencia registrada' });
  } catch (error) {
    console.error('Error registrando asistencia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Registrar toda la asistencia de un evento de una vez - POST /api/asistencia/registrar-lote
// Body: { tipo_evento, fecha, registros: [{ miembro_id, presente, justificado, nota }] }
router.post('/registrar-lote', verifyToken, async (req, res) => {
  const { tipo_evento, fecha, registros } = req.body;

  if (!tipo_evento || !fecha || !Array.isArray(registros) || registros.length === 0) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Se reemplazan los registros de esos integrantes para esa fecha y evento
    const ids = registros.map(r => Number(r.miembro_id));
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
        AND m.grupo = $1
        AND ra.fecha = $2
        AND ra.tipo_evento = $3
    `, [grupo, fecha, tipoEvento]);

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
        m.instrumento
      FROM registro_asistencia ra
      JOIN miembros m ON ra.miembro_id = m.id
      WHERE m.grupo = $1 
        AND ra.fecha = $2 
        AND ra.tipo_evento = $3
      ORDER BY m.nombre
    `, [grupo, fecha, tipoEvento]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo asistencia:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Agregar nuevo miembro - POST /api/asistencia/miembro/nuevo
router.post('/miembro/nuevo', verifyToken, async (req, res) => {
  try {
    const { nombre, grupo, instrumento } = req.body;

    if (!nombre || !grupo) {
      return res.status(400).json({ error: 'Nombre y grupo requeridos' });
    }

    if (grupo !== 'orquesta') {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    const result = await db.query(
      'INSERT INTO miembros (nombre, grupo, instrumento) VALUES ($1, $2, $3) RETURNING id, nombre, grupo, instrumento',
      [nombre, grupo, instrumento || null]
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
    const { id } = req.params;

    const result = await db.query(
      'SELECT id, nombre, grupo, instrumento FROM miembros WHERE id = $1',
      [id]
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
    const { nombre, instrumento } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }

    const result = await db.query(
      'UPDATE miembros SET nombre = $1, instrumento = $2 WHERE id = $3 RETURNING id, nombre, grupo, instrumento',
      [nombre, instrumento || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }

    res.json({
      success: true,
      miembro: result.rows[0]
    });
  } catch (error) {
    console.error('Error actualizando miembro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Eliminar miembro - DELETE /api/asistencia/miembro/:id
router.delete('/miembro/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Eliminando miembro:', id);

    // Primero eliminar registros de asistencia asociados
    await db.query(
      'DELETE FROM registro_asistencia WHERE miembro_id = $1',
      [id]
    );

    // Luego eliminar el miembro
    const result = await db.query(
      'DELETE FROM miembros WHERE id = $1 RETURNING id, nombre',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Miembro no encontrado' });
    }

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

// Obtener historial de asistencia de un miembro - GET /api/asistencia/historial/:miembro_id
router.get('/historial/:miembro_id', verifyToken, async (req, res) => {
  try {
    const { miembro_id } = req.params;

    const result = await db.query(`
      SELECT 
        id,
        fecha,
        tipo_evento,
        presente,
        nota
      FROM registro_asistencia
      WHERE miembro_id = $1
      ORDER BY fecha DESC
      LIMIT 100
    `, [miembro_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;