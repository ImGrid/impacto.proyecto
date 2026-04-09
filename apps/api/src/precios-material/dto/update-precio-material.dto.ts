import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';

export class UpdatePrecioMaterialDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El precio mínimo debe ser mayor a 0' })
  @Type(() => Number)
  precio_minimo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01, { message: 'El precio máximo debe ser mayor a 0' })
  @Type(() => Number)
  precio_maximo?: number;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de inicio debe ser una fecha válida (YYYY-MM-DD)' },
  )
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de fin debe ser una fecha válida (YYYY-MM-DD)' },
  )
  fecha_fin?: string | null;
}
