-- ============================================
-- MIGRACIÓN: Soporte para flujo de transacciones multi-actor
-- Fecha: Abril 2026
-- Prerequisitos: Las tablas de 01, 02, 03 ya deben existir
-- Documentación: docs/16_flujo_transacciones.md
-- ============================================

-- ============================================
-- 1. NUEVO ENUM: estado_transaccion
-- ============================================
CREATE TYPE estado_transaccion AS ENUM (
    'GENERADO',      -- Generador registró que tiene residuos (opcional)
    'RECOLECTADO',   -- Recolector recogió y registró (opcional)
    'ENTREGADO',     -- Acopiador recibió y verificó (obligatorio)
    'PAGADO'         -- Pago realizado
);

-- ============================================
-- 2. MODIFICAR TABLA: transaccion
-- ============================================

-- 2a. Agregar campo de estado
ALTER TABLE transaccion ADD COLUMN estado estado_transaccion NOT NULL DEFAULT 'ENTREGADO';

-- 2b. Agregar quién creó la transacción
ALTER TABLE transaccion ADD COLUMN creado_por_id INTEGER REFERENCES usuario(id);

-- 2c. Hacer recolector_id nullable (generador puede crear antes de que vaya el recolector)
ALTER TABLE transaccion ALTER COLUMN recolector_id DROP NOT NULL;

-- 2d. Hacer acopiador_id nullable (generador puede crear antes de la entrega)
ALTER TABLE transaccion ALTER COLUMN acopiador_id DROP NOT NULL;

-- 2e. Índices para los nuevos campos
CREATE INDEX idx_transaccion_estado ON transaccion(estado);
CREATE INDEX idx_transaccion_creador ON transaccion(creado_por_id);

-- ============================================
-- 3. NUEVA TABLA: transaccion_historial
-- Registra cada paso del recorrido de una transacción.
-- Cada vez que un actor toca la transacción, se crea un registro aquí.
-- ============================================
CREATE TABLE transaccion_historial (
    id SERIAL PRIMARY KEY,
    transaccion_id INTEGER NOT NULL REFERENCES transaccion(id) ON DELETE CASCADE,
    estado estado_transaccion NOT NULL,
    actor_id INTEGER NOT NULL REFERENCES usuario(id),
    rol_actor rol_usuario NOT NULL,
    observaciones TEXT,
    detalles JSONB,                 -- materiales/pesajes que registró este actor en este paso
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trans_hist_transaccion ON transaccion_historial(transaccion_id);
CREATE INDEX idx_trans_hist_actor ON transaccion_historial(actor_id);
CREATE INDEX idx_trans_hist_fecha ON transaccion_historial(fecha);

-- ============================================
-- 4. NUEVA TABLA: sucursal_horario
-- Días y horas específicas de recogida por sucursal.
-- Reemplaza los campos frecuencia y horario_recojo de sucursal.
-- ============================================
CREATE TABLE sucursal_horario (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL REFERENCES sucursal(id) ON DELETE CASCADE,
    dia_semana dia_semana NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    UNIQUE(sucursal_id, dia_semana)
);

CREATE INDEX idx_sucursal_horario_sucursal ON sucursal_horario(sucursal_id);

-- ============================================
-- 5. MODIFICAR TABLA: usuario
-- Agregar campo identificador (CI o email) para login sin email.
-- Agregar device_token para notificaciones push (FCM).
-- ============================================

-- 5a. Agregar campo identificador
ALTER TABLE usuario ADD COLUMN identificador VARCHAR(150);

-- 5b. Copiar emails existentes como identificador (migración de datos)
UPDATE usuario SET identificador = email;

-- 5c. Hacer identificador obligatorio
ALTER TABLE usuario ALTER COLUMN identificador SET NOT NULL;

-- 5d. Crear índice único para login
CREATE UNIQUE INDEX idx_usuario_identificador ON usuario(identificador);

-- 5e. Hacer email nullable (recolectores no tienen email)
ALTER TABLE usuario ALTER COLUMN email DROP NOT NULL;

-- 5f. Agregar device_token para FCM
ALTER TABLE usuario ADD COLUMN device_token VARCHAR(255);

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
