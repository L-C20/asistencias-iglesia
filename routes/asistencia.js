const express = require('express');
const db = require('../database');
const { verifyToken } = require('./auth');
const router = express.Router();

// Obtener miembros por grupo - GET /api/asistencia/miembros/:grupo
router.get('/miembros/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params; // 'coro' o 'orquesta'

    if (!['coro', 'orquesta'].includes(grupo)) {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    const result = await db.query(
      'SELECT id, nombre, grupo, voz, instrumento FROM miembros WHERE grupo = $1 AND activo = true ORDER BY nombre',
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
    const { miembro_id, tipo_evento, fecha, presente, nota } = req.body;

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
        'UPDATE registro_asistencia SET presente = $1, nota = $2 WHERE id = $3',
        [presente, nota || null, existing.rows[0].id]
      );
      return res.json({ success: true, message: 'Asistencia actualizada' });
    }

    // Crear nuevo registro
    await db.query(
      'INSERT INTO registro_asistencia (miembro_id, tipo_evento, fecha, presente, nota) VALUES ($1, $2, $3, $4, $5)',
      [miembro_id, tipo_evento, fecha, presente, nota || null]
    );

    res.json({ success: true, message: 'Asistencia registrada' });
  } catch (error) {
    console.error('Error registrando asistencia:', error);
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
        ra.nota,
        m.nombre,
        m.grupo,
        m.voz,
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
    const { nombre, grupo, voz, instrumento } = req.body;

    if (!nombre || !grupo) {
      return res.status(400).json({ error: 'Nombre y grupo requeridos' });
    }

    if (!['coro', 'orquesta'].includes(grupo)) {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    const result = await db.query(
      'INSERT INTO miembros (nombre, grupo, voz, instrumento) VALUES ($1, $2, $3, $4) RETURNING id, nombre, grupo, voz, instrumento',
      [nombre, grupo, voz || null, instrumento || null]
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
      'SELECT id, nombre, grupo, voz, instrumento FROM miembros WHERE id = $1',
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
    const { nombre, voz, instrumento } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }

    const result = await db.query(
      'UPDATE miembros SET nombre = $1, voz = $2, instrumento = $3 WHERE id = $4 RETURNING id, nombre, grupo, voz, instrumento',
      [nombre, voz || null, instrumento || null, id]
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