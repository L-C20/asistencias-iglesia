const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas
const { router: authRouter } = require('./routes/auth');
const asistenciaRouter = require('./routes/asistencia');
const reportesRouter = require('./routes/reportes');
const usuariosRouter = require('./routes/usuarios');
const iglesiasRouter = require('./routes/iglesias');
const exportarRouter = require('./routes/exportar');
const { initializeDatabase, seedDatabase } = require('./database');

if (!process.env.JWT_SECRET) {
  console.error('Falta la variable JWT_SECRET');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// Rutas API
app.use('/api/auth', authRouter);
app.use('/api/asistencia', asistenciaRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/iglesias', iglesiasRouter);
app.use('/api/exportar', exportarRouter);

// Ruta raíz - servir login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Iniciar servidor
async function start() {
  try {
    await initializeDatabase();
    await seedDatabase();

    app.listen(PORT, () => {
      console.log(`✓ Servidor ejecutándose en puerto ${PORT}`);
      console.log(`✓ URL: http://localhost:${PORT}`);
      console.log(`✓ Ambiente: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Error iniciando servidor:', error);
    process.exit(1);
  }
}

start();

module.exports = app;
