import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { FinanceSymbolSearchResult } from '@/lib/finance/portfolio/types';
import { searchFinanceSymbolsClient } from '@/lib/finance/portfolio/symbolSearchClient';

type Props = {
  onSelect: (result: FinanceSymbolSearchResult) => void;
  disabled?: boolean;
  placeholder?: string;
};

export function FinanceSymbolCombobox({
  onSelect,
  disabled,
  placeholder = 'Buscar empresa o ticker…',
}: Props) {
  const listId = useId();
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<FinanceSymbolSearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const t = window.setTimeout(() => {
      void searchFinanceSymbolsClient(query, { signal: controller.signal }).then((res) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        if (res.error === 'aborted') return;
        if (!res.ok) {
          setError(res.error || 'Error de búsqueda');
          setResults([]);
          return;
        }
        setResults(res.results);
        setActiveIndex(0);
        setOpen(true);
      });
    }, 300);

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const pick = (item: FinanceSymbolSearchResult) => {
    onSelect(item);
    setQuery(item.symbol);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && results.length > 0) {
      setOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter' && open && results[activeIndex]) {
      e.preventDefault();
      pick(results[activeIndex]);
    }
  };

  return (
    <div className="relative min-w-0">
      <label htmlFor={inputId} className="finance-label">
        Buscar activo
      </label>
      <div className="relative mt-1">
        <Search
          size={14}
          strokeWidth={2.25}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && results[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined
          }
          disabled={disabled}
          className="finance-input-mobile min-h-[44px] w-full rounded-xl py-2 pl-9 pr-9 text-sm font-semibold"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoComplete="off"
        />
        {loading ? (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-400"
            aria-hidden
          />
        ) : null}
      </div>

      {open && query.trim().length >= 2 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto overflow-x-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {loading && results.length === 0 ? (
            <li className="px-3 py-2 text-xs font-semibold text-slate-500">Buscando…</li>
          ) : null}
          {!loading && error ? (
            <li className="px-3 py-2 text-xs font-semibold text-amber-700">
              {error}. Podés agregar el ticker manualmente.
            </li>
          ) : null}
          {!loading && !error && results.length === 0 ? (
            <li className="px-3 py-2 text-xs font-semibold text-slate-500">Sin resultados</li>
          ) : null}
          {results.map((item, idx) => (
            <li
              key={item.symbol}
              id={`${listId}-opt-${idx}`}
              role="option"
              aria-selected={idx === activeIndex}
              className={`cursor-pointer px-3 py-2 ${
                idx === activeIndex ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(item);
              }}
            >
              <p className="truncate text-sm font-bold text-slate-900">{item.name}</p>
              <p className="truncate text-[11px] font-semibold text-slate-500">
                {item.symbol}
                {item.exchange ? ` · ${item.exchange}` : ''}
                {item.type ? ` · ${item.type}` : ''}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
