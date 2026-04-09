import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { unidad_medida } from '@prisma/client';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsEnum(unidad_medida)
  unidad_medida_default?: unidad_medida;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  factor_co2?: number;
}
