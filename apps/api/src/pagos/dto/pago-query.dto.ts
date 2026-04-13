import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class PagoQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  recolector_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acopiador_id?: number;

  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;
}
