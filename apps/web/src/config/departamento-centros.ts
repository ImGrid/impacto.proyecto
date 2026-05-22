/**
 * Coordenadas [lat, lng] de la ciudad capital de cada departamento de
 * Bolivia, indexadas por el id de `departamento` (1=La Paz ... 9=Pando).
 *
 * Se usan para centrar los mapas según el departamento activo del filtro
 * global: si un departamento aún no tiene datos con coordenadas, el mapa
 * queda centrado en su capital en lugar de en un punto fijo (antes siempre
 * mostraba Cochabamba). Cuando sí hay datos, FitBounds reencuadra el mapa
 * a los marcadores.
 */
export const CENTROS_DEPARTAMENTO: Record<number, [number, number]> = {
  1: [-16.5, -68.15], // La Paz
  2: [-17.3895, -66.1568], // Cochabamba
  3: [-17.7833, -63.1821], // Santa Cruz
  4: [-17.9667, -67.1167], // Oruro
  5: [-19.5892, -65.7533], // Potosí
  6: [-19.0333, -65.2627], // Chuquisaca (Sucre)
  7: [-21.5355, -64.7296], // Tarija
  8: [-14.8333, -64.9], // Beni (Trinidad)
  9: [-11.0233, -68.7689], // Pando (Cobija)
};

/** Centro por defecto (Cochabamba) si no se conoce el departamento activo. */
export const CENTRO_POR_DEFECTO: [number, number] = [-17.3895, -66.1568];

/**
 * Devuelve el centro [lat, lng] del departamento indicado, o el centro por
 * defecto si el id es null/undefined o no está en la tabla.
 */
export function centroDepartamento(
  departamentoId: number | null | undefined,
): [number, number] {
  if (departamentoId != null && CENTROS_DEPARTAMENTO[departamentoId]) {
    return CENTROS_DEPARTAMENTO[departamentoId];
  }
  return CENTRO_POR_DEFECTO;
}
