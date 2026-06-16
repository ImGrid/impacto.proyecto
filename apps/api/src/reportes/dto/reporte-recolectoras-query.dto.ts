import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { genero } from '@prisma/client';
import { toBoolean } from '../../common/helpers';

/**
 * Filtros del reporte DINÁMICO de recolectoras. Pensados para el usuario no
 * técnico (lenguaje simple). El filtro de material es DOBLE:
 *   - material_habitual: lo que la recolectora DECLARA recoger (recolector_material).
 *   - material_recolectado: lo que recolectó DE VERDAD en el período (transacciones).
 */
export class ReporteRecolectorasQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'desde debe ser una fecha válida (YYYY-MM-DD)' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'hasta debe ser una fecha válida (YYYY-MM-DD)' })
  hasta?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(genero)
  genero?: genero;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  edad_min?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  edad_max?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zona_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  asociacion_id?: number;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  trabaja_individual?: boolean;

  /** Material que recoge NORMALMENTE (declarado, recolector_material). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_habitual?: number;

  /** Material que recolectó DE VERDAD en el período (transacciones). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_recolectado?: number;

  /** Solo recolectoras con al menos una entrega en el período. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  solo_activas?: boolean;
}
