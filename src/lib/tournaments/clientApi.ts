import type { GroupState } from '@/lib/tournaments/types';

export async function tgFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const body = (await res.json()) as T & { ok?: boolean; error?: string };
  if (!res.ok || (body && 'ok' in body && body.ok === false)) {
    throw new Error(
      (body && 'error' in body && typeof body.error === 'string' && body.error) ||
        'Algo salió mal. Probá de nuevo.',
    );
  }
  return body;
}

export function groupApi(publicId: string) {
  const base = `/torneos/api/groups/${encodeURIComponent(publicId)}`;
  return {
    state: () => tgFetch<{ ok: true; state: GroupState }>(`${base}/state`),
    getPlan: (matchdayId: string) => tgFetch<{ ok: true; plan: unknown }>(`${base}/plan?matchdayId=${encodeURIComponent(matchdayId)}`),
    savePlan: (matchdayId: string, plan: unknown) => tgFetch<{ ok: true }>(`${base}/plan`, { method: 'PUT', body: JSON.stringify({ matchdayId, plan }) }),
    createMatchday: (name?: string) =>
      tgFetch(`${base}/matchdays`, {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    patchMatchday: (matchdayId: string, status: string) =>
      tgFetch(`${base}/matchdays`, {
        method: 'PATCH',
        body: JSON.stringify({ matchdayId, status }),
      }),
    createMatch: (payload: unknown) =>
      tgFetch(`${base}/matches`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    undoMatch: (matchdayId: string) =>
      tgFetch(`${base}/matches`, {
        method: 'POST',
        body: JSON.stringify({ action: 'undo', matchdayId }),
      }),
    updateMatch: (payload: unknown) =>
      tgFetch(`${base}/matches`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    saveAwards: (matchdayId: string, awards: unknown[]) =>
      tgFetch(`${base}/awards`, {
        method: 'PUT',
        body: JSON.stringify({ matchdayId, awards }),
      }),
    renameGroup: (name: string) =>
      tgFetch<{ ok: true; name: string }>(base, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      }),
    updatePlayers: (payload: {
      updates: Array<{ id: string; displayName: string; active: boolean }>;
      additions: string[];
      removals: string[];
    }) =>
      tgFetch(`${base}/players`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    deleteGroup: (confirmName: string) =>
      tgFetch<{ ok: true }>(base, {
        method: 'DELETE',
        body: JSON.stringify({ confirmName }),
      }),
  };
}

export type TournamentClientApi = ReturnType<typeof groupApi>;
