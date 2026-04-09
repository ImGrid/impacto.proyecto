import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateEventoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsInt()
  @IsNotEmpty()
  zona_id: number;

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

  @IsDateString(
    {},
    { message: 'La fecha del evento debe ser una fecha válida (YYYY-MM-DD)' },
  )
  @IsNotEmpty()
  fecha_evento: string;

  @IsOptional()
  @IsString()
  hora_inicio?: string;

  @IsOptional()
  @IsString()
  hora_fin?: string;
}
