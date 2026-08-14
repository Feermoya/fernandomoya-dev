import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { ChargeListItemData } from '@/lib/panel/view-types';
import { formatDueLabel, formatPeriodLabel, todayIsoDate } from '@/lib/panel/view-types';
import { formatCurrencyAmount } from '@/components/panel/CurrencyAmount';
import { Button } from '@/components/panel/ui/button';
import { PanelPortal } from '@/components/panel/PanelPortal';
import {
  PAYMENT_METHODS,
  expectedArsFromUsd,
  suggestedReceivedArsFromUsd,
} from '@/lib/panel/payments/register';

type Props = {
  charge: ChargeListItemData | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type MepState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; value: number; ageMinutes: number; source: string }
  | { status: 'error'; message: string };

function toInputNumber(value: string): string {
  return value.replace(/[^\d.,]/g, '');
}

export function RegisterPaymentSheet({ charge, open, onClose, onSuccess }: Props) {
  const titleId = useId();
  const isUsd = charge?.referenceCurrency === 'USD';
  const [paidAt, setPaidAt] = useState(todayIsoDate());
  const [mep, setMep] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<string>('Transferencia');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mepState, setMepState] = useState<MepState>({ status: 'idle' });
  const [mepTouched, setMepTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !charge) return;
    setPaidAt(todayIsoDate());
    setMep('');
    setMethod('Transferencia');
    setNotes('');
    setError(null);
    setDone(false);
    setSubmitting(false);
    setMepTouched(false);
    setAmountTouched(false);
    setMepState({ status: 'idle' });
    if (charge.referenceCurrency === 'ARS') {
      setAmount(String(Math.round(charge.referenceAmount)));
    } else {
      setAmount('');
    }
  }, [open, charge]);

  useEffect(() => {
    if (!open || !charge || charge.referenceCurrency !== 'USD') return;
    let cancelled = false;
    setMepState({ status: 'loading' });
    fetch('/panel/api/exchange/mep', { credentials: 'same-origin' })
      .then(async (res) => {
        const data = (await res.json()) as {
          ok: boolean;
          value?: number;
          ageMinutes?: number;
          source?: string;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok || !data.ok || !(data.value && data.value > 0)) {
          setMepState({
            status: 'error',
            message: data.error || 'No se pudo obtener el MEP',
          });
          return;
        }
        setMepState({
          status: 'ok',
          value: data.value,
          ageMinutes: data.ageMinutes ?? 0,
          source: data.source || 'mep',
        });
        if (!mepTouched) {
          setMep(String(data.value));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMepState({ status: 'error', message: 'No se pudo obtener el MEP' });
        }
      });
    return () => {
      cancelled = true;
    };
    // mepTouched intentionally omitted: only auto-fill on open/charge
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, charge]);

  const mepNumber = useMemo(() => {
    const n = Number(String(mep).replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [mep]);

  const expectedExact = useMemo(() => {
    if (!charge || !isUsd || mepNumber == null) return null;
    return expectedArsFromUsd(charge.referenceAmount, mepNumber);
  }, [charge, isUsd, mepNumber]);

  const suggestedAmount = useMemo(() => {
    if (!charge || !isUsd || mepNumber == null) return null;
    return suggestedReceivedArsFromUsd(charge.referenceAmount, mepNumber);
  }, [charge, isUsd, mepNumber]);

  useEffect(() => {
    if (!open || !charge || !isUsd) return;
    if (suggestedAmount == null) return;
    if (amountTouched) return;
    setAmount(String(suggestedAmount));
  }, [suggestedAmount, open, charge, isUsd, amountTouched]);

  if (!open || !charge) return null;
  const activeCharge = charge;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const body = {
        chargeId: activeCharge.id,
        paidAt,
        amountReceived: Number(String(amount).replace(',', '.')),
        currencyReceived: 'ARS',
        exchangeRate: isUsd ? Number(String(mep).replace(',', '.')) : null,
        paymentMethod: method || null,
        notes: notes.trim() || null,
      };

      const res = await fetch('/panel/api/payments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || 'No se pudo registrar el pago.');
        return;
      }
      setDone(true);
      window.setTimeout(() => {
        onSuccess();
      }, 650);
    } catch {
      setError('Error de red. Probá de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PanelPortal>
    <div className="panel-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="panel-sheet__backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="panel-sheet__panel">
        <div className="panel-sheet__handle" aria-hidden />
        <header className="panel-sheet__header">
          <div className="min-w-0">
            <p className="panel-sheet__eyebrow">Registrar pago</p>
            <h2 id={titleId} className="panel-sheet__title">
              {activeCharge.clientName}
            </h2>
            <p className="panel-sheet__meta">{activeCharge.serviceName}</p>
          </div>
          <button type="button" className="panel-sheet__close" onClick={onClose} aria-label="Cerrar">
            <X size={18} strokeWidth={2.25} />
          </button>
        </header>

        <div className="panel-sheet__summary">
          <div>
            <p className="panel-metric__label">Tarifa</p>
            <p className="panel-sheet__summary-value">
              {formatCurrencyAmount(activeCharge.referenceAmount, activeCharge.referenceCurrency)}
            </p>
          </div>
          <div>
            <p className="panel-metric__label">Vencimiento</p>
            <p className="panel-sheet__summary-value">{formatDueLabel(activeCharge.dueDate)}</p>
          </div>
          <div>
            <p className="panel-metric__label">Período</p>
            <p className="panel-sheet__summary-value">{formatPeriodLabel(activeCharge.period)}</p>
          </div>
        </div>

        {done ? (
          <p className="panel-sheet__success" role="status">
            Pago registrado
          </p>
        ) : (
          <form className="panel-sheet__form" onSubmit={onSubmit}>
            {isUsd ? (
              <>
                <label className="panel-field">
                  <span className="panel-field__label">MEP (ARS por 1 USD)</span>
                  <input
                    className="panel-input"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={mepState.status === 'loading' ? 'Cargando MEP…' : 'Ej. 1512.48'}
                    value={mep}
                    onChange={(e) => {
                      setMepTouched(true);
                      setMep(toInputNumber(e.target.value));
                    }}
                    disabled={mepState.status === 'loading' && !mepTouched}
                    required
                  />
                </label>
                {mepState.status === 'loading' ? (
                  <p className="panel-sheet__calc" aria-live="polite">
                    Obteniendo MEP…
                  </p>
                ) : null}
                {mepState.status === 'ok' ? (
                  <p className="panel-sheet__calc">
                    MEP actualizado hace {mepState.ageMinutes} min
                  </p>
                ) : null}
                {mepState.status === 'error' ? (
                  <p className="panel-sheet__calc panel-sheet__calc--warn">
                    MEP no disponible · ingresalo manualmente
                  </p>
                ) : null}
                {expectedExact != null && mepNumber != null ? (
                  <p className="panel-sheet__calc">
                    Equivalente: {formatCurrencyAmount(activeCharge.referenceAmount, 'USD')} ×{' '}
                    {mepNumber} = <strong>{formatCurrencyAmount(expectedExact, 'ARS')}</strong>
                  </p>
                ) : null}
              </>
            ) : null}

            <label className="panel-field">
              <span className="panel-field__label">Monto recibido (ARS)</span>
              <input
                className="panel-input"
                inputMode="decimal"
                autoComplete="off"
                value={amount}
                onChange={(e) => {
                  setAmountTouched(true);
                  setAmount(toInputNumber(e.target.value));
                }}
                required
              />
            </label>

            <label className="panel-field">
              <span className="panel-field__label">Fecha de pago</span>
              <input
                className="panel-input"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
              />
            </label>

            <label className="panel-field">
              <span className="panel-field__label">Método</span>
              <select
                className="panel-input"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label className="panel-field">
              <span className="panel-field__label">Nota (opcional)</span>
              <textarea
                className="panel-input panel-input--area"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Transferencia Banco Galicia"
              />
            </label>

            {error ? (
              <div className="panel-alert" role="alert">
                {error}
              </div>
            ) : null}

            <div className="panel-sheet__actions">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" loading={submitting}>
                {submitting ? 'Registrando…' : 'Registrar pago'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
    </PanelPortal>
  );
}
