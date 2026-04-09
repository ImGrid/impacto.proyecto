import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateGeneradorDto } from './create-generador.dto';

export class UpdateGeneradorDto extends PartialType(
  OmitType(CreateGeneradorDto, ['email', 'password'] as const),
) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
