import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional } from 'class-validator';

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

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  material_id?: number;
}
