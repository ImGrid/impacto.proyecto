export interface JwtPayload {
  sub: number;              // usuario.id
  identificador: string;    // usuario.identificador (email, CI o teléfono según rol)
  rol: string;              // usuario.rol (ADMIN, RECOLECTOR, ACOPIADOR, GENERADOR)
}
