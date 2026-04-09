import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateTipoGeneradorDto } from './create-tipo-generador.dto';

export class UpdateTipoGeneradorDto extends PartialType(CreateTipoGeneradorDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
