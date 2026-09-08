const express = require('express');
const db = require('../database');
const { verifyToken } = require('./auth');
const ExcelJS = require('exceljs');
const router = express.Router();

// Obtener estadísticas de asistencia por mes - GET /api/reportes/estadisticas/:grupo
router.get('/estadisticas/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params;

    const result = await db.query(`
      SELECT 
        DATE_TRUNC('month', ra.fecha)::date AS mes,
        COUNT(*) AS total_registros,
        SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END) AS presentes,
        SUM(CASE WHEN ra.presente = false THEN 1 ELSE 0 END) AS ausentes,
        ROUND(
          (SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100), 
          2
        ) AS porcentaje
      FROM registro_asistencia ra
      JOIN miembros m ON ra.miembro_id = m.id
      WHERE m.grupo = $1
      GROUP BY DATE_TRUNC('month', ra.fecha)
      ORDER BY mes DESC
      LIMIT 12
    `, [grupo]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error en estadísticas:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Obtener asistencia por miembro - GET /api/reportes/por-miembro/:grupo/:mes
router.get('/por-miembro/:grupo/:mes', verifyToken, async (req, res) => {
  try {
    const { grupo, mes } = req.params;

    const result = await db.query(`
      SELECT 
        m.id,
        m.nombre,
        m.grupo,
        COUNT(*) AS total_eventos,
        SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END) AS asistencias,
        ROUND(
          (SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100), 
          2
        ) AS porcentaje
      FROM miembros m
      LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id 
        AND DATE_TRUNC('month', ra.fecha)::date = $1::date
      WHERE m.grupo = $2 AND m.activo = true
      GROUP BY m.id, m.nombre, m.grupo
      ORDER BY porcentaje DESC, m.nombre
    `, [mes, grupo]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error en por-miembro:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Exportar asistencia a Excel - GET /api/reportes/exportar/:grupo/:fechaInicio/:fechaFin
router.get('/exportar/:grupo/:fechaInicio/:fechaFin', verifyToken, async (req, res) => {
  try {
    const { grupo, fechaInicio, fechaFin } = req.params;

    // Obtener todos los datos
    const datos = await db.query(`
      SELECT 
        m.nombre,
        m.grupo,
        ra.fecha,
        ra.tipo_evento,
        ra.presente,
        ra.nota
      FROM registro_asistencia ra
      JOIN miembros m ON ra.miembro_id = m.id
      WHERE m.grupo = $1 
        AND ra.fecha >= $2 
        AND ra.fecha <= $3
      ORDER BY m.nombre, ra.fecha
    `, [grupo, fechaInicio, fechaFin]);

    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(grupo.toUpperCase());

    // Headers
    worksheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 25 },
      { header: 'Grupo', key: 'grupo', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo Evento', key: 'tipo_evento', width: 15 },
      { header: 'Presente', key: 'presente', width: 10 },
      { header: 'Nota', key: 'nota', width: 20 }
    ];

    // Styles header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };

    // Agregar datos
    datos.rows.forEach(row => {
      worksheet.addRow({
        nombre: row.nombre,
        grupo: row.grupo,
        fecha: new Date(row.fecha).toLocaleDateString('es-AR'),
        tipo_evento: row.tipo_evento === 'santo_culto' ? 'Santo Culto' : 'Ensayo',
        presente: row.presente ? 'Presente' : 'Ausente',
        nota: row.nota || ''
      });
    });

    // Generar archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=asistencia-${grupo}-${new Date().toISOString().split('T')[0]}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error exportando:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Estadísticas generales - GET /api/reportes/general
router.get('/general', verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        m.grupo,
        COUNT(DISTINCT m.id) AS total_miembros,
        COUNT(DISTINCT ra.id) AS total_registros,
        SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END) AS total_presentes
      FROM miembros m
      LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id
      WHERE m.activo = true
      GROUP BY m.grupo
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error en general:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;