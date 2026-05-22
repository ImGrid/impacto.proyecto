export interface JwtPayload {
  sub: number;                          // usuario.id
  identificador: string;                // usuario.identificador (email, CI o teléfono según rol)
  rol: string;                          // usuario.rol (ADMIN, RECOLECTOR, ACOPIADOR, GENERADOR)
  departamento_activo: number | null;   // Filtro global. null para ADMIN sin selección (no debería pasar) o GENERADOR (entidad global).
  departamento_fijo: boolean;           // true = el depto activo NO se puede cambiar (admin asignado a un depto, o roles no-admin). false = admin global (puede usar el switcher).
}
