const express = require('express');
const db = require('../database');
const { verifyToken } = require('./auth');
const router = express.Router();

// Obtener estadísticas de asistencia por grupo - GET /api/reportes/estadisticas/:grupo
router.get('/estadisticas/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params; // 'coro' o 'orquesta'

    if (!['coro', 'orquesta'].includes(grupo)) {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    // Query que obtiene estadísticas por miembro
    const result = await db.query(`
      SELECT 
        m.id as miembro_id,
        m.nombre,
        m.grupo,
        m.voz,
        m.instrumento,
        COUNT(ra.id) as total_registros,
        SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN ra.presente = false THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN ra.presente = 'justified' THEN 1 ELSE 0 END) as justificados
      FROM miembros m
      LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id
      WHERE m.grupo = $1 AND m.activo = true
      GROUP BY m.id, m.nombre, m.grupo, m.voz, m.instrumento
      ORDER BY m.nombre
    `, [grupo]);

    console.log(`📊 Estadísticas para ${grupo}:`, result.rows.length, 'miembros');

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener reporte detallado de un miembro - GET /api/reportes/miembro/:miembro_id
router.get('/miembro/:miembro_id', verifyToken, async (req, res) => {
  try {
    const { miembro_id } = req.params;

    const result = await db.query(`
      SELECT 
        ra.id,
        ra.fecha,
        ra.tipo_evento,
        ra.presente,
        ra.nota,
        m.nombre,
        m.grupo
      FROM registro_asistencia ra
      JOIN miembros m ON ra.miembro_id = m.id
      WHERE m.id = $1
      ORDER BY ra.fecha DESC
      LIMIT 50
    `, [miembro_id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo reporte de miembro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener resumen general de asistencia - GET /api/reportes/resumen/:grupo
router.get('/resumen/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params;

    if (!['coro', 'orquesta'].includes(grupo)) {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT m.id) as total_miembros,
        COUNT(ra.id) as total_registros,
        SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END) as total_presentes,
        SUM(CASE WHEN ra.presente = false THEN 1 ELSE 0 END) as total_ausentes,
        SUM(CASE WHEN ra.presente = 'justified' THEN 1 ELSE 0 END) as total_justificados
      FROM miembros m
      LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id
      WHERE m.grupo = $1 AND m.activo = true
    `, [grupo]);

    res.json(result.rows[0] || {
      total_miembros: 0,
      total_registros: 0,
      total_presentes: 0,
      total_ausentes: 0,
      total_justificados: 0
    });
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;