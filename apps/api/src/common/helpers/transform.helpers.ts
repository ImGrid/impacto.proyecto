/**
 * Normaliza una cédula de identidad boliviana:
 * quita espacios internos.
 * "9876543 CB" → "9876543CB"
 */
export function normalizarCI(ci: string): string {
  return ci.replace(/\s+/g, '');
}

/**
 * Normaliza un texto para COMPARAR (no para guardar): minúsculas, sin
 * tildes/diacríticos y con espacios colapsados. Se usa para detectar
 * nombres "Otro" duplicados ignorando mayúsculas, acentos y espacios.
 * "Pílas" / "pilas" / " Pilas " → "pilas". ("Pila" ≠ "Pilas": no es difuso.)
 */
export function normalizarParaComparar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ');
}

export function toBoolean({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}): boolean | undefined {
  const raw = obj[key];
  if (raw === 'true' || raw === true) return true;
  if (raw === 'false' || raw === false) return false;
  return undefined;
}

/**
 * Normaliza un parámetro de query a `number[]`. Acepta:
 *   - repetido: `?id=1&id=2`      → ['1','2']  → [1, 2]
 *   - único:    `?id=1`           → '1'        → [1]
 *   - csv:      `?id=1,2`         → '1,2'      → [1, 2]
 * Descarta valores no numéricos. Devuelve `undefined` si queda vacío (para que
 * `@IsOptional()` lo ignore y no aplique el filtro).
 */
export function toNumberArray({
  value,
}: {
  value: unknown;
}): number[] | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value : [value];
  const nums = raw
    .flatMap((v) => String(v).split(','))
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
  return nums.length ? nums : undefined;
}

/**
 * Normaliza un parámetro de query a `string[]` (repetido, único o CSV). Recorta
 * y descarta vacíos. Devuelve `undefined` si queda vacío (para `@IsOptional()`).
 */
export function toStringArray({
  value,
}: {
  value: unknown;
}): string[] | undefined {
  if (value == null) return undefined;
  const raw = Array.isArray(value) ? value : [value];
  const strs = raw
    .flatMap((v) => String(v).split(','))
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return strs.length ? strs : undefined;
}
