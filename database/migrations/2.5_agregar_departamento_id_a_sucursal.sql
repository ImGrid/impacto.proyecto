-- Fase 2.5 del cambio definitivo (mayo 2026)
-- Agrega departamento_id NOT NULL a la tabla sucursal.
-- Esto es la última denormalización para el filtro global por departamento.
-- Pre-requisito: tabla departamento creada y seedeada (Fase 2.1), sucursal vacía (Fase 1).
-- Referencia: docs/19_cambio_modelo_centros_operacionales.md sección 4.3 y 5.1

BEGIN;

ALTER TABLE sucursal ADD COLUMN departamento_id INTEGER REFERENCES departamento(id);
ALTER TABLE sucursal ALTER COLUMN departamento_id SET NOT NULL;
CREATE INDEX idx_sucursal_departamento ON sucursal(departamento_id);

COMMIT;
