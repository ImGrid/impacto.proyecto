import { IsDateString, IsOptional } from 'class-validator';

/**
 * Filtros comunes a todos los reportes: solo período. El departamento se toma
 * del JWT (departamento_activo). Si no se pasa rango, el service aplica
 * "últimos 30 días" (mismo criterio que /estadisticas).
 */
export class ReporteQueryDto {
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
}
