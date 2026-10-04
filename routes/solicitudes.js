// ===== SOLICITUDES DE ALTA DE IGLESIA =====
// El super administrador genera un enlace por encargado. Con ese enlace, el
// encargado completa un formulario público (sin cuenta) y queda una solicitud
// esperando. La iglesia se crea recién cuando el super administrador la aprueba.

const express = require('express');
const db = require('../database');
const { verifyToken, verificarSuperadmin } = require('../middleware/auth');
const { nuevoCodigo, normalizarGrupos, normalizarDiasCulto, GRUPOS_DISPONIBLES, NOMBRES_DIA } = require('../config');
const router = express.Router();

const ESTADOS = ['pendiente', 'respondida', 'aprobada', 'descartada'];

function recorte(valor, largo) {
  const texto = String(valor ?? '').trim();
  return texto ? texto.slice(0, largo) : null;
}

// Lo que se le muestra al super administrador
function comoSolicitud(fila) {
  return {
    id: fila.id,
    token: fila.token,
    etiqueta: fila.etiqueta || '',
    estado: fila.estado,
    solicitante: fila.solicitante || '',
    dni: fila.dni || '',
    telefono: fila.telefono || '',
    iglesia_nombre: fila.iglesia_nombre || '',
    departamento: fila.departamento || '',
    anciano: fila.anciano || '',
    grupos: normalizarGrupos(fila.grupos),
    dias_culto: normalizarDiasCulto(fila.dias_culto),
    comentarios: fila.comentarios || '',
    iglesia_id: fila.iglesia_id,
    fecha_creacion: fila.fecha_creacion,
    fecha_respuesta: fila.fecha_respuesta,
    fecha_resolucion: fila.fecha_resolucion
  };
}

// ---------- Parte pública (sin token de sesión) ----------

// Qué pide el formulario y si el enlace sigue sirviendo - GET /api/solicitudes/formulario/:token
router.get('/formulario/:token', async (req, res) => {
  try {
    const r = await db.query('SELECT * FROM solicitudes WHERE UPPER(token) = UPPER($1)', [req.params.token]);
    if (r.rows.length === 0) {
      return res.status(404).json({ error: 'Este enlace no es válido o fue dado de baja' });
    }
    const solicitud = r.rows[0];
    if (solicitud.estado !== 'pendiente') {
      return res.status(409).json({ error: 'Esta solicitud ya fue enviada', completado: true });
    }
    res.json({
      etiqueta: solicitud.etiqueta || '',
      grupos: Object.values(GRUPOS_DISPONIBLES).map(g => ({ id: g.id, nombre: g.nombre })),
      dias: NOMBRES_DIA.map((nombre, i) => ({ valor: i, nombre }))
    });
  } catch (error) {
    console.error('Error abriendo formulario:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// El encargado envía sus datos - POST /api/solicitudes/formulario/:token
router.post('/formulario/:token', async (req, res) => {
  try {
    const actual = await db.query('SELECT * FROM solicitudes WHERE UPPER(token) = UPPER($1)', [req.params.token]);
    if (actual.rows.length === 0) {
      return res.status(404).json({ error: 'Este enlace no es válido o fue dado de baja' });
    }
    if (actual.rows[0].estado !== 'pendiente') {
      return res.status(409).json({ error: 'Esta solicitud ya fue enviada' });
    }

    const solicitante = recorte(req.body.solicitante, 160);
    const iglesiaNombre = recorte(req.body.iglesia_nombre, 120);
    const grupos = normalizarGrupos(req.body.grupos);
    const dias = normalizarDiasCulto(req.body.dias_culto);

    if (!solicitante) return res.status(400).json({ error: 'Indique su nombre y apellido' });
    if (!iglesiaNombre) return res.status(400).json({ error: 'Indique el nombre de la iglesia' });
    if (grupos.length === 0) return res.status(400).json({ error: 'Indique si la iglesia tiene orquesta, coro o ambos' });
    if (dias.length === 0) return res.status(400).json({ error: 'Señale los días en que la iglesia celebra culto' });

    const r = await db.query(
      `UPDATE solicitudes
       SET estado = 'respondida', solicitante = $1, dni = $2, telefono = $3,
           iglesia_nombre = $4, departamento = $5, anciano = $6,
           grupos = $7, dias_culto = $8, comentarios = $9,
           fecha_respuesta = CURRENT_TIMESTAMP
       WHERE UPPER(token) = UPPER($10) AND estado = 'pendiente'
       RETURNING id`,
      [
        solicitante,
        recorte(req.body.dni, 30),
        recorte(req.body.telefono, 40),
        iglesiaNombre,
        recorte(req.body.departamento, 120),
        recorte(req.body.anciano, 120),
        grupos.join(','),
        dias.join(','),
        recorte(req.body.comentarios, 1000),
        req.params.token
      ]
    );

    if (r.rows.length === 0) {
      return res.status(409).json({ error: 'Esta solicitud ya fue enviada' });
    }

    console.log(`📝 Solicitud completada: ${iglesiaNombre} (${solicitante})`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error guardando solicitud:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// ---------- Panel del super administrador ----------

router.get('/', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const r = await db.query(`
      SELECT s.*, i.nombre AS iglesia_creada
      FROM solicitudes s
      LEFT JOIN iglesias i ON i.id = s.iglesia_id
      ORDER BY
        CASE s.estado WHEN 'respondida' THEN 0 WHEN 'pendiente' THEN 1 ELSE 2 END,
        s.fecha_respuesta DESC NULLS LAST,
        s.fecha_creacion DESC
    `);
    res.json(r.rows.map(f => ({ ...comoSolicitud(f), iglesia_creada: f.iglesia_creada || '' })));
  } catch (error) {
    console.error('Error listando solicitudes:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Genera el enlace para un encargado - POST /api/solicitudes
router.post('/', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const etiqueta = recorte(req.body.etiqueta, 160);
    if (!etiqueta) return res.status(400).json({ error: 'Indique el destinatario del enlace' });

    const token = nuevoCodigo();
    const r = await db.query(
      'INSERT INTO solicitudes (token, etiqueta) VALUES ($1, $2) RETURNING *',
      [token, etiqueta]
    );
    res.status(201).json(comoSolicitud(r.rows[0]));
  } catch (error) {
    console.error('Error generando enlace:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Marca en qué terminó: aprobada (con la iglesia ya creada) o descartada
router.put('/:id', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const estado = String(req.body.estado || '');
    if (!ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado inválido' });

    const iglesiaId = estado === 'aprobada' ? Number(req.body.iglesia_id) || null : null;
    if (estado === 'aprobada' && !iglesiaId) {
      return res.status(400).json({ error: 'Falta la iglesia creada' });
    }

    const r = await db.query(
      `UPDATE solicitudes
       SET estado = $1, iglesia_id = $2, fecha_resolucion = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [estado, iglesiaId, req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json(comoSolicitud(r.rows[0]));
  } catch (error) {
    console.error('Error actualizando solicitud:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Borra el enlace o la solicitud - DELETE /api/solicitudes/:id
router.delete('/:id', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const r = await db.query('DELETE FROM solicitudes WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Solicitud no encontrada' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error eliminando solicitud:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
