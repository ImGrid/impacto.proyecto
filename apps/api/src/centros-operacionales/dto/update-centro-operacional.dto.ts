import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateCentroOperacionalDto } from './create-centro-operacional.dto';

export class UpdateCentroOperacionalDto extends PartialType(
  OmitType(CreateCentroOperacionalDto, ['email', 'password'] as const),
) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
