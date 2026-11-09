import { useEffect, useState } from 'react';
import { Activity, RefreshCcw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { getVixMarketInsight, type VixZone } from '@/lib/finance/vix';

type VixData = {
  ok: boolean; value: number; date: string; percentileYear: number;
  observations: number; source: string; sourceUrl: string; zone: VixZone; frequency: string;
};
export function FinanceMarketVolatility() {
  const [data, setData] = useState<VixData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reduced = useReducedMotion();
  async function load(signal?: AbortSignal) {
    setLoading(true); setError(false);
    try {
      const response = await fetch('/api/finance-vix', {cache:'default', signal});
      const json = await response.json() as VixData;
      if (!response.ok || json.ok !== true || !Number.isFinite(json.value)) throw Error();
      setData(json);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') { setData(null); setError(true); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => void load(controller.signal), 1300);
    return () => {window.clearTimeout(timeout); controller.abort();};
  }, []);
  const current = data ? getVixMarketInsight(data.value, data.percentileYear) : null;
  const ratio = data ? Math.min(1,Math.max(0,(data.value-10)/40)) : 0;
  return (
    <section className="rounded-[22px] border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5" aria-labelledby="vix-title">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
            <Activity size={19} aria-hidden />
          </span>
          <div>
            <h3 id="vix-title" className="text-sm font-extrabold text-slate-900">Miedo del mercado</h3>
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">Cómo está el mercado hoy</p>
          </div>
        </div>
        <button type="button" onClick={()=>void load()} aria-label="Actualizar VIX" disabled={loading}
          className="flex min-h-9 min-w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50">
          <RefreshCcw size={15} className={loading?'animate-spin':''} aria-hidden />
        </button>
      </div>
      {loading && !data ? (
        <div className="mt-6 h-36 animate-pulse rounded-2xl bg-slate-50" role="status" aria-label="Consultando VIX en Cboe" />
      ) : error || !data ? (
        <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-medium text-amber-900" role="status">
          No se pudo actualizar. Probá nuevamente.
        </div>
      ) : (
        <>
          <div className="relative mx-auto mt-2 max-w-[310px]">
            <svg viewBox="0 0 320 158" role="img" aria-label={`VIX ${data.value.toFixed(2)}, ${current?.title}`} className="h-auto w-full">
              <defs>
                <linearGradient id="vix-gauge-colors" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981"/><stop offset="32%" stopColor="#60a5fa"/>
                  <stop offset="52%" stopColor="#fbbf24"/><stop offset="75%" stopColor="#fb923c"/>
                  <stop offset="100%" stopColor="#ef4444"/>
                </linearGradient>
              </defs>
              <path d="M 44 133 A 116 116 0 0 1 276 133" fill="none" stroke="#e2e8f0" strokeWidth="17" strokeLinecap="round"/>
              <path d="M 44 133 A 116 116 0 0 1 276 133" fill="none" stroke="url(#vix-gauge-colors)" strokeWidth="17" strokeLinecap="round"/>
              <motion.line x1="160" y1="133" x2="160" y2="50"
                stroke="#0f172a" strokeWidth="5" strokeLinecap="round"
                style={{transformOrigin:'160px 133px'}}
                initial={reduced ? {rotate:-90+ratio*180} : {rotate:-90}}
                animate={{rotate:-90+ratio*180}}
                transition={reduced?{duration:0}:{type:'spring',stiffness:75,damping:16}} />
              <circle cx="160" cy="133" r="11" fill="#0f172a" stroke="white" strokeWidth="4"/>
              <text x="36" y="155" fill="#64748b" fontSize="11" textAnchor="middle">Calma</text>
              <text x="285" y="155" fill="#64748b" fontSize="11" textAnchor="middle">Estrés</text>
            </svg>
            <div className="-mt-2 text-center">
              <p className="text-[2.25rem] font-black leading-none tabular-nums tracking-tight text-slate-950">{data.value.toLocaleString('es-AR',{maximumFractionDigits:2})}</p>
              <p className="mt-1 text-xs font-extrabold" style={{color:current?.color}}>{current?.title}</p>
            </div>
          </div>
          <div className="mx-auto mt-4 max-w-[360px] rounded-2xl bg-slate-50 px-4 py-3 text-center">
            <p className="text-[13px] font-semibold leading-relaxed text-slate-800">{current?.conclusion}</p>
          </div>
        </>
      )}
    </section>
  );
}
