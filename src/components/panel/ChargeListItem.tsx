import { ChevronRight } from 'lucide-react';
import type { ChargeListItemData } from '@/lib/panel/view-types';
import { formatDueLabel } from '@/lib/panel/view-types';
import { formatCurrencyAmount } from '@/components/panel/CurrencyAmount';
import { StatusBadge } from '@/components/panel/StatusBadge';
import { cn } from '@/lib/panel/cn';

type Props = {
  charge: ChargeListItemData;
  className?: string;
};

export function ChargeListItem({ charge, className }: Props) {
  return (
    <article className={cn('panel-row', className)}>
      <div className="panel-row__inner">
        <div className="panel-row__body">
          <div className="panel-row__top">
            <div className="min-w-0">
              <p className="panel-row__title">{charge.clientName}</p>
              <p className="panel-row__meta">{charge.serviceName}</p>
            </div>
            <StatusBadge status={charge.status} />
          </div>
          <div className="panel-row__bottom">
            <span className="panel-row__amount">
              {formatCurrencyAmount(charge.referenceAmount, charge.referenceCurrency)}
            </span>
            <p className="panel-row__date">
              {charge.status === 'paid' && charge.paidAt
                ? `Pagado ${formatDueLabel(charge.paidAt)}`
                : `Vence ${formatDueLabel(charge.dueDate)}`}
            </p>
          </div>
        </div>
        <ChevronRight className="panel-row__chevron" size={16} aria-hidden />
      </div>
    </article>
  );
}
