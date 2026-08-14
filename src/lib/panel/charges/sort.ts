import type { ChargeStatus } from '@/lib/panel/types';
import type { ChargeListItemData } from '@/lib/panel/view-types';

const STATUS_RANK: Record<ChargeStatus, number> = {
  overdue: 0,
  due_today: 1,
  upcoming: 2,
  paid: 3,
};

/** Orden de lista de cobros: overdue → due_today → upcoming → paid; luego due_date. */
export function sortChargesForList(charges: ChargeListItemData[]): ChargeListItemData[] {
  return [...charges].sort((a, b) => {
    const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (byStatus !== 0) return byStatus;
    return a.dueDate.localeCompare(b.dueDate);
  });
}
