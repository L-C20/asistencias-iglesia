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

    // Bases creadas con el schema viejo tienen `presente` como texto y guardaron
    // 'justified' ahí en vez de en `justificado`. Se migra una sola vez.
    const tipoPresente = await pool.query(`
      SELECT data_type FROM information_schema.columns
      WHERE table_name = 'registro_asistencia' AND column_name = 'presente'
    `);
    if (tipoPresente.rows[0] && tipoPresente.rows[0].data_type !== 'boolean') {
      console.log('Migrando registro_asistencia.presente de texto a boolean...');
      await pool.query(`UPDATE registro_asistencia SET justificado = true WHERE presente::text = 'justified'`);
      await pool.query(`ALTER TABLE registro_asistencia ALTER COLUMN presente DROP DEFAULT`);
      await pool.query(`ALTER TABLE registro_asistencia ALTER COLUMN presente TYPE BOOLEAN USING (presente::text = 'true')`);
      await pool.query(`ALTER TABLE registro_asistencia ALTER COLUMN presente SET DEFAULT false`);
      console.log('✓ Migración completada');
    }

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

    // Instalación nueva: un administrador para entrar y crear el resto de
    // los usuarios desde Configuración. La clave sale de ADMIN_PASSWORD.
    const bcrypt = require('bcryptjs');
    const usuario = process.env.ADMIN_USUARIO || 'admin';
    const clave = process.env.ADMIN_PASSWORD || 'admin1234';
    const hashedPassword = await bcrypt.hash(clave, 10);

    await pool.query(
      'INSERT INTO usuarios (usuario, password, rol, nombre_completo) VALUES ($1, $2, $3, $4)',
      [usuario, hashedPassword, 'admin', 'Administrador']
    );
    console.log(`✓ Usuario administrador creado: ${usuario} (cambiá la contraseña al entrar)`);

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