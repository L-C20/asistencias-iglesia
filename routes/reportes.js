const express = require('express');
const db = require('../database');
const { verifyToken } = require('./auth');
const router = express.Router();

// Obtener estadísticas de asistencia por grupo - GET /api/reportes/estadisticas/:grupo
router.get('/estadisticas/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params; // 'coro' o 'orquesta'

    console.log('📊 Obteniendo estadísticas para:', grupo);

    if (!['coro', 'orquesta'].includes(grupo)) {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    // Obtener todos los miembros del grupo
    const miembrosResult = await db.query(
      'SELECT id, nombre, grupo, voz, instrumento FROM miembros WHERE grupo = $1 AND activo = true ORDER BY nombre',
      [grupo]
    );

    const miembros = miembrosResult.rows;
    console.log('✅ Miembros obtenidos:', miembros.length);

    // Para cada miembro, obtener sus estadísticas
    const estadisticas = await Promise.all(
      miembros.map(async (miembro) => {
        try {
          const statsResult = await db.query(
            `SELECT 
              COUNT(*) as total_registros,
              SUM(CASE WHEN presente = 'true' OR presente = true THEN 1 ELSE 0 END) as presentes,
              SUM(CASE WHEN presente = 'false' OR presente = false THEN 1 ELSE 0 END) as ausentes,
              SUM(CASE WHEN presente = 'justified' THEN 1 ELSE 0 END) as justificados
            FROM registro_asistencia 
            WHERE miembro_id = $1`,
            [miembro.id]
          );

          const stats = statsResult.rows[0];
          
          console.log(`  📊 ${miembro.nombre}: ${stats.total_registros} registros`);
          
          return {
            miembro_id: miembro.id,
            nombre: miembro.nombre || 'Sin nombre',
            grupo: miembro.grupo,
            voz: miembro.voz || null,
            instrumento: miembro.instrumento || null,
            total_registros: parseInt(stats.total_registros) || 0,
            presentes: parseInt(stats.presentes) || 0,
            ausentes: parseInt(stats.ausentes) || 0,
            justificados: parseInt(stats.justificados) || 0
          };
        } catch (memberError) {
          console.error(`  ❌ Error procesando miembro ${miembro.id}:`, memberError.message);
          // Retornar miembro con estadísticas vacías
          return {
            miembro_id: miembro.id,
            nombre: miembro.nombre || 'Sin nombre',
            grupo: miembro.grupo,
            voz: miembro.voz || null,
            instrumento: miembro.instrumento || null,
            total_registros: 0,
            presentes: 0,
            ausentes: 0,
            justificados: 0
          };
        }
      })
    );

    console.log('📊 Estadísticas procesadas:', estadisticas.length);
    res.json(estadisticas);
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({ error: 'Error en el servidor: ' + error.message });
  }
});

// Obtener reporte detallado de un miembro - GET /api/reportes/miembro/:miembro_id
router.get('/miembro/:miembro_id', verifyToken, async (req, res) => {
  try {
    const { miembro_id } = req.params;

    const result = await db.query(
      `SELECT 
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
      LIMIT 50`,
      [miembro_id]
    );

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

    // Contar miembros activos
    const miembrosResult = await db.query(
      'SELECT COUNT(*) as count FROM miembros WHERE grupo = $1 AND activo = true',
      [grupo]
    );

    // Obtener estadísticas de asistencia
    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_registros,
        SUM(CASE WHEN presente = 'true' OR presente = true THEN 1 ELSE 0 END) as total_presentes,
        SUM(CASE WHEN presente = 'false' OR presente = false THEN 1 ELSE 0 END) as total_ausentes,
        SUM(CASE WHEN presente = 'justified' THEN 1 ELSE 0 END) as total_justificados
      FROM registro_asistencia ra
      JOIN miembros m ON ra.miembro_id = m.id
      WHERE m.grupo = $1`,
      [grupo]
    );

    const stats = statsResult.rows[0];

    res.json({
      total_miembros: parseInt(miembrosResult.rows[0].count) || 0,
      total_registros: parseInt(stats.total_registros) || 0,
      total_presentes: parseInt(stats.total_presentes) || 0,
      total_ausentes: parseInt(stats.total_ausentes) || 0,
      total_justificados: parseInt(stats.total_justificados) || 0
    });
  } catch (error) {
    console.error('Error obteniendo resumen:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;