import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional } from 'class-validator';

// Tipos de destino polimórfico de la transacción (mismos valores que
// TransaccionQueryDto). Se redefinen aquí para mantener el módulo dashboard
// independiente del módulo de transacciones.
export const TIPOS_DESTINO = [
  'centro_op',
  'externo',
  'desconocido',
  'sin_asignar',
] as const;
export type TipoDestino = (typeof TIPOS_DESTINO)[number];

/**
 * Filtros opcionales para el análisis histórico. Si no se pasa rango,
 * el service aplica "últimos 30 días" como default (común en dashboards
 * analíticos).
 */
export class EstadisticasQueryDto {
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha desde debe ser una fecha válida (YYYY-MM-DD)' },
  )
  desde?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha hasta debe ser una fecha válida (YYYY-MM-DD)' },
  )
  hasta?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  zona_id?: number;

  // Filtro por ciudad. La transacción no tiene ciudad directa: se filtra
  // vía la relación transaccion.zona -> zona.ciudad_id.
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  ciudad_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  material_id?: number;

  // Filtro por tipo de generador. Se filtra vía
  // detalle_transaccion -> sucursal -> generador -> tipo_generador_id.
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tipo_generador_id?: number;

  // Filtro por tipo de destino polimórfico de la transacción.
  @IsOptional()
  @IsIn(TIPOS_DESTINO)
  tipo_destino?: TipoDestino;

  // Acota TODAS las métricas a una sola recolectora. Lo usa el panel de
  // perfil de recolectora (drill-through), no la barra de filtros.
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  recolector_id?: number;
}
