import { Transform, Type } from 'class-transformer';
import {
  IsArray,
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
import { toBoolean, toNumberArray } from '../../common/helpers';

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

  /** Una o varias zonas (multi-select). `?zona_id=1&zona_id=2`. */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  zona_id?: number[];

  /** Una o varias asociaciones (multi-select). */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  asociacion_id?: number[];

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  trabaja_individual?: boolean;

  /** Material(es) que recoge NORMALMENTE (declarado, recolector_material). */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  material_habitual?: number[];

  /** Material(es) que recolectó DE VERDAD en el período (transacciones). */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  material_recolectado?: number[];

  /**
   * IDs de recolectoras específicas (para "Exportar seleccionadas"): limita el
   * reporte exactamente a estas personas, sin importar atributos compartidos.
   */
  @IsOptional()
  @Transform(toNumberArray)
  @IsArray()
  @IsInt({ each: true })
  ids?: number[];

  /** Solo recolectoras con al menos una entrega en el período. */
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  solo_activas?: boolean;
}
