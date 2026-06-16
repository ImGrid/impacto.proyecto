import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
} from 'class-validator';
import { toNumberArray, toStringArray } from '../../common/helpers';

const TIPOS_DESTINO = ['centro_op', 'externo', 'desconocido', 'sin_asignar'];

/**
 * Filtros comunes a los reportes: período + filtros de entidad multi-valor
 * (cada reporte usa los que le aplican). El departamento se toma del JWT
 * (departamento_activo). Sin rango → "últimos 30 días" (igual que /estadisticas).
 * Los filtros de entidad son arrays (`?material_id=1&material_id=2`) para poder
 * acotar el reporte a varias dimensiones a la vez (docs/30).
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

  /** Material(es) — usado por por-material y la matriz. */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  material_id?: number[];

  /** Asociación(es) — usado por por-asociacion. */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  asociacion_id?: number[];

  /** Zona(s) — usado por por-zona. */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  zona_id?: number[];

  /** Generador(es) — usado por por-generador. */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  generador_id?: number[];

  /** Tipo(s) de generador — usado por por-tipo-generador y la matriz. */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  tipo_generador_id?: number[];

  /** Tipo(s) de destino — usado por por-destino (categoría polimórfica). */
  @IsOptional()
  @Transform(toStringArray)
  @IsArray()
  @IsIn(TIPOS_DESTINO, { each: true })
  tipo_destino?: string[];
}
