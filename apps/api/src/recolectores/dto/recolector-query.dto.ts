import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { genero } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto';
import { toBoolean } from '../../common/helpers';

export class RecolectorQueryDto extends PaginationQueryDto {
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
  acopiador_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  asociacion_id?: number;

  @IsOptional()
  @IsEnum(genero)
  genero?: genero;

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  trabaja_individual?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_id?: number;
}
