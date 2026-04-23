import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { DetalleTransaccionDto } from './create-transaccion.dto';

/**
 * DTO exclusivo del admin para editar una entrega ya creada.
 * No avanza el estado (eso lo hace UpdateTransaccionDto vía PATCH).
 *
 * Reglas importantes:
 * - Si la entrega está PAGADA (tiene pago vinculado), solo se puede
 *   editar `observaciones`. El service rechaza los demás campos con 400.
 * - Cambiar `recolector_id` implica que el nuevo recolector pertenezca
 *   al mismo acopiador actual de la entrega (regla del cliente). El
 *   service valida esto.
 * - `sucursal_id: null` significa "quitar la sucursal" (borra el paso
 *   GENERADO automático del historial).
 */
export class EditTransaccionAdminDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  // Backdating explícito: YYYY-MM-DD
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha debe ser una fecha válida (YYYY-MM-DD)' },
  )
  fecha?: string;

  // Hora en formato HH:mm
  @IsOptional()
  @IsString()
  hora?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  recolector_id?: number;

  // Nullable explícito: si viene `null` se elimina la sucursal; si viene
  // un entero se asigna; si no se envía, se mantiene como estaba.
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sucursal_id?: number | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleTransaccionDto)
  detalles?: DetalleTransaccionDto[];
}
