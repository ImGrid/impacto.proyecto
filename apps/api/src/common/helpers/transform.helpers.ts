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
