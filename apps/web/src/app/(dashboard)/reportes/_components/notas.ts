/**
 * Notas al pie de las tablas de reportes.
 *
 * ESPEJO del backend (`reportes.controller.ts`: NOTA_PCT / notaEntregas): el
 * mismo texto debe salir en pantalla y en los archivos exportados, porque el
 * cliente pega estas tablas en su informe. Si cambia uno, cambiar el otro.
 */

/**
 * Responde por escrito "¿porcentaje sobre qué?". El denominador es el TOTAL que
 * se ve al pie, que ya lleva dentro el período, los filtros y el departamento
 * del admin — por eso una misma sucursal participa distinto según el recorte.
 */
export const NOTA_PCT =
  "La participación se calcula sobre el TOTAL mostrado, que ya refleja el período, " +
  "los filtros aplicados y el departamento del administrador. Por redondeo, la suma " +
  "de la columna puede no dar exactamente 100,0%.";

/**
 * Para los dos reportes cuya columna "Entregas" no es sumable, porque una misma
 * entrega se cuenta en varias filas: por-material (una entrega trae varios
 * materiales) y sucursales (una entrega trae material de varias sucursales).
 */
export const notaEntregas = (queSeRepite: string) =>
  `Una misma entrega puede incluir ${queSeRepite}, por lo que se cuenta en varias filas: ` +
  'la columna "Entregas" no suma el total del período (ese dato está en los indicadores de arriba).';
