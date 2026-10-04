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

    // Agregar columnas si no existen
    try {
      await pool.query(`ALTER TABLE usuarios ADD COLUMN nombre_completo VARCHAR(255)`);
    } catch (e) { /* ya existe */ }
    // Permiso de solo lectura para ver la asistencia de todas las iglesias
    try {
      await pool.query(`ALTER TABLE usuarios ADD COLUMN ver_todas_iglesias BOOLEAN DEFAULT false`);
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

    await migrarAIglesias();

    // Nota opcional de cada evento ("Santa Cena", "Visita del pastor"...)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eventos (
        id SERIAL PRIMARY KEY,
        iglesia_id INTEGER NOT NULL REFERENCES iglesias(id),
        grupo VARCHAR(20) NOT NULL,
        tipo_evento VARCHAR(50) NOT NULL,
        fecha DATE NOT NULL,
        descripcion VARCHAR(200),
        UNIQUE (iglesia_id, grupo, tipo_evento, fecha)
      )
    `);

    // Solicitudes de alta: el encargado de una iglesia nueva completa un
    // formulario público y el super administrador decide si la da de alta.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS solicitudes (
        id SERIAL PRIMARY KEY,
        token VARCHAR(64) NOT NULL UNIQUE,
        etiqueta VARCHAR(160),
        estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
        solicitante VARCHAR(160),
        dni VARCHAR(30),
        telefono VARCHAR(40),
        iglesia_nombre VARCHAR(120),
        departamento VARCHAR(120),
        anciano VARCHAR(120),
        grupos VARCHAR(60),
        dias_culto VARCHAR(20),
        comentarios TEXT,
        iglesia_id INTEGER REFERENCES iglesias(id),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_respuesta TIMESTAMP,
        fecha_resolucion TIMESTAMP
      )
    `);

    // Inscripciones de integrantes: quien recibe el enlace de su iglesia deja
    // sus datos acá y pasan a la planilla cuando el encargado los aprueba.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inscripciones (
        id SERIAL PRIMARY KEY,
        iglesia_id INTEGER NOT NULL REFERENCES iglesias(id),
        nombre VARCHAR(255) NOT NULL,
        grupo VARCHAR(20) NOT NULL,
        seccion VARCHAR(100),
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_inscripciones_iglesia ON inscripciones(iglesia_id)`);

    console.log('✓ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('Error inicializando BD:', error.message);
    throw error;
  }
}

// ===== VARIAS IGLESIAS EN UNA MISMA BASE =====
// Cada usuario e integrante pertenece a una iglesia. Las bases anteriores a
// esto tenían una sola: se la crea y se le asigna todo lo existente.
async function migrarAIglesias() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS iglesias (
      id SERIAL PRIMARY KEY,
      nombre VARCHAR(120) NOT NULL,
      departamento VARCHAR(120),
      anciano VARCHAR(120),
      grupos VARCHAR(60) NOT NULL DEFAULT 'orquesta',
      activa BOOLEAN DEFAULT true,
      fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const tabla of ['usuarios', 'miembros']) {
    try {
      await pool.query(`ALTER TABLE ${tabla} ADD COLUMN iglesia_id INTEGER REFERENCES iglesias(id)`);
    } catch (e) { /* ya existe */ }
  }
  // Días de culto de cada iglesia; las que ya existían siguen con dom/mar/sáb
  try {
    await pool.query(`ALTER TABLE iglesias ADD COLUMN dias_culto VARCHAR(20) DEFAULT '0,2,6'`);
    await pool.query(`UPDATE iglesias SET dias_culto = '0,2,6' WHERE dias_culto IS NULL`);
  } catch (e) { /* ya existe */ }

  // Bautismos: no todas las iglesias los registran. Al estrenar la columna,
  // los conservan la iglesia original y las que ya tengan alguno cargado; el
  // resto arranca sin ellos y se habilitan desde el formulario de iglesia.
  try {
    await pool.query(`ALTER TABLE iglesias ADD COLUMN bautismos BOOLEAN DEFAULT false`);
    await pool.query(`
      UPDATE iglesias SET bautismos = true
      WHERE id = (SELECT MIN(id) FROM iglesias)
         OR id IN (
           SELECT DISTINCT m.iglesia_id
           FROM registro_asistencia ra JOIN miembros m ON m.id = ra.miembro_id
           WHERE ra.tipo_evento = 'bautismo'
         )`);
  } catch (e) { /* ya existe */ }

  // Enlace con el que los integrantes de la iglesia piden su inscripción;
  // sin valor, la inscripción por enlace está desactivada
  try {
    await pool.query(`ALTER TABLE iglesias ADD COLUMN token_inscripcion VARCHAR(20)`);
  } catch (e) { /* ya existe */ }

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_miembros_iglesia ON miembros(iglesia_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_usuarios_iglesia ON usuarios(iglesia_id)`);

  // Datos previos sin iglesia: se crea la primera y se le asigna todo
  const sinIglesia = await pool.query(`
    SELECT (SELECT COUNT(*) FROM usuarios WHERE iglesia_id IS NULL) AS usuarios,
           (SELECT COUNT(*) FROM miembros WHERE iglesia_id IS NULL) AS miembros
  `);
  if (Number(sinIglesia.rows[0].usuarios) + Number(sinIglesia.rows[0].miembros) > 0) {
    let iglesia = await pool.query('SELECT id FROM iglesias ORDER BY id LIMIT 1');
    if (iglesia.rows.length === 0) {
      const nombre = process.env.IGLESIA_INICIAL || process.env.IGLESIA_NOMBRE || 'Dorrego';
      const grupos = process.env.GRUPOS || 'orquesta';
      iglesia = await pool.query(
        'INSERT INTO iglesias (nombre, grupos) VALUES ($1, $2) RETURNING id',
        [nombre, grupos]
      );
      console.log(`✓ Iglesia inicial creada: ${nombre} (${grupos})`);
    }
    const id = iglesia.rows[0].id;
    await pool.query('UPDATE usuarios SET iglesia_id = $1 WHERE iglesia_id IS NULL', [id]);
    await pool.query('UPDATE miembros SET iglesia_id = $1 WHERE iglesia_id IS NULL', [id]);
    console.log('✓ Usuarios e integrantes existentes asignados a la iglesia inicial');
  }

  // Tiene que haber un super administrador (crea iglesias y ve todas)
  const superadmins = await pool.query(`SELECT COUNT(*) FROM usuarios WHERE rol = 'superadmin'`);
  if (Number(superadmins.rows[0].count) === 0) {
    const preferido = process.env.SUPERADMIN_USUARIO;
    const r = preferido
      ? await pool.query(`UPDATE usuarios SET rol = 'superadmin' WHERE LOWER(usuario) = LOWER($1) RETURNING usuario`, [preferido])
      : await pool.query(`
          UPDATE usuarios SET rol = 'superadmin'
          WHERE id = (SELECT id FROM usuarios WHERE rol = 'admin' AND activo = true ORDER BY fecha_creacion, id LIMIT 1)
          RETURNING usuario`);
    if (r.rows.length) console.log(`✓ Super administrador: ${r.rows[0].usuario}`);
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

    // Instalación nueva: la primera iglesia y un super administrador para
    // entrar, crear iglesias y usuarios. La clave sale de ADMIN_PASSWORD.
    const bcrypt = require('bcryptjs');
    const usuario = process.env.ADMIN_USUARIO || 'admin';
    const clave = process.env.ADMIN_PASSWORD || 'admin1234';
    const hashedPassword = await bcrypt.hash(clave, 10);

    const iglesia = await pool.query(
      'INSERT INTO iglesias (nombre, grupos) VALUES ($1, $2) RETURNING id',
      [process.env.IGLESIA_INICIAL || 'Dorrego', process.env.GRUPOS || 'orquesta']
    );
    await pool.query(
      'INSERT INTO usuarios (usuario, password, rol, nombre_completo, iglesia_id) VALUES ($1, $2, $3, $4, $5)',
      [usuario, hashedPassword, 'superadmin', 'Administrador', iglesia.rows[0].id]
    );
    console.log(`✓ Super administrador creado: ${usuario} (cambiá la contraseña al entrar)`);

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