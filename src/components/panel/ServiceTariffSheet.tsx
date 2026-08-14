import { useEffect, useId, useState, type FormEvent } from 'react';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/panel/ui/button';
import { PanelPortal } from '@/components/panel/PanelPortal';
import { formatCurrencyAmount } from '@/components/panel/CurrencyAmount';
import type { Currency } from '@/lib/panel/types';

type Props = {
  serviceId: string;
  serviceName: string;
  currentAmount: number;
  currency: Currency;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

/** Sheet corto: solo cambia la tarifa contractual (no toca charges históricos). */
export function ServiceTariffSheet({
  serviceId,
  serviceName,
  currentAmount,
  currency,
  open: openProp,
  onOpenChange,
  hideTrigger = false,
}: Props) {
  const titleId = useId();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = openProp ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) setUncontrolledOpen(next);
  };
  const [amount, setAmount] = useState(String(currentAmount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount(String(currentAmount));
    setError(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, currentAmount]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/panel/api/services/update-tariff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: serviceId, referenceAmount: amount }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo actualizar la tarifa.');
        return;
      }
      window.location.reload();
    } catch {
      setError('Error de red.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {hideTrigger ? null : (
        <button type="button" className="panel-mini-btn" onClick={() => setOpen(true)}>
          <Pencil size={13} strokeWidth={2.25} aria-hidden />
          Editar tarifa
        </button>
      )}

      {open ? (
        <PanelPortal>
        <div className="panel-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button type="button" className="panel-sheet__backdrop" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div className="panel-sheet__panel">
            <div className="panel-sheet__handle" aria-hidden />
            <header className="panel-sheet__header">
              <div className="min-w-0">
                <p className="panel-sheet__eyebrow">{serviceName}</p>
                <h2 id={titleId} className="panel-sheet__title">
                  Editar tarifa
                </h2>
                <p className="panel-sheet__meta">
                  Actual: {formatCurrencyAmount(currentAmount, currency)}. Los cobros ya
                  generados no cambian.
                </p>
              </div>
              <button type="button" className="panel-sheet__close" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X size={18} strokeWidth={2.25} />
              </button>
            </header>

            <form className="panel-sheet__form" onSubmit={onSubmit}>
              <label className="panel-field">
                <span className="panel-field__label">Nueva tarifa ({currency})</span>
                <input
                  className="panel-input"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                  required
                  autoFocus
                />
              </label>
              {error ? <div className="panel-alert" role="alert">{error}</div> : null}
              <div className="panel-sheet__actions">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" loading={submitting}>
                  {submitting ? 'Guardando…' : 'Guardar tarifa'}
                </Button>
              </div>
            </form>
          </div>
        </div>
        </PanelPortal>
      ) : null}
    </>
  );
}
