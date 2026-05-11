import { useEffect, useState } from 'react';
import type { FinanceAsset, FinanceEntry } from '@/lib/finance/types';

type Props = {
  month: string;
  onAddEntry: (entry: FinanceEntry) => void;
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

const BORDER = 'border-emerald-500/60';
const RING = 'ring-emerald-500/30';
const GRADIENT = 'from-emerald-600 to-teal-600';

export function FinanceEntryForm({ month, onAddEntry }: Props) {
  const [formMonth, setFormMonth] = useState(month);
  const [showDetails, setShowDetails] = useState(false);
  const [amount, setAmount] = useState('');
  const [asset, setAsset] = useState<FinanceAsset | ''>('');
  const [platform, setPlatform] = useState<(typeof PLATFORM_OPTIONS)[number]>('Balanz');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    setFormMonth(month);
  }, [month]);

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
    setAmount('');
    setNote('');
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  };

  return (
    <form
      onSubmit={submit}
      className={`relative scroll-mt-24 overflow-hidden rounded-3xl border-2 bg-slate-950/70 p-4 shadow-2xl backdrop-blur-md transition sm:p-5 ${BORDER} ${savedFlash ? `ring-2 ring-offset-2 ring-offset-slate-950 ${RING}` : ''}`}
    >
      {savedFlash ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-emerald-500/15 motion-safe:animate-pulse"
          aria-live="polite"
        />
      ) : null}

      <div className="relative z-[1]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-300/90">Inversión</p>
            <h3 className="text-lg font-black tracking-tight text-white">Sumar al mes</h3>
          </div>
          {savedFlash ? (
            <span className="rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-bold text-emerald-200">
              Inversión cargada
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Mes</span>
            <input
              type="month"
              required
              className="min-h-[48px] rounded-2xl border-2 border-white/15 bg-black/40 px-4 py-3 text-base font-bold text-white"
              value={formMonth}
              onChange={(e) => setFormMonth(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Monto invertido (ARS)</span>
            <input
              type="number"
              min={1}
              step={1}
              required
              placeholder="0"
              className="min-h-[56px] rounded-2xl border-2 border-white/20 bg-black/35 px-4 py-4 text-center text-[1.85rem] font-black tabular-nums text-white placeholder:text-slate-600"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-left text-xs font-bold text-emerald-300/90 underline-offset-2 hover:underline"
          >
            {showDetails ? '− Ocultar detalles opcionales' : '+ Activo y plataforma (opcional)'}
          </button>

          {showDetails ? (
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-black/25 p-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Activo</span>
                <select
                  className="min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-semibold text-white"
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
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Plataforma</span>
                <select
                  className="min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-semibold text-white"
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
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Etiqueta</span>
                <input
                  className="min-h-[48px] rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  placeholder="Ej. CEDEARs, MEP"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Nota</span>
                <textarea
                  rows={2}
                  className="resize-y rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                  placeholder="Contexto breve"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            </div>
          ) : null}
        </div>

        <button
          type="submit"
          className={`mt-6 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-r px-4 py-3 text-sm font-black text-white shadow-xl transition hover:brightness-110 active:scale-[0.99] ${GRADIENT}`}
        >
          Sumar inversión
        </button>
      </div>
    </form>
  );
}
