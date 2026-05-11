-- Fase 2.3 del cambio definitivo (mayo 2026)
-- Renombra tabla acopiador -> centro_operacional con todos sus constraints e índices.
-- Elimina recolector.acopiador_id (vínculo fijo) y agrega departamento_id a recolector, centro_operacional.
-- Renombra pago.acopiador_id -> centro_operacional_id.
-- Pre-requisito: tabla departamento creada y seedeada (Fase 2.1), datos transaccionales limpios (Fase 1).
-- NO toca transaccion.acopiador_id (eso es sub-paso 2.4, destino polimórfico).
-- NO toca codigo_qr.generado_por_id (su constraint y columna no mencionan "acopiador" en su nombre).
-- Referencia: docs/19_cambio_modelo_centros_operacionales.md sección 4.3
-- Referencia: docs/21_plan_implementacion_cambio_definitivo.md sección 4 (Fase 2.3)

BEGIN;

-- =====================================================================
-- BLOQUE A: Renombrar tabla acopiador -> centro_operacional
-- =====================================================================

-- A.1 Tabla y secuencia
ALTER TABLE acopiador RENAME TO centro_operacional;
ALTER SEQUENCE acopiador_id_seq RENAME TO centro_operacional_id_seq;

-- A.2 Constraints (PK + UNIQUE)
ALTER TABLE centro_operacional RENAME CONSTRAINT acopiador_pkey TO centro_operacional_pkey;
ALTER TABLE centro_operacional RENAME CONSTRAINT acopiador_cedula_identidad_key TO centro_operacional_cedula_identidad_key;
ALTER TABLE centro_operacional RENAME CONSTRAINT acopiador_usuario_id_key TO centro_operacional_usuario_id_key;

-- A.3 FKs salientes (a usuario, a zona)
ALTER TABLE centro_operacional RENAME CONSTRAINT acopiador_usuario_id_fkey TO centro_operacional_usuario_id_fkey;
ALTER TABLE centro_operacional RENAME CONSTRAINT acopiador_zona_id_fkey TO centro_operacional_zona_id_fkey;

-- A.4 Índices
ALTER INDEX idx_acopiador_cedula RENAME TO idx_centro_op_cedula;
ALTER INDEX idx_acopiador_usuario RENAME TO idx_centro_op_usuario;
ALTER INDEX idx_acopiador_zona RENAME TO idx_centro_op_zona;

-- A.5 Nuevo: departamento_id en centro_operacional
ALTER TABLE centro_operacional ADD COLUMN departamento_id INTEGER REFERENCES departamento(id);
ALTER TABLE centro_operacional ALTER COLUMN departamento_id SET NOT NULL;
CREATE INDEX idx_centro_op_departamento ON centro_operacional(departamento_id);


-- =====================================================================
-- BLOQUE B: Modificar recolector (drop acopiador_id, add departamento_id)
-- =====================================================================

-- B.1 Drop FK y su índice
ALTER TABLE recolector DROP CONSTRAINT recolector_acopiador_id_fkey;
DROP INDEX idx_recolector_acopiador;

-- B.2 Drop columna acopiador_id (el vínculo fijo desaparece)
ALTER TABLE recolector DROP COLUMN acopiador_id;

-- B.3 Agregar departamento_id NOT NULL
ALTER TABLE recolector ADD COLUMN departamento_id INTEGER REFERENCES departamento(id);
ALTER TABLE recolector ALTER COLUMN departamento_id SET NOT NULL;
CREATE INDEX idx_recolector_departamento ON recolector(departamento_id);


-- =====================================================================
-- BLOQUE C: Modificar pago (rename acopiador_id -> centro_operacional_id)
-- =====================================================================

-- C.1 Renombrar columna
ALTER TABLE pago RENAME COLUMN acopiador_id TO centro_operacional_id;

-- C.2 Renombrar el FK (la FK sigue apuntando a la tabla, que ya se renombró a centro_operacional)
ALTER TABLE pago RENAME CONSTRAINT pago_acopiador_id_fkey TO pago_centro_operacional_id_fkey;

-- C.3 Renombrar el índice
ALTER INDEX idx_pago_acopiador RENAME TO idx_pago_centro_operacional;

COMMIT;
