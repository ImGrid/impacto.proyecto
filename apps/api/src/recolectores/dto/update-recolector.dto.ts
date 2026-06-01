import { OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';
import { CreateRecolectorDto } from './create-recolector.dto';

export class UpdateRecolectorDto extends PartialType(
  OmitType(CreateRecolectorDto, ['email', 'password'] as const),
) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // Si es true, se elimina la foto de perfil actual (foto_url = null) y se
  // borra el archivo del disco. Se ignora si además viene foto_base64 (en ese
  // caso se reemplaza, no se elimina).
  @IsOptional()
  @IsBoolean()
  foto_eliminar?: boolean;
}
