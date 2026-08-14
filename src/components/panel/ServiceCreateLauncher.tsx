import { useEffect, useId, useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/panel/ui/button';
import { todayIsoDate } from '@/lib/panel/view-types';

type Props = {
  clientId: string;
  /** Abrir automáticamente (query ?nuevoServicio=1). */
  autoOpen?: boolean;
};

export function ServiceCreateLauncher({ clientId, autoOpen = false }: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(autoOpen);
  const [name, setName] = useState('Servicio Web');
  const [billingType, setBillingType] = useState<'recurring' | 'one_time'>('recurring');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'ARS'>('USD');
  const [billingMode, setBillingMode] = useState<'previous_month' | 'current_month'>('previous_month');
  const [dueDay, setDueDay] = useState('10');
  const [startDate, setStartDate] = useState(todayIsoDate());
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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body =
        billingType === 'recurring'
          ? {
              clientId,
              name,
              billingType,
              referenceAmount: amount,
              referenceCurrency: currency,
              billingMode,
              dueDay: Number(dueDay),
              startDate,
            }
          : {
              clientId,
              name,
              billingType,
              referenceAmount: amount,
              referenceCurrency: currency,
              startDate,
              dueDate,
            };

      const res = await fetch('/panel/api/services/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo crear el servicio.');
        return;
      }
      window.location.href = `/panel/clientes/${clientId}?ok=servicio`;
    } catch {
      setError('Error de red.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" className="panel-section__link panel-inline-cta" onClick={() => setOpen(true)}>
        <Plus size={14} strokeWidth={2.5} aria-hidden />
        Nuevo servicio
      </button>

      {open ? (
        <div className="panel-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
          <button type="button" className="panel-sheet__backdrop" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div className="panel-sheet__panel">
            <div className="panel-sheet__handle" aria-hidden />
            <header className="panel-sheet__header">
              <div className="min-w-0">
                <p className="panel-sheet__eyebrow">Servicio</p>
                <h2 id={titleId} className="panel-sheet__title">
                  Nuevo servicio
                </h2>
              </div>
              <button type="button" className="panel-sheet__close" onClick={() => setOpen(false)} aria-label="Cerrar">
                <X size={18} strokeWidth={2.25} />
              </button>
            </header>

            <form className="panel-sheet__form" onSubmit={onSubmit}>
              <label className="panel-field">
                <span className="panel-field__label">Nombre</span>
                <input className="panel-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </label>

              <label className="panel-field">
                <span className="panel-field__label">Tipo</span>
                <select
                  className="panel-input"
                  value={billingType}
                  onChange={(e) => setBillingType(e.target.value as 'recurring' | 'one_time')}
                >
                  <option value="recurring">Recurrente</option>
                  <option value="one_time">Puntual</option>
                </select>
              </label>

              <div className="panel-sheet__summary" style={{ marginTop: 0 }}>
                <label className="panel-field">
                  <span className="panel-field__label">Tarifa</span>
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
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </label>
              </div>

              {billingType === 'recurring' ? (
                <>
                  <label className="panel-field">
                    <span className="panel-field__label">Modalidad</span>
                    <select
                      className="panel-input"
                      value={billingMode}
                      onChange={(e) =>
                        setBillingMode(e.target.value as 'previous_month' | 'current_month')
                      }
                    >
                      <option value="previous_month">Mes vencido</option>
                      <option value="current_month">Mes actual</option>
                    </select>
                  </label>
                  <label className="panel-field">
                    <span className="panel-field__label">Día de vencimiento</span>
                    <input
                      className="panel-input"
                      inputMode="numeric"
                      value={dueDay}
                      onChange={(e) => setDueDay(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </label>
                  <label className="panel-field">
                    <span className="panel-field__label">Fecha de inicio</span>
                    <input
                      className="panel-input"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="panel-field">
                    <span className="panel-field__label">Fecha de inicio</span>
                    <input
                      className="panel-input"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </label>
                  <label className="panel-field">
                    <span className="panel-field__label">Vencimiento del cobro</span>
                    <input
                      className="panel-input"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                    />
                  </label>
                </>
              )}

              {error ? <div className="panel-alert" role="alert">{error}</div> : null}
              <div className="panel-sheet__actions">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando…' : 'Crear servicio'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
