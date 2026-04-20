import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { dia_semana, frecuencia_recojo } from '@prisma/client';

export class SucursalMaterialDto {
  @IsInt()
  @Type(() => Number)
  material_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  cantidad_aproximada?: string;
}

export class CreateSucursalDto {
  @IsInt()
  @Type(() => Number)
  generador_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  direccion: string;

  @IsNumber()
  @Type(() => Number)
  latitud: number;

  @IsNumber()
  @Type(() => Number)
  longitud: number;

  @IsInt()
  @Type(() => Number)
  zona_id: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  horario_recojo?: string;

  @IsOptional()
  @IsEnum(frecuencia_recojo)
  frecuencia?: frecuencia_recojo;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SucursalMaterialDto)
  materiales?: SucursalMaterialDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SucursalHorarioDto)
  horarios?: SucursalHorarioDto[];
}

export class SucursalHorarioDto {
  @IsEnum(dia_semana)
  dia_semana: dia_semana;

  @IsString()
  @IsNotEmpty()
  hora_inicio: string;

  @IsString()
  @IsNotEmpty()
  hora_fin: string;
}

export class UpdateHorariosDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SucursalHorarioDto)
  horarios: SucursalHorarioDto[];
}
