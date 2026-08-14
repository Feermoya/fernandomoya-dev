import { useState } from 'react';
import type { ChargeListItemData } from '@/lib/panel/view-types';
import { formatCurrencyAmount } from '@/components/panel/CurrencyAmount';
import { formatDueLabel } from '@/lib/panel/view-types';
import { StatusBadge } from '@/components/panel/StatusBadge';
import { RegisterPaymentSheet } from '@/components/panel/RegisterPaymentSheet';
import { Button } from '@/components/panel/ui/button';

type Props = {
  unpaidCharges: ChargeListItemData[];
};

/** Lista de pendientes del cliente: un tap abre el sheet de pago directo. */
export function ClientDetailActions({ unpaidCharges }: Props) {
  const [selected, setSelected] = useState<ChargeListItemData | null>(null);

  return (
    <>
      <ul className="panel-list">
        {unpaidCharges.map((charge) => (
          <li key={charge.id}>
            <div className="panel-row-wrap">
              <article className="panel-row">
                <div className="panel-row__top">
                  <div className="min-w-0">
                    <p className="panel-row__title">{charge.serviceName}</p>
                    <p className="panel-row__amount">
                      {formatCurrencyAmount(charge.referenceAmount, charge.referenceCurrency)}
                    </p>
                    <p className="panel-row__date">Vence {formatDueLabel(charge.dueDate)}</p>
                  </div>
                  <StatusBadge status={charge.status} />
                </div>
              </article>
              <div className="panel-row-actions">
                <Button type="button" size="sm" onClick={() => setSelected(charge)}>
                  Registrar pago
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <RegisterPaymentSheet
        open={Boolean(selected)}
        charge={selected}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          setSelected(null);
          window.location.reload();
        }}
      />
    </>
  );
}
