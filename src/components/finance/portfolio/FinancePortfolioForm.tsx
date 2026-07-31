import { useState } from 'react';
import { sileo } from 'sileo';
import { fetchFinancePrices, formatFinancePrice } from '@/lib/finance/financePrices';
import { normalizeAndValidateHolding } from '@/lib/finance/portfolio/validateHolding';
import type {
  FinancePortfolioCurrency,
  FinancePortfolioHolding,
  FinanceSymbolSearchResult,
  TickerQuoteStatus,
} from '@/lib/finance/portfolio/types';
import { FinanceSymbolCombobox } from '@/components/finance/portfolio/FinanceSymbolCombobox';

type Props = {
  initial?: FinancePortfolioHolding | null;
  onSave: (holding: FinancePortfolioHolding) => void;
  onCancel: () => void;
};

function quoteStatusLabel(status: TickerQuoteStatus): string {
  switch (status) {
    case 'available':
      return 'Cotización disponible';
    case 'delayed':
      return 'Cotización demorada';
    case 'unavailable':
      return 'Símbolo sin cotización';
    default:
      return 'Error temporal';
  }
}

export function FinancePortfolioForm({ initial, onSave, onCancel }: Props) {
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [displayName, setDisplayName] = useState(initial?.displayName ?? '');
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '');
  const [avgPrice, setAvgPrice] = useState(
    initial ? String(initial.averagePurchasePrice) : '',
  );
  const [currency, setCurrency] = useState<FinancePortfolioCurrency>(
    initial?.currency ?? 'USD',
  );
  const [broker, setBroker] = useState(initial?.broker ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '');
  const [market, setMarket] = useState(initial?.market ?? '');
  const [manualMode, setManualMode] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState<TickerQuoteStatus | null>(null);
  const [quoteDetail, setQuoteDetail] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const validateQuote = async (symbol: string, preferredCurrency?: string) => {
    setChecking(true);
    setQuoteStatus(null);
    setQuoteDetail(null);
    try {
      const result = await fetchFinancePrices([symbol]);
      const row = result.prices[symbol.toUpperCase()];
      if (!result.ok && !row) {
        setQuoteStatus('temporary_error');
        setQuoteDetail('No se pudo consultar el precio ahora.');
        return;
      }
      if (!row || !(row.price > 0) || row.source === 'missing') {
        setQuoteStatus('unavailable');
        setQuoteDetail(row?.error || 'Sin cotización para este símbolo.');
        return;
      }
      setQuoteStatus(row.source === 'fallback' ? 'delayed' : 'available');
      setQuoteDetail(
        `${formatFinancePrice(row.price, row.currency ?? preferredCurrency ?? 'USD')} · ${row.exchange}`,
      );
      if (row.currency === 'ARS' || row.currency === 'USD') {
        setCurrency(row.currency);
      }
      if (row.exchange) setMarket(row.exchange);
    } finally {
      setChecking(false);
    }
  };

  const onPickSymbol = (item: FinanceSymbolSearchResult) => {
    setTicker(item.symbol);
    setDisplayName(item.name);
    setManualMode(false);
    if (item.exchange) setMarket(item.exchange);
    if (item.currency === 'ARS' || item.currency === 'USD') setCurrency(item.currency);
    void validateQuote(item.symbol, item.currency);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) {
      sileo.warning({
        title: 'Falta el ticker',
        description: 'Seleccioná un resultado o usá el modo manual.',
      });
      return;
    }
    if (!manualMode && !initial && quoteStatus === null) {
      sileo.warning({
        title: 'Validá el símbolo',
        description: 'Buscá y seleccioná un activo, o activá ticker manual.',
      });
      return;
    }
    if (quoteStatus === 'unavailable') {
      sileo.warning({
        title: 'Sin cotización',
        description: 'Podés guardar igual, pero las alertas pueden fallar.',
      });
    }

    const result = normalizeAndValidateHolding({
      id: initial?.id,
      createdAt: initial?.createdAt,
      ticker,
      displayName: displayName || undefined,
      quantity: Number(quantity.replace(',', '.')),
      averagePurchasePrice: Number(avgPrice.replace(',', '.')),
      currency,
      broker: broker || undefined,
      purchaseDate: purchaseDate || undefined,
      market: market || undefined,
      source: initial?.source ?? 'manual',
    });

    if (!result.ok) {
      sileo.error({
        title: 'Datos inválidos',
        description: result.errors.map((x) => x.message).join(' '),
      });
      return;
    }

    onSave(result.holding);
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
      {!manualMode ? (
        <FinanceSymbolCombobox onSelect={onPickSymbol} />
      ) : (
        <label className="flex flex-col gap-1">
          <span className="finance-label">Ticker manual</span>
          <input
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm font-bold uppercase"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="Ej. AAPL"
            required
          />
          <p className="text-[10px] font-medium text-amber-700">
            El precio podría no estar disponible si el símbolo no cotiza en nuestras fuentes.
          </p>
        </label>
      )}

      <button
        type="button"
        className="text-[11px] font-bold text-blue-700 underline-offset-2 hover:underline"
        onClick={() => {
          setManualMode((v) => !v);
          setQuoteStatus(null);
        }}
      >
        {manualMode ? 'Volver a buscar activo' : 'Agregar ticker manualmente'}
      </button>

      {ticker ? (
        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold">
          <p className="text-slate-800">
            Seleccionado: <span className="font-bold">{ticker}</span>
            {displayName ? ` · ${displayName}` : ''}
          </p>
          {checking ? (
            <p className="mt-1 text-slate-500">Validando cotización…</p>
          ) : quoteStatus ? (
            <p
              className={`mt-1 ${
                quoteStatus === 'available'
                  ? 'text-emerald-700'
                  : quoteStatus === 'unavailable'
                    ? 'text-amber-700'
                    : 'text-red-700'
              }`}
            >
              {quoteStatusLabel(quoteStatus)}
              {quoteDetail ? ` · ${quoteDetail}` : ''}
            </p>
          ) : manualMode ? (
            <button
              type="button"
              className="mt-1 text-blue-700 underline"
              onClick={() => void validateQuote(ticker)}
            >
              Validar cotización
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="finance-label">Cantidad</span>
          <input
            type="number"
            min={0}
            step="any"
            required
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm font-bold"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="finance-label">Precio promedio</span>
          <input
            type="number"
            min={0}
            step="any"
            required
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm font-bold"
            value={avgPrice}
            onChange={(e) => setAvgPrice(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="finance-label">Moneda</span>
          <select
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm font-bold"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as FinancePortfolioCurrency)}
          >
            <option value="USD">USD</option>
            <option value="ARS">ARS</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="finance-label">Broker (opcional)</span>
          <input
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm"
            value={broker}
            onChange={(e) => setBroker(e.target.value)}
            placeholder="Balanz, IOL…"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-1">
          <span className="finance-label">Fecha (opcional)</span>
          <input
            type="date"
            className="finance-input-mobile min-h-[44px] rounded-xl px-3 text-sm"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="submit" className="finance-primary-button min-h-[44px] flex-1 px-4 text-sm">
          {initial ? 'Guardar cambios' : 'Agregar posición'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="finance-secondary-button min-h-[44px] px-4 text-sm"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
