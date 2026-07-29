import { LayoutDashboard } from 'lucide-react';
import type { FinanceState } from '@/lib/finance/types';
import { highestAchievedLevel, isLevelUnlocked, LEVEL_RULES } from '@/lib/finance/levels';
import { getLevelTheme } from '@/lib/finance/levelTheme';
import { FinanceSectionHeading } from '@/components/finance/FinanceSectionHeading';

type Props = {
  state: FinanceState;
  month: string;
  compact?: boolean;
};

export function FinanceProgressPath({ state, month, compact = false }: Props) {
  const current = highestAchievedLevel(state, month);
  const pad = compact ? 'p-3 sm:p-4' : 'p-4 sm:p-6';
  const nodePad = compact ? 'p-2.5 sm:p-3' : 'p-3';
  const numSize = compact ? 'h-8 w-8 text-xs' : 'h-9 w-9 text-sm';

  return (
    <section className={`finance-card-compact relative overflow-hidden ${pad}`}>
      <div className="relative z-[1]">
        <FinanceSectionHeading
          title="Niveles"
          subtitle="Constancia, no improvisación"
          icon={LayoutDashboard}
          iconTone="violet"
        />

        <ol
          className={`mt-4 flex flex-col gap-2 sm:gap-3 lg:flex-row lg:flex-wrap lg:gap-x-2 ${
            compact ? 'lg:gap-y-2' : 'lg:gap-y-4'
          }`}
        >
          {LEVEL_RULES.map((row, idx) => {
            const unlocked = isLevelUnlocked(row.level, state, month);
            const isCurrent = row.level === current;
            const theme = getLevelTheme(row.level);
            return (
              <li
                key={row.level}
                className={`relative flex min-w-0 flex-1 flex-col rounded-xl border sm:rounded-2xl ${nodePad} transition lg:max-w-[180px] ${
                  isCurrent
                    ? 'border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-200 motion-reduce:shadow-none'
                    : unlocked
                      ? 'border-slate-200 bg-white'
                      : 'border-slate-200 bg-slate-50 opacity-70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex shrink-0 items-center justify-center rounded-full border-2 font-bold ${numSize}`}
                    style={{
                      borderColor: theme.border,
                      color: theme.text,
                      background: unlocked ? `${theme.from}22` : '#f8fafc',
                    }}
                  >
                    {row.level}
                  </span>
                  <span className={compact ? 'text-base' : 'text-lg'} aria-hidden>
                    {theme.icon}
                  </span>
                </div>
                <p
                  className={`mt-1.5 truncate font-bold text-slate-900 ${
                    compact ? 'text-xs sm:text-sm' : 'text-sm'
                  }`}
                >
                  {row.name}
                </p>
                <p
                  className={`mt-1 font-medium leading-snug text-slate-500 line-clamp-2 ${
                    compact ? 'text-[10px] sm:text-[11px]' : 'text-[11px]'
                  }`}
                >
                  {row.condition}
                </p>
                <span
                  className={`mt-1.5 inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    unlocked
                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                      : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
                  }`}
                >
                  {unlocked ? 'Desbloqueado' : 'Pendiente'}
                  {isCurrent ? ' · Actual' : ''}
                </span>
                {idx < LEVEL_RULES.length - 1 ? (
                  <span
                    className="absolute -right-1 top-1/2 hidden h-0.5 w-3 -translate-y-1/2 bg-slate-200 lg:block"
                    aria-hidden
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
