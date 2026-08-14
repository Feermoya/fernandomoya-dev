import { useEffect, useId, useState, type FormEvent } from 'react';
import { Briefcase, X } from 'lucide-react';
import { Button } from '@/components/panel/ui/button';
import { PanelPortal } from '@/components/panel/PanelPortal';
import { todayIsoDate } from '@/lib/panel/view-types';

type Props = {
  clientId: string;
};

/** Crea un servicio one_time + charge como “trabajo puntual”. */
export function AddWorkLauncher({ clientId }: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'ARS'>('ARS');
  const [dueDate, setDueDate] = useState(todayIsoDate());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function reset() {
    setName('');
    setAmount('');
    setCurrency('ARS');
    setDueDate(todayIsoDate());
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/panel/api/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          clientId,
          name,
          billingType: 'one_time',
          referenceAmount: amount,
          referenceCurrency: currency,
          startDate: dueDate,
          dueDate,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo crear el trabajo.');
        return;
      }
      window.location.href = `/panel/clientes/${clientId}?ok=trabajo`;
    } catch {
      setError('Error de red.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="panel-action-btn panel-action-btn--ghost"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Briefcase size={15} strokeWidth={2.25} aria-hidden />
        Agregar trabajo
      </button>

      {open ? (
        <PanelPortal>
          <div className="panel-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <button
              type="button"
              className="panel-sheet__backdrop"
              aria-label="Cerrar"
              onClick={() => setOpen(false)}
            />
            <div className="panel-sheet__panel">
              <div className="panel-sheet__handle" aria-hidden />
              <header className="panel-sheet__header">
                <div className="min-w-0">
                  <p className="panel-sheet__eyebrow">Trabajo puntual</p>
                  <h2 id={titleId} className="panel-sheet__title">
                    Agregar trabajo
                  </h2>
                  <p className="panel-sheet__meta">Cobro único, sin recurrencia.</p>
                </div>
                <button
                  type="button"
                  className="panel-sheet__close"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                >
                  <X size={18} strokeWidth={2.25} />
                </button>
              </header>

              <form className="panel-sheet__form" onSubmit={onSubmit}>
                <label className="panel-field">
                  <span className="panel-field__label">Nombre del trabajo</span>
                  <input
                    className="panel-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Landing, auditoría, setup"
                    required
                    autoFocus
                  />
                </label>
                <label className="panel-field">
                  <span className="panel-field__label">Importe</span>
                  <input
                    className="panel-input"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
                    required
                  />
                </label>
                <label className="panel-field">
                  <span className="panel-field__label">Moneda</span>
                  <select
                    className="panel-input"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'USD' | 'ARS')}
                  >
                    <option value="ARS">ARS</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                <label className="panel-field">
                  <span className="panel-field__label">Fecha de vencimiento</span>
                  <input
                    className="panel-input"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </label>
                {error ? (
                  <div className="panel-alert" role="alert">
                    {error}
                  </div>
                ) : null}
                <div className="panel-sheet__actions">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" loading={submitting}>
                    {submitting ? 'Guardando…' : 'Crear trabajo'}
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
