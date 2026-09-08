const express = require('express');
const { pool } = require('../database');
const { verifyToken } = require('./auth');
const ExcelJS = require('exceljs');

const router = express.Router();

// ===== GET: Estadísticas por grupo =====
router.get('/estadisticas/:grupo', verifyToken, async (req, res) => {
  try {
    const { grupo } = req.params;
    
    const query = `
      SELECT 
        DATE_TRUNC('month', ra.fecha)::date as mes,
        COUNT(*) as total_registros,
        SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN ra.presente = false THEN 1 ELSE 0 END) as ausentes,
        ROUND((SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1) as porcentaje
      FROM registro_asistencia ra
      INNER JOIN miembros m ON ra.miembro_id = m.id
      WHERE m.grupo = $1
      GROUP BY DATE_TRUNC('month', ra.fecha)
      ORDER BY mes DESC
      LIMIT 12
    `;
    
    const result = await pool.query(query, [grupo]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// ===== GET: Datos por miembro con filtro de tipo evento =====
router.get('/por-miembro/:miembroId', verifyToken, async (req, res) => {
  try {
    const { miembroId } = req.params;
    const { tipo_evento } = req.query;
    
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN presente = true THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN presente = false THEN 1 ELSE 0 END) as ausentes,
        SUM(CASE WHEN presente IS NULL THEN 1 ELSE 0 END) as justificados
      FROM registro_asistencia
      WHERE miembro_id = $1
    `;
    
    const params = [miembroId];
    
    if (tipo_evento && tipo_evento !== 'todos') {
      query += ` AND tipo_evento = $2`;
      params.push(tipo_evento);
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener datos del miembro' });
  }
});

// ===== GET: Exportar Excel por grupo =====
router.get('/exportar/:grupo/:fechaInicio/:fechaFin', verifyToken, async (req, res) => {
  try {
    const { grupo, fechaInicio, fechaFin } = req.params;
    
    const miembrosQuery = `
      SELECT id, nombre, voz, instrumento
      FROM miembros
      WHERE grupo = $1 AND activo = true
      ORDER BY nombre
    `;
    
    const miembros = await pool.query(miembrosQuery, [grupo]);
    
    const asistenciaQuery = `
      SELECT ra.miembro_id, ra.fecha, ra.presente, ra.tipo_evento
      FROM registro_asistencia ra
      INNER JOIN miembros m ON ra.miembro_id = m.id
      WHERE m.grupo = $1 
        AND ra.fecha BETWEEN $2 AND $3
      ORDER BY ra.miembro_id, ra.fecha
    `;
    
    const asistencia = await pool.query(asistenciaQuery, [grupo, fechaInicio, fechaFin]);
    
    // Crear workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asistencia');
    
    // Encabezados
    worksheet.columns = [
      { header: 'Miembro', key: 'miembro', width: 25 },
      { header: 'Detalle', key: 'detalle', width: 20 },
      { header: 'Total Eventos', key: 'total', width: 15 },
      { header: 'Presentes', key: 'presentes', width: 15 },
      { header: 'Ausentes', key: 'ausentes', width: 15 },
      { header: '% Asistencia', key: 'porcentaje', width: 15 }
    ];
    
    // Datos
    miembros.rows.forEach(miembro => {
      const registros = asistencia.rows.filter(r => r.miembro_id === miembro.id);
      const presentes = registros.filter(r => r.presente === true).length;
      const ausentes = registros.filter(r => r.presente === false).length;
      const total = registros.length;
      const porcentaje = total > 0 ? ((presentes / total) * 100).toFixed(1) : 0;
      
      worksheet.addRow({
        miembro: miembro.nombre,
        detalle: grupo === 'coro' ? miembro.voz : miembro.instrumento,
        total: total,
        presentes: presentes,
        ausentes: ausentes,
        porcentaje: porcentaje + '%'
      });
    });
    
    // Estilos
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A90E2' }
    };
    
    worksheet.getRow(1).font = {
      color: { argb: 'FFFFFFFF' },
      bold: true
    };
    
    // Responder
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="asistencia_${grupo}_${new Date().toISOString().split('T')[0]}.xlsx"`);
    
    await workbook.xlsx.write(res);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al exportar' });
  }
});

module.exports = router;