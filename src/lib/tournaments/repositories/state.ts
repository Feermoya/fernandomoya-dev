import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { computeAchievements } from '@/lib/tournaments/achievements';
import { computeRankingsBundle } from '@/lib/tournaments/rankings/compute';
import { getGroupByPublicId } from '@/lib/tournaments/repositories/groups';
import { listAwardsForMatchdays } from '@/lib/tournaments/repositories/awards';
import { listMatchdays } from '@/lib/tournaments/repositories/matchdays';
import { listMatchesForMatchdays } from '@/lib/tournaments/repositories/matches';
import { isTournamentAdminForGroup } from '@/lib/tournaments/session';
import type { RepoResult } from '@/lib/tournaments/repositories/groups';
import type { GroupState } from '@/lib/tournaments/types';

export async function loadGroupState(
  supabase: SupabaseClient,
  publicId: string,
  cookies: AstroCookies,
): Promise<RepoResult<GroupState>> {
  const groupResult = await getGroupByPublicId(supabase, publicId);
  if (!groupResult.ok) return groupResult;

  const { group, credentialVersion } = groupResult.data;
  const isAdmin = isTournamentAdminForGroup(cookies, group.id, credentialVersion);

  const matchdaysResult = await listMatchdays(supabase, group.id);
  if (!matchdaysResult.ok) return matchdaysResult;

  const matchdays = matchdaysResult.data;
  const matchdayIds = matchdays.map((m) => m.id);

  const [matchesResult, awardsResult] = await Promise.all([
    listMatchesForMatchdays(supabase, matchdayIds),
    listAwardsForMatchdays(supabase, matchdayIds),
  ]);

  if (!matchesResult.ok) return matchesResult;
  if (!awardsResult.ok) return awardsResult;

  // Preferí fecha abierta; si no, la más reciente (incluye finalizada para podio).
  const activeMatchday =
    matchdays.find((m) => m.status === 'live' || m.status === 'prepared') ??
    matchdays[0] ??
    null;

  const activeMatches = activeMatchday
    ? matchesResult.data.filter((m) => m.matchdayId === activeMatchday.id)
    : [];

  const allTime = computeRankingsBundle(matchesResult.data, group.players);
  const matchdayRankings = computeRankingsBundle(activeMatches, group.players);
  const currentYear = new Date().getFullYear();
  const yearDayIds = new Set(matchdays.filter((day) => new Date(day.startedAt ?? day.createdAt).getFullYear() === currentYear).map((day) => day.id));
  const annual = computeRankingsBundle(matchesResult.data.filter((match) => yearDayIds.has(match.matchdayId)), group.players);
  const achievements = computeAchievements({
    matchday: matchdayRankings,
    allTime,
    players: group.players,
  });

  return {
    ok: true,
    data: {
      group,
      isAdmin,
      matchdays,
      activeMatchday,
      matches: matchesResult.data,
      awards: awardsResult.data,
      rankings: {
        matchday: matchdayRankings,
        allTime,
        annual,
      },
      achievements,
    },
  };
}
