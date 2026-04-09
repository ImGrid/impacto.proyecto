import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAdministradorDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre_completo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  telefono?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
