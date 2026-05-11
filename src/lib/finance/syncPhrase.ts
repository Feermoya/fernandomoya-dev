/** UUID v4 guardado por versiones anteriores de la app. */
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** ID de fila en Supabase: UUID legacy o SHA-256 hex (64) derivado de frase. */
export function isValidStoredSyncId(id: string): boolean {
  const t = id.trim();
  if (UUID_V4_RE.test(t)) return true;
  return /^[a-f0-9]{64}$/i.test(t);
}

/**
 * Misma frase → mismo ID en todos los dispositivos (sin copiar URLs).
 * No guardes la frase en localStorage; solo el id derivado.
 */
export async function deriveSyncIdFromPassphrase(phrase: string): Promise<string> {
  const normalized = phrase.trim().replace(/\s+/g, ' ');
  if (normalized.length < 10) {
    throw new Error('Usá al menos 10 caracteres (una frase que te acuerdes).');
  }
  const input = `${normalized}|fm-finance-game-v1`;
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
