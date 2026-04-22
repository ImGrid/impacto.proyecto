import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { dia_semana } from '@prisma/client';

export class UpdatePerfilDto {
  // Campos comunes editables
  @IsOptional()
  @IsString()
  @MaxLength(20)
  celular?: string;

  // Campos de ubicación (recolector y acopiador)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion_domicilio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  direccion?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  latitud?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  longitud?: number;

  // Campos del acopiador
  @IsOptional()
  @IsString()
  @MaxLength(100)
  horario_operacion?: string;

  // Campos del generador
  @IsOptional()
  @IsString()
  @MaxLength(150)
  contacto_nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contacto_telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  contacto_email?: string;

  // Campos del recolector (actividad laboral)
  // El recolector edita sus días de trabajo y qué materiales recolecta.
  // cantidad_mensual/precio_venta se mantienen bajo control del admin,
  // por lo que aquí solo aceptamos IDs de materiales.
  @IsOptional()
  @IsArray()
  @IsEnum(dia_semana, { each: true })
  dias_trabajo?: dia_semana[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  materiales?: number[];
}
