-- =====================================================================
-- 2.6 Multi-sucursal por línea de detalle de transacción
-- =====================================================================
-- Cambio de modelo: una entrega del recolector puede venir de varias
-- sucursales, con desglose de qué material y cuánto vino de cada una.
--
-- Antes: transaccion.sucursal_id (una sola por transacción)
-- Después: detalle_transaccion.sucursal_id (una por cada línea, opcional)
--
-- Decisión: la sucursal es OPCIONAL a nivel línea. Un detalle sin sucursal
-- representa "origen no identificado" (p.ej. material recogido en la calle
-- o sin saber de qué punto vino exactamente).
-- =====================================================================

BEGIN;

-- 1. Crear nueva columna en detalle_transaccion
ALTER TABLE detalle_transaccion
  ADD COLUMN sucursal_id INTEGER NULL;

ALTER TABLE detalle_transaccion
  ADD CONSTRAINT detalle_transaccion_sucursal_id_fkey
  FOREIGN KEY (sucursal_id) REFERENCES sucursal(id);

CREATE INDEX idx_detalle_sucursal
  ON detalle_transaccion(sucursal_id);

-- 2. Backfill: para cada transacción que tenía sucursal_id en cabecera,
--    copiar ese valor a todos sus detalles (preservando el dato existente).
UPDATE detalle_transaccion dt
SET sucursal_id = t.sucursal_id
FROM transaccion t
WHERE dt.transaccion_id = t.id
  AND t.sucursal_id IS NOT NULL;

-- 3. Eliminar columna y constraint de transaccion
ALTER TABLE transaccion
  DROP CONSTRAINT IF EXISTS transaccion_sucursal_id_fkey;

DROP INDEX IF EXISTS idx_transaccion_sucursal;

ALTER TABLE transaccion
  DROP COLUMN sucursal_id;

COMMIT;
