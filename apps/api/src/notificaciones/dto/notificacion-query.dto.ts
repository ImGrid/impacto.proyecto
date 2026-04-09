import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { tipo_notificacion } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto';

export class NotificacionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zona_id?: number;

  @IsOptional()
  @IsEnum(tipo_notificacion)
  tipo?: tipo_notificacion;
}
