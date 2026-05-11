-- Fase 2.4 del cambio definitivo (mayo 2026)
-- Reemplaza transaccion.acopiador_id por destino polimórfico:
--   centro_operacional_id (FK nullable a centro_operacional)
--   acopiador_externo_id  (FK nullable a acopiador_comprador_externo)
--   destino_desconocido   (BOOLEAN NOT NULL DEFAULT FALSE)
--   CHECK: máximo 1 marcado a la vez (los 3 vacíos = pendiente de asignar)
-- Pre-requisitos:
--   - Fase 2.1: tablas centro_operacional, acopiador_comprador_externo creadas
--   - Fase 2.3: rename acopiador -> centro_operacional aplicado
--   - Tabla transaccion vacía (datos limpiados en Fase 1)
-- Referencia: docs/19_cambio_modelo_centros_operacionales.md sección 4.3
-- Referencia: docs/20_nuevo_flujo_transacciones_destino.md sección 3
-- Referencia: docs/21_plan_implementacion_cambio_definitivo.md sección 4 (Fase 2.4)

BEGIN;

-- =====================================================================
-- BLOQUE A: Eliminar acopiador_id y su FK/índice
-- =====================================================================

DROP INDEX idx_transaccion_acopiador;
ALTER TABLE transaccion DROP CONSTRAINT transaccion_acopiador_id_fkey;
ALTER TABLE transaccion DROP COLUMN acopiador_id;


-- =====================================================================
-- BLOQUE B: Agregar 3 campos de destino polimórfico
-- =====================================================================

ALTER TABLE transaccion
  ADD COLUMN centro_operacional_id INTEGER REFERENCES centro_operacional(id),
  ADD COLUMN acopiador_externo_id  INTEGER REFERENCES acopiador_comprador_externo(id),
  ADD COLUMN destino_desconocido   BOOLEAN NOT NULL DEFAULT FALSE;


-- =====================================================================
-- BLOQUE C: CHECK de unicidad del destino (máximo 1 marcado)
-- =====================================================================
-- Los 3 pueden estar vacíos simultáneamente (estado "destino pendiente")
-- Pero NUNCA puede haber 2 o 3 marcados a la vez.

ALTER TABLE transaccion ADD CONSTRAINT chk_destino_unico CHECK (
  (CASE WHEN centro_operacional_id IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN acopiador_externo_id  IS NOT NULL THEN 1 ELSE 0 END +
   CASE WHEN destino_desconocido = TRUE       THEN 1 ELSE 0 END) <= 1
);


-- =====================================================================
-- BLOQUE D: Índices para los nuevos FKs
-- =====================================================================

CREATE INDEX idx_transaccion_centro_op ON transaccion(centro_operacional_id);
CREATE INDEX idx_transaccion_externo   ON transaccion(acopiador_externo_id);

COMMIT;
