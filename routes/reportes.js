const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../database');

// Todas las consultas se limitan a la iglesia del usuario logueado (req.user.iglesia_id).

// ===== CONTEOS DE EVENTOS =====
router.get('/conteos/:grupo', verifyToken, async (req, res) => {
    try {
        const { grupo } = req.params;

        // Un evento = una fecha. Cada integrante genera una fila por fecha,
        // así que COUNT(*) daría "cantidad de personas", no de cultos.
        const result = await db.query(`
            SELECT ra.tipo_evento, COUNT(DISTINCT ra.fecha) AS total
            FROM registro_asistencia ra
            JOIN miembros m ON m.id = ra.miembro_id
            WHERE ra.tipo_evento IN ('santo_culto', 'ensayo', 'bautismo')
              AND m.iglesia_id = $1
              AND m.grupo = $2
            GROUP BY ra.tipo_evento
        `, [req.user.iglesia_id, grupo]);

        const conteos = { santo_culto: 0, ensayo: 0, bautismo: 0 };
        result.rows.forEach(row => { conteos[row.tipo_evento] = Number(row.total); });

        res.json(conteos);
    } catch (error) {
        console.error('❌ Error en conteos:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== FECHAS QUE YA TIENEN ASISTENCIA, POR TIPO DE EVENTO =====
router.get('/fechas/:grupo', verifyToken, async (req, res) => {
    try {
        const result = await db.query(`
            SELECT DISTINCT ra.tipo_evento, TO_CHAR(ra.fecha, 'YYYY-MM-DD') AS fecha
            FROM registro_asistencia ra
            JOIN miembros m ON m.id = ra.miembro_id
            WHERE m.iglesia_id = $1 AND m.grupo = $2
        `, [req.user.iglesia_id, req.params.grupo]);

        const porTipo = {};
        result.rows.forEach(r => (porTipo[r.tipo_evento] = porTipo[r.tipo_evento] || []).push(r.fecha));

        // Notas de los eventos ("Santa Cena"...), por tipo y fecha
        const notas = await db.query(`
            SELECT tipo_evento, TO_CHAR(fecha, 'YYYY-MM-DD') AS fecha, descripcion
            FROM eventos
            WHERE iglesia_id = $1 AND grupo = $2 AND descripcion IS NOT NULL
        `, [req.user.iglesia_id, req.params.grupo]);
        const descripciones = {};
        notas.rows.forEach(r => ((descripciones[r.tipo_evento] = descripciones[r.tipo_evento] || {})[r.fecha] = r.descripcion));

        res.json({ ...porTipo, descripciones });
    } catch (error) {
        console.error('❌ Error en fechas:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== RESUMEN PARA LA PANTALLA DE INICIO =====
// :grupo puede ser "todos" para sumar orquesta y coro
router.get('/resumen/:grupo', verifyToken, async (req, res) => {
    try {
        const { grupo } = req.params;

        const result = await db.query(`
            SELECT
                (SELECT COUNT(*) FROM miembros
                 WHERE iglesia_id = $1 AND ($2 = 'todos' OR grupo = $2) AND activo = true) AS integrantes,
                COUNT(DISTINCT (ra.fecha, ra.tipo_evento)) AS eventos,
                TO_CHAR(MAX(ra.fecha), 'YYYY-MM-DD') AS ultima_fecha,
                COUNT(*) FILTER (WHERE ra.presente::text = 'true') AS presentes,
                COUNT(*) AS registros
            FROM registro_asistencia ra
            JOIN miembros m ON m.id = ra.miembro_id
            WHERE m.iglesia_id = $1 AND ($2 = 'todos' OR m.grupo = $2)
        `, [req.user.iglesia_id, grupo]);

        const r = result.rows[0];
        const registros = Number(r.registros);

        res.json({
            integrantes: Number(r.integrantes),
            eventos: Number(r.eventos),
            ultima_fecha: r.ultima_fecha,
            asistencia_promedio: registros > 0
                ? Math.round((Number(r.presentes) / registros) * 100)
                : null
        });
    } catch (error) {
        console.error('❌ Error en resumen:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ===== DATOS DE UN EVENTO ESPECÍFICO =====
router.get('/evento/:grupo', verifyToken, async (req, res) => {
    try {
        const { grupo } = req.params;
        const { tipo_evento } = req.query;

        if (!tipo_evento) {
            return res.status(400).json({ error: 'tipo_evento es requerido' });
        }

        const result = await db.query(`
            SELECT
                m.id,
                m.nombre,
                COALESCE(m.apellido, '') as apellido,
                COALESCE(CASE WHEN m.grupo = 'coro' THEN m.voz ELSE m.instrumento END, '') as seccion,
                TO_CHAR(ra.fecha, 'YYYY-MM-DD') as fecha,
                CASE
                    WHEN COALESCE(ra.presente::text, '') IN ('true', 't', '1') THEN true
                    ELSE false
                END as presente,
                CASE
                    WHEN COALESCE(ra.justificado::text, '') IN ('true', 'justified', 't', '1') THEN true
                    ELSE false
                END as justified,
                COALESCE(ra.nota, '') as nota
            FROM miembros m
            LEFT JOIN registro_asistencia ra ON m.id = ra.miembro_id
                AND ra.tipo_evento = $3
            WHERE m.iglesia_id = $1 AND m.grupo = $2 AND m.activo = true
            ORDER BY m.nombre, m.apellido, ra.fecha DESC
        `, [req.user.iglesia_id, grupo, tipo_evento]);

        res.json(result.rows);
    } catch (error) {
        console.error('❌ Error en evento:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
