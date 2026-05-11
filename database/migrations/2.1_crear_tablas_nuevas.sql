-- Fase 2.1 del cambio definitivo (mayo 2026)
-- Crea las 3 tablas nuevas: departamento, ciudad, acopiador_comprador_externo
-- Seedea los 9 departamentos de Bolivia
-- Referencia: docs/19_cambio_modelo_centros_operacionales.md sección 4.2
-- Referencia: docs/21_plan_implementacion_cambio_definitivo.md sección 4 (Fase 2)

BEGIN;

-- 1) departamento
CREATE TABLE departamento (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(80) NOT NULL UNIQUE,
  codigo         VARCHAR(10) UNIQUE,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO departamento (nombre, codigo) VALUES
  ('La Paz', 'LP'),
  ('Cochabamba', 'CB'),
  ('Santa Cruz', 'SC'),
  ('Oruro', 'OR'),
  ('Potosí', 'PT'),
  ('Chuquisaca', 'CH'),
  ('Tarija', 'TJ'),
  ('Beni', 'BN'),
  ('Pando', 'PD');

-- 2) ciudad
CREATE TABLE ciudad (
  id              SERIAL PRIMARY KEY,
  departamento_id INTEGER NOT NULL REFERENCES departamento(id),
  nombre          VARCHAR(120) NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(departamento_id, nombre)
);
CREATE INDEX idx_ciudad_departamento ON ciudad(departamento_id);

-- 3) acopiador_comprador_externo (sin campo tipo, según decisión del cliente)
CREATE TABLE acopiador_comprador_externo (
  id             SERIAL PRIMARY KEY,
  nombre         VARCHAR(150) NOT NULL,
  asociacion     VARCHAR(150),
  telefono       VARCHAR(20),
  observacion    TEXT,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_externo_activo ON acopiador_comprador_externo(activo);

COMMIT;
