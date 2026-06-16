import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
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

  // Peso promedio de UNA unidad (kg). Solo aplica a materiales medidos en
  // UNIDAD; convierte la cantidad a kg para el cálculo de volumen y CO₂.
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  peso_unitario_kg?: number;
}
