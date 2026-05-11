import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateCiudadDto } from './create-ciudad.dto';

export class UpdateCiudadDto extends PartialType(CreateCiudadDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
