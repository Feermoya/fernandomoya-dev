import { useEffect, useId, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, CircleAlert } from 'lucide-react';
import { motion, useAnimationControls, useReducedMotion } from 'motion/react';
import { getVixActionSignal, getVixNeedleTip, VIX_DIAL_CENTER } from '@/lib/finance/vixSignal';

type VixData = { ok: boolean; value: number; date: string; percentileYear: number };
type DialSegment = { start: number; end: number; color: string };

const DIAL_SEGMENTS: readonly DialSegment[] = [
  { start: 10, end: 16, color: '#17b890' },
  { start: 16, end: 21, color: '#4bbfc0' },
  { start: 21, end: 26, color: '#f9c554' },
  { start: 26, end: 32, color: '#fb9944' },
  { start: 32, end: 40, color: '#f7793c' },
  { start: 40, end: 50, color: '#ee495b' },
];

const TONE = {
  opportunity: {
    badge: 'border-emerald-300 bg-emerald-100 text-emerald-800 shadow-sm',
    icon: ArrowUpRight,
    panel: 'border-emerald-200 bg-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,.65)]',
  },
  neutral: {
    badge: 'border-amber-300 bg-amber-100 text-amber-900 shadow-sm',
    icon: CircleAlert,
    panel: 'border-amber-200 bg-amber-50',
  },
  caution: {
    badge: 'border-rose-300 bg-rose-100 text-rose-800 shadow-sm',
    icon: ArrowDownRight,
    panel: 'border-rose-200 bg-rose-50',
  },
} as const;

function dialPoint(angle: number, radius: number) {
  const radians = angle * Math.PI / 180;
  return { x: 160 + Math.cos(radians) * radius, y: 168 + Math.sin(radians) * radius };
}
function dialArc(startValue: number, endValue: number) {
  const from = dialPoint(180 + (startValue - 10) / 40 * 180, 112);
  const to = dialPoint(180 + (endValue - 10) / 40 * 180, 112);
  return 'M ' + from.x.toFixed(2) + ' ' + from.y.toFixed(2)
    + ' A 112 112 0 0 1 ' + to.x.toFixed(2) + ' ' + to.y.toFixed(2);
}

export function FinanceMarketVolatility() {
  const [data, setData] = useState<VixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reduced = useReducedMotion();
  const needleControls = useAnimationControls();
  const dialId = useId();

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/finance-vix', { signal: controller.signal });
        if (!response.ok) throw new Error('VIX unavailable');
        const result = await response.json() as VixData;
        if (!result.ok || !Number.isFinite(result.value) || result.value <= 0) throw new Error('Invalid VIX');
        if (!controller.signal.aborted) setData(result);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 900);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, []);

  const signal = data ? getVixActionSignal(data.value, data.percentileYear) : null;
  const needleTip = getVixNeedleTip(data?.value ?? 10);
  const theme = signal ? TONE[signal.tone] : TONE.neutral;
  const StateIcon = theme.icon;

  useEffect(() => {
    if (!data) return;

    const value = data.value;
    const finalTip = getVixNeedleTip(value);
    if (reduced) {
      needleControls.set({ x2: finalTip.x, y2: finalTip.y });
      return;
    }

    let cancelled = false;
    const moveNeedle = async () => {
      // First sweep to the actual VIX value, then subtly oscillate about it.
      await needleControls.start({
        x2: finalTip.x,
        y2: finalTip.y,
        transition: { type: 'spring', stiffness: 72, damping: 14, mass: 1.05 },
      });
      if (cancelled) return;
      const pressure = [-1.9, 1.9, -1.2, 2.2, -1.5, -1.9]
        .map(degrees => getVixNeedleTip(value, degrees));
      void needleControls.start({
        x2: pressure.map(p => p.x),
        y2: pressure.map(p => p.y),
        transition: { duration: 2.3, ease: 'easeInOut', repeat: Infinity },
      });
    };
    void moveNeedle();
    return () => {
      cancelled = true;
      needleControls.stop();
    };
  }, [data?.value, needleControls, reduced]);

  return (
    <section className="min-w-0 rounded-[22px] border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5"
      aria-labelledby="vix-title">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <Activity size={19} aria-hidden />
        </span>
        <div>
          <h3 id="vix-title" className="text-sm font-extrabold text-slate-900">Miedo del mercado</h3>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">El pulso del S&amp;P 500</p>
        </div>
      </div>

      {loading ? (
        <div className="mx-auto mt-5 h-44 max-w-[320px] animate-pulse rounded-3xl bg-slate-50"
          role="status" aria-label="Consultando miedo del mercado" />
      ) : error || !data || !signal ? (
        <p role="status" className="mt-5 rounded-2xl bg-slate-50 p-4 text-center text-sm font-medium text-slate-600">
          El indicador no está disponible en este momento.
        </p>
      ) : (
        <>
          <div className="mx-auto mt-2 max-w-[340px]">
            <svg viewBox="0 0 320 200" className="block h-auto w-full" role="img"
              aria-label={'Tacómetro VIX ' + data.value.toFixed(2) + ', ' + signal.title}>
              <defs>
                <filter id={dialId} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.3" />
                </filter>
              </defs>
              <path d={dialArc(10, 50)} fill="none" stroke="#ecf0f7" strokeWidth="25"
                strokeLinecap="round" />
              {DIAL_SEGMENTS.map((segment, index) => (
                <path key={segment.start} d={dialArc(segment.start + (index ? .38 : 0), segment.end - (index === DIAL_SEGMENTS.length-1 ? 0 : .38))}
                  fill="none" stroke={segment.color} strokeWidth="20" strokeLinecap="butt" />
              ))}
              {Array.from({ length: 21 }, (_, index) => {
                const angle = 180 + index / 20 * 180;
                const big = index % 5 === 0;
                const inner = dialPoint(angle, big ? 81 : 86);
                const outer = dialPoint(angle, 94);
                return <line key={index} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                  stroke={big ? '#7b8a9f' : '#b7c1cf'} strokeWidth={big ? 2 : 1.2} strokeLinecap="round" />;
              })}
              {[10, 20, 30, 40, 50].map(value => {
                const position = dialPoint(180 + (value - 10) / 40 * 180, 67);
                return <text key={value} x={position.x} y={position.y+4} textAnchor="middle"
                  fontSize="11" fontWeight="800" fill="#64748b">{value}</text>;
              })}
              {/* Fixed inner pivot: SVG line endpoints move, the axis never does. */}
              <motion.line
                x1={VIX_DIAL_CENTER.x}
                y1={VIX_DIAL_CENTER.y}
                initial={reduced ? { x2: needleTip.x, y2: needleTip.y } : { x2: 72, y2: VIX_DIAL_CENTER.y }}
                animate={needleControls}
                stroke="#ffffff"
                strokeWidth="8"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <motion.line
                x1={VIX_DIAL_CENTER.x}
                y1={VIX_DIAL_CENTER.y}
                initial={reduced ? { x2: needleTip.x, y2: needleTip.y } : { x2: 72, y2: VIX_DIAL_CENTER.y }}
                animate={needleControls}
                stroke="#0f1931"
                strokeWidth="5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <circle cx={VIX_DIAL_CENTER.x} cy={VIX_DIAL_CENTER.y} r="18"
                fill="#9baacf" opacity=".2" filter={'url(#' + dialId + ')'} />
              <circle cx={VIX_DIAL_CENTER.x} cy={VIX_DIAL_CENTER.y} r="13"
                fill="#101b35" stroke="#fff" strokeWidth="4" />
              <circle cx={VIX_DIAL_CENTER.x} cy={VIX_DIAL_CENTER.y} r="4" fill="#9ac5ff" />
              <text x="44" y="191" fontSize="10.5" fontWeight="700" fill="#697994">Calma</text>
              <text x="276" y="191" fontSize="10.5" textAnchor="end" fontWeight="700" fill="#697994">Miedo</text>
            </svg>
            <div className="-mt-1 text-center">
              <p className="text-[2.4rem] font-black leading-none tabular-nums tracking-[-.04em] text-slate-950">
                {data.value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">{signal.title}</p>
            </div>
          </div>

          <div className={'mt-4 rounded-2xl border p-3.5 sm:p-4 ' + theme.panel}>
            <span className={'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-extrabold ' + theme.badge}>
              <StateIcon size={15} aria-hidden />
              {signal.badge}
            </span>
            <p className="mt-2.5 text-[13px] font-semibold leading-relaxed text-slate-800">
              {signal.message}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
