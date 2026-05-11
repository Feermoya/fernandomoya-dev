import type { MonthlyMissionView } from '@/lib/finance/levels';
import { formatARS } from '@/lib/finance/calculations';

type Props = {
  mission: MonthlyMissionView;
};

export function FinanceMissionCard({ mission }: Props) {
  const badge =
    mission.status === 'completed'
      ? 'Completada'
      : mission.status === 'in_progress'
        ? 'En carrera'
        : 'Pendiente';

  return (
    <section className="relative overflow-hidden rounded-3xl border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-950/90 via-slate-900/95 to-indigo-950/90 p-4 shadow-xl sm:p-5">
      <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-cyan-500/25 blur-3xl" aria-hidden />
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full border border-cyan-400/50 bg-cyan-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">
            Misión activa
          </span>
          <h2 className="mt-3 text-lg font-black tracking-tight text-white sm:text-xl">{mission.headline}</h2>
          <p className="mt-2 max-w-prose text-sm font-medium leading-relaxed text-cyan-100/85">{mission.tagline}</p>
        </div>
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold text-white">
          {badge}
        </span>
      </div>

      <p className="relative z-[1] mt-4 text-sm font-semibold text-white/90">
        Meta de inversión del mes: {formatARS(mission.targetAmount)}.
      </p>

      <div className="relative z-[1] mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-2xl font-black tabular-nums text-white">{formatARS(mission.currentAmount)}</span>
        <span className="text-sm font-bold text-cyan-200/90">
          / {formatARS(mission.targetAmount)} · {mission.percent.toFixed(0)}%
        </span>
      </div>

      <div className="relative z-[1] mt-3 h-3 overflow-hidden rounded-full border border-white/10 bg-black/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-[width] duration-700"
          style={{ width: `${Math.min(100, mission.percent)}%` }}
        />
      </div>

      <p className="relative z-[1] mt-3 text-sm font-bold text-amber-200">
        Recompensa: Nivel {mission.rewardLevel} · {mission.rewardTitle}
      </p>

      {mission.hint ? (
        <p className="relative z-[1] mt-2 text-xs font-semibold text-amber-100/90">{mission.hint}</p>
      ) : null}

      <a
        href="#inversion"
        className="relative z-[1] mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-3 text-center text-sm font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] sm:w-auto"
      >
        Sumar inversión
      </a>
    </section>
  );
}
