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
