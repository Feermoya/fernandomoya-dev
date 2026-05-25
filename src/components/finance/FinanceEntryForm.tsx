import { useEffect, useState } from 'react';
import { formatARS } from '@/lib/finance/calculations';
import { DEFAULT_QUICK_AMOUNTS } from '@/lib/finance/preferences';
import type { FinanceAsset, FinanceEntry } from '@/lib/finance/types';
import { FinanceStreakCallout } from '@/components/finance/FinanceStreakCallout';

type Props = {
  month: string;
  entries: FinanceEntry[];
  quickAmounts?: number[];
  onAddEntry: (entry: FinanceEntry) => void;
  /** Tras persistir la entrada (útil para celebraciones en el padre). */
  onEntrySaved?: (entry: FinanceEntry) => void;
};

const ASSET_OPTIONS: { value: FinanceAsset; label: string }[] = [
  { value: 'ARS', label: 'ARS' },
  { value: 'USD', label: 'Dólar MEP / USD' },
  { value: 'BTC', label: 'Bitcoin (BTC)' },
  { value: 'CEDEAR', label: 'Acciones / CEDEARs' },
  { value: 'ETF', label: 'ETF' },
  { value: 'EMERGENCY_FUND', label: 'Fondo emergencia' },
  { value: 'PROJECT', label: 'Proyecto' },
  { value: 'OTHER', label: 'Otro' },
];

const PLATFORM_OPTIONS = ['Balanz', 'Exchange crypto', 'Banco', 'Otro'] as const;

const BORDER = 'border-emerald-500/50';
const RING = 'ring-emerald-500/30';
const GRADIENT = 'from-emerald-600 to-teal-600';

export function FinanceEntryForm({ month, entries, quickAmounts, onAddEntry, onEntrySaved }: Props) {
  const quickList = quickAmounts?.length ? quickAmounts : [...DEFAULT_QUICK_AMOUNTS];
  const [formMonth, setFormMonth] = useState(month);
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<FinanceAsset | ''>('');
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]>('Balanz');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setFormMonth(month);
  }, [month]);

  const lastSameMonth = entries
    .filter((e) => e.type === 'investment' && e.month === formMonth)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  const addQuick = (n: number) => {
    const cur = Number(amount.replace(',', '.'));
    const base = Number.isFinite(cur) && cur > 0 ? cur : 0;
    setAmount(String(base + n));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;

    const entry: FinanceEntry = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      month: formMonth,
      type: 'investment',
      amount: Math.round(n),
      createdAt: new Date().toISOString(),
    };
    if (asset) entry.asset = asset;
    if (platform.trim()) entry.platform = platform.trim();
    if (category.trim()) entry.category = category.trim();
    if (note.trim()) entry.note = note.trim();

    onAddEntry(entry);
    onEntrySaved?.(entry);
    setAmount('');
    setNote('');
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  };

  return (
    <form
      onSubmit={submit}
      className={`relative scroll-mt-24 overflow-hidden rounded-2xl border-2 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_32%),linear-gradient(135deg,rgba(2,6,23,0.95),rgba(15,23,42,0.92))] p-3.5 shadow-xl backdrop-blur-md transition sm:p-4 ${BORDER} ${savedFlash ? `ring-2 ring-offset-2 ring-offset-slate-950 ${RING}` : ''}`}
    >
      {savedFlash ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-emerald-500/15 motion-safe:animate-pulse"
          aria-live="polite"
        />
      ) : null}

      <div className="relative z-[1]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/25 bg-emerald-300/10 text-lg font-black text-emerald-100 shadow-[0_0_30px_-14px_rgba(52,211,153,0.9)]">
              +
            </span>
            <div>
              <h3 className="text-base font-black tracking-tight text-white">Sumar inversión</h3>
              <p className="text-xs font-semibold text-emerald-200/70">Carga rápida del mes</p>
            </div>
          </div>
          {savedFlash ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
              Listo
            </span>
          ) : null}
        </div>

        <label className="mt-4 flex flex-col gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Monto a invertir</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            step={1}
            required
            placeholder="$ 0"
            className="finance-input-mobile min-h-[52px] rounded-2xl border-2 border-emerald-300/20 bg-black/35 px-4 py-3 text-center text-2xl font-black tabular-nums text-white placeholder:text-slate-600 focus:border-emerald-300/50 focus:ring-4 focus:ring-emerald-400/10 sm:text-3xl"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <div className="mt-2 flex flex-wrap gap-2">
          {quickList.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => addQuick(n)}
              className="min-h-[40px] rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 text-xs font-black tabular-nums text-emerald-100 transition hover:bg-emerald-500/20 active:scale-[0.98]"
            >
              {n >= 1_000_000 ? `+${(n / 1_000_000).toFixed(1)}M` : `+${Math.round(n / 1000)}k`}
            </button>
          ))}
          {lastSameMonth ? (
            <button
              type="button"
              onClick={() => setAmount(String(lastSameMonth.amount))}
              className="min-h-[40px] rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-slate-300 transition hover:bg-white/10 active:scale-[0.98]"
            >
              Repetir {formatARS(lastSameMonth.amount)}
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          className={`mt-3 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-r px-4 py-3.5 text-base font-black text-white shadow-lg transition hover:brightness-110 active:scale-[0.99] sm:min-h-[48px] sm:text-sm ${GRADIENT}`}
        >
          Cargar inversión
        </button>

        <FinanceStreakCallout entries={entries} contextMonth={formMonth} className="mt-3" />

        <details className="mt-3 group">
          <summary className="cursor-pointer list-none text-center text-xs font-bold text-emerald-300/90 underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
            Activo, plataforma y mes
          </summary>
          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-white/10 bg-black/25 p-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mes</span>
              <input
                type="month"
                required
                className="finance-input-mobile min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-bold text-white"
                value={formMonth}
                onChange={(e) => setFormMonth(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Activo</span>
              <select
                className="finance-input-mobile min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-semibold text-white"
                value={asset}
                onChange={(e) => setAsset(e.target.value as FinanceAsset | '')}
              >
                <option value="">—</option>
                {ASSET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Plataforma</span>
              <select
                className="finance-input-mobile min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-semibold text-white"
                value={platform}
                onChange={(e) => setPlatform(e.target.value as (typeof PLATFORM_OPTIONS)[number])}
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Etiqueta</span>
              <input
                className="finance-input-mobile min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                placeholder="Ej. CEDEARs, MEP"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <p className="text-[10px] font-semibold leading-snug text-slate-500">
                Usá el ticker o nombre que pusiste en el plan mensual. Ej. MELI, TSLA, BTC.
              </p>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Nota</span>
              <textarea
                rows={2}
                className="resize-y rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                placeholder="Opcional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
        </details>
      </div>
    </form>
  );
}
