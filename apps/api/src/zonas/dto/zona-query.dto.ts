import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class ZonaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ciudad_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departamento_id?: number;
}
