export type RecentTournamentGroup = {
  publicId: string;
  name: string;
  lastOpenedAt: number;
};

const STORAGE_KEY = 'fm-tg-recent-groups';
const MAX_RECENT = 8;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readRecentGroups(): RecentTournamentGroup[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is RecentTournamentGroup =>
          Boolean(item) &&
          typeof item === 'object' &&
          typeof (item as RecentTournamentGroup).publicId === 'string' &&
          typeof (item as RecentTournamentGroup).name === 'string' &&
          typeof (item as RecentTournamentGroup).lastOpenedAt === 'number',
      )
      .sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function rememberRecentGroup(group: { publicId: string; name: string }): void {
  if (!canUseStorage()) return;
  const current = readRecentGroups().filter((g) => g.publicId !== group.publicId);
  const next: RecentTournamentGroup[] = [
    { publicId: group.publicId, name: group.name, lastOpenedAt: Date.now() },
    ...current,
  ].slice(0, MAX_RECENT);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function groupPath(publicId: string): string {
  return `/torneos/g/${publicId}`;
}
