import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class AsociacionQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
