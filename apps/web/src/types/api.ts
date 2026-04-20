export type Zona = {
  id: number;
  nombre: string;
  descripcion: string | null;
  latitud: number | null;
  longitud: number | null;
  radio_km: number | null;
  activo: boolean;
  fecha_creacion: string;
};

export type TipoGenerador = {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: string;
};

export type UnidadMedida = "KG" | "UNIDAD" | "BOLSA" | "TONELADA";

export type Material = {
  id: number;
  nombre: string;
  descripcion: string | null;
  unidad_medida_default: UnidadMedida | null;
  factor_co2: number | null;
  activo: boolean;
  fecha_creacion: string;
};

export type EstadoPrecio = "VIGENTE" | "POR_VENCER" | "VENCIDO";

export type PrecioMaterial = {
  id: number;
  material_id: number;
  precio_minimo: number;
  precio_maximo: number;
  fecha_inicio: string;
  fecha_fin: string | null;
  fecha_creacion: string;
  estado: EstadoPrecio;
  material: {
    id: number;
    nombre: string;
    unidad_medida_default: UnidadMedida | null;
  };
};

export type Administrador = {
  id: number;
  usuario_id: number;
  nombre_completo: string;
  telefono: string;
  fecha_creacion: string;
  usuario: {
    email: string | null;
    activo: boolean;
  };
};

export type Generador = {
  id: number;
  usuario_id: number;
  razon_social: string;
  tipo_generador_id: number;
  contacto_nombre: string;
  contacto_telefono: string;
  contacto_email: string | null;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  fecha_creacion: string;
  usuario: {
    email: string | null;
    activo: boolean;
  };
  tipo_generador: {
    id: number;
    nombre: string;
    descripcion: string | null;
    activo: boolean;
    fecha_creacion: string;
  };
};

export type TipoAcopio = "FIJO" | "MOVIL";

export type Acopiador = {
  id: number;
  usuario_id: number;
  nombre_completo: string;
  cedula_identidad: string;
  celular: string;
  tipo_acopio: TipoAcopio;
  nombre_punto: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  zona_id: number;
  horario_operacion: string | null;
  activo: boolean;
  fecha_creacion: string;
  usuario: {
    email: string | null;
    activo: boolean;
  };
  zona: {
    id: number;
    nombre: string;
  };
};

export type FrecuenciaRecojo =
  | "DIARIO"
  | "SEMANAL"
  | "QUINCENAL"
  | "MENSUAL"
  | "BAJO_DEMANDA";

export type SucursalMaterial = {
  id: number;
  sucursal_id: number;
  material_id: number;
  cantidad_aproximada: string | null;
  material: {
    id: number;
    nombre: string;
  };
};

export type SucursalHorario = {
  id: number;
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
};

export type Sucursal = {
  id: number;
  generador_id: number;
  nombre: string;
  direccion: string;
  latitud: number;
  longitud: number;
  zona_id: number;
  horario_recojo: string | null;
  frecuencia: FrecuenciaRecojo | null;
  activo: boolean;
  fecha_creacion: string;
  generador: {
    id: number;
    razon_social: string;
  };
  zona: {
    id: number;
    nombre: string;
  };
  sucursal_material: SucursalMaterial[];
  sucursal_horario: SucursalHorario[];
};

export type Genero = "HOMBRE" | "MUJER" | "NO_ESPECIFICA";

export type DiaSemana =
  | "LUNES"
  | "MARTES"
  | "MIERCOLES"
  | "JUEVES"
  | "VIERNES"
  | "SABADO"
  | "DOMINGO";

export type RecolectorMaterial = {
  id: number;
  recolector_id: number;
  material_id: number;
  cantidad_mensual: number | null;
  precio_venta: number | null;
  es_principal: boolean;
  material: {
    id: number;
    nombre: string;
  };
};

export type RecolectorTipoGenerador = {
  id: number;
  recolector_id: number;
  tipo_generador_id: number;
  tipo_generador: {
    id: number;
    nombre: string;
  };
};

export type Recolector = {
  id: number;
  usuario_id: number;
  nombre_completo: string;
  cedula_identidad: string;
  celular: string;
  direccion_domicilio: string;
  latitud: number;
  longitud: number;
  acopiador_id: number;
  zona_id: number;
  asociacion_id: number | null;
  genero: Genero;
  edad: number;
  trabaja_individual: boolean;
  activo: boolean;
  fecha_creacion: string;
  usuario: {
    email: string | null;
    activo: boolean;
  };
  acopiador: {
    id: number;
    nombre_completo: string;
    nombre_punto: string;
  };
  zona: {
    id: number;
    nombre: string;
  };
  asociacion: {
    id: number;
    nombre: string;
  } | null;
  recolector_dia_trabajo: { dia_semana: DiaSemana }[];
  recolector_material: RecolectorMaterial[];
  recolector_tipo_generador: RecolectorTipoGenerador[];
};

export type Asociacion = {
  id: number;
  nombre: string;
  representante: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
  fecha_creacion: string;
};

export type Evento = {
  id: number;
  titulo: string;
  descripcion: string | null;
  zona_id: number;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  fecha_evento: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  creado_por_id: number;
  activo: boolean;
  fecha_creacion: string;
  zona: {
    id: number;
    nombre: string;
  };
  administrador: {
    id: number;
    nombre_completo: string;
  };
};

export type TipoNotificacion =
  | "RESIDUOS_DISPONIBLES"
  | "SOLICITUD_RECOJO"
  | "EVENTO"
  | "SISTEMA"
  | "GENERAL";

export type Notificacion = {
  id: number;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string | null;
  leida: boolean;
  fecha_creacion: string;
  fecha_lectura: string | null;
  zona: { id: number; nombre: string } | null;
  emisor: { id: number; email: string | null; identificador: string } | null;
  receptor: { id: number; email: string | null; identificador: string } | null;
  evento_id: number | null;
};

// --- Transacciones ---

export type EstadoTransaccion = "GENERADO" | "RECOLECTADO" | "ENTREGADO" | "PAGADO";

export type DetalleTransaccion = {
  id: number;
  transaccion_id: number;
  material_id: number;
  cantidad: string;
  unidad_medida: string;
  precio_unitario: string;
  subtotal: string;
  material: {
    id: number;
    nombre: string;
  };
};

export type TransaccionHistorial = {
  id: number;
  transaccion_id: number;
  estado: EstadoTransaccion;
  actor_id: number;
  rol_actor: string;
  observaciones: string | null;
  detalles: Record<string, unknown> | null;
  fecha: string;
  usuario: {
    id: number;
    identificador: string;
    rol: string;
  };
};

export type Transaccion = {
  id: number;
  fecha: string;
  hora: string;
  recolector_id: number | null;
  acopiador_id: number | null;
  sucursal_id: number | null;
  zona_id: number;
  monto_total: string;
  observaciones: string | null;
  fecha_creacion: string;
  estado: EstadoTransaccion;
  creado_por_id: number | null;
  recolector: { id: number; nombre_completo: string } | null;
  acopiador: { id: number; nombre_completo: string; nombre_punto: string } | null;
  zona: { id: number; nombre: string };
  detalle_transaccion: DetalleTransaccion[];
};

export type TransaccionDetalle = Transaccion & {
  sucursal: {
    id: number;
    nombre: string;
    generador: { id: number; razon_social: string };
  } | null;
  transaccion_historial: TransaccionHistorial[];
};

export type CreateTransaccionDetalle = {
  material_id: number;
  cantidad: number;
  unidad_medida: UnidadMedida;
  precio_unitario?: number;
};

export type CreateTransaccionInput = {
  estado?: EstadoTransaccion;
  recolector_id?: number;
  acopiador_id?: number;
  sucursal_id?: number;
  zona_id?: number;
  fecha?: string;
  hora?: string;
  observaciones?: string;
  detalles: CreateTransaccionDetalle[];
};

// --- Pagos ---

export type PagoTransaccion = {
  transaccion_id: number;
  transaccion?: {
    id: number;
    fecha: string;
    monto_total: string;
    detalle_transaccion: DetalleTransaccion[];
  };
};

export type Pago = {
  id: number;
  recolector_id: number;
  acopiador_id: number;
  monto_total: string;
  fecha_pago: string;
  observaciones: string | null;
  fecha_creacion: string;
  recolector: { id: number; nombre_completo: string };
  acopiador: { id: number; nombre_completo: string };
  pago_transaccion: PagoTransaccion[];
};

// --- Paginación ---

export type PaginatedMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginatedMeta;
};
