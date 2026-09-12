-- Script para resetear la BD (¡CUIDADO: borra todos los datos!)

-- Borrar tabla de asistencia
DROP TABLE IF EXISTS registro_asistencia CASCADE;

-- Borrar tabla de miembros
DROP TABLE IF EXISTS miembros CASCADE;

-- Borrar tabla de usuarios
DROP TABLE IF EXISTS usuarios CASCADE;

-- Borrar índices
DROP INDEX IF EXISTS idx_miembros_grupo;
DROP INDEX IF EXISTS idx_asistencia_fecha;
DROP INDEX IF EXISTS idx_asistencia_miembro;

-- Cuando el servidor se reinicie, creará las tablas con la nueva estructura
