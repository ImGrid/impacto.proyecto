import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Min, Max, IsIn } from 'class-validator';
import { toBoolean } from '../helpers';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'asc';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  activo?: boolean;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
