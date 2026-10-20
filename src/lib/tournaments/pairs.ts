/** Clave canónica de pareja (orden independiente). */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function parsePairKey(key: string): [string, string] | null {
  const parts = key.split('|');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

export function pairLabel(
  key: string,
  names: Map<string, string>,
): string {
  const parsed = parsePairKey(key);
  if (!parsed) return key;
  const [a, b] = parsed;
  return `${names.get(a) ?? a} + ${names.get(b) ?? b}`;
}
