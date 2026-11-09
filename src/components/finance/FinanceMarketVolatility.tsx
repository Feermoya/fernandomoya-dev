import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, RefreshCcw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { vixZone, type VixZone } from '@/lib/finance/vix';

type VixData = {
  ok: boolean; value: number; date: string; percentileYear: number;
  observations: number; source: string; sourceUrl: string; zone: VixZone; frequency: string;
};
const COPY: Record<VixZone, { title: string; description: string; color: string }> = {
  calma: {title:'Volatilidad baja',description:'El mercado espera movimientos moderados. No indica que los activos estén caros.',color:'#10b981'},
  normal: {title:'Volatilidad habitual',description:'La incertidumbre está en un rango común. El precio de los activos requiere su propio análisis.',color:'#2563eb'},
  tension: {title:'Volatilidad elevada',description:'Hay mayor expectativa de movimientos en el S&P 500. Evaluá tu estrategia y el riesgo.',color:'#f59e0b'},
  alta: {title:'Miedo elevado',description:'El mercado descuenta movimientos fuertes. Podría ser útil revisar oportunidades, sin asumir descuentos.',color:'#f97316'},
  extrema: {title:'Estrés extremo',description:'Se esperan oscilaciones muy fuertes. No es una señal automática de compra.',color:'#ef4444'},
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
  const current = data ? COPY[data.zone] ?? COPY[vixZone(data.value)] : null;
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
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">VIX · volatilidad esperada del S&P 500</p>
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
          El indicador no está disponible. No mostramos valores inventados.
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
          <div className="mt-3 rounded-2xl bg-slate-50 p-3.5">
            <p className="text-[13px] font-semibold leading-relaxed text-slate-700">{current?.description}</p>
            <p className="mt-2 text-[11px] font-medium text-slate-500">
              Percentil {data.percentileYear} de las últimas {data.observations} ruedas. Cierre del {new Date(data.date+'T12:00:00Z').toLocaleDateString('es-AR',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})}.
            </p>
          </div>
        </>
      )}
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        El VIX mide volatilidad esperada a 30 días. No mide si las acciones están baratas ni pronostica la dirección del mercado.
      </p>
      <a href="https://www.cboe.com/tradable-products/vix/vix-historical-data" target="_blank" rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline">
        Fuente: Cboe (cierre diario) <ArrowUpRight size={13} aria-hidden />
      </a>
    </section>
  );
}
