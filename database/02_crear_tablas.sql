-- ============================================
-- SCRIPT DE CREACIÓN DE TABLAS
-- Base de datos: impacto_bd
-- Solo campos necesarios (sin opcionales)
-- ============================================

-- ============================================
-- TIPOS ENUMERADOS
-- ============================================

CREATE TYPE rol_usuario AS ENUM (
    'ADMIN',
    'RECOLECTOR',
    'ACOPIADOR',
    'GENERADOR'
);

CREATE TYPE genero AS ENUM (
    'HOMBRE',
    'MUJER',
    'NO_ESPECIFICA'
);

CREATE TYPE tipo_acopio AS ENUM (
    'FIJO',
    'MOVIL'
);

CREATE TYPE frecuencia_recojo AS ENUM (
    'DIARIO',
    'SEMANAL',
    'QUINCENAL',
    'MENSUAL',
    'BAJO_DEMANDA'
);

CREATE TYPE dia_semana AS ENUM (
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO',
    'DOMINGO'
);

CREATE TYPE unidad_medida AS ENUM (
    'KG',
    'UNIDAD',
    'BOLSA',
    'TONELADA'
);

-- ============================================
-- CATÁLOGOS DEL SISTEMA
-- ============================================

CREATE TABLE zona (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    radio_km DECIMAL(5,2),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tipo_generador (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE material (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    unidad_medida_default unidad_medida NOT NULL DEFAULT 'KG',
    precio_referencial DECIMAL(10,2),
    factor_co2 DECIMAL(10,4),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE asociacion (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(150) NOT NULL,
    representante VARCHAR(150),
    telefono VARCHAR(20),
    direccion VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- USUARIO (Autenticación)
-- ============================================

CREATE TABLE usuario (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuario_email ON usuario(email);
CREATE INDEX idx_usuario_rol ON usuario(rol);

-- ============================================
-- ADMINISTRADOR
-- ============================================

CREATE TABLE administrador (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(150) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_administrador_usuario ON administrador(usuario_id);

-- ============================================
-- ACOPIADOR
-- ============================================

CREATE TABLE acopiador (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(150) NOT NULL,
    cedula_identidad VARCHAR(20) NOT NULL UNIQUE,
    celular VARCHAR(20) NOT NULL,
    tipo_acopio tipo_acopio NOT NULL,
    nombre_punto VARCHAR(150) NOT NULL,
    direccion VARCHAR(255),
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    zona_id INTEGER NOT NULL REFERENCES zona(id),
    horario_operacion VARCHAR(100),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_acopiador_usuario ON acopiador(usuario_id);
CREATE INDEX idx_acopiador_zona ON acopiador(zona_id);
CREATE INDEX idx_acopiador_cedula ON acopiador(cedula_identidad);

-- ============================================
-- RECOLECTOR (Solo campos necesarios)
-- ============================================

CREATE TABLE recolector (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,

    -- Datos de identificación
    nombre_completo VARCHAR(150) NOT NULL,
    cedula_identidad VARCHAR(20) NOT NULL UNIQUE,
    celular VARCHAR(20) NOT NULL,

    -- Ubicación (crítico para acopiador móvil)
    direccion_domicilio VARCHAR(255) NOT NULL,
    latitud DECIMAL(10,8) NOT NULL,
    longitud DECIMAL(11,8) NOT NULL,

    -- Relaciones
    acopiador_id INTEGER NOT NULL REFERENCES acopiador(id),
    zona_id INTEGER NOT NULL REFERENCES zona(id),
    asociacion_id INTEGER REFERENCES asociacion(id),

    -- Datos demográficos básicos
    genero genero NOT NULL,
    edad INTEGER NOT NULL CHECK (edad >= 0 AND edad <= 120),
    trabaja_individual BOOLEAN NOT NULL DEFAULT TRUE,

    -- Control
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recolector_usuario ON recolector(usuario_id);
CREATE INDEX idx_recolector_acopiador ON recolector(acopiador_id);
CREATE INDEX idx_recolector_zona ON recolector(zona_id);
CREATE INDEX idx_recolector_asociacion ON recolector(asociacion_id);
CREATE INDEX idx_recolector_cedula ON recolector(cedula_identidad);
CREATE INDEX idx_recolector_ubicacion ON recolector(latitud, longitud);

-- ============================================
-- GENERADOR
-- ============================================

CREATE TABLE generador (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL UNIQUE REFERENCES usuario(id) ON DELETE CASCADE,
    razon_social VARCHAR(200) NOT NULL,
    tipo_generador_id INTEGER NOT NULL REFERENCES tipo_generador(id),
    contacto_nombre VARCHAR(150) NOT NULL,
    contacto_telefono VARCHAR(20) NOT NULL,
    contacto_email VARCHAR(150),
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_generador_usuario ON generador(usuario_id);
CREATE INDEX idx_generador_tipo ON generador(tipo_generador_id);

-- ============================================
-- SUCURSAL (Punto de recogida)
-- ============================================

CREATE TABLE sucursal (
    id SERIAL PRIMARY KEY,
    generador_id INTEGER NOT NULL REFERENCES generador(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    direccion VARCHAR(255) NOT NULL,
    latitud DECIMAL(10,8) NOT NULL,
    longitud DECIMAL(11,8) NOT NULL,
    zona_id INTEGER NOT NULL REFERENCES zona(id),
    horario_recojo VARCHAR(100),
    frecuencia frecuencia_recojo,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sucursal_generador ON sucursal(generador_id);
CREATE INDEX idx_sucursal_zona ON sucursal(zona_id);
CREATE INDEX idx_sucursal_ubicacion ON sucursal(latitud, longitud);

-- ============================================
-- TABLAS INTERMEDIAS (N:N)
-- ============================================

CREATE TABLE recolector_dia_trabajo (
    id SERIAL PRIMARY KEY,
    recolector_id INTEGER NOT NULL REFERENCES recolector(id) ON DELETE CASCADE,
    dia_semana dia_semana NOT NULL,
    UNIQUE(recolector_id, dia_semana)
);

CREATE INDEX idx_recolector_dia_recolector ON recolector_dia_trabajo(recolector_id);

CREATE TABLE recolector_material (
    id SERIAL PRIMARY KEY,
    recolector_id INTEGER NOT NULL REFERENCES recolector(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES material(id),
    cantidad_mensual DECIMAL(10,2),
    precio_venta DECIMAL(10,2),
    es_principal BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(recolector_id, material_id)
);

CREATE INDEX idx_recolector_material_recolector ON recolector_material(recolector_id);
CREATE INDEX idx_recolector_material_material ON recolector_material(material_id);

CREATE TABLE recolector_tipo_generador (
    id SERIAL PRIMARY KEY,
    recolector_id INTEGER NOT NULL REFERENCES recolector(id) ON DELETE CASCADE,
    tipo_generador_id INTEGER NOT NULL REFERENCES tipo_generador(id),
    UNIQUE(recolector_id, tipo_generador_id)
);

CREATE INDEX idx_recolector_tipo_gen_recolector ON recolector_tipo_generador(recolector_id);

CREATE TABLE sucursal_material (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER NOT NULL REFERENCES sucursal(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES material(id),
    cantidad_aproximada VARCHAR(100),
    UNIQUE(sucursal_id, material_id)
);

CREATE INDEX idx_sucursal_material_sucursal ON sucursal_material(sucursal_id);

-- ============================================
-- DATOS INICIALES
-- ============================================

INSERT INTO tipo_generador (nombre, descripcion) VALUES
    ('Condominios', 'Edificios residenciales'),
    ('Hospitales', 'Centros de salud'),
    ('Colegios', 'Instituciones educativas'),
    ('Fábricas', 'Industrias'),
    ('Empresas', 'Oficinas corporativas'),
    ('Bancos', 'Instituciones financieras'),
    ('Contenedores', 'Contenedores públicos'),
    ('Casas', 'Domicilios particulares'),
    ('Supermercados', 'Comercio grande'),
    ('Tiendas', 'Comercio pequeño'),
    ('Discotecas', 'Entretenimiento'),
    ('Calle', 'Recolección en vía pública'),
    ('Otros', 'Otros tipos');

INSERT INTO material (nombre, descripcion, unidad_medida_default) VALUES
    ('Cartón', 'Cajas, cartón corrugado', 'KG'),
    ('Papel', 'Papel de oficina, periódicos', 'KG'),
    ('Plástico PET', 'Botellas plásticas', 'KG'),
    ('Plástico otros', 'Otros plásticos', 'KG'),
    ('Vidrio', 'Botellas, frascos de vidrio', 'KG'),
    ('Metal/Aluminio', 'Latas, aluminio', 'KG'),
    ('Chatarra', 'Metal pesado', 'KG'),
    ('Electrónicos', 'Equipos electrónicos', 'UNIDAD'),
    ('Otros', 'Materiales no clasificados', 'KG');
