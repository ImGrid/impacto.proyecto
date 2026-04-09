import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateAsociacionDto } from './create-asociacion.dto';

export class UpdateAsociacionDto extends PartialType(CreateAsociacionDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
