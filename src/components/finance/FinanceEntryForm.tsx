import { useEffect, useState } from 'react';
import { CircleDollarSign } from 'lucide-react';
import { formatARS } from '@/lib/finance/calculations';
import { normalizePlanLabel } from '@/lib/finance/monthlyInvestmentPlan';
import { DEFAULT_QUICK_AMOUNTS } from '@/lib/finance/preferences';
import type { FinanceAsset, FinanceEntry } from '@/lib/finance/types';
import { FinanceStreakCallout } from '@/components/finance/FinanceStreakCallout';

type Props = {
  month: string;
  entries: FinanceEntry[];
  quickAmounts?: number[];
  pendingPlanLabels?: string[];
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

const MAX_PENDING_CHIPS = 8;

function applyPendingPlanLabel(
  label: string,
  currentAsset: FinanceAsset | '',
  setAsset: (value: FinanceAsset | '') => void,
  setCategory: (value: string) => void,
  setPlatform: (value: (typeof PLATFORM_OPTIONS)[number]) => void,
) {
  const norm = normalizePlanLabel(label);
  const base = norm.split(' ')[0] ?? norm;
  setCategory(base);

  if (base === 'BTC') {
    setAsset('BTC');
    setPlatform('Exchange crypto');
    return;
  }
  if (base === 'ETH' || base === 'SOL') {
    setAsset('OTHER');
    setPlatform('Exchange crypto');
    return;
  }
  if (!currentAsset) setAsset('CEDEAR');
}

export function FinanceEntryForm({
  month,
  entries,
  quickAmounts,
  pendingPlanLabels,
  onAddEntry,
  onEntrySaved,
}: Props) {
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

  const pendingLabels = pendingPlanLabels?.filter(Boolean) ?? [];
  const visiblePending = pendingLabels.slice(0, MAX_PENDING_CHIPS);
  const hiddenPendingCount = Math.max(0, pendingLabels.length - MAX_PENDING_CHIPS);

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
      className={`finance-card-compact relative scroll-mt-24 overflow-hidden p-3 transition sm:p-3.5 ${savedFlash ? 'ring-2 ring-blue-500/30 ring-offset-2 ring-offset-white' : ''}`}
    >
      {savedFlash ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 bg-emerald-100/40 motion-safe:animate-pulse"
          aria-live="polite"
        />
      ) : null}

      <div className="relative z-[1]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
              <CircleDollarSign size={18} strokeWidth={2.25} aria-hidden />
            </span>
            <h3 className="text-base font-black tracking-tight text-slate-900">Sumar inversión</h3>
          </div>
          {savedFlash ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
              Listo
            </span>
          ) : null}
        </div>

        <label className="mt-3 flex flex-col gap-1">
          <span className="finance-label">Monto a invertir</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            step={1}
            required
            placeholder="$ 0"
            className="finance-input-mobile min-h-[48px] rounded-xl px-3 py-2.5 text-center text-xl font-black tabular-nums sm:text-2xl"
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
              className="finance-secondary-button min-h-[40px] px-3 text-xs font-black tabular-nums active:scale-[0.98]"
            >
              {n >= 1_000_000 ? `+${(n / 1_000_000).toFixed(1)}M` : `+${Math.round(n / 1000)}k`}
            </button>
          ))}
          {lastSameMonth ? (
            <button
              type="button"
              onClick={() => setAmount(String(lastSameMonth.amount))}
              className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
            >
              Repetir {formatARS(lastSameMonth.amount)}
            </button>
          ) : null}
        </div>

        <button
          type="submit"
          className="finance-primary-button mt-3 flex w-full items-center justify-center px-4 py-3 text-sm sm:min-h-[48px]"
        >
          Cargar inversión
        </button>

        {visiblePending.length > 0 ? (
          <div className="mt-2.5">
            <p className="finance-label">Pendientes del plan</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {visiblePending.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    applyPendingPlanLabel(label, asset, setAsset, setCategory, setPlatform)
                  }
                  className="finance-secondary-button finance-touch-target min-h-[36px] px-2.5 text-[11px] font-black active:scale-[0.98]"
                >
                  {normalizePlanLabel(label).split(' ')[0]}
                </button>
              ))}
              {hiddenPendingCount > 0 ? (
                <span className="inline-flex min-h-[36px] items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-bold text-slate-500">
                  +{hiddenPendingCount} más
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        <FinanceStreakCallout entries={entries} contextMonth={formMonth} className="mt-2.5 lg:hidden" />

        <details className="finance-details mt-2.5 group">
          <summary className="cursor-pointer list-none rounded-[18px] px-3 py-2 text-center text-xs font-bold text-blue-700 underline-offset-2 hover:bg-blue-50/50 [&::-webkit-details-marker]:hidden">
            Activo, plataforma y mes
          </summary>
          <div className="flex flex-col gap-3 p-3">
            <label className="flex flex-col gap-1.5">
              <span className="finance-label">Mes</span>
              <input
                type="month"
                required
                className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2 text-sm font-bold"
                value={formMonth}
                onChange={(e) => setFormMonth(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="finance-label">Activo</span>
              <select
                className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2 text-sm font-semibold"
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
              <span className="finance-label">Plataforma</span>
              <select
                className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2 text-sm font-semibold"
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
              <span className="finance-label">Etiqueta</span>
              <input
                className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2 text-sm"
                placeholder="Ej. CEDEARs, MEP"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
              <p className="text-[10px] font-semibold leading-snug text-slate-500">
                Usá el ticker o nombre que pusiste en el plan mensual. Ej. MELI, TSLA, BTC.
              </p>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="finance-label">Nota</span>
              <textarea
                rows={2}
                className="finance-input-mobile resize-y rounded-xl px-3 py-2 text-sm"
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
