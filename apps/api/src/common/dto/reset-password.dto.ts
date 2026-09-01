import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Contraseña nueva que un ADMINISTRADOR le asigna a un usuario.
 *
 * Es el unico camino que existe para recuperar una cuenta: el sistema no tiene
 * "olvide mi contraseña" por correo, y no podria tenerlo, porque los
 * recolectores entran con su cedula y la mayoria no registra un email.
 *
 * No se pide la contraseña anterior a proposito: quien la usa es el
 * administrador, que precisamente NO la conoce. La autorizacion la da el rol
 * ADMIN mas el filtro por departamento activo, igual que en el resto del CRUD.
 *
 * El minimo de 8 caracteres es el mismo que ya exigen los formularios de
 * creacion de recolector, generador y centro operacional.
 */
export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
