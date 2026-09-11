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
          // Usar CAST para convertir presente a texto si es necesario
          const statsResult = await db.query(
            `SELECT 
              COUNT(*) as total_registros,
              SUM(CASE WHEN CAST(presente AS TEXT) = 'true' THEN 1 ELSE 0 END) as presentes,
              SUM(CASE WHEN CAST(presente AS TEXT) = 'false' THEN 1 ELSE 0 END) as ausentes,
              SUM(CASE WHEN CAST(presente AS TEXT) = 'justified' THEN 1 ELSE 0 END) as justificados
            FROM registro_asistencia 
            WHERE miembro_id = $1`,
            [miembro.id]
          );

          const stats = statsResult.rows[0];
          
          console.log(`  📊 ${miembro.nombre}: ${stats.total_registros} registros (P:${stats.presentes}, A:${stats.ausentes}, J:${stats.justificados})`);
          
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

    console.log('✅ Estadísticas procesadas:', estadisticas.length);
    res.json(estadisticas);

  } catch (error) {
    console.error('❌ Error en GET /estadisticas/:grupo:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Obtener detalles de asistencia por miembro
router.get('/miembro/:miembro_id', verifyToken, async (req, res) => {
  try {
    const { miembro_id } = req.params;

    const result = await db.query(
      `SELECT ra.*, m.nombre 
       FROM registro_asistencia ra
       JOIN miembros m ON ra.miembro_id = m.id
       WHERE ra.miembro_id = $1
       ORDER BY ra.fecha DESC`,
      [miembro_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error en GET /miembro/:miembro_id:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Obtener resumen por grupo
router.get('/resumen/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params;

    if (!['coro', 'orquesta'].includes(grupo)) {
      return res.status(400).json({ error: 'Grupo inválido' });
    }

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_registros,
        SUM(CASE WHEN CAST(presente AS TEXT) = 'true' THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN CAST(presente AS TEXT) = 'false' THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN CAST(presente AS TEXT) = 'justified' THEN 1 ELSE 0 END) as justificados
       FROM registro_asistencia ra
       JOIN miembros m ON ra.miembro_id = m.id
       WHERE m.grupo = $1`,
      [grupo]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Error en GET /resumen/:grupo:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;