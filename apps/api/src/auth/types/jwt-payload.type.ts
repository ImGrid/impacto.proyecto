export interface JwtPayload {
  sub: number;       // usuario.id
  email: string;     // usuario.email
  rol: string;       // usuario.rol (ADMIN, RECOLECTOR, ACOPIADOR, GENERADOR)
}
