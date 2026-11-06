import { useEffect, useState } from 'react';
import { Check, Coins, Search } from 'lucide-react';
import { fetchBinanceCryptoSearch, type CryptoSearchResult } from '@/lib/finance/financePrices';

const FAVORITES: CryptoSearchResult[] = [
  { symbol: 'BTC', name: 'Bitcoin' }, { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'BNB', name: 'BNB' }, { symbol: 'SOL', name: 'Solana' },
];

type Props = { selected: string; onSelect: (symbol: string) => void; disabled?: boolean };

/** Buscador de mercados Spot de Binance. No requiere credenciales. */
export function FinanceCryptoPicker({ selected, onSelect, disabled }: Props) {
  const [query, setQuery] = useState('');
  const [coins, setCoins] = useState<CryptoSearchResult[]>(FAVORITES);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetchBinanceCryptoSearch(query).then((rows) => {
        if (!active) return;
        setCoins(rows.length ? rows : query ? [] : FAVORITES);
        setLoading(false);
      });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);

  const manual = query.trim().toUpperCase();
  const manualAllowed = /^[A-Z0-9]{2,20}$/.test(manual) &&
    !coins.some((coin) => coin.symbol === manual);

  return (
    <section className="mt-3 rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-white p-3">
      <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <Coins size={18} className="text-amber-600" aria-hidden />
        Criptomoneda
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">Binance Spot</span>
      </div>
      <label className="relative mt-2 block">
        <span className="sr-only">Buscar criptomoneda</span>
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        <input type="search" autoComplete="off" value={query} disabled={disabled}
          onChange={(e) => setQuery(e.target.value)} placeholder="Bitcoin, Ethereum, ETH…"
          className="finance-input-mobile min-h-[44px] w-full rounded-xl py-2 pl-10 pr-3 text-sm font-semibold" />
      </label>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3" role="group" aria-label="Seleccionar criptomoneda">
        {coins.map((coin) => (
          <button key={coin.symbol} type="button" disabled={disabled}
            onClick={() => { onSelect(coin.symbol); setQuery(''); }}
            aria-pressed={selected === coin.symbol}
            className={`flex min-h-[48px] items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.98] motion-reduce:transform-none ${
              selected === coin.symbol
                ? 'border-amber-400 bg-amber-100/80 text-amber-950 shadow-sm'
                : 'border-slate-200/80 bg-white text-slate-800 hover:border-amber-200 hover:bg-amber-50'
            }`}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-black">{coin.symbol}</span>
              <span className="truncate text-[10px] font-medium text-slate-500">{coin.name}</span>
            </span>
            {selected === coin.symbol ? <Check size={15} className="shrink-0 text-amber-700" aria-hidden /> : null}
          </button>
        ))}
      </div>
      {loading ? <p className="mt-2 text-[11px] text-slate-500" role="status">Buscando en Binance…</p> : null}
      {!loading && query && !coins.length ? (
        <p className="mt-2 text-[11px] text-slate-600">No encontramos coincidencias. Revisá el símbolo.</p>
      ) : null}
      {manualAllowed ? (
        <button type="button" disabled={disabled}
          onClick={() => { onSelect(manual); setQuery(''); }}
          className="mt-2 min-h-[38px] w-full rounded-xl border border-dashed border-amber-300 bg-white text-xs font-bold text-amber-900">
          Usar {manual} (cotización sujeta a disponibilidad)
        </button>
      ) : null}
      {selected ? <p className="mt-2 text-[11px] font-semibold text-amber-900">Seleccionada: {selected} · Independiente de IBIT.</p> : null}
    </section>
  );
}
