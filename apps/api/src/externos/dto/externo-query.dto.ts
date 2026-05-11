import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class ExternoQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
