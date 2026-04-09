import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class PrecioMaterialQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  material_id?: number;

  @IsOptional()
  @IsIn(['vigentes', 'vencidos', 'todos'])
  vigencia?: 'vigentes' | 'vencidos' | 'todos';
}
