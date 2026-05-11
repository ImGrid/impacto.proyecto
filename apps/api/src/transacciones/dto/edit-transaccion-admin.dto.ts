import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
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
 * - Cambiar `recolector_id` debe respetar coherencia de departamento
 *   con el destino actual (si el destino es un centro operacional, ambos
 *   deben estar en el mismo departamento).
 * - La sucursal de origen se gestiona por línea de detalle (cada
 *   `detalle.sucursal_id` puede venir o no). Reemplazar `detalles`
 *   redefine las sucursales completas. Si no se envían detalles, las
 *   sucursales actuales se preservan.
 * - Los 3 campos de destino son nullable explícitamente: `null` = limpiar
 *   ese campo, `undefined` = no tocar, valor = asignar. Máximo 1 marcado
 *   a la vez (validado por el service y por CHECK en BD).
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

  // -------- Destino polimórfico --------
  // Cualquier combinación con máximo 1 marcado. `null` = limpiar el campo
  // específico. `undefined` = no tocar.

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  centro_operacional_id?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acopiador_externo_id?: number | null;

  @IsOptional()
  @IsBoolean()
  destino_desconocido?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DetalleTransaccionDto)
  detalles?: DetalleTransaccionDto[];
}
