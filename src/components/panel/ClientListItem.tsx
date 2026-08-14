import { ChevronRight } from 'lucide-react';
import type { ClientListItemData } from '@/lib/panel/view-types';
import { formatCurrencyAmount } from '@/components/panel/CurrencyAmount';
import { cn } from '@/lib/panel/cn';

type Props = {
  client: ClientListItemData;
  href: string;
  className?: string;
};

export function ClientListItem({ client, href, className }: Props) {
  return (
    <a href={href} className={cn('panel-row', className)}>
      <div className="panel-row__inner">
        <div className="panel-row__body">
          <div className="panel-row__top">
            <p className="panel-row__title">{client.name}</p>
            <span className={`panel-badge ${client.active ? 'panel-badge--paid' : 'panel-badge--muted'}`}>
              {client.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <p className="panel-row__meta">
            {client.activeServiceCount}{' '}
            {client.activeServiceCount === 1 ? 'servicio' : 'servicios'}
          </p>
          <div className="panel-row__bottom">
            {client.mrrUsd > 0 ? (
              <span className="panel-row__amount">{formatCurrencyAmount(client.mrrUsd, 'USD')}</span>
            ) : null}
            {client.mrrArs > 0 ? (
              <span className="panel-row__amount">{formatCurrencyAmount(client.mrrArs, 'ARS')}</span>
            ) : null}
            {client.mrrUsd === 0 && client.mrrArs === 0 ? (
              <span className="panel-row__date">Sin MRR</span>
            ) : null}
          </div>
        </div>
        <ChevronRight className="panel-row__chevron" size={16} aria-hidden />
      </div>
    </a>
  );
}
