import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { FOCO_ICON_STROKE } from '@/components/finance/ui';

type Props = {
  value: string;
  onChange: (month: string) => void;
};

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
    <div ref={rootRef} className="foco-month relative flex w-full items-center gap-2">
      <button type="button" className="foco-month__nav" onClick={goPrev} aria-label="Mes anterior">
        <ChevronLeft size={20} strokeWidth={FOCO_ICON_STROKE} aria-hidden />
      </button>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="foco-month__label"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={popoverId}
      >
        <span className="capitalize">{formatMonthLongEs(safeValue)}</span>
      </button>

      <button type="button" className="foco-month__nav" onClick={goNext} aria-label="Mes siguiente">
        <ChevronRight size={20} strokeWidth={FOCO_ICON_STROKE} aria-hidden />
      </button>

      {!atCurrent ? (
        <button type="button" onClick={goToday} className="foco-chip foco-chip--primary shrink-0">
          Hoy
        </button>
      ) : null}

      {open ? (
        <div
          id={popoverId}
          role="dialog"
          aria-modal="false"
          aria-label="Elegir mes"
          className="foco-month__popover"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setViewYear((y) => y - 1)}
              className="foco-month__nav"
              aria-label="Año anterior"
            >
              <ChevronLeft size={16} strokeWidth={FOCO_ICON_STROKE} aria-hidden />
            </button>
            <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => y + 1)}
              className="foco-month__nav"
              aria-label="Año siguiente"
            >
              <ChevronRight size={16} strokeWidth={FOCO_ICON_STROKE} aria-hidden />
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
                  className={`foco-month__pick ${isSelected ? 'is-selected' : ''} ${
                    isToday && !isSelected ? 'is-today' : ''
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${label} ${viewYear}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
