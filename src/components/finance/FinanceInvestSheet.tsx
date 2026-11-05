import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { FinanceEntry } from '@/lib/finance/types';
import { FinanceEntryForm } from '@/components/finance/FinanceEntryForm';

type Props = {
  open: boolean;
  month: string;
  entries: FinanceEntry[];
  quickAmounts?: number[];
  pendingPlanLabels?: string[];
  onAddEntry: (entry: FinanceEntry) => void;
  onClose: () => void;
};

export function FinanceInvestSheet({
  open,
  month,
  entries,
  quickAmounts,
  pendingPlanLabels,
  onAddEntry,
  onClose,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [dirty, setDirty] = useState(false);

  const requestClose = useCallback(() => {
    if (dirty) {
      const ok = window.confirm('Hay datos sin guardar. ¿Cerrar de todos modos?');
      if (!ok) return;
    }
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    if (!open) {
      setDirty(false);
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, requestClose]);

  if (!open) return null;

  return (
    <div
      className="finance-invest-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="finance-invest-overlay__backdrop"
        aria-label="Cerrar"
        onClick={requestClose}
      />
      <div className="finance-invest-overlay__panel">
        <div className="finance-invest-overlay__handle" aria-hidden />
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="finance-section-title">
              Cargar inversión
            </h2>
            <p className="mt-1 text-[14px] font-medium text-[var(--text-muted)]">
              Registrá el movimiento y el tablero se actualiza al instante.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="finance-touch-target inline-flex items-center justify-center rounded-full border border-[var(--border-card)] bg-[var(--bg-segment)] text-[var(--text-secondary)]"
            onClick={requestClose}
            aria-label="Cerrar"
          >
            <X size={20} strokeWidth={1.75} />
          </button>
        </div>

        <FinanceEntryForm
          month={month}
          entries={entries}
          quickAmounts={quickAmounts}
          pendingPlanLabels={pendingPlanLabels}
          variant="plain"
          onDirtyChange={setDirty}
          onAddEntry={onAddEntry}
          onEntrySaved={() => onClose()}
        />
      </div>
    </div>
  );
}
