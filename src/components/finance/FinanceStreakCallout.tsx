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

  if (copy.variant === 'protected') {
    return null;
  }

  const shell =
    copy.variant === 'pending_empty' || copy.variant === 'pending_gap'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-slate-200 bg-slate-50 text-slate-700';

  const countLabel = streakInfo && streakInfo.streakCount === 1 ? 'mes de racha' : 'meses de racha';

  return (
    <aside
      role="status"
      className={`rounded-2xl border px-3 py-2.5 sm:px-4 sm:py-3 ${shell} ${className}`.trim()}
    >
      <p className="finance-label">{copy.statusLabel}</p>
      {streakInfo ? (
        <p className="mt-1 font-black tabular-nums leading-none tracking-tight text-slate-900 sm:text-lg">
          {streakInfo.streakCount}{' '}
          <span className="text-sm font-semibold text-slate-500">{countLabel}</span>
        </p>
      ) : null}
      <p className={`text-xs font-medium leading-snug text-slate-600 ${streakInfo ? 'mt-1.5' : 'mt-1'}`}>
        {copy.message}
      </p>
    </aside>
  );
}
