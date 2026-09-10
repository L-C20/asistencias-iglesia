const express = require('express');
const db = require('../database');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

// ===== GET Estadísticas grupo =====
router.get('/estadisticas/:grupo', verifyToken, async (req, res) => {
    try {
        const { grupo } = req.params;

        if (!['coro', 'orquesta'].includes(grupo)) {
            return res.status(400).json({ error: 'Grupo inválido' });
        }

        const result = await db.query(`
            SELECT 
                DATE_TRUNC('month', ra.fecha) as mes,
                COUNT(*) as total_registros,
                SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END) as presentes,
                SUM(CASE WHEN ra.presente = false THEN 1 ELSE 0 END) as ausentes,
                ROUND(100.0 * SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END) / COUNT(*), 2) as porcentaje
            FROM registro_asistencia ra
            INNER JOIN miembros m ON ra.miembro_id = m.id
            WHERE m.grupo = $1
            GROUP BY DATE_TRUNC('month', ra.fecha)
            ORDER BY mes DESC
        `, [grupo]);

        res.json(result.rows);
    } catch (error) {
        console.error('Error en estadísticas:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// ===== GET Reporte por miembro con historial de eventos =====
router.get('/por-miembro/:miembroId', verifyToken, async (req, res) => {
    try {
        const { miembroId } = req.params;
        const { tipo_evento, fecha_inicio, fecha_fin } = req.query;

        let query = `
            SELECT 
                ra.id,
                ra.fecha,
                ra.tipo_evento,
                ra.presente,
                ra.nota,
                COUNT(*) OVER() as total_registros,
                SUM(CASE WHEN ra.presente = true THEN 1 ELSE 0 END) OVER() as presentes,
                SUM(CASE WHEN ra.presente = false THEN 1 ELSE 0 END) OVER() as ausentes,
                SUM(CASE WHEN ra.presente IS NULL THEN 1 ELSE 0 END) OVER() as justificados
            FROM registro_asistencia ra
            WHERE ra.miembro_id = $1
        `;

        const params = [miembroId];
        let paramIndex = 2;

        // Filtro por tipo de evento
        if (tipo_evento && tipo_evento !== 'todos') {
            query += ` AND ra.tipo_evento = $${paramIndex}`;
            params.push(tipo_evento);
            paramIndex++;
        }

        // Filtro por fecha inicio
        if (fecha_inicio) {
            query += ` AND ra.fecha >= $${paramIndex}`;
            params.push(fecha_inicio);
            paramIndex++;
        }

        // Filtro por fecha fin
        if (fecha_fin) {
            query += ` AND ra.fecha <= $${paramIndex}`;
            params.push(fecha_fin);
            paramIndex++;
        }

        query += ` ORDER BY ra.fecha DESC`;

        const result = await db.query(query, params);

        if (result.rows.length === 0) {
            return res.json({
                total: 0,
                presentes: 0,
                ausentes: 0,
                justificados: 0,
                eventos: []
            });
        }

        // Extraer totales del primer registro (son iguales en todos)
        const totales = result.rows[0];

        // Mapear eventos
        const eventos = result.rows.map(row => ({
            id: row.id,
            fecha: row.fecha,
            tipo_evento: row.tipo_evento,
            presente: row.presente,
            nota: row.nota
        }));

        res.json({
            total: parseInt(totales.total_registros) || 0,
            presentes: parseInt(totales.presentes) || 0,
            ausentes: parseInt(totales.ausentes) || 0,
            justificados: parseInt(totales.justificados) || 0,
            eventos: eventos
        });

    } catch (error) {
        console.error('Error en por-miembro:', error);
        res.status(500).json({ error: 'Error al obtener datos del miembro' });
    }
});

// ===== GET Exportar reporte =====
router.get('/exportar/:grupo/:fechaInicio/:fechaFin', verifyToken, async (req, res) => {
    try {
        const { grupo, fechaInicio, fechaFin } = req.params;

        if (!['coro', 'orquesta'].includes(grupo)) {
            return res.status(400).json({ error: 'Grupo inválido' });
        }

        const result = await db.query(`
            SELECT 
                m.nombre,
                m.voz,
                m.instrumento,
                ra.fecha,
                ra.tipo_evento,
                ra.presente,
                ra.nota
            FROM registro_asistencia ra
            INNER JOIN miembros m ON ra.miembro_id = m.id
            WHERE m.grupo = $1 
            AND ra.fecha >= $2 
            AND ra.fecha <= $3
            ORDER BY m.nombre, ra.fecha DESC
        `, [grupo, fechaInicio, fechaFin]);

        // Formato CSV
        let csv = 'Nombre,Voz/Instrumento,Fecha,Tipo Evento,Estado,Nota\n';
        
        result.rows.forEach(row => {
            const voz_inst = row.voz || row.instrumento || '';
            const estado = row.presente === true ? 'Presente' : row.presente === false ? 'Ausente' : 'Justificado';
            const nota = row.nota || '';
            csv += `"${row.nombre}","${voz_inst}","${row.fecha}","${row.tipo_evento}","${estado}","${nota}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="reporte_${grupo}_${fechaInicio}_${fechaFin}.csv"`);
        res.send(csv);

    } catch (error) {
        console.error('Error en exportar:', error);
        res.status(500).json({ error: 'Error al exportar reporte' });
    }
});

module.exports = router;