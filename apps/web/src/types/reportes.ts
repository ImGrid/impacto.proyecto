// Tipos de respuesta de los endpoints del módulo `reportes` del backend.
// Definidos como `type` (no `interface`) para que sean asignables a
// Record<string, unknown> en los componentes genéricos de tabla.

export type ReporteRango = { desde: string; hasta: string };

// Los `items` de los reportes agregados llevan `porcentaje`: la participación
// de la fila sobre los kg del TOTAL mostrado. La calcula el backend
// (`conParticipacion`) para que pantalla, Excel y PDF digan siempre lo mismo.

export type TotalTx = {
  recolectoras: number;
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};

export type TotalLinea = {
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};

export type ReportePorAsociacion = {
  rango: ReporteRango;
  total: TotalTx;
  items: {
    asociacion_id: number;
    asociacion: string;
    recolectoras: number;
    transacciones: number;
    kg: number;
    co2_kg: number;
    bs: number;
    porcentaje: number;
  }[];
};

export type ReportePorZona = {
  rango: ReporteRango;
  total: TotalTx;
  items: {
    zona_id: number;
    zona: string;
    ciudad: string;
    recolectoras: number;
    transacciones: number;
    kg: number;
    co2_kg: number;
    bs: number;
    porcentaje: number;
  }[];
};

export type ReportePorDestino = {
  rango: ReporteRango;
  total: TotalTx;
  items: {
    tipo_destino: string;
    destino: string;
    transacciones: number;
    kg: number;
    co2_kg: number;
    bs: number;
    porcentaje: number;
  }[];
};

export type ReportePorMaterial = {
  rango: ReporteRango;
  total: TotalTx;
  items: {
    material_id: number;
    material: string;
    transacciones: number;
    kg: number;
    bs: number;
    co2_kg: number;
    porcentaje: number;
  }[];
};

export type ReportePorGenerador = {
  rango: ReporteRango;
  total: {
    generadores: number;
    sucursales: number;
    transacciones: number;
    kg: number;
    co2_kg: number;
    bs: number;
  };
  items: {
    generador_id: number;
    generador: string;
    tipo_generador: string | null;
    sucursales: number;
    transacciones: number;
    kg: number;
    co2_kg: number;
    bs: number;
    porcentaje: number;
  }[];
};

// Ficha (drill-through) de UN generador: perfil + actividad agregada de sus
// sucursales. Estructura en capas (KPIs/entregas a nivel transacción; resumen
// por sucursal agregado aparte).
export type ReporteGeneradorDetalle = {
  rango: ReporteRango;
  perfil: {
    id: number;
    nombre: string;
    tipo_generador: string | null;
    contacto_nombre: string | null;
    contacto_telefono: string | null;
    contacto_email: string | null;
    departamentos: string[];
  };
  actividad: {
    total: {
      sucursales: number;
      transacciones: number;
      kg: number;
      co2_kg: number;
      bs: number;
    };
    por_sucursal: {
      sucursal_id: number;
      sucursal: string;
      ciudad: string;
      entregas: number;
      kg: number;
      co2_kg: number;
      bs: number;
    }[];
    por_material: {
      material_id: number;
      material: string;
      kg: number;
      bs: number;
      co2_kg: number;
    }[];
    entregas: {
      transaccion_id: number;
      fecha: string;
      estado: string;
      recolector: string | null;
      sucursales: number;
      sucursales_nombres: string | null;
      kg: number;
      bs: number;
    }[];
  };
};

export type ReportePorTipoGenerador = {
  rango: ReporteRango;
  total: TotalLinea;
  items: {
    tipo_generador_id: number;
    tipo_generador: string;
    generadores: number;
    transacciones: number;
    kg: number;
    bs: number;
    co2_kg: number;
    porcentaje: number;
  }[];
};

export type ReporteMatriz = {
  rango: ReporteRango;
  total: TotalLinea;
  items: {
    material_id: number;
    material: string;
    tipo_generador_id: number;
    tipo_generador: string;
    kg: number;
    bs: number;
    co2_kg: number;
  }[];
};

// --- Reporte nacional (comparación entre departamentos) ---

export type ReporteNacional = {
  rango: ReporteRango;
  total: TotalTx;
  items: {
    departamento_id: number;
    departamento: string;
    recolectoras: number;
    transacciones: number;
    kg: number;
    co2_kg: number;
    bs: number;
    porcentaje: number;
  }[];
};

// --- Reporte por sucursal (lista + ficha) ---

export type ReporteSucursalesFiltros = {
  desde?: string;
  hasta?: string;
  search?: string;
  generador_id?: number[];
  tipo_generador_id?: number[];
  zona_id?: number[];
  /** IDs específicos (para exportar las seleccionadas). */
  ids?: number[];
};

export type ReporteSucursalesLista = {
  rango: ReporteRango;
  total: {
    sucursales: number;
    transacciones: number;
    kg: number;
    co2_kg: number;
    bs: number;
  };
  items: {
    sucursal_id: number;
    sucursal: string;
    generador: string;
    tipo_generador: string;
    ciudad: string;
    entregas: number;
    kg: number;
    co2_kg: number;
    bs: number;
    porcentaje: number;
  }[];
};

export type ReporteSucursalDetalle = {
  rango: ReporteRango;
  perfil: {
    id: number;
    nombre: string;
    direccion: string;
    horario: string | null;
    generador: string;
    tipo_generador: string;
    zona: string | null;
    ciudad: string | null;
    departamento: string | null;
  };
  actividad: {
    total: TotalLinea;
    por_material: {
      material_id: number;
      material: string;
      kg: number;
      bs: number;
      co2_kg: number;
    }[];
    entregas: {
      transaccion_id: number;
      fecha: string;
      estado: string;
      recolector: string | null;
      kg: number;
      bs: number;
    }[];
  };
};

// --- Reporte dinámico de recolectoras ---

export type ReporteRecolectorasFiltros = {
  desde?: string;
  hasta?: string;
  search?: string;
  genero?: "HOMBRE" | "MUJER";
  edad_min?: number;
  edad_max?: number;
  zona_id?: number[];
  asociacion_id?: number[];
  trabaja_individual?: boolean;
  material_habitual?: number[];
  material_recolectado?: number[];
  /** IDs específicos (para exportar las seleccionadas en la tabla). */
  ids?: number[];
  solo_activas?: boolean;
};

export type ReporteRecolectorasLista = {
  rango: ReporteRango;
  total: {
    recolectoras: number;
    activas: number;
    entregas: number;
    kg: number;
    co2_kg: number;
    bs: number;
  };
  items: {
    id: number;
    nombre: string;
    ci: string;
    edad: number;
    genero: string;
    trabaja_individual: boolean;
    zona: string;
    asociacion: string | null;
    entregas: number;
    kg: number;
    co2_kg: number;
    bs: number;
    ultima_entrega: string | null;
  }[];
};

export type ReporteRecolectoraDetalle = {
  rango: ReporteRango;
  perfil: {
    id: number;
    nombre: string;
    ci: string;
    celular: string;
    edad: number;
    genero: string;
    trabaja_individual: boolean;
    foto_url: string | null;
    zona: string | null;
    asociacion: string | null;
    departamento: string | null;
    dias_trabajo: string[];
    materiales_habituales: {
      material: string | null;
      cantidad_mensual: number | null;
      precio_venta: number | null;
      es_principal: boolean;
    }[];
    tipos_generador: string[];
  };
  actividad: {
    total: TotalTx;
    por_material: {
      material_id: number;
      material: string;
      kg: number;
      bs: number;
      co2_kg: number;
    }[];
    transacciones: {
      transaccion_id: number;
      fecha: string;
      estado: string;
      destino: string;
      kg: number;
      bs: number;
    }[];
  };
};
