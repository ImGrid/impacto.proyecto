import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { estado_transaccion } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto';

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
  acopiador_id?: number;

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
}
