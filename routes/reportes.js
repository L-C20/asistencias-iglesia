const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const db = require('../database');

// ===== CONTEOS DE EVENTOS =====
router.get('/conteos/:grupo', verifyToken, async (req, res) => {
    try {
        const { grupo } = req.params;
        
        const result = await db.query(`
            SELECT
                tipo_evento,
                COUNT(*) as total
            FROM registro_asistencia
            WHERE tipo_evento IN ('santo_culto', 'ensayo', 'bautismo')
            AND miembro_id IN (
                SELECT id FROM miembros WHERE grupo = $1
            )
            GROUP BY tipo_evento
        `, [grupo]);
        
        console.log('📊 Resultado conteos:', result.rows);
        
        const conteos = {
            santo_culto: 0,
            ensayo: 0,
            bautismo: 0
        };
        
        result.rows.forEach(row => {
            const tipo = row.tipo_evento.toLowerCase().replace(' ', '_');
            conteos[tipo] = row.total;
        });
        
        res.json(conteos);
    } catch (error) {
        console.error('❌ Error en conteos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== DATOS DE UN EVENTO ESPECÍFICO =====
router.get('/evento/:grupo', verifyToken, async (req, res) => {
    try {
        const { grupo } = req.params;
        const { tipo_evento } = req.query;

        console.log(`🎯 Obteniendo datos: grupo=${grupo}, evento=${tipo_evento}`);

        if (!tipo_evento) {
            return res.status(400).json({ error: 'tipo_evento es requerido' });
        }

        const result = await db.query(`
            SELECT
                m.id,
                m.nombre,
                COALESCE(m.apellido, '') as apellido,
                COALESCE(m.instrumento, '') as instrumento,
                COALESCE(m.voz, '') as voz,
                ra.fecha,
                COALESCE(CAST(ra.presente AS boolean), false) as presente,
                CASE
                    WHEN ra.justificado IS NULL THEN false
                    WHEN ra.justificado::text = 'true' THEN true
                    WHEN ra.justificado::text = 'justified' THEN true
                    ELSE CAST(ra.justificado AS boolean)
                END as justified,
                COALESCE(ra.nota, '') as nota
            FROM miembros m
            LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id
                AND ra.tipo_evento = $2
            WHERE m.grupo = $1
            ORDER BY m.nombre, m.apellido, ra.fecha DESC
        `, [grupo, tipo_evento]);

        console.log('📋 Registros encontrados:', result.rows.length);

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en evento:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({
            error: error.message,
            details: error.toString(),
            query: 'SELECT from miembros LEFT JOIN registro_asistencia'
        });
    }
});

// ===== ESTADÍSTICAS (MANTENER COMPATIBILIDAD) =====
router.get('/estadisticas/:grupo', verifyToken, async (req, res) => {
    try {
        const { grupo } = req.params;
        
        const result = await db.query(`
            SELECT 
                m.id,
                m.nombre,
                m.apellido,
                m.instrumento,
                m.voz,
                COUNT(*) as total_eventos,
                COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'true' THEN 1 END) as presentes,
                COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'false' THEN 1 END) as ausentes,
                COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'justified' THEN 1 END) as justificados,
                ROUND(
                    COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'true' THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(*), 0), 2
                ) as porcentaje_asistencia
            FROM miembros m
            LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id
            WHERE LOWER(m.grupo) = $1
            GROUP BY m.id, m.nombre, m.apellido, m.instrumento, m.voz
            ORDER BY m.nombre, m.apellido
        `, [grupo.toLowerCase()]);
        
        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en estadísticas:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== DATOS DE UN MIEMBRO =====
router.get('/miembro/:miembro_id', verifyToken, async (req, res) => {
    try {
        const { miembro_id } = req.params;
        
        const result = await db.query(`
            SELECT 
                m.nombre,
                m.apellido,
                m.grupo,
                COUNT(ra.id) as total_eventos,
                COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'true' THEN 1 END) as presentes,
                COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'false' THEN 1 END) as ausentes,
                COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'justified' THEN 1 END) as justificados
            FROM miembros m
            LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id
            WHERE m.id = $1
            GROUP BY m.id
        `, [miembro_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Miembro no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error en miembro:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== RESUMEN POR GRUPO =====
router.get('/resumen/:grupo', verifyToken, async (req, res) => {
    try {
        const { grupo } = req.params;

        const result = await db.query(`
            SELECT
                COUNT(DISTINCT m.id) as total_miembros,
                COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'true' THEN 1 END) as total_presentes,
                COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'false' THEN 1 END) as total_ausentes,
                COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'justified' THEN 1 END) as total_justificados,
                COUNT(DISTINCT ra.fecha) as total_eventos,
                ROUND(
                    COUNT(CASE WHEN CAST(ra.presente AS TEXT) = 'true' THEN 1 END) * 100.0 /
                    NULLIF(COUNT(ra.id), 0), 2
                ) as porcentaje_general
            FROM miembros m
            LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id
            WHERE LOWER(m.grupo) = $1
        `, [grupo.toLowerCase()]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error en resumen:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== DEBUG: Ver miembros y asistencia =====
router.get('/debug/:grupo', verifyToken, async (req, res) => {
    try {
        const { grupo } = req.params;

        const result = await db.query(`
            SELECT
                m.id,
                m.nombre,
                m.grupo,
                COUNT(ra.id) as total_registros,
                COUNT(CASE WHEN ra.tipo_evento = 'santo_culto' THEN 1 END) as santo_culto_count,
                json_agg(json_build_object('fecha', ra.fecha, 'tipo_evento', ra.tipo_evento, 'presente', ra.presente)) as registros
            FROM miembros m
            LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id
            WHERE m.grupo = $1
            GROUP BY m.id, m.nombre, m.grupo
            ORDER BY m.nombre
        `, [grupo]);

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en debug:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== RESET: Limpiar asistencia =====
router.post('/reset-asistencia', verifyToken, async (req, res) => {
    try {
        console.log('🧹 Limpiando registro_asistencia...');
        await db.query('TRUNCATE TABLE registro_asistencia RESTART IDENTITY CASCADE');
        res.json({ ok: true, mensaje: '✓ Datos de asistencia eliminados. Recarga desde Asistencia.' });
    } catch (error) {
        console.error('❌ Error en reset:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;