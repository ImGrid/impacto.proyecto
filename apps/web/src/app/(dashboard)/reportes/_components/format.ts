// Formateo de números en es-BO (coma decimal, punto de miles) — Bolivia usa lo
// opuesto al inglés (docs/26-28). Centralizado para todos los reportes.

export type ReporteFormato = "kg" | "bs" | "co2" | "int" | "pct" | "text";

const nf = (min: number, max: number) =>
  new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
const n0 = nf(0, 0);
const n1 = nf(1, 1);
const n2 = nf(2, 2);

/** Solo el número formateado (sin unidad). */
export function fmtNum(value: number, decimals = 2): string {
  const f = decimals === 0 ? n0 : decimals === 1 ? n1 : n2;
  return f.format(value);
}

/** Valor + unidad listo para celda de tabla. */
export function fmt(value: number, format: ReporteFormato): string {
  switch (format) {
    case "kg":
      return `${n2.format(value)} kg`;
    case "co2":
      return `${n2.format(value)} kg`;
    case "bs":
      return `Bs ${n2.format(value)}`;
    case "int":
      return n0.format(value);
    case "pct":
      return `${n1.format(value)}%`;
    default:
      return String(value);
  }
}
