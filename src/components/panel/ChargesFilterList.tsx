import { useMemo, useState } from 'react';
import type { ChargeStatus } from '@/lib/panel/types';
import type { ChargeListItemData } from '@/lib/panel/view-types';
import { ChargeListItem } from '@/components/panel/ChargeListItem';
import { RegisterPaymentSheet } from '@/components/panel/RegisterPaymentSheet';
import { Button } from '@/components/panel/ui/button';

const FILTERS: { id: 'all' | ChargeStatus; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'upcoming', label: 'Próximos' },
  { id: 'due_today', label: 'Hoy' },
  { id: 'overdue', label: 'Vencidos' },
  { id: 'paid', label: 'Pagados' },
];

type Props = {
  charges: ChargeListItemData[];
};

export function ChargesFilterList({ charges }: Props) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [selected, setSelected] = useState<ChargeListItemData | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'all') return charges;
    return charges.filter((c) => c.status === filter);
  }, [charges, filter]);

  return (
    <div>
      {feedback ? (
        <p className="panel-toast" role="status">
          {feedback}
        </p>
      ) : null}

      <div className="panel-filters" role="tablist" aria-label="Filtrar cobros">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`panel-filter-btn${active ? ' is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {charges.length === 0 ? (
        <p className="panel-empty">No hay cobros para este período.</p>
      ) : (
        <>
          <ul className="panel-list">
            {filtered.map((charge) => {
              const unpaid = charge.status !== 'paid';
              return (
                <li key={charge.id}>
                  <div className={charge.status === 'paid' ? 'panel-row-wrap is-paid' : 'panel-row-wrap'}>
                    <ChargeListItem charge={charge} />
                    {unpaid ? (
                      <div className="panel-row-actions">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(charge)}
                        >
                          Registrar pago
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 ? (
            <p className="panel-empty">No hay cobros en este filtro.</p>
          ) : null}
        </>
      )}

      <RegisterPaymentSheet
        open={Boolean(selected)}
        charge={selected}
        onClose={() => setSelected(null)}
        onSuccess={() => {
          setFeedback('Pago registrado');
          setSelected(null);
          window.location.reload();
        }}
      />
    </div>
  );
}
