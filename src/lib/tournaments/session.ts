import type { AstroCookies } from 'astro';
import {
  TOURNAMENT_ADMIN_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/tournaments/secrets';

export type TournamentAdminOk = {
  ok: true;
};

export type TournamentAdminFail = {
  ok: false;
  reason: 'unauthenticated';
  message: string;
};

/**
 * Valida cookie firmada contra groupId + versión de credencial (rotación invalida sesiones).
 */
export function requireTournamentAdmin(
  cookies: AstroCookies,
  groupId: string,
  credentialVersion: number,
): TournamentAdminOk | TournamentAdminFail {
  const token = cookies.get(TOURNAMENT_ADMIN_COOKIE)?.value;
  const payload = verifyAdminSessionToken(token);
  if (!payload) {
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'Necesitás acceso de organizador para esta acción.',
    };
  }
  if (payload.gid !== groupId || payload.ver !== credentialVersion) {
    return {
      ok: false,
      reason: 'unauthenticated',
      message: 'La sesión de organizador ya no es válida. Volvé a reclamar el acceso.',
    };
  }
  return { ok: true };
}

export function isTournamentAdminForGroup(
  cookies: AstroCookies,
  groupId: string,
  credentialVersion: number,
): boolean {
  return requireTournamentAdmin(cookies, groupId, credentialVersion).ok;
}
