import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ClientListItemData } from '@/lib/panel/view-types';
import type { ClientRow } from '@/lib/panel/view-types';
import { ClientListItem } from '@/components/panel/ClientListItem';
import { RegisterPaymentSheet } from '@/components/panel/RegisterPaymentSheet';
import { ServiceTariffSheet } from '@/components/panel/ServiceTariffSheet';
import { ClientEditSheet } from '@/components/panel/ClientEditSheet';
import { pickPrimaryUnpaidCharge } from '@/lib/panel/clients/listStatus';
import {
  filterClients,
  sortClientsForManagement,
  type ClientFilter,
} from '@/lib/panel/clients/listStatus';
import type { ChargeListItemData } from '@/lib/panel/view-types';

type Props = {
  clients: ClientListItemData[];
};

const FILTERS: Array<{ id: ClientFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'overdue', label: 'Vencidos' },
  { id: 'inactive', label: 'Inactivos' },
];

function toClientRow(c: ClientListItemData): ClientRow {
  return {
    id: c.id,
    name: c.name,
    active: c.active,
    start_date: c.startDate,
    ended_at: c.endedAt,
    notes: c.notes,
    created_at: '',
    updated_at: '',
  };
}

export function ClientsWorkspace({ clients }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ClientFilter>('all');
  const [payCharge, setPayCharge] = useState<ChargeListItemData | null>(null);
  const [tariffClient, setTariffClient] = useState<ClientListItemData | null>(null);
  const [editClient, setEditClient] = useState<ClientListItemData | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const sorted = useMemo(() => sortClientsForManagement(clients), [clients]);
  const visible = useMemo(
    () => filterClients(sorted, filter, query),
    [sorted, filter, query],
  );

  const tariffService =
    tariffClient?.services.find((s) => s.billingType === 'recurring') ??
    tariffClient?.services[0] ??
    null;

  async function reactivate(client: ClientListItemData) {
    setActionError(null);
    setReactivatingId(client.id);
    try {
      const res = await fetch('/panel/api/clients/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ id: client.id }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setActionError(data.error || 'No se pudo reactivar.');
        return;
      }
      window.location.reload();
    } catch {
      setActionError('Error de red.');
    } finally {
      setReactivatingId(null);
    }
  }

  function emptyMessage(): { title: string; body: string } {
    if (clients.length === 0) {
      return {
        title: 'Todavía no hay clientes',
        body: 'Agregá tu primer cliente para empezar a controlar cobros.',
      };
    }
    if (query.trim()) {
      return {
        title: 'Sin coincidencias',
        body: 'No encontramos clientes con ese nombre.',
      };
    }
    if (filter === 'overdue') {
      return {
        title: 'Nada pendiente',
        body: 'No tenés clientes vencidos.',
      };
    }
    if (filter === 'inactive') {
      return {
        title: 'Sin bajas',
        body: 'No hay clientes inactivos.',
      };
    }
    if (filter === 'active') {
      return {
        title: 'Sin activos',
        body: 'No hay clientes activos con este filtro.',
      };
    }
    return {
      title: 'Sin resultados',
      body: 'Probá otro filtro o búsqueda.',
    };
  }

  const empty = emptyMessage();

  return (
    <div className="panel-clients-workspace">
      <div className="panel-clients-toolbar">
        <label className="panel-search">
          <Search size={16} strokeWidth={2.25} aria-hidden />
          <span className="sr-only">Buscar cliente</span>
          <input
            className="panel-search__input"
            type="search"
            placeholder="Buscar cliente…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </label>

        <div className="panel-filter-chips" role="tablist" aria-label="Filtrar clientes">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={
                filter === f.id ? 'panel-filter-chip is-active' : 'panel-filter-chip'
              }
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {actionError ? (
        <div className="panel-alert" role="alert">
          {actionError}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="panel-empty-state" role="status">
          <p className="panel-empty-state__title">{empty.title}</p>
          <p className="panel-empty-state__body">{empty.body}</p>
          {clients.length === 0 ? (
            <p className="panel-empty-state__hint">Usá “Nuevo cliente” arriba a la derecha.</p>
          ) : null}
        </div>
      ) : (
        <ul className="panel-clients-grid">
          {visible.map((client) => (
            <li key={client.id}>
              <ClientListItem
                client={client}
                href={`/panel/clientes/${client.id}`}
                onRegisterPayment={(c) => {
                  const charge = pickPrimaryUnpaidCharge(c.unpaidCharges);
                  if (charge) setPayCharge(charge);
                }}
                onEditTariff={(c) => setTariffClient(c)}
                onEditClient={(c) => setEditClient(c)}
                onReactivate={(c) => {
                  if (reactivatingId) return;
                  void reactivate(c);
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <RegisterPaymentSheet
        open={Boolean(payCharge)}
        charge={payCharge}
        onClose={() => setPayCharge(null)}
        onSuccess={() => {
          setPayCharge(null);
          window.location.reload();
        }}
      />

      {tariffService && tariffClient ? (
        <ServiceTariffSheet
          hideTrigger
          open={Boolean(tariffClient)}
          onOpenChange={(next) => {
            if (!next) setTariffClient(null);
          }}
          serviceId={tariffService.id}
          serviceName={tariffService.name}
          currentAmount={tariffService.referenceAmount}
          currency={tariffService.referenceCurrency}
        />
      ) : null}

      {editClient ? (
        <ClientEditSheet
          hideTrigger
          open={Boolean(editClient)}
          onOpenChange={(next) => {
            if (!next) setEditClient(null);
          }}
          client={toClientRow(editClient)}
        />
      ) : null}
    </div>
  );
}
