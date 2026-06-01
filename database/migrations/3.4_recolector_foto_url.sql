-- =====================================================================
-- 3.4 Foto de perfil del recolector
-- =====================================================================
-- El cliente indicó que los recolectores ya tienen credenciales que
-- funcionan como foto de perfil. Se agrega una columna para guardar la
-- imagen del recolector.
--
-- La imagen NO vive en la base de datos: se guarda como archivo en disco
-- (procesada con sharp a WebP) y aquí solo se almacena su RUTA relativa,
-- que nginx sirve directamente. Ej: '/uploads/recolectores/<uuid>.webp'.
--
--   - foto_url VARCHAR(255) NULL.
--   - Nullable: los recolectores existentes quedan sin foto, sin romper
--     nada (NULL = sin foto).
--
-- Toda la migración va en una transacción.
-- =====================================================================

BEGIN;

ALTER TABLE recolector ADD COLUMN IF NOT EXISTS foto_url VARCHAR(255) NULL;

COMMIT;
