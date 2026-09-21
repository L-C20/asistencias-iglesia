// Configuración por instalación. Cada iglesia corre su propia copia de la app
// y se distingue solo por estas variables de entorno:
//
//   IGLESIA_NOMBRE   Nombre que se muestra en el login y el menú (default: "Orquesta")
//   GRUPOS           Grupos habilitados, separados por coma (default: "orquesta")
//                    Valores posibles: orquesta, coro
require('dotenv').config();

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

const idsHabilitados = String(process.env.GRUPOS || 'orquesta')
  .split(',')
  .map(g => g.trim().toLowerCase())
  .filter(g => GRUPOS_DISPONIBLES[g]);

const grupos = (idsHabilitados.length ? idsHabilitados : ['orquesta']).map(id => GRUPOS_DISPONIBLES[id]);

const config = {
  nombre: (process.env.IGLESIA_NOMBRE || '').trim() || grupos.map(g => g.nombre).join(' y '),
  grupos
};

function grupoValido(id) {
  return config.grupos.some(g => g.id === id);
}

// En la base, la sección va en `instrumento` (orquesta) o en `voz` (coro)
function columnaSeccion(grupoId) {
  return grupoId === 'coro' ? 'voz' : 'instrumento';
}

module.exports = { config, grupoValido, columnaSeccion };
