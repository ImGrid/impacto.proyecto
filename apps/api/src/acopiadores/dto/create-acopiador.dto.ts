import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { tipo_acopio } from '@prisma/client';

export class CreateAcopiadorDto {
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

  @IsEnum(tipo_acopio)
  tipo_acopio: tipo_acopio;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre_punto: string;

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

  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  zona_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  horario_operacion?: string;
}
