import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
