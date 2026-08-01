import { useEffect, useMemo, useState } from 'react';
import { Banknote, Hash } from 'lucide-react';
import { sileo } from 'sileo';
import { formatEntryAmount } from '@/lib/finance/calculations';
import {
  amountFromUnits,
  buildInvestmentEntry,
  fetchTickerPriceForEntry,
  formatUnits,
  parsePositiveNumber,
  QUICK_AMOUNT_OPTIONS_USD,
  QUICK_UNIT_OPTIONS,
  type EntryAmountCurrency,
  type EntryInputMode,
} from '@/lib/finance/entry';
import { formatFinancePrice, type FinancePrice } from '@/lib/finance/financePrices';
import { normalizePlanLabel } from '@/lib/finance/monthlyInvestmentPlan';
import { DEFAULT_QUICK_AMOUNTS } from '@/lib/finance/preferences';
import type { FinanceAsset, FinanceEntry } from '@/lib/finance/types';
import { FinanceStreakCallout } from '@/components/finance/FinanceStreakCallout';
import { FinanceEntryModeToggle } from '@/components/finance/entry/FinanceEntryModeToggle';
import {
  applyPendingPlanLabel,
  PLATFORM_OPTIONS,
  type EntryPlatform,
} from '@/components/finance/entry/applyPendingPlanLabel';

type Props = {
  month: string;
  entries: FinanceEntry[];
  quickAmounts?: number[];
  pendingPlanLabels?: string[];
  onAddEntry: (entry: FinanceEntry) => void;
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

const MAX_PENDING_CHIPS = 8;

export function FinanceEntryForm({
  month,
  entries,
  quickAmounts,
  pendingPlanLabels,
  onAddEntry,
  onEntrySaved,
}: Props) {
  const quickListArs = quickAmounts?.length ? quickAmounts : [...DEFAULT_QUICK_AMOUNTS];
  const [formMonth, setFormMonth] = useState(month);
  const [mode, setMode] = useState<EntryInputMode>('amount');
  const [amountCurrency, setAmountCurrency] = useState<EntryAmountCurrency>('ARS');
  const [amount, setAmount] = useState('');
  const [units, setUnits] = useState('');
  const [asset, setAsset] = useState<FinanceAsset | ''>('');
  const [platform, setPlatform] = useState<EntryPlatform>('Balanz');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false);
  const [livePrice, setLivePrice] = useState<FinancePrice | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  useEffect(() => {
    setFormMonth(month);
  }, [month]);

  const tickerHint = useMemo(() => {
    const raw = category.trim().toUpperCase();
    if (!raw) return '';
    return normalizePlanLabel(raw).split(' ')[0] ?? raw;
  }, [category]);

  useEffect(() => {
    if (mode !== 'units' || !tickerHint) {
      setLivePrice(null);
      setPriceError(null);
      return;
    }

    let cancelled = false;
    const t = window.setTimeout(() => {
      setPriceLoading(true);
      setPriceError(null);
      void fetchTickerPriceForEntry(tickerHint).then((row) => {
        if (cancelled) return;
        setPriceLoading(false);
        if (!row) {
          setLivePrice(null);
          setPriceError(`Sin precio para ${tickerHint}`);
          return;
        }
        setLivePrice(row);
      });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [mode, tickerHint]);

  const lastSameMonth = entries
    .filter(
      (e) =>
        e.type === 'investment' &&
        e.month === formMonth &&
        (e.amountCurrency === 'USD' ? 'USD' : 'ARS') === amountCurrency,
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  const pendingLabels = pendingPlanLabels?.filter(Boolean) ?? [];
  const visiblePending = pendingLabels.slice(0, MAX_PENDING_CHIPS);
  const hiddenPendingCount = Math.max(0, pendingLabels.length - MAX_PENDING_CHIPS);

  const unitsNum = parsePositiveNumber(units);
  const priceCurrency = (livePrice?.currency ?? 'ARS').toUpperCase() === 'USD' ? 'USD' : 'ARS';
  const previewAmount =
    mode === 'units' && unitsNum && livePrice && livePrice.price > 0
      ? amountFromUnits(unitsNum, livePrice.price, priceCurrency)
      : null;

  const addQuickAmount = (n: number) => {
    const cur = Number(amount.replace(',', '.'));
    const base = Number.isFinite(cur) && cur > 0 ? cur : 0;
    setAmount(String(base + n));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await buildInvestmentEntry({
        mode,
        amountRaw: amount,
        unitsRaw: units,
        amountCurrency,
        month: formMonth,
        asset,
        platform,
        category,
        note,
        cachedPrice: livePrice,
      });

      if (!result.ok) {
        sileo.error({ title: 'No se pudo cargar', description: result.error });
        return;
      }

      onAddEntry(result.entry);
      onEntrySaved?.(result.entry);
      setAmount('');
      setUnits('');
      setNote('');
      if (result.price) setLivePrice(result.price);
    } finally {
      setSubmitting(false);
    }
  };

  const quickList = amountCurrency === 'USD' ? [...QUICK_AMOUNT_OPTIONS_USD] : quickListArs;

  return (
    <form
      onSubmit={submit}
      className="finance-card-compact relative scroll-mt-24 overflow-hidden p-3 transition sm:p-3.5"
    >
      <div className="relative z-[1]">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-blue-600">
              {mode === 'units' ? (
                <Hash size={18} strokeWidth={2.25} aria-hidden />
              ) : (
                <Banknote size={18} strokeWidth={2.25} aria-hidden />
              )}
            </span>
            <div>
              <h3 className="finance-section-title">Inversión</h3>
              <p className="finance-section-sub mt-0.5">Registrar un movimiento</p>
            </div>
          </div>
          <FinanceEntryModeToggle value={mode} onChange={setMode} disabled={submitting} />
        </div>

        {mode === 'amount' ? (
          <>
            <div
              className="mt-3 inline-flex rounded-xl border border-slate-200 bg-slate-50 p-0.5"
              role="group"
              aria-label="Moneda del monto"
            >
              {(['ARS', 'USD'] as const).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setAmountCurrency(cur);
                    setAmount('');
                  }}
                  className={`min-h-[36px] rounded-[10px] px-3 text-xs font-black transition ${
                    amountCurrency === cur
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                  aria-pressed={amountCurrency === cur}
                >
                  {cur === 'ARS' ? 'Pesos' : 'Dólares'}
                </button>
              ))}
            </div>

            <label className="mt-2 flex flex-col gap-1">
              <span className="finance-label">
                Monto a invertir ({amountCurrency === 'ARS' ? 'ARS' : 'USD'})
              </span>
              <input
                type="number"
                inputMode="decimal"
                min={amountCurrency === 'USD' ? 0.01 : 1}
                step={amountCurrency === 'USD' ? '0.01' : 1}
                required
                placeholder={amountCurrency === 'USD' ? 'US$ 0' : '$ 0'}
                className="finance-input-mobile finance-metric min-h-[52px] rounded-xl px-3 py-2.5 text-center sm:text-[1.75rem]"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>

            <div className="mt-2 flex flex-wrap gap-2">
              {quickList.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => addQuickAmount(n)}
                  className="finance-secondary-button min-h-[40px] px-3 text-xs font-black tabular-nums active:scale-[0.98]"
                >
                  {amountCurrency === 'USD'
                    ? `+${n}`
                    : n >= 1_000_000
                      ? `+${(n / 1_000_000).toFixed(1)}M`
                      : `+${Math.round(n / 1000)}k`}
                </button>
              ))}
              {lastSameMonth ? (
                <button
                  type="button"
                  onClick={() => setAmount(String(lastSameMonth.amount))}
                  className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-100 active:scale-[0.98]"
                >
                  Repetir {formatEntryAmount(lastSameMonth.amount, amountCurrency)}
                </button>
              ) : null}
            </div>
            {amountCurrency === 'USD' ? (
              <p className="mt-1.5 text-[10px] font-medium text-slate-500">
                Los dólares no suman al objetivo mensual en pesos; se llevan aparte.
              </p>
            ) : null}
          </>
        ) : (
          <>
            <label className="mt-3 flex flex-col gap-1.5">
              <span className="finance-label">Ticker / etiqueta</span>
              <input
                className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2 text-sm font-semibold uppercase"
                placeholder="Ej. MELI, TSLA, GGAL"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
              <p className="text-[10px] font-medium leading-snug text-slate-500">
                El monto se calcula en la moneda del precio (ARS o USD).
              </p>
            </label>

            <label className="mt-2.5 flex flex-col gap-1">
              <span className="finance-label">Nominales</span>
              <input
                type="number"
                inputMode="decimal"
                min={0.001}
                step="any"
                required
                placeholder="0"
                className="finance-input-mobile finance-metric min-h-[52px] rounded-xl px-3 py-2.5 text-center sm:text-[1.75rem]"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
              />
            </label>

            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_UNIT_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setUnits(String(n))}
                  className="finance-secondary-button min-h-[40px] px-3 text-xs font-black tabular-nums active:scale-[0.98]"
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="mt-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5">
              {priceLoading ? (
                <p className="text-xs font-semibold text-slate-500">Consultando precio…</p>
              ) : livePrice && livePrice.price > 0 ? (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700">
                    {tickerHint} · {formatFinancePrice(livePrice.price, livePrice.currency ?? 'ARS')}
                    {livePrice.changePercent != null ? (
                      <span
                        className={`ml-1.5 tabular-nums ${
                          livePrice.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {livePrice.changePercent >= 0 ? '+' : ''}
                        {livePrice.changePercent.toFixed(1)}% hoy
                      </span>
                    ) : null}
                  </p>
                  {previewAmount != null ? (
                    <p className="text-sm font-bold tabular-nums text-slate-900">
                      {formatUnits(unitsNum ?? 0)} × precio ≈{' '}
                      {formatEntryAmount(previewAmount, priceCurrency)}
                    </p>
                  ) : (
                    <p className="text-[11px] font-medium text-slate-500">
                      Indicá nominales para ver el monto.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs font-semibold text-amber-700">
                  {priceError ?? 'Escribí un ticker para obtener el precio.'}
                </p>
              )}
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="finance-primary-button mt-3 flex w-full items-center justify-center px-4 py-3 text-sm disabled:opacity-60 sm:min-h-[48px]"
        >
          {submitting
            ? 'Cargando…'
            : mode === 'units'
              ? 'Cargar por nominales'
              : amountCurrency === 'USD'
                ? 'Cargar inversión en USD'
                : 'Cargar inversión'}
        </button>

        {visiblePending.length > 0 ? (
          <div className="mt-2.5">
            <p className="finance-label">Pendientes del plan</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {visiblePending.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    applyPendingPlanLabel(label, asset, setAsset, setCategory, setPlatform);
                    setMode('units');
                    if (!units) setUnits('1');
                  }}
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
                onChange={(e) => setPlatform(e.target.value as EntryPlatform)}
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            {mode === 'amount' ? (
              <label className="flex flex-col gap-1.5">
                <span className="finance-label">Etiqueta</span>
                <input
                  className="finance-input-mobile min-h-[44px] rounded-xl px-3 py-2 text-sm"
                  placeholder="Ej. CEDEARs, MEP"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <p className="text-[10px] font-semibold leading-snug text-slate-500">
                  Usá el ticker del plan mensual. Ej. MELI, TSLA, BTC.
                </p>
              </label>
            ) : null}
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
