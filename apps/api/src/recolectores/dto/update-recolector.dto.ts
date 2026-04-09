import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateRecolectorDto } from './create-recolector.dto';

export class UpdateRecolectorDto extends PartialType(
  OmitType(CreateRecolectorDto, ['email', 'password'] as const),
) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
