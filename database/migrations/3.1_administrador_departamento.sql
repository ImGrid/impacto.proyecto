-- =====================================================================
-- 3.1 Administradores asignados a un departamento
-- =====================================================================
-- Agrega la columna administrador.departamento_id (nullable, FK a
-- departamento):
--   - NULL  -> administrador GLOBAL: elige departamento al entrar y puede
--              cambiarlo con el switcher (comportamiento previo).
--   - valor -> administrador ASIGNADO a ese departamento: el login lo
--              fuerza a ese departamento y no puede cambiarse a otro.
--
-- La columna es nullable y sin default, así que los administradores
-- existentes quedan automáticamente como GLOBAL. No requiere backfill.
--
-- Tras correr esta migración, provisionar los administradores con el
-- script:  pnpm --filter database exec tsx prisma/crear-admins-departamentales.ts
--
-- Ver docs/22_administradores_por_departamento.md
-- =====================================================================

BEGIN;

ALTER TABLE administrador
  ADD COLUMN IF NOT EXISTS departamento_id INTEGER NULL
  REFERENCES departamento(id);

COMMIT;
