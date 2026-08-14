import type { ChargeStatus } from '@/lib/panel/types';
import type {
  ChargeListItemData,
  ClientBillingStatus,
  ClientListItemData,
} from '@/lib/panel/view-types';

export type { ClientBillingStatus };

export type ClientFilter = 'all' | 'active' | 'overdue' | 'inactive';

const STATUS_PRIORITY: Record<ClientBillingStatus, number> = {
  overdue: 0,
  due_today: 1,
  upcoming: 2,
  current: 3,
  inactive: 4,
};

const CHARGE_PRIORITY: Record<ChargeStatus, number> = {
  overdue: 0,
  due_today: 1,
  upcoming: 2,
  paid: 3,
};

export function clientBillingStatusLabel(status: ClientBillingStatus): string {
  switch (status) {
    case 'overdue':
      return 'Vencido';
    case 'due_today':
      return 'Vence hoy';
    case 'upcoming':
      return 'Próximo';
    case 'current':
      return 'Al día';
    case 'inactive':
      return 'Inactivo';
  }
}

export function resolveClientBillingStatus(input: {
  active: boolean;
  unpaidStatuses: ChargeStatus[];
}): ClientBillingStatus {
  if (!input.active) return 'inactive';
  const unpaid = input.unpaidStatuses.filter((s) => s !== 'paid');
  if (unpaid.length === 0) return 'current';
  unpaid.sort((a, b) => CHARGE_PRIORITY[a] - CHARGE_PRIORITY[b]);
  const worst = unpaid[0];
  if (worst === 'overdue') return 'overdue';
  if (worst === 'due_today') return 'due_today';
  return 'upcoming';
}

export function sortClientsForManagement(clients: ClientListItemData[]): ClientListItemData[] {
  return [...clients].sort((a, b) => {
    const pa = STATUS_PRIORITY[a.billingStatus];
    const pb = STATUS_PRIORITY[b.billingStatus];
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
  });
}

export function filterClients(
  clients: ClientListItemData[],
  filter: ClientFilter,
  query: string,
): ClientListItemData[] {
  const q = query.trim().toLowerCase();
  return clients.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q)) return false;
    switch (filter) {
      case 'active':
        return c.active;
      case 'overdue':
        return c.active && c.billingStatus === 'overdue';
      case 'inactive':
        return !c.active;
      case 'all':
      default:
        return true;
    }
  });
}

export function pickPrimaryUnpaidCharge(
  charges: ChargeListItemData[],
): ChargeListItemData | null {
  if (charges.length === 0) return null;
  return [...charges].sort((a, b) => {
    const p = CHARGE_PRIORITY[a.status] - CHARGE_PRIORITY[b.status];
    if (p !== 0) return p;
    return a.dueDate.localeCompare(b.dueDate);
  })[0];
}

export function clientInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}
