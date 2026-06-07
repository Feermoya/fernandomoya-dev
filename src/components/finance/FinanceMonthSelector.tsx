import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  addMonthsToKey,
  buildMonthKey,
  formatMonthLongEs,
  getCurrentMonthKey,
  isCurrentMonthKey,
  isValidMonthKey,
  MONTH_LABELS_SHORT_ES,
  parseMonthKey,
} from '@/lib/finance/monthNavigation';

type Props = {
  value: string;
  onChange: (month: string) => void;
};

const navBtnClass =
  'finance-touch-target inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

export function FinanceMonthSelector({ value, onChange }: Props) {
  const popoverId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const safeValue = isValidMonthKey(value) ? value : getCurrentMonthKey();
  const atCurrent = isCurrentMonthKey(safeValue);
  const { year: selectedYear, month: selectedMonth } = parseMonthKey(safeValue);

  const [viewYear, setViewYear] = useState(selectedYear);

  useEffect(() => {
    if (open) setViewYear(selectedYear);
  }, [open, selectedYear]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const goPrev = () => onChange(addMonthsToKey(safeValue, -1));
  const goNext = () => onChange(addMonthsToKey(safeValue, 1));
  const goToday = () => {
    onChange(getCurrentMonthKey());
    close();
  };

  const pickMonth = (month: number) => {
    onChange(buildMonthKey(viewYear, month));
    close();
  };

  const now = getCurrentMonthKey();
  const { year: todayYear, month: todayMonth } = parseMonthKey(now);

  return (
    <div ref={rootRef} className="relative flex w-full flex-wrap items-center gap-1.5 sm:gap-2">
      <button type="button" className={navBtnClass} onClick={goPrev} aria-label="Mes anterior">
        <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="finance-touch-target flex min-h-[40px] min-w-[8.5rem] flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 sm:min-w-[10rem] sm:flex-none sm:text-base"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popoverId}
      >
        <CalendarDays size={16} strokeWidth={2} className="shrink-0 text-blue-600" aria-hidden />
        <span className="capitalize">{formatMonthLongEs(safeValue)}</span>
      </button>

      <button type="button" className={navBtnClass} onClick={goNext} aria-label="Mes siguiente">
        <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
      </button>

      {!atCurrent ? (
        <button
          type="button"
          onClick={goToday}
          className="finance-touch-target shrink-0 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Hoy
        </button>
      ) : null}

      {open ? (
        <div
          id={popoverId}
          role="dialog"
          aria-modal="false"
          aria-label="Elegir mes"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(100vw-2rem,17.5rem)] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:right-auto sm:left-1/2 sm:-translate-x-1/2"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="Año anterior"
            >
              <ChevronLeft size={16} strokeWidth={2.25} aria-hidden />
            </button>
            <span className="text-sm font-black tabular-nums text-slate-900">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label="Año siguiente"
            >
              <ChevronRight size={16} strokeWidth={2.25} aria-hidden />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_LABELS_SHORT_ES.map((label, idx) => {
              const monthNum = idx + 1;
              const isSelected = viewYear === selectedYear && monthNum === selectedMonth;
              const isToday = viewYear === todayYear && monthNum === todayMonth;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => pickMonth(monthNum)}
                  className={`finance-touch-target min-h-[40px] rounded-xl border text-xs font-bold capitalize transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                      : isToday
                        ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-slate-50'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${label} ${viewYear}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            <button
              type="button"
              onClick={close}
              className="min-h-[36px] rounded-lg px-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            >
              Cerrar
            </button>
            {!atCurrent ? (
              <button
                type="button"
                onClick={goToday}
                className="min-h-[36px] rounded-lg bg-blue-50 px-3 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
              >
                Este mes
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
