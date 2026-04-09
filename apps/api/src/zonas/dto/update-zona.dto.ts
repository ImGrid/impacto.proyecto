import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateZonaDto } from './create-zona.dto';

export class UpdateZonaDto extends PartialType(CreateZonaDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
