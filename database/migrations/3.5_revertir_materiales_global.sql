-- =====================================================================
-- 3.5_revertir_materiales_global.sql
-- Revierte el catálogo `material` de PER-DEPARTAMENTO a GLOBAL.
--
-- Deshace la parte per-departamento de la migración 3.2 (NO toca el
-- material "Otro" texto libre de la 3.3, que es ortogonal).
--
-- Resultado: 15 materiales globales curados (los que los deptos activos
-- LP/CB/SC realmente usan). Se descartan los 5 legacy del grupo C
-- (Metal/Aluminio, Nailon, Papel, Plástico duro, Plástico PET), que solo
-- existían en deptos vacíos y tienen 0 referencias.
--
-- Canónico = menor id entre los deptos activos (1,2,3) por nombre
-- normalizado (minúsculas, sin acentos, espacios colapsados).
-- =====================================================================

SET client_encoding TO 'UTF8';

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Tabla puente: cada material -> su canónico global.
--    Los materiales cuyo nombre normalizado NO existe en deptos 1,2,3
--    (grupo C) quedan fuera del mapeo y se borran al final.
-- ---------------------------------------------------------------------
CREATE TEMP TABLE _map_material ON COMMIT DROP AS
WITH norm AS (
  SELECT id, departamento_id, nombre,
    translate(lower(btrim(regexp_replace(nombre, '\s+', ' ', 'g'))),
              'áéíóúñ', 'aeioun') AS nn
  FROM material
),
canon AS (
  SELECT nn, min(id) AS canon_id
  FROM norm
  WHERE departamento_id IN (1, 2, 3)
  GROUP BY nn
)
SELECT n.id AS old_id, c.canon_id, n.nn
FROM norm n
JOIN canon c ON c.nn = n.nn;

-- ---------------------------------------------------------------------
-- 2. Verificaciones previas (abortan la transacción si fallan).
-- ---------------------------------------------------------------------
-- 2a. Deben quedar exactamente 15 canónicos.
DO $$
DECLARE n_canon INT;
BEGIN
  SELECT count(DISTINCT canon_id) INTO n_canon FROM _map_material;
  IF n_canon <> 15 THEN
    RAISE EXCEPTION 'Se esperaban 15 materiales canónicos, se obtuvieron %', n_canon;
  END IF;
END $$;

-- 2b. Ninguna FK hija puede apuntar a un material sin canónico (grupo C):
--     perderíamos esa referencia al borrarlo.
DO $$
DECLARE huerfanos INT;
BEGIN
  SELECT
      (SELECT count(*) FROM recolector_material rm WHERE rm.material_id IS NOT NULL AND rm.material_id NOT IN (SELECT old_id FROM _map_material))
    + (SELECT count(*) FROM sucursal_material   sm WHERE sm.material_id IS NOT NULL AND sm.material_id NOT IN (SELECT old_id FROM _map_material))
    + (SELECT count(*) FROM detalle_transaccion dt WHERE dt.material_id IS NOT NULL AND dt.material_id NOT IN (SELECT old_id FROM _map_material))
    + (SELECT count(*) FROM precio_material      pm WHERE pm.material_id NOT IN (SELECT old_id FROM _map_material))
  INTO huerfanos;
  IF huerfanos > 0 THEN
    RAISE EXCEPTION 'Hay % referencias a materiales sin canónico (grupo C); abortando', huerfanos;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3. Remapear las FKs hijas al material canónico.
-- ---------------------------------------------------------------------
UPDATE recolector_material rm SET material_id = m.canon_id
  FROM _map_material m WHERE rm.material_id = m.old_id AND rm.material_id <> m.canon_id;

UPDATE sucursal_material sm SET material_id = m.canon_id
  FROM _map_material m WHERE sm.material_id = m.old_id AND sm.material_id <> m.canon_id;

UPDATE detalle_transaccion dt SET material_id = m.canon_id
  FROM _map_material m WHERE dt.material_id = m.old_id AND dt.material_id <> m.canon_id;

UPDATE precio_material pm SET material_id = m.canon_id
  FROM _map_material m WHERE pm.material_id = m.old_id AND pm.material_id <> m.canon_id;

-- ---------------------------------------------------------------------
-- 4. Borrar los materiales no canónicos (duplicados per-depto + grupo C).
--    Tras el remapeo ninguna FK los referencia.
-- ---------------------------------------------------------------------
DELETE FROM material WHERE id NOT IN (SELECT DISTINCT canon_id FROM _map_material);

-- ---------------------------------------------------------------------
-- 5. Normalizar nombres de los 15 canónicos.
-- ---------------------------------------------------------------------
-- 5a. Quitar espacios sobrantes (varios tenían espacio al final).
UPDATE material SET nombre = btrim(nombre) WHERE nombre <> btrim(nombre);
-- 5b. Unificar capitalización del polietileno de alta densidad.
UPDATE material SET nombre = 'Polietileno de Alta densidad'
  WHERE translate(lower(btrim(nombre)), 'áéíóúñ', 'aeioun') = 'polietileno de alta densidad';

-- ---------------------------------------------------------------------
-- 6. DDL: material pasa a catálogo global.
-- ---------------------------------------------------------------------
ALTER TABLE material DROP CONSTRAINT uq_material_departamento_nombre;
ALTER TABLE material DROP CONSTRAINT material_departamento_id_fkey;
DROP INDEX idx_material_departamento;
ALTER TABLE material DROP COLUMN departamento_id;
ALTER TABLE material ADD CONSTRAINT uq_material_nombre UNIQUE (nombre);

-- ---------------------------------------------------------------------
-- 7. Verificación final.
-- ---------------------------------------------------------------------
DO $$
DECLARE n_mat INT; n_dup INT;
BEGIN
  SELECT count(*) INTO n_mat FROM material;
  IF n_mat <> 15 THEN
    RAISE EXCEPTION 'Se esperaban 15 materiales finales, hay %', n_mat;
  END IF;
  SELECT count(*) INTO n_dup FROM (SELECT nombre FROM material GROUP BY nombre HAVING count(*) > 1) x;
  IF n_dup > 0 THEN
    RAISE EXCEPTION 'Quedan % nombres de material duplicados', n_dup;
  END IF;
END $$;

COMMIT;
