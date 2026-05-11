import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class DepartamentoQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
