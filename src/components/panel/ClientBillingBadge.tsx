import { cn } from '@/lib/panel/cn';
import { clientBillingStatusLabel } from '@/lib/panel/clients/listStatus';
import type { ClientBillingStatus } from '@/lib/panel/view-types';

type Props = {
  status: ClientBillingStatus;
  className?: string;
};

export function ClientBillingBadge({ status, className }: Props) {
  return (
    <span className={cn('panel-badge', `panel-badge--billing-${status}`, className)}>
      {clientBillingStatusLabel(status)}
    </span>
  );
}
