import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza un texto para COMPARAR (no para guardar): minúsculas, sin tildes
 * y con espacios colapsados. Detecta nombres "Otro" duplicados ignorando
 * mayúsculas, acentos y espacios. "Pílas"/"pilas"/" Pilas " → "pilas".
 * ("Pila" ≠ "Pilas": deliberadamente no es difuso.)
 */
export function normalizarParaComparar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
}

/**
 * Convierte a número un texto que el usuario escribió en un campo decimal,
 * tolerando el separador decimal boliviano (coma). Un `<input type="number">`
 * descarta la coma a nivel navegador (deja el campo vacío), por eso los campos
 * de cantidad/precio usan `type="text"` + `inputMode="decimal"` y se normalizan
 * aquí.
 *
 * - "2,5"       → 2.5     (coma decimal es-BO)
 * - "2.5"       → 2.5     (punto decimal)
 * - "1.234,56"  → 1234.56 (punto miles, coma decimal)
 * - "1,234.56"  → 1234.56 (coma miles, punto decimal)
 * - "" | null | "abc" → null (vacío o no numérico)
 *
 * Devuelve `null` para vacío o inválido, de modo que quien llama decida si es
 * obligatorio (mostrar error) u opcional (omitir del payload).
 */
export function parsearDecimal(
  value: string | number | null | undefined,
): number | null {
  if (value == null) return null;
  let s = String(value).trim();
  if (s === "") return null;
  if (s.includes(",") && s.includes(".")) {
    // Cuando hay ambos separadores, el último es el decimal y el otro miles.
    s =
      s.lastIndexOf(",") > s.lastIndexOf(".")
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Formatea para MOSTRAR un campo de solo fecha (`@db.Date`) sin que la zona
 * horaria lo corra un día. Prisma serializa estos campos como medianoche UTC
 * ("2026-06-09T00:00:00.000Z"); al formatearlos en hora local (Bolivia UTC-4)
 * retroceden al día anterior. Forzar `timeZone: "UTC"` lo evita.
 *
 * Usar SOLO con columnas `@db.Date` (fecha de transacción, fecha de pago,
 * fecha de evento, vigencia de precio). NO usar con timestamps de hora real
 * (`fecha_creacion`, `hora`), que sí deben mostrarse en hora local.
 */
export function formatearFechaSolo(
  iso: string | null | undefined,
  opciones: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  },
): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-BO", {
    ...opciones,
    timeZone: "UTC",
  });
}

/**
 * Convierte el ISO de un campo `@db.Date` (medianoche UTC) en un `Date` LOCAL
 * a medianoche del MISMO día calendario. Sirve para inicializar un date-picker:
 * el calendario y `format(fecha, "dd/MM/yyyy")` trabajan en hora local, así que
 * necesitan un Date cuyo día local coincida con el día almacenado. Al volver a
 * serializar ese Date con `format(fecha, "yyyy-MM-dd")` se obtiene el día
 * correcto (sin el corrimiento que causaba `new Date(iso)` directo).
 */
export function fechaSoloDesdeISO(
  iso: string | null | undefined,
): Date | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Construye la URL absoluta de una imagen subida a partir de su ruta pública
 * relativa (`/uploads/...`). En desarrollo la API sirve los archivos en otro
 * puerto, así que se antepone NEXT_PUBLIC_UPLOADS_BASE_URL; en producción nginx
 * sirve /uploads en el mismo origen, por lo que la variable queda vacía y la
 * ruta relativa funciona tal cual. Devuelve null si no hay foto.
 */
export function fotoSrc(fotoUrl: string | null | undefined): string | null {
  if (!fotoUrl) return null;
  const base = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ?? "";
  return `${base}${fotoUrl}`;
}
