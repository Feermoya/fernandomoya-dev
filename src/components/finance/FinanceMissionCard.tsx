import type { MonthlyMissionView } from '@/lib/finance/levels';
import { formatARS } from '@/lib/finance/calculations';

type Props = {
  mission: MonthlyMissionView;
};

export function FinanceMissionCard({ mission }: Props) {
  const statusLabel =
    mission.status === 'completed' ? 'Lista' : mission.status === 'in_progress' ? 'En curso' : 'Pendiente';

  const missionTitle = `Llegar a ${formatARS(mission.targetAmount)}`;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-cyan-500/35 bg-gradient-to-br from-cyan-950/75 via-slate-900/90 to-indigo-950/75 p-4 pr-20 shadow-lg">
      <div className="pointer-events-none absolute -right-8 top-0 h-28 w-28 rounded-full bg-cyan-500/20 blur-2xl" aria-hidden />

      <div className="absolute right-4 top-4 z-[2] flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-xl shadow-[0_0_35px_-12px_rgba(34,211,238,0.9)]">
        ⚡
      </div>

      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-2">
        <span className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100">
          Misión del mes
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-200">
          {statusLabel}
        </span>
      </div>

      <h2 className="relative z-[1] mt-2 text-base font-black tracking-tight text-white sm:text-lg">
        Misión: {missionTitle}
      </h2>

      <div className="relative z-[1] mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-lg font-black tabular-nums text-white sm:text-xl">{formatARS(mission.currentAmount)}</span>
        <span className="text-xs font-bold text-cyan-200/90">
          / {formatARS(mission.targetAmount)} · {mission.percent.toFixed(0)}%
        </span>
      </div>

      <div className="relative z-[1] mt-2 h-1.5 overflow-hidden rounded-full border border-white/10 bg-black/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-[width] duration-700"
          style={{ width: `${Math.min(100, mission.percent)}%` }}
        />
      </div>

      <div className="relative z-[1] mt-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/80">Recompensa</p>
        <span className="mt-1 inline-flex rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-100">
          Nivel {mission.rewardLevel} · {mission.rewardTitle}
        </span>
      </div>

      <div className="relative z-[1] mt-3 flex flex-wrap items-center gap-2">
        <a
          href="#inversion"
          className="inline-flex min-h-[40px] items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-black text-white shadow-md transition hover:brightness-110 active:scale-[0.99]"
        >
          Sumar inversión
        </a>
      </div>
    </section>
  );
}
