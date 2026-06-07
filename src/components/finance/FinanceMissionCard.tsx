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
    <section className="finance-card relative overflow-hidden p-3.5 sm:p-4 sm:pr-20">
      <div className="mb-2 flex items-center gap-2 sm:absolute sm:right-4 sm:top-4 sm:mb-0 sm:z-[2]">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-lg sm:h-12 sm:w-12 sm:text-xl">
          ⚡
        </span>
        <span className="finance-label sm:hidden">Misión del mes</span>
      </div>

      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-2">
        <span className="finance-label hidden sm:inline-flex">Misión del mes</span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600">
          {statusLabel}
        </span>
      </div>

      <h2 className="relative z-[1] mt-2 text-base font-black tracking-tight text-slate-900 sm:text-lg">
        Misión: {missionTitle}
      </h2>

      <div className="relative z-[1] mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-lg font-black tabular-nums text-slate-900 sm:text-xl">{formatARS(mission.currentAmount)}</span>
        <span className="text-xs font-bold text-slate-500">
          / {formatARS(mission.targetAmount)} · {mission.percent.toFixed(0)}%
        </span>
      </div>

      <div className="relative z-[1] mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${
            mission.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'
          }`}
          style={{ width: `${Math.min(100, mission.percent)}%` }}
        />
      </div>

      <div className="relative z-[1] mt-3">
        <p className="finance-label">Recompensa</p>
        <span className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
          Nivel {mission.rewardLevel} · {mission.rewardTitle}
        </span>
      </div>

      <div className="relative z-[1] mt-3 flex flex-wrap items-center gap-2">
        <a
          href="#inversion"
          className="finance-primary-button inline-flex min-h-[48px] w-full items-center justify-center px-4 py-2.5 text-sm sm:min-h-[40px] sm:w-auto sm:text-xs"
        >
          Sumar inversión
        </a>
      </div>
    </section>
  );
}
