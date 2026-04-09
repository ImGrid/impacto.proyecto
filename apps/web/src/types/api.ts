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
    email: string;
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
    email: string;
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
    email: string;
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
    email: string;
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
  emisor: { id: number; email: string } | null;
  receptor: { id: number; email: string } | null;
  evento_id: number | null;
};

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
