import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { estado_transaccion } from '@prisma/client';
import { DetalleTransaccionDto } from './create-transaccion.dto';

export class UpdateTransaccionDto {
  @IsEnum(estado_transaccion)
  @IsNotEmpty()
  estado: estado_transaccion;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  // Reemplaza todos los detalles. Cada detalle puede traer su propia
  // `sucursal_id` (opcional) para indicar de qué punto vino ese material.
  // Si se omite, las sucursales actuales se conservan tal cual.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleTransaccionDto)
  detalles?: DetalleTransaccionDto[];
}
