import { describe, expect, it } from 'vitest';
import {
  clientBillingStatusLabel,
  clientInitials,
  filterClients,
  pickPrimaryUnpaidCharge,
  resolveClientBillingStatus,
  sortClientsForManagement,
} from '@/lib/panel/clients/listStatus';
import type { ChargeListItemData, ClientListItemData } from '@/lib/panel/view-types';

function client(
  partial: Partial<ClientListItemData> & Pick<ClientListItemData, 'id' | 'name' | 'billingStatus'>,
): ClientListItemData {
  return {
    active: partial.billingStatus !== 'inactive',
    startDate: '2026-01-01',
    endedAt: null,
    activeServiceCount: 1,
    services: [],
    mrrUsd: 0,
    mrrArs: 0,
    notes: null,
    nextDueDate: null,
    primaryServiceName: 'Web',
    primaryAmount: 100,
    primaryCurrency: 'ARS',
    primaryBillingType: 'recurring',
    unpaidCharges: [],
    ...partial,
  };
}

describe('resolveClientBillingStatus', () => {
  it('inactivo gana', () => {
    expect(resolveClientBillingStatus({ active: false, unpaidStatuses: ['overdue'] })).toBe(
      'inactive',
    );
  });

  it('prioriza vencido > hoy > próximo > al día', () => {
    expect(resolveClientBillingStatus({ active: true, unpaidStatuses: ['upcoming', 'overdue'] })).toBe(
      'overdue',
    );
    expect(resolveClientBillingStatus({ active: true, unpaidStatuses: ['due_today'] })).toBe(
      'due_today',
    );
    expect(resolveClientBillingStatus({ active: true, unpaidStatuses: ['upcoming'] })).toBe(
      'upcoming',
    );
    expect(resolveClientBillingStatus({ active: true, unpaidStatuses: [] })).toBe('current');
  });
});

describe('sortClientsForManagement', () => {
  it('ordena por urgencia y luego alfabético', () => {
    const sorted = sortClientsForManagement([
      client({ id: '1', name: 'Beta', billingStatus: 'current' }),
      client({ id: '2', name: 'Zulu', billingStatus: 'overdue' }),
      client({ id: '3', name: 'Alfa', billingStatus: 'overdue' }),
      client({ id: '4', name: 'Inact', billingStatus: 'inactive', active: false }),
      client({ id: '5', name: 'Hoy', billingStatus: 'due_today' }),
    ]);
    expect(sorted.map((c) => c.name)).toEqual(['Alfa', 'Zulu', 'Hoy', 'Beta', 'Inact']);
  });
});

describe('filterClients', () => {
  const list = [
    client({ id: '1', name: 'Avellaneda Automotores', billingStatus: 'overdue' }),
    client({ id: '2', name: 'Poletino', billingStatus: 'current' }),
    client({ id: '3', name: 'Viejo', billingStatus: 'inactive', active: false }),
  ];

  it('busca por nombre', () => {
    expect(filterClients(list, 'all', 'pole').map((c) => c.id)).toEqual(['2']);
  });

  it('filtra vencidos', () => {
    expect(filterClients(list, 'overdue', '').map((c) => c.id)).toEqual(['1']);
  });

  it('filtra inactivos', () => {
    expect(filterClients(list, 'inactive', '').map((c) => c.id)).toEqual(['3']);
  });
});

describe('pickPrimaryUnpaidCharge', () => {
  it('elige el más urgente', () => {
    const charges = [
      {
        id: 'a',
        status: 'upcoming',
        dueDate: '2026-09-01',
      },
      {
        id: 'b',
        status: 'overdue',
        dueDate: '2026-08-01',
      },
    ] as ChargeListItemData[];
    expect(pickPrimaryUnpaidCharge(charges)?.id).toBe('b');
  });
});

describe('labels e iniciales', () => {
  it('labels humanos', () => {
    expect(clientBillingStatusLabel('due_today')).toBe('Vence hoy');
    expect(clientBillingStatusLabel('current')).toBe('Al día');
  });

  it('iniciales', () => {
    expect(clientInitials('Avellaneda Automotores')).toBe('AA');
    expect(clientInitials('Poletino')).toBe('PO');
  });
});
