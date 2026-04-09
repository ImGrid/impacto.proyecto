import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateAcopiadorDto } from './create-acopiador.dto';

export class UpdateAcopiadorDto extends PartialType(
  OmitType(CreateAcopiadorDto, ['email', 'password'] as const),
) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
