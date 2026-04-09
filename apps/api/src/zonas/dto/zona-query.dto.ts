import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class ZonaQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
