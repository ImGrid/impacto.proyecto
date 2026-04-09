import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateSucursalDto } from './create-sucursal.dto';

export class UpdateSucursalDto extends PartialType(
  OmitType(CreateSucursalDto, ['generador_id'] as const),
) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
