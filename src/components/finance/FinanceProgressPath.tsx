import type { FinanceState } from '@/lib/finance/types';
import { highestAchievedLevel, isLevelUnlocked, LEVEL_RULES } from '@/lib/finance/levels';
import { getLevelTheme } from '@/lib/finance/levelTheme';

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
  const titleSize = compact ? 'text-base' : 'text-xl';

  return (
    <section className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 shadow-lg backdrop-blur-md sm:rounded-3xl ${pad}`}>
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40"
        aria-hidden
      />

      <div className="relative z-[1]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300/80 sm:text-[11px]">Ruta de niveles</p>
        <h3 className={`mt-0.5 font-black tracking-tight text-white ${titleSize}`}>Cada nivel premia constancia, no improvisación.</h3>

        <ol className={`mt-4 flex flex-col gap-2 sm:gap-3 lg:flex-row lg:flex-wrap lg:gap-x-2 ${compact ? 'lg:gap-y-2' : 'lg:gap-y-4'}`}>
          {LEVEL_RULES.map((row, idx) => {
            const unlocked = isLevelUnlocked(row.level, state, month);
            const isCurrent = row.level === current;
            const theme = getLevelTheme(row.level);
            return (
              <li
                key={row.level}
                className={`relative flex min-w-0 flex-1 flex-col rounded-xl border-2 sm:rounded-2xl ${nodePad} transition lg:max-w-[180px] ${
                  isCurrent
                    ? 'border-white/35 shadow-[0_0_24px_rgba(99,102,241,0.35)] motion-reduce:shadow-none'
                    : 'border-white/10'
                } ${unlocked ? 'opacity-100' : 'opacity-55'}`}
                style={{
                  background: unlocked
                    ? `linear-gradient(160deg, ${theme.from}99, rgba(15,23,42,0.92))`
                    : 'rgba(15,23,42,0.75)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`flex shrink-0 items-center justify-center rounded-full border-2 font-black ${numSize}`}
                    style={{
                      borderColor: theme.border,
                      color: theme.text,
                      boxShadow: isCurrent ? `0 0 12px ${theme.glow}` : undefined,
                    }}
                  >
                    {row.level}
                  </span>
                  <span className={compact ? 'text-base' : 'text-lg'} aria-hidden>
                    {theme.icon}
                  </span>
                </div>
                <p className={`mt-1.5 truncate font-black text-white ${compact ? 'text-xs sm:text-sm' : 'text-sm'}`}>{row.name}</p>
                <p
                  className={`mt-1 font-medium leading-snug text-slate-300 line-clamp-2 ${compact ? 'text-[10px] sm:text-[11px]' : 'text-[11px]'}`}
                >
                  {row.condition}
                </p>
                <span className="mt-1.5 inline-flex w-fit rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/90 ring-1 ring-white/15">
                  {unlocked ? 'Desbloqueado' : 'Pendiente'}
                  {isCurrent ? ' · Acá' : ''}
                </span>
                {idx < LEVEL_RULES.length - 1 ? (
                  <span
                    className="absolute -right-1 top-1/2 hidden h-0.5 w-3 -translate-y-1/2 bg-white/15 lg:block"
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
