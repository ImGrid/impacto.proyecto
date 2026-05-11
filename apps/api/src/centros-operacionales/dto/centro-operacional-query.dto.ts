import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { tipo_acopio } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto';

export class CentroOperacionalQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zona_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departamento_id?: number;

  @IsOptional()
  @IsEnum(tipo_acopio)
  tipo_acopio?: tipo_acopio;
}
