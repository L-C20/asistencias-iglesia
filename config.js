// Grupos que puede tener una iglesia y cómo se organiza cada uno. Qué grupos
// tiene cada iglesia se guarda en la tabla `iglesias` (columna `grupos`).

const GRUPOS_DISPONIBLES = {
  orquesta: {
    id: 'orquesta',
    nombre: 'Orquesta',
    // Cómo se llama la sección de cada integrante y en qué orden se listan
    categoria: 'Instrumento',
    secciones: [
      'Violín 1', 'Violín 2', 'Viola', 'Cello',
      'Flauta', 'Oboe', 'Clarinete',
      'Sx. Alto', 'Sx. Tenor', 'Sx. Barítono',
      'Trompeta', 'Corno', 'Trombón', 'Eufonio', 'Tuba',
      'Órgano', 'Bajo', 'Acordeón', 'Bandoneón'
    ]
  },
  coro: {
    id: 'coro',
    nombre: 'Coro',
    categoria: 'Cuerda',
    secciones: ['Soprano', 'Contralto', 'Tenor', 'Bajo']
  }
};

const ORDEN_GRUPOS = Object.keys(GRUPOS_DISPONIBLES);

// Días de la semana en que la iglesia hace culto (0 = domingo … 6 = sábado).
// Los ensayos y bautismos caen cualquier día, así que esto solo rige el culto.
const DIAS_CULTO_POR_DEFECTO = [0, 2, 6]; // domingo, martes y sábado
const NOMBRES_DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// "0,2,6" (como se guarda en la base) -> [0, 2, 6] sin repetidos y ordenados
function normalizarDiasCulto(valor) {
  const crudos = Array.isArray(valor) ? valor : String(valor ?? '').split(',');
  const dias = crudos
    .map(d => Number(String(d).trim()))
    .filter(d => Number.isInteger(d) && d >= 0 && d <= 6);
  return [...new Set(dias)].sort((a, b) => a - b);
}

// "orquesta,coro" (como se guarda en la base) -> ['orquesta', 'coro'] válidos y ordenados
function normalizarGrupos(valor) {
  const ids = Array.isArray(valor) ? valor : String(valor || '').split(',');
  const limpios = ids.map(g => String(g).trim().toLowerCase()).filter(g => GRUPOS_DISPONIBLES[g]);
  return ORDEN_GRUPOS.filter(g => limpios.includes(g));
}

// Lo que el frontend necesita saber de una iglesia para armar sus pantallas
function configDeIglesia(fila) {
  const grupos = normalizarGrupos(fila.grupos);
  const dias = normalizarDiasCulto(fila.dias_culto);
  return {
    id: fila.id,
    nombre: fila.nombre,
    departamento: fila.departamento || '',
    anciano: fila.anciano || '',
    activa: fila.activa !== false,
    grupos: (grupos.length ? grupos : ['orquesta']).map(id => GRUPOS_DISPONIBLES[id]),
    diasCulto: dias.length ? dias : DIAS_CULTO_POR_DEFECTO,
    // No todas las iglesias registran bautismos
    bautismos: fila.bautismos === true
  };
}

function grupoValidoEn(fila, grupoId) {
  return configDeIglesia(fila).grupos.some(g => g.id === grupoId);
}

// En la base, la sección va en `instrumento` (orquesta) o en `voz` (coro)
function columnaSeccion(grupoId) {
  return grupoId === 'coro' ? 'voz' : 'instrumento';
}

// Alfabeto sin I, L, O ni U: así ningún código se confunde al leerlo o dictarlo
const ALFABETO_CODIGO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

// Diez caracteres alcanzan de sobra (más de mil billones de combinaciones) y
// dejan un enlace corto para mandar por mensaje
function nuevoCodigo() {
  return Array.from(require('crypto').randomBytes(10), b => ALFABETO_CODIGO[b % 32]).join('');
}

// DNI: solo los dígitos, entre 6 y 9 ("30.123.456" -> "30123456"); null si no sirve
function normalizarDni(valor) {
  const digitos = String(valor ?? '').replace(/[.\s-]/g, '');
  return /^\d{6,9}$/.test(digitos) ? digitos : null;
}

// "YYYY-MM-DD" real, no futura y no anterior a 1900; null si no sirve
function normalizarFechaNacimiento(valor) {
  const texto = String(valor ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return null;
  const fecha = new Date(texto + 'T00:00:00Z');
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== texto) return null;
  if (fecha > new Date() || fecha.getUTCFullYear() < 1900) return null;
  return texto;
}

module.exports = {
  normalizarDni, normalizarFechaNacimiento, nuevoCodigo, GRUPOS_DISPONIBLES, normalizarGrupos, configDeIglesia, grupoValidoEn, columnaSeccion,
  DIAS_CULTO_POR_DEFECTO, NOMBRES_DIA, normalizarDiasCulto
};
