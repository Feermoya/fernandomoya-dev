import { useMemo, useState } from 'react';
import { ChartNoAxesCombined, ChevronRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { FinanceEntry } from '@/lib/finance/types';
import { buildInvestmentTimeline, buildYearlyTimeline, type InvestmentTimelinePoint } from '@/lib/finance/investmentGrowth';
import { formatARS, formatEntryAmount } from '@/lib/finance/calculations';

type Props = { entries: FinanceEntry[]; throughMonth: string };

function monthName(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('es-AR', { month: 'short', year: 'numeric' });
}
function chartPath(points: { x: number; y: number }[]): string {
  if (!points.length) return '';
  let path = 'M ' + points[0].x + ' ' + points[0].y;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1], next = points[i];
    const mid = (prev.x + next.x) / 2;
    path += ' C ' + mid + ' ' + prev.y + ', ' + mid + ' ' + next.y + ', ' + next.x + ' ' + next.y;
  }
  return path;
}
function drawCoords(timeline: InvestmentTimelinePoint[], key: 'cumulativeArs' | 'cumulativeUsd') {
  const x0 = 16, x1 = 330, y0 = 155, y1 = 20;
  const max = Math.max(1, ...timeline.map(p => p[key]));
  return timeline.map((p, i) => ({
    x: x0 + (timeline.length === 1 ? 1 : i / (timeline.length - 1)) * (x1 - x0),
    y: y0 - (p[key] / max) * (y0 - y1),
  }));
}

export function FinanceInvestmentGrowthChart({ entries, throughMonth }: Props) {
  const [mode, setMode] = useState<'all' | 'year'>('all');
  const [active, setActive] = useState<number | null>(null);
  const reduced = useReducedMotion();
  const history = useMemo(() => buildInvestmentTimeline(entries, throughMonth), [entries, throughMonth]);
  const year = Number(throughMonth.slice(0,4));
  const yearly = useMemo(() => buildYearlyTimeline(entries, year, throughMonth), [entries, year, throughMonth]);
  const points = mode === 'all' ? history : yearly;
  const actual = points[active ?? points.length-1];
  const coord = useMemo(() => drawCoords(points, 'cumulativeArs'), [points]);
  const segment = useMemo(() => chartPath(coord), [coord]);
  const last = coord.at(-1);
  const first = coord[0];

  if (!history.length) return null;
  if (!points.length) return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 text-sm font-semibold text-slate-600">
      Este año todavía no registraste aportes. Podés ver el histórico completo.
      <button type="button" className="ml-2 text-blue-700 underline" onClick={() => setMode('all')}>Ver histórico</button>
    </section>
  );

  return (
    <section className="relative min-w-0 overflow-hidden rounded-[22px] border border-[#d7e4fd] bg-gradient-to-br from-white via-[#f8fbff] to-[#eef5ff] p-3.5 shadow-sm sm:p-5" aria-labelledby="investment-growth-heading">
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <ChartNoAxesCombined size={19} aria-hidden/>
            </span>
            <div>
              <h3 id="investment-growth-heading" className="text-sm font-extrabold tracking-tight text-slate-900">Evolución de tus aportes</h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">Tu camino invirtiendo, mes a mes</p>
            </div>
          </div>
        </div>
        <div className="flex rounded-xl border border-blue-100 bg-blue-50/60 p-1 text-[11px] font-bold" aria-label="Período del gráfico">
          <button type="button" aria-pressed={mode === 'year'}
            onClick={() => { setMode('year'); setActive(null); }}
            className={`min-h-9 rounded-lg px-3 transition ${mode==='year' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}>
            {year}
          </button>
          <button type="button" aria-pressed={mode === 'all'}
            onClick={() => { setMode('all'); setActive(null); }}
            className={`min-h-9 rounded-lg px-3 transition ${mode==='all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'}`}>
            Histórico
          </button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">{active == null ? mode==='all' ? 'Total acumulado' : 'Aportado este año' : monthName(actual?.month ?? '')}</p>
          <p className="mt-0.5 text-[clamp(1.45rem,5vw,2.15rem)] font-black tabular-nums tracking-[-.05em] text-slate-950">
            {formatARS(actual?.cumulativeArs ?? 0)}
          </p>
          {history.at(-1)!.cumulativeUsd > 0 ? (
            <p className="mt-0.5 text-xs font-semibold tabular-nums text-slate-500">
              + {formatEntryAmount(actual?.cumulativeUsd ?? 0,'USD')} registrados aparte
            </p>
          ) : null}
        </div>
        <span className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
          {points.length} {points.length===1?'mes':'meses'} <ChevronRight size={12} aria-hidden />
        </span>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl bg-white/75 px-1.5 pb-2 pt-2">
        <svg viewBox="0 0 344 177" className="block h-auto w-full overflow-visible" role="img"
          aria-label={`Aportes acumulados de ${monthName(points[0].month)} a ${monthName(points.at(-1)!.month)}`}>
          <defs>
            <linearGradient id="foco-growth-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a8cfa" stopOpacity=".25"/>
              <stop offset="100%" stopColor="#4a8cfa" stopOpacity=".015"/>
            </linearGradient>
          </defs>
          {[45,100,155].map(y=><line key={y} x1="16" x2="330" y1={y} y2={y} stroke="#dfe8f8" strokeWidth="1" strokeDasharray="4 5" />)}
          {segment ? <path d={segment+` L ${last!.x} 155 L ${first!.x} 155 Z`} fill="url(#foco-growth-area)" /> : null}
          {segment ? <motion.path key={mode+'-'+throughMonth} d={segment} fill="none" stroke="#2563eb" strokeWidth="3.8" strokeLinecap="round"
            initial={reduced ? false : {pathLength:0}} whileInView={{pathLength:1}}
            viewport={{once:true,amount:0.45}} transition={{duration:1.35,ease:'easeOut'}} /> : null}
          {last && first ? (
            <motion.circle key={mode+'-dot'} r="7" fill="#2563eb" stroke="white" strokeWidth="3.5"
              initial={reduced ? {cx:last.x,cy:last.y} : {cx:first.x,cy:first.y}}
              whileInView={{cx:coord.map(p=>p.x),cy:coord.map(p=>p.y)}}
              viewport={{once:true,amount:0.45}}
              transition={reduced ? {duration:0} : {duration:1.35,ease:'easeOut',times:coord.map((_,i)=>coord.length===1?1:i/(coord.length-1))}}/>
          ) : null}
          {active != null && coord[active] ? (
            <circle cx={coord[active].x} cy={coord[active].y} r="8" fill="#0f172a" stroke="white" strokeWidth="3" />
          ) : null}
        </svg>
        <div className="flex justify-between px-2 text-[10px] font-bold text-slate-500">
          <span>{monthName(points[0].month)}</span><span>{monthName(points.at(-1)!.month)}</span>
        </div>
      </div>
      {points.length>1 ? (
        <div className="mt-3">
          <label htmlFor="foco-growth-scrub" className="sr-only">Explorar mes del gráfico</label>
          <input id="foco-growth-scrub" type="range" min={0} max={points.length-1} value={active ?? points.length-1}
            onChange={e=>setActive(Number(e.target.value))}
            className="w-full accent-blue-600" aria-valuetext={monthName(actual?.month ?? points.at(-1)!.month)}/>
        </div>
      ) : null}
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Refleja lo que aportaste, no la ganancia ni el valor actual de mercado. Las inversiones en USD se muestran por separado.
      </p>
    </section>
  );
}
