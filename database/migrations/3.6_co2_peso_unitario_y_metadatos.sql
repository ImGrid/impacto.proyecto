-- =====================================================================
-- 3.6_co2_peso_unitario_y_metadatos.sql
-- Agrega a `material`:
--   - peso_unitario_kg: peso promedio de 1 unidad (kg). Permite convertir
--     las líneas en UNIDAD a kg para que cuenten en el CO2 y el volumen
--     (hoy se descartan: ver docs/34 §1, "Falla A").
--   - metadatos de procedencia del factor_co2 (fuente/año/frontera/
--     confianza) para defensibilidad ante donantes (docs/33 §5).
--
-- NO modifica los valores de factor_co2 existentes: esos vienen del Excel
-- del cliente y cambiarlos requiere su validación (docs/32 es candidata).
--
-- Siembra peso_unitario_kg solo de los 2 materiales en UNIDAD del catálogo
-- (Botellas de Vidrio, Maples de Huevo). Bolsa queda excluida (sin peso
-- estable, decisión del cliente). Idempotente (re-ejecutable).
-- =====================================================================

SET client_encoding TO 'UTF8';

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Columnas nuevas (IF NOT EXISTS -> re-ejecutable).
-- ---------------------------------------------------------------------
ALTER TABLE material ADD COLUMN IF NOT EXISTS peso_unitario_kg     numeric(10,4);
ALTER TABLE material ADD COLUMN IF NOT EXISTS factor_co2_fuente    varchar(120);
ALTER TABLE material ADD COLUMN IF NOT EXISTS factor_co2_anio      integer;
ALTER TABLE material ADD COLUMN IF NOT EXISTS factor_co2_frontera  varchar(40);
ALTER TABLE material ADD COLUMN IF NOT EXISTS factor_co2_confianza varchar(10);

COMMENT ON COLUMN material.peso_unitario_kg IS
  'Peso promedio de 1 unidad en kg. Solo materiales en UNIDAD; convierte cantidad->kg para CO2/volumen. NULL = no aplica (KG/TONELADA) o pendiente.';

-- ---------------------------------------------------------------------
-- 2. Seed del peso por unidad (solo materiales en UNIDAD).
--    Valores de referencia (docs/32 §4, EPA Volume-to-Weight):
--      - Botella de vidrio (promedio cerveza/refresco BO): ~0,30 kg
--      - Maple de huevo (pulpa, 12u, vacío): ~0,035 kg
--    Confianza: media (el operador podrá sobreescribir con peso real
--    medido en balanza en una fase posterior, Hito 3).
-- ---------------------------------------------------------------------
UPDATE material SET peso_unitario_kg = 0.3000 WHERE nombre = 'Botellas de Vidrio';
UPDATE material SET peso_unitario_kg = 0.0350 WHERE nombre = 'Maples de Huevo';

-- ---------------------------------------------------------------------
-- 3. Verificación: ningún material en UNIDAD que YA tenga líneas
--    registradas en UNIDAD puede quedarse sin peso (sino el bug persiste).
-- ---------------------------------------------------------------------
DO $$
DECLARE faltan INT;
BEGIN
  SELECT count(*) INTO faltan
  FROM material m
  WHERE m.unidad_medida_default = 'UNIDAD'
    AND m.peso_unitario_kg IS NULL
    AND EXISTS (
      SELECT 1 FROM detalle_transaccion dt
      WHERE dt.material_id = m.id AND dt.unidad_medida = 'UNIDAD'
    );
  IF faltan > 0 THEN
    RAISE EXCEPTION
      'Hay % material(es) en UNIDAD con líneas en UNIDAD pero sin peso_unitario_kg', faltan;
  END IF;
END $$;

COMMIT;
