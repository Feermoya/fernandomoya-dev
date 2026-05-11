import type { FinanceState } from '@/lib/finance/types';
import { highestAchievedLevel, isLevelUnlocked, LEVEL_RULES } from '@/lib/finance/levels';
import { getLevelTheme } from '@/lib/finance/levelTheme';

type Props = {
  state: FinanceState;
  month: string;
};

export function FinanceProgressPath({ state, month }: Props) {
  const current = highestAchievedLevel(state, month);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60 p-4 shadow-xl backdrop-blur-md sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] opacity-40" aria-hidden />

      <div className="relative z-[1]">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-indigo-300/90">Ruta de libertad</p>
        <h3 className="mt-1 text-xl font-black tracking-tight text-white">Cada nivel no premia cuánto tenés</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
          Premia que dejaste de improvisar.
        </p>

        <ol className="mt-6 flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:gap-x-3">
          {LEVEL_RULES.map((row, idx) => {
            const unlocked = isLevelUnlocked(row.level, state, month);
            const isCurrent = row.level === current;
            const theme = getLevelTheme(row.level);
            return (
              <li
                key={row.level}
                className={`relative flex min-w-0 flex-1 flex-col rounded-2xl border-2 p-3 transition sm:min-w-[140px] lg:max-w-[200px] ${
                  isCurrent
                    ? 'border-white/40 shadow-[0_0_32px_rgba(99,102,241,0.45)] motion-reduce:shadow-none'
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
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-black"
                    style={{
                      borderColor: theme.border,
                      color: theme.text,
                      boxShadow: isCurrent ? `0 0 16px ${theme.glow}` : undefined,
                    }}
                  >
                    {row.level}
                  </span>
                  <span className="text-lg" aria-hidden>
                    {theme.icon}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-black text-white">{row.name}</p>
                <p className="mt-1 text-[11px] font-medium leading-snug text-slate-300">{row.condition}</p>
                <span className="mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/90 ring-1 ring-white/20">
                  {unlocked ? 'Desbloqueado' : 'Pendiente'}
                  {isCurrent ? ' · Acá' : ''}
                </span>
                {idx < LEVEL_RULES.length - 1 ? (
                  <span
                    className="absolute -right-1 top-1/2 hidden h-0.5 w-3 -translate-y-1/2 bg-white/20 lg:block"
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
