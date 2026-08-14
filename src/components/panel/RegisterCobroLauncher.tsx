import { useMemo, useState } from 'react';
import { Banknote, ChevronRight, X } from 'lucide-react';
import type { ChargeListItemData } from '@/lib/panel/view-types';
import { formatCurrencyAmount } from '@/components/panel/CurrencyAmount';
import { formatDueLabel, formatPeriodLabel } from '@/lib/panel/view-types';
import { StatusBadge } from '@/components/panel/StatusBadge';
import { RegisterPaymentSheet } from '@/components/panel/RegisterPaymentSheet';
import { Button } from '@/components/panel/ui/button';

type Step = 'closed' | 'clients' | 'charges' | 'payment';

type Props = {
  unpaidCharges: ChargeListItemData[];
};

export function RegisterCobroLauncher({ unpaidCharges }: Props) {
  const [step, setStep] = useState<Step>('closed');
  const [clientId, setClientId] = useState<string | null>(null);
  const [selected, setSelected] = useState<ChargeListItemData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const clients = useMemo(() => {
    const priority = (status: ChargeListItemData['status']) =>
      status === 'overdue' ? 0 : status === 'due_today' ? 1 : 2;

    const sortedCharges = [...unpaidCharges].sort((a, b) => {
      const p = priority(a.status) - priority(b.status);
      if (p !== 0) return p;
      return a.dueDate.localeCompare(b.dueDate);
    });

    const map = new Map<
      string,
      { id: string; name: string; count: number; topStatus: ChargeListItemData['status'] }
    >();
    for (const c of sortedCharges) {
      const prev = map.get(c.clientId);
      if (prev) prev.count += 1;
      else
        map.set(c.clientId, {
          id: c.clientId,
          name: c.clientName,
          count: 1,
          topStatus: c.status,
        });
    }
    return [...map.values()];
  }, [unpaidCharges]);

  const clientCharges = useMemo(() => {
    if (!clientId) return [];
    const priority = (status: ChargeListItemData['status']) =>
      status === 'overdue' ? 0 : status === 'due_today' ? 1 : 2;
    return unpaidCharges
      .filter((c) => c.clientId === clientId)
      .sort((a, b) => {
        const p = priority(a.status) - priority(b.status);
        if (p !== 0) return p;
        return a.dueDate.localeCompare(b.dueDate);
      });
  }, [unpaidCharges, clientId]);

  function open() {
    setFeedback(null);
    setClientId(null);
    setSelected(null);
    setStep('clients');
  }

  function closePicker() {
    setStep('closed');
    setClientId(null);
    setSelected(null);
  }

  function pickClient(id: string) {
    const charges = unpaidCharges.filter((c) => c.clientId === id);
    setClientId(id);
    if (charges.length === 1) {
      setSelected(charges[0]);
      setStep('payment');
      return;
    }
    setStep('charges');
  }

  function pickCharge(charge: ChargeListItemData) {
    setSelected(charge);
    setStep('payment');
  }

  return (
    <>
      <button type="button" className="panel-header__cta" onClick={open}>
        <Banknote size={16} strokeWidth={2.25} aria-hidden />
        <span>Registrar cobro</span>
      </button>

      {feedback ? (
        <p className="panel-toast panel-toast--fixed" role="status">
          {feedback}
        </p>
      ) : null}

      {step === 'clients' || step === 'charges' ? (
        <div className="panel-sheet" role="dialog" aria-modal="true" aria-label="Registrar cobro">
          <button
            type="button"
            className="panel-sheet__backdrop"
            aria-label="Cerrar"
            onClick={closePicker}
          />
          <div className="panel-sheet__panel">
            <div className="panel-sheet__handle" aria-hidden />
            <header className="panel-sheet__header">
              <div className="min-w-0">
                <p className="panel-sheet__eyebrow">Registrar cobro</p>
                <h2 className="panel-sheet__title">
                  {step === 'clients' ? 'Elegí el cliente' : 'Elegí el cobro'}
                </h2>
                <p className="panel-sheet__meta">
                  {step === 'clients'
                    ? 'Solo cobros pendientes (próximos, hoy o vencidos).'
                    : clients.find((c) => c.id === clientId)?.name}
                </p>
              </div>
              <button
                type="button"
                className="panel-sheet__close"
                onClick={closePicker}
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2.25} />
              </button>
            </header>

            {step === 'clients' ? (
              unpaidCharges.length === 0 ? (
                <p className="panel-empty" style={{ marginTop: '1rem' }}>
                  No hay cobros pendientes para registrar.
                </p>
              ) : (
                <ul className="panel-picker-list">
                  {clients.map((client) => (
                    <li key={client.id}>
                      <button
                        type="button"
                        className="panel-picker-item"
                        onClick={() => pickClient(client.id)}
                      >
                        <span className="panel-picker-item__body">
                          <span className="panel-picker-item__title">{client.name}</span>
                          <span className="panel-picker-item__meta">
                            {client.count === 1
                              ? '1 cobro pendiente'
                              : `${client.count} cobros pendientes`}
                          </span>
                        </span>
                        <ChevronRight size={18} strokeWidth={2.25} aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : (
              <>
                <div className="panel-sheet__actions" style={{ marginTop: '0.75rem' }}>
                  <Button type="button" variant="outline" onClick={() => setStep('clients')}>
                    Volver
                  </Button>
                </div>
                <ul className="panel-picker-list">
                  {clientCharges.map((charge) => (
                    <li key={charge.id}>
                      <button
                        type="button"
                        className="panel-picker-item"
                        onClick={() => pickCharge(charge)}
                      >
                        <span className="panel-picker-item__body">
                          <span className="panel-picker-item__title">{charge.serviceName}</span>
                          <span className="panel-picker-item__meta">
                            {formatPeriodLabel(charge.period)} · vence {formatDueLabel(charge.dueDate)}
                          </span>
                          <span className="panel-picker-item__amount">
                            {formatCurrencyAmount(charge.referenceAmount, charge.referenceCurrency)}
                          </span>
                        </span>
                        <StatusBadge status={charge.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      ) : null}

      <RegisterPaymentSheet
        open={step === 'payment'}
        charge={selected}
        onClose={() => {
          if (clientCharges.length > 1) {
            setSelected(null);
            setStep('charges');
            return;
          }
          closePicker();
        }}
        onSuccess={() => {
          setFeedback('Pago registrado');
          closePicker();
          window.setTimeout(() => {
            window.location.reload();
          }, 400);
        }}
      />
    </>
  );
}
