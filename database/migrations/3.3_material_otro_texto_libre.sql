-- =====================================================================
-- 3.3 Material "Otro" como texto libre por línea
-- =====================================================================
-- El material "Otros" deja de ser un registro del catálogo (eliminado en
-- la migración 3.2) y pasa a ser un campo de TEXTO LIBRE por línea: el
-- usuario escribe el nombre del material, su unidad y -donde aplica- la
-- cantidad y el precio.
--
-- En las 3 tablas que registran materiales:
--   - material_id pasa a ser NULLABLE.
--   - se agrega nombre_personalizado VARCHAR(100).
--   - cada línea es O un material del catálogo O un "otro" de texto libre,
--     nunca ambos ni ninguno (CHECK exclusivo XOR).
--
-- unidad / cantidad / precio del "otro":
--   - detalle_transaccion: ya tiene unidad_medida, cantidad y
--     precio_unitario por línea. Solo se agrega el nombre.
--   - recolector_material: tiene cantidad_mensual y precio_venta; se agrega
--     unidad_medida (antes se heredaba de material.unidad_medida_default).
--   - sucursal_material: tiene cantidad_aproximada (texto); se agrega
--     unidad_medida. (La sucursal no maneja precio.)
--
-- Nota sobre los UNIQUE existentes (recolector_id, material_id) y
-- (sucursal_id, material_id): siguen siendo válidos. PostgreSQL trata los
-- NULL como distintos (NULLS DISTINCT por defecto), por lo que un
-- recolector / sucursal puede tener varias líneas "otro" (material_id NULL).
--
-- Toda la migración va en una transacción.
-- =====================================================================

BEGIN;

-- detalle_transaccion (ya tiene unidad_medida y precio_unitario por línea)
ALTER TABLE detalle_transaccion ALTER COLUMN material_id DROP NOT NULL;
ALTER TABLE detalle_transaccion ADD COLUMN IF NOT EXISTS nombre_personalizado VARCHAR(100) NULL;
ALTER TABLE detalle_transaccion ADD CONSTRAINT chk_detalle_material_xor_otro
  CHECK ((material_id IS NOT NULL) <> (nombre_personalizado IS NOT NULL));

-- recolector_material (se agrega unidad_medida para el "otro")
ALTER TABLE recolector_material ALTER COLUMN material_id DROP NOT NULL;
ALTER TABLE recolector_material ADD COLUMN IF NOT EXISTS nombre_personalizado VARCHAR(100) NULL;
ALTER TABLE recolector_material ADD COLUMN IF NOT EXISTS unidad_medida unidad_medida NULL;
ALTER TABLE recolector_material ADD CONSTRAINT chk_recmat_material_xor_otro
  CHECK ((material_id IS NOT NULL) <> (nombre_personalizado IS NOT NULL));

-- sucursal_material (se agrega unidad_medida para el "otro")
ALTER TABLE sucursal_material ALTER COLUMN material_id DROP NOT NULL;
ALTER TABLE sucursal_material ADD COLUMN IF NOT EXISTS nombre_personalizado VARCHAR(100) NULL;
ALTER TABLE sucursal_material ADD COLUMN IF NOT EXISTS unidad_medida unidad_medida NULL;
ALTER TABLE sucursal_material ADD CONSTRAINT chk_sucmat_material_xor_otro
  CHECK ((material_id IS NOT NULL) <> (nombre_personalizado IS NOT NULL));

COMMIT;
