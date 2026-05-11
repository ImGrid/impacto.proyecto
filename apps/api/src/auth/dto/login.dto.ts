import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  identificador: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  /**
   * Departamento activo elegido al iniciar sesión.
   * - OBLIGATORIO si el usuario es ADMIN (lo envía la pantalla pre-login del admin web).
   * - IGNORADO para recolectores, centros operacionales y generadores: el backend
   *   usa el departamento registrado en el actor (o null para generador).
   */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  departamento_id?: number;
}
