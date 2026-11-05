import { useEffect, useId, useRef } from 'react';
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="finance-invest-sheet lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="finance-invest-sheet__panel">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="finance-label">Nueva operación</p>
            <h2 id={titleId} className="finance-section-title mt-0.5">
              Cargar inversión
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="finance-touch-target inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X size={18} strokeWidth={2.25} />
          </button>
        </div>

        <FinanceEntryForm
          month={month}
          entries={entries}
          quickAmounts={quickAmounts}
          pendingPlanLabels={pendingPlanLabels}
          onAddEntry={onAddEntry}
          onEntrySaved={() => onClose()}
        />
      </div>
    </div>
  );
}
