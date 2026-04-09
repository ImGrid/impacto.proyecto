import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { dia_semana, genero } from '@prisma/client';

export class RecolectorMaterialDto {
  @IsInt()
  @Type(() => Number)
  material_id: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cantidad_mensual?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  precio_venta?: number;

  @IsOptional()
  @IsBoolean()
  es_principal?: boolean;
}

export class CreateRecolectorDto {
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(150)
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre_completo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  cedula_identidad: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  celular: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  direccion_domicilio: string;

  @IsNumber()
  @Type(() => Number)
  latitud: number;

  @IsNumber()
  @Type(() => Number)
  longitud: number;

  @IsInt()
  @Type(() => Number)
  acopiador_id: number;

  @IsInt()
  @Type(() => Number)
  zona_id: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  asociacion_id?: number;

  @IsEnum(genero)
  genero: genero;

  @IsInt()
  @Min(14)
  @Max(100)
  @Type(() => Number)
  edad: number;

  @IsOptional()
  @IsBoolean()
  trabaja_individual?: boolean = true;

  @IsOptional()
  @IsArray()
  @IsEnum(dia_semana, { each: true })
  dias_trabajo?: dia_semana[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecolectorMaterialDto)
  materiales?: RecolectorMaterialDto[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  tipos_generador_ids?: number[];
}
