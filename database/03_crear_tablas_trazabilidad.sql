-- ============================================
-- SCRIPT DE CREACIÓN DE TABLAS DE TRAZABILIDAD
-- Base de datos: impacto_bd
-- ============================================

-- ============================================
-- NUEVOS TIPOS ENUMERADOS
-- ============================================

CREATE TYPE tipo_notificacion AS ENUM (
    'RESIDUOS_DISPONIBLES',
    'SOLICITUD_RECOJO',
    'EVENTO',
    'SISTEMA',
    'GENERAL'
);

CREATE TYPE estado_qr AS ENUM (
    'CREADO',
    'EN_RECOLECCION',
    'ENTREGADO',
    'VERIFICADO',
    'ANULADO'
);

CREATE TYPE accion_qr AS ENUM (
    'GENERADO',
    'ESCANEADO_RECOLECTOR',
    'ESCANEADO_ACOPIADOR',
    'VERIFICADO',
    'ANULADO'
);

-- ============================================
-- TABLA: EVENTO
-- Eventos de recolección (programados o inesperados)
-- ============================================

CREATE TABLE evento (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    zona_id INTEGER NOT NULL REFERENCES zona(id),
    direccion VARCHAR(255),
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    fecha_evento DATE NOT NULL,
    hora_inicio TIME,
    hora_fin TIME,
    creado_por_id INTEGER NOT NULL REFERENCES administrador(id),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_evento_zona ON evento(zona_id);
CREATE INDEX idx_evento_fecha ON evento(fecha_evento);
CREATE INDEX idx_evento_creador ON evento(creado_por_id);

-- ============================================
-- TABLA: NOTIFICACION
-- Sistema de notificaciones filtradas por zona
-- ============================================

CREATE TABLE notificacion (
    id SERIAL PRIMARY KEY,
    tipo tipo_notificacion NOT NULL,
    emisor_id INTEGER NOT NULL REFERENCES usuario(id),
    receptor_id INTEGER REFERENCES usuario(id),
    zona_id INTEGER REFERENCES zona(id),
    evento_id INTEGER REFERENCES evento(id),
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT,
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_lectura TIMESTAMP
);

CREATE INDEX idx_notificacion_emisor ON notificacion(emisor_id);
CREATE INDEX idx_notificacion_receptor ON notificacion(receptor_id);
CREATE INDEX idx_notificacion_zona ON notificacion(zona_id);
CREATE INDEX idx_notificacion_evento ON notificacion(evento_id);
CREATE INDEX idx_notificacion_tipo ON notificacion(tipo);
CREATE INDEX idx_notificacion_leida ON notificacion(leida);

-- ============================================
-- TABLA: TRANSACCION
-- Registro de cada entrega de materiales
-- ============================================

CREATE TABLE transaccion (
    id SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    recolector_id INTEGER NOT NULL REFERENCES recolector(id),
    acopiador_id INTEGER NOT NULL REFERENCES acopiador(id),
    sucursal_id INTEGER REFERENCES sucursal(id),
    zona_id INTEGER NOT NULL REFERENCES zona(id),
    monto_total DECIMAL(10,2) NOT NULL DEFAULT 0,
    observaciones TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transaccion_recolector ON transaccion(recolector_id);
CREATE INDEX idx_transaccion_acopiador ON transaccion(acopiador_id);
CREATE INDEX idx_transaccion_sucursal ON transaccion(sucursal_id);
CREATE INDEX idx_transaccion_zona ON transaccion(zona_id);
CREATE INDEX idx_transaccion_fecha ON transaccion(fecha);

-- ============================================
-- TABLA: DETALLE_TRANSACCION
-- Materiales de cada transacción (1:N)
-- ============================================

CREATE TABLE detalle_transaccion (
    id SERIAL PRIMARY KEY,
    transaccion_id INTEGER NOT NULL REFERENCES transaccion(id) ON DELETE CASCADE,
    material_id INTEGER NOT NULL REFERENCES material(id),
    cantidad DECIMAL(10,2) NOT NULL,
    unidad_medida unidad_medida NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

CREATE INDEX idx_detalle_transaccion ON detalle_transaccion(transaccion_id);
CREATE INDEX idx_detalle_material ON detalle_transaccion(material_id);

-- ============================================
-- TABLA: PAGO
-- Pagos acumulados a recolectores
-- ============================================

CREATE TABLE pago (
    id SERIAL PRIMARY KEY,
    recolector_id INTEGER NOT NULL REFERENCES recolector(id),
    acopiador_id INTEGER NOT NULL REFERENCES acopiador(id),
    monto_total DECIMAL(10,2) NOT NULL,
    fecha_pago DATE NOT NULL,
    observaciones TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pago_recolector ON pago(recolector_id);
CREATE INDEX idx_pago_acopiador ON pago(acopiador_id);
CREATE INDEX idx_pago_fecha ON pago(fecha_pago);

-- ============================================
-- TABLA: PAGO_TRANSACCION
-- Relación entre pagos y transacciones pagadas
-- ============================================

CREATE TABLE pago_transaccion (
    id SERIAL PRIMARY KEY,
    pago_id INTEGER NOT NULL REFERENCES pago(id) ON DELETE CASCADE,
    transaccion_id INTEGER NOT NULL REFERENCES transaccion(id),
    UNIQUE(transaccion_id)
);

CREATE INDEX idx_pago_transaccion_pago ON pago_transaccion(pago_id);
CREATE INDEX idx_pago_transaccion_trans ON pago_transaccion(transaccion_id);

-- ============================================
-- TABLA: CODIGO_QR (Opcional - para trazabilidad)
-- ============================================

CREATE TABLE codigo_qr (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    estado estado_qr NOT NULL DEFAULT 'CREADO',
    generado_por_id INTEGER NOT NULL REFERENCES acopiador(id),
    transaccion_id INTEGER REFERENCES transaccion(id),
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_qr_codigo ON codigo_qr(codigo);
CREATE INDEX idx_qr_estado ON codigo_qr(estado);
CREATE INDEX idx_qr_generador ON codigo_qr(generado_por_id);
CREATE INDEX idx_qr_transaccion ON codigo_qr(transaccion_id);

-- ============================================
-- TABLA: HISTORIAL_QR (Opcional - escaneos)
-- ============================================

CREATE TABLE historial_qr (
    id SERIAL PRIMARY KEY,
    codigo_qr_id INTEGER NOT NULL REFERENCES codigo_qr(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuario(id),
    accion accion_qr NOT NULL,
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_historial_qr ON historial_qr(codigo_qr_id);
CREATE INDEX idx_historial_usuario ON historial_qr(usuario_id);
CREATE INDEX idx_historial_fecha ON historial_qr(fecha);
