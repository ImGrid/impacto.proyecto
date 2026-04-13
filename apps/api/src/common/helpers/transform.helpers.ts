/**
 * Normaliza una cédula de identidad boliviana:
 * quita espacios internos.
 * "9876543 CB" → "9876543CB"
 */
export function normalizarCI(ci: string): string {
  return ci.replace(/\s+/g, '');
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
