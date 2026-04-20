import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { estado_transaccion, unidad_medida } from '@prisma/client';

export class DetalleTransaccionDto {
  @IsInt()
  @Type(() => Number)
  material_id: number;

  @IsNumber()
  @Type(() => Number)
  cantidad: number;

  @IsEnum(unidad_medida)
  unidad_medida: unidad_medida;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  precio_unitario?: number;
}

export class CreateTransaccionDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  recolector_id?: number;

  // Solo aplica cuando el creador es ADMIN; los demás roles lo ignoran.
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acopiador_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sucursal_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  zona_id?: number;

  // Solo aplica cuando el creador es ADMIN. Para los demás roles el service
  // determina el estado automáticamente según el rol.
  @IsOptional()
  @IsEnum(estado_transaccion)
  estado?: estado_transaccion;

  // Backdating opcional para ADMIN (formato YYYY-MM-DD).
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha debe ser una fecha válida (YYYY-MM-DD)' },
  )
  fecha?: string;

  // Hora opcional para ADMIN (formato HH:mm).
  @IsOptional()
  @IsString()
  hora?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @IsArray()
  @IsNotEmpty({ message: 'Debe incluir al menos un material' })
  @ValidateNested({ each: true })
  @Type(() => DetalleTransaccionDto)
  detalles: DetalleTransaccionDto[];
}
