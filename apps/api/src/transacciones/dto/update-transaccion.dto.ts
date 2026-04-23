import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleTransaccionDto)
  detalles?: DetalleTransaccionDto[];

  // Permite al acopiador (o admin) indicar el origen de la entrega en el
  // paso a ENTREGADO cuando la transacción no traía sucursal. Si ya trae
  // sucursal, la app móvil la muestra read-only y no envía este campo.
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sucursal_id?: number;
}
