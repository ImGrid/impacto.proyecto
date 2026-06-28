import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';
import { toNumberArray } from '../../common/helpers';

/**
 * Filtros del reporte por SUCURSAL (nivel línea, scope por el departamento de
 * la sucursal). El filtro estrella es `generador_id` (ver las sucursales de un
 * generador, p. ej. los colegios de "Proyecto Rebee"). `tipo_generador_id`
 * permite ver, p. ej., todos los colegios. Multi-valor: `?generador_id=1&...`.
 */
export class ReporteSucursalesQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'desde debe ser una fecha válida (YYYY-MM-DD)' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'hasta debe ser una fecha válida (YYYY-MM-DD)' })
  hasta?: string;

  /** Búsqueda por nombre de sucursal. */
  @IsOptional()
  @IsString()
  search?: string;

  /** Generador(es) — eliges uno y ves todas sus sucursales. */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  generador_id?: number[];

  /** Tipo(s) de generador (p. ej. Colegios, Bancos). */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  tipo_generador_id?: number[];

  /** Zona(s) — la sucursal tiene su propia zona. */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  zona_id?: number[];

  /** IDs de sucursales específicas (para "exportar seleccionadas"). */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  ids?: number[];
}
