import { useEffect, useId, useRef, useState } from 'react';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import type { ClientListItemData } from '@/lib/panel/view-types';
import { formatCurrencyAmount } from '@/components/panel/CurrencyAmount';
import { formatDueShortLabel } from '@/lib/panel/view-types';
import { ClientBillingBadge } from '@/components/panel/ClientBillingBadge';
import { clientInitials } from '@/lib/panel/clients/listStatus';
import { cn } from '@/lib/panel/cn';

type Props = {
  client: ClientListItemData;
  href: string;
  className?: string;
  onRegisterPayment?: (client: ClientListItemData) => void;
  onEditTariff?: (client: ClientListItemData) => void;
  onEditClient?: (client: ClientListItemData) => void;
  onReactivate?: (client: ClientListItemData) => void;
};

export function ClientListItem({
  client,
  href,
  className,
  onRegisterPayment,
  onEditTariff,
  onEditClient,
  onReactivate,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const tariff =
    client.primaryAmount != null && client.primaryCurrency
      ? `${formatCurrencyAmount(client.primaryAmount, client.primaryCurrency)}${
          client.primaryBillingType === 'recurring' ? ' / mes' : ''
        }`
      : client.mrrUsd > 0
        ? `${formatCurrencyAmount(client.mrrUsd, 'USD')} / mes`
        : client.mrrArs > 0
          ? `${formatCurrencyAmount(client.mrrArs, 'ARS')} / mes`
          : 'Sin tarifa';

  const dueLine = client.nextDueDate
    ? client.billingStatus === 'overdue' || client.billingStatus === 'due_today'
      ? formatDueShortLabel(client.nextDueDate)
      : `Vence ${formatDueShortLabel(client.nextDueDate)}`
    : client.active
      ? 'Sin vencimiento'
      : 'Baja';

  return (
    <div
      ref={rootRef}
      className={cn('panel-client-item', `panel-client-item--${client.billingStatus}`, className)}
    >
      <a href={href} className="panel-client-item__main">
        <span className="panel-client-item__avatar" aria-hidden>
          {clientInitials(client.name)}
        </span>
        <span className="panel-client-item__body">
          <span className="panel-client-item__top">
            <span className="panel-client-item__name">{client.name}</span>
            <ClientBillingBadge status={client.billingStatus} />
          </span>
          <span className="panel-client-item__mid">
            <span className="panel-client-item__service">
              {client.primaryServiceName ?? 'Sin servicio'}
              {client.activeServiceCount > 1 ? ` · ${client.activeServiceCount} servicios` : ''}
            </span>
            <span className="panel-client-item__tariff">{tariff}</span>
          </span>
          <span className="panel-client-item__due">{dueLine}</span>
        </span>
        <ChevronRight className="panel-client-item__chevron" size={16} aria-hidden />
      </a>

      <div className="panel-client-item__menu">
        <button
          type="button"
          className="panel-client-item__more"
          aria-label={`Acciones de ${client.name}`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          <MoreHorizontal size={18} strokeWidth={2.25} aria-hidden />
        </button>
        {menuOpen ? (
          <ul id={menuId} className="panel-client-menu" role="menu">
            {!client.active ? (
              <li role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="panel-client-menu__item"
                  onClick={() => {
                    setMenuOpen(false);
                    onReactivate?.(client);
                  }}
                >
                  Reactivar
                </button>
              </li>
            ) : (
              <>
                {client.unpaidCharges.length > 0 ? (
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="panel-client-menu__item"
                      onClick={() => {
                        setMenuOpen(false);
                        onRegisterPayment?.(client);
                      }}
                    >
                      Registrar cobro
                    </button>
                  </li>
                ) : null}
                {client.services.some((s) => s.billingType === 'recurring') ? (
                  <li role="none">
                    <button
                      type="button"
                      role="menuitem"
                      className="panel-client-menu__item"
                      onClick={() => {
                        setMenuOpen(false);
                        onEditTariff?.(client);
                      }}
                    >
                      Editar tarifa
                    </button>
                  </li>
                ) : null}
                <li role="none">
                  <button
                    type="button"
                    role="menuitem"
                    className="panel-client-menu__item"
                    onClick={() => {
                      setMenuOpen(false);
                      onEditClient?.(client);
                    }}
                  >
                    Editar cliente
                  </button>
                </li>
              </>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
