import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGeneradorDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  razon_social: string;

  @IsInt()
  @Type(() => Number)
  tipo_generador_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  contacto_nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  contacto_telefono: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  contacto_email?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-90)
  @Max(90)
  latitud?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(-180)
  @Max(180)
  longitud?: number;
}
