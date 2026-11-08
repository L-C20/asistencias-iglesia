// Panel de movimientos del super administrador - GET /api/movimientos
const express = require('express');
const db = require('../database');
const { verifyToken, verificarSuperadmin } = require('../middleware/auth');
const { CATEGORIAS } = require('../movimientos');
const router = express.Router();

const POR_PAGINA = 50;

// Query: iglesia_id, categoria, usuario (texto), pagina (desde 1)
router.get('/', verifyToken, verificarSuperadmin, async (req, res) => {
  try {
    const filtros = [];
    const params = [];
    const agregar = (condicion, valor) => { params.push(valor); filtros.push(condicion.replace('?', `$${params.length}`)); };

    if (Number(req.query.iglesia_id)) agregar('m.iglesia_id = ?', Number(req.query.iglesia_id));
    if (CATEGORIAS[req.query.categoria]) agregar('m.categoria = ?', req.query.categoria);
    const usuario = String(req.query.usuario || '').trim();
    if (usuario) agregar('m.usuario ILIKE ?', `%${usuario.replace(/[%_]/g, '')}%`);

    const donde = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';
    const pagina = Math.max(1, Number(req.query.pagina) || 1);

    const [total, filas] = await Promise.all([
      db.query(`SELECT COUNT(*) AS n FROM movimientos m ${donde}`, params),
      db.query(
        `SELECT m.id, m.usuario, m.iglesia_nombre, m.categoria, m.accion, m.detalle,
                TO_CHAR(m.fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY HH24:MI:SS') AS cuando
         FROM movimientos m ${donde}
         ORDER BY m.fecha DESC, m.id DESC
         LIMIT ${POR_PAGINA} OFFSET ${(pagina - 1) * POR_PAGINA}`,
        params
      )
    ]);

    res.json({
      total: Number(total.rows[0].n),
      pagina,
      porPagina: POR_PAGINA,
      categorias: CATEGORIAS,
      movimientos: filas.rows
    });
  } catch (error) {
    console.error('Error listando movimientos:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

module.exports = router;
