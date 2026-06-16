/**
 * Construye los query params de un reporte. Los ARRAYS se emiten como params
 * repetidos (`?zona_id=1&zona_id=2`), que es lo que espera el backend NestJS
 * (class-validator + toNumberArray). Ignora vacíos/undefined.
 */
export function reporteParams(
  filters: Record<string, unknown>,
): URLSearchParams {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item !== undefined && item !== null && item !== "") {
          params.append(k, String(item));
        }
      }
    } else {
      params.set(k, String(v));
    }
  }
  return params;
}
