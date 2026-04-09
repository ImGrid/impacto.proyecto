import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { frecuencia_recojo } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto';

export class SucursalQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  generador_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zona_id?: number;

  @IsOptional()
  @IsEnum(frecuencia_recojo)
  frecuencia?: frecuencia_recojo;
}
