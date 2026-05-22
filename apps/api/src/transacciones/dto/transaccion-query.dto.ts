import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { estado_transaccion } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto';

// Valores válidos del filtro por tipo de destino polimórfico de la
// transacción (ver doc 20 §3): centro operacional del sistema, comprador
// externo del catálogo, desconocido, o sin destino asignado todavía.
export const TIPOS_DESTINO = [
  'centro_op',
  'externo',
  'desconocido',
  'sin_asignar',
] as const;
export type TipoDestino = (typeof TIPOS_DESTINO)[number];

export class TransaccionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(estado_transaccion)
  estado?: estado_transaccion;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  recolector_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  centro_operacional_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acopiador_externo_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  zona_id?: number;

  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  // Filtra por tipo de destino. Solo aplica para ADMIN (los demás roles
  // ya tienen su propio scope forzado en findAll).
  @IsOptional()
  @IsIn(TIPOS_DESTINO)
  tipo_destino?: TipoDestino;
}
