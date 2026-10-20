export const TOURNAMENT_LIMITS = {
  groupNameMin: 2,
  groupNameMax: 48,
  playerNameMin: 1,
  playerNameMax: 32,
  minPlayers: 2,
  maxPlayers: 24,
  createsPerIpPerHour: 10,
} as const;

export function normalizeGroupName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function normalizePlayerName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

/**
 * Parsea nombres pegados (comas, saltos de línea, punto y coma)
 * y deduplica case-insensitive conservando el primer formato.
 */
export function parsePlayerNamesInput(raw: string): string[] {
  const chunks = raw
    .split(/[\n,;]+/)
    .map(normalizePlayerName)
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of chunks) {
    const key = name.toLocaleLowerCase('es');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export type CreateGroupValidation =
  | { ok: true; name: string; players: string[] }
  | { ok: false; error: string };

export function validateCreateGroupInput(input: {
  name?: unknown;
  players?: unknown;
}): CreateGroupValidation {
  if (typeof input.name !== 'string') {
    return { ok: false, error: 'Ingresá el nombre del grupo.' };
  }
  const name = normalizeGroupName(input.name);
  if (name.length < TOURNAMENT_LIMITS.groupNameMin) {
    return { ok: false, error: 'El nombre del grupo es demasiado corto.' };
  }
  if (name.length > TOURNAMENT_LIMITS.groupNameMax) {
    return { ok: false, error: 'El nombre del grupo es demasiado largo.' };
  }

  let players: string[] = [];
  if (Array.isArray(input.players)) {
    players = input.players
      .filter((p): p is string => typeof p === 'string')
      .map(normalizePlayerName)
      .filter(Boolean);
  } else if (typeof input.players === 'string') {
    players = parsePlayerNamesInput(input.players);
  } else {
    return { ok: false, error: 'Agregá al menos dos jugadores.' };
  }

  // Deduplicar de nuevo por si venía array
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const p of players) {
    if (p.length > TOURNAMENT_LIMITS.playerNameMax) {
      return { ok: false, error: `El nombre "${p}" es demasiado largo.` };
    }
    const key = p.toLocaleLowerCase('es');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(p);
  }

  if (unique.length < TOURNAMENT_LIMITS.minPlayers) {
    return { ok: false, error: 'Necesitás al menos dos jugadores.' };
  }
  if (unique.length > TOURNAMENT_LIMITS.maxPlayers) {
    return {
      ok: false,
      error: `Máximo ${TOURNAMENT_LIMITS.maxPlayers} jugadores por grupo.`,
    };
  }

  return { ok: true, name, players: unique };
}

export function extractPublicIdFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    if (trimmed.includes('/torneos/g/')) {
      const url = new URL(trimmed, 'https://example.invalid');
      const parts = url.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('g');
      const id = idx >= 0 ? parts[idx + 1] : null;
      if (id && /^[A-Za-z0-9_-]{16,32}$/.test(id)) return id;
    }
  } catch {
    /* fall through */
  }

  if (/^[A-Za-z0-9_-]{16,32}$/.test(trimmed)) return trimmed;
  return null;
}
