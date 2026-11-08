// ===== REGISTRO DE MOVIMIENTOS =====
// Anota quién hizo qué y cuándo (inicios de sesión, asistencia, integrantes,
// usuarios, iglesias...). Solo lo consulta el super administrador. Registrar
// nunca debe romper la acción que se está anotando: si falla, solo se avisa en el log.

const db = require('./database');

const NOMBRES_EVENTO = { santo_culto: 'Santo Culto', ensayo: 'Ensayo', bautismo: 'Bautismo' };
const NOMBRES_GRUPO = { orquesta: 'Orquesta', coro: 'Coro' };

// Categorías para filtrar en el panel
const CATEGORIAS = {
  sesion: 'Sesiones',
  asistencia: 'Asistencia',
  integrantes: 'Integrantes',
  inscripciones: 'Inscripciones',
  usuarios: 'Usuarios',
  iglesias: 'Iglesias',
  altas: 'Solicitudes de alta'
};

// 2026-11-08 -> 08/11/2026
function fechaCorta(fecha) {
  const [a, m, d] = String(fecha || '').slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : String(fecha || '');
}

// quien: { id, usuario } del token, o un texto para movimientos sin sesión
async function registrar({ quien, iglesiaId = null, iglesiaNombre = null, categoria, accion, detalle = '' }) {
  try {
    const usuarioId = quien && typeof quien === 'object' ? quien.id || null : null;
    const usuario = quien && typeof quien === 'object' ? quien.usuario : quien;
    await db.query(
      `INSERT INTO movimientos (fecha, usuario_id, usuario, iglesia_id, iglesia_nombre, categoria, accion, detalle)
       VALUES (NOW() AT TIME ZONE 'UTC', $1, $2, $3::int,
               COALESCE($4, (SELECT nombre FROM iglesias WHERE id = $3::int)), $5, $6, $7)`,
      [usuarioId, usuario ? String(usuario).slice(0, 120) : null, iglesiaId, iglesiaNombre, categoria, accion, String(detalle).slice(0, 500)]
    );
  } catch (error) {
    console.error('No se pudo registrar el movimiento:', error.message);
  }
}

module.exports = { registrar, CATEGORIAS, NOMBRES_EVENTO, NOMBRES_GRUPO, fechaCorta };
