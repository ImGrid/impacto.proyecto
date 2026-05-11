-- Fase 2.2 del cambio definitivo (mayo 2026)
-- Agrega ciudad_id NOT NULL FK a la tabla zona
-- Pre-requisito: tabla ciudad creada (Fase 2.1) y tabla zona vacía (Fase 1)
-- Referencia: docs/19_cambio_modelo_centros_operacionales.md sección 4.3
-- Referencia: docs/21_plan_implementacion_cambio_definitivo.md sección 4 (Fase 2.2)

BEGIN;

-- Agregar columna como nullable primero (idempotente si tabla está vacía, pero seguro)
ALTER TABLE zona ADD COLUMN ciudad_id INTEGER REFERENCES ciudad(id);

-- Hacerla obligatoria (segura porque la tabla está vacía)
ALTER TABLE zona ALTER COLUMN ciudad_id SET NOT NULL;

-- Índice para queries por ciudad
CREATE INDEX idx_zona_ciudad ON zona(ciudad_id);

COMMIT;
