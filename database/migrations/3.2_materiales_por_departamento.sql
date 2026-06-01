-- =====================================================================
-- 3.2 Materiales por departamento
-- =====================================================================
-- El catálogo de materiales deja de ser GLOBAL y pasa a ser POR
-- DEPARTAMENTO: cada departamento tiene su propia lista (el cliente
-- indicó que las listas de materiales varían según el departamento).
--
-- Estrategia (patrón add-nullable -> backfill -> not null, igual que
-- zona.ciudad_id):
--   1. Se agrega material.departamento_id (nullable temporal) + una
--      columna temporal origen_global_id para rastrear el remapeo.
--   2. Se DUPLICA el catálogo global actual en CADA departamento activo,
--      excepto el material "Otros" (que se elimina: pasa a ser texto
--      libre por línea, ver migración 3.3).
--   3. Se remapean las filas hijas (recolector_material, sucursal_material,
--      detalle_transaccion) al material del departamento que les
--      corresponde (depto del recolector / de la sucursal).
--   4. Se eliminan los materiales globales originales (incluido "Otros").
--   5. Se fija NOT NULL + UNIQUE(departamento_id, nombre) + índice.
--
-- precio_material: los precios eran GLOBALES y no tienen departamento de
-- referencia. En el nuevo modelo los precios se fijan por departamento
-- (cuelgan del material, que ahora es por depto). Los precios globales
-- existentes se ELIMINAN: en producción son 0 (no-op); en local son
-- datos de prueba. El cliente cargará precios por departamento.
--
-- Idempotencia parcial: usa IF NOT EXISTS en las columnas. El bloque de
-- datos asume que aún existen materiales globales (departamento_id NULL);
-- si ya se corrió, no habrá globales y los pasos de datos no afectan nada.
-- Toda la migración va en una transacción: si algo falla, rollback total.
-- =====================================================================

BEGIN;

-- 1. Columnas (departamento_id nullable temporal + columna de rastreo)
ALTER TABLE material
  ADD COLUMN IF NOT EXISTS departamento_id INTEGER NULL REFERENCES departamento(id);
ALTER TABLE material
  ADD COLUMN IF NOT EXISTS origen_global_id INTEGER NULL; -- temporal, se elimina al final

-- 2. Duplicar el catálogo global (excepto "Otros") en cada departamento activo.
--    Las filas nuevas tienen departamento_id seteado y origen_global_id = id del
--    material global del que provienen. Las nuevas no son visibles a este SELECT
--    (snapshot del statement), por lo que no hay recursión.
INSERT INTO material
  (nombre, descripcion, unidad_medida_default, factor_co2, activo, fecha_creacion, departamento_id, origen_global_id)
SELECT m.nombre, m.descripcion, m.unidad_medida_default, m.factor_co2, m.activo, m.fecha_creacion, d.id, m.id
FROM material m
CROSS JOIN departamento d
WHERE m.departamento_id IS NULL          -- solo los materiales globales actuales
  AND m.nombre <> 'Otros'                -- "Otros" no se copia (pasa a texto libre)
  AND d.activo = TRUE;

-- 3. Remapear las filas hijas al material de su departamento.

-- 3a. recolector_material -> departamento del recolector
UPDATE recolector_material rm
SET material_id = nm.id
FROM recolector r, material nm
WHERE r.id = rm.recolector_id
  AND nm.origen_global_id = rm.material_id
  AND nm.departamento_id = r.departamento_id;

-- 3b. sucursal_material -> departamento de la sucursal
UPDATE sucursal_material sm
SET material_id = nm.id
FROM sucursal s, material nm
WHERE s.id = sm.sucursal_id
  AND nm.origen_global_id = sm.material_id
  AND nm.departamento_id = s.departamento_id;

-- 3c. detalle_transaccion -> departamento del recolector de la transacción;
--     si la transacción no tiene recolector (GENERADO por generador), se usa
--     el departamento de la sucursal de la línea.
UPDATE detalle_transaccion dt
SET material_id = nm.id
FROM transaccion t, material nm
WHERE t.id = dt.transaccion_id
  AND nm.origen_global_id = dt.material_id
  AND nm.departamento_id = COALESCE(
        (SELECT r.departamento_id FROM recolector r WHERE r.id = t.recolector_id),
        (SELECT s.departamento_id FROM sucursal  s WHERE s.id = dt.sucursal_id)
      );

-- 4. Eliminar precios globales (sin departamento de referencia en el nuevo modelo).
DELETE FROM precio_material pm
USING material m
WHERE pm.material_id = m.id
  AND m.departamento_id IS NULL;

-- 5. Verificación de integridad: ninguna fila hija debe seguir apuntando a un
--    material global. Si quedara alguna, abortamos (rollback) para no perder datos.
DO $$
DECLARE huerfanos INTEGER;
BEGIN
  SELECT
      (SELECT COUNT(*) FROM recolector_material rm JOIN material m ON m.id = rm.material_id WHERE m.departamento_id IS NULL)
    + (SELECT COUNT(*) FROM sucursal_material   sm JOIN material m ON m.id = sm.material_id WHERE m.departamento_id IS NULL)
    + (SELECT COUNT(*) FROM detalle_transaccion dt JOIN material m ON m.id = dt.material_id WHERE m.departamento_id IS NULL)
    + (SELECT COUNT(*) FROM precio_material      pm JOIN material m ON m.id = pm.material_id WHERE m.departamento_id IS NULL)
  INTO huerfanos;
  IF huerfanos > 0 THEN
    RAISE EXCEPTION 'Quedan % referencias a materiales globales sin remapear; abortando migracion', huerfanos;
  END IF;
END $$;

-- 6. Eliminar los materiales globales originales (ya sin referencias; incluye "Otros").
DELETE FROM material WHERE departamento_id IS NULL;

-- 7. Finalizar: quitar columna temporal, fijar NOT NULL, unique e índice.
ALTER TABLE material DROP COLUMN origen_global_id;
ALTER TABLE material ALTER COLUMN departamento_id SET NOT NULL;
ALTER TABLE material
  ADD CONSTRAINT uq_material_departamento_nombre UNIQUE (departamento_id, nombre);
CREATE INDEX idx_material_departamento ON material(departamento_id);

COMMIT;
