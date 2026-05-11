import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateExternoDto } from './create-externo.dto';

export class UpdateExternoDto extends PartialType(CreateExternoDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
