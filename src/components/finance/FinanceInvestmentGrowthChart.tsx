import { useMemo, useState } from 'react';
import { ChartNoAxesCombined, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { FinanceEntry } from '@/lib/finance/types';
import { buildInvestmentTimeline, buildYearlyTimeline, type InvestmentTimelinePoint } from '@/lib/finance/investmentGrowth';
import { createGrowthMilestoneScale, formatGrowthMilestone } from '@/lib/finance/growthMilestones';
import { formatARS, formatEntryAmount } from '@/lib/finance/calculations';

type Props = { entries: FinanceEntry[]; throughMonth: string };
type Point = { x: number; y: number };

const PLOT = { left: 16, right: 382, top: 23, bottom: 196, height: 173 };

function monthName(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
}

function chartPath(points: Point[]): string {
  if (!points.length) return '';
  let path = 'M ' + points[0].x + ' ' + points[0].y;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], next = points[i];
    const mid = (prev.x + next.x) / 2;
    path += ' C ' + mid + ' ' + prev.y + ', ' + mid + ' ' + next.y + ', ' + next.x + ' ' + next.y;
  }
  return path;
}

function drawCoords(timeline: InvestmentTimelinePoint[], maximum: number): Point[] {
  return timeline.map((entry, i) => ({
    x: PLOT.left + (timeline.length === 1 ? 1 : i / (timeline.length - 1)) * (PLOT.right - PLOT.left),
    y: PLOT.bottom - Math.min(1, entry.cumulativeArs / maximum) * PLOT.height,
  }));
}

export function FinanceInvestmentGrowthChart({ entries, throughMonth }: Props) {
  const [mode, setMode] = useState<'all' | 'year'>('all');
  const [active, setActive] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const history = useMemo(() => buildInvestmentTimeline(entries, throughMonth), [entries, throughMonth]);
  const year = Number(throughMonth.slice(0, 4));
  const yearly = useMemo(() => buildYearlyTimeline(entries, year, throughMonth), [entries, year, throughMonth]);
  const points = mode === 'all' ? history : yearly;
  const currentArs = points.at(-1)?.cumulativeArs ?? 0;
  const scale = useMemo(() => createGrowthMilestoneScale(currentArs), [currentArs]);
  const coords = useMemo(() => drawCoords(points, scale.max), [points, scale.max]);
  const segment = useMemo(() => chartPath(coords), [coords]);
  const last = coords.at(-1);
  const first = coords[0];
  const actual = points[active ?? points.length - 1];

  if (!history.length) return null;

  if (!points.length) return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 text-sm font-semibold text-slate-600">
      Este año todavía no registraste aportes. Podés ver el histórico completo.
      <button type="button" className="ml-2 min-h-10 text-blue-700 underline" onClick={() => setMode('all')}>
        Ver histórico
      </button>
    </section>
  );

  return (
    <section className="relative min-w-0 overflow-hidden rounded-[22px] border border-[#d7e4fd] bg-gradient-to-br from-white via-[#f8fbff] to-[#eef5ff] p-3.5 shadow-sm sm:p-5"
      aria-labelledby="investment-growth-heading">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ChartNoAxesCombined size={19} aria-hidden />
            </span>
            <div>
              <h3 id="investment-growth-heading" className="text-sm font-extrabold tracking-tight text-slate-900">
                Evolución de tus aportes
              </h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Tu camino invirtiendo, mes a mes</p>
            </div>
          </div>
        </div>
        <div className="flex rounded-xl border border-blue-100 bg-blue-50/60 p-1 text-[11px] font-bold"
          aria-label="Período del gráfico">
          <button type="button" aria-pressed={mode === 'year'}
            onClick={() => { setMode('year'); setActive(null); }}
            className={'min-h-9 rounded-lg px-3 transition ' + (mode === 'year' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600')}>
            {year}
          </button>
          <button type="button" aria-pressed={mode === 'all'}
            onClick={() => { setMode('all'); setActive(null); }}
            className={'min-h-9 rounded-lg px-3 transition ' + (mode === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600')}>
            Histórico
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">
            {active == null ? mode === 'all' ? 'Total acumulado' : 'Aportado este año' : monthName(actual?.month ?? '')}
          </p>
          <p className="mt-0.5 text-[clamp(1.45rem,5vw,2.15rem)] font-black tabular-nums tracking-[-.05em] text-slate-950">
            {formatARS(actual?.cumulativeArs ?? 0)}
          </p>
          {history.at(-1)!.cumulativeUsd > 0 ? (
            <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-500">
              + {formatEntryAmount(actual?.cumulativeUsd ?? 0, 'USD')} registrados aparte
            </p>
          ) : null}
        </div>
        <span className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
          {points.length} {points.length === 1 ? 'mes' : 'meses'} <ChevronRight size={12} aria-hidden />
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl bg-white/80 px-1.5 pb-2 pt-2">
        {currentArs === 0 ? (
          <div className="flex min-h-44 items-center justify-center px-4 text-center text-sm font-semibold text-slate-500">
            Tus aportes en pesos van a formar el gráfico cuando cargues la primera inversión.
          </div>
        ) : (
          <svg viewBox="0 0 400 218" className="block h-auto w-full" role="img"
            aria-label={'Aportes en pesos de ' + monthName(points[0].month) + ' a ' + monthName(points.at(-1)!.month)
              + '. ' + scale.reachedCount + ' hitos superados. Próximo hito ' + formatGrowthMilestone(scale.next)}>
            <defs>
              <linearGradient id="foco-growth-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4a8cfa" stopOpacity=".28" />
                <stop offset="100%" stopColor="#4a8cfa" stopOpacity=".012" />
              </linearGradient>
            </defs>

            {scale.milestones.map(value => {
              const y = PLOT.bottom - value / scale.max * PLOT.height;
              const reached = value <= currentArs;
              const isNext = value === scale.next;
              return (
                <g key={value}>
                  <line x1={PLOT.left} x2={PLOT.right} y1={y} y2={y}
                    stroke={reached ? '#c9dcff' : isNext ? '#a8dec9' : '#e2e9f5'}
                    strokeWidth={isNext ? 1.6 : 1} strokeDasharray={isNext ? '4 4' : '5 6'} />
                  <rect x="20" y={y - 15} rx="6" width={isNext ? 123 : 91} height="20"
                    fill={isNext ? '#ddf9eb' : reached ? '#e9f1ff' : '#f1f5fa'} />
                  <text x="27" y={y - 1} fill={isNext ? '#087e55' : reached ? '#215fc5' : '#74839c'}
                    fontSize="11" fontWeight="800">
                    {isNext ? 'PRÓXIMO  ' : reached ? '✓  ' : ''}{formatGrowthMilestone(value)}
                  </text>
                </g>
              );
            })}

            {segment ? (
              <path d={segment + ' L ' + last!.x + ' ' + PLOT.bottom + ' L ' + first!.x + ' ' + PLOT.bottom + ' Z'}
                fill="url(#foco-growth-area)" />
            ) : null}
            {segment ? (
              <motion.path key={mode + '-' + throughMonth} d={segment}
                fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0 }} whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: reduced ? 0 : 1.4, ease: 'easeOut' }} />
            ) : null}
            {last && first ? (
              <motion.circle key={mode + '-dot'} r="7.5" fill="#2563eb" stroke="white" strokeWidth="3.5"
                initial={reduced ? { cx: last.x, cy: last.y } : { cx: first.x, cy: first.y }}
                whileInView={{ cx: coords.map(p => p.x), cy: coords.map(p => p.y) }}
                viewport={{ once: true, amount: 0.4 }}
                transition={reduced ? { duration: 0 }
                  : { duration: 1.4, ease: 'easeOut', times: coords.map((_, i) => coords.length === 1 ? 1 : i / (coords.length - 1)) }} />
            ) : null}
            {last ? (
              <g>
                <rect x={Math.max(172, last.x - 119)} y={Math.max(6, last.y - 43)}
                  width="119" height="27" rx="10" fill="#1555e9" />
                <text x={Math.max(172, last.x - 119) + 59.5}
                  y={Math.max(6, last.y - 43) + 18} textAnchor="middle"
                  fill="#fff" fontSize="12" fontWeight="900">
                  {formatGrowthMilestone(currentArs)}
                </text>
              </g>
            ) : null}
            {active != null && coords[active] ? (
              <circle cx={coords[active].x} cy={coords[active].y} r="9" fill="#10245a" stroke="#fff" strokeWidth="3" />
            ) : null}
          </svg>
        )}
        <div className="flex justify-between px-2 text-[10px] font-bold text-slate-500">
          <span>{monthName(points[0].month)}</span>
          <span>{monthName(points.at(-1)!.month)}</span>
        </div>
      </div>
      {points.length > 1 ? (
        <div className="mt-3">
          <label htmlFor="foco-growth-scrub" className="sr-only">Explorar mes del gráfico</label>
          <input id="foco-growth-scrub" type="range" min={0} max={points.length - 1}
            value={active ?? points.length - 1} onChange={e => setActive(Number(e.target.value))}
            className="w-full accent-blue-600"
            aria-valuetext={monthName(actual?.month ?? points.at(-1)!.month)} />
        </div>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Cada marca es un hito de capital aportado, no rentabilidad. Los USD se muestran aparte.
      </p>
    </section>
  );
}
