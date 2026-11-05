import { useEffect, useMemo, useState } from 'react';
import { Bitcoin, RefreshCcw, Settings2 } from 'lucide-react';
import { formatARS } from '@/lib/finance/calculations';
import { fetchFinancePrices, type FinancePrice } from '@/lib/finance/financePrices';
import {
  allocateBitcoinPurchase,
  bitcoinTargetPercents,
  estimatePurchaseQuantities,
  normalizeBitcoinModule,
  valueBitcoinLegs,
  type FinanceBitcoinModule,
} from '@/lib/finance/bitcoin';
import type { FinanceEntry } from '@/lib/finance/types';
import type { FinancePortfolioHolding } from '@/lib/finance/portfolio/types';

type Props = {
  entries: FinanceEntry[];
  holdings: FinancePortfolioHolding[];
  bitcoin: FinanceBitcoinModule | undefined;
  onChange: (next: FinanceBitcoinModule) => void;
};

function parseArsInput(raw: string): number {
  const cleaned = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

function formatPct(n: number): string {
  return `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;
}

function DistributionBar({
  ibitPct,
  btcPct,
  label,
}: {
  ibitPct: number;
  btcPct: number;
  label: string;
}) {
  const ibit = Math.min(100, Math.max(0, ibitPct));
  const btc = Math.min(100 - ibit, Math.max(0, btcPct));
  return (
    <div>
      <p className="finance-label mb-2">{label}</p>
      <div className="flex h-3.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full bg-blue-600 transition-transform origin-left motion-reduce:transition-none"
          style={{ width: `${ibit}%` }}
          title={`IBIT ${formatPct(ibit)}`}
        />
        <div
          className="h-full bg-amber-500 transition-transform origin-left motion-reduce:transition-none"
          style={{ width: `${btc}%` }}
          title={`BTC ${formatPct(btc)}`}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-blue-600" />
          IBIT {formatPct(ibit)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-amber-500" />
          BTC {formatPct(btc)}
        </span>
      </div>
    </div>
  );
}

export function FinanceBitcoinPanel({ entries, holdings, bitcoin, onChange }: Props) {
  const module = useMemo(() => normalizeBitcoinModule(bitcoin), [bitcoin]);
  const targets = bitcoinTargetPercents(module);

  const [amountRaw, setAmountRaw] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [ibitPrice, setIbitPrice] = useState<FinancePrice | null>(null);
  const [btcPrice, setBtcPrice] = useState<FinancePrice | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);

  const patch = (partial: Partial<FinanceBitcoinModule>) => {
    onChange({
      ...module,
      ...partial,
      updatedAt: new Date().toISOString(),
    });
  };

  const loadPrices = async () => {
    setPricesLoading(true);
    setPricesError(null);
    const result = await fetchFinancePrices(['IBIT', 'BTC']);
    setPricesLoading(false);
    if (!result.ok && result.error) setPricesError(result.error);
    setIbitPrice(result.prices.IBIT ?? null);
    setBtcPrice(result.prices.BTC ?? null);
  };

  useEffect(() => {
    void loadPrices();
  }, []);

  const valuation = useMemo(
    () =>
      valueBitcoinLegs({
        module,
        entries,
        holdings,
        ibitPrice,
        btcPrice,
      }),
    [module, entries, holdings, ibitPrice, btcPrice],
  );

  const nuevaInversion = parseArsInput(amountRaw);
  const allocation = useMemo(
    () =>
      allocateBitcoinPurchase({
        ibitActual: valuation.ibit.valueArs,
        btcActual: valuation.btc.valueArs,
        nuevaInversion,
        porcentajeIBIT: targets.ibit / 100,
      }),
    [valuation.ibit.valueArs, valuation.btc.valueArs, nuevaInversion, targets.ibit],
  );

  const quantities = useMemo(
    () =>
      estimatePurchaseQuantities({
        compraIBIT: allocation.compraIBIT,
        compraBTC: allocation.compraBTC,
        ibitPriceArs:
          valuation.ibit.unitCurrency === 'ARS'
            ? valuation.ibit.unitPrice
            : module.manualIbitPriceArs,
        btcPriceUsd: valuation.btc.unitPrice ?? module.manualBtcPriceUsd ?? btcPrice?.price,
        usdArsRate: module.manualUsdArsRate,
      }),
    [allocation, valuation, module, btcPrice],
  );

  const totalActual = valuation.ibit.valueArs + valuation.btc.valueArs;
  const priceStatus = valuation.usingLivePrices
    ? 'Precios en vivo'
    : valuation.ibit.source === 'manual' || valuation.btc.source === 'manual'
      ? 'Valores manuales'
      : 'Sin cotización completa';

  return (
    <div className="finance-bitcoin-panel flex flex-col gap-4 lg:gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="finance-section-title flex items-center gap-2 text-base sm:text-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Bitcoin size={18} strokeWidth={2.25} aria-hidden />
            </span>
            Bitcoin
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Distribuí nuevas compras entre IBIT y BTC directo · simulación
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadPrices()}
            disabled={pricesLoading}
            className="finance-secondary-button finance-touch-target inline-flex min-h-[40px] items-center gap-1.5 px-3 text-xs"
          >
            <RefreshCcw
              size={14}
              className={pricesLoading ? 'motion-safe:animate-spin' : ''}
              aria-hidden
            />
            Precios
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="finance-secondary-button finance-touch-target inline-flex min-h-[40px] items-center gap-1.5 px-3 text-xs"
            aria-expanded={settingsOpen}
          >
            <Settings2 size={14} aria-hidden />
            Config
          </button>
        </div>
      </div>

      <p className="text-[11px] font-semibold text-slate-500">
        {priceStatus}
        {valuation.pricesFetchedAt
          ? ` · actualizado ${new Date(valuation.pricesFetchedAt).toLocaleString('es-AR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}`
          : ''}
        {pricesError ? ` · ${pricesError}` : ''}
      </p>

      {settingsOpen ? (
        <section className="finance-card-compact space-y-3 p-3.5 sm:p-4">
          <h3 className="text-sm font-bold text-slate-900">Configuración</h3>

          <label className="block">
            <span className="finance-label">Objetivo IBIT ({targets.ibit}%)</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={targets.ibit}
              onChange={(e) => patch({ targetIbitPercent: Number(e.target.value) })}
              className="mt-2 w-full accent-blue-600"
            />
            <p className="mt-1 text-[11px] font-semibold text-slate-500">
              BTC directo queda en {targets.btc}% automáticamente
            </p>
          </label>

          <label className="block">
            <span className="finance-label">BTC en wallet</span>
            <input
              type="text"
              inputMode="decimal"
              className="finance-input-mobile mt-1 w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
              placeholder="0.00425000"
              value={module.btcQuantity > 0 ? String(module.btcQuantity) : ''}
              onChange={(e) => {
                const n = Number(e.target.value.replace(',', '.'));
                patch({ btcQuantity: Number.isFinite(n) && n >= 0 ? n : 0 });
              }}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="finance-label">USD → ARS (manual)</span>
              <input
                type="text"
                inputMode="decimal"
                className="finance-input-mobile mt-1 w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
                placeholder="Ej. 1450"
                value={module.manualUsdArsRate ?? ''}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(',', '.'));
                  patch({
                    manualUsdArsRate: Number.isFinite(n) && n > 0 ? n : undefined,
                  });
                }}
              />
            </label>
            <label className="block">
              <span className="finance-label">Valor IBIT manual (ARS)</span>
              <input
                type="text"
                inputMode="numeric"
                className="finance-input-mobile mt-1 w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
                placeholder="Si no hay posición fiable"
                value={module.manualIbitValueArs ?? ''}
                onChange={(e) => {
                  const n = parseArsInput(e.target.value);
                  patch({ manualIbitValueArs: n > 0 ? n : undefined });
                }}
              />
            </label>
            <label className="block">
              <span className="finance-label">Valor BTC manual (ARS)</span>
              <input
                type="text"
                inputMode="numeric"
                className="finance-input-mobile mt-1 w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
                value={module.manualBtcValueArs ?? ''}
                onChange={(e) => {
                  const n = parseArsInput(e.target.value);
                  patch({ manualBtcValueArs: n > 0 ? n : undefined });
                }}
              />
            </label>
            <label className="block">
              <span className="finance-label">Precio IBIT manual (ARS)</span>
              <input
                type="text"
                inputMode="decimal"
                className="finance-input-mobile mt-1 w-full rounded-xl px-3 py-2.5 text-sm font-semibold"
                value={module.manualIbitPriceArs ?? ''}
                onChange={(e) => {
                  const n = Number(e.target.value.replace(',', '.'));
                  patch({
                    manualIbitPriceArs: Number.isFinite(n) && n > 0 ? n : undefined,
                  });
                }}
              />
            </label>
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="finance-card finance-bitcoin-card space-y-4 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-900">Distribución actual</h3>
          <DistributionBar
            label={`Objetivo ${targets.ibit}/${targets.btc}`}
            ibitPct={targets.ibit}
            btcPct={targets.btc}
          />
          <DistributionBar
            label="Actual"
            ibitPct={allocation.pctIbitActual}
            btcPct={allocation.pctBtcActual}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <article className="rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
              <p className="finance-label text-blue-700">IBIT</p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-900">
                {formatARS(valuation.ibit.valueArs)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-blue-800/80">
                {formatPct(allocation.pctIbitActual)} · {valuation.ibit.detail}
              </p>
            </article>
            <article className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3">
              <p className="finance-label text-amber-800">BTC directo</p>
              <p className="mt-1 text-lg font-black tabular-nums text-slate-900">
                {formatARS(valuation.btc.valueArs)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-amber-900/80">
                {formatPct(allocation.pctBtcActual)} · {valuation.btc.detail}
              </p>
            </article>
          </div>

          {totalActual > 0 ? (
            <p className="text-xs font-semibold text-slate-500">
              Total Bitcoin {formatARS(totalActual)}
            </p>
          ) : null}

          {valuation.notes.map((n) => (
            <p key={n} className="text-[11px] font-semibold text-amber-800">
              {n}
            </p>
          ))}
        </section>

        <section className="finance-card space-y-4 p-4 sm:p-5">
          <label className="block">
            <span className="text-sm font-bold text-slate-900">¿Cuánto vas a invertir hoy?</span>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                $
              </span>
              <input
                type="text"
                inputMode="numeric"
                className="finance-input-mobile w-full rounded-2xl border border-slate-200 py-3.5 pl-8 pr-3 text-xl font-black tabular-nums tracking-tight text-slate-900 shadow-sm"
                placeholder="50.000"
                value={amountRaw}
                onChange={(e) => setAmountRaw(e.target.value)}
                aria-describedby="btc-calc-hint"
              />
            </div>
            <p id="btc-calc-hint" className="mt-1.5 text-[11px] font-medium text-slate-500">
              Simulación en pesos. No registra compras ni mueve la cartera.
            </p>
          </label>

          {nuevaInversion > 0 ? (
            <div className="finance-bitcoin-recs space-y-2.5">
              <article className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">
                  Comprá IBIT
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-slate-900">
                  {formatARS(allocation.compraIBIT)}
                </p>
                {quantities.ibitUnits != null ? (
                  <p className="mt-1 text-[11px] font-semibold text-blue-800">
                    ≈ {quantities.ibitUnits} nominales
                    {quantities.ibitRemainder && quantities.ibitRemainder > 0
                      ? ` · remanente ${formatARS(quantities.ibitRemainder)}`
                      : ''}
                  </p>
                ) : null}
              </article>
              <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
                  Comprá BTC
                </p>
                <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-slate-900">
                  {formatARS(allocation.compraBTC)}
                </p>
                {quantities.btcAmount != null ? (
                  <p className="mt-1 text-[11px] font-semibold text-amber-900">
                    ≈ {quantities.btcAmount.toFixed(8)} BTC
                  </p>
                ) : null}
              </article>
              <p className="text-sm font-semibold leading-snug text-slate-700">
                {allocation.explanation}
              </p>
            </div>
          ) : (
            <p className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500">
              Escribí un importe para ver la recomendación al instante.
            </p>
          )}
        </section>
      </div>

      {nuevaInversion > 0 ? (
        <section className="finance-card space-y-4 p-4 sm:p-5">
          <h3 className="text-sm font-bold text-slate-900">Después de comprar (simulación)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <DistributionBar
              label="Actual"
              ibitPct={allocation.pctIbitActual}
              btcPct={allocation.pctBtcActual}
            />
            <DistributionBar
              label="Proyectada"
              ibitPct={allocation.pctIbitProyectado}
              btcPct={allocation.pctBtcProyectado}
            />
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold text-slate-600">
            <p>
              IBIT {formatARS(allocation.ibitFuturo)} · {formatPct(allocation.pctIbitProyectado)}
            </p>
            <p>
              BTC {formatARS(allocation.btcFuturo)} · {formatPct(allocation.pctBtcProyectado)}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
