const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Función para inicializar las tablas
async function initializeDatabase() {
  try {
    console.log('Inicializando base de datos...');

    // Tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        usuario VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nombre_completo VARCHAR(255),
        rol VARCHAR(20) DEFAULT 'operario',
        activo BOOLEAN DEFAULT true,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Agregar columna nombre_completo si no existe
    try {
      await pool.query(`ALTER TABLE usuarios ADD COLUMN nombre_completo VARCHAR(255)`);
    } catch (e) { /* ya existe */ }

    // Tabla de miembros
    await pool.query(`
      CREATE TABLE IF NOT EXISTS miembros (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        apellido VARCHAR(255),
        grupo VARCHAR(20) NOT NULL CHECK (grupo IN ('coro', 'orquesta')),
        instrumento VARCHAR(100),
        voz VARCHAR(50),
        email VARCHAR(255),
        activo BOOLEAN DEFAULT true,
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Agregar columnas faltantes si la tabla ya existe
    try {
      await pool.query(`ALTER TABLE miembros ADD COLUMN apellido VARCHAR(255)`);
    } catch (e) { /* ya existe */ }
    try {
      await pool.query(`ALTER TABLE miembros ADD COLUMN instrumento VARCHAR(100)`);
    } catch (e) { /* ya existe */ }
    try {
      await pool.query(`ALTER TABLE miembros ADD COLUMN voz VARCHAR(50)`);
    } catch (e) { /* ya existe */ }

    // Tabla de registro de asistencia
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registro_asistencia (
        id SERIAL PRIMARY KEY,
        miembro_id INTEGER NOT NULL REFERENCES miembros(id) ON DELETE CASCADE,
        tipo_evento VARCHAR(50) NOT NULL,
        fecha DATE NOT NULL,
        presente BOOLEAN DEFAULT false,
        justificado BOOLEAN DEFAULT false,
        nota VARCHAR(255),
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Agregar columnas faltantes si la tabla ya existe
    try {
      await pool.query(`ALTER TABLE registro_asistencia ADD COLUMN justificado BOOLEAN DEFAULT false`);
    } catch (e) { /* ya existe */ }

    // Crear índices para optimizar búsquedas
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_miembros_grupo ON miembros(grupo)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_asistencia_fecha ON registro_asistencia(fecha)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_asistencia_miembro ON registro_asistencia(miembro_id)`);

    console.log('✓ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error inicializando BD:', error.message);
    throw error;
  }
}

// Función para insertar datos iniciales
async function seedDatabase() {
  try {
    console.log('Insertando datos iniciales...');

    // Verificar si ya existen usuarios
    const userCheck = await pool.query('SELECT COUNT(*) FROM usuarios');
    if (userCheck.rows[0].count > 0) {
      console.log('✓ Base de datos ya contiene datos');
      return;
    }

    // Insertar usuarios (contraseña encriptada con bcryptjs)
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('sigme', 10);

    const usuarios = [
      ['usuario1', hashedPassword],
      ['usuario2', hashedPassword],
      ['usuario3', hashedPassword],
      ['usuario4', hashedPassword]
    ];

    for (const [usuario, password] of usuarios) {
      await pool.query(
        'INSERT INTO usuarios (usuario, password, rol) VALUES ($1, $2, $3)',
        [usuario, password, 'operario']
      );
    }
    console.log('✓ 4 usuarios creados (usuario1 a usuario4, contraseña: sigme)');

    // Insertar miembros de ejemplo (3 + 1 vacío)
    const miembros = [
      ['Juan García', 'coro'],
      ['María López', 'orquesta'],
      ['Pedro Rodríguez', 'coro'],
      ['[Nuevo miembro]', 'coro'] // Espacio para agregar el 4to
    ];

    for (const [nombre, grupo] of miembros) {
      await pool.query(
        'INSERT INTO miembros (nombre, grupo) VALUES ($1, $2)',
        [nombre, grupo]
      );
    }
    console.log('✓ 4 miembros de ejemplo creados');

  } catch (error) {
    console.error('Error en seed:', error.message);
  }
}

module.exports = {
  pool,
  initializeDatabase,
  seedDatabase,
  query: (text, params) => pool.query(text, params)
};