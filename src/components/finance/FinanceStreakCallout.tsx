import { useMemo } from 'react';
import type { FinanceEntry } from '@/lib/finance/types';
import {
  getCalendarMonthKey,
  getEntryFormStreakCopy,
  getMonthlyInvestmentStreak,
} from '@/lib/finance/calculations';

type Props = {
  entries: FinanceEntry[];
  contextMonth: string;
  className?: string;
};

export function FinanceStreakCallout({ entries, contextMonth, className = '' }: Props) {
  const copy = useMemo(() => getEntryFormStreakCopy(entries, contextMonth), [entries, contextMonth]);
  const today = getCalendarMonthKey();
  const streakInfo = useMemo(() => {
    if (contextMonth !== today) return null;
    return getMonthlyInvestmentStreak(entries, today);
  }, [entries, contextMonth, today]);

  const shell =
    copy.variant === 'protected'
      ? 'border-emerald-400/40 bg-emerald-950/35 text-emerald-50'
      : copy.variant === 'pending_empty' || copy.variant === 'pending_gap'
        ? 'border-amber-400/40 bg-amber-950/35 text-amber-50'
        : 'border-slate-500/35 bg-slate-950/50 text-slate-200';

  const countLabel = streakInfo && streakInfo.streakCount === 1 ? 'mes de racha' : 'meses de racha';

  return (
    <aside
      role="status"
      className={`rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3 ${shell} ${className}`.trim()}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/50">{copy.statusLabel}</p>
      {streakInfo ? (
        <p className="mt-1 font-black tabular-nums leading-none tracking-tight text-white sm:text-lg">
          {streakInfo.streakCount}{' '}
          <span className="text-sm font-semibold text-white/55">{countLabel}</span>
        </p>
      ) : null}
      <p className={`text-xs font-medium leading-snug text-white/65 ${streakInfo ? 'mt-1.5' : 'mt-1'}`}>
        {copy.message}
      </p>
    </aside>
  );
}
